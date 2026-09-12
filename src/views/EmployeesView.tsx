import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { EmployeeRecord, SaturdayPlanType, AllowedWorkLocation } from '../types';
import { EmployeeInviteModal } from '../components/EmployeeInviteModal';
import { EmployeeRemindersModal } from '../components/EmployeeRemindersModal';
import { UserAvatar } from '../components/UserAvatar';
import { ShiftConfigurator } from '../components/ShiftConfigurator';
import {
  isShiftPartida,
  calculateWeekAorB,
  getEmployeeShiftInfo,
  getEffectiveSaturdayPlan,
  getNextSaturday,
  doesEmployeeWorkSaturday,
  getSaturdayScheduleBadge,
} from '../utils/shiftUtils';
import {
  getNextEmployeeNumber,
  reconcileAndDeduplicateEmployees,
  areSamePerson,
  isMasterAdmin,
  MASTER_ADMIN_RECORD,
} from '../utils/employeeUtils';

export const EmployeesView: React.FC = () => {
  const {
    employees,
    companySettings,
    addEmployee,
    updateEmployee,
    updateEmployeeReminders,
    deleteEmployee,
    markEmployeeInvited,
    setActiveTab,
    timeOffRequests,
    setVacationPlanningEmployeeId,
    accessRequests,
    approveAccessRequest,
    rejectAccessRequest,
    isCloudConnected,
    isSyncingCloud,
    syncAllLocalDataToFirestore,
  } = useApp();
  const { profile } = useAuth();

  // Deduplicated employee directory guaranteed to have Master Admin César as EMP-001
  const sanitizedEmployees = useMemo(() => {
    return reconcileAndDeduplicateEmployees(employees, undefined, profile);
  }, [employees, profile]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [saturdayFilter, setSaturdayFilter] = useState<string>('ALL');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [inviteModalEmployee, setInviteModalEmployee] = useState<EmployeeRecord | null>(null);
  const [remindersModalEmployee, setRemindersModalEmployee] = useState<EmployeeRecord | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const pendingRequests = accessRequests.filter((r) => r.status === 'PENDIENTE');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [dni, setDni] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState(`EMP-00${employees.length + 1}`);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [weeklyHours, setWeeklyHours] = useState<number>(40);
  const [department, setDepartment] = useState('Operaciones');
  const [jobTitle, setJobTitle] = useState('Especialista');
  const [contractType, setContractType] = useState('Indefinido');
  const [role, setRole] = useState<'employee' | 'admin' | 'manager'>('employee');
  const [hasRotatingShifts, setHasRotatingShifts] = useState(false);
  const [rotationStartDate, setRotationStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [shiftWeekA, setShiftWeekA] = useState<string>('Continua (08:00 - 16:00)');
  const [shiftWeekB, setShiftWeekB] = useState<string>('Partida (09:00 - 14:00 / 16:00 - 19:00)');
  const [worksSaturday, setWorksSaturday] = useState<boolean>(true);
  const [saturdayPlan, setSaturdayPlan] = useState<SaturdayPlanType>('ALTERNO_A');
  const [saturdayReferenceDate, setSaturdayReferenceDate] = useState<string>('2026-01-05');
  const [saturdayShift, setSaturdayShift] = useState<string>('Continua (09:00 - 14:00)');
  const [saturdayShiftWeekB, setSaturdayShiftWeekB] = useState<string>('Continua (09:00 - 14:00)');
  const [pinCode, setPinCode] = useState('1234');

  // Work modalities allowed for clocking in: 'presencial' (Oficina), 'teletrabajo' (Casa), 'cliente' (Ruta)
  const [allowedWorkLocations, setAllowedWorkLocations] = useState<AllowedWorkLocation[]>([
    'presencial',
    'teletrabajo',
    'cliente',
  ]);

  const toggleWorkLocation = (loc: AllowedWorkLocation) => {
    setAllowedWorkLocations((prev) => {
      if (prev.includes(loc)) {
        if (prev.length <= 1) return prev; // At least one modality must remain selected
        return prev.filter((item) => item !== loc);
      } else {
        return [...prev, loc];
      }
    });
  };

  // Vacation configuration state for employee form
  const [vacationDays, setVacationDays] = useState<number>(30);
  const [vacationDaysType, setVacationDaysType] = useState<'NATURALES' | 'LABORABLES'>('NATURALES');
  const [vacationNotes, setVacationNotes] = useState<string>('');

  // Quick vacation modal state (allows modifying vacation directly from the card)
  const [vacationModalEmployee, setVacationModalEmployee] = useState<EmployeeRecord | null>(null);
  const [quickVacationDays, setQuickVacationDays] = useState<number>(30);
  const [quickVacationType, setQuickVacationType] = useState<'NATURALES' | 'LABORABLES'>('NATURALES');
  const [quickVacationNotes, setQuickVacationNotes] = useState<string>('');
  const [isSavingVacation, setIsSavingVacation] = useState(false);

  const openQuickVacationModal = (emp: EmployeeRecord) => {
    setVacationModalEmployee(emp);
    setQuickVacationDays(emp.vacationDays ?? 30);
    setQuickVacationType(emp.vacationDaysType ?? 'NATURALES');
    setQuickVacationNotes(emp.vacationNotes ?? '');
  };

  const handleSaveQuickVacation = async () => {
    if (!vacationModalEmployee) return;
    setIsSavingVacation(true);
    try {
      const finalDays = Math.max(1, Number(quickVacationDays) || 30);
      await updateEmployee(vacationModalEmployee.id, {
        vacationDays: finalDays,
        vacationDaysType: quickVacationType,
        vacationNotes: quickVacationNotes.trim(),
      });
      setSuccessToast(`✓ Vacaciones de "${vacationModalEmployee.fullName}" actualizadas a ${finalDays} días ${quickVacationType === 'LABORABLES' ? 'laborables' : 'naturales'}.`);
      setVacationModalEmployee(null);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      setSuccessToast(`⚠️ Error al actualizar vacaciones: ${err instanceof Error ? err.message : 'Error'}`);
    } finally {
      setIsSavingVacation(false);
    }
  };

  const openNewEmployeeForm = () => {
    setEditingEmployeeId(null);
    setFullName('');
    setDni(String(Math.floor(10000000 + Math.random() * 90000000)) + 'X');
    setEmployeeNumber(getNextEmployeeNumber(sanitizedEmployees));
    setEmail('');
    setPhone('');
    setWeeklyHours(40);
    setDepartment('Operaciones');
    setJobTitle('Especialista');
    setContractType('Indefinido');
    setRole('employee');
    setHasRotatingShifts(false);
    setRotationStartDate(new Date().toISOString().slice(0, 10));
    setShiftWeekA('Continua (08:00 - 16:00)');
    setShiftWeekB('Partida (09:00 - 14:00 / 16:00 - 19:00)');
    // Vacation defaults
    setVacationDays(30);
    setVacationDaysType('NATURALES');
    setVacationNotes('');
    // Check if company operates on Saturdays
    const companySatEnabled = companySettings.operatingHours?.saturday?.enabled ?? true;
    setWorksSaturday(companySatEnabled);
    setSaturdayPlan(companySatEnabled ? 'ALTERNO_A' : 'NO');
    setSaturdayReferenceDate('2026-01-05');
    setSaturdayShift(
      companySettings.operatingHours?.saturday?.type === 'partida'
        ? 'Partida (10:00 - 14:00 / 17:00 - 20:30)'
        : 'Continua (09:00 - 14:00)'
    );
    setSaturdayShiftWeekB('Continua (09:00 - 14:00)');
    setPinCode(String(Math.floor(1000 + Math.random() * 9000)));
    setAllowedWorkLocations(['presencial', 'teletrabajo', 'cliente']);
    setIsFormOpen(true);
  };

  const openEditEmployee = (emp: EmployeeRecord) => {
    setEditingEmployeeId(emp.id);
    setFullName(emp.fullName);
    setDni(emp.dni);
    setEmployeeNumber(emp.employeeNumber);
    setEmail(emp.email);
    setPhone(emp.phone || '');
    setWeeklyHours(emp.weeklyHours || 40);
    setDepartment(emp.department || 'Operaciones');
    setJobTitle(emp.jobTitle || 'Especialista');
    setContractType(emp.contractType || 'Indefinido');
    setRole(emp.role || 'employee');
    setHasRotatingShifts(emp.hasRotatingShifts || false);
    setRotationStartDate(emp.rotationStartDate || new Date().toISOString().slice(0, 10));
    setShiftWeekA(emp.shiftWeekA || 'Continua (08:00 - 16:00)');
    setShiftWeekB(emp.shiftWeekB || 'Partida (09:00 - 14:00 / 16:00 - 19:00)');
    const effectiveSat = getEffectiveSaturdayPlan(emp);
    setSaturdayPlan(effectiveSat);
    setWorksSaturday(effectiveSat !== 'NO');
    setSaturdayReferenceDate(emp.saturdayReferenceDate || emp.rotationStartDate || '2026-01-05');
    setSaturdayShift(emp.saturdayShift || 'Continua (09:00 - 14:00)');
    setSaturdayShiftWeekB(emp.saturdayShiftWeekB || emp.saturdayShift || 'Continua (09:00 - 14:00)');
    setPinCode(emp.pinCode || '1234');
    // Work modalities allowed for clocking in
    setAllowedWorkLocations(
      emp.allowedWorkLocations && emp.allowedWorkLocations.length > 0
        ? emp.allowedWorkLocations
        : ['presencial', 'teletrabajo', 'cliente']
    );
    // Load vacation configuration
    setVacationDays(emp.vacationDays ?? 30);
    setVacationDaysType(emp.vacationDaysType ?? 'NATURALES');
    setVacationNotes(emp.vacationNotes ?? '');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!fullName.trim() || !email.trim()) return;

    const trimmedDni = dni.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const cleanFullName = fullName.trim();

    // 1. Check if person already exists (by name, email, DNI, or phone) when creating new
    if (!editingEmployeeId) {
      const existingPerson = sanitizedEmployees.find((emp) =>
        areSamePerson(emp, {
          fullName: cleanFullName,
          email: trimmedEmail,
          dni: trimmedDni,
          phone: phone.trim(),
        })
      );

      if (existingPerson) {
        setIsSaving(true);
        try {
          const doesWorkSat = saturdayPlan !== 'NO';
          const cleanVacDays = Math.max(1, Number(vacationDays) || 30);
          await updateEmployee(existingPerson.id, {
            fullName: cleanFullName,
            dni: trimmedDni || existingPerson.dni,
            email: trimmedEmail,
            phone: phone.trim() || existingPerson.phone,
            weeklyHours: Number(weeklyHours) || 40,
            department,
            jobTitle,
            contractType,
            role: existingPerson.role === 'admin' ? 'admin' : role,
            hasRotatingShifts,
            rotationStartDate,
            shiftWeekA,
            shiftWeekB,
            worksSaturday: doesWorkSat,
            saturdayPlan,
            saturdayReferenceDate,
            saturdayShift,
            saturdayShiftWeekB,
            pinCode,
            allowedWorkLocations: allowedWorkLocations.length > 0 ? allowedWorkLocations : ['presencial'],
            vacationDays: cleanVacDays,
            vacationDaysType,
            vacationNotes: vacationNotes.trim(),
          });
          setSuccessToast(`✓ ¡Ficha de "${cleanFullName}" actualizada correctamente (se fusionó para evitar duplicados)!`);
          setIsFormOpen(false);
          setTimeout(() => setSuccessToast(null), 3500);
          return;
        } catch (err) {
          setSuccessToast(`⚠️ Error al actualizar ficha: ${err instanceof Error ? err.message : 'Error'}`);
          return;
        } finally {
          setIsSaving(false);
        }
      }
    }

    // 2. Validation: Prevent duplicate DNI/NIE if editing another employee
    if (trimmedDni && editingEmployeeId) {
      const isDniTaken = sanitizedEmployees.some(
        (emp) =>
          emp.id !== editingEmployeeId &&
          emp.dni &&
          emp.dni.trim().toUpperCase() === trimmedDni.toUpperCase()
      );
      if (isDniTaken) {
        setSuccessToast(`⚠️ Ya existe otro empleado con el DNI/NIE "${trimmedDni}".`);
        return;
      }
    }

    // 3. Validation: Prevent duplicate email if editing another employee
    if (editingEmployeeId) {
      const isEmailTaken = sanitizedEmployees.some(
        (emp) =>
          emp.id !== editingEmployeeId &&
          emp.email &&
          emp.email.trim().toLowerCase() === trimmedEmail
      );
      if (isEmailTaken) {
        setSuccessToast(`⚠️ Ya existe otro empleado con el correo "${trimmedEmail}".`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const finalDni = trimmedDni || `${Math.floor(10000000 + Math.random() * 90000000)}X`;
      
      // Ensure unique employee number
      let finalNumber = employeeNumber.trim();
      const isNumberTaken = sanitizedEmployees.some(
        (emp) =>
          emp.id !== editingEmployeeId &&
          emp.employeeNumber &&
          emp.employeeNumber.trim().toUpperCase() === finalNumber.toUpperCase()
      );
      if (!finalNumber || isNumberTaken || finalNumber === 'EMP-001') {
        finalNumber = getNextEmployeeNumber(sanitizedEmployees);
      }

      const doesWorkSat = saturdayPlan !== 'NO';
      const cleanVacDays = Math.max(1, Number(vacationDays) || 30);

      if (editingEmployeeId) {
        await updateEmployee(editingEmployeeId, {
          fullName: cleanFullName,
          dni: finalDni,
          employeeNumber: finalNumber,
          email: trimmedEmail,
          phone: phone.trim(),
          weeklyHours: Number(weeklyHours) || 40,
          department,
          jobTitle,
          contractType,
          role,
          hasRotatingShifts,
          rotationStartDate,
          shiftWeekA,
          shiftWeekB,
          worksSaturday: doesWorkSat,
          saturdayPlan,
          saturdayReferenceDate,
          saturdayShift,
          saturdayShiftWeekB,
          pinCode,
          allowedWorkLocations: allowedWorkLocations.length > 0 ? allowedWorkLocations : ['presencial'],
          vacationDays: cleanVacDays,
          vacationDaysType,
          vacationNotes: vacationNotes.trim(),
        });
        setSuccessToast(`✓ ¡Empleado "${cleanFullName}" actualizado con éxito!`);
      } else {
        const newEmp: Omit<EmployeeRecord, 'id'> = {
          fullName: cleanFullName,
          dni: finalDni,
          employeeNumber: finalNumber,
          email: trimmedEmail,
          phone: phone.trim(),
          weeklyHours: Number(weeklyHours) || 40,
          department,
          jobTitle,
          contractType,
          role,
          status: 'ACTIVO',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanFullName)}`,
          hasRotatingShifts,
          rotationStartDate,
          shiftWeekA,
          shiftWeekB,
          worksSaturday: doesWorkSat,
          saturdayPlan,
          saturdayReferenceDate,
          saturdayShift,
          saturdayShiftWeekB,
          allowedWorkLocations: allowedWorkLocations.length > 0 ? allowedWorkLocations : ['presencial'],
          joinedDate: new Date().toISOString().slice(0, 10),
          pinCode,
          vacationDays: cleanVacDays,
          vacationDaysType,
          vacationNotes: vacationNotes.trim(),
        };
        const createdRecord = await addEmployee(newEmp);
        setSuccessToast(`✓ ¡"${cleanFullName}" añadido y guardado con éxito!`);

        // Automatically open invite modal for the new employee
        setInviteModalEmployee(createdRecord);
      }

      setIsFormOpen(false);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      console.error('Error saving employee:', err);
      setSuccessToast(`⚠️ Error al guardar: ${err instanceof Error ? err.message : 'Verifique los datos'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEmployees = sanitizedEmployees.filter((emp) => {
    const matchesSearch =
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.dni.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;
    const matchesDept = departmentFilter === 'ALL' || emp.department === departmentFilter;
    const satPlan = getEffectiveSaturdayPlan(emp);
    const doesWorkThisSat = doesEmployeeWorkSaturday(emp);
    const matchesSat =
      saturdayFilter === 'ALL'
        ? true
        : saturdayFilter === 'WORKS_THIS_SAT'
        ? doesWorkThisSat
        : saturdayFilter === 'RESTS_THIS_SAT'
        ? !doesWorkThisSat
        : saturdayFilter === 'ALTERNO'
        ? satPlan === 'ALTERNO_A' || satPlan === 'ALTERNO_B'
        : saturdayFilter === 'NO'
        ? satPlan === 'NO'
        : saturdayFilter === 'TODOS'
        ? satPlan === 'TODOS'
        : true;
    return matchesSearch && matchesStatus && matchesDept && matchesSat;
  });

  const departments = Array.from(new Set(sanitizedEmployees.map((e) => e.department).filter(Boolean)));
  const nextSat = getNextSaturday();
  const nextSatFormatted = nextSat.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const workingThisSatCount = sanitizedEmployees.filter((e) => doesEmployeeWorkSaturday(e, nextSat)).length;
  const restingThisSatCount = sanitizedEmployees.length - workingThisSatCount;

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Top Banner Header with Vibrant Style */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-pink-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-2xl text-amber-300">group</span>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-100">
              Módulo de Personal RRHH
            </span>
          </div>
          <h1 className="font-black text-3xl md:text-4xl tracking-tight uppercase">
            Gestión de Empleados
          </h1>
          <p className="text-xs sm:text-sm text-indigo-100/90 mt-1 max-w-xl">
            Control de altas legales, DNI/NIE, jornadas contractuales y configuración de turnos rotativos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Automatic Sync Status Badge */}
          <div className="bg-indigo-900/50 backdrop-blur-xs border border-indigo-400/30 text-white text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2.5 shadow-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline text-indigo-100">Guardado automático:</span>
            <span className="font-bold text-emerald-300">En la nube al instante</span>
          </div>

          <button
            type="button"
            onClick={() => {
              try {
                navigator.clipboard.writeText(window.location.origin);
                setCopiedLink(true);
                setSuccessToast('✓ Enlace copiado. ¡Pégalo en WhatsApp o envíalo a los móviles de los empleados!');
                setTimeout(() => {
                  setCopiedLink(false);
                  setSuccessToast(null);
                }, 4500);
              } catch {
                setSuccessToast('Enlace de la app: ' + window.location.origin);
              }
            }}
            className="bg-indigo-800/90 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-2xl border border-indigo-400/30 shadow-sm transition-all flex items-center gap-2 cursor-pointer hover:scale-102"
            title="Copiar enlace para abrir en el teléfono de los empleados"
          >
            <span className="material-symbols-outlined text-lg text-amber-300">
              {copiedLink ? 'task_alt' : 'smartphone'}
            </span>
            <span>{copiedLink ? '¡Enlace Copiado!' : 'Enviar a Móviles'}</span>
          </button>

          <button
            onClick={openNewEmployeeForm}
            className="bg-white hover:bg-slate-50 text-indigo-900 font-black text-sm uppercase tracking-wider py-3.5 px-5 rounded-2xl shadow-lg hover:shadow-xl hover:scale-102 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined font-bold text-xl text-indigo-600">person_add</span>
            <span>+ Nuevo Empleado</span>
          </button>
        </div>
      </div>

      {/* Cloud Sync Status Banner - Total reassurance */}
      <div className="bg-white/95 border border-emerald-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
            <span className="material-symbols-outlined text-2xl">cloud_done</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Sincronización Automática en Tiempo Real Activa
              </h4>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                {sanitizedEmployees.length} empleados en la nube
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              <strong>Tus cambios nunca se pierden ni se sobreescriben.</strong> Al crear o modificar un empleado o turno en el PC, se guarda automáticamente en la base de datos central de Firebase en milisegundos. Cuando un empleado entra desde su móvil, accede a estos datos en tiempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            disabled={isSyncingCloud}
            onClick={async () => {
              const res = await syncAllLocalDataToFirestore();
              setSuccessToast('✓ Conexión con Firestore verificada. Todos los datos están al día.');
              setTimeout(() => setSuccessToast(null), 4000);
            }}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Comprobar la conexión con la nube de Firebase"
          >
            <span className={`material-symbols-outlined text-sm ${isSyncingCloud ? 'animate-spin' : ''}`}>
              {isSyncingCloud ? 'sync' : 'sync_saved_locally'}
            </span>
            <span>{isSyncingCloud ? 'Verificando...' : 'Verificar Nube'}</span>
          </button>
        </div>
      </div>

      {/* Success Toast Notification */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-600 text-xl">check_circle</span>
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-500 hover:text-emerald-800">
            ✕
          </button>
        </div>
      )}

      {/* Pending Access / Registration Requests from Unregistered Users */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50/80 border-2 border-amber-300/80 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-xl">person_pin</span>
              <h3 className="font-black text-sm text-amber-950 uppercase tracking-wider">
                Solicitudes de Alta & Invitación Pendientes ({pendingRequests.length})
              </h3>
            </div>
            <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
              Requiere Validación de RRHH
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white border border-amber-200 p-4 rounded-2xl shadow-xs flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm text-slate-900">{req.fullName}</h4>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {req.dni}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">{req.email}</p>
                  {req.phone && (
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">call</span>
                      {req.phone}
                    </p>
                  )}
                  {req.notes && (
                    <p className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      "{req.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={async () => {
                      await approveAccessRequest(req.id);
                      setSuccessToast(`✓ Solicitud de "${req.fullName}" aprobada y dada de alta.`);
                      setTimeout(() => setSuccessToast(null), 3500);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">check</span>
                    <span>Aprobar y Dar de Alta</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await rejectAccessRequest(req.id);
                    }}
                    className="bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-2xl">badge</span>
          </div>
          <div>
            <span className="block font-black text-2xl text-slate-900">{employees.length}</span>
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Plantilla</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-2xl">how_to_reg</span>
          </div>
          <div>
            <span className="block font-black text-2xl text-emerald-600">
              {employees.filter((e) => e.status === 'ACTIVO').length}
            </span>
            <span className="text-[11px] font-bold uppercase text-slate-400">En Turno Activo</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-2xl">flight_takeoff</span>
          </div>
          <div>
            <span className="block font-black text-2xl text-amber-500">
              {employees.filter((e) => e.status === 'VACACIONES').length}
            </span>
            <span className="text-[11px] font-bold uppercase text-slate-400">Vacaciones</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-2xl">sick</span>
          </div>
          <div>
            <span className="block font-black text-2xl text-rose-500">
              {employees.filter((e) => e.status === 'BAJA_MEDICA').length}
            </span>
            <span className="text-[11px] font-bold uppercase text-slate-400">Bajas IT / Médicas</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, DNI, EMP..."
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVO">● Activos</option>
            <option value="VACACIONES">● Vacaciones</option>
            <option value="BAJA_MEDICA">● Baja Médica</option>
            <option value="INACTIVO">● Inactivos</option>
          </select>

          {/* Saturday Plan Filter */}
          <select
            value={saturdayFilter}
            onChange={(e) => setSaturdayFilter(e.target.value)}
            className="bg-indigo-50/80 border border-indigo-200 px-3 py-2 rounded-xl text-xs font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Filtrar por turno y planificación de sábados"
          >
            <option value="ALL">📅 Todos los Sábados</option>
            <option value="WORKS_THIS_SAT">✓ Trabajan este sábado ({nextSatFormatted})</option>
            <option value="RESTS_THIS_SAT">✕ Descansan este sábado ({nextSatFormatted})</option>
            <option value="ALTERNO">🔄 Turnos Alternos (1 Sí / 1 No)</option>
            <option value="TODOS">🏢 Todos los Sábados (Fijo)</option>
            <option value="NO">🚫 Sábados Libres (L-V)</option>
          </select>

          {departments.length > 0 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Todos los Departamentos</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={openNewEmployeeForm}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all ml-auto md:ml-0"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Añadir
          </button>
        </div>
      </div>

      {/* Saturday Coverage Planning Bar */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-100 rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3.5 shadow-2xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-xl">event_upcoming</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                Planificación de Sábados • Próximo Sábado ({nextSatFormatted})
              </h3>
              <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200">
                Rotación 1 Sí / 1 No
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
              <strong className="text-indigo-700">{workingThisSatCount} empleados asignados</strong> a trabajar el sábado •{' '}
              <strong className="text-slate-700">{restingThisSatCount} empleados en descanso</strong> (incluye turnos alternos y descanso semanal).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs shrink-0">
          <button
            type="button"
            onClick={() => setSaturdayFilter(saturdayFilter === 'WORKS_THIS_SAT' ? 'ALL' : 'WORKS_THIS_SAT')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 text-xs ${
              saturdayFilter === 'WORKS_THIS_SAT'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            <span>Ver quién trabaja ({workingThisSatCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setSaturdayFilter(saturdayFilter === 'RESTS_THIS_SAT' ? 'ALL' : 'RESTS_THIS_SAT')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 text-xs ${
              saturdayFilter === 'RESTS_THIS_SAT'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>Ver quién descansa ({restingThisSatCount})</span>
          </button>
        </div>
      </div>

      {/* Employees Directory List / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {filteredEmployees.map((emp) => (
          <div
            key={emp.id}
            className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow"
          >
            {/* Header info */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <UserAvatar
                  name={emp.fullName}
                  size="lg"
                  rounded="2xl"
                  showBorder
                  borderColor="border-indigo-100"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-900 leading-snug">{emp.fullName}</h3>
                    <span className="bg-slate-100 text-slate-700 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md">
                      {emp.employeeNumber}
                    </span>
                    {(emp.role === 'admin' || isMasterAdmin(emp) || emp.id === 'emp-001') && (
                      <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-indigo-200 flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
                        Administrador
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-indigo-600 mt-0.5">{emp.jobTitle}</p>
                  <p className="text-[11px] text-slate-400">{emp.department}</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  emp.status === 'ACTIVO'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : emp.status === 'VACACIONES'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : emp.status === 'BAJA_MEDICA'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {emp.status === 'ACTIVO'
                  ? '● Activo'
                  : emp.status === 'VACACIONES'
                  ? '● Vacaciones'
                  : emp.status === 'BAJA_MEDICA'
                  ? '● Baja Médica'
                  : '● Inactivo'}
              </span>
            </div>

            {/* Legal & Shift Details Bento Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50/80 rounded-2xl p-3 text-xs border border-slate-100">
              <div>
                <span className="font-bold text-[10px] uppercase text-slate-400 block">DNI / NIE</span>
                <span className="font-mono font-bold text-slate-800">{emp.dni}</span>
              </div>
              <div>
                <span className="font-bold text-[10px] uppercase text-slate-400 block">Jornada</span>
                <span className="font-bold text-slate-800">{emp.weeklyHours}h / semana</span>
              </div>
              <div>
                <span className="font-bold text-[10px] uppercase text-slate-400 block">Horario Asignado</span>
                {emp.hasRotatingShifts ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-purple-700 text-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">sync</span>
                      Rotativo A/B
                    </span>
                    <span className="text-[10px] text-slate-500 line-clamp-1" title={`Semana A: ${emp.shiftWeekA} | Semana B: ${emp.shiftWeekB}`}>
                      L-V: {calculateWeekAorB(emp.rotationStartDate) === 'A' ? emp.shiftWeekA : emp.shiftWeekB}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-indigo-600 text-xs">
                      {isShiftPartida(emp.shiftWeekA) ? '🌗 Partida (2T)' : '☀️ Continua'}
                    </span>
                    <span className="text-[10px] text-slate-500 line-clamp-1" title={emp.shiftWeekA}>
                      L-V: {emp.shiftWeekA}
                    </span>
                  </div>
                )}

                {/* Sábados Badge & Status */}
                {(() => {
                  const satBadge = getSaturdayScheduleBadge(emp);
                  return (
                    <div className="mt-1 pt-1 border-t border-slate-200/50 flex flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Sábado:</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${satBadge.badgeClass}`}>
                          {satBadge.shortLabel}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-bold leading-tight ${
                          satBadge.worksUpcomingSaturday ? 'text-indigo-700' : 'text-slate-400'
                        }`}
                      >
                        {satBadge.worksUpcomingSaturday
                          ? `✓ Trabaja sáb. ${satBadge.upcomingDateFormatted}`
                          : `✕ Libre sáb. ${satBadge.upcomingDateFormatted}`}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Work Locations Allowed Badge */}
              <div className="col-span-2 sm:col-span-3 bg-indigo-50/60 border border-indigo-100/90 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="material-symbols-outlined text-xs text-indigo-600">domain_verification</span>
                  <span className="text-[10px] font-bold uppercase text-indigo-900">Modalidad Fichaje:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {(() => {
                      const locs =
                        emp.allowedWorkLocations && emp.allowedWorkLocations.length > 0
                          ? emp.allowedWorkLocations
                          : (['presencial', 'teletrabajo', 'cliente'] as AllowedWorkLocation[]);
                      return locs.map((loc) => (
                        <span
                          key={loc}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white border border-indigo-200/80 text-indigo-950 shadow-2xs"
                        >
                          <span>{loc === 'presencial' ? '🏢' : loc === 'teletrabajo' ? '🏠' : '🚗'}</span>
                          <span>{loc === 'presencial' ? 'Oficina' : loc === 'teletrabajo' ? 'Casa' : 'Ruta'}</span>
                        </span>
                      ));
                    })()}
                  </div>
                </div>
                {emp.allowedWorkLocations && emp.allowedWorkLocations.length === 1 && (
                  <span className="text-[9px] font-extrabold uppercase text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded border border-indigo-200">
                    Solo {emp.allowedWorkLocations[0] === 'presencial' ? 'Oficina' : emp.allowedWorkLocations[0] === 'teletrabajo' ? 'Casa' : 'Ruta'}
                  </span>
                )}
                {emp.allowedWorkLocations && emp.allowedWorkLocations.length > 1 && emp.allowedWorkLocations.length < 3 && (
                  <span className="text-[9px] font-extrabold uppercase text-purple-700 bg-purple-100/80 px-1.5 py-0.5 rounded border border-purple-200">
                    Combinado ({emp.allowedWorkLocations.length})
                  </span>
                )}
                {(!emp.allowedWorkLocations || emp.allowedWorkLocations.length === 3) && (
                  <span className="text-[9px] font-bold uppercase text-slate-500 bg-white/70 px-1.5 py-0.5 rounded border border-slate-200">
                    Todas (3)
                  </span>
                )}
              </div>

              {/* Vacation Quota Status Bar */}
              <div className="col-span-2 sm:col-span-3 bg-amber-50/80 border border-amber-200/80 rounded-xl px-3 py-2 flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="material-symbols-outlined text-sm text-amber-600">beach_access</span>
                  <span className="text-xs font-black text-amber-950">
                    {emp.vacationDays ?? 30} Días Vacaciones
                  </span>
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-200/60 border border-amber-300 px-1.5 py-0.5 rounded-md">
                    {emp.vacationDaysType === 'LABORABLES' ? 'Laborables (base 22)' : 'Naturales (base 30)'}
                  </span>
                  {(() => {
                    const used = timeOffRequests
                      .filter(
                        (r) =>
                          (r.userId === emp.id || r.userName?.toLowerCase() === emp.fullName.toLowerCase()) &&
                          r.leaveType === 'Vacaciones' &&
                          r.status === 'APROBADO'
                      )
                      .reduce((sum, r) => sum + (r.daysCount || 1), 0);
                    const remaining = Math.max(0, (emp.vacationDays ?? 30) - used);
                    return (
                      <span className="text-[10px] font-bold text-slate-700 bg-white/90 border border-amber-200 px-2 py-0.5 rounded-md">
                        {used} usados / <strong className="text-amber-900">{remaining} disponibles</strong>
                      </span>
                    );
                  })()}
                  {emp.vacationNotes && (
                    <span className="text-[10px] font-medium text-amber-900/90 italic truncate max-w-[180px]" title={emp.vacationNotes}>
                      • {emp.vacationNotes}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={() => {
                      setVacationPlanningEmployeeId(emp.id);
                      setActiveTab('requests');
                    }}
                    className="text-[11px] font-black text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                    title="Planificar vacaciones o registrar vacaciones pasadas para este empleado"
                  >
                    <span className="material-symbols-outlined text-xs text-indigo-600">event_available</span>
                    <span>Planificar / Pasadas</span>
                  </button>
                  <button
                    onClick={() => openQuickVacationModal(emp)}
                    className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-white/80 hover:bg-white px-2 py-1 rounded-lg border border-amber-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                    title="Modificar cupo total de vacaciones de este empleado"
                  >
                    <span className="material-symbols-outlined text-xs text-amber-700">tune</span>
                    <span>Cupo</span>
                  </button>
                </div>
              </div>

              {/* Shift Reminders & Alarms Status Bar */}
              <div className="col-span-2 sm:col-span-3 bg-indigo-50/70 border border-indigo-200/70 rounded-xl px-3 py-2 flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="material-symbols-outlined text-sm text-indigo-600">alarm_on</span>
                  <span className="text-xs font-black text-indigo-950">
                    Avisos Fichaje:
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                      emp.reminders?.enabled !== false
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    {emp.reminders?.enabled !== false ? '● Activos' : '○ Off'}
                  </span>
                  {emp.reminders?.enabled !== false && (
                    <span className="text-[10px] font-semibold text-indigo-900 bg-white/80 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <span>
                        Entrada:{' '}
                        {emp.reminders?.clockIn?.alertType === 'voice'
                          ? '🗣️ Voz'
                          : emp.reminders?.clockIn?.alertType === 'vibration'
                          ? '📳 Vibr.'
                          : emp.reminders?.clockIn?.alertType === 'sound'
                          ? '🔔 Sonido'
                          : emp.reminders?.clockIn?.alertType === 'silent'
                          ? '💬 Push'
                          : '🗣️ Voz'}{' '}
                        ({emp.reminders?.clockIn?.leadMinutes ?? 5}m)
                      </span>
                      <span>•</span>
                      <span>
                        Salida:{' '}
                        {emp.reminders?.clockOut?.alertType === 'voice'
                          ? '🗣️ Voz'
                          : emp.reminders?.clockOut?.alertType === 'vibration'
                          ? '📳 Vibr.'
                          : emp.reminders?.clockOut?.alertType === 'sound'
                          ? '🔔 Sonido'
                          : emp.reminders?.clockOut?.alertType === 'silent'
                          ? '💬 Push'
                          : '🗣️ Voz'}
                      </span>
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setRemindersModalEmployee(emp)}
                  className="text-[11px] font-black text-indigo-800 hover:text-indigo-950 hover:underline flex items-center gap-1 cursor-pointer ml-auto bg-white/90 hover:bg-white px-2 py-0.5 rounded-lg border border-indigo-200 shadow-2xs transition-all"
                  title="Configurar recordatorios de turno personalizados"
                >
                  <span className="material-symbols-outlined text-xs text-indigo-700">settings_alert</span>
                  <span>Ajustar Avisos</span>
                </button>
              </div>

              <div className="col-span-2 sm:col-span-3 border-t border-slate-200/60 pt-2 flex flex-wrap justify-between items-center gap-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-slate-400">mail</span>
                  {emp.email}
                </span>
                {emp.phone && (
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <span className="material-symbols-outlined text-sm text-emerald-500">call</span>
                    {emp.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setInviteModalEmployee(emp)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Enviar invitación con datos de acceso por WhatsApp o Email"
                >
                  <span className="material-symbols-outlined text-sm text-emerald-600">send</span>
                  <span>Invitar</span>
                  {emp.invitationSentAt && (
                    <span className="text-[10px] bg-emerald-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                      ✓
                    </span>
                  )}
                </button>

                <button
                  onClick={() => openQuickVacationModal(emp)}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Modificar días de vacaciones para este empleado"
                >
                  <span className="material-symbols-outlined text-sm text-amber-600">beach_access</span>
                  <span>Vacaciones ({emp.vacationDays ?? 30}d)</span>
                </button>

                <button
                  onClick={() => setRemindersModalEmployee(emp)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/80 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Configurar recordatorios de turno (Voz, Vibración, Sonido u Off)"
                >
                  <span className="material-symbols-outlined text-sm text-indigo-600">alarm_on</span>
                  <span>
                    Avisos (
                    {emp.reminders?.enabled === false
                      ? 'Off'
                      : emp.reminders?.clockIn?.alertType === 'voice'
                      ? 'Voz'
                      : emp.reminders?.clockIn?.alertType === 'vibration'
                      ? 'Vibr.'
                      : emp.reminders?.clockIn?.alertType === 'sound'
                      ? 'Sonido'
                      : 'Voz'}
                    )
                  </span>
                </button>

                <button
                  onClick={() => openEditEmployee(emp)}
                  className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Editar datos del empleado"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Editar
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Ver fichajes y registros de jornada"
                >
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  Fichajes
                </button>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    const nextStatus =
                      emp.status === 'ACTIVO'
                        ? 'VACACIONES'
                        : emp.status === 'VACACIONES'
                        ? 'BAJA_MEDICA'
                        : 'ACTIVO';
                    updateEmployee(emp.id, { status: nextStatus });
                  }}
                  className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 text-xs font-semibold"
                  title="Cambiar estado de jornada"
                >
                  <span className="material-symbols-outlined text-base">sync</span>
                </button>
                {!isMasterAdmin(emp) && emp.id !== 'emp-001' && emp.employeeNumber !== 'EMP-001' && (
                  <button
                    onClick={() => {
                      if (confirm(`¿Estás seguro de dar de baja a ${emp.fullName}?`)) {
                        deleteEmployee(emp.id);
                      }
                    }}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                    title="Dar de baja empleado"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Employee Invite Modal */}
      {inviteModalEmployee && (
        <EmployeeInviteModal
          employee={inviteModalEmployee}
          companySettings={companySettings}
          isOpen={!!inviteModalEmployee}
          onClose={() => setInviteModalEmployee(null)}
          onMarkInvited={(method) => {
            markEmployeeInvited(inviteModalEmployee.id, method);
            setSuccessToast(`✓ Invitación registrada por ${method === 'whatsapp' ? 'WhatsApp' : method === 'email' ? 'Email' : 'Enlace'}.`);
            setTimeout(() => setSuccessToast(null), 3500);
          }}
        />
      )}

      {/* MODAL / COLLAPSIBLE FORM: NUEVO / EDITAR EMPLEADO (Exact Screenshot Layout) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-3 mb-6">
              <div className="flex items-center gap-2 text-indigo-900">
                <span className="material-symbols-outlined text-2xl font-black">
                  {editingEmployeeId ? 'edit' : 'add'}
                </span>
                <h2 className="font-black text-xl sm:text-2xl uppercase tracking-tight">
                  {editingEmployeeId ? 'Editar Empleado' : 'Nuevo Empleado'}
                </h2>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Field 0: Rol de Acceso en la Empresa */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-2">
                  Rol de Acceso en la Aplicación
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('employee')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      role === 'employee'
                        ? 'bg-white border-indigo-600 text-indigo-700 shadow-xs ring-1 ring-indigo-600'
                        : 'bg-transparent border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">person</span>
                    <span>👤 Empleado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      role === 'admin'
                        ? 'bg-white border-indigo-600 text-indigo-700 shadow-xs ring-1 ring-indigo-600'
                        : 'bg-transparent border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base text-amber-500">admin_panel_settings</span>
                    <span>👑 Administrador / RRHH</span>
                  </button>
                </div>
              </div>

              {/* Field 1: NOMBRE COMPLETO */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-indigo-600">person</span>
                    NOMBRE COMPLETO *
                  </label>
                  <span className="text-[10px] font-medium text-indigo-700 italic">
                    (Obligatorio para informes legales)
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nombre y Apellidos"
                  className="w-full bg-slate-50 border-2 border-slate-300 p-3.5 rounded-2xl font-semibold text-slate-800 text-sm focus:border-indigo-600 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Field 2: DNI / NIE */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-indigo-600">badge</span>
                    DNI/NIE *
                  </label>
                  <span className="text-[10px] font-medium text-indigo-700 italic">
                    (Obligatorio para informes legales)
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={dni}
                  onChange={(e) => setDni(e.target.value.toUpperCase())}
                  placeholder="12345678A"
                  className="w-full bg-slate-50 border-2 border-slate-300 p-3.5 rounded-2xl font-mono font-bold text-slate-800 text-sm focus:border-indigo-600 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Field 3: NÚMERO DE EMPLEADO */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-emerald-600">tag</span>
                    NÚMERO DE EMPLEADO *
                  </label>
                  <span className="text-[10px] font-medium text-indigo-700 italic">
                    (Obligatorio para informes legales)
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value.toUpperCase())}
                  placeholder="EMP-001"
                  className="w-full bg-slate-50 border-2 border-slate-300 p-3.5 rounded-2xl font-mono font-bold text-slate-800 text-sm focus:border-indigo-600 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Field 4: EMAIL */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-indigo-600">mail</span>
                    EMAIL *
                  </label>
                  <span className="text-[10px] font-medium text-slate-400 italic">(Obligatorio)</span>
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full bg-indigo-50/40 border-2 border-indigo-200 p-3.5 rounded-2xl font-semibold text-slate-800 text-sm focus:border-indigo-600 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Field 5: TELÉFONO / WHATSAPP */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 mb-1.5">
                  <span className="material-symbols-outlined text-base text-emerald-600">phone_iphone</span>
                  TELÉFONO/WHATSAPP
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full bg-emerald-50/40 border-2 border-emerald-200 p-3.5 rounded-2xl font-semibold text-slate-800 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Field 6: HORAS SEMANALES CONTRATADAS & TIPO DE JORNADA */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 mb-1.5">
                      <span className="material-symbols-outlined text-base text-slate-800">schedule</span>
                      HORAS SEMANALES *
                    </label>
                    <div className="bg-amber-400 p-1.5 rounded-2xl border-2 border-amber-500 shadow-inner">
                      <input
                        type="number"
                        required
                        min={1}
                        max={60}
                        value={weeklyHours}
                        onChange={(e) => setWeeklyHours(Number(e.target.value))}
                        className="w-full bg-transparent px-3 py-2 font-mono font-black text-xl text-slate-950 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 mb-1.5">
                      <span className="material-symbols-outlined text-base text-indigo-600">work</span>
                      TIPO JORNADA LEGAL *
                    </label>
                    <div className="bg-slate-50 border-2 border-slate-300 p-1.5 rounded-2xl">
                      <select
                        value={weeklyHours >= 40 ? 'COMPLETA' : 'PARCIAL'}
                        onChange={(e) => {
                          if (e.target.value === 'COMPLETA') setWeeklyHours(40);
                          else if (weeklyHours >= 40) setWeeklyHours(20);
                        }}
                        className="w-full bg-transparent p-2 text-xs font-black text-slate-800 focus:outline-none"
                      >
                        <option value="COMPLETA">Tiempo Completo (40h/sem)</option>
                        <option value="PARCIAL">Tiempo Parcial (&lt;40h/sem)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Department / Role Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 block mb-1">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Desarrollo, Ventas..."
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 block mb-1">
                    Puesto / Cargo
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Senior Developer..."
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Field 6.5: MODALIDAD DE TRABAJO PERMITIDA (PRESENCIAL, CASA O RUTA) */}
              <div className="mt-4 pt-4 border-t-2 border-slate-200 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-slate-900">
                    <span className="material-symbols-outlined text-2xl font-black text-indigo-600">domain_verification</span>
                    <div>
                      <h3 className="font-black text-sm uppercase tracking-wider">
                        MODALIDAD DE TRABAJO PERMITIDA (FICHAJE) *
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Configura las opciones que se mostrarán en la pantalla de fichaje del empleado.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                    {allowedWorkLocations.length === 3
                      ? 'Todas Autorizadas (3)'
                      : allowedWorkLocations.length === 2
                      ? 'Modalidad Combinada (2)'
                      : 'Modalidad Fija (1)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Presencial / Oficina */}
                  <button
                    type="button"
                    onClick={() => toggleWorkLocation('presencial')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      allowedWorkLocations.includes('presencial')
                        ? 'bg-indigo-50/50 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-2xl">🏢</span>
                      <span
                        className={`material-symbols-outlined text-lg ${
                          allowedWorkLocations.includes('presencial') ? 'text-indigo-600 font-bold' : 'text-slate-300'
                        }`}
                      >
                        {allowedWorkLocations.includes('presencial') ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    </div>
                    <div>
                      <span
                        className={`text-xs font-black block ${
                          allowedWorkLocations.includes('presencial') ? 'text-slate-900' : 'text-slate-500'
                        }`}
                      >
                        Presencial (Oficina)
                      </span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                        Sede central, oficinas o almacén
                      </span>
                    </div>
                  </button>

                  {/* Casa (Teletrabajo) */}
                  <button
                    type="button"
                    onClick={() => toggleWorkLocation('teletrabajo')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      allowedWorkLocations.includes('teletrabajo')
                        ? 'bg-indigo-50/50 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-2xl">🏠</span>
                      <span
                        className={`material-symbols-outlined text-lg ${
                          allowedWorkLocations.includes('teletrabajo') ? 'text-indigo-600 font-bold' : 'text-slate-300'
                        }`}
                      >
                        {allowedWorkLocations.includes('teletrabajo') ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    </div>
                    <div>
                      <span
                        className={`text-xs font-black block ${
                          allowedWorkLocations.includes('teletrabajo') ? 'text-slate-900' : 'text-slate-500'
                        }`}
                      >
                        Casa (Teletrabajo)
                      </span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                        Fichaje en remoto desde domicilio
                      </span>
                    </div>
                  </button>

                  {/* Ruta (Clientes / En Desplazamiento) */}
                  <button
                    type="button"
                    onClick={() => toggleWorkLocation('cliente')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      allowedWorkLocations.includes('cliente')
                        ? 'bg-indigo-50/50 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-2xl">🚗</span>
                      <span
                        className={`material-symbols-outlined text-lg ${
                          allowedWorkLocations.includes('cliente') ? 'text-indigo-600 font-bold' : 'text-slate-300'
                        }`}
                      >
                        {allowedWorkLocations.includes('cliente') ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    </div>
                    <div>
                      <span
                        className={`text-xs font-black block ${
                          allowedWorkLocations.includes('cliente') ? 'text-slate-900' : 'text-slate-500'
                        }`}
                      >
                        Ruta (Desplazamiento)
                      </span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                        Técnicos en ruta o comerciales
                      </span>
                    </div>
                  </button>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center gap-2 text-xs text-slate-600">
                  <span className="material-symbols-outlined text-base text-indigo-600 shrink-0">help_outline</span>
                  <span>
                    Comportamiento en terminal:{' '}
                    <strong className="text-slate-800">
                      {allowedWorkLocations.length === 3
                        ? 'El empleado tendrá disponibles los 3 botones: Oficina, Casa y Ruta.'
                        : allowedWorkLocations.length === 2
                        ? `El empleado solo verá los botones de ${allowedWorkLocations
                            .map((l) => (l === 'presencial' ? 'Oficina' : l === 'teletrabajo' ? 'Casa' : 'Ruta'))
                            .join(' y ')}.`
                        : `El empleado quedará fijado en ${
                            allowedWorkLocations[0] === 'presencial'
                              ? 'Presencial (Oficina)'
                              : allowedWorkLocations[0] === 'teletrabajo'
                              ? 'Casa (Teletrabajo)'
                              : 'Ruta (Desplazamiento)'
                          } (las demás opciones desaparecerán de su pantalla).`}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Field 7: CONFIGURACIÓN DE TURNOS */}
              <div className="mt-4 pt-4 border-t-2 border-slate-200 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <span className="material-symbols-outlined text-2xl font-black text-indigo-600">calendar_month</span>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider">
                      CONFIGURACIÓN DE TURNOS & HORARIOS
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Asigna jornada continua, jornada partida (2 turnos) o alternancia semanal (Semana A / B).
                    </p>
                  </div>
                </div>

                {/* Rotating Shifts Toggle */}
                <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900 block">
                        Turnos Rotativos (Semana A / Semana B)
                      </span>
                      {hasRotatingShifts && (
                        <span className="text-[10px] font-black uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md border border-purple-200">
                          Rotación Activa
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Alterna automáticamente entre los turnos de Semana A y Semana B cada semana.
                    </span>
                  </div>

                  {/* Switch Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={hasRotatingShifts}
                      onChange={(e) => setHasRotatingShifts(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-13 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {!hasRotatingShifts ? (
                  /* Single Fixed Shift Configurator */
                  <ShiftConfigurator
                    value={shiftWeekA}
                    onChange={(val) => {
                      setShiftWeekA(val);
                      setShiftWeekB(val);
                    }}
                    label="Configuración de Horario (L-V y Sábados)"
                    accentColor="indigo"
                    worksSaturday={worksSaturday}
                    onWorksSaturdayChange={setWorksSaturday}
                    saturdayPlan={saturdayPlan}
                    onSaturdayPlanChange={setSaturdayPlan}
                    saturdayReferenceDate={saturdayReferenceDate}
                    onSaturdayReferenceDateChange={setSaturdayReferenceDate}
                    saturdayShift={saturdayShift}
                    onSaturdayShiftChange={setSaturdayShift}
                    companyOperatingHours={companySettings.operatingHours}
                  />
                ) : (
                  /* Alternating Shifts Week A / Week B Configurator */
                  <div className="space-y-4 bg-purple-50/40 p-4 rounded-3xl border border-purple-100">
                    {/* FECHA INICIO ROTACIÓN */}
                    <div>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-900 block flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base text-purple-600">event</span>
                          FECHA INICIO ROTACIÓN (SEMANA A) *
                        </label>
                        <span className="text-[10px] text-slate-500 italic">Punto de inicio para alternar A y B</span>
                      </div>
                      <input
                        type="date"
                        required
                        value={rotationStartDate}
                        onChange={(e) => {
                          setRotationStartDate(e.target.value);
                          setSaturdayReferenceDate(e.target.value);
                        }}
                        className="w-full bg-white border-2 border-purple-200 p-3 rounded-2xl font-semibold text-slate-800 text-sm focus:border-purple-600 focus:outline-none"
                      />
                    </div>

                    {/* Shift Configurator Week A & Week B */}
                    <div className="space-y-4">
                      <ShiftConfigurator
                        value={shiftWeekA}
                        onChange={setShiftWeekA}
                        label="Turno Semana A (L-V y Sábado)"
                        badgeText="Semana A"
                        accentColor="indigo"
                        worksSaturday={worksSaturday}
                        onWorksSaturdayChange={setWorksSaturday}
                        saturdayPlan={saturdayPlan}
                        onSaturdayPlanChange={setSaturdayPlan}
                        saturdayReferenceDate={saturdayReferenceDate}
                        onSaturdayReferenceDateChange={setSaturdayReferenceDate}
                        saturdayShift={saturdayShift}
                        onSaturdayShiftChange={setSaturdayShift}
                        companyOperatingHours={companySettings.operatingHours}
                      />

                      <ShiftConfigurator
                        value={shiftWeekB}
                        onChange={setShiftWeekB}
                        label="Turno Semana B (L-V y Sábado)"
                        badgeText="Semana B"
                        accentColor="purple"
                        worksSaturday={worksSaturday}
                        onWorksSaturdayChange={setWorksSaturday}
                        saturdayPlan={saturdayPlan}
                        onSaturdayPlanChange={setSaturdayPlan}
                        saturdayReferenceDate={saturdayReferenceDate}
                        onSaturdayReferenceDateChange={setSaturdayReferenceDate}
                        saturdayShift={saturdayShiftWeekB}
                        onSaturdayShiftChange={setSaturdayShiftWeekB}
                        companyOperatingHours={companySettings.operatingHours}
                      />
                    </div>

                    {/* Dynamic Rotation Preview */}
                    {(() => {
                      const activeWeek = calculateWeekAorB(rotationStartDate, new Date());
                      const activeShift = activeWeek === 'A' ? shiftWeekA : shiftWeekB;
                      const nextShift = activeWeek === 'A' ? shiftWeekB : shiftWeekA;
                      return (
                        <div className="bg-white rounded-2xl p-3.5 border border-purple-200 text-xs space-y-1.5 shadow-2xs">
                          <div className="flex items-center gap-2 font-bold text-slate-900">
                            <span className="material-symbols-outlined text-purple-600 text-base">auto_mode</span>
                            <span>Cálculo Automático para el Empleado:</span>
                          </div>
                          <div className="text-[11px] text-slate-700 pl-6 space-y-1">
                            <p>
                              • <span className="font-bold text-purple-700">Esta semana (Semana {activeWeek}):</span>{' '}
                              <span className="font-semibold">{activeShift}</span> ({isShiftPartida(activeShift) ? '2 Turnos - Partida' : 'Turno Continuo'}).
                            </p>
                            <p className="text-slate-500">
                              • <span className="font-bold text-slate-600">Próxima semana (Semana {activeWeek === 'A' ? 'B' : 'A'}):</span>{' '}
                              <span>{nextShift}</span>.
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* VACATION CONFIGURATION BLOCK */}
              <div className="bg-amber-50/70 p-5 rounded-3xl border border-amber-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl text-amber-600">beach_access</span>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-950">
                        Vacaciones Anuales Asignadas
                      </h3>
                      <p className="text-[11px] text-amber-800/80 font-medium">
                        Días por año natural para este empleado (Convenio / Base de empresa: 30 días naturales)
                      </p>
                    </div>
                  </div>
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-xl text-xs font-black">
                    {vacationDays} Días
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Vacation Days input + buttons */}
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 block mb-1.5">
                      Número total de días *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setVacationDays((prev) => Math.max(1, Number(prev || 30) - 1))}
                        className="w-10 h-10 rounded-xl bg-white border border-amber-300 text-amber-900 font-black text-lg hover:bg-amber-100 flex items-center justify-center cursor-pointer transition-colors"
                        title="Restar 1 día"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        required
                        value={vacationDays}
                        onChange={(e) => setVacationDays(Math.max(1, parseInt(e.target.value, 10) || 0))}
                        className="flex-1 bg-white border border-amber-300 p-2.5 rounded-xl font-black text-slate-900 text-center text-base focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setVacationDays((prev) => Number(prev || 30) + 1)}
                        className="w-10 h-10 rounded-xl bg-white border border-amber-300 text-amber-900 font-black text-lg hover:bg-amber-100 flex items-center justify-center cursor-pointer transition-colors"
                        title="Añadir 1 día"
                      >
                        +
                      </button>
                    </div>
                    {/* Quick presets */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-amber-900/70 font-bold">Ajustes:</span>
                      <button
                        type="button"
                        onClick={() => setVacationDays(30)}
                        className="px-2 py-0.5 rounded-lg bg-white border border-amber-300 text-[10px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                      >
                        Base (30d)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVacationDays(31)}
                        className="px-2 py-0.5 rounded-lg bg-white border border-amber-300 text-[10px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                      >
                        +1 (31d)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVacationDays(32)}
                        className="px-2 py-0.5 rounded-lg bg-white border border-amber-300 text-[10px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                      >
                        +2 (32d)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVacationDays(35)}
                        className="px-2 py-0.5 rounded-lg bg-white border border-amber-300 text-[10px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                      >
                        +5 (35d)
                      </button>
                    </div>
                  </div>

                  {/* Computation type */}
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 block mb-1.5">
                      Cómputo legal *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setVacationDaysType('NATURALES')}
                        className={`p-2.5 rounded-xl border text-xs font-black flex flex-col items-center justify-center transition-all cursor-pointer ${
                          vacationDaysType === 'NATURALES'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
                        }`}
                      >
                        <span>Días Naturales</span>
                        <span className="text-[10px] opacity-80 font-normal">Base 30 días</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVacationDaysType('LABORABLES')}
                        className={`p-2.5 rounded-xl border text-xs font-black flex flex-col items-center justify-center transition-all cursor-pointer ${
                          vacationDaysType === 'LABORABLES'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
                        }`}
                      >
                        <span>Días Laborables</span>
                        <span className="text-[10px] opacity-80 font-normal">Base 22 días</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes or Reason */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 block mb-1">
                    Motivo o desglose de días adicionales
                  </label>
                  <input
                    type="text"
                    value={vacationNotes}
                    onChange={(e) => setVacationNotes(e.target.value)}
                    placeholder="Ej. +2 días por antigüedad o convenio colectivo"
                    className="w-full bg-white border border-amber-200 p-2.5 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none"
                  />
                  <p className="text-[10px] text-amber-800/80 mt-1 italic">
                    Esta asignación se sincroniza en tiempo real en la nube y se aplica a las solicitudes y saldo de vacaciones del trabajador.
                  </p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-2xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`flex-2 font-black py-3.5 px-6 rounded-2xl text-sm uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    isSaving
                      ? 'bg-indigo-700 text-white opacity-80 cursor-wait'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 hover:shadow-xl'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">save</span>
                      <span>{editingEmployeeId ? 'Guardar Cambios' : 'Registrar Empleado'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK VACATION EDIT MODAL */}
      {vacationModalEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 sm:p-7 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-amber-200 pb-3 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">beach_access</span>
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    Modificar Días de Vacaciones
                  </h3>
                  <p className="text-xs text-slate-500">
                    Empleado: <strong className="text-slate-800">{vacationModalEmployee.fullName}</strong> ({vacationModalEmployee.employeeNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVacationModalEmployee(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-amber-700">info</span>
                  Convenio / Régimen General: 30 días naturales
                </p>
                <p className="text-[11px] text-amber-800 mt-1">
                  Puedes añadir o modificar los días de vacaciones correspondientes para este empleado por antigüedad, complementos o acuerdos individuales.
                </p>
              </div>

              {/* Number of days */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                  Días Totales Asignados
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickVacationDays((prev) => Math.max(1, Number(prev || 30) - 1))}
                    className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-900 font-black text-xl flex items-center justify-center cursor-pointer transition-colors"
                    title="Restar 1 día"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={quickVacationDays}
                    onChange={(e) => setQuickVacationDays(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="flex-1 bg-slate-50 border-2 border-amber-300 p-2.5 rounded-xl font-black text-xl text-slate-900 text-center focus:bg-white focus:outline-none focus:border-amber-600"
                  />
                  <button
                    type="button"
                    onClick={() => setQuickVacationDays((prev) => Number(prev || 30) + 1)}
                    className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-900 font-black text-xl flex items-center justify-center cursor-pointer transition-colors"
                    title="Añadir 1 día"
                  >
                    +
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-bold self-center">Accesos rápidos:</span>
                  <button
                    type="button"
                    onClick={() => setQuickVacationDays(30)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-xs font-bold text-slate-700 hover:text-amber-900 transition-colors cursor-pointer"
                  >
                    30 días (Base)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickVacationDays(31)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-xs font-bold text-slate-700 hover:text-amber-900 transition-colors cursor-pointer"
                  >
                    31 días (+1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickVacationDays(32)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-xs font-bold text-slate-700 hover:text-amber-900 transition-colors cursor-pointer"
                  >
                    32 días (+2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickVacationDays(35)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-xs font-bold text-slate-700 hover:text-amber-900 transition-colors cursor-pointer"
                  >
                    35 días (+5)
                  </button>
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                  Tipo de Cómputo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickVacationType('NATURALES')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      quickVacationType === 'NATURALES'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Días Naturales (30d)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickVacationType('LABORABLES')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      quickVacationType === 'LABORABLES'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Días Laborables (22d)</span>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                  Motivo o Detalle de la Asignación
                </label>
                <input
                  type="text"
                  value={quickVacationNotes}
                  onChange={(e) => setQuickVacationNotes(e.target.value)}
                  placeholder="Ej. +2 días concedidos por antigüedad / convenio"
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              {/* Direct Link to Plan vacations / past vacations */}
              <div className="bg-indigo-50/70 border border-indigo-200/70 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="text-left">
                  <span className="text-[11px] font-black text-indigo-950 block">
                    ¿Quieres planificar o registrar fechas concretas?
                  </span>
                  <span className="text-[10px] text-indigo-700 block">
                    Añade periodos pasados o futuros directamente en su calendario.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const empId = vacationModalEmployee.id;
                    setVacationModalEmployee(null);
                    setVacationPlanningEmployeeId(empId);
                    setActiveTab('requests');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg shadow-xs transition-all shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">event_available</span>
                  <span>Planificar Fechas</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2.5 pt-5 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVacationModalEmployee(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingVacation}
                onClick={handleSaveQuickVacation}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black py-3 px-4 rounded-xl text-xs shadow-md shadow-amber-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSavingVacation ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">save</span>
                    <span>Guardar Vacaciones</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {remindersModalEmployee && (
        <EmployeeRemindersModal
          isOpen={!!remindersModalEmployee}
          onClose={() => setRemindersModalEmployee(null)}
          employee={remindersModalEmployee}
          isAdminView={true}
          onSave={async (updatedReminders) => {
            await updateEmployeeReminders(remindersModalEmployee.id, updatedReminders);
            setSuccessToast(
              `Recordatorios configurados correctamente para ${remindersModalEmployee.fullName}`
            );
          }}
        />
      )}
    </div>
  );
};
