import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const PWAInstallModal: React.FC = () => {
  const { showInstallModal, setShowInstallModal, deferredPrompt, markAppAsInstalled, isAppInstalled } = useApp();
  const [platformTab, setPlatformTab] = useState<'android' | 'ios'>('android');
  const [installedSuccess, setInstalledSuccess] = useState(false);

  if (!showInstallModal) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        markAppAsInstalled(true);
        setInstalledSuccess(true);
        setTimeout(() => {
          setShowInstallModal(false);
          setInstalledSuccess(false);
        }, 1500);
      }
    } else {
      markAppAsInstalled(true);
      setInstalledSuccess(true);
      setTimeout(() => {
        setShowInstallModal(false);
        setInstalledSuccess(false);
      }, 1500);
    }
  };

  const handleAlreadyInstalled = () => {
    markAppAsInstalled(true);
    setShowInstallModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-8 relative">
        <button
          onClick={() => setShowInstallModal(false)}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center font-bold transition-colors cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <span className="material-symbols-outlined text-2xl">install_mobile</span>
          </div>
          <div>
            <h2 className="font-bold text-xl text-slate-900 tracking-tight">
              Instalar FichaPlus
            </h2>
            <p className="text-xs text-slate-500 font-medium">Aplicación para tu teléfono móvil</p>
          </div>
        </div>

        {/* Platform switch tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mb-5">
          <button
            onClick={() => setPlatformTab('android')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              platformTab === 'android'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base text-emerald-600">android</span>
            Android / Chrome
          </button>
          <button
            onClick={() => setPlatformTab('ios')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              platformTab === 'ios'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base text-pink-500">phone_iphone</span>
            iPhone / Safari
          </button>
        </div>

        {/* Steps */}
        {platformTab === 'android' ? (
          <div className="space-y-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-5 text-sm">
            <div className="flex items-start gap-2.5">
              <span className="bg-indigo-600 text-white font-bold text-xs w-5 h-5 flex items-center justify-center rounded-full shrink-0 mt-0.5 shadow-xs">
                1
              </span>
              <p className="text-slate-700 text-xs leading-relaxed">
                Pulsa el botón <strong>"Instalar en este dispositivo"</strong> abajo o en el menú de Chrome (tres puntos <span className="font-bold">⋮</span>).
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="bg-indigo-600 text-white font-bold text-xs w-5 h-5 flex items-center justify-center rounded-full shrink-0 mt-0.5 shadow-xs">
                2
              </span>
              <p className="text-slate-700 text-xs leading-relaxed">
                Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="bg-indigo-600 text-white font-bold text-xs w-5 h-5 flex items-center justify-center rounded-full shrink-0 mt-0.5 shadow-xs">
                3
              </span>
              <p className="text-slate-700 text-xs leading-relaxed">
                ¡Listo! Tendrás acceso directo con icono nativo, alarmas y fichaje sin abrir navegador.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-5 text-sm">
            <div className="flex items-start gap-2.5">
              <span className="bg-pink-500 text-white font-bold text-xs w-5 h-5 flex items-center justify-center rounded-full shrink-0 mt-0.5 shadow-xs">
                1
              </span>
              <p className="text-slate-700 text-xs leading-relaxed">
                En Safari de tu iPhone, toca el botón de <strong>Compartir</strong> (icono de cuadrado con flecha <span className="font-bold">⎋</span>).
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="bg-pink-500 text-white font-bold text-xs w-5 h-5 flex items-center justify-center rounded-full shrink-0 mt-0.5 shadow-xs">
                2
              </span>
              <p className="text-slate-700 text-xs leading-relaxed">
                Desplázate hacia abajo y selecciona <strong>"Añadir a la pantalla de inicio"</strong>.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="bg-pink-500 text-white font-bold text-xs w-5 h-5 flex items-center justify-center rounded-full shrink-0 mt-0.5 shadow-xs">
                3
              </span>
              <p className="text-slate-700 text-xs leading-relaxed">
                Pulsa <strong>"Añadir"</strong> arriba a la derecha. ¡Ya puedes abrirla como app nativa!
              </p>
            </div>
          </div>
        )}

        {installedSuccess && (
          <div className="mb-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl p-3 text-center font-bold text-xs">
            ✓ ¡Instalación guardada! El botón se ha ocultado automáticamente.
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleInstallClick}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-3.5 px-5 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Instalar en este dispositivo
          </button>

          <button
            onClick={handleAlreadyInstalled}
            className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/80 py-2.5 px-4 rounded-2xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
            <span>Ya la he descargado / Ocultar botón</span>
          </button>
        </div>
      </div>
    </div>
  );
};
