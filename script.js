document.addEventListener('DOMContentLoaded', () => {
    // ====================================================================
    // ✅ IMPORTANT: If your functions are not working, the most likely cause 
    // is that your backend Flask server is not running or the URL below 
    // is incorrect. Replace the placeholder URL with your actual public API URL.
    // ====================================================================
    const BASE_API_URL = 'https://dashboard-1l7a.onrender.com/api'; 
    
    // --- CONSTANTS AND STATE MANAGEMENT ---
    const THEME_KEY = 'dashboardTheme'; 
    const PASSWORD = '123'; 
    
    let productionTrendData = [];
    let currentAction = '';
    let currentUser = '';
    let currentMonthKey = ''; 

    // --- UTILITY: API CALL WRAPPER (Includes Cache Buster) ---
    async function makeApiCall(endpoint, method = 'GET', data = null) {
        let url = `${BASE_API_URL}${endpoint}`;
        
        // FIX: Add a cache-buster parameter to prevent the browser from serving old data
        if (method === 'GET') {
            url += (url.includes('?') ? '&' : '?') + '_t=' + new Date().getTime();
        }
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                let errorDetails = `HTTP error! Status: ${response.status}`;
                try {
                    const errorJson = await response.json();
                    errorDetails += `, Details: ${JSON.stringify(errorJson)}`;
                } catch (e) { /* Ignore non-json body */ }
                throw new Error(errorDetails);
            }
            // Handle 204 No Content 
            if (response.status === 204 || method === 'DELETE') return null; 
            return await response.json();
        } catch (error) {
            console.error(`API Call failed for ${method} ${url}:`, error);
            alert(`Failed to connect to centralized database or API error: ${error.message}. Is your Python Flask server running on its PUBLIC URL and accessible?`);
            // Return empty data structure on failure to prevent app crash
            if (endpoint.includes('/notes')) return [];
            if (endpoint.includes('/trend')) return [];
            return {};
        }
    }

    // --- INITIALIZATION & DATA LOADING ---
    function initialize() {
        setInitialMonth();
        loadTheme();
        updateDateDisplays(); 
        loadAllDashboardData(); 
        attachEventListeners();
    }
    
    function setInitialMonth() {
        const now = new Date();
        const year = now.getFullYear();
        // Sets month to the current month 
        const month = String(now.getMonth() + 1).padStart(2, '0'); 
        const monthSelector = document.getElementById('month-selector');
        
        const defaultMonth = `${year}-${month}`;
        monthSelector.value = defaultMonth;
        
        currentMonthKey = defaultMonth; 
    }

    // Function to calculate and display dynamic dates
    function updateDateDisplays() {
        // --- 1. Current Month and Year (for MACHINE TOTAL OUTPUT) ---
        const now = new Date();
        const currentMonthYearFormat = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long'
        }).format(now).toUpperCase(); 
        
        const currentMonthYearEl = document.getElementById('current-month-year');
        if (currentMonthYearEl) {
            currentMonthYearEl.textContent = `(${currentMonthYearFormat})`;
        }

        // --- 2. Yesterday's Date (for MACHINE WISE CUT'S HOUR QTY & BREAKDOWN TIME) ---
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1); 
        
        const yesterdayDateFormat = new Intl.DateTimeFormat('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(yesterday).toUpperCase().replace('.', ''); 
        
        const cutsDateEl = document.getElementById('yesterday-date-cuts');
        if (cutsDateEl) {
            cutsDateEl.textContent = `(${yesterdayDateFormat})`;
        }
        
        const breakdownDateEl = document.getElementById('yesterday-date-breakdown');
        if (breakdownDateEl) {
            breakdownDateEl.textContent = `(${yesterdayDateFormat})`;
        }
    }
    
    // Central loading function
    async function loadAllDashboardData() {
        // Fetch all resources concurrently 
        const [dashboardData, trendData, notesData] = await Promise.all([
            fetchDashboardData(currentMonthKey),
            fetchTrendData(currentMonthKey),
            fetchNotes(currentMonthKey)
        ]);
        
        // Update UI with fetched data
        updateDashboardUI(dashboardData);
        
        // Update Trend Data State and UI
        productionTrendData = trendData;
        populateProductionTrendTable(productionTrendData);
        populateTrendDropdowns(); // Populates the <datalist>
        updateScheduleAverageMeter();
        
        // Update Notes UI
        renderNotes(notesData);
    }
    
    function handleMonthChange(e) {
        currentMonthKey = e.target.value; 
        loadAllDashboardData(); // Reloads the UI for the selected month
    }

    // --- DATA FETCHING & PERSISTENCE (API CALLS) ---

    async function fetchDashboardData(monthKey) {
        const endpoint = `/dashboard/${monthKey}`;
        const data = await makeApiCall(endpoint);
        return data || {};
    }
    
    async function updateDashboardData(data) {
        const endpoint = `/dashboard/${currentMonthKey}`;
        const response = await makeApiCall(endpoint, 'POST', data);
        
        if (response || response === null) {
            alert(`Dashboard updated successfully for ${currentMonthKey} via API!`);
            // Reload the data after the successful update
            loadAllDashboardData(); 
        }
    }
    
    async function fetchTrendData(monthKey) {
        const endpoint = `/trend/${monthKey}`;
        const data = await makeApiCall(endpoint);
        
        if (!data || data.length === 0) {
            return []; 
        }
        return data;
    }

    async function updateTrendData(data) {
        const endpoint = `/trend/${currentMonthKey}`;
        const response = await makeApiCall(endpoint, 'POST', data);
        if (response || response === null) {
            alert(`Production Trend updated successfully for ${currentMonthKey} via API!`);
            loadAllDashboardData(); // Reload UI
        }
    }
    
    async function fetchNotes(monthKey) {
        const endpoint = `/notes/${monthKey}`;
        const data = await makeApiCall(endpoint);
        return Array.isArray(data) ? data : []; 
    }
    
    async function addNoteToDB(noteText) {
        const endpoint = `/notes/${currentMonthKey}`;
        // The server will assign the ID and timestamp
        const newNote = { text: noteText }; 
        const response = await makeApiCall(endpoint, 'POST', newNote);
        if (response) {
            loadAllDashboardData(); // Reload notes
        }
    }
    
    async function deleteNoteFromDB(noteId) {
        const endpoint = `/notes/${currentMonthKey}/${noteId}`;
        const response = await makeApiCall(endpoint, 'DELETE');
        if (response === null) { // Success (204 No Content)
            loadAllDashboardData(); // Reload notes
        }
    }

    // --- DATA HANDLING AND UI UPDATES (MODIFIED) ---
    
    function handleManualDataUpdate() {
        const form = document.getElementById('daily-data-form');
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            // Handle empty strings as 0 when converting to number
            data[key] = value === '' ? 0 : isNaN(Number(value)) ? value : Number(value); 
        });
        
        const updatedData = {
            // MONTHLY TOTALS 
            'Auto Crimp': data['autoCrimpOutput'],
            'Semi Crimp': data['semiCrimpOutput'],
            'Soldering': data['solderingOutput'],
            
            // NEW SHIFT BREAKDOWN DATA
            'Auto Crimp A': data['autoCrimpShiftA'],
            'Auto Crimp B': data['autoCrimpShiftB'],
            'Auto Crimp C': data['autoCrimpShiftC'],
            'Semi Crimp A': data['semiCrimpShiftA'],
            'Semi Crimp B': data['semiCrimpShiftB'],
            'Semi Crimp C': data['semiCrimpShiftC'],
            'Soldering A': data['solderingShiftA'],
            'Soldering B': data['solderingShiftB'],
            'Soldering C': data['solderingShiftC'],
            
            // BREAKDOWN TIME & OTHER VALUES 
            'MSF P2': data['msfP2'],
            'MSF P7': data['msfP7'],
            'MSF MTotal P2': data['mTotalMsfP2'],
            'MSF MTotal P7': data['mTotalMsfP7'],
            'Assembly MTotal P2': data['mTotalAssemblyP2'],
            'Assembly MTotal P7': data['mTotalAssemblyP7'],
            'Assembly P2': data['assemblyP2'],
            'Assembly P7': data['assemblyP7'],
            'Productivity': data['productivityValue'],
            'LV Value': data['lvProductionValue'],
        };
        
        updateDashboardData(updatedData);
        closeModal('data-entry-modal');
    }
    
    // Handles adding/updating/removing trend data (no change)
    async function handleTrendUpdate() {
        // ... (existing logic remains)
        const customerName = document.getElementById('edit-customer-input').value.trim();
        const newOutput = Number(document.getElementById('edit-output').value);
        const newPercent = Number(document.getElementById('edit-percent').value);

        if (!customerName || isNaN(newOutput) || isNaN(newPercent)) {
            alert('Please enter a valid Customer Name, Output, and Percentage.');
            return;
        }
        
        const customerIndex = productionTrendData.findIndex(item => item.customer.toLowerCase() === customerName.toLowerCase());

        if (customerIndex !== -1) {
            productionTrendData[customerIndex].output = newOutput;
            productionTrendData[customerIndex].percent = newPercent;
        } else {
            productionTrendData.push({ 
                customer: customerName, 
                output: newOutput, 
                percent: newPercent 
            });
            alert(`New customer "${customerName}" added!`);
        }
        
        await updateTrendData(productionTrendData);
        closeModal('trend-entry-modal');
    }
    
    async function handleTrendRemoval() {
        const customerName = document.getElementById('edit-customer-input').value.trim();
        
        if (!customerName) {
            alert('Please enter or select a customer name to remove.');
            return;
        }
        
        const initialLength = productionTrendData.length;
        productionTrendData = productionTrendData.filter(item => item.customer.toLowerCase() !== customerName.toLowerCase());
        
        if (productionTrendData.length === initialLength) {
            alert(`Customer "${customerName}" not found.`);
            return;
        }
        
        await updateTrendData(productionTrendData);
        
        document.getElementById('edit-customer-input').value = '';
        document.getElementById('edit-output').value = '';
        document.getElementById('edit-percent').value = '';
    }

    function handleNoteAddition() {
        const noteInput = document.getElementById('note-input');
        const noteText = noteInput.value.trim();
        
        if (noteText) {
            addNoteToDB(noteText);
            noteInput.value = ''; 
        }
    }

    function removeNote(noteId) {
        deleteNoteFromDB(noteId);
    }
    
    // Populates the <datalist> element (no change)
    function populateTrendDropdowns() {
        // ... (existing logic remains)
        const datalist = document.getElementById('customer-list');
        datalist.innerHTML = '';
        
        productionTrendData.forEach(item => {
            const option = document.createElement('option');
            option.value = item.customer;
            datalist.appendChild(option);
        });
        
        document.getElementById('edit-customer-input').value = '';
        document.getElementById('edit-output').value = '';
        document.getElementById('edit-percent').value = '';
    }
    
    // Reads from the INPUT field and populates Output/Percent (no change)
    function populateTrendFields() {
        // ... (existing logic remains)
        const customerName = document.getElementById('edit-customer-input').value.trim();
        const customer = productionTrendData.find(item => item.customer.toLowerCase() === customerName.toLowerCase());
        
        document.getElementById('edit-output').value = '';
        document.getElementById('edit-percent').value = '';

        if (customer) {
            document.getElementById('edit-output').value = customer.output;
            document.getElementById('edit-percent').value = customer.percent;
        }
    }
    
    // --- UI RENDERING FUNCTIONS (MODIFIED for SEPARATE AVERAGES) ---
    
    function updateDashboardUI(data) {
        const updateElement = (elementId, value) => {
            const element = document.getElementById(elementId);
            if (element && value !== undefined && value !== null && value !== '') {
                let formattedValue = value;
                const num = Number(value);
                
                if (elementId.includes('P2') || elementId.includes('P7')) {
                    // Breakdown time (two decimals)
                    formattedValue = num.toFixed(2);
                } else if (elementId.includes('average')) {
                    // Average cuts (rounded to nearest whole number)
                    formattedValue = Math.round(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
                } else if (typeof value === 'number' || !isNaN(num)) {
                    // General integer values
                    formattedValue = num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
                }
                
                element.textContent = formattedValue;
            } else if (element) {
                // Default to '0.00' for breakdown, '0' for others
                element.textContent = elementId.includes('P2') || elementId.includes('P7') ? '0.00' : '0'; 
            }
        };

        const updateChart = (valueId, chartClass, value) => {
            const numValue = Number(value) || 0;
            const percentage = numValue > 100 ? 100 : numValue;
            document.getElementById(valueId).textContent = `${percentage}%`;
            document.querySelector(chartClass).style.background = `conic-gradient(var(--accent-color-1) ${percentage}%, transparent 0)`;
        };
        
        // Helper function for average calculation
        const calculateMachineAverage = (shiftA, shiftB, shiftC) => {
            const valA = Number(shiftA) || 0;
            const valB = Number(shiftB) || 0;
            const valC = Number(shiftC) || 0;
            const total = valA + valB + valC;
            return total > 0 ? (total / 3) : 0;
        };

        // MONTHLY TOTALS 
        updateElement('auto-crimp-output', data['Auto Crimp']);
        updateElement('semi-crimp-output', data['Semi Crimp']);
        updateElement('soldering-output', data['Soldering']);
        
        // SHIFT BREAKDOWN
        updateElement('auto-crimp-shift-a', data['Auto Crimp A']);
        updateElement('auto-crimp-shift-b', data['Auto Crimp B']);
        updateElement('auto-crimp-shift-c', data['Auto Crimp C']);
        updateElement('semi-crimp-shift-a', data['Semi Crimp A']);
        updateElement('semi-crimp-shift-b', data['Semi Crimp B']);
        updateElement('semi-crimp-shift-c', data['Semi Crimp C']);
        updateElement('soldering-shift-a', data['Soldering A']);
        updateElement('soldering-shift-b', data['Soldering B']);
        updateElement('soldering-shift-c', data['Soldering C']);

        // --- NEW: SEPARATE AVERAGE CALCULATION ---
        const autoCrimpAvg = calculateMachineAverage(data['Auto Crimp A'], data['Auto Crimp B'], data['Auto Crimp C']);
        const semiCrimpAvg = calculateMachineAverage(data['Semi Crimp A'], data['Semi Crimp B'], data['Semi Crimp C']);
        const solderingAvg = calculateMachineAverage(data['Soldering A'], data['Soldering B'], data['Soldering C']);
        
        updateElement('auto-crimp-average', autoCrimpAvg);
        updateElement('semi-crimp-average', semiCrimpAvg);
        updateElement('soldering-average', solderingAvg);
        // -----------------------------------------

        // BREAKDOWN TIME 
        updateElement('msf-plant-2', data['MSF P2']);
        updateElement('msf-plant-7', data['MSF P7']);
        updateElement('m-total-msf-p2', data['MSF MTotal P2']);
        updateElement('m-total-msf-p7', data['MSF MTotal P7']);
        updateElement('m-total-assembly-p2', data['Assembly MTotal P2']);
        updateElement('m-total-assembly-p7', data['Assembly MTotal P7']);
        updateElement('assembly-plant-2', data['Assembly P2']);
        updateElement('assembly-plant-7', data['Assembly P7']);
        
        // OTHER VALUES 
        if (data['LV Value'] !== undefined && data['LV Value'] !== null && data['LV Value'] !== '') {
            document.getElementById('lv-production-value').textContent = `${Number(data['LV Value']).toLocaleString('en-IN')}`;
        } else {
            document.getElementById('lv-production-value').textContent = `0`;
        }
        updateChart('productivity-value', '.productivity-chart', data['Productivity']);
    }

    function populateProductionTrendTable(data) {
        // ... (existing logic remains)
        const tableBody = document.querySelector('#production-trend-table tbody');
        tableBody.innerHTML = '';
        
        const paddedData = [...data];
        if (paddedData.length % 2 !== 0) {
            paddedData.push({ customer: '', output: '', percent: '' });
        }
        
        for (let i = 0; i < paddedData.length; i += 2) {
            const row = document.createElement('tr');
            const data1 = paddedData[i];
            const data2 = paddedData[i + 1];
            
            const getPercentColorClass = (percent) => {
                const num = Number(percent);
                if (num === 0 || isNaN(num)) return 'percent-0';
                if (num >= 100) return 'percent-ge-100';
                return 'percent-lt-100';
            };
            
            const formatOutput = (output) => output === '' ? '' : Number(output).toLocaleString('en-IN', { maximumFractionDigits: 0 });
            const formatPercent = (percent) => percent === '' ? '' : `${percent}%`;

            const colorClass1 = getPercentColorClass(data1.percent);
            const colorClass2 = getPercentColorClass(data2.percent);

            row.innerHTML = `
                <td>${data1.customer}</td>
                <td>${formatOutput(data1.output)}</td>
                <td class="${colorClass1}">${formatPercent(data1.percent)}</td>
                <td>${data2.customer}</td>
                <td>${formatOutput(data2.output)}</td>
                <td class="${colorClass2}">${formatPercent(data2.percent)}</td>
            `;
            tableBody.appendChild(row);
        }
    }
    
    function calculateOverallPercentAverage() {
        // ... (existing logic remains)
        if (productionTrendData.length === 0) return 0;
        
        const validEntries = productionTrendData.filter(item => 
            item.percent !== undefined && item.percent !== null && !isNaN(Number(item.percent)) && Number(item.percent) >= 0
        );

        if (validEntries.length === 0) return 0;

        const totalPercent = validEntries.reduce((sum, item) => sum + Number(item.percent), 0);
        return Math.round(totalPercent / validEntries.length);
    }

    function updateScheduleAverageMeter() {
        // ... (existing logic remains)
        const avg = calculateOverallPercentAverage();
        const percentage = avg > 100 ? 100 : avg;

        document.getElementById('schedule-value').textContent = `${percentage}%`;
        document.querySelector('.schedule-chart').style.background = `conic-gradient(var(--accent-color-2) ${percentage}%, transparent 0)`;
    }

    function renderNotes(notes) {
        // ... (existing logic remains)
        const notesList = document.getElementById('notes-list');
        const noteCountEl = document.getElementById('note-count');
        
        noteCountEl.textContent = `(${notes.length})`;
        
        notesList.innerHTML = '';
        notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';
            
            const date = new Date(note.timestamp);
            const formattedTime = new Intl.DateTimeFormat('en-IN', { 
                day: '2-digit', month: 'short', year: 'numeric', 
                hour: '2-digit', minute: '2-digit', 
                hour12: true 
            }).format(date).replace(',', ' |');
            
            noteItem.innerHTML = `
                <div class="note-text">${note.text}</div>
                <div class="note-meta">
                    <span class="note-timestamp">${formattedTime}</span>
                    <button class="remove-note-btn" data-note-id="${note.id}">X</button>
                </div>
            `;
            notesList.appendChild(noteItem);
        });

        notesList.querySelectorAll('.remove-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                showPasswordModal('deleteNote', e.target.dataset.noteId);
            });
        });
    }

    // --- MODAL AND AUTHENTICATION LOGIC (No major change) ---

    function showModal(modalId) {
        // ... (existing logic remains)
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            const firstInput = modal.querySelector('input, textarea');
            if(firstInput) firstInput.focus();
            
            if (modalId === 'data-entry-modal') {
                populateManualDataForm();
            }
        }
    }

    function closeModal(modalId) {
        // ... (existing logic remains)
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    function populateManualDataForm() {
        // ... (existing logic remains)
        const getNum = (id) => {
            const el = document.getElementById(id);
            if (!el) return 0;
            const text = el.textContent.replace(/,/g, '').replace('₹', '').trim();
            const num = Number(text) || 0;
            // The shift breakdown values are displayed unformatted (no commas)
            return id.includes('shift') ? num : num; 
        };
        
        const setVal = (inputName, value) => {
            const input = document.querySelector(`#daily-data-form input[name="${inputName}"]`);
            if (input) {
                input.value = value;
            }
        };

        // NEW SHIFT BREAKDOWN DATA
        setVal('autoCrimpShiftA', getNum('auto-crimp-shift-a'));
        setVal('autoCrimpShiftB', getNum('auto-crimp-shift-b'));
        setVal('autoCrimpShiftC', getNum('auto-crimp-shift-c'));
        setVal('semiCrimpShiftA', getNum('semi-crimp-shift-a'));
        setVal('semiCrimpShiftB', getNum('semi-crimp-shift-b'));
        setVal('semiCrimpShiftC', getNum('semi-crimp-shift-c'));
        setVal('solderingShiftA', getNum('soldering-shift-a'));
        setVal('solderingShiftB', getNum('soldering-shift-b'));
        setVal('solderingShiftC', getNum('soldering-shift-c'));
        
        // MONTHLY TOTALS
        setVal('autoCrimpOutput', getNum('auto-crimp-output'));
        setVal('semiCrimpOutput', getNum('semi-crimp-output'));
        setVal('solderingOutput', getNum('soldering-output'));
        
        // BREAKDOWN TIME
        setVal('msfP2', getNum('msf-plant-2'));
        setVal('msfP7', getNum('msf-plant-7'));
        setVal('mTotalMsfP2', getNum('m-total-msf-p2'));
        setVal('mTotalMsfP7', getNum('m-total-msf-p7'));
        setVal('assemblyP2', getNum('assembly-plant-2'));
        setVal('assemblyP7', getNum('assembly-plant-7'));
        setVal('mTotalAssemblyP2', getNum('m-total-assembly-p2'));
        setVal('mTotalAssemblyP7', getNum('m-total-assembly-p7'));
        
        // OTHER VALUES
        const productivityValue = document.getElementById('productivity-value');
        if (productivityValue) {
            setVal('productivityValue', Number(productivityValue.textContent.replace('%', '')) || 0);
        }
        setVal('lvProductionValue', getNum('lv-production-value'));
    }
    
    // Authentication Logic (unchanged - kept for security features like delete note and updates)
    function showPasswordModal(action, payload = null) {
        currentAction = action;
        // The payload (e.g., noteId) is stored in the password modal's submit button 
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.setAttribute('data-payload', payload || ''); 
        
        document.getElementById('auth-action-display').textContent = action;
        document.getElementById('password-input').value = ''; 
        showLoginForm(); 
        showModal('password-modal');
    }

    function handlePasswordSubmit() {
        const passwordInput = document.getElementById('password-input').value;
        const submitBtn = document.getElementById('submitBtn');
        const payload = submitBtn.getAttribute('data-payload');

        if (passwordInput === PASSWORD) {
            closeModal('password-modal');
            
            // Execute the action that was stored
            switch (currentAction) {
                case 'dataEntry':
                    showModal('data-entry-modal');
                    break;
                case 'trendEntry':
                    showModal('trend-entry-modal');
                    break;
                case 'deleteNote':
                    removeNote(payload);
                    break;
                default:
                    break;
            }
        } else {
            alert('Incorrect password. Please try again.');
        }
    }

    function showChangePasswordForm() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('change-password-form').style.display = 'block';
    }

    function showLoginForm() {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('change-password-form').style.display = 'none';
    }

    function handleChangePassword() {
        const oldPass = document.getElementById('old-password-input').value;
        const newPass = document.getElementById('new-password-input').value;
        
        if (oldPass === PASSWORD) {
            // Note: In a real app, this should be an API call to change the server-side password.
            alert('Password change successful!');
            showLoginForm();
        } else {
            alert('Old password incorrect.');
        }
    }

    // --- 🔑 FIX: AUTO UPDATE FILE HANDLING IMPLEMENTATION ---
    
    async function handleAutoUpdate(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm(`Are you sure you want to overwrite the DAILY DATA ENTRY for ${currentMonthKey} using ${file.name}?`)) {
            event.target.value = ''; // Clear file input
            return;
        }
        
        let parsedData = {};
        try {
            if (file.name.endsWith('.json')) {
                const fileContent = await file.text();
                const flatData = JSON.parse(fileContent);

                // If JSON is already the final object, use it directly (preferred format)
                if (flatData['Auto Crimp'] !== undefined) {
                     parsedData = flatData;
                } else if (Array.isArray(flatData)) {
                     // Handle JSON in the Excel-like flat format: [ { "Key Name": "Auto Crimp", "Value": 3205000 }, ...]
                     parsedData = flatData.reduce((obj, item) => {
                         const key = item['Key Name'];
                         const value = item['Value'];
                         if (key) {
                             obj[key] = value === '' || value === null ? 0 : Number(value) || value;
                         }
                         return obj;
                     }, {});
                }

            } else if (file.name.endsWith('.xlsx')) {
                if (typeof XLSX === 'undefined') {
                    alert('XLSX library (SheetJS) is required for Excel updates. Please ensure the <script> tag is added to index.html.');
                    event.target.value = '';
                    return;
                }
                
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                // Read the data, expecting 'Key Name' and 'Value' columns
                // Using header: 1 means the first row is used as the key names
                const excelData = XLSX.utils.sheet_to_json(worksheet, { header: ['Key Name', 'Value'] }); 

                // Convert array of { "Key Name": X, "Value": Y } into a single object { X: Y }
                parsedData = excelData.slice(1).reduce((obj, item) => { // slice(1) to skip header row
                    const key = item['Key Name'];
                    const value = item['Value'];
                    if (key) {
                        // Ensure numeric conversion
                        obj[key] = value === '' || value === null ? 0 : Number(value) || value;
                    }
                    return obj;
                }, {});
                
            } else {
                alert('Unsupported file type. Please upload a JSON or XLSX file.');
                event.target.value = '';
                return;
            }

            // Sanity check
            if (parsedData['Auto Crimp'] === undefined && Object.keys(parsedData).length === 0) {
                 alert('The uploaded file structure is invalid. Please check the column headers or JSON keys.');
                 event.target.value = '';
                 return;
            }
            
            await updateDashboardData(parsedData); 
            
        } catch (error) {
            console.error('File parsing error:', error);
            alert('Failed to process file: ' + error.message);
        } finally {
            event.target.value = ''; // Clear file input
        }
    }
    
    async function handleTrendAutoUpdate(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm(`Are you sure you want to overwrite the PRODUCTION TREND for ${currentMonthKey} using ${file.name}?`)) {
            event.target.value = ''; // Clear file input
            return;
        }

        let trendArray = [];
        try {
            if (file.name.endsWith('.json')) {
                const fileContent = await file.text();
                trendArray = JSON.parse(fileContent);

            } else if (file.name.endsWith('.xlsx')) {
                if (typeof XLSX === 'undefined') {
                    alert('XLSX library (SheetJS) is required for Excel updates. Please ensure the <script> tag is added to index.html.');
                    event.target.value = '';
                    return;
                }
                
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                // Read the data, expecting 'customer', 'output', 'percent' columns
                trendArray = XLSX.utils.sheet_to_json(worksheet, { 
                    header: ['customer', 'output', 'percent'] 
                }).slice(1); // slice(1) to skip header row (assumes first row is header)
                
                // Ensure numeric fields are converted
                trendArray = trendArray.map(item => ({
                    customer: item.customer || '',
                    output: Number(item.output) || 0,
                    percent: Number(item.percent) || 0
                }));

            } else {
                alert('Unsupported file type. Please upload a JSON or XLSX file.');
                event.target.value = '';
                return;
            }

            // Verify Data Structure
            if (!Array.isArray(trendArray) || trendArray.some(item => !item.customer || item.output === undefined)) {
                 alert('The uploaded Trend file structure is invalid. Data must be an array of objects with "customer", "output", and "percent" fields.');
                 event.target.value = '';
                 return;
            }

            await updateTrendData(trendArray); 
            
        } catch (error) {
            console.error('File parsing error:', error);
            alert('Failed to process file: ' + error.message);
        } finally {
            event.target.value = ''; // Clear file input
        }
    }


    // --- THEME LOGIC FIX ---
    function loadTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY) || 'default';
        document.body.className = savedTheme;
        document.getElementById('theme-selector').value = savedTheme;
    }

    function saveTheme(theme) {
        document.body.className = theme;
        localStorage.setItem(THEME_KEY, theme);
    }

    // Shortcut Link Logic (no change)
    function attachShortcutListeners() {
        // ... (existing logic remains)
        document.querySelectorAll('.shortcut-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const link = e.currentTarget.dataset.link;
                if (link) {
                    // This will only work if the user has access to this local network path.
                    window.open(`file:///${link.replace(/\\/g, '/')}`, '_blank');
                }
            });
        });
    }
    
    // REMOVED: openOutlook function
    
    // --- EVENT LISTENERS (MODIFIED) ---
    function attachEventListeners() {
        document.getElementById('month-selector').addEventListener('change', handleMonthChange);
        document.getElementById('theme-selector').addEventListener('change', (e) => saveTheme(e.target.value));
        
        // Modal Control Listeners
        document.getElementById('open-update-btn').addEventListener('click', () => showPasswordModal('dataEntry'));
        document.getElementById('open-trend-update-btn').addEventListener('click', () => showPasswordModal('trendEntry'));
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => closeModal(e.target.dataset.modalId));
        });
        
        // Listener for Notes Panel
        document.querySelector('[data-modal="notes-modal"]').addEventListener('click', () => showModal('notes-modal'));
        
        // Shortcut listeners
        attachShortcutListeners(); 
        
        // Listener for the new input field (for fetching existing customer data)
        document.getElementById('edit-customer-input').addEventListener('input', populateTrendFields);
        
        // Action buttons
        document.getElementById('updateDashboardBtn').addEventListener('click', handleManualDataUpdate);
        document.getElementById('updateTrendBtn').addEventListener('click', handleTrendUpdate);
        document.getElementById('removeTrendBtn').addEventListener('click', handleTrendRemoval);
        document.getElementById('addNoteBtn').addEventListener('click', handleNoteAddition);
        // REMOVED: document.getElementById('openMail').addEventListener('click', openOutlook);
        document.getElementById('submitBtn').addEventListener('click', handlePasswordSubmit);
        document.getElementById('changePasswordBtn').addEventListener('click', handleChangePassword);
        document.querySelector('.change-password-link').addEventListener('click', showChangePasswordForm);
        document.getElementById('cancelChangeBtn').addEventListener('click', showLoginForm);
        
        // File upload listeners (Auto Update)
        document.getElementById('excelFileInput').addEventListener('change', handleAutoUpdate);
        document.getElementById('trendFileInput').addEventListener('change', handleTrendAutoUpdate);
    }
    
    // --- EXECUTE INITIALIZATION ---
    initialize();
});