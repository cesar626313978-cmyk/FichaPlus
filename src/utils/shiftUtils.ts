import { EmployeeRecord, WorkdayPlanType, DayScheduleConfig } from '../types';

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
  saturdayShift?: string;
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
 * Computes weekly working hours given weekday and weekend schedules.
 */
export function computeTotalWeeklyHours(
  monFriShiftStr: string,
  worksSaturday: boolean = false,
  saturdayShiftStr?: string,
  worksSunday: boolean = false,
  sundayShiftStr?: string
): number {
  const weekdayDailyMins = computeShiftMinutes(monFriShiftStr);
  let totalMins = weekdayDailyMins * 5;

  if (worksSaturday && saturdayShiftStr) {
    totalMins += computeShiftMinutes(saturdayShiftStr);
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
 */
export function calculateWeekAorB(rotationStartDateStr?: string, targetDate: Date = new Date()): 'A' | 'B' {
  if (!rotationStartDateStr) return 'A';

  try {
    const start = new Date(rotationStartDateStr);
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
 * Computes the full shift schedule information for any employee on a specific date.
 * Handles Monday-Friday, Saturdays, and Sundays seamlessly.
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

  const worksSaturday = Boolean(employee.worksSaturday);
  const saturdayShift = employee.saturdayShift || 'Continua (09:00 - 14:00)';
  const worksSunday = Boolean(employee.worksSunday);
  const sundayShift = employee.sundayShift || 'Continua (09:00 - 14:00)';

  // Calculate current week letter for rotating shifts
  const currentWeek = hasRotation ? calculateWeekAorB(employee.rotationStartDate, targetDate) : 'A';
  const activeWeekdayShift = currentWeek === 'A' ? shiftWeekA : shiftWeekB;
  const nextWeekdayShift = currentWeek === 'A' ? shiftWeekB : shiftWeekA;

  const totalWeeklyHours = computeTotalWeeklyHours(
    activeWeekdayShift,
    worksSaturday,
    saturdayShift,
    worksSunday,
    sundayShift
  );

  // CASE 1: TODAY IS SATURDAY
  if (isSaturday) {
    if (worksSaturday) {
      const activeSatShift =
        hasRotation && currentWeek === 'B' && employee.saturdayShiftWeekB
          ? employee.saturdayShiftWeekB
          : saturdayShift;
      const isPart = isShiftPartida(activeSatShift);
      return {
        hasRotatingShifts: hasRotation,
        rotationStartDate: employee.rotationStartDate,
        currentWeekLetter: currentWeek,
        currentPlan: isPart ? 'partida' : 'continua',
        activeShiftName: activeSatShift,
        activeShiftShort: isPart ? 'Partida Sábado' : 'Continua Sábado',
        scheduleSummary: `Sábado • ${activeSatShift}`,
        nextWeekSummary: hasRotation ? `Próxima semana: Semana ${currentWeek === 'A' ? 'B' : 'A'}` : undefined,
        shiftWeekA,
        shiftWeekB,
        isTodaySaturday: true,
        worksSaturday: true,
        saturdayShift,
        worksSunday,
        sundayShift,
        isDayOffToday: false,
        todayShiftTitle: 'Turno de Sábado',
        totalWeeklyHours,
      };
    } else {
      return {
        hasRotatingShifts: hasRotation,
        rotationStartDate: employee.rotationStartDate,
        currentWeekLetter: currentWeek,
        currentPlan: 'continua',
        activeShiftName: 'Descanso Semanal',
        activeShiftShort: 'Descanso',
        scheduleSummary: 'Sábado • Día de Descanso',
        nextWeekSummary: hasRotation ? `Próxima semana: Semana ${currentWeek === 'A' ? 'B' : 'A'}` : undefined,
        shiftWeekA,
        shiftWeekB,
        isTodaySaturday: true,
        worksSaturday: false,
        saturdayShift,
        worksSunday,
        sundayShift,
        isDayOffToday: true,
        todayShiftTitle: 'Sábado (Descanso)',
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
        saturdayShift,
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
        saturdayShift,
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

  const saturdayBadge = worksSaturday ? ` + Sáb (${saturdayShift.replace(/^Continua\s*|^Partida\s*/, '')})` : '';

  let summary = '';
  if (hasRotation) {
    summary = `Semana ${currentWeek} • ${activeWeekdayShift}${saturdayBadge}`;
  } else {
    summary = `${isPart ? 'Jornada Partida' : 'Jornada Continua'}: ${activeWeekdayShift}${saturdayBadge}`;
  }

  const nextWeekSummary = hasRotation
    ? `Semana ${currentWeek === 'A' ? 'B' : 'A'} • ${nextWeekdayShift}${
        worksSaturday ? ` + Sáb (${saturdayShift.replace(/^Continua\s*|^Partida\s*/, '')})` : ''
      }`
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
    saturdayShift,
    worksSunday,
    sundayShift,
    isDayOffToday: false,
    todayShiftTitle: hasRotation ? `Turno Semana ${currentWeek}` : 'Jornada Laboral',
    totalWeeklyHours,
  };
}
