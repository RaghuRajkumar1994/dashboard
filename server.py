import json
import os
import uuid
import pandas as pd
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename

# --- NEW: MongoDB Setup ---
from pymongo import MongoClient
from pymongo.server_api import ServerApi

# IMPORTANT: You MUST set this environment variable in Render for your app to work.
# Example format: "mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority"
MONGO_URI = os.environ.get('MONGO_URI')

if not MONGO_URI:
    print("FATAL: MONGO_URI environment variable not set. Using local file storage (NOT RECOMMENDED FOR RENDER).")
    # Define a dummy client for graceful failure in development (but still fail in production)
    mongo_client = None
else:
    try:
        mongo_client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
        DB = mongo_client['ProductionDashboardDB']
        # Define Collections (equivalent to your JSON files)
        DASHBOARD_COLLECTION = DB['dashboard_data'] # Stores daily data
        TREND_COLLECTION = DB['trend_data']         # Stores monthly trend data
        NOTES_COLLECTION = DB['notes_data']         # Stores daily notes
        print("INFO: Successfully connected to MongoDB.")
    except Exception as e:
        print(f"ERROR: Could not connect to MongoDB: {e}")
        mongo_client = None


# --- CONFIGURATION (Local Fallback/Upload Folder) ---
DATA_DIR = 'data'
UPLOAD_FOLDER = os.path.join(DATA_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'json', 'xlsx', 'xls'} 

# Local file paths (ONLY used if mongo_client is None for local development/testing)
DASHBOARD_FILE_LOCAL = os.path.join(DATA_DIR, 'db_dashboard.json')
TREND_FILE_LOCAL = os.path.join(DATA_DIR, 'db_trend.json')
NOTES_FILE_LOCAL = os.path.join(DATA_DIR, 'db_notes.json')

# Ensure the upload directory exists for temporary file handling
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# --- FLASK SETUP ---
# NOTE: The static_folder path is adjusted for Render's environment setup if needed, 
# but os.getcwd() often works if static files are at the root.
app = Flask(__name__, static_folder='.')
CORS(app) 
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ALLOWED_EXTENSIONS'] = ALLOWED_EXTENSIONS # Set for use in allowed_file function


# --- DATA UTILITIES (Updated to use MongoDB) ---

def load_data(collection, date_key, is_note=False):
    """
    Loads data from a MongoDB collection based on a date/month key.
    If date_key is None, attempts to load all.
    """
    if mongo_client:
        if is_note:
            # Notes are stored as a document for the day containing a list of notes
            document = collection.find_one({"date_key": date_key})
            return document.get("notes", []) if document else []
        elif date_key:
            # For dashboard/trend: find by key
            document = collection.find_one({"_id": date_key})
            return document.get("data", {}) if document else {}
        else:
            # Load all documents (used in get_machine_total_output simulation)
            all_data = {}
            for doc in collection.find({}):
                all_data[doc['_id']] = doc['data']
            return all_data
    else:
        # --- LOCAL FALLBACK (Not for Render Production!) ---
        filepath = DASHBOARD_FILE_LOCAL
        if collection == TREND_COLLECTION: filepath = TREND_FILE_LOCAL
        if collection == NOTES_COLLECTION: filepath = NOTES_FILE_LOCAL
        try:
            with open(filepath, 'r') as f:
                db = json.load(f)
                if is_note:
                    return db.get(date_key, [])
                if date_key:
                    return db.get(date_key, {})
                return db # Return all for total output calculation
        except (FileNotFoundError, json.JSONDecodeError):
            return {} # Return empty dict/list on failure

def save_data(collection, date_key, data, is_note=False):
    """
    Saves data to a MongoDB collection.
    """
    if mongo_client:
        if is_note:
            # For notes, update the 'notes' array within the date_key document
            collection.update_one(
                {"date_key": date_key},
                {"$set": {"notes": data}},
                upsert=True
            )
        else:
            # For dashboard/trend, use the key as the unique document ID (_id)
            collection.update_one(
                {"_id": date_key},
                {"$set": {"data": data}},
                upsert=True
            )
    else:
        # --- LOCAL FALLBACK (Not for Render Production!) ---
        filepath = DASHBOARD_FILE_LOCAL
        if collection == TREND_COLLECTION: filepath = TREND_FILE_LOCAL
        if collection == NOTES_COLLECTION: filepath = NOTES_FILE_LOCAL
        
        db = {}
        try:
             with open(filepath, 'r') as f:
                db = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            pass # Start with empty DB if file not found/corrupted

        db[date_key] = data
        
        with open(filepath, 'w') as f:
            json.dump(db, f, indent=4)


