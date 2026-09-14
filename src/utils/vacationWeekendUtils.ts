import { EmployeeRecord, TimeOffRequest } from '../types';
import { doesEmployeeWorkSaturday, getEffectiveSaturdayPlan } from './shiftUtils';

export interface VacationDayDetail {
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  dayOfWeekName: string; // 'Lunes', 'Martes', ...
  dayOfWeekShort: string; // 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'
  dayNumber: number;
  monthName: string;
  isSaturday: boolean;
  isSunday: boolean;
  isWeekend: boolean;
  saturdayType?: 'LABORABLE' | 'LIBRE'; // Le tocaba trabajar vs Le tocaba libre
  saturdayShiftDesc?: string;
  isFullWeekendPart?: boolean; // Part of a Sat+Sun pair within vacation
  weekendId?: string; // e.g. "fds-2026-09-26"
}

export interface VacationPeriodAnalysis {
  requestId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  notes?: string;
  reviewedBy?: string;
  createdAt?: string;
  days: VacationDayDetail[];
  fullWeekendsCount: number; // Number of complete weekends (Sat + Sun)
  workingSaturdaysCount: number; // Sábados que tocaba trabajar
  offSaturdaysCount: number; // Sábados que no tocaba trabajar
  sundaysCount: number;
}

export interface EmployeeVacationWeekendAudit {
  employeeId: string;
  employeeName: string;
  year: number;
  totalVacationDaysAllocated: number; // Default: 30
  totalVacationDaysUsed: number;
  totalVacationDaysRemaining: number;
  periods: VacationPeriodAnalysis[];

  // The Rule of 4 Weekends (2 working Saturdays + 2 off Saturdays)
  totalFullWeekends: number; // Target: 4
  workingSaturdaysUsed: number; // Target: 2
  offSaturdaysUsed: number; // Target: 2

  // Targets
  targetFullWeekends: number; // 4
  targetWorkingSaturdays: number; // 2
  targetOffSaturdays: number; // 2

  // Compliance calculations
  isRuleSatisfied: boolean;
  missingFullWeekends: number;
  missingWorkingSaturdays: number;
  missingOffSaturdays: number;
  excessWorkingSaturdays: number;
  excessOffSaturdays: number;
  diagnosticMessage: string;
  diagnosticLevel: 'SUCCESS' | 'WARNING' | 'INFO';
}

const DAY_NAMES_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_SHORT_ES = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Parses a YYYY-MM-DD string as a local Date at 00:00:00 without UTC timezone shifts.
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Formats a Date object to YYYY-MM-DD string.
 */
export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Analyzes a single date range and returns a day-by-day breakdown with Saturday & Sunday classifications.
 */
export function analyzeVacationPeriodDays(
  startDateStr: string,
  endDateStr: string,
  employee: EmployeeRecord | null | undefined,
  overrides?: Record<string, 'LABORABLE' | 'LIBRE'>
): VacationDayDetail[] {
  if (!startDateStr || !endDateStr) return [];

  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [];

  const days: VacationDayDetail[] = [];
  const cur = new Date(start);

  while (cur <= end) {
    const dateStr = formatLocalDate(cur);
    const dayOfWeek = cur.getDay(); // 0=Domingo, 6=Sábado
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const isWeekend = isSaturday || isSunday;

    let saturdayType: 'LABORABLE' | 'LIBRE' | undefined;
    let saturdayShiftDesc: string | undefined;

    if (isSaturday) {
      if (overrides && overrides[dateStr]) {
        saturdayType = overrides[dateStr];
      } else if (employee) {
        const works = doesEmployeeWorkSaturday(employee, cur);
        saturdayType = works ? 'LABORABLE' : 'LIBRE';
      } else {
        saturdayType = 'LIBRE';
      }

      if (employee) {
        const plan = getEffectiveSaturdayPlan(employee);
        if (saturdayType === 'LABORABLE') {
          saturdayShiftDesc = employee.saturdayShift || 'Turno de Sábado';
        } else {
          saturdayShiftDesc = plan === 'NO' ? 'No trabaja sábados' : 'Sábado libre (rotación)';
        }
      }
    }

    days.push({
      dateStr,
      dayOfWeek,
      dayOfWeekName: DAY_NAMES_ES[dayOfWeek],
      dayOfWeekShort: DAY_SHORT_ES[dayOfWeek],
      dayNumber: cur.getDate(),
      monthName: MONTH_NAMES_ES[cur.getMonth()],
      isSaturday,
      isSunday,
      isWeekend,
      saturdayType,
      saturdayShiftDesc,
    });

    cur.setDate(cur.getDate() + 1);
  }

  // Detect complete weekends (Saturday followed by consecutive Sunday within this period)
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    if (d.isSaturday && i + 1 < days.length) {
      const nextDay = days[i + 1];
      if (nextDay.isSunday) {
        const weekendId = `fds-${d.dateStr}`;
        d.isFullWeekendPart = true;
        d.weekendId = weekendId;
        nextDay.isFullWeekendPart = true;
        nextDay.weekendId = weekendId;
      }
    }
  }

  return days;
}

