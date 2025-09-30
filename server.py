from flask import Flask, jsonify, request, abort, Response
from flask_cors import CORS
import json
import os
import uuid

# --- Flask Setup ---
app = Flask(__name__)
# IMPORTANT: This allows your HTML file to communicate with the server
CORS(app) 

# --- Configuration ---
PORT = 3000
BASE_API_URL = '/api'
DB_FILES = {
    'dashboard': 'db_dashboard.json',
    'trend': 'db_trend.json',
    'notes': 'db_notes.json',
}

# --- Utility Functions ---

def read_db(key):
    """Reads a JSON file and returns its parsed content."""
    try:
        if not os.path.exists(DB_FILES[key]):
            return {}
        with open(DB_FILES[key], 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading {key} DB: {e}")
        return {}

def write_db(key, data):
    """Writes data back to a JSON file."""
    try:
        with open(DB_FILES[key], 'w') as f:
            # Use indent=2 for human-readable formatting
            json.dump(data, f, indent=2) 
        return True
    except Exception as e:
        print(f"Error writing {key} DB: {e}")
        return False

# --- API Endpoints ---

# 1. DASHBOARD Data (GET and POST/Update)
@app.route(f'{BASE_API_URL}/dashboard/<monthKey>', methods=['GET'])
def get_dashboard_data(monthKey):
    db = read_db('dashboard')
    return jsonify(db.get(monthKey, {}))

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

# 2. TREND Data (GET and POST/Update)
@app.route(f'{BASE_API_URL}/trend/<monthKey>', methods=['GET'])
def get_trend_data(monthKey):
    db = read_db('trend')
    return jsonify(db.get(monthKey, []))

@app.route(f'{BASE_API_URL}/trend/<monthKey>', methods=['POST'])
def update_trend_data(monthKey):
    if not request.json:
        return jsonify({"error": "Missing JSON data"}), 400

    new_trend_array = request.json
    db = read_db('trend')
    db[monthKey] = new_trend_array

    if write_db('trend', db):
        # 204 No Content is expected by the JavaScript for a successful POST update
        return Response(status=204) 
    else:
        return jsonify({"error": "Failed to write trend data to database."}), 500

# 3. NOTES Data (GET, POST/Add, and DELETE)
@app.route(f'{BASE_API_URL}/notes/<monthKey>', methods=['GET'])
def get_notes(monthKey):
    db = read_db('notes')
    return jsonify(db.get(monthKey, []))

@app.route(f'{BASE_API_URL}/notes/<monthKey>', methods=['POST'])
def add_note(monthKey):
    if not request.json or 'text' not in request.json:
        return jsonify({"error": "Invalid note format."}), 400

    new_note = request.json
    db = read_db('notes')
    
    if monthKey not in db:
        db[monthKey] = []

    new_note['id'] = str(uuid.uuid4())
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
        # 204 No Content is expected by the JavaScript for a successful DELETE
        return Response(status=204)
    else:
        return jsonify({"error": "Note ID not found or deletion failed."}), 404

# --- Server Start ---
if __name__ == '__main__':
    print(f"✅ Mock API Server starting...")
    print(f"   Ensure your dashboard is viewing files from: http://localhost:{PORT}")
    app.run(port=PORT, debug=True)