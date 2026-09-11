import { EmployeeRecord } from '../types';

export const MASTER_ADMIN_RECORD: EmployeeRecord = {
  id: 'emp-001',
  employeeNumber: 'EMP-001',
  fullName: 'César Hernández Moreno',
  dni: '21493249W',
  email: 'cesar626313978@gmail.com',
  phone: '+34 626 313 978',
  department: 'Compras',
  jobTitle: 'Director General / Administrador',
  contractType: 'Indefinido',
  weeklyHours: 40,
  role: 'admin',
  status: 'ACTIVO',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  hasRotatingShifts: false,
  rotationStartDate: '2026-08-01',
  shiftWeekA: 'Continua (08:30 - 15:30)',
  shiftWeekB: 'Continua (08:30 - 15:30)',
  worksSaturday: true,
  saturdayPlan: 'ALTERNO_A',
  saturdayShift: 'Continua (09:00 - 14:00)',
  vacationDays: 30,
  vacationDaysType: 'NATURALES',
  allowedWorkLocations: ['presencial', 'teletrabajo', 'cliente'],
  joinedDate: '2022-03-15',
  pinCode: '1234',
};

export const INITIAL_KNOWN_EMPLOYEES: EmployeeRecord[] = [
  MASTER_ADMIN_RECORD,
  {
    id: 'emp-002',
    employeeNumber: 'EMP-002',
    fullName: 'Juan María Pérez Escalante',
    dni: '28934120H',
    email: 'juan.perez@fichaplus.com',
    phone: '+34 633 112 233',
    department: 'Operaciones',
    jobTitle: 'Técnico Especialista',
    contractType: 'Indefinido',
    weeklyHours: 40,
    role: 'employee',
    status: 'ACTIVO',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    hasRotatingShifts: true,
    rotationStartDate: '2026-01-05',
    shiftWeekA: 'Continua (08:00 - 16:00)',
    shiftWeekB: 'Partida (09:00 - 14:00 / 16:00 - 19:00)',
    worksSaturday: true,
    saturdayPlan: 'ALTERNO_B',
    saturdayShift: 'Continua (09:00 - 14:00)',
    vacationDays: 30,
    vacationDaysType: 'NATURALES',
    allowedWorkLocations: ['presencial', 'teletrabajo'],
    joinedDate: '2023-01-10',
    pinCode: '1234',
  },
  {
    id: 'emp-003',
    employeeNumber: 'EMP-003',
    fullName: 'Nataliya Holoskova Panchyshyn',
    dni: '17544959F',
    email: 'nati.com.es02022003@gmail.com',
    phone: '+34610046962',
    department: 'Tienda',
    jobTitle: 'Ventas',
    contractType: 'Indefinido',
    weeklyHours: 40,
    role: 'employee',
    status: 'ACTIVO',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
    hasRotatingShifts: true,
    rotationStartDate: '2026-08-01',
    shiftWeekA: 'Partida (09:00 - 13:00 / 16:00 - 20:00)',
    shiftWeekB: 'Continua (08:30 - 15:30)',
    worksSaturday: true,
    saturdayPlan: 'ALTERNO_A',
    saturdayShift: 'Partida (09:00 - 14:00)',
    vacationDays: 30,
    vacationDaysType: 'NATURALES',
    allowedWorkLocations: ['presencial'],
    joinedDate: '2023-05-15',
    pinCode: '1234',
  },
  {
    id: 'emp-004',
    employeeNumber: 'EMP-004',
    fullName: 'Yolanda Fernández Orge',
    dni: '53189234R',
    email: 'yolanda.fernandez@fichaplus.com',
    phone: '+34 644 223 344',
    department: 'Atención al Cliente',
    jobTitle: 'Gestora Comercial',
    contractType: 'Indefinido',
    weeklyHours: 40,
    role: 'employee',
    status: 'ACTIVO',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
    hasRotatingShifts: false,
    rotationStartDate: '2026-01-05',
    shiftWeekA: 'Partida (09:00 - 14:00 / 16:00 - 19:00)',
    shiftWeekB: 'Partida (09:00 - 14:00 / 16:00 - 19:00)',
    worksSaturday: true,
    saturdayPlan: 'ALTERNO_B',
    saturdayShift: 'Continua (09:00 - 14:00)',
    vacationDays: 30,
    vacationDaysType: 'NATURALES',
    allowedWorkLocations: ['presencial', 'cliente'],
    joinedDate: '2023-09-01',
    pinCode: '1234',
  },
];

/**
 * Calculates the next sequential employee number, e.g. EMP-001, EMP-002...
 * Scans all existing records to find the highest number and increments by 1.
 */
