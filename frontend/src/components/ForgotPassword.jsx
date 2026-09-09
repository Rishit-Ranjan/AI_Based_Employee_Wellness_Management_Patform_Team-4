import React, { useState, useRef, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, KeyRound, ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert, Send } from 'lucide-react';
import { forgotPassword, resetPassword } from '../services/api';

export default function ForgotPassword({ onNavigate  }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // References for OTP fields
  const otpRefs = useRef([]);

  // Password strength validation logic
  const getPasswordStrength = () => {
    if (!newPassword) return { label: 'Empty', score: 0, color: 'bg-zinc-800' };
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

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

// If redirected with a token link, use token reset mode (query param: ?token=...&email=...)
  const initFromQuery = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('token') || params.get('resetToken') || '';
      const e = params.get('email') || '';
      if (t) setResetToken(t);
      if (e) setEmail(e);
      if (t) {
        setStep(3);
      }
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    initFromQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Step 1: Request recovery code / reset link
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      // method=otp so backend generates 6-digit OTP
      const res = await forgotPassword(email, 'otp');


      // Prototype: backend returns debugOtp since no email sender is wired.
      // We store it so the user can proceed to enter recovery code/new password.
      if (res?.debugOtp) {
        setResetToken('');
        setRecoveryOtp('');
        setOtpCode(res.debugOtp.split(''));
      }

      setStep(2);

      if (!res?.debugOtp) {
        // If email sending existed, the user would click the link and come back with ?token=...
        setError('Reset link generated. Check your email.');
      }
    } catch (err) {
      setError(err?.message || 'Could not send reset link.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index, value) => {
    if (isNaN(Number(value))) return; // only numbers
    const newOtp = [...otpCode];
    newOtp[index] = value.substring(value.length - 1); // keep last char
    setOtpCode(newOtp);
    setError('');

    // Focus next input if value entered
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const newOtp = [...otpCode];
      newOtp[index - 1] = '';
      setOtpCode(newOtp);
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle Step 2: Validate OTP (server-side)
const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const codeString = otpCode.join('');
    if (codeString.length < 6) {
      setError('Please enter the complete 6-digit recovery code.');
      return;
    }

    setResetToken('');
    setRecoveryOtp(codeString);
    setStep(3);
  };

  // Handle Step 3: Password Update
const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email,
        newPassword,
      };

      // Use token if available, otherwise OTP
      if (resetToken) {
        payload.resetToken = resetToken;
        payload.otp = '';
      } else {
        const otpToUse = recoveryOtp || otpCode.join('');
        payload.otp = otpToUse;
        payload.resetToken = '';
      }

      const res = await resetPassword(payload);

      if (res?.detail) {
        setSuccess(true);
        setTimeout(() => {
          onNavigate('login');
        }, 1500);
      }
    } catch (err) {
      setError(err?.message || 'Could not update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div id="reset-success-view" className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-slate-800">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xl">
          <div className="mx-auto w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-600 mb-2">
            <CheckCircle2 className="w-10 h-10 animate-pulse" />
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Password Reset Complete</h2>
          <p className="text-slate-500 text-sm">
            Your credentials have been successfully updated. You can now use your new password to sign in.
          </p>
          <div className="text-xs text-(--color-text-muted) dark:text-(--color-text-muted-dark) font-mono">
            Redirecting to the login portal...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="forgot-password-container" className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-slate-800">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 relative overflow-hidden shadow-xl">

        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

        {/* Navigation back */}
        <button
          onClick={() => {
            if (step === 1) onNavigate('login');
            if (step === 2) setStep(1);
            if (step === 3) setStep(2);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          {step === 1 ? 'Back to Login' : 'Back to previous step'}
        </button>

        {/* Dynamic header title based on current recovery step */}
        <div className="mb-6">
          <div className="w-11 h-11 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 mb-4">
            <KeyRound className="w-5 h-5" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">
            {step === 1 && 'Recover Password'}
            {step === 2 && 'Enter Recovery Code'}
            {step === 3 && 'Choose New Password'}
          </h2>
          <p className="text-slate-500 text-sm mt-1.5 font-light">
            {step === 1 && 'Confirm your registered workspace email to recover account credentials.'}
            {step === 2 && `We've sent a 6-digit validation OTP to ${email}`}
            {step === 3 && 'Establish a high-strength password for safety.'}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5 font-medium animate-shake">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="recovery-email" className="block text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-(--color-text-muted)">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="recovery-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-all transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/35 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Send Recovery Code
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Enter OTP Code */}
        {step === 2 && (
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div className="flex justify-between gap-2.5">
              {otpCode.map((digit, idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength={1}
                  required
                  ref={(el) => { otpRefs.current[idx] = el; }}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-12 h-12 text-center text-lg font-bold bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-900 rounded-lg shadow-sm outline-none transition-all"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-all transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/35 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Verify Recovery Code
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 3: Choose New Password */}
        {step === 3 && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-(--color-text-muted)">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-(--color-text-muted) hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength widget */}
              {newPassword && (
                <div className="mt-2 space-y-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                    <span>Password Strength: <strong>{strength.label}</strong></span>
                    <span>{strength.score}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                    <div className={`${strength.color} h-full transition-all duration-300`} style={{ width: `${strength.score}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="new-password-confirm" className="block text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-(--color-text-muted)">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="new-password-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-(--color-text-muted) hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-all transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/35 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Update Credentials
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
