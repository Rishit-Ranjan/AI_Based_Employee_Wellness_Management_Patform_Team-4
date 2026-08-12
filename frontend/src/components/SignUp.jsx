import React, { useState } from 'react';
import { signup as signupApi } from '../services/api';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Check, AlertCircle, HeartPulse, Sparkles, CheckCircle2 } from 'lucide-react';

export default function SignUp({ onNavigate, onSignUpSuccess  }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Password strength validation logic
  const getPasswordStrength = () => {
    if (!password) return { label: 'Empty', score: 0, color: 'bg-zinc-800' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
      case 0:
      case 1:
        return { label: 'Weak', score: 25, color: 'bg-red-500' };
      case 2:
        return { label: 'Fair', score: 50, color: 'bg-orange-500' };
      case 3:
        return { label: 'Good', score: 75, color: 'bg-yellow-500' };
      case 4:
      default:
        return { label: 'Strong', score: 100, color: 'bg-emerald-500' };
    }
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    // Validate email pattern
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!termsAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);

    try {
      await signupApi(name, email, password);

      setSuccess(true);

      setTimeout(() => {
        onSignUpSuccess();
      }, 1200);
    } catch (err) {
      console.error('Signup API error:', err);

      // Backend returns: 409 { detail: 'Account already exists' }
      const msg = err?.message || '';
      if (String(msg).toLowerCase().includes('account already exists')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(msg ? msg : 'Could not connect to the server. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div id="signup-success-view" className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-slate-800">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xl">
          <div className="mx-auto w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-600 mb-2">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Account Created!</h2>
          <p className="text-slate-500 text-sm">
            Welcome, <strong>{name}</strong>! Your employee wellness account has been successfully set up.
          </p>
          <div className="text-xs text-slate-400 py-2 font-mono">
            Redirecting you to the platform...
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="signup-container" className="min-h-screen flex bg-slate-50 text-slate-800">
      {/* Left panel: Info Panel */}
      <div id="signup-hero-panel" className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden border-r border-slate-800">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_50%_50%,#fff_0%,transparent_50%)]"></div>
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <div className="w-4 h-4 bg-slate-900 rounded-sm rotate-45"></div>
          </div>
          <span className="text-xl font-bold tracking-tighter text-white">AI-Based Employee Wellness Management Platform</span>
        </div>

        {/* Center quote */}
        <div className="my-auto relative z-10 max-w-md">
          <h1 className="font-display text-4xl font-light tracking-tight leading-tight mb-6 text-white">
            Join thousands of teams <br/><span className="italic font-serif text-slate-300">prioritizing employee</span> health.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6 font-light">
            Establishing a wellness program can reduce absenteeism by 25% and increase overall workspace productivity. Get started with custom employee health indexing today.
          </p>

          <ul className="space-y-3.5">
            {[
              'Compliant and anonymized analytics standard',
              'Integrated mental distress notification system',
              'Direct AI-assisted personalized action plans',
              'Granular real-time team feedback widgets'
            ].map((benefit, idx) => (
              <li key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                <div className="p-0.5 bg-slate-800 border border-slate-700 text-emerald-400 rounded-md">
                  <Check className="w-3.5 h-3.5" />
                </div>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-500 flex items-center justify-between relative z-10 font-mono">
          <span>© 2026 Employee Wellness Inc.</span>
          <span>Security Certified SHA-256</span>
        </div>
      </div>

      {/* Right side: Signup Form */}
      <div id="signup-form-panel" className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-xl">
          <div className="mb-6">
            <div className="lg:hidden flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
              </div>
              <span className="font-display font-bold text-slate-900 tracking-tighter">AI-Based Employee Wellness Management Platform</span>
            </div>
            <h2 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">Create your account</h2>
            <p className="text-slate-500 text-sm mt-1">Deploy wellness metrics and trackers for your team</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5 font-medium animate-shake">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="name" className="block text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password && (
                <div className="mt-2 space-y-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                    <span>Password Strength: <strong>{strength.label}</strong></span>
                    <span>{strength.score}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                    <div className={`${strength.color} h-full transition-all duration-300`} style={{ width: `${strength.score}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 text-[9px] text-slate-400 mt-1 font-mono">
                    <span className={password.length >= 8 ? 'text-emerald-600 font-semibold' : ''}>✓ Min 6 chars</span>
                    <span className={/[A-Z]/.test(password) ? 'text-emerald-600 font-semibold' : ''}>✓ 1 Uppercase</span>
                    <span className={/[0-9]/.test(password) ? 'text-emerald-600 font-semibold' : ''}>✓ 1 Number</span>
                    <span className={/[^A-Za-z0-9]/.test(password) ? 'text-emerald-600 font-semibold' : ''}>✓ 1 Special</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Match password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  required
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded bg-slate-50 border-slate-300 text-slate-900 focus:ring-0 accent-slate-950 shrink-0"
                />
                <span className="text-xs text-slate-500 font-medium leading-normal">
                  I agree to the{' '}
                  <span className="text-slate-900 font-semibold hover:underline underline-offset-2">Terms of Service</span> and{' '}
                  <span className="text-slate-900 font-semibold hover:underline underline-offset-2">Privacy Policy</span>.
                </span>
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
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Sign in link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <button
                onClick={() => onNavigate('login')}
                className="text-slate-900 font-bold hover:underline underline-offset-4 decoration-indigo-400 transition-all"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
