import React, { useState, useEffect, useRef } from 'react';
import { login as loginApi } from '../services/api';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, Activity, BrainCircuit, Shield, UserCheck, UserCog, Hash, HeartPulse, UsersRound, IdCard, LockKeyhole, LayoutDashboard } from 'lucide-react';
import FloatingSupportButton from './FloatingSupportButton';
import CustomerSupportModal from './CustomerSupportModal'; // This will now import the new styled component

export default function Login({ onNavigate, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Initialize the selected role from the last role used (persisted on login),
  // so logging out from the Admin dashboard shows Admin selected on the login screen.
  const [role, setRole] = useState(() => {
    try {
      return localStorage.getItem('wellness_last_role') === 'Admin' ? 'Admin' : 'Employee';
    } catch (e) {
      return 'Employee';
    }
  });
  const [entityId, setEntityId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '', entityId: '' });
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const entityRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const emailEditedRef = useRef(false); // true once the user types in the email field
  const EMP_EMAIL_KEY = 'wellness_remember_email_employee';
  const ADMIN_EMAIL_KEY = 'wellness_remember_email_admin';
  const EMP_ENTITY_KEY = 'wellness_remember_entity_employee';
  const ADMIN_ENTITY_KEY = 'wellness_remember_entity_admin';

  // Load saved emails (per-role) if remember me was checked previously.
  // Prefer the saved email for the role the user last logged in as (Admin vs
  // Employee), so logging out of the Admin dashboard restores the Admin role
  // together with the admin email instead of reverting to Employee.
  useEffect(() => {
    try {
      const lastRole = localStorage.getItem('wellness_last_role');
      const savedEmp = localStorage.getItem(EMP_EMAIL_KEY);
      const savedAdmin = localStorage.getItem(ADMIN_EMAIL_KEY);
      const savedEmpEntity = localStorage.getItem(EMP_ENTITY_KEY);
      const savedAdminEntity = localStorage.getItem(ADMIN_ENTITY_KEY);

      // Load the remembered email for the role you last logged in as.
      const savedEmail = lastRole === 'Admin' ? savedAdmin : savedEmp;
      const savedEntity = lastRole === 'Admin' ? savedAdminEntity : savedEmpEntity;

      if (savedEmail) {
        setEmail(savedEmail);
        if (savedEntity) setEntityId(savedEntity);
        setRememberMe(true);
      }
      // Programmatically restored value is not a real keystroke, so it must not
      // trigger the auto role-switch on the email effect below.
      emailEditedRef.current = false;
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  // Automatically switch role for the default admin email.
  // Only reacts when the user actually types in the email field, so a restored
  // (programmatically pre-filled) email cannot override the persisted role
  // right after logout.
  useEffect(() => {
    if (!emailEditedRef.current) return;
    if (email.toLowerCase() === 'admin@platform.com') {
      setRole('Admin');
    } else if (role === 'Admin' && email) {
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

      // New logic to handle specific backend error messages
      if (serverBody.field) {
        if (serverBody.field === 'email') {
          nextFieldErrors.email = serverBody.detail;
        } else if (serverBody.field === 'entityId') {
          nextFieldErrors.entityId = serverBody.detail;
        } else if (serverBody.field === 'password') {
          nextFieldErrors.password = serverBody.detail;
        } else {
          setError(serverBody.detail);
        }
      } else if (serverBody.detail) {
        setError(serverBody.detail);
      }

      // If we computed any field-level errors, set them and focus the first one
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
    setIsSupportOpen(true);
  };

  return (
    <div id="login-container" className="min-h-screen lg:h-screen lg:overflow-hidden flex bg-slate-50 text-slate-800">
      {/* Left side panel: Decorative/Info panel */}
      <div
        id="login-hero-panel"
        className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-r border-slate-800"
      >
        {/* Abstract background graphics */}
        <div className="absolute inset-0 opacity-9 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_50%_50%,#fff_0%,transparent_45%)]"></div>
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
        </div>
        <div className="absolute top-1/4 right-10 w-96 h-96 bg-slate-800/40 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <div className="w-4 h-4 bg-slate-900 rounded-sm rotate-45"></div>
          </div>
          <span className="text-2xl font-extrabold tracking-tighter text-white">AI-Based Employee Wellness Management Platform</span>
        </div>

        {/* Sign-in guidance */}
        <div className="my-auto relative z-10 mt-8">
          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-850 border border-slate-800 rounded-full text-xxs text-slate-300 mb-6 font-medium">
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
              Secure access to your wellness workspace
            </div>
            <h1 className="font-display text-5xl xl:text-6xl font-normal leading-[1.1] tracking-tight text-white mb-6">
              Welcome <br />
              <span className="italic font-serif text-slate-300">back to</span> your team.
            </h1>
            <p className="text-(--color-text-muted) text-base lg:text-lg leading-relaxed mb-8 font-normal">
              Sign in with your registered details to continue to your wellness workspace. Choose your role and enter your account credentials to get started.
            </p>
          </div>

          {/* Responsive sign-in steps: 1 col mobile, 2 cols tablet, 4 cols desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-850 border border-slate-800 rounded-xl">
              <UsersRound className="w-5 h-5 text-indigo-400 mb-2" />
              <div className="text-sm font-semibold text-white">Choose Your Role</div>
              <p className="text-xs text-(--color-text-muted) mt-2">Select employee or administrator access.</p>
            </div>
            <div className="p-4 bg-slate-850 border border-slate-800 rounded-xl">
              <IdCard className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="text-sm font-semibold text-white">Identify Your Account</div>
              <p className="text-xs text-(--color-text-muted) mt-2">Use your registered email and employee ID when required.</p>
            </div>
            <div className="p-4 bg-slate-850 border border-slate-800 rounded-xl">
              <LockKeyhole className="w-5 h-5 text-purple-400 mb-2" />
              <div className="text-sm font-semibold text-white">Enter Your Password</div>
              <p className="text-xs text-(--color-text-muted) mt-2">Sign in with the password linked to your account.</p>
            </div>
            <div className="p-4 bg-slate-850 border border-slate-800 rounded-xl">
              <LayoutDashboard className="w-5 h-5 text-rose-400 mb-2" />
              <div className="text-sm font-semibold text-white">Continue to Your Dashboard</div>
              <p className="text-xs text-(--color-text-muted) mt-2">Pick up where you left off in your wellness workspace.</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-sm text-slate-500 flex items-center justify-between relative z-10 font-mono mt-8">
          <span>© 2026 Employee Wellness Inc.</span>
          <span className="flex items-center gap-1.5 text-(--color-text-muted)">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            All modules operational
          </span>
        </div>
      </div>

      {/* Right side: Interactive Login form */}
      <div id="login-form-panel" className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative overflow-hidden lg:overflow-y-auto bg-(--color-bg)">
        {/* Soft light wellness backdrop — subtle, non-obstructive */}
        <img src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1600&q=60" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-800" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/25 to-white/60" />
        <button
          type="button"
          onClick={() => onNavigate('welcome')}
          className="group absolute left-6 top-6 z-20 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-white hover:text-indigo-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          aria-label="Back to welcome page"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>Back</span>
        </button>
        <div className="relative w-full max-w-md rounded-2xl border border-white/80 bg-white/65 p-8 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200/90 hover:shadow-slate-900/20">
          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
              </div>
              <span className="font-display font-semibold text-lg text-slate-900 tracking-tighter">AI-Based Employee Wellness Management Platform</span>
            </div>
            <h2 className="font-display text-4xl font-semibold text-slate-900 mb-2 tracking-tight">
              {role === 'Admin' ? 'Admin Sign In' : 'Employee Sign In'}
            </h2>
            <p className="text-slate-500 text-base">
              {role === 'Admin' ? 'Restricted access for authorized administrators only.' : 'Use your registered employee credentials to login.'}
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
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-(--color-text-muted)">
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
                    className="w-full pl-10 pr-4 py-3 bg-white/55 border border-slate-300/80 rounded-lg text-sm text-slate-900 placeholder-slate-500 outline-none backdrop-blur-sm hover:border-slate-400 hover:bg-white/75 focus:border-indigo-500 focus:bg-white/90 transition-all"
                  />
                </div>
                {fieldErrors.entityId && (
                  <div className="text-[12px] text-rose-600 mt-2 font-medium">{fieldErrors.entityId}</div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">
                Email Address
              </label>
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-(--color-text-muted)">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    ref={emailRef}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      emailEditedRef.current = true;
                      setEmail(e.target.value);
                    }}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-3 bg-white/55 border border-slate-300/80 rounded-lg text-sm text-slate-900 placeholder-slate-500 outline-none backdrop-blur-sm hover:border-slate-400 hover:bg-white/75 focus:border-indigo-500 focus:bg-white/90 transition-all"
                  />
                </div>
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
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-(--color-text-muted)">
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
                    className="w-full pl-10 pr-10 py-3 bg-white/55 border border-slate-300/80 rounded-lg text-sm text-slate-900 placeholder-slate-500 outline-none backdrop-blur-sm hover:border-slate-400 hover:bg-white/75 focus:border-indigo-500 focus:bg-white/90 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-(--color-text-muted) hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
              className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer mt-2 flex items-center justify-center gap-2 shadow-sm"
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
        {isSupportOpen && <CustomerSupportModal onClose={() => setIsSupportOpen(false)} />}
      </div>
    </div>
  );
}
