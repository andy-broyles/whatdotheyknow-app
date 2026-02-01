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
  try {
    // Try freeipapi.com first
    const response = await fetch('https://freeipapi.com/api/json');
    if (response.ok) {
      const data = await response.json();
      return {
        ip: data.ipAddress || 'Unknown',
        city: data.cityName || 'Unknown',
        country: data.countryName || 'Unknown',
        region: data.regionName || 'Unknown',
        isp: data.isProxy ? 'Proxy/VPN Detected' : 'Unknown',
        timezone: data.timeZone || 'Unknown',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
      };
    }
  } catch {
    // Fallback to ip-api.com
    try {
      const response = await fetch('http://ip-api.com/json');
      if (response.ok) {
        const data = await response.json();
        return {
          ip: data.query || 'Unknown',
          city: data.city || 'Unknown',
          country: data.country || 'Unknown',
          region: data.regionName || 'Unknown',
          isp: data.isp || 'Unknown',
          timezone: data.timezone || 'Unknown',
          latitude: data.lat || 0,
          longitude: data.lon || 0,
        };
      }
    } catch {
      return null;
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

    // Also try to fetch a known ad script
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
