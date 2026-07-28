import  { useState, useEffect, useMemo, useCallback } from 'react';
import Login from './components/Login';
import SignUp from './components/SignUp';
import ForgotPassword from './components/ForgotPassword'; 
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import * as api from './services/api';

// Initial mock data arrays are empty by default so dashboards render without demo data
const INITIAL_HEALTH_RECORDS = [];

// initial mock data for wellness risks, recommendations, and sentiment analysis
const INITIAL_RISKS = [];

// initial mock data for wellness recommendations and sentiment analysis
const INITIAL_RECOMMENDATIONS = [];

// initial mock data for department sentiment analysis
const INITIAL_SENTIMENTS = [];

export default function App() {
    const [screen, setScreen] = useState('login');
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingSession, setLoadingSession] = useState(true); // New state to indicate session loading
    const [loadingWellnessData, setLoadingWellnessData] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    

// Core Wellness State (Moved from Dashboard)
    const [healthRecords, setHealthRecords] = useState([]);
    const [dailyHabits, setDailyHabits] = useState([]); // New state for daily habits
    const [mentalHealthLogs, setMentalHealthLogs] = useState([]); // New state for mental health logs
    const [risks, setRisks] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [sentimentList, setSentimentList] = useState([]);
    const [performanceData, setPerformanceData] = useState(null); // New state for backend performance analytics
    const [loadingPerformance, setLoadingPerformance] = useState(false); // Loading state for performance data
    const [performanceError, setPerformanceError] = useState(null); // Error state for performance data

    const initialKpis = { // Renamed from kpis to initialKpis for clarity
        participationRate: 78,
        absenteeismRate: 4.2,
        productivityTrend: 'up',
        overallHealthRiskScore: 34,
        programEffectiveness: 82
    }

    // Derived KPIs recalculated whenever healthRecords change (fallback when backend data unavailable)
    const derivedKpis = useMemo(() => {
        if (healthRecords.length === 0) {
            return initialKpis; // Use initialKpis here
        }

        // Calculate derived KPIs based on health records
        const highStressCount = healthRecords.filter(r => r.stressLevel === 'High').length;
        const attentionCount = healthRecords.filter(r => r.healthAssessment === 'Needs Attention').length;
        const calculatedRisk = Math.round(((highStressCount + attentionCount) / (healthRecords.length * 2)) * 100) || 25;
        const participating = healthRecords.filter(r => r.exerciseHoursPerWeek > 0 || r.sleepHoursPerNight > 6).length;
        const calculatedParticipation = Math.round((participating / healthRecords.length) * 100) || 75;
        return {
            participationRate: calculatedParticipation,
            absenteeismRate: attentionCount > 0 ? Number((attentionCount * 1.5 + 2.1).toFixed(1)) : 2.4,
            productivityTrend: highStressCount > healthRecords.length / 2 ? 'stable' : 'up',
            overallHealthRiskScore: calculatedRisk,
            programEffectiveness: Math.max(50, 100 - calculatedRisk)
        };
    }, [healthRecords]); // Removed kpis from dependency array, now uses initialKpis implicitly

    // Memoize handleLogout to prevent unnecessary re-renders in useEffect dependencies
    const handleLogout = useCallback(async () => {
        await api.logout().catch(err => console.error('Logout API call failed:', err));
        setCurrentUser(null);
        localStorage.removeItem('wellness_current_user');
        setScreen('login');
    }, []); // No dependencies, as it only uses setters and localStorage

    // Initialize theme on app mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('wellness_theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark');
        }
    }, []);

    // Check if a user is already logged in from a previous session and verify with backend
    useEffect(() => {
        const checkSession = async () => {
            setLoadingSession(true);
            try {
                const savedUser = localStorage.getItem('wellness_current_user');
                if (savedUser) {
                    // Attempt to verify the session with the backend
                    const response = await api.me();
                    if (response && response.user) {
                        setCurrentUser(response.user);
                        setScreen('dashboard');
                    } else {
                        // Backend didn't return user, session might be invalid
                        console.warn('Backend did not return user info for saved session. Logging out.');
                        handleLogout();
                    }
                } else {
                    // No saved user in localStorage, stay on login screen
                    setScreen('login');
                }
            } catch (err) {
                console.error('Failed to verify user session:', err);
                // If API call fails (e.g., 401 due to expired cookie), log out
                handleLogout();
            } finally {
                setLoadingSession(false);
            }
        };

        checkSession();
    }, [handleLogout]); // Dependency on handleLogout

    // Load wellness data when currentUser changes (and is not null)
    useEffect(() => {
        if (!currentUser)
          return;
    
        const loadPrimaryData = async () => {
            setLoadingWellnessData(true);
            try {
                let userToUpdate = { ...currentUser };
                // 0. If admin, fetch all users for the dropdown
                if (currentUser.role === 'admin') {
                    const users = await api.fetchUsers();
                    // Filter out admin users from allUsers list
                    // setAllUsers(users.filter(u => u.role !== 'admin'));
                    setAllUsers(users);
                }
                // 1. Health Records from the backend
                let loadedHR = await api.fetchHealthRecords();
                if (loadedHR.length === 0) loadedHR = INITIAL_HEALTH_RECORDS;

                // Check if the current user has a record. If not, create and seed one via the API.
                const userEmpId = currentUser.employeeId;
                const userHasRecord = loadedHR.some((r) => r.employeeId === userEmpId);
                if (!userHasRecord && currentUser.role !== 'admin') {
                    const newUserHR = {
                        // id will be assigned by the backend
                        employeeId: userEmpId,
                        employeeName: currentUser.name,
                        department: 'Engineering', // Default for dropdown
                        age: 30, // Default age
                        gender: 'Male', // Default gender
                        heightCm: 170, // Default height
                        weightKg: 70, // Default weight
                        bmi: 24.2, // Calculated from default height/weight
                        bloodPressure: '120/80', // Default BP
                        bloodPressureSystolic: 120,
                        bloodPressureDiastolic: 80,
                        exerciseHoursPerWeek: 3.5, // Default exercise
                        exerciseDaysPerWeek: 3, // Default exercise days
                        sleepHoursPerNight: 7, // Default sleep
                        stressLevel: 'Medium', // Default for dropdown
                        stressScore: 5, // Default stress score
                        attendanceRate: 95, // Default attendance
                        medicalNotes: 'No major concerns', // Default
                        medicalCondition: 'No major condition', // Default
                        smoker: false, // Default
                        alcoholUse: false, // Default
                        glucoseLevel: 90, // Default
                        healthAssessment: 'Fair', // Neutral default for derived field
                        lastUpdated: new Date().toISOString().split('T')[0]
                    };
                    // This will add the record to the database and return it
                    const addedRecord = await api.addHealthRecord(newUserHR);
                    loadedHR = [addedRecord, ...loadedHR];
                    userToUpdate.hasRecord = true; // Mark that user now has a record
                }
                setHealthRecords(loadedHR);

                // Fetch all sentiment pulses and attach them to the corresponding health records
                if (currentUser.role === 'admin') {
                    const allPulses = await api.fetchAllSentimentPulses();
                    const recordsWithFeedback = loadedHR.map(record => {
                        const feedbackLogs = allPulses
                            .filter(pulse => pulse.employeeId === record.employeeId)
                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                            .slice(0, 3); // Get latest 3
                        return { ...record, feedbackLogs };
                    });
                    setHealthRecords(recordsWithFeedback);
                }

                // 2. Daily Habits for the current user
                if (!userEmpId) {
                  console.warn("Missing employeeId for current user", currentUser);
                } else {
                    let loadedDH = null;
                    try {
                        loadedDH = await api.fetchDailyHabits(userEmpId);
                    } catch (err) {
                        if (err.status === 404) { // No record found, create one
                            const newDailyHabit = {
                                employeeId: userEmpId,
                                waterCups: 0,
                                stepsCount: 0,
                                lastUpdated: new Date().toISOString().split('T')[0]
                            };
                            loadedDH = await api.addDailyHabit(newDailyHabit);
                        } else {
                            throw err; // Re-throw other errors
                        }
                    }
                    setDailyHabits(loadedDH ? [loadedDH] : []); // Store as an array for consistency

                    // 3. Mental Health Logs for the current user (today's log)
                    let loadedMHL = null;
                    try {
                        loadedMHL = await api.fetchMentalHealthLogs(userEmpId);
                    } catch (err) {
                        if (err.status === 404) { // No record found for today, create one
                            const newMentalHealthLog = {
                                employeeId: userEmpId,
                                mood: 'Neutral', // Default mood
                                stressLevel: 5, // Default stress
                                feedback: '',
                                streakDays: 0, // Initial streak
                                date: new Date().toISOString().split('T')[0]
                            };
                            loadedMHL = await api.addMentalHealthLog(newMentalHealthLog);
                        } else {
                            throw err; // Re-throw other errors
                        }
                    }
                    setMentalHealthLogs(loadedMHL ? [loadedMHL] : []); // Store as an array for consistency
                }
            } catch (error) {
                console.error("Failed to load primary wellness data:", error);
                // If the token has expired, log the user out to show the login screen.
                if (error.status === 401) {
                    handleLogout();
                }
            } finally {
                setLoadingWellnessData(false);
            }
        };
    
const loadSecondaryData = async () => {
            try {
                const loadedRisks = await api.fetchRisks();
                setRisks(loadedRisks || []);
                const loadedRecommendations = await api.fetchRecommendations();
                setRecommendations(loadedRecommendations || []);
                // Only admins can fetch sentiment data (the endpoint is admin-only)
                if (currentUser?.role === 'admin') {
                    const loadedSentiments = await api.fetchSentiments();
                    setSentimentList(loadedSentiments || []);

                    // Also load performance analytics from backend
                    setLoadingPerformance(true);
                    setPerformanceError(null);
                    try {
                        const perfData = await api.fetchPerformanceAnalytics();
                        setPerformanceData(perfData);
                    } catch (perfErr) {
                        console.error("Failed to load performance analytics:", perfErr);
                        setPerformanceError(perfErr.message || 'Failed to load performance analytics');
                        setPerformanceData(null);
                    } finally {
                        setLoadingPerformance(false);
                    }
                }
            } catch (error) {
                console.error("Failed to load secondary wellness data (risks, recs):", error);
            }
        };
    
        // Keep loading=true until BOTH primary and secondary data loads complete
        loadPrimaryData()
            .then(() => loadSecondaryData())
            .finally(() => setLoadingWellnessData(false));
    }, [currentUser, handleLogout]);

    // Event Handlers for User Actions
    const handleAddHealthRecord = async (newRecord) => {
        const addedRecord = await api.addHealthRecord(newRecord);
        setHealthRecords([addedRecord, ...healthRecords]);

        // Recompute Module 2 diagnostics from updated health_records
        const loadedRisks = await api.fetchRisks();
        setRisks(loadedRisks || []);
    };

    // Update a specific user's health record and persist changes
    const handleUpdateUserRecord = async (updatedRecord) => {
        try {
            await api.updateHealthRecord(updatedRecord);
            setHealthRecords(healthRecords.map(r => r.employeeId === updatedRecord.employeeId ? updatedRecord : r));

            // Recompute Module 2 diagnostics from updated health_records
            const loadedRisks = await api.fetchRisks();
            setRisks(loadedRisks || []);
        } catch (err) {
            console.error('Failed to update health record:', err);
            throw err; // Re-throw so the calling code (AdminDashboard) can catch and display the error
        }
    };

    // Add a new daily habit record
    const handleAddDailyHabit = async (newHabit) => {
        const addedHabit = await api.addDailyHabit(newHabit);
        setDailyHabits([addedHabit]); // Assuming only one daily habit record per user
    };

    // Update an existing daily habit record
    const handleUpdateDailyHabit = async (updatedHabit) => {
        await api.updateDailyHabit(updatedHabit);
        setDailyHabits([updatedHabit]); // Assuming only one daily habit record per user
    };

    // Add a new mental health log record
    const handleAddMentalHealthLog = async (newLog) => {
        const addedLog = await api.addMentalHealthLog(newLog);
        setMentalHealthLogs([addedLog]); // Assuming only one log per day per user
    };

    // Update an existing mental health log record
    const handleUpdateMentalHealthLog = async (updatedLog) => {
        await api.updateMentalHealthLog(updatedLog);
        setMentalHealthLogs([updatedLog]); // Assuming only one log per day per user
    };

    // Delete a health record and persist changes
    const handleDeleteHealthRecord = async (employeeId) => {
        await api.deleteHealthRecord(employeeId);
        setHealthRecords(healthRecords.filter(r => r.employeeId !== employeeId));
        // After deleting a record, re-fetch all users to update the 'users without records' list
        if (currentUser.role === 'admin') {
            setAllUsers(await api.fetchUsers());
        }
    };

    // Update department sentiment pulse based on new feedback and persist changes
    const handleUpdateSentimentPulse = async (deptName, stressScore, feedbackText) => {
      try {
        // 1. Call the backend endpoint to record the pulse. This writes to MongoDB.
        await api.submitSentimentPulse(deptName, stressScore, feedbackText);
  
        // 2. For immediate UI feedback, re-fetch the aggregated sentiment data.
        // This is more reliable than trying to replicate the aggregation logic on the client.
        if (currentUser?.role === 'admin') {
            const loadedSentiments = await api.fetchSentiments();
            setSentimentList(loadedSentiments || []);
        }
      } catch (error) {
        console.error("Failed to submit sentiment pulse:", error);
      }
    };

    const handleUpdateAvatar = async (file) => {
        try {
            const response = await api.uploadAvatar(file);
            if (response && response.user) {
                setCurrentUser(response.user);
                localStorage.setItem('wellness_current_user', JSON.stringify(response.user));
                setIsProfileModalOpen(false); // Close modal on success
            }
        } catch (error) {
            console.error("Failed to upload avatar:", error);
            // You could set an error state here to show in the modal
        }
    };
    // Navigation and Authentication Handlers
    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
        localStorage.setItem('wellness_current_user', JSON.stringify(user));
        setScreen('dashboard');
    };

    // Handle successful sign-up by redirecting to login screen
    const handleSignUpSuccess = (user) => {
        setScreen('login');
    };

    // Navigation handler to switch between screens
    const handleNavigate = (targetScreen) => {
        setScreen(targetScreen);
    };

    // Render the appropriate screen based on current state
    return (
        // Render a loading screen while checking session
        // This ensures that the UI doesn't flash login/dashboard before session is verified
        loadingSession ? (
            <div className="min-h-screen flex items-center justify-center bg-[#050505] text-[#e0e0e0]">
                <p>Loading session...</p>
            </div>
        ) : (
        <div className="min-h-screen font-sans bg-[#050505] text-[#e0e0e0]">
            
            {screen === 'login' && (<Login onNavigate={handleNavigate}
                onLoginSuccess={handleLoginSuccess} />)}

            {screen === 'signup' && (<SignUp onNavigate={handleNavigate}
                onSignUpSuccess={handleSignUpSuccess} />)}

            {screen === 'forgot_password' && (<ForgotPassword
                onNavigate={handleNavigate} />)}

            {screen === 'dashboard' && currentUser && (currentUser.role === 'admin' ?
                (<AdminDashboard
                    user={currentUser}
                    onLogout={handleLogout}
                    allUsers={allUsers}
                    healthRecords={healthRecords}
                    risks={risks}
                    recommendations={recommendations}
                    sentimentList={sentimentList}
                    kpis={derivedKpis}
                    loading={loadingWellnessData}
                    onAddHealthRecord={handleAddHealthRecord}
                    isProfileModalOpen={isProfileModalOpen}
                    setIsProfileModalOpen={setIsProfileModalOpen}
                    onUpdateAvatar={handleUpdateAvatar}
                    onUserUpdate={setCurrentUser}
                    onDeleteHealthRecord={handleDeleteHealthRecord}
                    onUpdateHealthRecord={handleUpdateUserRecord}
                    performanceData={performanceData}
                    loadingPerformance={loadingPerformance}
                    performanceError={performanceError}
                     />)
                :
                (<UserDashboard
                    user={currentUser}
                    onLogout={handleLogout}
                    healthRecords={healthRecords}
                    risks={risks}
                    dailyHabits={dailyHabits} // Pass new state
                    onAddDailyHabit={handleAddDailyHabit} // Pass new handler
                    onUpdateDailyHabit={handleUpdateDailyHabit} // Pass new handler
                    mentalHealthLogs={mentalHealthLogs} // Pass new state
                    onAddMentalHealthLog={handleAddMentalHealthLog}
                    onUpdateMentalHealthLog={handleUpdateMentalHealthLog}
                    onAddRecord={handleAddHealthRecord}
                    onAddHealthRecord={handleAddHealthRecord} // Pass the add handler
                    onUpdateUserRecord={handleUpdateUserRecord}
                    onUpdateSentimentPulse={handleUpdateSentimentPulse}
                    recommendations={recommendations}
                    isProfileModalOpen={isProfileModalOpen}
                    setIsProfileModalOpen={setIsProfileModalOpen}
                    onUpdateAvatar={handleUpdateAvatar}
                    onUserUpdate={setCurrentUser}
                    loading={loadingWellnessData}
                />)
            )}
        </div>
        )
    );
}