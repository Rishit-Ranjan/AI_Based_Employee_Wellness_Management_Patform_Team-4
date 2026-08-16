import React, { useState, useRef } from 'react';
import { X, User, Save, KeyRound, Check, AlertCircle, UploadCloud, Trash2 } from 'lucide-react';
import { updateProfile, changePassword } from '../services/api';

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Product', 'Operations', 'IT', 'Customer Support', 'HR', 'Finance', 'Support'];

export default function ProfileEditModal({ user, isAdmin = false, onClose, onUpdated, onUpdateAvatar }) {
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || ''); // Re-add phone state
  const [department, setDepartment] = useState(user.department || 'Engineering');
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
      const profileData = { name, department, phone }; // Re-add phone to payload

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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><User className="w-5 h-5 text-slate-400" /> Edit Profile</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSaveProfile} className="p-5 space-y-3.5">
          <div className="flex flex-col items-center gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-16 h-16 cursor-pointer group shrink-0"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-white dark:border-slate-700 object-cover shadow-md" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">{name.substring(0, 2).toUpperCase()}</div>
              )}
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <UploadCloud className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-md text-[10px] font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
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
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
          </div>

          {/* Re-add phone number input field */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Phone Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your contact number" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
          </div>
          
          {!isAdmin && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Department</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200">
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

        <div className="border-t border-slate-100 dark:border-slate-700 p-5 space-y-3.5">
          <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2"><KeyRound className="w-4 h-4 text-slate-400" /> Change Password</h4>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
            {pwError && <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-[11px] text-red-700 dark:text-red-300">{pwError}</div>}
            {pwSuccess && <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-300">{pwSuccess}</div>}
            <button type="submit" disabled={pwSaving} className="w-full py-2.5 bg-slate-800 dark:bg-slate-600 hover:bg-slate-900 dark:hover:bg-slate-500 text-white rounded-lg text-xs font-bold disabled:bg-slate-500">
              {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
