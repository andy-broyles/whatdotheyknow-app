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
  // true/false when the API reports VPN or proxy; null = API doesn't say.
  // Datacenter/hosting alone is not treated as a VPN.
  vpnOrProxy: boolean | null;
  source: string;
}

export interface WebRTCInfo {
  localIPs: string[];
  publicIPs: string[];
  cgnatIPs: string[];
  mdnsCandidates: string[];
  // True only when a PUBLIC IP is exposed via WebRTC. Local, mDNS, and
  // CGNAT (100.64.0.0/10) candidates are visible to scripts but are not
  // an internet-facing leak by themselves.
  leaking: boolean;
}

export interface WebGLInfo {
  vendor: string;
  renderer: string;
  available: boolean;
  /** True only when WEBGL_debug_renderer_info gave an unmasked name. */
  unmasked: boolean;
}

const IP_LOOKUP_TIMEOUT_MS = 3000;

// Get IP and geolocation info
export async function getIPInfo(signal?: AbortSignal): Promise<IPInfo | null> {
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
        vpnOrProxy: null, // ipapi.co free tier doesn't report proxy status
        source: 'ipapi.co',
      }),
    },
    {
      url: 'https://freeipapi.com/api/json',
      parse: (data: Record<string, unknown>) => ({
        ip: (data.ipAddress as string) || 'Unknown',
        city: (data.cityName as string) || 'Unknown',
        country: (data.countryName as string) || 'Unknown',
        region: (data.regionName as string) || 'Unknown',
        isp: 'Unknown',
        timezone: (data.timeZone as string) || 'Unknown',
        latitude: (data.latitude as number) || 0,
        longitude: (data.longitude as number) || 0,
        vpnOrProxy: typeof data.isProxy === 'boolean' ? data.isProxy : null,
        source: 'freeipapi.com',
      }),
    },
    {
      url: 'https://ipwho.is/',
      parse: (data: Record<string, unknown>) => {
        const security = data.security as Record<string, unknown> | undefined;
        const conn = data.connection as Record<string, unknown> | undefined;
        let vpnOrProxy: boolean | null = null;
        if (security && (typeof security.vpn === 'boolean' || typeof security.proxy === 'boolean')) {
          vpnOrProxy = security.vpn === true || security.proxy === true;
        }
        return {
          ip: (data.ip as string) || 'Unknown',
          city: (data.city as string) || 'Unknown',
          country: (data.country as string) || 'Unknown',
          region: (data.region as string) || 'Unknown',
          isp: (conn?.isp as string) || 'Unknown',
          timezone: ((data.timezone as Record<string, unknown>)?.id as string) || 'Unknown',
          latitude: (data.latitude as number) || 0,
          longitude: (data.longitude as number) || 0,
          vpnOrProxy,
          source: 'ipwho.is',
        };
      },
    },
  ];

  for (const api of apis) {
    if (signal?.aborted) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IP_LOOKUP_TIMEOUT_MS);
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);
    try {
      const response = await fetch(api.url, { signal: controller.signal });
      if (response.ok) {
        const data = await response.json();
        const result = api.parse(data);
        if (result.ip && result.ip !== 'Unknown') {
          return result;
        }
      }
    } catch {
      if (signal?.aborted) return null;
      // Timeout, network error, or abort — try the next API
      continue;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
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
      return { vendor: 'Not available', renderer: 'Not available', available: false, unmasked: false };
    }

    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    
    if (debugInfo) {
      return {
        vendor: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown',
        renderer: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown',
        available: true,
        unmasked: true,
      };
    }

    return {
      vendor: (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).VENDOR) || 'Unknown',
      renderer: (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).RENDERER) || 'Unknown',
      available: true,
      unmasked: false,
    };
  } catch {
    return { vendor: 'Not available', renderer: 'Not available', available: false, unmasked: false };
  }
}

// RFC 1918 / link-local / loopback IPv4 and private/link-local/loopback IPv6
function isPrivateIP(ip: string): boolean {
  if (ip.includes(':')) {
    const v6 = ip.toLowerCase().split('%')[0];
    return (
      v6 === '::1' ||
      v6.startsWith('fe80:') ||
      v6.startsWith('fc') ||
      v6.startsWith('fd')
    );
  }
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) return false;
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

// Carrier-grade NAT (RFC 6598): 100.64.0.0/10. Shared by many subscribers
// behind an ISP; not a globally routable address, so not a public IP leak.
function isCgnatIP(ip: string): boolean {
  if (ip.includes(':')) return false;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  const [a, b] = parts;
  return a === 100 && b >= 64 && b <= 127;
}