/**
 * Analyzes a single vacation request and counts full weekends and Saturday types.
 */
export function analyzeSingleVacationRequest(
  req: TimeOffRequest,
  employee: EmployeeRecord | null | undefined,
  overrides?: Record<string, 'LABORABLE' | 'LIBRE'>
): VacationPeriodAnalysis {
  const days = analyzeVacationPeriodDays(req.startDate, req.endDate, employee, overrides);

  let fullWeekendsCount = 0;
  let workingSaturdaysCount = 0;
  let offSaturdaysCount = 0;
  let sundaysCount = 0;

  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    if (d.isSaturday) {
      if (d.saturdayType === 'LABORABLE') {
        workingSaturdaysCount++;
      } else {
        offSaturdaysCount++;
      }

      // Check if full weekend
      if (d.isFullWeekendPart) {
        fullWeekendsCount++;
      }
    }
    if (d.isSunday) {
      sundaysCount++;
    }
  }

  return {
    requestId: req.id,
    leaveType: req.leaveType || 'Vacaciones',
    startDate: req.startDate,
    endDate: req.endDate,
    daysCount: req.daysCount || days.length,
    status: req.status,
    notes: req.notes,
    reviewedBy: req.reviewedBy,
    createdAt: req.createdAt,
    days,
    fullWeekendsCount,
    workingSaturdaysCount,
    offSaturdaysCount,
    sundaysCount,
  };
}

/**
 * Computes the full annual audit for an employee against the 30-day / 4-weekend rule:
 * - 30 days total
 * - 4 full weekends (Sábado y Domingo)
 * - 2 working Saturdays
 * - 2 off Saturdays
 */
