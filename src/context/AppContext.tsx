import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  setDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import {
  TimeEntry,
  MonthlyRecord,
  TimeOffRequest,
  Incident,
  AuditLog,
  AlarmItem,
  CompanySettings,
  AppNotification,
  EmployeeRecord,
  AccessRequest,
  WorkdayPlanType,
  ShiftDetail,
} from '../types';
import { generateSHA256 } from '../utils/crypto';
import {
  GeoLocationStamp,
  requestHighAccuracyPosition,
  requestPushNotificationPermission,
  sendLocalNotification,
  triggerHaptic,
  playDeviceChime,
} from '../utils/devicePermissions';
import { getEmployeeShiftInfo, EmployeeShiftInfo } from '../utils/shiftUtils';
import {
  getNextEmployeeNumber,
  reconcileAndDeduplicateEmployees,
  mergeEmployees,
  normalizeName,
} from '../utils/employeeUtils';

interface AppContextType {
  // Navigation
  activeTab: 'dashboard' | 'history' | 'requests' | 'admin' | 'settings' | 'audit' | 'alarms' | 'notifications' | 'profile' | 'employees' | 'monthly_sign' | 'incidents';
  setActiveTab: (tab: any) => void;
  
  // Logged-in Employee Shift Configuration (Calculated from HR setup)
  currentEmployee: EmployeeRecord;
  currentShiftInfo: EmployeeShiftInfo;

  // Live Punch & Split Shifts State
  isClockedIn: boolean;
  isPaused: boolean;
  clockInTime: string | null;
  elapsedSeconds: number;
  workType: 'presencial' | 'teletrabajo' | 'cliente';
  setWorkType: (type: 'presencial' | 'teletrabajo' | 'cliente') => void;
  workdayPlan: WorkdayPlanType;
  setWorkdayPlan: (plan: WorkdayPlanType) => void;
  currentShiftNumber: 1 | 2;
  shift1: ShiftDetail;
  shift2: ShiftDetail;
  pauseReason: string;
  isBetweenShifts: boolean;
  startWorkday: (shiftNumber?: 1 | 2) => Promise<void>;
  pauseWorkday: (reason?: string, notes?: string) => Promise<void>;
  resumeWorkday: () => Promise<void>;
  stopWorkday: (shiftNumber?: 1 | 2) => Promise<void>;
  resetTodayShifts: () => void;
  playChime: () => void;
  
  // Data lists
  employees: EmployeeRecord[];
  timeEntries: TimeEntry[];
  monthlyRecord: MonthlyRecord;
  timeOffRequests: TimeOffRequest[];
  incidents: Incident[];
  auditLogs: AuditLog[];
  alarms: AlarmItem[];
  companySettings: CompanySettings;
  notifications: AppNotification[];
  accessRequests: AccessRequest[];
  
  // Device & Terminal Hardware
  locationStamp: GeoLocationStamp | null;
  isLocatingGps: boolean;
  gpsError: string | null;
  refreshLocation: () => Promise<GeoLocationStamp | null>;
  requestNotificationPermission: () => Promise<boolean>;
  showDeviceModal: boolean;
  setShowDeviceModal: (show: boolean) => void;
  
