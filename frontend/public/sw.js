// DealFlow360 Web Push Service Worker
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "DealFlow360 Alert";
    const options = {
      body: data.body || "New update received",
      icon: data.icon || "/logo.png",
      badge: data.badge || "/logo.png",
      tag: data.tag || "dealflow360-notification",
      data: data.data || { url: "/notifications" },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Error showing push notification:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/notifications";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
