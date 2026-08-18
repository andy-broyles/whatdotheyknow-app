import { useState, useEffect, useCallback, useRef } from 'react';
import { SignalsGrid, type PrivacyData } from './components/SignalsGrid';
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
} from './utils/privacy';

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
    { label: 'Location from your IP', exposed: !!data.ipInfo, detail: data.ipInfo ? `${data.ipInfo.city}, ${data.ipInfo.country}` : 'Lookup blocked' },
    { label: 'Reusable device nickname', exposed: data.fingerprint !== 'Unable to generate', detail: data.fpHistory.matches === true ? 'Matched your previous visit' : 'Generated this visit' },
    { label: 'Hidden drawing test works', exposed: data.canvasFingerprint !== 'Not available', detail: 'Sites can read a drawing ID' },
    { label: 'Silent sound test works', exposed: data.audioFingerprint !== 'Not available', detail: 'Sites can read a sound ID' },
    { label: 'Graphics card name visible', exposed: data.webgl.available && !/swiftshader|llvmpipe|mesa/i.test(data.webgl.renderer), detail: data.webgl.available ? 'Chip name is readable' : 'Graphics info unavailable' },
    { label: 'Real IP leaks through calls', exposed: data.webrtc.leaking, detail: data.webrtc.leaking ? 'Real internet address leaked' : 'No public address leaked' },
    { label: 'Fonts can be listed', exposed: data.fonts.length > 5, detail: `${data.fonts.length} fonts detected` },
    { label: 'Memory size is readable', exposed: data.hardware.deviceMemory != null, detail: data.hardware.deviceMemory != null ? 'CPU cores + RAM readable' : 'RAM hidden (cores still visible)' },
    { label: 'Chrome shared extra details', exposed: data.clientHints.platformVersion != null, detail: data.clientHints.platformVersion != null ? 'Exact OS version readable' : 'Not available' },
    { label: 'No “don’t sell my data” signal', exposed: data.gpc !== 'Enabled', detail: data.gpc === 'Enabled' ? 'Don’t-sell signal on' : 'Don’t-sell signal off or unsupported' },
  ];
  const exposedCount = signals.filter(s => s.exposed).length;
  const level = exposedCount <= 3 ? 'low' : exposedCount <= 6 ? 'medium' : 'high';
  return { signals, exposedCount, level };
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem('wdtk-theme');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
    } catch {
      // storage blocked
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PrivacyData | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [redactDownload, setRedactDownload] = useState(false);
  const collectGen = useRef(0);
  const collectAbort = useRef<AbortController | null>(null);

  const collectData = useCallback(async () => {
    collectAbort.current?.abort();
    const ac = new AbortController();
    collectAbort.current = ac;
    const gen = ++collectGen.current;
    setLoading(true);

    const ua = getUserAgent();

    // Collect all data in parallel where possible
    const [ipInfo, fingerprint, webrtc, adBlocker, audioFingerprint, mediaDevices, permissions, clientHints, battery] = await Promise.all([
      getIPInfo(ac.signal),
      getBrowserFingerprint(),
      getWebRTCInfo(ac.signal),
      detectAdBlocker(ac.signal),
      getAudioFingerprint(),
      getMediaDeviceCounts(),
      getPermissionStates(),
      getClientHints(),
      getBatteryInfo(),
    ]);

    if (gen !== collectGen.current || ac.signal.aborted) return;

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

    if (gen !== collectGen.current || ac.signal.aborted) return;

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
      if (gen !== collectGen.current || ac.signal.aborted) return;
      setData(prev => prev ? { ...prev, speedTests: results } : null);
    }, ac.signal);
  }, []);

  useEffect(() => {
    collectData();
    return () => collectAbort.current?.abort();
  }, [collectData]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    try {
      localStorage.setItem('wdtk-theme', darkMode ? 'dark' : 'light');
    } catch {
      // storage blocked
    }
  }, [darkMode]);

  // Close the download menu on outside click
  useEffect(() => {
    if (!downloadMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.download-menu-wrapper')) {
        setDownloadMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [downloadMenuOpen]);

  const handleRefresh = () => {
    collectData();
  };

  const formatStorageBytes = (n: number) =>
    n < 1024 ? n + ' B' : n < 1024 * 1024 ? (n / 1024).toFixed(1) + ' KB' : (n / (1024 * 1024)).toFixed(1) + ' MB';

  // Structured report sections — single source for text, JSON, and PDF output
  const buildSections = (redact: boolean): { heading: string; rows: [string, string][] }[] => {
    if (!data) return [];
    const maskIP = (ip: string) => {
      if (!redact) return ip;
      if (ip.includes(':')) return ip.split(':').slice(0, 2).join(':') + ':xxxx…';
      return ip.split('.').slice(0, 2).join('.') + '.xxx.xxx';
    };
    const sections: { heading: string; rows: [string, string][] }[] = [
      {
        heading: 'Where you are and how you connect',
        rows: [
          ['Internet provider & location', data.ipInfo ? `${maskIP(data.ipInfo.ip)} | ${data.ipInfo.city}, ${data.ipInfo.region}, ${data.ipInfo.country} | ${data.ipInfo.isp}` + (data.ipInfo.vpnOrProxy !== null ? ` | VPN/proxy per ${data.ipInfo.source}: ${data.ipInfo.vpnOrProxy ? 'Yes' : 'No'}` : '') : 'Couldn’t look up (blocked or timed out)'],
          ['WebRTC (video-call leak)', (data.webrtc.leaking ? 'Public IP exposed: ' + data.webrtc.publicIPs.map(maskIP).join(', ') : 'No public IP exposed') +
            (data.webrtc.localIPs.length || data.webrtc.mdnsCandidates.length || data.webrtc.cgnatIPs.length
              ? ' | Local/CGNAT candidates: ' + [...data.webrtc.localIPs.map(maskIP), ...data.webrtc.cgnatIPs.map(maskIP), ...data.webrtc.mdnsCandidates].join(', ')
              : '')],
          ['Connection', data.connection ? `Type ${data.connection.effectiveType ?? '?'}, download ${data.connection.downlink ?? '?'} Mbps, delay ${data.connection.rtt ?? '?'} ms, data saver ${data.connection.saveData}` : 'N/A'],
          ['Referrer', data.referrer],
        ],
      },
      {
        heading: 'Device nicknames',
        rows: [
          ['Device nickname', data.fingerprint],
          ['Same as last visit?', data.fpHistory.matches === null ? 'First recorded visit' : data.fpHistory.matches ? 'Yes: recognizable without cookies' : 'No, it changed'],
          ['Hidden drawing test', data.canvasFingerprint],
          ['Silent sound test', data.audioFingerprint],
          ['Graphics card', data.webgl.available ? data.webgl.vendor + ' / ' + data.webgl.renderer : 'N/A'],
          ['Fonts detected', String(data.fonts.length)],
        ],
      },
      {
        heading: 'Browser & System',
        rows: [
          ['Browser name', data.parsedUA.browser + ' / ' + data.parsedUA.os],
          ['Extra Chrome details', data.clientHints.supported ? [data.clientHints.brands.join(' / '), data.clientHints.platform, data.clientHints.platformVersion, data.clientHints.architecture].filter(Boolean).join(' | ') : 'Not supported'],
          ['Screen', `${data.screen.width}×${data.screen.height}, ${data.screen.colorDepth}-bit, ${data.screen.pixelRatio}x`],
          ['Timezone', data.locale.timezone],
          ['Languages', data.locale.languages.join(', ')],
          ['Preferences', `${data.preferences.colorScheme} mode, reduced motion ${data.preferences.reducedMotion ? 'on' : 'off'}, touch ${data.preferences.touchSupport ? 'yes (' + data.preferences.maxTouchPoints + ' points)' : 'no'}, ${data.preferences.pointerType}`],
          ['Hardware', data.hardware.hardwareConcurrency + ' cores' + (data.hardware.deviceMemory != null ? ', ~' + data.hardware.deviceMemory + ' GB RAM' : '')],
          ['Battery', data.battery ? `${data.battery.level}%${data.battery.charging ? ' (charging)' : ''}` : 'Not exposed'],
          ['Media devices', data.mediaDevices ? `${data.mediaDevices.videoinput} camera(s), ${data.mediaDevices.audioinput} mic(s), ${data.mediaDevices.audiooutput} speaker(s)` : 'N/A'],
        ],
      },
      {
        heading: 'Privacy Settings',
        rows: [
          ['Permissions', data.permissions.length ? data.permissions.map(p => `${p.name}=${p.state}`).join(', ') : 'N/A'],
          ['Ad blocker', data.adBlocker ? 'Yes' : 'No'],
          ['Cookies', (data.cookies.enabled ? 'Enabled' : 'Disabled') + ' | This site can set cookies: ' + data.cookies.firstPartyWrite + ' | Other sites’ cookies: ' + data.cookies.thirdParty],
          ['Do Not Track', data.doNotTrack],
          ['Global Privacy Control', data.gpc],
          ['Storage', data.storageEstimate ? `${formatStorageBytes(data.storageEstimate.usage)} / ${formatStorageBytes(data.storageEstimate.quota)} (${data.storageEstimate.usagePercent})` : 'N/A'],
        ],
      },
    ];
    if (data.speedTests?.length) {
      sections.push({
        heading: 'How fast distant sites answer',
        rows: data.speedTests.map(t => [`${t.server} (${t.location})`, t.latency != null ? t.latency + ' ms' : 'Failed'] as [string, string]),
      });
    }
    return sections;
  };

  const reportTitle = (redact: boolean) => 'What Do They Know? Privacy Report' + (redact ? ' (IPs hidden)' : '');
  const REPORT_FOOTNOTE = 'Generated at whatdotheyknow.app. This site does not keep a copy of your report.';

  const buildReport = (redact: boolean) => {
    const sections = buildSections(redact);
    if (!sections.length) return '';
    const lines: string[] = [reportTitle(redact), ''];
    for (const s of sections) {
      lines.push(s.heading.toUpperCase());
      for (const [k, v] of s.rows) lines.push(`  ${k}: ${v}`);
      lines.push('');
    }
    lines.push(REPORT_FOOTNOTE);
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

  const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = async (format: 'pdf' | 'txt' | 'json', redact: boolean) => {
    const sections = buildSections(redact);
    if (!sections.length) return;
    setDownloadMenuOpen(false);
    const suffix = redact ? '-redacted' : '';

    if (format === 'txt') {
      saveBlob(new Blob([buildReport(redact)], { type: 'text/plain;charset=utf-8' }), `whatdotheyknow-report${suffix}.txt`);
      return;
    }

    if (format === 'json') {
      const json = {
        title: reportTitle(redact),
        generatedAt: new Date().toISOString(),
        note: REPORT_FOOTNOTE,
        sections: sections.map(s => ({
          heading: s.heading,
          values: Object.fromEntries(s.rows),
        })),
      };
      saveBlob(new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }), `whatdotheyknow-report${suffix}.json`);
      return;
    }

    // PDF — jsPDF is lazy-loaded so it doesn't weigh down the initial bundle.
    // Generated entirely in the browser; the report never leaves the machine.
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const labelWidth = 150;
    const valueWidth = pageWidth - margin * 2 - labelWidth;
    let y = margin;

    const ensureRoom = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(40);
    doc.text(reportTitle(redact), margin, y);
    y += 20;
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(120);
    doc.text(new Date().toLocaleString(), margin, y);
    y += 24;

    for (const s of sections) {
      ensureRoom(40);
      doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(79, 70, 229);
      doc.text(s.heading, margin, y);
      y += 6;
      doc.setDrawColor(200).line(margin, y, pageWidth - margin, y);
      y += 14;

      doc.setFontSize(9);
      for (const [label, value] of s.rows) {
        const valueLines = doc.splitTextToSize(value, valueWidth) as string[];
        const rowHeight = Math.max(valueLines.length, 1) * 12;
        ensureRoom(rowHeight + 4);
        doc.setFont('helvetica', 'bold').setTextColor(80);
        doc.text(label, margin, y);
        doc.setFont('helvetica', 'normal').setTextColor(40);
        doc.text(valueLines, margin + labelWidth, y);
        y += rowHeight + 4;
      }
      y += 10;
    }

    ensureRoom(20);
    doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(140);
    doc.text(REPORT_FOOTNOTE, margin, y);
    doc.save(`whatdotheyknow-report${suffix}.pdf`);
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
            <button className="btn btn-secondary" onClick={() => handleCopyReport(true)} disabled={loading || !data} title="Copy the report with IP addresses hidden (safer to share)">
              Copy without IPs
            </button>
            <div className="download-menu-wrapper">
              <button
                className="btn btn-secondary"
                onClick={() => setDownloadMenuOpen(o => !o)}
                disabled={loading || !data}
                aria-haspopup="menu"
                aria-expanded={downloadMenuOpen}
                title="Download the report. Choose a format"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Download
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              {downloadMenuOpen && (
                <div className="download-menu" role="menu">
                  <button role="menuitem" onClick={() => handleDownloadReport('pdf', redactDownload)}>
                    PDF <span className="menu-hint">formatted document</span>
                  </button>
                  <button role="menuitem" onClick={() => handleDownloadReport('txt', redactDownload)}>
                    Text <span className="menu-hint">plain .txt</span>
                  </button>
                  <button role="menuitem" onClick={() => handleDownloadReport('json', redactDownload)}>
                    JSON <span className="menu-hint">for other programs</span>
                  </button>
                  <label className="menu-checkbox">
                    <input
                      type="checkbox"
                      checked={redactDownload}
                      onChange={e => setRedactDownload(e.target.checked)}
                    />
                    Mask IP addresses
                  </label>
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={handleRefresh} disabled={loading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Refresh
            </button>
            <button className="btn-icon" onClick={() => setDarkMode(!darkMode)} title="Switch light or dark mode">
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
          <h1>What does the internet know about you?</h1>
          <p>A live check of what a website can learn from one visit: roughly where you are, what device you’re on, and a nickname that can follow you around. We don’t keep your report.</p>
          <div className="privacy-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            No account, no database. Your report stays on this screen.
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          {!loading && data && (() => {
            const exp = computeExposure(data);
            const levelColor = exp.level === 'low' ? 'var(--success)' : exp.level === 'medium' ? 'var(--warning)' : 'var(--danger)';
            const levelLabel = exp.level === 'low' ? 'a little' : exp.level === 'medium' ? 'a fair amount' : 'a lot';
            return (
              <section className="summary-panel" aria-label="How much sites can see">
                <div className="summary-headline">
                  <div>
                    <h2>How much can sites see: <span style={{ color: levelColor }}>{levelLabel}</span></h2>
                    <p className="summary-sub">
                      {exp.exposedCount} of {exp.signals.length} tracking methods work in this browser.
                      That’s a tally of techniques, not how unique you are among everyone on the internet.
                      For that kind of score, use <a href="https://coveryourtracks.eff.org/" target="_blank" rel="noopener noreferrer">EFF's Cover Your Tracks</a>.
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
          <h2 className="section-heading">What information your browser reveals</h2>
          <SignalsGrid
            data={data}
            loading={loading}
            onClearHistory={handleClearHistory}
            formatStorageBytes={formatStorageBytes}
          />

          {/* Explainer */}
          <section className="explainer" aria-labelledby="explainer-heading">
            <h2 id="explainer-heading">How sites recognize you without cookies</h2>
            <p>
              Cookies are little files a site saves on your computer. You can delete them. Trackers adapted: instead of
              <em>saving</em> an ID on your machine, they <em>build</em> one from how your machine behaves. Screen size,
              fonts, graphics chip, timezone, language, and many other details each narrow you down a little. Combined,
              they often pick one browser out of millions. Nothing to delete, nothing to clear.
            </p>
            <p>
              That’s why “clear cookies” doesn’t stop this, and why this page can recognize a return visit. Two defenses
              actually work: <strong>blend in</strong> (the Tor Browser makes everyone look the same) or <strong>add
              noise</strong> (Brave slightly randomizes drawings, sound, and graphics per site, so your nickname never
              repeats). Blocking trackers (uBlock Origin, Firefox’s tracking protection) cuts off most of the companies
              doing this in the first place.
            </p>
            <p>
              Each card above shows one clue, how it’s read, and what reduces it. To see how unique you are among a real
              crowd of people, use <a href="https://coveryourtracks.eff.org/" target="_blank" rel="noopener noreferrer">EFF's
              Cover Your Tracks</a>. The research that started this field is the EFF’s 2010 Panopticlick paper.
            </p>
          </section>

          <section className="faq" aria-labelledby="faq-heading">
            <h2 id="faq-heading">Common questions</h2>
            <div className="faq-list">
              <details>
                <summary><span>What does the internet know about me?</span></summary>
                <p>
                  Any website you visit can see roughly where you are (from your IP address) and a “nickname” built from
                  how your computer looks online: screen, fonts, graphics chip, timezone, language, and more. You are not
                  asked for permission. This page runs those same checks in your browser and shows the result. We don’t
                  keep a copy of the report. Your browser may remember this nickname and your light/dark choice on this
                  device; you can clear that here.
                </p>
              </details>
              <details>
                <summary><span>What information does my browser reveal to websites?</span></summary>
                <p>
                  Your internet address and provider, a stable nickname for this browser, hidden drawing and silent-sound
                  tests, your graphics card model, a sample of installed fonts, processor cores and memory, screen size,
                  timezone, language, extra Chrome details (exact Windows/macOS version), whether cookies work, and
                  whether a video-call feature can reveal your real IP even on a VPN.
                </p>
              </details>
              <details>
                <summary><span>What does every website know about you?</span></summary>
                <p>
                  A typical site you have never logged into can see your internet provider, rough location, what kind of
                  device you have, and enough clues to recognize you next time without cookies. It cannot see your name,
                  email, or files unless you type them. The report above is that “just visiting” data.
                </p>
              </details>
              <details>
                <summary><span>How much does the internet know about me?</span></summary>
                <p>
                  This page counts how many tracking methods work in your browser. It is not a score of how unique you
                  are. For that, you need a crowd to compare against: use{' '}
                  <a href="https://coveryourtracks.eff.org/" target="_blank" rel="noopener noreferrer">EFF's Cover Your Tracks</a>.
                </p>
              </details>
              <details>
                <summary><span>Can I stop websites from fingerprinting me?</span></summary>
                <p>
                  Two things work: look like everyone else (Tor Browser) or look different every time (Brave slightly
                  randomizes drawings, sound, and graphics per site). An ad blocker such as uBlock Origin, or Firefox’s
                  tracking protection, stops most companies from collecting the nickname. Deleting cookies does not
                  change it.
                </p>
              </details>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Privacy:</strong> We don’t have an account system or a database. Your report is built in this
            browser. A few checks contact other companies (location lookup, video-call leak test, ad-blocker probe,
            speed to Google/Cloudflare/etc.). Those companies see your IP, the way any website does. Each card’s ⓘ
            says exactly what it contacts. This device may keep a nickname demo and your light/dark choice until you
            clear them.
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
