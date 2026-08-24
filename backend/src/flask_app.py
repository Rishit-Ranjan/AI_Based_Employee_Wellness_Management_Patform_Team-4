"""
Main Flask application for the AI-Based Employee Wellness Management Platform.

This file sets up the Flask server, configures JWT, CORS, and database connections.
It defines all API endpoints for authentication, wellness data management,
AI services, and other platform features.
License: MIT License. See LICENSE file for details.
"""
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS 
from werkzeug.utils import secure_filename
import bcrypt
from flask_jwt_extended import create_refresh_token

from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    get_jwt,
    jwt_required,
    JWTManager
)

import os
from datetime import datetime, timedelta, timezone 
from pymongo import MongoClient
from pymongo.errors import ConfigurationError
from bson import ObjectId
import requests as http_requests
import concurrent.futures
from dotenv import load_dotenv
import pandas as pd
from email_sender import send_email
from model_loader import get_risk_model, get_target_encoder, get_feature_columns, get_recommendation_engine, get_sentiment_analyzer, preload_models

app = Flask(__name__)

load_dotenv()

# --- App Configuration ---
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/employee_wellness_analytics')
MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'employee_wellness_analytics')
CORS(app, supports_credentials=True, origins=os.getenv('FRONTEND_ORIGIN', 'http://localhost:5173'))

# --- JWT Configuration ---
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "default-super-secret-key-for-dev")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=int(os.getenv('JWT_EXPIRES_MINUTES', '1440'))) # 24-hour token
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
app.config["JWT_ACCESS_COOKIE_NAME"] = "access_token"

# --- File Upload Configuration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'avatars')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["JWT_COOKIE_CSRF_PROTECT"] = False
jwt = JWTManager(app)

# --- MongoDB Connection ---
# Explicit TLS settings to avoid Atlas SSL handshake failures in some environments
client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=20000,
)

# Attempt to get the default database from the URI, fallback to MONGO_DB_NAME if not specified
try:
    db = client.get_default_database()

except ConfigurationError:
    db = client.get_database(MONGO_DB_NAME)
users_collection = db.get_collection('users')
admin_collection = db.get_collection('admin')
reset_collection = db.get_collection('password_reset_requests')
health_records_collection = db.get_collection('health_records')
daily_habits_collection = db.get_collection('daily_habits')
mental_health_logs_collection = db.get_collection('mental_health_logs')
sentiment_pulses_collection = db.get_collection('sentiment_pulses')

health_history_collection = db.get_collection('health_history')
insurance_collection = db.get_collection('insurance_policies')
notifications_collection = db.get_collection('notifications')
goals_collection = db.get_collection('goals')
checkup_appointments_collection = db.get_collection('checkup_appointments')
sos_alerts_collection = db.get_collection('sos_alerts')
expenses_collection = db.get_collection('health_expenses')
system_settings_collection = db.get_collection('system_settings')
support_tickets_collection = db.get_collection('support_tickets')

# --- Lazy Loading of ML Models ---
# AI/ML model artifacts (risk model, target encoder, feature columns, recommendation
# engine, and VADER sentiment analyzer) are now loaded lazily on their first use
# via the model_loader module. This keeps application startup fast and only incurs
# model loading cost when the corresponding feature endpoint is first accessed.
#
# To keep the first-feature-request fast, we kick off a background preloader that
# warms the model cache during startup (non-blocking daemon thread).
preload_models(blocking=False)

#--- Utility Functions ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def _generate_reset_otp(length: int = 6) -> str:
    # numeric OTP, zero-padded
    return str(int.from_bytes(os.urandom(4), 'big') % (10 ** length)).zfill(length)

def _generate_reset_token(num_bytes: int = 32) -> str:
    # URL-safe-ish token
    return os.urandom(num_bytes).hex()

def get_full_avatar_url(avatar_path):
    """Constructs the full URL for an avatar path."""
    if not avatar_path or not avatar_path.startswith('/static'):
        return None # Or return a default avatar URL
    # In a production environment, this should use the actual public domain.
    base_url = request.url_root.rstrip('/')
    return f"{base_url}{avatar_path}"

# --- Health Check Endpoint ---
@app.route('/')
def index():
    """A simple health check endpoint for service readiness."""
    return jsonify({'status': 'ok', 'message': 'Backend is running.'})

