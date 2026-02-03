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
  publicIP: string | null;
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
    return hashString(dataUrl).substring(0, 16);
  } catch {
    return 'Not available';
  }
}

// Simple hash function
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
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

// Detect WebRTC leaks
export async function getWebRTCInfo(): Promise<WebRTCInfo> {
  const result: WebRTCInfo = {
    localIPs: [],
    publicIP: null,
    leaking: false,
  };

  if (!window.RTCPeerConnection) {
    return result;
  }

  try {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const ips = new Set<string>();

    pc.createDataChannel('');
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        pc.close();
        result.localIPs = Array.from(ips);
        result.leaking = ips.size > 0;
        resolve(result);
      }, 3000);

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          clearTimeout(timeout);
          pc.close();
          result.localIPs = Array.from(ips);
          result.leaking = ips.size > 0;
          resolve(result);
          return;
        }

        const candidate = event.candidate.candidate;
        const ipMatch = candidate.match(/(\d{1,3}\.){3}\d{1,3}/);
        
        if (ipMatch) {
          const ip = ipMatch[0];
          // Check if it's a local IP
          if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
            ips.add(ip);
          } else if (!ip.startsWith('0.')) {
            result.publicIP = ip;
            ips.add(ip);
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

// Check cookie status
export function getCookieStatus(): { enabled: boolean; thirdParty: string } {
  const enabled = navigator.cookieEnabled;
  
  // Third-party cookie detection is tricky and often blocked
  // We can only provide a basic indication
  let thirdParty = 'Unknown';
  
  try {
    // Try to set a test cookie
    document.cookie = 'testcookie=1; SameSite=None; Secure';
    if (document.cookie.indexOf('testcookie') !== -1) {
      document.cookie = 'testcookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      thirdParty = 'Likely Enabled';
    } else {
      thirdParty = 'Likely Blocked';
    }
  } catch {
    thirdParty = 'Unable to test';
  }

  return { enabled, thirdParty };
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

  // Detect browser
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

  // Detect OS
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

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

// Do Not Track
export function getDoNotTrack(): string {
  const dnt = navigator.doNotTrack ?? (navigator as Navigator & { msDoNotTrack?: string }).msDoNotTrack;
  if (dnt === '1') return 'Yes';
  if (dnt === '0') return 'No';
  return 'Not set';
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

    // Run 3 tests and take the median for more accuracy
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
