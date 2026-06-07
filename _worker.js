/**
 * VERSION: 2.4.0
 * Runtime: Cloudflare Workers Module Syntax
 */

const VERSION = '2.4.0';

const CONFIG = {
  DEFAULT_PROFILE: 'all',
  CACHE_TTL_SECONDS: 300,
  MAX_CACHE_ENTRIES: 5000,
  MAX_THROTTLE_ENTRIES: 20000,
  MAX_DNS_MESSAGE_BYTES: 4096,
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_MAX_REQUESTS: 1000,
  UPSTREAM_TIMEOUT_MS: 1800,
  RACE_COUNT: 5,
  SCORE_START: 100,
  SCORE_MIN: 0,
  SCORE_MAX: 100,
  SCORE_SUCCESS_DELTA: 1,
  SCORE_FAILURE_DELTA: 15,
  SCORE_TIMEOUT_DELTA: 10
};

const OTHER_DNS_UPSTREAMS = [
  'https://cloudflare-dns.com/dns-query', 'https://1.1.1.1/dns-query',
  'https://1.0.0.1/dns-query', 'https://mozilla.cloudflare-dns.com/dns-query',
  'https://security.cloudflare-dns.com/dns-query', 'https://family.cloudflare-dns.com/dns-query',
  'https://dns64.cloudflare-dns.com/dns-query', 'https://brave.cloudflare-dns.com/dns-query',
  'https://dns.google/dns-query', 'https://8888.google/dns-query',
  'https://dns64.dns.google/dns-query', 'https://dns.quad9.net/dns-query',
  'https://dns9.quad9.net/dns-query', 'https://dns10.quad9.net/dns-query',
  'https://dns11.quad9.net/dns-query', 'https://dns12.quad9.net/dns-query',
  'https://dns.nextdns.io/dns-query', 'https://doh.opendns.com/dns-query',
  'https://doh.familyshield.opendns.com/dns-query', 'https://doh.umbrella.com/dns-query',
  'https://dns.adguard-dns.com/dns-query', 'https://unfiltered.adguard-dns.com/dns-query',
  'https://family.adguard-dns.com/dns-query', 'https://doh.mullvad.net/dns-query',
  'https://adblock.doh.mullvad.net/dns-query', 'https://base.dns.mullvad.net/dns-query',
  'https://extended.dns.mullvad.net/dns-query', 'https://all.dns.mullvad.net/dns-query',
  'https://family.dns.mullvad.net/dns-query', 'https://freedns.controld.com/p0',
  'https://freedns.controld.com/p1', 'https://freedns.controld.com/p2',
  'https://freedns.controld.com/p3', 'https://freedns.controld.com/family',
  'https://freedns.controld.com/uncensored', 'https://sky.rethinkdns.com/dns-query',
  'https://doh.cleanbrowsing.org/doh/security-filter/', 'https://doh.cleanbrowsing.org/doh/adult-filter/',
  'https://doh.cleanbrowsing.org/doh/family-filter/', 'https://zero.dns0.eu/dns-query',
  'https://kids.dns0.eu/dns-query', 'https://private.canadianshield.cira.ca/dns-query',
  'https://protected.canadianshield.cira.ca/dns-query', 'https://family.canadianshield.cira.ca/dns-query',
  'https://protective.joindns4.eu/dns-query', 'https://child.joindns4.eu/dns-query',
  'https://noads.joindns4.eu/dns-query', 'https://child-noads.joindns4.eu/dns-query',
  'https://unfiltered.joindns4.eu/dns-query', 'https://wikimedia-dns.org/dns-query',
  'https://doh.wikimedia.org/dns-query', 'https://dns.switch.ch/dns-query',
  'https://dns.digitale-gesellschaft.ch/dns-query', 'https://doh.libredns.gr/dns-query',
  'https://doh.libredns.gr/noads', 'https://odvr.nic.cz/dns-query',
  'https://doh.ffmuc.net/dns-query', 'https://doh.applied-privacy.net/query',
  'https://dns.aa.net.uk/dns-query', 'https://dns.alidns.com/dns-query',
  'https://dns.twnic.tw/dns-query', 'https://dns.pub/dns-query',
  'https://doh.360.cn/dns-query', 'https://public.dns.iij.jp/dns-query',
  'https://doh.dns.sb/dns-query', 'https://doh.pub/dns-query',
  'https://ordns.he.net/dns-query', 'https://dns.brahma.world/dns-query',
  'https://dns.cfiec.net/dns-query', 'https://dns.dnshome.de/dns-query',
  'https://dnsforge.de/dns-query', 'https://clean.dnsforge.de/dns-query',
  'https://hard.dnsforge.de/dns-query', 'https://doh-fi.blahdns.com/dns-query',
  'https://doh-jp.blahdns.com/dns-query', 'https://doh-de.blahdns.com/dns-query',
  'https://doh-sg.blahdns.com/dns-query', 'https://doh.centraleu.pi-dns.com/dns-query',
  'https://doh.westus.pi-dns.com/dns-query', 'https://doh.eastus.pi-dns.com/dns-query',
  'https://doh.northeu.pi-dns.com/dns-query', 'https://doh.tiar.app/dns-query',
  'https://doh.tiarap.org/dns-query', 'https://jp.tiar.app/dns-query',
  'https://jp.tiarap.org/dns-query', 'https://dns.containerpi.com/dns-query',
  'https://dns.rubyfish.cn/dns-query', 'https://doh.armadillodns.net/dns-query',
  'https://commons.host/dns-query', 'https://doh.crypto.sx/dns-query',
  'https://dns.dnswarden.com/uncensored', 'https://resolver-eu.lelux.fi/dns-query',
  'https://doh.bortzmeyer.fr/dns-query', 'https://dns.oszx.co/dns-query',
  'https://ada.openbld.net/dns-query', 'https://ric.openbld.net/dns-query',
  'https://luna.openbld.net/dns-query', 'https://fra01.dnscry.pt/dns-query',
  'https://lon01.dnscry.pt/dns-query', 'https://nyc01.dnscry.pt/dns-query',
  'https://par01.dnscry.pt/dns-query', 'https://ams01.dnscry.pt/dns-query',
  'https://sin01.dnscry.pt/dns-query', 'https://syd01.dnscry.pt/dns-query',
  'https://tok01.dnscry.pt/dns-query', 'https://sea01.dnscry.pt/dns-query',
  'https://lax01.dnscry.pt/dns-query', 'https://anycast.uncensoreddns.org/dns-query',
  'https://unicast.uncensoreddns.org/dns-query', 'https://dns.njal.la/dns-query',
  'https://freedom.mydns.network/dns-query', 'https://paranoia.mydns.network/dns-query',
  'https://adblock.mydns.network/dns-query', 'https://family.mydns.network/dns-query',
  'https://dns.comss.one/dns-query', 'https://router.comss.one/dns-query',
  'https://ca01.dns4me.net', 'https://ca02.dns4me.net',
  'https://us01.dns4me.net', 'https://us02.dns4me.net',
  'https://uk01.dns4me.net', 'https://au01.dns4me.net',
  'https://sg01.dns4me.net', 'https://de01.dns4me.net',
  'https://dnspub.restena.lu/dns-query', 'https://safeservedns.com/dns-query',
  'https://dns.rabbitdns.org/dns-query', 'https://security.rabbitdns.org/dns-query',
  'https://family.rabbitdns.org/dns-query', 'https://v.recipes/dns-query',
  'https://v.recipes/dns-adblock', 'https://v.recipes/dns-ecs',
  'https://dns.surfsharkdns.com/dns-query', 'https://dns.blokada.org/dns-query',
  'https://root.hagezi.org/dns-query', 'https://wurzn.hagezi.org/dns-query',
  'https://juuri.hagezi.org/dns-query', 'https://eu1.dns.lavate.ch/dns-query',
  'https://doh.seby.io/dns-query', 'https://resolver1.absolight.net/dns-query',
  'https://resolver2.absolight.net/dns-query', 'https://per.adfilter.net/dns-query',
  'https://syd.adfilter.net/dns-query', 'https://adl.adfilter.net/dns-query',
  'https://ns0.fdn.fr/dns-query', 'https://ns1.fdn.fr/dns-query',
  'https://dns.technitium.com/dns-query', 'https://dns.telekom.de/dns-query',
  'https://dns.aquilenet.fr/dns-query', 'https://doh.lacontrevoie.fr/dns-query',
  'https://dns.belnet.be/dns-query', 'https://dns1.in-berlin.de/dns-query',
  'https://dns2.in-berlin.de/dns-query', 'https://resolver.dnsprivacy.org.uk/dns-query',
  'https://resolver.sunet.se/dns-query', 'https://ns1.opennameserver.org/dns-query',
  'https://dns.froth.zone/dns-query', 'https://dns.stormycloud.org/dns-query',
  'https://adfree.usableprivacy.net/dns-query', 'https://doh.dns4all.eu/dns-query',
  'https://dns.smartguard.io/dns-query', 'https://privacy.plumedns.com/dns-query',
  'https://dns.bitdefender.net/dns-query', 'https://dns.cctld.kg/dns-query',
  'https://doh.lv/dns-query', 'https://doh.nic.lv/dns-query',
  'https://japan.dnsovertor.cc/dns-query', 'https://chuncheon.dnsovertor.cc/dns-query',
  'https://seoul.dnsovertor.cc/dns-query', 'https://dns.cert.ee/dns-query',
  'https://secure.hafnova.com/dns-query', 'https://dns.kescher.at/dns-query',
  'https://ibuki.cgnat.net/dns-query', 'https://doh.li/dns-query',
  'https://dns4eu.online/dns-query', 'https://dns.elemental.software/dns-query',
  'https://doth.huque.com/dns-query', 'https://zdn.ro/dns-query',
  'https://doh.zknt.org/dns-query', 'https://ns2.4netguides.org/dns-query',
  'https://dukun.de/dns-query', 'https://dns.cynthialabs.net/dns-query'
];

