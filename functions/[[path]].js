const UPSTREAM_DNS_PROVIDERS = [
  { url: 'https://freedns.controld.com/p2', priority: 1, healthScore: 100, lastCheck: 0, consecutiveFailures: 0, fronting: 'freedns.controld.com' }
];

const DNS_CACHE_TTL_MIN = 60;
const DNS_CACHE_TTL_MAX = 3600;
const DNS_CACHE_TTL_DEFAULT = 300;
const REQUEST_TIMEOUT_MIN = 8000;
const REQUEST_TIMEOUT_MAX = 15000;
const MAX_RETRIES = 3;
const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_CLEANUP_INTERVAL = 120000;
const MAX_DNS_RESPONSE_SIZE = 4096;
const MAX_DNS_REQUEST_SIZE = 512;
const HEALTH_CHECK_INTERVAL = 300000;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60000;
const MAX_CONCURRENT_REQUESTS = 50;
const RANDOM_DELAY_MIN = 10;
const RANDOM_DELAY_MAX = 150;
const DECOY_REQUEST_PROBABILITY = 0.15;

const dnsCache = new Map();
const rateLimitMap = new Map();
const pendingRequests = new Map();
const providerMetrics = new Map();
let lastCleanupTime = Date.now();
let lastHealthCheck = Date.now();
let concurrentRequests = 0;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
];

const ACCEPT_LANGUAGES = [
  'en-US,en;q=0.9',
  'en-GB,en;q=0.9',
  'fa-IR,fa;q=0.9,en;q=0.8',
  'de-DE,de;q=0.9,en;q=0.8',
  'fr-FR,fr;q=0.9,en;q=0.8',
  'es-ES,es;q=0.9,en;q=0.8'
];

const REFERERS = [
  'https://www.google.com/',
  'https://www.bing.com/',
  'https://duckduckgo.com/',
  'https://www.wikipedia.org/',
  'https://www.cloudflare.com/'
];

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // REMOVE /apple COMPLETELY → nothing here

  const clientIP = request.headers.get('CF-Connecting-IP') || 
                   request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 
                   request.headers.get('X-Real-IP') ||
                   'unknown';

  cleanupRateLimitMap();
  performHealthCheckIfNeeded();

  if (!checkRateLimit(clientIP)) {
    return new Response('rate limit', {
      status: 429,
      headers: {
        'Content-Type': 'text/plain',
        'Retry-After': '60',
        'Cache-Control': 'no-store'
      }
    });
  }

  if (concurrentRequests >= MAX_CONCURRENT_REQUESTS) {
    return new Response('server busy', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain',
        'Retry-After': '5',
        'Cache-Control': 'no-store'
      }
    });
  }

  // Only /ii is allowed
  if (url.pathname !== '/ii') {
    return new Response('', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }

  if (request.method === 'OPTIONS') {
    return handleOptions();
  }

  await addRandomDelay();
  concurrentRequests++;

  try {
    let dnsResponse;

    if (request.method === 'GET') {
      dnsResponse = await handleGetRequest(url);
    } else if (request.method === 'POST') {
      dnsResponse = await handlePostRequest(request);
    } else {
      return new Response('not allowed', { 
        status: 405,
        headers: {
          'Allow': 'GET, POST, OPTIONS',
          'Content-Type': 'text/plain'
        }
      });
    }

    if (!dnsResponse || !dnsResponse.body) {
      throw new Error('invalid');
    }

    const responseBody = await dnsResponse.arrayBuffer();
    
    if (responseBody.byteLength > MAX_DNS_RESPONSE_SIZE) {
      throw new Error('large');
    }

    const cacheTTL = calculateDynamicTTL(responseBody);

    return new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/dns-message',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': `public, max-age=${cacheTTL}`,
        'X-Content-Type-Options': 'nosniff',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'X-DNS-Proxy': 'Cloudflare-Pages'
      }
    });
  } catch (error) {
    return new Response('failed: ' + error.message, { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store'
      }
    });
  } finally {
    concurrentRequests--;
  }
}

