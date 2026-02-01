import { useState, useEffect, useCallback } from 'react';
import {
  getIPInfo,
  getBrowserFingerprint,
  getCanvasFingerprint,
  getWebGLInfo,
  getWebRTCInfo,
  detectFonts,
  detectAdBlocker,
  getCookieStatus,
  getScreenInfo,
  getLocaleInfo,
  getUserAgent,
  parseUserAgent,
  type IPInfo,
  type WebRTCInfo,
  type WebGLInfo,
} from './utils/privacy';

interface PrivacyData {
  ipInfo: IPInfo | null;
  fingerprint: string;
  canvasFingerprint: string;
  webgl: WebGLInfo;
  webrtc: WebRTCInfo;
  fonts: string[];
  adBlocker: boolean;
  cookies: { enabled: boolean; thirdParty: string };
  screen: ReturnType<typeof getScreenInfo>;
  locale: ReturnType<typeof getLocaleInfo>;
  userAgent: string;
  parsedUA: { browser: string; os: string };
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PrivacyData | null>(null);

  const collectData = useCallback(async () => {
    setLoading(true);

    const ua = getUserAgent();
    
    // Collect all data in parallel where possible
    const [ipInfo, fingerprint, webrtc, adBlocker] = await Promise.all([
      getIPInfo(),
      getBrowserFingerprint(),
      getWebRTCInfo(),
      detectAdBlocker(),
    ]);

    // Synchronous data
    const canvasFingerprint = getCanvasFingerprint();
    const webgl = getWebGLInfo();
    const fonts = detectFonts();
    const cookies = getCookieStatus();
    const screen = getScreenInfo();
    const locale = getLocaleInfo();
    const parsedUA = parseUserAgent(ua);

    setData({
      ipInfo,
      fingerprint,
      canvasFingerprint,
      webgl,
      webrtc,
      fonts,
      adBlocker,
      cookies,
      screen,
      locale,
      userAgent: ua,
      parsedUA,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    collectData();
  }, [collectData]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleRefresh = () => {
    collectData();
  };

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="container header-content">
          <a href="/" className="logo">
            <svg className="logo-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1"/>
                  <stop offset="100%" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="45" fill="url(#logoGrad)"/>
              <circle cx="50" cy="45" r="18" fill="white"/>
              <circle cx="50" cy="45" r="8" fill="#1e1b4b"/>
              <path d="M 50 70 Q 50 80 50 85" stroke="white" strokeWidth="6" strokeLinecap="round"/>
            </svg>
            What Do They Know?
          </a>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleRefresh} disabled={loading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Refresh
            </button>
            <button className="btn-icon" onClick={() => setDarkMode(!darkMode)} title="Toggle dark mode">
              {darkMode ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <h1>What the Internet Knows About You</h1>
          <p>See exactly what information websites can collect about you just by visiting them. No data is stored or sent anywhere.</p>
          <div className="privacy-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            100% Client-Side — Your data never leaves your browser
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          <div className="cards-grid">
            {/* IP Address Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon blue">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  </div>
                  <h3>IP Address & Location</h3>
                </div>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Loading...</div>
                ) : data?.ipInfo ? (
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
              </div>
              <p className="card-explanation">
                Your IP address reveals your approximate location and internet provider. Websites use this to serve localized content and track your general whereabouts.
              </p>
            </div>

            {/* Browser Fingerprint Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon purple">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"/>
                    </svg>
                  </div>
                  <h3>Browser Fingerprint</h3>
                </div>
                <span className="card-status status-warning">Unique ID</span>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Generating...</div>
                ) : (
                  <div className="card-value mono">{data?.fingerprint}</div>
                )}
              </div>
              <p className="card-explanation">
                This unique identifier is generated from your browser's characteristics. It can track you across websites even without cookies.
              </p>
            </div>

            {/* User Agent Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon blue">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                      <path d="M8 21h8M12 17v4"/>
                    </svg>
                  </div>
                  <h3>User Agent</h3>
                </div>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Loading...</div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
              <p className="card-explanation">
                Your user agent string tells websites your browser type, version, and operating system. This helps serve compatible content but also enables tracking.
              </p>
            </div>

            {/* Screen Resolution Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon green">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                      <path d="M8 21h8M12 17v4"/>
                    </svg>
                  </div>
                  <h3>Screen & Display</h3>
                </div>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Loading...</div>
                ) : (
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
                )}
              </div>
              <p className="card-explanation">
                Screen resolution and color depth are used for responsive design but also contribute to your unique browser fingerprint.
              </p>
            </div>

            {/* Timezone & Language Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon yellow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                  <h3>Timezone & Language</h3>
                </div>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Loading...</div>
                ) : (
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
                      <span className="card-detail-label">Platform</span>
                      <span className="card-detail-value">{data?.locale.platform}</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="card-explanation">
                Your timezone and language settings reveal your location and preferences, helping websites personalize content and narrow down your identity.
              </p>
            </div>

            {/* Canvas Fingerprint Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon purple">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                  </div>
                  <h3>Canvas Fingerprint</h3>
                </div>
                <span className="card-status status-warning">Trackable</span>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Generating...</div>
                ) : (
                  <div className="card-value mono">{data?.canvasFingerprint}</div>
                )}
              </div>
              <p className="card-explanation">
                Canvas fingerprinting draws invisible graphics and reads the result. Subtle differences in rendering create a unique identifier for your system.
              </p>
            </div>

            {/* WebGL Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon blue">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                      <polyline points="2 17 12 22 22 17"/>
                      <polyline points="2 12 12 17 22 12"/>
                    </svg>
                  </div>
                  <h3>WebGL Info</h3>
                </div>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Loading...</div>
                ) : data?.webgl.available ? (
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
              </div>
              <p className="card-explanation">
                WebGL reveals your graphics card model and driver, which is highly unique and used for fingerprinting.
              </p>
            </div>

            {/* WebRTC Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon red">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <h3>WebRTC Leak Test</h3>
                </div>
                {!loading && (
                  <span className={`card-status ${data?.webrtc.leaking ? 'status-danger' : 'status-safe'}`}>
                    {data?.webrtc.leaking ? 'Leaking!' : 'Protected'}
                  </span>
                )}
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Testing...</div>
                ) : data?.webrtc.leaking ? (
                  <>
                    <div className="card-value" style={{ color: 'var(--danger)' }}>IPs Exposed</div>
                    <div className="list-items">
                      {data.webrtc.localIPs.map((ip, i) => (
                        <span key={i} className="list-item">{ip}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="card-value" style={{ color: 'var(--success)' }}>No leaks detected</div>
                )}
              </div>
              <p className="card-explanation">
                WebRTC can expose your real IP address even when using a VPN. This is a serious privacy concern for VPN users.
              </p>
            </div>

            {/* Fonts Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon purple">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="4 7 4 4 20 4 20 7"/>
                      <line x1="9" y1="20" x2="15" y2="20"/>
                      <line x1="12" y1="4" x2="12" y2="20"/>
                    </svg>
                  </div>
                  <h3>Detected Fonts</h3>
                </div>
                <span className="card-status status-warning">{data?.fonts.length || 0} found</span>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Detecting...</div>
                ) : (
                  <div className="list-items">
                    {data?.fonts.slice(0, 12).map((font, i) => (
                      <span key={i} className="list-item">{font}</span>
                    ))}
                    {(data?.fonts.length || 0) > 12 && (
                      <span className="list-item">+{(data?.fonts.length || 0) - 12} more</span>
                    )}
                  </div>
                )}
              </div>
              <p className="card-explanation">
                Your installed fonts create a unique signature. The combination of fonts you have is surprisingly identifiable.
              </p>
            </div>

            {/* Ad Blocker Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon green">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                    </svg>
                  </div>
                  <h3>Ad Blocker</h3>
                </div>
                {!loading && (
                  <span className={`card-status ${data?.adBlocker ? 'status-safe' : 'status-warning'}`}>
                    {data?.adBlocker ? 'Detected' : 'Not Detected'}
                  </span>
                )}
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Testing...</div>
                ) : (
                  <div className="card-value" style={{ color: data?.adBlocker ? 'var(--success)' : 'var(--warning)' }}>
                    {data?.adBlocker ? 'Ad blocker is active' : 'No ad blocker detected'}
                  </div>
                )}
              </div>
              <p className="card-explanation">
                Websites can detect if you're using an ad blocker. While this protects your privacy, it's also used to fingerprint you.
              </p>
            </div>

            {/* Cookies Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon yellow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <circle cx="8" cy="9" r="1"/>
                      <circle cx="15" cy="8" r="1"/>
                      <circle cx="10" cy="15" r="1"/>
                      <circle cx="16" cy="14" r="1"/>
                    </svg>
                  </div>
                  <h3>Cookie Status</h3>
                </div>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Checking...</div>
                ) : (
                  <div className="card-details">
                    <div className="card-detail">
                      <span className="card-detail-label">Cookies</span>
                      <span className="card-detail-value" style={{ color: data?.cookies.enabled ? 'var(--success)' : 'var(--danger)' }}>
                        {data?.cookies.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="card-detail">
                      <span className="card-detail-label">Third-Party</span>
                      <span className="card-detail-value">{data?.cookies.thirdParty}</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="card-explanation">
                Cookies are the primary way websites track you. Third-party cookies enable cross-site tracking by advertisers.
              </p>
            </div>
          </div>

          {/* VPN Section */}
          <section className="vpn-section">
            <h2>Protect Your Privacy</h2>
            <p>Consider using a VPN to hide your real IP address and encrypt your internet traffic.</p>
            <div className="vpn-links">
              <a href="https://nordvpn.com" target="_blank" rel="noopener noreferrer" className="vpn-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                NordVPN
              </a>
              <a href="https://www.expressvpn.com" target="_blank" rel="noopener noreferrer" className="vpn-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                ExpressVPN
              </a>
              <a href="https://surfshark.com" target="_blank" rel="noopener noreferrer" className="vpn-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Surfshark
              </a>
              <a href="https://protonvpn.com" target="_blank" rel="noopener noreferrer" className="vpn-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                ProtonVPN
              </a>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Privacy Notice:</strong> We don't store or send your data anywhere. Everything runs in your browser.
          </p>
          <p>
            Built with privacy in mind. <a href="https://github.com/andy-broyles/whatdotheyknow-app" target="_blank" rel="noopener noreferrer">View source on GitHub</a>
          </p>
          <p style={{ marginTop: '0.5rem' }}>Thanks, Tom</p>
        </div>
      </footer>
    </>
  );
}

export default App;
