/**
 * Register the Service Worker and handle updates.
 */

export interface SwRegistrationState {
  supported: boolean;
  registered: boolean;
  updateAvailable: boolean;
}

let registration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(
  onUpdate?: () => void,
): Promise<SwRegistrationState> {
  if (!('serviceWorker' in navigator)) {
    return { supported: false, registered: false, updateAvailable: false };
  }

  try {
    registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    registration.addEventListener('updatefound', () => {
      const newWorker = registration?.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // New version available
          onUpdate?.();
        }
      });
    });

    return {
      supported: true,
      registered: true,
      updateAvailable: false,
    };
  } catch {
    return { supported: true, registered: false, updateAvailable: false };
  }
}

export function isServiceWorkerActive(): boolean {
  return navigator.serviceWorker?.controller !== null;
}

export async function checkForSwUpdate(): Promise<void> {
  if (registration) {
    await registration.update();
  }
}
