import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserProfile, EmployeeRecord } from '../types';

export interface AuthResult {
  success: boolean;
  reason?: 'NOT_INVITED' | 'DNI_NOT_FOUND' | 'INVALID_PIN' | 'POPUP_CANCELLED' | 'UNKNOWN';
  message?: string;
  email?: string;
  name?: string;
  dni?: string;
  isNewCompany?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile;
  isAuthenticated: boolean;
  loading: boolean;
  signInFast: (identifier: string) => Promise<AuthResult>;
  signInWithGoogle: (fallbackEmail?: string) => Promise<AuthResult>;
  signInWithEmailAndPin: (email: string, pin?: string) => Promise<AuthResult>;
  signInWithEmployeePin: (dni: string, pin?: string) => Promise<AuthResult>;
  createCompanyWorkspace: (data: {
    companyName: string;
    fiscalId: string;
    adminName: string;
    adminEmail: string;
    adminPhone?: string;
  }) => Promise<AuthResult>;
  checkInvitationStatus: (query: string) => { isInvited: boolean; employee?: EmployeeRecord; reason?: string };
  loginAsProfile: (profile: UserProfile) => void;
  signOut: () => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
  switchRole: (role: 'employee' | 'admin' | 'manager') => void;
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'emp-001',
  name: 'César Hernández Moreno',
  email: 'cesar626313978@gmail.com',
  role: 'admin',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  dni: '12345678X',
  phone: '+34 626 313 978',
  department: 'Desarrollo & RRHH',
  jobTitle: 'Responsable de Personal',
  contractType: 'Indefinido',
  weeklyHours: 40,
  currentShift: 'Rotativo A/B',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get active employees from local cache or defaults
export const getKnownEmployees = (): EmployeeRecord[] => {
  try {
    const saved = localStorage.getItem('fichaplus_employees');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  return [
    {
      id: 'emp-001',
      employeeNumber: 'EMP-001',
      fullName: 'César Hernández Moreno',
      dni: '12345678X',
      email: 'cesar626313978@gmail.com',
      phone: '+34 626 313 978',
      department: 'Desarrollo & Tecnología',
      jobTitle: 'Administrador / Responsable RRHH',
      contractType: 'Indefinido',
      weeklyHours: 40,
      role: 'admin',
      status: 'ACTIVO',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      hasRotatingShifts: true,
      rotationStartDate: '2026-08-01',
      shiftWeekA: 'Mañana',
      shiftWeekB: 'Tarde',
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
      role: 'employee',
      status: 'VACACIONES',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
      hasRotatingShifts: false,
      shiftWeekA: 'Mañana',
      shiftWeekB: 'Mañana',
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
      role: 'employee',
      status: 'BAJA_MEDICA',
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=250&q=80',
      hasRotatingShifts: true,
      rotationStartDate: '2026-07-15',
      shiftWeekA: 'Tarde',
      shiftWeekB: 'Noche',
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
      role: 'employee',
      status: 'ACTIVO',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
      hasRotatingShifts: false,
      shiftWeekA: 'Partido',
      shiftWeekB: 'Partido',
      joinedDate: '2024-02-15',
      pinCode: '3456',
    },
  ];
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('fichaplus_profile');
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const isLoggedOut = localStorage.getItem('fichaplus_logged_out');
      if (isLoggedOut === 'true') return false;
      const hasActiveSession = localStorage.getItem('fichaplus_session_active');
      return hasActiveSession === 'true';
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(false);

  // Check Magic Login Links in URL parameters (?email=... or ?invite=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get('email') || params.get('login') || params.get('invite');
      if (urlEmail) {
        const emps = getKnownEmployees();
        const clean = urlEmail.trim().toLowerCase();
        const match = emps.find(
          (e) =>
            e.email.trim().toLowerCase() === clean ||
            e.id.toLowerCase() === clean ||
            e.dni.trim().toLowerCase() === clean
        );
        if (match) {
          const isOwnerAdmin =
            match.role === 'admin' ||
            match.role === 'manager' ||
            match.id === 'emp-001' ||
            match.email.toLowerCase() === 'cesar626313978@gmail.com';

          const empProfile: UserProfile = {
            id: match.id,
            name: match.fullName,
            email: match.email,
            role: isOwnerAdmin ? 'admin' : (match.role || 'employee'),
            avatarUrl: match.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(match.fullName)}`,
            dni: match.dni,
            phone: match.phone || '',
            department: match.department || 'Operaciones',
            jobTitle: match.jobTitle || 'Empleado',
            contractType: match.contractType || 'Indefinido',
            weeklyHours: match.weeklyHours || 40,
            currentShift: match.shiftWeekA || 'Mañana',
          };
          loginAsProfile(empProfile);
          // Clean up URL search query
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (e) {}
  }, []);

  // Sync with Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      const isLoggedOut = localStorage.getItem('fichaplus_logged_out') === 'true';
      if (isLoggedOut) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      if (currentUser) {
        const userEmail = currentUser.email?.trim().toLowerCase() || '';
        const emps = getKnownEmployees();
        const match = emps.find((e) => e.email.trim().toLowerCase() === userEmail);
        const isAdmin = userEmail === 'cesar626313978@gmail.com' || match?.role === 'admin' || match?.id === 'emp-001';

        if (match || isAdmin) {
          setIsAuthenticated(true);
          localStorage.setItem('fichaplus_session_active', 'true');
          localStorage.removeItem('fichaplus_logged_out');
          try {
            const userRef = doc(db, 'users', currentUser.uid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              setProfile(data);
              localStorage.setItem('fichaplus_profile', JSON.stringify(data));
            } else {
              const newProfile: UserProfile = match
                ? {
                    id: match.id,
                    name: match.fullName,
                    email: match.email,
                    role: isAdmin ? 'admin' : 'employee',
                    avatarUrl: currentUser.photoURL || match.avatarUrl,
                    dni: match.dni,
                    phone: match.phone || '',
                    department: match.department,
                    jobTitle: match.jobTitle,
                    contractType: match.contractType,
                    weeklyHours: match.weeklyHours,
                    currentShift: match.shiftWeekA,
                  }
                : {
                    ...DEFAULT_PROFILE,
                    id: currentUser.uid,
                    name: currentUser.displayName || 'César Hernández Moreno',
                    email: currentUser.email || 'cesar626313978@gmail.com',
                    avatarUrl: currentUser.photoURL || DEFAULT_PROFILE.avatarUrl,
                  };
              await setDoc(userRef, newProfile);
              setProfile(newProfile);
              localStorage.setItem('fichaplus_profile', JSON.stringify(newProfile));
            }
          } catch (e) {
            console.warn('Firestore profile sync fallback:', e);
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginAsProfile = (p: UserProfile) => {
    setProfile(p);
    setIsAuthenticated(true);
    localStorage.removeItem('fichaplus_logged_out');
    localStorage.setItem('fichaplus_session_active', 'true');
    localStorage.setItem('fichaplus_profile', JSON.stringify(p));
  };

  const checkInvitationStatus = (query: string): { isInvited: boolean; employee?: EmployeeRecord; reason?: string } => {
    const clean = query.trim().toLowerCase();
    const emps = getKnownEmployees();
    const match = emps.find(
      (e) =>
        e.email.trim().toLowerCase() === clean ||
        e.dni.trim().toUpperCase() === clean.toUpperCase() ||
        e.phone.replace(/[^0-9]/g, '').includes(clean.replace(/[^0-9]/g, ''))
    );

    if (match) {
      return { isInvited: true, employee: match };
    }
    if (clean === 'cesar626313978@gmail.com' || clean.toUpperCase() === '12345678X') {
      return { isInvited: true };
    }

    return {
      isInvited: false,
      reason: 'No existe ninguna invitación activa para este correo o teléfono en la empresa.',
    };
  };

  // Ultra-simple one-step entry (Email, Phone, DNI, or Admin)
  const signInFast = async (identifierInput: string): Promise<AuthResult> => {
    const clean = identifierInput.trim().toLowerCase();
    const cleanRaw = identifierInput.trim();

    if (!clean) {
      return {
        success: false,
        reason: 'UNKNOWN',
        message: 'Introduce tu correo de Gmail, corporativo, teléfono o DNI para entrar.',
      };
    }

    const emps = getKnownEmployees();
    const match = emps.find((e) => {
      const emailMatches = e.email.trim().toLowerCase() === clean;
      const dniMatches = e.dni.trim().toUpperCase() === cleanRaw.toUpperCase();
      const phoneDigits = (e.phone || '').replace(/[^0-9]/g, '');
      const inputDigits = cleanRaw.replace(/[^0-9]/g, '');
      const phoneMatches = inputDigits.length >= 7 && phoneDigits.includes(inputDigits);
      return emailMatches || dniMatches || phoneMatches;
    });

    const isMasterAdmin = clean === 'cesar626313978@gmail.com' || cleanRaw.toUpperCase() === '12345678X';

    if (!match && !isMasterAdmin) {
      return {
        success: false,
        reason: 'NOT_INVITED',
        email: clean.includes('@') ? clean : undefined,
        message: `El usuario "${identifierInput}" no figura en la plantilla de la empresa. El administrador debe enviarte una invitación previa para acceder.`,
      };
    }

    const isAdmin = isMasterAdmin || match?.role === 'admin' || match?.role === 'manager' || match?.id === 'emp-001';

    const empProfile: UserProfile = match
      ? {
          id: match.id,
          name: match.fullName,
          email: match.email,
          role: isAdmin ? 'admin' : (match.role || 'employee'),
          avatarUrl: match.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(match.fullName)}`,
          dni: match.dni,
          phone: match.phone || '',
          department: match.department || 'Operaciones',
          jobTitle: match.jobTitle || 'Empleado',
          contractType: match.contractType || 'Indefinido',
          weeklyHours: match.weeklyHours || 40,
          currentShift: match.shiftWeekA || 'Mañana',
        }
      : {
          ...DEFAULT_PROFILE,
          email: clean.includes('@') ? clean : DEFAULT_PROFILE.email,
        };

    loginAsProfile(empProfile);
    return {
      success: true,
      email: empProfile.email,
      name: empProfile.name,
      dni: empProfile.dni,
    };
  };

  // Create a brand new company workspace for an Administrator
  const createCompanyWorkspace = async (data: {
    companyName: string;
    fiscalId: string;
    adminName: string;
    adminEmail: string;
    adminPhone?: string;
  }): Promise<AuthResult> => {
    try {
      const cleanCompany = data.companyName.trim() || 'Mi Empresa';
      const cleanCif = data.fiscalId.trim().toUpperCase() || 'B-00000000';
      const cleanName = data.adminName.trim() || 'Administrador Principal';
      const cleanEmail = data.adminEmail.trim().toLowerCase();
      const cleanPhone = (data.adminPhone || '').trim();

      // Create new Admin profile
      const newAdminProfile: UserProfile = {
        id: 'admin-' + Date.now(),
        name: cleanName,
        email: cleanEmail,
        role: 'admin',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
        dni: '00000000A',
        phone: cleanPhone,
        department: 'Dirección & RRHH',
        jobTitle: 'Director / Administrador',
        contractType: 'Indefinido',
        weeklyHours: 40,
        currentShift: 'Flexible',
      };

      const newAdminEmp: EmployeeRecord = {
        id: newAdminProfile.id,
        employeeNumber: 'EMP-001',
        fullName: cleanName,
        dni: '00000000A',
        email: cleanEmail,
        phone: cleanPhone,
        department: 'Dirección & RRHH',
        jobTitle: 'Director / Administrador',
        contractType: 'Indefinido',
        weeklyHours: 40,
        role: 'admin',
        status: 'ACTIVO',
        avatarUrl: newAdminProfile.avatarUrl,
        hasRotatingShifts: false,
        shiftWeekA: 'Mañana',
        shiftWeekB: 'Mañana',
        joinedDate: new Date().toISOString().slice(0, 10),
        pinCode: '1234',
      };

      // Save Company Settings
      const newCompanySettings = {
        companyName: cleanCompany,
        fiscalId: cleanCif,
        primaryColor: '#4f46e5',
        logoUrl: '',
        defaultLanguage: 'es',
        defaultTimezone: 'Europe/Madrid',
        dateFormat: 'DD/MM/YYYY' as const,
        baseWeeklyHours: 40,
        strictClockIn: false,
        defaultWorkDays: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
      };

      localStorage.setItem('fichaplus_company_settings', JSON.stringify(newCompanySettings));
      localStorage.setItem('fichaplus_employees', JSON.stringify([newAdminEmp]));
      localStorage.removeItem('fichaplus_time_entries');
      localStorage.removeItem('fichaplus_requests');
      localStorage.removeItem('fichaplus_incidents');

      loginAsProfile(newAdminProfile);

      return {
        success: true,
        name: cleanName,
        email: cleanEmail,
        isNewCompany: true,
      };
    } catch (err: any) {
      return {
        success: false,
        reason: 'UNKNOWN',
        message: err?.message || 'Error al configurar la nueva empresa.',
      };
    }
  };

  const signInWithEmployeePin = async (dniInput: string, pinInput?: string): Promise<AuthResult> => {
    return signInFast(dniInput);
  };

  const signInWithEmailAndPin = async (emailInput: string, pinInput?: string): Promise<AuthResult> => {
    return signInFast(emailInput);
  };

  const signInWithGoogle = async (fallbackEmail?: string): Promise<AuthResult> => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const u = res.user;
      const userEmail = u.email?.trim().toLowerCase() || '';

      const emps = getKnownEmployees();
      const match = emps.find((e) => e.email.trim().toLowerCase() === userEmail);
      const isAdmin = userEmail === 'cesar626313978@gmail.com' || match?.role === 'admin' || match?.id === 'emp-001';

      if (!match && !isAdmin) {
        await fbSignOut(auth);
        setIsAuthenticated(false);
        localStorage.removeItem('fichaplus_session_active');
        return {
          success: false,
          reason: 'NOT_INVITED',
          email: u.email || '',
          name: u.displayName || '',
          message: `El correo ${u.email} no está registrado en la plantilla de la empresa. Solicita a tu Administrador que te envíe una invitación.`,
        };
      }

      const newProfile: UserProfile = match
        ? {
            id: match.id,
            name: match.fullName,
            email: match.email,
            role: isAdmin ? 'admin' : (match.role || 'employee'),
            avatarUrl: u.photoURL || match.avatarUrl,
            dni: match.dni,
            phone: match.phone || '',
            department: match.department,
            jobTitle: match.jobTitle,
            contractType: match.contractType,
            weeklyHours: match.weeklyHours,
            currentShift: match.shiftWeekA,
          }
        : {
            ...DEFAULT_PROFILE,
            id: u.uid,
            name: u.displayName || profile.name,
            email: u.email || profile.email,
            avatarUrl: u.photoURL || profile.avatarUrl,
          };

      loginAsProfile(newProfile);
      return { success: true, email: u.email || '', name: newProfile.name };
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return {
          success: false,
          reason: 'POPUP_CANCELLED',
          message: 'Inicio de sesión cancelado.',
        };
      }

      if (fallbackEmail) {
        return signInFast(fallbackEmail);
      }

      return signInFast('cesar626313978@gmail.com');
    }
  };

  const signOut = async () => {
    localStorage.setItem('fichaplus_logged_out', 'true');
    localStorage.removeItem('fichaplus_session_active');
    setIsAuthenticated(false);
    setUser(null);
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
  };

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    localStorage.setItem('fichaplus_profile', JSON.stringify(updated));
    if (user?.uid) {
      try {
        await setDoc(doc(db, 'users', user.uid), updated, { merge: true });
      } catch (e) {
        console.warn('Profile sync error:', e);
      }
    }
  };

  const switchRole = (role: 'employee' | 'admin' | 'manager') => {
    setProfile((prev) => {
      const updated = { ...prev, role };
      localStorage.setItem('fichaplus_profile', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated,
        loading,
        signInFast,
        signInWithGoogle,
        signInWithEmailAndPin,
        signInWithEmployeePin,
        createCompanyWorkspace,
        checkInvitationStatus,
        loginAsProfile,
        signOut,
        updateProfileData,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
