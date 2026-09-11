import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/UserAvatar';

export const RequestsView: React.FC = () => {
  const { employees, timeOffRequests, addTimeOffRequest, approveTimeOffRequest, rejectTimeOffRequest } = useApp();
  const { profile } = useAuth();
  const isAdmin = profile.role === 'admin' || profile.role === 'manager';

  const [leaveType, setLeaveType] = useState<'Vacaciones' | 'Días Personales' | 'Baja Médica' | 'Asuntos Propios'>('Vacaciones');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const pendingRequests = timeOffRequests.filter((r) => r.status === 'PENDIENTE');
  const myRequests = timeOffRequests.filter((r) => r.userId === profile.id);
  const displayedHistory = isAdmin ? timeOffRequests : myRequests;

  // Find employee custom vacation days configuration (default 30 días naturales)
  const currentEmp = employees.find(
    (e) =>
      e.id === profile.id ||
      (e.dni && profile.dni && e.dni.trim().toUpperCase() === profile.dni.trim().toUpperCase()) ||
      (e.email && profile.email && e.email.trim().toLowerCase() === profile.email.trim().toLowerCase())
  );
  const totalAllocatedDays = currentEmp?.vacationDays ?? 30;
  const vacationType = currentEmp?.vacationDaysType ?? 'NATURALES';
  const vacationNotes = currentEmp?.vacationNotes;

  const usedDays = myRequests
    .filter((r) => r.leaveType === 'Vacaciones' && r.status === 'APROBADO')
    .reduce((sum, r) => sum + (r.daysCount || 1), 0);
  const availableDays = Math.max(0, totalAllocatedDays - usedDays);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    await addTimeOffRequest({
      userId: profile.id,
      userName: profile.name,
      department: profile.department,
      leaveType,
      startDate,
      endDate,
      daysCount: diffDays,
      notes,
    });

    setSubmitSuccess(true);
    setStartDate('');
    setEndDate('');
    setNotes('');
    setTimeout(() => setSubmitSuccess(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="font-black text-3xl md:text-4xl text-slate-900 tracking-tight">
          {isAdmin ? 'Gestión de Permisos y Vacaciones' : 'Mis Vacaciones y Permisos'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isAdmin
            ? 'Supervisa las solicitudes de ausencia de la plantilla y gestiona aprobaciones.'
            : 'Gestiona tus días de descanso, bajas y permisos retribuidos.'}
        </p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Days Available Card */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Vacaciones Disponibles 2026
          </span>
          <div className="w-24 h-24 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center mb-2 shadow-inner">
            <span className="font-black text-4xl">{availableDays}</span>
          </div>
          <span className="text-xs font-bold text-slate-700">
            de {totalAllocatedDays} días {vacationType === 'LABORABLES' ? 'laborables' : 'naturales'}
          </span>
          <p className="text-[11px] text-slate-400 max-w-[200px] leading-relaxed mt-1">
            {usedDays > 0 ? `${usedDays} días disfrutados/aprobados.` : 'Sin días disfrutados todavía.'}
          </p>
          {vacationNotes && (
            <div className="mt-2.5 bg-amber-50 border border-amber-200/60 rounded-xl px-2.5 py-1 text-[10px] font-semibold text-amber-800 max-w-[210px] truncate" title={vacationNotes}>
              📌 {vacationNotes}
            </div>
          )}
        </section>

        {/* New Request Form */}
        <section className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-lg text-slate-900">
                Nueva Solicitud de Ausencia
              </h2>
              <span className="text-xs font-semibold text-slate-400">Tramitación inmediata</span>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Tipo de Permiso
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
              >
                <option value="Vacaciones">🌴 Vacaciones Anuales</option>
                <option value="Días Personales">☕ Días Personales</option>
                <option value="Baja Médica">🏥 Baja Médica / IT</option>
                <option value="Asuntos Propios">📋 Asuntos Propios</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Fecha de Fin
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Notas Adicionales (Opcional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Periodo acordado con el responsable de departamento..."
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none resize-none transition-all"
              />
            </div>

            {submitSuccess && (
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-xl text-xs font-bold text-center">
                ✓ Solicitud enviada correctamente para revisión.
              </div>
            )}

            <button
              type="submit"
              className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-100 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">send</span>
              Enviar Solicitud
            </button>
          </form>
        </section>
      </div>

      {/* Admin Review List Section (if Manager/Admin) */}
      {isAdmin && pendingRequests.length > 0 && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div>
              <h2 className="font-bold text-lg text-slate-900">
                Pendientes de Aprobación ({pendingRequests.length})
              </h2>
              <p className="text-xs text-slate-400">Solicitudes de tu equipo que requieren visto bueno</p>
            </div>
            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-bold rounded-full">
              Panel de RRHH
            </span>
          </div>

          <div className="space-y-3">
            {pendingRequests.map((req) => {
              const reqEmp = employees.find(
                (e) =>
                  e.id === req.userId ||
                  (e.fullName && req.userName && e.fullName.trim().toLowerCase() === req.userName.trim().toLowerCase())
              );
              const empVacDays = reqEmp?.vacationDays ?? 30;
              const empVacType = reqEmp?.vacationDaysType ?? 'NATURALES';

              return (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-100/60 transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <UserAvatar
                      name={req.userName}
                      size="md"
                      rounded="2xl"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900">{req.userName}</h4>
                        <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[10px] font-bold text-slate-500">
                          {req.department}
                        </span>
                        <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          Cupo: {empVacDays} días ({empVacType === 'LABORABLES' ? 'lab.' : 'nat.'})
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 font-medium">
                        {req.leaveType} ({req.startDate} al {req.endDate}) • <span className="font-bold text-indigo-600">{req.daysCount} días</span>
                      </p>
                      {req.notes && <p className="text-xs italic text-slate-400 mt-0.5">"{req.notes}"</p>}
                      {reqEmp?.vacationNotes && (
                        <p className="text-[10px] text-amber-800 mt-0.5 font-semibold">
                          ℹ️ Notas asignación: {reqEmp.vacationNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      onClick={() => rejectTimeOffRequest(req.id)}
                      className="flex-1 md:flex-none bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 px-4 py-2 text-xs font-bold rounded-xl transition-colors"
                    >
                      ✕ Rechazar
                    </button>
                    <button
                      onClick={() => approveTimeOffRequest(req.id)}
                      className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-colors"
                    >
                      ✓ Aprobar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Past Requests List */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
        <h2 className="font-bold text-lg text-slate-900 border-b border-slate-100 pb-3 mb-4">
          {isAdmin ? 'Historial General de Solicitudes' : 'Historial de mis Solicitudes'}
        </h2>

        <div className="space-y-2.5">
          {displayedHistory.map((req) => (
            <div
              key={req.id}
              className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:bg-slate-50 transition-colors"
            >
              <div>
                <p className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  {req.leaveType} {isAdmin ? `— ${req.userName}` : ''}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  {req.startDate} al {req.endDate} ({req.daysCount} días)
                </p>
              </div>

              <span
                className={`px-3 py-1 rounded-full font-bold text-[11px] uppercase tracking-wide ${
                  req.status === 'APROBADO'
                    ? 'bg-emerald-100 text-emerald-800'
                    : req.status === 'PENDIENTE'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {req.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
