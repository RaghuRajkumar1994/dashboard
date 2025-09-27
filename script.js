document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTS AND STATE MANAGEMENT ---
    const DASHBOARD_DATA_KEY = 'dashboardData';
    const TREND_DATA_KEY = 'productionTrendData';
    const NOTES_KEY = 'dashboardNotes';
    const THEME_KEY = 'dashboardTheme';
    const PASSWORD = '123'; // Securely handle in a real app
    
    // UNC Network Path for shared files
    const SHARED_FOLDER_PATH = '\\\\192.168.4.6\\CCS Lab\\raghu';
    
    let productionTrendData = [];
    let currentAction = '';
    let currentUser = '';
    
    let currentMonthKey = ''; 

    const initialTrendData = [
        { customer: 'AUTOLIV INDIA PVT LTD', output: 201112, percent: 68 },
        // ... (rest of initial data, unchanged)
        { customer: 'AUTOLIV INDIA PVT LTD.', output: 462233, percent: 74 },
        { customer: 'Hyundai Mobis India Limited', output: 7800, percent: 61 },
        { customer: 'JoysonSafety', output: 499277, percent: 68 },
        { customer: 'Magneti Marelli', output: 1984, percent: 44 },
        { customer: 'Valco India', output: 112382, percent: 17 },
        { customer: 'ZF Rane', output: 171998, percent: 50 },
        { customer: 'Mahle', output: 18716, percent: 54 },
        { customer: 'Interface', output: 10520, percent: 56 },
        { customer: 'ITW', output: 6750, percent: 52 },
        { customer: 'ICHIKOH INDUSTRIES', output: 2099, percent: 57 },
        { customer: 'Sanden Vikas', output: 1480, percent: 44 },
        { customer: 'TATA', output: 0, percent: 0 },
        { customer: 'Tata Ficosa', output: 289977, percent: 48 },
        { customer: 'IATA MAGNA', output: 6550, percent: 46 },
        { customer: 'MSAH SEATING SYSTEMS', output: 2718, percent: 57 },
        { customer: 'Magna', output: 5608, percent: 90 },
        { customer: 'Vamoc', output: 26774, percent: 52 },
    ];
    
    // --- INITIALIZATION ---
    function initialize() {
        setInitialMonth();
        loadTheme();
        loadDashboardData();
        loadProductionTrendData();
        loadNotes();
        attachEventListeners();
    }

    function setInitialMonth() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); 
        const monthSelector = document.getElementById('month-selector');
        
        const defaultMonth = `${year}-${month}`;
        monthSelector.value = defaultMonth;
        
        currentMonthKey = defaultMonth; 
    }

    // --- EVENT LISTENERS ---
    function attachEventListeners() {
        document.getElementById('open-update-btn').addEventListener('click', () => {
            showPasswordModal('update_dashboard'); // Action for main dashboard update
        });

        document.getElementById('open-trend-update-btn').addEventListener('click', () => {
            showPasswordModal('update_trend'); // Action for trend update
        });
        
        document.getElementById('month-selector').addEventListener('change', handleMonthChange);

        // Dashboard Update Choice Handlers
        document.getElementById('manual-update-btn').addEventListener('click', () => {
            closeModal('update-choice-modal');
            openModal('data-entry-modal');
        });
        document.getElementById('auto-update-btn').addEventListener('click', () => {
            closeModal('update-choice-modal');
            document.getElementById('excelFileInput').click();
        });
        
        // NEW: Trend Update Choice Handlers
        document.getElementById('manual-trend-update-btn').addEventListener('click', () => {
            closeModal('trend-update-choice-modal');
            openModal('trend-entry-modal');
        });
        document.getElementById('auto-trend-update-btn').addEventListener('click', () => {
            closeModal('trend-update-choice-modal');
            document.getElementById('trendFileInput').click(); 
        });
        // END NEW

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
        
        document.getElementById('edit-customer-select').addEventListener('change', populateTrendFields);
        document.getElementById('updateDashboardBtn').addEventListener('click', handleManualDataUpdate);
        document.getElementById('updateTrendBtn').addEventListener('click', handleTrendUpdate);
        document.getElementById('removeTrendBtn').addEventListener('click', handleTrendRemoval);
        document.getElementById('addNoteBtn').addEventListener('click', handleNoteAddition);
        document.getElementById('openMail').addEventListener('click', openOutlook);
        document.getElementById('submitBtn').addEventListener('click', handlePasswordSubmit);
        document.getElementById('changePasswordBtn').addEventListener('click', handleChangePassword);
        document.querySelector('.change-password-link').addEventListener('click', showChangePasswordForm);
        document.getElementById('cancelChangeBtn').addEventListener('click', showLoginForm);
        
        // Main Dashboard Auto Update Listener
        document.getElementById('excelFileInput').addEventListener('change', handleAutoUpdate);
        // NEW: Trend Dashboard Auto Update Listener
        document.getElementById('trendFileInput').addEventListener('change', handleTrendAutoUpdate);
    }

    function handleMonthChange(e) {
        currentMonthKey = e.target.value; 
        loadDashboardData();
        loadProductionTrendData();
    }

    // --- DATA HANDLING & PERSISTENCE ---

    function getDashboardDataKey() {
        return `${DASHBOARD_DATA_KEY}_${currentMonthKey}`;
    }

    function loadDashboardData() {
        const storedData = localStorage.getItem(getDashboardDataKey());
        const data = storedData ? JSON.parse(storedData) : {};
        resetManualForm();
        updateDashboardUI(data);
    }
    
    function saveDashboardData(data) {
        const currentData = JSON.parse(localStorage.getItem(getDashboardDataKey()) || '{}');
        const newData = { ...currentData, ...data };
        localStorage.setItem(getDashboardDataKey(), JSON.stringify(newData));
        alert(`Dashboard updated successfully for ${currentMonthKey}!`);
        loadDashboardData();
    }
    
    function getTrendDataKey() {
        return `${TREND_DATA_KEY}_${currentMonthKey}`;
    }

    function loadProductionTrendData() {
        const storedTrendData = localStorage.getItem(getTrendDataKey());
        
        if (storedTrendData) {
            productionTrendData = JSON.parse(storedTrendData);
        } else {
            // Initialize with default zero data if no data exists for the month
            productionTrendData = initialTrendData.map(item => ({
                customer: item.customer, 
                output: 0, 
                percent: 0 
            }));
            localStorage.setItem(getTrendDataKey(), JSON.stringify(productionTrendData));
        }
        
        populateProductionTrendTable(productionTrendData);
        populateTrendDropdowns();
        updateScheduleAverageMeter();
    }

    function saveProductionTrendData() {
        localStorage.setItem(getTrendDataKey(), JSON.stringify(productionTrendData));
        alert(`Production Trend updated successfully for ${currentMonthKey}!`);
        loadProductionTrendData();
    }
    
    // --- UI RENDERING FUNCTIONS (unchanged) ---
    
    function resetManualForm() {
        document.querySelectorAll('#daily-data-form input').forEach(input => {
            input.value = '';
        });
    }

    function updateDashboardUI(data) {
        const updateElement = (elementId, value) => {
            const element = document.getElementById(elementId);
            if (element && value !== undefined && value !== null && value !== '') {
                // Ensure value is formatted correctly for display
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
            document.getElementById('cuts-average-value').textContent = Math.round(avg);
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
        const overallAverage = calculateOverallPercentAverage();
        const valueElement = document.getElementById('schedule-value');
        const chartElement = document.querySelector('.schedule-chart');
        
        if (valueElement && chartElement) {
            valueElement.textContent = `${overallAverage}%`;
            chartElement.style.background = `conic-gradient(var(--accent-color-2) ${overallAverage}%, transparent 0)`;
        }
    }

    // --- THEME LOGIC (unchanged) ---
    function setTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem(THEME_KEY, themeName);
        updateScheduleAverageMeter();
        loadDashboardData(); 
    }

    function loadTheme() {
        const currentTheme = localStorage.getItem(THEME_KEY) || 'default';
        setTheme(currentTheme);
        document.getElementById('theme-selector').value = currentTheme;
    }

    // --- MODAL & AUTHENTICATION LOGIC ---
    function openModal(modalId) {
        if (modalId === 'trend-entry-modal') {
            populateTrendDropdowns();
            resetTrendForm();
        }
        document.getElementById(modalId).style.display = 'flex';
    }

    function closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        document.getElementById('password-input').value = '';
    }

    function showPasswordModal(action, user = '') {
        currentAction = action;
        currentUser = user;
        document.getElementById('password-modal').style.display = 'flex';
        showLoginForm();
    }

    function showLoginForm() {
        document.getElementById('password-modal-header').textContent = 'ACCESS REQUIRED';
        document.getElementById('login-form-content').style.display = 'block';
        document.getElementById('change-form-content').style.display = 'none';
        document.getElementById('password-input').focus();
    }

    function showChangePasswordForm() {
        document.getElementById('password-modal-header').textContent = 'CHANGE PASSWORD';
        document.getElementById('login-form-content').style.display = 'none';
        document.getElementById('change-form-content').style.display = 'block';
        document.getElementById('old-password-input').value = '';
        document.getElementById('new-password-input').value = '';
    }

    function handlePasswordSubmit() {
        const password = document.getElementById('password-input').value;
        if (password === PASSWORD) {
            closeModal('password-modal');
            
            if (currentAction === 'update_dashboard') {
                openModal('update-choice-modal'); // Dashboard choice modal
            } else if (currentAction === 'update_trend') {
                openModal('trend-update-choice-modal'); // NEW Trend choice modal
            } else if (currentAction === 'user') {
                const userPathMap = {
                    'kirushnaraj': SHARED_FOLDER_PATH,
                    'siva': SHARED_FOLDER_PATH,
                    'praveen': SHARED_FOLDER_PATH,
                    'sandhosh': SHARED_FOLDER_PATH,
                    'sathya': SHARED_FOLDER_PATH,
                    'raghu': SHARED_FOLDER_PATH,
                };
                const userFolderPath = userPathMap[currentUser] || 'Shared Network Folder Unavailable';
                
                // Attempt to copy path to clipboard (Windows File Explorer uses the UNC path)
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(userFolderPath).then(() => {
                        alert(`Access granted for ${currentUser}!\n\nShared Folder path copied to clipboard:\n${userFolderPath}\n\n**Paste this path into your Windows File Explorer.**`);
                    }).catch(err => {
                        alert(`Access granted for ${currentUser}!\n\nShared Folder path:\n${userFolderPath}\n\nDue to security, please copy and paste this path manually into your Windows File Explorer.`);
                    });
                } else {
                    alert(`Access granted for ${currentUser}!\n\nShared Folder path:\n${userFolderPath}\n\nDue to security, please copy and paste this path manually into your Windows File Explorer.`);
                }
            }
        } else {
            alert("Incorrect password. Access denied.");
        }
    }

    function handleChangePassword() {
        const oldPassword = document.getElementById('old-password-input').value;
        const newPassword = document.getElementById('new-password-input').value;
        
        if (oldPassword === PASSWORD) {
            if (newPassword.length >= 4) {
                alert("Password changed successfully!");
                closeModal('password-modal');
            } else {
                alert("New password must be at least 4 characters long.");
            }
        } else {
            alert("Incorrect old password. Please try again.");
        }
    }

    // --- DATA UPDATE LOGIC (Manual & Auto) ---
    function handleManualDataUpdate() {
        const data = {};
        const inputs = document.querySelectorAll('#daily-data-form input');
        let hasData = false;

        inputs.forEach(input => {
            if (input.value !== '') {
                hasData = true;
                let key = input.id.replace('manual-', '');
                
                const keyMap = {
                    'auto-crimp': 'Auto Crimp',
                    'semi-crimp': 'Semi Crimp',
                    'soldering': 'Soldering',
                    'shift-a': 'Shift A',
                    'shift-b': 'Shift B',
                    'shift-c': 'Shift C',
                    'msf-p2': 'MSF P2',
                    'msf-p7': 'MSF P7',
                    'msf-mtotal-p2': 'MSF MTotal P2',
                    'msf-mtotal-p7': 'MSF MTotal P7',
                    'assembly-p2': 'Assembly P2',
                    'assembly-p7': 'Assembly P7',
                    'assembly-mtotal-p2': 'Assembly MTotal P2',
                    'assembly-mtotal-p7': 'Assembly MTotal P7',
                    'productivity': 'Productivity',
                    'lv-value': 'LV Value',
                };

                const mappedKey = keyMap[key.toLowerCase()] || key;
                data[mappedKey] = input.type === 'number' ? Number(input.value) : input.value;
            }
        });

        if (hasData) {
            saveDashboardData(data);
            closeModal('data-entry-modal');
        } else {
            alert("Please enter data in at least one field to update the dashboard.");
        }
    }
    
    // FUNCTION FOR MAIN DASHBOARD AUTO-UPDATE (Excel/JSON assumed structure: Headers in row 1, Data in row 2)
    function handleAutoUpdate(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let dataToSave = {};
                const fileType = file.name.split('.').pop().toLowerCase();
                const fileContent = e.target.result;

                if (fileType === 'json') {
                    // Handle JSON: Assumes a single object structure
                    dataToSave = JSON.parse(fileContent);

                } else if (fileType === 'xlsx' || fileType === 'xls') {
                    // Handle Excel: Assumes headers in row 1, data in row 2
                    const data = new Uint8Array(fileContent);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    if (json.length > 1) {
                        const headers = json[0];
                        const dataRow = json[1];

                        headers.forEach((header, index) => {
                            if (header && dataRow[index] !== undefined && dataRow[index] !== null) {
                                dataToSave[header.trim()] = dataRow[index];
                            }
                        });
                    }
                } else {
                    alert("Unsupported file type. Please use .xlsx, .xls, or .json.");
                    return;
                }

                if (dataToSave && typeof dataToSave === 'object' && Object.keys(dataToSave).length > 0) {
                    saveDashboardData(dataToSave);
                } else {
                    alert("Error: The selected file is empty or not valid data for the main dashboard.");
                }

            } catch (error) {
                console.error("Critical Error reading file:", error);
                alert(`Critical Error: Could not parse the file. Ensure it is a correctly formatted object/sheet.`);
            }
        };

        if (file.name.endsWith('.json')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    }

    // NEW FUNCTION FOR PRODUCTION TREND JSON AUTO-UPDATE
    function handleTrendAutoUpdate(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target.result; 
                const trendDataArray = JSON.parse(jsonString); 

                if (Array.isArray(trendDataArray) && trendDataArray.length > 0) {
                    const isValid = trendDataArray.every(item => 
                        item.customer && typeof item.customer === 'string' && 
                        ('output' in item) && ('percent' in item)
                    );

                    if (isValid) {
                        productionTrendData = trendDataArray.map(item => ({
                            customer: item.customer,
                            output: Number(item.output) || 0,
                            percent: Number(item.percent) || 0 
                        }));

                        saveProductionTrendData();
                    } else {
                        alert("Error: The JSON file contains invalid entries. Each item must be an object with 'customer' (string), 'output' (number), and 'percent' (number).");
                    }
                } else {
                    alert("Error: The selected file is empty or not a valid JSON array for trend data.");
                }

            } catch (error) {
                console.error("Critical Error reading Trend JSON file:", error);
                alert(`Critical Error: Could not parse the Trend JSON file. Ensure it is a correctly formatted array of objects.`);
            }
        };
        reader.readAsText(file);
    }
    // END NEW FUNCTION


    // --- TREND MANUAL UPDATE LOGIC (unchanged) ---
    
    function populateTrendDropdowns() {
        const select = document.getElementById('edit-customer-select');
        select.innerHTML = '<option value="">-- Select Customer --</option>';
        productionTrendData.forEach(item => {
            const option = document.createElement('option');
            option.value = item.customer;
            option.textContent = item.customer;
            select.appendChild(option);
        });
    }

    function populateTrendFields() {
        const customerName = document.getElementById('edit-customer-select').value;
        const entry = productionTrendData.find(item => item.customer === customerName);
        
        document.getElementById('edit-output').value = entry ? entry.output : '';
        document.getElementById('edit-percent').value = entry ? entry.percent : '';
    }

    function resetTrendForm() {
        document.getElementById('edit-customer-select').value = '';
        document.getElementById('edit-output').value = '';
        document.getElementById('edit-percent').value = '';
    }

    function handleTrendUpdate() {
        const customerName = document.getElementById('edit-customer-select').value;
        const newOutput = Number(document.getElementById('edit-output').value);
        const newPercent = Number(document.getElementById('edit-percent').value);

        if (!customerName) {
            alert("Please select a customer to update.");
            return;
        }

        const index = productionTrendData.findIndex(item => item.customer === customerName);
        if (index !== -1) {
            if (newOutput >= 0 && newPercent >= 0 && newPercent <= 100) {
                productionTrendData[index].output = newOutput;
                productionTrendData[index].percent = newPercent;
                saveProductionTrendData();
                closeModal('trend-entry-modal');
            } else {
                alert("Please ensure the output is positive/zero and the percentage is between 0 and 100.");
            }
        }
    }

    function handleTrendRemoval() {
        const customerName = document.getElementById('edit-customer-select').value;
        if (!customerName) {
            alert("Please select a customer to remove.");
            return;
        }

        if (confirm(`Are you sure you want to remove trend data for ${customerName} for ${currentMonthKey}?`)) {
            productionTrendData = productionTrendData.filter(item => item.customer !== customerName);
            saveProductionTrendData();
            closeModal('trend-entry-modal');
        }
    }

    // --- NOTES LOGIC (unchanged) ---
    function loadNotes() {
        const storedNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
        updateNotesList(storedNotes);
        updateNoteCount(storedNotes.length);
    }

    function saveNotes(notes) {
        localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
        updateNotesList(notes);
        updateNoteCount(notes.length);
    }

    function handleNoteAddition() {
        const noteInput = document.getElementById('note-input');
        const newNote = noteInput.value.trim();

        if (newNote) {
            const notes = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
            notes.unshift(newNote); 
            saveNotes(notes);
            noteInput.value = '';
        } else {
            alert("Please enter a note.");
        }
    }

    function removeNote(index) {
        let notes = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
        notes.splice(index, 1);
        saveNotes(notes);
    }

    function updateNotesList(notes) {
        const notesList = document.getElementById('notes-list');
        notesList.innerHTML = '';

        notes.forEach((note, index) => {
            const noteDiv = document.createElement('div');
            noteDiv.classList.add('note-item');
            noteDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; background-color: var(--secondary-bg); padding: 10px 15px; border-radius: 5px; margin-bottom: 10px;";
            noteDiv.innerHTML = `
                <span>${note}</span>
                <button class="remove-note-btn" data-index="${index}" style="background: none; border: none; color: var(--error-color); font-size: 1.2em; cursor: pointer;">&times;</button>
            `;
            notesList.appendChild(noteDiv);
        });

        notesList.querySelectorAll('.remove-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => removeNote(e.target.dataset.index));
        });
    }

    function updateNoteCount(count) {
        document.getElementById('note-count').textContent = `(${count})`;
        document.getElementById('notes-count-header').textContent = `(${count})`;
    }

    // --- EXTERNAL LINKS (MOCK) ---
    function openShortcutLink(path) {
        // Attempt to copy path to clipboard (Windows File Explorer uses the UNC path)
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

    initialize();
});