import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Trash2, Edit, MoreHorizontal, Activity, TrendingUp, Lightbulb, Smile, BarChart3, LogOut,
  Search, Plus, X, ShieldAlert, AlertCircle, Check, Sparkles, Dumbbell, Apple, Brain, Clock, ChevronLeft, ChevronRight,
  ShieldCheck, Bell, Receipt, Siren, Zap, Target, Users, LineChart
} from 'lucide-react';
import AdminInsuranceModule from './AdminInsuranceModule';
import AdminNotificationCenter from './AdminNotificationCenter';
import { AdminCheckupsModule, AdminSosMonitor, AdminExpensesModule } from './AdminExtraModules';
import NotificationBell from './NotificationBell';
import ProfileEditModal from './ProfileEditModal';
import { fetchBurnoutTrend } from '../services/api';
import ThemeToggle from './wellness/ThemeToggle';

// ==========================================
// MODULE 1: EMPLOYEE HEALTH DATA MANAGEMENT
// ==========================================
export function HealthDataModule({ records, allUsers, onAddRecord, onUpdateRecord, onDeleteRecord }) {
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null); // Track which record is being edited
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [openActionMenu, setOpenActionMenu] = useState(null); // Track which action menu is open
  
  // Form states (using selectedEmployee to hold "employeeId|employeeName")
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [dept, setDept] = useState('Engineering');
  const [bmi, setBmi] = useState('');
  const [bp, setBp] = useState('');
  const [exerciseDaysPerWeek, setExerciseDaysPerWeek] = useState('');
  const [exercise, setExercise] = useState('');
  const [sleep, setSleep] = useState('');
  const [stress, setStress] = useState('');
  const [stressScore, setStressScore] = useState('');
  const [attendanceRate, setAttendanceRate] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [medicalCondition, setMedicalCondition] = useState('No major condition');
  const [smoker, setSmoker] = useState(false);
  const [alcoholUse, setAlcoholUse] = useState(false);
  const [glucoseLevel, setGlucoseLevel] = useState('');

  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState(''); // State for form errors
  const actionMenuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close menu if clicked outside of it and not on the toggle button itself
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target) &&
          !event.target.closest(`[data-menu-button-for="${openActionMenu}"]`)) {
        setOpenActionMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


    const openEditModal = (record) => {
    setEditingRecord(record);
    setSelectedEmployee(`${record.employeeId}|${record.employeeName}`); // Store combined ID and Name for pre-filling dropdown
    setDept(record.department);
    setAge(String(record.age));
    setGender(record.gender);
    setHeightCm(String(record.heightCm));
    setWeightKg(String(record.weightKg));
    setBmi(String(record.bmi));
    setBp(record.bloodPressure);
    setExerciseDaysPerWeek(String(record.exerciseDaysPerWeek));
    setExercise(String(record.exerciseHoursPerWeek));
    setSleep(String(record.sleepHoursPerNight));
    setStress(record.stressLevel);
    setStressScore(String(record.stressScore));
    setAttendanceRate(String(record.attendanceRate));
    setMedicalNotes(record.medicalNotes);
    setMedicalCondition(record.medicalCondition);
    setSmoker(record.smoker);
    setAlcoholUse(record.alcoholUse);
    setGlucoseLevel(String(record.glucoseLevel));
    setIsAddOpen(true);
    setError(''); // Clear any previous errors when opening modal
  };

  const handleMenuToggle = (e, recordId) => {
    // Toggle the menu for the clicked record. If it's already open, close it.
    setOpenActionMenu(openActionMenu === recordId ? null : recordId);
    // No need to calculate position anymore as it will be relative to the button's parent
  };
  const openAddModal = () => {
    setEditingRecord(null); // Ensure we're in add mode
    setSelectedEmployee(''); // Clear selected employee
    // Reset other form fields to default/empty
    setAge('');
    setGender('Male');
    setHeightCm('');
    setWeightKg('');
    setDept('Engineering');
    setBmi(''); setBp('');
    setExerciseDaysPerWeek('');
    setExercise(''); setSleep('');
    setStress('Medium');
    setStressScore('');
    setAttendanceRate('');
    setMedicalNotes(''); setMedicalCondition('No major condition'); setSmoker(false); setAlcoholUse(false); setGlucoseLevel('');
    setIsAddOpen(true);
    setError(''); // Clear any previous errors when opening modal
  };
  const filtered = records.filter(r => {
    const matchSearch = r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
                        r.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept ? r.department === filterDept : true;
    return matchSearch && matchDept;
  });

  
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee || !age || !gender || !heightCm || !weightKg || !dept || !bmi || !bp || !exerciseDaysPerWeek || !exercise || !sleep || !stress || !stressScore || !attendanceRate || !medicalCondition || !glucoseLevel) {
      setError('Please fill in all required fields.');
      return;
    }
    // Derive simple assessments based on inputs
    const calculatedBmi = Number(bmi); 

    // Determine health assessment based on BMI, BP, sleep, and stress
    let assessment = 'Good';
    const [sys, dia] = bp.split('/').map(Number);

    if (stress === 'High' || Number(stressScore) >= 7 || sys >= 140 || calculatedBmi >= 30) {
      assessment = 'Needs Attention';
    } else if (stress === 'Low' && Number(stressScore) <= 3 && calculatedBmi < 25 && calculatedBmi >= 18.5 && Number(sleep) >= 7 && Number(exerciseDaysPerWeek) >= 3) {
      assessment = 'Excellent';
    } else if (Number(attendanceRate) < 85) {
      assessment = 'Fair';
    } else if (medicalCondition !== 'No major condition') {
      assessment = 'Fair';
    } else if (smoker || alcoholUse) {
      assessment = 'Fair';
    } else if (Number(glucoseLevel) > 100) {
      assessment = 'Fair';
    } else if (Number(exerciseDaysPerWeek) < 2) {
      assessment = 'Fair';
    } else if (Number(sleep) < 6) {
      assessment = 'Fair';
    }

    if (editingRecord) {
      // Update existing record
      setError(''); // Clear error on successful update attempt
      const [empId, empName] = selectedEmployee.split('|');
      const updatedRec = {
        ...editingRecord,
        // Ensure employeeId and employeeName are from the selected employee,
        // or keep original if not changed (though dropdown forces selection)
        employeeId: empId,
        employeeName: empName,
        age: Number(age),
        gender: gender,
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        department: dept,
        bmi: calculatedBmi,
        bloodPressure: bp,
        exerciseDaysPerWeek: Number(exerciseDaysPerWeek),
        exerciseHoursPerWeek: Number(exercise) || 0,
        sleep_hours: Number(sleep) || 0,
        sleepHoursPerNight: Number(sleep),
        stressLevel: stress,
        stressScore: Number(stressScore),
        attendanceRate: Number(attendanceRate),
        medicalNotes: medicalNotes,
        medicalCondition: medicalCondition,
        smoker: smoker,
        alcoholUse: alcoholUse,
        glucoseLevel: Number(glucoseLevel),
        healthAssessment: assessment,
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      await onUpdateRecord(updatedRec);
      setSuccessMessage('Health record updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      // Add new record
      const [empId, empName] = selectedEmployee.split('|');
      const newRec = {
        employeeId: empId,
        employeeName: empName,
        age: Number(age),
        gender: gender,
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        department: dept,
        bmi: calculatedBmi,
        bloodPressure: bp,
        exerciseHoursPerWeek: Number(exercise),
        exerciseDaysPerWeek: Number(exerciseDaysPerWeek),
        sleep_hours: Number(sleep) || 0,
        sleepHoursPerNight: Number(sleep) || 0,
        stressLevel: stress,
        stressScore: Number(stressScore),
        attendanceRate: Number(attendanceRate),
        medicalNotes: medicalNotes,
        medicalCondition: medicalCondition,
        smoker: smoker,
        alcoholUse: alcoholUse,
        glucoseLevel: Number(glucoseLevel),
        healthAssessment: assessment,
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      await onAddRecord(newRec);
      setSuccessMessage('Health record added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }

    setIsAddOpen(false);
    // Reset Form
    setSelectedEmployee('');
    setAge(''); setGender('Male'); setHeightCm(''); setWeightKg('');
    setBmi(''); setBp(''); setExerciseDaysPerWeek(''); setExercise(''); setSleep('');
    setStress('Medium'); setStressScore(''); setAttendanceRate('');
    setMedicalNotes(''); setMedicalCondition('No major condition'); setSmoker(false); setAlcoholUse(false); setGlucoseLevel('');
    setEditingRecord(null);
    setError(''); // Clear error after successful submission
  };
  // Find users who do not have a health record yet for the dropdown
  const usersWithoutRecords = useMemo(() => {
    return allUsers.filter(
      user => !records.some(record => record.employeeId === user.employeeId)
    );
  }, [allUsers, records]);

  return (
    <div className="space-y-6">
      {/* Search & Action bar */}
      <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
            />
          </div>

          {/* Department Filter */}
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="w-full sm:w-44 px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 outline-none transition-all cursor-pointer"
          >
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Sales">Sales</option>
            <option value="Marketing">Marketing</option>
            <option value="Product">Product</option>
            <option value="Operations">Operations</option>
          </select>
        </div>

        <button
          onClick={() => { openAddModal(); setOpenActionMenu(null); }} // Close any open action menu
          className="w-full md:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4 text-white" />
          Add Employee's Health Profile
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5 font-medium animate-shake">
          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-start gap-2.5 font-medium animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Add Record Modal Popup */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-slate-800" />
                <h3 className="font-display font-semibold text-sm text-slate-800">
                  {editingRecord ? 'Update Employee Health Record' : 'Add New Employee Health Record'}
                </h3>
              </div>
              <button
                onClick={() => { setIsAddOpen(false); setEditingRecord(null); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {editingRecord ? (
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Employee</label>
                    <p className="w-full px-3.5 py-2.5 bg-slate-200 border border-slate-300 rounded-lg text-xs text-slate-600">
                      {selectedEmployee.split('|')[1]} ({selectedEmployee.split('|')[0]})
                    </p>
                  </div>
                ) : (
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select Employee</label>
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none"
                    >
                      <option value="" disabled>-- Select an employee --</option>
                      {usersWithoutRecords.map(user => (
                        <option key={user.id} value={`${user.employeeId}|${user.name}`}>
                          {user.name} ({user.employeeId})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* New fields */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Age</label>
                  <input type="number" required value={age} onChange={(e) => setAge(e.target.value)} placeholder="30" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Height (cm)</label>
                  <input type="number" step="0.1" required value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="170.5" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Weight (kg)</label>
                  <input type="number" step="0.1" required value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="70.2" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 outline-none" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                  <select
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Product">Product</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">BMI Value</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={bmi}
                    onChange={(e) => setBmi(e.target.value)}
                    placeholder="23.5"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Blood Pressure</label>
                  <input
                    type="text"
                    required
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    placeholder="120/80"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Exercise (Days/wk)</label>
                  <input type="number" required value={exerciseDaysPerWeek} onChange={(e) => setExerciseDaysPerWeek(e.target.value)} placeholder="3" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 outline-none" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Exercise (Hours/wk)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={exercise}
                    onChange={(e) => setExercise(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sleep (Hours/night)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={sleep}
                    onChange={(e) => setSleep(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Self-Reported Stress</label>
                  <select
                    value={stress}
                    onChange={(e) => setStress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Stress Score (1-10)</label>
                  <input type="number" min="1" max="10" step="0.1" required value={stressScore} onChange={(e) => setStressScore(e.target.value)} placeholder="5.5" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Attendance Rate (%)</label>
                  <input type="number" min="0" max="100" step="0.1" required value={attendanceRate} onChange={(e) => setAttendanceRate(e.target.value)} placeholder="95" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Medical Condition</label>
                  <select value={medicalCondition} onChange={(e) => setMedicalCondition(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none">
                    <option value="No major condition">No major condition</option>
                    <option value="Stress-related fatigue">Stress-related fatigue</option>
                    <option value="Mild fatigue">Mild fatigue</option>
                    <option value="Chronic pain">Chronic pain</option>
                    <option value="Allergies">Allergies</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Medical Notes</label>
                  <textarea value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)} placeholder="Any relevant medical notes..." rows="2" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 outline-none"></textarea>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Glucose Level</label>
                  <input type="number" step="0.1" required value={glucoseLevel} onChange={(e) => setGlucoseLevel(e.target.value)} placeholder="90" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 outline-none" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-800">
                    <input type="checkbox" checked={smoker} onChange={(e) => setSmoker(e.target.checked)} className="form-checkbox h-3.5 w-3.5 text-indigo-600 rounded border-slate-300" />
                    Smoker
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-800">
                    <input type="checkbox" checked={alcoholUse} onChange={(e) => setAlcoholUse(e.target.checked)} className="form-checkbox h-3.5 w-3.5 text-indigo-600 rounded border-slate-300" />
                    Alcohol User
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-5 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setEditingRecord(null); }}
                  className="px-4.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
                >
                  {editingRecord ? 'Update Profile' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Health records Card View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-10 text-center font-mono text-xs text-slate-400 shadow-sm">
            No records found matching filters.
          </div>
        ) : (
          <>
            {filtered.map((record) => (
              <div key={record.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm relative">
                <div className="absolute top-3 right-3">
                  <button
                    onClick={(e) => handleMenuToggle(e, record.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors z-10"
                    data-menu-button-for={record.id}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {openActionMenu === record.id && (
                    <div ref={actionMenuRef} className="absolute top-full right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-slate-200 z-20">
                      <button
                        onClick={() => { openEditModal(record); setOpenActionMenu(null); }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => { if (window.confirm(`Are you sure?`)) { onDeleteRecord(record.employeeId); } setOpenActionMenu(null); }}
                        className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700">
                    {record.employeeName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{record.employeeName}</h4>
                    <div className="text-[10px] text-slate-400 font-mono">{record.employeeId}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-500">Dept:</span>
                    <span className="font-semibold">{record.department}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-500">Age:</span>
                    <span className="font-semibold">{record.age}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-500">BMI:</span>
                    <span className="font-semibold font-mono">{record.bmi}</span>
                    <span className="text-[9px] text-slate-400 ml-0.5">
                      {record.bmi >= 30 ? 'Obese' : record.bmi >= 25 ? 'Overweight' : 'Normal'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-500">BP:</span>
                    <span className="font-semibold font-mono">{record.bloodPressure}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-500">Ex (hrs/wk):</span>
                    <span className="font-semibold font-mono">{record.exerciseHoursPerWeek}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-500">Sleep (hrs/nt):</span>
                    <span className="font-semibold font-mono">{record.sleepHoursPerNight}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-500">Stress:</span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                      record.stressLevel === 'Low' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' :
                      record.stressLevel === 'Medium' ? 'bg-amber-50 border border-amber-100 text-amber-700' :
                      'bg-red-50 border border-red-100 text-red-700'
                    }`}>
                      {record.stressLevel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-500">Glucose:</span>
                    <span className="font-semibold font-mono">{record.glucoseLevel}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <span className="font-medium text-slate-500">Condition:</span>
                    <span className="font-semibold text-[10px]">{record.medicalCondition}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Last Sync: {record.lastUpdated}</span>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                    record.healthAssessment === 'Excellent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    record.healthAssessment === 'Good' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                    record.healthAssessment === 'Fair' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                    'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {record.healthAssessment}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}


// ==========================================
// MODULE 2: WELLNESS RISK PREDICTION
// ==========================================
export function RiskPredictionModule({ risks  }) {
  const [filter, setFilter] = useState('ALL');

  const normalizedRisks = (risks || []).map((r) => ({
    ...r,
    riskScore: Number(r.riskScore),
    factors: Array.isArray(r.factors) ? r.factors : [],
    recommendationAction: r.recommendationAction || '',
  }));

  const highCount = normalizedRisks.filter(r => r.riskScore >= 70).length;
  const mediumCount = normalizedRisks.filter(r => r.riskScore >= 45 && r.riskScore < 70).length;
  const lowCount = normalizedRisks.filter(r => r.riskScore < 45).length;


  const filteredRisks = normalizedRisks.filter(r => {
    if (filter === 'HIGH') return r.riskScore >= 70;
    if (filter === 'MEDIUM') return r.riskScore >= 45 && r.riskScore < 70;
    if (filter === 'LOW') return r.riskScore < 45;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => setFilter('HIGH')}
          className={`bg-white border p-4.5 rounded-xl cursor-pointer transition-all hover:bg-slate-50/50 shadow-sm ${
            filter === 'HIGH' ? 'border-red-400 bg-red-50/50' : 'border-slate-200 hover:border-red-300'
          }`}
        >
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">High Severity</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-display font-semibold text-slate-800">{highCount}</span>
            <span className="text-[10px] text-red-600 font-mono font-bold">Score ≥ 70%</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-light">Critical risk indicators. Immediate clinical review or stress PTO mandated.</p>
        </div>

        <div
          onClick={() => setFilter('MEDIUM')}
          className={`bg-white border p-4.5 rounded-xl cursor-pointer transition-all hover:bg-slate-50/50 shadow-sm ${
            filter === 'MEDIUM' ? 'border-amber-400 bg-amber-50/50' : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Moderate Severity</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-display font-semibold text-slate-800">{mediumCount}</span>
            <span className="text-[10px] text-amber-600 font-mono font-bold">Score 45-69%</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-light font-sans">Elevated stress triggers. Guided meditation and ergonomic desk updates advised.</p>
        </div>

        <div
          onClick={() => setFilter('LOW')}
          className={`bg-white border p-4.5 rounded-xl cursor-pointer transition-all hover:bg-slate-50/50 shadow-sm ${
            filter === 'LOW' ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Low Severity</span>
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-display font-semibold text-slate-800">{lowCount}</span>
            <span className="text-[10px] text-emerald-600 font-mono font-bold">Score &lt; 45%</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-light">Healthy baseline. Maintain current lifestyle routines and claim fitness rewards.</p>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <span className="text-xs text-slate-500 font-medium pl-2">Filter risk records by clinical severity:</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              filter === 'ALL'
                ? 'bg-slate-900 text-white font-bold shadow-sm'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            All Risks ({risks.length})
          </button>
          <button
            onClick={() => setFilter('HIGH')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              filter === 'HIGH'
                ? 'bg-red-50 border border-red-300 text-red-700 font-bold'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            High ({highCount})
          </button>
          <button
            onClick={() => setFilter('MEDIUM')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              filter === 'MEDIUM'
                ? 'bg-amber-50 border border-amber-300 text-amber-700 font-bold'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            Moderate ({mediumCount})
          </button>
          <button
            onClick={() => setFilter('LOW')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              filter === 'LOW'
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 font-bold'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Low ({lowCount})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRisks.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-10 text-center font-mono text-xs text-slate-400 shadow-sm">
            No employees found under the selected {filter.toLowerCase()} severity category.
          </div>
        ) : (
          filteredRisks.map((risk) => {
            const isHigh = risk.riskScore >= 70;
            const isMedium = risk.riskScore >= 45 && risk.riskScore < 70;

            return (
              <div
                key={risk.employeeId}
                className={`bg-white rounded-xl border p-5 space-y-4 relative overflow-hidden transition-all hover:border-slate-300 shadow-sm ${
                  isHigh ? 'border-red-200' : isMedium ? 'border-amber-200' : 'border-emerald-150'
                }`}
              >
                <div className={`absolute top-0 left-0 w-full h-1 ${
                  isHigh ? 'bg-red-500' : isMedium ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />

                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-slate-800">{risk.employeeName}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{risk.employeeId}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                      isHigh ? 'bg-red-50 text-red-700 border border-red-100' :
                      isMedium ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {isHigh ? 'High Severity' : isMedium ? 'Moderate Severity' : 'Low Severity'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      Category
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-500">Risk Intensity Index:</span>
                    <span className={`font-bold font-mono ${
                      isHigh ? 'text-red-600' : isMedium ? 'text-amber-600' : 'text-emerald-600'
                    }`}>{risk.riskScore}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      isHigh ? 'bg-red-500' : isMedium ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} style={{ width: `${risk.riskScore}%` }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Triggers Detected</div>
                  <div className="flex flex-wrap gap-1.5">
                    {risk.factors.map((factor, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] rounded-md font-medium">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Prescribed Action
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-light font-sans">
                    {risk.recommendationAction}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ==========================================
// MODULE 3: PERSONALIZED RECOMMENDATIONS
// ==========================================
export function RecommendationModule({ recommendations = [], loading }) { 
  const [search, setSearch] = useState('');

  const filteredRecs = recommendations.filter(rec => {
    const searchTerm = search.toLowerCase();
    return (
      rec.employeeName.toLowerCase().includes(searchTerm) ||
      rec.employeeId.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by employee name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
          />
        </div>
      </div>
      {loading ? (
        <div className="space-y-6">
          {[...new Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-pulse">
              <div className="flex justify-between items-start pb-4 border-b border-slate-100 mb-4">
                <div>
                  <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-slate-100 rounded w-24"></div>
                </div>
                <div className="h-5 bg-slate-200 rounded-md w-20"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="h-24 bg-slate-100 rounded-lg"></div>
                <div className="h-24 bg-slate-100 rounded-lg"></div>
                <div className="h-24 bg-slate-100 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredRecs.length === 0 ? (
        <div className="col-span-full bg-white border border-slate-200 rounded-xl p-10 text-center font-mono text-xs text-slate-400 shadow-sm">
          No recommendations found matching your search.
        </div>
      ) : (
        filteredRecs.map((empRec) => (
          <div key={empRec.employeeId} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100 mb-4">
              <div>
                <h4 className="font-display font-semibold text-slate-800">{empRec.employeeName}</h4>
                <p className="text-xs text-slate-400 font-mono">{empRec.employeeId}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                empRec.riskProfile.riskType === 'High' ? 'bg-red-50 text-red-700 border border-red-100' :
                empRec.riskProfile.riskType === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                'bg-emerald-50 text-emerald-700 border border-emerald-100'
              }`}>
                {empRec.riskProfile.riskType} Risk
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {empRec.recommendations.map((rec, idx) => {
                const Icon = rec.category === 'Fitness' ? Dumbbell :
                             rec.category === 'Diet' ? Apple :
                             rec.category === 'Mental Wellness' ? Brain : Clock;
                return (
                  <div key={rec.recommendation_id || idx} className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 space-y-3">
                     <div className="flex items-center justify-between">
                        <div className="p-2 bg-white border border-slate-200 rounded-lg text-indigo-600">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-md">
                          {rec.category}
                        </span>
                      </div>
                      <div>
                        <h5 className=" text-[13px] font-semibold text-xs text-slate-800">{rec.title}</h5>
                        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed font-light">{rec.description}</p>
                      </div>
                      {rec.reasons && rec.reasons.length > 0 && (
                        <div className="pt-2 border-t border-slate-200">
                           <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Reasons:</p>
                           <ul className="list-disc list-inside space-y-0.5 mt-1">
                            {rec.reasons.map((reason, i) => (
                              <li key={i} className="text-[12px] text-slate-500">{reason}</li>
                            ))}
                           </ul>
                        </div>
                      )}
                  </div>
                );
              })}
               {empRec.recommendations.length === 0 && (
                <div className="md:col-span-2 xl:col-span-3 text-center text-xs text-slate-400 font-mono py-5">
                  No specific recommendations triggered for this low-risk employee.
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ==========================================
// MODULE 4: MENTAL HEALTH & SENTIMENT
// ==========================================
export function SentimentModule({ sentimentList = [] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sentimentList.map((sent) => (
          <div key={sent.department} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h4 className="font-display font-semibold text-slate-800">{sent.department} Department Sentiment</h4>
              <span className="text-[10px] text-slate-400 font-bold font-mono">Pulse Count</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><Smile className="w-4 h-4 text-emerald-500" /> Positive</span>
                  <span className="font-mono font-bold text-emerald-600">{sent.sentimentDistribution.positive}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${sent.sentimentDistribution.positive}%` }} />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><Smile className="w-4 h-4 text-slate-400" /> Neutral</span>
                  <span className="font-mono font-bold text-slate-500">{sent.sentimentDistribution.neutral}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full rounded-full" style={{ width: `${sent.sentimentDistribution.neutral}%` }} />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><ShieldAlert className="w-4 h-4 text-rose-500" /> Stress distress</span>
                  <span className="font-mono font-bold text-rose-600">{sent.sentimentDistribution.negative}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${sent.sentimentDistribution.negative}%` }} />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Stress index</span>
                <span className={`text-4xl font-display font-bold ${
                  sent.averageStressScore >= 7 ? 'text-rose-600' : sent.averageStressScore >= 5 ? 'text-amber-600' : 'text-emerald-600'
                }`}>{sent.averageStressScore}</span>
                <span className="text-[9px] text-slate-400 font-mono mt-1">Scale 1-10</span>

                <span className={`mt-3 px-2.5 py-0.5 text-[9px] font-bold rounded-md ${
                  sent.averageStressScore >= 7
                    ? 'bg-rose-50 text-rose-700 border border-rose-100'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}>
                  {sent.averageStressScore >= 7 ? 'Needs Review' : 'Optimal Zone'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Logged Feedback Issues</span>
              <ul className="space-y-1">
                {sent.keyIssues.map((issue, idx) => (
                  <li key={idx} className="text-xs text-slate-500 font-light flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// MODULE 5: PERFORMANCE & KPI DASHBOARD
// ==========================================
export function PerformanceDashboard({ kpis, records, performanceData, loadingPerformance, performanceError  }) {
  // Use backend data if available, otherwise fall back to frontend-derived KPIs
  const displayKpis = performanceData ? {
    participationRate: performanceData.kpis?.participationRate ?? kpis.participationRate,
    absenteeismRate: performanceData.kpis?.absenteeismRate ?? kpis.absenteeismRate,
    overallHealthRiskScore: performanceData.kpis?.overallHealthRiskScore ?? kpis.overallHealthRiskScore,
    programEffectiveness: performanceData.kpis?.programEffectiveness ?? kpis.programEffectiveness,
    productivityTrend: performanceData.productivityTrend ?? kpis.productivityTrend,
  } : kpis;

  if (loadingPerformance) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...new Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3 animate-pulse">
              <div className="h-3 bg-slate-200 rounded w-24"></div>
              <div className="h-8 bg-slate-300 rounded w-16"></div>
              <div className="h-1 bg-slate-200 rounded-full w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (performanceError) {
    return (
      <div className="space-y-8">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Backend performance data unavailable</p>
            <p className="text-xs text-amber-600 mt-1">{performanceError}</p>
            <p className="text-xs text-amber-500 mt-1">Showing frontend-derived KPIs as fallback.</p>
          </div>
        </div>
        {/* Fallback: render with frontend kpis */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Participation Rate</span>
              <Activity className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-display font-semibold text-slate-800">{kpis.participationRate}%</span>
              <span className="text-[10px] text-emerald-600 font-mono font-bold">Target 80%</span>
            </div>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${kpis.participationRate}%` }} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Absenteeism Rate</span>
              <TrendingUp className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-display font-semibold text-slate-800">{kpis.absenteeismRate}%</span>
              <span className="text-[10px] text-slate-500 font-mono font-bold">Industry 4.5%</span>
            </div>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, kpis.absenteeismRate * 10)}%` }} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Workforce Risk</span>
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-display font-semibold text-slate-800">{kpis.overallHealthRiskScore}%</span>
              <span className="text-[10px] text-emerald-600 font-mono font-bold">Ideal  20%</span>
            </div>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${kpis.overallHealthRiskScore}%` }} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Effectiveness</span>
              <Smile className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-display font-semibold text-slate-800">{kpis.programEffectiveness}%</span>
              <span className="text-[10px] text-emerald-600 font-mono font-bold">Satisfied</span>
            </div>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${kpis.programEffectiveness}%` }} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="font-display font-semibold text-slate-800">Health Vitals Scatter Overview</h4>
          <p className="text-slate-400 text-xs font-light">Real-time clustering of employee metrics (Sleep vs. Exercise hours per week).</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
            {records.map(r => (
              <div key={r.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-center transition-all hover:border-slate-300 shadow-xs">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mx-auto" />
                <div className="font-semibold text-xs text-slate-800 truncate">{r.employeeName}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">{r.department}</div>
                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono bg-white p-2 rounded border border-slate-150 mt-2">
                  <div><span className="block text-[8px] text-slate-400 uppercase font-sans">Sleep</span><span className="font-bold text-slate-700">{r.sleepHoursPerNight}h</span></div>
                  <div><span className="block text-[8px] text-slate-400 uppercase font-sans">Fit</span><span className="font-bold text-slate-700">{r.exerciseHoursPerWeek}h</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Participation Rate</span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-display font-semibold text-slate-800">{kpis.participationRate}%</span>
            <span className="text-[10px] text-emerald-600 font-mono font-bold">Target 80%</span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${kpis.participationRate}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Absenteeism Rate</span>
            <TrendingUp className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-display font-semibold text-slate-800">{kpis.absenteeismRate}%</span>
            <span className="text-[10px] text-slate-500 font-mono font-bold">Industry 4.5%</span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, kpis.absenteeismRate * 10)}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Workforce Risk</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-display font-semibold text-slate-800">{kpis.overallHealthRiskScore}%</span>
            <span className="text-[10px] text-emerald-600 font-mono font-bold">Ideal &lt; 20%</span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${kpis.overallHealthRiskScore}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Effectiveness</span>
            <Smile className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-display font-semibold text-slate-800">{kpis.programEffectiveness}%</span>
            <span className="text-[10px] text-emerald-600 font-mono font-bold">Satisfied</span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${kpis.programEffectiveness}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h4 className="font-display font-semibold text-slate-800">Health Vitals Scatter Overview</h4>
        <p className="text-slate-400 text-xs font-light">Real-time clustering of employee metrics (Sleep vs. Exercise hours per week).</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
          {records.map(r => (
            <div key={r.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-center transition-all hover:border-slate-300 shadow-xs">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mx-auto" />
              <div className="font-semibold text-xs text-slate-800 truncate">{r.employeeName}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">{r.department}</div>
              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono bg-white p-2 rounded border border-slate-150 mt-2">
                <div>
                  <span className="block text-[8px] text-slate-400 uppercase font-sans">Sleep</span>
                  <span className="font-bold text-slate-700">{r.sleepHoursPerNight}h</span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 uppercase font-sans">Fit</span>
                  <span className="font-bold text-slate-700">{r.exerciseHoursPerWeek}h</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODULE 9: AI ANALYTICS & BURNOUT TREND
// ==========================================
export function AiAnalyticsModule({ healthRecords, risks }) {
  const [burnoutData, setBurnoutData] = useState(null);
  const [loadingBurnout, setLoadingBurnout] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [error, setError] = useState('');

  // Derive department wellness predictions from health records
  const departmentWellness = useMemo(() => {
    const deptMap = {};
    healthRecords.forEach(r => {
      const dept = r.department || 'Unknown';
      if (!deptMap[dept]) {
        deptMap[dept] = { total: 0, stressSum: 0, bmiSum: 0, sleepSum: 0, exerciseSum: 0, riskHigh: 0 };
      }
      deptMap[dept].total += 1;
      deptMap[dept].stressSum += (r.stressScore || 5);
      deptMap[dept].bmiSum += (r.bmi || 24);
      deptMap[dept].sleepSum += (r.sleepHoursPerNight || 7);
      deptMap[dept].exerciseSum += (r.exerciseHoursPerWeek || 3);
      // Check if this employee has a high risk
      const empRisk = (risks || []).find(risk => risk.employeeId === r.employeeId);
      if (empRisk && empRisk.riskScore >= 70) {
        deptMap[dept].riskHigh += 1;
      }
    });
    return Object.entries(deptMap).map(([dept, data]) => ({
      department: dept,
      employeeCount: data.total,
      avgStressScore: Number((data.stressSum / data.total).toFixed(1)),
      avgBmi: Number((data.bmiSum / data.total).toFixed(1)),
      avgSleep: Number((data.sleepSum / data.total).toFixed(1)),
      avgExercise: Number((data.exerciseSum / data.total).toFixed(1)),
      highRiskCount: data.riskHigh,
      wellnessScore: Math.round(100 - ((data.stressSum / data.total) * 3 + (data.riskHigh / data.total) * 20))
    }));
  }, [healthRecords, risks]);

  // Fetch burnout trend from backend
  useEffect(() => {
    const loadBurnout = async () => {
      setLoadingBurnout(true);
      setError('');
      try {
        const data = await fetchBurnoutTrend(selectedDept || undefined);
        setBurnoutData(data);
      } catch (err) {
        // Fallback: generate from local data
        setBurnoutData(null);
        setError('Could not fetch AI burnout trend. Using local data.');
      } finally {
        setLoadingBurnout(false);
      }
    };
    loadBurnout();
  }, [selectedDept]);

  return (
    <div className="space-y-8">
      {/* Burnout Trend Visualization */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-slate-800">AI Burnout Risk Trend</h3>
            <p className="text-xs text-slate-400 mt-1">Real-time burnout prediction across the organization</p>
          </div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none cursor-pointer"
          >
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Sales">Sales</option>
            <option value="Marketing">Marketing</option>
            <option value="Product">Product</option>
            <option value="Operations">Operations</option>
          </select>
        </div>

        {loadingBurnout ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Burnout probability cards */}
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">High Burnout Risk</span>
                <Zap className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-3xl font-display font-bold text-rose-700">
                {burnoutData?.highBurnoutCount ?? departmentWellness.reduce((sum, d) => sum + d.highRiskCount, 0)}
              </div>
              <div className="text-[10px] text-rose-500 mt-1 font-mono">Employees at critical level</div>
              <div className="w-full bg-rose-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, ((burnoutData?.highBurnoutCount ?? departmentWellness.reduce((sum, d) => sum + d.highRiskCount, 0)) / Math.max(healthRecords.length, 1)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Moderate Risk</span>
                <Target className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-3xl font-display font-bold text-amber-700">
                {burnoutData?.moderateBurnoutCount ?? risks.filter(r => r.riskScore >= 45 && r.riskScore < 70).length}
              </div>
              <div className="text-[10px] text-amber-500 mt-1 font-mono">Needs intervention</div>
              <div className="w-full bg-amber-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, ((burnoutData?.moderateBurnoutCount ?? risks.filter(r => r.riskScore >= 45 && r.riskScore < 70).length) / Math.max(healthRecords.length, 1)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Low Risk</span>
                <Users className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-display font-bold text-emerald-700">
                {burnoutData?.lowBurnoutCount ?? risks.filter(r => r.riskScore < 45).length}
              </div>
              <div className="text-[10px] text-emerald-500 mt-1 font-mono">Healthy baseline</div>
              <div className="w-full bg-emerald-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, ((burnoutData?.lowBurnoutCount ?? risks.filter(r => r.riskScore < 45).length) / Math.max(healthRecords.length, 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Department Wellness Score Predictions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2">
          <LineChart className="w-5 h-5 text-indigo-500" />
          <h3 className="font-display font-semibold text-slate-800">Department Wellness Score Predictions</h3>
        </div>
        <p className="text-xs text-slate-400">AI-predicted wellness scores based on aggregated health metrics per department</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {departmentWellness.length === 0 ? (
            <div className="col-span-full bg-slate-50 border border-slate-200 rounded-xl p-8 text-center font-mono text-xs text-slate-400">
              No health records available for prediction.
            </div>
          ) : (
            departmentWellness.map((dept) => (
              <div key={dept.department} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-800">{dept.department}</h4>
                  <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-500 font-mono">
                    {dept.employeeCount} employees
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Wellness Score</span>
                    <span className={`font-bold font-mono ${
                      dept.wellnessScore >= 70 ? 'text-emerald-600' : dept.wellnessScore >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>{dept.wellnessScore}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        dept.wellnessScore >= 70 ? 'bg-emerald-500' : dept.wellnessScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${dept.wellnessScore}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                    <span className="block text-slate-400 font-mono">Avg Stress</span>
                    <span className="font-bold text-slate-700">{dept.avgStressScore}/10</span>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                    <span className="block text-slate-400 font-mono">Avg BMI</span>
                    <span className="font-bold text-slate-700">{dept.avgBmi}</span>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                    <span className="block text-slate-400 font-mono">Avg Sleep</span>
                    <span className="font-bold text-slate-700">{dept.avgSleep}h</span>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                    <span className="block text-slate-400 font-mono">Avg Exercise</span>
                    <span className="font-bold text-slate-700">{dept.avgExercise}h/wk</span>
                  </div>
                </div>

                {dept.highRiskCount > 0 && (
                  <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="text-[10px] text-red-700 font-medium">{dept.highRiskCount} employee(s) at high risk</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI-Generated Wellness Report Summary */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="font-display font-semibold text-indigo-900">AI Wellness Report Summary</h3>
        </div>
        <p className="text-sm text-indigo-700 leading-relaxed font-light">
          Based on current health records and risk predictions, the organization shows {
            departmentWellness.reduce((sum, d) => sum + d.wellnessScore, 0) / Math.max(departmentWellness.length, 1) >= 70
              ? 'strong overall wellness with low burnout indicators.'
              : departmentWellness.reduce((sum, d) => sum + d.wellnessScore, 0) / Math.max(departmentWellness.length, 1) >= 50
              ? 'moderate wellness levels — targeted interventions recommended for high-stress departments.'
              : 'elevated risk levels — immediate wellness program interventions are strongly advised.'
          } {
            departmentWellness.filter(d => d.highRiskCount > 0).length > 0
              ? `${departmentWellness.filter(d => d.highRiskCount > 0).length} department(s) have employees requiring urgent attention.`
              : 'All departments maintain healthy risk profiles.'
          }
        </p>
        <div className="flex items-center gap-2 text-[10px] text-indigo-500 font-mono">
          <Check className="w-3 h-3" />
          <span>AI-generated report based on {healthRecords.length} health records across {departmentWellness.length} departments</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// CORE COMPONENT: ADMIN DASHBOARD
// ==========================================
export default function AdminDashboard({ user,
  onLogout,
  healthRecords,
  allUsers,
  risks,
  recommendations = personalRecommendations,
  sentimentList,
  kpis,
  loading,
  isProfileModalOpen,
  setIsProfileModalOpen,
  onUpdateAvatar,
  onUserUpdate,
  onAddHealthRecord,
  onDeleteHealthRecord,
  onUpdateHealthRecord,
  performanceData,
  loadingPerformance,
  performanceError
}) {
  const [activeTab, setActiveTab] = useState(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Find the logged-in admin's department from their health record.
  // This is used to filter the sentiment module to only show the admin's own department.
  const adminRecord = healthRecords.find(r => r.employeeId === user.employeeId);
  const adminDepartment = adminRecord ? adminRecord.department : null;

  // Filter the sentiment list. If the admin has a department, only show the card for that department.
  // Otherwise (e.g., a super-admin without a department record), show all.
  const filteredSentimentList = useMemo(() => {
    if (adminDepartment) {
      return sentimentList.filter(s => s.department === adminDepartment);
    }
    // If the admin's department isn't found, return the full list.
    return sentimentList;
  }, [sentimentList, adminDepartment]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {isProfileModalOpen && (
        <ProfileEditModal
          user={user}
          isAdmin={true}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdateAvatar={onUpdateAvatar}
          onUpdated={(updatedUser) => {
            if (updatedUser) onUserUpdate(updatedUser);
          }}
        />
      )}
      {/* Platform Header */}
      <header className="bg-white border-b border-slate-200 text-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
          </div>
          <div>
            <span className="font-display font-bold text-lg tracking-tight block text-slate-900 leading-tight">Employee Wellness Management Analytics</span>
            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase font-mono">Wellness Intelligence</span>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center md:justify-end gap-4">
          {/* Dark Mode Toggle */}
          <ThemeToggle />

          {/* Notification Bell */}
          <NotificationBell isAdmin={true} />

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setIsProfileModalOpen(true)}>
            <div className="hidden sm:block text-right">
              <span className="block text-sm font-semibold text-slate-850 leading-tight">{user.name}</span>
              <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{user.adminId}</span>
              <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-mono font-bold rounded uppercase tracking-widest leading-none">
                Administrator
              </span>
            </div>
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full border border-slate-200 shadow-md object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700">
                {user.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* Navigation Sidebar */}
        <aside
          className={`hidden lg:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 shrink-0 p-4 justify-between ${
            isSidebarCollapsed ? 'w-20' : 'w-72'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2 py-1">
              {!isSidebarCollapsed && (
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                  Admin Modules
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer mx-auto"
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            <nav className="space-y-1.5">
              {[
                { id: 1, label: 'Health Data Manager', icon: Activity, desc: 'BMI, medical, habits database' },
                { id: 2, label: 'Wellness Risk Prediction', icon: TrendingUp, desc: 'AI burnout & vitals risk scores' },
                { id: 3, label: 'Personalized Recommender', icon: Lightbulb, desc: 'Fitness, diets, wellness schedules' },
                { id: 4, label: 'Sentiment & Mental Health', icon: Smile, desc: 'Anonymized stress tracker' },
                { id: 5, label: 'Performance Analytics', icon: BarChart3, desc: 'Absenteeism & wellness KPIs' },
                { id: 6, label: 'Insurance Management', icon: ShieldCheck, desc: 'Policies & claims oversight' },
                { id: 7, label: 'Notification Center', icon: Bell, desc: 'Send & manage notifications' },
                { id: 8, label: 'Checkups, SOS & Expenses', icon: Siren, desc: 'Appointments, alerts, claims' },
                { id: 9, label: 'AI Analytics', icon: Zap, desc: 'Burnout trends & wellness predictions' },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.label}
                    className={`w-full text-left p-3.5 rounded-lg flex items-start gap-3.5 transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-indigo-50 border-indigo-100 text-indigo-900 font-semibold'
                        : 'hover:bg-slate-50 border-transparent text-slate-500'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {!isSidebarCollapsed && (
                      <div className="truncate">
                        <div className="text-xs font-bold">{tab.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {tab.desc}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Stats sidebar widget */}
          {!isSidebarCollapsed && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">System Vitals</span>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Analytics Active
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92%' }} />
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Module Content Stage */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {/* Active module display card header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-[10px] font-bold text-indigo-700 uppercase tracking-wide mb-3">
                {activeTab <= 5 ? `Core Module ${activeTab} of 5` : `Extension Module ${activeTab}`}
              </div>
              <h1 className="font-display text-3xl font-light text-slate-900 tracking-tight">
                {activeTab === 1 && 'Employee Health Data Management'}
                {activeTab === 2 && 'Wellness Risk Prediction'}
                {activeTab === 3 && 'Wellness Recommendation System'}
                {activeTab === 4 && 'Mental Health & Sentiment Analytics'}
                {activeTab === 5 && 'Wellness Performance Dashboard & Analytics'}
                {activeTab === 6 && 'Insurance Management'}
                {activeTab === 7 && 'Notification Center'}
                {activeTab === 8 && 'Checkups, SOS & Expenses'}
                {activeTab === 9 && 'AI Analytics & Burnout Trend'}
              </h1>
              <p className="text-slate-500 text-sm mt-2 max-w-2xl font-light">
                {activeTab === 1 && 'Database logs for tracking key metrics including BMI, medical stats, sleep, and lifestyle routines.'}
                {activeTab === 2 && 'Machine learning assessments predicting health risks, cardiovascular issues, or stress burnout.'}
                {activeTab === 3 && 'Tailored, evidence-based fitness routines, diet schedules, and mental wellbeing recommendations.'}
                {activeTab === 4 && 'NLP-driven departmental stress analytics collected through fully anonymized feedback pulse-checks.'}
                {activeTab === 5 && 'High-level HR dashboard displaying team participation rates, absenteeism counters, and program efficacy.'}
                {activeTab === 6 && 'Manage employee insurance policies, claims, and coverage oversight.'}
                {activeTab === 7 && 'Send broadcast notifications to all employees or specific departments.'}
                {activeTab === 8 && 'Oversee employee checkup scheduling, SOS alerts, and expense claims.'}
                {activeTab === 9 && 'AI-driven burnout risk trends, department wellness score predictions, and automated wellness report summaries.'}
              </p>
            </div>
          </div>

          {/* Render Active Tab Component */}
          <div className="animate-fadeIn">
            {activeTab === 1 && (
              <HealthDataModule
                records={healthRecords}
                allUsers={allUsers}
                onAddRecord={onAddHealthRecord}
                onUpdateRecord={onUpdateHealthRecord}
                onDeleteRecord={onDeleteHealthRecord}
              />
            )}

            {activeTab === 2 && (
              <RiskPredictionModule risks={risks} />
            )}

            {activeTab === 3 && (
              <RecommendationModule recommendations={recommendations} loading={loading} />
            )}

            {activeTab === 4 && (
              <SentimentModule sentimentList={filteredSentimentList} />
            )}

            {activeTab === 5 && (
              <PerformanceDashboard kpis={kpis} records={healthRecords} performanceData={performanceData} loadingPerformance={loadingPerformance} performanceError={performanceError} />
            )}

            {activeTab === 6 && (
              <AdminInsuranceModule />
            )}

            {activeTab === 7 && (
              <AdminNotificationCenter />
            )}

            {activeTab === 8 && (
              <div className="space-y-8">
                <AdminCheckupsModule />
                <AdminSosMonitor />
                <AdminExpensesModule />
              </div>
            )}

            {activeTab === 9 && (
              <AiAnalyticsModule healthRecords={healthRecords} risks={risks} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}