const CONTROLD_DNS_UPSTREAMS = [
  'https://freedns.controld.com/no-ads-dating-drugs-gambling-typo-malware',
  'https://freedns.controld.com/no-ads-dating-gambling-typo-malware',
  'https://freedns.controld.com/no-ads-typo-malware',
  'https://freedns.controld.com/p2',
  ];

const RESOLVER_PROFILES = {
  all: [
    CONTROLD_DNS_UPSTREAMS,
    OTHER_DNS_UPSTREAMS
  ]
};

const APP_STATE = {
  resolversByProfile: buildResolverState(RESOLVER_PROFILES),
  cache: new Map(),
  throttle: new Map()
};

function buildResolverState(profiles) {
  const state = {};

  for (const [profile, urls] of Object.entries(profiles)) {
    state[profile] = urls.map((url) => ({
      url,
      score: CONFIG.SCORE_START,
      ok: 0,
      fail: 0,
      timeout: 0,
      lastLatencyMs: null,
      lastError: null
    }));
  }

  return state;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const clientIP = getClientIP(req);

    // Intercept /status to show the JSON health snapshot
    if (url.pathname === '/status') {
      return jsonResponse(getHealthSnapshot(), 200, {
        'cache-control': 'no-store'
      });
    }

    if (checkSpam(clientIP)) {
      return textResponse('Rate limit exceeded', 429, {
        'cache-control': 'no-store'
      });
    }

    // Route ALL other paths to the DNS handler
    return handleDNS(req, url);
  }
};

