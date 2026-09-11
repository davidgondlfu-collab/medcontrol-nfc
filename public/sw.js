const CACHE = "medcontrol-nfc-v2";
const ASSETS = ["/", "/login", "/manifest.webmanifest", "/icon.svg"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS))));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(payload.title || "💊 Hora de tu toma", {
    body: payload.body || "Es hora de tomar tu medicamento",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { url: payload.url || "/" },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((windowClient) => "focus" in windowClient);
    return existing ? existing.focus() : clients.openWindow(event.notification.data?.url || "/");
  }));
});
