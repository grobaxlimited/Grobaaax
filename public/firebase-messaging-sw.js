/* eslint-disable no-restricted-globals */
/**
 * Grobaax External Web Push Service Worker (FCM)
 * Scope: /firebase-cloud-messaging-push-scope (fallback/dev scope when root PWA SW is not active)
 *
 * Unregisters itself immediately on advertise.grobaax.com.
 */

if (self.location && self.location.hostname === 'advertise.grobaax.com') {
  self.addEventListener('install', function () {
    self.skipWaiting();
  });
  self.addEventListener('activate', function (event) {
    event.waitUntil(self.registration.unregister());
  });
} else {
  self.addEventListener('install', function () {
    self.skipWaiting();
  });

  self.addEventListener('activate', function (event) {
    event.waitUntil(self.clients.claim());
  });

  importScripts('/grobaax-push-sw.js');
}