  // Actions
  addEmployee: (emp: Omit<EmployeeRecord, 'id'>) => Promise<EmployeeRecord>;
  updateEmployee: (id: string, emp: Partial<EmployeeRecord>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  addTimeOffRequest: (req: Omit<TimeOffRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  approveTimeOffRequest: (id: string) => Promise<void>;
  rejectTimeOffRequest: (id: string) => Promise<void>;
  
  addIncident: (inc: Omit<Incident, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  approveIncident: (id: string) => Promise<void>;
  rejectIncident: (id: string) => Promise<void>;
  
  submitAccessRequest: (req: Omit<AccessRequest, 'id' | 'requestedAt' | 'status'>) => Promise<void>;
  approveAccessRequest: (id: string, customDepartment?: string, customJobTitle?: string) => Promise<void>;
  rejectAccessRequest: (id: string) => Promise<void>;

  signMonthlyRecord: () => Promise<string>;
  
  toggleAlarm: (id: string) => void;
  saveAlarm: (alarm: AlarmItem) => void;
  deleteAlarm: (id: string) => void;
  
  updateCompanySettings: (settings: Partial<CompanySettings>) => Promise<void>;
  markEmployeeInvited: (id: string, method: 'whatsapp' | 'email' | 'manual') => Promise<void>;
  resetAllCompanyData: (options?: {
    companyName?: string;
    fiscalId?: string;
    keepAdmin?: boolean;
    adminName?: string;
    adminEmail?: string;
    adminDni?: string;
  }) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // PWA Modal & Install Detection
  isAppInstalled: boolean;
  markAppAsInstalled: (installed?: boolean) => void;
  showInstallModal: boolean;
  setShowInstallModal: (show: boolean) => void;
  deferredPrompt: any;
  installPWA: () => Promise<void>;
}

const INITIAL_EMPLOYEES: EmployeeRecord[] = [
  {
    id: 'emp-001',
    employeeNumber: 'EMP-001',
    fullName: 'César Hernández Moreno',
    dni: '12345678X',
    email: 'cesar626313978@gmail.com',
    phone: '+34 626 313 978',
    department: 'Desarrollo & Tecnología',
    jobTitle: 'Desarrollador Senior / RRHH',
    contractType: 'Indefinido',
    weeklyHours: 40,
    status: 'ACTIVO',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    hasRotatingShifts: true,
    rotationStartDate: '2026-08-01',
    shiftWeekA: 'Continua (08:00 - 16:00)',
    shiftWeekB: 'Partida (09:00 - 14:00 / 16:00 - 19:00)',
    worksSaturday: true,
    saturdayPlan: 'ALTERNO_A', // Sábados alternos (1 sí / 1 no) - Grupo A
    saturdayShift: 'Continua (09:00 - 14:00)',
    joinedDate: '2022-03-15',
    pinCode: '1234',
  },
  {
    id: 'emp-002',
    employeeNumber: 'EMP-002',
    fullName: 'Laura Gómez Martín',
    dni: '87654321Y',
    email: 'laura.gomez@empresa.com',
    phone: '+34 611 223 344',
    department: 'Diseño de Producto',
    jobTitle: 'Product Designer',
    contractType: 'Indefinido',
    weeklyHours: 40,
    status: 'VACACIONES',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
    hasRotatingShifts: false,
    shiftWeekA: 'Continua (08:00 - 16:00)',
    shiftWeekB: 'Continua (08:00 - 16:00)',
    worksSaturday: false,
    saturdayPlan: 'NO', // No trabaja sábados
    joinedDate: '2023-01-10',
    pinCode: '5678',
  },
  {
    id: 'emp-003',
    employeeNumber: 'EMP-003',
    fullName: 'Carlos Ruiz Delgado',
    dni: '45678912Z',
    email: 'carlos.ruiz@empresa.com',
    phone: '+34 622 334 455',
    department: 'Operaciones y Logística',
    jobTitle: 'Coordinador de Turno',
    contractType: 'Indefinido',
    weeklyHours: 40,
    status: 'BAJA_MEDICA',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=250&q=80',
    hasRotatingShifts: true,
    rotationStartDate: '2026-08-01',
    shiftWeekA: 'Continua (08:00 - 16:00)',
    shiftWeekB: 'Continua (15:00 - 23:00)',
    worksSaturday: true,
    saturdayPlan: 'ALTERNO_B', // Sábados alternos (1 sí / 1 no) - Grupo B (se turna con Grupo A)
    saturdayShift: 'Continua (09:00 - 14:00)',
    joinedDate: '2021-09-01',
    pinCode: '9012',
  },
  {
    id: 'emp-004',
    employeeNumber: 'EMP-004',
    fullName: 'María Rodríguez Santos',
    dni: '78912345B',
    email: 'maria.rodriguez@empresa.com',
    phone: '+34 633 445 566',
    department: 'Ventas y Clientes',
    jobTitle: 'Account Executive',
    contractType: 'Indefinido',
    weeklyHours: 35,
    status: 'ACTIVO',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
    hasRotatingShifts: false,
    shiftWeekA: 'Partida (09:00 - 14:00 / 16:00 - 19:00)',
    shiftWeekB: 'Partida (09:00 - 14:00 / 16:00 - 19:00)',
    worksSaturday: true,
    saturdayPlan: 'TODOS', // Trabaja todos los sábados
    saturdayShift: 'Partida (10:00 - 14:00 / 17:00 - 20:30)',
    joinedDate: '2024-02-15',
    pinCode: '3456',
  },
];

const INITIAL_COMPANY: CompanySettings = {
  companyName: 'Acme Corporation Ltd.',
  fiscalId: 'B-12345678',
  cccCode: '28 123456789 (Régimen General)',
  workplaceAddress: 'Calle Mayor 45, Planta 2',
  workplaceCity: 'Madrid, 28013',
  collectiveAgreement: 'Convenio Colectivo Estatal del Sector de Oficinas y Despachos',
  annualHoursLimit: 1780,
  overtimeYearlyLimit: 80,
  intershiftRestHours: 12,
  weeklyRestHours: 36,
  paidPauseIncluded: true,
  hourBankEnabled: true,
  primaryColor: '#facc15',
  logoUrl: '',
  defaultLanguage: 'es',
  defaultTimezone: 'Europe/Madrid',
  dateFormat: 'DD/MM/YYYY',
  baseWeeklyHours: 40,
  strictClockIn: true,
  defaultWorkDays: ['L', 'M', 'X', 'J', 'V', 'S'],
  operatingHours: {
    monFri: {
      enabled: true,
      type: 'continua',
      cStart: '08:00',
      cEnd: '16:00',
      t1Start: '09:00',
      t1End: '14:00',
      t2Start: '16:00',
      t2End: '19:00',
    },
    saturday: {
      enabled: true,
      type: 'continua',
      cStart: '09:00',
      cEnd: '14:00',
      t1Start: '09:00',
      t1End: '14:00',
      t2Start: '16:00',
      t2End: '19:00',
    },
    sunday: {
      enabled: false,
      type: 'continua',
      cStart: '09:00',
      cEnd: '14:00',
      t1Start: '09:00',
      t1End: '14:00',
      t2Start: '16:00',
      t2End: '19:00',
    },
  },
};

const INITIAL_MONTHLY: MonthlyRecord = {
  id: 'aug-2026',
  userId: 'cesar-emp-01',
  userName: 'César Hernández Moreno',
  userDni: '12345678X',
  month: 'Agosto 2026',
  yearMonth: '2026-08',
  ordinaryHours: 160,
  extraHours: 4.5,
  complementaryHours: 0,
  isSigned: false,
};

const INITIAL_ALARMS: AlarmItem[] = [
  {
    id: 'alarm-1',
    title: 'Entrada Mañana',
    time: '08:45',
    days: ['L', 'M', 'X', 'J', 'V'],
    active: true,
    soundEnabled: true,
    vibrationEnabled: true,
    pushEnabled: true,
    type: 'morning',
  },
  {
    id: 'alarm-2',
    title: 'Salida Comida',
    time: '14:00',
    days: ['L', 'M', 'X', 'J', 'V'],
    active: true,
    soundEnabled: true,
    vibrationEnabled: false,
    pushEnabled: false,
    type: 'lunch',
  },
  {
    id: 'alarm-3',
    title: 'Salida Tarde',
    time: '18:00',
    days: ['L', 'M', 'X', 'J', 'V'],
    active: false,
    soundEnabled: true,
    vibrationEnabled: true,
    pushEnabled: true,
    type: 'afternoon',
  },
];

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Mes pendiente de firma',
    message: 'Tienes que firmar el registro horario del mes de Agosto. Cumplimiento legal Art. 34.9 ET.',
    type: 'urgent',
    timestamp: 'Hace 10m',
    read: false,
    actionUrl: 'monthly_sign',
    actionLabel: 'Firmar ahora',
  },
  {
    id: 'notif-2',
    title: 'Vacaciones Aprobadas',
    message: 'Tus días del 15-25 de Agosto han sido aprobados por tu responsable.',
    type: 'approval',
    timestamp: 'Hace 1h',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Incidencia en fichaje',
    message: 'Olvidaste marcar la salida el lunes 23. Por favor, regulariza tu jornada.',
    type: 'warning',
    timestamp: 'Hace 2h',
    read: false,
    actionUrl: 'incidents',
    actionLabel: 'Revisar',
  },
  {
    id: 'notif-4',
    title: 'Nueva política de empresa',
    message: 'Se ha actualizado el documento de política de teletrabajo y registro de jornada.',
    type: 'info',
    timestamp: 'Ayer',
    read: true,
  },
];

const INITIAL_ENTRIES: TimeEntry[] = [
  {
    id: 'entry-1',
    userId: 'cesar-emp-01',
    userName: 'César Hernández Moreno',
    date: '2026-08-01 (Lun)',
    clockIn: '09:00',
    clockOut: '18:00',
    breakDurationMinutes: 60,
    totalHoursWorked: 8.0,
    workType: 'presencial',
    isComplete: true,
  },
  {
    id: 'entry-2',
    userId: 'cesar-emp-01',
    userName: 'César Hernández Moreno',
    date: '2026-08-02 (Mar)',
    clockIn: '09:00',
    clockOut: '18:00',
    breakDurationMinutes: 60,
    totalHoursWorked: 8.0,
    workType: 'teletrabajo',
    isComplete: true,
  },
  {
    id: 'entry-3',
    userId: 'cesar-emp-01',
    userName: 'César Hernández Moreno',
    date: '2026-08-03 (Mié)',
    clockIn: '09:00',
    clockOut: '18:30',
    breakDurationMinutes: 60,
    totalHoursWorked: 8.5,
    workType: 'presencial',
    isComplete: true,
  },
  {
    id: 'entry-4',
    userId: 'cesar-emp-01',
    userName: 'César Hernández Moreno',
    date: '2026-08-04 (Jue)',
    clockIn: '09:15',
    clockOut: '18:15',
    breakDurationMinutes: 60,
    totalHoursWorked: 8.0,
    workType: 'cliente',
    isComplete: true,
  },
  {
    id: 'entry-5',
    userId: 'cesar-emp-01',
    userName: 'César Hernández Moreno',
    date: '2026-08-05 (Vie)',
    clockIn: '--:--',
    clockOut: '--:--',
    breakDurationMinutes: 0,
    totalHoursWorked: 0,
    workType: 'presencial',
    isComplete: true,
    hasIncident: false,
  },
];

const INITIAL_REQUESTS: TimeOffRequest[] = [
  {
    id: 'req-1',
    userId: 'user-laura',
    userName: 'Laura Gómez',
    userAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    department: 'Diseño',
    leaveType: 'Vacaciones',
    startDate: '2026-08-15',
    endDate: '2026-08-25',
    daysCount: 10,
    notes: 'Vacaciones de verano planificadas con el equipo.',
    status: 'PENDIENTE',
    createdAt: '2026-08-10',
  },
  {
    id: 'req-2',
    userId: 'user-carlos',
    userName: 'Carlos Ruiz',
    userAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
    department: 'Desarrollo',
    leaveType: 'Baja Médica',
    startDate: '2026-09-02',
    endDate: '2026-09-05',
    daysCount: 4,
    notes: 'Reposo prescrito por facultativo médico.',
    status: 'PENDIENTE',
    createdAt: '2026-08-12',
  },
  {
    id: 'req-3',
    userId: 'cesar-emp-01',
    userName: 'César Hernández Moreno',
    department: 'Desarrollo',
    leaveType: 'Vacaciones',
    startDate: '2026-08-12',
    endDate: '2026-08-16',
    daysCount: 5,
    status: 'APROBADO',
    createdAt: '2026-07-28',
  },
  {
    id: 'req-4',
    userId: 'cesar-emp-01',
    userName: 'César Hernández Moreno',
    department: 'Desarrollo',
    leaveType: 'Días Personales',
    startDate: '2026-10-25',
    endDate: '2026-10-25',
    daysCount: 1,
    status: 'PENDIENTE',
    createdAt: '2026-08-01',
  },
];

const INITIAL_INCIDENTS: Incident[] = [
  {
    id: 'inc-1',
    userId: 'user-maria',
    userName: 'María Rodríguez',
    userAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
    department: 'Ventas',
    targetDate: '23 Oct 2023',
    errorOriginal: 'Falta fichaje de salida',
    proposedCorrection: '18:00 (Salida manual)',
    correctedClockOut: '18:00',
    reason: 'Se me olvidó fichar al salir de la oficina por atender una llamada urgente de un cliente.',
    status: 'PENDIENTE',
    createdAt: 'Hace 2h',
  },
  {
    id: 'inc-2',
    userId: 'user-javier',
    userName: 'Javier López',
    department: 'Soporte Técnico',
    targetDate: '22 Oct 2023',
    errorOriginal: 'Hora incorrecta (Entrada: 09:30)',
    proposedCorrection: '09:00 (Entrada ajustada)',
    correctedClockIn: '09:00',
    reason: 'La app se quedó colgada al intentar fichar cuando llegué a las 9, tuve que reiniciar el móvil.',
    status: 'PENDIENTE',
    createdAt: 'Ayer',
  },
  {
    id: 'inc-3',
    userId: 'user-ana',
    userName: 'Ana García',
    department: 'Marketing',
    targetDate: '20 Oct 2023',
    errorOriginal: 'Geolocalización Inválida',
    proposedCorrection: 'Validar Ubicación (Teletrabajo - Casa)',
    reason: 'Estaba trabajando desde casa y el GPS del ordenador daba error de precisión.',
    status: 'PENDIENTE',
    createdAt: 'Hace 3 días',
  },
  {
    id: 'inc-4',
    userId: 'cesar-emp-01',
    userName: 'César Hernández Moreno',
    department: 'Desarrollo',
    targetDate: '12 Nov 2023',
    errorOriginal: 'Olvido de Fichaje Salida',
    proposedCorrection: '18:00',
    reason: 'Salí a las 18:00 pero olvidé registrar en la app.',
    status: 'PENDIENTE',
    createdAt: '12 Nov 2023',
  },
  {
    id: 'inc-5',
    userId: 'cesar-emp-01',
    userName: 'César Hernández Moreno',
    department: 'Desarrollo',
    targetDate: '05 Nov 2023',
    errorOriginal: 'Error de Ubicación GPS',
    proposedCorrection: 'Oficina Central',
    reason: 'La app me situó a 2km de la oficina al entrar.',
    status: 'APROBADO',
    createdAt: '05 Nov 2023',
  },
  {
    id: 'inc-6',
    userId: 'cesar-emp-01',
    userName: 'César Hernández Moreno',
    department: 'Desarrollo',
    targetDate: '28 Oct 2023',
    errorOriginal: 'Fichaje Duplicado',
    proposedCorrection: 'Eliminar duplicado',
    reason: 'Entrada registrada dos veces por error de red.',
    status: 'RECHAZADO',
    createdAt: '28 Oct 2023',
  },
];

const INITIAL_AUDIT: AuditLog[] = [
  {
    id: 'audit-1',
    actionType: 'EDICIÓN',
    performedBy: 'Admin Principal',
    performedByRole: 'Superusuario',
    affectedUserId: '4092',
    affectedUserName: 'Carlos Mendoza',
    previousValue: 'Previo: 09:15',
    newValue: 'Nuevo: 09:00',
    justification: 'Empleado olvidó fichar al llegar; verificó hora de entrada con sistema de seguridad del edificio.',
    timestamp: '24 Oct 2023, 14:32',
    securityHash: '8f434346648f6b96df89dda901c5176b10a6d839ab8237ce81fa8b57b98d24b',
  },
  {
    id: 'audit-2',
    actionType: 'ELIMINACIÓN',
    performedBy: 'Supervisor RRHH',
    performedByRole: 'Manager',
    affectedUserId: '88392',
    affectedUserName: 'Fichaje Duplicado (#88392)',
    previousValue: 'Registro de Salida: 18:02 (22/10) - ELIMINADO',
    justification: 'Fichaje accidental duplicado por fallo de conexión en la terminal móvil del usuario.',
    timestamp: '23 Oct 2023, 11:05',
    securityHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  },
  {
    id: 'audit-3',
    actionType: 'ENTRADA MANUAL',
    performedBy: 'Admin Principal',
    performedByRole: 'Superusuario',
    affectedUserId: '3921',
    affectedUserName: 'Lucía Gómez (ID: 3921)',
    newValue: 'NUEVO REGISTRO: Entrada a las 08:00',
    justification: 'Terminal de fichaje físico fuera de servicio temporalmente por corte eléctrico.',
    timestamp: '20 Oct 2023, 08:15',
    securityHash: 'd2d2240b9550b07a78377c0fdb2df8e980efb321a36485890e9e160538a7b9c',
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<any>('dashboard');

  // Lists
  const [employees, setEmployees] = useState<EmployeeRecord[]>(() => {
    try {
      const saved = localStorage.getItem('fichaplus_employees');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const reconciled = reconcileAndDeduplicateEmployees(parsed, INITIAL_EMPLOYEES, profile);
          try {
            localStorage.setItem('fichaplus_employees', JSON.stringify(reconciled));
          } catch {}
          return reconciled;
        }
      }
    } catch (e) {
      console.warn('Could not load employees from localStorage:', e);
    }
    const initialReconciled = reconcileAndDeduplicateEmployees([], INITIAL_EMPLOYEES, profile);
    try {
      localStorage.setItem('fichaplus_employees', JSON.stringify(initialReconciled));
    } catch {}
    return initialReconciled;
  });

