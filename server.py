/* Improved Base Styles & Root Variables */
:root {
    /* DEFAULT THEME (Dark Mode - Professional Blue/Cyan Accent) */
    --bg-color: #0d1117; /* Very dark background (GitHub Dark) */
    --container-bg-color: #161b22; /* Slightly lighter container/header */
    --text-color: #e6edf3; /* High contrast, light text */
    --header-title-color: #58a6ff; /* Primary Blue for Title */
    --panel-border-color: #30363d; /* Subtle dark border */
    --panel-bg-color: #161b22;
    --panel-header-color: #58a6ff; /* Panel headers use the accent color */
    --table-header-bg: #21262d;
    --shortcut-item-bg: #21262d;
    --accent-color-1: #58a6ff; /* Primary Accent (Vibrant Blue) - for positive/key values */
    --accent-color-2: #80cfff; /* Secondary Accent (Lighter Blue) - for chart fills/value text */
    --accent-color-3: #a872ff; /* Tertiary Accent (Purple) - for secondary data in charts/passwords */
    --link-color: #80cfff;
    --error-color: #f85149; /* Red for errors/alerts */
    --warning-color: #e3b341; /* Yellow/Orange for warnings/buttons */
    --success-color: #3fb950; /* Green for success */
    --modal-bg-color: rgba(13, 17, 23, 0.95); /* Semi-transparent dark overlay */
}

/* Light Mode Theme */
[data-theme="light"] {
    --bg-color: #f0f0f5; 
    --container-bg-color: #ffffff;
    --text-color: #24292e; 
    --header-title-color: #0366d6;
    --panel-border-color: #e1e4e8;
    --panel-bg-color: #ffffff;
    --panel-header-color: #0366d6;
    --table-header-bg: #f6f8fa;
    --shortcut-item-bg: #f6f8fa;
    --accent-color-1: #0366d6;
    --accent-color-2: #4078c0;
    --accent-color-3: #6f42c1;
    --error-color: #d73a49;
    --warning-color: #f69325;
    --success-color: #28a745;
    --modal-bg-color: rgba(240, 240, 245, 0.95);
}

/* Other Themes (simplified example) */
[data-theme="green"] {
    --bg-color: #182818;
    --panel-bg-color: #203520;
    --text-color: #e0f8e0;
    --header-title-color: #5cb85c;
    --accent-color-1: #5cb85c;
    --accent-color-2: #8cdc8c;
    --accent-color-3: #38761d;
}

[data-theme="blue"] {
    --bg-color: #0f1c3f;
    --panel-bg-color: #182a52;
    --text-color: #d0e0ff;
    --header-title-color: #1e90ff;
    --accent-color-1: #1e90ff;
    --accent-color-2: #6aa8ff;
    --accent-color-3: #007bff;
}

[data-theme="purple"] {
    --bg-color: #2b1a3d;
    --panel-bg-color: #3b2552;
    --text-color: #f0e6ff;
    --header-title-color: #9370db;
    --accent-color-1: #9370db;
    --accent-color-2: #b19cd9;
    --accent-color-3: #7b68ee;
}

[data-theme="red"] {
    --bg-color: #3d1a1a;
    --panel-bg-color: #522525;
    --text-color: #ffe6e6;
    --header-title-color: #dc3545;
    --accent-color-1: #dc3545;
    --accent-color-2: #e9808a;
    --accent-color-3: #a82e3a;
}

[data-theme="orange"] {
    --bg-color: #3d2a1a;
    --panel-bg-color: #523925;
    --text-color: #fff0e6;
    --header-title-color: #fd7e14;
    --accent-color-1: #fd7e14;
    --accent-color-2: #ffad60;
    --accent-color-3: #e06c00;
}


/* --- Global Styles --- */

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
}

body {
    background-color: var(--bg-color);
    color: var(--text-color);
    transition: background-color 0.3s, color 0.3s;
    min-height: 100vh;
}

/* --- Dashboard Layout --- */

.dashboard-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}

/* --- Header & Controls --- */

.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--panel-border-color);
}

.header-title {
    font-size: 2.2em;
    font-weight: 700;
    color: var(--header-title-color);
}

.controls-group {
    display: flex;
    gap: 10px;
    align-items: center;
}

.control-btn, .theme-selector, .date-selector {
    padding: 8px 15px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.2s, box-shadow 0.2s;
    color: var(--text-color);
    background-color: var(--shortcut-item-bg);
    border: 1px solid var(--panel-border-color);
}

.control-btn:hover, .theme-selector:hover, .date-selector:hover {
    background-color: color-mix(in srgb, var(--shortcut-item-bg), var(--accent-color-1) 10%);
}

#open-data-modal-btn {
    background-color: var(--success-color);
    color: var(--bg-color);
}

#open-trend-modal-btn {
    background-color: var(--accent-color-3);
    color: var(--bg-color);
}

/* --- Main Grid Layout --- */