def allowed_file(filename):
    """Checks if a file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def get_previous_day(date_key):
    """Gets the previous day's date key."""
    date_obj = datetime.strptime(date_key, '%Y-%m-%d')
    previous_day = date_obj - timedelta(days=1)
    return previous_day.strftime('%Y-%m-%d')


# --- NEW: FILE PROCESSING UTILITIES (Simulated for Auto Update) ---

def process_uploaded_daily_data(filepath, file_type, date_key):
    """Processes uploaded data and updates the dashboard data in MongoDB."""
    # ... [Keep the file processing logic as it is for reading Excel/JSON] ...
    try:
        data_dict = {}
        if file_type in ['xlsx', 'xls']:
            df = pd.read_excel(filepath, sheet_name=0) 
            data_dict = df.iloc[0].to_dict()
        elif file_type == 'json':
            with open(filepath, 'r') as f:
                data_dict = json.load(f)
        else:
            return False, "Unsupported file type after upload."

        # Convert keys to match the expected dashboard format (example mapping)
        daily_data = {
            "autoCrimp": int(data_dict.get("AUTO_CRIMP_TOTAL", 0)), 
            "semiCrimp": int(data_dict.get("SEMI_CRIMP_TOTAL", 0)),
            "totalProduction": int(data_dict.get("AUTO_CRIMP_TOTAL", 0)) + int(data_dict.get("SEMI_CRIMP_TOTAL", 0)),
            "productivityValue": float(data_dict.get("PRODUCTIVITY_PERCENT", 0)),
            "s1_autoCrimp": int(data_dict.get("S1_AUTO", 0)),
            "s2_autoCrimp": int(data_dict.get("S2_AUTO", 0)),
            "breakdownAutoCrimp": int(data_dict.get("BREAKDOWN_AC", 0)),
            # ... all other required fields
        }

        # *** UPDATE: Use save_data with DASHBOARD_COLLECTION ***
        save_data(DASHBOARD_COLLECTION, date_key, daily_data)
        
        return True, "Data successfully processed and updated."

    except Exception as e:
        return False, f"File processing error: {str(e)}"

# --- API ROUTES (Updated to use MongoDB collections) ---

