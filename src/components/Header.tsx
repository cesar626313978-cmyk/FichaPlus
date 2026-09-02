import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { UserAvatar } from './UserAvatar';

export const Header: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { activeTab, notifications, setActiveTab, setShowInstallModal, isAppInstalled } = useApp();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const isAdmin = profile.role === 'admin' || profile.role === 'manager';

  return (
    <header className="w-full top-0 sticky bg-white border-b border-slate-200 shadow-xs z-40">
      <div className="flex justify-between items-center px-4 md:px-8 py-3.5 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-2xl font-bold">
                schedule
              </span>
            </div>
            <div className="text-left">
              <span className="font-black text-xl tracking-tight text-slate-900 block leading-tight">
                Ficha<span className="text-indigo-600">Plus</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest hidden sm:block">
                {isAdmin ? 'Gestión RRHH & Legal' : 'Portal del Empleado'}
              </span>
            </div>
          </button>
        </div>

        {/* Desktop Quick Switcher Tabs */}
        <nav className="hidden md:flex gap-1 items-center bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
          {isAdmin ? (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/60'
                }`}
              >
                Panel General
              </button>

              <button
                onClick={() => setActiveTab('employees')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'employees'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-indigo-600 hover:bg-white/60'
                }`}
              >
                <span className="material-symbols-outlined text-sm">group</span>
                <span>Plantilla</span>
                <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-md">
                  RRHH
                </span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/60'
                }`}
              >
                Jornadas
              </button>

              <button
                onClick={() => setActiveTab('requests')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'requests'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/60'
                }`}
              >
                Permisos
              </button>

              <button
                onClick={() => setActiveTab('monthly_sign')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'monthly_sign'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/60'
                }`}
              >
                Firmas
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/60'
                }`}
              >
                Auditoría
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/60'
                }`}
              >
                Ajustes
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/60'
                }`}
              >
                Mi Fichaje
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/60'
                }`}
              >
                Mi Historial
              </button>

              <button
                onClick={() => setActiveTab('requests')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'requests'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/60'
                }`}
              >
                Mis Vacaciones
              </button>

              <button
                onClick={() => setActiveTab('monthly_sign')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'monthly_sign'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/60'
                }`}
              >
                Firma Mensual
              </button>

              <button
                onClick={() => setActiveTab('incidents')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'incidents'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/60'
                }`}
              >
                Incidencias
              </button>
            </>
          )}
        </nav>

        {/* Action icons: Install App + Notifications + Profile Avatar + Logout */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Download App Button (hidden if app is already installed or running standalone) */}
          {!isAppInstalled && (
            <button
              onClick={() => setShowInstallModal(true)}
              title="Descargar app para teléfono"
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg text-emerald-600">install_mobile</span>
              <span className="hidden xl:inline">Instalar App</span>
            </button>
          )}

          {/* Notifications button with badge */}
          <button
            onClick={() => setActiveTab('notifications')}
            className="relative bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2 rounded-xl transition-all text-slate-600 cursor-pointer"
            title="Notificaciones"
          >
            <span className="material-symbols-outlined text-xl block">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Avatar */}
          <button
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 p-1.5 pr-2.5 rounded-2xl shadow-xs transition-all cursor-pointer group"
            title="Ver Mi Perfil"
          >
            <UserAvatar name={profile.name} size="sm" rounded="xl" />
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-slate-800 leading-tight group-hover:text-indigo-600 truncate max-w-[100px]">
                {profile.name.split(' ')[0]}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 leading-tight">
                {isAdmin ? 'Admin' : 'Empleado'}
              </p>
            </div>
          </button>

          {/* Direct Sign Out Button */}
          <button
            onClick={signOut}
            title="Cerrar Sesión / Desconectar"
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 p-2 rounded-xl transition-all flex items-center gap-1 font-bold text-xs shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span className="hidden lg:inline text-[11px]">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
};
