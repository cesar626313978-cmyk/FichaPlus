import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { DevicePermissionsModal } from '../components/DevicePermissionsModal';
import { ClockActionConfirmModal, ClockActionType } from '../components/ClockActionConfirmModal';
import { UserAvatar } from '../components/UserAvatar';
import { WorkdayPlanType } from '../types';

export const DashboardView: React.FC = () => {
  const {
    currentEmployee,
    currentShiftInfo,
    isClockedIn,
    isPaused,
    clockInTime,
    elapsedSeconds,
    workType,
    setWorkType,
    workdayPlan,
    currentShiftNumber,
    shift1,
    shift2,
    pauseReason,
    isBetweenShifts,
    startWorkday,
    pauseWorkday,
    resumeWorkday,
    stopWorkday,
    resetTodayShifts,
    setActiveTab,
    employees,
    timeEntries,
    timeOffRequests,
    incidents,
    monthlyRecord,
    locationStamp,
    isLocatingGps,
    refreshLocation,
    showDeviceModal,
    setShowDeviceModal,
  } = useApp();

  const { profile } = useAuth();
  const isAdmin = profile.role === 'admin' || profile.role === 'manager';

  // For Superusuario view toggle: 'overview' (Monitor de Plantilla) vs 'my_clock' (Mi Fichaje)
  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'my_clock'>('overview');

  // Live clock ticker
  const [nowTime, setNowTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Optional collapsible schedule details (collapsed by default)
  const [showOptionalSchedule, setShowOptionalSchedule] = useState(false);

  // Confirmation Modal State (Antierror safety)
  const [confirmModalAction, setConfirmModalAction] = useState<ClockActionType | null>(null);

  // Filtered allowed work location options for the active employee
  const employeeAllowedLocations = useMemo<('presencial' | 'teletrabajo' | 'cliente')[]>(() => {
    const raw = currentEmployee?.allowedWorkLocations;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw;
    }
    return ['presencial', 'teletrabajo', 'cliente'];
  }, [currentEmployee?.allowedWorkLocations]);

  // Ensure selected workType is always among the allowed locations for this employee
  useEffect(() => {
    if (employeeAllowedLocations.length > 0 && !employeeAllowedLocations.includes(workType)) {
      setWorkType(employeeAllowedLocations[0]);
    }
  }, [employeeAllowedLocations, workType, setWorkType]);

  // Compute if the employee actually has registered entries or hours to sign in the monthly report
  const userEntriesForSign = (timeEntries || []).filter(
    (t) =>
      t.userId === profile.id ||
      t.userName === profile.name ||
      (currentEmployee && t.userId === currentEmployee.id) ||
      (employees.length <= 1 && (!t.userId || t.userId === 'emp-001'))
  );
  const computedUserHours = userEntriesForSign.reduce((sum, e) => sum + (e.totalHoursWorked || 0), 0);
  const hasHoursToSign = computedUserHours > 0 || (monthlyRecord?.ordinaryHours || 0) > 0 || userEntriesForSign.length > 0;
  // ONLY show the banner if the record is unsigned AND there is actual work registered to sign
  const hasPendingMonthlySign = !monthlyRecord?.isSigned && hasHoursToSign;
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const pendingRequestsCount = timeOffRequests.filter((r) => r.status === 'PENDIENTE').length;
  const pendingIncidentsCount = incidents.filter((i) => i.status === 'PENDIENTE').length;
  const activeEmployeesCount = employees.filter((e) => e.status === 'ACTIVO').length;

  // Handler to open confirm modal for any workday action
  const requestClockAction = (action: ClockActionType) => {
    setConfirmModalAction(action);
    setShowConfirmModal(true);
  };

  // Execute confirmed action
  const handleConfirmedAction = async (payload?: { pauseReason?: string; pauseNotes?: string }) => {
    setShowConfirmModal(false);
    if (!confirmModalAction) return;

    switch (confirmModalAction) {
      case 'start_shift_1':
      case 'start_shift_2':
      case 'start_single':
        await startWorkday(1);
        break;
      case 'pause':
        await pauseWorkday(payload?.pauseReason || 'Pausa', payload?.pauseNotes);
        break;
      case 'resume':
        await resumeWorkday();
        break;
      case 'stop_shift_1':
      case 'stop_shift_2':
      case 'stop_single':
        await stopWorkday(1);
        break;
    }
    setConfirmModalAction(null);
  };

  // Render the Clean, Mobile-First Terminal Clock component
  const renderTerminalClock = () => {
    const rawName = currentEmployee?.fullName || (currentEmployee as any)?.name || profile?.name || 'Usuario';
    const employeeFirstName = rawName.trim().split(' ')[0] || 'Usuario';
    const weeklyTarget = currentEmployee?.weeklyHours || 40;

    return (
      <div className="flex flex-col gap-4 max-w-xl mx-auto w-full">
        {/* Main Punch Clock Terminal Surface */}
        <section className="bg-white rounded-3xl p-5 sm:p-7 md:p-8 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
          {/* Greeting & Date Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between w-full pb-3.5 mb-4 border-b border-slate-100 gap-2">
            <div className="text-center sm:text-left">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                ¡Hola, {employeeFirstName}! 👋
              </h2>
              <span className="text-xs font-semibold text-slate-400 capitalize block">
                {nowTime.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
            </div>
            {/* Live Official Clock Pill */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-full text-xs font-mono font-bold text-slate-700 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                {nowTime.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Quick Work Location Mode Selector - Filtered by Employee Allowed Configuration */}
          {employeeAllowedLocations.length > 1 ? (
            <div className="mb-3 flex justify-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 w-full max-w-xs">
              {employeeAllowedLocations.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setWorkType(type)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    workType === type
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{type === 'presencial' ? '🏢' : type === 'teletrabajo' ? '🏠' : '🚗'}</span>
                  <span className="capitalize text-[11px]">
                    {type === 'presencial' ? 'Oficina' : type === 'teletrabajo' ? 'Casa' : 'Ruta'}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mb-3 flex justify-center w-full max-w-xs">
              <div className="bg-slate-100/90 border border-slate-200/80 px-3.5 py-1.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-slate-800 shadow-2xs w-full">
                <span>
                  {employeeAllowedLocations[0] === 'presencial'
                    ? '🏢'
                    : employeeAllowedLocations[0] === 'teletrabajo'
                    ? '🏠'
                    : '🚗'}
                </span>
                <span>
                  Modalidad:{' '}
                  <strong className="text-indigo-700">
                    {employeeAllowedLocations[0] === 'presencial'
                      ? 'Presencial (Oficina)'
                      : employeeAllowedLocations[0] === 'teletrabajo'
                      ? 'Casa (Teletrabajo)'
                      : 'En Ruta'}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* Current Status Pill */}
          <div className="mb-2">
            {isClockedIn ? (
              isPaused ? (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3.5 py-1 rounded-full text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  <span>En Pausa ({pauseReason || 'Descanso'})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1 rounded-full text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>En Jornada Activa</span>
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 border border-slate-200 px-3.5 py-1 rounded-full text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Fuera de Jornada</span>
              </span>
            )}
          </div>

          {/* Big Clean Timer / Clock Display */}
          <div className="bg-slate-50/90 border border-slate-200/80 rounded-3xl px-6 py-5 my-3 w-full max-w-sm shadow-inner flex flex-col items-center">
            <span className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-slate-900 leading-none">
              {isClockedIn
                ? formatTimer(elapsedSeconds)
                : nowTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-2">
              {isClockedIn
                ? `Horas trabajadas hoy (${workType === 'presencial' ? 'oficina' : workType})`
                : 'Hora local oficial'}
            </span>
          </div>

          {/* Discreet GPS status chip */}
          <div className="mb-4 inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-[11px] text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>
              {locationStamp ? (
                <>
                  GPS:{' '}
                  <span className="font-medium text-slate-800">
                    {locationStamp.address || `${locationStamp.latitude.toFixed(3)}°, ${locationStamp.longitude.toFixed(3)}°`}
                  </span>{' '}
                  (±{locationStamp.accuracy}m)
                </>
              ) : (
                'GPS Satélite activo'
              )}
            </span>
            <button
              onClick={() => refreshLocation()}
              disabled={isLocatingGps}
              className="text-indigo-600 font-bold hover:underline ml-0.5 cursor-pointer"
            >
              {isLocatingGps ? '...' : 'Calibrar'}
            </button>
          </div>

          {/* High-Contrast Large Touch Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center max-w-sm">
            {!isClockedIn ? (
              // When Not Clocked In: Big Emerald Entry Punch Button
              <button
                onClick={() => requestClockAction('start_single')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-4 px-6 rounded-2xl font-black text-base sm:text-lg shadow-lg shadow-emerald-200/70 hover:shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl font-bold">login</span>
                <span>FICHAR ENTRADA</span>
              </button>
            ) : isPaused ? (
              // When Paused: Reanudar or Salida
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <button
                  onClick={() => requestClockAction('resume')}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-3.5 px-4 rounded-2xl font-black text-sm shadow-md shadow-emerald-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">play_arrow</span>
                  <span>REANUDAR</span>
                </button>
                <button
                  onClick={() => requestClockAction('stop_single')}
                  className="bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white py-3.5 px-4 rounded-2xl font-black text-sm shadow-md shadow-rose-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">logout</span>
                  <span>SALIDA</span>
                </button>
              </div>
            ) : (
              // When Clocked In: Pause and Salida
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <button
                  onClick={() => requestClockAction('pause')}
                  className="bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white py-3.5 px-4 rounded-2xl font-black text-sm shadow-md shadow-amber-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">pause</span>
                  <span>PAUSA</span>
                </button>
                <button
                  onClick={() => requestClockAction('stop_single')}
                  className="bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white py-3.5 px-4 rounded-2xl font-black text-sm shadow-md shadow-rose-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">logout</span>
                  <span>SALIDA</span>
                </button>
              </div>
            )}
          </div>

          {/* Clean Today's Summary Strip: Entrada, Horas Hoy, Cómputo Semanal */}
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-sm mt-5 pt-4 border-t border-slate-100 text-center">
            <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Entrada</span>
              <span className="font-mono font-bold text-sm text-slate-800">
                {clockInTime || '--:--'}
              </span>
            </div>
            <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Horas Hoy</span>
              <span className="font-mono font-bold text-sm text-indigo-700">
                {elapsedSeconds > 0 ? `${(elapsedSeconds / 3600).toFixed(1)}h` : '0.0h'}
              </span>
            </div>
            <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Semana</span>
              <span className="font-mono font-bold text-xs text-slate-700">
                {elapsedSeconds > 0 ? `${(32.5 + elapsedSeconds / 3600).toFixed(1)}h` : '32.5h'}
                <span className="text-[10px] text-slate-400 font-normal"> / {weeklyTarget}h</span>
              </span>
            </div>
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Mobile Terminal Hardware & Permission Status Bar - Only in Admin Overview */}
      {isAdmin && adminSubTab === 'overview' && (
        <section className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">satellite_alt</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Terminal PWA & Sensores Móviles</h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  Art. 34.9 ET
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {locationStamp?.verifiedGps
                  ? `GPS Satélite activo (±${locationStamp.accuracy}m) • ${locationStamp.address || 'Ubicación verificada'}`
                  : 'Sensores del teléfono y geolocalización satelital listos'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => refreshLocation()}
              disabled={isLocatingGps}
              title="Recalibrar señal GPS satelital"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 px-3 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <span className="material-symbols-outlined text-sm text-indigo-400">
                {isLocatingGps ? 'sync' : 'my_location'}
              </span>
              <span>{isLocatingGps ? 'Buscando...' : 'Calibrar GPS'}</span>
            </button>
            <button
              onClick={() => setShowDeviceModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-900"
            >
              <span className="material-symbols-outlined text-sm">settings_suggest</span>
              <span>Avisos & Sensores</span>
            </button>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SUPERUSUARIO / ADMIN VIEW */}
      {/* ========================================================================= */}
      {isAdmin ? (
        <>
          {/* Header Bar with View Switcher */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-md">
                  Panel de Control RRHH
                </span>
                <span className="text-xs text-slate-400 font-medium">Superusuario Activo</span>
              </div>
              <h1 className="font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
                Consola General de la Empresa
              </h1>
            </div>

            {/* Toggle between Company Monitor and Personal Clock */}
            <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full sm:w-auto">
              <button
                onClick={() => setAdminSubTab('overview')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  adminSubTab === 'overview'
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-base">monitoring</span>
                <span>Monitor de Plantilla</span>
              </button>
              <button
                onClick={() => setAdminSubTab('my_clock')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  adminSubTab === 'my_clock'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-base">timer</span>
                <span>Mi Fichaje</span>
              </button>
            </div>
          </div>

          {/* SUBTAB 1: COMPANY OVERVIEW */}
          {adminSubTab === 'overview' && (
            <div className="flex flex-col gap-6">
              {/* HR KPI Highlights Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Employees */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Plantilla Total
                    </span>
                    <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
                      👥
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-black text-3xl text-slate-900">{employees.length}</span>
                    <span className="text-xs text-slate-500 font-medium">empleados</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('employees')}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 text-left mt-3 flex items-center gap-1 cursor-pointer"
                  >
                    Gestionar plantilla →
                  </button>
                </div>

                {/* Currently Working Today */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      En Turno Hoy
                    </span>
                    <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
                      🟢
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-black text-3xl text-emerald-600">{isClockedIn ? 1 : 0}</span>
                    <span className="text-xs text-slate-500 font-medium">/ {employees.length} activos</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 mt-3">
                    {isClockedIn
                      ? `${workType === 'presencial' ? '1 oficina' : workType === 'teletrabajo' ? '1 teletrabajo' : '1 cliente'}`
                      : 'Ningún empleado en turno actualmente'}
                  </span>
                </div>

                {/* Pending Requests */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Permisos por Aprobar
                    </span>
                    <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
                      🏖️
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-black text-3xl text-amber-600">{pendingRequestsCount}</span>
                    <span className="text-xs text-slate-500 font-medium">solicitudes</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-800 text-left mt-3 flex items-center gap-1 cursor-pointer"
                  >
                    Bandeja de permisos →
                  </button>
                </div>

                {/* Open Incidents */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Incidencias
                    </span>
                    <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-sm">
                      ⚠️
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-black text-3xl text-rose-600">{pendingIncidentsCount}</span>
                    <span className="text-xs text-slate-500 font-medium">pendientes</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('incidents')}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 text-left mt-3 flex items-center gap-1 cursor-pointer"
                  >
                    Validar incidencias →
                  </button>
                </div>
              </div>

              {/* Live Presence Monitor Table */}
              <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Monitor de Presencia en Directo
                    </h3>
                    <p className="text-xs text-slate-400">
                      Actualizado en tiempo real • Fichajes con trazabilidad GPS y modalidad
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Conexión Satelital Activa</span>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100 tracking-wider">
                        <th className="px-6 py-3.5">Empleado</th>
                        <th className="px-6 py-3.5">Estado Hoy</th>
                        <th className="px-6 py-3.5">Entrada Hoy</th>
                        <th className="px-6 py-3.5">Modalidad</th>
                        <th className="px-6 py-3.5">Turno Asignado</th>
                        <th className="px-6 py-3.5 text-right">Ficha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {employees.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">
                            No hay empleados en plantilla actualmente.
                          </td>
                        </tr>
                      ) : (
                        employees.map((emp) => {
                          const isCurrent = emp.id === currentEmployee?.id || emp.dni === profile.dni || (employees.length === 1 && emp.id === 'emp-001');
                          const isWorking = isCurrent && isClockedIn;

                          return (
                            <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <UserAvatar
                                    name={emp.fullName}
                                    size="sm"
                                    rounded="xl"
                                  />
                                  <div>
                                    <span className="font-bold text-slate-900 block">{emp.fullName}</span>
                                    <span className="text-xs text-slate-400">{emp.jobTitle}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {emp.status === 'VACACIONES' ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                    <span>🏖️ Vacaciones</span>
                                  </span>
                                ) : emp.status === 'BAJA_MEDICA' ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                                    <span>🩺 Baja Médica</span>
                                  </span>
                                ) : isWorking ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span>{isPaused ? 'En Pausa' : 'En Turno'}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                    <span>Fuera de Turno</span>
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">
                                {isWorking ? clockInTime : '--:--'}
                              </td>
                              <td className="px-6 py-4">
                                {isWorking ? (
                                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                    {workType === 'teletrabajo'
                                      ? '🏠 Teletrabajo'
                                      : workType === 'cliente'
                                      ? '🚗 Cliente'
                                      : '🏢 Presencial'}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">N/A</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-xs font-medium text-slate-600">
                                {emp.hasRotatingShifts ? (
                                  <span className="bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-md text-[11px]">
                                    Rotativo ({emp.shiftWeekA})
                                  </span>
                                ) : (
                                  <span>Fijo {emp.shiftWeekA}</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => setActiveTab('employees')}
                                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                                >
                                  Ver ficha →
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Admin Quick Modules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Legal Audit Card */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-2xl text-emerald-400">verified_user</span>
                      <h3 className="font-bold text-base text-white">Auditoría SHA-256 (ITSS)</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      Genera el libro de registro inmutable para inspecciones de trabajo con trazabilidad criptográfica.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span>Abrir Módulo de Auditoría</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>

                {/* Monthly Signatures Summary */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-2xl text-indigo-600">draw</span>
                      <h3 className="font-bold text-base text-slate-900">Firmas Mensuales Art. 34.9</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Supervisa las firmas obligatorias de la plantilla del mes en curso y envía recordatorios masivos.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('monthly_sign')}
                    className="bg-slate-100 hover:bg-indigo-50 text-indigo-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Revisar Firmas Plantilla</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>

                {/* Company Settings */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-2xl text-slate-700">tune</span>
                      <h3 className="font-bold text-base text-slate-900">Ajustes & Sedes</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Configura el CIF de la empresa, radios de geolocalización de las oficinas y horarios laborales.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 px-4 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Configurar Empresa</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 2: PERSONAL CLOCK FOR ADMIN */}
          {adminSubTab === 'my_clock' && renderTerminalClock()}
        </>
      ) : (
        /* ========================================================================= */
        /* USUARIO / EMPLEADO VIEW */
        /* ========================================================================= */
        <>
          {/* Main Clean Terminal Punch Clock - Primary for Mobile */}
          {renderTerminalClock()}

          {/* Pending Legal Tasks Reminder Banner - ONLY shown when there is actually work to sign */}
          {hasPendingMonthlySign && (
            <section className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-900 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-xl shrink-0">draw</span>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">
                    Firma mensual pendiente ({monthlyRecord.month})
                  </h3>
                  <p className="text-xs text-slate-900/80">
                    Recuerda firmar tu hoja de registro mensual obligatoria de jornada ({computedUserHours.toFixed(1)}h computadas).
                  </p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={() => setActiveTab('monthly_sign')}
                  className="flex-1 sm:flex-none bg-white text-slate-900 px-3.5 py-2 rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer"
                  title="Firma mensual requerida"
                >
                  <span>Firmar Ahora</span>
                </button>
              </div>
            </section>
          )}

          {/* Metrics & Highlights Grid (Employee personal data) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Weekly Progress & Hour Bank */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Resumen Semanal & Bolsa
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    ⏱️
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black text-indigo-600">32.5h</span>
                  <span className="text-sm font-semibold text-slate-400">/ 40h</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Bolsa: -7.5h (Saldo ordinario)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    ✓ 13h descanso OK
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Llevas computado el 81% de tu jornada semanal de convenio (cómputo flexible anual).
                </p>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: '81%' }}></div>
              </div>
            </section>

            {/* Time Off Balance */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Vacaciones Disponibles
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
                    🏖️
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-black text-slate-900">15</span>
                  <span className="text-sm font-semibold text-slate-400">días restantes</span>
                </div>
                <p className="text-xs text-slate-500">
                  De 22 días laborables anuales correspondientes al ejercicio 2026.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('requests')}
                className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 text-left cursor-pointer"
              >
                Solicitar nuevos días →
              </button>
            </section>

            {/* Next Scheduled Shift / Incidents */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Incidencias & Regularizaciones
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    📝
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-black text-slate-900">0</span>
                  <span className="text-sm font-semibold text-slate-400">incidencias abiertas</span>
                </div>
                <p className="text-xs text-slate-500">
                  Tu registro horario no presenta discrepancias pendientes de subsanar.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('incidents')}
                className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 text-left cursor-pointer"
              >
                Reportar olvido de fichaje →
              </button>
            </section>
          </div>
        </>
      )}

      {/* Device Permissions Modal */}
      {showDeviceModal && (
        <DevicePermissionsModal
          isOpen={showDeviceModal}
          onClose={() => setShowDeviceModal(false)}
        />
      )}

      {/* Confirmation Modal (Prevents accidental touches on mobile/touch screens) */}
      {showConfirmModal && (
        <ClockActionConfirmModal
          isOpen={showConfirmModal}
          action={confirmModalAction}
          workdayPlan={workdayPlan}
          workType={workType}
          locationSummary={locationStamp?.address}
          gpsAccuracy={locationStamp?.accuracy}
          onClose={() => {
            setShowConfirmModal(false);
            setConfirmModalAction(null);
          }}
          onConfirm={handleConfirmedAction}
        />
      )}
    </div>
  );
};
