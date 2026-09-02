import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  requestHighAccuracyPosition,
  requestPushNotificationPermission,
  sendLocalNotification,
  triggerHaptic,
  playDeviceChime,
  getDeviceStatus,
  DeviceStatus,
  GeoLocationStamp,
} from '../utils/devicePermissions';

interface DevicePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevicePermissionsModal: React.FC<DevicePermissionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    locationStamp,
    refreshLocation,
    isLocatingGps,
    installPWA,
    deferredPrompt,
    isAppInstalled,
    markAppAsInstalled,
  } = useApp();

  const [deviceInfo, setDeviceInfo] = useState<DeviceStatus | null>(null);
  const [testNotificationSent, setTestNotificationSent] = useState(false);
  const [hapticTested, setHapticTested] = useState(false);
  const [localCoords, setLocalCoords] = useState<GeoLocationStamp | null>(locationStamp);
  const [locating, setLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getDeviceStatus().then(setDeviceInfo);
      setLocalCoords(locationStamp);
    }
  }, [isOpen, locationStamp]);

  if (!isOpen) return null;

  const handleTestGPS = async () => {
    setLocating(true);
    setErrorMsg(null);
    try {
      const stamp = await requestHighAccuracyPosition();
      setLocalCoords(stamp);
      triggerHaptic('tap');
      await refreshLocation();
      const updated = await getDeviceStatus();
      setDeviceInfo(updated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con satélite GPS');
    } finally {
      setLocating(false);
    }
  };

  const handleRequestNotifications = async () => {
    setErrorMsg(null);
    const granted = await requestPushNotificationPermission();
    if (granted) {
      setTestNotificationSent(true);
      triggerHaptic('clockIn');
      setTimeout(() => setTestNotificationSent(false), 4000);
    } else {
      setErrorMsg('No se pudieron activar las notificaciones. Revisa los permisos del navegador.');
    }
    const updated = await getDeviceStatus();
    setDeviceInfo(updated);
  };

  const handleSendTestPush = () => {
    sendLocalNotification(
      '🔔 Notificación de Prueba FichaPlus',
      '¡Tu terminal móvil está perfectamente configurado para recibir avisos de jornada y alertas de turno!'
    );
    triggerHaptic('alarm');
    playDeviceChime('alarm');
    setTestNotificationSent(true);
    setTimeout(() => setTestNotificationSent(false), 3000);
  };

  const handleTestHapticAudio = () => {
    triggerHaptic('clockIn');
    playDeviceChime('clockIn');
    setHapticTested(true);
    setTimeout(() => setHapticTested(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 sm:p-8 my-6 max-h-[92vh] overflow-y-auto animate-scale-up">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-xs">
              <span className="material-symbols-outlined text-2xl">phonelink_setup</span>
            </div>
            <div>
              <h2 className="font-black text-xl text-slate-900 leading-tight">
                Permisos del Terminal Móvil
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configura GPS, avisos de turno y respuesta háptica en este teléfono
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="my-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600 text-base">warning</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4 my-5">
          {/* Card 1: GPS & Geolocation */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-indigo-600">location_on</span>
                <h4 className="font-black text-sm text-slate-900">Geolocalización GPS</h4>
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  localCoords?.verifiedGps
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {localCoords?.verifiedGps ? '● GPS Conectado' : '○ Sin Calibrar'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Certifica legalmente la presencia en el puesto de trabajo (Art. 34.9 ET) en cada entrada y salida.
            </p>

            {localCoords && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 mb-3 space-y-1 text-xs">
                <div className="flex justify-between text-slate-700 font-mono">
                  <span>Coordenadas:</span>
                  <span className="font-bold text-indigo-600">
                    {localCoords.latitude.toFixed(5)}°N, {localCoords.longitude.toFixed(5)}°W
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Precisión satelital:</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    ± {localCoords.accuracy} metros
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Etiqueta:</span>
                  <span className="font-medium text-slate-900 truncate max-w-[200px]">
                    {localCoords.address || 'Ubicación Verificada'}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleTestGPS}
              disabled={locating || isLocatingGps}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-base">
                {locating ? 'sync' : 'my_location'}
              </span>
              <span>
                {locating ? 'Conectando con satélite GPS...' : 'Actualizar Coordenadas GPS Ahora'}
              </span>
            </button>
          </div>

          {/* Card 2: Push Notifications & Reminders */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-amber-500">notifications_active</span>
                <h4 className="font-black text-sm text-slate-900">Avisos y Alarmas Push</h4>
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  deviceInfo?.notificationPermission === 'granted'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : deviceInfo?.notificationPermission === 'denied'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {deviceInfo?.notificationPermission === 'granted'
                  ? '● Permitido'
                  : deviceInfo?.notificationPermission === 'denied'
                  ? '✕ Denegado'
                  : '○ Sin Activar'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Recibe avisos antes de que comience tu turno, recordatorios de pausas de comida y alertas de olvido de fichaje.
            </p>

            {deviceInfo?.notificationPermission !== 'granted' ? (
              <button
                onClick={handleRequestNotifications}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-base">add_alert</span>
                <span>Activar Notificaciones en Este Teléfono</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSendTestPush}
                  className="flex-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-base text-amber-500">send</span>
                  <span>{testNotificationSent ? '¡Aviso Enviado!' : 'Enviar Notificación de Prueba'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Card 3: Haptic Feedback & Audio Chimes */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-purple-600">vibration</span>
                <h4 className="font-black text-sm text-slate-900">Vibración y Sonido de Confirmación</h4>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Habilitado
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Respuesta táctil y melodía acústica al pulsar iniciar o finalizar jornada para asegurar el registro.
            </p>

            <button
              onClick={handleTestHapticAudio}
              className="w-full bg-white hover:bg-slate-100 border border-slate-200 text-purple-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-base">music_note</span>
              <span>{hapticTested ? '¡Vibrando y Sonando!' : 'Probar Vibración y Tono de Fichaje'}</span>
            </button>
          </div>

          {/* Card 4: PWA Home Screen Installation */}
          <div className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border border-indigo-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-indigo-700">install_mobile</span>
                <h4 className="font-black text-sm text-indigo-950">Instalación en Pantalla de Inicio</h4>
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  deviceInfo?.isPWA || isAppInstalled
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                }`}
              >
                {deviceInfo?.isPWA || isAppInstalled ? '● Modo App Nativa (Instalada)' : '○ Modo Web'}
              </span>
            </div>

            <p className="text-xs text-indigo-900/80 leading-relaxed mb-3">
              {deviceInfo?.isPWA || isAppInstalled
                ? 'La aplicación ya se encuentra instalada en el dispositivo. Acceso directo disponible en tu pantalla de inicio.'
                : 'Instala la aplicación para abrirla a pantalla completa con 1 toque sin barras de navegador.'}
            </p>

            {!deviceInfo?.isPWA && !isAppInstalled ? (
              <button
                onClick={installPWA}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-100"
              >
                <span className="material-symbols-outlined text-base">download</span>
                <span>Instalar Aplicación en Este Móvil</span>
              </button>
            ) : (
              <div className="flex items-center justify-between text-xs bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  App instalada en el teléfono
                </span>
                <button
                  onClick={() => markAppAsInstalled(false)}
                  className="text-[11px] text-slate-400 hover:text-slate-700 underline cursor-pointer"
                  title="Restablecer visibilidad del botón de instalación"
                >
                  Restablecer botón
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider py-3 px-6 rounded-xl cursor-pointer transition-colors"
          >
            Guardar y Continuar
          </button>
        </div>
      </div>
    </div>
  );
};
