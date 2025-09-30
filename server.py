
### B. `Procfile` (The Startup Command)

This file tells Render exactly how to start your web process.

| File | Content |
| :--- | :--- |
| **`Procfile`** | ```text
web: gunicorn server:app
``` |

**This `gunicorn server:app` command is the standard startup command Render will use.**

---

## 2. Updated Python Backend Code (`server.py`)

This code replaces the unreliable local file reading/writing with an **in-memory database** for basic functionality on Render.

> **⚠️ Note:** This data will reset if the Render service restarts. For persistent data, you must configure a cloud database (like MongoDB Atlas or Render's PostgreSQL).

```python
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import os
import uuid
from datetime import datetime

# --- Flask Setup ---
app = Flask(__name__)
# IMPORTANT: This allows your Netlify frontend to communicate with this server
CORS(app) 

# --- Configuration ---
# Use the environment PORT variable for cloud hosting compatibility
PORT = 8080 
BASE_API_URL = '/api'

# ====================================================================
# ✅ FIX: IN-MEMORY DATABASE (Data will reset on server restart!)
# ====================================================================
db_data = {
    'dashboard': {},
    'trend': {},
    'notes': {},
}

def get_current_month_key():
    """Utility to get the current month key for initial data loading."""
    return datetime.now().strftime('%Y-%m')

# Initialize with initial data to ensure the API doesn't return empty for the current month
initial_month = get_current_month_key()

# Only initialize if the key is missing (using sample data based on your uploaded files)
if not db_data['dashboard'].get(initial_month):
    db_data['dashboard'][initial_month] = {
        'Auto Crimp': 6596788,
        'Semi Crimp': 2783984,
        'Soldering': 552973,
        'Shift A': 2132,
        'Shift B': 2300,
        'Shift C': 2100,
        'MSF P2': 6.45,
        'MSF P7': 1.0,
        'MSF MTotal P2': 125.0,
        'MSF MTotal P7': 120.0,
        'Assembly MTotal P2': 1600.0,
        'Assembly MTotal P7': 1550.0,
        'Assembly P2': 150,
        'Assembly P7': 60,
        'Productivity': 85,
        'LV Value': 12500000,
    }

if not db_data['trend'].get(initial_month):
    db_data['trend'][initial_month] = [
        {'customer': 'Client A', 'output': 1000, 'percent': 95},
        {'customer': 'Client B', 'output': 800, 'percent': 105},
        {'customer': 'Client C', 'output': 1500, 'percent': 80},
    ]

# --- Utility Functions (In-Memory Access) ---

def read_db(key):
    """Reads data from the in-memory database."""
    return db_data.get(key, {})

def write_db(key, data):
    """Writes data back to the in-memory database."""
    try:
        db_data[key] = data
        return True
    except Exception as e:
        print(f"Error writing {key} DB (In-Memory): {e}")
        return False

# --- API Endpoints (UNCHANGED LOGIC) ---

# 1. DASHBOARD Data 
@app.route(f'{BASE_API_URL}/dashboard/<monthKey>', methods=['GET'])
def get_dashboard_data(monthKey):
    db = read_db('dashboard')
    return jsonify(db.get(monthKey, {}).copy()) 

@app.route(f'{BASE_API_URL}/dashboard/<monthKey>', methods=['POST'])
def update_dashboard_data(monthKey):
    if not request.json:
        return jsonify({"error": "Missing JSON data"}), 400

    new_data = request.json
    db = read_db('dashboard')
    db[monthKey] = new_data

    if write_db('dashboard', db):
        return jsonify({"message": "Dashboard data updated successfully."}), 200
    else:
        return jsonify({"error": "Failed to write data to database."}), 500

# 2. TREND Data 
@app.route(f'{BASE_API_URL}/trend/<monthKey>', methods=['GET'])
def get_trend_data(monthKey):
    db = read_db('trend')
    return jsonify(db.get(monthKey, []).copy())

@app.route(f'{BASE_API_URL}/trend/<monthKey>', methods=['POST'])
def update_trend_data(monthKey):
    if not request.json:
        return jsonify({"error": "Missing JSON data"}), 400

    new_trend_array = request.json
    db = read_db('trend')
    db[monthKey] = new_trend_array

    if write_db('trend', db):
        return Response(status=204) # 204 No Content for success
    else:
        return jsonify({"error": "Failed to write trend data to database."}), 500

# 3. NOTES Data 
@app.route(f'{BASE_API_URL}/notes/<monthKey>', methods=['GET'])
def get_notes(monthKey):
    db = read_db('notes')
    return jsonify(db.get(monthKey, []).copy())

@app.route(f'{BASE_API_URL}/notes/<monthKey>', methods=['POST'])
def add_note(monthKey):
    if not request.json or 'text' not in request.json:
        return jsonify({"error": "Invalid note format (requires 'text' field)."}), 400

    new_note = request.json
    db = read_db('notes')
    
    if monthKey not in db:
        db[monthKey] = []

    new_note['id'] = str(uuid.uuid4())
    new_note['timestamp'] = datetime.utcnow().isoformat() + 'Z' 
    db[monthKey].append(new_note)

    if write_db('notes', db):
        return jsonify(new_note), 201
    else:
        return jsonify({"error": "Failed to add note to database."}), 500

@app.route(f'{BASE_API_URL}/notes/<monthKey>/<noteId>', methods=['DELETE'])
def delete_note(monthKey, noteId):
    db = read_db('notes')
    
    if monthKey not in db or not db[monthKey]:
        return jsonify({"error": "Notes for this month not found."}), 404

    initial_length = len(db[monthKey])
    db[monthKey] = [note for note in db[monthKey] if note.get('id') != noteId]

    if len(db[monthKey]) < initial_length and write_db('notes', db):
        return Response(status=204) # 204 No Content for success
    else:
        return jsonify({"error": "Note ID not found or deletion failed."}), 404

# --- Server Start (Used only for local testing) ---
if __name__ == '__main__':
    host_port = int(os.environ.get('PORT', PORT))
    app.run(host='0.0.0.0', port=host_port, debug=True)