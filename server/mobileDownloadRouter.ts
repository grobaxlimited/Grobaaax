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
mobileDownloadRouter.get(['/android', '/android-project'], (_req: Request, res: Response) => {
  const file = getFilePath('grobaax-android-project.zip');
  if (!file) {
    return res.status(404).json({ error: 'Android package not found. Run packaging script.' });
  }
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="grobaax-android-project.zip"');
  return res.sendFile(file);
});

// 2. Download iOS Xcode Project (.zip)
mobileDownloadRouter.get(['/ios', '/ios-project'], (_req: Request, res: Response) => {
  const file = getFilePath('grobaax-ios-project.zip');
  if (!file) {
    return res.status(404).json({ error: 'iOS package not found. Run packaging script.' });
  }
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="grobaax-ios-project.zip"');
  return res.sendFile(file);
});

// 3. Download Full Mobile Distribution Suite (.zip)
mobileDownloadRouter.get(['/mobile-suite', '/suite', '/all'], (_req: Request, res: Response) => {
  const file = getFilePath('grobaax-mobile-packaging-suite.zip');
  if (!file) {
    return res.status(404).json({ error: 'Mobile suite not found. Run packaging script.' });
  }
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="grobaax-mobile-packaging-suite.zip"');
  return res.sendFile(file);
});

// 4. Download Packaging Guide (.md)
mobileDownloadRouter.get(['/guide', '/instructions'], (_req: Request, res: Response) => {
  const file = getFilePath('MOBILE_PACKAGING_GUIDE.md');
  if (!file) {
    return res.status(404).json({ error: 'Packaging guide not found.' });
  }
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="MOBILE_PACKAGING_GUIDE.md"');
  return res.sendFile(file);
});

// 5. Metadata endpoint returning all download URLs and build commands
mobileDownloadRouter.get(['/info', '/status'], (_req: Request, res: Response) => {
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
