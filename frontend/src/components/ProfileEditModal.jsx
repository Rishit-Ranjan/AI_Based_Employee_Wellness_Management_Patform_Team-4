import React, { useState, useRef } from 'react';
import { X, User, Save, KeyRound, Check, AlertCircle, UploadCloud, Trash2, Settings, ShieldAlert } from 'lucide-react';
import { updateProfile, changePassword } from '../services/api';

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Product', 'Operations', 'IT', 'Customer Support', 'HR', 'Finance'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function ProfileEditModal({ user, isAdmin = false, onClose, onUpdated, onUpdateAvatar, onDeleteAccount }) {
  const [activeSection, setActiveSection] = useState('profile'); // 'profile' | 'account'
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [department, setDepartment] = useState(user.department || 'Engineering');
  const [designation, setDesignation] = useState(user.designation || '');
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth || '');
  const [bloodGroup, setBloodGroup] = useState(user.bloodGroup || '');
  const [emergencyContactName, setEmergencyContactName] = useState(user.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(user.emergencyContactPhone || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarUrl('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const profileData = { name, department, phone, designation, dateOfBirth, bloodGroup, emergencyContactName, emergencyContactPhone }; // Re-add phone to payload

      // First, handle avatar changes before updating other profile info
      if (avatarFile) {
        await onUpdateAvatar(avatarFile);
      } else if (avatarUrl === '') {
        // If avatarUrl is cleared, include this in the update payload
        profileData.avatarUrl = null;
      }

      const res = await updateProfile(profileData); // Update other fields
      setSuccess('Profile updated.');
      onUpdated?.(res.user);
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err?.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwSaving(true);
    setPwError('');
    try {
      await changePassword(currentPassword, newPassword);
      setPwSuccess('Password changed.');
      setCurrentPassword(''); setNewPassword('');
      setTimeout(() => setPwSuccess(''), 2500);
    } catch (err) {
      setPwError(err?.message || 'Could not change password.');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-(--color-border) dark:border-(--color-border-dark) flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-(--color-border) dark:border-(--color-border-dark) flex items-center justify-between bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark)">
          <h3 className="font-display font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) flex items-center gap-2">
            {activeSection === 'profile' ? <User className="w-5 h-5 text-(--color-text-muted)" /> : <Settings className="w-5 h-5 text-(--color-text-muted)" />}
            {activeSection === 'profile' ? 'Edit Profile' : 'My Account'}
          </h3>
          <button onClick={onClose} className="text-(--color-text-muted) hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          {/* Left Sidebar */}
          <div className="md:w-48 shrink-0 border-b md:border-b-0 md:border-r border-(--color-border) dark:border-(--color-border-dark) bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) p-3 flex md:flex-col gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('profile')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSection === 'profile'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                  : 'text-(--color-text-secondary) dark:text-(--color-text-secondary-dark) hover:bg-(--color-bg-card) dark:hover:bg-(--color-bg-card-dark) border border-transparent'
              }`}
            >
              <User className="w-4 h-4 shrink-0" /> Edit Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('account')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSection === 'account'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                  : 'text-(--color-text-secondary) dark:text-(--color-text-secondary-dark) hover:bg-(--color-bg-card) dark:hover:bg-(--color-bg-card-dark) border border-transparent'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" /> My Account
            </button>
          </div>

          {/* Main Window */}
          <div className="flex-1 min-w-0 overflow-y-auto max-h-[70vh]">
          {activeSection === 'profile' ? (
            <>

        <form onSubmit={handleSaveProfile} className="p-5 space-y-3.5">
          <div className="flex flex-col items-center gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-16 h-16 cursor-pointer group shrink-0"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-white dark:border-(--color-border-dark) object-cover shadow-md" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) flex items-center justify-center font-bold text-(--color-text-secondary) dark:text-(--color-text-secondary-dark)">{name.substring(0, 2).toUpperCase()}</div>
              )}
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <UploadCloud className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) hover:bg-(--color-bg-subtle) dark:hover:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-md text-[10px] font-semibold text-(--color-text-secondary) dark:text-(--color-text-secondary-dark) flex items-center justify-center gap-1.5 transition-colors"
              >
                <UploadCloud className="w-3 h-3" /> Change
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 border border-rose-200 dark:border-rose-800 rounded-md text-[10px] font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              className="hidden"
              accept="image/png, image/jpeg, image/gif"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-(--color-text-muted) dark:text-(--color-text-muted-dark) uppercase mb-1">Name <span className="text-red-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your full name" className="w-full px-3 py-2 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark)" />
          </div>

          {/* Re-add phone number input field */}
          <div>
            <label className="block text-[10px] font-bold text-(--color-text-muted) dark:text-(--color-text-muted-dark) uppercase mb-1">Phone Number <span className="text-red-500">*</span></label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required type="tel" placeholder="Your contact number" className="w-full px-3 py-2 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark)" />
          </div>

          {/* Designation & Date of Birth */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-(--color-text-muted) dark:text-(--color-text-muted-dark) uppercase mb-1">Designation <span className="text-red-500">*</span></label>
              <input value={designation} onChange={(e) => setDesignation(e.target.value)} required placeholder="e.g. Software Engineer" className="w-full px-3 py-2 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark)" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-(--color-text-muted) dark:text-(--color-text-muted-dark) uppercase mb-1">Date of Birth <span className="text-red-500">*</span></label>
              <input value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required type="date" max={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark)" />
            </div>
          </div>

          {/* Blood Group (employees only) & Emergency Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!isAdmin && (
              <div>
                <label className="block text-[10px] font-bold text-(--color-text-muted) dark:text-(--color-text-muted-dark) uppercase mb-1">Blood Group <span className="text-red-500">*</span></label>
                <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} required className="w-full px-3 py-2 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark)">
                  <option value="" disabled>Select blood group</option>
                  {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-(--color-text-muted) dark:text-(--color-text-muted-dark) uppercase mb-1">Emergency Contact Phone <span className="text-red-500">*</span></label>
              <input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} required type="tel" placeholder="Emergency contact number" className="w-full px-3 py-2 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark)" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-(--color-text-muted) dark:text-(--color-text-muted-dark) uppercase mb-1">Emergency Contact Name <span className="text-red-500">*</span></label>
            <input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} required placeholder="e.g. Parent / Spouse / Sibling" className="w-full px-3 py-2 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark)" />
          </div>

          {!isAdmin && (
            <div>
              <label className="block text-[10px] font-bold text-(--color-text-muted) dark:text-(--color-text-muted-dark) uppercase mb-1">Department</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-3 py-2 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark)">
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          {error && <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-[11px] text-red-700 dark:text-red-300 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</div>}
          {success && <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" />{success}</div>}

          <button type="submit" disabled={saving} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:bg-indigo-400">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>

        <div className="border-t border-(--color-border) dark:border-(--color-border-dark) p-5 space-y-3.5">
          <h4 className="text-xs font-bold text-(--color-text-secondary) dark:text-(--color-text-secondary-dark) flex items-center gap-2"><KeyRound className="w-4 h-4 text-(--color-text-muted)" /> Change Password</h4>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" className="w-full px-3 py-2 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark)" />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" className="w-full px-3 py-2 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark)" />
            {pwError && <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-[11px] text-red-700 dark:text-red-300">{pwError}</div>}
            {pwSuccess && <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-300">{pwSuccess}</div>}
            <button type="submit" disabled={pwSaving} className="w-full py-2.5 bg-slate-800 dark:bg-slate-600 hover:bg-slate-900 dark:hover:bg-slate-500 text-white rounded-lg text-xs font-bold disabled:bg-slate-500">
              {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
            </>
          ) : (
            /* My Account Section */
            <div className="p-5 space-y-5">
              {/* Account Details */}
              <div>
                <h4 className="text-xs font-bold text-(--color-text-secondary) dark:text-(--color-text-secondary-dark) uppercase tracking-wide mb-3">Account Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg">
                    <p className="text-[10px] font-bold text-(--color-text-muted) dark:text-(--color-text-muted-dark) uppercase mb-0.5">Name</p>
                    <p className="text-xs font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) truncate">{user.name || '—'}</p>
                  </div>
                  <div className="p-3 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg">
                    <p className="text-[10px] font-bold text-(--color-text-muted) dark:text-(--color-text-muted-dark) uppercase mb-0.5">{isAdmin ? 'Admin ID' : 'Employee ID'}</p>
                    <p className="text-xs font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) font-mono truncate">{isAdmin ? (user.adminId || '—') : (user.employeeId || '—')}</p>
                  </div>
                  <div className="p-3 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg">
                    <p className="text-[10px] font-bold text-(--color-text-muted) dark:text-(--color-text-muted-dark) uppercase mb-0.5">Email</p>
                    <p className="text-xs font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) truncate">{user.email || '—'}</p>
                  </div>
                  <div className="p-3 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg">
                    <p className="text-[10px] font-bold text-(--color-text-muted) dark:text-(--color-text-muted-dark) uppercase mb-0.5">Role</p>
                    <p className="text-xs font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) capitalize truncate">{user.role || 'user'}</p>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Danger Zone
                </h4>
                <p className="text-[11px] text-(--color-text-secondary) dark:text-(--color-text-secondary-dark) leading-relaxed">
                  Permanently delete your account and all your associated data — health records, goals,
                  check-ups, SOS alerts, expenses and more. This action cannot be undone.
                </p>
                <button
                  type="button"
                  onClick={() => onDeleteAccount?.()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm shadow-red-600/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Account
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