async function handleGetRequest(url) {
  const dnsParam = url.searchParams.get('dns');
  if (!dnsParam) throw new Error('missing');
  if (!isValidBase64Url(dnsParam)) throw new Error('invalid');

  const cacheKey = `GET:${dnsParam}`;
  const pending = pendingRequests.get(cacheKey);
  if (pending) return pending;

  const cachedResponse = getCachedResponse(cacheKey);
  if (cachedResponse) {
    return new Response(cachedResponse, {
      status: 200,
      headers: { 'X-Cache': 'HIT' }
    });
  }

  const requestPromise = (async () => {
    try {
      const providers = getHealthySortedProviders();
      const response = await queryDNSWithRace(providers, (provider) => {
        const upstreamUrl = new URL(provider.url);
        upstreamUrl.searchParams.set('dns', dnsParam);

        url.searchParams.forEach((value, key) => {
          if (key !== 'dns') upstreamUrl.searchParams.set(key, value);
        });

        const timeout = calculateDynamicTimeout(provider);
        const headers = generateEnhancedHeaders(provider);

        return fetchWithTimeout(upstreamUrl.toString(), {
          method: 'GET',
          headers: headers
        }, timeout);
      });

      const responseBody = await response.arrayBuffer();
      setCachedResponse(cacheKey, responseBody);

      return new Response(responseBody, {
        status: 200,
        headers: { 'X-Cache': 'MISS' }
      });
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

async function handlePostRequest(request) {
  const contentType = request.headers.get('Content-Type');
  if (contentType !== 'application/dns-message') {
    throw new Error('Invalid Content-Type. Expected application/dns-message');
  }

  const body = await request.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_DNS_REQUEST_SIZE) {
    throw new Error(`Invalid DNS message size: ${body.byteLength} bytes`);
  }

  const cacheKey = `POST:${arrayBufferToBase64(body)}`;
  const pending = pendingRequests.get(cacheKey);
  if (pending) return pending;

  const cachedResponse = getCachedResponse(cacheKey);
  if (cachedResponse) {
    return new Response(cachedResponse, {
      status: 200,
      headers: { 'X-Cache': 'HIT' }
    });
  }

  const requestPromise = (async () => {
    try {
      const providers = getHealthySortedProviders();
      const response = await queryDNSWithRace(providers, (provider) => {
        const timeout = calculateDynamicTimeout(provider);
        const headers = generateEnhancedHeaders(provider);
        headers['Content-Type'] = 'application/dns-message';
        headers['Content-Length'] = body.byteLength.toString();

        return fetchWithTimeout(provider.url, {
          method: 'POST',
          headers: headers,
          body: body
        }, timeout);
      });

      const responseBody = await response.arrayBuffer();
      setCachedResponse(cacheKey, responseBody);

      return new Response(responseBody, {
        status: 200,
        headers: { 'X-Cache': 'MISS' }
      });
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

async function queryDNSWithRace(providers, fetchFunction) {
  const errors = [];

  if (Math.random() < DECOY_REQUEST_PROBABILITY) {
    sendDecoyRequest().catch(() => {});
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const availableProviders = providers.filter(p => !isCircuitBreakerOpen(p));
    if (availableProviders.length === 0) {
      await sleep(1000);
      continue;
    }

    const promises = availableProviders.map(async (provider) => {
      const startTime = Date.now();
      try {
        const response = await fetchFunction(provider);

        if (response.ok) {
          const contentType = response.headers.get('Content-Type');
          if (contentType && contentType.includes('application/dns-message')) {
            const duration = Date.now() - startTime;
            recordSuccess(provider, duration);
            return response;
          }
          throw new Error(`Invalid content type: ${contentType}`);
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        const duration = Date.now() - startTime;
        recordFailure(provider, duration);
        errors.push({
          provider: provider.url,
          attempt: attempt,
          error: error.message,
          duration: duration
        });
        throw error;
      }
    });

    try {
      return await Promise.any(promises);
    } catch (aggregateError) {
      if (attempt < MAX_RETRIES) {
        const backoffTime = Math.min(200 * Math.pow(2, attempt), 2000);
        await sleep(backoffTime);
        continue;
      }
    }
  }

  throw new Error('failed');
}

async function fetchWithTimeout(url, options, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`timeout ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function generateEnhancedHeaders(provider) {
  const headers = {
    'Accept': 'application/dns-message',
    'User-Agent': getRandomUserAgent(),
    'Accept-Language': getRandomElement(ACCEPT_LANGUAGES),
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': Math.random() > 0.5 ? '1' : '0',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'none'
  };

  if (Math.random() > 0.3) {
    headers['Referer'] = getRandomElement(REFERERS);
  }

  if (Math.random() > 0.5 && provider.fronting) {
    headers['Host'] = provider.fronting;
  }

  if (Math.random() > 0.7) {
    headers['Cache-Control'] = 'no-cache';
  }

  if (Math.random() > 0.6) {
    headers['Pragma'] = 'no-cache';
  }

  return headers;
}

async function sendDecoyRequest() {
  const decoyProviders = [
    'https://www.google.com/robots.txt',
    'https://www.cloudflare.com/favicon.ico',
    'https://www.wikipedia.org/static/favicon/wikipedia.ico',
    'https://www.bing.com/favicon.ico'
  ];

  const decoyUrl = getRandomElement(decoyProviders);
  const headers = {
    'User-Agent': getRandomUserAgent(),
    'Accept': '*/*',
    'Accept-Language': getRandomElement(ACCEPT_LANGUAGES),
    'Referer': getRandomElement(REFERERS)
  };

  try {
    await fetchWithTimeout(decoyUrl, {
      method: 'GET',
      headers: headers
    }, 5000);
  } catch (e) {}
}

async function addRandomDelay() {
  const delay = Math.floor(Math.random() * (RANDOM_DELAY_MAX - RANDOM_DELAY_MIN + 1)) + RANDOM_DELAY_MIN;
  await sleep(delay);
}

function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}

function checkRateLimit(clientIP) {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIP);

  if (!clientData) {
    rateLimitMap.set(clientIP, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }

  if (now > clientData.resetTime) {
    rateLimitMap.set(clientIP, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }

  if (clientData.count >= RATE_LIMIT_REQUESTS) {
    return false;
  }

  clientData.count++;
  return true;
}

function cleanupRateLimitMap() {
  const now = Date.now();

  if (now - lastCleanupTime < RATE_LIMIT_CLEANUP_INTERVAL) {
    return;
  }

  lastCleanupTime = now;

  for (const [clientIP, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(clientIP);
    }
  }

  if (dnsCache.size > 1000) {
    const entriesToDelete = dnsCache.size - 500;
    let deleted = 0;
    for (const key of dnsCache.keys()) {
      if (deleted >= entriesToDelete) break;
      dnsCache.delete(key);
      deleted++;
    }
  }

  pendingRequests.clear();
}

function getCachedResponse(key) {
  const cached = dnsCache.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    dnsCache.delete(key);
    return null;
  }

  return cached.data;
}

function setCachedResponse(key, data) {
  const ttl = calculateDynamicTTL(data);
  const expiresAt = Date.now() + (ttl * 1000);
  dnsCache.set(key, { data, expiresAt });
}

function calculateDynamicTTL(responseData) {
  try {
    const view = new DataView(responseData);
    if (view.byteLength < 12) return DNS_CACHE_TTL_DEFAULT;

    const ancount = view.getUint16(6);

    if (ancount === 0) {
      return DNS_CACHE_TTL_MIN;
    }

    if (ancount > 5) {
      return DNS_CACHE_TTL_MAX;
    }

    return DNS_CACHE_TTL_DEFAULT;
  } catch (e) {
    return DNS_CACHE_TTL_DEFAULT;
  }
}

function getHealthySortedProviders() {
  return UPSTREAM_DNS_PROVIDERS
    .filter(p => p.healthScore > 20)
    .sort((a, b) => {
      const scoreA = a.healthScore / a.priority;
      const scoreB = b.healthScore / b.priority;
      return scoreB - scoreA;
    })
    .slice(0, 3);
}

function calculateDynamicTimeout(provider) {
  const baseTimeout = REQUEST_TIMEOUT_MIN;
  const healthPenalty = (100 - provider.healthScore) * 50;
  const timeout = Math.min(baseTimeout + healthPenalty, REQUEST_TIMEOUT_MAX);
  return timeout;
}

function recordSuccess(provider, duration) {
  provider.consecutiveFailures = 0;
  provider.healthScore = Math.min(100, provider.healthScore + 5);
  provider.lastCheck = Date.now();
  
  if (!providerMetrics.has(provider.url)) {
    providerMetrics.set(provider.url, { successes: 0, failures: 0, avgDuration: 0 });
  }
  
  const metrics = providerMetrics.get(provider.url);
  metrics.successes++;
  metrics.avgDuration = (metrics.avgDuration * (metrics.successes - 1) + duration) / metrics.successes;
}

function recordFailure(provider, duration) {
  provider.consecutiveFailures++;
  provider.healthScore = Math.max(0, provider.healthScore - 10);
  provider.lastCheck = Date.now();
  
  if (!providerMetrics.has(provider.url)) {
    providerMetrics.set(provider.url, { successes: 0, failures: 0, avgDuration: 0 });
  }
  
  const metrics = providerMetrics.get(provider.url);
  metrics.failures++;
}

function isCircuitBreakerOpen(provider) {
  if (provider.consecutiveFailures < CIRCUIT_BREAKER_THRESHOLD) {
    return false;
  }
  
  const timeSinceLastCheck = Date.now() - provider.lastCheck;
  if (timeSinceLastCheck > CIRCUIT_BREAKER_TIMEOUT) {
    provider.consecutiveFailures = Math.floor(provider.consecutiveFailures / 2);
    return false;
  }
  
  return true;
}

function performHealthCheckIfNeeded() {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return;
  }
  
  lastHealthCheck = now;
  
  UPSTREAM_DNS_PROVIDERS.forEach(provider => {
    if (provider.healthScore < 50) {
      provider.healthScore = Math.min(100, provider.healthScore + 10);
    }
    
    if (now - provider.lastCheck > HEALTH_CHECK_INTERVAL * 2) {
      provider.healthScore = 100;
      provider.consecutiveFailures = 0;
    }
  });
}

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function isValidBase64Url(str) {
  if (!str || str.length === 0 || str.length > 2048) {
    return false;
  }
  
  const base64UrlRegex = /^[A-Za-z0-9_-]+={0,2}$/;
  return base64UrlRegex.test(str);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Homepage removed — returns empty
function getHomePage(requestUrl) {
  return '';
}
