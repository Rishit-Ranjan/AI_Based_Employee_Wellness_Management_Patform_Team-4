import  { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import Login from './components/Login';
import SignUp from './components/SignUp';
import ForgotPassword from './components/ForgotPassword'; 
import * as api from './services/api';

const UserDashboard = lazy(() => import('./components/UserDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
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
    const [loadingRecommendations, setLoadingRecommendations] = useState(true);
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

        const loadAllData = async (forceRefresh = false) => {
            // --- Stage 1: Load absolutely critical data for initial render ---
            setLoadingWellnessData(true);
            try {
                const userEmpId = currentUser.employeeId;
                const options = { forceRefresh };
                
                // Fetch only the most essential data first: records and users.
                const [records, users] = await Promise.all([
                    api.fetchHealthRecords(options),
                    currentUser.role === 'admin' ? api.fetchUsers(options) : Promise.resolve([])
                ]);

                let loadedHR = records || [];
                const userHasRecord = loadedHR.some((r) => r.employeeId === userEmpId);

                if (!userHasRecord && currentUser.role !== 'admin') {
                    const newRecord = { employeeId: userEmpId, employeeName: currentUser.name, isNew: true };
                    api.addHealthRecord(newRecord).catch(err => console.error("Failed to create health record in background:", err));
                    loadedHR = [newRecord, ...loadedHR];
                }

                // Set state for the initial, fastest data.
                setHealthRecords(loadedHR);
                if (currentUser.role === 'admin') {
                    setAllUsers(users || []);
                }

            } catch (error) {
                console.error("Failed to load primary wellness data:", error);
                if (error.status === 401) handleLogout();
            } finally {
                setLoadingWellnessData(false);
            }

            // --- Stage 2: Load other "fast" data in the background without blocking UI ---
            const options = { forceRefresh };
            const userEmpId = currentUser.employeeId;
            
            if (currentUser.role === 'admin') {
                const [allPulses, risksData] = await Promise.all([
                    api.fetchAllSentimentPulses(options),
                    api.fetchRisks(options)
                ]);

                // Attach feedback logs once they are available
                const pulsesByEmployee = new Map();
                (allPulses || []).forEach(pulse => {
                    if (!pulsesByEmployee.has(pulse.employeeId)) {
                        pulsesByEmployee.set(pulse.employeeId, []);
                    }
                    pulsesByEmployee.get(pulse.employeeId).push(pulse);
                });
                setHealthRecords(prevRecords => prevRecords.map(record => ({
                    ...record,
                    feedbackLogs: (pulsesByEmployee.get(record.employeeId) || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                })));
                setRisks(risksData || []);
            } else {
                // For regular users, fetch their specific data
                api.fetchRisks(options).then(risksData => setRisks(risksData || []));

                // Fetch the employee's own sentiment pulses and attach them as feedbackLogs
                // to their health record so they can view their own mental health & sentiment.
                api.fetchEmployeeSentimentPulses(userEmpId, options)
                    .then(pulses => {
                        setHealthRecords(prevRecords => prevRecords.map(record => {
                            if (record.employeeId !== userEmpId) return record;
                            return {
                                ...record,
                                feedbackLogs: (pulses || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                            };
                        }));
                    })
                    .catch(err => console.error("Failed to fetch employee sentiment pulses:", err));
            }

            // --- Stage 3: Load slower, AI-driven data in the background ---
            try {
                if (currentUser.role === 'admin') {
                    setLoadingRecommendations(true);
                    setLoadingPerformance(true);
                    setPerformanceError(null);
                    const [recsData, perfData] = await Promise.all([
                        api.fetchRecommendations(options),
                        api.fetchPerformanceAnalytics(options)
                    ]);
                    setRecommendations(recsData || []);
                    setPerformanceData(perfData);
                    setLoadingPerformance(false);

                    // Fetch department sentiment separately so a failure here
                    // does not block the rest of the performance analytics.
                    try {
                        const sentimentsData = await api.fetchSentiments(options);
                        setSentimentList(sentimentsData || []);
                    } catch (sentErr) {
                        console.error("Failed to fetch department sentiments:", sentErr);
                        setSentimentList([]);
                    }
                } else {
                    setLoadingRecommendations(true);
                    
                    // Fetch habits and logs
                    Promise.all([
                        api.fetchDailyHabits(userEmpId, options).then(h => h || api.addDailyHabit({ employeeId: userEmpId })),
                        api.fetchMentalHealthLogs(userEmpId, options).then(m => m || api.addMentalHealthLog({ employeeId: userEmpId }))
                    ]).then(([habits, mentalLogs]) => {
                        setDailyHabits(habits ? [habits] : []);
                        setMentalHealthLogs(mentalLogs ? [mentalLogs] : []);
                    }).catch(err => {
                        console.warn("Could not load habits or mental health logs:", err);
                    });

                    // Fetch recommendations separately to ensure they always load
                    api.fetchRecommendations(options)
                        .then(recsData => {
                            setRecommendations(recsData || []);
                        })
                        .catch(err => {
                            console.error("Failed to fetch recommendations:", err);
                            setRecommendations([]); // Set to empty array on error
                        });
                }
                if (currentUser.role !== 'admin') {
                }
            } catch (error) {
                console.error("Failed to load secondary wellness data:", error);
                setPerformanceError(error.message || 'Failed to load data');
            } finally {
                setLoadingRecommendations(false);
            }
        };

        // On initial load for a user, force a refresh. Subsequent renders will use the cache.
        loadAllData(true);
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

            // Re-fetch recommendations as they might change based on the updated record
            const recsData = await api.fetchRecommendations({ forceRefresh: true });
            setRecommendations(recsData || []);
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
    const handleUpdateSentimentPulse = async (employeeId, deptName, stressScore, feedbackText) => {
      try {
        // 1. Call the backend endpoint to record the pulse. This writes to MongoDB.
        const result = await api.submitSentimentPulse(employeeId, deptName, stressScore, feedbackText);
  
// 2. For immediate UI feedback on the admin dashboard, re-fetch all data.
        if (currentUser?.role === 'admin') {
            // Re-fetch aggregated sentiments for the department-level card (forceRefresh to bypass GET cache)
            api.fetchSentiments({ forceRefresh: true }).then(sentiments => setSentimentList(sentiments || []));

            // Re-fetch all individual pulses and re-attach them to health records for the individual cards
            const allPulses = await api.fetchAllSentimentPulses({ forceRefresh: true });
            setHealthRecords(prevRecords => {
                return prevRecords.map(record => {
                    const feedbackLogs = allPulses.filter(pulse => pulse.employeeId === record.employeeId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    return { ...record, feedbackLogs };
                });
            });
        } else if (currentUser?.employeeId === employeeId) {
            // For an employee, refresh their own sentiment pulses so the employee
            // dashboard's "My Mental Health & Sentiment" section updates immediately.
            const pulses = await api.fetchEmployeeSentimentPulses(employeeId, { forceRefresh: true });
            setHealthRecords(prevRecords => prevRecords.map(record => {
                if (record.employeeId !== employeeId) return record;
                return {
                    ...record,
                    feedbackLogs: (pulses || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                };
            }));
        }
        return result; // Return the result which contains the sentiment
      } catch (error) {
        console.error("Failed to submit sentiment pulse:", error);
        throw error; // re-throw to be caught in the component
      }
    };

    const handlePulseDeleted = () => {
      // Force a refresh of sentiment data when a pulse is deleted by an admin
      api.fetchSentiments({ forceRefresh: true }).then(sentiments => setSentimentList(sentiments || []));
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

            {screen === 'dashboard' && currentUser && (
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#050505] text-[#e0e0e0]"><div>Loading Dashboard...</div></div>}>
                    {currentUser.role === 'admin' ?
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
                            onPulseDeleted={handlePulseDeleted}
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
                            loading={loadingWellnessData || loadingRecommendations}
                        />)
                    }
                </Suspense>
            )}
        </div>
        )
    );
}