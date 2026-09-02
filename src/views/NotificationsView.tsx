import React from 'react';
import { useApp } from '../context/AppContext';

export const NotificationsView: React.FC = () => {
  const { notifications, markNotificationRead, clearAllNotifications, setActiveTab } = useApp();

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 pb-2">
        <div>
          <h1 className="font-black text-3xl md:text-4xl text-slate-900 tracking-tight">
            Notificaciones y Avisos
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Historial de avisos legales, solicitudes aprobadas y recordatorios de fichaje.
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={clearAllNotifications}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 py-2 px-3.5 rounded-xl transition-all shadow-xs"
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">
              notifications_off
            </span>
            <h3 className="font-bold text-base text-slate-700">No tienes notificaciones pendientes</h3>
            <p className="text-xs text-slate-400 mt-1">Estás al día con todos tus registros y solicitudes.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markNotificationRead(n.id)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer flex items-start gap-4 ${
                !n.read
                  ? 'bg-white border-indigo-100 shadow-sm ring-1 ring-indigo-500/10'
                  : 'bg-white/80 border-slate-100 opacity-75'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  n.type === 'ALERT'
                    ? 'bg-rose-50 text-rose-500'
                    : n.type === 'SUCCESS'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {n.type === 'ALERT' ? 'warning' : n.type === 'SUCCESS' ? 'check_circle' : 'info'}
                </span>
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                  <span className="text-[11px] font-medium text-slate-400">{n.timestamp}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                {n.actionUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab(n.actionUrl as any);
                    }}
                    className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <span>Ir a la sección</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </button>
                )}
              </div>

              {!n.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0 mt-1.5 shadow-xs" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
