import { EmployeeRecord, WorkdayPlanType, DayScheduleConfig, SaturdayPlanType } from '../types';

export interface ShiftDetail {
  type: WorkdayPlanType; // 'continua' | 'partida'
  // Continua:
  cStart: string;
  cEnd: string;
  // Partida:
  t1Start: string;
  t1End: string;
  t2Start: string;
  t2End: string;
}

export interface EmployeeShiftInfo {
  hasRotatingShifts: boolean;
  rotationStartDate?: string;
  currentWeekLetter?: 'A' | 'B';
  currentPlan: WorkdayPlanType; // 'partida' | 'continua'
  activeShiftName: string; // e.g. "Continua (08:00 - 16:00)"
  activeShiftShort: string; // e.g. "Continua" or "Partida"
  scheduleSummary: string; // e.g. "Semana A: Continua (08:00 - 16:00)"
  nextWeekSummary?: string; // e.g. "Semana B: Partida (09:00 - 14:00 / 16:00 - 19:00)"
  shiftWeekA: string;
  shiftWeekB?: string;
  // Saturday & Weekend extensions
  isTodaySaturday?: boolean;
  isTodaySunday?: boolean;
  worksSaturday?: boolean;
  saturdayPlan?: SaturdayPlanType;
  saturdayShift?: string;
  isSaturdayWorkingToday?: boolean;
  nextSaturdayDate?: string;
  nextSaturdayWorking?: boolean;
  worksSunday?: boolean;
  sundayShift?: string;
  isDayOffToday?: boolean;
  todayShiftTitle?: string;
  totalWeeklyHours?: number;
}

/**
 * Checks if a shift name corresponds to a split shift (Jornada Partida / 2 Turnos)
 */
export function isShiftPartida(shiftName?: string): boolean {
  if (!shiftName) return false;
  const lower = shiftName.toLowerCase();
  return (
    lower.includes('partid') ||
    lower.includes('2 turno') ||
    lower.includes('comercio') ||
    lower.includes('dividid') ||
    lower.includes('/')
  );
}

/**
 * Calculates total minutes between two HH:MM strings (handling overnight if end < start)
 */
export function calculateMinutesBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return 0;

  const startMins = sH * 60 + sM;
  const endMins = eH * 60 + eM;

  if (endMins >= startMins) {
    return endMins - startMins;
  }
  // Overnight shift
  return 24 * 60 - startMins + endMins;
}

/**
 * Formats minutes into "Xh YYm"
 */
