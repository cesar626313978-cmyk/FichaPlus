import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { EmployeeInviteModal } from '../components/EmployeeInviteModal';
import { EmployeeRecord } from '../types';
import { UserAvatar } from '../components/UserAvatar';

export const ProfileView: React.FC = () => {
  const { profile, updateProfileData, signInWithGoogle, signOut } = useAuth();
  const { companySettings, employees, markEmployeeInvited } = useApp();
  const isAdmin = profile.role === 'admin' || profile.role === 'manager';

  const [phone, setPhone] = useState(profile.phone);
  const [dni, setDni] = useState(profile.dni);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfileData({ phone, dni });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const matchingEmployee: EmployeeRecord = employees.find(
    (e) => e.dni === profile.dni || e.email === profile.email
  ) || {
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
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
              isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
            }`}>
              {isAdmin ? 'Superusuario / Administrador' : 'Empleado / Usuario'}
            </span>
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
            onClick={signInWithGoogle}
            className="bg-white hover:bg-slate-50 border border-slate-200 py-2.5 px-4 rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 transition-all text-slate-700 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base text-rose-500">account_circle</span>
            Vincular Google
          </button>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start">
        <UserAvatar
          name={profile.name}
          size="2xl"
          rounded="3xl"
          showBorder
          borderColor="border-indigo-100"
          className="shadow-md"
        />

        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
            <h2 className="font-bold text-2xl text-slate-900">{profile.name}</h2>
            <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold text-xs">
              {profile.jobTitle}
            </span>
          </div>
          <p className="text-xs font-mono text-slate-400 mb-4">{profile.email}</p>

          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            <span className="bg-slate-50 text-slate-700 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold">
              🏢 Dpto: {profile.department}
            </span>
            <span className="bg-slate-50 text-slate-700 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold">
              📋 Contrato: {profile.contractType}
            </span>
            <span className="bg-slate-50 text-slate-700 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold">
              ⏱ Jornada: {profile.weeklyHours}h/semana
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
