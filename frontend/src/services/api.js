const API_BASE = '/api'; // Use Vite proxy in development

async function request(path, opts = {}) {
  const headers = { ...opts.headers };

  // Only set Content-Type if it's not explicitly set to null (for FormData)
  if (headers['Content-Type'] !== null) {
    headers['Content-Type'] = 'application/json';
  } else {
    delete headers['Content-Type']; // Remove it completely for FormData
  }

  const res = await fetch(API_BASE + path, {
    credentials: 'include',
    ...opts, // Spread the original options
    headers, // Use the modified headers
  });

  if (!res.ok) {
    let body = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }

    console.error('API error:', {
      url: API_BASE + path,
      status: res.status,
      body,
    });

    const message =
      body?.message ||
      body?.detail ||
      body?.msg ||
      res.statusText ||
      'Request failed';

    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  if (res.status === 204) {
    return { success: true };
  }

  try {
    return await res.json();
  } catch {
    return { success: true };
  }
}

// --- Auth API ---

export function login(email, password, role, entityId) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role, entityId }) });
}

export function signup(name, email, password) {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export function me() { return request('/auth/me'); }

export function forgotPassword(email, method = 'otp') {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email, method }),
  });
}

export function resetPassword({ email, newPassword, otp, resetToken }) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email,
      newPassword,
      otp,
      resetToken,
    }),
  });
}

export function logout() {
  return request('/auth/logout', { method: 'POST' });
}

/**
 * Fetches all employee users. Admin-only.
 * @returns {Promise<Array<Object>>} A promise that resolves to the list of users.
 */
export const fetchUsers = () => request('/users');

/**
 * Uploads a new avatar for the current user.
 * @param {File} file The image file to upload.
 * @returns {Promise<Object>} A promise that resolves to the updated user object.
 */
export const uploadAvatar = (file) => {
  const formData = new FormData();
  formData.append('avatar', file);
  return request('/users/avatar', { method: 'POST', body: formData, headers: { 'Content-Type': null } }); // Let browser set Content-Type for FormData
};

// --- Wellness API ---

/**
 * Fetches all health records from the backend.
 * @returns {Promise<Array<Object>>} A promise that resolves to the list of health records.
 */
export const fetchHealthRecords = () => request('/wellness/health-records');

/**
 * Adds a new health record via the backend.
 * @param {Object} newRecord The new health record to add.
 * @returns {Promise<Object>} A promise that resolves to the added record.
 */
export const addHealthRecord = (newRecord) => request('/wellness/health-records', {
    method: 'POST',
    body: JSON.stringify(newRecord),
});

/**
 * Updates an existing health record for a user via the backend.
 * @param {Object} updatedRecord The record with updated information.
 * @returns {Promise<Object>} A promise that resolves to the updated record.
 */
export const updateHealthRecord = (updatedRecord) => request(`/wellness/health-records/${updatedRecord.employeeId}`, {
    method: 'PUT',
    body: JSON.stringify(updatedRecord),
});

/**
 * Deletes a health record via the backend.
 * @param {string} employeeId The ID of the employee record to delete.
 * @returns {Promise<Object>} A promise that resolves on successful deletion.
 */
export const deleteHealthRecord = (employeeId) => request(`/wellness/health-records/${employeeId}`, { method: 'DELETE' });

/**
 * Fetches all wellness risk predictions from the backend.
 * @returns {Promise<Array<Object>>} A promise that resolves to the list of risk profiles.
 */
export const fetchRisks  = () => request('/wellness/risks');

// --- Daily Habits API ---
export const fetchDailyHabits = (employeeId) => request(`/wellness/daily-habits/${employeeId}`);
export const addDailyHabit = (habitData) => request('/wellness/daily-habits', {
  method: 'POST',
  body: JSON.stringify(habitData),
});
export const updateDailyHabit = (habitData) => request(`/wellness/daily-habits/${habitData.employeeId}`, {
  method: 'PUT',
  body: JSON.stringify(habitData),
});

