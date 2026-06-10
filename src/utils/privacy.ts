import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Types
export interface IPInfo {
  ip: string;
  city: string;
  country: string;
  region: string;
  isp: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

export interface WebRTCInfo {
  localIPs: string[];
  publicIPs: string[];
  mdnsCandidates: string[];
  // True only when a PUBLIC IP is exposed via WebRTC. Local/mDNS candidates
  // are visible to scripts but are not an IP leak by themselves.
  leaking: boolean;
}

export interface WebGLInfo {
  vendor: string;
  renderer: string;
  available: boolean;
}

// Get IP and geolocation info
export async function getIPInfo(): Promise<IPInfo | null> {
  // Try multiple APIs in sequence until one works
  const apis = [
    {
      url: 'https://ipapi.co/json/',
      parse: (data: Record<string, unknown>) => ({
        ip: (data.ip as string) || 'Unknown',
        city: (data.city as string) || 'Unknown',
        country: (data.country_name as string) || 'Unknown',
        region: (data.region as string) || 'Unknown',
        isp: (data.org as string) || 'Unknown',
        timezone: (data.timezone as string) || 'Unknown',
        latitude: (data.latitude as number) || 0,
        longitude: (data.longitude as number) || 0,
      }),
    },
    {
      url: 'https://freeipapi.com/api/json',
      parse: (data: Record<string, unknown>) => ({
        ip: (data.ipAddress as string) || 'Unknown',
        city: (data.cityName as string) || 'Unknown',
        country: (data.countryName as string) || 'Unknown',
        region: (data.regionName as string) || 'Unknown',
        isp: data.isProxy ? 'Proxy/VPN Detected' : 'Unknown',
        timezone: (data.timeZone as string) || 'Unknown',
        latitude: (data.latitude as number) || 0,
        longitude: (data.longitude as number) || 0,
      }),
    },
    {
      url: 'https://ipwho.is/',
      parse: (data: Record<string, unknown>) => ({
        ip: (data.ip as string) || 'Unknown',
        city: (data.city as string) || 'Unknown',
        country: (data.country as string) || 'Unknown',
        region: (data.region as string) || 'Unknown',
        isp: ((data.connection as Record<string, unknown>)?.isp as string) || 'Unknown',
        timezone: ((data.timezone as Record<string, unknown>)?.id as string) || 'Unknown',
        latitude: (data.latitude as number) || 0,
        longitude: (data.longitude as number) || 0,
      }),
    },
  ];

  for (const api of apis) {
    try {
      const response = await fetch(api.url);
      if (response.ok) {
        const data = await response.json();
        // Check if we got valid data (has IP)
        const result = api.parse(data);
        if (result.ip && result.ip !== 'Unknown') {
          return result;
        }
      }
    } catch {
      // Try next API
      continue;
    }
  }

  return null;
}

// Get browser fingerprint using FingerprintJS
export async function getBrowserFingerprint(): Promise<string> {
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch {
    return 'Unable to generate';
  }
}

// Generate canvas fingerprint
export function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'Not available';

    canvas.width = 200;
    canvas.height = 50;

    // Draw various elements to create unique fingerprint
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('WhatDoTheyKnow', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Canvas FP', 4, 35);

    // Get data URL and hash it
    const dataUrl = canvas.toDataURL();
    return hashString(dataUrl);
  } catch {
    return 'Not available';
  }
}

// FNV-1a in two passes (forward + reverse) for a 16-hex-char digest.
// Not cryptographic — just a stable, readable identifier.
function hashString(str: string): string {
  const fnv = (s: string): string => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      hash ^= s.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  };
  return fnv(str) + fnv(str.split('').reverse().join(''));
}

// Get WebGL info
export function getWebGLInfo(): WebGLInfo {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return { vendor: 'Not available', renderer: 'Not available', available: false };
    }

    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    
    if (debugInfo) {
      return {
        vendor: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown',
        renderer: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown',
        available: true,
      };
    }

    return {
      vendor: (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).VENDOR) || 'Unknown',
      renderer: (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).RENDERER) || 'Unknown',
      available: true,
    };
  } catch {
    return { vendor: 'Not available', renderer: 'Not available', available: false };
  }
}

