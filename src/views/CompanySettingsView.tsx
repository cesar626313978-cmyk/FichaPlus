import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { CompanyOperatingHours, DayScheduleConfig } from '../types';
import { formatMinutesToHours, calculateMinutesBetween } from '../utils/shiftUtils';

export const CompanySettingsView: React.FC = () => {
  const { companySettings, updateCompanySettings, resetAllCompanyData, setActiveTab: setAppTab } = useApp();
  const { profile, updateProfileData } = useAuth();
  const [activeTab, setActiveTab] = useState<'empresa' | 'notificaciones' | 'reset'>('empresa');

  // Company fields
  const [name, setName] = useState(companySettings.companyName);
  const [fiscalId, setFiscalId] = useState(companySettings.fiscalId);
  const [cccCode, setCccCode] = useState(companySettings.cccCode || '');
  const [workplaceAddress, setWorkplaceAddress] = useState(companySettings.workplaceAddress || '');
  const [workplaceCity, setWorkplaceCity] = useState(companySettings.workplaceCity || '');
  const [collectiveAgreement, setCollectiveAgreement] = useState(companySettings.collectiveAgreement || '');
  const [annualHoursLimit, setAnnualHoursLimit] = useState(companySettings.annualHoursLimit || 1780);
  const [overtimeYearlyLimit, setOvertimeYearlyLimit] = useState(companySettings.overtimeYearlyLimit || 80);
  const [intershiftRestHours, setIntershiftRestHours] = useState(companySettings.intershiftRestHours || 12);
  const [weeklyRestHours, setWeeklyRestHours] = useState(companySettings.weeklyRestHours || 36);
  const [paidPauseIncluded, setPaidPauseIncluded] = useState(companySettings.paidPauseIncluded ?? true);
  const [hourBankEnabled, setHourBankEnabled] = useState(companySettings.hourBankEnabled ?? true);
  const [weeklyHours, setWeeklyHours] = useState(companySettings.baseWeeklyHours);
  const [strictClockIn, setStrictClockIn] = useState(companySettings.strictClockIn);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Sectoral Preset Modal State
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [presetKeepIdentity, setPresetKeepIdentity] = useState(true);
  const [presetSuccessMessage, setPresetSuccessMessage] = useState<string | null>(null);

  // Business Operating Schedule (Horario de Apertura de la Empresa)
  const initialOpHours: CompanyOperatingHours = companySettings.operatingHours || {
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
  };

  const [monFriConfig, setMonFriConfig] = useState<DayScheduleConfig>(initialOpHours.monFri);
  const [satConfig, setSatConfig] = useState<DayScheduleConfig>(initialOpHours.saturday);
  const [sunConfig, setSunConfig] = useState<DayScheduleConfig>(initialOpHours.sunday);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state if context companySettings updates from external actions (like reset)
  useEffect(() => {
    if (companySettings) {
      setName(companySettings.companyName || '');
      setFiscalId(companySettings.fiscalId || '');
      setCccCode(companySettings.cccCode || '');
      setWorkplaceAddress(companySettings.workplaceAddress || '');
      setWorkplaceCity(companySettings.workplaceCity || '');
      setCollectiveAgreement(companySettings.collectiveAgreement || '');
      setAnnualHoursLimit(companySettings.annualHoursLimit || 1780);
      setOvertimeYearlyLimit(companySettings.overtimeYearlyLimit || 80);
      setIntershiftRestHours(companySettings.intershiftRestHours || 12);
      setWeeklyRestHours(companySettings.weeklyRestHours || 36);
      setPaidPauseIncluded(companySettings.paidPauseIncluded ?? true);
      setHourBankEnabled(companySettings.hourBankEnabled ?? true);
      setWeeklyHours(companySettings.baseWeeklyHours || 40);
      setStrictClockIn(companySettings.strictClockIn ?? true);
      if (companySettings.operatingHours) {
        setMonFriConfig(companySettings.operatingHours.monFri);
        setSatConfig(companySettings.operatingHours.saturday);
        setSunConfig(companySettings.operatingHours.sunday);
      }
    }
  }, [companySettings.companyName, companySettings.fiscalId, companySettings.cccCode]);

  const applyVeterinaryPreset = (keepCurrentIdentity: boolean) => {
    // If user chose full demo data, also override fiscal identity
    if (!keepCurrentIdentity) {
      setName('Clínica Veterinaria San Antón S.L.');
      setFiscalId('B-46892341');
      setCccCode('46 123456789 (Seguridad Social Valencia)');
      setWorkplaceAddress('Avinguda del Port 88');
      setWorkplaceCity('Valencia (46023)');
    }

    // Always apply labor, legal and schedule parameters
    setCollectiveAgreement('Convenio Colectivo de Centros y Servicios Veterinarios de la Comunitat Valenciana');
    setWeeklyHours(40);
    setAnnualHoursLimit(1780);
    setOvertimeYearlyLimit(80);
    setIntershiftRestHours(12);
    setWeeklyRestHours(36);
    setPaidPauseIncluded(true);
    setHourBankEnabled(true);
    setStrictClockIn(true);

    // Apertura L-V: 09:00 - 20:00 (partida / rotativo) y Sábados 09:00 - 14:00
    setMonFriConfig({
      enabled: true,
      type: 'continua',
      cStart: '09:00',
      cEnd: '20:00',
      t1Start: '09:00',
      t1End: '14:00',
      t2Start: '16:00',
      t2End: '20:00',
    });

    setSatConfig({
      enabled: true,
      type: 'continua',
      cStart: '09:00',
      cEnd: '14:00',
      t1Start: '09:00',
      t1End: '14:00',
      t2Start: '16:00',
      t2End: '20:00',
    });

    setSunConfig({
      enabled: false,
      type: 'continua',
      cStart: '09:00',
      cEnd: '14:00',
    });

    setIsPresetModalOpen(false);
    const msg = keepCurrentIdentity
      ? '✓ Plantilla de Convenio y Horarios de Clínica Veterinaria aplicada. Tus datos de empresa (Nombre, CIF, Dirección) se han mantenido intactos.'
      : '✓ Plantilla de Clínica Veterinaria aplicada al 100% con datos de demostración y horarios oficiales.';
    setPresetSuccessMessage(msg);
    setTimeout(() => setPresetSuccessMessage(null), 6000);
  };

  // Reset Modal & Security State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [securityCode, setSecurityCode] = useState('RESET-7842');
  const [inputCode, setInputCode] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newFiscalId, setNewFiscalId] = useState('');
  const [adminName, setAdminName] = useState(profile.name);
  const [adminEmail, setAdminEmail] = useState(profile.email);
  const [adminDni, setAdminDni] = useState(profile.dni);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Notification toggles
  const [notifPunchAlerts, setNotifPunchAlerts] = useState(true);
  const [notifRequests, setNotifRequests] = useState(true);
  const [notifSystem, setNotifSystem] = useState(true);

  const openResetModal = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    setSecurityCode(`BORRAR-${randomDigits}`);
    setInputCode('');
    setNewCompanyName('');
    setNewFiscalId('');
    setAdminName(profile.name);
    setAdminEmail(profile.email);
    setAdminDni(profile.dni);
    setIsResetModalOpen(true);
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim() !== securityCode) return;

    setIsResetting(true);
    await resetAllCompanyData({
      companyName: newCompanyName.trim(),
      fiscalId: newFiscalId.trim(),
      keepAdmin: true,
      adminName: adminName.trim(),
      adminEmail: adminEmail.trim(),
      adminDni: adminDni.trim(),
    });

    if (adminName.trim() || adminDni.trim()) {
      await updateProfileData({
        name: adminName.trim() || profile.name,
        email: adminEmail.trim() || profile.email,
        dni: adminDni.trim() || profile.dni,
      });
    }

    setName(newCompanyName.trim());
    setFiscalId(newFiscalId.trim());
    setCccCode('');
    setWorkplaceAddress('');
    setWorkplaceCity('');
    setIsResetting(false);
    setResetSuccess(true);

    setTimeout(() => {
      setResetSuccess(false);
      setIsResetModalOpen(false);
      setAppTab('employees');
    }, 2200);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateCompanySettings({
        companyName: name.trim() || 'Mi Empresa',
        fiscalId: fiscalId.trim(),
        cccCode: cccCode.trim(),
        workplaceAddress: workplaceAddress.trim(),
        workplaceCity: workplaceCity.trim(),
        collectiveAgreement: collectiveAgreement.trim(),
        annualHoursLimit: Number(annualHoursLimit) || 1780,
        overtimeYearlyLimit: Number(overtimeYearlyLimit) || 80,
        intershiftRestHours: Number(intershiftRestHours) || 12,
        weeklyRestHours: Number(weeklyRestHours) || 36,
        paidPauseIncluded,
        hourBankEnabled,
        baseWeeklyHours: Number(weeklyHours) || 40,
        strictClockIn,
        operatingHours: {
          monFri: monFriConfig,
          saturday: satConfig,
          sunday: sunConfig,
        },
      });
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTime(timeStr);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Error saving company settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 relative">
      {/* Floating Global Toast Notification */}
      {savedSuccess && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black">
            <span className="material-symbols-outlined text-lg">check</span>
          </div>
          <div>
            <span className="font-bold text-xs block text-white">¡Preferencias Guardadas con Éxito!</span>
            <span className="text-[11px] text-emerald-400 font-semibold">
              Los cambios han sido guardados correctamente {lastSavedTime ? `(${lastSavedTime})` : ''}
            </span>
          </div>
        </div>
      )}

      {/* Preset Feedback Toast */}
      {presetSuccessMessage && (
        <div className="bg-emerald-50 border-2 border-emerald-200 text-emerald-900 px-5 py-4 rounded-2xl flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-emerald-600 font-bold text-xl mt-0.5">
              check_circle
            </span>
            <div>
              <p className="font-bold text-xs text-emerald-900">{presetSuccessMessage}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Pulsa en <strong>"Guardar Preferencias"</strong> abajo para consolidar estos ajustes de forma permanente.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPresetSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-700 font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top title */}
      <div className="pb-2">
        <h1 className="font-black text-3xl md:text-4xl text-slate-900 tracking-tight">
          {activeTab === 'empresa'
            ? 'Ajustes de la Empresa'
            : activeTab === 'notificaciones'
            ? 'Configuración de Notificaciones'
            : 'Restablecer Base de Datos'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {activeTab === 'empresa'
            ? 'Personaliza la identidad corporativa y los parámetros de jornada laboral.'
            : activeTab === 'notificaciones'
            ? 'Personaliza los canales y tipos de alertas que deseas recibir.'
            : 'Elimina los datos de prueba y comienza desde cero con la configuración de tu empresa.'}
        </p>
      </div>

      {/* Switcher */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/60">
        <button
          onClick={() => setActiveTab('empresa')}
          className={`py-2 px-4 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'empresa'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Identidad y Jornada
        </button>
        <button
          onClick={() => setActiveTab('notificaciones')}
          className={`py-2 px-4 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'notificaciones'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Canales de Notificación
        </button>
        <button
          onClick={() => setActiveTab('reset')}
          className={`py-2 px-4 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
            activeTab === 'reset'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-rose-600 hover:bg-rose-50'
          }`}
        >
          <span className="material-symbols-outlined text-sm">restart_alt</span>
          <span>Restablecer Datos</span>
        </button>
      </div>

      {/* TAB 1: Ajustes de Empresa */}
      {activeTab === 'empresa' && (
        <form onSubmit={handleSaveCompany} className="space-y-6">
          {/* Quick Preset Selector for Veterinary Clinics & Other Sectors */}
          <div className="bg-indigo-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-indigo-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-800 text-amber-400 flex items-center justify-center text-2xl font-bold shrink-0 border border-indigo-700">
                🏥
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                    Plantilla Sectorial
                  </span>
                  <span className="text-[10px] font-bold text-indigo-300 bg-indigo-800/80 px-2 py-0.5 rounded-md">
                    Convenio Oficial
                  </span>
                </div>
                <h3 className="font-bold text-sm sm:text-base text-white mt-1">
                  Clínica Veterinaria (Convenio Estatal / Autonómico)
                </h3>
                <p className="text-xs text-indigo-200">
                  L-V 09:00 a 20:00 y Sábados 09:00 a 14:00 (59h apertura) • 1.780h anuales • 40h/sem • 12h descanso interjornada.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPresetModalOpen(true)}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm shadow-amber-400/20"
            >
              <span className="material-symbols-outlined text-sm font-bold">auto_fix_high</span>
              <span>Cargar Plantilla Veterinaria</span>
            </button>
          </div>

          {/* Identity */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
            <h2 className="font-bold text-lg text-slate-900 pb-3 border-b border-slate-100 mb-5 flex items-center justify-between">
              <span>Identidad Corporativa</span>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
                Datos Fiscales
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Nombre de la Empresa / Razón Social
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Innova Soluciones S.L."
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  CIF / NIF Legal
                </label>
                <input
                  type="text"
                  value={fiscalId}
                  onChange={(e) => setFiscalId(e.target.value)}
                  placeholder="B-12345678"
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center justify-between">
                  <span>Código Cuenta Cotización (CCC)</span>
                  <span className="text-[10px] text-indigo-600 font-bold lowercase">Preceptivo ITSS</span>
                </label>
                <input
                  type="text"
                  value={cccCode}
                  onChange={(e) => setCccCode(e.target.value)}
                  placeholder="28 123456789 (Seguridad Social)"
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Convenio Colectivo Aplicable
                </label>
                <input
                  type="text"
                  value={collectiveAgreement}
                  onChange={(e) => setCollectiveAgreement(e.target.value)}
                  placeholder="Ej: Convenio Centros y Servicios Veterinarios"
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Dirección del Centro de Trabajo
                </label>
                <input
                  type="text"
                  value={workplaceAddress}
                  onChange={(e) => setWorkplaceAddress(e.target.value)}
                  placeholder="Ej: Calle Gran Vía 28, Planta 4"
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Municipio y Provincia
                </label>
                <input
                  type="text"
                  value={workplaceCity}
                  onChange={(e) => setWorkplaceCity(e.target.value)}
                  placeholder="Ej: Valencia (46023)"
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>
          </section>

          {/* Legal Limits & ITSS Parameters */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-5">
            <h2 className="font-bold text-lg text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600">gavel</span>
                <span>Parámetros de Convenio y Garantías ITSS (Art. 34 y 35 ET)</span>
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                Límites Legales
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Jornada Anual Máxima (Convenio)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={annualHoursLimit}
                    onChange={(e) => setAnnualHoursLimit(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-xl font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-500">horas/año</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Veterinaria: 1.780h anuales de trabajo efectivo.</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Límite Horas Extras Anuales
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={overtimeYearlyLimit}
                    onChange={(e) => setOvertimeYearlyLimit(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-xl font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-500">horas/año</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Tope máximo Art. 35.2 ET (80h/año por trabajador).</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Descanso Mínimo Inter-jornada
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={intershiftRestHours}
                    onChange={(e) => setIntershiftRestHours(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-xl font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-500">horas</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Mínimo legal Art. 34.3 ET: 12h consecutivas.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Bolsa Horaria y Saldo Flexible</h4>
                  <p className="text-xs text-slate-500">Permite computar excesos y defectos respecto a las 40h para compensar en descansos.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setHourBankEnabled(!hourBankEnabled)}
                  className={`w-14 h-8 p-1 rounded-full transition-colors cursor-pointer shrink-0 ${
                    hourBankEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                      hourBankEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Pausa Legal 15 min como Tiempo Efectivo</h4>
                  <p className="text-xs text-slate-500">Computa el descanso en jornadas continuadas &gt;6h según convenio (Art. 34.4 ET).</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaidPauseIncluded(!paidPauseIncluded)}
                  className={`w-14 h-8 p-1 rounded-full transition-colors cursor-pointer shrink-0 ${
                    paidPauseIncluded ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                      paidPauseIncluded ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Business Operating Hours / Horario de Apertura de la Empresa */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-5">
            <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600 text-xl">storefront</span>
                  <span>Horario de Apertura y Atención del Negocio</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define las horas de apertura de tu centro de trabajo (L-V, Sábados y Domingos) para su uso en la plantilla de empleados.
                </p>
              </div>
              <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span>Horario Oficial del Local</span>
              </span>
            </div>

            {/* 1. LUNES A VIERNES (Apertura Empresa) */}
            <div className="bg-slate-50/90 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-indigo-600">calendar_view_week</span>
                  <span>Lunes a Viernes (Apertura Empresa)</span>
                </span>

                {/* Mode switch */}
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setMonFriConfig({ ...monFriConfig, type: 'continua' })}
                    className={`py-1 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                      monFriConfig.type === 'continua'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Continua
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonFriConfig({ ...monFriConfig, type: 'partida' })}
                    className={`py-1 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                      monFriConfig.type === 'partida'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Partida (2 Turnos)
                  </button>
                </div>
              </div>

              {monFriConfig.type === 'continua' ? (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Apertura L-V</label>
                    <input
                      type="time"
                      value={monFriConfig.cStart || '08:00'}
                      onChange={(e) => setMonFriConfig({ ...monFriConfig, cStart: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl font-mono font-bold text-slate-900 text-sm focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Cierre L-V</label>
                    <input
                      type="time"
                      value={monFriConfig.cEnd || '16:00'}
                      onChange={(e) => setMonFriConfig({ ...monFriConfig, cEnd: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl font-mono font-bold text-slate-900 text-sm focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 block">Mañanas (Turno 1)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Apertura</span>
                        <input
                          type="time"
                          value={monFriConfig.t1Start || '09:00'}
                          onChange={(e) => setMonFriConfig({ ...monFriConfig, t1Start: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Cierre Mediodía</span>
                        <input
                          type="time"
                          value={monFriConfig.t1End || '14:00'}
                          onChange={(e) => setMonFriConfig({ ...monFriConfig, t1End: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-mono font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 block">Tardes (Turno 2)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Reapertura</span>
                        <input
                          type="time"
                          value={monFriConfig.t2Start || '16:00'}
                          onChange={(e) => setMonFriConfig({ ...monFriConfig, t2Start: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Cierre Final</span>
                        <input
                          type="time"
                          value={monFriConfig.t2End || '19:00'}
                          onChange={(e) => setMonFriConfig({ ...monFriConfig, t2End: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-mono font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. SÁBADOS (Apertura Empresa) */}
            <div className="bg-blue-50/70 p-4 sm:p-5 rounded-2xl border border-blue-200/80 space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-blue-600">weekend</span>
                    <span>Sábados (Apertura Empresa)</span>
                  </span>
                  <p className="text-[11px] text-blue-800/80 mt-0.5">
                    {satConfig.enabled
                      ? 'El negocio abre los sábados (ej. mañanas para atención o turnos).'
                      : 'El negocio permanece cerrado los sábados.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSatConfig({ ...satConfig, enabled: !satConfig.enabled })}
                    className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      satConfig.enabled
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {satConfig.enabled ? 'check_circle' : 'cancel'}
                    </span>
                    <span>{satConfig.enabled ? 'Abre los Sábados' : 'Cerrado los Sábados'}</span>
                  </button>
                </div>
              </div>

              {satConfig.enabled && (
                <div className="space-y-3 pt-2 bg-white/90 p-3.5 rounded-xl border border-blue-200">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Horario de Sábados</span>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setSatConfig({ ...satConfig, type: 'continua' })}
                        className={`py-1 px-2.5 rounded-md font-bold text-[11px] transition-all ${
                          satConfig.type === 'continua' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        Mañana Continua
                      </button>
                      <button
                        type="button"
                        onClick={() => setSatConfig({ ...satConfig, type: 'partida' })}
                        className={`py-1 px-2.5 rounded-md font-bold text-[11px] transition-all ${
                          satConfig.type === 'partida' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        Mañana y Tarde (Partida)
                      </button>
                    </div>
                  </div>

                  {satConfig.type === 'continua' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Apertura Sábado</label>
                        <input
                          type="time"
                          value={satConfig.cStart || '09:00'}
                          onChange={(e) => setSatConfig({ ...satConfig, cStart: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Cierre Sábado</label>
                        <input
                          type="time"
                          value={satConfig.cEnd || '14:00'}
                          onChange={(e) => setSatConfig({ ...satConfig, cEnd: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-mono font-bold text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Mañana: Entrada / Salida</span>
                        <div className="flex gap-1">
                          <input
                            type="time"
                            value={satConfig.t1Start || '10:00'}
                            onChange={(e) => setSatConfig({ ...satConfig, t1Start: e.target.value })}
                            className="w-1/2 bg-slate-50 border border-slate-200 p-1.5 rounded font-mono font-bold text-[11px]"
                          />
                          <input
                            type="time"
                            value={satConfig.t1End || '14:00'}
                            onChange={(e) => setSatConfig({ ...satConfig, t1End: e.target.value })}
                            className="w-1/2 bg-slate-50 border border-slate-200 p-1.5 rounded font-mono font-bold text-[11px]"
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Tarde: Entrada / Salida</span>
                        <div className="flex gap-1">
                          <input
                            type="time"
                            value={satConfig.t2Start || '17:00'}
                            onChange={(e) => setSatConfig({ ...satConfig, t2Start: e.target.value })}
                            className="w-1/2 bg-slate-50 border border-slate-200 p-1.5 rounded font-mono font-bold text-[11px]"
                          />
                          <input
                            type="time"
                            value={satConfig.t2End || '20:30'}
                            onChange={(e) => setSatConfig({ ...satConfig, t2End: e.target.value })}
                            className="w-1/2 bg-slate-50 border border-slate-200 p-1.5 rounded font-mono font-bold text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. DOMINGOS (Apertura Empresa) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 flex flex-wrap justify-between items-center gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-slate-500">hotel</span>
                  <span>Domingos</span>
                </span>
                <p className="text-[11px] text-slate-500">
                  {sunConfig.enabled ? 'Negocio abierto los domingos.' : 'Cerrado por descanso dominical.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSunConfig({ ...sunConfig, enabled: !sunConfig.enabled })}
                className={`py-1 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  sunConfig.enabled
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {sunConfig.enabled ? 'Abre Domingos' : 'Cerrado Domingos'}
              </button>
            </div>
          </section>

          {/* Working hours standard */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
            <h2 className="font-bold text-lg text-slate-900 pb-3 border-b border-slate-100 mb-5">
              Jornada Laboral Estándar
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Horas Semanales Base</h4>
                  <p className="text-xs text-slate-400">Cómputo general según convenio colectivo</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setWeeklyHours(Math.max(1, weeklyHours - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-lg w-12 text-center text-slate-900">{weeklyHours}h</span>
                  <button
                    type="button"
                    onClick={() => setWeeklyHours(weeklyHours + 1)}
                    className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Fichaje Estricto con Geolocalización</h4>
                  <p className="text-xs text-slate-400">Validar coordenadas GPS al registrar la entrada</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStrictClockIn(!strictClockIn)}
                  className={`w-14 h-8 p-1 rounded-full transition-colors cursor-pointer ${
                    strictClockIn ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                      strictClockIn ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Dynamic feedback banner */}
          {savedSuccess && (
            <div className="bg-emerald-500 text-white border-2 border-emerald-400 p-4 rounded-2xl text-center font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2.5 animate-bounce">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
              <span>
                ¡Preferencias guardadas y actualizadas con éxito! {lastSavedTime ? `(${lastSavedTime})` : ''}
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className={`flex-1 py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg transition-all cursor-pointer text-center flex items-center justify-center gap-2 ${
                savedSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 scale-[1.01]'
                  : isSaving
                  ? 'bg-indigo-700 text-white opacity-80 cursor-wait'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
            >
              {isSaving ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                  <span>Guardando Preferencias...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <span className="material-symbols-outlined text-xl font-black">verified</span>
                  <span>✓ ¡Guardado y Actualizado con Éxito!</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  <span>Guardar Preferencias</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={openResetModal}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-200 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base text-rose-600">restart_alt</span>
              <span>Restablecer Datos</span>
            </button>
          </div>

          {/* Danger Zone banner at bottom of main tab */}
          <div className="bg-rose-50/70 border-2 border-rose-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-rose-950 text-left">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl font-black">delete_forever</span>
              </div>
              <div>
                <h3 className="font-black text-sm text-rose-950 uppercase tracking-wide">
                  ¿Quieres borrar los datos de prueba y empezar de cero?
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  Elimina todos los fichajes ficticios y configura el nombre real y CIF de tu empresa.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openResetModal}
              className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider py-3 px-5 rounded-2xl shadow-sm transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              <span>Restablecer Ahora</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Notificaciones */}
      {activeTab === 'notificaciones' && (
        <div className="space-y-6">
          <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-4">
            <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <h4 className="font-bold text-sm text-slate-900">Alertas de Fichaje</h4>
                <p className="text-xs text-slate-400">Fichajes fuera de horario, olvidos de salida y geolocalización</p>
              </div>
              <input
                type="checkbox"
                checked={notifPunchAlerts}
                onChange={(e) => setNotifPunchAlerts(e.target.checked)}
                className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <h4 className="font-bold text-sm text-slate-900">Gestión de Solicitudes</h4>
                <p className="text-xs text-slate-400">Nuevas peticiones de vacaciones, propuestas de subsanación y firmas</p>
              </div>
              <input
                type="checkbox"
                checked={notifRequests}
                onChange={(e) => setNotifRequests(e.target.checked)}
                className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <h4 className="font-bold text-sm text-slate-900">Avisos del Sistema</h4>
                <p className="text-xs text-slate-400">Actualizaciones de la plataforma y resúmenes semanales listos</p>
              </div>
              <input
                type="checkbox"
                checked={notifSystem}
                onChange={(e) => setNotifSystem(e.target.checked)}
                className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </section>

          <button
            onClick={() => {
              setIsSaving(true);
              setTimeout(() => {
                setIsSaving(false);
                const now = new Date();
                setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 3500);
              }, 400);
            }}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              savedSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
            }`}
          >
            {savedSuccess ? (
              <>
                <span className="material-symbols-outlined text-xl font-black">verified</span>
                <span>✓ ¡Preferencias de Canales Guardadas!</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">save</span>
                <span>Guardar Preferencias de Canales</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* TAB 3: Restablecer Datos de la Empresa (Zona Crítica) */}
      {activeTab === 'reset' && (
        <div className="space-y-6">
          <section className="bg-rose-50/60 rounded-3xl p-6 sm:p-8 border-2 border-rose-200 space-y-5">
            <div className="flex items-center gap-3 text-rose-900">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-2xl font-black">warning</span>
              </div>
              <div>
                <h2 className="font-black text-xl text-rose-950">
                  Zona Crítica: Restablecimiento de Fábrica
                </h2>
                <p className="text-xs text-rose-700 mt-0.5">
                  Elimina todos los datos de demostración y empieza desde cero con los datos de tu empresa.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-rose-100 space-y-3 text-xs text-slate-700">
              <h3 className="font-black text-sm text-slate-900">
                ¿Qué sucederá al restablecer la aplicación?
              </h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-rose-700">
                  <span className="material-symbols-outlined text-base text-rose-500">cancel</span>
                  <span>Se eliminarán todos los <strong>fichajes y registros de jornada</strong> de prueba.</span>
                </li>
                <li className="flex items-center gap-2 text-rose-700">
                  <span className="material-symbols-outlined text-base text-rose-500">cancel</span>
                  <span>Se cancelarán todas las <strong>solicitudes de vacaciones</strong> y peticiones de subsanación.</span>
                </li>
                <li className="flex items-center gap-2 text-rose-700">
                  <span className="material-symbols-outlined text-base text-rose-500">cancel</span>
                  <span>Se borrarán los <strong>empleados de prueba</strong> para que puedas registrar a tu plantilla real.</span>
                </li>
                <li className="flex items-center gap-2 text-emerald-700">
                  <span className="material-symbols-outlined text-base text-emerald-500">check_circle</span>
                  <span>Podrás introducir inmediatamente el <strong>nombre real de tu empresa, CIF y tu usuario Administrador</strong>.</span>
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={openResetModal}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-sm uppercase tracking-wider py-4 px-6 rounded-2xl shadow-lg shadow-rose-200 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">delete_forever</span>
                <span>Restablecer Todos los Datos y Comenzar de Cero</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* High Security Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-rose-300 max-w-lg w-full p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl font-black">shield_lock</span>
                </div>
                <div>
                  <h2 className="font-black text-xl text-slate-900 leading-tight">
                    Confirmación de Seguridad
                  </h2>
                  <p className="text-xs text-rose-600 font-bold mt-0.5">
                    Acción destructiva irreversible
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {resetSuccess ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <span className="material-symbols-outlined text-4xl">check</span>
                </div>
                <h3 className="font-black text-2xl text-slate-900">¡Restablecimiento Completado!</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  La base de datos está limpia. Redirigiéndote al módulo de empleados para dar de alta a tu equipo real...
                </p>
              </div>
            ) : (
              <form onSubmit={handleExecuteReset} className="space-y-4 pt-4">
                <p className="text-xs text-slate-600">
                  Para evitar borrados accidentales, introduce los datos de tu nueva empresa y escribe el código de seguridad que ves a continuación:
                </p>

                {/* Form fields for clean start */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-800">
                    Datos de la Nueva Empresa
                  </h4>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                      Nombre Real de la Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="Ej: Grupo García & Asociados S.L."
                      className="w-full bg-white border border-slate-300 p-2.5 rounded-xl font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                      CIF / NIF Legal
                    </label>
                    <input
                      type="text"
                      value={newFiscalId}
                      onChange={(e) => setNewFiscalId(e.target.value)}
                      placeholder="B-98765432"
                      className="w-full bg-white border border-slate-300 p-2.5 rounded-xl font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="pt-1 border-t border-slate-200">
                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                      Nombre del Administrador Principal
                    </label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full bg-white border border-slate-300 p-2.5 rounded-xl font-semibold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Security Code Verification Box */}
                <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-2xl text-center space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 block">
                    Código de Seguridad Requerido:
                  </span>
                  <div className="inline-block bg-white px-4 py-2 rounded-xl border-2 border-rose-300 font-mono font-black text-xl tracking-widest text-rose-600 shadow-inner select-all">
                    {securityCode}
                  </div>
                  <p className="text-[10px] text-rose-700">
                    Escribe el código tal como aparece arriba para habilitar el botón de vaciado.
                  </p>

                  <input
                    type="text"
                    required
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder={`Escribe ${securityCode}`}
                    className="w-full bg-white border-2 border-rose-300 p-3 rounded-xl font-mono font-black text-center text-sm uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-2xl text-xs transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={inputCode.trim() !== securityCode || !newCompanyName.trim() || isResetting}
                    className={`flex-2 py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputCode.trim() === securityCode && newCompanyName.trim() && !isResetting
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {isResetting ? 'hourglass_top' : 'delete_forever'}
                    </span>
                    <span>
                      {isResetting
                        ? 'Vaciando Datos...'
                        : inputCode.trim() !== securityCode
                        ? 'Introduce el Código'
                        : 'Confirmar y Vaciar Todo'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Sectoral Veterinary Preset Modal */}
      {isPresetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-indigo-100 max-w-lg w-full p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-2xl font-bold">
                  🏥
                </div>
                <div>
                  <h2 className="font-black text-xl text-slate-900 leading-tight">
                    Plantilla de Clínica Veterinaria
                  </h2>
                  <p className="text-xs text-indigo-600 font-bold mt-0.5">
                    Convenio Colectivo y Parámetros Laborales
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPresetModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs text-slate-700">
              <p className="text-slate-600 leading-relaxed">
                Esta plantilla preconfigura automáticamente los requisitos legales y los horarios estándar del sector veterinario:
              </p>

              {/* Specs pill list */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-slate-800 font-bold pb-1.5 border-b border-slate-200">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-indigo-600">gavel</span>
                    Convenio
                  </span>
                  <span className="text-[11px] text-indigo-700">Centros Veterinarios (1.780h/año)</span>
                </div>
                <div className="flex items-center justify-between text-slate-800 font-bold pb-1.5 border-b border-slate-200">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-indigo-600">schedule</span>
                    Horario de Clínica
                  </span>
                  <span className="text-[11px] text-slate-900">L-V 09:00-20:00 y Sáb 09:00-14:00</span>
                </div>
                <div className="flex items-center justify-between text-slate-800 font-bold pb-1.5 border-b border-slate-200">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-indigo-600">bedtime</span>
                    Descanso legal
                  </span>
                  <span className="text-[11px] text-slate-900">12h interjornada • 36h semanal</span>
                </div>
                <div className="flex items-center justify-between text-slate-800 font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-indigo-600">account_balance_wallet</span>
                    Bolsa de Horas
                  </span>
                  <span className="text-[11px] text-emerald-600">Activada para turnos rotativos</span>
                </div>
              </div>

              {/* Selection: Keep my identity vs Full demo */}
              <div className="space-y-3 pt-2">
                <span className="font-bold text-xs text-slate-900 block">
                  ¿Cómo deseas aplicar esta plantilla a tu empresa?
                </span>

                <label
                  onClick={() => setPresetKeepIdentity(true)}
                  className={`p-4 rounded-2xl border-2 transition-all flex items-start gap-3 cursor-pointer ${
                    presetKeepIdentity
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="presetMode"
                    checked={presetKeepIdentity}
                    onChange={() => setPresetKeepIdentity(true)}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-slate-900">
                        Mantener mis datos de empresa actuales
                      </span>
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      No modificará tu Razón Social <strong>({name || 'Sin nombre aún'})</strong>, CIF <strong>({fiscalId || 'Sin CIF'})</strong>, ni tu dirección. Solo aplicará el convenio, descansos y horarios de apertura.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setPresetKeepIdentity(false)}
                  className={`p-4 rounded-2xl border-2 transition-all flex items-start gap-3 cursor-pointer ${
                    !presetKeepIdentity
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="presetMode"
                    checked={!presetKeepIdentity}
                    onChange={() => setPresetKeepIdentity(false)}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <span className="font-black text-xs text-slate-900">
                      Rellenar también con datos de ejemplo ficticios
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Sobrescribirá los datos con la clínica de demostración <em>"Clínica Veterinaria San Antón S.L. (CIF B-46892341, Valencia)"</em>.
                    </p>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPresetModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-2xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => applyVeterinaryPreset(presetKeepIdentity)}
                  className="flex-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">auto_fix_high</span>
                  <span>Aplicar Parámetros de Plantilla</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
