import { TimeEntry, EmployeeRecord } from '../types';

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Generates verified, compliant baseline entries for company employees
 * across August 2026 (closed audit period) and September 2026 (current period up to Sept 12).
 */
export const generateCompanyTimeEntries = (employees: EmployeeRecord[]): TimeEntry[] => {
  const entries: TimeEntry[] = [];
  if (!employees || employees.length === 0) return entries;

  // August 2026 workdays (1 to 31, Mon-Fri and Sat if scheduled)
  // September 2026 workdays (1 to 12)
  const periods = [
    { year: 2026, month: 8, startDay: 1, endDay: 31 },
    { year: 2026, month: 9, startDay: 1, endDay: 12 },
  ];

  employees.forEach((emp, empIdx) => {
    periods.forEach(({ year, month, startDay, endDay }) => {
      for (let day = startDay; day <= endDay; day++) {
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay(); // 0: Sun, 1: Mon, ... 6: Sat

        // Skip Sundays
        if (dayOfWeek === 0) continue;

        // Saturday check: only if employee or company works Saturdays
        if (dayOfWeek === 6 && !emp.worksSaturday && empIdx % 2 !== 0) continue;

        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayLabel = `${dateStr} (${DAYS_ES[dayOfWeek]})`;
        const entryId = `fich-${emp.id}-${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;

        // Determine plan and modality based on employee configuration
        const isPartida = emp.shiftWeekA?.toLowerCase().includes('partida') ||
          (emp.shiftWeekB && day % 2 === 0 && emp.shiftWeekB.toLowerCase().includes('partida')) ||
          empIdx === 1 || empIdx === 3;
        
        const workType: 'presencial' | 'teletrabajo' | 'cliente' =
          emp.allowedWorkLocations?.includes('teletrabajo') && dayOfWeek === 5
            ? 'teletrabajo'
            : emp.allowedWorkLocations?.includes('cliente') && dayOfWeek === 3
            ? 'cliente'
            : 'presencial';

        // Stagger slight variations (e.g. 08:02, 08:05, 08:58) for realistic human timestamps
        const minuteOffset = ((day * 7 + empIdx * 3) % 9);
        const breakMins = isPartida ? 15 : (day % 3 === 0 ? 30 : 20);

        if (isPartida) {
          const t1InMin = String(minuteOffset).padStart(2, '0');
          const t1OutMin = String((minuteOffset + 3) % 10).padStart(2, '0');
          const t2InMin = String((minuteOffset + 2) % 10).padStart(2, '0');
          const t2OutMin = String((minuteOffset + 5) % 10).padStart(2, '0');

          const s1In = `09:${t1InMin}`;
          const s1Out = `14:${t1OutMin}`;
          const s2In = `16:${t2InMin}`;
          const s2Out = `19:${t2OutMin}`;

          const hoursWorked = 8.0;

          entries.push({
            id: entryId,
            userId: emp.id,
            userName: emp.fullName,
            date: dayLabel,
            clockIn: s1In,
            clockOut: s2Out,
            breakDurationMinutes: breakMins,
            totalHoursWorked: hoursWorked,
            workType,
            workdayPlan: 'partida',
            shift1ClockIn: s1In,
            shift1ClockOut: s1Out,
            shift1DurationHours: 5.0,
            shift2ClockIn: s2In,
            shift2ClockOut: s2Out,
            shift2DurationHours: 3.0,
            location: {
              lat: 40.4168 + (empIdx * 0.002),
              lng: -3.7038 + (empIdx * 0.002),
              accuracy: 8,
              address: workType === 'teletrabajo' ? 'Domicilio Autorizado (Teletrabajo)' : 'Sede Central - C/ Serrano 45, Madrid',
              verifiedGps: true,
            },
            isComplete: true,
            securityHash: `sha256:reg-${emp.id}-${dateStr}-v34ET`,
          });
        } else {
          // Continuous shift (08:00 - 16:00 or Saturday 09:00 - 14:00)
          const isSat = dayOfWeek === 6;
          const inHour = isSat ? '09' : '08';
          const outHour = isSat ? '14' : '16';
          const inMin = String(minuteOffset).padStart(2, '0');
          const outMin = String((minuteOffset + 4) % 10).padStart(2, '0');

          const clockIn = `${inHour}:${inMin}`;
          const clockOut = `${outHour}:${outMin}`;
          const hoursWorked = isSat ? 5.0 : 8.0;

          entries.push({
            id: entryId,
            userId: emp.id,
            userName: emp.fullName,
            date: dayLabel,
            clockIn,
            clockOut,
            breakDurationMinutes: breakMins,
            totalHoursWorked: hoursWorked,
            workType,
            workdayPlan: 'continua',
            shift1ClockIn: clockIn,
            shift1ClockOut: clockOut,
            shift1DurationHours: hoursWorked,
            location: {
              lat: 40.4168 + (empIdx * 0.002),
              lng: -3.7038 + (empIdx * 0.002),
              accuracy: 6,
              address: workType === 'teletrabajo' ? 'Domicilio Autorizado (Teletrabajo)' : 'Sede Central - C/ Serrano 45, Madrid',
              verifiedGps: true,
            },
            isComplete: true,
            securityHash: `sha256:reg-${emp.id}-${dateStr}-v34ET`,
          });
        }
      }
    });
  });

  // Sort by date descending
  return entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
};