  // Find logged-in user employee record
  const currentEmployee = useMemo(() => {
    return (
      employees.find(
        (e) =>
          (profile?.id && e.id === profile.id) ||
          (profile?.email && e.email.toLowerCase() === profile.email.toLowerCase())
      ) || employees[0]
    );
  }, [employees, profile]);

  // Derived shift information based on HR assignment & rotation rules
  const currentShiftInfo = useMemo(() => {
    return getEmployeeShiftInfo(currentEmployee, new Date());
  }, [currentEmployee]);

  // Punch state & Split Shifts (2 Turnos)
  const [workdayPlan, setWorkdayPlanState] = useState<WorkdayPlanType>(() => {
    return currentShiftInfo?.currentPlan || 'continua';
  });

  // Auto-sync workdayPlan with official employee shift assignment
  useEffect(() => {
    if (currentShiftInfo?.currentPlan) {
      setWorkdayPlanState(currentShiftInfo.currentPlan);
    }
  }, [currentShiftInfo?.currentPlan]);

  const setWorkdayPlan = (plan: WorkdayPlanType) => {
    setWorkdayPlanState(plan);
    try {
      localStorage.setItem('fichaplus_workday_plan', plan);
    } catch {}
  };

  const [currentShiftNumber, setCurrentShiftNumber] = useState<1 | 2>(1);
  const [shift1, setShift1] = useState<ShiftDetail>({
    shiftNumber: 1,
    shiftName: 'Turno 1 (Mañana)',
    elapsedSeconds: 0,
    status: 'pending',
  });
  const [shift2, setShift2] = useState<ShiftDetail>({
    shiftNumber: 2,
    shiftName: 'Turno 2 (Tarde)',
    elapsedSeconds: 0,
    status: 'pending',
  });
  const [pauseReason, setPauseReason] = useState<string>('Pausa');

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [workType, setWorkType] = useState<'presencial' | 'teletrabajo' | 'cliente'>('presencial');

