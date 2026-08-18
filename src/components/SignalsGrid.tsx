import type { ReactNode } from 'react';
import { SignalCard } from './SignalCard';
import type {
  IPInfo,
  WebRTCInfo,
  WebGLInfo,
  ConnectionInfo,
  SpeedTestResult,
  ClientHintsInfo,
  PermissionState_,
  FingerprintHistory,
  ScreenInfo,
  LocaleInfo,
  HardwareInfo,
  SystemPreferences,
} from '../utils/privacy';

export interface PrivacyData {
  ipInfo: IPInfo | null;
  fingerprint: string;
  canvasFingerprint: string;
  webgl: WebGLInfo;
  webrtc: WebRTCInfo;
  fonts: string[];
  adBlocker: boolean;
  cookies: { enabled: boolean; firstPartyWrite: string; thirdParty: string };
  screen: ScreenInfo;
  locale: LocaleInfo;
  userAgent: string;
  parsedUA: { browser: string; os: string };
  speedTests: SpeedTestResult[];
  connection: ConnectionInfo | null;
  hardware: HardwareInfo;
  referrer: string;
  doNotTrack: string;
  gpc: string;
  storageEstimate: { quota: number; usage: number; usagePercent: string } | null;
  audioFingerprint: string;
  mediaDevices: { audioinput: number; audiooutput: number; videoinput: number } | null;
  permissions: PermissionState_[];
  clientHints: ClientHintsInfo;
  preferences: SystemPreferences;
  battery: { level: number; charging: boolean } | null;
  fpHistory: FingerprintHistory;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {children}
    </svg>
  );
}

