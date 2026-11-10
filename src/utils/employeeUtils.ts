import { EmployeeRecord } from '../types';

export const MASTER_ADMIN_RECORD: EmployeeRecord = {
  id: 'emp-001',
  employeeNumber: 'EMP-001',
  fullName: 'César Hernández Moreno',
  dni: '21493249W',
  email: 'cesar626313978@gmail.com',
  phone: '+34626313978',
  department: 'Tienda',
  jobTitle: 'Encargado / Tienda',
  contractType: 'Indefinido (Cód. 189)',
  weeklyHours: 40,
  workdayType: 'COMPLETA',
  workplaceLocation: 'PG INDUSTRIAL CASAGRAND, S/N - 03183 TORREVIEJA',
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
  vacationDays: 32,
  vacationDaysType: 'NATURALES',
  allowedWorkLocations: ['presencial', 'teletrabajo', 'cliente'],
  joinedDate: '2007-02-21',
  pinCode: '1234',
  socialSecurityNumber: '03/01094232-09',
  professionalCategory: 'ENCARGADO',
  tariffGroup: '1',
  contractCode: '189',
  payrollNumber: '14',
  address: 'CL MADRID 12 BJ, 03690 SAN VICENTE DEL RASPEIG (ALICANTE)',
  baseSalary: 1474.55,
  proratedBonus: 255.58,
  jobAllowance: 58.98,
  transportAllowance: 68.88,
  grossMonthlySalary: 1857.99,
  ssContributionBase: 1989.30,
  irpfPercentage: 12.92,
  netMonthlySalary: 1490.80,
};