export function computeEmployeeVacationAudit(
  employee: EmployeeRecord,
  allRequests: TimeOffRequest[],
  year: number = 2026,
  overrides?: Record<string, 'LABORABLE' | 'LIBRE'>
): EmployeeVacationWeekendAudit {
  const targetYearStr = String(year);

  // Filter approved vacation requests for this employee in the given year
  const empRequests = allRequests.filter((r) => {
    const matchesUser =
      r.userId === employee.id ||
      (employee.fullName && r.userName && r.userName.trim().toLowerCase() === employee.fullName.trim().toLowerCase());
    if (!matchesUser) return false;
    if (r.leaveType !== 'Vacaciones') return false;
    if (r.status !== 'APROBADO') return false;

    // Check year overlap
    const startYear = r.startDate ? r.startDate.slice(0, 4) : '';
    const endYear = r.endDate ? r.endDate.slice(0, 4) : '';
    return startYear === targetYearStr || endYear === targetYearStr;
  });

  const periodAnalyses: VacationPeriodAnalysis[] = empRequests.map((req) =>
    analyzeSingleVacationRequest(req, employee, overrides)
  );

  const totalVacationDaysAllocated = employee.vacationDays ?? 30;
  const totalVacationDaysUsed = periodAnalyses.reduce((sum, p) => sum + p.daysCount, 0);
  const totalVacationDaysRemaining = Math.max(0, totalVacationDaysAllocated - totalVacationDaysUsed);

  // Totals across all approved vacation periods
  const totalFullWeekends = periodAnalyses.reduce((sum, p) => sum + p.fullWeekendsCount, 0);
  const workingSaturdaysUsed = periodAnalyses.reduce((sum, p) => sum + p.workingSaturdaysCount, 0);
  const offSaturdaysUsed = periodAnalyses.reduce((sum, p) => sum + p.offSaturdaysCount, 0);

  const targetFullWeekends = 4;
  const targetWorkingSaturdays = 2;
  const targetOffSaturdays = 2;

  const missingFullWeekends = Math.max(0, targetFullWeekends - totalFullWeekends);
  const missingWorkingSaturdays = Math.max(0, targetWorkingSaturdays - workingSaturdaysUsed);
  const missingOffSaturdays = Math.max(0, targetOffSaturdays - offSaturdaysUsed);

  const excessWorkingSaturdays = Math.max(0, workingSaturdaysUsed - targetWorkingSaturdays);
  const excessOffSaturdays = Math.max(0, offSaturdaysUsed - targetOffSaturdays);

  const isRuleSatisfied =
    totalFullWeekends === targetFullWeekends &&
    workingSaturdaysUsed === targetWorkingSaturdays &&
    offSaturdaysUsed === targetOffSaturdays;

  let diagnosticMessage = '';
  let diagnosticLevel: 'SUCCESS' | 'WARNING' | 'INFO' = 'INFO';

  if (periodAnalyses.length === 0) {
    diagnosticMessage = 'Aún no se han registrado vacaciones para este año. Se deben planificar 4 fines de semana completos (2 sábados laborables + 2 libres).';
    diagnosticLevel = 'INFO';
  } else if (isRuleSatisfied) {
    diagnosticMessage = '¡Regla de vacaciones cumplida a la perfección! Registrados exactamente 4 fines de semana completos (2 sábados laborables de turno y 2 sábados de descanso).';
    diagnosticLevel = 'SUCCESS';
  } else {
    diagnosticLevel = 'WARNING';
    const parts: string[] = [];
    if (missingFullWeekends > 0) {
      parts.push(`Faltan ${missingFullWeekends} fin(es) de semana completo(s)`);
    } else if (totalFullWeekends > targetFullWeekends) {
      parts.push(`Excede fines de semana (${totalFullWeekends} de ${targetFullWeekends} máx.)`);
    }

    if (missingWorkingSaturdays > 0) {
      parts.push(`Faltan ${missingWorkingSaturdays} sábado(s) laborable(s)`);
    } else if (excessWorkingSaturdays > 0) {
      parts.push(`Tiene ${workingSaturdaysUsed} sábados laborables (+${excessWorkingSaturdays} de los 2 requeridos)`);
    }

    if (missingOffSaturdays > 0) {
      parts.push(`Faltan ${missingOffSaturdays} sábado(s) libre(s)`);
    } else if (excessOffSaturdays > 0) {
      parts.push(`Tiene ${offSaturdaysUsed} sábados libres (+${excessOffSaturdays} de los 2 requeridos)`);
    }

    diagnosticMessage = parts.join(' • ');
  }

  return {
    employeeId: employee.id,
    employeeName: employee.fullName,
    year,
    totalVacationDaysAllocated,
    totalVacationDaysUsed,
    totalVacationDaysRemaining,
    periods: periodAnalyses,
    totalFullWeekends,
    workingSaturdaysUsed,
    offSaturdaysUsed,
    targetFullWeekends,
    targetWorkingSaturdays,
    targetOffSaturdays,
    isRuleSatisfied,
    missingFullWeekends,
    missingWorkingSaturdays,
    missingOffSaturdays,
    excessWorkingSaturdays,
    excessOffSaturdays,
    diagnosticMessage,
    diagnosticLevel,
  };
}
