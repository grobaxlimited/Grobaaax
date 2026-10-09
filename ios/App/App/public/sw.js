/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "89dd8195e84d84e570f6ec8721c5ac0b"
  }, {
    "url": "pwa-512x512.png",
    "revision": "4e357d42cc09b0ffd716a6ed959ce69b"
  }, {
    "url": "pwa-192x192.png",
    "revision": "f16f952bc0a672403bfc61f31fbfa108"
  }, {
    "url": "index.html",
    "revision": "1d8709fb9c4b034d71743e2ed6f1d65e"
  }, {
    "url": "icon.svg",
    "revision": "0fe32603d4e4a773a5d6f98577e37013"
  }, {
    "url": "favicon.png",
    "revision": "d7cca0ded2a4caeebd68ebe11c84f849"
  }, {
    "url": "favicon-32x32.png",
    "revision": "7f02d9a633c3bb7261011be2b1e99a8a"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "15f12120fb9adb0257f443508cb3e342"
  }, {
    "url": "images/whatsapp-doodle-pattern.svg",
    "revision": "b95a0383a045cc7c5e6f18aa3cde12b0"
  }, {
    "url": "images/grobaax-real-students.png",
    "revision": "0c4c997a7b35d237f5030b0ffee7d220"
  }, {
    "url": "images/grobaax-hero-students.svg",
    "revision": "04343f6d4ae1fcb618b03d6a534f81e6"
  }, {
    "url": "images/grobaax-hero-students.png",
    "revision": "005ab1a66b58a3e7aad7ce53afac0b35"
  }, {
    "url": "assets/workbox-window.prod.es5-BBnX5xw4.js",
    "revision": null
  }, {
    "url": "assets/vendor-react-BNLSySnv.js",
    "revision": null
  }, {
    "url": "assets/vendor-icons-ZTO1XCH-.js",
    "revision": null
  }, {
    "url": "assets/index-B_345ptC.js",
    "revision": null
  }, {
    "url": "assets/index-BU68ZVT3.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "15f12120fb9adb0257f443508cb3e342"
  }, {
    "url": "favicon-32x32.png",
    "revision": "7f02d9a633c3bb7261011be2b1e99a8a"
  }, {
    "url": "favicon.png",
    "revision": "d7cca0ded2a4caeebd68ebe11c84f849"
  }, {
    "url": "icon.svg",
    "revision": "0fe32603d4e4a773a5d6f98577e37013"
  }, {
    "url": "pwa-192x192.png",
    "revision": "f16f952bc0a672403bfc61f31fbfa108"
  }, {
    "url": "pwa-512x512.png",
    "revision": "4e357d42cc09b0ffd716a6ed959ce69b"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "89dd8195e84d84e570f6ec8721c5ac0b"
  }, {
    "url": "manifest.webmanifest",
    "revision": "e69bbebe005feb2ffcfcd0a9bf196e11"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