.top-row-panels, .bottom-row-panels {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1.5fr; /* Production, Productivity, Schedule, Shortcuts */
    gap: 20px;
    margin-bottom: 20px;
}

.bottom-row-panels {
    grid-template-columns: 1fr 1fr 1fr; /* Cut Qty, Breakdown, Notes */
}

.moved-panels-group {
    grid-column: 1 / 4;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
}

.full-row-panel {
    grid-column: 1 / -1;
    margin-bottom: 20px;
}

/* --- General Panel Styles --- */

.dashboard-panel {
    background-color: var(--panel-bg-color);
    border: 1px solid var(--panel-border-color);
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 5px;
    border-bottom: 1px solid var(--panel-border-color);
}

.panel-title {
    font-size: 1.3em;
    font-weight: 600;
    color: var(--panel-header-color);
}

/* --- Production Value Panels --- */

.production-value-group {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.production-value-container {
    text-align: center;
}

.production-value {
    font-size: 2.8em;
    font-weight: 700;
    color: var(--accent-color-1);
    line-height: 1;
}

.value-label {
    font-size: 0.9em;
    color: var(--text-color);
    opacity: 0.7;
    margin-top: 5px;
}

.diff-value {
    font-size: 1.1em;
    font-weight: 600;
    margin-top: 10px;
}

.diff-value.positive {
    color: var(--success-color);
}

.diff-value.negative {
    color: var(--error-color);
}

.gauge-chart-container {
    height: 150px;
    width: 150px;
    margin: 0 auto;
}

/* --- Cuts Qty & Shift Breakdown Panels --- */

.cut-qty-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 15px;
    margin-bottom: 15px;
}

.cut-qty-item {
    padding: 10px;
    background-color: var(--shortcut-item-bg);
    border-radius: 6px;
    text-align: center;
}

.cut-qty-value {
    font-size: 1.5em;
    font-weight: 700;
    color: var(--accent-color-2);
}

.shift-breakdown-container {
    display: grid;
    grid-template-columns: 1.5fr repeat(4, 1fr); /* Metric, P1 Total, P2 Total, P3 Total, Diff */
    gap: 10px;
    font-size: 0.95em;
}

.breakdown-header {
    font-weight: 700;
    color: var(--panel-header-color);
    padding: 5px 0;
    border-bottom: 1px solid var(--panel-border-color);
    text-align: center;
}

.breakdown-metric {
    text-align: left;
    font-weight: 500;
    padding-left: 5px;
}

.breakdown-value {
    text-align: center;
    font-weight: 600;
}

.breakdown-row {
    display: contents;
}

.breakdown-row > div {
    padding: 8px 0;
    border-bottom: 1px dotted var(--panel-border-color);
}

.breakdown-row:last-child > div {
    border-bottom: none;
}

/* --- Tables (Daily Cuts, Trend) --- */

.data-table {
    width: 100%;
    border-collapse: collapse;
}

.data-table th, .data-table td {
    padding: 10px 15px;
    text-align: left;
    border-bottom: 1px solid var(--panel-border-color);
}

.data-table th {
    background-color: var(--table-header-bg);
    color: var(--panel-header-color);
    font-size: 0.9em;
    text-transform: uppercase;
}

.data-table tbody tr:hover {
    background-color: color-mix(in srgb, var(--panel-bg-color), var(--panel-border-color) 10%);
}

/* --- Notes Panel --- */

#daily-notes {
    width: 100%;
    height: 150px;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid var(--panel-border-color);
    background-color: var(--shortcut-item-bg);
    color: var(--text-color);
    resize: vertical;
    font-size: 1em;
}

.notes-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
}

#save-notes-btn {
    background-color: var(--accent-color-1);
    color: var(--bg-color);
}

#notes-status {
    font-size: 0.9em;
    color: var(--success-color);
}

/* --- Shortcuts Panel --- */

.shortcut-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.shortcut-item {
    background-color: var(--shortcut-item-bg);
    padding: 15px;
    border-radius: 8px;
    text-align: center;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.1s;
    border: 1px solid var(--panel-border-color);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 80px;
}

.shortcut-item:hover {
    background-color: color-mix(in srgb, var(--shortcut-item-bg), var(--accent-color-1) 10%);
    transform: translateY(-2px);
    border-color: var(--accent-color-1);
}

.shortcut-icon {
    font-size: 1.5em;
    color: var(--accent-color-2);
    margin-bottom: 5px;
}

.shortcut-label {
    font-size: 0.9em;
    font-weight: 600;
    line-height: 1.2;
}

/* --- Small Trend Chart Panel --- */

.small-chart-container {
    height: 150px;
    width: 100%;
}

/* --- Modals (Data Entry, Password, Chart) --- */

.modal {
    display: none; /* Hidden by default */
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: var(--modal-bg-color); 
    justify-content: center;
    align-items: center;
}

