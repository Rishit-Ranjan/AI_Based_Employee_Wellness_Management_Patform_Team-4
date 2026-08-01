import os
import sys
from flask_app import app

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    print('Starting backend with Python:', sys.executable)
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)
