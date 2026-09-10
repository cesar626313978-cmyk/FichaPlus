import { EmployeeRecord } from '../types';

/**
 * Calculates the next sequential employee number, e.g. EMP-001, EMP-002...
 * Scans all existing records to find the highest number and increments by 1.
 */
export const getNextEmployeeNumber = (employees: EmployeeRecord[]): string => {
  let max = 0;
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
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Cleans, deduplicates and reconciles the employee directory.
 * - Merges duplicate records of the same person (e.g. same name or same email/DNI).
 * - Restores the Admin user (EMP-001) if missing.
 * - Restores base company staff if they were accidentally erased by snapshot overwrites.
 * - Guarantees sequential, unique employee numbers (no duplicate EMP-002).
 */
export const reconcileAndDeduplicateEmployees = (
  storedList: EmployeeRecord[],
  initialEmployees: EmployeeRecord[],
  adminProfile?: { name?: string; email?: string; dni?: string; phone?: string }
): EmployeeRecord[] => {
  // Read list of explicitly deleted employee IDs so we don't resurrect them
  let deletedIds: string[] = [];
  try {
    const savedDeleted = localStorage.getItem('fichaplus_deleted_ids');
    if (savedDeleted) {
      deletedIds = JSON.parse(savedDeleted);
    }
  } catch {}

  const isExplicitlyDeleted = (id: string) => deletedIds.includes(id);

  // 1. Map to collect unique employees
  // We identify duplicates if they have the exact same normalized name or same email or same DNI
  const seenPersons: EmployeeRecord[] = [];

  const addOrMergePerson = (emp: EmployeeRecord) => {
    if (!emp || !emp.fullName || isExplicitlyDeleted(emp.id)) return;

    const normName = normalizeName(emp.fullName);
    const normEmail = (emp.email || '').trim().toLowerCase();
    const normDni = (emp.dni || '').trim().toUpperCase();

    // Check if this person is already in seenPersons
    const existingIndex = seenPersons.findIndex((p) => {
      const matchName = normalizeName(p.fullName) === normName && normName.length > 3;
      const matchEmail = normEmail && p.email && p.email.trim().toLowerCase() === normEmail;
      const matchDni = normDni && p.dni && p.dni.trim().toUpperCase() === normDni;
      return matchName || matchEmail || matchDni;
    });

    if (existingIndex >= 0) {
      // Merge: prefer the newer or more complete record
      const existing = seenPersons[existingIndex];
      seenPersons[existingIndex] = {
        ...existing,
        ...emp,
        // Keep valid email (prefer .es or longer, or newer)
        email: emp.email || existing.email,
        phone: emp.phone || existing.phone,
        dni: emp.dni || existing.dni,
        worksSaturday: emp.worksSaturday ?? existing.worksSaturday,
        saturdayPlan: emp.saturdayPlan || existing.saturdayPlan,
        saturdayShift: emp.saturdayShift || existing.saturdayShift,
        id: existing.id || emp.id,
      };
    } else {
      seenPersons.push({ ...emp });
    }
  };

  // Add all currently stored employees
  if (Array.isArray(storedList)) {
    storedList.forEach(addOrMergePerson);
  }

  // 2. Ensure Admin is present (César Hernández Moreno or current admin profile)
  const adminName = adminProfile?.name || 'César Hernández Moreno';
  const adminEmail = (adminProfile?.email || 'cesar626313978@gmail.com').toLowerCase();
  const adminDni = adminProfile?.dni || '12345678X';

  const hasAdmin = seenPersons.some(
    (p) =>
      p.id === 'emp-001' ||
      normalizeName(p.fullName) === normalizeName(adminName) ||
      (p.email && p.email.toLowerCase() === adminEmail)
  );

  if (!hasAdmin) {
    seenPersons.unshift({
      id: 'emp-001',
      employeeNumber: 'EMP-001',
      fullName: adminName,
      dni: adminDni,
      email: adminEmail,
      phone: adminProfile?.phone || '+34 626 313 978',
      department: 'Desarrollo & Tecnología',
      jobTitle: 'Administrador / Responsable RRHH',
      contractType: 'Indefinido',
      weeklyHours: 40,
      status: 'ACTIVO',
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      hasRotatingShifts: true,
      rotationStartDate: '2026-08-01',
      shiftWeekA: 'Continua (08:00 - 16:00)',
      shiftWeekB: 'Partida (09:00 - 14:00 / 16:00 - 19:00)',
      worksSaturday: true,
      saturdayPlan: 'ALTERNO_A',
      saturdayShift: 'Continua (09:00 - 14:00)',
      joinedDate: '2022-03-15',
      pinCode: '1234',
    });
  }

  // 3. If pre-existing employees were erased (e.g. only 1 or 2 left), restore the initial company staff
  if (seenPersons.length < 3 && Array.isArray(initialEmployees)) {
    for (const initEmp of initialEmployees) {
      if (!isExplicitlyDeleted(initEmp.id)) {
        addOrMergePerson(initEmp);
      }
    }
  }

  // 4. Re-index employee numbers to guarantee strict uniqueness and no duplicates
  // Keep EMP-001 for admin if present
  const usedNumbers = new Set<string>();
  let nextCounter = 1;

  return seenPersons.map((emp) => {
    let empNum = emp.employeeNumber?.trim();
    if (!empNum || usedNumbers.has(empNum)) {
      // Find next free number
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
 * Merges Firestore snapshot list into local list without deleting local employees.
 */
export const mergeEmployees = (
  localList: EmployeeRecord[],
  firestoreList: EmployeeRecord[]
): EmployeeRecord[] => {
  const map = new Map<string, EmployeeRecord>();

  // Add local employees first
  for (const emp of localList) {
    if (emp?.id) {
      map.set(emp.id, emp);
    }
  }

  // Add / update with Firestore docs
  for (const fEmp of firestoreList) {
    if (!fEmp?.id) continue;
    const existing = map.get(fEmp.id);
    if (existing) {
      map.set(fEmp.id, { ...existing, ...fEmp });
    } else {
      // Check if person exists by normalized name or email to prevent creating a second card
      const normName = normalizeName(fEmp.fullName);
      const normEmail = (fEmp.email || '').trim().toLowerCase();
      let matchedKey: string | null = null;

      for (const [key, val] of map.entries()) {
        if (
          (normName && normalizeName(val.fullName) === normName && normName.length > 3) ||
          (normEmail && val.email && val.email.trim().toLowerCase() === normEmail)
        ) {
          matchedKey = key;
          break;
        }
      }

      if (matchedKey) {
        // Merge into existing rather than duplicating
        const prev = map.get(matchedKey)!;
        map.set(matchedKey, { ...prev, ...fEmp, id: prev.id });
      } else {
        map.set(fEmp.id, fEmp);
      }
    }
  }

  const combined = Array.from(map.values());
  // Ensure unique numbers
  const usedNums = new Set<string>();
  let counter = 1;
  return combined.map((emp) => {
    let num = emp.employeeNumber?.trim();
    if (!num || usedNums.has(num)) {
      while (usedNums.has(`EMP-${String(counter).padStart(3, '0')}`)) {
        counter++;
      }
      num = `EMP-${String(counter).padStart(3, '0')}`;
      counter++;
    }
    usedNums.add(num);
    return { ...emp, employeeNumber: num };
  });
};
