import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  setDoc,
  doc,
  deleteDoc,
  getDocs,
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
  areSamePerson,
  isMasterAdmin,
  MASTER_ADMIN_RECORD,
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

const INITIAL_EMPLOYEES: EmployeeRecord[] = [MASTER_ADMIN_RECORD];

const INITIAL_COMPANY: CompanySettings = {
  companyName: 'FichaPlus',
  fiscalId: 'B-12345678',
  cccCode: '28 123456789 (Régimen General)',
  workplaceAddress: 'Calle Principal 1',
  workplaceCity: 'Madrid, 28001',
  collectiveAgreement: 'Convenio Colectivo Estatal del Sector de Oficinas y Despachos',
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

const getCleanMonthlyRecord = (admin?: Partial<EmployeeRecord>): MonthlyRecord => {
  const now = new Date();
  const currentYearMonth = now.toISOString().slice(0, 7);
  const currentMonthLabel = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  const capitalizedMonth = currentMonthLabel.charAt(0).toUpperCase() + currentMonthLabel.slice(1);
  return {
    id: `monthly-${Date.now()}`,
    userId: admin?.id || 'emp-001',
    userName: admin?.fullName || 'César Hernández Moreno',
    userDni: admin?.dni || '12345678X',
    month: capitalizedMonth,
    yearMonth: currentYearMonth,
    ordinaryHours: 0,
    extraHours: 0,
    complementaryHours: 0,
    isSigned: false,
  };
};

const INITIAL_MONTHLY: MonthlyRecord = getCleanMonthlyRecord();

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

const INITIAL_NOTIFICATIONS: AppNotification[] = [];
const INITIAL_ENTRIES: TimeEntry[] = [];
const INITIAL_REQUESTS: TimeOffRequest[] = [];
const INITIAL_INCIDENTS: Incident[] = [];
const INITIAL_AUDIT: AuditLog[] = [];

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

  // Auto-heal, deduplicate, and guarantee Master Admin is ALWAYS restored
  useEffect(() => {
    const reconciled = reconcileAndDeduplicateEmployees(employees, INITIAL_EMPLOYEES, profile);
    const isDifferent =
      reconciled.length !== employees.length ||
      reconciled.some(
        (rec, i) =>
          rec.id !== employees[i]?.id ||
          rec.fullName !== employees[i]?.fullName ||
          rec.employeeNumber !== employees[i]?.employeeNumber ||
          rec.email !== employees[i]?.email
      );

    if (isDifferent) {
      setEmployees(reconciled);
      try {
        localStorage.setItem('fichaplus_employees', JSON.stringify(reconciled));
      } catch (err) {
        console.warn('Error saving healed employees:', err);
      }
    }
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

  // Anti-mock legacy filters
  const isMockEntryId = (id?: string) => !id || id.startsWith('entry-');
  const isMockRequestId = (id?: string) => !id || id.startsWith('req-');
  const isMockIncidentId = (id?: string) => !id || id.startsWith('inc-');
  const isMockAuditId = (id?: string) => !id || id.startsWith('audit-1') || id.startsWith('audit-2') || id.startsWith('audit-3');
  const isMockNotifId = (id?: string) => !id || id.startsWith('notif-1') || id.startsWith('notif-2') || id.startsWith('notif-3') || id.startsWith('notif-4');

  // Lists - persistent and clean
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => {
    try {
      const saved = localStorage.getItem('fichaplus_time_entries');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((e) => !isMockEntryId(e.id));
        }
      }
    } catch {}
    return [];
  });

  const [monthlyRecord, setMonthlyRecord] = useState<MonthlyRecord>(() => {
    try {
      const saved = localStorage.getItem('fichaplus_monthly');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id !== 'aug-2026' && parsed.ordinaryHours !== 160) {
          return parsed;
        }
      }
    } catch {}
    return getCleanMonthlyRecord(profile);
  });

  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>(() => {
    try {
      const saved = localStorage.getItem('fichaplus_requests');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((r) => !isMockRequestId(r.id));
        }
      }
    } catch {}
    return [];
  });

  const [incidents, setIncidents] = useState<Incident[]>(() => {
    try {
      const saved = localStorage.getItem('fichaplus_incidents');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((i) => !isMockIncidentId(i.id));
        }
      }
    } catch {}
    return [];
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('fichaplus_audit');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((a) => !isMockAuditId(a.id));
        }
      }
    } catch {}
    return [];
  });

  const [alarms, setAlarms] = useState<AlarmItem[]>(() => {
    try {
      const saved = localStorage.getItem('fichaplus_alarms');
      return saved ? JSON.parse(saved) : INITIAL_ALARMS;
    } catch {
      return INITIAL_ALARMS;
    }
  });

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    try {
      const saved = localStorage.getItem('fichaplus_company_settings');
      return saved ? { ...INITIAL_COMPANY, ...JSON.parse(saved) } : INITIAL_COMPANY;
    } catch {
      return INITIAL_COMPANY;
    }
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('fichaplus_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((n) => !isMockNotifId(n.id));
        }
      }
    } catch {}
    return [];
  });

  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>(() => {
    try {
      const saved = localStorage.getItem('fichaplus_access_requests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keep state synced into localStorage immediately
  useEffect(() => {
    try {
      localStorage.setItem('fichaplus_time_entries', JSON.stringify(timeEntries));
    } catch {}
  }, [timeEntries]);

  useEffect(() => {
    try {
      localStorage.setItem('fichaplus_monthly', JSON.stringify(monthlyRecord));
    } catch {}
  }, [monthlyRecord]);

  useEffect(() => {
    try {
      localStorage.setItem('fichaplus_requests', JSON.stringify(timeOffRequests));
    } catch {}
  }, [timeOffRequests]);

  useEffect(() => {
    try {
      localStorage.setItem('fichaplus_incidents', JSON.stringify(incidents));
    } catch {}
  }, [incidents]);

  useEffect(() => {
    try {
      localStorage.setItem('fichaplus_audit', JSON.stringify(auditLogs));
    } catch {}
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('fichaplus_notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('fichaplus_alarms', JSON.stringify(alarms));
    } catch {}
  }, [alarms]);

  useEffect(() => {
    try {
      localStorage.setItem('fichaplus_access_requests', JSON.stringify(accessRequests));
    } catch {}
  }, [accessRequests]);

  // One-time self-healing check on mount to cleanse legacy demo data if reset was previously triggered or mock IDs exist
  useEffect(() => {
    try {
      const isReset = localStorage.getItem('fichaplus_is_reset') === 'true';
      if (isReset) {
        setTimeEntries((prev) => prev.filter((e) => !isMockEntryId(e.id)));
        setTimeOffRequests((prev) => prev.filter((r) => !isMockRequestId(r.id)));
        setIncidents((prev) => prev.filter((i) => !isMockIncidentId(i.id)));
        setAuditLogs((prev) => prev.filter((a) => !isMockAuditId(a.id)));
        setNotifications((prev) => prev.filter((n) => !isMockNotifId(n.id)));
      }
    } catch {}
  }, []);

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

  const safeFirestoreRead = async <T,>(op: Promise<T>, timeoutMs: number = 800): Promise<T | null> => {
    try {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
      return await Promise.race([op, timeout]);
    } catch (err) {
      console.warn('Firestore read skipped or timed out:', err);
      return null;
    }
  };

  // Firebase Firestore Listeners with anti-mock filtering
  useEffect(() => {
    try {
      const qEntries = query(collection(db, 'time_entries'), orderBy('date', 'desc'), limit(30));
      const unsubEntries = onSnapshot(
        qEntries,
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs
              .map((d) => ({ id: d.id, ...d.data() } as TimeEntry))
              .filter((e) => !isMockEntryId(e.id));
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
            const list = snap.docs
              .map((d) => ({ id: d.id, ...d.data() } as TimeOffRequest))
              .filter((r) => !isMockRequestId(r.id));
            setTimeOffRequests(list);
          }
        },
        (err) => console.warn('Firestore time_off_requests listener warning:', err?.message)
      );

      const unsubIncidents = onSnapshot(
        collection(db, 'incidents'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs
              .map((d) => ({ id: d.id, ...d.data() } as Incident))
              .filter((i) => !isMockIncidentId(i.id));
            setIncidents(list);
          }
        },
        (err) => console.warn('Firestore incidents listener warning:', err?.message)
      );

      const unsubAudit = onSnapshot(
        collection(db, 'audit_logs'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs
              .map((d) => ({ id: d.id, ...d.data() } as AuditLog))
              .filter((a) => !isMockAuditId(a.id));
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
    // 1. Check if this person already exists in employees by name, email, DNI, or phone digits
    const existingIndex = employees.findIndex((e) => areSamePerson(e, empData));

    let recordToSave: EmployeeRecord;

    if (existingIndex >= 0) {
      // Person already exists: update and merge record to strictly prevent duplicate cards
      const existing = employees[existingIndex];
      recordToSave = {
        ...existing,
        ...empData,
        id: existing.id,
        employeeNumber: existing.employeeNumber || getNextEmployeeNumber(employees),
      };

      setEmployees((prev) => {
        const updated = prev.map((e, idx) => (idx === existingIndex ? recordToSave : e));
        const reconciled = reconcileAndDeduplicateEmployees(updated, undefined, profile);
        try {
          localStorage.setItem('fichaplus_employees', JSON.stringify(reconciled));
        } catch {}
        return reconciled;
      });

      await safeFirestoreWrite(
        setDoc(doc(db, 'employees', recordToSave.id), recordToSave, { merge: true }),
        800
      );

      return recordToSave;
    }

    // 2. Fresh new person
    const newId = `emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Ensure unique sequential employee number (never overwrite EMP-001)
    let finalEmpNumber = empData.employeeNumber?.trim();
    if (!finalEmpNumber || finalEmpNumber === 'EMP-001') {
      finalEmpNumber = getNextEmployeeNumber(employees);
    }

    recordToSave = {
      ...empData,
      id: newId,
      employeeNumber: finalEmpNumber,
    };

    setEmployees((prev) => {
      const updated = [...prev, recordToSave];
      const reconciled = reconcileAndDeduplicateEmployees(updated, undefined, profile);
      try {
        localStorage.setItem('fichaplus_employees', JSON.stringify(reconciled));
      } catch (err) {
        console.warn('Error saving to localStorage:', err);
      }
      return reconciled;
    });

    // Add audit log
    const hash = await generateSHA256(`ADD_EMPLOYEE_${recordToSave.employeeNumber}_${recordToSave.fullName}_${Date.now()}`);
    const log: AuditLog = {
      id: `audit-${Date.now()}`,
      actionType: 'ENTRADA MANUAL',
      performedBy: profile.name,
      performedByRole: profile.role === 'admin' ? 'Superusuario RRHH' : 'Manager',
      affectedUserId: recordToSave.id,
      affectedUserName: recordToSave.fullName,
      newValue: `Alta de empleado ${recordToSave.employeeNumber} (${recordToSave.fullName}) - DNI: ${recordToSave.dni}`,
      justification: 'Alta en sistema de control horario y asignación de jornada.',
      timestamp: new Date().toLocaleString('es-ES'),
      securityHash: hash,
    };
    setAuditLogs((prev) => [log, ...prev]);

    // Use setDoc so Firestore document ID is ALWAYS recordToSave.id
    await safeFirestoreWrite(
      Promise.all([
        setDoc(doc(db, 'employees', recordToSave.id), recordToSave),
        addDoc(collection(db, 'audit_logs'), log),
      ]),
      800
    );

    return recordToSave;
  };

  const updateEmployee = async (id: string, empUpdates: Partial<EmployeeRecord>) => {
    // If updating master admin, protect admin privileges and EMP-001
    let cleanUpdates = { ...empUpdates };
    if (id === 'emp-001') {
      cleanUpdates.role = 'admin';
      cleanUpdates.employeeNumber = 'EMP-001';
    }

    // Immediately persist in memory and local storage
    setEmployees((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, ...cleanUpdates } : e));
      const reconciled = reconcileAndDeduplicateEmployees(updated, undefined, profile);
      try {
        localStorage.setItem('fichaplus_employees', JSON.stringify(reconciled));
      } catch (err) {
        console.warn('Error saving to localStorage:', err);
      }
      return reconciled;
    });

    // Safe non-blocking sync with cloud with timeout guard
    // Use setDoc with merge: true so it creates or updates the doc seamlessly
    await safeFirestoreWrite(
      setDoc(doc(db, 'employees', id), cleanUpdates, { merge: true }),
      800
    );
  };

  const deleteEmployee = async (id: string) => {
    // Strictly protect the Master Administrator from deletion
    if (id === 'emp-001') {
      console.warn('Cannot delete the Master Administrator (EMP-001)');
      return;
    }
    const target = employees.find((e) => e.id === id);
    if (target && isMasterAdmin(target)) {
      console.warn('Cannot delete the Master Administrator');
      return;
    }

    setEmployees((prev) => {
      const updated = prev.filter((e) => e.id !== id && !isMasterAdmin(e));
      const reconciled = reconcileAndDeduplicateEmployees(updated, undefined, profile);
      try {
        localStorage.setItem('fichaplus_employees', JSON.stringify(reconciled));
        // Also save deleted ID (never delete admin)
        if (id !== 'emp-001') {
          const savedDeleted = localStorage.getItem('fichaplus_deleted_ids');
          const deletedArr: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];
          if (!deletedArr.includes(id)) {
            deletedArr.push(id);
            localStorage.setItem('fichaplus_deleted_ids', JSON.stringify(deletedArr));
          }
        }
      } catch (err) {
        console.warn('Error saving to localStorage:', err);
      }
      return reconciled;
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

    // Check if employee already exists with this email / DNI / name
    const existingIndex = employees.findIndex((e) =>
      areSamePerson(e, { fullName: req.fullName, email: req.email, dni: req.dni, phone: req.phone })
    );

    if (existingIndex !== -1) {
      // Already an employee! Just approve request without duplicating employee record
      const updatedReqs = accessRequests.map((r) =>
        r.id === id ? ({ ...r, status: 'APROBADO' } as AccessRequest) : r
      );
      setAccessRequests(updatedReqs);
      try {
        localStorage.setItem('fichaplus_access_requests', JSON.stringify(updatedReqs));
      } catch {}
      return;
    }

    const nextNumber = getNextEmployeeNumber(employees);

    // Create active employee from request
    const newEmp: EmployeeRecord = {
      id: `emp-${Date.now()}`,
      employeeNumber: nextNumber,
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

    const reconciled = reconcileAndDeduplicateEmployees([...employees, newEmp], undefined, profile);
    setEmployees(reconciled);
    try {
      localStorage.setItem('fichaplus_employees', JSON.stringify(reconciled));
    } catch {}

    // Update access request status
    const updatedReqs = accessRequests.map((r) =>
      r.id === id ? ({ ...r, status: 'APROBADO' } as AccessRequest) : r
    );
    setAccessRequests(updatedReqs);
    try {
      localStorage.setItem('fichaplus_access_requests', JSON.stringify(updatedReqs));
    } catch {}

    await safeFirestoreWrite(setDoc(doc(db, 'employees', newEmp.id), newEmp), 800);
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
          fullName: options?.adminName?.trim() || profile.name || 'César Hernández Moreno',
          dni: options?.adminDni?.trim() || profile.dni || '12345678X',
          email: options?.adminEmail?.trim() || profile.email || 'cesar626313978@gmail.com',
          phone: profile.phone || '+34 626 313 978',
          department: 'Dirección & RRHH',
          jobTitle: 'Responsable de Empresa',
          contractType: 'Indefinido',
          weeklyHours: 40,
          status: 'ACTIVO',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
            options?.adminName || profile.name || 'Admin'
          )}`,
          hasRotatingShifts: false,
          shiftWeekA: 'Continua (08:00 - 16:00)',
          shiftWeekB: 'Continua (08:00 - 16:00)',
          joinedDate: nowIso.slice(0, 10),
          pinCode: '1234',
        },
      ];
    }
    setEmployees(cleanEmployees);
    localStorage.setItem('fichaplus_employees', JSON.stringify(cleanEmployees));

    // Mark all previous non-admin employee IDs as explicitly deleted
    try {
      const knownEmps = employees.map((e) => e.id).filter((id) => id !== 'emp-001' && id !== 'cesar-emp-01');
      const dummyIds = ['emp-002', 'emp-003', 'emp-004', 'user-laura', 'user-carlos', 'user-maria', 'user-javier', 'user-ana', '4092', '88392', '3921'];
      const allToPurge = Array.from(new Set([...knownEmps, ...dummyIds]));
      localStorage.setItem('fichaplus_deleted_ids', JSON.stringify(allToPurge));
      localStorage.setItem('fichaplus_is_reset', 'true');
      localStorage.setItem('fichaplus_reset_time', nowIso);
    } catch {}

    // 3. Clear time entries, requests, incidents, and punch clock
    setTimeEntries([]);
    localStorage.setItem('fichaplus_time_entries', JSON.stringify([]));

    setTimeOffRequests([]);
    localStorage.setItem('fichaplus_requests', JSON.stringify([]));

    setIncidents([]);
    localStorage.setItem('fichaplus_incidents', JSON.stringify([]));

    setIsClockedIn(false);
    setIsPaused(false);
    setClockInTime(null);
    setElapsedSeconds(0);
    localStorage.removeItem('fichaplus_punch_state');

    // 4. Reset Monthly Record
    const cleanMonthly: MonthlyRecord = {
      id: `monthly-${Date.now()}`,
      userId: cleanEmployees[0]?.id || 'emp-001',
      userName: cleanEmployees[0]?.fullName || profile.name || 'César Hernández Moreno',
      userDni: cleanEmployees[0]?.dni || profile.dni || '12345678X',
      month: new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' }),
      yearMonth: nowIso.slice(0, 7),
      ordinaryHours: 0,
      extraHours: 0,
      complementaryHours: 0,
      isSigned: false,
    };
    setMonthlyRecord(cleanMonthly);
    localStorage.setItem('fichaplus_monthly', JSON.stringify(cleanMonthly));

    // 5. Initial Audit Log
    const hash = await generateSHA256(`PURGE_COMPANY_RESET_${nowIso}_${profile.name}`);
    const resetLog: AuditLog = {
      id: `audit-reset-${Date.now()}`,
      actionType: 'ELIMINACIÓN',
      performedBy: profile.name || 'Administrador Principal',
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
    localStorage.setItem('fichaplus_audit', JSON.stringify([resetLog]));

    // 6. Reset Notifications
    const resetNotif: AppNotification = {
      id: `notif-reset-${Date.now()}`,
      title: 'Sistema Restablecido con Éxito',
      message: 'Todos los datos de prueba han sido eliminados. Puedes dar de alta a tus empleados reales y personalizar los datos fiscales.',
      type: 'info',
      timestamp: 'Ahora',
      read: false,
    };
    setNotifications([resetNotif]);
    localStorage.setItem('fichaplus_notifications', JSON.stringify([resetNotif]));

    // 7. Clear access requests
    setAccessRequests([]);
    localStorage.setItem('fichaplus_access_requests', JSON.stringify([]));

    // 8. Best-effort Firestore purge for clean sync
    try {
      const snapEntries = await safeFirestoreRead(getDocs(collection(db, 'time_entries')), 1000);
      if (snapEntries && !snapEntries.empty) {
        snapEntries.docs.forEach((d) => safeFirestoreWrite(deleteDoc(doc(db, 'time_entries', d.id)), 300));
      }
    } catch {}
    try {
      const snapReqs = await safeFirestoreRead(getDocs(collection(db, 'time_off_requests')), 1000);
      if (snapReqs && !snapReqs.empty) {
        snapReqs.docs.forEach((d) => safeFirestoreWrite(deleteDoc(doc(db, 'time_off_requests', d.id)), 300));
      }
    } catch {}
    try {
      const snapIncidents = await safeFirestoreRead(getDocs(collection(db, 'incidents')), 1000);
      if (snapIncidents && !snapIncidents.empty) {
        snapIncidents.docs.forEach((d) => safeFirestoreWrite(deleteDoc(doc(db, 'incidents', d.id)), 300));
      }
    } catch {}
    try {
      const snapEmps = await safeFirestoreRead(getDocs(collection(db, 'employees')), 1000);
      if (snapEmps && !snapEmps.empty) {
        snapEmps.docs.forEach((d) => {
          if (d.id !== 'emp-001' && d.id !== 'cesar-emp-01') {
            safeFirestoreWrite(deleteDoc(doc(db, 'employees', d.id)), 300);
          }
        });
      }
    } catch {}
    try {
      if (cleanEmployees[0]) {
        safeFirestoreWrite(setDoc(doc(db, 'employees', 'emp-001'), cleanEmployees[0]), 500);
      }
      safeFirestoreWrite(setDoc(doc(db, 'audit_logs', resetLog.id), resetLog), 500);
    } catch {}
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