# login API endpoint
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').lower()
    password = data.get('password') or ''
    entity_id = (data.get('entityId') or '').strip()
    role = data.get('role', 'Employee')  # Default to 'Employee'
    app.logger.debug(f"Attempting login for email: {email} with role: {role} and ID: {entity_id}")

    # Input validation
    target_collection = admin_collection if role == 'Admin' else users_collection
    id_field = "adminId" if role == 'Admin' else "employeeId"

    try:
        # 1. Check if a user with the given email exists
        user = target_collection.find_one({"email": email})
        if not user:
            # Use a specific error code or message for the frontend to target the email field
            return jsonify({'detail': 'This email is not registered.', 'field': 'email'}), 404

        # 2. Check if the entity ID matches for the found user
        if user.get(id_field) != entity_id:
            id_name = "Admin ID" if role == 'Admin' else "Employee ID"
            return jsonify({'detail': f'This {id_name} does not exist or does not match the email.', 'field': 'entityId'}), 401

        # 3. Check password
        password_hash = user.get('password_hash')
        if not password_hash or not verify_password(password, password_hash):
            return jsonify({'detail': 'The password you entered is incorrect.', 'field': 'password'}), 401

        # --- Login Success ---
        user_id_str = str(user['_id'])
        user_info = {
            "id": user_id_str,
            "name": user.get('name') or user.get('username'),
            "email": user['email'],
            "employeeId": user.get('employeeId'),
            "adminId": user.get('adminId'),
            "role": user.get('role', 'user'),
            "avatarUrl": get_full_avatar_url(user.get("avatarUrl")),
            "phone": user.get("phone")
        }

        # Create token with user_info as the identity
        # The identity should be a simple string. We'll store user_info in additional claims.
        access_token = create_access_token(identity=user_id_str, additional_claims={"user_info": user_info})

        # Set the token in an HTTP-only cookie and return user info
        resp = make_response(jsonify({'user': user_info}))
        resp.set_cookie('access_token', access_token, httponly=True, samesite='Lax')
        return resp
    
    # Handle unexpected errors gracefully
    except Exception as e:
        app.logger.exception(f"An unexpected error occurred during login for {email}: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# signup API endpoint
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').lower().strip()
    password = data.get('password') or ''

    # Validate input 
    if not name or not email or not password:
        return jsonify({'detail': 'Missing required fields'}), 400

    if len(password) < 6:
        return jsonify({'detail': 'Password must be at least 6 characters long.'}), 400

    if len(password.encode('utf-8')) > 72:
        return jsonify({'detail': 'Password is too long (max 72 bytes).'}), 400

    # Check if the user already exists
    try:
        # Only allow signups into the collection that login checks for normal users.
        if users_collection.find_one({"email": email}):
            return jsonify({'detail': 'Account already exists'}), 409

        # Hash the password using bcrypt.
        pwd_hash = hash_password(password)

        # Generate a unique employee ID
        # We'll base it on the current number of users to ensure uniqueness
        user_count = users_collection.count_documents({})
        employee_id = f"EMP{user_count + 100}"

        # Generate a username by removing spaces and converting to lowercase
        username = name.replace(' ', '').lower()

        # Create the user document
        doc = {
            'name': name,
            'employeeId': employee_id,
            'username': username,
            'email': email,
            'password_hash': pwd_hash,
            'role': 'user', 'createdAt': datetime.now(timezone.utc).isoformat(),
        }

        # Insert the new user into the users collection
        users_collection.insert_one(doc)
        return jsonify({'detail': 'Account created'}), 201
    
    # error handling for the SignUp failed
    except Exception as e:
        app.logger.exception(f"Signup failed for {email}: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# forget-password API endpoint
@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json() or {}
    email = (data.get('email') or '').lower().strip()
    method = (data.get('method') or 'otp').lower().strip()  # otp | link

    # Validate input
    if not email:
        return jsonify({'detail': 'Missing email'}), 400

    # Validate method for reseting password
    if method not in {'otp', 'link'}:
        return jsonify({'detail': 'Invalid method'}), 400

    # Check if the user exists in either collection
    user = users_collection.find_one({'email': email})

    # Always return generic message to avoid account enumeration
    message_resp = {
        'detail': 'If an account exists for this email, a recovery option has been generated.'
    }

    # If the user does not exist, we still return the same message to prevent account enumeration
    if not user:
        return jsonify(message_resp), 200

    # Generate and store reset request
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=15)

    # Generate either an OTP or a reset token based on the method
    otp_code = None
    reset_token = None
    if method == 'otp':
        otp_code = _generate_reset_otp(6)
    else:
        reset_token = _generate_reset_token(32)

    # Store the reset request in the database
    req_doc = {
        'email': email,
        'otp': otp_code,
        'reset_token': reset_token,
        'expires_at': expires_at.isoformat(),
        'used': False,
        'created_at': now.isoformat(),
    }
    reset_collection.insert_one(req_doc)

    # Send email if SMTP is configured. Otherwise, fall back to debug values.
    resp_payload = message_resp.copy()
    try:
        frontend_origin = os.getenv('FRONTEND_ORIGIN', 'http://localhost:5173')
        if method == 'otp' and otp_code is not None:
            subject = 'Your password recovery code'
            text_body = f"Your OTP recovery code is: {otp_code}\n\nThis code expires in 15 minutes."
            html_body = f"<p>Your OTP recovery code is: <b>{otp_code}</b></p><p>This code expires in 15 minutes.</p>"
            send_email(email, subject, html_body, text_body)
        
        elif method == 'link' and reset_token is not None:
            subject = 'Your password reset link'
            reset_link = f"{frontend_origin}/forgot_password?token={reset_token}&email={email}"
            text_body = f"Reset your password using this link: {reset_link}\n\nThis link expires in 15 minutes."
            html_body = f"<p>Reset your password using this link:</p><p><a href='{reset_link}'>Reset password</a></p><p>This link expires in 15 minutes.</p>"
            send_email(email, subject, html_body, text_body)
    
    except Exception as e:
        # Prototype fallback
        app.logger.warning(f"Failed to send email (falling back to debug): {e}")
        if otp_code is not None:
            resp_payload['debugOtp'] = otp_code
        if reset_token is not None:
            resp_payload['debugResetToken'] = reset_token

    return jsonify(resp_payload), 200

# Reset password API endpoint
@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    # Get the JSON data from the request
    data = request.get_json() or {}
    email = (data.get('email') or '').lower().strip()
    new_password = data.get('newPassword') or ''
    otp = (data.get('otp') or '').strip()
    reset_token = (data.get('resetToken') or '').strip()

    # Log the request
    app.logger.info(
        "reset-password called: email=%s newPassword_len=%s has_otp=%s has_resetToken=%s", email, len(new_password) if new_password else 0, bool(otp), bool(reset_token)
    )

    # Validate input
    if not email:
        return jsonify({'detail': 'Missing required email field.'}), 400
    if not new_password:
        return jsonify({'detail': 'Missing new password.'}), 400
    if len(new_password) < 6:
        return jsonify({'detail': 'Password must be at least 6 characters long.'}), 400
    if len(new_password.encode('utf-8')) > 72:
        return jsonify({'detail': 'Password is too long (max 72 bytes).'}), 400
    if otp == '' and reset_token == '':
        return jsonify({'detail': 'A valid OTP or reset token is required.'}), 400

    try:
        # Find latest unused, unexpired reset request matching provided credential
        query = {
            'email': email,
            'used': False,
        }
        now = datetime.now(timezone.utc)

        # Add either otp or reset_token to the query if provided
        if otp != '':
            query['otp'] = otp
        if reset_token != '':
            query['reset_token'] = reset_token

        # Find the most recent reset request
        req = reset_collection.find_one(query, sort=[('created_at', -1)])
        if not req:
            return jsonify({'detail': 'Invalid or expired reset request.'}), 400

        # Check if the reset request has expired
        expires_at = datetime.fromisoformat(req['expires_at'])
        if expires_at < now:
            return jsonify({'detail': 'Reset request expired.'}), 400

        # Find the user in either users or admin collection
        user = users_collection.find_one({'email': email})
        target_collection = users_collection

        # If not found in users, check admin collection
        if not user:
            user = admin_collection.find_one({'email': email})
            target_collection = admin_collection

        # If still not found, return error
        if not user:
            return jsonify({'detail': 'User not found.'}), 404

        # Check if the new password is the same as the old one
        if verify_password(new_password, user['password_hash']):
            return jsonify({'detail': 'New password cannot be the same as the old password.'}), 400

        # Hash the new password using bcrypt
        pwd_hash = hash_password(new_password)
        target_collection.update_one({'_id': user['_id']}, {'$set': {'password_hash': pwd_hash}})
        reset_collection.update_one({'_id': req['_id']}, {'$set': {'used': True}})

        # Log the successful password reset
        return jsonify({'detail': 'Password updated successfully.'}), 200
    except Exception as e:
        app.logger.exception(f"Password reset failed for {email}: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# --- User Info Endpoints ---
@app.route('/api/auth/me', methods=['GET'])
@jwt_required(locations=["cookies"])
def me():
    # The identity is the user ID string. The full user info is in the claims.
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    if not user_info:
        return jsonify({"detail": "User information not found in token"}), 404
    
    return jsonify({'user': user_info})

# --- Logout Endpoint ---
@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Clears the access token cookie."""
    resp = make_response(jsonify({'detail': 'Logout successful'}), 200)
    resp.set_cookie('access_token', '', expires=0)
    return resp

# --- Avatar Upload Endpoint ---
@app.route('/api/users/avatar', methods=['POST'])
#@jwt_required(locations=["cookies"])
def upload_avatar():
    """Uploads a new avatar for the current user."""
    user_id = get_jwt_identity()
    if 'avatar' not in request.files:
        return jsonify({'detail': 'No file part in the request'}), 400

    file = request.files['avatar']
    if file.filename == '':
        return jsonify({'detail': 'No selected file'}), 400

    if file:
        # Create a secure, unique filename
        filename = secure_filename(f"{user_id}_{file.filename}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # The URL path to be stored in the database and used by the frontend
        avatar_url = f"/static/avatars/{filename}"

        # Determine which collection to update based on the user's role
        jwt_payload = get_jwt()
        user_info = jwt_payload.get("user_info", {})
        is_admin = user_info.get('role', '').lower() == 'admin'
        
        collection_to_update = admin_collection if is_admin else users_collection
        
        # Update the user's document
        collection_to_update.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'avatarUrl': avatar_url}}
        )

        # Return the updated user info, including the new avatar URL
        updated_user_info = {**user_info, "avatarUrl": get_full_avatar_url(avatar_url)}

        return jsonify({'detail': 'Avatar updated successfully', 'user': updated_user_info}), 200

    return jsonify({'detail': 'File upload failed'}), 500


# --- Wellness API Endpoints ---
@app.route('/api/wellness/health-records', methods=['GET'])
@jwt_required(locations=["cookies"])
def get_health_records():
    """Fetches all health records from the database."""
    try:
        records_cursor = health_records_collection.find({})
        records = []
        for record in records_cursor:
            # The frontend expects 'id' not '_id'. We'll use the string representation of ObjectId.
            record['id'] = str(record['_id'])
            del record['_id']
            records.append(record)
        # Sort by lastUpdated descending to match frontend logic
        records.sort(key=lambda r: r.get('lastUpdated', ''), reverse=True)
        return jsonify(records), 200
    except Exception as e:
        app.logger.exception(f"An unexpected error occurred while fetching health records: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# --- Update, Add, and Delete Health Records Endpoints ---
@app.route('/api/wellness/health-records', methods=['POST'])
@jwt_required(locations=["cookies"])
def add_health_record():
    """Adds a new health record. Can be initiated by an admin or a new user."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    new_record = request.get_json()

    if not new_record or 'employeeId' not in new_record:
        return jsonify({'detail': 'Missing health record data or employeeId'}), 400

    # Parse bloodPressure into systolic and diastolic
    if 'bloodPressure' in new_record and isinstance(new_record['bloodPressure'], str):
        bp_parts = new_record['bloodPressure'].split('/')
        if len(bp_parts) == 2:
            try:
                new_record['bloodPressureSystolic'] = int(bp_parts[0])
                new_record['bloodPressureDiastolic'] = int(bp_parts[1])
            except ValueError:
                app.logger.warning(f"Invalid bloodPressure format for {new_record.get('employeeId')}: {new_record['bloodPressure']}")
                # Optionally, you could return an error here or just proceed without parsing

    # Ensure a record with the same employeeId doesn't already exist
    if health_records_collection.find_one({'employeeId': new_record['employeeId']}):
        return jsonify({'detail': 'A health record for this employee already exists'}), 409

    try:
        # The frontend sends an 'id' field, which we don't need to store in Mongo's '_id'
        if 'id' in new_record:
            del new_record['id']

        new_record['createdAt'] = datetime.now(timezone.utc).isoformat()
        new_record['lastUpdated'] = datetime.now(timezone.utc).isoformat() # Ensure lastUpdated is set on creation

        result = health_records_collection.insert_one(new_record)
        # Construct the response dictionary explicitly to ensure no ObjectId remains.
        # MongoDB adds _id to new_record in-place, so we need to handle it.
        response_record = {
            k: v for k, v in new_record.items() if k != '_id'
        }
        response_record['id'] = str(result.inserted_id) # Add the string version of the ID
        return jsonify(response_record), 201
    except Exception as e:
        app.logger.exception(f"An unexpected error occurred while adding a health record: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# health records API endpoint (PUT)
@app.route('/api/wellness/health-records/<employee_id>', methods=['PUT'])
@jwt_required(locations=["cookies"])
def update_health_record(employee_id):
    """Updates an existing health record for a given employeeId."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    updated_data = request.get_json()

    if not updated_data:
        return jsonify({'detail': 'Missing update data'}), 400

    # Parse bloodPressure into systolic and diastolic
    if 'bloodPressure' in updated_data and isinstance(updated_data['bloodPressure'], str):
        bp_parts = updated_data['bloodPressure'].split('/')
        if len(bp_parts) == 2:
            try:
                updated_data['bloodPressureSystolic'] = int(bp_parts[0])
                updated_data['bloodPressureDiastolic'] = int(bp_parts[1])
            except ValueError:
                app.logger.warning(f"Invalid bloodPressure format for {employee_id}: {updated_data['bloodPressure']}")

    # The frontend sends an 'id' field, which we don't need to store in Mongo's '_id'
    if 'id' in updated_data:
        del updated_data['id']
    updated_data['lastUpdated'] = datetime.now(timezone.utc).isoformat() # Update timestamp on modification

    try:
        result = health_records_collection.update_one({'employeeId': employee_id}, {'$set': updated_data})
        if result.matched_count == 0:
            return jsonify({'detail': 'Health record not found'}), 404
        return jsonify({'detail': 'Health record updated successfully'}), 200
    except Exception as e:
        app.logger.exception(f"An unexpected error occurred while updating health record for {employee_id}: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# --- Delete Health Record Endpoint ---
@app.route('/api/wellness/health-records/<employee_id>', methods=['DELETE'])
@jwt_required(locations=["cookies"])
def delete_health_record(employee_id):
    """Deletes an existing health record for a given employeeId."""
    # Ensure only admins can delete records
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info", {})
    if user_info.get('role', '').lower() != 'admin':
        return jsonify({'detail': 'Forbidden: You do not have permission to delete records.'}), 403

    try:
        result = health_records_collection.delete_one({'employeeId': employee_id})
        if result.deleted_count == 0:
            return jsonify({'detail': 'Health record not found'}), 404
        # Return 204 No Content on successful deletion
        return '', 204
    except Exception as e:
        app.logger.exception(f"An unexpected error occurred while deleting health record for {employee_id}: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# --- Admin-Only Endpoint to Fetch All Users ---
@app.route('/api/users', methods=['GET'])
@jwt_required(locations=["cookies"])
def get_all_users():
    """ Fetches all users with the 'user' role. Admin-only endpoint. """
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info", {})
    if user_info.get('role', '').lower() != 'admin':
        return jsonify({'detail': 'Forbidden: You do not have permission to access this resource.'}), 403

    try:
        users_cursor = users_collection.find({}, {'password_hash': 0}) # Exclude password hash
        users = []
        for user in users_cursor:
            user['id'] = str(user['_id'])
            del user['_id']
            users.append(user)
        return jsonify(users), 200
    except Exception as e:
        app.logger.exception(f"An unexpected error occurred while fetching all users: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# --- Admin-Only Endpoint to Delete a User and All Their Data ---
@app.route('/api/users/<employee_id>', methods=['DELETE'])
@jwt_required(locations=["cookies"])
def delete_user_and_data(employee_id):
    """
    Deletes a user and all their associated data across all collections.
    This is a destructive, admin-only operation.
    """
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info", {})
    if user_info.get('role', '').lower() != 'admin':
        return jsonify({'detail': 'Forbidden: You do not have permission to delete users.'}), 403

    if not employee_id:
        return jsonify({'detail': 'Employee ID is required.'}), 400

    try:
        # Primary deletion from the users collection
        user_deletion_result = users_collection.delete_one({'employeeId': employee_id})

        if user_deletion_result.deleted_count == 0:
            return jsonify({'detail': 'User not found.'}), 404

        # Cascade delete from all other related collections
        collections_to_clean = [
            health_records_collection,
            daily_habits_collection,
            mental_health_logs_collection,
            sentiment_pulses_collection,
            health_history_collection,
            insurance_collection,
            goals_collection,
            checkup_appointments_collection,
            sos_alerts_collection,
            expenses_collection,
            support_tickets_collection,
        ]
        for collection in collections_to_clean:
            collection.delete_many({'employeeId': employee_id})

        return '', 204  # 204 No Content indicates successful deletion
    except Exception as e:
        app.logger.exception(f"An unexpected error occurred while deleting user {employee_id}: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# --- Risk Prediction Helper Function ---
def map_health_record_to_model_input(record):
    normalized = {
        "age": int(record.get("age", 30) or 30),
        "gender": record.get("gender", "Male") or "Male",
        "height_cm": float(record.get("heightCm", 170) or 170),
        "weight_kg": float(record.get("weightKg", 70) or 70),
        "bmi": float(record.get("bmi", 24.0) or 24.0),
        "blood_pressure_systolic": int(record.get("bloodPressureSystolic", 120) or 120),
        "blood_pressure_diastolic": int(record.get("bloodPressureDiastolic", 80) or 80),
        "exercise_days_per_week": int(record.get("exerciseDaysPerWeek", 0) or 0),
        "sleep_hours": float(record.get("sleepHoursPerNight", 7.0) or 7.0),
        "stress_score": int(record.get("stressScore", 5) or 5),
        "attendance_percent": float(record.get("attendanceRate", 95) or 95),
        "glucose_level": float(record.get("glucoseLevel", 90) or 90),
        "smoker": record.get("smoker", False),
        "alcohol_use": record.get("alcoholUse", False),
        "medical_condition": record.get("medicalCondition", "No major condition") or "No major condition",
}

    df = pd.DataFrame([normalized])

    categorical_cols = [col for col in ["gender", "medical_condition"] if col in df.columns]
    df = pd.get_dummies(df, columns=categorical_cols, drop_first=True)

    df = df.reindex(columns=get_feature_columns(), fill_value=0)
    return df

# --- Risk Prediction Endpoint ---
@app.route('/api/wellness/risks', methods=['GET'])
@jwt_required(locations=["cookies"])
def get_risk_predictions():
    ai_wellness_service = get_ai_service(db)
    risk_model = get_risk_model()
    target_encoder = get_target_encoder()
    if risk_model is None or target_encoder is None:
        return jsonify({"detail": "ML model artifacts are not loaded on the server."}), 500

    try:
        records_cursor = health_records_collection.find({})
        results = []

        for record in records_cursor:
            try:
                employee_id = record.get("employeeId")
                employee_name = record.get("employeeName", "Unknown Employee")
                last_updated = record.get("lastUpdated")

                # Check cache first
                if employee_id in ai_wellness_service.risk_prediction_cache:
                    cached_entry = ai_wellness_service.risk_prediction_cache[employee_id]
                    if cached_entry.get('timestamp') == last_updated:
                        results.append(cached_entry['data'])
                        continue # Use cached data and skip re-computation

                model_input_df = map_health_record_to_model_input(record)

                encoded_pred = risk_model.predict(model_input_df)[0]
                risk_label = target_encoder.inverse_transform([encoded_pred])[0]

                if hasattr(risk_model, "predict_proba"):
                    # Extract probabilities for specific classes safely
                    risk_probabilities = risk_model.predict_proba(model_input_df)[0]
                    class_labels = target_encoder.classes_
                    prob_dict = dict(zip(class_labels, risk_probabilities))

                    # Map the score appropriately based on the true prediction label
                    if risk_label == "High":
                        risk_score = round(70 + (prob_dict.get("High", 0.7) * 30))
                    elif risk_label == "Medium":
                        risk_score = round(45 + (prob_dict.get("Medium", 0.5) * 24))
                    else: # Low risk
                        risk_score = round(prob_dict.get("Low", 0.1) * 44)
                else:
                    risk_score = 50 # Fallback score

                factors = []
                if model_input_df.get("stress_score", pd.Series([0])).iloc[0] >= 7:
                    factors.append("High stress score")
                if model_input_df.get("sleep_hours", pd.Series([0])).iloc[0] < 6:
                    factors.append("Insufficient sleep")
                if model_input_df.get("bmi", pd.Series([0])).iloc[0] >= 30:
                    factors.append("High BMI")
                if (
                    model_input_df.get("blood_pressure_systolic", pd.Series([0])).iloc[0] >= 140
                    or model_input_df.get("blood_pressure_diastolic", pd.Series([0])).iloc[0] >= 90
                ):
                    factors.append("Elevated blood pressure")
                if model_input_df.get("exercise_days_per_week", pd.Series([0])).iloc[0] <= 1:
                    factors.append("Low weekly exercise")
                if model_input_df.get("glucose_level", pd.Series([0])).iloc[0] >= 126:
                    factors.append("Elevated glucose level")

                if risk_label == "High":
                    recommendation_action = "Immediate clinical review, stress intervention, and close vitals monitoring recommended."
                elif risk_label == "Medium":
                    recommendation_action = "Moderate risk detected. Improve sleep, exercise, and review biometric trends weekly."
                else:
                    recommendation_action = "Low risk profile. Maintain current healthy routines and continue periodic monitoring."

                risk_result = {
                    "employeeId": employee_id,
                    "employeeName": employee_name,
                    "riskType": risk_label,
                    "riskScore": risk_score,
                    "factors": factors if factors else ["Vitals check within ideal levels"],
                    "recommendationAction": recommendation_action
                }
                results.append(risk_result)

                # Update cache
                ai_wellness_service.risk_prediction_cache[employee_id] = {
                    'timestamp': last_updated,
                    'data': risk_result
                }

            except Exception as row_error:
                app.logger.exception(
                    "Risk prediction failed for employeeId=%s: %s",
                    record.get("employeeId"),
                    str(row_error)
                )
                results.append({
                    "employeeId": record.get("employeeId"),
                    "employeeName": record.get("employeeName"),
                    "riskType": "Unknown",
                    "riskScore": 0,
                    "factors": [f"Prediction failed: {str(row_error)}"],
                    "recommendationAction": "Review this employee's health record fields."
                })

        results.sort(key=lambda item: item["riskScore"], reverse=True)
        return jsonify(results), 200

    except Exception as e:
        app.logger.exception(f"Failed to generate wellness risks: {e}")
        return jsonify({"detail": "Risk prediction failed"}), 500

# --- Legacy Risk Prediction Endpoint (for backward compatibility) ---
@app.route('/api/wellness/risks_old', methods=['GET'])
@jwt_required(locations=["cookies"])
def get_wellness_risks_old():
    risk_model = get_risk_model()
    target_encoder = get_target_encoder()
    if risk_model is None or target_encoder is None:
        return jsonify({'detail': 'ML model is not available.'}), 503

    try:
        health_records = list(health_records_collection.find({}))
        if not health_records:
            return jsonify([]), 200

        risk_profiles = []

        for record in health_records:
            try:
                model_input_df = map_health_record_to_model_input(record)

                prediction_encoded = risk_model.predict(model_input_df)
                prediction_label = target_encoder.inverse_transform(prediction_encoded)[0]

                risk_score = 25
                if prediction_label == 'High':
                    risk_score = 80
                elif prediction_label == 'Medium':
                    risk_score = 55

                risk_profiles.append({
                    "employeeId": record.get("employeeId"),
                    "employeeName": record.get("employeeName"),
                    "riskType": prediction_label,
                    "riskScore": risk_score,
                    "factors": [f"Predicted as {prediction_label} risk by model."],
                    "recommendationAction": f"Follow standard protocol for {prediction_label} risk employees."
                })

            except Exception as row_error:
                app.logger.exception(
                    "Risk prediction failed for employeeId=%s: %s",
                    record.get("employeeId"),
                    str(row_error)
                )

                risk_profiles.append({
                    "employeeId": record.get("employeeId"),
                    "employeeName": record.get("employeeName"),
                    "riskType": "Unknown",
                    "riskScore": 0,
                    "factors": [f"Prediction failed: {str(row_error)}"],
                    "recommendationAction": "Review this employee's health record fields."
                })

        return jsonify(risk_profiles), 200

    except Exception as e:
        app.logger.exception(f"An unexpected error occurred during risk prediction: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# --- Media Library for Recommendations ---
# Using well-known, high-traffic YouTube wellness videos that are verified to be working.
# These are from established channels (FitnessBlender, YogaWithAdriene, GreatMeditation, etc.)
RECOMMENDATION_MEDIA = {
    'Fitness': {
        'image': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=300&fit=crop',
        'videos': [
            {'url': 'https://www.youtube.com/embed/50kH47ZztHs', 'keywords': ['cardio', 'at home', '30 min', 'full body']},
            {'url': 'https://www.youtube.com/embed/gC_L9qAHVJ8', 'keywords': ['beginner workout', '30 min', 'full body', 'low impact']},
            {'url': 'https://www.youtube.com/embed/UItWltVZZmE', 'keywords': ['low impact', 'cardio', '25 min', 'gentle workout']},
            {'url': 'https://www.youtube.com/embed/v7AYKMP6rOE', 'keywords': ['yoga', 'stretch', 'beginners', 'flexibility']},
        ]
    },
    'Diet': {
        'image': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=300&fit=crop',
        'videos': [
            {'url': 'https://www.youtube.com/embed/inpok4MKVLM', 'keywords': ['mindful eating', 'healthy habits', 'wellness basics']},
            {'url': 'https://www.youtube.com/embed/ZToicYcHIOU', 'keywords': ['stress relief', 'healthy routine', 'self care']},
            {'url': 'https://www.youtube.com/embed/50kH47ZztHs', 'keywords': ['active lifestyle', 'cardio', 'health']},
            {'url': 'https://www.youtube.com/embed/UItWltVZZmE', 'keywords': ['low impact', 'gentle workout', 'health']},
        ]
    },
    'Mental Wellness': {
        'image': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=300&fit=crop',
        'videos': [
            {'url': 'https://www.youtube.com/embed/O-6f5wQXSu8', 'keywords': ['anxiety relief', '5 min', 'quick meditation', 'calming']},
            {'url': 'https://www.youtube.com/embed/z6X5oEIg6Ak', 'keywords': ['mindfulness', 'meditation', 'stress relief', '10 min', 'guided']},
            {'url': 'https://www.youtube.com/embed/86x-u-tz0MA', 'keywords': ['morning meditation', 'calm', 'focus', 'positive energy']},
            {'url': 'https://www.youtube.com/embed/inpok4MKVLM', 'keywords': ['meditation basics', 'beginner meditation', 'mental health']},
        ]
    },
    'Yoga': {
        'image': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=300&fit=crop',
        'videos': [
            {'url': 'https://www.youtube.com/embed/v7AYKMP6rOE', 'keywords': ['yoga', 'full body', 'stretch', 'beginners', 'flexibility']},
            {'url': 'https://www.youtube.com/embed/4pKly2JojMw', 'keywords': ['yoga', 'stress relief', '15 min', 'relaxation']},
            {'url': 'https://www.youtube.com/embed/VaoV1PrYft4', 'keywords': ['morning yoga', '10 min', 'energy boost']},
            {'url': 'https://www.youtube.com/embed/ZToicYcHIOU', 'keywords': ['stress relief', 'breathing', 'relaxation']},
        ]
    },
    'Lifestyle': {
        'image': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=300&fit=crop',
        'videos': [
            {'url': 'https://www.youtube.com/embed/inpok4MKVLM', 'keywords': ['healthy habits', 'daily routine', 'wellness', 'lifestyle change']},
            {'url': 'https://www.youtube.com/embed/ZToicYcHIOU', 'keywords': ['focus', 'work-life balance', 'stress relief']},
            {'url': 'https://www.youtube.com/embed/86x-u-tz0MA', 'keywords': ['morning routine', 'healthy start', 'positive energy']},
            {'url': 'https://www.youtube.com/embed/v7AYKMP6rOE', 'keywords': ['movement', 'stretch', 'wellness routine']},
        ]
    },
    'Sleep': {
        'image': 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&h=300&fit=crop',
        'videos': [
            {'url': 'https://www.youtube.com/embed/inpok4MKVLM', 'keywords': ['sleep hygiene', 'wind down', 'relaxation']},
            {'url': 'https://www.youtube.com/embed/z6X5oEIg6Ak', 'keywords': ['guided meditation', 'sleep aid', 'relaxation']},
            {'url': 'https://www.youtube.com/embed/O-6f5wQXSu8', 'keywords': ['calming', 'breathing', 'bedtime']},
            {'url': 'https://www.youtube.com/embed/BHACKCNDMW8', 'keywords': ['nature', 'relaxing sounds', 'calm']},
        ]
    },
    'Stress': {
        'image': 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&h=300&fit=crop',
        'videos': [
            {'url': 'https://www.youtube.com/embed/ZToicYcHIOU', 'keywords': ['deep breathing', 'stress reduction', 'relaxation', 'anxiety']},
            {'url': 'https://www.youtube.com/embed/z6X5oEIg6Ak', 'keywords': ['stress relief', 'meditation', 'mindfulness', '10 min']},
            {'url': 'https://www.youtube.com/embed/86x-u-tz0MA', 'keywords': ['stress management', 'calm', 'anxiety', 'morning meditation']},
            {'url': 'https://www.youtube.com/embed/O-6f5wQXSu8', 'keywords': ['quick stress relief', 'instant calm', 'breathing exercise', '5 min']},
        ]
    },
    'Nutrition': {
        'image': 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&h=300&fit=crop',
        'videos': [
            {'url': 'https://www.youtube.com/embed/inpok4MKVLM', 'keywords': ['nutrition', 'healthy eating', 'mindful eating']},
            {'url': 'https://www.youtube.com/embed/ZToicYcHIOU', 'keywords': ['healthy routine', 'wellness', 'self care']},
            {'url': 'https://www.youtube.com/embed/50kH47ZztHs', 'keywords': ['active lifestyle', 'health', 'fitness']},
            {'url': 'https://www.youtube.com/embed/UItWltVZZmE', 'keywords': ['gentle workout', 'health', 'wellness']},
        ]
    },
}

# Define the ultimate fallback video URL outside of any dynamic lists
ULTIMATE_FALLBACK_VIDEO_URL = "https://www.youtube.com/embed/BHACKCNDMW8" # A generic, stable nature video (embed format)

# Default media fallback for unknown categories - using most universally reliable videos
DEFAULT_REC_MEDIA = {
    'image': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=300&fit=crop',
    'videos': [
        {'url': 'https://www.youtube.com/embed/v7AYKMP6rOE', 'keywords': ['yoga', 'meditation', 'relaxation', 'general wellness']},
        {'url': 'https://www.youtube.com/embed/z6X5oEIg6Ak', 'keywords': ['meditation', 'mindfulness', 'stress relief', 'calm']},
        {'url': 'https://www.youtube.com/embed/inpok4MKVLM', 'keywords': ['mindful eating', 'healthy habits', 'general wellness']},
        {'url': 'https://www.youtube.com/embed/UItWltVZZmE', 'keywords': ['fitness', 'workout', 'exercise', 'general wellness']},
    ]
}

import random

# Track which videos have been reported as unavailable (runtime-only, resets on server restart)
_UNAVAILABLE_VIDEOS = set()

# Cache of per-video availability (video_id -> bool). Persists for the process lifetime so
# the YouTube oEmbed network checks only run once per video, dramatically speeding up the
# FIRST recommendations request (which otherwise had to check every video on a cold start).
_VIDEO_AVAILABILITY = {}

def _resolve_media_category(category):
    """Normalize a category string to a key in RECOMMENDATION_MEDIA."""
    if category in RECOMMENDATION_MEDIA:
        return category
    for key in RECOMMENDATION_MEDIA:
        if key.lower() in category.lower() or category.lower() in key.lower():
            return key
    return 'Lifestyle'
    
def _is_video_available(video_id: str, cached: bool = True) -> bool: 
    """
    Checks if a YouTube video is available by pinging its oEmbed endpoint.
    This is a public endpoint and does not require an API key.

    Results are cached per-video so the (potentially slow, up to 3s each) network
    checks only happen once per server process. This stops the FIRST recommendations
    request from re-verifying every video on every cold start.
    """
    video_id = (video_id or '').strip()
    if not video_id:
        return True
    if cached:
        status = _VIDEO_AVAILABILITY.get(video_id)
        if status is not None:
            return status

    # oEmbed URL for checking video existence.
    oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"

    try:
        # A short timeout is used to fail fast if the network is slow.
        response = http_requests.get(oembed_url, timeout=3)
        # If the video is private or deleted, YouTube returns 404 or 403.
        # A successful 200 response means the video is public.
        status_code = response.status_code
        available = status_code == 200
        if not available:
            _UNAVAILABLE_VIDEOS.add(video_id)
    except http_requests.RequestException:
        # If the request fails for any reason (timeout, network error), assume available.
        available = True
    if cached:
        _VIDEO_AVAILABILITY[video_id] = available
    return available


def _get_all_available_videos(recommendation: dict, max_videos: int = 4) -> list:
    """
    Gets a list of suitable video URLs for a given recommendation.
    It scores videos based on keyword matching and category relevance, then uses a
    parallel batching approach to efficiently check for video availability.
    """
    rec_category = recommendation.get('category', 'Lifestyle')
    rec_title = recommendation.get('title', '').lower()
    rec_description = recommendation.get('description', '').lower()
    
    all_potential_videos = []
    
    # Gather all potential videos from all categories and defaults
    for cat_key, media_data in RECOMMENDATION_MEDIA.items():
        for video_entry in media_data.get('videos', []):
            all_potential_videos.append({'url': video_entry['url'], 'keywords': video_entry['keywords'], 'source_category': cat_key})
    for video_entry in DEFAULT_REC_MEDIA.get('videos', []):
        all_potential_videos.append({'url': video_entry['url'], 'keywords': video_entry['keywords'], 'source_category': 'Default'})

    scored_videos = []
    for video in all_potential_videos:
        if video['url'] in _UNAVAILABLE_VIDEOS:
            continue

        score = 0
        if video['source_category'] == rec_category:
            score += 10
        for keyword in video['keywords']:
            if keyword.lower() in rec_title:
                score += 3
            if keyword.lower() in rec_description:
                score += 2
        scored_videos.append({'url': video['url'], 'score': score})

    # Sort by score (descending) and then randomly for ties to ensure variety
    scored_videos.sort(key=lambda x: (x['score'], random.random()), reverse=True)
    
    # --- Parallel Video Availability Check ---
    verified_videos = []
    seen_urls = set()
    candidate_urls = [v['url'] for v in scored_videos if v['url'] not in seen_urls]

    # Use ThreadPoolExecutor to check videos in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_videos * 2) as executor:
        future_to_url = {executor.submit(_is_video_available, url.split('/embed/')[-1].split('?')[0]): url for url in candidate_urls}
        
        for future in concurrent.futures.as_completed(future_to_url):
            url = future_to_url[future]
            try:
                is_available = future.result()
                if is_available:
                    if url not in seen_urls:
                        verified_videos.append(url)
                        seen_urls.add(url)
                        if len(verified_videos) >= max_videos:
                            # Once we have enough, cancel remaining checks
                            executor.shutdown(wait=False, cancel_futures=True)
                            break
                else:
                    _UNAVAILABLE_VIDEOS.add(url)
                    app.logger.warning(f"Video {url} is unavailable. Skipping.")
            except Exception as exc:
                app.logger.error(f'Video check for {url} generated an exception: {exc}')

    return verified_videos if verified_videos else [ULTIMATE_FALLBACK_VIDEO_URL]

def _add_media_to_recommendations(recommendations):
    """Attach image and a list of video URLs to each recommendation."""
    enriched = []
    for rec in recommendations:
        category = rec.get('category', 'Lifestyle') # Default to 'Lifestyle' if category is missing

        # Determine the media source for the image
        media_source = RECOMMENDATION_MEDIA.get(_resolve_media_category(category), DEFAULT_REC_MEDIA)

        # Get a list of suitable videos instead of a single one, passing the full rec object
        video_urls = _get_all_available_videos(rec) # Pass the full recommendation object
        
        enriched_rec = {
            **rec,
            'id': rec.get('recommendation_id', rec.get('id', str(random.randint(1000, 9999)))),
            'imageUrl': media_source['image'],
            'videoUrls': video_urls,
        }
        enriched.append(enriched_rec)
    return enriched


def _warm_video_availability():
    """Pre-verify all known recommendation videos once at startup.

    This runs in a background thread so the heavy (up to 3s per video) YouTube
    oEmbed checks happen BEFORE the first user request, populating the module-level
    ``_VIDEO_AVAILABILITY`` cache. As a result, the very first recommendations request
    is fast instead of timing out on a cold start (which previously forced users to
    manually reload the page to see the recommendations tab).
    """
    video_ids = set()
    try:
        for media_data in list(RECOMMENDATION_MEDIA.values()) + [DEFAULT_REC_MEDIA]:
            for video_entry in media_data.get('videos', []):
                url = video_entry.get('url', '')
                vid = url.split('/embed/')[-1].split('?')[0].strip()
                if vid:
                    video_ids.add(vid)
    except Exception as e:  # defensive: warm-up must never break startup
        app.logger.warning(f"Failed to enumerate videos for warm-up: {e}")
        return

    if not video_ids:
        return

    def _run():
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
                list(executor.map(_is_video_available, video_ids))
            app.logger.info(
                "Recommendation video availability warm-up complete (%d videos checked).",
                len(video_ids),
            )
        except Exception as e:  # defensive: warm-up failures must never crash the server
            app.logger.warning(f"Recommendation video warm-up failed: {e}")

    try:
        import threading
        threading.Thread(target=_run, name="rec-video-warmup", daemon=True).start()
    except Exception as e:  # pragma: no cover - defensive
        app.logger.warning(f"Failed to start video warm-up thread: {e}")


@app.route('/api/wellness/report-video', methods=['POST'])
def report_unavailable_video():
    """Endpoint for the frontend to report a video that is no longer available."""
    data = request.get_json() or {}
    video_url = data.get('videoUrl')

    if not video_url:
        return jsonify({'detail': 'Missing videoUrl'}), 400

    # Add the broken video to the runtime blocklist
    _UNAVAILABLE_VIDEOS.add(video_url)
    app.logger.info(f"Video marked as unavailable: {video_url}")

    return jsonify({'detail': 'Video reported successfully'}), 200

def _run_recommendation_engine(engine, employee_profile, top_n=3):
    """Safely invoke the recommendation engine without ever crashing the request.

    The engine artifact is expected to be a callable (cloudpickle'd function).
    A stale artifact (e.g. an old ``dict`` or class instance) or an engine that
    raises at runtime must never break an employee's recommendations, so any
    problem degrades to the rule-based fallback instead.

    Returns a list of recommendation dicts (may be empty).
    """
    if engine is not None and callable(engine):
        try:
            app.logger.debug(
                "Recommendation engine is callable (type: %s). Attempting to use it.",
                type(engine).__name__,
            )
            result = engine(employee_profile, top_n=top_n)
            # Some stale engine builds return a bare dict instead of a list.
            if isinstance(result, dict):
                app.logger.warning(
                    "Recommendation engine returned a dict (keys=%s). Coercing to a single-item list.",
                    list(result.keys())[:6],
                )
                return [result]
            if isinstance(result, list):
                return result
            app.logger.warning(
                "Recommendation engine returned unexpected type %s; using fallback.",
                type(result).__name__,
            )
        except Exception as e:  # noqa: BLE001 - a broken engine must never take down an employee's recommendations
            app.logger.error(
                "Recommendation engine failed (engine type=%s): %s. Using rule-based fallback.",
                type(engine).__name__,
                e,
            )
        return []
    app.logger.warning(
        "Recommendation engine is not callable or is None (type=%s). Using rule-based fallback.",
        type(engine).__name__ if engine is not None else None,
    )
    return []


def _rule_based_recommendations(employee_profile, top_n=3):
    """Rule-based fallback that mirrors the recommendation engine's output schema."""
    top_recs = []

    if employee_profile["stress_score"] >= 8:
        top_recs.append({
            "recommendation_id": "REC002",
            "title": "Guided Meditation Routine",
            "category": "Mental Wellness",
            "description": "Practice 10-15 minutes of guided meditation. Focus on the 4-7-8 breathing technique to calm your nervous system and reduce cortisol levels. This can significantly improve focus and reduce feelings of being overwhelmed.",
            "score": 9.0,
            "reasons": ["Stress score is very high"],
        })
    elif employee_profile["stress_score"] >= 5:
        top_recs.append({
            "recommendation_id": "REC006",
            "title": "Desk Yoga and Stretching",
            "category": "Yoga",
            "description": "Incorporate short, guided desk yoga sessions. Focus on neck rolls, shoulder shrugs, and spinal twists to alleviate physical tension from prolonged sitting and reduce mental fatigue.",
            "score": 6.0,
            "reasons": ["Stress score is moderately elevated"],
        })

    if employee_profile["sleepHoursPerNight"] < 6:
        top_recs.append({
            "recommendation_id": "REC003",
            "title": "Sleep Hygiene Program",
            "category": "Lifestyle",
            "description": "Establish a consistent bedtime and wake-up time, even on weekends. Avoid screens 60 minutes before bed to allow for natural melatonin production. A cool, dark room is essential for deep, restorative sleep.",
            "score": 8.5,
            "reasons": ["Sleep hours are below healthy range"],
        })

    if employee_profile["exercise_days_per_week"] <= 2 or employee_profile["bmi"] >= 30:
        top_recs.append({
            "recommendation_id": "REC001",
            "title": "Brisk Walking Plan",
            "category": "Fitness",
            "description": "Start with a 30-minute brisk walk, 3-5 days a week. This low-impact cardio exercise helps improve cardiovascular health, aids in weight management, and boosts mood by releasing endorphins.",
            "score": 7.0,
            "reasons": ["Exercise frequency is low"],
        })

    # Fallback baseline when no risk boundaries are crossed
    if not top_recs:
        top_recs.append({
            "recommendation_id": "REC_BASE",
            "title": "Wellness Maintenance Plan",
            "category": "Lifestyle",
            "description": "Great job! Maintain your current hydration, healthy routines, and sleep patterns.",
            "score": 3.0,
            "reasons": ["Matches baseline health checks"],
        })

    return top_recs[:top_n]


def _normalize_recommendations(top_recs, employee_profile, top_n=3):
    """Guarantee ``top_recs`` is a non-empty list of recommendation dicts.

    Defense-in-depth: drops any non-dict entries so downstream ``.get()`` calls
    never fail, and falls back to the rule-based engine if nothing usable remains.
    """
    if isinstance(top_recs, dict):
        top_recs = [top_recs]
    elif not isinstance(top_recs, list):
        top_recs = []
    top_recs = [rec for rec in top_recs if isinstance(rec, dict)]
    if not top_recs:
        top_recs = _rule_based_recommendations(employee_profile, top_n=top_n)
    return top_recs[:top_n]


# --- Wellness Recommendations Endpoint ---
@app.route('/api/wellness/recommendations', methods=['GET'])
@jwt_required(locations=["cookies"])
def get_recommendations():
    # The service now handles its own model loading.
    ai_wellness_service = get_ai_service(db)
    risk_model = get_risk_model()
    target_encoder = get_target_encoder()
    recommendation_engine = get_recommendation_engine()
    if not risk_model or not target_encoder:
        return jsonify({"detail": "Risk prediction model is not available."}), 503

    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info", {})
    is_admin = user_info.get('role') == 'admin'
    employee_id = user_info.get('employeeId')

    try:
        # If the user is an admin, fetch all records.
        # If the user is an employee, fetch only their own record.
        if is_admin:
            health_records = list(health_records_collection.find({}))
        else:
            health_records = list(health_records_collection.find({'employeeId': employee_id}))

        if not health_records:
            return jsonify([]), 200

        all_recommendations = []

        for record in health_records:
            try:
                employee_id = record.get("employeeId")
                last_updated = record.get("lastUpdated")

                # Check cache first
                if employee_id in ai_wellness_service.recommendation_cache:
                    cached_entry = ai_wellness_service.recommendation_cache[employee_id]
                    if cached_entry.get('timestamp') == last_updated:
                        all_recommendations.append(cached_entry['data'])
                        continue  # Skip re-computation

                # 1. Get risk profile from the classification model
                model_input_df = map_health_record_to_model_input(record)
                encoded_pred = risk_model.predict(model_input_df)[0]
                risk_label = target_encoder.inverse_transform([encoded_pred])[0]

                # 2. Extract and sanitize values with safe defaults to prevent engine float/string casting crashes
                employee_profile = {
                    "bmi": float(record.get("bmi") if record.get("bmi") is not None else 24.0),
                    "sleepHoursPerNight": float(record.get("sleepHoursPerNight") if record.get("sleepHoursPerNight") is not None else 7.0),
                    "exercise_days_per_week": float(record.get("exerciseDaysPerWeek") if record.get("exerciseDaysPerWeek") is not None else record.get("exercise_days_per_week", 3.0)),
                    "stress_score": float(record.get("stressScore") if record.get("stressScore") is not None else record.get("stress_score", 5.0)),
                    "blood_pressure_systolic": float(record.get("bloodPressureSystolic") if record.get("bloodPressureSystolic") is not None else record.get("blood_pressure_systolic", 120.0)),
                    "blood_pressure_diastolic": float(record.get("bloodPressureDiastolic") if record.get("bloodPressureDiastolic") is not None else record.get("blood_pressure_diastolic", 80.0)),
                    "glucose_level": float(record.get("glucoseLevel") if record.get("glucose_level") is not None else record.get("glucose_level", 90.0)),
                    "attendance_percent": float(record.get("attendanceRate") if record.get("attendanceRate") is not None else record.get("attendance_percent", 95.0)),
                    "medical_condition": str(record.get("medicalCondition") if record.get("medicalCondition") is not None else record.get("medical_condition", "none")),
                    "smoker": record.get("smoker", False),
                    "alcohol_use": record.get("alcoholUse", record.get("alcohol_use", False)),
                    "risk_label": str(risk_label)
                }

                # 3. Use the loaded recommendation engine if available.
                #    Safe invocation: a stale/'dict' engine must never crash the employee's recommendations.
                top_recs = _run_recommendation_engine(recommendation_engine, employee_profile, top_n=4)

                # 4. Defense-in-depth: guarantee a valid, non-empty list of recommendation dicts.
                top_recs = _normalize_recommendations(top_recs, employee_profile, top_n=4)

                # Enrich recommendations with media (images & videos) and severity
                enriched_recs = _add_media_to_recommendations(top_recs)
                # Add severity to each recommendation based on risk profile
                for rec in enriched_recs:
                    rec['severity'] = risk_label

                employee_recs = {
                    "employeeId": record.get("employeeId"),
                    "employeeName": record.get("employeeName"),
                    "riskProfile": {"riskType": risk_label},
                    "recommendations": enriched_recs
                }
                all_recommendations.append(employee_recs)

                # Update cache
                ai_wellness_service.recommendation_cache[employee_id] = {
                    'timestamp': last_updated,
                    'data': employee_recs
                }

            except Exception as e:
                app.logger.error(f"Failed to generate recommendations for {record.get('employeeId')}: {e}")
                # Add a placeholder recommendation for the employee if an error occurred
                all_recommendations.append({
                    "employeeId": record.get("employeeId"),
                    "employeeName": record.get("employeeName", "Unknown Employee"),
                    "riskProfile": {"riskType": "Unknown"},
                    "recommendations": [{
                        "title": "Recommendation Generation Failed",
                        "description": f"An error occurred: {e}. Please check employee health data and model loading.",
                        "category": "System", "severity": "Critical"
                    }]
                })

        # For a non-admin user, return just their recommendations directly, not nested in an array.
        if not is_admin and all_recommendations:
            return jsonify(all_recommendations[0].get('recommendations', [])), 200
        else:
            return jsonify(all_recommendations), 200

    except Exception as e:
        app.logger.exception(f"An unexpected error occurred while generating recommendations: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# --- Daily Habits API Endpoints (GET) ---
@app.route('/api/wellness/daily-habits/<employee_id>', methods=['GET'])
@jwt_required(locations=["cookies"])
def get_daily_habits(employee_id):
    """Fetches a specific user's daily habits record."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    # Ensure user can only fetch their own record unless they are an admin
    if user_info.get('role') != 'admin' and user_info.get('employeeId') != employee_id:
        return jsonify({'detail': 'Forbidden: You can only view your own daily habits.'}), 403

    try:
        habit_record = daily_habits_collection.find_one({'employeeId': employee_id})
        if not habit_record:
            return jsonify({'detail': 'Daily habits record not found'}), 404
        habit_record['id'] = str(habit_record['_id'])
        del habit_record['_id']
        return jsonify(habit_record), 200
    except Exception as e:
        app.logger.exception(f"An unexpected error occurred while fetching daily habits for {employee_id}: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# Daily Habits API Endpoints (POST)
@app.route('/api/wellness/daily-habits', methods=['POST'])
# @jwt_required(locations=["cookies"])
def add_daily_habit():
    """Adds a new daily habit record."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    new_habit = request.get_json()

    if not new_habit or 'employeeId' not in new_habit:
        return jsonify({'detail': 'Missing daily habit data or employeeId'}), 400

    # Ensure user can only add their own record unless they are an admin
    if user_info.get('role') != 'admin' and user_info.get('employeeId') != new_habit['employeeId']:
        return jsonify({'detail': 'Forbidden: You can only add your own daily habits.'}), 403

    if daily_habits_collection.find_one({'employeeId': new_habit['employeeId']}):
        return jsonify({'detail': 'Daily habits record for this employee already exists'}), 409

    try:
        if 'id' in new_habit:
            del new_habit['id']
        result = daily_habits_collection.insert_one(new_habit)
        new_habit['id'] = str(result.inserted_id)
        return jsonify(new_habit), 201
    except Exception as e:
        app.logger.exception(f"An unexpected error occurred while adding a daily habit record: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# --- Daily Habit endpoint (PUT) ---
@app.route('/api/wellness/daily-habits/<employee_id>', methods=['PUT'])
# @jwt_required(locations=["cookies"])
def update_daily_habit(employee_id):
    """Updates an existing daily habit record for a given employeeId."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    updated_data = request.get_json()

    if not updated_data:
        return jsonify({'detail': 'Missing update data'}), 400

    # Ensure user can only update their own record unless they are an admin
    if user_info.get('role') != 'admin' and user_info.get('employeeId') != employee_id:
        return jsonify({'detail': 'Forbidden: You can only update your own daily habits.'}), 403

    if 'id' in updated_data:
        del updated_data['id']

    try:
        result = daily_habits_collection.update_one({'employeeId': employee_id}, {'$set': updated_data})
        if result.matched_count == 0:
            return jsonify({'detail': 'Daily habits record not found'}), 404
        return jsonify({'detail': 'Daily habits record updated successfully'}), 200
    except Exception as e:
        app.logger.exception(f"An unexpected error occurred while updating daily habits for {employee_id}: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# --- Mental Health Logs API Endpoints ---
@app.route('/api/wellness/mental-health-logs/<employee_id>', methods=['GET'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def get_mental_health_logs(employee_id):
    """Fetches a specific user's mental health logs."""
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    # if user_info.get('role') != 'admin' and user_info.get('employeeId') != employee_id:
    #     return jsonify({'detail': 'Forbidden: You can only view your own mental health logs.'}), 403

    try:
        # For simplicity, we'll store one log per day, so find the latest one for today
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        log_record = mental_health_logs_collection.find_one(
            {'employeeId': employee_id, 'date': {'$gte': today_start.isoformat()}},
            sort=[('date', -1)]
        )
        if not log_record:
            # Return an empty object instead of 404 if no log is found for today.
            # This is a more graceful way for the frontend to handle "no data yet".
            return jsonify({}), 200
        log_record['id'] = str(log_record['_id'])
        del log_record['_id']
        return jsonify(log_record), 200
    except Exception as e:
        app.logger.exception(f"An unexpected error occurred while fetching mental health logs for {employee_id}: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# --- Mental Health Logs API Endpoints (POST) ---
@app.route('/api/wellness/mental-health-logs', methods=['POST'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def add_mental_health_log():
    """Adds a new mental health log record."""
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    new_log = request.get_json()

    if not new_log or 'employeeId' not in new_log:
        return jsonify({'detail': 'Missing mental health log data or employeeId'}), 400
    # if user_info.get('role') != 'admin' and user_info.get('employeeId') != new_log['employeeId']:
    #     return jsonify({'detail': 'Forbidden: You can only add your own mental health logs.'}), 403

    # For simplicity, prevent adding multiple logs for the same employee on the same day
    today_start_dt = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    if mental_health_logs_collection.find_one({'employeeId': new_log['employeeId'], 'date': {'$gte': today_start_dt}}):
        return jsonify({'detail': 'Mental health log already exists for this employee today. Please update instead.'}), 409

    try:
        if 'id' in new_log:
            del new_log['id']
        new_log['date'] = datetime.now(timezone.utc).isoformat() # Ensure date is set by backend
        result = mental_health_logs_collection.insert_one(new_log)
        new_log['id'] = str(result.inserted_id)
        return jsonify(new_log), 201
    except Exception as e:
        app.logger.exception(f"An unexpected error occurred while adding a mental health log: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# mental health logs API endpoint (PUT)
@app.route('/api/wellness/mental-health-logs/<employee_id>', methods=['PUT'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def update_mental_health_log(employee_id):
    """Updates an existing mental health log for a given employeeId for today."""
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    updated_data = request.get_json()

    if not updated_data:
        return jsonify({'detail': 'Missing update data'}), 400

    # if user_info.get('role') != 'admin' and user_info.get('employeeId') != employee_id:
    #     return jsonify({'detail': 'Forbidden: You can only update your own mental health logs.'}), 403

    if 'id' in updated_data:
        del updated_data['id']
    
    # Only update today's log
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    try:
        result = mental_health_logs_collection.update_one(
            {'employeeId': employee_id, 'date': {'$gte': today_start.isoformat()}},
            {'$set': updated_data}
        )
        if result.matched_count == 0:
            return jsonify({'detail': 'Mental health log not found for today'}), 404
        return jsonify({'detail': 'Mental health log updated successfully'}), 200
    except Exception as e:
        app.logger.exception(f"An unexpected error occurred while updating mental health log for {employee_id}: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500


# --- Health History / "Old Reports" API ---
@app.route('/api/wellness/health-history/<employee_id>', methods=['GET'])
@jwt_required(locations=["cookies"])
def get_health_history(employee_id):
    """Returns the timestamped history of health-record snapshots for an employee,
    newest first — powers the 'Old Reports' timeline and current-vs-previous compare."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    if user_info.get('role') != 'admin' and user_info.get('employeeId') != employee_id:
        return jsonify({'detail': 'Forbidden: You can only view your own health history.'}), 403

    try:
        cursor = health_history_collection.find({'employeeId': employee_id}).sort('snapshotAt', -1)
        history = []
        for rec in cursor:
            rec['id'] = str(rec['_id'])
            del rec['_id']
            history.append(rec)
        return jsonify(history), 200
    except Exception as e:
        app.logger.exception(f"Failed to fetch health history for {employee_id}: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# --- Health Insurance API ---
def _serialize_insurance(doc):
    doc['id'] = str(doc['_id'])
    del doc['_id']
    for claim in doc.get('claims', []):
        claim.setdefault('id', claim.get('id', ''))
    return doc

# insurance endpoint (GET)
@app.route('/api/insurance/<employee_id>', methods=['GET'])
@jwt_required(locations=["cookies"])
def get_insurance(employee_id):
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    if user_info.get('role') != 'admin' and user_info.get('employeeId') != employee_id:
        return jsonify({'detail': 'Forbidden: You can only view your own insurance policy.'}), 403

    policy = insurance_collection.find_one({'employeeId': employee_id})
    if not policy:
        # Return an empty object with a 200 status to handle cases where no policy exists.
        # This prevents a 404 error on the frontend.
        return jsonify({}), 200
    return jsonify(_serialize_insurance(policy)), 200

# insurance endpoint (GET all policies) - admin only
@app.route('/api/insurance', methods=['GET'])
@jwt_required(locations=["cookies"])
def get_all_insurance():
    """Admin-only: list every employee's insurance policy for the Insurance Management module."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    if user_info.get('role') != 'admin':
        return jsonify({'detail': 'Forbidden'}), 403
    policies = [_serialize_insurance(p) for p in insurance_collection.find({})]
    return jsonify(policies), 200

# insurance endpoint (POST) - admin only
@app.route('/api/insurance', methods=['POST'])
@jwt_required(locations=["cookies"])
def create_insurance():
    """Admin-only: create or replace an employee's insurance policy."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    if user_info.get('role') != 'admin':
        return jsonify({'detail': 'Forbidden'}), 403

    data = request.get_json() or {}
    employee_id = data.get('employeeId')
    if not employee_id:
        return jsonify({'detail': 'employeeId is required'}), 400

    doc = {
        'employeeId': employee_id,
        'provider': data.get('provider', ''),
        'policyNumber': data.get('policyNumber', ''),
        'coverage': float(data.get('coverage', 0) or 0),
        'claimUsed': float(data.get('claimUsed', 0) or 0),
        'familyMembers': data.get('familyMembers', []),
        'hospitalList': data.get('hospitalList', []),
        'emergencyNumbers': data.get('emergencyNumbers', []),
        'expiryDate': data.get('expiryDate', ''),
        'claims': data.get('claims', []),
        'updatedAt': datetime.now(timezone.utc).isoformat(),
    }
    insurance_collection.update_one({'employeeId': employee_id}, {'$set': doc}, upsert=True)
    saved = insurance_collection.find_one({'employeeId': employee_id})
    return jsonify(_serialize_insurance(saved)), 201

# --- Insurance endpoint (PUT) - admin only ---
@app.route('/api/insurance/<employee_id>', methods=['PUT'])
@jwt_required(locations=["cookies"])
def update_insurance(employee_id):
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    if user_info.get('role') != 'admin':
        return jsonify({'detail': 'Forbidden'}), 403

    updated_data = request.get_json() or {}
    updated_data.pop('id', None)
    updated_data.pop('employeeId', None)
    updated_data['updatedAt'] = datetime.now(timezone.utc).isoformat()

    result = insurance_collection.update_one({'employeeId': employee_id}, {'$set': updated_data})
    if result.matched_count == 0:
        return jsonify({'detail': 'No insurance policy found for this employee'}), 404
    return jsonify({'detail': 'Insurance policy updated'}), 200

# --- Insurance endpoint (DELETE) - admin only ---
@app.route('/api/insurance/<employee_id>', methods=['DELETE'])
@jwt_required(locations=["cookies"])
def delete_insurance(employee_id):
    """Admin-only: delete an employee's insurance policy.

    The policy cannot be deleted while it has pending (unresolved) claims,
    to preserve the integrity of the claims/approval workflow.
    """
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    if user_info.get('role') != 'admin':
        return jsonify({'detail': 'Forbidden'}), 403

    policy = insurance_collection.find_one({'employeeId': employee_id})
    if not policy:
        return jsonify({'detail': 'No insurance policy found for this employee'}), 404

    pending_claims = [c for c in policy.get('claims', []) if c.get('status') == 'Pending']
    if pending_claims:
        return jsonify({
            'detail': f'Cannot delete: {len(pending_claims)} pending claim(s) must be resolved first.'
        }), 409

    insurance_collection.delete_one({'employeeId': employee_id})
    return '', 204

# insurance endpoint (POST claim) - employee or admin
@app.route('/api/insurance/<employee_id>/claims', methods=['POST'])
@jwt_required(locations=["cookies"])
def file_insurance_claim(employee_id):
    """Employee files a new claim (starts as 'Pending'); admin later approves/rejects."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    if user_info.get('role') != 'admin' and user_info.get('employeeId') != employee_id:
        return jsonify({'detail': 'Forbidden'}), 403

    data = request.get_json() or {}
    claim = {
        'id': os.urandom(6).hex(),
        'description': data.get('description', ''),
        'amount': float(data.get('amount', 0) or 0),
        'date': datetime.now(timezone.utc).isoformat(),
        'status': 'Pending',
    }
    result = insurance_collection.update_one(
        {'employeeId': employee_id},
        {'$push': {'claims': claim}},
    )
    if result.matched_count == 0:
        return jsonify({'detail': 'No insurance policy found for this employee'}), 404
    return jsonify(claim), 201

# insurance endpoint (PUT claim) - admin only
@app.route('/api/insurance/<employee_id>/claims/<claim_id>', methods=['PUT'])
@jwt_required(locations=["cookies"])
def update_insurance_claim(employee_id, claim_id):
    """Admin-only: approve/reject a claim. On approval, adds the amount to claimUsed."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    if user_info.get('role') != 'admin':
        return jsonify({'detail': 'Forbidden'}), 403

    data = request.get_json() or {}
    new_status = data.get('status', 'Pending')

    policy = insurance_collection.find_one({'employeeId': employee_id})
    if not policy:
        return jsonify({'detail': 'No insurance policy found for this employee'}), 404

    claims = policy.get('claims', [])
    target = next((c for c in claims if c.get('id') == claim_id), None)
    if not target:
        return jsonify({'detail': 'Claim not found'}), 404

    was_approved_already = target.get('status') == 'Approved'
    target['status'] = new_status

    update_ops = {'$set': {'claims': claims}}
    if new_status == 'Approved' and not was_approved_already:
        update_ops['$inc'] = {'claimUsed': target.get('amount', 0)}

    insurance_collection.update_one({'employeeId': employee_id}, update_ops)
    return jsonify({'detail': f'Claim {new_status.lower()}'}), 200

# --- Notifications API ---
def _serialize_notification(doc, employee_id=None):
    doc['id'] = str(doc['_id'])
    del doc['_id']
    if employee_id is not None:
        doc['read'] = employee_id in doc.get('readBy', [])
    return doc

# notifications endpoint (GET) - employees see broadcast + targeted; admins can see all sent
@app.route('/api/notifications', methods=['GET'])
@jwt_required(locations=["cookies"])
def get_notifications():
    """Employees see broadcast notifications + ones targeted at them.
    Admins can pass ?all=1 to see everything they've sent."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    employee_id = user_info.get('employeeId')

    if user_info.get('role') == 'admin' and request.args.get('all'):
        cursor = notifications_collection.find({}).sort('createdAt', -1)
    else:
        cursor = notifications_collection.find({
            '$or': [{'targetEmployeeId': None}, {'targetEmployeeId': employee_id}]
        }).sort('createdAt', -1)

    notifications = [_serialize_notification(n, employee_id) for n in cursor]
    return jsonify(notifications), 200

# notificaions endpoint (POST) - admin only
@app.route('/api/notifications', methods=['POST'])
# @jwt_required(locations=["cookies"])
def create_notification():
    """Admin-only: broadcast to everyone (omit targetEmployeeId) or target one employee."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    if user_info.get('role') != 'admin':
        return jsonify({'detail': 'Forbidden'}), 403

    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    message = (data.get('message') or '').strip()
    if not title or not message:
        return jsonify({'detail': 'title and message are required'}), 400

    doc = {
        'title': title,
        'message': message,
        'category': data.get('category', 'General'),
        'targetEmployeeId': data.get('targetEmployeeId') or None,
        'createdAt': datetime.now(timezone.utc).isoformat(),
        'createdBy': user_info.get('name', 'Admin'),
        'readBy': [],
    }
    result = notifications_collection.insert_one(doc)
    doc['id'] = str(result.inserted_id)
    del doc['_id']
    return jsonify(doc), 201

# notification (PUT)
@app.route('/api/notifications/<notification_id>/read', methods=['PUT'])
# @jwt_required(locations=["cookies"])
def mark_notification_read(notification_id):
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    employee_id = user_info.get('employeeId')
    try:
        notifications_collection.update_one(
            {'_id': ObjectId(notification_id)},
            {'$addToSet': {'readBy': employee_id}},
        )
        return jsonify({'detail': 'Marked as read'}), 200
    except Exception as e:
        app.logger.exception(f"Failed to mark notification read: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# notifications (DELETE) endpoint
@app.route('/api/notifications/<notification_id>', methods=['DELETE'])
# @jwt_required(locations=["cookies"])
def delete_notification(notification_id):
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    if user_info.get('role') != 'admin':
        return jsonify({'detail': 'Forbidden'}), 403
    notifications_collection.delete_one({'_id': ObjectId(notification_id)})
    return '', 204

# --- Goal Tracking API ---
@app.route('/api/goals/<employee_id>', methods=['GET'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def get_goals(employee_id):
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    # if user_info.get('role') != 'admin' and user_info.get('employeeId') != employee_id:
    #     return jsonify({'detail': 'Forbidden'}), 403

    goals = []
    for g in goals_collection.find({'employeeId': employee_id}).sort('createdAt', -1):
        g['id'] = str(g['_id'])
        del g['_id']
        goals.append(g)
    return jsonify(goals), 200


@app.route('/api/goals', methods=['POST'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def create_goal():
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    data = request.get_json() or {}
    employee_id = data.get('employeeId', 'public_user')
    # if user_info.get('role') != 'admin' and user_info.get('employeeId') != employee_id:
    #     return jsonify({'detail': 'Forbidden'}), 403
    if not employee_id or not data.get('title'):
        return jsonify({'detail': 'employeeId and title are required'}), 400

    doc = {
        'employeeId': employee_id,
        'title': data.get('title'),
        'targetValue': float(data.get('targetValue', 100) or 100),
        'currentValue': float(data.get('currentValue', 0) or 0),
        'unit': data.get('unit', '%'),
        'status': 'In Progress',
        'createdAt': datetime.now(timezone.utc).isoformat(),
    }
    result = goals_collection.insert_one(doc)
    doc['id'] = str(result.inserted_id)
    del doc['_id']
    return jsonify(doc), 201


@app.route('/api/goals/<goal_id>', methods=['PUT'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def update_goal(goal_id):
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    data = request.get_json() or {}
    data.pop('id', None)
    data.pop('employeeId', None)

    if 'currentValue' in data and 'targetValue' not in data:
        goal = goals_collection.find_one({'_id': ObjectId(goal_id)})
        if goal and float(data['currentValue']) >= float(goal.get('targetValue', 100)):
            data['status'] = 'Completed'

    result = goals_collection.update_one({'_id': ObjectId(goal_id)}, {'$set': data})
    if result.matched_count == 0:
        return jsonify({'detail': 'Goal not found'}), 404
    return jsonify({'detail': 'Goal updated'}), 200

# <--- goals API endpoint (DELETE) --->
@app.route('/api/goals/<goal_id>', methods=['DELETE'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def delete_goal(goal_id):
    goals_collection.delete_one({'_id': ObjectId(goal_id)})
    return '', 204

# diet plans POST endpoint
@app.route('/api/diet-plan', methods=['POST'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def generate_diet_plan():
    """Generates a personalized diet plan using the AI service."""
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info", {})
    data = request.get_json() or {}
    employee_id = data.get('employeeId') # Get employeeId from request body
    preferences = {
        'dietType': data.get('dietType', 'Balanced')
    }

    try:
        ai_wellness_service = get_ai_service(db)
        plan = ai_wellness_service.generate_diet_plan(employee_id, preferences)
        return jsonify(plan), 200
    except Exception as e:
        app.logger.exception(f"AI Diet Plan generation error for {employee_id}: {e}")
        return jsonify({'detail': 'AI service unavailable for diet planning.'}), 500

# --- Achievements API (computed from daily habits + goals, not a separate collection) ---
@app.route('/api/achievements/<employee_id>', methods=['GET'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def get_achievements(employee_id):
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    # if user_info.get('role') != 'admin' and user_info.get('employeeId') != employee_id:
    #     return jsonify({'detail': 'Forbidden'}), 403

    habit = daily_habits_collection.find_one({'employeeId': employee_id}) or {}
    completed_goals = goals_collection.count_documents({'employeeId': employee_id, 'status': 'Completed'})
    history_entries = health_history_collection.count_documents({'employeeId': employee_id})

    badges = []
    if habit.get('sleepHours', 0) and float(habit.get('sleepHours', 0)) >= 7:
        badges.append({'name': 'Healthy Sleeper', 'earned': True, 'desc': 'Logged 7+ hours of sleep'})
    if habit.get('exerciseMinutes', 0) and float(habit.get('exerciseMinutes', 0)) > 0:
        badges.append({'name': 'Fitness Champion', 'earned': True, 'desc': 'Logged exercise activity'})
    if habit.get('meditationMinutes', 0) and float(habit.get('meditationMinutes', 0)) > 0:
        badges.append({'name': 'Meditation Master', 'earned': True, 'desc': 'Practiced meditation'})
    if completed_goals >= 1:
        badges.append({'name': 'Goal Getter', 'earned': True, 'desc': f'{completed_goals} goal(s) completed'})
    if history_entries >= 30:
        badges.append({'name': '30 Day Streak', 'earned': True, 'desc': '30+ health updates logged'})
    if history_entries >= 100:
        badges.append({'name': '100 Day Streak', 'earned': True, 'desc': '100+ health updates logged'})
    if not badges:
        badges.append({'name': 'Getting Started', 'earned': True, 'desc': 'Welcome to your wellness journey!'})

    return jsonify({'badges': badges, 'completedGoals': completed_goals, 'historyEntries': history_entries}), 200

# --- Health Report Download (PDF) ---
@app.route('/api/reports/health-report/<employee_id>', methods=['GET'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def download_health_report(employee_id):
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info", {})
    # if user_info.get('role') != 'admin' and user_info.get('employeeId') != employee_id:
    #     return jsonify({'detail': 'Forbidden'}), 403

    # Import ReportLab components
    from flask import Response
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_CENTER
    from datetime import datetime, timezone

    # Fetch data
    record = health_records_collection.find_one({'employeeId': employee_id}) or {}
    user_doc = users_collection.find_one({'employeeId': employee_id}) or {}

    # Setup PDF document
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=25*mm, bottomMargin=25*mm)
    styles = getSampleStyleSheet()

    # Custom styles
    # Define custom styles only if they don't already exist to prevent errors on hot-reload
    if 'Title' not in styles:
        styles.add(ParagraphStyle(name='Title', fontName='Helvetica-Bold', fontSize=18, spaceAfter=6))
    if 'Subtitle' not in styles:
        styles.add(ParagraphStyle(name='Subtitle', fontName='Helvetica', fontSize=10, textColor=colors.grey, spaceAfter=12))
    if 'UserName' not in styles:
        styles.add(ParagraphStyle(name='UserName', fontName='Helvetica-Bold', fontSize=14, spaceAfter=12))
    if 'SectionTitle' not in styles:
        styles.add(ParagraphStyle(name='SectionTitle', fontName='Helvetica-Bold', fontSize=12, spaceBefore=10, spaceAfter=6, textColor=colors.HexColor("#1e3a8a")))
    if 'Recommendation' not in styles:
        styles.add(ParagraphStyle(name='Recommendation', fontName='Helvetica', fontSize=10, leading=14))
    if 'Footer' not in styles:
        styles.add(ParagraphStyle(name='Footer', fontName='Helvetica-Oblique', fontSize=9, textColor=colors.grey, alignment=TA_CENTER))

    # Helper for color-coding
    def get_assessment_cell(text):
        color_map = {
            'Excellent': colors.HexColor("#10b981"),
            'Good': colors.HexColor("#6366f1"),
            'Fair': colors.HexColor("#f59e0b"),
            'Needs Attention': colors.HexColor("#ef4444"),
        }
        style = ParagraphStyle(name='Assessment', parent=styles['Normal'], textColor=colors.white, alignment=TA_CENTER)
        p = Paragraph(text, style)
        return p, color_map.get(text, colors.lightgrey)

    # Build story
    story = []

    # Header
    story.append(Paragraph('Employee Wellness Health Report', styles['Title']))
    story.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y, %H:%M UTC')}", styles['Subtitle']))
    story.append(Paragraph(f"{user_doc.get('name', employee_id)} ({employee_id})", styles['UserName']))

    # --- Vitals Table ---
    story.append(Paragraph("Key Health Vitals", styles['SectionTitle']))

    assessment_text = record.get('healthAssessment', 'N/A')
    assessment_p, assessment_bg = get_assessment_cell(assessment_text)

    vitals_data = [
        ['Health Assessment', assessment_p],
        ['Age', record.get('age', 'N/A')],
        ['Gender', record.get('gender', 'N/A')],
        ['Department', record.get('department', 'N/A')],
        ['BMI', record.get('bmi', 'N/A')],
        ['Blood Pressure', record.get('bloodPressure', 'N/A')],
        ['Glucose Level (mg/dL)', record.get('glucoseLevel', 'N/A')],
    ]

    vitals_table = Table(vitals_data, colWidths=[50*mm, 120*mm])
    vitals_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor("#e0e7ff")),
        ('BACKGROUND', (1, 0), (1, 0), assessment_bg),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#d1d5db")),
        ('BOX', (0,0), (-1,-1), 1, colors.black),
    ]))
    story.append(vitals_table)
    story.append(Spacer(1, 8*mm))

    # --- Lifestyle Table ---
    story.append(Paragraph("Lifestyle & Mental Health", styles['SectionTitle']))
    
    lifestyle_data = [
        ['Stress Level', record.get('stressLevel', 'N/A')],
        ['Stress Score (1-10)', record.get('stressScore', 'N/A')],
        ['Sleep (hrs/night)', record.get('sleepHoursPerNight', 'N/A')],
        ['Exercise (hrs/wk)', record.get('exerciseHoursPerWeek', 'N/A')],
        ['Smoker', 'Yes' if record.get('smoker') else 'No'],
        ['Alcohol Use', 'Yes' if record.get('alcoholUse') else 'No'],
    ]

    lifestyle_table = Table(lifestyle_data, colWidths=[50*mm, 120*mm])
    lifestyle_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#d1d5db")),
        ('BOX', (0,0), (-1,-1), 1, colors.black),
    ]))
    story.append(lifestyle_table)
    story.append(Spacer(1, 8*mm))

    # --- Recommendation Section ---
    story.append(Paragraph("AI-Generated Recommendation", styles['SectionTitle']))
    
    tips = {
        'Excellent': 'Keep up the great habits — maintain your sleep, exercise, and stress routines.',
        'Good': 'You are doing well. Consider small improvements to sleep or exercise consistency.',
        'Fair': 'Some metrics need attention — prioritize sleep and stress management this month.',
        'Needs Attention': 'Please consult your wellness advisor and schedule a health check-up soon.',
    }
    recommendation_text = tips.get(assessment_text, tips['Good'])
    story.append(Paragraph(recommendation_text, styles['Recommendation']))
    story.append(Spacer(1, 20*mm))

    # --- Footer ---
    story.append(Paragraph('Digitally generated — AI-Based Employee Wellness Management Platform.', styles['Footer']))

    # Build the PDF
    doc.build(story)
    buffer.seek(0)

    return Response(
        buffer.read(),
        mimetype='application/pdf',
        headers={'Content-Disposition': f'attachment; filename=health-report-{employee_id}.pdf'},
    )

# --- Profile Edit API (self-service, works for both employee & admin) ---
@app.route('/api/auth/profile', methods=['PUT'])
@jwt_required(locations=["cookies"])
def update_profile():
    """Lets the logged-in user (employee or admin) edit their own name, department, and avatar."""
    user_id_str = get_jwt_identity()
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    role = user_info.get('role', 'user')

    data = request.get_json() or {}
    allowed_fields = {}
    if 'name' in data and data['name'].strip():
        allowed_fields['name'] = data['name'].strip()
    if 'department' in data:
        allowed_fields['department'] = data['department']
    if 'avatarUrl' in data:
        allowed_fields['avatarUrl'] = data['avatarUrl']
    if 'phone' in data: # Ensure phone is processed
        allowed_fields['phone'] = data['phone'] 

    if not allowed_fields:
        return jsonify({'detail': 'No editable fields provided'}), 400

    try:
        target_collection = admin_collection if role == 'admin' else users_collection
        result = target_collection.update_one({'_id': ObjectId(user_id_str)}, {'$set': allowed_fields})
        if result.matched_count == 0:
            return jsonify({'detail': 'User not found'}), 404

        updated_doc = target_collection.find_one({'_id': ObjectId(user_id_str)})
        new_user_info = {
            "id": user_id_str,
            "name": updated_doc.get('name') or updated_doc.get('username'),
            "email": updated_doc.get('email'),
            "employeeId": updated_doc.get('employeeId'),
            "role": updated_doc.get('role', role),
            "avatarUrl": updated_doc.get("avatarUrl", user_info.get('avatarUrl')),
            "phone": updated_doc.get("phone")
        }
        access_token = create_access_token(identity=user_id_str, additional_claims={"user_info": new_user_info})
        resp = make_response(jsonify({'user': new_user_info}))
        resp.set_cookie('access_token', access_token, httponly=True, samesite='Lax')
        return resp
    except Exception as e:
        app.logger.exception(f"Failed to update profile for {user_id_str}: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# change password endpoint
@app.route('/api/auth/change-password', methods=['PUT'])
@jwt_required(locations=["cookies"])
def change_password():
    """Lets the logged-in user change their own password (requires current password)."""
    user_id_str = get_jwt_identity()
    jwt_payload = get_jwt()
    role = jwt_payload.get("user_info", {}).get('role', 'user')
    data = request.get_json() or {}
    current_password = data.get('currentPassword') or ''
    new_password = data.get('newPassword') or ''

    if len(new_password) < 6:
        return jsonify({'detail': 'New password must be at least 6 characters long.'}), 400

    target_collection = admin_collection if role == 'admin' else users_collection
    user_doc = target_collection.find_one({'_id': ObjectId(user_id_str)})
    if not user_doc or not verify_password(current_password, user_doc.get('password_hash', '')):
        return jsonify({'detail': 'Current password is incorrect.'}), 401

    target_collection.update_one({'_id': ObjectId(user_id_str)}, {'$set': {'password_hash': hash_password(new_password)}})
    return jsonify({'detail': 'Password updated successfully.'}), 200

# --- AI Wellness Service Endpoints ---
from ai_service import get_ai_service
@app.route('/api/ai/chat', methods=['POST'])
@jwt_required(locations=["cookies"])
def ai_chat():
    """AI wellness chat with employee health context."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    data = request.get_json() or {}
    message = data.get('message', '')
    employee_id = data.get('employeeId') or user_info.get('employeeId')
    
    if not message:
        return jsonify({'detail': 'Message is required'}), 400
    try:
        ai_wellness_service = get_ai_service(db)
        result = ai_wellness_service.chat(message, employee_id)
        return jsonify(result), 200
    except Exception as e:
        app.logger.exception(f"AI Chat error: {e}")
        return jsonify({'detail': 'AI service unavailable'}), 500


@app.route('/api/ai/insights/<employee_id>', methods=['GET'])
def ai_insights(employee_id):
    """Get personalized daily wellness insights for an employee."""
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    # if user_info.get('role') != 'admin' and user_info.get('employeeId') != employee_id:
    #     return jsonify({'detail': 'Forbidden'}), 403
    
    try:
        ai_wellness_service = get_ai_service(db)
        insights = ai_wellness_service.generate_daily_insights(employee_id)
        return jsonify(insights), 200
    except Exception as e:
        app.logger.exception(f"AI Insights error: {e}")
        return jsonify({'detail': 'AI service unavailable'}), 500


@app.route('/api/ai/burnout-trend', methods=['GET'])
@jwt_required(locations=["cookies"])
def ai_burnout_trend():
    """Analyze burnout risk trends across employees or departments. Admin-only."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    if user_info.get('role') != 'admin':
        return jsonify({'detail': 'Forbidden'}), 403
    
    department = request.args.get('department')
    try:
        ai_wellness_service = get_ai_service(db)
        trend = ai_wellness_service.analyze_burnout_trend(department)
        return jsonify(trend), 200
    except Exception as e:
        app.logger.exception(f"AI Burnout Trend error: {e}")
        return jsonify({'detail': 'AI service unavailable'}), 500


@app.route('/api/ai/routine', methods=['POST'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def ai_generate_routine():
    """Generate a personalized daily wellness routine."""
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    data = request.get_json() or {}
    employee_id = data.get('employeeId') # or user_info.get('employeeId')
    preferences = data.get('preferences', {})
    
    try:
        ai_wellness_service = get_ai_service(db)
        routine = ai_wellness_service.generate_daily_routine(employee_id, preferences)
        return jsonify(routine), 200
    except Exception as e:
        app.logger.exception(f"AI Routine error: {e}")
        return jsonify({'detail': 'AI service unavailable'}), 500


# --- Annual Health Check-up Scheduler ---
@app.route('/api/checkups', methods=['GET'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def get_checkups():
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    # if user_info.get('role') == 'admin' and request.args.get('all'):
    cursor = checkup_appointments_collection.find({}).sort('date', 1)
    # else:
    #     cursor = checkup_appointments_collection.find({'employeeId': user_info.get('employeeId')}).sort('date', 1)
    appointments = []
    for a in cursor:
        a['id'] = str(a['_id'])
        del a['_id']
        appointments.append(a)
    return jsonify(appointments), 200

@app.route('/api/checkups', methods=['POST'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def book_checkup():
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    data = request.get_json() or {}
    # employee_id = user_info.get('employeeId') if user_info.get('role') != 'admin' else data.get('employeeId', user_info.get('employeeId'))
    employee_id = data.get('employeeId', 'public_user')
    employee_name = data.get('employeeName', 'Public User')
    if not data.get('date'):
        return jsonify({'detail': 'date is required'}), 400

    doc = {
        'employeeId': employee_id,
        'employeeName': employee_name,
        'date': data.get('date'),
        'checkupType': data.get('checkupType', 'Annual Health Check-up'),
        'notes': data.get('notes', ''),
        'status': 'Scheduled',
        'createdAt': datetime.now(timezone.utc).isoformat(),
    }
    result = checkup_appointments_collection.insert_one(doc)
    doc['id'] = str(result.inserted_id)
    del doc['_id']
    return jsonify(doc), 201


@app.route('/api/checkups/<checkup_id>', methods=['PUT'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def update_checkup(checkup_id):
    """Admin updates status (Confirmed/Completed/Cancelled); employee can reschedule/cancel their own."""
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    data = request.get_json() or {}
    data.pop('id', None)

    appt = checkup_appointments_collection.find_one({'_id': ObjectId(checkup_id)})
    if not appt:
        return jsonify({'detail': 'Appointment not found'}), 404
    # if user_info.get('role') != 'admin' and appt.get('employeeId') != user_info.get('employeeId'):
    #     return jsonify({'detail': 'Forbidden'}), 403

    checkup_appointments_collection.update_one({'_id': ObjectId(checkup_id)}, {'$set': data})
    return jsonify({'detail': 'Appointment updated'}), 200


@app.route('/api/checkups/<checkup_id>', methods=['DELETE'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def delete_checkup(checkup_id):
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    appt = checkup_appointments_collection.find_one({'_id': ObjectId(checkup_id)})
    if not appt:
        return '', 204
    # if user_info.get('role') != 'admin' and appt.get('employeeId') != user_info.get('employeeId'):
    #     return jsonify({'detail': 'Forbidden'}), 403
    checkup_appointments_collection.delete_one({'_id': ObjectId(checkup_id)})
    return '', 204


# --- Emergency SOS ---
@app.route('/api/sos', methods=['POST'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def trigger_sos():
    """Employee triggers an SOS alert. Attaches their emergency contact + latest known vitals
    automatically so admins/responders have the info they need immediately."""
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    data = request.get_json() or {}
    employee_id = data.get('employeeId', 'public_user')
    user_name = data.get('employeeName', 'Public User')

    record = health_records_collection.find_one({'employeeId': employee_id}) or {}
    doc = {
        'employeeId': employee_id,
        'employeeName': user_name,
        'message': data.get('message', 'Emergency SOS triggered'),
        'emergencyContactName': record.get('emergencyContactName', ''),
        'emergencyContactPhone': record.get('emergencyContactPhone', ''),
        'bloodGroup': record.get('bloodGroup', ''),
        'allergies': record.get('allergies', ''),
        'existingDiseases': record.get('existingDiseases', ''),
        'status': 'Active',
        'createdAt': datetime.now(timezone.utc).isoformat(),
    }
    result = sos_alerts_collection.insert_one(doc)
    doc['id'] = str(result.inserted_id)
    del doc['_id']
    return jsonify(doc), 201


@app.route('/api/sos', methods=['GET'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def get_sos_alerts():
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    # if user_info.get('role') == 'admin':
    cursor = sos_alerts_collection.find({}).sort('createdAt', -1)
    # else:
    #     cursor = sos_alerts_collection.find({'employeeId': user_info.get('employeeId')}).sort('createdAt', -1)
    alerts = []
    for a in cursor:
        a['id'] = str(a['_id'])
        del a['_id']
        alerts.append(a)
    return jsonify(alerts), 200


@app.route('/api/sos/<sos_id>/resolve', methods=['PUT'])
@jwt_required(locations=["cookies"])
def resolve_sos(sos_id):
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    if user_info.get('role') != 'admin':
        return jsonify({'detail': 'Forbidden'}), 403
    sos_alerts_collection.update_one({'_id': ObjectId(sos_id)}, {'$set': {'status': 'Resolved'}})
    return jsonify({'detail': 'Alert resolved'}), 200

# --- Health Expense Tracker ---
@app.route('/api/expenses', methods=['GET'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def get_expenses():
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    # if user_info.get('role') == 'admin' and request.args.get('all'):
    cursor = expenses_collection.find({}).sort('date', -1)
    # else:
    #     cursor = expenses_collection.find({'employeeId': user_info.get('employeeId')}).sort('date', -1)
    expenses = []
    for e in cursor:
        e['id'] = str(e['_id'])
        del e['_id']
        expenses.append(e)
    return jsonify(expenses), 200


@app.route('/api/expenses', methods=['POST'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def add_expense():
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    data = request.get_json() or {}
    employee_id = data.get('employeeId', 'public_user')
    employee_name = data.get('employeeName', 'Public User')

    if not data.get('description') or not data.get('amount'):
        return jsonify({'detail': 'description and amount are required'}), 400

    doc = {
        'employeeId': employee_id,
        'employeeName': employee_name,
        'description': data.get('description'),
        'amount': float(data.get('amount', 0) or 0),
        'category': data.get('category', 'General'),
        'date': data.get('date') or datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        'status': 'Pending',
        'createdAt': datetime.now(timezone.utc).isoformat(),
    }
    result = expenses_collection.insert_one(doc)
    doc['id'] = str(result.inserted_id)
    del doc['_id']
    return jsonify(doc), 201


@app.route('/api/expenses/<expense_id>', methods=['PUT'])
@jwt_required(locations=["cookies"])
def update_expense(expense_id):
    """Admin-only: approve/reject a reimbursement claim."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info")
    if user_info.get('role') != 'admin':
        return jsonify({'detail': 'Forbidden'}), 403
    data = request.get_json() or {}
    status = data.get('status', 'Pending')
    expenses_collection.update_one({'_id': ObjectId(expense_id)}, {'$set': {'status': status}})
    return jsonify({'detail': f'Expense {status.lower()}'}), 200


@app.route('/api/expenses/<expense_id>', methods=['DELETE'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def delete_expense(expense_id):
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info")
    expense = expenses_collection.find_one({'_id': ObjectId(expense_id)})
    if not expense:
        return '', 204
    # if user_info.get('role') != 'admin' and expense.get('employeeId') != user_info.get('employeeId'):
    #     return jsonify({'detail': 'Forbidden'}), 403
    expenses_collection.delete_one({'_id': ObjectId(expense_id)})
    return '', 204

# --- Sentiment GET Endpoint ---
@app.route('/api/wellness/sentiments', methods=['GET'])
@jwt_required(locations=["cookies"])
def get_sentiments():
    """ Fetches department sentiment summary. Admin-only endpoint. """
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info", {})
    if user_info.get('role', '').lower() != 'admin':
        return jsonify({'detail': 'Forbidden: You do not have permission to access this resource.'}), 403

    try:
        # Aggregation pipeline to calculate stats for each department from MongoDB.
        # Includes per-sentiment counts so the frontend can render the
        # positive / neutral / negative distribution bars correctly.
        pipeline = [
            {
                '$group': {
                    '_id': '$department',
                    'total_feedback': { '$sum': 1 },
                    'avg_stress_score': { '$avg': '$stressScore' },
                    'positive_count': {
                        '$sum': { '$cond': [{ '$eq': ['$sentiment', 'Positive'] }, 1, 0] }
                    },
                    'neutral_count': {
                        '$sum': { '$cond': [{ '$eq': ['$sentiment', 'Neutral'] }, 1, 0] }
                    },
                    'negative_count': {
                        '$sum': { '$cond': [{ '$eq': ['$sentiment', 'Negative'] }, 1, 0] }
                    }
                }
            },
            {
                '$project': {
                    'department': '$_id',
                    'total_feedback': 1,
                    'avg_stress_score': { '$round': ['$avg_stress_score', 1] },
                    'positive_count': 1,
                    'neutral_count': 1,
                    'negative_count': 1,
                    '_id': 0
                }
            }
        ]

        department_stats = list(sentiment_pulses_collection.aggregate(pipeline))

        # Fetch the 3 most recent non-empty feedback texts for each department
        key_issues_pipeline = [
            { '$match': { 'feedbackText': { '$ne': '' } } },
            { '$sort': { 'date': -1 } }, # Sort by date descending
            { '$group': {
                '_id': '$department',
                'recent_issues': {
                    '$push': {
                        '$concat': [
                            { '$ifNull': ['$sentiment', 'Neutral'] },
                            ': ',
                            '$feedbackText'
                        ]
                    }
                }
            }},
            { '$project': {
                'department': '$_id',
                # The feedback is already sorted by date, so we just take an extended logger list
                'latestFeedbackLogs': { '$slice': ['$recent_issues', 10] },
                '_id': 0
            }}
        ]
        key_issues_data = {item['department']: item['latestFeedbackLogs'] for item in sentiment_pulses_collection.aggregate(key_issues_pipeline)}

        # Combine the aggregated stats with the key issues and sentiment distribution
        results = []
        for stats in department_stats:
            total = stats['total_feedback'] or 1
            positive = stats.get('positive_count', 0)
            neutral = stats.get('neutral_count', 0)
            negative = stats.get('negative_count', 0)
            results.append({
                "department": stats['department'],
                "averageStressScore": stats['avg_stress_score'],
                "keyIssues": key_issues_data.get(stats['department'], ["No specific issues logged"]),
                "recentFeedbackCount": stats['total_feedback'],
                # Distribution percentages computed so the frontend bars fill correctly
                "sentimentDistribution": {
                    "positive": round((positive / total) * 100),
                    "neutral": round((neutral / total) * 100),
                    "negative": round((negative / total) * 100)
                },
                # Feedback logger: recent raw feedback entries per department
                "feedbackLogs": key_issues_data.get(stats['department'], [])
            })

        # If no sentiment data is available at all, return a default placeholder
        if not results:
            return jsonify([{
                "department": "All Departments",
                "averageStressScore": 0,
                "keyIssues": ["No feedback has been submitted yet. Encourage employees to use the pulse check feature."],
                "recentFeedbackCount": 0,
                "sentimentDistribution": {"positive": 0, "neutral": 0, "negative": 0},
                "feedbackLogs": [],
                "isPlaceholder": True
            }]), 200

        return jsonify(results), 200
    except Exception as e:
        app.logger.exception(f"An unexpected error occurred while fetching sentiments: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# --- Performance Analytics Endpoint ---
@app.route('/api/wellness/performance', methods=['GET'])
@jwt_required(locations=["cookies"])
def get_performance_analytics():
    ai_wellness_service = get_ai_service(db)
    """
    Computes real-time performance KPIs from MongoDB collections.
    Returns overall organization-level metrics and department breakdowns.
    Admin-only endpoint.
    """
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info", {})
    if user_info.get('role', '').lower() != 'admin':
        return jsonify({'detail': 'Forbidden: You do not have permission to access this resource.'}), 403

    # Check cache first
    # For performance analytics, we need to check if any health record has been updated
    # since the last cache. This is more complex than per-employee.
    # A simple approach: get the latest 'lastUpdated' from all records.
    latest_record_update = health_records_collection.find_one(
        {}, sort=[('lastUpdated', -1)]
    )
    max_last_updated_timestamp = latest_record_update.get('lastUpdated') if latest_record_update else None
    
    # Invalidate cache if the latest record update is newer than the cache's timestamp,
    # or if the total number of records has changed (e.g., new employee added/deleted).
    if ai_wellness_service.performance_analytics_cache and \
       ai_wellness_service.performance_analytics_cache.get('timestamp') == max_last_updated_timestamp and \
       'data' in ai_wellness_service.performance_analytics_cache and \
       ai_wellness_service.performance_analytics_cache.get('totalRecords') == health_records_collection.count_documents({}):
        return jsonify(ai_wellness_service.performance_analytics_cache['data']), 200

    try:
        # Fetch all health records
        all_records = list(health_records_collection.find({}))
        total_employees = len(all_records) or 1  # Avoid division by zero

        # --- 1. Participation Rate ---
        # Employees who have logged exercise > 0 OR sleep >= 6 hours are "participating"
        participating = sum(1 for r in all_records 
                          if (r.get('exerciseHoursPerWeek', 0) or 0) > 0 
                          or (r.get('sleepHoursPerNight', 0) or 0) >= 6)
        participation_rate = round((participating / total_employees) * 100)

        # --- 2. Absenteeism Rate ---
        # Based on employees with "Needs Attention" health assessment, high stress, or high risk
        needs_attention = sum(1 for r in all_records if r.get('healthAssessment') == 'Needs Attention')
        high_stress = sum(1 for r in all_records if r.get('stressLevel') == 'High')
        absenteeism_rate = round(((needs_attention + high_stress) / total_employees) * 5 + 2.1, 1)

        # --- 3. Overall Health Risk Score ---
        # Aggregate risk score from all employees (weighted by stress, bmi, sleep)
        risk_scores = []
        for r in all_records:
            score = 0
            if r.get('stressLevel') == 'High':
                score += 25
            elif r.get('stressLevel') == 'Medium':
                score += 10
            bmi = r.get('bmi', 24) or 24
            if bmi >= 30:
                score += 20
            elif bmi >= 25:
                score += 10
            sleep = r.get('sleepHoursPerNight', 7) or 7
            if sleep < 6:
                score += 20
            elif sleep < 7:
                score += 10
            if r.get('smoker'):
                score += 15
            if r.get('alcoholUse'):
                score += 10
            risk_scores.append(score)
        overall_health_risk_score = round(sum(risk_scores) / len(risk_scores), 1) if risk_scores else 0

        # --- 4. Program Effectiveness ---
        # Inverse of the risk score + sentiment-based adjustment
        effectiveness = max(50, min(100, 100 - overall_health_risk_score))

        # --- 5. Department-level breakdown ---
        departments = {}
        for r in all_records:
            dept = r.get('department', 'Unknown')
            if dept not in departments:
                departments[dept] = {
                    'total': 0, 'stress_sum': 0, 'bmi_sum': 0, 
                    'sleep_sum': 0, 'exercise_sum': 0,
                    'risk_score_sum': 0, 'health_assessments': []
                }
            d = departments[dept]
            d['total'] += 1
            d['stress_sum'] += (r.get('stressScore', 5) or 5)
            d['bmi_sum'] += (r.get('bmi', 24) or 24)
            d['sleep_sum'] += (r.get('sleepHoursPerNight', 7) or 7)
            d['exercise_sum'] += (r.get('exerciseHoursPerWeek', 3) or 3)
            d['risk_score_sum'] += risk_scores[all_records.index(r)] if len(risk_scores) > all_records.index(r) else 0
            d['health_assessments'].append(r.get('healthAssessment', 'Good'))

        # Fetch latest burnout trend data from AI wellness service
        burnout_data = {}
        try:
            ai_wellness_service = get_ai_service(db)
            burnout_data = ai_wellness_service.analyze_burnout_trend()
        except Exception:
            burnout_data = {'highBurnoutCount': 0, 'moderateBurnoutCount': 0, 'lowBurnoutCount': 0,
                          'risk_level': 'low', 'average_burnout_score': 0}

        # Build department details
        department_details = []
        for dept_name, d in departments.items():
            t = d['total']
            high_risk_count = sum(1 for a in d['health_assessments'] if a == 'Needs Attention')
            wellness_score = round(100 - (d['risk_score_sum'] / t), 1) if t else 0
            
            department_details.append({
                'department': dept_name,
                'employeeCount': t,
                'avgStressScore': round(d['stress_sum'] / t, 1),
                'avgBmi': round(d['bmi_sum'] / t, 1),
                'avgSleep': round(d['sleep_sum'] / t, 1),
                'avgExercise': round(d['exercise_sum'] / t, 1),
                'highRiskCount': high_risk_count,
                'wellnessScore': max(0, min(100, wellness_score))
            })

        response_data = {
            'kpis': {
                'participationRate': participation_rate,
                'absenteeismRate': absenteeism_rate,
                'overallHealthRiskScore': overall_health_risk_score,
                'programEffectiveness': effectiveness,
                'totalEmployees': total_employees,
            },
            'departmentDetails': department_details,
            'burnoutTrend': {
                'highBurnoutCount': burnout_data.get('risk_distribution', {}).get('high_risk', 
                    sum(1 for r in all_records if (r.get('stressLevel') == 'High' and (r.get('bmi', 0) or 0) >= 30))),
                'moderateBurnoutCount': burnout_data.get('risk_distribution', {}).get('medium_risk',
                    sum(1 for r in all_records if r.get('stressLevel') == 'Medium')),
                'lowBurnoutCount': burnout_data.get('risk_distribution', {}).get('low_risk',
                    sum(1 for r in all_records if r.get('stressLevel') == 'Low' or r.get('stressLevel') is None)),
                'riskLevel': burnout_data.get('risk_level', 'low'),
                'averageScore': round(burnout_data.get('average_burnout_score', 0), 1) if burnout_data.get('average_burnout_score') else 0,
            },
            'totalRecordsAnalyzed': total_employees,
            'generatedAt': datetime.now(timezone.utc).isoformat(),
        }

        response_data['cacheTimestamp'] = max_last_updated_timestamp # Store the timestamp used for this cache

        # Update cache
        ai_wellness_service.performance_analytics_cache = {
            'timestamp': max_last_updated_timestamp,
            'totalRecords': total_employees,
            'data': response_data
        }

        return jsonify(response_data), 200

    except Exception as e:
        app.logger.exception(f"Failed to compute performance analytics: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# sentiment-pulse endpoint
@app.route('/api/wellness/sentiment-pulse', methods=['POST'])
@jwt_required(locations=["cookies"])
def add_sentiment_pulse():
    """
    Receives a sentiment pulse from a user and stores it
in the sentiment_pulses MongoDB collection.
    """
    data = request.get_json() or {}
    if not data or 'department' not in data or 'stressScore' not in data:
        return jsonify({'detail': 'Missing department or stressScore'}), 400
    
    try:
        feedback_text = data.get('feedbackText', '')
        stress_score = float(data['stressScore'])
        employee_id = data.get('employeeId') # Added employeeId

        # Use VADER for sentiment analysis if text is provided, otherwise fallback to stress score
        sia = get_sentiment_analyzer()
        if feedback_text and sia:
            sentiment_scores = sia.polarity_scores(feedback_text)
            compound_score = sentiment_scores['compound']
            if compound_score >= 0.05:
                sentiment = 'Positive'
            elif compound_score <= -0.05:
                sentiment = 'Negative'
            else:
                sentiment = 'Neutral'
        else:
            # Fallback logic based on stress score if no text or VADER is unavailable
            sentiment = 'Neutral'
            if stress_score >= 7.0: sentiment = 'Negative'
            elif stress_score <= 4.0: sentiment = 'Positive'

        # Create the document to be inserted into MongoDB
        pulse_doc = {
            "employeeId": employee_id, # Added employeeId
            "department": data['department'],
            "stressScore": stress_score,
            "feedbackText": feedback_text,
            "sentiment": sentiment,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }

        sentiment_pulses_collection.insert_one(pulse_doc)

        return jsonify({
            'detail': 'Sentiment pulse recorded successfully.',
            'sentiment': sentiment
        }), 201

    except Exception as e:
        app.logger.exception(f"Failed to record sentiment pulse: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# --- Get All Sentiment Pulses (Admin Only) ---
@app.route('/api/wellness/sentiment-pulse/all', methods=['GET'])
@jwt_required(locations=["cookies"])
def get_all_sentiment_pulses():
    """ Fetches all individual sentiment pulses. Admin-only. """
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info", {})
    if user_info.get('role', '').lower() != 'admin':
        return jsonify({'detail': 'Forbidden'}), 403

    try:
        pulses_cursor = sentiment_pulses_collection.find({})
        pulses = []
        for pulse in pulses_cursor:
            pulse['id'] = str(pulse['_id'])
            del pulse['_id']
            pulses.append(pulse)
        return jsonify(pulses), 200
    except Exception as e:
        app.logger.exception(f"Failed to fetch all sentiment pulses: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

@app.route('/api/wellness/sentiment-pulse/<pulse_id>', methods=['DELETE'])
@jwt_required(locations=["cookies"])
def delete_sentiment_pulse(pulse_id):
    """ Deletes a single sentiment pulse by its ID. Admin-only. """
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info", {})
    if user_info.get('role', '').lower() != 'admin':
        return jsonify({'detail': 'Forbidden'}), 403

    try:
        result = sentiment_pulses_collection.delete_one({'_id': ObjectId(pulse_id)})
        if result.deleted_count == 0:
            return jsonify({'detail': 'Pulse not found'}), 404
        return '', 204
    except Exception as e:
        app.logger.exception(f"Failed to delete sentiment pulse {pulse_id}: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# --- Get An Individual Employee's Sentiment Pulses ---
@app.route('/api/wellness/sentiment-pulse/<employee_id>', methods=['GET'])
# @jwt_required(locations=["cookies"]) # Temporarily remove auth for public access
def get_employee_sentiment_pulses(employee_id):
    """ Fetches the sentiment pulses for a single employee.

    An employee can only view their own pulses, while an admin can view any
    employee's pulses. This powers the employee dashboard's "My Mental Health
    & Sentiment" section.
    """
    # jwt_payload = get_jwt()
    # user_info = jwt_payload.get("user_info", {})
    # role = user_info.get('role', '').lower()
    # if role != 'admin' and user_info.get('employeeId') != employee_id:
    #     return jsonify({'detail': 'Forbidden: You can only view your own sentiment pulses.'}), 403

    try:
        pulses_cursor = sentiment_pulses_collection.find({'employeeId': employee_id}).sort('createdAt', -1)
        pulses = []
        for pulse in pulses_cursor:
            pulse['id'] = str(pulse['_id'])
            del pulse['_id']
            pulses.append(pulse)
        return jsonify(pulses), 200
    except Exception as e:
        app.logger.exception(f"Failed to fetch sentiment pulses for employee {employee_id}: {e}")
        return jsonify({'detail': 'Internal Server Error'}), 500

# --- System Settings API ---
@app.route('/api/settings', methods=['GET'])
@jwt_required(locations=["cookies"])
def get_system_settings():
    """Admin-only: Get system-wide settings."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info", {})
    if user_info.get('role') != 'admin':
        return jsonify({'detail': 'Forbidden'}), 403

    # Find the single settings document, or create a default one if it doesn't exist
    settings = system_settings_collection.find_one({'_id': 'system_config'})
    if not settings:
        settings = {
            '_id': 'system_config',
            'llmProvider': 'ollama',
            # Default model name from env or hardcoded fallback
            'aiModelName': os.getenv('AI_MODEL_NAME', 'qwen3:1.7b'), 
            'highRiskThreshold': 70,
            'mediumRiskThreshold': 45,
            'enableEmailNotifications': False,
            'enableSmsNotifications': False,
            'dataRetentionDays': 365,
            'anonymizeSentiment': True,
        }
        system_settings_collection.insert_one(settings)
    
    settings.pop('_id', None) # Don't send the internal ID to the client
    settings.pop('aiModelName', None) # Explicitly remove aiModelName as it's now env-controlled
    return jsonify(settings), 200


@app.route('/api/settings', methods=['PUT'])
@jwt_required(locations=["cookies"])
def update_system_settings():
    """Admin-only: Update system-wide settings."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info", {})
    if user_info.get('role') != 'admin':
        return jsonify({'detail': 'Forbidden'}), 403

    data = request.get_json() or {}
    
    # Prepare update operations
    update_ops = {'$set': data}
    
    # Crucial: Explicitly unset aiModelName from the database, as it's now env-controlled
    # This cleans up any old, incorrect values that might be lingering.
    update_ops['$unset'] = {'aiModelName': ''}

    # Update the single settings document, using upsert to create it if it doesn't exist
    system_settings_collection.update_one(
        {'_id': 'system_config'}, # Target the system_config document
        update_ops, # Apply both $set for other fields and $unset for aiModelName
        upsert=True
    )
    
    return jsonify({'detail': 'Settings updated successfully'}), 200

# --- Customer Support Tickets API ---
@app.route('/api/support/ticket', methods=['POST'])
@jwt_required(locations=["cookies"])
def submit_support_ticket():
    """Employee submits a customer support ticket (starts as 'Open')."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info", {})
    data = request.get_json() or {}

    subject = (data.get('subject') or '').strip()
    message = (data.get('message') or '').strip()
    if not subject or not message:
        return jsonify({'detail': 'subject and message are required'}), 400

    doc = {
        'employeeId': data.get('employeeId') or user_info.get('employeeId'),
        'employeeName': data.get('employeeName') or user_info.get('name'),
        'subject': subject,
        'message': message,
        'status': 'Open',
        'createdAt': datetime.now(timezone.utc).isoformat(),
    }
    result = support_tickets_collection.insert_one(doc)
    doc['id'] = str(result.inserted_id)
    del doc['_id']
    return jsonify(doc), 201


@app.route('/api/support/tickets', methods=['GET'])
@jwt_required(locations=["cookies"])
def get_support_tickets():
    """Employees see their own tickets; admins can pass ?all=1 to see every ticket."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info", {})
    if user_info.get('role') == 'admin' and request.args.get('all'):
        cursor = support_tickets_collection.find({}).sort('createdAt', -1)
    else:
        cursor = support_tickets_collection.find({'employeeId': user_info.get('employeeId')}).sort('createdAt', -1)

    tickets = []
    for t in cursor:
        t['id'] = str(t['_id'])
        del t['_id']
        tickets.append(t)
    return jsonify(tickets), 200


@app.route('/api/support/tickets/<ticket_id>', methods=['PUT'])
@jwt_required(locations=["cookies"])
def update_support_ticket(ticket_id):
    """Admin-only: update the status (e.g. Open -> In Progress -> Resolved)."""
    jwt_payload = get_jwt()
    user_info = jwt_payload.get("user_info", {})
    if user_info.get('role') != 'admin':
        return jsonify({'detail': 'Forbidden'}), 403

    data = request.get_json() or {}
    status = (data.get('status') or '').strip()
    if status not in {'Open', 'In Progress', 'Resolved', 'Closed'}:
        return jsonify({'detail': 'Invalid status'}), 400

    result = support_tickets_collection.update_one(
        {'_id': ObjectId(ticket_id)},
        {'$set': {'status': status, 'updatedAt': datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        return jsonify({'detail': 'Ticket not found'}), 404
    return jsonify({'detail': f'Ticket marked as {status}'}), 200

# Warm the recommendation video-availability cache in the background at startup so the
# FIRST recommendations request is fast (no cold-start timeout -> no need to reload).
# Safely guarded so it can never break server startup.
_warm_video_availability()

# --- Main Entry Point ---
if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)
