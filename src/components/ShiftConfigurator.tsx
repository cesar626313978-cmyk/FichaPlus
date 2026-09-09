import React, { useState, useEffect } from 'react';
import {
  ShiftDetail,
  parseShiftString,
  formatShiftString,
  calculateMinutesBetween,
  formatMinutesToHours,
  computeShiftMinutes,
  computeTotalWeeklyHours,
  configToShiftString,
  calculateWeekAorB,
  getNextSaturday,
} from '../utils/shiftUtils';
import { CompanyOperatingHours, SaturdayPlanType } from '../types';

interface ShiftConfiguratorProps {
  value: string;
  onChange: (newValue: string) => void;
  label?: string;
  badgeText?: string;
  accentColor?: 'indigo' | 'purple';
  // Saturday configuration
  worksSaturday?: boolean;
  onWorksSaturdayChange?: (works: boolean) => void;
  saturdayPlan?: SaturdayPlanType;
  onSaturdayPlanChange?: (plan: SaturdayPlanType) => void;
  saturdayShift?: string;
  onSaturdayShiftChange?: (newSatShift: string) => void;
  saturdayReferenceDate?: string;
  onSaturdayReferenceDateChange?: (newDate: string) => void;
  companyOperatingHours?: CompanyOperatingHours;
}

const CONTINUA_PRESETS = [
  { label: '08:00 - 16:00 (Mañana)', start: '08:00', end: '16:00' },
  { label: '07:00 - 15:00 (Madrugador)', start: '07:00', end: '15:00' },
  { label: '09:00 - 17:00 (Oficina)', start: '09:00', end: '17:00' },
  { label: '15:00 - 23:00 (Tarde)', start: '15:00', end: '23:00' },
  { label: '23:00 - 07:00 (Noche)', start: '23:00', end: '07:00' },
];

const PARTIDA_PRESETS = [
  { label: '09:00 - 14:00 / 16:00 - 19:00 (Estándar)', t1s: '09:00', t1e: '14:00', t2s: '16:00', t2e: '19:00' },
  { label: '10:00 - 14:00 / 17:00 - 20:30 (Comercio)', t1s: '10:00', t1e: '14:00', t2s: '17:00', t2e: '20:30' },
  { label: '08:30 - 13:30 / 15:30 - 18:30 (Oficina)', t1s: '08:30', t1e: '13:30', t2s: '15:30', t2e: '18:30' },
];

const SATURDAY_PRESETS = [
  { label: '09:00 - 14:00 (Mañana 5h)', start: '09:00', end: '14:00' },
  { label: '08:00 - 13:00 (Mañana 5h)', start: '08:00', end: '13:00' },
  { label: '10:00 - 14:00 (Mañana 4h)', start: '10:00', end: '14:00' },
  { label: '09:00 - 13:30 (Mañana 4.5h)', start: '09:00', end: '13:30' },
  { label: '10:00 - 14:00 / 17:00 - 20:30 (Comercio)', isPart: true, t1s: '10:00', t1e: '14:00', t2s: '17:00', t2e: '20:30' },
];

