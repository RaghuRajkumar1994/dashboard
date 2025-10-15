import json
import os
import uuid
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
import pandas as pd # Used for reading Excel files
from werkzeug.utils import secure_filename # Used for safe file names

# --- CONFIGURATION ---
DATA_DIR = 'data'
DASHBOARD_FILE = os.path.join(DATA_DIR, 'db_dashboard.json')
TREND_FILE = os.path.join(DATA_DIR, 'db_trend.json')
NOTES_FILE = os.path.join(DATA_DIR, 'db_notes.json')
UPLOAD_FOLDER = os.path.join(DATA_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'json', 'xlsx', 'xls'} # Added xlsx/xls support

# Ensure the data directory and upload directory exists
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# --- FLASK SETUP ---
app = Flask(__name__, static_folder='.')
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
        print(f"Warning: Corrupted JSON data in {filepath}. Overwriting with default.")
        save_data(filepath, default_content)
        return default_content

def save_data(filepath, data):
    """Saves data to a JSON file."""
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=4)

def allowed_file(filename):
    """Checks if a file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_previous_day(date_key):
    """Gets the previous day's date key."""
    date_obj = datetime.strptime(date_key, '%Y-%m-%d')
    previous_day = date_obj - timedelta(days=1)
    return previous_day.strftime('%Y-%m-%d')


# --- NEW: FILE PROCESSING UTILITIES (Simulated for Auto Update) ---

def process_uploaded_daily_data(filepath, file_type, date_key):
    """Simulates processing uploaded data (Excel/JSON) and updates db_dashboard.json."""
    try:
        data_dict = {}
        if file_type in ['xlsx', 'xls']:
            # Use pandas to read Excel. Assuming data is in the first sheet/row.
            df = pd.read_excel(filepath, sheet_name=0) 
            # Simplified: assuming the required fields are column headers and the data is in the first row
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

        db_dashboard = load_data(DASHBOARD_FILE, default_content={})
        db_dashboard[date_key] = daily_data
        save_data(DASHBOARD_FILE, db_dashboard)
        
        return True, "Data successfully processed and updated."

    except Exception as e:
        return False, f"File processing error: {str(e)}"


# --- NEW API ROUTES (Auto Update - JSON/EXCEL Support) ---

@app.route('/api/daily-update/auto', methods=['POST'])
def auto_update_daily():
    """Handles file upload for daily data (Excel/JSON) auto update."""
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
    """Handles file upload for trend data (Excel/JSON) auto update."""
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
        
        # --- SIMULATED TREND PROCESSING ---
        # This is placeholder logic to show the file was received and processed.
        db_trend = load_data(TREND_FILE, default_content={})
        
        # Simplified: assuming JSON/Excel contains a list of new trend objects
        new_trends = []
        if file_type == 'json':
            with open(filepath, 'r') as f:
                new_trends = json.load(f)
        elif file_type in ['xlsx', 'xls']:
            df = pd.read_excel(filepath, sheet_name=0)
            new_trends = df.to_dict('records')

        # Placeholder logic to replace/merge the month's trend
        db_trend[month_key] = new_trends
        save_data(TREND_FILE, db_trend)

        os.remove(filepath) 
        return jsonify({"status": "success", "message": f"Trend data for {month_key} successfully updated from file."})
    
    return jsonify({"error": "File type not allowed"}), 400


# --- NEW API ROUTES (Dashboard Data Fetch) ---

