document.addEventListener('DOMContentLoaded', () => {
    
    // ====================================================================
    // ✅ IMPORTANT: Replace the placeholder URL with your actual public API URL.
    // NOTE: This version uses LocalStorage to MOCK the API for self-contained functionality.
    // ====================================================================
    const BASE_API_URL = 'https://dashboard-1l7a.onrender.com/api'; 
    
    // --- CONSTANTS AND STATE MANAGEMENT ---
    const THEME_KEY = 'dashboardTheme'; 
    const PASSWORD_KEY = 'dashboardPassword';
    const DAILY_DATA_KEY = 'mockDailyData';
    const TREND_DATA_KEY = 'mockTrendData';

    // Initialize password and local mock data
    let currentPassword = localStorage.getItem(PASSWORD_KEY) || '12345'; 
    let dailyTrendData = []; // Data for the trend charts (monthly data points)
    let chartInstances = {}; // Stores instances of small gauge charts
    let largeChartInstance = null; // Stores the instance of the large trend chart
    let currentDateKey = ''; // The date selected by the date picker
    let todayData = {}; // Stores data for the selected date
    let yesterdayData = {}; // Stores data for the previous date
    let productionTrendData = []; // Stores the monthly customer production breakdown data
    
    // --- CHART CONFIGURATION ---
    const CHART_MAPPING = {
        lv_production_value: { 
            title: 'PRODUCTION VALUE TREND', 
            yLabel: 'LV Production Value',
            dataKey: 'lv_production_value',
            type: 'bar',
            color: 'var(--accent-color-1)'
        },
        productivity_schedule: {
            title: 'PRODUCTIVITY & SCHEDULE TREND',
            yLabel: 'Percentage (%)',
            dataKeys: ['productivity_value', 'schedule_average'],
            labels: ['Productivity', 'Schedule Avg'],
            type: 'line',
            colors: ['var(--success-color)', 'var(--warning-color)']
        },
        msf_breakdown: { 
            title: 'MSF BREAKDOWN TIME TREND (MONTHLY TOTALS)', 
            yLabel: 'MSF Breakdown Time (Hours)',
            dataKeys: ['msf_p2', 'msf_p7'],
            labels: ['MSF P2', 'MSF P7'],
            type: 'line',
            colors: ['var(--accent-color-1)', 'var(--accent-color-3)']
        },
        assembly_breakdown: { 
            title: 'ASSEMBLY BREAKDOWN TIME TREND (MONTHLY TOTALS)', 
            yLabel: 'Assembly Breakdown Time (Hours)',
            dataKeys: ['assembly_p2', 'assembly_p7'],
            labels: ['Assembly P2', 'Assembly P7'],
            type: 'line',
            colors: ['var(--accent-color-2)', 'var(--error-color)']
        },
        cuts_average: { 
            title: 'MACHINE CUTS AVERAGE TREND', 
            yLabel: 'Average Cuts/Hour',
            dataKeys: ['auto_crimp_avg', 'semi_crimp_avg', 'soldering_avg'],
            labels: ['Auto Crimp Avg', 'Semi Crimp Avg', 'Soldering Avg'],
            type: 'line',
            colors: ['var(--accent-color-1)', 'var(--accent-color-2)', 'var(--accent-color-3)']
        }
    };


    // --- UTILITY: MOCK API CALL WRAPPER (Using LocalStorage) ---
    async function makeApiCall(endpoint, method = 'GET', data = null) {
        
        let dailyDataStore = JSON.parse(localStorage.getItem(DAILY_DATA_KEY) || '{}');
        let trendDataStore = JSON.parse(localStorage.getItem(TREND_DATA_KEY) || '{}');

        // Initial Mock Data Population if storage is empty
        if (Object.keys(dailyDataStore).length === 0 || !dailyDataStore['trend_chart_data']) {
            dailyDataStore['2025-10-09'] = { // Yesterday's Mock Data
                daily_values: { lv_production_value: 95000, productivity_value: 92.5, schedule_average: 97.5 },
                monthly_totals: { auto_crimp_output: 45000, semi_crimp_output: 28000, soldering_output: 18000 },
                shift_breakdown: { auto_crimp: { shift_a: 15000, shift_b: 15000, shift_c: 15000 }, semi_crimp: { shift_a: 9333, shift_b: 9333, shift_c: 9334 }, soldering: { shift_a: 6000, shift_b: 6000, shift_c: 6000 } },
                cuts_averages: { auto_crimp_average: 555.55, semi_crimp_average: 350.00, soldering_average: 150.00 },
                breakdown_time: { msf_plant_2: 1.50, msf_plant_7: 0.80, assembly_plant_2: 0.50, assembly_plant_7: 0.30, m_total_msf_p2: 15.00, m_total_msf_p7: 8.00, m_total_assembly_p2: 5.00, m_total_assembly_p7: 3.00 }
            };
            dailyDataStore['2025-10-10'] = { // Today's Mock Data
                daily_values: { lv_production_value: 105000, productivity_value: 95.0, schedule_average: 99.0 },
                monthly_totals: { auto_crimp_output: 50000, semi_crimp_output: 30000, soldering_output: 20000 },
                shift_breakdown: { auto_crimp: { shift_a: 16000, shift_b: 17000, shift_c: 17000 }, semi_crimp: { shift_a: 10000, shift_b: 10000, shift_c: 10000 }, soldering: { shift_a: 7000, shift_b: 7000, shift_c: 6000 } },
                cuts_averages: { auto_crimp_average: 600.00, semi_crimp_average: 375.00, soldering_average: 165.00 },
                breakdown_time: { msf_plant_2: 1.00, msf_plant_7: 0.50, assembly_plant_2: 0.30, assembly_plant_7: 0.20, m_total_msf_p2: 16.00, m_total_msf_p7: 8.50, m_total_assembly_p2: 5.30, m_total_assembly_p7: 3.20 }
            };
            // Trend data points for the main trend chart
             dailyTrendData = [
                { date: '2025-07-01', lv_production_value: 80000, msf_p2: 20.0, msf_p7: 15.0, assembly_p2: 10.0, assembly_p7: 8.0, auto_crimp_avg: 450, semi_crimp_avg: 300, soldering_avg: 100, productivity_value: 88.0, schedule_average: 95.0 },
                { date: '2025-08-01', lv_production_value: 90000, msf_p2: 18.0, msf_p7: 14.0, assembly_p2: 9.0, assembly_p7: 7.0, auto_crimp_avg: 500, semi_crimp_avg: 330, soldering_avg: 120, productivity_value: 90.0, schedule_average: 96.0 },
                { date: '2025-09-01', lv_production_value: 100000, msf_p2: 17.0, msf_p7: 12.0, assembly_p2: 8.0, assembly_p7: 6.0, auto_crimp_avg: 550, semi_crimp_avg: 350, soldering_avg: 140, productivity_value: 92.0, schedule_average: 97.0 },
                { date: '2025-10-01', lv_production_value: 105000, msf_p2: 16.0, msf_p7: 8.5, assembly_p2: 5.3, assembly_p7: 3.2, auto_crimp_avg: 600, semi_crimp_avg: 375, soldering_avg: 165, productivity_value: 95.0, schedule_average: 99.0 }
            ];
            dailyDataStore['trend_chart_data'] = dailyTrendData;
            localStorage.setItem(DAILY_DATA_KEY, JSON.stringify(dailyDataStore));
        } else {
             dailyTrendData = dailyDataStore['trend_chart_data'] || [];
        }


        if (Object.keys(trendDataStore).length === 0) {
            trendDataStore['2025-10'] = [
                // Updated mock data to include the new percentage_input field
                { customer_name: 'HONDA', overall_output: 50000, percentage_input: 50.00 },
                { customer_name: 'TOYOTA', overall_output: 30000, percentage_input: 30.00 },
                { customer_name: 'NISSAN', overall_output: 15000, percentage_input: 15.00 },
                { customer_name: 'TESLA', overall_output: 5000, percentage_input: 5.00 },
            ];
            localStorage.setItem(TREND_DATA_KEY, JSON.stringify(trendDataStore));
        }


        // Extract identifiers from endpoint
        const dateMatch = endpoint.match(/\/data\/(\d{4}-\d{2}-\d{2})/);
        const monthMatch = endpoint.match(/\/trend\/(\d{4}-\d{2})|.*\/trend\/bulk_update\/(\d{4}-\d{2})/);
        const dateKey = dateMatch ? dateMatch[1] : null;
        const monthKey = monthMatch ? (monthMatch[1] || monthMatch[2]) : null;

        // Simulate GET request (for /data/date and /trend/month)
        if (method === 'GET') {
            if (endpoint.startsWith('/data/')) {
                return dailyDataStore[dateKey] || {};
            }
            if (endpoint.startsWith('/trend/')) {
                return trendDataStore[monthKey] || [];
            }
            // Return trend chart data
            if (endpoint.startsWith('/trend_chart_data')) {
                 return dailyDataStore['trend_chart_data'] || [];
            }
            return {}; // Fallback for other GETs
        }

        // Simulate PUT/POST request (for data/date and trend/bulk_update/month)
        if (method === 'PUT' || method === 'POST') {
            if (endpoint.startsWith('/data/bulk_update') || endpoint.startsWith('/data/')) {
                // Handle daily data update
                if (dateKey && data && data.daily) {
                    // Update daily data. 
                    dailyDataStore[dateKey] = { ...data.daily }; 
                    
                    // Logic to update/add the last point in the dailyTrendData array
                    const newDailyValues = data.daily.daily_values;
                    const newBreakdown = data.daily.breakdown_time;
                    const newCutsAverages = data.daily.cuts_averages; 
                    
                    const newTrendPoint = {
                         date: dateKey,
                         lv_production_value: newDailyValues.lv_production_value || 0,
                         msf_p2: newBreakdown.m_total_msf_p2 || 0, // Using monthly total for the monthly chart view
                         msf_p7: newBreakdown.m_total_msf_p7 || 0,
                         assembly_p2: newBreakdown.m_total_assembly_p2 || 0,
                         assembly_p7: newBreakdown.m_total_assembly_p7 || 0,
                         auto_crimp_avg: newCutsAverages.auto_crimp_average || 0,
                         semi_crimp_avg: newCutsAverages.semi_crimp_average || 0,
                         soldering_avg: newCutsAverages.soldering_average || 0,
                         productivity_value: newDailyValues.productivity_value || 0,
                         schedule_average: newDailyValues.schedule_average || 0
                    };
                    
                    // Find or add/update the monthly point based on date (only the last point is updated by daily data)
                    const existingIndex = dailyTrendData.findIndex(d => d.date === dateKey);
                    if (existingIndex > -1) {
                        dailyTrendData[existingIndex] = newTrendPoint;
                    } else if (dateKey.endsWith('-01')) { // Only save as a new trend point if it's the 1st of the month
                        dailyTrendData.push(newTrendPoint);
                        dailyTrendData.sort((a, b) => new Date(a.date) - new Date(b.date)); // Keep sorted
                    }
                    dailyDataStore['trend_chart_data'] = dailyTrendData;
                    
                    localStorage.setItem(DAILY_DATA_KEY, JSON.stringify(dailyDataStore));
                    return { status: 'success', message: `Data for ${dateKey} saved.` };
                }
            } else if (endpoint.startsWith('/trend/bulk_update')) {
                // Handle customer trend data update
                if (monthKey && data && data.trend_data) {
                    trendDataStore[monthKey] = data.trend_data;
                    localStorage.setItem(TREND_DATA_KEY, JSON.stringify(trendDataStore));
                    return { status: 'success', message: `Trend data for ${monthKey} saved.` };
                }
            } else if (endpoint.startsWith('/trend_chart_data/bulk_update')) {
                 // --- NEW: Chart Trend Data Bulk Update ---
                if (data && data.trend_data) {
                    // Save the new bulk data and ensure it's sorted by date
                    dailyDataStore['trend_chart_data'] = data.trend_data.sort((a, b) => new Date(a.date) - new Date(b.date));
                    localStorage.setItem(DAILY_DATA_KEY, JSON.stringify(dailyDataStore));
                    return { status: 'success', message: `Trend chart data updated with ${data.trend_data.length} points.` };
                }
            }
            // Simulate success for file uploads as well
            return { status: 'success', message: `Simulated success for ${method} to ${endpoint}` };
        }

        return null;
    }

    // --- UTILITY: DATE FORMATTING & MANAGEMENT ---
    function formatValue(value, isFloat = false, places = 2, defaultVal = 0) {
        if (typeof value !== 'number' || isNaN(value)) {
            value = defaultVal;
        }
        return isFloat ? value.toFixed(places) : Math.round(value).toLocaleString();
    }

    function formatDate(date) {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    }

    function formatDisplayDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function getYesterdayDate(todayString) {
        const today = new Date(todayString);
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return formatDate(yesterday);
    }
    
    function getMonthYearDisplay(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    }
    
    function getMonthYearKey(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        let month = '' + (date.getMonth() + 1);
        if (month.length < 2) month = '0' + month;
        return `${year}-${month}`;
    }
    
    // --- UTILITY: EXCEL FILE READING ---
    function readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    // Assuming the first sheet holds the relevant data
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet);
                    // Filter out rows that are completely empty
                    const cleanedJson = json.filter(row => Object.values(row).some(val => val !== null && val !== ''));
                    resolve(cleanedJson);
                } catch (error) {
                    console.error("Excel Read Error:", error);
                    reject(new Error("Error reading the Excel file. Please ensure it's a valid format."));
                }
            };
            reader.onerror = (error) => reject(new Error("File read error."));
            reader.readAsArrayBuffer(file);
        });
    }

    // --- MODAL CONTROL ---
    function openModal(id) {
        document.getElementById(id).style.display = 'flex';
    }

    function closeModal(id) {
        document.getElementById(id).style.display = 'none';
        // Clear file input status on close
        if (id === 'daily-update-modal') {
            document.getElementById('dailyFileInput').value = '';
            document.getElementById('daily-upload-status').textContent = '';
        } else if (id === 'trend-update-modal') {
            document.getElementById('trendFileInput').value = '';
            document.getElementById('trend-upload-status').textContent = '';
        } else if (id === 'chart-trend-update-modal') { // NEW
            document.getElementById('chartTrendFileInput').value = '';
            document.getElementById('chart-trend-upload-status').textContent = '';
        }
    }

    // --- THEME MANAGEMENT ---
    function initializeTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY) || 'default';
        document.querySelector('.dashboard-container').setAttribute('data-theme', savedTheme);
        document.getElementById('theme-selector').value = savedTheme;
    }

    // --- UI UPDATES ---
    function updateUI(data) {
        // --- DATA STATE UPDATE ---
        todayData = data.today || {};
        yesterdayData = data.yesterday || {};
        productionTrendData = data.trend || [];
        dailyTrendData = data.trend_chart_data || [];
        
        const selectedDate = document.getElementById('date-selector').value;
        const yesterdayDate = getYesterdayDate(selectedDate);
        const monthYearDisplay = getMonthYearDisplay(selectedDate);
        const yesterdayDisplay = formatDisplayDate(yesterdayDate);

        // Header Dates
        document.getElementById('yesterday-date-display-header').textContent = `(Data for ${yesterdayDisplay})`;
        document.getElementById('yesterday-date-display-cuts').textContent = `(Data for ${yesterdayDisplay})`;
        document.getElementById('yesterday-date-display-breakdown').textContent = `(Data for ${yesterdayDisplay})`;
        document.getElementById('current-month-year-display').textContent = `(${monthYearDisplay})`;
        document.getElementById('current-month-display').textContent = `(${monthYearDisplay})`;

        // Panel Data (Today's Data)
        const dailyValues = todayData.daily_values || {};
        const monthlyTotals = todayData.monthly_totals || {};
        const cutsAverages = todayData.cuts_averages || {};
        const breakdownTime = todayData.breakdown_time || {};

        document.getElementById('production-value-today').textContent = formatValue(dailyValues.lv_production_value);
        document.getElementById('productivity-value').textContent = `${formatValue(dailyValues.productivity_value, true, 1)}%`;
        document.getElementById('schedule-value').textContent = `${formatValue(dailyValues.schedule_average, true, 1)}%`;

        // Monthly Totals
        document.getElementById('auto-crimp-output').textContent = formatValue(monthlyTotals.auto_crimp_output);
        document.getElementById('semi-crimp-output').textContent = formatValue(monthlyTotals.semi_crimp_output);
        document.getElementById('soldering-output').textContent = formatValue(monthlyTotals.soldering_output);

        // Shift Breakdown (Use today's data or yesterday's if today is empty)
        const displayShiftData = todayData.shift_breakdown || yesterdayData.shift_breakdown || {}; 
        
        document.getElementById('auto-crimp-shift-a').textContent = formatValue((displayShiftData.auto_crimp || {}).shift_a);
        document.getElementById('auto-crimp-shift-b').textContent = formatValue((displayShiftData.auto_crimp || {}).shift_b);
        document.getElementById('auto-crimp-shift-c').textContent = formatValue((displayShiftData.auto_crimp || {}).shift_c);

        document.getElementById('semi-crimp-shift-a').textContent = formatValue((displayShiftData.semi_crimp || {}).shift_a);
        document.getElementById('semi-crimp-shift-b').textContent = formatValue((displayShiftData.semi_crimp || {}).shift_b);
        document.getElementById('semi-crimp-shift-c').textContent = formatValue((displayShiftData.semi_crimp || {}).shift_c);

        document.getElementById('soldering-shift-a').textContent = formatValue((displayShiftData.soldering || {}).shift_a);
        document.getElementById('soldering-shift-b').textContent = formatValue((displayShiftData.soldering || {}).shift_b);
        document.getElementById('soldering-shift-c').textContent = formatValue((displayShiftData.soldering || {}).shift_c);

        // Cuts Averages
        document.getElementById('auto-crimp-average').textContent = formatValue(cutsAverages.auto_crimp_average, true);
        document.getElementById('semi-crimp-average').textContent = formatValue(cutsAverages.semi_crimp_average, true);
        document.getElementById('soldering-average').textContent = formatValue(cutsAverages.soldering_average, true);
        
        // Breakdown Time (Daily)
        document.getElementById('msf-plant-2').textContent = formatValue(breakdownTime.msf_plant_2, true);
        document.getElementById('msf-plant-7').textContent = formatValue(breakdownTime.msf_plant_7, true);
        document.getElementById('assembly-plant-2').textContent = formatValue(breakdownTime.assembly_plant_2, true);
        document.getElementById('assembly-plant-7').textContent = formatValue(breakdownTime.assembly_plant_7, true);
        
        // Breakdown Time (Monthly Totals)
        document.getElementById('m-total-msf-p2').textContent = formatValue(breakdownTime.m_total_msf_p2, true);
        document.getElementById('m-total-msf-p7').textContent = formatValue(breakdownTime.m_total_msf_p7, true);
        document.getElementById('m-total-assembly-p2').textContent = formatValue(breakdownTime.m_total_assembly_p2, true);
        document.getElementById('m-total-assembly-p7').textContent = formatValue(breakdownTime.m_total_assembly_p7, true);
        
        // Yesterday's Value
        const yesterdayValues = yesterdayData.daily_values || {};
        document.getElementById('production-value-yesterday').textContent = formatValue(yesterdayValues.lv_production_value);
        
        // Customer Trend Table
        updateTrendTable(productionTrendData);

        // Charts
        initializeGauges(dailyValues.productivity_value || 0, dailyValues.schedule_average || 0);
    }
    
    // --- DATA FETCHING ---
    async function fetchDashboardData(date) {
        currentDateKey = date;
        const yesterdayKey = getYesterdayDate(date);
        const monthKey = getMonthYearKey(date);
        
        console.log(`Fetching data for date: ${date}, yesterday: ${yesterdayKey}, month: ${monthKey}`);
        
        try {
            // Fetch today's data (daily dashboard values and monthly totals)
            const todayResult = await makeApiCall(`/data/${date}`, 'GET');
            
            // Fetch yesterday's data (for comparison/shift breakdown panel)
            const yesterdayResult = await makeApiCall(`/data/${yesterdayKey}`, 'GET');
            
            // Fetch monthly customer trend data
            const trendResult = await makeApiCall(`/trend/${monthKey}`, 'GET');
            
            // Fetch trend chart data (monthly points)
            const trendChartResult = await makeApiCall('/trend_chart_data', 'GET');

            const dashboardData = {
                today: todayResult,
                yesterday: yesterdayResult,
                trend: trendResult,
                trend_chart_data: trendChartResult
            };
            
            updateUI(dashboardData);
            
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            // Optionally, update the UI with zeros or an error message
            updateUI({}); 
        }
    }

    // ... (Chart Rendering, Trend Table Management, Form/File Utilities remain the same) ...

    function initializeGauges(productivityValue, scheduleValue) {
        const productivityCtx = document.getElementById('productivityChart').getContext('2d');
        const scheduleCtx = document.getElementById('scheduleChart').getContext('2d');
        
        // Clear previous instances
        if (chartInstances.productivity) chartInstances.productivity.destroy();
        if (chartInstances.schedule) chartInstances.schedule.destroy();

        const commonOptions = () => ({
            responsive: true,
            maintainAspectRatio: true,
            cutout: '80%',
            circumference: 270,
            rotation: 225,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
                datalabels: {
                    display: false // Value is displayed via HTML span
                },
                title: { display: false }
            }
        });

        const getColor = (value) => {
            const root = document.documentElement;
            if (value >= 95) return getComputedStyle(root).getPropertyValue('--success-color').trim();
            if (value >= 90) return getComputedStyle(root).getPropertyValue('--warning-color').trim();
            return getComputedStyle(root).getPropertyValue('--error-color').trim();
        };

        // Productivity Chart
        const productivityData = {
            datasets: [{
                data: [productivityValue, 100 - productivityValue],
                backgroundColor: [getColor(productivityValue), 'var(--secondary-bg)'],
                borderColor: [getColor(productivityValue), 'var(--secondary-bg)'],
                borderWidth: 0
            }]
        };

        chartInstances.productivity = new Chart(productivityCtx, {
            type: 'doughnut',
            data: productivityData,
            options: commonOptions()
        });

        // Schedule Chart
        const scheduleData = {
            datasets: [{
                data: [scheduleValue, 100 - scheduleValue],
                backgroundColor: [getColor(scheduleValue), 'var(--secondary-bg)'],
                borderColor: [getColor(scheduleValue), 'var(--secondary-bg)'],
                borderWidth: 0
            }]
        };

        chartInstances.schedule = new Chart(scheduleCtx, {
            type: 'doughnut',
            data: scheduleData,
            options: commonOptions()
        });
    }

    // --- CHART RENDERING (LARGE TREND CHART) ---
    function renderLargeTrendChart(chartKey, data) {
        const config = CHART_MAPPING[chartKey];
        if (!config) {
            console.error(`Invalid chart key: ${chartKey}`);
            return;
        }

        const canvas = document.getElementById('largeTrendChart');
        const ctx = canvas.getContext('2d');
        document.getElementById('chart-title').textContent = config.title;

        // Destroy previous chart instance
        if (largeChartInstance) {
            largeChartInstance.destroy();
        }
        
        // Filter out any points without a date or essential data for robustness
        const cleanedData = data.filter(d => d.date && d[config.dataKey] !== undefined);
        
        const labels = cleanedData.map(d => getMonthYearKey(d.date));

        let datasets = [];
        const isMultiDataset = Array.isArray(config.dataKeys);
        
        if (isMultiDataset) {
            config.dataKeys.forEach((key, index) => {
                const color = getComputedStyle(document.documentElement).getPropertyValue(config.colors[index]).trim();
                datasets.push({
                    label: config.labels[index],
                    data: cleanedData.map(d => d[key]),
                    borderColor: color,
                    backgroundColor: color,
                    type: config.type,
                    fill: false,
                    yAxisID: 'y'
                });
            });
        } else {
            const color = getComputedStyle(document.documentElement).getPropertyValue(config.color).trim();
            datasets.push({
                label: config.title,
                data: cleanedData.map(d => d[config.dataKey]),
                backgroundColor: color,
                borderColor: color,
                type: config.type,
                yAxisID: 'y'
            });
        }

        largeChartInstance = new Chart(ctx, {
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
                        }
                    },
                    title: {
                        display: true,
                        text: config.title,
                        color: getComputedStyle(document.documentElement).getPropertyValue('--panel-header-color').trim(),
                        font: { size: 16 }
                    }
                },
                scales: {
                    x: {
                        grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--panel-border-color').trim() },
                        ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() }
                    },
                    y: {
                        title: {
                            display: true,
                            text: config.yLabel,
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
                        },
                        grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--panel-border-color').trim() },
                        ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() }
                    }
                }
            }
        });
    }
    
    // --- CHART SHORTCUT HANDLER ---
    function handleChartClick(chartKey) {
        if (dailyTrendData.length === 0) {
            document.getElementById('upload-status').textContent = 'No trend data available to display.';
            setTimeout(() => document.getElementById('upload-status').textContent = '', 3000);
            return;
        }
        
        renderLargeTrendChart(chartKey, dailyTrendData);
        openModal('chart-modal');
    }

    function updateTrendTable(data) {
        const listContainer = document.getElementById('customer-breakdown-list');
        listContainer.innerHTML = '';
        if (data.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: var(--warning-color); padding: 20px;">No Customer Production Breakdown data for this month.</div>';
            return;
        }
        
        data.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'customer-item';
            itemDiv.innerHTML = `
                <span>${item.customer_name || 'N/A'}</span>
                <span class="customer-output">${formatValue(item.overall_output)}</span>
                <span class="customer-percentage">${formatValue(item.percentage_input, true, 2)}%</span>
            `;
            listContainer.appendChild(itemDiv);
        });
    }

    function createTrendItem(item = {}, index) {
        const div = document.createElement('div');
        div.className = 'trend-item-entry';
        div.setAttribute('data-index', index);
        div.innerHTML = `
            <input type="text" name="customer_name" class="modal-input" placeholder="Customer Name" value="${item.customer_name || ''}" required>
            <input type="number" name="overall_output" class="modal-input" placeholder="Overall Output" value="${item.overall_output || 0}" required>
            <input type="number" name="percentage_input" class="modal-input" placeholder="Percentage (%)" value="${item.percentage_input || 0}" step="any" required>
            <button type="button" class="control-btn remove-trend-btn" style="background-color: var(--error-color);">REMOVE</button>
        `;
        return div;
    }

    function addTrendItem(item = {}) {
        const listContainer = document.getElementById('trend-data-list');
        const index = listContainer.querySelectorAll('.trend-item-entry').length;
        listContainer.appendChild(createTrendItem(item, index));
        document.getElementById('trend-update-modal').querySelector('.modal-body').scrollTop = document.getElementById('trend-update-modal').querySelector('.modal-body').scrollHeight;
    }
    
    function removeTrendItem(index) {
        const itemToRemove = document.querySelector(`.trend-item-entry[data-index="${index}"]`);
        if (itemToRemove) {
            itemToRemove.remove();
            document.querySelectorAll('#trend-data-list .trend-item-entry').forEach((item, newIndex) => {
                item.setAttribute('data-index', newIndex);
            });
        }
    }
    
    window.removeTrendItem = removeTrendItem; 

    function getFormData(formId) {
        const form = document.getElementById(formId);
        const data = {};
        form.querySelectorAll('.modal-input').forEach(input => {
            data[input.id || input.name] = input.type === 'number' ? parseFloat(input.value) : input.value;
        });
        return data;
    }
    
    function populateDailyForm(data) {
        if (!data || !data.daily_values) return;
        
        const dv = data.daily_values;
        const sb = data.shift_breakdown || {};
        const bt = data.breakdown_time || {};

        document.getElementById('lv_production_value').value = dv.lv_production_value || 0;
        document.getElementById('productivity_value').value = dv.productivity_value || 0;
        document.getElementById('schedule_average').value = dv.schedule_average || 0;
        
        document.getElementById('auto_crimp_shift_a').value = (sb.auto_crimp || {}).shift_a || 0;
        document.getElementById('auto_crimp_shift_b').value = (sb.auto_crimp || {}).shift_b || 0;
        document.getElementById('auto_crimp_shift_c').value = (sb.auto_crimp || {}).shift_c || 0;
        document.getElementById('semi_crimp_shift_a').value = (sb.semi_crimp || {}).shift_a || 0;
        document.getElementById('semi_crimp_shift_b').value = (sb.semi_crimp || {}).shift_b || 0;
        document.getElementById('semi_crimp_shift_c').value = (sb.semi_crimp || {}).shift_c || 0;
        document.getElementById('soldering_shift_a').value = (sb.soldering || {}).shift_a || 0;
        document.getElementById('soldering_shift_b').value = (sb.soldering || {}).shift_b || 0;
        document.getElementById('soldering_shift_c').value = (sb.soldering || {}).shift_c || 0;

        document.getElementById('msf_plant_2').value = bt.msf_plant_2 || 0;
        document.getElementById('msf_plant_7').value = bt.msf_plant_7 || 0;
        document.getElementById('assembly_plant_2').value = bt.assembly_plant_2 || 0;
        document.getElementById('assembly_plant_7').value = bt.assembly_plant_7 || 0;
        
        document.getElementById('m_total_msf_p2').value = bt.m_total_msf_p2 || 0;
        document.getElementById('m_total_msf_p7').value = bt.m_total_msf_p7 || 0;
        document.getElementById('m_total_assembly_p2').value = bt.m_total_assembly_p2 || 0;
        document.getElementById('m_total_assembly_p7').value = bt.m_total_assembly_p7 || 0;
    }

    async function processDailyFileData(dataRows) {
        if (dataRows.length === 0) {
            throw new Error("The Excel file is empty or missing data.");
        }
        
        const dataRow = dataRows[0]; 
        const getVal = (key) => dataRow[key] || dataRow[key.replace(/\s/g, '_')] || dataRow[key.replace(/_/g, ' ')] || 0;

        const payload = { 
            date: currentDateKey,
            daily: {
                daily_values: {
                    lv_production_value: getVal('LV Production Value'),
                    productivity_value: getVal('Productivity Value'),
                    schedule_average: getVal('Schedule Average')
                },
                // Use existing monthly totals as fallback if not in the daily update file
                monthly_totals: { 
                    auto_crimp_output: getVal('Auto Crimp Output') || todayData.monthly_totals?.auto_crimp_output || 0, 
                    semi_crimp_output: getVal('Semi Crimp Output') || todayData.monthly_totals?.semi_crimp_output || 0, 
                    soldering_output: getVal('Soldering Output') || todayData.monthly_totals?.soldering_output || 0
                },
                shift_breakdown: {
                    auto_crimp: { shift_a: getVal('Auto Crimp A'), shift_b: getVal('Auto Crimp B'), shift_c: getVal('Auto Crimp C') },
                    semi_crimp: { shift_a: getVal('Semi Crimp A'), shift_b: getVal('Semi Crimp B'), shift_c: getVal('Semi Crimp C') },
                    soldering: { shift_a: getVal('Soldering A'), shift_b: getVal('Soldering B'), shift_c: getVal('Soldering C') }
                },
                cuts_averages: { 
                    auto_crimp_average: getVal('Auto Crimp Avg'), 
                    semi_crimp_average: getVal('Semi Crimp Avg'), 
                    soldering_average: getVal('Soldering Avg')
                },
                breakdown_time: {
                    msf_plant_2: getVal('MSF P2 Daily'),
                    msf_plant_7: getVal('MSF P7 Daily'),
                    assembly_plant_2: getVal('Assembly P2 Daily'),
                    assembly_plant_7: getVal('Assembly P7 Daily'),
                    m_total_msf_p2: getVal('M Total MSF P2'),
                    m_total_msf_p7: getVal('M Total MSF P7'),
                    m_total_assembly_p2: getVal('M Total Assembly P2'),
                    m_total_assembly_p7: getVal('M Total Assembly P7')
                }
            }
        }; 

        populateDailyForm(payload.daily);

        const result = await makeApiCall(`/data/${currentDateKey}`, 'PUT', payload);
        if (result && result.status === 'success') {
            await fetchDashboardData(currentDateKey);
            document.getElementById('daily-upload-status').textContent = `✅ Uploaded and Saved: ${result.message}`;
            closeModal('daily-update-modal');
        } else {
            throw new Error(result.message || 'API failed to save daily data.');
        }
    }

    async function processTrendFileData(dataRows) {
        const monthKey = getMonthYearKey(currentDateKey); 
        const getVal = (row, key) => row[key] || row[key.replace(/\s/g, '_')] || row[key.replace(/_/g, ' ')] || 0;

        const trendData = dataRows.map(row => ({
            customer_name: getVal(row, 'Customer Name'),
            overall_output: getVal(row, 'Overall Output'),
            percentage_input: getVal(row, 'Percentage Input'),
        }));
        
        const listContainer = document.getElementById('trend-data-list');
        listContainer.innerHTML = '<div class="section-title">Customer Breakdown List</div>';
        trendData.forEach((item, index) => {
            listContainer.appendChild(createTrendItem(item, index));
        });

        const result = await makeApiCall(`/trend/bulk_update/${monthKey}`, 'PUT', { trend_data: trendData });
        if (result && result.status === 'success') {
            await fetchDashboardData(currentDateKey); 
            document.getElementById('trend-upload-status').textContent = `✅ Uploaded and Saved: ${result.message}`;
            closeModal('trend-update-modal');
        } else {
            throw new Error(result.message || 'API failed to save trend data.');
        }
    }
    
    // --- CORRECTED: CHART TREND FILE PROCESSOR ---
    async function processChartTrendFileData(dataRows) {
        if (dataRows.length === 0) {
            throw new Error("The Excel file is empty or missing data.");
        }
        
        // Map common header variations to expected keys, including multiple aliases for date
        const standardKeyMap = {
            'date': 'date', // Primary header
            'month': 'date', // Alias 1
            'period': 'date', // Alias 2
            'monthly date': 'date', // Alias 3
            'mth': 'date', // Alias 4
            'lv production value': 'lv_production_value',
            'msf p2 (monthly total)': 'msf_p2',
            'msf p7 (monthly total)': 'msf_p7',
            'assembly p2 (monthly total)': 'assembly_p2',
            'assembly p7 (monthly total)': 'assembly_p7',
            'auto crimp avg': 'auto_crimp_avg',
            'semi crimp avg': 'semi_crimp_avg',
            'soldering avg': 'soldering_avg',
            'productivity value': 'productivity_value',
            'schedule average': 'schedule_average'
        };
        
        const chartTrendData = dataRows.map(row => {
            const newPoint = {};
            Object.keys(row).forEach(key => {
                // Normalize key by lowercasing, replacing underscores with spaces, and trimming
                const lowerKey = key.toLowerCase().replace(/_/g, ' ').trim(); 
                const standardizedKey = standardKeyMap[lowerKey];
                
                if (standardizedKey) {
                    let value = row[key];
                    
                    if (standardizedKey !== 'date') {
                        // Ensure numeric values are parsed correctly
                        value = parseFloat(value) || 0; 
                    }
                    newPoint[standardizedKey] = value;
                }
            });
            
            // --- Date Conversion Logic ---
            if (newPoint.date) {
                const dateValue = newPoint.date;
                
                if (typeof dateValue === 'number') {
                    // Excel numeric date to JavaScript date string ('YYYY-MM-DD')
                    // This formula handles the 1900 Excel date system (1/1/1900 is day 1).
                    const excelEpoch = new Date(Date.UTC(0, 0, dateValue - 1));
                    newPoint.date = excelEpoch.toISOString().split('T')[0];
                } else {
                    // Standard date string to 'YYYY-MM-DD'
                    // Use a more lenient date parsing, then format it.
                    const parsedDate = new Date(dateValue);
                    if (!isNaN(parsedDate.getTime())) {
                         newPoint.date = formatDate(parsedDate);
                    } else {
                         newPoint.date = null; // Mark invalid date
                    }
                }
            } else {
                newPoint.date = null; // No date key found in the row
            }
            
            // Return the structured object for the chart trend
            return {
                date: newPoint.date,
                lv_production_value: newPoint.lv_production_value || 0,
                msf_p2: newPoint.msf_p2 || 0,
                msf_p7: newPoint.msf_p7 || 0,
                assembly_p2: newPoint.assembly_p2 || 0,
                assembly_p7: newPoint.assembly_p7 || 0,
                auto_crimp_avg: newPoint.auto_crimp_avg || 0,
                semi_crimp_avg: newPoint.semi_crimp_avg || 0,
                soldering_avg: newPoint.soldering_avg || 0,
                productivity_value: newPoint.productivity_value || 0,
                schedule_average: newPoint.schedule_average || 0
            };
        }).filter(d => d.date); // Filter out rows without a valid date

        if (chartTrendData.length === 0) {
            throw new Error("No valid chart trend data points found after processing the Excel file. Check the 'Date' column.");
        }
        
        // Call the mock API to save the bulk trend data
        const result = await makeApiCall(`/trend_chart_data/bulk_update`, 'PUT', { trend_data: chartTrendData });
        if (result && result.status === 'success') {
            await fetchDashboardData(currentDateKey);
            document.getElementById('chart-trend-upload-status').textContent = `✅ Uploaded and Saved: ${result.message}`;
            closeModal('chart-trend-update-modal');
        } else {
            throw new Error(result.message || 'API failed to save chart trend data.');
        }
    }


    async function handleFileSelect(event, action) {
        const file = event.target.files[0];
        const statusElement = action === 'daily' ? document.getElementById('daily-upload-status') : document.getElementById('trend-upload-status');
        
        if (!file) {
            statusElement.textContent = 'No file selected.';
            return;
        }

        statusElement.textContent = 'Processing file...';

        try {
            const data = await readExcelFile(file);
            
            if (action === 'daily') {
                await processDailyFileData(data);
            } else if (action === 'trend') {
                await processTrendFileData(data);
            }
            
        } catch (error) {
            statusElement.textContent = `❌ Error: ${error.message}`;
            console.error('File Upload/Process Error:', error);
        }
    }
    
    // --- NEW: Chart Trend File Handler ---
    async function handleChartTrendFileSelect(event) {
        const file = event.target.files[0];
        const statusElement = document.getElementById('chart-trend-upload-status');
        
        if (!file) {
            statusElement.textContent = 'No file selected.';
            return;
        }

        statusElement.textContent = 'Processing file...';

        try {
            const data = await readExcelFile(file);
            await processChartTrendFileData(data);
        } catch (error) {
            statusElement.textContent = `❌ Error: ${error.message}`;
            console.error('Chart Trend File Upload/Process Error:', error);
        }
    }
    // --- END NEW FILE HANDLERS ---

    async function saveDailyUpdate(event) {
        event.preventDefault();
        
        const formData = getFormData('daily-update-form');
        
        const payload = {
            date: currentDateKey,
            daily: {
                daily_values: {
                    lv_production_value: formData.lv_production_value,
                    productivity_value: formData.productivity_value,
                    schedule_average: formData.schedule_average
                },
                // Retain existing monthly totals and cuts averages unless explicitly provided in file logic,
                // but since the form contains only the shift breakdown, we need to merge with existing data.
                // For simplicity, we assume the form contains all the data fields needed for the daily data point.
                monthly_totals: todayData.monthly_totals, 
                shift_breakdown: {
                    auto_crimp: { shift_a: formData.auto_crimp_shift_a, shift_b: formData.auto_crimp_shift_b, shift_c: formData.auto_crimp_shift_c },
                    semi_crimp: { shift_a: formData.semi_crimp_shift_a, shift_b: formData.semi_crimp_shift_b, shift_c: formData.semi_crimp_shift_c },
                    soldering: { shift_a: formData.soldering_shift_a, shift_b: formData.soldering_shift_b, shift_c: formData.soldering_shift_c }
                },
                cuts_averages: todayData.cuts_averages, 
                breakdown_time: {
                    msf_plant_2: formData.msf_plant_2,
                    msf_plant_7: formData.msf_plant_7,
                    assembly_plant_2: formData.assembly_plant_2,
                    assembly_plant_7: formData.assembly_plant_7,
                    m_total_msf_p2: formData.m_total_msf_p2,
                    m_total_msf_p7: formData.m_total_msf_p7,
                    m_total_assembly_p2: formData.m_total_assembly_p2,
                    m_total_assembly_p7: formData.m_total_assembly_p7
                }
            }
        };
        
        try {
            const result = await makeApiCall(`/data/${currentDateKey}`, 'PUT', payload);
            if (result && result.status === 'success') {
                alert(`Daily data saved successfully for ${currentDateKey}!`);
                await fetchDashboardData(currentDateKey);
                closeModal('daily-update-modal');
            } else {
                alert(`Error saving daily data: ${result.message}`);
            }
        } catch (error) {
            console.error('Save Daily Error:', error);
            alert('An unexpected error occurred while saving daily data.');
        }
    }
    
    async function saveTrendUpdate(event) {
        event.preventDefault();

        const listContainer = document.getElementById('trend-data-list');
        const trendData = Array.from(listContainer.querySelectorAll('.trend-item-entry')).map(item => {
            const inputs = item.querySelectorAll('input');
            return {
                customer_name: inputs[0].value,
                overall_output: parseFloat(inputs[1].value) || 0,
                percentage_input: parseFloat(inputs[2].value) || 0
            };
        });

        const monthKey = getMonthYearKey(currentDateKey);

        try {
            const result = await makeApiCall(`/trend/bulk_update/${monthKey}`, 'PUT', { trend_data: trendData });
            if (result && result.status === 'success') {
                alert(`Trend data saved successfully for ${monthKey}!`);
                await fetchDashboardData(currentDateKey);
                closeModal('trend-update-modal');
            } else {
                alert(`Error saving trend data: ${result.message}`);
            }
        } catch (error) {
            console.error('Save Trend Error:', error);
            alert('An unexpected error occurred while saving trend data.');
        }
    }
    
    async function handlePasswordChange(event) {
        event.preventDefault();
        
        const currentInput = document.getElementById('current-password-input').value;
        const newInput = document.getElementById('new-password-input').value;

        if (currentInput !== currentPassword) {
            alert('Error: Current password is incorrect.');
            return;
        }

        if (newInput.length < 5) {
            alert('Error: New password must be at least 5 characters.');
            return;
        }

        currentPassword = newInput;
        localStorage.setItem(PASSWORD_KEY, newInput);
        alert('Password changed successfully!');
        closeModal('password-modal');
    }
    
    // --- NEW: AUTHENTICATION HANDLER ---
    function handleAuthSuccess(actionType) {
        closeModal('password-prompt-modal');
        // Clear the password input and error message
        document.getElementById('auth-password-input').value = '';
        document.getElementById('auth-error-message').style.display = 'none';

        if (actionType === 'daily-update') {
            document.getElementById('daily-update-date-display').textContent = `(${formatDisplayDate(currentDateKey)})`;
            populateDailyForm(todayData);
            openModal('daily-update-modal');
        } else if (actionType === 'trend-update') {
            document.getElementById('trend-update-month-display').textContent = `(${getMonthYearDisplay(currentDateKey)})`;
            
            const listContainer = document.getElementById('trend-data-list');
            listContainer.innerHTML = '<div class="section-title">Customer Breakdown List</div>';
            if (productionTrendData.length === 0) {
                 addTrendItem();
            } else {
                productionTrendData.forEach((item, index) => addTrendItem(item));
            }
            openModal('trend-update-modal');
        } else if (actionType === 'chart-trend-update') { // NEW
            document.getElementById('chartTrendFileInput').value = '';
            document.getElementById('chart-trend-upload-status').textContent = '';
            openModal('chart-trend-update-modal');
        } else if (actionType === 'password-change') {
            document.getElementById('current-password-input').value = '';
            document.getElementById('new-password-input').value = '';
            openModal('password-modal');
        }
    }

    function handleAuthAttempt(event) {
        event.preventDefault();
        const passwordInput = document.getElementById('auth-password-input').value;
        const actionType = document.getElementById('auth-action-type').value;
        const errorMsg = document.getElementById('auth-error-message');

        if (passwordInput === currentPassword) {
            handleAuthSuccess(actionType);
        } else {
            errorMsg.style.display = 'block';
        }
    }

    // --- INITIALIZATION & EVENT HANDLERS ---
    function initializeEventHandlers() {
        // Theme Selector
        document.getElementById('theme-selector').addEventListener('change', (e) => {
            const newTheme = e.target.value;
            document.querySelector('.dashboard-container').setAttribute('data-theme', newTheme);
            localStorage.setItem(THEME_KEY, newTheme);
            initializeGauges(todayData.daily_values?.productivity_value || 0, todayData.daily_values?.schedule_average || 0);
        });

        // Date Selector
        document.getElementById('date-selector').addEventListener('change', (e) => {
            fetchDashboardData(e.target.value);
        });

        // --- PASSWORD PROTECTED BUTTONS ---
        document.querySelectorAll('.password-protected-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                document.getElementById('auth-action-type').value = action;
                document.getElementById('auth-password-input').value = ''; // Clear password on opening
                document.getElementById('auth-error-message').style.display = 'none'; // Clear error on opening
                openModal('password-prompt-modal');
            });
        });
        
        // Auth Form Submission (Handles password checking)
        document.getElementById('auth-form').addEventListener('submit', handleAuthAttempt);

        // Close Modals (generic close buttons)
        document.querySelectorAll('.close-modal-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const modalId = e.target.getAttribute('data-modal');
                if (modalId) {
                    closeModal(modalId);
                }
            });
        });

        // File Input Triggers & Listeners
        document.getElementById('upload-daily-btn').addEventListener('click', () => {
             document.getElementById('dailyFileInput').click();
        });
        document.getElementById('upload-trend-btn').addEventListener('click', () => {
             document.getElementById('trendFileInput').click();
        });
        document.getElementById('upload-chart-trend-btn').addEventListener('click', () => { // NEW
             document.getElementById('chartTrendFileInput').click();
        });
        
        document.getElementById('dailyFileInput').addEventListener('change', (e) => handleFileSelect(e, 'daily'));
        document.getElementById('trendFileInput').addEventListener('change', (e) => handleFileSelect(e, 'trend'));
        document.getElementById('chartTrendFileInput').addEventListener('change', (e) => handleChartTrendFileSelect(e)); // NEW
        
        // Form Submit Listeners
        document.getElementById('daily-update-form').addEventListener('submit', saveDailyUpdate);
        document.getElementById('trend-update-form').addEventListener('submit', saveTrendUpdate);
        document.getElementById('change-password-form').addEventListener('submit', handlePasswordChange);
        
        // Add Trend Item Button
        document.getElementById('add-trend-item-btn').addEventListener('click', () => addTrendItem());
        
        // Trend Item Remove Delegation
        document.getElementById('trend-data-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-trend-btn')) {
                const index = e.target.closest('.trend-item-entry').getAttribute('data-index');
                window.removeTrendItem(index);
            }
        });

        // Close Chart Modal
        document.getElementById('close-chart-btn').addEventListener('click', () => closeModal('chart-modal'));

        // --- CHART SHORTCUT LISTENERS --- 
        document.querySelectorAll('.shortcut-item').forEach(item => {
            item.addEventListener('click', () => {
                const chartKey = item.getAttribute('data-chart');
                if (chartKey === 'password-change') {
                     // Password Change is now protected by the generic password prompt
                     document.getElementById('auth-action-type').value = 'password-change';
                     document.getElementById('auth-password-input').value = '';
                     document.getElementById('auth-error-message').style.display = 'none';
                     openModal('password-prompt-modal');
                } else if (chartKey) {
                    handleChartClick(chartKey);
                }
            });
        });

        // Initial dashboard state
        const today = formatDate(new Date());
        document.getElementById('date-selector').value = today;
        fetchDashboardData(today); 
    }

    // --- INITIALIZATION ---
    function initialize() {
        initializeTheme();
        Chart.register(ChartDataLabels);
        Chart.defaults.font.family = 'sans-serif';
        Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();
        initializeEventHandlers(); 
    }

    initialize();
});