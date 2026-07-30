# Employee_Wellness_Management_Analytics (Team 4)

First clone the repository using the command:

```bash
git clone https://github.com/Rishit-Ranjan/Employee_wellness_management_analytics_Team-4.git
```

## Run frontend + backend together

Create a ".env" file with your own string and information for MongoDB and SMTP and place it in the backend root with these variables inside the .env file:

```bash
MONGO_URI=connection string

MONGO_DB_NAME=employee_wellness_analytics

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email_id
SMTP_PASSWORD=app password from gmail
SMTP_USE_TLS=true
EMAIL_FROM=employee-wellness-analytics@gmail.com

JWT_SCECRET_KEY=your_jwt_secret_key

FRONTEND_ORIGIN=http://localhost:5173

OPENAI_API_KEY=your_openai_api_key

GEMINI_API_KEY=your_gemini_api_key
```

Then create a virtual environment in the project root using the command:

```bash
python -m venv .venv
```

Start the virtual environment using the command:
```bash
./.venv/Scripts/Activate.ps1
```

Download the libraries from the requirements.txt using the command:

```bash
pip install -r requirements.txt
```

Now,

``` bash
cd frontend
npm install
```
Then, in the project root folder:

```bash
npm install
npm run dev
```