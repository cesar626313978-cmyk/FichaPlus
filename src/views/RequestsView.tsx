import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/UserAvatar';
import { EmployeeRecord, TimeOffRequest } from '../types';

function calculateCalendarDays(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const s = new Date(startStr + 'T00:00:00');
  const e = new Date(endStr + 'T00:00:00');
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  const diffTime = e.getTime() - s.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function calculateWorkingDays(startStr: string, endStr: string, includeSaturdays = false): number {
  if (!startStr || !endStr) return 0;
  const s = new Date(startStr + 'T00:00:00');
  const e = new Date(endStr + 'T00:00:00');
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;

  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dayOfWeek = cur.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && (dayOfWeek !== 6 || includeSaturdays)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
}

export const RequestsView: React.FC = () => {
  const {
    employees,
    timeOffRequests,
    addTimeOffRequest,
    approveTimeOffRequest,
    rejectTimeOffRequest,
    deleteTimeOffRequest,
    vacationPlanningEmployeeId,
    setVacationPlanningEmployeeId,
  } = useApp();
  const { profile } = useAuth();
  const isAdmin = profile.role === 'admin' || profile.role === 'manager';

  // Find logged in employee
  const currentEmp = useMemo(() => {
    return (
      employees.find(
        (e) =>
          e.id === profile.id ||
          (e.dni && profile.dni && e.dni.trim().toUpperCase() === profile.dni.trim().toUpperCase()) ||
          (e.email && profile.email && e.email.trim().toLowerCase() === profile.email.trim().toLowerCase()) ||
          (e.fullName && profile.name && e.fullName.trim().toLowerCase() === profile.name.trim().toLowerCase())
      ) || employees[0]
    );
  }, [employees, profile]);

  // Selected employee target for planning/requests
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    vacationPlanningEmployeeId || currentEmp?.id || (employees[0]?.id ?? '')
  );

  useEffect(() => {
    if (vacationPlanningEmployeeId) {
      setSelectedEmployeeId(vacationPlanningEmployeeId);
    }
  }, [vacationPlanningEmployeeId]);

  const targetEmp: EmployeeRecord = useMemo(() => {
    if (!isAdmin) return currentEmp;
    return employees.find((e) => e.id === selectedEmployeeId) || currentEmp || employees[0];
  }, [isAdmin, selectedEmployeeId, employees, currentEmp]);

  const [leaveType, setLeaveType] = useState<'Vacaciones' | 'Días Personales' | 'Baja Médica' | 'Asuntos Propios'>('Vacaciones');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customDaysCount, setCustomDaysCount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [adminStatus, setAdminStatus] = useState<'APROBADO' | 'PENDIENTE'>('APROBADO');
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History filtering
  const [historyFilterEmp, setHistoryFilterEmp] = useState<string>('TODOS');
  const [historyFilterStatus, setHistoryFilterStatus] = useState<string>('TODOS');

  // Stats calculation for target employee
  const targetTotalAllocated = targetEmp?.vacationDays ?? 30;
  const targetVacationType = targetEmp?.vacationDaysType ?? 'NATURALES';
  const targetVacationNotes = targetEmp?.vacationNotes;

  const targetEmployeeRequests = useMemo(() => {
    if (!targetEmp) return [];
    return timeOffRequests.filter(
      (r) =>
        r.userId === targetEmp.id ||
        (targetEmp.fullName && r.userName && r.userName.trim().toLowerCase() === targetEmp.fullName.trim().toLowerCase())
    );
  }, [timeOffRequests, targetEmp]);

  const targetApprovedVacationRequests = useMemo(() => {
    return targetEmployeeRequests.filter((r) => r.leaveType === 'Vacaciones' && r.status === 'APROBADO');
  }, [targetEmployeeRequests]);

  const targetUsedDays = useMemo(() => {
    return targetApprovedVacationRequests.reduce((sum, r) => sum + (r.daysCount || 1), 0);
  }, [targetApprovedVacationRequests]);

  const targetAvailableDays = Math.max(0, targetTotalAllocated - targetUsedDays);

  // Auto-calculated days count based on regime
  const suggestedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    if (targetVacationType === 'LABORABLES') {
      const worksSat = targetEmp?.worksSaturday ?? false;
      return calculateWorkingDays(startDate, endDate, worksSat);
    }
    return calculateCalendarDays(startDate, endDate);
  }, [startDate, endDate, targetVacationType, targetEmp]);

  // Keep customDaysCount in sync with dates until user customizes
  useEffect(() => {
    if (suggestedDays > 0) {
      setCustomDaysCount(suggestedDays);
    } else {
      setCustomDaysCount('');
    }
  }, [suggestedDays]);

  // Today check for past dates
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isPastPeriod = useMemo(() => {
    if (!startDate) return false;
    return startDate < todayStr || (endDate && endDate < todayStr);
  }, [startDate, endDate, todayStr]);

  const pendingRequests = useMemo(() => timeOffRequests.filter((r) => r.status === 'PENDIENTE'), [timeOffRequests]);

  const myRequests = useMemo(() => {
    return timeOffRequests.filter(
      (r) =>
        r.userId === profile.id ||
        (currentEmp?.id && r.userId === currentEmp.id) ||
        (profile.name && r.userName && r.userName.trim().toLowerCase() === profile.name.trim().toLowerCase())
    );
  }, [timeOffRequests, profile, currentEmp]);

  const displayedHistory = useMemo(() => {
    let list = isAdmin ? timeOffRequests : myRequests;
    if (isAdmin && historyFilterEmp !== 'TODOS') {
      list = list.filter(
        (r) =>
          r.userId === historyFilterEmp ||
          (employees.find((e) => e.id === historyFilterEmp)?.fullName.trim().toLowerCase() ===
            r.userName?.trim().toLowerCase())
      );
    }
    if (historyFilterStatus !== 'TODOS') {
      list = list.filter((r) => r.status === historyFilterStatus);
    }
    return list;
  }, [isAdmin, timeOffRequests, myRequests, historyFilterEmp, historyFilterStatus, employees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || isSubmitting || !targetEmp) return;

    if (endDate < startDate) {
      alert('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    const finalDaysCount = Math.max(1, Number(customDaysCount) || suggestedDays || 1);

    setIsSubmitting(true);
    try {
      const finalStatus = isAdmin ? adminStatus : 'PENDIENTE';
      const reviewer = isAdmin && finalStatus === 'APROBADO' ? (profile.name || 'Dirección / RRHH') : undefined;

      await addTimeOffRequest({
        userId: targetEmp.id,
        userName: targetEmp.fullName,
        department: targetEmp.department || 'General',
        leaveType,
        startDate,
        endDate,
        daysCount: finalDaysCount,
        notes: notes.trim(),
        status: finalStatus,
        reviewedBy: reviewer,
      });

      setSubmitSuccess(
        `✓ ${leaveType} para ${targetEmp.fullName} (${finalDaysCount} días) registradas correctamente como ${
          finalStatus === 'APROBADO' ? 'APROBADAS Y COMPUTADAS' : 'PENDIENTES DE REVISIÓN'
        }.`
      );

      // Clean form
      setStartDate('');
      setEndDate('');
      setNotes('');
      setCustomDaysCount('');
      if (vacationPlanningEmployeeId) {
        setVacationPlanningEmployeeId(null);
      }
      setTimeout(() => setSubmitSuccess(null), 5000);
    } catch (err) {
      console.error('Error creating request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-black text-3xl md:text-4xl text-slate-900 tracking-tight">
            {isAdmin ? 'Gestión de Permisos y Vacaciones' : 'Mis Vacaciones y Permisos'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAdmin
              ? 'Planifica vacaciones para cualquier empleado, registra periodos pasados o aprueba solicitudes pendientes.'
              : 'Gestiona tus días de descanso, vacaciones anuales y permisos retribuidos.'}
          </p>
        </div>

        {isAdmin && (
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200/80 px-3.5 py-1.5 rounded-2xl self-start sm:self-auto">
            <span className="material-symbols-outlined text-indigo-600 text-lg">admin_panel_settings</span>
            <span className="text-xs font-black text-indigo-950">Modo Dirección / RRHH Activo</span>
          </div>
        )}
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Days Available Card (Dynamic for target employee) */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between items-center text-center relative overflow-hidden">
          <div className="w-full">
            {isAdmin && targetEmp && (
              <div className="mb-3 inline-flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/80 px-3 py-1 rounded-xl text-xs font-bold text-slate-800 max-w-full">
                <span className="material-symbols-outlined text-sm text-indigo-600">badge</span>
                <span className="truncate">{targetEmp.fullName}</span>
              </div>
            )}

            <span className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">
              Vacaciones Disponibles 2026
            </span>

            <div className="w-24 h-24 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-2 shadow-inner border border-amber-100/80">
              <span className="font-black text-4xl">{targetAvailableDays}</span>
            </div>

            <span className="text-xs font-bold text-slate-700 block">
              de {targetTotalAllocated} días {targetVacationType === 'LABORABLES' ? 'laborables' : 'naturales'}
            </span>

            <p className="text-[11px] text-slate-500 max-w-[210px] mx-auto leading-relaxed mt-1">
              {targetUsedDays > 0
                ? `${targetUsedDays} días disfrutados / planificados.`
                : 'Sin días disfrutados todavía.'}
            </p>

            {targetVacationNotes && (
              <div
                className="mt-2.5 bg-amber-50 border border-amber-200/60 rounded-xl px-2.5 py-1 text-[10px] font-semibold text-amber-800 max-w-[220px] mx-auto truncate"
                title={targetVacationNotes}
              >
                📌 {targetVacationNotes}
              </div>
            )}
          </div>

          {/* Quick preview of already booked vacation periods */}
          {targetApprovedVacationRequests.length > 0 && (
            <div className="w-full mt-4 pt-3 border-t border-slate-100 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                Periodos Aprobados ({targetApprovedVacationRequests.length}):
              </span>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {targetApprovedVacationRequests.map((r) => (
                  <div
                    key={r.id}
                    className="text-[11px] bg-slate-50 border border-slate-200/70 rounded-lg px-2 py-1 flex items-center justify-between text-slate-700"
                  >
                    <span className="truncate font-medium">
                      📅 {r.startDate.slice(5)} al {r.endDate.slice(5)}
                    </span>
                    <span className="font-bold text-amber-700 shrink-0 ml-1">
                      {r.daysCount}d
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* New Request / Planning Form */}
        <section className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-lg text-slate-900">
                  {isAdmin ? 'Planificar o Registrar Ausencia / Vacaciones' : 'Nueva Solicitud de Ausencia'}
                </h2>
                {isAdmin && (
                  <p className="text-xs text-slate-400">
                    Asigna vacaciones directas o regulariza periodos pasados de cualquier empleado.
                  </p>
                )}
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {isAdmin ? 'Planificación Directa' : 'Tramitación inmediata'}
              </span>
            </div>

            {/* Employee Selector (Admins only) */}
            {isAdmin && (
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3.5">
                <label className="text-xs font-black uppercase tracking-wider text-indigo-950 block mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-indigo-600">person_pin</span>
                    Empleado / Beneficiario
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-700">
                    {employees.length} empleados registrados
                  </span>
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full bg-white border border-indigo-200 p-3 rounded-xl font-bold text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer shadow-2xs"
                >
                  {employees.map((emp) => {
                    const isMe = emp.id === currentEmp?.id;
                    const used = timeOffRequests
                      .filter(
                        (r) =>
                          (r.userId === emp.id || r.userName?.toLowerCase() === emp.fullName.toLowerCase()) &&
                          r.leaveType === 'Vacaciones' &&
                          r.status === 'APROBADO'
                      )
                      .reduce((sum, r) => sum + (r.daysCount || 1), 0);
                    const rem = Math.max(0, (emp.vacationDays ?? 30) - used);

                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} {isMe ? '★ (Mi usuario)' : ''} — {emp.department || 'General'} | Disp: {rem} de {emp.vacationDays ?? 30}d
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-indigo-800 mt-1.5 font-medium flex items-center gap-1">
                  <span>ℹ️</span> Al seleccionar a un empleado se actualiza su saldo disponible y el cómputo de días.
                </p>
              </div>
            )}

            {/* Leave Type */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Tipo de Permiso
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all cursor-pointer"
              >
                <option value="Vacaciones">🌴 Vacaciones Anuales (Descuenta de cupo 2026)</option>
                <option value="Días Personales">☕ Días Personales</option>
                <option value="Baja Médica">🏥 Baja Médica / Incapacidad Temporal (IT)</option>
                <option value="Asuntos Propios">📋 Asuntos Propios / Convenio</option>
              </select>
            </div>

            {/* Start & End Dates (Past dates fully allowed) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center justify-between">
                  <span>Fecha de Inicio</span>
                  <span className="text-[10px] text-indigo-600 font-semibold">Admite fechas pasadas</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setStartDate(newStart);
                    if (endDate && newStart > endDate) {
                      setEndDate(newStart);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center justify-between">
                  <span>Fecha de Fin</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Inclusive</span>
                </label>
                <input
                  type="date"
                  required
                  min={startDate || undefined}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Retroactive / Past dates informational banner */}
            {isPastPeriod && (
              <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">
                  history_toggle_off
                </span>
                <div>
                  <span className="font-bold block text-amber-950">
                    🕒 Registro Retroactivo de Vacaciones Pasadas
                  </span>
                  <span className="text-[11px] text-amber-800 leading-relaxed block mt-0.5">
                    Estas fechas corresponden a un periodo transcurrido con anterioridad. Se registrarán como vacaciones ya disfrutadas y se deducirán automáticamente del cupo 2026 de <strong>{targetEmp.fullName}</strong>.
                  </span>
                </div>
              </div>
            )}

            {/* Days calculation and manual override */}
            {startDate && endDate && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Cómputo de Días a Descontar:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Régimen: {targetVacationType === 'LABORABLES' ? 'Días Laborables' : 'Días Naturales'}{' '}
                    (Calculado: {suggestedDays} días)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    required
                    value={customDaysCount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomDaysCount(val === '' ? '' : Math.max(1, parseInt(val) || 1));
                    }}
                    className="w-20 bg-white border border-slate-300 text-center font-black text-base p-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-700">días</span>

                  {customDaysCount !== suggestedDays && (
                    <button
                      type="button"
                      onClick={() => setCustomDaysCount(suggestedDays)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 underline font-bold cursor-pointer ml-1"
                      title="Restablecer al cálculo automático"
                    >
                      Restablecer ({suggestedDays})
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Admin Planning Mode: Immediate Approval vs Pending */}
            {isAdmin && (
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                  Estado de la Planificación
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`border rounded-2xl p-3 flex items-start gap-2.5 cursor-pointer transition-all ${
                      adminStatus === 'APROBADO'
                        ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="adminStatus"
                      checked={adminStatus === 'APROBADO'}
                      onChange={() => setAdminStatus('APROBADO')}
                      className="mt-1 accent-emerald-600"
                    />
                    <div>
                      <span className="font-black text-xs block">✓ Aprobada y Planificada por Empresa</span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                        Queda aprobada directamente y se deduce del saldo anual sin requerir trámite posterior.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`border rounded-2xl p-3 flex items-start gap-2.5 cursor-pointer transition-all ${
                      adminStatus === 'PENDIENTE'
                        ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 text-amber-950'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="adminStatus"
                      checked={adminStatus === 'PENDIENTE'}
                      onChange={() => setAdminStatus('PENDIENTE')}
                      className="mt-1 accent-amber-600"
                    />
                    <div>
                      <span className="font-black text-xs block">⏳ Registrar como Solicitud Pendiente</span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                        Se enviará a la bandeja de solicitudes para ser revisada y confirmada más adelante.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Notes & Quick templates */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Notas Adicionales (Opcional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  isAdmin
                    ? 'Ej: Vacaciones disfrutadas con anterioridad al inicio de la aplicación / Planificadas por gerencia...'
                    : 'Ej: Periodo acordado con el responsable de departamento...'
                }
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none resize-none transition-all"
              />

              {isAdmin && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold self-center mr-1">Atajos:</span>
                  <button
                    type="button"
                    onClick={() => setNotes('Vacaciones disfrutadas con anterioridad al alta en FichaPlus')}
                    className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-medium px-2 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    + Disfrutadas previamente
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotes('Periodo planificado por la dirección de la empresa')}
                    className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-medium px-2 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    + Planificadas por empresa
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotes('Regularización de saldo del año en curso')}
                    className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-medium px-2 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    + Regularización año
                  </button>
                </div>
              )}
            </div>

            {submitSuccess && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-300 p-3.5 rounded-2xl text-xs font-bold text-center animate-in fade-in">
                {submitSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !startDate || !endDate}
              className={`mt-2 font-black text-sm py-3.5 px-6 rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isSubmitting || !startDate || !endDate
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : isAdmin && adminStatus === 'APROBADO'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {isAdmin ? (adminStatus === 'APROBADO' ? 'event_available' : 'send') : 'send'}
              </span>
              <span>
                {isSubmitting
                  ? 'Guardando...'
                  : isAdmin
                  ? adminStatus === 'APROBADO'
                    ? isPastPeriod
                      ? `Registrar Vacaciones Pasadas de ${targetEmp.fullName.split(' ')[0]}`
                      : `Planificar y Aprobar Vacaciones para ${targetEmp.fullName.split(' ')[0]}`
                    : `Crear Solicitud para ${targetEmp.fullName.split(' ')[0]}`
                  : 'Enviar Solicitud'}
              </span>
            </button>
          </form>
        </section>
      </div>

      {/* Admin Review List Section (if Manager/Admin with pending requests) */}
      {isAdmin && pendingRequests.length > 0 && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div>
              <h2 className="font-bold text-lg text-slate-900">
                Pendientes de Aprobación ({pendingRequests.length})
              </h2>
              <p className="text-xs text-slate-400">Solicitudes de la plantilla que requieren visto bueno</p>
            </div>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 text-xs font-bold rounded-full">
              {pendingRequests.length} pendientes
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
                    <UserAvatar name={req.userName} size="md" rounded="2xl" />
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
                        {req.leaveType} ({req.startDate} al {req.endDate}) •{' '}
                        <span className="font-bold text-indigo-600">{req.daysCount} días</span>
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
                      className="flex-1 md:flex-none bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      ✕ Rechazar
                    </button>
                    <button
                      onClick={() => approveTimeOffRequest(req.id)}
                      className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      ✓ Aprobar y Computar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* General History List & Filtering */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
          <div>
            <h2 className="font-bold text-lg text-slate-900">
              {isAdmin ? 'Historial General de Solicitudes y Vacaciones' : 'Historial de mis Solicitudes'}
            </h2>
            <p className="text-xs text-slate-400">
              {isAdmin
                ? 'Registro de todas las vacaciones disfrutadas, planificadas o pendientes en el sistema.'
                : 'Tus ausencias y vacaciones registradas en el año en curso.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <select
                value={historyFilterEmp}
                onChange={(e) => setHistoryFilterEmp(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="TODOS">Todos los Empleados ({timeOffRequests.length})</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
              </select>
            )}

            <select
              value={historyFilterStatus}
              onChange={(e) => setHistoryFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="APROBADO">Solo Aprobadas</option>
              <option value="PENDIENTE">Solo Pendientes</option>
              <option value="RECHAZADO">Solo Rechazadas</option>
            </select>
          </div>
        </div>

        {displayedHistory.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
            <span className="text-3xl block mb-2">📋</span>
            <p className="font-bold text-sm text-slate-700">Sin solicitudes o vacaciones registradas</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {isAdmin
                ? 'Utiliza el formulario superior para planificar vacaciones o registrar periodos ya disfrutados de cualquier empleado.'
                : 'Utiliza el formulario superior para registrar tus vacaciones o ausencias.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedHistory.map((req) => {
              const isPast = req.endDate < todayStr;
              return (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-slate-800">
                        {req.leaveType} {isAdmin ? `— ${req.userName}` : ''}
                      </p>
                      <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[10px] font-bold text-slate-600 font-mono">
                        {req.daysCount} {req.daysCount === 1 ? 'día' : 'días'}
                      </span>
                      {isPast && (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1">
                          <span>🕒 Fecha pasada / Disfrutada</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      📅 Del <span className="font-semibold text-slate-700">{req.startDate}</span> al{' '}
                      <span className="font-semibold text-slate-700">{req.endDate}</span>
                      {req.createdAt && (
                        <span className="text-slate-400 text-[11px]"> • Registrada: {req.createdAt}</span>
                      )}
                    </p>
                    {req.notes && (
                      <p className="text-xs text-slate-600 italic bg-white/80 px-2.5 py-1 rounded-lg border border-slate-100 max-w-xl">
                        💬 "{req.notes}"
                      </p>
                    )}
                    {req.reviewedBy && (
                      <p className="text-[11px] text-slate-400">
                        Planificado / Aprobado por:{' '}
                        <span className="font-semibold text-slate-600">{req.reviewedBy}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
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

                    {(isAdmin || req.status === 'PENDIENTE') && (
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Deseas eliminar este registro de vacaciones de ${req.userName} (${req.daysCount} días)?`
                            )
                          ) {
                            deleteTimeOffRequest(req.id);
                          }
                        }}
                        title="Eliminar registro"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-xs"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
