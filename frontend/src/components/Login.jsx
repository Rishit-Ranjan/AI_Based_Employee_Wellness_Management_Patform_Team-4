import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Activity, Sparkles, Shield, UserCheck, UserCog, Hash } from 'lucide-react';
import { login as loginApi } from '../services/api';
import FloatingSupportButton from './FloatingSupportButton';

export default function Login({ onNavigate, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Employee');
  const [entityId, setEntityId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '', entityId: '' });
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const entityRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const EMP_EMAIL_KEY = 'wellness_remember_email_employee';
  const ADMIN_EMAIL_KEY = 'wellness_remember_email_admin';
  const EMP_ENTITY_KEY = 'wellness_remember_entity_employee';
  const ADMIN_ENTITY_KEY = 'wellness_remember_entity_admin';

  // Load saved emails (per-role) if remember me was checked previously
  useEffect(() => {
    try {
      const savedEmp = localStorage.getItem(EMP_EMAIL_KEY);
      const savedAdmin = localStorage.getItem(ADMIN_EMAIL_KEY);
      const savedEmpEntity = localStorage.getItem(EMP_ENTITY_KEY);
      const savedAdminEntity = localStorage.getItem(ADMIN_ENTITY_KEY);
      // Prefer employee saved email/entity for initial load if present, otherwise admin
      if (savedEmp) {
        setEmail(savedEmp);
        if (savedEmpEntity) setEntityId(savedEmpEntity);
        setRememberMe(true);
      } else if (savedAdmin) {
        setEmail(savedAdmin);
        if (savedAdminEntity) setEntityId(savedAdminEntity);
        setRememberMe(true);
        // don't auto-switch role here; user may choose Admin explicitly
      }
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  // Automatically switch role for default admin email
  useEffect(() => {
    if (email.toLowerCase() === 'admin@platform.com') {
      setRole('Admin');
    } else if (role === 'Admin' && email.toLowerCase() !== 'admin@platform.com') {
      setRole('Employee');
    }
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({ email: '', password: '', entityId: '' });

    // Client-side per-field validation
    const newFieldErrors = { email: '', password: '', entityId: '' };
    if (!entityId) newFieldErrors.entityId = role === 'Admin' ? 'Please enter your Admin ID.' : 'Please enter your Employee ID.';
    if (!email) newFieldErrors.email = 'Please enter your email address.';
    else if (!/\S+@\S+\.\S+/.test(email)) newFieldErrors.email = 'Please enter a valid email address.';
    if (!password) newFieldErrors.password = 'Please enter your password.';

    if (newFieldErrors.email || newFieldErrors.password || newFieldErrors.entityId) {
      setFieldErrors(newFieldErrors);
      // focus first invalid field
      if (newFieldErrors.entityId && entityRef.current) entityRef.current.focus();
      else if (newFieldErrors.email && emailRef.current) emailRef.current.focus();
      else if (newFieldErrors.password && passwordRef.current) passwordRef.current.focus();
      return;
    }

    setLoading(true);

    try {
      const res = await loginApi(email, password, role, entityId);

      try {
        if (rememberMe) {
          const emailKey = role === 'Admin' ? ADMIN_EMAIL_KEY : EMP_EMAIL_KEY;
          const entityKey = role === 'Admin' ? ADMIN_ENTITY_KEY : EMP_ENTITY_KEY;
          localStorage.setItem(emailKey, email);
          // Save entityId per-role as well (Admin ID / Employee ID). DO NOT store passwords.
          if (entityId) localStorage.setItem(entityKey, entityId);
        } else {
          localStorage.removeItem(EMP_EMAIL_KEY);
          localStorage.removeItem(ADMIN_EMAIL_KEY);
          localStorage.removeItem(EMP_ENTITY_KEY);
          localStorage.removeItem(ADMIN_ENTITY_KEY);
        }
      } catch (e) {
        // ignore storage errors
      }

      // Backend returns: { user: userInfo }
      onLoginSuccess(res?.user || res?.user_info || res);
    } catch (err) {
      console.error('Login API error:', err);
      // Attempt to map server error to specific field errors when possible
      const serverBody = err?.body || {};
      const message = String(err?.message || '').toLowerCase();

      const nextFieldErrors = { email: '', password: '', entityId: '' };

      // If backend returns structured field info
      if (serverBody?.field && serverBody?.message) {
        const f = serverBody.field;
        if (f === 'email' || f === 'user' || f === 'entityId') nextFieldErrors.email = serverBody.message;
        if (f === 'password') nextFieldErrors.password = serverBody.message;
      }

      // If backend returns per-field errors object
      if (serverBody?.errors && typeof serverBody.errors === 'object') {
        Object.keys(serverBody.errors).forEach((k) => {
          if (k.toLowerCase().includes('email') || k.toLowerCase().includes('user')) nextFieldErrors.email = serverBody.errors[k];
          if (k.toLowerCase().includes('password')) nextFieldErrors.password = serverBody.errors[k];
          if (k.toLowerCase().includes('entity') || k.toLowerCase().includes('id')) nextFieldErrors.entityId = serverBody.errors[k];
        });
      }

      // Common HTTP status heuristics
      if (!nextFieldErrors.email && !nextFieldErrors.password && !nextFieldErrors.entityId) {
        if (err?.status === 404) {
          nextFieldErrors.email = 'No account found with this email.';
        } else if (err?.status === 401) {
          // If message mentions password, point to password; if mentions email/user point to email;
          // otherwise treat as a generic credential failure and show a top-level error banner.
          if (message.includes('password')) nextFieldErrors.password = 'Incorrect password.';
          else if (message.includes('email') || message.includes('user') || message.includes('account')) nextFieldErrors.email = 'No account found with this email.';
          else setError(serverBody?.message || 'Incorrect password or email. Please verify your credentials.');
        } else if (message.includes('password')) {
          nextFieldErrors.password = serverBody?.message || 'Incorrect password.';
        } else if (message.includes('email') || message.includes('user') || message.includes('account')) {
          nextFieldErrors.email = serverBody?.message || 'No account found with this email.';
        }
      }

      // If we computed any field-level errors, set them and focus the first one.
      if (nextFieldErrors.email || nextFieldErrors.password || nextFieldErrors.entityId) {
        setFieldErrors(nextFieldErrors);
        if (nextFieldErrors.entityId && entityRef.current) entityRef.current.focus();
        else if (nextFieldErrors.email && emailRef.current) emailRef.current.focus();
        else if (nextFieldErrors.password && passwordRef.current) passwordRef.current.focus();
      } else if (!error) {
        // No field-level info; ensure a useful top-level error is shown
        setError(serverBody?.message || 'Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSupportClick = () => {
    // Implement your desired action here, e.g., open a modal, navigate to a support page
    alert('Customer Support button clicked!');
  };

  return (
    <div id="login-container" className="min-h-screen flex bg-slate-50 text-slate-800">
      {/* Left side panel: Decorative/Info panel */}
      <div
        id="login-hero-panel"
        className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden border-r border-slate-800"
      >
        {/* Abstract background graphics */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_50%_50%,#fff_0%,transparent_50%)]"></div>
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
        </div>
        <div className="absolute top-1/4 right-10 w-96 h-96 bg-slate-800/40 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <div className="w-4 h-4 bg-slate-900 rounded-sm rotate-45"></div>
          </div>
          <span className="text-xl font-bold tracking-tighter text-white">Employee Wellness Management Analytics</span>
        </div>

        {/* Dynamic Centerpiece Quote / Info */}
        <div className="my-auto relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-850 border border-slate-800 rounded-full text-xs text-slate-300 mb-6 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Empowering Healthy & Engaged Workforces
          </div>
          <h1 className="font-display text-5xl font-light leading-[1.1] tracking-tight text-white mb-6">
            Transform your workplace <br />
            <span className="italic font-serif text-slate-300">with health</span> intelligence.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-8 font-light">
            Manage employee health records, monitor burnout risks, analyze organization sentiment, and provide personalized mental and physical
            wellness recommendations in real-time.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-850 border border-slate-800 rounded-xl">
              <Activity className="w-5 h-5 text-indigo-400 mb-2" />
              <div className="text-xs font-semibold text-white">Predictive Analytics</div>
              <p className="text-[10px] text-slate-400 mt-1">Machine learning assessments for health and burnout risks.</p>
            </div>
            <div className="p-4 bg-slate-850 border border-slate-800 rounded-xl">
              <Shield className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="text-xs font-semibold text-white">Sentiment Tracker</div>
              <p className="text-[10px] text-slate-400 mt-1">Anonymized surveys tracking organizational mental wellbeing.</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-500 flex items-center justify-between relative z-10 font-mono">
          <span>© 2026 Employee Wellness Inc.</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            All modules operational
          </span>
        </div>
      </div>

      {/* Right side: Interactive Login form */}
      <div id="login-form-panel" className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-xl">
          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
              </div>
              <span className="font-display font-bold text-slate-900 tracking-tighter">Employee Wellness Management Analytics</span>
            </div>
            <h2 className="font-display text-3xl font-semibold text-slate-900 mb-2 tracking-tight">
              {role === 'Admin' ? 'Admin Sign In' : 'Employee Sign In'}
            </h2>
            <p className="text-slate-500 text-sm">
              {role === 'Admin' ? 'Restricted access for authorized administrators only.' : 'Use your registered employee credentials.'}
            </p>
          </div>

          {/* Role Selector */}
          <div className="mb-4">
            <label className="block text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRole('Employee');
                  setEntityId('');
                  setPassword('');
                  setFieldErrors({ email: '', password: '', entityId: '' });
                  setError('');
                  // If remember me is enabled and an employee email is saved, restore it; otherwise clear
                  if (rememberMe) {
                    const saved = localStorage.getItem(EMP_EMAIL_KEY);
                      setEmail(saved || '');
                      const savedEntity = localStorage.getItem(EMP_ENTITY_KEY);
                      setEntityId(savedEntity || '');
                  } else {
                    setEmail('');
                  }
                  if (entityRef.current) entityRef.current.focus();
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all text-xs font-semibold ${
                  role === 'Employee'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4" /> Employee
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('Admin');
                  setEntityId('');
                  setPassword('');
                  setFieldErrors({ email: '', password: '', entityId: '' });
                  setError('');
                  if (rememberMe) {
                    const saved = localStorage.getItem(ADMIN_EMAIL_KEY);
                    setEmail(saved || '');
                    const savedEntity = localStorage.getItem(ADMIN_ENTITY_KEY);
                    setEntityId(savedEntity || '');
                  } else {
                    setEmail('');
                  }
                  if (entityRef.current) entityRef.current.focus();
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all text-xs font-semibold ${
                  role === 'Admin' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <UserCog className="w-4 h-4" /> Admin
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5 font-medium animate-shake">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="entityId" className="block text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">
                {role === 'Admin' ? 'Admin ID' : 'Employee ID'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  id="entityId"
                  ref={entityRef}
                  type="text"
                  required
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  placeholder={role === 'Admin' ? 'e.g. ADM001' : 'e.g. EMP101'}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
                {fieldErrors.entityId && (
                  <div className="text-[12px] text-rose-600 mt-2 font-medium">{fieldErrors.entityId}</div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  ref={emailRef}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
                {fieldErrors.email && (
                  <div className="text-[12px] text-rose-600 mt-2 font-medium">{fieldErrors.email}</div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => onNavigate('forgot_password')}
                  className="text-[11px] text-slate-500 hover:text-slate-900 transition-colors font-semibold"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {fieldErrors.password && (
                  <div className="text-[12px] text-rose-600 mt-2 font-medium">{fieldErrors.password}</div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-50 border-slate-300 text-slate-900 focus:ring-0 accent-slate-950"
                />
                <span className="text-xs text-slate-500 font-medium">Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-all transform active:scale-[0.98] cursor-pointer mt-2 flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/35 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Sign up link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <button
                onClick={() => onNavigate('signup')}
                className="text-slate-900 font-bold hover:underline underline-offset-4 decoration-indigo-400 transition-all"
              >
                Create account
              </button>
            </p>
          </div>
        </div>

        {/* Floating Customer Support Button */}
        <FloatingSupportButton onClick={handleSupportClick} />
      </div>
    </div>
  );
}
