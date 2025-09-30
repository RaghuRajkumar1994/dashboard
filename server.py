import json
import os
import uuid
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime

# --- CONFIGURATION ---
# Define the file paths for your data storage
DATA_DIR = 'data'
DASHBOARD_FILE = os.path.join(DATA_DIR, 'db_dashboard.json')
TREND_FILE = os.path.join(DATA_DIR, 'db_trend.json')
NOTES_FILE = os.path.join(DATA_DIR, 'db_notes.json')

# Ensure the data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# --- FLASK SETUP ---
app = Flask(__name__, static_folder='.')
# FIX: Enable CORS for all origins ('*') on all routes. This resolves the 
# "Failed to fetch" error when the frontend is hosted on a different domain (like Render).
CORS(app) 

# --- DATA UTILITIES ---

def load_data(filepath, default_content={}):
    """Loads data from a JSON file."""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        # Create an empty file if it doesn't exist
        save_data(filepath, default_content)
        return default_content
    except json.JSONDecodeError:
        # Handle corrupted JSON file
        print(f"Warning: Corrupted JSON data in {filepath}. Resetting to default.")
        save_data(filepath, default_content)
        return default_content

def save_data(filepath, data):
    """Saves data to a JSON file."""
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=4)

# --- API ENDPOINTS ---

@app.route('/api/dashboard/<string:month_key>', methods=['GET'])
def get_dashboard_data(month_key):
    """Fetches the dashboard data for a specific month (e.g., '2025-09')."""
    db = load_data(DASHBOARD_FILE, default_content={})
    # Return data for the specific month or an empty dictionary if not found
    return jsonify(db.get(month_key, {}))

@app.route('/api/dashboard/<string:month_key>', methods=['POST'])
def update_dashboard_data(month_key):
    """Updates the dashboard data for a specific month."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    db = load_data(DASHBOARD_FILE, default_content={})
    
    # Update or create the entry for the month_key
    db[month_key] = data
    
    save_data(DASHBOARD_FILE, db)
    return jsonify({"message": f"Dashboard data for {month_key} updated successfully"}), 200

# ----------------------------------------------------------------------

@app.route('/api/trend/<string:month_key>', methods=['GET'])
def get_trend_data(month_key):
    """Fetches the production trend data (list of customers) for a specific month."""
    db = load_data(TREND_FILE, default_content={})
    # Return the list of trend items for the specific month or an empty list
    return jsonify(db.get(month_key, []))

@app.route('/api/trend/<string:month_key>', methods=['POST'])
def update_trend_data(month_key):
    """Updates the entire trend list for a specific month."""
    data = request.get_json()
    
    # Expects an array of customer objects from script.js
    if not isinstance(data, list):
        return jsonify({"error": "Data must be a list of customer trend objects"}), 400

    db = load_data(TREND_FILE, default_content={})
    
    # Overwrite the existing list with the new list
    db[month_key] = data
    
    save_data(TREND_FILE, db)
    return jsonify({"message": f"Production trend for {month_key} updated successfully"}), 200

# ----------------------------------------------------------------------

@app.route('/api/notes/<string:month_key>', methods=['GET'])
def get_notes(month_key):
    """Fetches all notes for a specific month."""
    db = load_data(NOTES_FILE, default_content={})
    # Return the list of notes for the specific month or an empty list
    return jsonify(db.get(month_key, []))

@app.route('/api/notes/<string:month_key>', methods=['POST'])
def add_note(month_key):
    """Adds a new note to the list for a specific month."""
    data = request.get_json()
    note_text = data.get('text')
    
    if not note_text:
        return jsonify({"error": "Note text is required"}), 400

    db = load_data(NOTES_FILE, default_content={})
    
    new_note = {
        # Use uuid4 for a unique ID
        "id": str(uuid.uuid4()), 
        "text": note_text,
        # Save timestamp for display/sorting (optional)
        "timestamp": datetime.now().isoformat() 
    }
    
    # Get the notes list for the month, or create a new one
    notes_list = db.get(month_key, [])
    notes_list.append(new_note)
    db[month_key] = notes_list
    
    save_data(NOTES_FILE, db)
    return jsonify(new_note), 201

@app.route('/api/notes/<string:month_key>/<string:note_id>', methods=['DELETE'])
def delete_note(month_key, note_id):
    """Deletes a specific note by ID for a given month."""
    db = load_data(NOTES_FILE, default_content={})
    notes_list = db.get(month_key, [])
    
    initial_length = len(notes_list)
    
    # Filter out the note with the matching ID
    notes_list = [note for note in notes_list if note.get('id') != note_id]
    
    if len(notes_list) == initial_length:
        return jsonify({"error": "Note not found"}), 404
        
    db[month_key] = notes_list
    save_data(NOTES_FILE, db)
    
    # Return 204 No Content for a successful deletion
    return '', 204

# ----------------------------------------------------------------------

# --- STATIC FILE SERVING (For index.html, script.js, style.css) ---

@app.route('/')
def serve_index():
    """Serves the main index.html file."""
    # Assumes index.html is in the same directory as server.py
    return send_from_directory(os.getcwd(), 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serves other static files (js, css, etc.)."""
    return send_from_directory(os.getcwd(), path)

# --- RUN SERVER ---

if __name__ == '__main__':
    # When deploying to Render, set host='0.0.0.0' to listen on all interfaces
    # The port is often set by the environment, but 5000 is a standard default
    app.run(debug=True, host='0.0.0.0', port=os.environ.get('PORT', 5000))