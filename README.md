# What Do They Know?

A privacy tool that shows you what information websites can collect about you just by visiting them.

**Live site:** [whatdotheyknow.app](https://whatdotheyknow.app)

## Features

- **IP Address & Geolocation** - Your public IP, city, country, ISP, and timezone
- **Browser Fingerprint** - Unique identifier generated from your browser characteristics (via FingerprintJS)
- **Canvas Fingerprint** - Hash generated from how your browser renders graphics
- **WebGL Info** - Your graphics card vendor and renderer
- **WebRTC Leak Test** - Detects if your real IP is exposed through WebRTC
- **Font Detection** - Lists fonts installed on your system
- **Ad Blocker Detection** - Checks if you're using an ad blocker
- **Cookie Status** - Whether cookies and third-party cookies are enabled
- **Screen & Display** - Resolution, color depth, and pixel ratio
- **Timezone & Language** - System locale information
- **User Agent** - Browser and OS details

## Privacy

**100% client-side.** No data is stored or transmitted to any server. Everything runs in your browser.

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

## Deployment

Configured for Vercel. Just connect the repo and deploy.

## Credits

Thanks, Tom

## License

MIT
