import React, { useState } from 'react';
import { EmployeeRecord, EmployeeReminders, ReminderAlertType, ShiftReminderItem } from '../types';
import {
  triggerReminderAlert,
  speakVoiceNotification,
  triggerHaptic,
  playDeviceChime,
  getDefaultEmployeeReminders,
  requestPushNotificationPermission,
} from '../utils/devicePermissions';

interface EmployeeRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeRecord;
  onSave: (updatedReminders: EmployeeReminders) => Promise<void>;
  isAdminView?: boolean;
}

export const EmployeeRemindersModal: React.FC<EmployeeRemindersModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSave,
  isAdminView = false,
}) => {
  const initial = employee.reminders || getDefaultEmployeeReminders(employee.fullName);

  const [reminders, setReminders] = useState<EmployeeReminders>(initial);
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [guideTab, setGuideTab] = useState<'iphone' | 'android' | null>(null);

  if (!isOpen) return null;

  const handleToggleGeneral = (enabled: boolean) => {
    setReminders((prev) => ({ ...prev, enabled }));
  };

  const handleUpdateClockIn = (patch: Partial<ShiftReminderItem>) => {
    setReminders((prev) => ({
      ...prev,
      clockIn: { ...prev.clockIn, ...patch },
    }));
  };

  const handleUpdateClockOut = (patch: Partial<ShiftReminderItem>) => {
    setReminders((prev) => ({
      ...prev,
      clockOut: { ...prev.clockOut, ...patch },
    }));
  };

  const handleUpdateShift2 = (patch: Partial<ShiftReminderItem>) => {
    setReminders((prev) => ({
      ...prev,
      shift2: prev.shift2
        ? { ...prev.shift2, ...patch }
        : {
            enabled: true,
            alertType: 'sound',
            leadMinutes: 5,
            customMessage: `¡Hola ${employee.fullName.split(' ')[0]}! Recuerda fichar tu segundo turno.`,
            ...patch,
          },
    }));
  };

  const handleTestAlert = async (
    type: 'clockIn' | 'clockOut' | 'shift2',
    config: ShiftReminderItem
  ) => {
    setActiveTest(type);
    // Request permission if not yet granted
    await requestPushNotificationPermission();

    const title =
      type === 'clockIn'
        ? '⏰ Recordatorio de Entrada'
        : type === 'clockOut'
        ? '🏁 Recordatorio de Salida'
        : '☕ Recordatorio de Segundo Turno';

    const text =
      config.customMessage ||
      (type === 'clockIn'
        ? `¡Hola ${employee.fullName.split(' ')[0]}! Recuerda registrar tu entrada.`
        : type === 'clockOut'
        ? `Jornada completada. Recuerda registrar tu salida.`
        : `Hora de comenzar el segundo turno.`);

    triggerReminderAlert(config.alertType, title, text);

    setTimeout(() => {
      setActiveTest(null);
    }, 2500);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(reminders);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const alertTypeOptions: { id: ReminderAlertType; label: string; icon: string; desc: string }[] = [
    { id: 'voice', label: 'Voz', icon: 'record_voice_over', desc: 'Habla por el altavoz en español' },
    { id: 'vibration', label: 'Vibración', icon: 'vibration', desc: 'Patrón de vibración háptico' },
    { id: 'sound', label: 'Sonido', icon: 'volume_up', desc: 'Melodía / Tono audible Web Audio' },
    { id: 'silent', label: 'Push', icon: 'chat', desc: 'Notificación visual sin sonido' },
    { id: 'off', label: 'Off', icon: 'notifications_off', desc: 'Desactivado' },
  ];

  const leadTimeOptions = [
    { value: 0, label: 'En punto (0 min)' },
    { value: 5, label: '5 min antes' },
    { value: 10, label: '10 min antes' },
    { value: 15, label: '15 min antes' },
    { value: 30, label: '30 min antes' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full p-5 sm:p-7 my-6 max-h-[92vh] overflow-y-auto animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-indigo-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
              <span className="material-symbols-outlined text-2xl">alarm_on</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">
                  Recordatorios & Alarmas de Fichaje
                </h2>
                <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                  Individual
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Ajustes para: <strong className="text-slate-800">{employee.fullName}</strong>{' '}
                <span className="text-slate-400">({employee.department} • {employee.jobTitle})</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Master Toggle */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-5 flex items-center justify-between">
          <div>
            <span className="font-black text-sm text-slate-900 block">
              Emitir Recordatorios Automáticos
            </span>
            <span className="text-xs text-slate-500">
              {reminders.enabled
                ? 'El móvil emitirá alertas a la hora programada de entrada y salida.'
                : 'Todos los avisos para este empleado están completamente silenciados.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleToggleGeneral(!reminders.enabled)}
            className={`w-13 h-7 rounded-full transition-colors relative cursor-pointer p-0.5 ${
              reminders.enabled ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                reminders.enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {reminders.enabled ? (
          <div className="space-y-5">
            {/* 1. CLOCK IN REMINDER */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 font-bold">login</span>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">Recordatorio de ENTRADA</h3>
                    <span className="text-[11px] text-slate-400">Aviso previo para iniciar jornada laboral</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateClockIn({ enabled: !reminders.clockIn.enabled })}
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      reminders.clockIn.enabled
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {reminders.clockIn.enabled ? '✓ Activo' : '✕ Inactivo'}
                  </button>
                </div>
              </div>

              {reminders.clockIn.enabled && (
                <div className="space-y-3">
                  {/* Lead time */}
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 block mb-1.5">
                      Anticipación del aviso:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {leadTimeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleUpdateClockIn({ leadMinutes: opt.value })}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                            reminders.clockIn.leadMinutes === opt.value
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alert type */}
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 block mb-1.5">
                      Tipo de alerta:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {alertTypeOptions.map((opt) => {
                        const isSelected = reminders.clockIn.alertType === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleUpdateClockIn({ alertType: opt.id })}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-600 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <span className="material-symbols-outlined text-lg">{opt.icon}</span>
                            <span className="font-extrabold text-xs">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Message */}
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                      Mensaje emitido / locución de voz:
                    </label>
                    <input
                      type="text"
                      value={reminders.clockIn.customMessage || ''}
                      onChange={(e) => handleUpdateClockIn({ customMessage: e.target.value })}
                      placeholder="Ej: ¡Hola! Recuerda registrar tu entrada en FichaPlus."
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Test Button */}
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleTestAlert('clockIn', reminders.clockIn)}
                      disabled={reminders.clockIn.alertType === 'off'}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-base">
                        {activeTest === 'clockIn' ? 'volume_up' : 'play_arrow'}
                      </span>
                      <span>
                        {activeTest === 'clockIn'
                          ? 'Probando en este móvil...'
                          : `Probar Entrada (${reminders.clockIn.alertType.toUpperCase()})`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. CLOCK OUT REMINDER */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600 font-bold">logout</span>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">Recordatorio de SALIDA</h3>
                    <span className="text-[11px] text-slate-400">Aviso al cumplir la jornada u hora fijada</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateClockOut({ enabled: !reminders.clockOut.enabled })}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    reminders.clockOut.enabled
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {reminders.clockOut.enabled ? '✓ Activo' : '✕ Inactivo'}
                </button>
              </div>

              {reminders.clockOut.enabled && (
                <div className="space-y-3">
                  {/* Lead time */}
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 block mb-1.5">
                      Momento del aviso:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { value: 0, label: 'Al terminar jornada (En punto)' },
                        { value: 5, label: '5 min antes' },
                        { value: 10, label: '10 min antes' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleUpdateClockOut({ leadMinutes: opt.value })}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                            reminders.clockOut.leadMinutes === opt.value
                              ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alert type */}
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 block mb-1.5">
                      Tipo de alerta:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {alertTypeOptions.map((opt) => {
                        const isSelected = reminders.clockOut.alertType === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleUpdateClockOut({ alertType: opt.id })}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-600 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <span className="material-symbols-outlined text-lg">{opt.icon}</span>
                            <span className="font-extrabold text-xs">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Message */}
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                      Mensaje emitido / locución de voz:
                    </label>
                    <input
                      type="text"
                      value={reminders.clockOut.customMessage || ''}
                      onChange={(e) => handleUpdateClockOut({ customMessage: e.target.value })}
                      placeholder="Ej: Jornada completada. Recuerda registrar tu salida."
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>

                  {/* Test Button */}
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleTestAlert('clockOut', reminders.clockOut)}
                      disabled={reminders.clockOut.alertType === 'off'}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-base">
                        {activeTest === 'clockOut' ? 'volume_up' : 'play_arrow'}
                      </span>
                      <span>
                        {activeTest === 'clockOut'
                          ? 'Probando en este móvil...'
                          : `Probar Salida (${reminders.clockOut.alertType.toUpperCase()})`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. SHIFT 2 / AFTERNOON REMINDER */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 font-bold">wb_twilight</span>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">Segundo Turno (Jornada Partida)</h3>
                    <span className="text-[11px] text-slate-400">Reanudación de tarde tras el almuerzo</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateShift2({ enabled: !reminders.shift2?.enabled })}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    reminders.shift2?.enabled
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {reminders.shift2?.enabled ? '✓ Activo' : '✕ Inactivo'}
                </button>
              </div>

              {reminders.shift2?.enabled && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {alertTypeOptions.map((opt) => {
                      const isSelected = reminders.shift2?.alertType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleUpdateShift2({ alertType: opt.id })}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-600 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg">{opt.icon}</span>
                          <span className="font-extrabold text-xs">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    value={reminders.shift2?.customMessage || ''}
                    onChange={(e) => handleUpdateShift2({ customMessage: e.target.value })}
                    placeholder="Ej: Es hora de iniciar tu turno de tarde."
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">notifications_off</span>
            <p className="text-xs font-bold">Recordatorios desactivados para este empleado</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Activa el interruptor superior para configurar los avisos.</p>
          </div>
        )}

        {/* GUIDES FOR IPHONE & ANDROID */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-indigo-600">smartphone</span>
              Instrucciones de Sonido y Descarga en el Teléfono
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setGuideTab(guideTab === 'iphone' ? null : 'iphone')}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                  guideTab === 'iphone'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <span>🍏 iPhone (iOS)</span>
              </button>
              <button
                type="button"
                onClick={() => setGuideTab(guideTab === 'android' ? null : 'android')}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                  guideTab === 'android'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <span>🤖 Android</span>
              </button>
            </div>
          </div>

          {guideTab === 'iphone' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-700 space-y-1.5 animate-in fade-in">
              <p className="font-bold text-slate-900 flex items-center gap-1">
                <span>🍏 Pasos obligatorios en iPhone (iOS 16.4 o superior):</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                <li>Abrir la aplicación en <strong>Safari</strong>.</li>
                <li>Pulsar el botón <strong>Compartir</strong> (icono del cuadrado con la flecha hacia arriba).</li>
                <li>Elegir <strong>"Añadir a la pantalla de inicio"</strong> y confirmar.</li>
                <li>Abrir siempre la app desde el icono de la pantalla de inicio.</li>
                <li>Pulsar en <em>"Activar Notificaciones"</em> y aceptar el diálogo de iOS.</li>
                <li>
                  <em>Importante:</em> Si el interruptor lateral del iPhone está en modo silencioso (naranja), la voz y vibración funcionarán pero el sonido se atenuará.
                </li>
              </ol>
            </div>
          )}

          {guideTab === 'android' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-700 space-y-1.5 animate-in fade-in">
              <p className="font-bold text-slate-900 flex items-center gap-1">
                <span>🤖 Pasos recomendados en Android:</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                <li>Abrir en <strong>Google Chrome</strong> o <strong>Edge</strong>.</li>
                <li>Pulsar en <strong>"Instalar FichaPlus"</strong> (o menú de 3 puntos &gt; Instalar aplicación).</li>
                <li>Al solicitar permisos de notificación, pulsar <strong>"Permitir"</strong>.</li>
                <li>
                  <em>Ahorro de batería:</em> En marcas como Xiaomi, Samsung o Huawei, ir a Ajustes &gt; Aplicaciones &gt; FichaPlus &gt; Batería y seleccionar <strong>"Sin restricciones"</strong> para garantizar avisos exactos en segundo plano.
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                Guardado correctamente
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-2.5 px-5 rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-75"
            >
              <span className="material-symbols-outlined text-base">save</span>
              <span>{isSaving ? 'Guardando...' : 'Guardar Preferencias'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