  const isBetweenShifts =
    workdayPlan === 'partida' &&
    shift1.status === 'completed' &&
    shift2.status === 'pending' &&
    !isClockedIn;

  // Lists
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(INITIAL_ENTRIES);
  const [monthlyRecord, setMonthlyRecord] = useState<MonthlyRecord>(INITIAL_MONTHLY);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>(INITIAL_REQUESTS);
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT);
  const [alarms, setAlarms] = useState<AlarmItem[]>(INITIAL_ALARMS);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    try {
      const saved = localStorage.getItem('fichaplus_company_settings');
      return saved ? { ...INITIAL_COMPANY, ...JSON.parse(saved) } : INITIAL_COMPANY;
    } catch {
      return INITIAL_COMPANY;
    }
  });
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>(() => {
    try {
      const saved = localStorage.getItem('fichaplus_access_requests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // PWA Install & Device Permissions State
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) return true;
    return localStorage.getItem('fichaplus_pwa_installed') === 'true';
  });

  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [locationStamp, setLocationStamp] = useState<GeoLocationStamp | null>(null);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const markAppAsInstalled = (installed: boolean = true) => {
    setIsAppInstalled(installed);
    if (installed) {
      localStorage.setItem('fichaplus_pwa_installed', 'true');
    } else {
      localStorage.removeItem('fichaplus_pwa_installed');
    }
  };

  // Auto-detect PWA standalone mode and listen for install events
  useEffect(() => {
    // Check display-mode media query
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsAppInstalled(true);
        localStorage.setItem('fichaplus_pwa_installed', 'true');
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    // Native appinstalled event (Chrome/Edge/Android)
    const handleAppInstalled = () => {
      markAppAsInstalled(true);
      setDeferredPrompt(null);
      setShowInstallModal(false);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check Android / Chromium getInstalledRelatedApps API
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any)
        .getInstalledRelatedApps()
        .then((apps: any[]) => {
          if (apps && apps.length > 0) {
            markAppAsInstalled(true);
          }
        })
        .catch(() => {});
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Auto-fetch GPS quietly on initial load if permitted
  useEffect(() => {
    if ('geolocation' in navigator) {
      requestHighAccuracyPosition()
        .then((loc) => setLocationStamp(loc))
        .catch(() => {});
    }
  }, []);

  const refreshLocation = async (): Promise<GeoLocationStamp | null> => {
    setIsLocatingGps(true);
    setGpsError(null);
    try {
      const stamp = await requestHighAccuracyPosition();
      setLocationStamp(stamp);
      setIsLocatingGps(false);
      return stamp;
    } catch (err: any) {
      setGpsError(err.message || 'Error al obtener GPS');
      setIsLocatingGps(false);
      return null;
    }
  };

  const handleRequestNotificationPermission = async (): Promise<boolean> => {
    return requestPushNotificationPermission();
  };

  // Listen to beforeinstallprompt event for mobile download
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        markAppAsInstalled(true);
        setDeferredPrompt(null);
        setShowInstallModal(false);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  // Live Timer when clocked in
  useEffect(() => {
    let interval: any;
    if (isClockedIn && !isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isClockedIn, isPaused]);

  // Safe firestore mutation helper with timeout guard so UI never hangs
  const safeFirestoreWrite = async (op: Promise<any>, timeoutMs: number = 800): Promise<void> => {
    try {
      const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
      await Promise.race([op, timeout]);
    } catch (err) {
      console.warn('Firestore sync skipped or timed out:', err);
    }
  };

  // Firebase Firestore Listeners
  useEffect(() => {
    try {
      const qEntries = query(collection(db, 'time_entries'), orderBy('date', 'desc'), limit(30));
      const unsubEntries = onSnapshot(
        qEntries,
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TimeEntry));
            setTimeEntries(list);
          }
        },
        (err) => console.warn('Firestore time_entries listener warning:', err?.message)
      );

      const unsubEmployees = onSnapshot(
        collection(db, 'employees'),
        (snap) => {
          if (!snap.empty) {
            const firestoreList = snap.docs.map((d) => {
              const data = d.data() as EmployeeRecord;
              return { ...data, id: data.id || d.id };
            });
            setEmployees((prev) => {
              const merged = mergeEmployees(prev, firestoreList);
              try {
                localStorage.setItem('fichaplus_employees', JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
        },
        (err) => console.warn('Firestore employees listener warning:', err?.message)
      );

      const unsubReqs = onSnapshot(
        collection(db, 'time_off_requests'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TimeOffRequest));
            setTimeOffRequests(list);
          }
        },
        (err) => console.warn('Firestore time_off_requests listener warning:', err?.message)
      );

      const unsubIncidents = onSnapshot(
        collection(db, 'incidents'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Incident));
            setIncidents(list);
          }
        },
        (err) => console.warn('Firestore incidents listener warning:', err?.message)
      );

      const unsubAudit = onSnapshot(
        collection(db, 'audit_logs'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
            setAuditLogs(list);
          }
        },
        (err) => console.warn('Firestore audit_logs listener warning:', err?.message)
      );

      return () => {
        unsubEntries();
        unsubEmployees();
        unsubReqs();
        unsubIncidents();
        unsubAudit();
      };
    } catch (err) {
      console.warn('Firestore real-time subscription fallback active:', err);
    }
  }, []);

  const addEmployee = async (empData: Omit<EmployeeRecord, 'id'>): Promise<EmployeeRecord> => {
    const newId = `emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Ensure unique sequential employee number
    let finalEmpNumber = empData.employeeNumber?.trim();
    if (!finalEmpNumber) {
      finalEmpNumber = getNextEmployeeNumber(employees);
    }

    const newEmp: EmployeeRecord = {
      ...empData,
      id: newId,
      employeeNumber: finalEmpNumber,
    };

    // Immediately persist in memory and local storage, ensuring no duplicate cards
    setEmployees((prev) => {
      const normName = normalizeName(newEmp.fullName);
      const normEmail = (newEmp.email || '').trim().toLowerCase();
      // Filter out any duplicate of this person
      const filtered = prev.filter((e) => {
        if (e.id === newEmp.id) return false;
        if (normName && normalizeName(e.fullName) === normName && normName.length > 3) return false;
        if (normEmail && e.email && e.email.trim().toLowerCase() === normEmail) return false;
        return true;
      });
      const updated = [newEmp, ...filtered];
      try {
        localStorage.setItem('fichaplus_employees', JSON.stringify(updated));
      } catch (err) {
        console.warn('Error saving to localStorage:', err);
      }
      return updated;
    });

    // Add audit log
    const hash = await generateSHA256(`ADD_EMPLOYEE_${newEmp.employeeNumber}_${newEmp.fullName}_${Date.now()}`);
    const log: AuditLog = {
      id: `audit-${Date.now()}`,
      actionType: 'ENTRADA MANUAL',
      performedBy: profile.name,
      performedByRole: profile.role === 'admin' ? 'Superusuario RRHH' : 'Manager',
      affectedUserId: newEmp.id,
      affectedUserName: newEmp.fullName,
      newValue: `Alta de empleado ${newEmp.employeeNumber} (${newEmp.fullName}) - DNI: ${newEmp.dni}`,
      justification: 'Alta en sistema de control horario y asignación de jornada.',
      timestamp: new Date().toLocaleString('es-ES'),
      securityHash: hash,
    };
    setAuditLogs((prev) => [log, ...prev]);

    // Use setDoc so Firestore document ID is ALWAYS newEmp.id
    await safeFirestoreWrite(
      Promise.all([
        setDoc(doc(db, 'employees', newEmp.id), newEmp),
        addDoc(collection(db, 'audit_logs'), log),
      ]),
      800
    );

    return newEmp;
  };

  const updateEmployee = async (id: string, empUpdates: Partial<EmployeeRecord>) => {
    // Immediately persist in memory and local storage
    setEmployees((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, ...empUpdates } : e));
      try {
        localStorage.setItem('fichaplus_employees', JSON.stringify(updated));
      } catch (err) {
        console.warn('Error saving to localStorage:', err);
      }
      return updated;
    });

    // Safe non-blocking sync with cloud with timeout guard
    // Use setDoc with merge: true so it creates or updates the doc seamlessly
    await safeFirestoreWrite(
      setDoc(doc(db, 'employees', id), empUpdates, { merge: true }),
      800
    );
  };

  const deleteEmployee = async (id: string) => {
    const target = employees.find((e) => e.id === id);
    setEmployees((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      try {
        localStorage.setItem('fichaplus_employees', JSON.stringify(updated));
        // Also save deleted ID so recovery doesn't resurrect intentionally deleted employee
        const savedDeleted = localStorage.getItem('fichaplus_deleted_ids');
        const deletedArr: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];
        if (!deletedArr.includes(id)) {
          deletedArr.push(id);
          localStorage.setItem('fichaplus_deleted_ids', JSON.stringify(deletedArr));
        }
      } catch (err) {
        console.warn('Error saving to localStorage:', err);
      }
      return updated;
    });

    if (target) {
      const hash = await generateSHA256(`DELETE_EMPLOYEE_${target.employeeNumber}_${Date.now()}`);
      const log: AuditLog = {
        id: `audit-${Date.now()}`,
        actionType: 'ELIMINACIÓN',
        performedBy: profile.name,
        performedByRole: 'Superusuario RRHH',
        affectedUserId: target.id,
        affectedUserName: target.fullName,
        previousValue: `Empleado ${target.employeeNumber} (${target.fullName})`,
        justification: 'Baja definitiva de empleado en la plataforma.',
        timestamp: new Date().toLocaleString('es-ES'),
        securityHash: hash,
      };
      setAuditLogs((prev) => [log, ...prev]);
      await safeFirestoreWrite(
        Promise.all([
          deleteDoc(doc(db, 'employees', id)),
          addDoc(collection(db, 'audit_logs'), log),
        ]),
        800
      );
    }
  };

  // Audio Chime generator for alarms / punch sound
  const playChime = () => {
    playDeviceChime('clockIn');
  };

  const startWorkday = async (shiftNum?: 1 | 2) => {
    const targetShift = shiftNum || (workdayPlan === 'partida' && shift1.status === 'completed' ? 2 : 1);
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    const timeShort = timeStr.slice(0, 5);
    const dateStr = now.toISOString().slice(0, 10);
    const dayLabel = `${dateStr} (${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][now.getDay()]})`;

    setIsClockedIn(true);
    setIsPaused(false);
    setClockInTime(timeShort);
    setCurrentShiftNumber(targetShift);

    // Update shift details
    if (targetShift === 1) {
      setShift1((prev) => ({
        ...prev,
        clockIn: timeShort,
        status: 'active',
        workType,
      }));
    } else {
      setShift2((prev) => ({
        ...prev,
        clockIn: timeShort,
        status: 'active',
        workType,
      }));
    }

    // 1. Hardware triggers
    triggerHaptic('clockIn');
    playDeviceChime('clockIn');

    // 2. Capture GPS stamp
    let entryLocation = locationStamp ? {
      lat: locationStamp.latitude,
      lng: locationStamp.longitude,
      accuracy: locationStamp.accuracy,
      address: locationStamp.address,
      verifiedGps: locationStamp.verifiedGps,
    } : undefined;

    // Try fresh GPS if not available
    if (!entryLocation && 'geolocation' in navigator) {
      try {
        const fresh = await requestHighAccuracyPosition();
        setLocationStamp(fresh);
        entryLocation = {
          lat: fresh.latitude,
          lng: fresh.longitude,
          accuracy: fresh.accuracy,
          address: fresh.address,
          verifiedGps: fresh.verifiedGps,
        };
      } catch (e) {}
    }

    // 3. Push notification
    const shiftTitle = workdayPlan === 'partida' ? `Turno ${targetShift} (${targetShift === 1 ? 'Mañana' : 'Tarde'})` : 'Jornada Continua';
    const locationName = entryLocation?.address || (workType === 'presencial' ? 'Oficina' : workType);
    sendLocalNotification(
      `⏱️ Entrada Registrada (${shiftTitle})`,
      `Jornada iniciada a las ${timeShort} (${locationName}). Registro legal verificado.`
    );

    if (targetShift === 1 || workdayPlan === 'continua') {
      const newEntry: TimeEntry = {
        id: `entry-${Date.now()}`,
        userId: profile.id,
        userName: profile.name,
        date: dayLabel,
        clockIn: timeShort,
        breakDurationMinutes: 0,
        totalHoursWorked: 0,
        workType,
        workdayPlan,
        shift1ClockIn: timeShort,
        location: entryLocation,
        isComplete: false,
      };

      setTimeEntries((prev) => [newEntry, ...prev]);

      try {
        await addDoc(collection(db, 'time_entries'), newEntry);
      } catch (e) {
        console.warn('Saved entry locally');
      }
    } else {
      setTimeEntries((prev) =>
        prev.map((item, idx) =>
          idx === 0
            ? {
                ...item,
                shift2ClockIn: timeShort,
                isComplete: false,
              }
            : item
        )
      );
    }
  };

  const pauseWorkday = async (reason?: string, notes?: string) => {
    const finalReason = reason || 'Pausa';
    setPauseReason(finalReason);
    setIsPaused(true);
    triggerHaptic('pause');
    playDeviceChime('pause');

    if (currentShiftNumber === 1) {
      setShift1((prev) => ({ ...prev, status: 'paused' }));
    } else {
      setShift2((prev) => ({ ...prev, status: 'paused' }));
    }

    sendLocalNotification(
      `☕ Pausa Registrada (${finalReason})`,
      `Has pausado el contador de jornada laboral.${notes ? ` Motivo: ${notes}` : ''}`
    );
  };

  const resumeWorkday = async () => {
    setIsPaused(false);
    triggerHaptic('clockIn');
    playDeviceChime('clockIn');

    if (currentShiftNumber === 1) {
      setShift1((prev) => ({ ...prev, status: 'active' }));
    } else {
      setShift2((prev) => ({ ...prev, status: 'active' }));
    }

    sendLocalNotification(
      '▶️ Jornada Reanudada',
      'El registro de tiempo se ha reactivado.'
    );
  };

  const stopWorkday = async (shiftNum?: 1 | 2) => {
    const targetShift = shiftNum || currentShiftNumber;
    const now = new Date();
    const timeShort = now.toTimeString().slice(0, 5);
    const durationHours = parseFloat((elapsedSeconds / 3600).toFixed(1));

    setIsClockedIn(false);
    setIsPaused(false);
    triggerHaptic('clockOut');
    playDeviceChime('clockOut');

    if (workdayPlan === 'partida' && targetShift === 1) {
      // Shift 1 finished -> Go to between shifts
      setShift1((prev) => ({
        ...prev,
        clockOut: timeShort,
        elapsedSeconds,
        status: 'completed',
      }));
      setElapsedSeconds(0);
      setClockInTime(null);
      setCurrentShiftNumber(2);

      sendLocalNotification(
        '✓ Salida Turno 1 (Mañana) Registrada',
        `Primer turno finalizado a las ${timeShort}. Podrás iniciar el Turno 2 (Tarde) al volver de la comida.`
      );

      setTimeEntries((prev) =>
        prev.map((item, idx) =>
          idx === 0
            ? {
                ...item,
                shift1ClockOut: timeShort,
                shift1DurationHours: durationHours || 4.5,
                totalHoursWorked: durationHours || 4.5,
              }
            : item
        )
      );
    } else {
      // Shift 2 or Continuous Shift completed
      if (workdayPlan === 'partida') {
        setShift2((prev) => ({
          ...prev,
          clockOut: timeShort,
          elapsedSeconds,
          status: 'completed',
        }));
      }

      const shift1Hours = shift1.status === 'completed' ? parseFloat((shift1.elapsedSeconds / 3600).toFixed(1)) : 0;
      const totalDayHours = workdayPlan === 'partida' ? parseFloat((shift1Hours + durationHours).toFixed(1)) : durationHours;

      sendLocalNotification(
        '✓ Salida Registrada con Éxito',
        `Jornada finalizada a las ${timeShort}. Total trabajado: ${totalDayHours || 8.0}h.`
      );

      setTimeEntries((prev) =>
        prev.map((item, idx) =>
          idx === 0
            ? {
                ...item,
                clockOut: timeShort,
                shift2ClockOut: workdayPlan === 'partida' ? timeShort : undefined,
                shift2DurationHours: workdayPlan === 'partida' ? durationHours : undefined,
                totalHoursWorked: totalDayHours || 8.0,
                isComplete: true,
              }
            : item
        )
      );
    }
  };

  const resetTodayShifts = () => {
    setIsClockedIn(false);
    setIsPaused(false);
    setClockInTime(null);
    setElapsedSeconds(0);
    setCurrentShiftNumber(1);
    setShift1({
      shiftNumber: 1,
      shiftName: 'Turno 1 (Mañana)',
      elapsedSeconds: 0,
      status: 'pending',
    });
    setShift2({
      shiftNumber: 2,
      shiftName: 'Turno 2 (Tarde)',
      elapsedSeconds: 0,
      status: 'pending',
    });
  };

  const addTimeOffRequest = async (req: Omit<TimeOffRequest, 'id' | 'createdAt' | 'status'>) => {
    const newReq: TimeOffRequest = {
      ...req,
      id: `req-${Date.now()}`,
      status: 'PENDIENTE',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setTimeOffRequests((prev) => [newReq, ...prev]);
    await safeFirestoreWrite(addDoc(collection(db, 'time_off_requests'), newReq), 800);
  };

  const approveTimeOffRequest = async (id: string) => {
    setTimeOffRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'APROBADO', reviewedBy: profile.name } : r))
    );
    await safeFirestoreWrite(
      updateDoc(doc(db, 'time_off_requests', id), {
        status: 'APROBADO',
        reviewedBy: profile.name,
      }),
      800
    );
  };

  const rejectTimeOffRequest = async (id: string) => {
    setTimeOffRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'RECHAZADO', reviewedBy: profile.name } : r))
    );
    await safeFirestoreWrite(
      updateDoc(doc(db, 'time_off_requests', id), {
        status: 'RECHAZADO',
        reviewedBy: profile.name,
      }),
      800
    );
  };

  const addIncident = async (inc: Omit<Incident, 'id' | 'createdAt' | 'status'>) => {
    const newInc: Incident = {
      ...inc,
      id: `inc-${Date.now()}`,
      status: 'PENDIENTE',
      createdAt: 'Hoy',
    };
    setIncidents((prev) => [newInc, ...prev]);
    await safeFirestoreWrite(addDoc(collection(db, 'incidents'), newInc), 800);
  };

  const approveIncident = async (id: string) => {
    const inc = incidents.find((i) => i.id === id);
    setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'APROBADO' } : i)));

    // Create Audit Log entry automatically with SHA-256
    const hash = await generateSHA256(
      `INCIDENT_APPROVED_${id}_${inc?.userName}_${Date.now()}`
    );
    const log: AuditLog = {
      id: `audit-${Date.now()}`,
      actionType: 'EDICIÓN',
      performedBy: profile.name,
      performedByRole: profile.role === 'admin' ? 'Admin Principal' : 'Supervisor RRHH',
      affectedUserId: inc?.userId || 'N/A',
      affectedUserName: inc?.userName || 'Empleado',
      previousValue: inc?.errorOriginal || 'N/A',
      newValue: inc?.proposedCorrection || 'Aprobado',
      justification: inc?.reason || 'Corrección de jornada validada.',
      timestamp: new Date().toLocaleString(),
      securityHash: hash,
    };
    setAuditLogs((prev) => [log, ...prev]);

    await safeFirestoreWrite(
      Promise.all([
        updateDoc(doc(db, 'incidents', id), { status: 'APROBADO' }),
        addDoc(collection(db, 'audit_logs'), log),
      ]),
      800
    );
  };

  const rejectIncident = async (id: string) => {
    setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'RECHAZADO' } : i)));
    await safeFirestoreWrite(updateDoc(doc(db, 'incidents', id), { status: 'RECHAZADO' }), 800);
  };

  const signMonthlyRecord = async (): Promise<string> => {
    const signPayload = `FICHAPLUS_LEGAL_SIGN_${profile.dni}_${profile.name}_${monthlyRecord.month}_${Date.now()}`;
    const hash = await generateSHA256(signPayload);
    const signedDate = new Date().toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const updated: MonthlyRecord = {
      ...monthlyRecord,
      isSigned: true,
      signedAt: signedDate,
      securityHash: hash,
      signedByName: profile.name,
    };
    setMonthlyRecord(updated);

    // Add to audit logs
    const log: AuditLog = {
      id: `audit-sign-${Date.now()}`,
      actionType: 'EDICIÓN',
      performedBy: profile.name,
      performedByRole: 'Empleado Titular',
      affectedUserId: profile.id,
      affectedUserName: profile.name,
      previousValue: 'PENDIENTE DE FIRMA',
      newValue: `FIRMADO CON HASH ${hash.slice(0, 10)}...`,
      justification: 'Firma mensual de conformidad Art. 34.9 Estatuto de los Trabajadores.',
      timestamp: signedDate,
      securityHash: hash,
    };
    setAuditLogs((prev) => [log, ...prev]);

    return hash;
  };

  const toggleAlarm = (id: string) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const saveAlarm = (alarm: AlarmItem) => {
    setAlarms((prev) => {
      const idx = prev.findIndex((a) => a.id === alarm.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = alarm;
        return next;
      }
      return [...prev, alarm];
    });
  };

  const deleteAlarm = (id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  };

  const updateCompanySettings = async (settings: Partial<CompanySettings>) => {
    setCompanySettings((prev) => {
      const updated = { ...prev, ...settings };
      try {
        localStorage.setItem('fichaplus_company_settings', JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving company settings to localStorage', e);
      }
      return updated;
    });

    // Firestore async sync (non-blocking)
    try {
      addDoc(collection(db, 'company_settings'), settings).catch(() => {});
    } catch (e) {}
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const submitAccessRequest = async (req: Omit<AccessRequest, 'id' | 'requestedAt' | 'status'>) => {
    const newReq: AccessRequest = {
      ...req,
      id: `req-access-${Date.now()}`,
      requestedAt: new Date().toISOString(),
      status: 'PENDIENTE',
    };
    const updated = [newReq, ...accessRequests];
    setAccessRequests(updated);
    localStorage.setItem('fichaplus_access_requests', JSON.stringify(updated));

    // Also add high-priority notification for Admin
    const notif: AppNotification = {
      id: `notif-access-${Date.now()}`,
      title: 'Nueva Solicitud de Acceso / Registro',
      message: `${req.fullName} (${req.email}, DNI: ${req.dni}) ha solicitado acceso a la plataforma. Revisa y aprueba su invitación.`,
      type: 'urgent',
      timestamp: 'Ahora',
      read: false,
      actionUrl: 'employees',
      actionLabel: 'Ver Empleados',
    };
    setNotifications((prev) => [notif, ...prev]);

    try {
      await addDoc(collection(db, 'access_requests'), newReq);
    } catch (e) {}
  };

  const approveAccessRequest = async (id: string, customDepartment?: string, customJobTitle?: string) => {
    const req = accessRequests.find((r) => r.id === id);
    if (!req) return;

    // Create active employee from request
    const newEmp: EmployeeRecord = {
      id: `emp-${Date.now()}`,
      employeeNumber: `EMP-${String(employees.length + 1).padStart(3, '0')}`,
      fullName: req.fullName,
      dni: req.dni,
      email: req.email,
      phone: req.phone || '',
      department: customDepartment || 'Operaciones',
      jobTitle: customJobTitle || 'Empleado',
      contractType: 'Indefinido',
      weeklyHours: 40,
      status: 'ACTIVO',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(req.fullName)}`,
      hasRotatingShifts: false,
      shiftWeekA: 'Mañana',
      shiftWeekB: 'Mañana',
      joinedDate: new Date().toISOString().slice(0, 10),
      pinCode: '1234',
      invitationSentAt: new Date().toISOString(),
      invitationMethod: 'email',
    };

    const updatedEmployees = [...employees, newEmp];
    setEmployees(updatedEmployees);
    localStorage.setItem('fichaplus_employees', JSON.stringify(updatedEmployees));

    // Update access request status
    const updatedReqs = accessRequests.map((r) =>
      r.id === id ? ({ ...r, status: 'APROBADO' } as AccessRequest) : r
    );
    setAccessRequests(updatedReqs);
    localStorage.setItem('fichaplus_access_requests', JSON.stringify(updatedReqs));

    await safeFirestoreWrite(addDoc(collection(db, 'employees'), newEmp), 800);
  };

  const rejectAccessRequest = async (id: string) => {
    const updatedReqs = accessRequests.map((r) =>
      r.id === id ? ({ ...r, status: 'RECHAZADO' } as AccessRequest) : r
    );
    setAccessRequests(updatedReqs);
    localStorage.setItem('fichaplus_access_requests', JSON.stringify(updatedReqs));
  };

  const markEmployeeInvited = async (id: string, method: 'whatsapp' | 'email' | 'manual') => {
    const timestamp = new Date().toISOString();
    setEmployees((prev) => {
      const updated = prev.map((e) =>
        e.id === id
          ? {
              ...e,
              invitationSentAt: timestamp,
              invitationMethod: method,
            }
          : e
      );
      try {
        localStorage.setItem('fichaplus_employees', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    await safeFirestoreWrite(
      updateDoc(doc(db, 'employees', id), {
        invitationSentAt: timestamp,
        invitationMethod: method,
      }),
      800
    );
  };

  const resetAllCompanyData = async (options?: {
    companyName?: string;
    fiscalId?: string;
    keepAdmin?: boolean;
    adminName?: string;
    adminEmail?: string;
    adminDni?: string;
  }) => {
    const nowIso = new Date().toISOString();
    const timestamp = new Date().toLocaleString('es-ES');

    // 1. Reset Company Settings
    const cleanCompany: CompanySettings = {
      companyName: options?.companyName?.trim() || '',
      fiscalId: options?.fiscalId?.trim() || '',
      cccCode: '',
      workplaceAddress: '',
      workplaceCity: '',
      collectiveAgreement: '',
      annualHoursLimit: 1780,
      overtimeYearlyLimit: 80,
      intershiftRestHours: 12,
      weeklyRestHours: 36,
      paidPauseIncluded: true,
      hourBankEnabled: true,
      primaryColor: '#4f46e5',
      logoUrl: '',
      defaultLanguage: 'es',
      defaultTimezone: 'Europe/Madrid',
      dateFormat: 'DD/MM/YYYY',
      baseWeeklyHours: 40,
      strictClockIn: true,
      defaultWorkDays: ['L', 'M', 'X', 'J', 'V', 'S'],
      operatingHours: {
        monFri: {
          enabled: true,
          type: 'continua',
          cStart: '08:00',
          cEnd: '16:00',
          t1Start: '09:00',
          t1End: '14:00',
          t2Start: '16:00',
          t2End: '19:00',
        },
        saturday: {
          enabled: true,
          type: 'continua',
          cStart: '09:00',
          cEnd: '14:00',
          t1Start: '09:00',
          t1End: '14:00',
          t2Start: '16:00',
          t2End: '19:00',
        },
        sunday: {
          enabled: false,
          type: 'continua',
          cStart: '09:00',
          cEnd: '14:00',
          t1Start: '09:00',
          t1End: '14:00',
          t2Start: '16:00',
          t2End: '19:00',
        },
      },
    };
    setCompanySettings(cleanCompany);
    try {
      localStorage.setItem('fichaplus_company_settings', JSON.stringify(cleanCompany));
    } catch (e) {}

    // 2. Reset Employees
    let cleanEmployees: EmployeeRecord[] = [];
    if (options?.keepAdmin !== false) {
      cleanEmployees = [
        {
          id: 'emp-001',
          employeeNumber: 'EMP-001',
          fullName: options?.adminName?.trim() || profile.name || 'Administrador Principal',
          dni: options?.adminDni?.trim() || profile.dni || '12345678X',
          email: options?.adminEmail?.trim() || profile.email || 'admin@empresa.com',
          phone: profile.phone || '',
          department: 'Dirección & RRHH',
          jobTitle: 'Responsable de Empresa',
          contractType: 'Indefinido',
          weeklyHours: 40,
          status: 'ACTIVO',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
            options?.adminName || profile.name || 'Admin'
          )}`,
          hasRotatingShifts: false,
          shiftWeekA: 'Mañana',
          shiftWeekB: 'Mañana',
          joinedDate: nowIso.slice(0, 10),
          pinCode: '1234',
        },
      ];
    }
    setEmployees(cleanEmployees);
    localStorage.setItem('fichaplus_employees', JSON.stringify(cleanEmployees));

    // 3. Clear time entries, requests, incidents, and punch clock
    setTimeEntries([]);
    setTimeOffRequests([]);
    setIncidents([]);
    setIsClockedIn(false);
    setIsPaused(false);
    setClockInTime(null);
    setElapsedSeconds(0);

    // 4. Reset Monthly Record
    const cleanMonthly: MonthlyRecord = {
      id: `monthly-${Date.now()}`,
      userId: cleanEmployees[0]?.id || 'admin',
      userName: cleanEmployees[0]?.fullName || 'Admin',
      userDni: cleanEmployees[0]?.dni || '',
      month: new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' }),
      yearMonth: nowIso.slice(0, 7),
      ordinaryHours: 0,
      extraHours: 0,
      complementaryHours: 0,
      isSigned: false,
    };
    setMonthlyRecord(cleanMonthly);

    // 5. Initial Audit Log
    const hash = await generateSHA256(`PURGE_COMPANY_RESET_${nowIso}_${profile.name}`);
    const resetLog: AuditLog = {
      id: `audit-reset-${Date.now()}`,
      actionType: 'ELIMINACIÓN',
      performedBy: profile.name,
      performedByRole: 'Superadministrador',
      affectedUserId: 'ALL',
      affectedUserName: 'Toda la Empresa',
      previousValue: 'DATOS DE PRUEBA ANTERIORES',
      newValue: `VACIADO TOTAL DEL SISTEMA - INICIO LIMPIO (${cleanCompany.companyName || 'Nueva Empresa'})`,
      justification: 'Restablecimiento de fábrica solicitado con confirmación de código de seguridad para puesta en marcha real.',
      timestamp,
      securityHash: hash,
    };
    setAuditLogs([resetLog]);

    // 6. Reset Notifications
    setNotifications([
      {
        id: `notif-reset-${Date.now()}`,
        title: 'Sistema Restablecido con Éxito',
        message: 'Todos los datos de prueba han sido eliminados. Puedes dar de alta a tus empleados reales y personalizar los datos fiscales.',
        type: 'info',
        timestamp: 'Ahora',
        read: false,
      },
    ]);

    // Clear local storage entries
    localStorage.removeItem('fichaplus_time_entries');
    localStorage.removeItem('fichaplus_requests');
    localStorage.removeItem('fichaplus_incidents');
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        currentEmployee,
        currentShiftInfo,
        isClockedIn,
        isPaused,
        clockInTime,
        elapsedSeconds,
        workType,
        setWorkType,
        workdayPlan,
        setWorkdayPlan,
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
        employees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        timeEntries,
        monthlyRecord,
        timeOffRequests,
        incidents,
        auditLogs,
        alarms,
        companySettings,
        notifications,
        accessRequests,
        submitAccessRequest,
        approveAccessRequest,
        rejectAccessRequest,
        addTimeOffRequest,
        approveTimeOffRequest,
        rejectTimeOffRequest,
        addIncident,
        approveIncident,
        rejectIncident,
        signMonthlyRecord,
        toggleAlarm,
        saveAlarm,
        deleteAlarm,
        updateCompanySettings,
        markEmployeeInvited,
        resetAllCompanyData,
        markNotificationRead,
        markAllNotificationsRead,
        isAppInstalled,
        markAppAsInstalled,
        showInstallModal,
        setShowInstallModal,
        deferredPrompt,
        installPWA,
        locationStamp,
        isLocatingGps,
        gpsError,
        refreshLocation,
        requestNotificationPermission: handleRequestNotificationPermission,
        showDeviceModal,
        setShowDeviceModal,
        playChime,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
