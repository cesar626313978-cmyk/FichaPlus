import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { EmployeeInviteModal } from '../components/EmployeeInviteModal';
import { EmployeeRecord } from '../types';
import { UserAvatar } from '../components/UserAvatar';

export const ProfileView: React.FC = () => {
  const { profile, updateProfileData, signInWithGoogle, signOut, switchRole, isActualAdmin } = useAuth();
  const { companySettings, employees, updateEmployee, markEmployeeInvited } = useApp();
  const isAdmin = profile.role === 'admin' || profile.role === 'manager';

  // Find matching employee from company employee roster
  const matchingEmployee: EmployeeRecord | undefined = employees.find(
    (e) =>
      (profile.id && e.id === profile.id) ||
      (profile.email && e.email && e.email.trim().toLowerCase() === profile.email.trim().toLowerCase()) ||
      (profile.name && e.fullName && e.fullName.trim().toLowerCase() === profile.name.trim().toLowerCase()) ||
      (profile.dni && e.dni && e.dni.trim().toUpperCase() === profile.dni.trim().toUpperCase())
  ) || (isAdmin ? employees.find((e) => e.id === 'emp-001' || e.role === 'admin') : undefined);

  // Active data prioritizing company employee record over any stale local profile
  const activeDni = matchingEmployee?.dni || profile.dni || '';
  const activePhone = matchingEmployee?.phone || profile.phone || '';
  const activeDepartment = matchingEmployee?.department || profile.department || '';
  const activeJobTitle = matchingEmployee?.jobTitle || profile.jobTitle || '';
  const activeContract = matchingEmployee?.contractType || profile.contractType || '';
  const activeHours = matchingEmployee?.weeklyHours || profile.weeklyHours || 40;
  const activeEmployeeNumber = matchingEmployee?.employeeNumber || 'EMP-001';

  const [phone, setPhone] = useState(activePhone);
  const [dni, setDni] = useState(activeDni);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Keep local form input fields in sync if the employee record updates
  useEffect(() => {
    if (activeDni && activeDni !== dni) {
      setDni(activeDni);
    }
  }, [activeDni]);

  useEffect(() => {
    if (activePhone && activePhone !== phone) {
      setPhone(activePhone);
    }
  }, [activePhone]);

  // Keep AuthContext profile synchronized with employee record
  useEffect(() => {
    if (matchingEmployee) {
      if (
        profile.dni !== matchingEmployee.dni ||
        profile.department !== matchingEmployee.department ||
        profile.jobTitle !== matchingEmployee.jobTitle ||
        profile.weeklyHours !== matchingEmployee.weeklyHours ||
        profile.contractType !== matchingEmployee.contractType ||
        (matchingEmployee.phone && profile.phone !== matchingEmployee.phone)
      ) {
        updateProfileData({
          dni: matchingEmployee.dni,
          department: matchingEmployee.department,
          jobTitle: matchingEmployee.jobTitle,
          weeklyHours: matchingEmployee.weeklyHours,
          contractType: matchingEmployee.contractType,
          phone: matchingEmployee.phone || profile.phone,
        });
      }
    }
  }, [
    matchingEmployee?.dni,
    matchingEmployee?.department,
    matchingEmployee?.jobTitle,
    matchingEmployee?.weeklyHours,
    matchingEmployee?.contractType,
    matchingEmployee?.phone,
  ]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const cleanDni = dni.trim().toUpperCase();
      const cleanPhone = phone.trim();
      await updateProfileData({ phone: cleanPhone, dni: cleanDni });
      if (matchingEmployee?.id) {
        await updateEmployee(matchingEmployee.id, { phone: cleanPhone, dni: cleanDni });
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const fallbackEmployee: EmployeeRecord = matchingEmployee || {
    id: profile.id,
    employeeNumber: 'EMP-001',
    fullName: profile.name,
    dni: profile.dni,
    email: profile.email,
    phone: profile.phone,
    department: profile.department,
    jobTitle: profile.jobTitle,
    contractType: profile.contractType,
    weeklyHours: profile.weeklyHours,
    status: 'ACTIVO',
    avatarUrl: profile.avatarUrl,
    hasRotatingShifts: false,
    shiftWeekA: 'Mañana',
    shiftWeekB: 'Mañana',
    joinedDate: '2024-01-01',
    pinCode: '1234',
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
              isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
            }`}>
              {isAdmin ? 'Superusuario / Administrador' : 'Empleado / Usuario'}
            </span>
            {isActualAdmin && !isAdmin && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">badge</span>
                Vista de Empleado (Admin Autorizado)
              </span>
            )}
          </div>
          <h1 className="font-black text-3xl md:text-4xl text-slate-900 tracking-tight">
            {isAdmin ? 'Perfil del Administrador' : 'Mi Perfil Laboral'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Información del puesto, datos de contacto y credenciales de acceso.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-2.5 px-4 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-emerald-600">send</span>
              Invitar / Compartir Acceso
            </button>
          )}

          <button
            onClick={() => signInWithGoogle()}
            className="bg-white hover:bg-slate-50 border border-slate-200 py-2.5 px-4 rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 transition-all text-slate-700 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base text-rose-500">account_circle</span>
            Vincular Google
          </button>
        </div>
      </div>

      {/* Role Switcher Card - Exclusively for Administrator on Phone / Mobile / Desktop */}
      {isActualAdmin && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30 shrink-0">
                <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2 flex-wrap">
                  <span>Opciones de Rol de Acceso</span>
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider">
                    SOLO ADMINISTRADOR
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Alterna las funciones de la aplicación en este dispositivo entre la gestión integral de la empresa y tu propio puesto de trabajo como empleado.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <button
              type="button"
              onClick={() => switchRole('admin')}
              className={`p-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                isAdmin
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg ring-2 ring-indigo-400/50'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 text-left">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isAdmin ? 'bg-white/20' : 'bg-slate-700'}`}>
                  <span className="material-symbols-outlined text-xl">shield_person</span>
                </div>
                <div>
                  <span className="block font-black text-sm">Modo Administrador</span>
                  <span className="text-[11px] opacity-80 font-normal">Supervisión, Plantilla, Permisos e Informes</span>
                </div>
              </div>
              {isAdmin && (
                <span className="bg-white text-indigo-900 text-[10px] font-black px-2.5 py-1 rounded-full shadow-xs">
                  ACTIVO
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => switchRole('employee')}
              className={`p-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                !isAdmin
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg ring-2 ring-emerald-400/50'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 text-left">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${!isAdmin ? 'bg-white/20' : 'bg-slate-700'}`}>
                  <span className="material-symbols-outlined text-xl">badge</span>
                </div>
                <div>
                  <span className="block font-black text-sm">Rol de Empleado</span>
                  <span className="text-[11px] opacity-80 font-normal">Mi Fichaje, Mis Vacaciones, Mi Firma Mensual</span>
                </div>
              </div>
              {!isAdmin && (
                <span className="bg-white text-emerald-900 text-[10px] font-black px-2.5 py-1 rounded-full shadow-xs">
                  ACTIVO
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start">
        <UserAvatar
          name={matchingEmployee?.fullName || profile.name}
          size="2xl"
          rounded="3xl"
          showBorder
          borderColor="border-indigo-100"
          className="shadow-md"
        />

        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
            <h2 className="font-bold text-2xl text-slate-900">{matchingEmployee?.fullName || profile.name}</h2>
            <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold text-xs">
              {activeJobTitle}
            </span>
            <span className="bg-slate-100 text-slate-700 font-mono px-2.5 py-0.5 rounded-full font-bold text-xs">
              {activeEmployeeNumber}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs font-mono text-slate-500 mb-4">
            <span>{matchingEmployee?.email || profile.email}</span>
            <span className="text-slate-300">•</span>
            <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md">DNI: {activeDni}</span>
          </div>

          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            <span className="bg-slate-50 text-slate-700 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold">
              🏢 Dpto: {activeDepartment}
            </span>
            <span className="bg-slate-50 text-slate-700 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold">
              📋 Contrato: {activeContract}
            </span>
            <span className="bg-slate-50 text-slate-700 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold">
              ⏱ Jornada: {activeHours}h/semana
            </span>
            <span className="bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-semibold" title={fallbackEmployee.vacationNotes ? `Notas: ${fallbackEmployee.vacationNotes}` : undefined}>
              🏖 Vacaciones: {fallbackEmployee.vacationDays ?? 30} días {fallbackEmployee.vacationDaysType === 'LABORABLES' ? 'laborables' : 'naturales'}
              {fallbackEmployee.vacationNotes && ' ℹ️'}
            </span>
          </div>
        </div>
      </div>

      {/* Personal Info Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-5">
        <h3 className="font-bold text-lg text-slate-900 pb-3 border-b border-slate-100">
          Mis Datos de Identificación
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              DNI / NIE
            </label>
            <input
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Teléfono de Contacto
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>
        </div>

        {savedSuccess && (
          <div className="bg-emerald-500 text-white border border-emerald-400 p-3.5 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 animate-bounce">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            <span>✓ Datos guardados y actualizados con éxito en tu ficha.</span>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className={`py-3 px-6 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center gap-2 ${
              savedSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 scale-[1.02]'
                : isSaving
                ? 'bg-indigo-700 text-white opacity-80 cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
            }`}
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                <span>Guardando...</span>
              </>
            ) : savedSuccess ? (
              <>
                <span className="material-symbols-outlined text-sm font-black">verified</span>
                <span>✓ ¡Perfil Actualizado!</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">save</span>
                <span>Guardar Cambios</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={signOut}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-2.5 px-4 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Cerrar Sesión / Desconectar
          </button>
        </div>
      </form>

      {/* Invite Modal */}
      {showInviteModal && (
        <EmployeeInviteModal
          employee={matchingEmployee}
          companySettings={companySettings}
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onMarkInvited={(method) => {
            markEmployeeInvited(matchingEmployee.id, method);
          }}
        />
      )}
    </div>
  );
};
