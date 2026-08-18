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

const PERMISSION_LABELS: Record<string, string> = {
  geolocation: 'Location',
  notifications: 'Notifications',
  camera: 'Camera',
  microphone: 'Microphone',
  'clipboard-read': 'Clipboard',
  midi: 'MIDI music',
};

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
        title="Where you are (from your IP)"
        info="We ask a location service (ipapi.co, then freeipapi.com, then ipwho.is) for your internet address and city. Your browser makes the request; those companies see your IP the way any website does. If all three time out or are blocked, we show nothing."
        explanation="Your internet address (IP) is like a return address for every site you visit. It usually shows your city and who provides your internet. If you use a VPN, sites often still notice: VPN and datacenter addresses are publicly listed."
        tip={<>A reputable VPN or the Tor Browser changes the address sites see. Check the “VPN/proxy visible” row: sites can usually tell you’re on a VPN even though they can’t see through it.</>}
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
                <span className="card-detail-label">Internet provider</span>
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
              Couldn’t look up your address
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Your browser, an extension (VPN, ad blocker, privacy tool), or a timeout stopped this lookup. If that’s on purpose, it’s good for privacy.
            </p>
          </div>
        )}
      </SignalCard>

      <SignalCard
        icon={<Icon><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"/></Icon>}
        iconTone="purple"
        title="Device nickname (browser fingerprint)"
        info="A library called FingerprintJS runs in your browser and folds many clues (drawings, graphics, fonts, and more) into one ID. That ID is not sent to our servers. To show that it can stick around, we save the last ID in your browser on this device (clearable anytime). Light/dark mode is saved separately."
        status={<span className="card-status status-warning">Can follow you</span>}
        explanation="This nickname is built from how your computer looks online, not from a file the site saved. Other sites can build the same kind of nickname and recognize you later, even after you delete cookies."
        tip={<>Firefox’s <code>privacy.resistFingerprinting</code>, the Tor Browser, or Brave’s fingerprint randomization make this nickname change between visits, which defeats it.</>}
        loading={loading}
        loadingLabel="Building nickname..."
      >
        <div className="card-value mono">{data?.fingerprint}</div>
        {data?.fpHistory.matches === true && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', marginTop: '0.5rem' }}>
            Same nickname as your visit on {new Date(data.fpHistory.previousDate!).toLocaleString()}. This is how
            sites recognize you with no cookies at all.{' '}
            <button onClick={onClearHistory} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit', fontSize: 'inherit' }}>
              Clear saved nickname
            </button>
          </p>
        )}
        {data?.fpHistory.matches === null && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            First visit we recorded. Your browser saved this nickname on this device so we can show whether a return
            visit is recognized. It also remembers your light/dark choice. Neither leaves your computer. Come back
            later to see if the nickname is the same.
          </p>
        )}
        {data?.fpHistory.matches === false && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--success)', marginTop: '0.5rem' }}>
            Different from your visit on {new Date(data.fpHistory.previousDate!).toLocaleString()}. Something about
            your browser changed, which makes you harder to follow.
          </p>
        )}
      </SignalCard>

      <SignalCard
        icon={<Icon><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8M12 17v4"/></Icon>}
        iconTone="blue"
        title="Browser and computer name (user agent)"
        info="Read from navigator.userAgent. Your browser sends this text with every request, like a name tag."
        explanation="This string tells websites which browser, version, and operating system you use. Sites need it to work correctly; trackers also use it as one more clue."
        tip={<>You can’t usefully hide this. Pretending to be a different browser breaks sites and makes you <em>more</em> unusual. Using a common browser keeps you in a bigger crowd.</>}
        loading={loading}
      >
        <div className="card-details" style={{ marginBottom: '0.75rem' }}>
          <div className="card-detail">
            <span className="card-detail-label">Browser</span>
            <span className="card-detail-value">{data?.parsedUA.browser}</span>
          </div>
          <div className="card-detail">
                <span className="card-detail-label">Computer</span>
            <span className="card-detail-value">{data?.parsedUA.os}</span>
          </div>
        </div>
        <div className="card-value mono" style={{ fontSize: '0.75rem' }}>{data?.userAgent}</div>
      </SignalCard>

      <SignalCard
        icon={<Icon><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8M12 17v4"/></Icon>}
        iconTone="green"
        title="Screen size"
        info="Read from window.screen: width, height, usable area, color depth, and how sharp the pixels are (devicePixelRatio)."
        explanation="Sites use screen size to lay out the page. Trackers also use it: an unusual monitor or zoom level stands out from the crowd."
        tip="Common sizes (1920×1080) blend in; unusual monitors and fractional zoom stand out. The Tor Browser crops the window to standard sizes for exactly this reason."
        loading={loading}
      >
        <div className="card-details">
          <div className="card-detail">
            <span className="card-detail-label">Resolution</span>
            <span className="card-detail-value">{data?.screen.width} × {data?.screen.height}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Usable area</span>
            <span className="card-detail-value">{data?.screen.availWidth} × {data?.screen.availHeight}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Color Depth</span>
            <span className="card-detail-value">{data?.screen.colorDepth}-bit</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Display sharpness</span>
            <span className="card-detail-value">{data?.screen.pixelRatio}x</span>
          </div>
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></Icon>}
        iconTone="yellow"
        title="Timezone and language"
        info="From Intl.DateTimeFormat().resolvedOptions().timeZone and navigator.language / navigator.languages."
        explanation="Your clock zone and language settings hint at where you live. The full language list is a stronger clue than the first language alone. An unusual mix is very identifying."
        tip="If your IP says one country and your timezone says another, sites notice. VPN users should know this. The Tor Browser reports UTC for everyone."
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
            <span className="card-detail-label">Computer type</span>
            <span className="card-detail-value">{data?.locale.platform}</span>
          </div>
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></Icon>}
        iconTone="purple"
        title="Hidden drawing test (canvas)"
        info="We draw shapes and text on a hidden picture, then turn the pixels into a short ID. Tiny differences in how your computer draws create a different ID."
        status={<span className="card-status status-warning">Sites can reuse this</span>}
        explanation="The site never shows you this picture. It still reads how your computer drew it. Those tiny differences become a stable ID for your machine."
        tip={'Brave slightly randomizes this drawing per site (“farbling”); Firefox’s resistFingerprinting and extensions like CanvasBlocker add noise so the ID changes every time.'}
        loading={loading}
        loadingLabel="Running drawing test..."
      >
        <div className="card-value mono">{data?.canvasFingerprint}</div>
      </SignalCard>

      <SignalCard
        icon={<Icon><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></Icon>}
        iconTone="blue"
        title="Graphics card (WebGL)"
        info="We create a WebGL drawing context and read UNMASKED_VENDOR_WEBGL and UNMASKED_RENDERER_WEBGL — the maker and model of your graphics chip."
        explanation="WebGL can name your graphics card and driver. That’s unusually specific and is used to recognize devices."
        tip="Firefox’s resistFingerprinting and the Tor Browser report a generic chip instead of yours. Brave randomizes WebGL the same way it does the drawing test."
        loading={loading}
      >
        {data?.webgl.available ? (
          <div className="card-details">
            <div className="card-detail">
              <span className="card-detail-label">Maker</span>
              <span className="card-detail-value">{data.webgl.vendor}</span>
            </div>
            <div className="card-detail">
              <span className="card-detail-label">Chip</span>
              <span className="card-detail-value" style={{ fontSize: '0.75rem' }}>{data.webgl.renderer}</span>
            </div>
          </div>
        ) : (
          <div className="card-value">Graphics info not available</div>
        )}
      </SignalCard>

      <SignalCard
        icon={<Icon><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Icon>}
        iconTone="red"
        title="Real IP leak (video calls / WebRTC)"
        info="We briefly start a fake video-call connection using Google’s STUN server (stun.l.google.com). The addresses that pop up (ICE candidates) can include IPs. Only a public, globally routable IP counts as a leak. Home-network IPs, .local names (mDNS), and shared-provider addresses (CGNAT, 100.64.0.0/10) are visible to scripts but do not identify you on the public internet."
        status={!loading ? (
          <span className={`card-status ${data?.webrtc.leaking ? 'status-danger' : 'status-safe'}`}>
            {data?.webrtc.leaking ? 'Public IP exposed' : 'No leak'}
          </span>
        ) : undefined}
        explanation="The feature that makes video calls work (WebRTC) can reveal your real public internet address even when a VPN is on. The important check is whether that address differs from the one this page already sees. Modern browsers hide home-network IPs behind .local names. Shared-provider addresses (CGNAT) are used by many customers at once, so they are not a public leak."
        tip={<>A good VPN app also covers video-call traffic. Check this card while connected. uBlock Origin has a “prevent WebRTC IP leak” setting; Firefox can turn WebRTC off entirely via <code>media.peerconnection.enabled</code>.</>}
        loading={loading}
        loadingLabel="Testing..."
      >
        {data?.webrtc.leaking ? (
          <>
            <div className="card-value" style={{ color: 'var(--danger)' }}>
              Public IP exposed via video calls (WebRTC)
              {data.ipInfo && data.webrtc.publicIPs.some(ip => ip !== data.ipInfo!.ip) &&
                ', and it differs from the address this page already sees (possible VPN bypass)'}
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
              Home-network or shared-provider addresses visible to this page (not a public-internet leak):
            </p>
            <div className="list-items">
              {[
                ...data.webrtc.localIPs,
                ...data.webrtc.cgnatIPs.map(ip => `${ip} (shared provider)`),
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
        title="Installed fonts"
        info="We measure the width of a test sentence in about 30 common font families. If the width differs from the fallback font, that family is likely installed. This is a sample, not every font on your computer."
        status={<span className="card-status status-warning">{data?.fonts.length || 0} found</span>}
        explanation="The mix of fonts on your computer can be surprisingly identifying, especially fonts that came with Adobe, Microsoft Office, or design tools."
        tip="Avoid installing system-wide fonts you don’t need. Firefox’s resistFingerprinting limits sites to a standard font list."
        loading={loading}
        loadingLabel="Checking fonts..."
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
        title="Ad blocker"
        info="We hide an element with ad-like class names. If it disappears, we treat that as an ad blocker. If not, we try to fetch a known Google ad script. This is a guess, not a guarantee."
        status={!loading ? (
          <span className={`card-status ${data?.adBlocker ? 'status-safe' : 'status-warning'}`}>
            {data?.adBlocker ? 'Looks like yes' : 'Looks like no'}
          </span>
        ) : undefined}
        explanation="Sites can often tell if ads are being blocked. That’s useful for you, and it’s also one more clue they can use to recognize you."
        tip="Keep the blocker. Stopping trackers helps far more than this one clue costs. uBlock Origin is the usual recommendation."
        loading={loading}
        loadingLabel="Testing..."
      >
        <div className="card-value" style={{ color: data?.adBlocker ? 'var(--success)' : 'var(--warning)' }}>
          {data?.adBlocker ? 'Looks like an ad blocker is on' : 'No ad blocker spotted'}
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><circle cx="12" cy="12" r="10"/><circle cx="8" cy="9" r="1"/><circle cx="15" cy="8" r="1"/><circle cx="10" cy="15" r="1"/><circle cx="16" cy="14" r="1"/></Icon>}
        iconTone="yellow"
        title="Cookies"
        info="navigator.cookieEnabled, plus a cookie we set for this site and immediately delete. We cannot honestly test other companies’ cookies from this page alone (that would need a hidden iframe on another site), so we don’t pretend to."
        explanation="Cookies are little files a site saves on your computer so it can remember you. Other companies’ cookies (third-party) are how advertisers follow you from site to site."
        tip="Block other companies’ cookies in your browser settings (Firefox and Safari already do; Chrome still allows them). Everyday sites still work for almost everyone."
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
            <span className="card-detail-label">This site can set cookies</span>
            <span className="card-detail-value">{data?.cookies.firstPartyWrite}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Other sites’ cookies</span>
            <span className="card-detail-value">{data?.cookies.thirdParty}</span>
          </div>
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></Icon>}
        iconTone="green"
        title="How fast distant sites answer"
        info="After a warm-up request (so first-time setup isn’t counted), we fetch a small file from each server 3 times and take the middle time. That includes the server thinking, so it’s slower than a raw ping."
        status={!loading && data?.speedTests && data.speedTests.length > 0 && data.speedTests.every(t => t.status === 'done' || t.status === 'error') ? (
          <span className="card-status status-safe">Complete</span>
        ) : undefined}
        explanation="How long a round trip takes to big companies can hint at your connection quality and roughly where you are. It is not a raw ping."
        tip="Little to do here. Timing is part of how the internet works. A VPN changes which region you look closest to (and adds some delay)."
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
        title="Connection type"
        info="From the Network Information API (navigator.connection): connection class, download speed, delay, and data-saver. Not available in every browser."
        explanation="Chrome can tell a site whether you look like you’re on 4G, Wi‑Fi, and so on, plus a rough speed. Used both to adapt pages and as another recognition clue."
        tip="This exists in Chrome-based browsers only. Firefox and Safari don’t offer it, which is the privacy-friendlier choice."
        loading={loading}
      >
        {data?.connection ? (
          <div className="card-details">
            <div className="card-detail">
              <span className="card-detail-label">Connection class</span>
              <span className="card-detail-value">{data.connection.effectiveType ?? 'Unknown'}</span>
            </div>
            <div className="card-detail">
              <span className="card-detail-label">Download speed</span>
              <span className="card-detail-value">{data.connection.downlink != null ? data.connection.downlink + ' Mbps' : '—'}</span>
            </div>
            <div className="card-detail">
              <span className="card-detail-label">Delay</span>
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
        title="Processor and memory"
        info="navigator.hardwareConcurrency (processor cores) and navigator.deviceMemory (approximate RAM in GB, Chrome only)."
        status={<span className="card-status status-warning">Part of your nickname</span>}
        explanation="Scripts can read how many processor cores you have, and in Chrome a rough RAM size. Together with other clues they help recognize a specific computer."
        tip="Firefox’s resistFingerprinting caps the reported core count; RAM size is Chrome-only. Common hardware (4–8 cores) blends in better than unusual specs."
        loading={loading}
      >
        <div className="card-details">
          <div className="card-detail">
            <span className="card-detail-label">Processor cores</span>
            <span className="card-detail-value">{data?.hardware.hardwareConcurrency ?? 'Unknown'}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Memory (RAM)</span>
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
        title="How you arrived"
        info="document.referrer: the address of the page that linked here, or blank if you typed the address, used a bookmark, or a tool stripped it."
        explanation="The referrer tells this page which site sent you here. It can leak the path you took around the web; many privacy tools strip it."
        tip="Modern browsers usually send only the site name (not the full address) when you click from one site to another. Extensions like uBlock Origin can strip it entirely."
        loading={loading}
      >
        <div className="card-value mono" style={{ fontSize: '0.8125rem' }}>{data?.referrer}</div>
      </SignalCard>

      <SignalCard
        icon={<Icon><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Icon>}
        iconTone="green"
        title="“Don’t track” and “don’t sell” signals"
        info="navigator.doNotTrack and navigator.globalPrivacyControl. Do Not Track is obsolete (Firefox removed it in 2025; sites ignore it). Global Privacy Control (GPC) is the successor and is legally enforceable under some laws, including California’s CCPA."
        status={!loading ? (
          <span className={`card-status ${data?.gpc === 'Enabled' ? 'status-safe' : 'status-warning'}`}>
            Don’t-sell {data?.gpc === 'Enabled' ? 'on' : data?.gpc === 'Disabled' ? 'off' : 'unavailable'}
          </span>
        ) : undefined}
        explanation="Do Not Track is effectively dead. Sites ignore it and Firefox removed it. Global Privacy Control (GPC) is the modern “don’t sell my data” signal, and businesses must honor it under some US state privacy laws."
        tip="Turn on GPC: built into Firefox (Settings → Privacy) and Brave; available for Chrome via extensions like Privacy Badger."
        loading={loading}
      >
        <div className="card-details">
          <div className="card-detail">
            <span className="card-detail-label">Do Not Track</span>
            <span className="card-detail-value">{data?.doNotTrack}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Global Privacy Control</span>
            <span className="card-detail-value">{data?.gpc === 'Enabled' ? 'On' : data?.gpc === 'Disabled' ? 'Off' : 'Not supported'}</span>
          </div>
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></Icon>}
        iconTone="blue"
        title="Storage this site can use"
        info="navigator.storage.estimate() reports how much space this site is allowed and how much it already uses (cookies, saved settings, and similar)."
        explanation="Browsers tell a site how much storage it can use here. Sites use that to decide how much data to keep on your computer."
        tip="Periodically clear site data for sites you don’t trust, or use private windows so leftover data doesn’t pile up."
        loading={loading}
      >
        {data?.storageEstimate ? (
          <div className="card-details">
            <div className="card-detail">
              <span className="card-detail-label">Usage</span>
              <span className="card-detail-value">{formatStorageBytes(data.storageEstimate.usage)}</span>
            </div>
            <div className="card-detail">
              <span className="card-detail-label">Allowed</span>
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
        title="Silent sound test (audio)"
        info="We render a fixed tone through OfflineAudioContext (nothing plays out loud, no microphone) and add up the samples. Tiny math differences across hardware make the number identifying."
        status={<span className="card-status status-warning">Sites can reuse this</span>}
        explanation="Like the hidden drawing test, but for sound: the same silent signal comes out slightly different on different machines, producing a stable ID. No sound plays and no microphone is used."
        tip="Brave randomizes this per site; the Tor Browser blocks it. Most other browsers expose it freely."
        loading={loading}
        loadingLabel="Running sound test..."
      >
        <div className="card-value mono">{data?.audioFingerprint}</div>
      </SignalCard>

      <SignalCard
        icon={<Icon><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></Icon>}
        iconTone="red"
        title="Cameras, mics, and permissions"
        info="navigator.mediaDevices.enumerateDevices(): a site can count cameras, mics, and speakers without asking (names stay hidden until you say yes). navigator.permissions.query() shows what you’ve already allowed."
        explanation={'Any site can count your cameras, mics, and speakers without asking, and check which permissions you’ve already granted. “Granted” means the site can use that again next time without a prompt.'}
        tip={'Check granted permissions in your browser’s site settings and turn off ones you no longer need. “Granted” means no prompt next time.'}
        loading={loading}
        loadingLabel="Counting devices..."
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
              <span className="card-detail-label">{PERMISSION_LABELS[p.name] ?? p.name.replace('-', ' ')}</span>
              <span className="card-detail-value" style={{ color: p.state === 'granted' ? 'var(--warning)' : p.state === 'denied' ? 'var(--success)' : undefined }}>
                {p.state === 'granted' ? 'Allowed' : p.state === 'denied' ? 'Blocked' : p.state === 'prompt' ? 'Not asked yet' : p.state}
              </span>
            </div>
          ))}
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Icon>}
        iconTone="yellow"
        title="Dark mode and accessibility"
        info="Read via CSS media queries (matchMedia) and navigator.maxTouchPoints: dark/light mode, reduced motion, contrast, touch support, pointer type. Each is one more recognition clue."
        explanation="Even your dark-mode choice is visible to every website via CSS. Accessibility settings like reduced motion are especially identifying because fewer people turn them on."
        tip="These leak through CSS itself, so they’re hard to hide without breaking theming. The Tor Browser reports the defaults for everyone."
        loading={loading}
      >
        <div className="card-details">
          <div className="card-detail">
            <span className="card-detail-label">Light or dark</span>
            <span className="card-detail-value">{data?.preferences.colorScheme}</span>
          </div>
          <div className="card-detail">
            <span className="card-detail-label">Less animation</span>
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
            <span className="card-detail-label">Mouse or touch</span>
            <span className="card-detail-value">{data?.preferences.pointerType}</span>
          </div>
        </div>
      </SignalCard>

      <SignalCard
        icon={<Icon><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></Icon>}
        iconTone="blue"
        title="Extra Chrome details (client hints)"
        info="navigator.userAgentData (Chrome and similar). Basic values are free; extra-precise values (exact OS version, processor type, device model) are handed to any script that asks. No permission prompt."
        status={!loading && data?.clientHints.supported && data.clientHints.platformVersion != null ? (
          <span className="card-status status-warning">Detailed</span>
        ) : undefined}
        explanation={'Client Hints were meant to replace the long browser name-tag with something less identifying. In practice the extra-precise values give Chrome sites your exact Windows/macOS version and processor type, which is more precise than the old name-tag ever was.'}
        tip="Firefox and Safari don’t implement this. On Chrome there’s no setting to refuse the extra-precise details to scripts."
        loading={loading}
      >
        {data?.clientHints.supported ? (
          <div className="card-details">
            <div className="card-detail">
              <span className="card-detail-label">Browser</span>
              <span className="card-detail-value">{data.clientHints.brands.join(', ') || '—'}</span>
            </div>
            <div className="card-detail">
              <span className="card-detail-label">Operating system</span>
              <span className="card-detail-value">{data.clientHints.platform ?? '—'}{data.clientHints.platformVersion ? ` ${data.clientHints.platformVersion}` : ''}</span>
            </div>
            <div className="card-detail">
              <span className="card-detail-label">Processor type</span>
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
          <div className="card-value">Not supported (Chrome-only)</div>
        )}
      </SignalCard>
    </div>
  );
}