// RFC 1918 / link-local / loopback IPv4 and private/link-local/loopback IPv6
function isPrivateIP(ip: string): boolean {
  if (ip.includes(':')) {
    const v6 = ip.toLowerCase();
    return (
      v6 === '::1' ||
      v6.startsWith('fe80:') || // link-local
      v6.startsWith('fc') || v6.startsWith('fd') // unique local fc00::/7
    );
  }
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

// Detect WebRTC leaks
export async function getWebRTCInfo(): Promise<WebRTCInfo> {
  const result: WebRTCInfo = {
    localIPs: [],
    publicIPs: [],
    mdnsCandidates: [],
    leaking: false,
  };

  if (!window.RTCPeerConnection) {
    return result;
  }

  try {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const localIPs = new Set<string>();
    const publicIPs = new Set<string>();
    const mdns = new Set<string>();

    pc.createDataChannel('');

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    return new Promise((resolve) => {
      const finish = () => {
        pc.close();
        result.localIPs = Array.from(localIPs);
        result.publicIPs = Array.from(publicIPs);
        result.mdnsCandidates = Array.from(mdns);
        // Only a public IP exposed through ICE is an actual IP leak.
        result.leaking = publicIPs.size > 0;
        resolve(result);
      };

      const timeout = setTimeout(finish, 3000);

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          clearTimeout(timeout);
          finish();
          return;
        }

        const candidate = event.candidate.candidate;
        // Modern browsers replace local IPs with mDNS hostnames (xxx.local)
        const mdnsMatch = candidate.match(/[a-f0-9-]+\.local/i);
        if (mdnsMatch) {
          mdns.add(mdnsMatch[0]);
          return;
        }

        const ipMatch = candidate.match(
          /((\d{1,3}\.){3}\d{1,3})|(([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4})/
        );
        if (ipMatch) {
          const ip = ipMatch[0];
          if (isPrivateIP(ip)) {
            localIPs.add(ip);
          } else {
            publicIPs.add(ip);
          }
        }
      };
    });
  } catch {
    return result;
  }
}

// Detect installed fonts (basic detection)
export function detectFonts(): string[] {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testFonts = [
    'Arial', 'Arial Black', 'Comic Sans MS', 'Courier New', 'Georgia',
    'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Palatino Linotype',
    'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'MS Gothic',
    'MS PGothic', 'MS UI Gothic', 'Meiryo', 'Yu Gothic', 'Segoe UI',
    'Roboto', 'Open Sans', 'Helvetica', 'Helvetica Neue', 'Monaco',
    'Consolas', 'Menlo', 'Ubuntu', 'Cantarell', 'Fira Sans',
  ];

  const detected: string[] = [];
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return detected;

  const getWidth = (font: string): number => {
    ctx.font = `${testSize} ${font}`;
    return ctx.measureText(testString).width;
  };

  const baseWidths = baseFonts.map(getWidth);

  for (const font of testFonts) {
    let isDetected = false;
    for (let i = 0; i < baseFonts.length; i++) {
      const width = getWidth(`'${font}', ${baseFonts[i]}`);
      if (width !== baseWidths[i]) {
        isDetected = true;
        break;
      }
    }
    if (isDetected) {
      detected.push(font);
    }
  }

  return detected;
}

// Detect ad blocker
export async function detectAdBlocker(): Promise<boolean> {
  try {
    // Create a bait element
    const bait = document.createElement('div');
    bait.className = 'adsbox ad-banner ad-placeholder pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links';
    bait.style.cssText = 'position: absolute; top: -10px; left: -10px; width: 1px; height: 1px;';
    document.body.appendChild(bait);

    // Wait a bit for ad blockers to act
    await new Promise(resolve => setTimeout(resolve, 100));

    const blocked = bait.offsetHeight === 0 || 
                    bait.offsetParent === null || 
                    getComputedStyle(bait).display === 'none';

    document.body.removeChild(bait);

    // Try to fetch a known ad script
    try {
      await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
        method: 'HEAD',
        mode: 'no-cors',
      });
    } catch {
      return true;
    }

    return blocked;
  } catch {
    return false;
  }
}

// Check cookie status.
// Note: third-party cookies genuinely cannot be tested from a single
// first-party page — that requires an embedded cross-site iframe. We report
// a first-party write test and are explicit about that limitation.
export function getCookieStatus(): { enabled: boolean; firstPartyWrite: string; thirdParty: string } {
  const enabled = navigator.cookieEnabled;
  let firstPartyWrite = 'Unknown';

  try {
    document.cookie = 'testcookie=1; SameSite=Lax; path=/';
    if (document.cookie.indexOf('testcookie') !== -1) {
      document.cookie = 'testcookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
      firstPartyWrite = 'Allowed';
    } else {
      firstPartyWrite = 'Blocked';
    }
  } catch {
    firstPartyWrite = 'Unable to test';
  }

  return { enabled, firstPartyWrite, thirdParty: 'Not testable from this page' };
}

// Get screen info
export function getScreenInfo() {
  return {
    width: window.screen.width,
    height: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    colorDepth: window.screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
  };
}

// Get timezone and language
export function getLocaleInfo() {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    languages: navigator.languages ? [...navigator.languages] : [navigator.language],
    platform: navigator.platform,
  };
}

// Get user agent
export function getUserAgent(): string {
  return navigator.userAgent;
}