export const INITIAL_KNOWN_EMPLOYEES: EmployeeRecord[] = [
  MASTER_ADMIN_RECORD,
  {
    id: 'emp-002',
    employeeNumber: 'EMP-002',
    fullName: 'Juan María Pérez Escalante',
    dni: '44151304K',
    email: 'chichobow@hotmail.es',
    phone: '+34627790526',
    department: 'Tienda',
    jobTitle: 'Dependiente / Tienda',
    contractType: 'Indefinido (Cód. 189)',
    weeklyHours: 40,
    workdayType: 'COMPLETA',
    workplaceLocation: 'PG INDUSTRIAL CASAGRAND, S/N - 03183 TORREVIEJA',
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
    vacationDays: 32,
    vacationDaysType: 'NATURALES',
    allowedWorkLocations: ['presencial', 'teletrabajo'],
    joinedDate: '2016-09-05',
    pinCode: '0308',
    socialSecurityNumber: '03/10157616-19',
    professionalCategory: 'DEPENDIENT',
    tariffGroup: '8',
    contractCode: '189',
    payrollNumber: '34',
    address: 'UR TORRETA II 247, 03184 TORREVIEJA (ALICANTE)',
    baseSalary: 1282.22,
    proratedBonus: 213.70,
    transportAllowance: 68.88,
    grossMonthlySalary: 1564.80,
    ssContributionBase: 1564.80,
    irpfPercentage: 9.38,
    netMonthlySalary: 1316.31,
  },
  {
    id: 'emp-003',
    employeeNumber: 'EMP-003',
    fullName: 'Nataliya Holoskova Panchyshyn',
    dni: '17544959F',
    email: 'nati.com.es02022003@gmail.com',
    phone: '+34610046962',
    department: 'Tienda',
    jobTitle: 'Tienda / Auxiliar de Limpieza',
    contractType: 'Indefinido Ordinario (Cód. 100)',
    weeklyHours: 40,
    workdayType: 'COMPLETA',
    workplaceLocation: 'PG INDUSTRIAL CASAGRAND, S/N - 03183 TORREVIEJA',
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
    vacationDays: 32,
    vacationDaysType: 'NATURALES',
    allowedWorkLocations: ['presencial'],
    joinedDate: '2024-03-18',
    pinCode: '1510',
    socialSecurityNumber: '02/10112095-07',
    professionalCategory: 'AUX LIMPIE',
    tariffGroup: '10',
    contractCode: '100',
    payrollNumber: '31',
    address: 'UR PARQUE DE LAS NACIONES 117 B, 03182 TORREVIEJA (ALICANTE)',
    baseSalary: 1282.22,
    proratedBonus: 213.70,
    transportAllowance: 68.88,
    grossMonthlySalary: 1564.80,
    ssContributionBase: 1564.80,
    irpfPercentage: 7.29,
    netMonthlySalary: 1349.02,
  },
  {
    id: 'emp-004',
    employeeNumber: 'EMP-004',
    fullName: 'Yolanda Fernández Orge',
    dni: '01183503S',
    email: 'yfernandezorge@gmail.com',
    phone: '+34622476458',
    department: 'Tienda',
    jobTitle: 'Tienda / Auxiliar de Limpieza',
    contractType: 'Indefinido (Cód. 189)',
    weeklyHours: 40,
    workdayType: 'COMPLETA',
    workplaceLocation: 'PG INDUSTRIAL CASAGRAND, S/N - 03183 TORREVIEJA',
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
    vacationDays: 32,
    vacationDaysType: 'NATURALES',
    allowedWorkLocations: ['presencial', 'cliente'],
    joinedDate: '2021-05-03',
    pinCode: '3110',
    socialSecurityNumber: '28/10172843-05',
    professionalCategory: 'AUX LIMPIE',
    tariffGroup: '10',
    contractCode: '189',
    payrollNumber: '40',
    address: 'CL ALEXANDER FLEMING 95, 03183 TORREVIEJA (ALICANTE)',
    baseSalary: 1282.22,
    proratedBonus: 213.70,
    transportAllowance: 68.88,
    grossMonthlySalary: 1564.80,
    ssContributionBase: 1564.80,
    irpfPercentage: 9.38,
    netMonthlySalary: 1316.31,
  },
  {
    id: 'emp-005',
    employeeNumber: 'EMP-005',
    fullName: 'Rocío Alcocer Ballester',
    dni: '48457314V',
    email: 'roalcocerballester@gmail.com',
    phone: '+34617453732',
    department: 'Veterinario',
    jobTitle: 'Veterinaria',
    contractType: 'Indefinido (Cód. 189)',
    weeklyHours: 40,
    workdayType: 'COMPLETA',
    workplaceLocation: 'PG INDUSTRIAL CASAGRAND, S/N - 03183 TORREVIEJA',
    role: 'employee',
    status: 'ACTIVO',
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=250&q=80',
    hasRotatingShifts: true,
    rotationStartDate: '2026-01-05',
    shiftWeekA: 'Continua (09:00 - 17:00)',
    shiftWeekB: 'Partida (09:00 - 14:00 / 16:30 - 19:30)',
    worksSaturday: true,
    saturdayPlan: 'ALTERNO_A',
    saturdayShift: 'Continua (09:00 - 14:00)',
    vacationDays: 30,
    vacationDaysType: 'NATURALES',
    allowedWorkLocations: ['presencial', 'cliente'],
    joinedDate: '2009-08-10',
    pinCode: '8015',
    socialSecurityNumber: '03/10184672-12',
    professionalCategory: 'VETERINARI',
    tariffGroup: '1',
    contractCode: '189',
    payrollNumber: '19',
    address: 'UR CALAS BLANCAS PLGONO II 69, 03183 TORREVIEJA (ALICANTE)',
    baseSalary: 1666.89,
    proratedBonus: 277.82,
    transportAllowance: 68.88,
    grossMonthlySalary: 2013.59,
    ssContributionBase: 2013.59,
    irpfPercentage: 12.62,
    netMonthlySalary: 1628.59,
  },
  {
    id: 'emp-006',
    employeeNumber: 'EMP-006',
    fullName: 'Sergio Arredondo Navarrete',
    dni: '76148344J',
    email: 'sergiofreila2@gmail.com',
    phone: '+34606106142',
    department: 'Veterinario',
    jobTitle: 'Veterinario',
    contractType: 'Indefinido (Cód. 189)',
    weeklyHours: 40,
    workdayType: 'COMPLETA',
    workplaceLocation: 'PG INDUSTRIAL CASAGRAND, S/N - 03183 TORREVIEJA',
    role: 'employee',
    status: 'ACTIVO',
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=250&q=80',
    hasRotatingShifts: true,
    rotationStartDate: '2026-01-05',
    shiftWeekA: 'Partida (09:00 - 14:00 / 16:30 - 19:30)',
    shiftWeekB: 'Continua (09:00 - 17:00)',
    worksSaturday: true,
    saturdayPlan: 'ALTERNO_B',
    saturdayShift: 'Continua (09:00 - 14:00)',
    vacationDays: 30,
    vacationDaysType: 'NATURALES',
    allowedWorkLocations: ['presencial', 'cliente'],
    joinedDate: '2009-12-10',
    pinCode: '0987',
    socialSecurityNumber: '14/10244276-76',
    professionalCategory: 'VETERINARI',
    tariffGroup: '1',
    contractCode: '189',
    payrollNumber: '21',
    address: 'CL RODRIGO DE TRIANA 2, 1º D, 03140 GUARDAMAR DEL SEGURA (ALICANTE)',
    baseSalary: 1666.89,
    proratedBonus: 277.82,
    transportAllowance: 68.88,
    grossMonthlySalary: 2013.59,
    ssContributionBase: 2013.59,
    irpfPercentage: 12.62,
    netMonthlySalary: 1628.59,
  },
  {
    id: 'emp-007',
    employeeNumber: 'EMP-007',
    fullName: 'Almudena Rueda Gomariz',
    dni: '71358103M',
    email: 'almurueda7@gmail.com',
    phone: '+34665178613',
    department: 'Veterinaria',
    jobTitle: 'Veterinaria',
    contractType: 'Indefinido Ordinario (Cód. 100)',
    weeklyHours: 40,
    workdayType: 'COMPLETA',
    workplaceLocation: 'PG INDUSTRIAL CASAGRAND, S/N - 03183 TORREVIEJA',
    role: 'employee',
    status: 'ACTIVO',
    avatarUrl: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=250&q=80',
    hasRotatingShifts: true,
    rotationStartDate: '2026-01-05',
    shiftWeekA: 'Continua (09:00 - 17:00)',
    shiftWeekB: 'Partida (09:00 - 14:00 / 16:30 - 19:30)',
    worksSaturday: true,
    saturdayPlan: 'ALTERNO_A',
    saturdayShift: 'Continua (09:00 - 14:00)',
    vacationDays: 30,
    vacationDaysType: 'NATURALES',
    allowedWorkLocations: ['presencial', 'cliente'],
    joinedDate: '2023-02-02',
    pinCode: '0503',
    socialSecurityNumber: '13/10322904-53',
    professionalCategory: 'VETERINARI',
    tariffGroup: '1',
    contractCode: '100',
    payrollNumber: '43',
    address: 'CL CONCORDIA 13, 13326 MONTIEL (CIUDAD REAL)',
    baseSalary: 1666.89,
    proratedBonus: 277.82,
    transportAllowance: 68.88,
    grossMonthlySalary: 2013.59,
    ssContributionBase: 2013.59,
    irpfPercentage: 14.47,
    netMonthlySalary: 1591.34,
  },
];