@app.route('/api/daily-update/auto', methods=['POST'])
def auto_update_daily():
    # ... [Keep file upload handling] ...
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    date_key = request.form.get('date_key')
    file_type = request.args.get('file_type', '').lower()

    if file.filename == '' or not date_key or not file_type:
        return jsonify({"error": "Invalid request parameters"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(f"{date_key}_{uuid.uuid4().hex}.{file_type}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        success, message = process_uploaded_daily_data(filepath, file_type, date_key)
        os.remove(filepath) # Clean up the uploaded file

        if success:
            return jsonify({"status": "success", "message": message})
        else:
            return jsonify({"status": "error", "error": message}), 500
    
    return jsonify({"error": "File type not allowed"}), 400

@app.route('/api/trend-update/auto', methods=['POST'])
def auto_update_trend():
    # ... [Keep file upload handling] ...
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    month_key = request.form.get('month_key')
    file_type = request.args.get('file_type', '').lower()

    if file.filename == '' or not month_key or not file_type:
        return jsonify({"error": "Invalid request parameters"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(f"trend_{month_key}_{uuid.uuid4().hex}.{file_type}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # --- TREND PROCESSING ---
        new_trends = []
        if file_type == 'json':
            with open(filepath, 'r') as f:
                new_trends = json.load(f)
        elif file_type in ['xlsx', 'xls']:
            df = pd.read_excel(filepath, sheet_name=0)
            new_trends = df.to_dict('records')

        # Placeholder logic to replace/merge the month's trend
        # *** UPDATE: Use save_data with TREND_COLLECTION ***
        save_data(TREND_COLLECTION, month_key, new_trends)

        os.remove(filepath) 
        return jsonify({"status": "success", "message": f"Trend data for {month_key} successfully updated from file."})
    
    return jsonify({"error": "File type not allowed"}), 400


# --- API ROUTES (Dashboard Data Fetch) ---

@app.route('/api/data/machine-output/<string:month_key>', methods=['GET'])
def get_machine_total_output(month_key):
    """NEW: Fetches machine total output for the month and year."""
    # *** UPDATE: load all data from MongoDB (if running in production) ***
    db_dashboard = load_data(DASHBOARD_COLLECTION, date_key=None)
    
    # Calculate Monthly Total Output
    monthly_total = 0
    # Simplified: Iterate through all daily keys in the database that start with the month_key
    for date_key, daily_data in db_dashboard.items():
        if date_key.startswith(month_key):
            monthly_total += daily_data.get('totalProduction', 0)

    # Calculate Yearly Total Output
    year_key = month_key.split('-')[0]
    yearly_total = 0
    for date_key, daily_data in db_dashboard.items():
        if date_key.startswith(year_key):
            yearly_total += daily_data.get('totalProduction', 0)

    return jsonify({
        "monthlyTotalOutput": monthly_total,
        "yearlyTotalOutput": yearly_total
    })


@app.route('/api/data/machine-daily-data/<string:date_key>', methods=['GET'])
def get_machine_daily_data(date_key):
    """
    Fetches machine wise cut's hour qty and breakdown time for the given date
    and the previous day's cut qty.
    """
    # *** UPDATE: Load individual days from MongoDB ***
    current_day_data = load_data(DASHBOARD_COLLECTION, date_key)
    
    yesterday_date_key = request.args.get('yesterday')
    if not yesterday_date_key:
        yesterday_date_key = get_previous_day(date_key)
    
    yesterday_data = load_data(DASHBOARD_COLLECTION, yesterday_date_key)

    # --- SIMULATED MACHINE DATA STRUCTURE (Keep as is) ---
    MACHINE_LIST = [
        "MACHINE 1 (Auto Crimp)", "MACHINE 2 (Auto Crimp)", "MACHINE 3 (Semi Crimp)", 
        "MACHINE 4 (Semi Crimp)", "MACHINE 5 (LV Production)"
    ]

    machines_output = []
    for i, machine_name in enumerate(MACHINE_LIST):
        base_current = 1000 + (i * 150)
        base_yesterday = 900 + (i * 180)

        current_cuts = current_day_data.get('machine_cuts_' + str(i+1), base_current)
        yesterday_cuts = yesterday_data.get('machine_cuts_' + str(i+1), base_yesterday)
        
        machines_output.append({
            "name": machine_name,
            "currentDay": {
                "cutsQty": current_cuts, 
                "runHours": round(current_cuts / 500, 2),
                "breakdownTimeMin": (i+1) * 10
            },
            "yesterday": {
                "cutsQty": yesterday_cuts
            }
        })

    return jsonify({"date": date_key, "yesterday_date": yesterday_date_key, "machines": machines_output})

# --- EXISTING/OTHER API ROUTES ---

@app.route('/api/data/daily/<string:date_key>', methods=['GET'])
def get_daily_data(date_key):
    """Fetches the dashboard data for a specific day."""
    # *** UPDATE: Load individual day from MongoDB ***
    daily_data = load_data(DASHBOARD_COLLECTION, date_key)
    
    if not daily_data:
        # A simple zeroed response for an empty day
        return jsonify({
            "autoCrimp": 0, "semiCrimp": 0, "totalProduction": 0,
            "s1_autoCrimp": 0, "s2_autoCrimp": 0, "s1_semiCrimp": 0, "s2_semiCrimp": 0, 
            "s1_lvProduction": 0, "s2_lvProduction": 0, 
            "breakdownAutoCrimp": 0, "breakdownSemiCrimp": 0,
            "productivityValue": 0.0, "lvProductionValue": 0,
            "monthlyAverage": 0.0 
        })

    # Adding monthly average context for the main display
    year_month_key = date_key.rsplit('-', 1)[0]
    monthly_output = get_machine_total_output(year_month_key).get_json()
    daily_data['monthlyAverage'] = 55.5 # Simplified/Mock average 
    
    return jsonify(daily_data)

@app.route('/api/data/daily/<string:date_key>', methods=['POST'])
def update_daily_data(date_key):
    """Updates or creates the dashboard data for a specific day (Manual Entry)."""
    # *** UPDATE: load and save directly to MongoDB ***
    new_data = request.get_json()
    
    # Calculate derived values (using only submitted data)
    new_data['totalProduction'] = new_data.get('s1_autoCrimp', 0) + new_data.get('s2_autoCrimp', 0) + \
                                  new_data.get('s1_semiCrimp', 0) + new_data.get('s2_semiCrimp', 0)
    
    save_data(DASHBOARD_COLLECTION, date_key, new_data)
    return jsonify({"status": "success", "data": new_data})

@app.route('/api/data/trend/<string:month_key>', methods=['GET'])
def get_trend_data(month_key):
    """Fetches the trend data for a specific month (e.g., 'YYYY-MM')."""
    # *** UPDATE: Load from MongoDB ***
    trend_data = load_data(TREND_COLLECTION, month_key)
    
    if not trend_data:
        # SIMULATION: Return mock data if not found
        return jsonify([
            {"customer": "Customer A", "target": 60, "actual": 55},
            {"customer": "Customer B", "target": 80, "actual": 85},
            {"customer": "Customer C", "target": 40, "actual": 30},
        ])
    return jsonify(trend_data)

# --- NOTES ROUTES ---
@app.route('/api/notes/<string:date_key>', methods=['GET'])
def get_notes(date_key):
    """Fetches all notes for a specific day."""
    # *** UPDATE: Load notes from MongoDB (using is_note=True) ***
    notes_list = load_data(NOTES_COLLECTION, date_key, is_note=True)
    return jsonify(notes_list)

@app.route('/api/notes/<string:date_key>', methods=['POST'])
def add_note(date_key):
    """Adds a new note for a specific day."""
    # *** UPDATE: Load/save notes from MongoDB (using is_note=True) ***
    notes_list = load_data(NOTES_COLLECTION, date_key, is_note=True)
    
    new_note = request.get_json()
    new_note['id'] = str(uuid.uuid4())
    new_note['timestamp'] = datetime.now().isoformat()
    
    notes_list.append(new_note)
    save_data(NOTES_COLLECTION, date_key, notes_list, is_note=True)
    return jsonify(new_note), 201

@app.route('/api/notes/<string:date_key>/<string:note_id>', methods=['DELETE'])
def delete_note(date_key, note_id):
    """Deletes a specific note by ID for a given day."""
    # *** UPDATE: Load/save notes from MongoDB (using is_note=True) ***
    notes_list = load_data(NOTES_COLLECTION, date_key, is_note=True)
    
    initial_length = len(notes_list)
    
    notes_list = [note for note in notes_list if note.get('id') != note_id]
    
    if len(notes_list) == initial_length:
        return jsonify({"error": "Note not found"}), 404
        
    save_data(NOTES_COLLECTION, date_key, notes_list, is_note=True)
    
    return '', 204

# --- Chart Upload Route (Existing Logic) ---

@app.route('/api/upload_chart_data', methods=['POST'])
def upload_chart_data():
    """Receives an Excel file, processes it, and returns data for the chart."""
    if 'excel_file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['excel_file']
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if file and allowed_file(file.filename):
        try:
            if file.filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file.stream)
            else:
                 return jsonify({"error": "Unsupported file format. Please use .xlsx or .xls."}), 400

            if len(df.columns) >= 2:
                df.columns = ['Category', 'Value'] + list(df.columns[2:])
            else:
                return jsonify({"error": "Excel file must contain at least two columns for chart data (e.g., Category and Value)."}), 400
            
            labels = df['Category'].astype(str).tolist()
            data_points = df['Value'].tolist()
            
            return jsonify({
                "labels": labels,
                "data": data_points,
                "title": f"Custom Chart from {file.filename}"
            }), 200

        except Exception as e:
            print(f"Error processing uploaded file: {e}")
            return jsonify({"error": f"An error occurred while processing the file: {str(e)}. Check your Excel file structure."}), 500
    
    return jsonify({"error": "File type not allowed"}), 400


# ----------------------------------------------------------------------

# --- STATIC FILE SERVING ---

@app.route('/')
def serve_index():
    """Serves the main index.html file."""
    # os.getcwd() is used assuming index.html is in the root directory
    return send_from_directory(os.getcwd(), 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serves static files (script.js, style.css, etc.)."""
    return send_from_directory(os.getcwd(), filename)


if __name__ == '__main__':
    # Flask runs in debug mode for development purposes.
    # When deployed on Render, the 'start' command handles running the app 
    # (e.g., 'gunicorn server:app')
    app.run(debug=True, host='0.0.0.0', port=5000)