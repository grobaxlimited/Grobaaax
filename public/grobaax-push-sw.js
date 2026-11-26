/* eslint-disable no-restricted-globals */
/**
 * Shared Grobaax Push & Notification-Click Service Worker Handlers
 * Imported by both the production root PWA SW (/sw.js) and /firebase-messaging-sw.js.
 */

if (self.location && self.location.hostname !== 'advertise.grobaax.com') {
  self.addEventListener('push', function (event) {
    if (!event || !event.data) return;

    var payload = {};
    try {
      payload = event.data.json() || {};
    } catch (_) {
      try {
        payload = { notification: { title: 'Grobaax', body: event.data.text() } };
      } catch (_2) {
        payload = {};
      }
    }

    var notif = payload.notification || {};
    var data = payload.data || {};
    var webpushNotif =
      (payload.webpush && payload.webpush.notification) || {};

    var title = notif.title || webpushNotif.title || data.title || 'Grobaax Alert';
    var body =
      notif.body ||
      webpushNotif.body ||
      data.body ||
      'Open Grobaax to view this update.';
    var icon = notif.icon || webpushNotif.icon || data.icon || '/pwa-192x192.png';
    var badge = notif.badge || webpushNotif.badge || data.badge || '/favicon.png';
    var tag =
      notif.tag ||
      webpushNotif.tag ||
      data.tag ||
      'grobaax-' + (data.category || 'general') + '-' + (data.notificationId || 'latest');

    var rawUrl =
      data.url ||
      (payload.fcmOptions && payload.fcmOptions.link) ||
      (payload.webpush && payload.webpush.fcmOptions && payload.webpush.fcmOptions.link) ||
      '/?push_dest=' + encodeURIComponent(data.destination || '/home');

    var options = {
      body: body,
      icon: icon,
      badge: badge,
      tag: tag,
      renotify: false,
      data: {
        url: rawUrl,
        destination: data.destination || '',
        category: data.category || 'general',
        notificationId: data.notificationId || '',
        eventType: data.eventType || '',
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  });

  self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    var data = (event.notification && event.notification.data) || {};
    var targetRelative =
      data.url ||
      (data.destination
        ? '/?push_dest=' + encodeURIComponent(data.destination)
        : '/?push_dest=%2Fhome');

    var targetUrl;
    try {
      targetUrl = new URL(targetRelative, self.location.origin).href;
    } catch (_) {
      targetUrl = self.location.origin + '/?push_dest=%2Fhome';
    }

    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(function (clientList) {
          for (var i = 0; i < clientList.length; i++) {
            var client = clientList[i];
            if (client.url && client.url.indexOf(self.location.origin) === 0) {
              try {
                client.postMessage({
                  type: 'GROBAAX_PUSH_NAVIGATE',
                  url: targetUrl,
                  destination: data.destination || '',
                  category: data.category || '',
                  notificationId: data.notificationId || '',
                });
              } catch (_) {}
              if ('focus' in client) {
                return client.focus();
              }
            }
          }
          if (self.clients.openWindow) {
            return self.clients.openWindow(targetUrl);
          }
        })
    );
  });
}