// Legacy placeholder values that should be automatically replaced by the official payroll & contact values
const LEGACY_PLACEHOLDER_DNIS = new Set([
  '00000000A',
  '12345678X',
  '28934120H',
  '53189234R',
  'PENDIENTE',
]);

const LEGACY_PLACEHOLDER_JOIN_DATES = new Set([
  '2022-03-15',
  '2023-01-10',
  '2023-05-15',
  '2023-09-01',
  '2024-01-01',
]);

const LEGACY_PLACEHOLDER_JOB_TITLES = new Set([
  'Técnico Especialista',
  'Gestora Comercial',
  'Ventas',
  'Director General / Administrador',
  'Especialista',
  'Encargado / Administrador',
  'Dependiente',
  'Auxiliar de Limpieza',
]);

const LEGACY_PLACEHOLDER_DEPTS = new Set([
  'Operaciones',
  'Atención al Cliente',
  'Compras',
  'Dirección y Compras',
  'Tienda y Comercial',
  'Tienda y Mantenimiento',
  'Clínica Veterinaria',
]);

const LEGACY_PLACEHOLDER_PHONES = new Set([
  '+34 633 112 233',
  '+34 644 223 344',
  '+34 655 101 846',
  '+34 666 244 276',
  '+34 677 322 904',
  '+34 626 313 978',
  '+34 600 000 000',
  '633112233',
  '644223344',
  '655101846',
  '666244276',
  '677322904',
]);

