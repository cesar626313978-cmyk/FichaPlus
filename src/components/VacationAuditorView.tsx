import React, { useState, useMemo, useEffect } from 'react';
import { EmployeeRecord, TimeOffRequest } from '../types';
import { UserAvatar } from './UserAvatar';
import { getEffectiveSaturdayPlan, doesEmployeeWorkSaturday } from '../utils/shiftUtils';
import {
  computeEmployeeVacationAudit,
  EmployeeVacationWeekendAudit,
  VacationDayDetail,
  parseLocalDate,
  formatLocalDate,
} from '../utils/vacationWeekendUtils';

interface VacationAuditorViewProps {
  employees: EmployeeRecord[];
  timeOffRequests: TimeOffRequest[];
  currentEmployee?: EmployeeRecord;
  isAdmin: boolean;
  onSelectEmployeeToPlan?: (empId: string) => void;
  onOpenStaffCalendar?: () => void;
}

export const VacationAuditorView: React.FC<VacationAuditorViewProps> = ({
  employees,
  timeOffRequests,
  currentEmployee,
  isAdmin,
  onSelectEmployeeToPlan,
  onOpenStaffCalendar,
}) => {
  // Selected employee
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    currentEmployee?.id || employees[0]?.id || ''
  );

  // Selected year
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // View mode: 'periods' (detailed day strips) vs 'calendar' (monthly interactive grid)
  const [viewMode, setViewMode] = useState<'periods' | 'calendar'>('periods');

  // Selected calendar month (0 = Enero, 11 = Diciembre)
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  // Manual Saturday overrides saved in localStorage (keyed by "empId_YYYY-MM-DD")
  const [satOverrides, setSatOverrides] = useState<Record<string, 'LABORABLE' | 'LIBRE'>>(() => {
    try {
      const saved = localStorage.getItem('fichaplus_vacation_sat_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveOverride = (dateStr: string, newType: 'LABORABLE' | 'LIBRE') => {
    const key = `${selectedEmpId}_${dateStr}`;
    const updated = { ...satOverrides, [key]: newType };
    setSatOverrides(updated);
    try {
      localStorage.setItem('fichaplus_vacation_sat_overrides', JSON.stringify(updated));
    } catch {}
  };

  const removeOverride = (dateStr: string) => {
    const key = `${selectedEmpId}_${dateStr}`;
    const copy = { ...satOverrides };
    delete copy[key];
    setSatOverrides(copy);
    try {
      localStorage.setItem('fichaplus_vacation_sat_overrides', JSON.stringify(copy));
    } catch {}
  };

  const targetEmp = useMemo(() => {
    return employees.find((e) => e.id === selectedEmpId) || currentEmployee || employees[0];
  }, [employees, selectedEmpId, currentEmployee]);

  // Extract overrides for current employee
  const currentEmpOverrides = useMemo(() => {
    const map: Record<string, 'LABORABLE' | 'LIBRE'> = {};
    const prefix = `${selectedEmpId}_`;
    Object.entries(satOverrides).forEach(([k, v]) => {
      if (k.startsWith(prefix)) {
        map[k.replace(prefix, '')] = v;
      }
    });
    return map;
  }, [satOverrides, selectedEmpId]);

  // Compute full audit
  const audit: EmployeeVacationWeekendAudit = useMemo(() => {
    if (!targetEmp) {
      return {
        employeeId: '',
        employeeName: '',
        year: selectedYear,
        totalVacationDaysAllocated: 30,
        totalVacationDaysUsed: 0,
        totalVacationDaysRemaining: 30,
        periods: [],
        totalFullWeekends: 0,
        workingSaturdaysUsed: 0,
        offSaturdaysUsed: 0,
        targetFullWeekends: 4,
        targetWorkingSaturdays: 2,
        targetOffSaturdays: 2,
        isRuleSatisfied: false,
        missingFullWeekends: 4,
        missingWorkingSaturdays: 2,
        missingOffSaturdays: 2,
        excessWorkingSaturdays: 0,
        excessOffSaturdays: 0,
        diagnosticMessage: 'Selecciona un empleado',
        diagnosticLevel: 'INFO',
      };
    }
    return computeEmployeeVacationAudit(targetEmp, timeOffRequests, selectedYear, currentEmpOverrides);
  }, [targetEmp, timeOffRequests, selectedYear, currentEmpOverrides]);

  // Saturday plan info
  const saturdayPlan = targetEmp ? getEffectiveSaturdayPlan(targetEmp) : 'NO';
  const saturdayPlanLabel = useMemo(() => {
    switch (saturdayPlan) {
      case 'ALTERNO_A':
        return 'Sábados Alternos (Semana A)';
      case 'ALTERNO_B':
        return 'Sábados Alternos (Semana B)';
      case 'TODOS':
        return 'Todos los Sábados';
      case 'NO':
      default:
        return 'No trabaja Sábados';
    }
  }, [saturdayPlan]);

  // Map of all vacation dates for quick calendar lookup
  const vacationDateMap = useMemo(() => {
    const map = new Map<string, VacationDayDetail>();
    audit.periods.forEach((p) => {
      p.days.forEach((d) => {
        map.set(d.dateStr, d);
      });
    });
    return map;
  }, [audit.periods]);

  // Calendar matrix generator for selectedMonth & selectedYear
  const calendarMatrix = useMemo(() => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);

    // Day of week for first day (0=Dom, 1=Lun, ..., 6=Sáb)
    // Convert to Monday=0 .. Sunday=6
    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDays = lastDayOfMonth.getDate();

    const weeks: Array<Array<{ date: Date; dateStr: string; dayNum: number; isCurrentMonth: boolean; detail?: VacationDayDetail; isSaturday: boolean; isSunday: boolean; worksSatByDefault: boolean }>> = [];
    let currentWeek: Array<{ date: Date; dateStr: string; dayNum: number; isCurrentMonth: boolean; detail?: VacationDayDetail; isSaturday: boolean; isSunday: boolean; worksSatByDefault: boolean }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(selectedYear, selectedMonth - 1, dayNum);
      const dStr = formatLocalDate(d);
      currentWeek.push({
        date: d,
        dateStr: dStr,
        dayNum,
        isCurrentMonth: false,
        isSaturday: d.getDay() === 6,
        isSunday: d.getDay() === 0,
        worksSatByDefault: d.getDay() === 6 && targetEmp ? doesEmployeeWorkSaturday(targetEmp, d) : false,
      });
    }

    // Days of current month
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(selectedYear, selectedMonth, day);
      const dStr = formatLocalDate(d);
      const isSat = d.getDay() === 6;
      const isSun = d.getDay() === 0;
      const worksSatByDefault = isSat && targetEmp ? doesEmployeeWorkSaturday(targetEmp, d) : false;
      const detail = vacationDateMap.get(dStr);

      currentWeek.push({
        date: d,
        dateStr: dStr,
        dayNum: day,
        isCurrentMonth: true,
        detail,
        isSaturday: isSat,
        isSunday: isSun,
        worksSatByDefault,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Next month padding
    if (currentWeek.length > 0) {
      let nextMonthDay = 1;
      while (currentWeek.length < 7) {
        const d = new Date(selectedYear, selectedMonth + 1, nextMonthDay);
        const dStr = formatLocalDate(d);
        currentWeek.push({
          date: d,
          dateStr: dStr,
          dayNum: nextMonthDay,
          isCurrentMonth: false,
          isSaturday: d.getDay() === 6,
          isSunday: d.getDay() === 0,
          worksSatByDefault: d.getDay() === 6 && targetEmp ? doesEmployeeWorkSaturday(targetEmp, d) : false,
        });
        nextMonthDay++;
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [selectedYear, selectedMonth, targetEmp, vacationDateMap]);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: Employee Selection & Mode */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <UserAvatar name={targetEmp?.fullName || 'Empleado'} size="lg" rounded="2xl" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-slate-900">{targetEmp?.fullName}</h2>
              <span className="bg-indigo-50 border border-indigo-200/80 text-indigo-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {targetEmp?.department || 'General'}
              </span>
              <span className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                🗓️ Turno: {saturdayPlanLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Auditoría de regla: <strong>30 días anuales</strong> con <strong>4 fines de semana completos</strong> (2 sábados laborables de turno + 2 sábados libres).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center flex-wrap">
          {/* Year selector */}
          <div className="flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200/70">
            {[2025, 2026, 2027].map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedYear === y
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          {/* Employee dropdown for Admin */}
          {isAdmin && employees.length > 1 && (
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} ({e.department || 'General'})
                </option>
              ))}
            </select>
          )}

          {onOpenStaffCalendar && (
            <button
              onClick={onOpenStaffCalendar}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Abrir hoja imprimible con toda la plantilla"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>Hoja Imprimible Plantilla</span>
            </button>
          )}

          {isAdmin && onSelectEmployeeToPlan && (
            <button
              onClick={() => onSelectEmployeeToPlan(targetEmp.id)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              <span>Planificar Vacaciones</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Pillars Status Dashboard (Rule Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Vacation Days */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              1. Días de Vacaciones
            </span>
            <span className="text-base">🌴</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900">{audit.totalVacationDaysUsed}</span>
              <span className="text-sm font-bold text-slate-400">/ {audit.totalVacationDaysAllocated} días</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  audit.totalVacationDaysUsed > audit.totalVacationDaysAllocated
                    ? 'bg-rose-500'
                    : audit.totalVacationDaysUsed === audit.totalVacationDaysAllocated
                    ? 'bg-emerald-500'
                    : 'bg-indigo-600'
                }`}
                style={{
                  width: `${Math.min(100, (audit.totalVacationDaysUsed / audit.totalVacationDaysAllocated) * 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Disponibles restantes:</span>
            <span className="font-bold text-indigo-700">{audit.totalVacationDaysRemaining} días</span>
          </div>
        </div>

        {/* Card 2: Full Weekends (Sat + Sun) */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              2. Fines de Semana (S+D)
            </span>
            <span className="text-base">🌟</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900">{audit.totalFullWeekends}</span>
              <span className="text-sm font-bold text-slate-400">/ {audit.targetFullWeekends} completos</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  audit.totalFullWeekends === 4
                    ? 'bg-emerald-500'
                    : audit.totalFullWeekends > 4
                    ? 'bg-amber-500'
                    : 'bg-purple-600'
                }`}
                style={{ width: `${Math.min(100, (audit.totalFullWeekends / 4) * 100)}%` }}
              />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Objetivo:</span>
            <span
              className={`font-bold ${
                audit.totalFullWeekends === 4
                  ? 'text-emerald-700'
                  : audit.totalFullWeekends > 4
                  ? 'text-amber-700'
                  : 'text-purple-700'
              }`}
            >
              {audit.totalFullWeekends === 4
                ? '✓ 4 de 4 completos'
                : audit.totalFullWeekends > 4
                ? `Excede (${audit.totalFullWeekends} fds)`
                : `Faltan ${audit.missingFullWeekends} fds`}
            </span>
          </div>
        </div>

        {/* Card 3: Working Saturdays (Le tocaba trabajar) */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              3. Sábados Laborables
            </span>
            <span className="text-base">💼</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-amber-700">{audit.workingSaturdaysUsed}</span>
              <span className="text-sm font-bold text-slate-400">/ {audit.targetWorkingSaturdays} requeridos</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  audit.workingSaturdaysUsed === 2
                    ? 'bg-emerald-500'
                    : audit.workingSaturdaysUsed > 2
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, (audit.workingSaturdaysUsed / 2) * 100)}%` }}
              />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">De turno / guardia:</span>
            <span
              className={`font-bold ${
                audit.workingSaturdaysUsed === 2
                  ? 'text-emerald-700'
                  : audit.workingSaturdaysUsed > 2
                  ? 'text-rose-700'
                  : 'text-amber-700'
              }`}
            >
              {audit.workingSaturdaysUsed === 2
                ? '✓ 2 de 2 cumplidos'
                : audit.workingSaturdaysUsed > 2
                ? `Excede (+${audit.excessWorkingSaturdays})`
                : `Faltan ${audit.missingWorkingSaturdays}`}
            </span>
          </div>
        </div>

        {/* Card 4: Off Saturdays (No le tocaba trabajar) */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              4. Sábados Libres
            </span>
            <span className="text-base">🏖️</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-emerald-700">{audit.offSaturdaysUsed}</span>
              <span className="text-sm font-bold text-slate-400">/ {audit.targetOffSaturdays} requeridos</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  audit.offSaturdaysUsed === 2
                    ? 'bg-emerald-500'
                    : audit.offSaturdaysUsed > 2
                    ? 'bg-rose-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (audit.offSaturdaysUsed / 2) * 100)}%` }}
              />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">De descanso habitual:</span>
            <span
              className={`font-bold ${
                audit.offSaturdaysUsed === 2
                  ? 'text-emerald-700'
                  : audit.offSaturdaysUsed > 2
                  ? 'text-rose-700'
                  : 'text-emerald-700'
              }`}
            >
              {audit.offSaturdaysUsed === 2
                ? '✓ 2 de 2 cumplidos'
                : audit.offSaturdaysUsed > 2
                ? `Excede (+${audit.excessOffSaturdays})`
                : `Faltan ${audit.missingOffSaturdays}`}
            </span>
          </div>
        </div>
      </div>

      {/* Compliance Diagnostic Banner */}
      <div
        className={`rounded-3xl p-5 border flex items-start gap-3.5 transition-all ${
          audit.diagnosticLevel === 'SUCCESS'
            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
            : audit.diagnosticLevel === 'WARNING'
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : 'bg-blue-50/90 border-blue-200 text-blue-950'
        }`}
      >
        <span className="text-2xl shrink-0 mt-0.5">
          {audit.diagnosticLevel === 'SUCCESS' ? '🎉' : audit.diagnosticLevel === 'WARNING' ? '⚖️' : 'ℹ️'}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-black text-sm">
              {audit.diagnosticLevel === 'SUCCESS'
                ? 'Normativa de Fines de Semana Cumplida al 100%'
                : audit.diagnosticLevel === 'WARNING'
                ? 'Estado del Cómputo de Fines de Semana y Sábados'
                : 'Planificación de Vacaciones Anual'}
            </h4>
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                audit.isRuleSatisfied
                  ? 'bg-emerald-200 border-emerald-300 text-emerald-900'
                  : 'bg-amber-200 border-amber-300 text-amber-900'
              }`}
            >
              {audit.isRuleSatisfied ? 'Regla Válida' : 'En Curso'}
            </span>
          </div>
          <p className="text-xs mt-1 leading-relaxed">{audit.diagnosticMessage}</p>

          <div className="mt-2.5 pt-2 border-t border-black/10 flex items-center gap-4 text-[11px] font-semibold flex-wrap">
            <span>
              📋 <strong>Regla general:</strong> 30 días de vacaciones deben incluir 4 fines de semana (S+D).
            </span>
            <span>
              💼 <strong>2 Sábados laborables</strong> (le tocaba trabajar).
            </span>
            <span>
              🏖️ <strong>2 Sábados libres</strong> (le tocaba descanso).
            </span>
          </div>
        </div>
      </div>

      {/* View Switcher Controls (Day-by-Day Strip vs Monthly Calendar) */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('periods')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'periods'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-sm">view_timeline</span>
            <span>Tiras de Días por Periodo ({audit.periods.length})</span>
          </button>

          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-sm">calendar_month</span>
            <span>Calendario Mensual Interactivo</span>
          </button>
        </div>

        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          {viewMode === 'periods'
            ? 'Haz clic en cualquier sábado para alternar si le tocaba o no trabajar'
            : 'Haz clic en el calendario para explorar cualquier fecha'}
        </span>
      </div>

      {/* MODE 1: Day-by-Day Strips by Vacation Period */}
      {viewMode === 'periods' && (
        <div className="space-y-4">
          {audit.periods.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200 shadow-sm">
              <span className="text-4xl block mb-2">🏖️</span>
              <h3 className="font-bold text-base text-slate-800">
                Sin vacaciones aprobadas para {targetEmp?.fullName} en {selectedYear}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Utiliza el formulario de planificación para registrar vacaciones. El sistema identificará automáticamente los días de la semana y si los sábados correspondían a turno de trabajo o descanso.
              </p>
              {isAdmin && onSelectEmployeeToPlan && (
                <button
                  onClick={() => onSelectEmployeeToPlan(targetEmp.id)}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Planificar Primer Periodo</span>
                </button>
              )}
            </div>
          ) : (
            audit.periods.map((period, idx) => (
              <div
                key={period.requestId}
                className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 hover:border-slate-200 transition-all space-y-4"
              >
                {/* Period Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-indigo-100 text-indigo-900 font-black text-xs px-2.5 py-0.5 rounded-lg font-mono">
                        Periodo #{idx + 1}
                      </span>
                      <h4 className="font-black text-sm text-slate-900">
                        Del {period.startDate} al {period.endDate}
                      </h4>
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs px-2 py-0.5 rounded-lg">
                        {period.daysCount} días computables
                      </span>
                    </div>
                    {period.notes && (
                      <p className="text-xs text-slate-500 italic mt-0.5">💬 "{period.notes}"</p>
                    )}
                  </div>

                  {/* Period weekend badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {period.fullWeekendsCount > 0 && (
                      <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1">
                        <span>🌟</span>
                        <span>{period.fullWeekendsCount} Fin(es) de semana completo(s)</span>
                      </span>
                    )}

                    {period.workingSaturdaysCount > 0 && (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1">
                        <span>💼</span>
                        <span>{period.workingSaturdaysCount} Sábado(s) laborable(s)</span>
                      </span>
                    )}

                    {period.offSaturdaysCount > 0 && (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1">
                        <span>🏖️</span>
                        <span>{period.offSaturdaysCount} Sábado(s) libre(s)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Day-by-Day Interactive Strip */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Tira de Días de la Semana:
                  </span>

                  <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                    {period.days.map((day) => {
                      const isWorkingSat = day.isSaturday && day.saturdayType === 'LABORABLE';
                      const isOffSat = day.isSaturday && day.saturdayType === 'LIBRE';
                      const hasOverride = currentEmpOverrides[day.dateStr] !== undefined;

                      return (
                        <div
                          key={day.dateStr}
                          className={`shrink-0 rounded-2xl p-2.5 flex flex-col items-center text-center transition-all min-w-[76px] border ${
                            day.isSaturday
                              ? isWorkingSat
                                ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/30'
                                : 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-400/30'
                              : day.isSunday
                              ? 'bg-purple-50/90 border-purple-200 ring-1 ring-purple-300/30'
                              : 'bg-slate-50 border-slate-200/80 text-slate-700'
                          }`}
                        >
                          {/* Day of Week Label */}
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider ${
                              day.isSaturday
                                ? isWorkingSat
                                  ? 'text-amber-800'
                                  : 'text-emerald-800'
                                : day.isSunday
                                ? 'text-purple-800'
                                : 'text-slate-400'
                            }`}
                          >
                            {day.dayOfWeekShort}
                          </span>

                          {/* Day Number */}
                          <span
                            className={`text-lg font-black my-0.5 ${
                              day.isSaturday
                                ? isWorkingSat
                                  ? 'text-amber-950'
                                  : 'text-emerald-950'
                                : day.isSunday
                                ? 'text-purple-950'
                                : 'text-slate-800'
                            }`}
                          >
                            {day.dayNumber}
                          </span>

                          {/* Month abbreviation */}
                          <span className="text-[9px] font-semibold text-slate-400 mb-1">
                            {day.monthName.slice(0, 3)}
                          </span>

                          {/* Saturday specific badge & toggle */}
                          {day.isSaturday && (
                            <div className="mt-1 flex flex-col items-center gap-1 w-full">
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded-md leading-tight text-center ${
                                  isWorkingSat
                                    ? 'bg-amber-200 text-amber-950'
                                    : 'bg-emerald-200 text-emerald-950'
                                }`}
                              >
                                {isWorkingSat ? '💼 Laborable' : '🏖️ Libre'}
                              </span>

                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextType = isWorkingSat ? 'LIBRE' : 'LABORABLE';
                                    saveOverride(day.dateStr, nextType);
                                  }}
                                  title="Alternar si este sábado tocaba o no trabajar"
                                  className="text-[9px] font-bold text-indigo-600 hover:text-indigo-900 bg-white border border-indigo-200 px-1 py-0.5 rounded shadow-2xs hover:bg-indigo-50 transition-colors cursor-pointer w-full"
                                >
                                  🔄 Cambiar
                                </button>
                              )}

                              {hasOverride && isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => removeOverride(day.dateStr)}
                                  className="text-[8px] text-slate-400 hover:text-rose-600 underline cursor-pointer"
                                  title="Restablecer al cálculo automático según turno"
                                >
                                  Auto
                                </button>
                              )}
                            </div>
                          )}

                          {day.isSunday && (
                            <span className="mt-1 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-purple-200 text-purple-950">
                              🌅 Domingo
                            </span>
                          )}

                          {!day.isWeekend && (
                            <span className="mt-1 text-[9px] font-bold text-slate-400">
                              Laborable
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODE 2: Interactive Monthly Calendar Grid */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
          {/* Month Selector Carousel */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <button
              onClick={() => setSelectedMonth((m) => (m === 0 ? 11 : m - 1))}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-black cursor-pointer text-xs"
            >
              ◀ Mes Anterior
            </button>

            <div className="text-center">
              <h3 className="font-black text-lg text-slate-900">
                {monthNames[selectedMonth]} {selectedYear}
              </h3>
              <p className="text-xs text-slate-400">
                Vista de calendario mensual con resaltado de sábados laborables / libres
              </p>
            </div>

            <button
              onClick={() => setSelectedMonth((m) => (m === 11 ? 0 : m + 1))}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-black cursor-pointer text-xs"
            >
              Mes Siguiente ▶
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs font-semibold flex-wrap justify-center bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-amber-400" />
              <span>Vacaciones en Sábado Laborable (💼 Le tocaba trabajar)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-emerald-400" />
              <span>Vacaciones en Sábado Libre (🏖️ Le tocaba descanso)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-purple-400" />
              <span>Vacaciones en Domingo (🌅)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-indigo-500" />
              <span>Vacaciones días laborables (L-V)</span>
            </span>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              {/* Day of week headers */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                {['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'].map((h, i) => (
                  <div
                    key={h}
                    className={`py-2 text-[11px] font-black uppercase tracking-wider rounded-xl ${
                      i === 5
                        ? 'bg-amber-50 text-amber-900 border border-amber-200/60'
                        : i === 6
                        ? 'bg-purple-50 text-purple-900 border border-purple-200/60'
                        : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              <div className="space-y-2">
                {calendarMatrix.map((week, wIdx) => (
                  <div key={wIdx} className="grid grid-cols-7 gap-2">
                    {week.map((cell) => {
                      const isVac = cell.detail !== undefined;
                      const isSat = cell.isSaturday;
                      const isSun = cell.isSunday;
                      const isWorkingSat = isVac ? cell.detail?.saturdayType === 'LABORABLE' : cell.worksSatByDefault;

                      return (
                        <div
                          key={cell.dateStr}
                          className={`min-h-[74px] p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                            !cell.isCurrentMonth
                              ? 'bg-slate-50/50 border-slate-100 text-slate-300 opacity-40'
                              : isVac
                              ? isSat
                                ? isWorkingSat
                                  ? 'bg-amber-100 border-amber-300 ring-2 ring-amber-400 text-amber-950 shadow-2xs'
                                  : 'bg-emerald-100 border-emerald-300 ring-2 ring-emerald-400 text-emerald-950 shadow-2xs'
                                : isSun
                                ? 'bg-purple-100 border-purple-300 ring-1 ring-purple-400 text-purple-950'
                                : 'bg-indigo-50 border-indigo-200 text-indigo-950 font-bold'
                              : isSat
                              ? cell.worksSatByDefault
                                ? 'bg-amber-50/40 border-amber-200/60 text-amber-900'
                                : 'bg-slate-50/60 border-slate-200/60 text-slate-600'
                              : isSun
                              ? 'bg-purple-50/30 border-purple-100 text-purple-900'
                              : 'bg-white border-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-black ${
                                isVac ? 'text-indigo-950' : cell.isCurrentMonth ? 'text-slate-800' : 'text-slate-300'
                              }`}
                            >
                              {cell.dayNum}
                            </span>

                            {isVac && (
                              <span className="text-[10px]" title="Día de Vacaciones">
                                🌴
                              </span>
                            )}
                          </div>

                          {/* Cell status label */}
                          {cell.isCurrentMonth && (
                            <div className="mt-1">
                              {isVac ? (
                                isSat ? (
                                  <div className="space-y-0.5">
                                    <span
                                      className={`text-[9px] font-black px-1.5 py-0.5 rounded block text-center leading-tight ${
                                        isWorkingSat
                                          ? 'bg-amber-200 text-amber-950'
                                          : 'bg-emerald-200 text-emerald-950'
                                      }`}
                                    >
                                      {isWorkingSat ? '💼 Laborable' : '🏖️ Libre'}
                                    </span>
                                    {isAdmin && (
                                      <button
                                        onClick={() => {
                                          const next = isWorkingSat ? 'LIBRE' : 'LABORABLE';
                                          saveOverride(cell.dateStr, next);
                                        }}
                                        className="text-[8px] text-indigo-700 hover:underline block text-center font-bold w-full cursor-pointer"
                                      >
                                        Alternar
                                      </button>
                                    )}
                                  </div>
                                ) : isSun ? (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-200 text-purple-950 block text-center">
                                    Domingo
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-indigo-700 block text-center">
                                    Vacaciones
                                  </span>
                                )
                              ) : isSat ? (
                                <span className="text-[9px] font-semibold text-slate-400 block text-center">
                                  {cell.worksSatByDefault ? 'Turno Sáb' : 'Libre'}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