function iceAddress(candidate: RTCIceCandidate): string | null {
  const ext = candidate as RTCIceCandidate & { address?: string | null };
  if (ext.address) return ext.address;
  // candidate:foundation component protocol priority address port typ ...
  const parts = candidate.candidate.split(' ');
  return parts.length >= 5 ? parts[4] : null;
}

// Detect WebRTC leaks
export async function getWebRTCInfo(signal?: AbortSignal): Promise<WebRTCInfo> {
  const result: WebRTCInfo = {
    localIPs: [],
    publicIPs: [],
    cgnatIPs: [],
    mdnsCandidates: [],
    leaking: false,
  };

  if (!window.RTCPeerConnection || signal?.aborted) {
    return result;
  }

  try {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const localIPs = new Set<string>();
    const publicIPs = new Set<string>();
    const cgnatIPs = new Set<string>();
    const mdns = new Set<string>();

    pc.createDataChannel('');

    const offer = await pc.createOffer();
    if (signal?.aborted) {
      pc.close();
      return result;
    }
    await pc.setLocalDescription(offer);
    if (signal?.aborted) {
      pc.close();
      return result;
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener('abort', finish);
        clearTimeout(timeout);
        pc.close();
        result.localIPs = Array.from(localIPs);
        result.publicIPs = Array.from(publicIPs);
        result.cgnatIPs = Array.from(cgnatIPs);
        result.mdnsCandidates = Array.from(mdns);
        result.leaking = publicIPs.size > 0;
        resolve(result);
      };

      const timeout = setTimeout(finish, 3000);
      signal?.addEventListener('abort', finish, { once: true });
      if (signal?.aborted) finish();

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          finish();
          return;
        }

        const ip = iceAddress(event.candidate);
        if (!ip) return;

        if (/\.local$/i.test(ip) || ip.includes('.local')) {
          mdns.add(ip);
          return;
        }

        if (isPrivateIP(ip)) {
          localIPs.add(ip);
        } else if (isCgnatIP(ip)) {
          cgnatIPs.add(ip);
        } else {
          publicIPs.add(ip);
        }
      };
    });
  } catch {
    return result;
  }
}

// Detect installed fonts (basic detection).
// Helvetica / Helvetica Neue are omitted: Windows commonly aliases them to Arial,
// which would report Helvetica as installed when it is not.
export function detectFonts(): string[] {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testFonts = [
    'Arial', 'Arial Black', 'Comic Sans MS', 'Courier New', 'Georgia',
    'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Palatino Linotype',
    'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'MS Gothic',
    'MS PGothic', 'MS UI Gothic', 'Meiryo', 'Yu Gothic', 'Segoe UI',
    'Roboto', 'Open Sans', 'Monaco',
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
export async function detectAdBlocker(signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return false;
  const bait = document.createElement('div');
  bait.className = 'adsbox ad-banner ad-placeholder pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links';
  bait.style.cssText = 'position: absolute; top: -10px; left: -10px; width: 1px; height: 1px;';

  try {
    document.body.appendChild(bait);
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, 100);
      if (signal?.aborted) {
        onAbort();
        return;
      }
      signal?.addEventListener('abort', onAbort, { once: true });
    });

    const baitBlocked =
      bait.offsetHeight === 0 ||
      bait.offsetParent === null ||
      getComputedStyle(bait).display === 'none';

    // Bait already caught it — skip the extra request to Google.
    if (baitBlocked) return true;

    try {
      await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
        method: 'HEAD',
        mode: 'no-cors',
        signal,
      });
    } catch {
      if (signal?.aborted) return false;
      return true;
    }

    return false;
  } catch {
    return false;
  } finally {
    bait.remove();
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
export type ScreenInfo = ReturnType<typeof getScreenInfo>;

// Get timezone and language
export function getLocaleInfo() {
  const offsetMin = -new Date().getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    utcOffset: `UTC${sign}${hh}:${mm}`,
    language: navigator.language,
    languages: navigator.languages ? [...navigator.languages] : [navigator.language],
    platform: navigator.platform,
  };
}
export type LocaleInfo = ReturnType<typeof getLocaleInfo>;

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
export type HardwareInfo = ReturnType<typeof getHardwareInfo>;

// Referrer (where you came from)
export function getReferrer(): string {
  const r = document.referrer;
  return r || '(none or blocked)';
}