const isPlaceholderEmail = (email?: string): boolean => {
  if (!email) return true;
  const lower = email.trim().toLowerCase();
  return (
    lower.endsWith('@fichaplus.com') ||
    lower.endsWith('@torremascotas.com') ||
    lower.endsWith('@torremascotas.es')
  );
};

const isPlaceholderPhone = (phone?: string): boolean => {
  if (!phone || !phone.trim()) return true;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '').slice(-9);
  return LEGACY_PLACEHOLDER_PHONES.has(trimmed) || LEGACY_PLACEHOLDER_PHONES.has(digits);
};

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
  const dni = (emp.dni || '').toUpperCase().trim();
  if (dni === '21493249W') return true;
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

  // Name check (normalized, including partial match for Nataliya Holoskova vs Nataliya Holoskova Panchyshyn)
  const nameA = normalizeName(a.fullName || '');
  const nameB = normalizeName(b.fullName || '');
  if (nameA && nameB && nameA.length > 3 && nameB.length > 3) {
    if (nameA === nameB) return true;
    if (
      (nameA.startsWith('nataliya holoskova') && nameB.startsWith('nataliya holoskova')) ||
      (nameA.startsWith('juan maria perez') && nameB.startsWith('juan maria perez'))
    ) {
      return true;
    }
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
    !LEGACY_PLACEHOLDER_DNIS.has(dniA)
  ) {
    return true;
  }

  // Social Security Number check
  const ssA = (a.socialSecurityNumber || '').trim();
  const ssB = (b.socialSecurityNumber || '').trim();
  if (ssA && ssB && ssA === ssB) {
    return true;
  }

  // Phone check (last 9 digits, ignoring placeholder phones)
  const phoneA = getCleanPhoneDigits(a.phone);
  const phoneB = getCleanPhoneDigits(b.phone);
  if (
    phoneA &&
    phoneB &&
    phoneA.length === 9 &&
    phoneA === phoneB &&
    !LEGACY_PLACEHOLDER_PHONES.has(phoneA)
  ) {
    return true;
  }

  return false;
};

/**
 * Enriches an employee record with official payroll & contact data from INITIAL_KNOWN_EMPLOYEES
 * if a matching official record exists, replacing old demo placeholders while preserving user customizations.
 */
const enrichWithOfficialPayrollRecord = (emp: EmployeeRecord): EmployeeRecord => {
  const official = INITIAL_KNOWN_EMPLOYEES.find((k) => areSamePerson(k, emp));
  if (!official) return emp;

  const currentDni = (emp.dni || '').trim().toUpperCase();
  const resolvedDni =
    !currentDni || LEGACY_PLACEHOLDER_DNIS.has(currentDni) ? official.dni : currentDni;

  const resolvedJoinedDate =
    !emp.joinedDate || LEGACY_PLACEHOLDER_JOIN_DATES.has(emp.joinedDate)
      ? official.joinedDate
      : emp.joinedDate;

  const resolvedJobTitle =
    !emp.jobTitle || LEGACY_PLACEHOLDER_JOB_TITLES.has(emp.jobTitle)
      ? official.jobTitle
      : emp.jobTitle;

  const resolvedDepartment =
    !emp.department || LEGACY_PLACEHOLDER_DEPTS.has(emp.department)
      ? official.department
      : emp.department;

  const resolvedContractType =
    !emp.contractType || emp.contractType === 'Indefinido' || emp.contractType === 'TIEMPO COMPLETO'
      ? official.contractType
      : emp.contractType;

  const resolvedEmail = isPlaceholderEmail(emp.email)
    ? official.email
    : emp.email;

  const resolvedPhone = isPlaceholderPhone(emp.phone)
    ? official.phone
    : emp.phone;

  const resolvedPinCode =
    !emp.pinCode || emp.pinCode === '1234'
      ? official.pinCode
      : emp.pinCode;

  const resolvedVacationDays =
    !emp.vacationDays || (emp.vacationDays === 30 && official.vacationDays === 32)
      ? official.vacationDays
      : emp.vacationDays;

  return {
    ...official,
    ...emp,
    fullName: official.fullName,
    dni: resolvedDni,
    email: resolvedEmail,
    phone: resolvedPhone,
    pinCode: resolvedPinCode,
    vacationDays: resolvedVacationDays,
    joinedDate: resolvedJoinedDate,
    jobTitle: resolvedJobTitle,
    department: resolvedDepartment,
    contractType: resolvedContractType,
    workplaceLocation: emp.workplaceLocation || official.workplaceLocation,
    socialSecurityNumber: emp.socialSecurityNumber || official.socialSecurityNumber,
    professionalCategory: emp.professionalCategory || official.professionalCategory,
    tariffGroup: emp.tariffGroup || official.tariffGroup,
    contractCode: emp.contractCode || official.contractCode,
    payrollNumber: emp.payrollNumber || official.payrollNumber,
    address: emp.address || official.address,
    baseSalary: emp.baseSalary ?? official.baseSalary,
    proratedBonus: emp.proratedBonus ?? official.proratedBonus,
    jobAllowance: emp.jobAllowance ?? official.jobAllowance,
    transportAllowance: emp.transportAllowance ?? official.transportAllowance,
    grossMonthlySalary: emp.grossMonthlySalary ?? official.grossMonthlySalary,
    ssContributionBase: emp.ssContributionBase ?? official.ssContributionBase,
    irpfPercentage: emp.irpfPercentage ?? official.irpfPercentage,
    netMonthlySalary: emp.netMonthlySalary ?? official.netMonthlySalary,
  };
};

