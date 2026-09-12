import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

export const PWAInstallModal: React.FC = () => {
  const { showInstallModal, setShowInstallModal, deferredPrompt, markAppAsInstalled } = useApp();

  // Browser detection
  const detectedBrowser = useMemo(() => {
    if (typeof navigator === 'undefined') return 'chrome';
    const ua = navigator.userAgent || '';
    if (/SamsungBrowser/i.test(ua)) return 'samsung';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'chrome';
    return 'chrome';
  }, []);

  const [platformTab, setPlatformTab] = useState<'samsung' | 'chrome' | 'ios'>(detectedBrowser);
  const [promptFeedback, setPromptFeedback] = useState<{ status: 'success' | 'dismissed' | 'error'; message: string } | null>(null);

  if (!showInstallModal) return null;

  const handleNativePrompt = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setPromptFeedback({
          status: 'success',
          message: '✓ ¡Solicitud de instalación aceptada! Tu teléfono está añadiendo FichaPlus a tu pantalla de inicio.',
        });
        setTimeout(() => {
          setShowInstallModal(false);
          setPromptFeedback(null);
        }, 2500);
      } else {
        setPromptFeedback({
          status: 'dismissed',
          message: 'Has cancelado el aviso del navegador. Puedes volver a pulsar "Instalar" cuando quieras o seguir los pasos abajo.',
        });
      }
    } catch (e: any) {
      setPromptFeedback({
        status: 'error',
        message: 'No se pudo iniciar el instalador automático. Sigue los pasos manuales que se indican a continuación.',
      });
    }
  };

  const handleConfirmInstalled = () => {
    markAppAsInstalled(true);
    setShowInstallModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-5 sm:p-7 relative my-8 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={() => setShowInstallModal(false)}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          aria-label="Cerrar"
        >
          ✕
        </button>

        {/* Header with App Icon */}
        <div className="flex items-center gap-3.5 mb-5 pr-8">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0 border border-indigo-500/30">
            <span className="material-symbols-outlined text-2xl">install_mobile</span>
          </div>
          <div>
            <h2 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight flex items-center gap-2">
              <span>Instalar FichaPlus</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                Terminal Móvil
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Acceso directo en pantalla de inicio con geolocalización GPS y alarmas.
            </p>
          </div>
        </div>

        {/* 1-Click Native Prompt if browser supports it */}
        {deferredPrompt && (
          <div className="mb-5 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-xl">bolt</span>
              </span>
              <div>
                <p className="font-bold text-sm text-indigo-950">Tu navegador permite instalación directa</p>
                <p className="text-xs text-indigo-700">Pulsa el botón para añadir el icono a tu pantalla:</p>
              </div>
            </div>
            <button
              onClick={handleNativePrompt}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>Instalar FichaPlus en 1 Clic</span>
            </button>
          </div>
        )}

        {/* Prompt Feedback message */}
        {promptFeedback && (
          <div
            className={`mb-4 p-3.5 rounded-2xl text-xs font-bold leading-relaxed border ${
              promptFeedback.status === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : promptFeedback.status === 'dismissed'
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {promptFeedback.message}
          </div>
        )}

        {/* Platform Selection Tabs */}
        <div className="mb-3">
          <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-1.5 block">
            Guía de instalación para tu navegador:
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setPlatformTab('samsung')}
              className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                platformTab === 'samsung'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/50 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-purple-600">phone_android</span>
              <span>Samsung</span>
            </button>
            <button
              onClick={() => setPlatformTab('chrome')}
              className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                platformTab === 'chrome'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/50 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-emerald-600">android</span>
              <span>Chrome</span>
            </button>
            <button
              onClick={() => setPlatformTab('ios')}
              className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                platformTab === 'ios'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/50 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-pink-500">phone_iphone</span>
              <span>iPhone</span>
            </button>
          </div>
        </div>

        {/* Steps container */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-5 space-y-3 text-xs">
          {platformTab === 'samsung' && (
            <>
              <div className="bg-purple-50 text-purple-900 border border-purple-200 rounded-xl p-2.5 font-semibold text-[11px] flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-base text-purple-600 shrink-0">info</span>
                <span>En <strong>Samsung Internet</strong> se añade desde el menú o la barra superior:</span>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-xs">
                  1
                </span>
                <div>
                  <p className="font-bold text-slate-800">
                    Toca el menú de tres líneas (<span className="text-base font-black">☰</span>)
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Está situado <strong>abajo a la derecha</strong> de tu pantalla en la barra de Samsung Internet (o toca el icono de flecha/descarga en la barra superior junto al candado).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-xs">
                  2
                </span>
                <div>
                  <p className="font-bold text-slate-800">
                    Selecciona <strong>"+ Añadir página a"</strong> (o "Instalar aplicación")
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Aparecerán varias opciones como Marcadores, Pantalla inicio o Accesos rápidos.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-xs">
                  3
                </span>
                <div>
                  <p className="font-bold text-slate-800">
                    Pulsa en <strong>"Pantalla inicio"</strong> ➔ <strong>"Añadir"</strong>
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    ¡Listo! Se creará el icono oficial de <strong>FichaPlus</strong> con fondo morado y reloj en el escritorio de tu teléfono.
                  </p>
                </div>
              </div>
            </>
          )}

          {platformTab === 'chrome' && (
            <>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-xs">
                  1
                </span>
                <div>
                  <p className="font-bold text-slate-800">
                    Toca los tres puntos verticales (<span className="text-base font-black">⋮</span>)
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Ubicados en la esquina <strong>superior derecha</strong> de Google Chrome.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-xs">
                  2
                </span>
                <div>
                  <p className="font-bold text-slate-800">
                    Pulsa en <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Chrome descargará la aplicación de forma instantánea sin necesidad de Play Store.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-xs">
                  3
                </span>
                <div>
                  <p className="font-bold text-slate-800">Confirma pulsando <strong>"Instalar"</strong></p>
                  <p className="text-slate-600 mt-0.5">
                    ¡Completado! Tendrás el icono nativo listo para fichar cada día.
                  </p>
                </div>
              </div>
            </>
          )}

          {platformTab === 'ios' && (
            <>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-pink-500 text-white font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-xs">
                  1
                </span>
                <div>
                  <p className="font-bold text-slate-800">
                    Toca el botón <strong>Compartir</strong> (<span className="text-base font-black">⎋</span>)
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Es el icono con un cuadrado y una flecha hacia arriba en la barra inferior de Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-pink-500 text-white font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-xs">
                  2
                </span>
                <div>
                  <p className="font-bold text-slate-800">
                    Desplaza hacia abajo y toca <strong>"Añadir a la pantalla de inicio"</strong>
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Tiene un icono de un cuadrado con un símbolo más (<span className="font-bold">+</span>).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-pink-500 text-white font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-xs">
                  3
                </span>
                <div>
                  <p className="font-bold text-slate-800">Pulsa <strong>"Añadir"</strong> arriba a la derecha</p>
                  <p className="text-slate-600 mt-0.5">
                    ¡Listo! FichaPlus se abrirá a pantalla completa como una app de la App Store.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Benefits badge */}
        <div className="mb-5 grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
            <span>Sin consumir memoria</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-indigo-600">speed</span>
            <span>Apertura en 1 segundo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-amber-600">location_on</span>
            <span>GPS de alta precisión</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-purple-600">notifications_active</span>
            <span>Alarmas de entrada/salida</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={() => setShowInstallModal(false)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-3 px-4 rounded-xl font-bold text-xs shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">check</span>
            <span>Entendido, voy a añadirla</span>
          </button>

          <button
            onClick={handleConfirmInstalled}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="Confirmar que ya la has instalado"
          >
            <span className="material-symbols-outlined text-base text-emerald-600">done_all</span>
            <span>Ya la tengo instalada</span>
          </button>
        </div>
      </div>
    </div>
  );
};
