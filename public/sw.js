self.addEventListener('push', event => {
  const data = event.data.json();

  /** @type {ServiceWorkerRegistration} */
  const reg = self.registration;

  reg.showNotification(data.title, data);
});

self.addEventListener("notificationclick", (event) => {
  const { action } = event;

  console.log(action);

  const { clients } = self;

  console.log(clients);

  if (action) {
    clients.openWindow('/');
  }
});
