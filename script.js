document.addEventListener('DOMContentLoaded', () => {
    // ====================================================================
    // ⚠️ API CONFIGURATION: MUST MATCH YOUR PYTHON FLASK SERVER PORT ⚠️
    // ====================================================================
    const BASE_API_URL = 'http://localhost:3000/api';
    
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
            alert(`Failed to connect to centralized database or API error: ${error.message}. Is your Python Flask server running on http://localhost:3000?`);
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
            // FIX: Reload the data after the successful update (Cache-buster helps this)
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
        const newNote = { text: noteText, timestamp: new Date().toISOString() };
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

    // --- DATA HANDLING AND UI UPDATES ---
    
    function handleManualDataUpdate() {
        const form = document.getElementById('daily-data-form');
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            // Handle empty strings as 0 when converting to number
            data[key] = value === '' ? 0 : isNaN(Number(value)) ? value : Number(value); 
        });
        
        const updatedData = {
            'Auto Crimp': data['autoCrimpOutput'],
            'Semi Crimp': data['semiCrimpOutput'],
            'Soldering': data['solderingOutput'],
            'Shift A': data['shiftAValue'],
            'Shift B': data['shiftBValue'],
            'Shift C': data['shiftCValue'],
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
    
    // Handles adding a NEW customer or updating an EXISTING one
    async function handleTrendUpdate() {
        const customerName = document.getElementById('edit-customer-input').value.trim();
        const newOutput = Number(document.getElementById('edit-output').value);
        const newPercent = Number(document.getElementById('edit-percent').value);

        if (!customerName || isNaN(newOutput) || isNaN(newPercent)) {
            alert('Please enter a valid Customer Name, Output, and Percentage.');
            return;
        }
        
        // Case-insensitive search
        const customerIndex = productionTrendData.findIndex(item => item.customer.toLowerCase() === customerName.toLowerCase());

        if (customerIndex !== -1) {
            // Update existing customer
            productionTrendData[customerIndex].output = newOutput;
            productionTrendData[customerIndex].percent = newPercent;
        } else {
            // ADD NEW customer
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
        // Filter out the customer (case-insensitive filter)
        productionTrendData = productionTrendData.filter(item => item.customer.toLowerCase() !== customerName.toLowerCase());
        
        if (productionTrendData.length === initialLength) {
            alert(`Customer "${customerName}" not found.`);
            return;
        }
        
        await updateTrendData(productionTrendData);
        
        // Clear fields after removal
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
    
    // Populates the <datalist> element
    function populateTrendDropdowns() {
        const datalist = document.getElementById('customer-list');
        datalist.innerHTML = '';
        
        productionTrendData.forEach(item => {
            const option = document.createElement('option');
            option.value = item.customer;
            datalist.appendChild(option);
        });
        
        // Clear fields on refresh
        document.getElementById('edit-customer-input').value = '';
        document.getElementById('edit-output').value = '';
        document.getElementById('edit-percent').value = '';
    }
    
    // Reads from the INPUT field and populates Output/Percent
    function populateTrendFields() {
        const customerName = document.getElementById('edit-customer-input').value.trim();
        const customer = productionTrendData.find(item => item.customer.toLowerCase() === customerName.toLowerCase());
        
        document.getElementById('edit-output').value = '';
        document.getElementById('edit-percent').value = '';

        if (customer) {
            document.getElementById('edit-output').value = customer.output;
            document.getElementById('edit-percent').value = customer.percent;
        }
    }
    
    // --- UI RENDERING FUNCTIONS (UNCHANGED) ---
    
    function updateDashboardUI(data) {
        const updateElement = (elementId, value) => {
            const element = document.getElementById(elementId);
            if (element && value !== undefined && value !== null && value !== '') {
                let formattedValue = value;
                if (typeof value === 'number' || !isNaN(Number(value))) {
                    const num = Number(value);
                    if (elementId.includes('P2') || elementId.includes('P7')) {
                         formattedValue = num.toFixed(2);
                    } else {
                         formattedValue = num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
                    }
                }
                element.textContent = formattedValue;
            } else if (element) {
                element.textContent = elementId.includes('P2') || elementId.includes('P7') ? '0.00' : '0'; 
            }
        };

        const updateChart = (valueId, chartClass, value) => {
            const numValue = Number(value) || 0;
            const percentage = numValue > 100 ? 100 : numValue;
            
            document.getElementById(valueId).textContent = `${percentage}%`;
            document.querySelector(chartClass).style.background = `conic-gradient(var(--accent-color-1) ${percentage}%, transparent 0)`;
        };

        updateElement('auto-crimp-output', data['Auto Crimp']);
        updateElement('semi-crimp-output', data['Semi Crimp']);
        updateElement('soldering-output', data['Soldering']);
        updateElement('shift-a-value', data['Shift A']);
        updateElement('shift-b-value', data['Shift B']);
        updateElement('shift-c-value', data['Shift C']);
        updateElement('msf-plant-2', data['MSF P2']);
        updateElement('msf-plant-7', data['MSF P7']);
        updateElement('m-total-msf-p2', data['MSF MTotal P2']);
        updateElement('m-total-msf-p7', data['MSF MTotal P7']);
        updateElement('m-total-assembly-p2', data['Assembly MTotal P2']);
        updateElement('m-total-assembly-p7', data['Assembly MTotal P7']);
        updateElement('assembly-plant-2', data['Assembly P2']);
        updateElement('assembly-plant-7', data['Assembly P7']);
        
        if (data['LV Value'] !== undefined && data['LV Value'] !== null && data['LV Value'] !== '') {
            document.getElementById('lv-production-value').textContent = `${Number(data['LV Value']).toLocaleString('en-IN')}`;
        } else {
            document.getElementById('lv-production-value').textContent = `0`;
        }
        
        updateChart('productivity-value', '.productivity-chart', data['Productivity']);

        const shiftA = Number(data['Shift A']) || 0;
        const shiftB = Number(data['Shift B']) || 0;
        const shiftC = Number(data['Shift C']) || 0;
        const allShiftsPresent = shiftA > 0 || shiftB > 0 || shiftC > 0;

        if (allShiftsPresent) {
            const sum = shiftA + shiftB + shiftC;
            const count = (shiftA > 0) + (shiftB > 0) + (shiftC > 0);
            const avg = sum / count;
            document.getElementById('cuts-average-value').textContent = Math.round(avg).toLocaleString('en-IN');
        } else {
            document.getElementById('cuts-average-value').textContent = '0';
        }
    }

    function populateProductionTrendTable(data) {
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
        if (productionTrendData.length === 0) return 0;

        const validEntries = productionTrendData.filter(item => item.percent !== undefined && item.percent !== null && !isNaN(Number(item.percent)) && Number(item.percent) >= 0);
        
        if (validEntries.length === 0) return 0;

        const totalPercent = validEntries.reduce((sum, item) => sum + Number(item.percent), 0);
        return Math.round(totalPercent / validEntries.length);
    }

    function updateScheduleAverageMeter() {
        const avg = calculateOverallPercentAverage();
        const percentage = avg > 100 ? 100 : avg; 
        
        document.getElementById('schedule-value').textContent = `${percentage}%`;
        document.querySelector('.schedule-chart').style.background = `conic-gradient(var(--accent-color-2) ${percentage}%, transparent 0)`;
    }
    
    function renderNotes(notes) {
        const notesList = document.getElementById('notes-list');
        notesList.innerHTML = '';
        const notesCount = notes.length;
        updateNoteCount(notesCount);

        notes.forEach(note => {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'note-item';
            noteDiv.innerHTML = `
                <span>${note.text}</span>
                <button class="remove-note-btn" data-id="${note.id}" style="background: none; border: none; color: var(--error-color); font-weight: bold; font-size: 1.2em; cursor: pointer;">&times;</button>
            `;
            notesList.appendChild(noteDiv);
        });

        notesList.querySelectorAll('.remove-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => removeNote(e.target.dataset.id)); 
        });
    }

    function updateNoteCount(count) {
        document.getElementById('note-count').textContent = `(${count})`;
        document.getElementById('notes-count-header').textContent = `(${count})`;
    }

    // --- FILE UPLOAD HANDLERS ---

    function handleAutoUpdate(event) {
        handleFileSelect(event, 'dashboard');
    }
    
    function handleTrendAutoUpdate(event) {
        handleFileSelect(event, 'trend');
    }

    function handleFileSelect(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (e) => {
            const data = e.target.result;
            const fileType = file.name.split('.').pop().toLowerCase();

            try {
                if (fileType === 'json') {
                    const parsedData = JSON.parse(data);
                    if (type === 'dashboard') {
                        processJSONDashboardData(parsedData);
                    } else if (type === 'trend') {
                        processJSONTrendData(parsedData);
                    }
                } else if (fileType === 'xlsx' || fileType === 'xls') {
                    processExcelFile(data, type);
                } else {
                    alert('Unsupported file type.');
                }
            } catch (error) {
                console.error('File parsing error:', error);
                alert(`Error processing file: ${error.message}`);
            }
        };

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
        
        event.target.value = '';
    }

    function processExcelFile(data, type) {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonSheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (type === 'dashboard') {
            const headers = jsonSheetData[0];
            const values = jsonSheetData[1];
            if (headers && values) {
                const dashboardData = {};
                headers.forEach((header, index) => {
                    dashboardData[header] = values[index];
                });
                // When coming from Excel, we expect the single month data object
                processJSONDashboardData(dashboardData); 
            } else {
                 alert('Excel format error: Expected headers and data rows.');
            }
        } else if (type === 'trend') {
            const headers = jsonSheetData[0];
            const customerNameIndex = headers.findIndex(h => h && h.includes('Customer'));
            const outputIndex = headers.findIndex(h => h && h.includes('Output'));
            const percentIndex = headers.findIndex(h => h && h.includes('%'));
            
            if (customerNameIndex === -1 || outputIndex === -1 || percentIndex === -1) {
                alert('Excel format error: Could not find required columns (Customer Name, Output, %).');
                return;
            }
            
            const trendArray = [];
            for (let i = 1; i < jsonSheetData.length; i++) {
                const row = jsonSheetData[i];
                if (row[customerNameIndex] && row[outputIndex] !== undefined) {
                    trendArray.push({
                        customer: String(row[customerNameIndex]).trim(),
                        output: Number(row[outputIndex]) || 0,
                        percent: Number(row[percentIndex]) || 0
                    });
                }
            }
            processJSONTrendData(trendArray);
        }
    }

    // 🏆 FIX FOR DASHBOARD DATABASE UPLOAD
    async function processJSONDashboardData(data) {
        let dashboardObject = data;
        
        // Check if the uploaded data is the full monthly database structure
        if (data[currentMonthKey] && typeof data[currentMonthKey] === 'object' && data[currentMonthKey] !== null) {
            dashboardObject = data[currentMonthKey];
        } 
        
        // Safety check: ensure we have an object to process
        if (typeof dashboardObject !== 'object' || dashboardObject === null) {
            alert(`Dashboard JSON file format error: Could not find valid data for the selected month (${currentMonthKey}).`);
            return;
        }

        // Now map the fields from the extracted or single-month object
        const updatedData = {
            'Auto Crimp': Number(dashboardObject['Auto Crimp']) || 0,
            'Semi Crimp': Number(dashboardObject['Semi Crimp']) || 0,
            'Soldering': Number(dashboardObject['Soldering']) || 0,
            'Shift A': Number(dashboardObject['Shift A']) || 0,
            'Shift B': Number(dashboardObject['Shift B']) || 0,
            'Shift C': Number(dashboardObject['Shift C']) || 0,
            'MSF P2': Number(dashboardObject['MSF P2']) || 0,
            'MSF P7': Number(dashboardObject['MSF P7']) || 0,
            'MSF MTotal P2': Number(dashboardObject['MSF MTotal P2']) || 0,
            'MSF MTotal P7': Number(dashboardObject['MSF MTotal P7']) || 0,
            'Assembly MTotal P2': Number(dashboardObject['Assembly MTotal P2']) || 0,
            'Assembly MTotal P7': Number(dashboardObject['Assembly MTotal P7']) || 0,
            'Assembly P2': Number(dashboardObject['Assembly P2']) || 0,
            'Assembly P7': Number(dashboardObject['Assembly P7']) || 0,
            'Productivity': Number(dashboardObject['Productivity']) || 0,
            'LV Value': Number(dashboardObject['LV Value']) || 0,
        };
        await updateDashboardData(updatedData);
        closeModal('update-choice-modal');
    }

    // 🚀 Robust Logic for Trend JSON Format
    async function processJSONTrendData(data) {
        let trendArray = null;

        if (Array.isArray(data)) {
            // Case 1: Simple Array
            trendArray = data;
        } else if (typeof data === 'object' && data !== null) {
            // Case 2: User uploaded the entire db_trend.json structure
            if (data[currentMonthKey] && Array.isArray(data[currentMonthKey])) {
                trendArray = data[currentMonthKey];
            } 
            
            // Case 3: Generic Wrapper/Top-Level Array Search 
            if (!trendArray) {
                 for (const key in data) {
                     const potentialArray = data[key];
                     if (Array.isArray(potentialArray) && potentialArray.length > 0) {
                         // Simple validation: does the first item look like a customer object?
                         const firstItem = potentialArray[0];
                         if (firstItem && typeof firstItem === 'object' && firstItem.customer !== undefined) {
                             trendArray = potentialArray;
                             break;
                         }
                     }
                 }
            }
        }

        if (trendArray && Array.isArray(trendArray)) {
            const processedArray = trendArray.map(item => ({
                // Ensure customer name is a string and trim whitespace
                customer: String(item.customer).trim(),
                output: Number(item.output) || 0,
                percent: Number(item.percent) || 0,
            })).filter(item => item.customer !== ''); 

            await updateTrendData(processedArray);
            closeModal('trend-update-choice-modal');
        } else {
            alert(`JSON Trend file is incorrectly formatted. The tool could not find a suitable array of customer objects. Please ensure the top level of your JSON file is either the array itself, or an object containing the array under key "${currentMonthKey}", "customers", or another array-holding key.`);
        }
    }

    // --- MISC HANDLERS (UNCHANGED) ---
    function loadTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY) || 'default';
        setTheme(savedTheme);
    }

    function setTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        document.getElementById('theme-selector').value = theme;
        localStorage.setItem(THEME_KEY, theme);
        updateScheduleAverageMeter();
        // Force update productivity meter color
        const productivityValue = document.getElementById('productivity-value').textContent.replace('%', '');
        document.querySelector('.productivity-chart').style.background = `conic-gradient(var(--accent-color-1) ${productivityValue}%, transparent 0)`;
    }

    function openModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
        setTimeout(() => {
            document.querySelector(`#${modalId} .modal-content`).classList.add('modal-active');
        }, 10);
    }

    function closeModal(modalId) {
        const modalContent = document.querySelector(`#${modalId} .modal-content`);
        modalContent.classList.remove('modal-active');
        setTimeout(() => {
            document.getElementById(modalId).style.display = 'none';
        }, 300);
    }
    
    function showPasswordModal(action, user = 'admin') {
        currentAction = action;
        currentUser = user;
        const actionDisplay = document.getElementById('auth-action-display');
        actionDisplay.textContent = action.replace('_', ' ').toUpperCase();
        showLoginForm();
        openModal('password-modal');
    }

    function handlePasswordSubmit() {
        const passwordInput = document.getElementById('password-input');
        if (passwordInput.value === PASSWORD) {
            closeModal('password-modal');
            passwordInput.value = '';
            
            if (currentAction === 'update_dashboard') {
                openModal('update-choice-modal');
            } else if (currentAction === 'update_trend') {
                openModal('trend-update-choice-modal');
            } else if (currentAction === 'user') {
                alert(`Welcome, ${currentUser}! (Login successful)`);
            }
        } else {
            alert('Incorrect password!');
            passwordInput.value = '';
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
        const currentPass = document.getElementById('current-password-input').value;
        const newPass = document.getElementById('new-password-input').value;
        const confirmPass = document.getElementById('confirm-password-input').value;

        if (currentPass !== PASSWORD) {
            alert('Current password is incorrect.');
            return;
        }
        if (newPass.length < 3) {
            alert('New password must be at least 3 characters.');
            return;
        }
        if (newPass !== confirmPass) {
            alert('New passwords do not match.');
            return;
        }
        
        alert('Password changed successfully in MOCKUP. This needs backend implementation.');
        
        document.getElementById('current-password-input').value = '';
        document.getElementById('new-password-input').value = '';
        document.getElementById('confirm-password-input').value = '';
        showLoginForm();
    }
    
    const SHARED_FOLDER_PATH = '\\\\192.168.4.6\\CCS Lab\\raghu';
    function openShortcutLink(path) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(path).then(() => {
                alert(`File path copied to clipboard:\n${path}\n\n**Paste this path into your Windows File Explorer.**`);
            }).catch(err => {
                alert(`The file path cannot be opened directly.\n\nPlease copy and paste the path manually:\n${path}`);
            });
        } else {
            alert(`The file path cannot be opened directly.\n\nPlease copy and paste the path manually:\n${path}`);
        }
    }

    function openOutlook() {
        alert("The Outlook mail link cannot be opened directly from the browser due to security. This is a placeholder for a feature that would require a local desktop application.");
    }
    
    // --- EVENT LISTENERS (UNCHANGED) ---
    function attachEventListeners() {
        document.getElementById('open-update-btn').addEventListener('click', () => {
            showPasswordModal('update_dashboard'); 
        });

        document.getElementById('open-trend-update-btn').addEventListener('click', () => {
            showPasswordModal('update_trend'); 
        });
        
        document.getElementById('month-selector').addEventListener('change', handleMonthChange);

        document.getElementById('manual-update-btn').addEventListener('click', () => {
            closeModal('update-choice-modal');
            openModal('data-entry-modal');
        });
        document.getElementById('auto-update-btn').addEventListener('click', () => {
            closeModal('update-choice-modal');
            document.getElementById('excelFileInput').click();
        });
        
        document.getElementById('manual-trend-update-btn').addEventListener('click', () => {
            closeModal('trend-update-choice-modal');
            openModal('trend-entry-modal');
        });
        document.getElementById('auto-trend-update-btn').addEventListener('click', () => {
            closeModal('trend-update-choice-modal');
            document.getElementById('trendFileInput').click(); 
        });
        
        document.getElementById('theme-selector').addEventListener('change', (e) => setTheme(e.target.value));

        document.querySelectorAll('[data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => openModal(e.target.dataset.modal));
        });
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => closeModal(e.target.dataset.modalId));
        });
        document.querySelectorAll('.shortcut-item').forEach(item => {
            item.addEventListener('click', (e) => openShortcutLink(e.target.dataset.link));
        });
        document.querySelectorAll('.user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => showPasswordModal('user', e.target.dataset.user));
        });
        
        // Listener for the new input field (for fetching existing customer data)
        document.getElementById('edit-customer-input').addEventListener('input', populateTrendFields);
        
        document.getElementById('updateDashboardBtn').addEventListener('click', handleManualDataUpdate);
        document.getElementById('updateTrendBtn').addEventListener('click', handleTrendUpdate);
        document.getElementById('removeTrendBtn').addEventListener('click', handleTrendRemoval);
        document.getElementById('addNoteBtn').addEventListener('click', handleNoteAddition);
        document.getElementById('openMail').addEventListener('click', openOutlook);
        document.getElementById('submitBtn').addEventListener('click', handlePasswordSubmit);
        document.getElementById('changePasswordBtn').addEventListener('click', handleChangePassword);
        document.querySelector('.change-password-link').addEventListener('click', showChangePasswordForm);
        document.getElementById('cancelChangeBtn').addEventListener('click', showLoginForm);
        
        document.getElementById('excelFileInput').addEventListener('change', handleAutoUpdate);
        document.getElementById('trendFileInput').addEventListener('change', handleTrendAutoUpdate);
    }
    
    // --- EXECUTE INITIALIZATION ---
    initialize();
});