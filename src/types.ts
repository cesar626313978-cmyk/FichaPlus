export type UserRole = 'employee' | 'admin' | 'manager';

export interface DayScheduleConfig {
  enabled: boolean;
  type: WorkdayPlanType; // 'continua' | 'partida'
  // Continua:
  cStart?: string;
  cEnd?: string;
  // Partida:
  t1Start?: string;
  t1End?: string;
  t2Start?: string;
  t2End?: string;
}

export interface CompanyOperatingHours {
  monFri: DayScheduleConfig;
  saturday: DayScheduleConfig;
  sunday: DayScheduleConfig;
}

export type SaturdayPlanType = 'NO' | 'ALTERNO_A' | 'ALTERNO_B' | 'TODOS';

export type AllowedWorkLocation = 'presencial' | 'teletrabajo' | 'cliente';

export type ReminderAlertType = 'voice' | 'vibration' | 'sound' | 'silent' | 'off';

export interface ShiftReminderItem {
  enabled: boolean;
  alertType: ReminderAlertType; // 'voice' (voz sintetizada), 'vibration' (vibración móvil), 'sound' (melodía Web Audio), 'silent' (push sin sonido), 'off' (desactivado)
  leadMinutes: number; // 0 (en punto), 5, 10, 15, 30 min antes
  customMessage?: string;
}

export interface EmployeeReminders {
  enabled: boolean;
  clockIn: ShiftReminderItem;
  clockOut: ShiftReminderItem;
  shift2?: ShiftReminderItem;
}

export interface EmployeeRecord {
  id: string;
  employeeNumber: string; // EMP-001
  fullName: string;
  dni: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  contractType: string;
  weeklyHours: number;
  workdayType?: 'COMPLETA' | 'PARCIAL'; // Jornada Completa (40h) / Parcial (<40h)
  workplaceLocation?: string; // Centro de trabajo específico (ej. Sede Central, Almacén)
  allowedWorkLocations?: AllowedWorkLocation[]; // Modalidades de fichaje permitidas: 'presencial' (Oficina), 'teletrabajo' (Casa), 'cliente' (Ruta)
  role?: UserRole; // 'employee' | 'admin' | 'manager'
  status: 'ACTIVO' | 'VACACIONES' | 'BAJA_MEDICA' | 'INACTIVO';
  avatarUrl: string;
  // Shift configuration
  hasRotatingShifts: boolean;
  rotationStartDate?: string;
  shiftWeekA: string;
  shiftWeekB?: string;
  // Saturday & Weekend Schedule
  worksSaturday?: boolean;
  saturdayPlan?: SaturdayPlanType; // 'NO' = No trabaja, 'ALTERNO_A' = Sábado sí/no (Semana A), 'ALTERNO_B' = Sábado sí/no (Semana B), 'TODOS' = Todos los sábados
  saturdayShift?: string; // e.g. "Continua (09:00 - 14:00)"
  saturdayShiftWeekB?: string;
  saturdayReferenceDate?: string;
  worksSunday?: boolean;
  sundayShift?: string;
  // Vacations configuration per employee
  vacationDays?: number; // Total días de vacaciones asignados (por defecto en empresa: 30 días naturales)
  vacationDaysType?: 'NATURALES' | 'LABORABLES'; // Tipo de cómputo: 'NATURALES' (30 días) o 'LABORABLES' (22 días)
  vacationNotes?: string; // Motivo o desglose de días adicionales (ej. '+2 días por antigüedad/convenio')
  // Individual reminder preferences for this employee
  reminders?: EmployeeReminders;
  joinedDate: string;
  endDate?: string; // Fecha de baja para extrabajadores (custodia 4 años)
  pinCode?: string;
  invitationSentAt?: string;
  invitationMethod?: 'email' | 'whatsapp' | 'manual';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  dni: string;
  phone: string;
  department: string;
  jobTitle: string;
  contractType: string;
  weeklyHours: number;
  currentShift: string;
}

export type WorkdayPlanType = 'partida' | 'continua'; // 2 Turnos (Mañana/Tarde) vs 1 Turno Continuo

export type PauseReasonType = 'cafe' | 'almuerzo' | 'medico' | 'gestion' | 'personal' | 'otro';

export interface ShiftDetail {
  shiftNumber: 1 | 2;
  shiftName: string; // 'Turno 1 (Mañana)' | 'Turno 2 (Tarde)'
  clockIn?: string;
  clockOut?: string;
  elapsedSeconds: number;
  status: 'pending' | 'active' | 'paused' | 'completed';
  workType?: 'presencial' | 'teletrabajo' | 'cliente';
  locationIn?: {
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
    verifiedGps?: boolean;
  };
  locationOut?: {
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
    verifiedGps?: boolean;
  };
}