export function formatMinutesToHours(minutes: number): string {
  if (minutes <= 0) return '0h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Computes the total effective working minutes for a given shift string.
 */
export function computeShiftMinutes(shiftStr?: string): number {
  if (!shiftStr) return 8 * 60;
  const detail = parseShiftString(shiftStr);
  if (detail.type === 'continua') {
    return calculateMinutesBetween(detail.cStart, detail.cEnd);
  }
  const t1 = calculateMinutesBetween(detail.t1Start, detail.t1End);
  const t2 = calculateMinutesBetween(detail.t2Start, detail.t2End);
  return t1 + t2;
}

/**
 * Computes weekly working hours given weekday and weekend schedules and Saturday plan.
 */
export function computeTotalWeeklyHours(
  monFriShiftStr: string,
  worksSaturday: boolean = false,
  saturdayShiftStr?: string,
  worksSunday: boolean = false,
  sundayShiftStr?: string,
  saturdayPlan: SaturdayPlanType = worksSaturday ? 'TODOS' : 'NO'
): number {
  const weekdayDailyMins = computeShiftMinutes(monFriShiftStr);
  let totalMins = weekdayDailyMins * 5;

  if (saturdayShiftStr) {
    if (saturdayPlan === 'TODOS' || (worksSaturday && !saturdayPlan)) {
      totalMins += computeShiftMinutes(saturdayShiftStr);
    } else if (saturdayPlan === 'ALTERNO_A' || saturdayPlan === 'ALTERNO_B') {
      // 1 Saturday every 2 weeks -> half of saturday minutes on average weekly
      totalMins += Math.round(computeShiftMinutes(saturdayShiftStr) / 2);
    }
  }

  if (worksSunday && sundayShiftStr) {
    totalMins += computeShiftMinutes(sundayShiftStr);
  }

  return Number((totalMins / 60).toFixed(1));
}

/**
 * Formats a ShiftDetail into a readable descriptive string.
 */
export function formatShiftString(detail: ShiftDetail): string {
  if (detail.type === 'continua') {
    return `Continua (${detail.cStart || '08:00'} - ${detail.cEnd || '16:00'})`;
  }
  return `Partida (${detail.t1Start || '09:00'} - ${detail.t1End || '14:00'} / ${detail.t2Start || '16:00'} - ${detail.t2End || '19:00'})`;
}

/**
 * Converts a DayScheduleConfig into a formatted shift string.
 */
export function configToShiftString(cfg?: DayScheduleConfig): string {
  if (!cfg) return 'Continua (08:00 - 16:00)';
  if (cfg.type === 'continua') {
    return `Continua (${cfg.cStart || '08:00'} - ${cfg.cEnd || '16:00'})`;
  }
  return `Partida (${cfg.t1Start || '09:00'} - ${cfg.t1End || '14:00'} / ${cfg.t2Start || '16:00'} - ${cfg.t2End || '19:00'})`;
}

/**
 * Converts a ShiftDetail to DayScheduleConfig
 */
export function shiftDetailToConfig(detail: ShiftDetail, enabled: boolean = true): DayScheduleConfig {
  return {
    enabled,
    type: detail.type,
    cStart: detail.cStart,
    cEnd: detail.cEnd,
    t1Start: detail.t1Start,
    t1End: detail.t1End,
    t2Start: detail.t2Start,
    t2End: detail.t2End,
  };
}

/**
 * Parses any shift string into a structured ShiftDetail object.
 */
export function parseShiftString(str?: string): ShiftDetail {
  const defaultContinua: ShiftDetail = {
    type: 'continua',
    cStart: '08:00',
    cEnd: '16:00',
    t1Start: '09:00',
    t1End: '14:00',
    t2Start: '16:00',
    t2End: '19:00',
  };

  if (!str) return defaultContinua;

  const isPart = isShiftPartida(str);

  // Extract times in HH:MM format
  const timeRegex = /\b([0-1]?[0-9]|2[0-3]):[0-5][0-9]\b/g;
  const matches = str.match(timeRegex) || [];

  if (isPart) {
    return {
      type: 'partida',
      cStart: matches[0] || '08:00',
      cEnd: matches[1] || '16:00',
      t1Start: matches[0] || '09:00',
      t1End: matches[1] || '14:00',
      t2Start: matches[2] || '16:00',
      t2End: matches[3] || '19:00',
    };
  }

  return {
    type: 'continua',
    cStart: matches[0] || '08:00',
    cEnd: matches[1] || '16:00',
    t1Start: '09:00',
    t1End: '14:00',
    t2Start: '16:00',
    t2End: '19:00',
  };
}

/**
 * Calculates whether the given date belongs to Week A or Week B based on a rotation start date.
 * If no start date is given, uses a consistent company-wide base Monday ('2026-01-05')
 * to keep alternating weeks synchronized across all employees.
 */
export function calculateWeekAorB(rotationStartDateStr?: string, targetDate: Date = new Date()): 'A' | 'B' {
  try {
    const refStr = rotationStartDateStr || '2026-01-05';
    const start = new Date(refStr);
    if (isNaN(start.getTime())) return 'A';

    // Normalize start date to Monday 00:00
    const startMonday = new Date(start);
    const startDay = startMonday.getDay();
    const startDiff = (startDay === 0 ? -6 : 1) - startDay;
    startMonday.setDate(startMonday.getDate() + startDiff);
    startMonday.setHours(0, 0, 0, 0);

    // Normalize target date to Monday 00:00
    const targetMonday = new Date(targetDate);
    const targetDay = targetMonday.getDay();
    const targetDiff = (targetDay === 0 ? -6 : 1) - targetDay;
    targetMonday.setDate(targetMonday.getDate() + targetDiff);
    targetMonday.setHours(0, 0, 0, 0);

    const diffDays = Math.round((targetMonday.getTime() - startMonday.getTime()) / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);

    return Math.abs(diffWeeks) % 2 === 0 ? 'A' : 'B';
  } catch {
    return 'A';
  }
}

/**
 * Returns the effective Saturday planning type for an employee.
 * Backwards compatible with worksSaturday boolean.
 */
export function getEffectiveSaturdayPlan(employee?: EmployeeRecord | null): SaturdayPlanType {
  if (!employee) return 'NO';
  if (employee.saturdayPlan) return employee.saturdayPlan;
  if (employee.worksSaturday === false) return 'NO';
  if (employee.worksSaturday === true) return 'TODOS';
  return 'NO';
}

/**
 * Returns the upcoming Saturday (or today if today is Saturday).
 */
export function getNextSaturday(from: Date = new Date()): Date {
  const d = new Date(from);
  const day = d.getDay(); // 0 = Sun, 6 = Sat, 1..5 = Mon..Fri
  const daysUntil = (6 - day + 7) % 7;
  const target = new Date(d);
  target.setDate(d.getDate() + (daysUntil === 0 ? 0 : daysUntil));
  target.setHours(0, 0, 0, 0);
  return target;
}

/**
 * Determines whether an employee works on a specific Saturday date based on their saturdayPlan:
 * - 'NO': Never works Saturdays
 * - 'TODOS': Works every Saturday
 * - 'ALTERNO_A': Works on Week A Saturdays (every other Saturday)
 * - 'ALTERNO_B': Works on Week B Saturdays (every other Saturday)
 */
export function doesEmployeeWorkSaturday(
  employee: EmployeeRecord | null | undefined,
  targetSaturday: Date = new Date()
): boolean {
  if (!employee) return false;
  const plan = getEffectiveSaturdayPlan(employee);
  if (plan === 'NO') return false;
  if (plan === 'TODOS') return true;

  const refDate = employee.saturdayReferenceDate || employee.rotationStartDate || '2026-01-05';
  const week = calculateWeekAorB(refDate, targetSaturday);

  if (plan === 'ALTERNO_A') return week === 'A';
  if (plan === 'ALTERNO_B') return week === 'B';
  return false;
}

export interface SaturdayBadgeInfo {
  plan: SaturdayPlanType;
  label: string;
  shortLabel: string;
  badgeClass: string;
  icon: string;
  isAlternating: boolean;
  worksUpcomingSaturday: boolean;
  upcomingDateFormatted: string;
  description: string;
}

/**
 * Formats a comprehensive Saturday schedule badge for tables and cards.
 */
export function getSaturdayScheduleBadge(
  employee: EmployeeRecord,
  referenceDate: Date = new Date()
): SaturdayBadgeInfo {
  const plan = getEffectiveSaturdayPlan(employee);
  const nextSat = getNextSaturday(referenceDate);
  const worksUpcoming = doesEmployeeWorkSaturday(employee, nextSat);
  const dateFormatted = nextSat.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  switch (plan) {
    case 'NO':
      return {
        plan,
        label: 'Sábados Libres',
        shortLabel: 'Libre',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
        icon: 'event_busy',
        isAlternating: false,
        worksUpcomingSaturday: false,
        upcomingDateFormatted: dateFormatted,
        description: 'No trabaja sábados (jornada de L-V)',
      };
    case 'ALTERNO_A':
      return {
        plan,
        label: 'Sábados Alternos (Grupo A)',
        shortLabel: 'Alterno (G.A)',
        badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
        icon: 'sync_alt',
        isAlternating: true,
        worksUpcomingSaturday: worksUpcoming,
        upcomingDateFormatted: dateFormatted,
        description: `1 Sábado Sí / 1 No (Semana A) • ${worksUpcoming ? `Trabaja el sáb. ${dateFormatted}` : `Descansa el sáb. ${dateFormatted}`}`,
      };
    case 'ALTERNO_B':
      return {
        plan,
        label: 'Sábados Alternos (Grupo B)',
        shortLabel: 'Alterno (G.B)',
        badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        icon: 'sync_alt',
        isAlternating: true,
        worksUpcomingSaturday: worksUpcoming,
        upcomingDateFormatted: dateFormatted,
        description: `1 Sábado Sí / 1 No (Semana B) • ${worksUpcoming ? `Trabaja el sáb. ${dateFormatted}` : `Descansa el sáb. ${dateFormatted}`}`,
      };
    case 'TODOS':
    default:
      return {
        plan,
        label: `Todos los Sábados`,
        shortLabel: 'Todos Sáb',
        badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: 'event_available',
        isAlternating: false,
        worksUpcomingSaturday: true,
        upcomingDateFormatted: dateFormatted,
        description: `Trabaja todos los sábados • ${employee.saturdayShift || '09:00 - 14:00'}`,
      };
  }
}

/**
 * Computes the full shift schedule information for any employee on a specific date.
 * Handles Monday-Friday, alternating Saturdays, and Sundays seamlessly.
 */
export function getEmployeeShiftInfo(
  employee: EmployeeRecord | null | undefined,
  targetDate: Date = new Date()
): EmployeeShiftInfo {
  if (!employee) {
    return {
      hasRotatingShifts: false,
      currentPlan: 'continua',
      activeShiftName: 'Continua (08:00 - 16:00)',
      activeShiftShort: 'Continua',
      scheduleSummary: 'Jornada Continua (Turno Único)',
      shiftWeekA: 'Continua (08:00 - 16:00)',
      todayShiftTitle: 'Jornada Continua',
      totalWeeklyHours: 40,
    };
  }

  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 6 = Sat, 1..5 = Mon..Fri
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;

  const hasRotation = Boolean(employee.hasRotatingShifts);
  const shiftWeekA = employee.shiftWeekA || 'Continua (08:00 - 16:00)';
  const shiftWeekB = employee.shiftWeekB || 'Partida (09:00 - 14:00 / 16:00 - 19:00)';

  const satPlan = getEffectiveSaturdayPlan(employee);
  const worksSaturday = satPlan !== 'NO';
  const saturdayShift = employee.saturdayShift || 'Continua (09:00 - 14:00)';
  const worksSunday = Boolean(employee.worksSunday);
  const sundayShift = employee.sundayShift || 'Continua (09:00 - 14:00)';

  // Calculate current week letter for rotating shifts or alternating Saturdays
  const currentWeek = calculateWeekAorB(
    employee.rotationStartDate || employee.saturdayReferenceDate,
    targetDate
  );
  const activeWeekdayShift = currentWeek === 'A' ? shiftWeekA : shiftWeekB;
  const nextWeekdayShift = currentWeek === 'A' ? shiftWeekB : shiftWeekA;

  const nextSat = getNextSaturday(targetDate);
  const nextSaturdayDate = nextSat.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  const nextSaturdayWorking = doesEmployeeWorkSaturday(employee, nextSat);
  const isSaturdayWorkingToday = isSaturday && doesEmployeeWorkSaturday(employee, targetDate);

  const totalWeeklyHours = computeTotalWeeklyHours(
    activeWeekdayShift,
    worksSaturday,
    saturdayShift,
    worksSunday,
    sundayShift,
    satPlan
  );

  // CASE 1: TODAY IS SATURDAY
  if (isSaturday) {
    if (isSaturdayWorkingToday) {
      const activeSatShift =
        hasRotation && currentWeek === 'B' && employee.saturdayShiftWeekB
          ? employee.saturdayShiftWeekB
          : saturdayShift;
      const isPart = isShiftPartida(activeSatShift);
      const isAlternating = satPlan === 'ALTERNO_A' || satPlan === 'ALTERNO_B';
      const altTag = isAlternating
        ? ` (Sábado Alterno - ${satPlan === 'ALTERNO_A' ? 'Grupo A' : 'Grupo B'})`
        : '';

      return {
        hasRotatingShifts: hasRotation,
        rotationStartDate: employee.rotationStartDate,
        currentWeekLetter: currentWeek,
        currentPlan: isPart ? 'partida' : 'continua',
        activeShiftName: activeSatShift,
        activeShiftShort: isPart ? 'Partida Sábado' : 'Continua Sábado',
        scheduleSummary: `Sábado • ${activeSatShift}${altTag}`,
        nextWeekSummary: hasRotation ? `Próxima semana: Semana ${currentWeek === 'A' ? 'B' : 'A'}` : undefined,
        shiftWeekA,
        shiftWeekB,
        isTodaySaturday: true,
        worksSaturday: true,
        saturdayPlan: satPlan,
        saturdayShift,
        isSaturdayWorkingToday: true,
        nextSaturdayDate,
        nextSaturdayWorking,
        worksSunday,
        sundayShift,
        isDayOffToday: false,
        todayShiftTitle: `Turno de Sábado${altTag}`,
        totalWeeklyHours,
      };
    } else {
      const isAlternating = satPlan === 'ALTERNO_A' || satPlan === 'ALTERNO_B';
      const restReason = isAlternating
        ? `Sábado de Descanso Alterno (${satPlan === 'ALTERNO_A' ? 'Semana B' : 'Semana A'})`
        : 'Sábado • Día de Descanso';
      return {
        hasRotatingShifts: hasRotation,
        rotationStartDate: employee.rotationStartDate,
        currentWeekLetter: currentWeek,
        currentPlan: 'continua',
        activeShiftName: isAlternating ? 'Descanso (Sábado Alterno)' : 'Descanso Semanal',
        activeShiftShort: 'Descanso',
        scheduleSummary: isAlternating ? `${restReason} • Le toca el próximo sábado` : restReason,
        nextWeekSummary: hasRotation ? `Próxima semana: Semana ${currentWeek === 'A' ? 'B' : 'A'}` : undefined,
        shiftWeekA,
        shiftWeekB,
        isTodaySaturday: true,
        worksSaturday: false,
        saturdayPlan: satPlan,
        saturdayShift,
        isSaturdayWorkingToday: false,
        nextSaturdayDate,
        nextSaturdayWorking,
        worksSunday,
        sundayShift,
        isDayOffToday: true,
        todayShiftTitle: isAlternating ? 'Sábado (Descanso Alterno)' : 'Sábado (Descanso)',
        totalWeeklyHours,
      };
    }
  }

  // CASE 2: TODAY IS SUNDAY
  if (isSunday) {
    if (worksSunday) {
      const isPart = isShiftPartida(sundayShift);
      return {
        hasRotatingShifts: hasRotation,
        rotationStartDate: employee.rotationStartDate,
        currentWeekLetter: currentWeek,
        currentPlan: isPart ? 'partida' : 'continua',
        activeShiftName: sundayShift,
        activeShiftShort: isPart ? 'Partida Domingo' : 'Continua Domingo',
        scheduleSummary: `Domingo • ${sundayShift}`,
        shiftWeekA,
        shiftWeekB,
        isTodaySunday: true,
        worksSaturday,
        saturdayPlan: satPlan,
        saturdayShift,
        isSaturdayWorkingToday: false,
        nextSaturdayDate,
        nextSaturdayWorking,
        worksSunday: true,
        sundayShift,
        isDayOffToday: false,
        todayShiftTitle: 'Turno de Domingo',
        totalWeeklyHours,
      };
    } else {
      return {
        hasRotatingShifts: hasRotation,
        rotationStartDate: employee.rotationStartDate,
        currentWeekLetter: currentWeek,
        currentPlan: 'continua',
        activeShiftName: 'Descanso Dominical',
        activeShiftShort: 'Descanso',
        scheduleSummary: 'Domingo • Descanso Semanal',
        shiftWeekA,
        shiftWeekB,
        isTodaySunday: true,
        worksSaturday,
        saturdayPlan: satPlan,
        saturdayShift,
        isSaturdayWorkingToday: false,
        nextSaturdayDate,
        nextSaturdayWorking,
        worksSunday: false,
        sundayShift,
        isDayOffToday: true,
        todayShiftTitle: 'Domingo (Descanso)',
        totalWeeklyHours,
      };
    }
  }

  // CASE 3: MONDAY TO FRIDAY (LUNES A VIERNES)
  const isPart = isShiftPartida(activeWeekdayShift);
  const plan: WorkdayPlanType = isPart ? 'partida' : 'continua';

  let saturdayBadge = '';
  if (satPlan === 'TODOS') {
    saturdayBadge = ` + Sáb (${saturdayShift.replace(/^Continua\s*|^Partida\s*/, '')})`;
  } else if (satPlan === 'ALTERNO_A') {
    saturdayBadge = ` + Sáb alterno (G.A: ${nextSaturdayWorking ? 'Trabaja este sábado' : 'Descansa este sábado'})`;
  } else if (satPlan === 'ALTERNO_B') {
    saturdayBadge = ` + Sáb alterno (G.B: ${nextSaturdayWorking ? 'Trabaja este sábado' : 'Descansa este sábado'})`;
  }

  let summary = '';
  if (hasRotation) {
    summary = `Semana ${currentWeek} • ${activeWeekdayShift}${saturdayBadge}`;
  } else {
    summary = `${isPart ? 'Jornada Partida' : 'Jornada Continua'}: ${activeWeekdayShift}${saturdayBadge}`;
  }

  const nextWeekSummary = hasRotation
    ? `Semana ${currentWeek === 'A' ? 'B' : 'A'} • ${nextWeekdayShift}${saturdayBadge}`
    : undefined;

  return {
    hasRotatingShifts: hasRotation,
    rotationStartDate: employee.rotationStartDate,
    currentWeekLetter: currentWeek,
    currentPlan: plan,
    activeShiftName: activeWeekdayShift,
    activeShiftShort: isPart ? 'Partida (2 Turnos)' : 'Continua',
    scheduleSummary: summary,
    nextWeekSummary,
    shiftWeekA,
    shiftWeekB,
    isTodaySaturday: false,
    isTodaySunday: false,
    worksSaturday,
    saturdayPlan: satPlan,
    saturdayShift,
    isSaturdayWorkingToday: false,
    nextSaturdayDate,
    nextSaturdayWorking,
    worksSunday,
    sundayShift,
    isDayOffToday: false,
    todayShiftTitle: hasRotation ? `Turno Semana ${currentWeek}` : 'Jornada Laboral',
    totalWeeklyHours,
  };
}