export function SignalsGrid({
  data,
  loading,
  onClearHistory,
  formatStorageBytes,
}: {
  data: PrivacyData | null;
  loading: boolean;
  onClearHistory: () => void;
  formatStorageBytes: (n: number) => string;
}) {
  return (
    <div className="cards-grid">
      <SignalCard
        icon={<Icon><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></Icon>}
        iconTone="blue"
        title="IP Address & Location"
        info="We request your IP from a third-party API (ipapi.co, freeipapi.com, or ipwho.is). Your browser sends the request; the API returns your IP and approximate location."
        explanation="Your IP address reveals your approximate location and internet provider. Websites use this to serve localized content and track your general whereabouts. If you use a VPN, sites can often still tell: VPN and datacenter IP ranges are publicly catalogued."
        tip={<>A reputable VPN or Tor changes the IP sites see. Note the "VPN/proxy visible" row: sites can usually tell you're on a VPN even though they can't see through it.</>}
        loading={loading}
      >
        {data?.ipInfo ? (
          <>
            <div className="card-value">{data.ipInfo.ip}</div>
            <div className="card-details">
              <div className="card-detail">
                <span className="card-detail-label">City</span>
                <span className="card-detail-value">{data.ipInfo.city}</span>
              </div>
              <div className="card-detail">
                <span className="card-detail-label">Region</span>
                <span className="card-detail-value">{data.ipInfo.region}</span>
              </div>
              <div className="card-detail">
                <span className="card-detail-label">Country</span>
                <span className="card-detail-value">{data.ipInfo.country}</span>
              </div>
              <div className="card-detail">
                <span className="card-detail-label">ISP</span>
                <span className="card-detail-value">{data.ipInfo.isp}</span>
              </div>
              <div className="card-detail">
                <span className="card-detail-label">VPN/proxy visible</span>
                <span className="card-detail-value" style={{ color: data.ipInfo.vpnOrProxy === true ? 'var(--warning)' : undefined }}>
                  {data.ipInfo.vpnOrProxy === true ? `Yes (per ${data.ipInfo.source})` : data.ipInfo.vpnOrProxy === false ? `No (per ${data.ipInfo.source})` : `Not reported by ${data.ipInfo.source}`}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="card-details">
            <div className="card-value" style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>
              Protected or Blocked
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Your browser or an extension (VPN, ad blocker, privacy tool) is blocking IP lookup requests. This is actually good for your privacy!
            </p>
          </div>
        )}
      </SignalCard>

      <SignalCard
        icon={<Icon><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"/></Icon>}
        iconTone="purple"
        title="Browser Fingerprint"
        info="FingerprintJS runs in your browser and combines many signals (canvas, WebGL, fonts, etc.) into a single hash. No data is sent to a server. To demonstrate persistence, we keep your last fingerprint in your own localStorage (clearable anytime)."
        status={<span className="card-status status-warning">Unique ID</span>}
        explanation="This unique identifier is generated from your browser's characteristics. It can track you across websites even without cookies."
        tip={<>Firefox's <code>privacy.resistFingerprinting</code>, the Tor Browser, or Brave's fingerprint randomization make this ID unstable between sessions, which defeats it.</>}
        loading={loading}
        loadingLabel="Generating..."
      >
        <div className="card-value mono">{data?.fingerprint}</div>
        {data?.fpHistory.matches === true && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', marginTop: '0.5rem' }}>
            Same fingerprint as your visit on {new Date(data.fpHistory.previousDate!).toLocaleString()}. This is how
            sites recognize you with no cookies at all.{' '}
            <button onClick={onClearHistory} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit', fontSize: 'inherit' }}>
              Clear stored history
            </button>
          </p>
        )}
        {data?.fpHistory.matches === null && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            First recorded visit. We saved this fingerprint in your browser's localStorage (the only thing this app
            stores, and it never leaves your machine). Revisit later to see if it still identifies you.
          </p>
        )}
        {data?.fpHistory.matches === false && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--success)', marginTop: '0.5rem' }}>
            Different from your visit on {new Date(data.fpHistory.previousDate!).toLocaleString()}. Something about
            your browser changed, which makes you harder to track.
          </p>
        )}
      </SignalCard>

      <SignalCard
        icon={<Icon><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8M12 17v4"/></Icon>}
        iconTone="blue"
        title="User Agent"
        info="Read directly from navigator.userAgent. Your browser sends this string with every request."
        explanation="Your user agent string tells websites your browser type, version, and operating system. This helps serve compatible content but also enables tracking."
        tip={<>You can't usefully hide this. Spoofing the UA breaks sites and makes you <em>more</em> unusual. Using a mainstream browser keeps you in a bigger crowd.</>}
        loading={loading}
      >
        <div className="card-details" style={{ marginBottom: '0.75rem' }}>
          <div className="card-detail">
            <span className="card-detail-label">Browser</span>
            <span className="card-detail-value">{data?.parsedUA.browser}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">OS</span>
            <span className="card-detail-value">{data?.parsedUA.os}</span>
          </div>
        </div>
        <div className="card-value mono" style={{ fontSize: '0.75rem' }}>{data?.userAgent}</div>
      </SignalCard>

      <SignalCard
        icon={<Icon><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8M12 17v4"/></Icon>}
        iconTone="green"
        title="Screen & Display"
        info="Read from window.screen: width, height, availWidth, availHeight, colorDepth, and devicePixelRatio."
        explanation="Screen resolution and color depth are used for responsive design but also contribute to your unique browser fingerprint."
        tip="Common resolutions (1920×1080) blend in; unusual monitors and fractional zoom levels stand out. Tor Browser letterboxes the window to standard sizes for exactly this reason."
        loading={loading}
      >
        <div className="card-details">
          <div className="card-detail">
            <span className="card-detail-label">Resolution</span>
            <span className="card-detail-value">{data?.screen.width} × {data?.screen.height}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Available</span>
            <span className="card-detail-value">{data?.screen.availWidth} × {data?.screen.availHeight}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Color Depth</span>
            <span className="card-detail-value">{data?.screen.colorDepth}-bit</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Pixel Ratio</span>
            <span className="card-detail-value">{data?.screen.pixelRatio}x</span>
          </div>
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></Icon>}
        iconTone="yellow"
        title="Timezone & Language"
        info="From Intl.DateTimeFormat().resolvedOptions().timeZone and navigator.language / navigator.languages."
        explanation="Your timezone and language settings reveal your location and preferences. The full language list is a stronger fingerprint signal than the primary language alone. An unusual combination is very identifying."
        tip="If your IP says one country and your timezone says another, sites notice the mismatch. VPN users should be aware of this. Tor Browser reports UTC for everyone."
        loading={loading}
      >
        <div className="card-details">
          <div className="card-detail">
            <span className="card-detail-label">Timezone</span>
            <span className="card-detail-value">{data?.locale.timezone}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Language</span>
            <span className="card-detail-value">{data?.locale.language}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">All languages</span>
            <span className="card-detail-value">{data?.locale.languages.join(', ')}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Platform</span>
            <span className="card-detail-value">{data?.locale.platform}</span>
          </div>
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></Icon>}
        iconTone="purple"
        title="Canvas Fingerprint"
        info="We draw shapes and text to an off-screen canvas, then hash the pixel data. Small rendering differences create a unique value."
        status={<span className="card-status status-warning">Trackable</span>}
        explanation="Canvas fingerprinting draws invisible graphics and reads the result. Subtle differences in rendering create a unique identifier for your system."
        tip={'Brave randomizes canvas output per-site ("farbling"); Firefox\'s resistFingerprinting and extensions like CanvasBlocker add noise so the hash changes every time.'}
        loading={loading}
        loadingLabel="Generating..."
      >
        <div className="card-value mono">{data?.canvasFingerprint}</div>
      </SignalCard>

      <SignalCard
        icon={<Icon><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></Icon>}
        iconTone="blue"
        title="WebGL Info"
        info="We create a WebGL context and read UNMASKED_VENDOR_WEBGL and UNMASKED_RENDERER_WEBGL (GPU info)."
        explanation="WebGL reveals your graphics card model and driver, which is highly unique and used for fingerprinting."
        tip="Firefox's resistFingerprinting and Tor Browser report a generic renderer instead of your real GPU. Brave randomizes WebGL the same way it does canvas."
        loading={loading}
      >
        {data?.webgl.available ? (
          <div className="card-details">
            <div className="card-detail">
              <span className="card-detail-label">Vendor</span>
              <span className="card-detail-value">{data.webgl.vendor}</span>
            </div>
            <div className="card-detail">
              <span className="card-detail-label">Renderer</span>
              <span className="card-detail-value" style={{ fontSize: '0.75rem' }}>{data.webgl.renderer}</span>
            </div>
          </div>
        ) : (
          <div className="card-value">WebGL not available</div>
        )}
      </SignalCard>

      <SignalCard
        icon={<Icon><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Icon>}
        iconTone="red"
        title="WebRTC Leak Test"
        info="We create a temporary RTCPeerConnection with a STUN server (stun.l.google.com). ICE candidates may reveal IPs. Only a globally routable public IP counts as a leak. Local-network IPs, mDNS (.local) names, and CGNAT (100.64.0.0/10) addresses are visible to scripts but don't identify you on the public internet."
        status={!loading ? (
          <span className={`card-status ${data?.webrtc.leaking ? 'status-danger' : 'status-safe'}`}>
            {data?.webrtc.leaking ? 'Public IP exposed' : 'No leak'}
          </span>
        ) : undefined}
        explanation="WebRTC can expose your real public IP even when using a VPN. The key check is whether the WebRTC IP differs from your HTTP IP. Modern browsers hide local IPs behind mDNS names by default. Carrier-grade NAT (100.64.0.0/10) is a shared ISP address, not a public leak."
        tip={<>Good VPN apps route WebRTC traffic too. Verify with this card while connected. uBlock Origin has a "prevent WebRTC IP leak" setting; Firefox lets you disable WebRTC entirely via <code>media.peerconnection.enabled</code>.</>}
        loading={loading}
        loadingLabel="Testing..."
      >
        {data?.webrtc.leaking ? (
          <>
            <div className="card-value" style={{ color: 'var(--danger)' }}>
              Public IP exposed via WebRTC
              {data.ipInfo && data.webrtc.publicIPs.some(ip => ip !== data.ipInfo!.ip) &&
                ', and it differs from your HTTP IP (possible VPN bypass)'}
            </div>
            <div className="list-items">
              {data.webrtc.publicIPs.map((ip, i) => (
                <span key={i} className="list-item">{ip}</span>
              ))}
            </div>
          </>
        ) : (
          <div className="card-value" style={{ color: 'var(--success)' }}>No public IP exposed</div>
        )}
        {data && (data.webrtc.localIPs.length > 0 || data.webrtc.mdnsCandidates.length > 0 || data.webrtc.cgnatIPs.length > 0) && (
          <>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.5rem 0 0.25rem' }}>
              Local / CGNAT candidates visible to scripts (not an internet-facing leak):
            </p>
            <div className="list-items">
              {[
                ...data.webrtc.localIPs,
                ...data.webrtc.cgnatIPs.map(ip => `${ip} (CGNAT)`),
                ...data.webrtc.mdnsCandidates,
              ].map((ip, i) => (
                <span key={i} className="list-item">{ip}</span>
              ))}
            </div>
          </>
        )}
      </SignalCard>

      <SignalCard
        icon={<Icon><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></Icon>}
        iconTone="purple"
        title="Detected Fonts"
        info="We measure the rendered width of a test string in many font families. If the width differs from the fallback, that font is likely installed."
        status={<span className="card-status status-warning">{data?.fonts.length || 0} found</span>}
        explanation="Your installed fonts create a unique signature. The combination of fonts you have is surprisingly identifiable, especially fonts installed by specific software (Adobe, Microsoft Office, design tools)."
        tip="Avoid installing system-wide fonts you don't need. Firefox's resistFingerprinting restricts sites to a standard font whitelist."
        loading={loading}
        loadingLabel="Detecting..."
      >
        <div className="list-items">
          {data?.fonts.slice(0, 12).map((font, i) => (
            <span key={i} className="list-item">{font}</span>
          ))}
          {(data?.fonts.length || 0) > 12 && (
            <span className="list-item">+{(data?.fonts.length || 0) - 12} more</span>
          )}
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></Icon>}
        iconTone="green"
        title="Ad Blocker"
        info="We add a hidden element with ad-like class names. If it is hidden we treat that as an ad blocker. Otherwise we try to fetch a known ad script."
        status={!loading ? (
          <span className={`card-status ${data?.adBlocker ? 'status-safe' : 'status-warning'}`}>
            {data?.adBlocker ? 'Detected' : 'Not Detected'}
          </span>
        ) : undefined}
        explanation="Websites can detect if you're using an ad blocker. While this protects your privacy, it's also used to fingerprint you."
        tip="Keep the blocker. Blocking trackers helps far more than the one detection bit costs. uBlock Origin is the standard recommendation."
        loading={loading}
        loadingLabel="Testing..."
      >
        <div className="card-value" style={{ color: data?.adBlocker ? 'var(--success)' : 'var(--warning)' }}>
          {data?.adBlocker ? 'Ad blocker is active' : 'No ad blocker detected'}
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><circle cx="12" cy="12" r="10"/><circle cx="8" cy="9" r="1"/><circle cx="15" cy="8" r="1"/><circle cx="10" cy="15" r="1"/><circle cx="16" cy="14" r="1"/></Icon>}
        iconTone="yellow"
        title="Cookie Status"
        info="navigator.cookieEnabled, plus a first-party test cookie we set and immediately delete. Third-party cookie behavior cannot be tested from a single first-party page (it would require an embedded cross-site iframe), so we don't pretend to measure it."
        explanation="Cookies are the primary way websites track you. Third-party cookies enable cross-site tracking by advertisers."
        tip="Block third-party cookies in your browser settings (Firefox and Safari do by default; Chrome still allows them). Everything keeps working for the vast majority of sites."
        loading={loading}
        loadingLabel="Checking..."
      >
        <div className="card-details">
          <div className="card-detail">
            <span className="card-detail-label">Cookies</span>
            <span className="card-detail-value" style={{ color: data?.cookies.enabled ? 'var(--success)' : 'var(--danger)' }}>
              {data?.cookies.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">First-party write</span>
            <span className="card-detail-value">{data?.cookies.firstPartyWrite}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Third-Party</span>
            <span className="card-detail-value">{data?.cookies.thirdParty}</span>
          </div>
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></Icon>}
        iconTone="green"
        title="Server Response Time"
        info="After a warm-up request (so DNS/TLS setup isn't counted), we fetch a small resource from each server 3 times and take the median HTTP round-trip time. This includes server processing time, so it's higher than a raw ping."
        status={!loading && data?.speedTests && data.speedTests.length > 0 && data.speedTests.every(t => t.status === 'done' || t.status === 'error') ? (
          <span className="card-status status-safe">Complete</span>
        ) : undefined}
        explanation="HTTP round-trip time to major servers indicates connection quality (it is not a raw ping). Websites can use timing like this to estimate your network conditions and rough location."
        tip="Little to do here. Timing is inherent to networking. A VPN changes which region you appear closest to (and adds some latency)."
        loading={loading || !data?.speedTests?.length}
        loadingLabel="Preparing tests..."
      >
        <div className="card-details">
          {data?.speedTests.map((test, i) => (
            <div className="card-detail" key={i}>
              <span className="card-detail-label">
                {test.server}
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                  {test.location}
                </span>
              </span>
              <span className="card-detail-value">
                {test.status === 'pending' && <span style={{ color: 'var(--text-muted)' }}>Waiting...</span>}
                {test.status === 'testing' && <span className="loading" style={{ display: 'inline-flex', gap: '0.25rem' }}><span className="spinner" style={{ width: '12px', height: '12px' }}></span></span>}
                {test.status === 'done' && (
                  <span style={{
                    color: test.latency! < 100 ? 'var(--success)' : test.latency! < 300 ? 'var(--warning)' : 'var(--danger)'
                  }}>
                    {test.latency}ms
                  </span>
                )}
                {test.status === 'error' && <span style={{ color: 'var(--danger)' }}>Failed</span>}
              </span>
            </div>
          ))}
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><path d="M5 12h14M12 5l7 7-7 7"/></Icon>}
        iconTone="blue"
        title="Network / Connection"
        info="From the Network Information API (navigator.connection): effectiveType, downlink, rtt, saveData. Not supported in all browsers."
        explanation="The Network Information API reveals your connection type (4g, wifi, etc.) and quality. Used for fingerprinting and serving different content by connection."
        tip="Chromium-only. Firefox and Safari don't ship this API at all, which is the privacy-protective choice."
        loading={loading}
      >
        {data?.connection ? (
          <div className="card-details">
            <div className="card-detail">
              <span className="card-detail-label">Effective type</span>
              <span className="card-detail-value">{data.connection.effectiveType ?? 'Unknown'}</span>
            </div>
            <div className="card-detail">
              <span className="card-detail-label">Downlink</span>
              <span className="card-detail-value">{data.connection.downlink != null ? data.connection.downlink + ' Mbps' : '—'}</span>
            </div>
            <div className="card-detail">
              <span className="card-detail-label">RTT</span>
              <span className="card-detail-value">{data.connection.rtt != null ? data.connection.rtt + ' ms' : '—'}</span>
            </div>
            <div className="card-detail">
              <span className="card-detail-label">Data saver</span>
              <span className="card-detail-value">{data.connection.saveData === true ? 'On' : data.connection.saveData === false ? 'Off' : '—'}</span>
            </div>
          </div>
        ) : (
          <div className="card-value">Not available</div>
        )}
      </SignalCard>

      <SignalCard
        icon={<Icon><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/></Icon>}
        iconTone="purple"
        title="Hardware"
        info="navigator.hardwareConcurrency (CPU cores) and navigator.deviceMemory (approx. RAM in GB, Chrome only)."
        status={<span className="card-status status-warning">Fingerprint</span>}
        explanation="CPU core count and approximate RAM are exposed to scripts. Together with other signals they help build a unique device fingerprint."
        tip="Firefox's resistFingerprinting caps the reported core count; deviceMemory is Chromium-only. Common hardware (4–8 cores) blends in better than exotic specs."
        loading={loading}
      >
        <div className="card-details">
          <div className="card-detail">
            <span className="card-detail-label">CPU cores</span>
            <span className="card-detail-value">{data?.hardware.hardwareConcurrency ?? 'Unknown'}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Device memory</span>
            <span className="card-detail-value">{data?.hardware.deviceMemory != null ? '~' + data.hardware.deviceMemory + ' GB' : 'Not reported'}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Battery</span>
            <span className="card-detail-value">{data?.battery ? `${data.battery.level}%${data.battery.charging ? ' (charging)' : ''}` : 'Not exposed'}</span>
          </div>
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></Icon>}
        iconTone="yellow"
        title="Referrer"
        info="document.referrer: the URL of the page that linked here, or empty if you came directly or it was blocked."
        explanation="The referrer header tells this page which site or URL sent you here. It can leak your browsing path; many privacy tools strip it."
        tip="Modern browsers default to sending only the origin (not the full URL) cross-site. Extensions like uBlock Origin can strip it entirely."
        loading={loading}
      >
        <div className="card-value mono" style={{ fontSize: '0.8125rem' }}>{data?.referrer}</div>
      </SignalCard>

      <SignalCard
        icon={<Icon><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Icon>}
        iconTone="green"
        title="Tracking Signals (DNT / GPC)"
        info="navigator.doNotTrack and navigator.globalPrivacyControl. DNT is obsolete (Firefox removed it in 2025; sites ignore it). GPC is its successor and is legally enforceable under some laws like the California CCPA."
        status={!loading ? (
          <span className={`card-status ${data?.gpc === 'Enabled' ? 'status-safe' : 'status-warning'}`}>
            GPC {data?.gpc}
          </span>
        ) : undefined}
        explanation="Do Not Track is effectively dead. Sites ignore it and Firefox removed it. Global Privacy Control (GPC) is the modern signal, and businesses must honor it under some US state privacy laws."
        tip="Enable GPC: built into Firefox (Settings → Privacy) and Brave; available for Chrome via extensions like Privacy Badger."
        loading={loading}
      >
        <div className="card-details">
          <div className="card-detail">
            <span className="card-detail-label">Do Not Track</span>
            <span className="card-detail-value">{data?.doNotTrack}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Global Privacy Control</span>
            <span className="card-detail-value">{data?.gpc}</span>
          </div>
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></Icon>}
        iconTone="blue"
        title="Storage (quota)"
        info="navigator.storage.estimate() returns quota and usage in bytes for this origin (cookies, localStorage, etc.)."
        explanation="Browsers expose how much storage (cookies, localStorage, etc.) is available and used. Sites use this to decide how much tracking data to store."
        tip="Periodically clear site data for sites you don't trust, or use containers/private windows so storage doesn't accumulate across sessions."
        loading={loading}
      >
        {data?.storageEstimate ? (
          <div className="card-details">
            <div className="card-detail">
              <span className="card-detail-label">Usage</span>
              <span className="card-detail-value">{formatStorageBytes(data.storageEstimate.usage)}</span>
            </div>
            <div className="card-detail">
              <span className="card-detail-label">Quota</span>
              <span className="card-detail-value">{formatStorageBytes(data.storageEstimate.quota)}</span>
            </div>
            <div className="card-detail">
              <span className="card-detail-label">Used</span>
              <span className="card-detail-value">{data.storageEstimate.usagePercent}</span>
            </div>
          </div>
        ) : (
          <div className="card-value">Not available</div>
        )}
      </SignalCard>

      <SignalCard
        icon={<Icon><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></Icon>}
        iconTone="purple"
        title="Audio Fingerprint"
        info="We render a fixed tone through an OfflineAudioContext (nothing plays out loud, no microphone involved) and sum the output samples. Tiny float-math differences across hardware/drivers make the number identifying."
        status={<span className="card-status status-warning">Trackable</span>}
        explanation="Like canvas fingerprinting but for your audio stack: the same silent signal renders slightly differently on different machines, producing a stable identifier. No sound plays and no microphone is used."
        tip="Brave randomizes audio output per-site; Tor Browser blocks the technique. Most other browsers expose it freely."
        loading={loading}
        loadingLabel="Rendering..."
      >
        <div className="card-value mono">{data?.audioFingerprint}</div>
      </SignalCard>

      <SignalCard
        icon={<Icon><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></Icon>}
        iconTone="red"
        title="Devices & Permissions"
        info="navigator.mediaDevices.enumerateDevices(): device COUNTS are readable without any permission prompt (names stay hidden until you grant access). navigator.permissions.query() shows what you've already granted."
        explanation={'Any site can count your cameras, mics, and speakers without asking, and check which permissions you\'ve already granted. "Granted" permissions can be silently re-used on a return visit.'}
        tip={'Audit granted permissions in your browser\'s site settings and revoke ones you no longer need. "Granted" means no prompt next time.'}
        loading={loading}
        loadingLabel="Enumerating..."
      >
        <div className="card-details">
          {data?.mediaDevices ? (
            <>
              <div className="card-detail">
                <span className="card-detail-label">Cameras</span>
                <span className="card-detail-value">{data.mediaDevices.videoinput}</span>
              </div>
              <div className="card-detail">
                <span className="card-detail-label">Microphones</span>
                <span className="card-detail-value">{data.mediaDevices.audioinput}</span>
              </div>
              <div className="card-detail">
                <span className="card-detail-label">Speakers</span>
                <span className="card-detail-value">{data.mediaDevices.audiooutput}</span>
              </div>
            </>
          ) : (
            <div className="card-detail">
              <span className="card-detail-label">Media devices</span>
              <span className="card-detail-value">Not available</span>
            </div>
          )}
          {data?.permissions.map((p) => (
            <div className="card-detail" key={p.name}>
              <span className="card-detail-label" style={{ textTransform: 'capitalize' }}>{p.name.replace('-', ' ')}</span>
              <span className="card-detail-value" style={{ color: p.state === 'granted' ? 'var(--warning)' : p.state === 'denied' ? 'var(--success)' : undefined }}>
                {p.state}
              </span>
            </div>
          ))}
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Icon>}
        iconTone="yellow"
        title="System Preferences"
        info="Read via CSS media queries (matchMedia) and navigator.maxTouchPoints: dark/light mode, reduced motion, contrast, touch support, pointer type. Each is one more fingerprint bit."
        explanation="Even your dark-mode choice is visible to every website via CSS. Accessibility settings like reduced motion are especially identifying because few people enable them."
        tip="These leak through CSS itself, so they're hard to hide without breaking theming. Tor Browser reports the defaults for everyone."
        loading={loading}
      >
        <div className="card-details">
          <div className="card-detail">
            <span className="card-detail-label">Color scheme</span>
            <span className="card-detail-value">{data?.preferences.colorScheme}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Reduced motion</span>
            <span className="card-detail-value">{data?.preferences.reducedMotion ? 'On' : 'Off'}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">High contrast</span>
            <span className="card-detail-value">{data?.preferences.highContrast ? 'On' : 'Off'}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Touch</span>
            <span className="card-detail-value">{data?.preferences.touchSupport ? `Yes (${data.preferences.maxTouchPoints} points)` : 'No'}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Pointer</span>
            <span className="card-detail-value">{data?.preferences.pointerType}</span>
          </div>
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></Icon>}
        iconTone="blue"
        title="Client Hints"
        info="navigator.userAgentData (Chromium). Low-entropy values are free; 'high-entropy' values (exact OS version, CPU architecture, device model) are handed to any script that calls getHighEntropyValues(). No permission prompt."
        status={!loading && data?.clientHints.supported && data.clientHints.platformVersion != null ? (
          <span className="card-status status-warning">High entropy</span>
        ) : undefined}
        explanation={'Client Hints were designed to replace the user-agent string with something less identifying, but the "high-entropy" values give Chromium sites your exact OS build and CPU architecture, which is more precise than the UA string ever was.'}
        tip="Firefox and Safari don't implement this API. On Chromium there's no setting to refuse high-entropy hints to scripts."
        loading={loading}
      >
        {data?.clientHints.supported ? (
          <div className="card-details">
            <div className="card-detail">
              <span className="card-detail-label">Browser</span>
              <span className="card-detail-value">{data.clientHints.brands.join(', ') || '—'}</span>
            </div>
            <div className="card-detail">
              <span className="card-detail-label">Platform</span>
              <span className="card-detail-value">{data.clientHints.platform ?? '—'}{data.clientHints.platformVersion ? ` ${data.clientHints.platformVersion}` : ''}</span>
            </div>
            <div className="card-detail">
              <span className="card-detail-label">Architecture</span>
              <span className="card-detail-value">{data.clientHints.architecture ?? '—'}</span>
            </div>
            <div className="card-detail">
              <span className="card-detail-label">Device model</span>
              <span className="card-detail-value">{data.clientHints.model || '(none, desktop)'}</span>
            </div>
            <div className="card-detail">
              <span className="card-detail-label">Full version</span>
              <span className="card-detail-value">{data.clientHints.fullVersion ?? '—'}</span>
            </div>
          </div>
        ) : (
          <div className="card-value">Not supported (Chromium-only API)</div>
        )}
      </SignalCard>
    </div>
  );
}