.modal-content {
    background-color: var(--panel-bg-color);
    padding: 30px;
    border-radius: 10px;
    border: 1px solid var(--panel-border-color);
    width: 80%;
    max-width: 800px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
}

.chart-modal-content {
    max-width: 1000px;
    height: 90%;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--panel-border-color);
}

.modal-header h2 {
    color: var(--panel-header-color);
    font-size: 1.5em;
}

.modal-header span {
    font-weight: 600;
    color: var(--text-color);
}

.modal-field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr; /* Label, Input, Label, Input */
    gap: 15px 20px;
    margin-bottom: 20px;
    align-items: center;
}

.modal-field-grid label {
    grid-column: span 1;
    text-align: right;
    font-weight: 500;
}

.modal-input {
    grid-column: span 1;
    padding: 10px;
    border: 1px solid var(--panel-border-color);
    border-radius: 4px;
    background-color: var(--shortcut-item-bg);
    color: var(--text-color);
    width: 100%;
    transition: border-color 0.2s;
}

.modal-input:focus {
    outline: none;
    border-color: var(--accent-color-1);
}

.full-width-label {
    grid-column: 1 / -1;
    text-align: left !important;
}

.modal-input.full-width {
    grid-column: 1 / -1;
}

.shift-breakdown-entry-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
    padding: 10px 0;
    border-top: 1px solid var(--panel-border-color);
    border-bottom: 1px solid var(--panel-border-color);
}

.daily-cuts-modal-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 200px;
    overflow-y: auto;
    padding-right: 5px;
    margin-bottom: 15px;
}

.daily-cuts-entry {
    display: grid;
    grid-template-columns: 2fr 1fr 50px;
    gap: 10px;
    align-items: center;
}

.daily-cuts-entry input.modal-input {
    margin: 0;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
}

.modal-actions .control-btn {
    min-width: 120px;
}

.modal-actions.full-width {
    justify-content: space-between;
    grid-column: 1 / -1;
}

#modal-status, #trend-modal-status {
    font-weight: 600;
    color: var(--success-color);
    text-align: left;
}

/* Password Prompt Styles */
#auth-error-message {
    color: var(--error-color);
    font-weight: 600;
    margin-bottom: 15px;
    display: none;
}

/* Chart Modal Specific Styles */
.chart-modal-header {
    margin-bottom: 0;
    border-bottom: none;
}

.chart-controls-panel {
    display: flex;
    align-items: center;
    gap: 15px;
}

#upload-status {
    font-size: 0.9em;
    color: var(--accent-color-2);
}

.chart-modal-body {
    height: calc(100% - 70px); /* Adjust based on header height */
}

.chart-canvas-container {
    height: 100%;
    width: 100%;
}

/* Trend Update Modal Table */
#trend-modal-table {
    width: 100%;
}

#trend-modal-table input.modal-input {
    text-align: right;
    width: 100%;
}


/* --- Media Queries for Responsiveness --- */

@media (max-width: 1200px) {
    .top-row-panels {
        grid-template-columns: 1fr 1fr; /* Two columns */
    }

    .bottom-row-panels {
        grid-template-columns: 1fr; 
    }

    .moved-panels-group {
        grid-column: 1 / 3;
    }
}


@media (max-width: 768px) {
    .dashboard-container {
        padding: 10px;
    }
    
    .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }

    .header-title {
        font-size: 1.8em;
    }
    
    .top-row-panels, .bottom-row-panels {
        grid-template-columns: 1fr; /* Single column on small screens */
    }
    
    .moved-panels-group {
        grid-column: 1 / 2;
        grid-template-columns: 1fr;
    }
    
    .production-value-group {
        flex-direction: column;
    }
    
    .cut-qty-grid {
        grid-template-columns: 1fr;
    }
    
    .shift-breakdown-container {
        grid-template-columns: 1.5fr repeat(2, 1fr); /* Only P2 and P7 columns */
    }
    
    .breakdown-header:nth-child(4), /* P3 Total header */
    .breakdown-row > div:nth-child(4) /* P3 Total values */ {
        display: none; 
    }

    .breakdown-header:nth-child(5), /* Diff header */
    .breakdown-row > div:nth-child(5) /* Diff values */ {
        display: none; 
    }
    

    .shortcut-grid {
        grid-template-columns: 1fr 1fr;
    }
    
    .modal-content {
        width: 95%;
        margin: 20px auto;
        padding: 15px;
    }

    .modal-field-grid {
        grid-template-columns: 1fr 1fr;
    }
    
    .modal-field-grid label {
        grid-column: span 1;
        text-align: left;
    }
    
    .modal-field-grid .modal-input {
        grid-column: span 1;
    }
    
    .shift-breakdown-entry-grid {
        grid-template-columns: 1fr 1fr;
    }
    
    .daily-cuts-entry {
        grid-template-columns: 1fr 1fr 50px;
    }

    .modal-actions {
        flex-direction: column;
        gap: 10px;
    }
}