// --- Mental Health Logs API ---
export const fetchMentalHealthLogs = (employeeId) => request(`/wellness/mental-health-logs/${employeeId}`);
export const addMentalHealthLog = (logData) => request('/wellness/mental-health-logs', {
  method: 'POST',
  body: JSON.stringify(logData),
});
export const updateMentalHealthLog = (logData) => request(`/wellness/mental-health-logs/${logData.employeeId}`, {
  method: 'PUT',
  body: JSON.stringify(logData),
});

// --- LocalStorage helpers for non-persistent prototype data ---
const getFromStorage = (key, defaultValue) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key "${key}":`, error);
        return defaultValue;
    }
};

const saveToStorage = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Error saving to localStorage key "${key}":`, error);
    }
};

export const fetchRecommendations = async () => {
  const response= await request('/wellness/recommendations');
  return response;
}

/**
 * Requests an alternative video URL when a recommended video is unavailable.
 * @param {string} category - The recommendation category (e.g., 'Fitness', 'Mental Wellness')
 * @param {string} unavailableUrl - The YouTube URL that failed
 * @param {string} riskLabel - The user's risk level ('High', 'Medium', 'Low')
 * @returns {Promise<{alternativeUrl: string, category: string, note: string}>}
 */
export const fetchAlternativeVideo = async (category, unavailableUrl, riskLabel = 'Low') => {
  return request('/wellness/recommendation-media/fallback', {
    method: 'POST',
    body: JSON.stringify({ category, unavailableUrl, riskLabel }),
  });
};

// New function to fetch sentiment data
export const fetchSentiments = () => request('/wellness/sentiments');

// New function to fetch all individual sentiment pulses (admin)
export const fetchAllSentimentPulses = () => request('/wellness/sentiment-pulse/all');

/**
 * Fetches real-time performance analytics KPIs from the backend.
 * Admin-only endpoint that computes metrics from MongoDB collections.
 * @returns {Promise<Object>} A promise resolving to { kpis, departmentDetails, burnoutTrend }
 */
export const fetchPerformanceAnalytics = () => request('/wellness/performance');

/**
 * Submits an anonymized department pulse check.
 * @param {string} department The department name.
 * @param {number} stressScore The reported stress score (1-10).
 * @param {string} feedbackText Optional feedback text.
 * @returns {Promise<Object>} A promise that resolves on successful submission.
 */
export const submitSentimentPulse = (employeeId, department, stressScore, feedbackText) => {
  return request('/wellness/sentiment-pulse', {
    method: 'POST',
    body: JSON.stringify({ employeeId, department, stressScore, feedbackText }),
  });
};

export const saveSentiments = (sentimentsData) => saveToStorage('wellness_sentiments', sentimentsData);

// --- Profile / Account ---
export const updateProfile = (data) => request('/auth/profile', {
  method: 'PUT',
  body: JSON.stringify(data),
});
export const changePassword = (currentPassword, newPassword) => request('/auth/change-password', {
  method: 'PUT',
  body: JSON.stringify({ currentPassword, newPassword }),
});

// --- Check-ups ---
export const fetchCheckups = (isAdmin = false) => request(`/checkups${isAdmin ? '?all=true' : ''}`);
export const bookCheckup = (data) => request('/checkups', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const deleteCheckup = (id) => request(`/checkups/${id}`, { method: 'DELETE' });
export const updateCheckup = (id, data) => request(`/checkups/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});

// --- SOS / Emergency ---
export const triggerSos = (message) => request('/sos', {
  method: 'POST',
  body: JSON.stringify({ message }),
});
export const fetchSosAlerts = () => request('/sos');
export const resolveSos = (id) => request(`/sos/${id}/resolve`, { method: 'PUT' });

// --- Health Expenses ---
export const fetchExpenses = (isAdmin = false) => request(`/expenses${isAdmin ? '?all=true' : ''}`);
export const addExpense = (data) => request('/expenses', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const deleteExpense = (id) => request(`/expenses/${id}`, { method: 'DELETE' });
export const updateExpense = (id, status) => request(`/expenses/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ status }),
});

