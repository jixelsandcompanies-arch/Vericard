let installPrompt = null;
const installButton = document.getElementById('installAppBtn');

async function loadPublicConfig() {
  try {
    const response = await fetch('/api/public-config');
    if (!response.ok) return {};
    return response.json();
  } catch {
    return {};
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function initPushNotifications() {
  const { oneSignalAppId } = await loadPublicConfig();
  if (!oneSignalAppId || !('Notification' in window)) return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  await loadScript('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js').catch(() => {});
  window.OneSignalDeferred.push(async (OneSignal) => {
    await OneSignal.init({
      appId: oneSignalAppId,
      serviceWorkerPath: 'sw.js',
      serviceWorkerParam: { scope: '/' }
    });
    if (Notification.permission === 'default' && OneSignal.Notifications?.requestPermission) {
      await OneSignal.Notifications.requestPermission().catch(() => {});
    }
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => registration.update())
      .catch(() => {});
    initPushNotifications();
  });
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton?.classList.remove('hidden');
});

installButton?.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice.catch(() => {});
  installPrompt = null;
  installButton.classList.add('hidden');
});

window.addEventListener('appinstalled', () => {
  installButton?.classList.add('hidden');
});
