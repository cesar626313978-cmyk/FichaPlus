// Device Permissions & Mobile Hardware Utilities for PWA

export interface GeoLocationStamp {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
  verifiedGps: boolean;
}

export interface DeviceStatus {
  isPWA: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  hasGeolocation: boolean;
  hasNotifications: boolean;
  hasVibration: boolean;
  geolocationPermission: 'granted' | 'denied' | 'prompt' | 'unsupported';
  notificationPermission: 'granted' | 'denied' | 'default' | 'unsupported';
}

// 1. Detect Device & PWA Display Mode
export const isAppRunningStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://') ||
    localStorage.getItem('fichaplus_pwa_installed') === 'true';

  return isStandalone;
};

export const getDeviceStatus = async (): Promise<DeviceStatus> => {
  const isPWA = isAppRunningStandalone();

  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /android/i.test(ua);

  let geoPerm: 'granted' | 'denied' | 'prompt' | 'unsupported' = 'unsupported';
  if ('geolocation' in navigator) {
    if ('permissions' in navigator && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as any });
        geoPerm = result.state as any;
      } catch {
        geoPerm = 'prompt';
      }
    } else {
      geoPerm = 'prompt';
    }
  }

  let notifPerm: 'granted' | 'denied' | 'default' | 'unsupported' = 'unsupported';
  if ('Notification' in window) {
    notifPerm = Notification.permission as any;
  }

  return {
    isPWA,
    isIOS,
    isAndroid,
    hasGeolocation: 'geolocation' in navigator,
    hasNotifications: 'Notification' in window,
    hasVibration: 'vibrate' in navigator,
    geolocationPermission: geoPerm,
    notificationPermission: notifPerm,
  };
};

// 2. High-Accuracy GPS Capture with fallback & distance calculation
export const requestHighAccuracyPosition = (): Promise<GeoLocationStamp> => {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Tu dispositivo o navegador no soporta geolocalización.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        let address = 'Ubicación GPS Verificada';

        // Approximate friendly location label
        try {
          if (accuracy <= 30) {
            address = `Oficina / Sede Central (Precisión ±${Math.round(accuracy)}m)`;
          } else if (accuracy <= 100) {
            address = `Punto de Trabajo (Precisión ±${Math.round(accuracy)}m)`;
          } else {
            address = `Ubicación Móvil (Precisión ±${Math.round(accuracy)}m)`;
          }
        } catch {}

        resolve({
          latitude: Number(latitude.toFixed(6)),
          longitude: Number(longitude.toFixed(6)),
          accuracy: Math.round(accuracy),
          timestamp: pos.timestamp || Date.now(),
          address,
          verifiedGps: true,
        });
      },
      (err) => {
        let msg = 'No se pudo obtener la ubicación GPS.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Permiso de GPS denegado. Actívalo en los ajustes de tu navegador o teléfono.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Señal GPS no disponible temporalmente.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Tiempo de espera agotado al conectar con el satélite GPS.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

// 3. Notification & Alarm Push Permissions
export const requestPushNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false;
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      sendLocalNotification(
        '✓ Notificaciones FichaPlus Activadas',
        'Recibirás avisos de inicio de jornada, recordatorios de salida y alertas de pausas legales en este teléfono.'
      );
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Notification permission error:', err);
    return false;
  }
};

// 4. Send Instant Local Notification
export const sendLocalNotification = (title: string, body: string, url: string = '/') => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // Try service worker first for mobile native feel
  if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.showNotification(title, {
          body,
          icon: '/icon-192.svg',
          badge: '/icon-192.svg',
          vibrate: [100, 50, 100],
          data: { url },
        } as any);
      })
      .catch(() => {
        new Notification(title, { body, icon: '/icon-192.svg' });
      });
  } else {
    try {
      new Notification(title, { body, icon: '/icon-192.svg' });
    } catch {}
  }
};

// 5. Haptic Feedback (Vibración del Teléfono)
export const triggerHaptic = (type: 'clockIn' | 'clockOut' | 'pause' | 'alarm' | 'tap' = 'tap') => {
  if (!('vibrate' in navigator)) return;

  try {
    switch (type) {
      case 'clockIn':
        // Success double buzz
        navigator.vibrate([60, 40, 80]);
        break;
      case 'clockOut':
        // Strong confirmation
        navigator.vibrate([100, 60, 140]);
        break;
      case 'pause':
        // Single gentle buzz
        navigator.vibrate(80);
        break;
      case 'alarm':
        // Alert rhythm
        navigator.vibrate([200, 100, 200, 100, 300]);
        break;
      case 'tap':
      default:
        navigator.vibrate(40);
        break;
    }
  } catch {}
};

// 6. Web Audio Synthesized Chimes (No external audio files needed)
export const playDeviceChime = (type: 'clockIn' | 'clockOut' | 'pause' | 'alarm') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    if (type === 'clockIn') {
      // Upward melodic chime (C5 -> E5 -> G5)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.09);
        osc.stop(ctx.currentTime + i * 0.09 + 0.22);
      });
    } else if (type === 'clockOut') {
      // Downward peaceful chime (G5 -> E5 -> C5)
      const notes = [783.99, 659.25, 523.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.25);
      });
    } else if (type === 'pause') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'alarm') {
      // Repeating beep
      [0, 0.2, 0.4].forEach((t) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime + t);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.12);
      });
    }
  } catch (err) {
    console.warn('Audio chime warning:', err);
  }
};