@app.route('/api/data/machine-output/<string:month_key>', methods=['GET'])
def get_machine_total_output(month_key):
    """NEW: Fetches machine total output for the month and year."""
    db_dashboard = load_data(DASHBOARD_FILE, default_content={})
    
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
    NEW: Fetches machine wise cut's hour qty and breakdown time for the given date
    and the previous day's cut qty.
    """
    db_dashboard = load_data(DASHBOARD_FILE, default_content={})
    
    # Get Yesterday's Data Key from URL param or calculate it
    yesterday_date_key = request.args.get('yesterday')
    if not yesterday_date_key:
        yesterday_date_key = get_previous_day(date_key)
    
    current_day_data = db_dashboard.get(date_key, {})
    yesterday_data = db_dashboard.get(yesterday_date_key, {})

    # --- SIMULATED MACHINE DATA STRUCTURE ---
    MACHINE_LIST = [
        "MACHINE 1 (Auto Crimp)", "MACHINE 2 (Auto Crimp)", "MACHINE 3 (Semi Crimp)", 
        "MACHINE 4 (Semi Crimp)", "MACHINE 5 (LV Production)"
    ]

    machines_output = []
    for i, machine_name in enumerate(MACHINE_LIST):
        # Base data for simulation
        base_current = 1000 + (i * 150)
        base_yesterday = 900 + (i * 180)

        # Simplified logic to grab cuts. In a real application, the database structure 
        # would need to store this data by machine.
        current_cuts = current_day_data.get('machine_cuts_' + str(i+1), base_current)
        yesterday_cuts = yesterday_data.get('machine_cuts_' + str(i+1), base_yesterday)
        
        machines_output.append({
            "name": machine_name,
            "currentDay": {
                "cutsQty": current_cuts, 
                "runHours": round(current_cuts / 500, 2), # Dummy Calculation
                "breakdownTimeMin": (i+1) * 10
            },
            "yesterday": {
                "cutsQty": yesterday_cuts
            }
        })

    return jsonify({"date": date_key, "yesterday_date": yesterday_date_key, "machines": machines_output})

# --- EXISTING/OTHER API ROUTES (Maintained/Ensured) ---

@app.route('/api/data/daily/<string:date_key>', methods=['GET'])
def get_daily_data(date_key):
    """Fetches the dashboard data for a specific day."""
    db = load_data(DASHBOARD_FILE)
    
    if date_key not in db:
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
    db[date_key]['monthlyAverage'] = 55.5 # Simplified/Mock average 
    
    return jsonify(db[date_key])

@app.route('/api/data/daily/<string:date_key>', methods=['POST'])
def update_daily_data(date_key):
    """Updates or creates the dashboard data for a specific day (Manual Entry)."""
    db = load_data(DASHBOARD_FILE)
    new_data = request.get_json()
    
    # Calculate derived values (using only submitted data)
    new_data['totalProduction'] = new_data.get('s1_autoCrimp', 0) + new_data.get('s2_autoCrimp', 0) + \
                                  new_data.get('s1_semiCrimp', 0) + new_data.get('s2_semiCrimp', 0)
    
    db[date_key] = new_data
    save_data(DASHBOARD_FILE, db)
    return jsonify({"status": "success", "data": new_data})

@app.route('/api/data/trend/<string:month_key>', methods=['GET'])
def get_trend_data(month_key):
    """Fetches the trend data for a specific month (e.g., 'YYYY-MM')."""
    db = load_data(TREND_FILE, default_content={})
    # SIMULATION: Return mock data if not found
    if month_key not in db:
        return jsonify([
            {"customer": "Customer A", "target": 60, "actual": 55},
            {"customer": "Customer B", "target": 80, "actual": 85},
            {"customer": "Customer C", "target": 40, "actual": 30},
        ])
    return jsonify(db.get(month_key, []))

# --- NOTES ROUTES (Keep Existing) ---
@app.route('/api/notes/<string:date_key>', methods=['GET'])
def get_notes(date_key):
    """Fetches all notes for a specific day."""
    db = load_data(NOTES_FILE, default_content={})
    return jsonify(db.get(date_key, []))

@app.route('/api/notes/<string:date_key>', methods=['POST'])
def add_note(date_key):
    """Adds a new note for a specific day."""
    db = load_data(NOTES_FILE, default_content={})
    new_note = request.get_json()
    new_note['id'] = str(uuid.uuid4())
    new_note['timestamp'] = datetime.now().isoformat()
    
    notes_list = db.get(date_key, [])
    notes_list.append(new_note)
    db[date_key] = notes_list
    save_data(NOTES_FILE, db)
    return jsonify(new_note), 201

@app.route('/api/notes/<string:date_key>/<string:note_id>', methods=['DELETE'])
def delete_note(date_key, note_id):
    """Deletes a specific note by ID for a given day."""
    db = load_data(NOTES_FILE, default_content={})
    notes_list = db.get(date_key, [])
    
    initial_length = len(notes_list)
    
    notes_list = [note for note in notes_list if note.get('id') != note_id]
    
    if len(notes_list) == initial_length:
        return jsonify({"error": "Note not found"}), 404
        
    db[date_key] = notes_list
    save_data(NOTES_FILE, db)
    
    return '', 204

# ----------------------------------------------------------------------

# --- STATIC FILE SERVING (For index.html, script.js, style.css) ---

@app.route('/')
def serve_index():
    """Serves the main index.html file."""
    return send_from_directory(os.getcwd(), 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serves static files (script.js, style.css, etc.)."""
    return send_from_directory(os.getcwd(), filename)


if __name__ == '__main__':
    # Flask runs in debug mode for development purposes.
    app.run(debug=True, host='0.0.0.0', port=5000)
# server.py - Add this new route

# Ensure this utility function is present (it seems to be implied/present based on ALLOWED_EXTENSIONS)
def allowed_file(filename):
    """Checks if a file extension is in the allowed set."""
    # Assuming ALLOWED_EXTENSIONS = {'json', 'xlsx', 'xls'} is defined at the top
    from flask import current_app
    import os
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config.get('ALLOWED_EXTENSIONS', {'xlsx', 'xls', 'json'})

@app.route('/api/upload_chart_data', methods=['POST'])
def upload_chart_data():
    """Receives an Excel file, processes it, and returns data for the chart."""
    if 'excel_file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['excel_file']
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # Check if the file is allowed (this depends on where you defined ALLOWED_EXTENSIONS)
    # The snippet implies xlsx/xls are allowed.
    if file and allowed_file(file.filename):
        try:
            # We assume the chart data is in the first sheet and needs two columns: 'Category' and 'Value'
            if file.filename.endswith(('.xlsx', '.xls')):
                # Use the file stream for reading directly
                df = pd.read_excel(file.stream)
            else:
                 return jsonify({"error": "Unsupported file format. Please use .xlsx or .xls."}), 400

            # --- Data Processing Logic ---
            # Attempt to use the first two columns as chart labels and values.
            if len(df.columns) >= 2:
                # Rename the first two columns for predictable access
                df.columns = ['Category', 'Value'] + list(df.columns[2:])
            else:
                return jsonify({"error": "Excel file must contain at least two columns for chart data (e.g., Category and Value)."}), 400
            
            # Convert to lists
            labels = df['Category'].astype(str).tolist()
            data_points = df['Value'].tolist()
            
            # Return the processed data
            return jsonify({
                "labels": labels,
                "data": data_points,
                "title": f"Custom Chart from {file.filename}"
            }), 200

        except Exception as e:
            print(f"Error processing uploaded file: {e}")
            return jsonify({"error": f"An error occurred while processing the file: {str(e)}. Check your Excel file structure."}), 500
    
    return jsonify({"error": "File type not allowed"}), 400