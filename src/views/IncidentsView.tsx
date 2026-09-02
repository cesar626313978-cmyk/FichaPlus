import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export const IncidentsView: React.FC = () => {
  const { incidents, approveIncident, rejectIncident, addIncident } = useApp();
  const { profile } = useAuth();
  const isAdmin = profile.role === 'admin' || profile.role === 'manager';

  const [activeTabSub, setActiveTabSub] = useState<'my_incidents' | 'create' | 'admin_approvals'>('my_incidents');
  
  // New Proposal Form
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [clockIn, setClockIn] = useState('08:00');
  const [clockOut, setClockOut] = useState('18:00');
  const [reason, setReason] = useState('');
  const [createdSuccess, setCreatedSuccess] = useState(false);

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    await addIncident({
      userId: profile.id,
      userName: profile.name,
      department: profile.department,
      targetDate,
      errorOriginal: 'Falta fichaje de salida / horario incompleto',
      proposedCorrection: `${clockIn} - ${clockOut}`,
      correctedClockIn: clockIn,
      correctedClockOut: clockOut,
      reason: reason || 'Olvidé registrar la salida al terminar la jornada.',
    });
    setCreatedSuccess(true);
    setTimeout(() => {
      setCreatedSuccess(false);
      setActiveTabSub('my_incidents');
    }, 1500);
  };

  const pendingApprovals = incidents.filter((i) => i.status === 'PENDIENTE');

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="pb-2">
        <h1 className="font-black text-3xl md:text-4xl text-slate-900 tracking-tight">
          {activeTabSub === 'create'
            ? 'Subsanar Incidencia'
            : activeTabSub === 'admin_approvals'
            ? 'Aprobación de Incidencias'
            : 'Mis Incidencias'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {activeTabSub === 'create'
            ? 'Envía una propuesta de rectificación de fichaje para aprobación legal.'
            : activeTabSub === 'admin_approvals'
            ? 'Revisa y gestiona las solicitudes de corrección de fichaje de tu equipo.'
            : 'Historial y estado de tus solicitudes de corrección de fichajes.'}
        </p>
      </div>

      {/* Sub tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/60">
        <button
          onClick={() => setActiveTabSub('my_incidents')}
          className={`py-2 px-4 rounded-xl font-bold text-xs transition-all ${
            activeTabSub === 'my_incidents'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Mis Incidencias ({incidents.filter((i) => i.userId === profile.id).length})
        </button>
        <button
          onClick={() => setActiveTabSub('create')}
          className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-1 transition-all ${
            activeTabSub === 'create'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Subsanar Jornada
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTabSub('admin_approvals')}
            className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              activeTabSub === 'admin_approvals'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-sm text-amber-500">notifications_active</span>
            Aprobaciones Pendientes ({pendingApprovals.length})
          </button>
        )}
      </div>

      {/* VIEW 1: Subsanar Incidencia Form */}
      {activeTabSub === 'create' && (
        <div className="flex flex-col gap-6">
          {/* Original Error Box */}
          <section className="bg-rose-50 border border-rose-100 rounded-3xl p-6 shadow-xs">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-lg text-rose-900 mb-0.5">Lunes, 23 Oct 2023</h2>
                <p className="text-xs text-rose-700 font-medium">Falta fichaje de salida registrado</p>
              </div>
              <span className="bg-rose-100 text-rose-800 px-3 py-1 rounded-full font-bold text-xs">
                Registro Incompleto
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 bg-white/80 border border-rose-100 rounded-2xl p-4 text-xs">
              <div>
                <span className="font-bold uppercase block text-slate-400 mb-1">Entrada Registrada</span>
                <span className="font-mono font-bold text-base text-slate-800">08:00 AM</span>
              </div>
              <div>
                <span className="font-bold uppercase block text-rose-500 mb-1">Salida Registrada</span>
                <span className="font-mono font-bold text-base text-rose-500">--:--</span>
              </div>
            </div>
          </section>

          {/* Form */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg text-slate-900 pb-3 border-b border-slate-100 mb-5">
              Propuesta de Corrección
            </h3>
            <form onSubmit={handleCreateProposal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Hora de Entrada
                  </label>
                  <input
                    type="time"
                    value={clockIn}
                    onChange={(e) => setClockIn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono text-base font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Hora de Salida
                  </label>
                  <input
                    type="time"
                    value={clockOut}
                    onChange={(e) => setClockOut(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono text-base font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Motivo de la Subsanación
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Olvidé fichar al salir de la oficina por atender una llamada urgente..."
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none resize-none transition-all"
                />
              </div>

              {createdSuccess && (
                <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-xl text-xs font-bold text-center">
                  ✓ ¡Propuesta enviada con éxito para aprobación!
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Enviar Propuesta de Corrección</span>
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </form>
          </section>
        </div>
      )}

      {/* VIEW 2: Mis Incidencias */}
      {activeTabSub === 'my_incidents' && (
        <div className="flex flex-col gap-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-2xl">receipt</span>
              </div>
              <div>
                <span className="block font-black text-2xl text-slate-900">{incidents.length}</span>
                <span className="text-xs font-bold uppercase text-slate-400">Total Registradas</span>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-2xl">pending</span>
              </div>
              <div>
                <span className="block font-black text-2xl text-amber-500">
                  {incidents.filter((i) => i.status === 'PENDIENTE').length}
                </span>
                <span className="text-xs font-bold uppercase text-slate-400">Pendientes de Revisión</span>
              </div>
            </div>
          </div>

          {/* List of Incidents */}
          <div className="space-y-3">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-mono text-xs font-bold">
                    {inc.targetDate}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      inc.status === 'APROBADO'
                        ? 'bg-emerald-100 text-emerald-800'
                        : inc.status === 'PENDIENTE'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {inc.status}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900">{inc.errorOriginal}</h4>
                  <p className="text-xs text-slate-500 mt-1">{inc.reason}</p>
                </div>
                {inc.proposedCorrection && (
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-xs font-mono font-bold text-indigo-700">
                    Propuesta: {inc.proposedCorrection}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: Aprobación de Incidencias (Admin View) */}
      {activeTabSub === 'admin_approvals' && (
        <div className="flex flex-col gap-6">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-md shadow-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-100 block mb-1">
                SOLICITUDES PENDIENTES DE REVISIÓN
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-black text-4xl text-white">{pendingApprovals.length}</span>
                <span className="text-sm font-medium text-indigo-100">incidencias esperando certificación</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-white">notifications_active</span>
            </div>
          </div>

          <div className="space-y-4">
            {pendingApprovals.map((inc) => (
              <div
                key={inc.id}
                className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100 flex flex-col gap-4"
              >
                {/* User header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm">
                      {inc.userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{inc.userName}</h4>
                      <p className="text-xs text-slate-400">{inc.department}</p>
                    </div>
                  </div>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md text-xs font-medium text-slate-500">
                    {inc.createdAt}
                  </span>
                </div>

                {/* Diff box */}
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center bg-slate-50 rounded-2xl border border-slate-100 p-4 text-xs">
                  <div>
                    <span className="font-bold text-rose-500 block uppercase text-[10px] mb-0.5">Error Original</span>
                    <span className="font-semibold text-slate-700">{inc.errorOriginal}</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-lg">arrow_forward</span>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600 block uppercase text-[10px] mb-0.5">Propuesta Ajustada</span>
                    <span className="font-mono font-bold text-sm text-emerald-600">{inc.proposedCorrection}</span>
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-xl p-3 text-xs">
                  <span className="font-bold uppercase text-[10px] text-slate-400 block mb-0.5">Motivo declarado:</span>
                  <p className="italic text-slate-700">"{inc.reason}"</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => rejectIncident(inc.id)}
                    className="flex-1 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 py-3 rounded-xl font-bold text-xs transition-colors"
                  >
                    ✕ Rechazar
                  </button>
                  <button
                    onClick={() => approveIncident(inc.id)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs shadow-xs transition-colors"
                  >
                    ✓ Aprobar y Certificar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
