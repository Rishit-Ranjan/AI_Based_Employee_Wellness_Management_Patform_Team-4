# Task: Add Employee "My Mental Health & Sentiment" Section in User Dashboard

## Steps
- [x] 1. Backend: Add GET /api/wellness/sentiment-pulse/<employee_id> endpoint (employee/admin accessible, returns only that employee's pulses)
- [x] 2. Frontend API: Add fetchEmployeeSentimentPulses(employeeId, options) and export it
- [x] 3. App.jsx: Fetch employee's own sentiment pulses and attach as feedbackLogs to their health record (non-admin branch)
- [x] 4. App.jsx: Update handleUpdateSentimentPulse to refresh employee's own pulses after submission
- [x] 5. Create EmployeeSentimentModule.jsx component showing employee's own mental health & sentiment scenario
- [x] 6. UserDashboard.jsx: Add new nav tab "My Mental Health & Sentiment" and render the new component
- [x] 7. Verify changes (backend + frontend)
