import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/react';
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
  runSpeedTests,
  getConnectionInfo,
  getHardwareInfo,
  getReferrer,
  getDoNotTrack,
  getGlobalPrivacyControl,
  getStorageEstimate,
  getAudioFingerprint,
  getMediaDeviceCounts,
  getPermissionStates,
  getClientHints,
  getSystemPreferences,
  getBatteryInfo,
  checkFingerprintHistory,
  clearFingerprintHistory,
  type IPInfo,
  type WebRTCInfo,
  type WebGLInfo,
  type ConnectionInfo,
  type SpeedTestResult,
  type ClientHintsInfo,
  type PermissionState_,
  type FingerprintHistory,
} from './utils/privacy';

interface PrivacyData {
  ipInfo: IPInfo | null;
  fingerprint: string;
  canvasFingerprint: string;
  webgl: WebGLInfo;
  webrtc: WebRTCInfo;
  fonts: string[];
  adBlocker: boolean;
  cookies: { enabled: boolean; firstPartyWrite: string; thirdParty: string };
  screen: ReturnType<typeof getScreenInfo>;
  locale: ReturnType<typeof getLocaleInfo>;
  userAgent: string;
  parsedUA: { browser: string; os: string };
  speedTests: SpeedTestResult[];
  connection: ConnectionInfo | null;
  hardware: ReturnType<typeof getHardwareInfo>;
  referrer: string;
  doNotTrack: string;
  gpc: string;
  storageEstimate: { quota: number; usage: number; usagePercent: string } | null;
  audioFingerprint: string;
  mediaDevices: { audioinput: number; audiooutput: number; videoinput: number } | null;
  permissions: PermissionState_[];
  clientHints: ClientHintsInfo;
  preferences: ReturnType<typeof getSystemPreferences>;
  battery: { level: number; charging: boolean } | null;
  fpHistory: FingerprintHistory;
}