async function handleDNS(req, url) {
  const methodError = validateMethod(req.method);
  if (methodError) return methodError;

  let payload;

  try {
    payload = await readDNSPayload(req, url);
  } catch (err) {
    return textResponse('Not found', err.status || 404, {
      'cache-control': 'no-store'
    });
  }

  if (!payload || payload.byteLength === 0) {
    return textResponse('Not found', 404, { 'cache-control': 'no-store' });
  }

  if (payload.byteLength > CONFIG.MAX_DNS_MESSAGE_BYTES) {
    return textResponse('Not found', 404, { 'cache-control': 'no-store' });
  }

  const parsed = parseDNSQuestion(payload);
  if (!parsed.ok) {
    return textResponse('Not found', 404, { 'cache-control': 'no-store' });
  }

  const profile = pickProfile(url);
  const resolvers = APP_STATE.resolversByProfile[profile] || APP_STATE.resolversByProfile[CONFIG.DEFAULT_PROFILE];
  const cacheKey = await makeCacheKey(profile, parsed.questionKey);
  const hit = getCache(cacheKey);

  if (hit) {
    const responseBody = patchDNSResponseID(hit.body, parsed.id);
    return dnsResponse(responseBody, {
      'x-cache': 'HIT',
      'x-profile': profile
    });
  }

  const racers = selectRacers(resolvers);

  try {
    const winner = await raceResolvers(racers, payload, parsed.id);

    if (isCacheableDNSResponse(winner.body)) {
      setCache(cacheKey, normalizeDNSResponseID(winner.body), CONFIG.CACHE_TTL_SECONDS);
    }

    return dnsResponse(winner.body, {
      'x-cache': 'MISS',
      'x-profile': profile,
      'x-winner': sanitizeHeaderValue(winner.url),
      'x-winner-lat': `${winner.latencyMs}ms`
    });
  } catch (err) {
    return textResponse('Global resolving failed', 502, {
      'cache-control': 'no-store',
      'x-profile': profile
    });
  }
}