export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  clockIn: string; // HH:mm:ss
  clockOut?: string; // HH:mm:ss
  breakDurationMinutes: number;
  totalHoursWorked: number;
  workType: 'presencial' | 'teletrabajo' | 'cliente';
  workdayPlan?: WorkdayPlanType; // 'partida' | 'continua'
  // Split shifts details
  shift1ClockIn?: string;
  shift1ClockOut?: string;
  shift1DurationHours?: number;
  shift2ClockIn?: string;
  shift2ClockOut?: string;
  shift2DurationHours?: number;
  pauseReason?: string;
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
    verifiedGps?: boolean;
  };
  isComplete: boolean;
  hasIncident?: boolean;
  securityHash?: string;
}

export interface ActivePunchDoc {
  punchDocKey: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  isClockedIn: boolean;
  isPaused: boolean;
  clockInTime: string;
  clockInTimestamp: number;
  currentShiftNumber?: 1 | 2;
  workdayPlan?: WorkdayPlanType;
  workType?: 'presencial' | 'teletrabajo' | 'cliente';
  pausedAtTimestamp?: number | null;
  accumulatedPauseSeconds?: number;
  pauseReason?: string;
  date?: string;
  activeEntryId?: string | null;
  shift1?: ShiftDetail;
  shift2?: ShiftDetail;
  updatedAt: number;
}

export interface DevicePermissionsState {
  geolocation: 'granted' | 'denied' | 'prompt' | 'unsupported';
  notifications: 'granted' | 'denied' | 'default' | 'unsupported';
  vibration: boolean;
  audio: boolean;
  isPWAInstalled: boolean;
  coords?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
    address?: string;
  };
}

export interface MonthlyRecord {
  id: string;
  userId: string;
  userName: string;
  userDni: string;
  month: string; // e.g., "Agosto 2026"
  yearMonth: string; // "2026-08"
  ordinaryHours: number;
  extraHours: number;
  complementaryHours: number;
  isSigned: boolean;
  signedAt?: string;
  securityHash?: string;
  signedByName?: string;
}

export interface TimeOffRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  department: string;
  leaveType: 'Vacaciones' | 'Días Personales' | 'Baja Médica' | 'Asuntos Propios';
  startDate: string;
  endDate: string;
  daysCount: number;
  notes?: string;
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  createdAt: string;
  reviewedBy?: string;
}

export interface Incident {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  department: string;
  targetDate: string;
  errorOriginal: string;
  correctedClockIn?: string;
  correctedClockOut?: string;
  proposedCorrection: string;
  reason: string;
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actionType: 'EDICIÓN' | 'ELIMINACIÓN' | 'ENTRADA MANUAL';
  performedBy: string;
  performedByRole: string;
  affectedUserId: string;
  affectedUserName: string;
  affectedRecordId?: string;
  previousValue?: string;
  newValue?: string;
  justification: string;
  timestamp: string;
  securityHash: string;
}

export interface AlarmItem {
  id: string;
  title: string;
  time: string; // "08:45"
  days: string[]; // ["L", "M", "X", "J", "V"]
  active: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  pushEnabled: boolean;
  type: 'morning' | 'lunch' | 'afternoon' | 'custom';
}

export interface CompanySettings {
  companyName: string;
  fiscalId: string; // NIF / CIF
  cccCode?: string; // Código Cuenta Cotización Seg. Social (ej. 28 1234567 89)
  workplaceAddress?: string; // Dirección Centro de Trabajo
  workplaceCity?: string; // Municipio / Provincia
  collectiveAgreement?: string; // Convenio Colectivo de aplicación
  annualHoursLimit?: number; // Horas máximas anuales de convenio (ej. 1780h veterinaria)
  overtimeYearlyLimit?: number; // Límite legal horas extras anuales (80h Art. 35 ET)
  intershiftRestHours?: number; // Mínimo descanso entre jornadas (12h Art. 34.3 ET)
  weeklyRestHours?: number; // Mínimo descanso semanal (36h Art. 37.1 ET)
  paidPauseIncluded?: boolean; // Pausa 15 min computa como efectiva
  hourBankEnabled?: boolean; // Bolsa de horas / saldo flexible (+/-)
  primaryColor: string;
  logoUrl: string;
  defaultLanguage: string;
  defaultTimezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY';
  baseWeeklyHours: number;
  strictClockIn: boolean;
  defaultWorkDays: string[];
  operatingHours?: CompanyOperatingHours;
  inspectionToken?: {
    code: string;
    expiresAt: string;
    createdAt: string;
  };
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'urgent' | 'approval' | 'warning' | 'info';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface AccessRequest {
  id: string;
  fullName: string;
  email: string;
  dni: string;
  phone?: string;
  notes?: string;
  requestedAt: string;
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
}
