import React, { useState, useEffect } from 'react';
import { WorkdayPlanType, PauseReasonType } from '../types';

export type ClockActionType =
  | 'start_shift_1'
  | 'start_shift_2'
  | 'start_single'
  | 'pause'
  | 'resume'
  | 'stop_shift_1'
  | 'stop_shift_2'
  | 'stop_single';

interface Props {
  isOpen: boolean;
  action: ClockActionType | null;
  workdayPlan: WorkdayPlanType;
  workType: 'presencial' | 'teletrabajo' | 'cliente';
  locationSummary?: string;
  gpsAccuracy?: number;
  onClose: () => void;
  onConfirm: (payload?: { pauseReason?: string; pauseNotes?: string }) => void;
}

const PAUSE_REASONS: { id: PauseReasonType; label: string; icon: string; desc: string }[] = [
  { id: 'cafe', label: 'Café / Desayuno', icon: 'coffee', desc: 'Descanso breve o pausa para el café' },
  { id: 'almuerzo', label: 'Almuerzo / Tentempié', icon: 'restaurant', desc: 'Pausa rápida para comer algo' },
  { id: 'medico', label: 'Visita Médica / Salud', icon: 'medical_services', desc: 'Cita médica o indisposición' },
  { id: 'gestion', label: 'Gestión / Desplazamiento', icon: 'commute', desc: 'Trámite oficial o visita de trabajo' },
  { id: 'personal', label: 'Asunto Personal', icon: 'person', desc: 'Llamada urgente o asunto propio' },
  { id: 'otro', label: 'Otro Motivo', icon: 'more_horiz', desc: 'Salida justificada' },
];

export const ClockActionConfirmModal: React.FC<Props> = ({
  isOpen,
  action,
  workdayPlan,
  workType,
  locationSummary,
  gpsAccuracy,
  onClose,
  onConfirm,
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [selectedReason, setSelectedReason] = useState<PauseReasonType>('cafe');
  const [customNote, setCustomNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(
        now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen || !action) return null;

  // Derive configuration based on action
  let title = '';
  let subtitle = '';
  let iconName = '';
  let badgeColor = '';
  let confirmBtnText = '';
  let confirmBtnClass = '';

  switch (action) {
    case 'start_shift_1':
    case 'start_shift_2':
    case 'start_single':
      title = '¿Registrar Entrada?';
      subtitle = 'Se registrará el inicio de tu jornada laboral con sello temporal oficial y ubicación GPS (Art. 34.9 ET).';
      iconName = 'login';
      badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      confirmBtnText = 'Confirmar Entrada';
      confirmBtnClass = 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200';
      break;

    case 'pause':
      title = '¿Registrar Pausa / Descanso?';
      subtitle = 'El contador de horas se detendrá temporalmente hasta que pulses "Reanudar". Selecciona el motivo:';
      iconName = 'pause_circle';
      badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
      confirmBtnText = 'Confirmar Pausa';
      confirmBtnClass = 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200';
      break;

    case 'resume':
      title = '¿Reanudar Jornada?';
      subtitle = 'Se reactivará el cómputo de horas de tu jornada de trabajo.';
      iconName = 'play_circle';
      badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      confirmBtnText = 'Confirmar y Reanudar';
      confirmBtnClass = 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200';
      break;

    case 'stop_shift_1':
    case 'stop_shift_2':
    case 'stop_single':
      title = '¿Registrar Salida?';
      subtitle = 'Se registrará tu hora de salida oficial y se computará el total de horas trabajadas en el día.';
      iconName = 'logout';
      badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
      confirmBtnText = 'Confirmar Salida';
      confirmBtnClass = 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200';
      break;
  }

  const handleConfirm = () => {
    if (action === 'pause') {
      const reasonObj = PAUSE_REASONS.find((r) => r.id === selectedReason);
      onConfirm({
        pauseReason: reasonObj?.label || 'Pausa',
        pauseNotes: customNote.trim(),
      });
    } else {
      onConfirm();
    }
  };

  const modalityLabel =
    workType === 'presencial' ? '🏢 Oficina Central' : workType === 'teletrabajo' ? '🏠 Teletrabajo' : '🚗 Cliente / En ruta';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 sm:p-7 relative overflow-hidden flex flex-col gap-5 my-auto">
        {/* Top Warning Ribbon against accidental touch */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Confirmación Antierror de Fichaje
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Cancelar / Cerrar"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-col items-center text-center">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 border shadow-inner ${badgeColor}`}
          >
            <span className="material-symbols-outlined text-3xl font-black">{iconName}</span>
          </div>

          <h3 className="font-black text-xl sm:text-2xl text-slate-900 tracking-tight mb-1.5">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed mb-4">
            {subtitle}
          </p>

          {/* Time & GPS Verification Card */}
          <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-2.5 text-left">
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
              <span className="text-[11px] font-bold uppercase text-slate-400">Hora Oficial del Fichaje</span>
              <span className="font-mono text-base sm:text-lg font-black text-indigo-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                {currentTime}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Fecha:</span>
              <span className="font-semibold text-slate-800 capitalize">{currentDate}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Modalidad de Trabajo:</span>
              <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {modalityLabel}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Ubicación GPS:</span>
              <span className="font-mono text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-emerald-600">verified</span>
                {locationSummary || 'GPS Satelital Activo'} {gpsAccuracy ? `(±${gpsAccuracy}m)` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* If Action is PAUSE: Show Quick Reason Selector */}
        {action === 'pause' && (
          <div className="flex flex-col gap-2.5 text-left">
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
              Motivo de la Pausa / Salida:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PAUSE_REASONS.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setSelectedReason(r.id)}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    selectedReason === r.id
                      ? 'bg-amber-50/90 border-amber-400 text-amber-950 font-bold shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-amber-600">{r.icon}</span>
                    <span className="text-xs font-bold truncate">{r.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight truncate">{r.desc}</span>
                </button>
              ))}
            </div>

            {selectedReason === 'otro' && (
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Especificar motivo breve (opcional)..."
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer text-center"
          >
            Cancelar / No Fichar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`flex-1 py-3 px-5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${confirmBtnClass}`}
          >
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{confirmBtnText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
