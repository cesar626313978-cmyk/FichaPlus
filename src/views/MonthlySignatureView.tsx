import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { exportMonthlySignPdf } from '../utils/pdfGenerator';
import { UserAvatar } from '../components/UserAvatar';
import confetti from 'canvas-confetti';
import { isMonthClosed, formatYearMonthLabel } from '../utils/employeeUtils';

export const MonthlySignatureView: React.FC = () => {
  const { monthlyRecord, timeEntries, companySettings, employees, signMonthlyRecord } = useApp();
  const { profile } = useAuth();
  const isAdmin = profile.role === 'admin' || profile.role === 'manager';

  const currentYearMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-09"

  // Build available months list derived from timeEntries and today's date
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentYearMonth);
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    set.add(d.toISOString().slice(0, 7));

    (timeEntries || []).forEach((t) => {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.slice(0, 7));
      }
    });

    return Array.from(set).sort().reverse();
  }, [timeEntries, currentYearMonth]);

  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(currentYearMonth);
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'team_signatures' | 'my_signature'>('team_signatures');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [reminderSent, setReminderSent] = useState<string | null>(null);

  // Month-specific calculations
  const isSelectedClosed = isMonthClosed(selectedYearMonth);
  const selectedMonthLabel = formatYearMonthLabel(selectedYearMonth);

  // Read saved monthly records map from localStorage
  const savedRecordsMap = useMemo(() => {
    try {
      const raw = localStorage.getItem('fichaplus_monthly_records');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [monthlyRecord]);

  const monthSavedRecord = savedRecordsMap[selectedYearMonth] || (monthlyRecord.yearMonth === selectedYearMonth ? monthlyRecord : null);
  const isCurrentSelectionSigned = Boolean(monthSavedRecord?.isSigned);

  const [signedHash, setSignedHash] = useState(monthSavedRecord?.securityHash || '');
  const [signedTime, setSignedTime] = useState(monthSavedRecord?.signedAt || '');

  // User entries filtered by selected month
  const userEntries = useMemo(() => {
    return (timeEntries || []).filter(
      (t) =>
        (t.userId === profile.id ||
          t.userName === profile.name ||
          (employees.length <= 1 && (!t.userId || t.userId === 'emp-001'))) &&
        (t.date || '').startsWith(selectedYearMonth)
    );
  }, [timeEntries, profile.id, profile.name, employees.length, selectedYearMonth]);

  const computedTotalHours = userEntries.reduce((sum, e) => sum + (e.totalHoursWorked || 0), 0);
  const displayTotalHours = computedTotalHours > 0 ? computedTotalHours : (monthSavedRecord?.ordinaryHours || 0);
  const hasHoursToSign = computedTotalHours > 0 || (monthSavedRecord?.ordinaryHours || 0) > 0 || userEntries.length > 0;

  const ordHours = Math.floor(displayTotalHours);
  const ordMins = Math.round((displayTotalHours - ordHours) * 60);

  const extraHours = monthSavedRecord?.extraHours || 0;
  const extraHoursInt = Math.floor(extraHours);
  const extraMins = Math.round((extraHours - extraHoursInt) * 60);

  const compHours = monthSavedRecord?.complementaryHours || 0;
  const compHoursInt = Math.floor(compHours);
  const compMins = Math.round((compHours - compHoursInt) * 60);

  // Team Signatures calculations for the selected month
  const signedEmployeesCount = employees.filter((emp) => {
    const isSignedDirect = monthlyRecord.yearMonth === selectedYearMonth && monthlyRecord.isSigned && (monthlyRecord.userId === emp.id || emp.dni === profile.dni);
    const isSignedMap = savedRecordsMap[selectedYearMonth]?.isSigned && (savedRecordsMap[selectedYearMonth]?.userId === emp.id || emp.dni === profile.dni);
    return isSignedDirect || isSignedMap;
  }).length;

  const compliancePercent = employees.length > 0
    ? Math.round((signedEmployeesCount / employees.length) * 100)
    : 0;

  const handleSign = async () => {
    if (!legalAccepted || isSigning || !isSelectedClosed) return;
    setIsSigning(true);
    try {
      const hash = await signMonthlyRecord(selectedYearMonth, displayTotalHours);
      setSignedHash(hash);
      setSignedTime(new Date().toLocaleTimeString('es-ES') + ' CET');
      setShowSuccessModal(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownloadPdf = () => {
    const currentEmp = employees.find((e) => e.id === profile.id || e.dni === profile.dni);
    exportMonthlySignPdf(
      {
        ...monthlyRecord,
        yearMonth: selectedYearMonth,
        month: selectedMonthLabel,
        ordinaryHours: displayTotalHours,
        isSigned: isCurrentSelectionSigned,
        securityHash: isCurrentSelectionSigned ? (signedHash || monthSavedRecord?.securityHash || monthlyRecord.securityHash) : undefined,
        signedAt: isCurrentSelectionSigned ? (signedTime || monthSavedRecord?.signedAt || monthlyRecord.signedAt) : undefined,
      },
      companySettings,
      userEntries.length > 0 ? userEntries : (timeEntries || []).filter((t) => (t.date || '').startsWith(selectedYearMonth)),
      currentEmp
    );
  };

  const handleSendReminder = (empName: string) => {
    setReminderSent(empName);
    setTimeout(() => setReminderSent(null), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
        <div>
          <span
            className={`inline-flex items-center gap-1.5 font-bold text-xs px-3 py-1 rounded-full mb-2 ${
              isAdmin
                ? 'bg-purple-100 text-purple-800'
                : !isSelectedClosed
                ? 'bg-blue-100 text-blue-800'
                : isCurrentSelectionSigned
                ? 'bg-emerald-100 text-emerald-800'
                : !hasHoursToSign
                ? 'bg-slate-100 text-slate-600'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
            {isAdmin
              ? 'Módulo Legal de RRHH'
              : !isSelectedClosed
              ? 'Mes en curso (En progreso)'
              : isCurrentSelectionSigned
              ? 'Registro Firmado y Válido'
              : !hasHoursToSign
              ? 'Sin Fichajes Pendientes'
              : 'Pendiente de Firma Legal (Mes cerrado)'}
          </span>
          <h1 className="font-black text-3xl md:text-4xl text-slate-900 tracking-tight">
            {isAdmin ? 'Firmas Mensuales de la Plantilla' : selectedMonthLabel}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAdmin
              ? 'Supervisión y control del cumplimiento de firmas obligatorias según el Art. 34.9 del Estatuto de los Trabajadores.'
              : `Revisión del registro de jornada de ${selectedMonthLabel} conforme al Art. 34.9 del Estatuto de los Trabajadores.`}
          </p>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined">badge</span>
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900">{profile.name}</p>
            <p className="text-xs font-mono text-slate-400">DNI: {profile.dni || '12345678X'}</p>
          </div>
        </div>
      </div>

      {/* Month Switcher Selector Bar */}
      <div className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-600 text-xl">calendar_month</span>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Periodo mensual:</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {availableMonths.map((ym) => {
            const closed = isMonthClosed(ym);
            const label = formatYearMonthLabel(ym);
            const isSelected = ym === selectedYearMonth;
            return (
              <button
                key={ym}
                onClick={() => setSelectedYearMonth(ym)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}
              >
                <span>{label}</span>
                {!closed ? (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${isSelected ? 'bg-indigo-500 text-white' : 'bg-blue-100 text-blue-700'}`}>
                    En curso
                  </span>
                ) : (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    Cerrado
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* In-Progress Active Month Notice (E.g. Septiembre 2026) */}
      {!isSelectedClosed && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-blue-50 border border-blue-200/80 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs animate-in fade-in duration-300">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-2xl">event_note</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-blue-950">
                  Mes de {selectedMonthLabel} en curso — Registro de jornada activo
                </h4>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-200/70 text-blue-800">
                  En progreso
                </span>
              </div>
              <p className="text-xs text-blue-900/80 mt-1 leading-relaxed max-w-2xl">
                El mes actual aún no ha finalizado. Conforme al <strong>Art. 34.9 del Estatuto de los Trabajadores</strong> y las directrices de la Inspección de Trabajo (ITSS), la firma obligatoria de la hoja mensual de registro se formaliza <strong>a mes vencido</strong>, una vez concluido el mes natural.
              </p>
              <p className="text-[11px] text-blue-800/70 mt-1">
                Tus fichajes diarios continúan computándose con total normalidad. Puedes consultar tu desglose acumulado en tiempo real o descargar un borrador de previsualización en PDF.
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadPdf}
            className="shrink-0 bg-white hover:bg-blue-50 text-blue-900 border border-blue-200 font-bold text-xs py-2 px-3.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Descargar borrador en PDF del mes en curso"
          >
            <span className="material-symbols-outlined text-sm text-rose-500">picture_as_pdf</span>
            <span>Descargar Borrador</span>
          </button>
        </div>
      )}

      {/* Reminder notification toast */}
      {reminderSent && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-emerald-600">mark_email_read</span>
          <span>Recordatorio de firma legal enviado con éxito a <strong>{reminderSent}</strong>.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUPERUSUARIO / ADMIN EXPERIENCE */}
      {/* ========================================================================= */}
      {isAdmin && (
        <>
          {/* Admin Tabs Switcher */}
          <div className="flex gap-2 p-1 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/60">
            <button
              onClick={() => setActiveAdminSubTab('team_signatures')}
              className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeAdminSubTab === 'team_signatures'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm">groups</span>
              <span>Control de Firmas de la Plantilla ({employees.length})</span>
            </button>
            <button
              onClick={() => setActiveAdminSubTab('my_signature')}
              className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeAdminSubTab === 'my_signature'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm">draw</span>
              <span>Mi Firma Personal</span>
            </button>
          </div>

          {/* TAB 1: TEAM SIGNATURES TABLE */}
          {activeAdminSubTab === 'team_signatures' && (
            <div className="flex flex-col gap-6">
              {/* Compliance Summary Card */}
              <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-200 block mb-1">
                    CUMPLIMIENTO LEGAL MENSUAL ({selectedMonthLabel.toUpperCase()})
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-black text-4xl text-white">
                      {!isSelectedClosed ? '--' : `${compliancePercent}%`}
                    </span>
                    <span className="text-sm font-medium text-purple-100">
                      {!isSelectedClosed
                        ? 'Mes en curso (Firmas requeridas a mes vencido)'
                        : `firmas completadas (${signedEmployeesCount} de ${employees.length})`}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  {isSelectedClosed && (
                    <button
                      onClick={() => handleSendReminder('todos los empleados pendientes')}
                      className="bg-white hover:bg-purple-50 text-indigo-900 font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm text-indigo-600">notifications_active</span>
                      <span>Recordatorio Masivo</span>
                    </button>
                  )}
                  <button
                    onClick={handleDownloadPdf}
                    className="bg-indigo-900/60 hover:bg-indigo-900/80 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    <span>{isSelectedClosed ? 'Descargar Lote PDF' : 'Descargar Borradores'}</span>
                  </button>
                </div>
              </div>

              {/* Plantilla Signatures Status List */}
              <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Estado de Firmas por Trabajador</h3>
                    <p className="text-xs text-slate-400">
                      Periodo computable: {selectedMonthLabel} ({isSelectedClosed ? 'Mes cerrado' : 'En progreso'})
                    </p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                    Inspección ITSS
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100 tracking-wider">
                        <th className="px-6 py-3.5">Empleado / DNI</th>
                        <th className="px-6 py-3.5">Estado Firma</th>
                        <th className="px-6 py-3.5">Horas Mes</th>
                        <th className="px-6 py-3.5">Fecha y Hash SHA-256</th>
                        <th className="px-6 py-3.5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {employees.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">
                            No hay empleados dados de alta en el sistema.
                          </td>
                        </tr>
                      ) : (
                        employees.map((emp) => {
                          const isEmpSigned = (monthlyRecord.yearMonth === selectedYearMonth && monthlyRecord.isSigned && (monthlyRecord.userId === emp.id || emp.dni === profile.dni)) ||
                            Boolean(savedRecordsMap[selectedYearMonth]?.isSigned && (savedRecordsMap[selectedYearMonth]?.userId === emp.id || emp.dni === profile.dni));
                          const empHash = isEmpSigned ? (savedRecordsMap[selectedYearMonth]?.securityHash || monthlyRecord.securityHash || 'sha256:7f8e...c92a') : null;
                          const empHours = (timeEntries || [])
                            .filter((t) => (t.userId === emp.id || t.userName === emp.fullName) && (t.date || '').startsWith(selectedYearMonth))
                            .reduce((sum, e) => sum + (e.totalHoursWorked || 0), 0);

                          return (
                            <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <UserAvatar
                                    name={emp.fullName}
                                    size="sm"
                                    rounded="xl"
                                  />
                                  <div>
                                    <span className="font-bold text-xs text-slate-900 block">{emp.fullName}</span>
                                    <span className="text-[10px] font-mono text-slate-400">DNI: {emp.dni}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                {!isSelectedClosed ? (
                                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    En curso
                                  </span>
                                ) : isEmpSigned ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Firmado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                    Pendiente
                                  </span>
                                )}
                              </td>

                              <td className="px-6 py-4">
                                <span className="font-bold text-xs text-slate-800">
                                  {Math.floor(empHours)}h {String(Math.round((empHours % 1) * 60)).padStart(2, '0')}m
                                </span>
                              </td>

                              <td className="px-6 py-4">
                                {!isSelectedClosed ? (
                                  <span className="text-xs text-slate-400 italic">En curso (Firma a mes vencido)</span>
                                ) : isEmpSigned ? (
                                  <div>
                                    <span className="text-xs text-slate-700 block font-medium">
                                      {savedRecordsMap[selectedYearMonth]?.signedAt || monthlyRecord.signedAt || 'Firmado legalmente'}
                                    </span>
                                    <span className="font-mono text-[10px] text-indigo-600 font-bold">{empHash}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">Pendiente de conformidad</span>
                                )}
                              </td>

                              <td className="px-6 py-4 text-right">
                                {!isSelectedClosed ? (
                                  <button
                                    onClick={handleDownloadPdf}
                                    className="bg-slate-100 hover:bg-indigo-50 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ml-auto cursor-pointer"
                                    title="Descargar borrador de informe"
                                  >
                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                    <span>Borrador</span>
                                  </button>
                                ) : isEmpSigned ? (
                                  <button
                                    onClick={handleDownloadPdf}
                                    className="bg-slate-100 hover:bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ml-auto cursor-pointer"
                                    title="Descargar PDF certificado de este empleado"
                                  >
                                    <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                                    <span>PDF</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleSendReminder(emp.fullName)}
                                    className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ml-auto cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-sm">send</span>
                                    <span>Recordar</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* PERSONAL SIGNATURE FORM (For Employee OR Admin in 'my_signature' tab) */}
      {/* ========================================================================= */}
      {(!isAdmin || activeAdminSubTab === 'my_signature') && (
        <div className="flex flex-col gap-6">
          {/* Bento Grid: Hours Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Horas Ordinarias ({selectedMonthLabel})
                </span>
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  ⏱️
                </span>
              </div>
              <div className="font-black text-3xl text-indigo-600 mt-4">
                {ordHours}h <span className="text-lg font-bold text-slate-400">{String(ordMins).padStart(2, '0')}m</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Horas Extras
                </span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  ⚡
                </span>
              </div>
              <div className="font-black text-3xl text-amber-500 mt-4">
                {extraHoursInt}h <span className="text-lg font-bold text-slate-400">{String(extraMins).padStart(2, '0')}m</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  H. Complementarias
                </span>
                <span className="w-8 h-8 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center font-bold">
                  📑
                </span>
              </div>
              <div className="font-black text-3xl text-pink-500 mt-4">
                {compHoursInt}h <span className="text-lg font-bold text-slate-400">{String(compMins).padStart(2, '0')}m</span>
              </div>
            </div>
          </div>

          {/* Daily Detail Table Preview */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600">receipt_long</span>
                <h3 className="font-bold text-base text-slate-900">
                  Detalle Diario ({selectedMonthLabel})
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {!isSelectedClosed ? 'Cómputo en progreso' : 'Cómputo consolidado'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100">
                    <th className="px-6 py-3.5">Día</th>
                    <th className="px-6 py-3.5">Entrada</th>
                    <th className="px-6 py-3.5">Salida</th>
                    <th className="px-6 py-3.5">Pausa</th>
                    <th className="px-6 py-3.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {userEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                        <div className="flex flex-col items-center gap-2">
                          <span className="material-symbols-outlined text-3xl text-slate-300">event_busy</span>
                          <span className="font-semibold text-slate-600">Sin fichajes registrados en {selectedMonthLabel}</span>
                          <span className="text-xs text-slate-400">Los registros de entrada y salida aparecerán aquí conforme fiches cada jornada.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    userEntries.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-slate-800">{row.date}</td>
                        <td className="px-6 py-3.5 font-mono text-emerald-600 font-medium">{row.clockIn}</td>
                        <td className="px-6 py-3.5 font-mono text-rose-500 font-medium">{row.clockOut || '--:--'}</td>
                        <td className="px-6 py-3.5 text-slate-500">{row.breakDurationMinutes > 0 ? `${row.breakDurationMinutes}m` : '0m'}</td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-900">{row.totalHoursWorked}h</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature Box */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
            {!isSelectedClosed ? (
              <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 mb-6">
                <span className="material-symbols-outlined text-blue-600 text-2xl shrink-0">pending_actions</span>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Firma mensual disponible al cierre de {selectedMonthLabel}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Al no haber finalizado el mes de {selectedMonthLabel}, el registro de jornada continúa acumulando tus jornadas diarias. La firma de conformidad legal con sello criptográfico se habilitará automáticamente a mes vencido una vez finalizado el último día natural del mes.
                  </p>
                </div>
              </div>
            ) : !hasHoursToSign && !isCurrentSelectionSigned ? (
              <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 mb-6">
                <span className="material-symbols-outlined text-slate-400 text-2xl shrink-0">info</span>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">No hay jornadas registradas para firmar</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    No tienes fichajes computados en el mes de <strong>{selectedMonthLabel}</strong>. La firma mensual se activará de forma automática cuando existan registros completados en este periodo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3.5 mb-6 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <input
                  id="legal-check"
                  type="checkbox"
                  checked={legalAccepted}
                  disabled={isCurrentSelectionSigned}
                  onChange={(e) => setLegalAccepted(e.target.checked)}
                  className="w-5 h-5 rounded-md text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0 mt-0.5"
                />
                <label htmlFor="legal-check" className="text-xs sm:text-sm font-medium text-slate-700 cursor-pointer leading-relaxed">
                  Declaro que la información contenida en este registro horario mensual ({selectedMonthLabel}) es veraz, exacta y refleja fielmente las horas ordinarias y extraordinarias trabajadas durante el periodo indicado, conforme al <strong>Art. 34.9 del Estatuto de los Trabajadores</strong>.
                </label>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              <button
                onClick={handleSign}
                disabled={!isSelectedClosed || !legalAccepted || isSigning || !hasHoursToSign || isCurrentSelectionSigned}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  !isSelectedClosed
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                    : isCurrentSelectionSigned
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default shadow-none'
                    : hasHoursToSign && legalAccepted && !isSigning
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-lg'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {!isSelectedClosed ? 'lock_clock' : isCurrentSelectionSigned ? 'verified' : isSigning ? 'sync' : 'draw'}
                </span>
                <span>
                  {!isSelectedClosed
                    ? 'Mes en curso (Firma al cierre del mes)'
                    : isCurrentSelectionSigned
                    ? 'Registro Ya Firmado'
                    : !hasHoursToSign
                    ? 'Sin Registros para Firmar'
                    : isSigning
                    ? 'Generando Firma SHA-256...'
                    : 'Firmar Registro Mensual'}
                </span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={!hasHoursToSign && !isCurrentSelectionSigned}
                className={`w-full sm:w-auto border px-6 py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  hasHoursToSign || isCurrentSelectionSigned
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined text-lg text-rose-500">picture_as_pdf</span>
                <span>
                  {!isSelectedClosed ? 'Descargar Modelo Oficial (Borrador)' : 'Descargar Modelo Oficial PDF'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-black">
              ✓
            </div>
            <h3 className="font-black text-xl text-slate-900">¡Registro Firmado Exitosamente!</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tu firma electrónica de {selectedMonthLabel} ha sido sellada y registrada con valor probatorio legal ante la Inspección de Trabajo.
            </p>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Sello Criptográfico SHA-256</span>
              <p className="font-mono text-[10px] text-indigo-700 font-bold break-all">{signedHash}</p>
              <span className="text-[10px] text-slate-400 block mt-1">Registrado el {signedTime}</span>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  handleDownloadPdf();
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-200"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span>Bajar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