export const getNextEmployeeNumber = (employees: EmployeeRecord[]): string => {
  let max = 1; // EMP-001 is reserved for Admin
  for (const emp of employees) {
    if (!emp?.employeeNumber) continue;
    const match = emp.employeeNumber.match(/\d+/);
    if (match) {
      const val = parseInt(match[0], 10);
      if (!isNaN(val) && val > max) {
        max = val;
      }
    }
  }
  const next = max + 1;
  return `EMP-${String(next).padStart(3, '0')}`;
};

/**
 * Normalizes full name for comparison (removes accents, lowercase, trims spaces)
 */
export const normalizeName = (name: string): string => {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Normalizes phone numbers to compare national digits (last 9 digits)
 */
export const getCleanPhoneDigits = (phone?: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 9) {
    return digits.slice(-9);
  }
  return digits;
};

/**
 * Checks whether an employee record represents the Master Administrator (César)
 */
export const isMasterAdmin = (emp?: Partial<EmployeeRecord> | null): boolean => {
  if (!emp) return false;
  const email = (emp.email || '').toLowerCase().trim();
  if (email === 'cesar626313978@gmail.com') return true;
  const normName = normalizeName(emp.fullName || '');
  if (normName === 'cesar hernandez moreno' || normName === 'cesar hernandez') return true;
  return false;
};

/**
 * Checks if two employee records represent the exact same human being
 */
export const areSamePerson = (
  a: Partial<EmployeeRecord>,
  b: Partial<EmployeeRecord>
): boolean => {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;

  // Name check (normalized)
  const nameA = normalizeName(a.fullName || '');
  const nameB = normalizeName(b.fullName || '');
  if (nameA && nameB && nameA === nameB && nameA.length > 3) {
    return true;
  }

  // Email check
  const emailA = (a.email || '').toLowerCase().trim();
  const emailB = (b.email || '').toLowerCase().trim();
  if (emailA && emailB && emailA === emailB) {
    return true;
  }

  // DNI check (ignoring generic placeholder)
  const dniA = (a.dni || '').toUpperCase().trim();
  const dniB = (b.dni || '').toUpperCase().trim();
  if (
    dniA &&
    dniB &&
    dniA === dniB &&
    dniA !== '00000000A' &&
    dniA !== '12345678X'
  ) {
    return true;
  }

  // Phone check (last 9 digits)
  const phoneA = getCleanPhoneDigits(a.phone);
  const phoneB = getCleanPhoneDigits(b.phone);
  if (phoneA && phoneB && phoneA.length === 9 && phoneA === phoneB) {
    return true;
  }

  return false;
};

/**
 * Cleans, deduplicates and reconciles the employee directory.
 * - Merges duplicate records of the same person (e.g. same name or same email/DNI/phone).
 * - Guarantees the Master Admin user (César Hernández Moreno, EMP-001) is ALWAYS present.
 * - Guarantees sequential, unique employee numbers (EMP-001, EMP-002, EMP-003, no duplicates).
 */
