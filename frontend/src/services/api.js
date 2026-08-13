const API_BASE = '/api'; // Use Vite proxy in development

// Simple in-memory cache for GET requests
const apiCache = new Map();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function request(path, opts = {}) {
  const { forceRefresh, retries = 3, ...fetchOptions } = opts;

  for (let i = 0; i < retries; i++) {
    try {
      return await attemptRequest(path, { forceRefresh, ...fetchOptions });
    } catch (err) {
      // Only retry on network errors (like ECONNREFUSED)
      if (err.message.includes('Failed to fetch') || err.status === 504) {
        if (i < retries - 1) { // Ensure we don't retry on the last attempt
          console.log(`[API] Request failed, retrying in ${1000 * (i + 1)}ms... (${i + 1}/${retries - 1})`);
          await sleep(1000 * (i + 1)); // Exponential backoff
          continue;
        }
      }
      throw err; // Re-throw other errors or if retries are exhausted
    }
  }
}
async function attemptRequest(path, opts = {}) {
  const { forceRefresh, ...fetchOptions } = opts;
  const headers = { ...opts.headers };

  // Only set Content-Type if it's not explicitly set to null (for FormData)
  if (headers['Content-Type'] !== null) {
    headers['Content-Type'] = 'application/json';
  } else {
    delete headers['Content-Type']; // Remove it completely for FormData
  }

  // Use cache for GET requests unless forceRefresh is true
  if (fetchOptions.method === 'GET' || !fetchOptions.method) {
    if (!forceRefresh && apiCache.has(path)) {
      return Promise.resolve(apiCache.get(path));
    }
  } else {
    // Clear cache on any non-GET request (mutation)
    apiCache.clear();
  }

  const res = await fetch(API_BASE + path, {
    credentials: 'include',
    ...fetchOptions, // Use the modified options
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
    const data = await res.json();
    // Cache the successful GET response
    if (fetchOptions.method === 'GET' || !fetchOptions.method) {
      apiCache.set(path, data);
    }
    return data;
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
 * Deletes a user and all their associated data. Admin-only.
 * @param {string} employeeId The ID of the employee to delete.
 * @returns {Promise<Object>} A promise that resolves on successful deletion.
 */
export const deleteUser = (employeeId) => request(`/users/${employeeId}`, { method: 'DELETE' });
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
export const fetchHealthRecords = (options) => request('/wellness/health-records', { method: 'GET', ...options });

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
export const fetchRisks  = (options) => request('/wellness/risks', { method: 'GET', ...options });

// --- Daily Habits API ---
export const fetchDailyHabits = (employeeId, options) => request(`/wellness/daily-habits/${employeeId}`, { method: 'GET', ...options });
export const addDailyHabit = (habitData) => request('/wellness/daily-habits', {
  method: 'POST',
  body: JSON.stringify(habitData),
});
export const updateDailyHabit = (habitData) => request(`/wellness/daily-habits/${habitData.employeeId}`, {
  method: 'PUT',
  body: JSON.stringify(habitData),
});

// --- Mental Health Logs API ---
export const fetchMentalHealthLogs = (employeeId, options) => request(`/wellness/mental-health-logs/${employeeId}`, { method: 'GET', ...options });
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

export const fetchRecommendations = async (options) => {
  const response= await request('/wellness/recommendations', { method: 'GET', ...options });
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
export const fetchSentiments = (options) => request('/wellness/sentiments', { method: 'GET', ...options });

// New function to fetch all individual sentiment pulses (admin)
export const fetchAllSentimentPulses = (options) => request('/wellness/sentiment-pulse/all', { method: 'GET', ...options });

/**
 * Fetches the sentiment pulses belonging to a single employee.
 * Allowed for the employee themselves or an admin.
 * @param {string} employeeId The employee's ID.
 * @param {Object} options Request options (e.g. forceRefresh).
 * @returns {Promise<Array<Object>>} A promise resolving to the employee's sentiment pulses.
 */
export const fetchEmployeeSentimentPulses = (employeeId, options) => request(`/wellness/sentiment-pulse/${employeeId}`, { method: 'GET', ...options });

/**
 * Fetches real-time performance analytics KPIs from the backend.
 * Admin-only endpoint that computes metrics from MongoDB collections.
 * @returns {Promise<Object>} A promise resolving to { kpis, departmentDetails, burnoutTrend }
 */
export const fetchPerformanceAnalytics = (options) => request('/wellness/performance', { method: 'GET', ...options });

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

/**
 * Deletes a single sentiment pulse. Admin-only.
 * @param {string} pulseId The ID of the pulse to delete.
 * @returns {Promise<Object>} A promise that resolves on successful deletion.
 */
export const deleteSentimentPulse = (pulseId) => request(`/wellness/sentiment-pulse/${pulseId}`, { method: 'DELETE' });

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
export const fetchCheckups = (isAdmin = false, options) => request(`/checkups${isAdmin ? '?all=true' : ''}`, { method: 'GET', ...options });
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
export const fetchSosAlerts = (options) => request('/sos', { method: 'GET', ...options });
export const resolveSos = (id) => request(`/sos/${id}/resolve`, { method: 'PUT' });

// --- Health Expenses ---
export const fetchExpenses = (isAdmin = false, options) => request(`/expenses${isAdmin ? '?all=true' : ''}`, { method: 'GET', ...options });
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
export const fetchAllInsurance = (options) => request('/insurance', { method: 'GET', ...options });
export const saveInsurance = (data) => request('/insurance', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const fetchInsurance = (employeeId, options) => request(`/insurance/${employeeId}`, { method: 'GET', ...options });
export const updateInsuranceClaim = (employeeId, claimId, status) => request(`/insurance/${employeeId}/claims/${claimId}`, {
  method: 'PUT',
  body: JSON.stringify({ status }),
});
export const fileInsuranceClaim = (employeeId, data) => request(`/insurance/${employeeId}/claims`, {
  method: 'POST',
  body: JSON.stringify(data),
});
export const deleteInsurance = (employeeId) => request(`/insurance/${employeeId}`, { method: 'DELETE' });

// --- Notifications ---
export const fetchNotifications = (isAdmin = false, options) => request(`/notifications${isAdmin ? '?all=true' : ''}`, { method: 'GET', ...options });
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
export const fetchGoals = (employeeId, options) => request(`/goals/${employeeId}`, { method: 'GET', ...options });
export const createGoal = (data) => request('/goals', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const updateGoal = (goalId, data) => request(`/goals/${goalId}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});
export const deleteGoal = (goalId) => request(`/goals/${goalId}`, { method: 'DELETE' });
export const fetchAchievements = (employeeId, options) => request(`/achievements/${employeeId}`, { method: 'GET', ...options });

// --- Reports / Health History ---
export const fetchHealthHistory = (employeeId, options) => request(`/wellness/health-history/${employeeId}`, { method: 'GET', ...options });
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
export const sendAiChatMessage = (employeeId, message, model, aiModelName) => request('/ai/chat', {
  method: 'POST',
  body: JSON.stringify({ employeeId, message, model, aiModelName }),
});

export const fetchAiInsights = (employeeId, options) => request(`/ai/insights/${employeeId}`, { method: 'GET', ...options });

export const fetchBurnoutTrend = (department, options) => {
  const params = department ? `?department=${encodeURIComponent(department)}` : '';
  return request(`/ai/burnout-trend${params}`, { method: 'GET', ...options });
};

export const generateAiRoutine = (employeeId, preferences = {}) => request('/ai/routine', {
  method: 'POST',
  body: JSON.stringify({ employeeId, preferences }),
});

// --- System Settings API ---
export const fetchSystemSettings = (options) => request('/settings', { method: 'GET', ...options });
export const saveSystemSettings = (settings) => request('/settings', {
  method: 'PUT',
  body: JSON.stringify(settings),
});

// --- Customer Support API ---
export const submitSupportTicket = (ticketData) => request('/support/ticket', {
  method: 'POST',
  body: JSON.stringify(ticketData),
});
export const fetchSupportTickets = (isAdmin = false, options) => request(`/support/tickets${isAdmin ? '?all=1' : ''}`, { method: 'GET', ...options });
export const updateSupportTicket = (ticketId, status) => request(`/support/tickets/${ticketId}`, {
  method: 'PUT',
  body: JSON.stringify({ status }),
});

// --- Updated Default Export ---
export default {
  login, signup, me, logout, forgotPassword, resetPassword, deleteUser,
  fetchUsers, uploadAvatar, updateProfile, changePassword,
  fetchHealthRecords, addHealthRecord, updateHealthRecord, deleteHealthRecord,
  fetchRisks, fetchRecommendations, fetchSentiments, saveSentiments, submitSentimentPulse,
  deleteSentimentPulse,
  fetchAllSentimentPulses, fetchEmployeeSentimentPulses,
  fetchDailyHabits, addDailyHabit, updateDailyHabit,
  fetchMentalHealthLogs, addMentalHealthLog, updateMentalHealthLog,
  fetchCheckups, bookCheckup, deleteCheckup, updateCheckup,
  triggerSos, fetchSosAlerts, resolveSos,
  fetchExpenses, addExpense, deleteExpense, updateExpense,
  fetchAllInsurance, saveInsurance, updateInsuranceClaim,
  fetchInsurance, fileInsuranceClaim, deleteInsurance,
  fetchNotifications, sendNotification, deleteNotification, markNotificationRead,
  generateDietPlan,
  fetchGoals, createGoal, updateGoal, deleteGoal, fetchAchievements,
  fetchHealthHistory, downloadHealthReportPdf,
  fetchPerformanceAnalytics,
  fetchSystemSettings, saveSystemSettings,
};
