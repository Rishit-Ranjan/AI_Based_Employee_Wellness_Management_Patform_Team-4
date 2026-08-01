# Employee Wellness Management Analytics Platform
<img width="950" height="450" alt="image" src="https://github.com/user-attachments/assets/210737c9-39a6-4c0e-905a-d9a51d0c2a9d" /><br/>


An intelligent, full-stack web application designed to monitor and enhance employee wellbeing through data-driven analytics, personalized recommendations, and AI-powered assistance. This platform provides a comprehensive suite of tools for both employees and administrators to proactively manage health, stress, and overall wellness in the workplace.

---

## ✨ Key Features

### For Employees:

- **Personalized Dashboard:** A central hub to view health vitals, track daily habits (water, steps, sleep), and log mood/stress levels.
- **AI Wellness Assistant:** An interactive chatbot (powered by Google Gemini or a local Ollama model) for instant wellness advice, routine generation, and health queries. Includes voice input and speech output.
- **Personalized Recommendations:** AI-driven suggestions for fitness, diet, yoga, and mental peace, complete with video guides.
- **Health & Wellness Modules:**
  - **Insurance Management:** View policy details and file claims.
  - **Diet Plans:** Get AI-generated meal plans for various dietary needs.
  - **Goal Tracking:** Set and track personal wellness goals and earn achievements.
  - **Health Reports:** Download PDF summaries of your health status and view historical data.
  - **Appointments & SOS:** Schedule health checkups and trigger emergency alerts to admins.
  - **Expense Tracking:** Log and manage health-related expenses.

### For Administrators:

- **Health Data Management:** A comprehensive interface to view, add, and manage employee health records.
- **Predictive Risk Analysis:** An ML-powered module to identify employees at high, medium, or low risk of burnout or health issues.
- **Sentiment & Mental Health Analytics:** Anonymized, department-level sentiment analysis based on employee feedback pulses.
- **Performance & KPI Dashboard:** High-level view of key wellness metrics like participation rates, absenteeism, and overall workforce risk.
- **Notification Center:** Send targeted or broadcast notifications to employees.
- **System Settings:** Configure application-wide settings, including risk thresholds and notification preferences (Email/SMS).

---

## 🛠️ Tech Stack

| Category           | Technology                                                                           |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Frontend** | React, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide React                     |
| **Backend**  | Python, Flask, MongoDB (via`pymongo`)                                              |
| **AI/ML**    | Scikit-learn, NLTK, Pandas, Google Gemini, Ollama                                    |
| **Auth**     | JWT (JSON Web Tokens) with`flask-jwt-extended`                                     |
| **Comms**    | Twilio (for SMS notifications), SMTP (for email)                                     |
| **Tooling**  | `concurrently` (for parallel dev servers), `dotenv` (for environment management) |

---

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

- **Node.js** (v18 or later)
- **Python** (v3.9 or later) with `pip`
- **MongoDB** instance (local or a cloud service like MongoDB Atlas)

### 1. Clone the Repository

```bash
git clone https://github.com/Rishit-Ranjan/Employee_wellness_management_analytics_Team-4.git
cd Employee_wellness_management_analytics_Team-4
```

### 2. Backend Setup

Navigate to the backend directory and set up a virtual environment.

```bash
# Navigate to the backend source
cd backend/src

# Create and activate a virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

#### Environment Variables

Create a `.env` file inside the `backend/src` directory and populate it with your configuration. Use the following template:

```env
# backend/src/.env

# --- Core ---
MONGO_URI="your_mongodb_connection_string"
MONGO_DB_NAME="employee_wellness_analytics"
JWT_SECRET_KEY="a-very-strong-and-secret-key-for-jwt"
FRONTEND_ORIGIN="http://localhost:5173"

# --- AI Services (Optional) ---
# Choose 'gemini' or 'ollama'
AI_LLM_PROVIDER="gemini"

# For Ollama (if used)
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="phi3:3.8b"

# For Google Gemini (if used)
GEMINI_API_KEY="your_google_gemini_api_key"

# --- SMS Notifications (Optional) ---
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_PHONE_NUMBER="your_twilio_phone_number"
ADMIN_EMERGENCY_PHONE="phone_number_to_receive_sos_alerts"

# --- Email Notifications (Optional) ---
SMTP_SERVER="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your_email@example.com"
SMTP_PASSWORD="your_email_password"
```

### 3. Frontend Setup

Open a new terminal, navigate to the frontend directory, and install the dependencies.

```bash
cd frontend
npm install
```

### 4. Running the Application

From the root directory of the project, run the concurrent script to start both the backend and frontend servers.

```bash
# From the project root directory
npm run dev
```

This will:

- Start the Flask backend server (usually on `http://localhost:8000`).
- Start the Vite frontend dev server (usually on `http://localhost:5173`).

Open your browser and navigate to **http://localhost:5173**.

---

## ⚙️ Usage

The application has two primary roles with default credentials of Admin for demonstration:

### Employee Role
- **Role:** 'User'
- **EMP ID:** E.g. EMP101
- **Email:** personal email is preferred
- **Password:** set your 6-digit password

#### Administrator Access

- **Role:** `Admin`
- **Admin ID:** `ADM001`
- **Email:** `admin@platform.com`
- **Password:** `password`

---

## 🤝 Contributing

Contributions are welcome! If you have suggestions for improvements or want to fix a bug, please feel free to:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourAmazingFeature`).
3. Make your changes and commit them (`git commit -m 'Add some YourAmazingFeature'`).
4. Push to the branch (`git push origin feature/YourAmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for more details.

---

*This project was developed as part of the Infosys Springboard Virtual Internship program.*