// --- Insurance ---
export const fetchAllInsurance = () => request('/insurance');
export const saveInsurance = (data) => request('/insurance', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const fetchInsurance = (employeeId) => request(`/insurance/${employeeId}`);
export const updateInsuranceClaim = (employeeId, claimId, status) => request(`/insurance/${employeeId}/claims/${claimId}`, {
  method: 'PUT',
  body: JSON.stringify({ status }),
});
export const fileInsuranceClaim = (employeeId, data) => request(`/insurance/${employeeId}/claims`, {
  method: 'POST',
  body: JSON.stringify(data),
});

// --- Notifications ---
export const fetchNotifications = (isAdmin = false) => request(`/notifications${isAdmin ? '?all=true' : ''}`);
export const sendNotification = (data) => request('/notifications', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const deleteNotification = (id) => request(`/notifications/${id}`, { method: 'DELETE' });
export const markNotificationRead = (id) => request(`/notifications/${id}/read`, { method: 'PUT' });

// --- Diet Plan ---
export const generateDietPlan = (dietType) => request('/diet-plan', {
  method: 'POST',
  body: JSON.stringify({ dietType }),
});

// --- Goals & Achievements ---
export const fetchGoals = (employeeId) => request(`/goals/${employeeId}`);
export const createGoal = (data) => request('/goals', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const updateGoal = (goalId, data) => request(`/goals/${goalId}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});
export const deleteGoal = (goalId) => request(`/goals/${goalId}`, { method: 'DELETE' });
export const fetchAchievements = (employeeId) => request(`/achievements/${employeeId}`);

// --- Reports / Health History ---
export const fetchHealthHistory = (employeeId) => request(`/wellness/health-history/${employeeId}`);
export const downloadHealthReportPdf = async (employeeId) => {
  const res = await fetch(`${API_BASE}/reports/health-report/${employeeId}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const err = new Error('Failed to download report');
    err.status = res.status;
    throw err;
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `health-report-${employeeId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

// --- Performance Analytics API ---

// --- AI Wellness Service API ---
export const sendAiChatMessage = (employeeId, message) => request('/ai/chat', {
  method: 'POST',
  body: JSON.stringify({ employeeId, message }),
});

export const fetchAiInsights = (employeeId) => request(`/ai/insights/${employeeId}`);

export const fetchBurnoutTrend = (department) => {
  const params = department ? `?department=${encodeURIComponent(department)}` : '';
  return request(`/ai/burnout-trend${params}`);
};

export const generateAiRoutine = (employeeId, preferences = {}) => request('/ai/routine', {
  method: 'POST',
  body: JSON.stringify({ employeeId, preferences }),
});

// --- Updated Default Export ---
export default {
  login, signup, me, logout, forgotPassword, resetPassword,
  fetchUsers, uploadAvatar, updateProfile, changePassword,
  fetchHealthRecords, addHealthRecord, updateHealthRecord, deleteHealthRecord,
  fetchRisks, fetchRecommendations, fetchSentiments, saveSentiments, submitSentimentPulse,
  fetchDailyHabits, addDailyHabit, updateDailyHabit,
  fetchMentalHealthLogs, addMentalHealthLog, updateMentalHealthLog,
  fetchCheckups, bookCheckup, deleteCheckup, updateCheckup,
  triggerSos, fetchSosAlerts, resolveSos,
  fetchExpenses, addExpense, deleteExpense, updateExpense,
  fetchAllInsurance, saveInsurance, updateInsuranceClaim,
  fetchInsurance, fileInsuranceClaim,
  fetchNotifications, sendNotification, deleteNotification, markNotificationRead,
  generateDietPlan,
  fetchGoals, createGoal, updateGoal, deleteGoal, fetchAchievements,
  fetchHealthHistory, downloadHealthReportPdf,
  fetchPerformanceAnalytics,
};
