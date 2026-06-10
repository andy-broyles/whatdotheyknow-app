# What Do They Know?

A privacy tool that shows you what information websites can collect about you just by visiting them.

**Live site:** [whatdotheyknow.app](https://whatdotheyknow.app)

## Features

- **IP Address & Geolocation** - Your public IP, city, country, ISP, and timezone
- **Browser Fingerprint** - Unique identifier generated from your browser characteristics (via FingerprintJS)
- **Canvas Fingerprint** - Hash generated from how your browser renders graphics
- **WebGL Info** - Your graphics card vendor and renderer
- **WebRTC Leak Test** - Detects if your real public IP is exposed through WebRTC (distinguishes public leaks from harmless local/mDNS candidates)
- **Font Detection** - Lists fonts installed on your system
- **Ad Blocker Detection** - Checks if you're using an ad blocker
- **Cookie Status** - Whether cookies are enabled and a first-party write test (third-party cookies can't be tested from a single first-party page, and the app says so honestly)
- **Screen & Display** - Resolution, color depth, and pixel ratio
- **Timezone & Language** - System locale information
- **User Agent** - Browser and OS details
- **Server Response Time** - Median HTTP round-trip time (after a warm-up request) to Google, Cloudflare, AWS, Azure, GitHub
- **Network / Connection** - Effective type, downlink, RTT, data saver (Network Information API)
- **Hardware** - CPU cores, device memory (fingerprint signals)
- **Referrer** - Which URL or site sent you here
- **Tracking Signals** - Do Not Track (obsolete) and Global Privacy Control (the modern, legally meaningful signal)
- **Storage (quota)** - How much storage is available/used for the origin
- **Copy report** - Export all results to clipboard as text

## Privacy

**Nothing is stored or logged by this site**, and there are no analytics. Most checks run entirely in your browser. To be precise about what does leave it: the IP lookup queries a third-party geolocation API (ipapi.co, freeipapi.com, or ipwho.is), the WebRTC test contacts a Google STUN server, the ad-blocker check requests a Google ad script, and the response-time test fetches favicons from five public CDNs. Those servers see your IP address — as any server you connect to does — but receive no other data from this app.

## Tech Stack

- React 18
- TypeScript
- Vite
- [FingerprintJS](https://github.com/fingerprintjs/fingerprintjs) (open source)

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## SEO

Optimized per [Google's SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide): canonical URL, meta description, Open Graph & Twitter cards, JSON-LD structured data (WebApplication), semantic heading hierarchy (h1 → h2 → h3), `robots.txt`, and `sitemap.xml`.

## Deployment

Configured for Vercel. Just connect the repo and deploy.

## Credits

Thanks, Tom

## License

MIT
