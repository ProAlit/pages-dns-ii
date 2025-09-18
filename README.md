# DNS-over-HTTPS Proxy on Cloudflare Pages

A minimalist **DNS-over-HTTPS (DoH) proxy** built to run effortlessly on Cloudflare Pages.

---

## 🚀 Quick Start

### 1. Clone this Repository

- Fork or clone this repo to your own GitHub account.

### 2. Deploy to Cloudflare Pages

- Sign up for a free [Cloudflare Pages](https://pages.cloudflare.com/) account.
- Create a new project and connect it to your cloned GitHub repository.
- Deploy your project with the default settings.

### 3. Customize Your DoH Endpoint

- You can change the `doh` variable in `index.js` to any DNS-over-HTTPS server.
- Confirmed to work with Cloudflare and Google DNS.

---

## 💡 Why Use This?

- **Bypass ISP Blocks:** If ISPs start blocking known DoH providers, run your own proxy.
- **Custom Domain Support:** Use your own domain (Cloudflare or any other provider) to further evade censorship.
- **Minimal Setup:** Deploy in minutes—no server management required.

