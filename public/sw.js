/* Tokom web push — do not intercept fetches (keeps Next.js intact). */
const SW_VERSION = "tokom-push-1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  void SW_VERSION;
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Током",
    body: "Новое уведомление",
    url: "/",
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = {
        title: typeof parsed.title === "string" ? parsed.title : data.title,
        body: typeof parsed.body === "string" ? parsed.body : data.body,
        url: typeof parsed.url === "string" ? parsed.url : data.url,
      };
    }
  } catch {
    try {
      const text = event.data?.text();
      if (text) data.body = text;
    } catch {
      // empty payload
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon-192.png",
      badge: "/favicon-192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path =
    typeof event.notification.data?.url === "string"
      ? event.notification.data.url
      : "/";
  const target = new URL(path, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus().then((focused) => {
              if (focused && "navigate" in focused && focused.navigate) {
                return focused.navigate(target);
              }
              return focused;
            });
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(target);
        }
        return undefined;
      }),
  );
});