// Do Not Track (largely obsolete — Firefox removed it; most sites ignore it)
export function getDoNotTrack(): string {
  const nav = navigator as Navigator & { msDoNotTrack?: string };
  const dnt = navigator.doNotTrack ?? nav.msDoNotTrack ?? (window as Window & { doNotTrack?: string }).doNotTrack;
  if (dnt === '1' || dnt === 'yes') return 'Yes';
  if (dnt === '0' || dnt === 'no') return 'No';
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

// Audio fingerprint: render a fixed oscillator through a compressor in an
// OfflineAudioContext and hash the output samples. Like canvas, tiny
// hardware/driver differences in float math make the result identifying.
export async function getAudioFingerprint(): Promise<string> {
  try {
    const OfflineCtx = window.OfflineAudioContext ||
      (window as Window & { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    if (!OfflineCtx) return 'Not available';

    const ctx = new OfflineCtx(1, 44100, 44100);
    const oscillator = ctx.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 10000;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;

    oscillator.connect(compressor);
    compressor.connect(ctx.destination);
    oscillator.start(0);

    const buffer = await ctx.startRendering();
    const samples = buffer.getChannelData(0);
    // Sum a slice of samples — the standard audio-fingerprint reduction
    let sum = 0;
    for (let i = 4500; i < 5000; i++) sum += Math.abs(samples[i]);
    return sum.toString();
  } catch {
    return 'Not available';
  }
}

// Media device counts — enumerable WITHOUT any permission prompt
// (labels stay hidden until permission is granted, but counts leak)
export async function getMediaDeviceCounts(): Promise<{ audioinput: number; audiooutput: number; videoinput: number; labelsVisible: boolean } | null> {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return null;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const counts = { audioinput: 0, audiooutput: 0, videoinput: 0 };
    let labelsVisible = false;
    for (const d of devices) {
      if (d.kind in counts) counts[d.kind as keyof typeof counts]++;
      if (d.label) labelsVisible = true;
    }
    return { ...counts, labelsVisible };
  } catch {
    return null;
  }
}

export function getWebdriver(): boolean {
  return navigator.webdriver === true;
}

export function getPdfViewerEnabled(): boolean | null {
  return typeof navigator.pdfViewerEnabled === 'boolean' ? navigator.pdfViewerEnabled : null;
}

export async function getSpeechVoices(): Promise<{ count: number; names: string[] } | null> {
  if (!('speechSynthesis' in window)) return null;
  const read = () => window.speechSynthesis.getVoices().map(v => v.name).filter(Boolean);
  let names = read();
  if (names.length === 0) {
    names = await new Promise<string[]>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.speechSynthesis.removeEventListener('voiceschanged', finish);
        resolve(read());
      };
      window.speechSynthesis.addEventListener('voiceschanged', finish);
      setTimeout(finish, 800);
    });
  }
  return { count: names.length, names: names.slice(0, 8) };
}

// Permission states — what you've already granted, silently re-usable by sites
export interface PermissionState_ {
  name: string;
  state: string;
}

export async function getPermissionStates(): Promise<PermissionState_[]> {
  if (!navigator.permissions?.query) return [];
  const names = ['geolocation', 'notifications', 'camera', 'microphone', 'clipboard-read', 'midi'];
  const results: PermissionState_[] = [];
  for (const name of names) {
    try {
      const status = await navigator.permissions.query({ name: name as PermissionName });
      results.push({ name, state: status.state });
    } catch {
      // Permission name not supported in this browser — skip rather than guess
    }
  }
  return results;
}

// Client hints via User-Agent Client Hints API (Chromium).
// High-entropy values (exact OS version, architecture, device model) are
// available to any script that asks — no permission needed.
export interface ClientHintsInfo {
  supported: boolean;
  brands: string[];
  mobile: boolean | null;
  platform: string | null;
  platformVersion: string | null;
  architecture: string | null;
  model: string | null;
  fullVersion: string | null;
}

export async function getClientHints(): Promise<ClientHintsInfo> {
  const uad = (navigator as Navigator & {
    userAgentData?: {
      brands: { brand: string; version: string }[];
      mobile: boolean;
      platform: string;
      getHighEntropyValues(hints: string[]): Promise<Record<string, unknown>>;
    };
  }).userAgentData;

  if (!uad) {
    return { supported: false, brands: [], mobile: null, platform: null, platformVersion: null, architecture: null, model: null, fullVersion: null };
  }

  const result: ClientHintsInfo = {
    supported: true,
    brands: uad.brands.filter(b => !b.brand.includes('Not')).map(b => `${b.brand} ${b.version}`),
    mobile: uad.mobile,
    platform: uad.platform,
    platformVersion: null,
    architecture: null,
    model: null,
    fullVersion: null,
  };

  try {
    const high = await uad.getHighEntropyValues(['platformVersion', 'architecture', 'model', 'uaFullVersion']);
    result.platformVersion = (high.platformVersion as string) || null;
    result.architecture = (high.architecture as string) || null;
    result.model = (high.model as string) || null;
    result.fullVersion = (high.uaFullVersion as string) || null;
  } catch {
    // high-entropy values denied — low-entropy data above is still valid
  }
  return result;
}

