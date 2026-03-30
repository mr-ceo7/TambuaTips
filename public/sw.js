self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: data.icon || '/tambua-logo.jpg',
        data: {
          url: data.url || '/'
        }
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title || 'TambuaTips', options)
      );
    } catch (e) {
      console.error('Push payload parse error:', e);
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Open the URL associated with the notification
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