/**
 * Cleans, deduplicates and reconciles the employee directory.
 * - Merges duplicate records of the same person (e.g. same name or same email/DNI/phone).
 * - Guarantees the Master Admin user (César Hernández Moreno, EMP-001) is ALWAYS present.
 * - Guarantees all 7 official TORREMASCOTAS S.L. employees are present and enriched with official payroll data.
 * - Guarantees sequential, unique employee numbers (EMP-001, EMP-002, EMP-003, no duplicates).
 */
export const reconcileAndDeduplicateEmployees = (
  storedList: EmployeeRecord[],
  initialEmployees: EmployeeRecord[] = INITIAL_KNOWN_EMPLOYEES,
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

  const addOrMergePerson = (rawIncoming: EmployeeRecord) => {
    if (!rawIncoming || !rawIncoming.fullName) return;
    if (isExplicitlyDeleted(rawIncoming.id)) return;

    const incoming = enrichWithOfficialPayrollRecord(rawIncoming);

    // Check if incoming is the master admin César
    if (isMasterAdmin(incoming)) {
      if (!foundAdminRecord) {
        foundAdminRecord = enrichWithOfficialPayrollRecord({
          ...MASTER_ADMIN_RECORD,
          ...incoming,
          id: 'emp-001',
          employeeNumber: 'EMP-001',
          role: 'admin',
          status: 'ACTIVO',
        });
      } else {
        foundAdminRecord = enrichWithOfficialPayrollRecord({
          ...foundAdminRecord,
          ...incoming,
          id: 'emp-001',
          employeeNumber: 'EMP-001',
          role: 'admin',
        });
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
      // Merge: prefer real DNI, prefer real phone, prefer valid non-placeholder email
      const existing = seenPersons[existingIndex];
      const bestDni =
        empToProcess.dni &&
        empToProcess.dni.length >= 8 &&
        !LEGACY_PLACEHOLDER_DNIS.has(empToProcess.dni.toUpperCase())
          ? empToProcess.dni
          : existing.dni && !LEGACY_PLACEHOLDER_DNIS.has(existing.dni.toUpperCase())
          ? existing.dni
          : empToProcess.dni || existing.dni;
      const bestEmail =
        !isPlaceholderEmail(empToProcess.email)
          ? empToProcess.email
          : !isPlaceholderEmail(existing.email)
          ? existing.email
          : empToProcess.email || existing.email;
      const bestPhone =
        !isPlaceholderPhone(empToProcess.phone)
          ? empToProcess.phone
          : !isPlaceholderPhone(existing.phone)
          ? existing.phone
          : empToProcess.phone || existing.phone;

      seenPersons[existingIndex] = enrichWithOfficialPayrollRecord({
        ...existing,
        ...empToProcess,
        dni: bestDni,
        email: bestEmail,
        phone: bestPhone,
        id: existing.id || empToProcess.id,
        status: existing.status === 'ACTIVO' || empToProcess.status === 'ACTIVO' ? 'ACTIVO' : empToProcess.status,
      });
    } else {
      seenPersons.push({ ...empToProcess });
    }
  };

  // Add all stored employees first
  if (Array.isArray(storedList)) {
    storedList.forEach(addOrMergePerson);
  }

  // Always ensure all 7 official employees from TORREMASCOTAS S.L. (INITIAL_KNOWN_EMPLOYEES)
  // are present in the directory unless the company was explicitly wiped via reset or the employee was deleted
  const isReset = typeof window !== 'undefined' && localStorage.getItem('fichaplus_is_reset') === 'true';
  const rosterToEnsure = Array.isArray(initialEmployees) && initialEmployees.length > 0
    ? initialEmployees
    : INITIAL_KNOWN_EMPLOYEES;

  if (!isReset) {
    for (const initEmp of rosterToEnsure) {
      if (!isExplicitlyDeleted(initEmp.id)) {
        addOrMergePerson(initEmp);
      }
    }
  }

  // Ensure Admin record is ALWAYS initialized
  if (!foundAdminRecord) {
    foundAdminRecord = enrichWithOfficialPayrollRecord({
      ...MASTER_ADMIN_RECORD,
      fullName: adminProfile?.name || MASTER_ADMIN_RECORD.fullName,
      email: adminProfile?.email || MASTER_ADMIN_RECORD.email,
      phone: adminProfile?.phone || MASTER_ADMIN_RECORD.phone,
      dni:
        adminProfile?.dni && !LEGACY_PLACEHOLDER_DNIS.has(adminProfile.dni.toUpperCase())
          ? adminProfile.dni
          : MASTER_ADMIN_RECORD.dni,
    });
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

/**
 * Resolves a unique, device-independent Firestore document key for real-time punch state synchronization.
 * Prioritizes normalized email, then DNI, then employee ID.
 */
export const getPunchDocKey = (
  user?: { email?: string; dni?: string; id?: string } | null,
  emp?: Partial<EmployeeRecord> | null
): string => {
  const email = (user?.email || emp?.email || '').trim().toLowerCase();
  if (email) {
    return `punch_email_${email.replace(/[^a-z0-9]/g, '_')}`;
  }
  const dni = (user?.dni || emp?.dni || '').trim().toLowerCase();
  if (dni) {
    return `punch_dni_${dni.replace(/[^a-z0-9]/g, '_')}`;
  }
  const id = (user?.id || emp?.id || 'emp-001').toLowerCase();
  return `punch_id_${id.replace(/[^a-z0-9]/g, '_')}`;
};

/**
 * Formats a "YYYY-MM" string to a human-readable Spanish month label.
 * E.g. "2026-09" -> "Septiembre de 2026"
 */
export const formatYearMonthLabel = (yearMonth: string): string => {
  if (!yearMonth || !yearMonth.includes('-')) return yearMonth || '';
  const [y, m] = yearMonth.split('-').map(Number);
  if (isNaN(y) || isNaN(m)) return yearMonth;
  const d = new Date(y, m - 1, 1);
  const raw = d.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

/**
 * Determines whether a given calendar month ("YYYY-MM") has concluded.
 * Under Spanish Labor Law (Art. 34.9 Estatuto de los Trabajadores), monthly signing
 * must take place "a mes vencido" (once the natural month has ended).
 * During the active month, hours are still being registered, so asking for a signature
 * is premature and not legally compliant.
 */
export const isMonthClosed = (yearMonth: string, referenceDate: Date = new Date()): boolean => {
  if (!yearMonth) return false;
  const [yearStr, monthStr] = yearMonth.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10); // 1-12
  if (isNaN(y) || isNaN(m)) return false;

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1; // 1-12

  if (y < currentYear) return true;
  if (y > currentYear) return false;

  // Same year:
  if (m < currentMonth) return true; // Previous month is closed
  if (m > currentMonth) return false; // Future month

  // Current month: Only considered closed if on the last calendar day after working hours (>= 20h)
  const lastDayOfMonth = new Date(y, m, 0).getDate();
  const currentDay = referenceDate.getDate();
  return currentDay >= lastDayOfMonth && referenceDate.getHours() >= 20;
};