// System preferences readable via CSS media queries — each is a fingerprint bit
export function getSystemPreferences() {
  const mq = (q: string) => window.matchMedia(q).matches;
  return {
    colorScheme: mq('(prefers-color-scheme: dark)') ? 'Dark' : 'Light',
    reducedMotion: mq('(prefers-reduced-motion: reduce)'),
    highContrast: mq('(prefers-contrast: more)'),
    invertedColors: mq('(inverted-colors: inverted)'),
    forcedColors: mq('(forced-colors: active)'),
    colorGamut: mq('(color-gamut: p3)') ? 'P3' : mq('(color-gamut: srgb)') ? 'sRGB' : 'Not reported',
    touchSupport: navigator.maxTouchPoints > 0,
    maxTouchPoints: navigator.maxTouchPoints,
    pointerType: mq('(pointer: coarse)') ? 'Touch' : mq('(pointer: fine)') ? 'Mouse or trackpad' : 'None detected',
  };
}
export type SystemPreferences = ReturnType<typeof getSystemPreferences>;

// Battery Status API (Chromium only; removed from Firefox/Safari for privacy)
export async function getBatteryInfo(): Promise<{ level: number; charging: boolean } | null> {
  try {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> };
    if (!nav.getBattery) return null;
    const battery = await nav.getBattery();
    return { level: Math.round(battery.level * 100), charging: battery.charging };
  } catch {
    return null;
  }
}

// Fingerprint persistence demo. Saved in the user's own localStorage along
// with theme preference. It demonstrates that a nickname can survive cookies.
const FP_HISTORY_KEY = 'wdtk-fingerprint-history';

export interface FingerprintHistory {
  previousId: string | null;
  previousDate: string | null;
  matches: boolean | null; // null on first visit
}

// Compare-and-record only once per page load — otherwise StrictMode's double
// effect (or the Refresh button) would record the current visit and then
// immediately "match" it, telling first-time visitors they were seen before.
let fpHistoryThisLoad: FingerprintHistory | null = null;

export function checkFingerprintHistory(currentId: string): FingerprintHistory {
  if (fpHistoryThisLoad) return fpHistoryThisLoad;
  try {
    const raw = localStorage.getItem(FP_HISTORY_KEY);
    const prev = raw ? (JSON.parse(raw) as { id: string; date: string }) : null;
    localStorage.setItem(FP_HISTORY_KEY, JSON.stringify({ id: currentId, date: new Date().toISOString() }));
    fpHistoryThisLoad = prev
      ? { previousId: prev.id, previousDate: prev.date, matches: prev.id === currentId }
      : { previousId: null, previousDate: null, matches: null };
    return fpHistoryThisLoad;
  } catch {
    return { previousId: null, previousDate: null, matches: null };
  }
}

export function clearFingerprintHistory(): void {
  try {
    localStorage.removeItem(FP_HISTORY_KEY);
    fpHistoryThisLoad = { previousId: null, previousDate: null, matches: null };
  } catch {
    // storage unavailable — nothing to clear
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
async function testLatency(url: string, signal?: AbortSignal): Promise<number | null> {
  try {
    const start = performance.now();
    await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal,
    });
    const end = performance.now();
    return Math.round(end - start);
  } catch {
    return null;
  }
}

// Run speed tests to multiple servers
export async function runSpeedTests(
  onUpdate: (results: SpeedTestResult[]) => void,
  signal?: AbortSignal,
): Promise<SpeedTestResult[]> {
  const servers = [
    { url: 'https://www.google.com/favicon.ico', server: 'Google', location: 'Global CDN' },
    { url: 'https://www.cloudflare.com/favicon.ico', server: 'Cloudflare', location: 'Global CDN' },
    { url: 'https://aws.amazon.com/favicon.ico', server: 'Amazon AWS', location: 'Global' },
    { url: 'https://azure.microsoft.com/favicon.ico', server: 'Microsoft Azure', location: 'Global' },
    { url: 'https://github.com/favicon.ico', server: 'GitHub', location: 'Global CDN' },
  ];

  const results: SpeedTestResult[] = servers.map(s => ({
    server: s.server,
    location: s.location,
    latency: null,
    status: 'pending' as const,
  }));

  if (signal?.aborted) return results;
  onUpdate([...results]);

  // Test each server sequentially for more accurate results
  for (let i = 0; i < servers.length; i++) {
    if (signal?.aborted) return results;
    results[i].status = 'testing';
    onUpdate([...results]);

    // Warm-up request so DNS resolution and TLS handshake don't inflate
    // the first measurement, then run 3 tests and take the median.
    await testLatency(servers[i].url + '?warmup=' + Date.now(), signal);
    if (signal?.aborted) return results;

    const latencies: number[] = [];
    for (let j = 0; j < 3; j++) {
      if (signal?.aborted) return results;
      const latency = await testLatency(servers[i].url + '?t=' + Date.now(), signal);
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
