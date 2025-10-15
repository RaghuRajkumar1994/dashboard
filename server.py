import json
import os
import uuid
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
import pandas as pd # Essential for reading Excel files
from werkzeug.utils import secure_filename # Used for safe file names

# --- CONFIGURATION ---
DATA_DIR = 'data'
DASHBOARD_FILE = os.path.join(DATA_DIR, 'db_dashboard.json')
TREND_FILE = os.path.join(DATA_DIR, 'db_trend.json')
NOTES_FILE = os.path.join(DATA_DIR, 'db_notes.json')
UPLOAD_FOLDER = os.path.join(DATA_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'json', 'xlsx', 'xls'} 

# Ensure the data directory and upload directory exists
# On Render, this creates directories in the writable filesystem.
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# --- FLASK SETUP ---
# Serve the static files (index.html, style.css, script.js) from the current directory
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app) 
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- DATA UTILITIES ---

def load_data(filepath, default_content={}):
    """Loads data from a JSON file."""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        save_data(filepath, default_content)
        return default_content
    except json.JSONDecodeError:
        print(f"Warning: JSON decode error in {filepath}. Reverting to default.")
        save_data(filepath, default_content)
        return default_content

def save_data(filepath, data):
    """Saves data to a JSON file."""
    # Ensure the directory exists before writing
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=4)

# --- PASSWORD UTILITY ---
PASSWORD_FILE = os.path.join(DATA_DIR, 'password.txt')
def get_password():
    try:
        with open(PASSWORD_FILE, 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        # Default password if file is not found
        default_password = '12345'
        set_password(default_password)
        return default_password

def set_password(new_password):
    with open(PASSWORD_FILE, 'w') as f:
        f.write(new_password)

# --- HELPER FUNCTIONS ---

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- ROUTES ---

@app.route('/')
def serve_index():
    # Serve index.html from the current directory
    return send_from_directory('.', 'index.html')

# --- DATA API ROUTES ---

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    # Load all data files
    dashboard_data = load_data(DASHBOARD_FILE, {})
    trend_data = load_data(TREND_FILE, [])
    notes_data = load_data(NOTES_FILE, [])

    return jsonify({
        "dashboard": dashboard_data,
        "trend": trend_data,
        "notes": notes_data
    })

@app.route('/api/dashboard', methods=['POST'])
def save_dashboard():
    data = request.json
    save_data(DASHBOARD_FILE, data)
    return jsonify({"message": "Dashboard data saved successfully"})

@app.route('/api/trend', methods=['POST'])
def save_trend():
    data = request.json
    save_data(TREND_FILE, data)
    return jsonify({"message": "Trend data saved successfully"})

@app.route('/api/notes', methods=['POST'])
def save_notes():
    data = request.json
    save_data(NOTES_FILE, data)
    return jsonify({"message": "Notes data saved successfully"})

# --- PASSWORD ROUTE ---
@app.route('/api/password', methods=['POST'])
def update_password():
    data = request.json
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if current_password == get_password():
        set_password(new_password)
        return jsonify({"message": "Password updated successfully"}), 200
    else:
        return jsonify({"error": "Incorrect current password"}), 401
    
@app.route('/api/auth', methods=['POST'])
def authenticate():
    data = request.json
    password = data.get('password')
    
    if password == get_password():
        return jsonify({"message": "Authenticated"}), 200
    else:
        return jsonify({"error": "Incorrect password"}), 401

# --- UPLOAD ROUTE ---
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            
            # JSON File Handling
            if file.filename.endswith('.json'):
                data = json.load(file.stream)
                if 'labels' in data and 'data' in data:
                     return jsonify({
                        "labels": data['labels'],
                        "data": data['data'],
                        "title": data.get('title', f"Custom Chart from {filename}")
                    }), 200
                else:
                    return jsonify({"error": "JSON file must contain 'labels' and 'data' fields."}), 400

            # Excel File Handling
            if file.filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file.stream)
            else:
                 return jsonify({"error": "Unsupported file format. Please use .json, .xlsx, or .xls."}), 400

            # Data Processing Logic
            if len(df.columns) >= 2:
                df.columns = ['Category', 'Value'] + list(df.columns[2:])
            else:
                return jsonify({"error": "Excel file must contain at least two columns for chart data (e.g., Category and Value).",
                                "file_columns": df.columns.tolist()}), 400
            
            labels = df['Category'].astype(str).tolist()
            data_points = df['Value'].tolist()
            
            return jsonify({
                "labels": labels,
                "data": data_points,
                "title": f"Custom Chart from {filename}"
            }), 200

        except Exception as e:
            # If this is an ImportError (missing dependency), the worker will crash 
            # and Gunicorn will give the code 3 error.
            print(f"Error processing uploaded file: {e}")
            return jsonify({"error": f"An error occurred while processing the file: {str(e)}. Check Excel file or server logs."}), 500
    
    return jsonify({"error": "File type not allowed"}), 400


# Fallback for local testing only
if __name__ == '__main__':
    print("Running Flask app in development mode...")
    app.run(debug=True, port=int(os.environ.get('PORT', 5000)))