function validateMethod(method) {
  if (method !== 'GET' && method !== 'POST') {
    return textResponse('Not found', 404, {
      'cache-control': 'no-store'
    });
  }

  return null;
}

async function readDNSPayload(req, url) {
  if (req.method === 'GET') {
    const q = url.searchParams.get('dns');
    if (!q) throw httpError('Not found', 404);
    return decodeBase64Url(q);
  }

  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/dns-message')) {
    throw httpError('Not found', 404);
  }

  return new Uint8Array(await req.arrayBuffer());
}

function decodeBase64Url(input) {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) {
    throw httpError('Not found', 404);
  }

  let normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  normalized += '='.repeat((4 - (normalized.length % 4)) % 4);

  try {
    return Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0));
  } catch (_) {
    throw httpError('Not found', 404);
  }
}

function parseDNSQuestion(packet) {
  const bytes = packet instanceof Uint8Array ? packet : new Uint8Array(packet);

  if (bytes.byteLength < 12) {
    return { ok: false, error: 'Not found' };
  }

  const id = (bytes[0] << 8) | bytes[1];
  const flags = (bytes[2] << 8) | bytes[3];
  const qdcount = (bytes[4] << 8) | bytes[5];

  if ((flags & 0x8000) !== 0) {
    return { ok: false, error: 'Not found' };
  }

  if (qdcount !== 1) {
    return { ok: false, error: 'Not found' };
  }

  let offset = 12;
  const labels = [];

  while (offset < bytes.length) {
    const len = bytes[offset++];

    if (len === 0) break;

    if ((len & 0xc0) !== 0) {
      return { ok: false, error: 'Not found' };
    }

    if (len > 63 || offset + len > bytes.length) {
      return { ok: false, error: 'Not found' };
    }

    let label = '';
    for (let i = 0; i < len; i++) {
      const ch = bytes[offset++];
      label += String.fromCharCode(ch).toLowerCase();
    }

    labels.push(label);
  }

  if (offset + 4 > bytes.length) {
    return { ok: false, error: 'Not found' };
  }

  const qtype = (bytes[offset] << 8) | bytes[offset + 1];
  const qclass = (bytes[offset + 2] << 8) | bytes[offset + 3];
  const qname = labels.join('.') || '.';

  return {
    ok: true,
    id,
    qname,
    qtype,
    qclass,
    questionKey: `${qname}|${qtype}|${qclass}`
  };
}

