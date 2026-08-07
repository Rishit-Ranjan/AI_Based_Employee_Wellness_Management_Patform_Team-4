import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  HeartPulse,
  Activity,
  Brain,
  Sparkles,
  Check,
  ShieldAlert,
  Apple,
  Dumbbell,
  Clock,
  Smile,
  Flame,
  Moon,
  Info,
  Calendar,
  Heart,
  FileText,
  Building2,
  Scale,
  Ruler,
  Droplets,
  Zap,
  ShieldCheck
} from 'lucide-react';

import StatCard from './StatCard';
import ProfileCard from './ProfileCard';
import HealthCard from './HealthCard';
import HealthChart from './HealthChart';
import ThemeToggle from './ThemeToggle';

export default function PersonalWellnessProfile({
  user,
  records = [],
  risks = [],
  onUpdateRecord,
  onAddRecord,
  onAddSentimentPulse,
  dailyHabits = [],
  onAddDailyHabit,
  onUpdateDailyHabit,
  mentalHealthLogs = [],
  onAddMentalHealthLog,
  onUpdateMentalHealthLog
}) {
  const userEmpId = user?.employeeId;
  const existingRecord = records.find(r => r.employeeId === userEmpId);
  const existingDailyHabit = dailyHabits.find(h => h.employeeId === userEmpId);
  const existingMentalHealthLog = mentalHealthLogs.find(l => l.employeeId === userEmpId);

const initialUserRecord = existingRecord || {
    employeeId: userEmpId,
    employeeName: user?.name,
    department: 'Engineering',
    age: '',
    gender: 'Male',
    heightCm: '',
    weightKg: '',
    bmi: '',
    bloodPressure: '',
    exerciseDaysPerWeek: '',
    stressLevel: 'Medium',
    stressScore: '',
    attendanceRate: '',
    medicalNotes: '',
    medicalCondition: 'No major condition',
    smoker: false,
    alcoholUse: false,
    glucoseLevel: '',
    sleepHoursPerNight: '',
    exerciseHoursPerWeek: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    bloodGroup: '',
    allergies: '',
    existingDiseases: '',
  };

  const [dept, setDept] = useState(initialUserRecord.department || 'Engineering');
  const [age, setAge] = useState(String(initialUserRecord.age || ''));
  const [gender, setGender] = useState(initialUserRecord.gender || 'Male');
  const [heightCm, setHeightCm] = useState(String(initialUserRecord.heightCm || ''));
  const [weightKg, setWeightKg] = useState(String(initialUserRecord.weightKg || ''));
  const [bmi, setBmi] = useState(String(initialUserRecord.bmi || ''));
  const [bp, setBp] = useState(initialUserRecord.bloodPressure || '120/80');
  const [exerciseDaysPerWeek, setExerciseDaysPerWeek] = useState(String(initialUserRecord.exerciseDaysPerWeek || ''));
  const [exercise, setExercise] = useState(String(initialUserRecord.exerciseHoursPerWeek || ''));
  const [sleep, setSleep] = useState(String(initialUserRecord.sleepHoursPerNight || ''));
  const [stress, setStress] = useState(initialUserRecord.stressLevel || 'Medium');
  const [stressScore, setStressScore] = useState(String(initialUserRecord.stressScore || '5'));
  const [attendanceRate, setAttendanceRate] = useState(String(initialUserRecord.attendanceRate || '95'));
  const [medicalNotes, setMedicalNotes] = useState(initialUserRecord.medicalNotes || '');
  const [medicalCondition, setMedicalCondition] = useState(initialUserRecord.medicalCondition || 'No major condition');
const [smoker, setSmoker] = useState(initialUserRecord.smoker || false);
  const [alcoholUse, setAlcoholUse] = useState(initialUserRecord.alcoholUse || false);
  const [glucoseLevel, setGlucoseLevel] = useState(String(initialUserRecord.glucoseLevel || '90'));
  const [emergencyContactName, setEmergencyContactName] = useState(initialUserRecord.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(initialUserRecord.emergencyContactPhone || '');
  const [bloodGroup, setBloodGroup] = useState(initialUserRecord.bloodGroup || '');
  const [allergies, setAllergies] = useState(initialUserRecord.allergies || '');
  const [existingDiseases, setExistingDiseases] = useState(initialUserRecord.existingDiseases || '');

  useEffect(() => {
    const currentRecord = records.find(r => r.employeeId === userEmpId);
    if (currentRecord) {
      setAge(String(currentRecord.age || ''));
      setGender(currentRecord.gender || 'Male');
      setHeightCm(String(currentRecord.heightCm || ''));
      setWeightKg(String(currentRecord.weightKg || ''));
      setDept(currentRecord.department || 'Engineering');
      setBmi(String(currentRecord.bmi || ''));
      setBp(currentRecord.bloodPressure || '120/80');
      setExerciseDaysPerWeek(String(currentRecord.exerciseDaysPerWeek || ''));
      setExercise(String(currentRecord.exerciseHoursPerWeek || ''));
      setSleep(String(currentRecord.sleepHoursPerNight || ''));
      setStress(currentRecord.stressLevel || 'Medium');
      setStressScore(String(currentRecord.stressScore || '5'));
      setAttendanceRate(String(currentRecord.attendanceRate || '95'));
setMedicalNotes(currentRecord.medicalNotes || '');
      setMedicalCondition(currentRecord.medicalCondition || 'No major condition');
      setSmoker(currentRecord.smoker || false);
      setAlcoholUse(currentRecord.alcoholUse || false);
      setGlucoseLevel(String(currentRecord.glucoseLevel || '90'));
      setEmergencyContactName(currentRecord.emergencyContactName || '');
      setEmergencyContactPhone(currentRecord.emergencyContactPhone || '');
      setBloodGroup(currentRecord.bloodGroup || '');
      setAllergies(currentRecord.allergies || '');
      setExistingDiseases(currentRecord.existingDiseases || '');
    }
  }, [records, userEmpId]);

  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [error, setError] = useState('');

  const [waterCups, setWaterCups] = useState(existingDailyHabit?.waterCups || 0);
  const [stepsCount, setStepsCount] = useState(existingDailyHabit?.stepsCount || 0);
  const [mood, setMood] = useState(existingMentalHealthLog?.mood || 'Calm');
  const [streakDays, setStreakDays] = useState(existingMentalHealthLog?.streakDays || 5);

  const [pulseStress, setPulseStress] = useState(1);
  const [pulseFeedback, setPulseFeedback] = useState('');
  const [pulseSubmitted, setPulseSubmitted] = useState(false);
  const [lastPulseSentiment, setLastPulseSentiment] = useState(null);
  const [pulseFeedbackError, setPulseFeedbackError] = useState('');

  const [showBpInfoPopup, setShowBpInfoPopup] = useState(false);
  const bpInfoRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bpInfoRef.current && !bpInfoRef.current.contains(event.target)) {
        setShowBpInfoPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute calculated values
  const computedBmi = () => {
    if (bmi && Number(bmi) > 0) return Number(bmi);
    const h = Number(heightCm) / 100;
    const w = Number(weightKg);
    if (h > 0 && w > 0) {
      return Number((w / (h * h)).toFixed(1));
    }
    return 22.0;
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const calculatedBmiVal = computedBmi();
    let assessment = 'Good';
    const [sys] = (bp || "120/80").split('/').map(Number);

    if (stress === 'High' || sys >= 140 || calculatedBmiVal >= 30) {
      assessment = 'Needs Attention';
    } else if (stress === 'Low' && calculatedBmiVal < 25 && calculatedBmiVal >= 18.5 && Number(sleep) >= 7) {
      assessment = 'Excellent';
    } else if (Number(sleep) < 6) {
      assessment = 'Fair';
    }

    const updated = {
      employeeId: user.employeeId,
      employeeName: user.name,
      age: Number(age),
      gender: gender,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      ...(existingRecord ? { id: existingRecord.id } : {}),
      department: dept,
      bmi: calculatedBmiVal,
      bloodPressure: bp,
      exerciseDaysPerWeek: Number(exerciseDaysPerWeek),
      exerciseHoursPerWeek: Number(exercise) || 0,
      sleepHoursPerNight: Number(sleep) || 0,
      stressLevel: stress,
      stressScore: Number(stressScore),
      attendanceRate: Number(attendanceRate),
      medicalNotes: medicalNotes,
      medicalCondition: medicalCondition,
smoker: smoker,
      alcoholUse: alcoholUse,
      glucoseLevel: Number(glucoseLevel),
      emergencyContactName: emergencyContactName,
      emergencyContactPhone: emergencyContactPhone,
      bloodGroup: bloodGroup,
      allergies: allergies,
      existingDiseases: existingDiseases,
      healthAssessment: assessment,
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    try {
      if (existingRecord && onUpdateRecord) {
        await onUpdateRecord(updated);
      } else if (onAddRecord) {
        await onAddRecord(updated);
      }
      setShowSyncSuccess(true);
      setError('');
      setTimeout(() => setShowSyncSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to update wellness profile:", err);
      setError('Failed to update profile. Please try again.');
    }
  };

  const updateWater = (change) => {
    const newVal = Math.max(0, waterCups + change);
    setWaterCups(newVal);
    const updatedHabit = {
      ...(existingDailyHabit || {}),
      employeeId: user.employeeId,
      waterCups: newVal,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    if (existingDailyHabit && onUpdateDailyHabit) {
      onUpdateDailyHabit(updatedHabit);
    } else if (onAddDailyHabit) {
      onAddDailyHabit(updatedHabit);
    }
  };

  const handleStepsChange = (e) => {
    const val = Number(e.target.value);
    setStepsCount(val);
    const updatedHabit = {
      ...(existingDailyHabit || {}),
      employeeId: user.employeeId,
      stepsCount: val,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    if (existingDailyHabit && onUpdateDailyHabit) {
      onUpdateDailyHabit(updatedHabit);
    } else if (onAddDailyHabit) {
      onAddDailyHabit(updatedHabit);
    }
  };

  const handleMoodSelect = (selectedMood) => {
    setMood(selectedMood);
    const nextStreak = (existingMentalHealthLog && existingMentalHealthLog.mood === selectedMood) ? streakDays : streakDays + 1;
    setStreakDays(nextStreak);

    const updatedLog = {
      ...(existingMentalHealthLog || {}),
      employeeId: user.employeeId,
      mood: selectedMood,
      streakDays: nextStreak,
      date: new Date().toISOString().split('T')[0]
    };
    if (existingMentalHealthLog && onUpdateMentalHealthLog) {
      onUpdateMentalHealthLog(updatedLog);
    } else if (onAddMentalHealthLog) {
      onAddMentalHealthLog(updatedLog);
    }
  };

  const handlePulseSubmit = async (e) => {
    e.preventDefault();
    if (!pulseFeedback.trim()) {
      setPulseFeedbackError('Please enter your feedback before submitting.');
      setTimeout(() => setPulseFeedbackError(''), 4000);
      return;
    }
    setPulseFeedbackError('');
    if (onAddSentimentPulse) {
      const result = await onAddSentimentPulse(user.employeeId, dept, pulseStress, pulseFeedback);
      setLastPulseSentiment(result.sentiment);

      // Also update the main health record's stress score
      if (existingRecord && onUpdateRecord) {
        onUpdateRecord({
          ...existingRecord,
          stressScore: pulseStress,
        });
      }
    }
    const updatedLog = {
      ...(existingMentalHealthLog || {}),
      employeeId: user.employeeId,
      stressLevel: pulseStress,
      feedback: pulseFeedback,
      date: new Date().toISOString().split('T')[0]
    };
    if (existingMentalHealthLog && onUpdateMentalHealthLog) {
      onUpdateMentalHealthLog(updatedLog);
    } else if (onAddMentalHealthLog) {
      onAddMentalHealthLog(updatedLog);
    }
    setPulseSubmitted(true);
    setPulseFeedback('');
    setTimeout(() => {
      setPulseSubmitted(false);
      setLastPulseSentiment(null);
    }, 5000);
  };

  const myRiskProfile = risks.find((r) => r.employeeId === user.employeeId);
  const riskScore = myRiskProfile?.riskScore ?? 25;
  const factors = myRiskProfile?.factors ?? [];

  // Estimated stats
  const healthScore = Math.max(40, 100 - riskScore);
  const caloriesBurned = Math.round(stepsCount * 0.04 + (Number(exercise) || 2) * 140 + 1350);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 pb-12"
    >
      {/* 1. Quick Stats Row (4 Stat Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Health Score"
          value={`${healthScore}%`}
          subtext="Computed from vitals"
          trend="+3.2% vs last month"
          trendUp={true}
          icon={HeartPulse}
          color="blue"
        />
        <StatCard
          title="Calories Burned"
          value={`${caloriesBurned.toLocaleString()} kcal`}
          subtext="Daily active burn"
          trend="+12% active level"
          trendUp={true}
          icon={Flame}
          color="amber"
        />
        <StatCard
          title="Exercise Days"
          value={`${exerciseDaysPerWeek || 0} / 7 Days`}
          subtext={`~${exercise || 0} hrs total weekly`}
          trend={Number(exerciseDaysPerWeek) >= 3 ? "Optimal target reached" : "Below target"}
          trendUp={Number(exerciseDaysPerWeek) >= 3}
          icon={Dumbbell}
          color="emerald"
        />
        <StatCard
          title="Sleep Average"
          value={`${sleep || 7.5} hrs`}
          subtext="Nightly rest log"
          trend={Number(sleep) >= 7 ? "Optimal recovery" : "Needs rest"}
          trendUp={Number(sleep) >= 7}
          icon={Moon}
          color="purple"
        />
      </div>

      {/* 2. Main Grid: Form Split Cards (Left) & Visual Diagnostics (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Form Cards (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            
            {/* Card 1: Personal Information */}
            <ProfileCard
              title="Personal Information"
              subtitle="Basic identity & organizational placement"
              icon={User}
              badge="Section 01"
              badgeColor="blue"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Employee ID
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 font-mono select-none flex items-center justify-between">
                    <span>{user?.employeeId || 'EMP-1001'}</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-md">
                      Verified
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Age
                  </label>
                  <input
                    type="number"
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 28"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Department
                  </label>
                  <select
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all cursor-pointer"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Product">Product</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>
            </ProfileCard>

            {/* Card 2: Physical Health */}
            <ProfileCard
              title="Physical Health Vitals"
              subtitle="Anthropometric data and cardiovascular indicators"
              icon={HeartPulse}
              badge="Section 02"
              badgeColor="emerald"
              className="relative"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="e.g. 175.5"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="e.g. 72.0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Body Mass Index (BMI)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={bmi || computedBmi()}
                    onChange={(e) => setBmi(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Blood Pressure (Sys/Dia){' '}
                    <span 
                      ref={bpInfoRef}
                      className="inline-block ml-1 text-slate-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                      onClick={() => setShowBpInfoPopup(!showBpInfoPopup)}
                    >
                      <Info className="w-3.5 h-3.5 inline cursor-pointer" />
                      {showBpInfoPopup && (
                        <div className="absolute z-30 w-64 p-3 top-2 mt-2 right-0 bg-slate-900 text-white dark:bg-slate-800 border border-slate-700 rounded-xl shadow-2xl text-[11px] font-normal animate-fadeIn space-y-1">
                          <div><strong>Systolic</strong> (top number) measures heart contraction;</div>
                          <div><strong>Diastolic</strong> (bottom number) measures resting pressure.</div>
                          <div>Normal is ~120/80 mmHg.</div>
                        </div>
                      )}
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 120/80"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all font-mono"
                  />
                </div>
              </div>
            </ProfileCard>

            {/* Card 3: Lifestyle */}
            <ProfileCard
              title="Lifestyle & Daily Habits"
              subtitle="Rest, activity routine, and self-reported stress"
              icon={Activity}
              badge="Section 03"
              badgeColor="amber"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Sleep Duration (Hrs/Night)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={sleep}
                    onChange={(e) => setSleep(e.target.value)}
                    placeholder="e.g. 7.5"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Exercise Days (Per Week)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="7"
                    required
                    value={exerciseDaysPerWeek}
                    onChange={(e) => setExerciseDaysPerWeek(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Exercise Hours (Per Week)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={exercise}
                    onChange={(e) => setExercise(e.target.value)}
                    placeholder="e.g. 3.5"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Self-Reported Stress Tier
                  </label>
                  <select
                    value={stress}
                    onChange={(e) => setStress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all cursor-pointer"
                  >
                    <option value="Low">Low Stress</option>
                    <option value="Medium">Medium Stress</option>
                    <option value="High">High Stress</option>
                  </select>
                </div>
              </div>
            </ProfileCard>

            {/* Card 4: Mental Health & Notes */}
            <ProfileCard
              title="Mental Health & Clinical Notes"
              subtitle="Condition history, stress index, and notes"
              icon={Brain}
              badge="Section 04"
              badgeColor="purple"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Stress Rating (1 - 10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    required
                    value={stressScore}
                    onChange={(e) => setStressScore(e.target.value)}
                    placeholder="5.0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Blood Glucose (mg/dL)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={glucoseLevel}
                    onChange={(e) => setGlucoseLevel(e.target.value)}
                    placeholder="90"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Medical / Burnout Condition
                  </label>
                  <select
                    value={medicalCondition}
                    onChange={(e) => setMedicalCondition(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all cursor-pointer"
                  >
                    <option value="No major condition">No major condition</option>
                    <option value="Stress-related fatigue">Stress-related fatigue</option>
                    <option value="Mild fatigue">Mild fatigue</option>
                    <option value="Chronic pain">Chronic pain</option>
                    <option value="Allergies">Allergies</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Medical Notes & Observations
                  </label>
                  <textarea
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    placeholder="Any relevant medical history or notes..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smoker}
                      onChange={(e) => setSmoker(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500"
                    />
                    Nicotine / Tobacco User
                  </label>

<label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alcoholUse}
                      onChange={(e) => setAlcoholUse(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500"
                    />
                    Alcohol User
                  </label>
                </div>
              </div>
            </ProfileCard>

            {/* Card 5: Emergency Contact & Medical Info */}
            <ProfileCard
              title="Emergency Contact & Medical Info"
              subtitle="Critical details shared with responders during an SOS alert"
              icon={ShieldCheck}
              badge="Section 05"
              badgeColor="rose"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:focus:border-rose-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:focus:border-rose-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Blood Group
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:focus:border-rose-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all cursor-pointer"
                  >
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Allergies
                  </label>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g. Peanuts, Penicillin"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:focus:border-rose-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Existing Diseases / Conditions
                  </label>
                  <input
                    type="text"
                    value={existingDiseases}
                    onChange={(e) => setExistingDiseases(e.target.value)}
                    placeholder="e.g. Asthma, Hypertension"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:focus:border-rose-400 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none transition-all"
                  />
                </div>
              </div>
            </ProfileCard>

            {/* Save & Sync Action Bar */}
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 flex items-center justify-between shadow-sm">
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-mono">
                Changes propagate to analytics in real-time
              </span>

              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Sync & Save Vitals
              </button>
            </div>
          </form>

          {/* Feedback Alerts */}
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-4 rounded-2xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-3 shadow-sm">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {showSyncSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-3 shadow-sm">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              Personal wellness vitals updated! Real-time analytics refreshed.
            </div>
          )}
        </div>

        {/* Right Column: Visual Diagnostics Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <HealthCard
            riskScore={riskScore}
            factors={factors}
            healthScore={healthScore}
            bmi={computedBmi()}
            bp={bp}
            sleepHours={Number(sleep) || 7.5}
          />
        </div>
      </div>

      {/* 3. Interactive Hydration, Step Counter, and Mood Tracker Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Daily Water Intake */}
        <ProfileCard
          title="Daily Hydration"
          subtitle="Target: 8 Cups (2.0 Liters)"
          icon={Droplets}
          badge="Hydration"
          badgeColor="blue"
        >
          <div className="text-center py-2 space-y-3">
            <div className="text-4xl font-display font-bold text-slate-900 dark:text-slate-50">
              {waterCups} <span className="text-sm font-light text-slate-400 font-mono">/ 8 Cups</span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-700/60 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-sky-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (waterCups / 8) * 100)}%` }}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => updateWater(-1)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                - 1 Cup
              </button>
              <button
                type="button"
                onClick={() => updateWater(1)}
                className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                + 1 Cup
              </button>
            </div>
          </div>
        </ProfileCard>

        {/* Step Counter */}
        <ProfileCard
          title="Active Step Counter"
          subtitle="Target: 10,000 Steps / Day"
          icon={Dumbbell}
          badge="Movement"
          badgeColor="emerald"
        >
          <div className="space-y-3 py-1">
            <div className="flex justify-between items-baseline">
              <span className="text-3xl font-display font-bold text-slate-900 dark:text-slate-50">
                {stepsCount.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ 10,000 steps</span>
            </div>

            <input
              type="range"
              min="0"
              max="15000"
              step="500"
              value={stepsCount}
              onChange={handleStepsChange}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-100 dark:bg-slate-700 rounded-lg"
            />

            <p className="text-[10px] text-slate-400 dark:text-slate-400 text-center font-mono">
              {stepsCount >= 10000 ? '🎉 Daily Step Goal Achieved!' : `${(10000 - stepsCount).toLocaleString()} steps remaining today`}
            </p>
          </div>
        </ProfileCard>

        {/* Streak & Mood Tracker */}
        <ProfileCard
          title="Mental Mood Logger"
          subtitle={`Streak: ${streakDays} Days 🔥`}
          icon={Brain}
          badge="Wellbeing"
          badgeColor="purple"
        >
          <div className="space-y-3">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-mono font-bold">
              Select Today's State:
            </span>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '🔋', name: 'Energetic' },
                { label: '🌸', name: 'Calm' },
                { label: '🧘', name: 'Relaxed' },
                { label: '☕', name: 'Tired' },
                { label: '⚡', name: 'Stressed' },
                { label: '📉', name: 'Burned' },
                { label: '🤔', name: 'Neutral' },
              ].map((m) => (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => handleMoodSelect(m.name)}
                  title={m.name}
                  className={`py-2 rounded-xl text-base border flex flex-col items-center justify-center transition-all cursor-pointer ${
                    mood === m.name
                      ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/80 dark:border-blue-700 font-bold scale-105 text-blue-600 dark:text-blue-400'
                      : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            <div className="text-center text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1">
              Logged state: <span className="font-bold text-slate-800 dark:text-slate-200">{mood}</span>
            </div>
          </div>
        </ProfileCard>
      </div>

      {/* 4. Recharts Visual Section (Weekly Stress, Sleep History, BMI Trend) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <HealthChart type="stress" extraProp={Number(stressScore) || 5} />
        <HealthChart type="sleep" extraProp={8} />
        <HealthChart type="bmi" extraProp={computedBmi()} />
      </div>

      {/* 5. Anonymized Department Pulse Check */}
      <ProfileCard
        title="Anonymized Department Pulse Check"
        subtitle="100% Encrypted & Aggregated Feedback"
        icon={Smile}
        badge="Privacy Protected"
        badgeColor="emerald"
      >
        <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-5">
          Your individual input is aggregated into departmental wellness indexes without identifying information. Your scores help guide team load balancing.
        </p>

        <form onSubmit={handlePulseSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="md:col-span-1 space-y-2">
              <div className="flex justify-between text-xs font-mono font-medium">
                <span className="text-slate-500 dark:text-slate-400">Stress Rating (1-10)</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{pulseStress}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={pulseStress}
                onChange={(e) => setPulseStress(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-100 dark:bg-slate-700 rounded-lg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Feedback / Workload Notes
              </label>
              <input
                type="text"
                value={pulseFeedback}
                onChange={(e) => setPulseFeedback(e.target.value)}
                placeholder="Share anonymized feedback regarding team workload..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none"
              />
              {pulseFeedbackError && (
                <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  {pulseFeedbackError}
                </p>
              )}
            </div>

            <div className="md:col-span-1">
              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md hover:scale-105 transition-all duration-200 cursor-pointer"
              >
                Submit Anonymized Pulse
              </button>
            </div>
          </div>
        </form>

        {pulseSubmitted && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Thank you! Your feedback has been securely added to aggregated metrics.</span>
            {lastPulseSentiment && (
              <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
                lastPulseSentiment === 'Positive' ? 'bg-emerald-100 text-emerald-800' :
                lastPulseSentiment === 'Negative' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
              }`}>Sentiment: {lastPulseSentiment}</span>
            )}
          </div>
        )}
      </ProfileCard>
    </motion.div>
  );
}