// Parse user agent for display
export function parseUserAgent(ua: string) {
  let browser = 'Unknown';
  let os = 'Unknown';

  // Detect browser — order matters: Opera/Edge/Samsung UAs all contain "Chrome/"
  if (ua.includes('Firefox/') && !ua.includes('Seamonkey')) browser = 'Firefox';
  else if (ua.includes('Edg/') || ua.includes('EdgA/') || ua.includes('EdgiOS/')) browser = 'Microsoft Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('SamsungBrowser/')) browser = 'Samsung Internet';
  else if (ua.includes('Chrome/') || ua.includes('CriOS/')) browser = 'Chrome (or Chromium-based)';
  else if (ua.includes('Safari/')) browser = 'Safari';

  // Detect OS — mobile checks first ("Android" UAs also contain "Linux")
  if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) os = 'iOS';
  else if (ua.includes('Windows NT 10')) os = 'Windows 10/11 (the UA cannot distinguish them)';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = navigator.maxTouchPoints > 1 ? 'iPadOS (reports as macOS)' : 'macOS';
  else if (ua.includes('CrOS')) os = 'ChromeOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return { browser, os };
}

// Network / connection (Network Information API)
export interface ConnectionInfo {
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean | null;
}

export function getConnectionInfo(): ConnectionInfo | null {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean } };
  if (!nav.connection) return null;
  const c = nav.connection;
  return {
    effectiveType: c.effectiveType ?? null,
    downlink: c.downlink ?? null,
    rtt: c.rtt ?? null,
    saveData: c.saveData ?? null,
  };
}

// Hardware (fingerprint signals)
export function getHardwareInfo() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    deviceMemory: nav.deviceMemory ?? null,
  };
}

// Referrer (where you came from)
export function getReferrer(): string {
  const r = document.referrer;
  return r || '(none or blocked)';
}

// Do Not Track (largely obsolete — Firefox removed it; most sites ignore it)
export function getDoNotTrack(): string {
  const dnt = navigator.doNotTrack ?? (navigator as Navigator & { msDoNotTrack?: string }).msDoNotTrack;
  if (dnt === '1') return 'Yes';
  if (dnt === '0') return 'No';
  return 'Not set';
}

// Global Privacy Control — the successor signal to DNT, legally enforceable
// under some laws (e.g. California CCPA/CPRA, Colorado CPA).
export function getGlobalPrivacyControl(): string {
  const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
  if (gpc === true) return 'Enabled';
  if (gpc === false) return 'Disabled';
  return 'Not supported';
}

// Storage estimate (quota / usage for tracking storage)
export async function getStorageEstimate(): Promise<{ quota: number; usage: number; usagePercent: string } | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const est = await navigator.storage.estimate();
    const quota = Number(est.quota ?? 0);
    const usage = Number(est.usage ?? 0);
    const usagePercent = quota > 0 ? ((usage / quota) * 100).toFixed(1) + '%' : '—';
    return { quota, usage, usagePercent };
  } catch {
    return null;
  }
}

// Speed test types
export interface SpeedTestResult {
  server: string;
  location: string;
  latency: number | null;
  status: 'pending' | 'testing' | 'done' | 'error';
}

// Test latency to a server
async function testLatency(url: string): Promise<number | null> {
  try {
    const start = performance.now();
    await fetch(url, { 
      method: 'HEAD', 
      mode: 'no-cors',
      cache: 'no-store',
    });
    const end = performance.now();
    return Math.round(end - start);
  } catch {
    return null;
  }
}

// Run speed tests to multiple servers
export async function runSpeedTests(
  onUpdate: (results: SpeedTestResult[]) => void
): Promise<SpeedTestResult[]> {
  const servers = [
    { url: 'https://www.google.com/favicon.ico', server: 'Google', location: 'Global CDN' },
    { url: 'https://www.cloudflare.com/favicon.ico', server: 'Cloudflare', location: 'Global CDN' },
    { url: 'https://aws.amazon.com/favicon.ico', server: 'Amazon AWS', location: 'US East' },
    { url: 'https://azure.microsoft.com/favicon.ico', server: 'Microsoft Azure', location: 'Global' },
    { url: 'https://github.com/favicon.ico', server: 'GitHub', location: 'Global CDN' },
  ];

  const results: SpeedTestResult[] = servers.map(s => ({
    server: s.server,
    location: s.location,
    latency: null,
    status: 'pending' as const,
  }));

  onUpdate([...results]);

  // Test each server sequentially for more accurate results
  for (let i = 0; i < servers.length; i++) {
    results[i].status = 'testing';
    onUpdate([...results]);

    // Warm-up request so DNS resolution and TLS handshake don't inflate
    // the first measurement, then run 3 tests and take the median.
    await testLatency(servers[i].url + '?warmup=' + Date.now());

    const latencies: number[] = [];
    for (let j = 0; j < 3; j++) {
      const latency = await testLatency(servers[i].url + '?t=' + Date.now());
      if (latency !== null) {
        latencies.push(latency);
      }
    }

    if (latencies.length > 0) {
      latencies.sort((a, b) => a - b);
      results[i].latency = latencies[Math.floor(latencies.length / 2)];
      results[i].status = 'done';
    } else {
      results[i].status = 'error';
    }

    onUpdate([...results]);
  }

  return results;
}