function normalizeDNSResponseID(responseBuffer) {
  const bytes = new Uint8Array(responseBuffer);
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  copy[0] = 0;
  copy[1] = 0;
  return copy.buffer;
}

function patchDNSResponseID(responseBuffer, queryID) {
  const bytes = new Uint8Array(responseBuffer);
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  copy[0] = (queryID >> 8) & 0xff;
  copy[1] = queryID & 0xff;
  return copy.buffer;
}

function isCacheableDNSResponse(responseBuffer) {
  const bytes = new Uint8Array(responseBuffer);

  if (bytes.length < 12) return false;

  const flags = (bytes[2] << 8) | bytes[3];
  const isResponse = (flags & 0x8000) !== 0;
  const rcode = flags & 0x000f;

  if (!isResponse) return false;

  return rcode === 0 || rcode === 3;
}

function pickProfile(url) {
  return CONFIG.DEFAULT_PROFILE;
}

function selectRacers(resolvers) {
  return [...resolvers]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aLat = a.lastLatencyMs ?? Number.MAX_SAFE_INTEGER;
      const bLat = b.lastLatencyMs ?? Number.MAX_SAFE_INTEGER;
      return aLat - bLat;
    })
    .slice(0, Math.max(1, Math.min(CONFIG.RACE_COUNT, resolvers.length)));
}

async function raceResolvers(nodes, packet, expectedID) {
  const controllers = nodes.map(() => new AbortController());

  try {
    const attempts = nodes.map((node, index) => relay(node, packet, expectedID, controllers[index].signal));
    const winner = await Promise.any(attempts);

    for (const controller of controllers) {
      controller.abort('winner-selected');
    }

    return winner;
  } finally {
    for (const controller of controllers) {
      controller.abort('race-finished');
    }
  }
}

async function relay(node, packet, expectedID, signal) {
  const started = Date.now();
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort('timeout'), CONFIG.UPSTREAM_TIMEOUT_MS);
  const combinedSignal = anySignal([signal, timeoutController.signal]);

  try {
    const res = await fetch(node.url, {
      method: 'POST',
      headers: {
        accept: 'application/dns-message',
        'content-type': 'application/dns-message'
      },
      body: packet,
      signal: combinedSignal
    });

    if (!res.ok) {
      penalize(node, CONFIG.SCORE_FAILURE_DELTA, `HTTP ${res.status}`);
      throw new Error(`Upstream HTTP ${res.status}`);
    }

    const body = await res.arrayBuffer();
    const validation = validateDNSResponse(body, expectedID);

    if (!validation.ok) {
      penalize(node, CONFIG.SCORE_FAILURE_DELTA, validation.error);
      throw new Error(validation.error);
    }

    const latencyMs = Date.now() - started;
    reward(node, latencyMs);

    return {
      url: node.url,
      body,
      latencyMs
    };
  } catch (err) {
    const message = String(err && err.message ? err.message : err);

    if (message.includes('abort') || message.includes('timeout') || timeoutController.signal.aborted) {
      node.timeout += 1;
      penalize(node, CONFIG.SCORE_TIMEOUT_DELTA, 'timeout');
    } else {
      penalize(node, CONFIG.SCORE_FAILURE_DELTA, message);
    }

    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function validateDNSResponse(responseBuffer, expectedID) {
  const bytes = new Uint8Array(responseBuffer);

  if (bytes.length < 12) return { ok: false, error: 'Upstream returned short DNS response' };

  const id = (bytes[0] << 8) | bytes[1];
  const flags = (bytes[2] << 8) | bytes[3];

  if (id !== expectedID) return { ok: false, error: 'Upstream response ID mismatch' };
  if ((flags & 0x8000) === 0) return { ok: false, error: 'Upstream returned a DNS query, not response' };

  return { ok: true };
}

function anySignal(signals) {
  const controller = new AbortController();

  function abortFrom(signal) {
    if (!controller.signal.aborted) {
      controller.abort(signal.reason || 'aborted');
    }
  }

  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) {
      abortFrom(signal);
      break;
    }
    signal.addEventListener('abort', () => abortFrom(signal), { once: true });
  }

  return controller.signal;
}