export const reconcileAndDeduplicateEmployees = (
  storedList: EmployeeRecord[],
  initialEmployees?: EmployeeRecord[],
  adminProfile?: { name?: string; email?: string; dni?: string; phone?: string }
): EmployeeRecord[] => {
  // Clear any accidental deletion of admin from deleted IDs
  try {
    const savedDeleted = localStorage.getItem('fichaplus_deleted_ids');
    if (savedDeleted) {
      let deletedIds: string[] = JSON.parse(savedDeleted);
      if (Array.isArray(deletedIds)) {
        const cleaned = deletedIds.filter(
          (id) => id !== 'emp-001' && id !== 'cesar-emp-01'
        );
        if (cleaned.length !== deletedIds.length) {
          localStorage.setItem('fichaplus_deleted_ids', JSON.stringify(cleaned));
        }
      }
    }
  } catch {}

  let deletedIds: string[] = [];
  try {
    const savedDeleted = localStorage.getItem('fichaplus_deleted_ids');
    if (savedDeleted) {
      deletedIds = JSON.parse(savedDeleted);
    }
  } catch {}

  const isExplicitlyDeleted = (id: string) =>
    id !== 'emp-001' && id !== 'cesar-emp-01' && deletedIds.includes(id);

  const seenPersons: EmployeeRecord[] = [];
  let foundAdminRecord: EmployeeRecord | null = null;

  const addOrMergePerson = (incoming: EmployeeRecord) => {
    if (!incoming || !incoming.fullName) return;
    if (isExplicitlyDeleted(incoming.id)) return;

    // Check if incoming is the master admin César
    if (isMasterAdmin(incoming)) {
      if (!foundAdminRecord) {
        foundAdminRecord = {
          ...MASTER_ADMIN_RECORD,
          ...incoming,
          id: 'emp-001',
          employeeNumber: 'EMP-001',
          role: 'admin',
          status: 'ACTIVO',
        };
      } else {
        foundAdminRecord = {
          ...foundAdminRecord,
          ...incoming,
          id: 'emp-001',
          employeeNumber: 'EMP-001',
          role: 'admin',
        };
      }
      return;
    }

    // If an employee was mistakenly saved with id 'emp-001' but is NOT César, give them their own id
    let empToProcess = { ...incoming };
    if (empToProcess.id === 'emp-001') {
      empToProcess.id = `emp-staff-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    // Search for existing person in seenPersons
    const existingIndex = seenPersons.findIndex((p) => areSamePerson(p, empToProcess));

    if (existingIndex >= 0) {
      // Merge: prefer real DNI, prefer better phone, prefer valid email
      const existing = seenPersons[existingIndex];
      const bestDni =
        empToProcess.dni && empToProcess.dni.length >= 8 && !empToProcess.dni.includes('00000000')
          ? empToProcess.dni
          : existing.dni || empToProcess.dni;
      const bestEmail =
        empToProcess.email && empToProcess.email.includes('@')
          ? empToProcess.email
          : existing.email || empToProcess.email;
      const bestPhone =
        empToProcess.phone && empToProcess.phone.length >= 9
          ? empToProcess.phone
          : existing.phone || empToProcess.phone;

      seenPersons[existingIndex] = {
        ...existing,
        ...empToProcess,
        dni: bestDni,
        email: bestEmail,
        phone: bestPhone,
        id: existing.id || empToProcess.id,
        // Keep active status if either was active
        status: existing.status === 'ACTIVO' || empToProcess.status === 'ACTIVO' ? 'ACTIVO' : empToProcess.status,
      };
    } else {
      seenPersons.push({ ...empToProcess });
    }
  };

  // Add all stored employees
  if (Array.isArray(storedList)) {
    storedList.forEach(addOrMergePerson);
  }

  // Only initialize with initial employees if storedList was completely empty/undefined,
  // AND initialEmployees was explicitly provided, AND no company reset flag exists.
  const isReset = typeof window !== 'undefined' && localStorage.getItem('fichaplus_is_reset') === 'true';
  if (!isReset && (!storedList || storedList.length === 0) && seenPersons.length === 0 && Array.isArray(initialEmployees) && initialEmployees.length > 0) {
    for (const initEmp of initialEmployees) {
      if (!isExplicitlyDeleted(initEmp.id)) {
        addOrMergePerson(initEmp);
      }
    }
  }

  // Ensure Admin record is ALWAYS initialized
  if (!foundAdminRecord) {
    foundAdminRecord = {
      ...MASTER_ADMIN_RECORD,
      fullName: adminProfile?.name || MASTER_ADMIN_RECORD.fullName,
      email: adminProfile?.email || MASTER_ADMIN_RECORD.email,
      phone: adminProfile?.phone || MASTER_ADMIN_RECORD.phone,
      dni: adminProfile?.dni || MASTER_ADMIN_RECORD.dni,
    };
  }

  // Admin is ALWAYS position 0
  const combinedList: EmployeeRecord[] = [foundAdminRecord, ...seenPersons];

  // Re-index employee numbers: EMP-001 for admin, strictly sequential unique numbers for others
  const usedNumbers = new Set<string>(['EMP-001']);
  let nextCounter = 2;

  return combinedList.map((emp, idx) => {
    if (idx === 0) {
      return {
        ...emp,
        id: 'emp-001',
        employeeNumber: 'EMP-001',
        role: 'admin',
      };
    }

    let empNum = emp.employeeNumber?.trim();
    if (!empNum || empNum === 'EMP-001' || usedNumbers.has(empNum)) {
      while (usedNumbers.has(`EMP-${String(nextCounter).padStart(3, '0')}`)) {
        nextCounter++;
      }
      empNum = `EMP-${String(nextCounter).padStart(3, '0')}`;
      nextCounter++;
    }
    usedNumbers.add(empNum);

    return {
      ...emp,
      employeeNumber: empNum,
    };
  });
};

/**
 * Merges Firestore snapshot list into local list without creating duplicates.
 */
export const mergeEmployees = (
  localList: EmployeeRecord[],
  firestoreList: EmployeeRecord[]
): EmployeeRecord[] => {
  const combined = [...(localList || []), ...(firestoreList || [])];
  return reconcileAndDeduplicateEmployees(combined);
};

/**
 * Returns the effective vacation days allocated to an employee (defaults to 30 days naturales).
 */
export const getEmployeeVacationDays = (emp?: Partial<EmployeeRecord> | null): number => {
  if (!emp) return 30;
  if (typeof emp.vacationDays === 'number' && emp.vacationDays > 0) {
    return emp.vacationDays;
  }
  return 30;
};

/**
 * Returns the vacation type: 'NATURALES' (default 30 days) or 'LABORABLES' (22 days).
 */
export const getEmployeeVacationType = (
  emp?: Partial<EmployeeRecord> | null
): 'NATURALES' | 'LABORABLES' => {
  if (!emp) return 'NATURALES';
  return emp.vacationDaysType === 'LABORABLES' ? 'LABORABLES' : 'NATURALES';
};

