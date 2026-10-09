import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

export const mobileDownloadRouter = express.Router();

function getFilePath(filename: string): string | null {
  const root = process.cwd();
  const candidates = [
    path.join(root, 'public', 'downloads', filename),
    path.join(root, 'dist', 'downloads', filename),
    path.join(root, filename),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

// 1. Download Android Studio / Gradle Project (.zip)
mobileDownloadRouter.get(
  ['/android', '/android-project', '/grobaax-android-project.zip', '/android.zip'],
  (_req: Request, res: Response) => {
    const file = getFilePath('grobaax-android-project.zip');
    if (!file) {
      return res.status(404).json({ error: 'Android package not found. Run packaging script.' });
    }
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="grobaax-android-project.zip"');
    return res.sendFile(file);
  }
);

// 2. Download iOS Xcode Project (.zip)
mobileDownloadRouter.get(
  ['/ios', '/ios-project', '/grobaax-ios-project.zip', '/ios.zip'],
  (_req: Request, res: Response) => {
    const file = getFilePath('grobaax-ios-project.zip');
    if (!file) {
      return res.status(404).json({ error: 'iOS package not found. Run packaging script.' });
    }
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="grobaax-ios-project.zip"');
    return res.sendFile(file);
  }
);

// 3. Download Full Mobile Distribution Suite (.zip)
mobileDownloadRouter.get(
  ['/mobile-suite', '/suite', '/all', '/grobaax-mobile-packaging-suite.zip', '/suite.zip'],
  (_req: Request, res: Response) => {
    const file = getFilePath('grobaax-mobile-packaging-suite.zip');
    if (!file) {
      return res.status(404).json({ error: 'Mobile suite not found. Run packaging script.' });
    }
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="grobaax-mobile-packaging-suite.zip"');
    return res.sendFile(file);
  }
);

// 4. Download Packaging Guide (.md)
mobileDownloadRouter.get(
  ['/guide', '/instructions', '/MOBILE_PACKAGING_GUIDE.md', '/guide.md'],
  (_req: Request, res: Response) => {
    const file = getFilePath('MOBILE_PACKAGING_GUIDE.md');
    if (!file) {
      return res.status(404).json({ error: 'Packaging guide not found.' });
    }
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="MOBILE_PACKAGING_GUIDE.md"');
    return res.sendFile(file);
  }
);

// 5. Metadata endpoint returning all download URLs and build commands
mobileDownloadRouter.get(['/info', '/status', '/json'], (_req: Request, res: Response) => {
  const androidFile = getFilePath('grobaax-android-project.zip');
  const iosFile = getFilePath('grobaax-ios-project.zip');
  const suiteFile = getFilePath('grobaax-mobile-packaging-suite.zip');

  return res.json({
    app: 'Grobaax',
    version: '1.0.0',
    appId: 'com.grobaax.app',
    downloads: {
      androidProjectZip: {
        url: '/api/download/android',
        directStaticUrl: '/downloads/grobaax-android-project.zip',
        filename: 'grobaax-android-project.zip',
        available: Boolean(androidFile),
        sizeBytes: androidFile ? fs.statSync(androidFile).size : 0,
        instructions: {
          testApk: 'cd android && ./gradlew assembleDebug (outputs: app/build/outputs/apk/debug/app-debug.apk)',
          playStoreAab: 'cd android && ./gradlew bundleRelease (outputs: app/build/outputs/bundle/release/app-release.aab)',
        },
      },
      iosProjectZip: {
        url: '/api/download/ios',
        directStaticUrl: '/downloads/grobaax-ios-project.zip',
        filename: 'grobaax-ios-project.zip',
        available: Boolean(iosFile),
        sizeBytes: iosFile ? fs.statSync(iosFile).size : 0,
        instructions: {
          openXcode: 'npx cap open ios or open ios/App/App.xcworkspace in Xcode',
          appStoreArchive: 'Product > Archive > Distribute App in Xcode',
        },
      },
      completePackagingSuiteZip: {
        url: '/api/download/mobile-suite',
        directStaticUrl: '/downloads/grobaax-mobile-packaging-suite.zip',
        filename: 'grobaax-mobile-packaging-suite.zip',
        available: Boolean(suiteFile),
        sizeBytes: suiteFile ? fs.statSync(suiteFile).size : 0,
      },
      packagingGuide: {
        url: '/api/download/guide',
        filename: 'MOBILE_PACKAGING_GUIDE.md',
      },
    },
  });
});

// 6. Standalone Direct HTML Download Hub (Zero JavaScript dependency, bypasses any iframe sandbox)
mobileDownloadRouter.get(['/', '/hub', '/page', '/index', '/index.html'], (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grobaax — Mobile App Packaging Downloads (.apk, .aab, iOS)</title>
  <meta name="description" content="Download ready-to-build Android (.apk / .aab) and iOS Xcode packages for Grobaax.">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --border: #1f2937;
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --emerald: #10b981;
      --emerald-hover: #059669;
      --text: #f9fafb;
      --text-muted: #9ca3af;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 1.5rem 1rem;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    header {
      text-align: center;
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: linear-gradient(135deg, #1e1b4b, #0f172a);
      border: 1px solid #312e81;
      border-radius: 1.25rem;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 900;
      letter-spacing: -0.025em;
      margin-bottom: 0.5rem;
    }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
    }
    p.lead {
      color: #cbd5e1;
      font-size: 0.95rem;
      max-width: 650px;
      margin: 0 auto;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .card-title {
      font-size: 1.15rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 1rem;
      line-height: 1.4;
    }
    .code-box {
      background: #030712;
      border: 1px solid #1f2937;
      padding: 0.75rem;
      border-radius: 0.5rem;
      font-family: monospace;
      font-size: 0.75rem;
      color: #93c5fd;
      margin-bottom: 1rem;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 0.75rem;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: background 0.15s ease;
      text-align: center;
    }
    .btn-emerald {
      background: var(--emerald);
      color: white;
    }
    .btn-emerald:hover { background: var(--emerald-hover); }
    .btn-blue {
      background: var(--primary);
      color: white;
    }
    .btn-blue:hover { background: var(--primary-hover); }
    .btn-sub {
      background: #1f2937;
      color: #e5e7eb;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      padding: 0.5rem;
    }
    .btn-sub:hover { background: #374151; }
    .direct-url {
      font-size: 0.7rem;
      color: #6b7280;
      margin-top: 0.5rem;
      word-break: break-all;
    }
    .instructions-card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .instructions-card h2 {
      font-size: 1.1rem;
      font-weight: 800;
      margin-bottom: 1rem;
      color: #60a5fa;
    }
    .terminal-cmd {
      background: #030712;
      border: 1px solid #1f2937;
      border-radius: 0.5rem;
      padding: 0.75rem;
      font-family: monospace;
      font-size: 0.75rem;
      color: #a7f3d0;
      overflow-x: auto;
      margin-bottom: 1rem;
    }
    footer {
      text-align: center;
      padding: 1.5rem 0;
      font-size: 0.8rem;
      color: #6b7280;
      border-top: 1px solid #1f2937;
    }
    footer a { color: #60a5fa; text-decoration: none; font-weight: bold; }
    footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge">Application ID: com.grobaax.app</div>
      <h1>Grobaax Mobile Packaging Suite</h1>
      <p class="lead">
        Single-codebase distribution packages for <strong>Google Play Store (.aab / .apk)</strong> and <strong>Apple App Store (iOS)</strong>.
      </p>
    </header>

    <div class="grid">
      <!-- Android Card -->
      <div class="card">
        <div>
          <div class="card-title">
            <span>Android Package</span>
            <span style="font-size: 0.75rem; color: #34d399;">.APK &amp; .AAB</span>
          </div>
          <p class="card-desc">
            Complete Android Studio &amp; Gradle project. Includes full Grobaax web application, AndroidManifest.xml, icons, splash screen, and Gradle build configurations.
          </p>
          <div class="code-box">./gradlew assembleDebug   # Test APK
./gradlew bundleRelease   # Google Play AAB</div>
        </div>
        <div>
          <a href="/api/download/android" download="grobaax-android-project.zip" class="btn btn-emerald">
            Download Android (.zip)
          </a>
          <button onclick="copyLink('${baseUrl}/api/download/android', this)" class="btn btn-sub" style="width: 100%;">
            📋 Copy Direct Link
          </button>
          <div class="direct-url">${baseUrl}/api/download/android</div>
        </div>
      </div>

      <!-- iOS Card -->
      <div class="card">
        <div>
          <div class="card-title">
            <span>iOS App Store Package</span>
            <span style="font-size: 0.75rem; color: #60a5fa;">Xcode Project</span>
          </div>
          <p class="card-desc">
            Complete Xcode workspace with bundle ID <code>com.grobaax.app</code>, camera/photo usage descriptions, and launch screen. Ready for TestFlight and App Store submission.
          </p>
          <div class="code-box">npx cap open ios          # Opens in Xcode
Product &gt; Archive &gt; Distribute App</div>
        </div>
        <div>
          <a href="/api/download/ios" download="grobaax-ios-project.zip" class="btn btn-blue">
            Download iOS (.zip)
          </a>
          <button onclick="copyLink('${baseUrl}/api/download/ios', this)" class="btn btn-sub" style="width: 100%;">
            📋 Copy Direct Link
          </button>
          <div class="direct-url">${baseUrl}/api/download/ios</div>
        </div>
      </div>

      <!-- Complete Suite Card -->
      <div class="card">
        <div>
          <div class="card-title">
            <span>Complete Mobile Suite</span>
            <span style="font-size: 0.75rem; color: #c084fc;">All-in-One</span>
          </div>
          <p class="card-desc">
            Combined archive containing both Android &amp; iOS native projects, configuration files, and complete deployment guide.
          </p>
          <div class="code-box">Contains:
- grobaax-android/ (Gradle &amp; Android Studio)
- grobaax-ios/ (Xcode &amp; CocoaPods)
- MOBILE_PACKAGING_GUIDE.md</div>
        </div>
        <div>
          <a href="/api/download/mobile-suite" download="grobaax-mobile-packaging-suite.zip" class="btn btn-blue" style="background: linear-gradient(135deg, #7c3aed, #2563eb);">
            Download Complete Suite (.zip)
          </a>
          <button onclick="copyLink('${baseUrl}/api/download/mobile-suite', this)" class="btn btn-sub" style="width: 100%;">
            📋 Copy Direct Link
          </button>
          <div class="direct-url">${baseUrl}/api/download/mobile-suite</div>
        </div>
      </div>
    </div>

    <!-- Quick Terminal Download -->
    <div class="instructions-card">
      <h2>Terminal Quick Download (Curl / Wget)</h2>
      <p style="font-size: 0.85rem; color: #9ca3af; margin-bottom: 0.75rem;">
        You can also download directly to your local computer or server via your terminal:
      </p>
      <div class="terminal-cmd"># Download Android Project:
curl -O ${baseUrl}/downloads/grobaax-android-project.zip

# Download iOS Project:
curl -O ${baseUrl}/downloads/grobaax-ios-project.zip

# Download Complete Suite:
curl -O ${baseUrl}/downloads/grobaax-mobile-packaging-suite.zip</div>
    </div>

    <!-- How to Build -->
    <div class="instructions-card">
      <h2>How to Generate APK and AAB for Google Play Store</h2>
      <ol style="font-size: 0.85rem; color: #cbd5e1; padding-left: 1.25rem; line-height: 1.8;">
        <li>Download and unzip <code>grobaax-android-project.zip</code>.</li>
        <li>Open terminal and run: <code>cd grobaax-android/android</code></li>
        <li>To build testing APK: <code>./gradlew assembleDebug</code><br>
          <span style="color: #34d399; font-size: 0.8rem;">Output: <code>app/build/outputs/apk/debug/app-debug.apk</code></span>
        </li>
        <li>To build Google Play Store App Bundle (.aab): <code>./gradlew bundleRelease</code><br>
          <span style="color: #34d399; font-size: 0.8rem;">Output: <code>app/build/outputs/bundle/release/app-release.aab</code></span>
        </li>
        <li>Upload <code>app-release.aab</code> directly to Google Play Console.</li>
      </ol>
    </div>

    <footer>
      <p>
        <a href="/">← Return to Grobaax Web Application</a> | 
        <a href="/api/download/guide" download="MOBILE_PACKAGING_GUIDE.md">View Packaging Guide (.md)</a>
      </p>
      <p style="margin-top: 0.5rem;">Grobaax &copy; 2026. All rights reserved.</p>
    </footer>
  </div>

  <script>
    function copyLink(url, btn) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function() {
          const orig = btn.innerText;
          btn.innerText = '✅ Copied to Clipboard!';
          setTimeout(function() { btn.innerText = orig; }, 2500);
        });
      } else {
        prompt('Copy this download link:', url);
      }
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