function reward(node, latencyMs) {
  node.ok += 1;
  node.lastLatencyMs = latencyMs;
  node.lastError = null;
  node.score = clamp(node.score + CONFIG.SCORE_SUCCESS_DELTA, CONFIG.SCORE_MIN, CONFIG.SCORE_MAX);
}

function penalize(node, amount, error) {
  node.fail += 1;
  node.lastError = String(error || 'unknown').slice(0, 80);
  node.score = clamp(node.score - amount, CONFIG.SCORE_MIN, CONFIG.SCORE_MAX);
}

async function makeCacheKey(profile, questionKey) {
  const input = `${profile}|${questionKey}`;
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function getCache(key) {
  const item = APP_STATE.cache.get(key);
  if (!item) return null;

  if (Date.now() > item.expiresAt) {
    APP_STATE.cache.delete(key);
    return null;
  }

  APP_STATE.cache.delete(key);
  APP_STATE.cache.set(key, item);
  return item;
}

function setCache(key, body, ttlSeconds) {
  APP_STATE.cache.set(key, {
    body,
    expiresAt: Date.now() + ttlSeconds * 1000
  });

  trimMap(APP_STATE.cache, CONFIG.MAX_CACHE_ENTRIES);
}

function checkSpam(ip) {
  const now = Date.now();
  const current = APP_STATE.throttle.get(ip);
  let stats = current || { count: 0, resetAt: now + CONFIG.RATE_LIMIT_WINDOW_MS };

  if (now > stats.resetAt) {
    stats = { count: 0, resetAt: now + CONFIG.RATE_LIMIT_WINDOW_MS };
  }

  stats.count += 1;
  APP_STATE.throttle.set(ip, stats);

  trimMap(APP_STATE.throttle, CONFIG.MAX_THROTTLE_ENTRIES);

  return stats.count > CONFIG.RATE_LIMIT_MAX_REQUESTS;
}

function trimMap(map, maxEntries) {
  while (map.size > maxEntries) {
    const oldestKey = map.keys().next().value;
    map.delete(oldestKey);
  }
}

function getClientIP(req) {
  return req.headers.get('CF-Connecting-IP')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
}

function getHealthSnapshot() {
  const profiles = {};

  for (const [profile, nodes] of Object.entries(APP_STATE.resolversByProfile)) {
    profiles[profile] = nodes.map((node) => ({
      url: node.url,
      score: node.score,
      ok: node.ok,
      fail: node.fail,
      timeout: node.timeout,
      lastLatencyMs: node.lastLatencyMs,
      lastError: node.lastError
    }));
  }

  return {
    version: VERSION,
    cacheEntries: APP_STATE.cache.size,
    throttleEntries: APP_STATE.throttle.size,
    profiles
  };
}

function dnsResponse(body, extraHeaders = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/dns-message',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  });
}

function textResponse(text, status = 200, headers = {}) {
  return new Response(text, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      ...headers
    }
  });
}

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers
    }
  });
}

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sanitizeHeaderValue(value) {
  return String(value).replace(/[\r\n]/g, '').slice(0, 200);
}
