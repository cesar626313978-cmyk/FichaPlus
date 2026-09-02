import React, { useState } from 'react';
import { useAuth, AuthResult } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export const LoginView: React.FC = () => {
  const { signInFast, signInWithGoogle, createCompanyWorkspace } = useAuth();
  const { companySettings } = useApp();

  // Mode: 'login' (employee/admin entry) or 'new_company' (admin onboarding for any organization)
  const [mode, setMode] = useState<'login' | 'new_company'>('login');

  // Login form state
  const [identifier, setIdentifier] = useState('cesar626313978@gmail.com');

  // New company onboarding state
  const [companyName, setCompanyName] = useState('');
  const [fiscalId, setFiscalId] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  // Status & Feedback
  const [errorResult, setErrorResult] = useState<AuthResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorResult(null);
    setLoading(true);

    const result = await signInFast(identifier);
    setLoading(false);

    if (!result.success) {
      setErrorResult(result);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorResult(null);

    const result = await signInWithGoogle(identifier.trim());
    setLoading(false);

    if (!result.success && result.reason !== 'POPUP_CANCELLED') {
      setErrorResult(result);
    }
  };

  const handleNewCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !adminEmail.trim() || !adminName.trim()) return;

    setLoading(true);
    setErrorResult(null);

    const result = await createCompanyWorkspace({
      companyName,
      fiscalId,
      adminName,
      adminEmail,
      adminPhone,
    });

    setLoading(false);

    if (!result.success) {
      setErrorResult(result);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Container */}
      <div className="max-w-md w-full bg-white text-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 relative overflow-hidden">
        {/* Top Decorative accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500" />

        {/* Logo and Brand */}
        <div className="text-center mb-6 pt-2">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-200 mb-3">
            <span className="material-symbols-outlined text-3xl font-black">schedule</span>
          </div>
          <h1 className="font-black text-2xl tracking-tight text-slate-900">
            Ficha<span className="text-indigo-600">Plus</span>
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            {mode === 'new_company' ? 'Crear Espacio de Empresa' : companySettings.companyName || 'Control Horario Legal'}
          </p>

          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-indigo-600">verified_user</span>
              Multi-Empresa • Acceso con 1 Clic
            </span>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorResult(null);
            }}
            className={`py-2 px-3 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-sm">login</span>
            <span>Acceder a Mi Jornada</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('new_company');
              setErrorResult(null);
            }}
            className={`py-2 px-3 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'new_company'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-sm">domain_add</span>
            <span>Dar de Alta Empresa</span>
          </button>
        </div>

        {/* Error notification */}
        {errorResult && (
          <div className="mb-5 bg-rose-50 border-2 border-rose-200 text-rose-800 p-4 rounded-2xl text-xs space-y-2">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-xl text-rose-600 shrink-0 mt-0.5">
                error
              </span>
              <div>
                <h4 className="font-black text-rose-900 uppercase tracking-wider text-[11px]">
                  Usuario No Encontrado
                </h4>
                <p className="mt-1 text-rose-700 font-semibold leading-relaxed">
                  {errorResult.message ||
                    'Este usuario o correo no figura en la lista de empleados invitados de la empresa.'}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-rose-200/80 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (identifier.includes('@')) setAdminEmail(identifier);
                  setMode('new_company');
                  setErrorResult(null);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] py-2 px-3 rounded-xl transition-colors text-center cursor-pointer"
              >
                ¿Eres Administrador? Crear cuenta de nueva empresa →
              </button>
            </div>
          </div>
        )}

        {/* Mode 1: Fast Login Form (Employees & Existing Admins) */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                Tu Correo Electrónico o Teléfono
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                  alternate_email
                </span>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ej: nombre@empresa.com o 600123456"
                  className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-3.5 rounded-2xl font-medium text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-xs"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Introduce el correo o teléfono donde recibiste la invitación de tu empresa.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-wider py-4 px-6 rounded-2xl shadow-lg shadow-indigo-100 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
              <span>{loading ? 'Verificando...' : 'Acceder a Mi Fichaje'}</span>
            </button>

            {/* Direct Google Button */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Acceder con Cuenta de Google</span>
              </button>
            </div>
          </form>
        )}

        {/* Mode 2: Create New Company Workspace (For any business / administrator) */}
        {mode === 'new_company' && (
          <form onSubmit={handleNewCompanySubmit} className="space-y-3.5">
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 text-xs text-indigo-950">
              <div className="flex items-center gap-1.5 font-black text-indigo-900 mb-1">
                <span className="material-symbols-outlined text-base text-indigo-600">store</span>
                <span>Configuración de Nueva Empresa</span>
              </div>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                Crea el espacio exclusivo para tu empresa. Como Administrador tendrás control total para invitar empleados por WhatsApp o Email.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">
                Nombre Comercial de la Empresa *
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ej: Acme Logistics S.L., Restaurante El Sol, etc."
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-semibold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">
                  CIF / NIF
                </label>
                <input
                  type="text"
                  value={fiscalId}
                  onChange={(e) => setFiscalId(e.target.value.toUpperCase())}
                  placeholder="B-12345678"
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-semibold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">
                Nombre y Apellidos del Administrador *
              </label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Ej: María García"
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-semibold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">
                Correo Electrónico del Administrador *
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@tuempresa.com"
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-semibold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider py-4 px-6 rounded-2xl shadow-lg shadow-indigo-100 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span className="material-symbols-outlined text-base">domain_verification</span>
              <span>{loading ? 'Creando Empresa...' : 'Crear Empresa y Empezar a Invitar'}</span>
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center space-y-1">
          <p className="text-[11px] text-slate-500 font-semibold">
            Control Horario Legal Obligatorio • Art. 34.9 ET & RGPD
          </p>
          <p className="text-[10px] text-slate-400">
            Cifrado de extremo a extremo y registros inmutables SHA-256
          </p>
        </div>
      </div>
    </div>
  );
};
