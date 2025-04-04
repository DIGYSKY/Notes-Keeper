const CACHE_NAME = "notekeeper-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/assets/js/index.js",
  "/assets/js/api.js",
  "/assets/js/NotesManager.js",
  "/assets/js/NotesSynchronizer.js",
  "/assets/js/MessagesManager.js",
  "/assets/js/NotificationManager.js",
  "/assets/js/utils/JsonStorage.js",
  "/assets/css/style.css",
  "/assets/icons/icon-192x192.png",
  "/assets/icons/icon-512x512.png",
  "/manifest.json"
];

// Installation du Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activation du Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Interception des requêtes
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Gestion des notifications push
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "Nouveau message reçu",
    icon: "/assets/icons/icon-192x192.png",
    badge: "/assets/icons/icon-192x192.png",
    vibrate: [200, 100, 200],
    data: {
      url: "/"
    }
  };

  event.waitUntil(
    self.registration.showNotification("NoteKeeper", options)
  );
});

// Gestion du clic sur la notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
}); 