function CardInfo({ text }: { text: string }) {
  return (
    <button type="button" className="info-trigger" title="How is this calculated?" aria-label="How is this calculated?">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4M12 8h.01"/>
      </svg>
      <span className="info-tooltip" role="tooltip">{text}</span>
    </button>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return <p className="card-tip"><strong>Reduce it:</strong> {children}</p>;
}

interface ExposureSignal {
  label: string;
  exposed: boolean;
  detail: string;
}

// Honest heuristic, not entropy math: counts which tracking surfaces this
// browser exposes. Real uniqueness measurement needs a population database
// (like EFF's Cover Your Tracks); we say so in the UI.
function computeExposure(data: PrivacyData): { signals: ExposureSignal[]; exposedCount: number; level: 'low' | 'medium' | 'high' } {
  const signals: ExposureSignal[] = [
    { label: 'IP & location visible', exposed: !!data.ipInfo, detail: data.ipInfo ? `${data.ipInfo.city}, ${data.ipInfo.country}` : 'Lookup blocked' },
    { label: 'Stable browser fingerprint', exposed: data.fingerprint !== 'Unable to generate', detail: data.fpHistory.matches === true ? 'Matched your previous visit' : 'Generated this visit' },
    { label: 'Canvas fingerprinting works', exposed: data.canvasFingerprint !== 'Not available', detail: 'Rendering hash readable' },
    { label: 'Audio fingerprinting works', exposed: data.audioFingerprint !== 'Not available', detail: 'Audio stack hash readable' },
    { label: 'GPU model exposed', exposed: data.webgl.available && !/swiftshader|llvmpipe|mesa/i.test(data.webgl.renderer), detail: data.webgl.available ? 'Unmasked WebGL renderer' : 'WebGL unavailable' },
    { label: 'WebRTC exposes public IP', exposed: data.webrtc.leaking, detail: data.webrtc.leaking ? 'Public IP in ICE candidates' : 'No public candidate' },
    { label: 'Fonts enumerable', exposed: data.fonts.length > 5, detail: `${data.fonts.length} fonts detected` },
    { label: 'Hardware specs exposed', exposed: data.hardware.deviceMemory != null, detail: data.hardware.deviceMemory != null ? 'CPU cores + RAM readable' : 'RAM hidden (cores still visible)' },
    { label: 'High-entropy client hints', exposed: data.clientHints.platformVersion != null, detail: data.clientHints.platformVersion != null ? 'Exact OS version readable' : 'Not available' },
    { label: 'No opt-out signal sent', exposed: data.gpc !== 'Enabled', detail: data.gpc === 'Enabled' ? 'GPC active' : 'GPC off or unsupported' },
  ];
  const exposedCount = signals.filter(s => s.exposed).length;
  const level = exposedCount <= 3 ? 'low' : exposedCount <= 6 ? 'medium' : 'high';
  return { signals, exposedCount, level };
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
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const collectData = useCallback(async () => {
    setLoading(true);

    const ua = getUserAgent();
    
    // Collect all data in parallel where possible
    const [ipInfo, fingerprint, webrtc, adBlocker, audioFingerprint, mediaDevices, permissions, clientHints, battery] = await Promise.all([
      getIPInfo(),
      getBrowserFingerprint(),
      getWebRTCInfo(),
      detectAdBlocker(),
      getAudioFingerprint(),
      getMediaDeviceCounts(),
      getPermissionStates(),
      getClientHints(),
      getBatteryInfo(),
    ]);

    const fpHistory = checkFingerprintHistory(fingerprint);

    // Synchronous data
    const canvasFingerprint = getCanvasFingerprint();
    const webgl = getWebGLInfo();
    const fonts = detectFonts();
    const cookies = getCookieStatus();
    const screen = getScreenInfo();
    const locale = getLocaleInfo();
    const parsedUA = parseUserAgent(ua);
    const connection = getConnectionInfo();
    const hardware = getHardwareInfo();
    const referrer = getReferrer();
    const doNotTrack = getDoNotTrack();
    const gpc = getGlobalPrivacyControl();
    const preferences = getSystemPreferences();
    const storageEstimate = await getStorageEstimate();

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
      speedTests: [],
      connection,
      hardware,
      referrer,
      doNotTrack,
      gpc,
      storageEstimate,
      audioFingerprint,
      mediaDevices,
      permissions,
      clientHints,
      preferences,
      battery,
      fpHistory,
    });

    setLoading(false);

    // Run speed tests after main data is loaded (non-blocking)
    runSpeedTests((results) => {
      setData(prev => prev ? { ...prev, speedTests: results } : null);
    });
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

  const formatStorageBytes = (n: number) =>
    n < 1024 ? n + ' B' : n < 1024 * 1024 ? (n / 1024).toFixed(1) + ' KB' : (n / (1024 * 1024)).toFixed(1) + ' MB';

  const buildReport = (redact: boolean) => {
    if (!data) return '';
    const maskIP = (ip: string) => {
      if (!redact) return ip;
      if (ip.includes(':')) return ip.split(':').slice(0, 2).join(':') + ':xxxx…';
      return ip.split('.').slice(0, 2).join('.') + '.xxx.xxx';
    };
    const lines: string[] = [
      '— What Do They Know? — Privacy Report' + (redact ? ' (IPs redacted)' : ''),
      '',
      'IP & Location: ' + (data.ipInfo ? `${maskIP(data.ipInfo.ip)} | ${data.ipInfo.city}, ${data.ipInfo.region}, ${data.ipInfo.country} | ${data.ipInfo.isp}` + (data.ipInfo.vpnOrProxy !== null ? ` | VPN/proxy per ${data.ipInfo.source}: ${data.ipInfo.vpnOrProxy ? 'Yes' : 'No'}` : '') : 'Protected or blocked'),
      'Browser Fingerprint: ' + data.fingerprint,
      'Canvas Fingerprint: ' + data.canvasFingerprint,
      'User Agent: ' + data.parsedUA.browser + ' / ' + data.parsedUA.os,
      'Screen: ' + data.screen.width + '×' + data.screen.height + ', ' + data.screen.colorDepth + '-bit, ' + data.screen.pixelRatio + 'x',
      'Timezone: ' + data.locale.timezone + ' | Language: ' + data.locale.language,
      'WebGL: ' + (data.webgl.available ? data.webgl.vendor + ' / ' + data.webgl.renderer : 'N/A'),
      'WebRTC: ' + (data.webrtc.leaking ? 'Public IP exposed: ' + data.webrtc.publicIPs.map(maskIP).join(', ') : 'No public IP exposed') +
        (data.webrtc.localIPs.length || data.webrtc.mdnsCandidates.length
          ? ' | Local candidates: ' + [...data.webrtc.localIPs.map(maskIP), ...data.webrtc.mdnsCandidates].join(', ')
          : ''),
      'Audio Fingerprint: ' + data.audioFingerprint,
      'Media devices: ' + (data.mediaDevices ? `${data.mediaDevices.videoinput} camera(s), ${data.mediaDevices.audioinput} mic(s), ${data.mediaDevices.audiooutput} speaker(s)` : 'N/A'),
      'Permissions: ' + (data.permissions.length ? data.permissions.map(p => `${p.name}=${p.state}`).join(', ') : 'N/A'),
      'Client hints: ' + (data.clientHints.supported ? [data.clientHints.brands.join(' / '), data.clientHints.platform, data.clientHints.platformVersion, data.clientHints.architecture].filter(Boolean).join(' | ') : 'Not supported'),
      'Preferences: ' + `${data.preferences.colorScheme} mode, reduced motion ${data.preferences.reducedMotion ? 'on' : 'off'}, touch ${data.preferences.touchSupport ? 'yes (' + data.preferences.maxTouchPoints + ' points)' : 'no'}, ${data.preferences.pointerType}`,
      'Battery: ' + (data.battery ? `${data.battery.level}%${data.battery.charging ? ' (charging)' : ''}` : 'Not exposed'),
      'Languages: ' + data.locale.languages.join(', '),
      'Fingerprint vs last visit: ' + (data.fpHistory.matches === null ? 'First recorded visit' : data.fpHistory.matches ? 'SAME — recognizable without cookies' : 'Different'),
      'Fonts detected: ' + data.fonts.length,
      'Ad blocker: ' + (data.adBlocker ? 'Yes' : 'No'),
      'Cookies: ' + (data.cookies.enabled ? 'Enabled' : 'Disabled') + ' | First-party write: ' + data.cookies.firstPartyWrite + ' | Third-party: ' + data.cookies.thirdParty,
      'Connection: ' + (data.connection ? `Type ${data.connection.effectiveType ?? '?'}, downlink ${data.connection.downlink ?? '?'} Mbps, RTT ${data.connection.rtt ?? '?'} ms, saveData ${data.connection.saveData}` : 'N/A'),
      'Hardware: ' + data.hardware.hardwareConcurrency + ' cores' + (data.hardware.deviceMemory != null ? ', ~' + data.hardware.deviceMemory + ' GB RAM' : ''),
      'Referrer: ' + data.referrer,
      'Do Not Track: ' + data.doNotTrack + ' | Global Privacy Control: ' + data.gpc,
      'Storage: ' + (data.storageEstimate ? `${formatStorageBytes(data.storageEstimate.usage)} / ${formatStorageBytes(data.storageEstimate.quota)} (${data.storageEstimate.usagePercent})` : 'N/A'),
    ];
    if (data.speedTests?.length) {
      lines.push('', 'Speed tests:');
      data.speedTests.forEach(t => lines.push(`  ${t.server} (${t.location}): ${t.latency != null ? t.latency + ' ms' : 'Failed'}`));
    }
    lines.push('', 'Generated at whatdotheyknow.app — nothing stored or logged by this site.');
    return lines.join('\n');
  };

  const handleCopyReport = async (redact: boolean) => {
    const report = buildReport(redact);
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const handleDownloadReport = () => {
    const report = buildReport(false);
    if (!report) return;
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whatdotheyknow-report.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearHistory = () => {
    clearFingerprintHistory();
    setData(prev => prev ? { ...prev, fpHistory: { previousId: null, previousDate: null, matches: null } } : null);
  };

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="container header-content">
          <a href="/" className="logo" aria-label="What Do They Know? Home">
            <svg className="logo-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
            <button className="btn btn-secondary" onClick={() => handleCopyReport(false)} disabled={loading || !data} title="Copy full report to clipboard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Failed' : 'Copy report'}
            </button>
            <button className="btn btn-secondary" onClick={() => handleCopyReport(true)} disabled={loading || !data} title="Copy report with IP addresses masked — safe to share">
              Copy redacted
            </button>
            <button className="btn btn-secondary" onClick={handleDownloadReport} disabled={loading || !data} title="Download full report as a .txt file">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Download
            </button>
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
          <p>See exactly what information websites can collect about you just by visiting them. This site stores nothing and has no analytics.</p>
          <div className="privacy-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            We collect nothing — no backend, no analytics, no logs. What you see stays on your screen.
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          {!loading && data && (() => {
            const exp = computeExposure(data);
            const levelColor = exp.level === 'low' ? 'var(--success)' : exp.level === 'medium' ? 'var(--warning)' : 'var(--danger)';
            const levelLabel = exp.level === 'low' ? 'Low exposure' : exp.level === 'medium' ? 'Medium exposure' : 'High exposure';
            return (
              <section className="summary-panel" aria-label="Exposure summary">
                <div className="summary-headline">
                  <div>
                    <h2>Your tracking exposure: <span style={{ color: levelColor }}>{levelLabel}</span></h2>
                    <p className="summary-sub">
                      {exp.exposedCount} of {exp.signals.length} tracking surfaces are exposed in this browser.
                      This is a count of working techniques, not a uniqueness measurement — true uniqueness
                      needs a population database like <a href="https://coveryourtracks.eff.org/" target="_blank" rel="noopener noreferrer">EFF's Cover Your Tracks</a>.
                    </p>
                  </div>
                  <div className="summary-score" style={{ borderColor: levelColor, color: levelColor }}>
                    {exp.exposedCount}/{exp.signals.length}
                  </div>
                </div>
                <ul className="summary-signals">
                  {exp.signals.map((s, i) => (
                    <li key={i} className={s.exposed ? 'signal-exposed' : 'signal-safe'}>
                      <span className="signal-dot" aria-hidden="true">{s.exposed ? '●' : '○'}</span>
                      <span className="signal-label">{s.label}</span>
                      <span className="signal-detail">{s.detail}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })()}
          <h2 className="section-heading">What websites can see about you</h2>
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
                  <h3>IP Address & Location<CardInfo text="We request your IP from a third-party API (ipapi.co, freeipapi.com, or ipwho.is). Your browser sends the request; the API returns your IP and approximate location." /></h3>
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
              </div>
              <p className="card-explanation">
                Your IP address reveals your approximate location and internet provider. Websites use this to serve localized content and track your general whereabouts. If you use a VPN, sites can often still tell — VPN and datacenter IP ranges are publicly catalogued.
              </p>
              <Tip>A reputable VPN or Tor changes the IP sites see. Note the "VPN/proxy visible" row — sites can usually tell you're on a VPN even though they can't see through it.</Tip>
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
                  <h3>Browser Fingerprint<CardInfo text="FingerprintJS runs in your browser and combines many signals (canvas, WebGL, fonts, etc.) into a single hash. No data is sent to a server. To demonstrate persistence, we keep your last fingerprint in your own localStorage — clearable anytime." /></h3>
                </div>
                <span className="card-status status-warning">Unique ID</span>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Generating...</div>
                ) : (
                  <>
                    <div className="card-value mono">{data?.fingerprint}</div>
                    {data?.fpHistory.matches === true && (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', marginTop: '0.5rem' }}>
                        Same fingerprint as your visit on {new Date(data.fpHistory.previousDate!).toLocaleString()} — this is how
                        sites recognize you with no cookies at all.{' '}
                        <button onClick={handleClearHistory} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit', fontSize: 'inherit' }}>
                          Clear stored history
                        </button>
                      </p>
                    )}
                    {data?.fpHistory.matches === null && (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        First recorded visit. We saved this fingerprint in your browser's localStorage (the only thing this app
                        stores, and it never leaves your machine) — revisit later to see if it still identifies you.
                      </p>
                    )}
                    {data?.fpHistory.matches === false && (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--success)', marginTop: '0.5rem' }}>
                        Different from your visit on {new Date(data.fpHistory.previousDate!).toLocaleString()} — something about
                        your browser changed, which makes you harder to track.
                      </p>
                    )}
                  </>
                )}
              </div>
              <p className="card-explanation">
                This unique identifier is generated from your browser's characteristics. It can track you across websites even without cookies.
              </p>
              <Tip>Firefox's <code>privacy.resistFingerprinting</code>, the Tor Browser, or Brave's fingerprint randomization make this ID unstable between sessions, which defeats it.</Tip>
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
                  <h3>User Agent<CardInfo text="Read directly from navigator.userAgent. Your browser sends this string with every request." /></h3>
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
              <Tip>You can't usefully hide this — spoofing the UA breaks sites and makes you <em>more</em> unusual. Using a mainstream browser keeps you in a bigger crowd.</Tip>
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
                  <h3>Screen & Display<CardInfo text="Read from window.screen: width, height, availWidth, availHeight, colorDepth, and devicePixelRatio." /></h3>
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
              <Tip>Common resolutions (1920×1080) blend in; unusual monitors and fractional zoom levels stand out. Tor Browser letterboxes the window to standard sizes for exactly this reason.</Tip>
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
                  <h3>Timezone & Language<CardInfo text="From Intl.DateTimeFormat().resolvedOptions().timeZone and navigator.language / navigator.languages." /></h3>
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
                      <span className="card-detail-label">All languages</span>
                      <span className="card-detail-value">{data?.locale.languages.join(', ')}</span>
                    </div>
                    <div className="card-detail">
                      <span className="card-detail-label">Platform</span>
                      <span className="card-detail-value">{data?.locale.platform}</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="card-explanation">
                Your timezone and language settings reveal your location and preferences. The full language <em>list</em> is a stronger fingerprint signal than the primary language alone — an unusual combination is very identifying.
              </p>
              <Tip>If your IP says one country and your timezone says another, sites notice the mismatch — VPN users should be aware of this. Tor Browser reports UTC for everyone.</Tip>
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
                  <h3>Canvas Fingerprint<CardInfo text="We draw shapes and text to an off-screen canvas, then hash the pixel data. Small rendering differences create a unique value." /></h3>
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
              <Tip>Brave randomizes canvas output per-site ("farbling"); Firefox's resistFingerprinting and extensions like CanvasBlocker add noise so the hash changes every time.</Tip>
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
                  <h3>WebGL Info<CardInfo text="We create a WebGL context and read UNMASKED_VENDOR_WEBGL and UNMASKED_RENDERER_WEBGL (GPU info)." /></h3>
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
              <Tip>Firefox's resistFingerprinting and Tor Browser report a generic renderer instead of your real GPU. Brave randomizes WebGL the same way it does canvas.</Tip>
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
                  <h3>WebRTC Leak Test<CardInfo text="We create a temporary RTCPeerConnection with a STUN server (stun.l.google.com). ICE candidates may reveal IPs. Only a public IP counts as a leak — local-network IPs and mDNS (.local) names are visible to scripts but don't identify you on the internet." /></h3>
                </div>
                {!loading && (
                  <span className={`card-status ${data?.webrtc.leaking ? 'status-danger' : 'status-safe'}`}>
                    {data?.webrtc.leaking ? 'Public IP exposed' : 'No leak'}
                  </span>
                )}
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Testing...</div>
                ) : data?.webrtc.leaking ? (
                  <>
                    <div className="card-value" style={{ color: 'var(--danger)' }}>
                      Public IP exposed via WebRTC
                      {data.ipInfo && data.webrtc.publicIPs.some(ip => ip !== data.ipInfo!.ip) &&
                        ' — and it differs from your HTTP IP (possible VPN bypass)'}
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
                {!loading && data && (data.webrtc.localIPs.length > 0 || data.webrtc.mdnsCandidates.length > 0) && (
                  <>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.5rem 0 0.25rem' }}>
                      Local candidates visible to scripts (not an internet-facing leak):
                    </p>
                    <div className="list-items">
                      {[...data.webrtc.localIPs, ...data.webrtc.mdnsCandidates].map((ip, i) => (
                        <span key={i} className="list-item">{ip}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <p className="card-explanation">
                WebRTC can expose your real public IP even when using a VPN — the key check is whether the WebRTC IP differs from your HTTP IP. Modern browsers hide local IPs behind mDNS names by default.
              </p>
              <Tip>Good VPN apps route WebRTC traffic too — verify with this card while connected. uBlock Origin has a "prevent WebRTC IP leak" setting; Firefox lets you disable WebRTC entirely via <code>media.peerconnection.enabled</code>.</Tip>
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
                  <h3>Detected Fonts<CardInfo text="We measure the rendered width of a test string in many font families. If the width differs from the fallback, that font is likely installed." /></h3>
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
                Your installed fonts create a unique signature. The combination of fonts you have is surprisingly identifiable — especially fonts installed by specific software (Adobe, Microsoft Office, design tools).
              </p>
              <Tip>Avoid installing system-wide fonts you don't need. Firefox's resistFingerprinting restricts sites to a standard font whitelist.</Tip>
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
                  <h3>Ad Blocker<CardInfo text="We add a hidden element with ad-like class names and try to fetch a known ad script. If the element is hidden or the fetch fails, an ad blocker may be active." /></h3>
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
              <Tip>Keep the blocker — blocking trackers helps far more than the one detection bit costs. uBlock Origin is the standard recommendation.</Tip>
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
                  <h3>Cookie Status<CardInfo text="navigator.cookieEnabled, plus a first-party test cookie we set and immediately delete. Third-party cookie behavior cannot be tested from a single first-party page — it would require an embedded cross-site iframe — so we don't pretend to measure it." /></h3>
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
                      <span className="card-detail-label">First-party write</span>
                      <span className="card-detail-value">{data?.cookies.firstPartyWrite}</span>
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
              <Tip>Block third-party cookies in your browser settings (Firefox and Safari do by default; Chrome still allows them). Everything keeps working for the vast majority of sites.</Tip>
            </div>

            {/* Speed Test Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon green">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                  </div>
                  <h3>Server Response Time<CardInfo text="After a warm-up request (so DNS/TLS setup isn't counted), we fetch a small resource from each server 3 times and take the median HTTP round-trip time. This includes server processing time, so it's higher than a raw ping." /></h3>
                </div>
                {!loading && data?.speedTests && data.speedTests.length > 0 && data.speedTests.every(t => t.status === 'done' || t.status === 'error') && (
                  <span className="card-status status-safe">Complete</span>
                )}
              </div>
              <div className="card-content">
                {loading || !data?.speedTests || data.speedTests.length === 0 ? (
                  <div className="loading"><div className="spinner"></div> Preparing tests...</div>
                ) : (
                  <div className="card-details">
                    {data.speedTests.map((test, i) => (
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
                )}
              </div>
              <p className="card-explanation">
                HTTP round-trip time to major servers indicates connection quality (it is not a raw ping). Websites can use timing like this to estimate your network conditions and rough location.
              </p>
              <Tip>Little to do here — timing is inherent to networking. A VPN changes which region you appear closest to (and adds some latency).</Tip>
            </div>

            {/* Connection / Network Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon blue">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                  <h3>Network / Connection<CardInfo text="From the Network Information API (navigator.connection): effectiveType, downlink, rtt, saveData. Not supported in all browsers." /></h3>
                </div>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Loading...</div>
                ) : data?.connection ? (
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
              </div>
              <p className="card-explanation">
                The Network Information API reveals your connection type (4g, wifi, etc.) and quality. Used for fingerprinting and serving different content by connection.
              </p>
              <Tip>Chromium-only — Firefox and Safari don't ship this API at all, which is the privacy-protective choice.</Tip>
            </div>

            {/* Hardware Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon purple">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
                      <rect x="9" y="9" width="6" height="6"/>
                      <line x1="9" y1="1" x2="9" y2="4"/>
                      <line x1="15" y1="1" x2="15" y2="4"/>
                      <line x1="9" y1="20" x2="9" y2="23"/>
                      <line x1="15" y1="20" x2="15" y2="23"/>
                    </svg>
                  </div>
                  <h3>Hardware<CardInfo text="navigator.hardwareConcurrency (CPU cores) and navigator.deviceMemory (approx. RAM in GB, Chrome only)." /></h3>
                </div>
                <span className="card-status status-warning">Fingerprint</span>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Loading...</div>
                ) : (
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
                )}
              </div>
              <p className="card-explanation">
                CPU core count and approximate RAM are exposed to scripts. Together with other signals they help build a unique device fingerprint.
              </p>
              <Tip>Firefox's resistFingerprinting caps the reported core count; deviceMemory is Chromium-only. Common hardware (4–8 cores) blends in better than exotic specs.</Tip>
            </div>

            {/* Referrer Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon yellow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                  </div>
                  <h3>Referrer<CardInfo text="document.referrer — the URL of the page that linked here, or empty if you came directly or it was blocked." /></h3>
                </div>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Loading...</div>
                ) : (
                  <div className="card-value mono" style={{ fontSize: '0.8125rem' }}>{data?.referrer}</div>
                )}
              </div>
              <p className="card-explanation">
                The referrer header tells this page which site or URL sent you here. It can leak your browsing path; many privacy tools strip it.
              </p>
              <Tip>Modern browsers default to sending only the origin (not the full URL) cross-site. Extensions like uBlock Origin can strip it entirely.</Tip>
            </div>

            {/* Do Not Track Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon green">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <h3>Tracking Signals (DNT / GPC)<CardInfo text="navigator.doNotTrack and navigator.globalPrivacyControl. DNT is obsolete (Firefox removed it in 2025; sites ignore it). GPC is its successor and is legally enforceable under some laws like the California CCPA." /></h3>
                </div>
                {!loading && (
                  <span className={`card-status ${data?.gpc === 'Enabled' ? 'status-safe' : 'status-warning'}`}>
                    GPC {data?.gpc}
                  </span>
                )}
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Loading...</div>
                ) : (
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
                )}
              </div>
              <p className="card-explanation">
                Do Not Track is effectively dead — sites ignore it and Firefox removed it. Global Privacy Control (GPC) is the modern signal, and businesses must honor it under some US state privacy laws.
              </p>
              <Tip>Enable GPC: built into Firefox (Settings → Privacy) and Brave; available for Chrome via extensions like Privacy Badger.</Tip>
            </div>

            {/* Storage Estimate Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon blue">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <ellipse cx="12" cy="5" rx="9" ry="3"/>
                      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                    </svg>
                  </div>
                  <h3>Storage (quota)<CardInfo text="navigator.storage.estimate() returns quota and usage in bytes for this origin (cookies, localStorage, etc.)." /></h3>
                </div>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Loading...</div>
                ) : data?.storageEstimate ? (
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
              </div>
              <p className="card-explanation">
                Browsers expose how much storage (cookies, localStorage, etc.) is available and used. Sites use this to decide how much tracking data to store.
              </p>
              <Tip>Periodically clear site data for sites you don't trust, or use containers/private windows so storage doesn't accumulate across sessions.</Tip>
            </div>

            {/* Audio Fingerprint Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon purple">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                    </svg>
                  </div>
                  <h3>Audio Fingerprint<CardInfo text="We render a fixed tone through an OfflineAudioContext (nothing plays out loud, no microphone involved) and sum the output samples. Tiny float-math differences across hardware/drivers make the number identifying." /></h3>
                </div>
                <span className="card-status status-warning">Trackable</span>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Rendering...</div>
                ) : (
                  <div className="card-value mono">{data?.audioFingerprint}</div>
                )}
              </div>
              <p className="card-explanation">
                Like canvas fingerprinting but for your audio stack: the same silent signal renders slightly differently on different machines, producing a stable identifier. No sound plays and no microphone is used.
              </p>
              <Tip>Brave randomizes audio output per-site; Tor Browser blocks the technique. Most other browsers expose it freely.</Tip>
            </div>

            {/* Media Devices & Permissions Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon red">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 7l-7 5 7 5V7z"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                  </div>
                  <h3>Devices & Permissions<CardInfo text="navigator.mediaDevices.enumerateDevices() — device COUNTS are readable without any permission prompt (names stay hidden until you grant access). navigator.permissions.query() shows what you've already granted." /></h3>
                </div>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Enumerating...</div>
                ) : (
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
                )}
              </div>
              <p className="card-explanation">
                Any site can count your cameras, mics, and speakers without asking — and check which permissions you've already granted. "Granted" permissions can be silently re-used on a return visit.
              </p>
              <Tip>Audit granted permissions in your browser's site settings and revoke ones you no longer need — "granted" means no prompt next time.</Tip>
            </div>

            {/* System Preferences Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon yellow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  </div>
                  <h3>System Preferences<CardInfo text="Read via CSS media queries (matchMedia) and navigator.maxTouchPoints: dark/light mode, reduced motion, contrast, touch support, pointer type. Each is one more fingerprint bit." /></h3>
                </div>
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Loading...</div>
                ) : (
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
                )}
              </div>
              <p className="card-explanation">
                Yes — even your dark-mode choice is visible to every website via CSS. Accessibility settings like reduced motion are especially identifying because few people enable them.
              </p>
              <Tip>These leak through CSS itself, so they're hard to hide without breaking theming. Tor Browser reports the defaults for everyone.</Tip>
            </div>

            {/* Client Hints Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon blue">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                    </svg>
                  </div>
                  <h3>Client Hints<CardInfo text="navigator.userAgentData (Chromium). Low-entropy values are free; 'high-entropy' values — exact OS version, CPU architecture, device model — are handed to any script that calls getHighEntropyValues(). No permission prompt." /></h3>
                </div>
                {!loading && data?.clientHints.supported && data.clientHints.platformVersion != null && (
                  <span className="card-status status-warning">High entropy</span>
                )}
              </div>
              <div className="card-content">
                {loading ? (
                  <div className="loading"><div className="spinner"></div> Loading...</div>
                ) : data?.clientHints.supported ? (
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
                      <span className="card-detail-value">{data.clientHints.model || '(none — desktop)'}</span>
                    </div>
                    <div className="card-detail">
                      <span className="card-detail-label">Full version</span>
                      <span className="card-detail-value">{data.clientHints.fullVersion ?? '—'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="card-value">Not supported (Chromium-only API)</div>
                )}
              </div>
              <p className="card-explanation">
                Client Hints were designed to replace the user-agent string with something less identifying — but the "high-entropy" values give Chromium sites your exact OS build and CPU architecture, which is more precise than the UA string ever was.
              </p>
              <Tip>Firefox and Safari don't implement this API. On Chromium there's no setting to refuse high-entropy hints to scripts.</Tip>
            </div>
          </div>

          {/* Explainer */}
          <section className="explainer" aria-labelledby="explainer-heading">
            <h2 id="explainer-heading">How browser fingerprinting works</h2>
            <p>
              Cookies can be deleted, so trackers built something sturdier: instead of <em>storing</em> an ID on your machine,
              they <em>compute</em> one from how your machine behaves. Your screen size, fonts, GPU, audio stack, language list,
              timezone, and dozens of other readable properties each narrow you down a little. Multiplied together, they often
              identify one browser in millions — no storage required, nothing to clear.
            </p>
            <p>
              That's why "clear cookies" doesn't stop tracking, and why this page's fingerprint card can recognize you on a
              return visit. The defenses that work take two opposite strategies: <strong>blend in</strong> (Tor Browser makes
              everyone look identical) or <strong>add noise</strong> (Brave randomizes canvas/audio/WebGL output per site, so
              your ID never repeats). Blocking trackers outright (uBlock Origin, Firefox's tracking protection) cuts off most of
              the parties doing the fingerprinting in the first place.
            </p>
            <p>
              Each card above shows one signal, how it's read, and what reduces it. For a research-grade uniqueness estimate
              against a real population, see <a href="https://coveryourtracks.eff.org/" target="_blank" rel="noopener noreferrer">EFF's
              Cover Your Tracks</a>; for the underlying science, the EFF's 2010 <em>Panopticlick</em> paper started the field.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Privacy Notice:</strong> This site has no backend and collects nothing — all results exist only on your screen. A few checks (IP lookup, WebRTC, response times) work by contacting third-party servers, which see your IP the way any website does; each card's ⓘ explains exactly how it works.
          </p>
          <p>
            Built with privacy in mind. <a href="https://github.com/andy-broyles/whatdotheyknow-app" target="_blank" rel="noopener noreferrer">View source on GitHub</a>
          </p>
          <p style={{ marginTop: '0.5rem' }}>Thanks, Tom</p>
        </div>
      </footer>
      <Analytics />
    </>
  );
}

export default App;
