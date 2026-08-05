import os
import sys
from flask_app import app
from waitress import serve

def serve_app():
    port = int(os.getenv('PORT', 8000))
    print(f"Serving Flask app with Waitress on http://0.0.0.0:{port}")
    serve(app, host='0.0.0.0', port=port)