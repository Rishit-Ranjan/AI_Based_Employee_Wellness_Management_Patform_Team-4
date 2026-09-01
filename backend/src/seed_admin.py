"""Seed a default admin user into MongoDB if not present."""
import os
from pymongo import MongoClient
from pymongo.errors import ConfigurationError
import bcrypt
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'employee_wellness_analytics')
MONGO_URI = os.getenv('MONGO_URI', f'mongodb://localhost:27017/{MONGO_DB_NAME}')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@platform.com')
ADMIN_PASSWORD = os.getenv('ADMIN_PLAIN_PASSWORD', 'admin')
ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'Platform Admin')
ADMIN_ID= os.getenv('ADMIN_ID', 'ADM001')

def seed():
    client = MongoClient(MONGO_URI)
    try:
        db = client.get_default_database()
    except ConfigurationError:
        db = client.get_database(MONGO_DB_NAME)
    admin_col = db.get_collection('admin')
    existing = admin_col.find_one({'email': ADMIN_EMAIL.lower()})
    if existing:
        print('Admin already exists:', ADMIN_EMAIL)
        return

    if len(ADMIN_PASSWORD.encode('utf-8')) > 72:
        print(f"ERROR: Admin password is too long (max 72 bytes). Please check your ADMIN_PLAIN_PASSWORD environment variable.")
        return

    pwd_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    admin_doc = {
        'username': ADMIN_USERNAME,
        'email': ADMIN_EMAIL.lower(),
        'adminId': ADMIN_ID,
        'password_hash': pwd_hash,
        'role': 'admin',
        'createdAt': datetime.now(timezone.utc).isoformat()
    }
    res = admin_col.insert_one(admin_doc)
    print('Created admin with id', res.inserted_id)

if __name__ == '__main__':
    seed()