export const ShiftConfigurator: React.FC<ShiftConfiguratorProps> = ({
  value,
  onChange,
  label,
  badgeText,
  accentColor = 'indigo',
  worksSaturday = false,
  onWorksSaturdayChange,
  saturdayPlan,
  onSaturdayPlanChange,
  saturdayShift = 'Continua (09:00 - 14:00)',
  onSaturdayShiftChange,
  saturdayReferenceDate,
  onSaturdayReferenceDateChange,
  companyOperatingHours,
}) => {
  const [detail, setDetail] = useState<ShiftDetail>(() => parseShiftString(value));
  const [satDetail, setSatDetail] = useState<ShiftDetail>(() => parseShiftString(saturdayShift));

  // Sync internal state when external value changes
  useEffect(() => {
    setDetail(parseShiftString(value));
  }, [value]);

  useEffect(() => {
    setSatDetail(parseShiftString(saturdayShift));
  }, [saturdayShift]);

  const updateDetail = (newDetail: ShiftDetail) => {
    setDetail(newDetail);
    const formatted = formatShiftString(newDetail);
    onChange(formatted);
  };

  const updateSatDetail = (newDetail: ShiftDetail) => {
    setSatDetail(newDetail);
    const formatted = formatShiftString(newDetail);
    if (onSaturdayShiftChange) {
      onSaturdayShiftChange(formatted);
    }
  };

  const handleTypeChange = (type: 'continua' | 'partida') => {
    const updated: ShiftDetail = {
      ...detail,
      type,
    };
    updateDetail(updated);
  };

  const handleSatTypeChange = (type: 'continua' | 'partida') => {
    const updated: ShiftDetail = {
      ...satDetail,
      type,
    };
    updateSatDetail(updated);
  };

  // Saturday planning calculations
  const effectiveSatPlan: SaturdayPlanType = saturdayPlan ?? (worksSaturday ? 'TODOS' : 'NO');
  const isSatAlternating = effectiveSatPlan === 'ALTERNO_A' || effectiveSatPlan === 'ALTERNO_B';
  const worksAnySaturday = effectiveSatPlan !== 'NO';

  const handleSelectSatPlan = (newPlan: SaturdayPlanType) => {
    if (onSaturdayPlanChange) {
      onSaturdayPlanChange(newPlan);
    }
    if (onWorksSaturdayChange) {
      onWorksSaturdayChange(newPlan !== 'NO');
    }
  };

  // Computations
  const continuaMinutes = calculateMinutesBetween(detail.cStart, detail.cEnd);
  const t1Minutes = calculateMinutesBetween(detail.t1Start, detail.t1End);
  const t2Minutes = calculateMinutesBetween(detail.t2Start, detail.t2End);
  const lunchMinutes = calculateMinutesBetween(detail.t1End, detail.t2Start);
  const partidaTotalMinutes = t1Minutes + t2Minutes;
  const dailyWeekdayMins = detail.type === 'continua' ? continuaMinutes : partidaTotalMinutes;

  const satContinuaMinutes = calculateMinutesBetween(satDetail.cStart, satDetail.cEnd);
  const satPartidaMinutes =
    calculateMinutesBetween(satDetail.t1Start, satDetail.t1End) +
    calculateMinutesBetween(satDetail.t2Start, satDetail.t2End);
  const satDailyMins = satDetail.type === 'continua' ? satContinuaMinutes : satPartidaMinutes;

  const totalWeeklyHoursCalculated = computeTotalWeeklyHours(
    formatShiftString(detail),
    worksAnySaturday,
    formatShiftString(satDetail),
    false,
    undefined,
    effectiveSatPlan
  );

  const nextSat = getNextSaturday(new Date());
  const nextSatFormatted = nextSat.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const nextSatWeek = calculateWeekAorB(saturdayReferenceDate, nextSat);
  const worksNextSat =
    effectiveSatPlan === 'TODOS'
      ? true
      : effectiveSatPlan === 'ALTERNO_A'
      ? nextSatWeek === 'A'
      : effectiveSatPlan === 'ALTERNO_B'
      ? nextSatWeek === 'B'
      : false;

  const isPurple = accentColor === 'purple';
  const headerBg = isPurple ? 'bg-purple-50/60 border-purple-100' : 'bg-indigo-50/60 border-indigo-100';

  // Check if company has saturday operating hours configured
  const companySatConfig = companyOperatingHours?.saturday;
  const companySatString = companySatConfig ? configToShiftString(companySatConfig) : null;

  return (
    <div className={`p-4 sm:p-5 rounded-3xl border ${headerBg} space-y-4 transition-all shadow-2xs`}>
      {/* Label and Badge */}
      {label && (
        <div className="flex flex-wrap justify-between items-center gap-2">
          <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <span className={`material-symbols-outlined text-base ${isPurple ? 'text-purple-600' : 'text-indigo-600'}`}>
              schedule
            </span>
            <span>{label}</span>
          </label>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                detail.type === 'partida'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {badgeText || (detail.type === 'partida' ? '🌗 L-V Partida (2T)' : '☀️ L-V Continua')}
            </span>
            {effectiveSatPlan === 'NO' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Sábados Libres
              </span>
            ) : isSatAlternating ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">sync_alt</span>
                Sábado sí/no ({effectiveSatPlan === 'ALTERNO_A' ? 'Grupo A' : 'Grupo B'})
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                + Todos los Sábados
              </span>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SECCIÓN 1: DE LUNES A VIERNES (L-V)                  */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
            <span className="material-symbols-outlined text-sm text-indigo-600">calendar_view_week</span>
            <span>1. Horario de Lunes a Viernes</span>
          </span>
          <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
            5 días x {formatMinutesToHours(dailyWeekdayMins)} = {formatMinutesToHours(dailyWeekdayMins * 5)}
          </span>
        </div>

        {/* Mode Switch Buttons: Continua vs Partida */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => handleTypeChange('continua')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              detail.type === 'continua'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-base text-amber-500">wb_sunny</span>
            <span>Jornada Continua</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('partida')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              detail.type === 'partida'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-base text-indigo-600">splitscreen</span>
            <span>Jornada Partida (2 Turnos)</span>
          </button>
        </div>

        {/* CONTINUA CONFIGURATION */}
        {detail.type === 'continua' && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-emerald-600">login</span>
                  <span>Hora de Entrada</span>
                </label>
                <input
                  type="time"
                  value={detail.cStart || '08:00'}
                  onChange={(e) => updateDetail({ ...detail, cStart: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-900 text-sm focus:border-indigo-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-rose-500">logout</span>
                  <span>Hora de Salida</span>
                </label>
                <input
                  type="time"
                  value={detail.cEnd || '16:00'}
                  onChange={(e) => updateDetail({ ...detail, cEnd: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-900 text-sm focus:border-indigo-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Quick presets */}
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                Plantillas Rápidas L-V:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {CONTINUA_PRESETS.map((p) => {
                  const isActive = detail.cStart === p.start && detail.cEnd === p.end;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => updateDetail({ ...detail, cStart: p.start, cEnd: p.end })}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PARTIDA CONFIGURATION (2 TURNOS) */}
        {detail.type === 'partida' && (
          <div className="space-y-3 pt-1">
            {/* Turno 1 */}
            <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1">
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.5 rounded font-mono">T1</span>
                  <span>Turno 1 (Mañana)</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500 font-normal">
                  ({formatMinutesToHours(t1Minutes)})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Entrada T1</span>
                  <input
                    type="time"
                    value={detail.t1Start || '09:00'}
                    onChange={(e) => updateDetail({ ...detail, t1Start: e.target.value })}
                    className="w-full bg-white border-2 border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Salida T1 (Comida)</span>
                  <input
                    type="time"
                    value={detail.t1End || '14:00'}
                    onChange={(e) => updateDetail({ ...detail, t1End: e.target.value })}
                    className="w-full bg-white border-2 border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Turno 2 */}
            <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1">
                  <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.5 rounded font-mono">T2</span>
                  <span>Turno 2 (Tarde)</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500 font-normal">
                  ({formatMinutesToHours(t2Minutes)})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Entrada T2</span>
                  <input
                    type="time"
                    value={detail.t2Start || '16:00'}
                    onChange={(e) => updateDetail({ ...detail, t2Start: e.target.value })}
                    className="w-full bg-white border-2 border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Salida Final T2</span>
                  <input
                    type="time"
                    value={detail.t2End || '19:00'}
                    onChange={(e) => updateDetail({ ...detail, t2End: e.target.value })}
                    className="w-full bg-white border-2 border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Quick presets */}
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                Plantillas Rápidas L-V:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PARTIDA_PRESETS.map((p) => {
                  const isActive =
                    detail.t1Start === p.t1s &&
                    detail.t1End === p.t1e &&
                    detail.t2Start === p.t2s &&
                    detail.t2End === p.t2e;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        updateDetail({
                          ...detail,
                          t1Start: p.t1s,
                          t1End: p.t1e,
                          t2Start: p.t2s,
                          t2End: p.t2e,
                        })
                      }
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* SECCIÓN 2: HORARIO DE SÁBADOS                        */}
      {/* ---------------------------------------------------- */}
      {(onWorksSaturdayChange || onSaturdayPlanChange) && (
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
          <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-blue-600">weekend</span>
              <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                2. Planificación de Sábados
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {effectiveSatPlan === 'NO'
                ? '0 sábados al mes'
                : isSatAlternating
                ? '1 sábado sí / 1 sábado no (50%)'
                : '100% sábados'}
            </span>
          </div>

          {/* Saturday 3-Option Plan Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Opción 1: No trabaja sábados */}
            <button
              type="button"
              onClick={() => handleSelectSatPlan('NO')}
              className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                effectiveSatPlan === 'NO'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="material-symbols-outlined text-lg">
                  {effectiveSatPlan === 'NO' ? 'check_circle' : 'event_busy'}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  effectiveSatPlan === 'NO' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  L - V
                </span>
              </div>
              <div className="text-xs font-bold">Sábados Libres</div>
              <div className={`text-[10px] mt-0.5 ${effectiveSatPlan === 'NO' ? 'text-slate-300' : 'text-slate-500'}`}>
                No trabaja sábados
              </div>
            </button>

            {/* Opción 2: Sábado sí, sábado no (Alterno) */}
            <button
              type="button"
              onClick={() => handleSelectSatPlan(effectiveSatPlan === 'ALTERNO_B' ? 'ALTERNO_B' : 'ALTERNO_A')}
              className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSatAlternating
                  ? 'bg-purple-700 text-white border-purple-700 shadow-xs ring-2 ring-purple-300/40'
                  : 'bg-purple-50/50 text-purple-900 border-purple-200 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="material-symbols-outlined text-lg">
                  {isSatAlternating ? 'check_circle' : 'sync_alt'}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isSatAlternating ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                }`}>
                  1 Sí / 1 No
                </span>
              </div>
              <div className="text-xs font-bold">Sábados Alternos</div>
              <div className={`text-[10px] mt-0.5 ${isSatAlternating ? 'text-purple-200' : 'text-purple-600'}`}>
                Un sábado sí y otro no
              </div>
            </button>

            {/* Opción 3: Todos los sábados */}
            <button
              type="button"
              onClick={() => handleSelectSatPlan('TODOS')}
              className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                effectiveSatPlan === 'TODOS'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-blue-50/50 text-blue-900 border-blue-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="material-symbols-outlined text-lg">
                  {effectiveSatPlan === 'TODOS' ? 'check_circle' : 'event_available'}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  effectiveSatPlan === 'TODOS' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                }`}>
                  Todos
                </span>
              </div>
              <div className="text-xs font-bold">Todos los Sábados</div>
              <div className={`text-[10px] mt-0.5 ${effectiveSatPlan === 'TODOS' ? 'text-blue-200' : 'text-blue-600'}`}>
                Fijo cada semana
              </div>
            </button>
          </div>

          {/* Subpanel cuando se eligen Sábados Alternos (1 Sí / 1 No) */}
          {isSatAlternating && (
            <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3 sm:p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-purple-950 font-bold text-xs">
                  <span className="material-symbols-outlined text-sm text-purple-700">group_work</span>
                  <span>Grupo de Alternancia (Turnos de Sábado):</span>
                </div>
                <div className="text-[11px] text-purple-700 font-medium">
                  Coordina quién libra cada fin de semana
                </div>
              </div>

              {/* Botones Selector de Grupo A vs Grupo B */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectSatPlan('ALTERNO_A')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    effectiveSatPlan === 'ALTERNO_A'
                      ? 'bg-white text-purple-950 border-purple-500 shadow-xs font-bold ring-1 ring-purple-400'
                      : 'bg-white/50 text-slate-600 border-purple-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">Grupo A</span>
                    {effectiveSatPlan === 'ALTERNO_A' && (
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">
                        Activo
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Sábados de Semana A
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectSatPlan('ALTERNO_B')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    effectiveSatPlan === 'ALTERNO_B'
                      ? 'bg-white text-purple-950 border-purple-500 shadow-xs font-bold ring-1 ring-purple-400'
                      : 'bg-white/50 text-slate-600 border-purple-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">Grupo B</span>
                    {effectiveSatPlan === 'ALTERNO_B' && (
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">
                        Activo
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Sábados de Semana B
                  </div>
                </button>
              </div>

              {/* Live Upcoming Saturday Status Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-purple-100 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <span className="material-symbols-outlined text-sm text-purple-600">event</span>
                  <span>
                    Próximo sábado (<b>{nextSatFormatted}</b>):
                  </span>
                </div>
                <div>
                  {worksNextSat ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      Le toca trabajar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      Descanso (le toca el siguiente)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Configuración de horario cuando trabaja sábados (Todos o Alternos) */}
          {worksAnySaturday ? (
            <div className="space-y-3 pt-1">
              {/* Option to load company saturday hours */}
              {companySatConfig?.enabled && companySatString && (
                <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-blue-950 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-blue-600">storefront</span>
                    <span>Horario Sábado Empresa: <b className="font-semibold">{companySatString}</b></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSaturdayShiftChange) {
                        onSaturdayShiftChange(companySatString);
                      }
                      setSatDetail(parseShiftString(companySatString));
                    }}
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs cursor-pointer"
                  >
                    Usar horario empresa
                  </button>
                </div>
              )}

              {/* Saturday Mode Switch */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleSatTypeChange('continua')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    satDetail.type === 'continua'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm text-amber-500">wb_sunny</span>
                  <span>Sábado Continuo</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSatTypeChange('partida')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    satDetail.type === 'partida'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm text-indigo-600">splitscreen</span>
                  <span>Sábado Partida (2T)</span>
                </button>
              </div>

              {/* Saturday Continua */}
              {satDetail.type === 'continua' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Entrada Sábado
                    </label>
                    <input
                      type="time"
                      value={satDetail.cStart || '09:00'}
                      onChange={(e) => updateSatDetail({ ...satDetail, cStart: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2 font-mono font-bold text-slate-900 text-sm focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Salida Sábado
                    </label>
                    <input
                      type="time"
                      value={satDetail.cEnd || '14:00'}
                      onChange={(e) => updateSatDetail({ ...satDetail, cEnd: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2 font-mono font-bold text-slate-900 text-sm focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Saturday Partida */}
              {satDetail.type === 'partida' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Entrada T1 Sábado</span>
                      <input
                        type="time"
                        value={satDetail.t1Start || '10:00'}
                        onChange={(e) => updateSatDetail({ ...satDetail, t1Start: e.target.value })}
                        className="w-full bg-white border-2 border-slate-200 rounded-lg p-1.5 font-mono font-bold text-slate-900 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Salida T1 Sábado</span>
                      <input
                        type="time"
                        value={satDetail.t1End || '14:00'}
                        onChange={(e) => updateSatDetail({ ...satDetail, t1End: e.target.value })}
                        className="w-full bg-white border-2 border-slate-200 rounded-lg p-1.5 font-mono font-bold text-slate-900 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Entrada T2 Sábado</span>
                      <input
                        type="time"
                        value={satDetail.t2Start || '17:00'}
                        onChange={(e) => updateSatDetail({ ...satDetail, t2Start: e.target.value })}
                        className="w-full bg-white border-2 border-slate-200 rounded-lg p-1.5 font-mono font-bold text-slate-900 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Salida T2 Sábado</span>
                      <input
                        type="time"
                        value={satDetail.t2End || '20:30'}
                        onChange={(e) => updateSatDetail({ ...satDetail, t2End: e.target.value })}
                        className="w-full bg-white border-2 border-slate-200 rounded-lg p-1.5 font-mono font-bold text-slate-900 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Saturday Quick Presets */}
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Plantillas Rápidas Sábado:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SATURDAY_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        if (p.isPart) {
                          updateSatDetail({
                            ...satDetail,
                            type: 'partida',
                            t1Start: p.t1s || '10:00',
                            t1End: p.t1e || '14:00',
                            t2Start: p.t2s || '17:00',
                            t2End: p.t2e || '20:30',
                          });
                        } else {
                          updateSatDetail({
                            ...satDetail,
                            type: 'continua',
                            cStart: p.start || '09:00',
                            cEnd: p.end || '14:00',
                          });
                        }
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-blue-900 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100 flex flex-wrap items-center justify-between gap-1">
                <span>Horas de cada Sábado laborable:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{formatMinutesToHours(satDailyMins)}</span>
                  {isSatAlternating && (
                    <span className="text-[11px] font-medium text-purple-700 bg-purple-100 px-2 py-0.2 rounded-md">
                      Promedio semanal: {formatMinutesToHours(Math.round(satDailyMins / 2))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-slate-400">event_busy</span>
              <span>El empleado no presta servicios los sábados (jornada exclusiva de lunes a viernes).</span>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* RESUMEN SEMANAL COMPUTADO EN TIEMPO REAL             */}
      {/* ---------------------------------------------------- */}
      <div className="bg-indigo-950 text-white rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
            Cómputo Total Semanal
          </span>
          <div className="text-xs text-indigo-100 flex flex-wrap items-center gap-2 mt-0.5">
            <span>5d L-V ({formatMinutesToHours(dailyWeekdayMins * 5)})</span>
            {effectiveSatPlan === 'TODOS' && (
              <>
                <span>+</span>
                <span>Sáb ({formatMinutesToHours(satDailyMins)})</span>
              </>
            )}
            {isSatAlternating && (
              <>
                <span>+</span>
                <span className="text-purple-300 font-medium">
                  Sáb alterno ({formatMinutesToHours(satDailyMins)} cada 2 semanas = +{formatMinutesToHours(Math.round(satDailyMins / 2))} media)
                </span>
              </>
            )}
            {effectiveSatPlan === 'NO' && (
              <span className="text-indigo-300 font-medium">• Sábados libres</span>
            )}
          </div>
          {isSatAlternating && (
            <div className="text-[11px] text-indigo-300/80 mt-1">
              Semana con sábado: {formatMinutesToHours(dailyWeekdayMins * 5 + satDailyMins)} • Semana sin sábado: {formatMinutesToHours(dailyWeekdayMins * 5)}
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-1 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/15">
          <span className="text-xl font-black text-white font-mono">{totalWeeklyHoursCalculated}</span>
          <span className="text-xs font-semibold text-indigo-200">
            {isSatAlternating ? 'h/sem (media)' : 'horas/semana'}
          </span>
        </div>
      </div>
    </div>
  );
};
