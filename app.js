// Blood Pressure Traffic Light System
// Standalone HTML/JavaScript Application
// With SMART on FHIR EHR Integration

// Global state
let appState = {
    connected: false,
    fhirMode: false,
    demoMode: false,
    smartMode: false,
    smartClient: null,
    fhirBaseUrl: 'https://twcore.hapi.fhir.tw/fhir',
    patientId: null,
    patientName: null,
    bpReadings: [],
    thresholds: {
        red: { systolic: 160, diastolic: 100 },
        yellow: { systolic: 140, diastolic: 90 }
    },
    chart: null
};

// Initialize app on load
document.addEventListener('DOMContentLoaded', function() {
    loadThresholds();
    loadBPReadings();
    setDefaultDateTime();

    // Check if returning from SMART on FHIR OAuth
    checkSmartLaunch();
});

// Check for SMART on FHIR launch context
async function checkSmartLaunch() {
    // Check if FHIR client library is loaded and we have OAuth state
    if (typeof FHIR !== 'undefined' && sessionStorage.getItem('SMART_KEY')) {
        try {
            const client = await FHIR.oauth2.ready();

            // Successfully authenticated via SMART on FHIR
            appState.smartClient = client;
            appState.smartMode = true;
            appState.connected = true;

            // Get patient info
            const patient = await client.patient.read();
            appState.patientId = patient.id;
            appState.patientName = getPatientName(patient);

            // Update UI to show SMART connection
            showSmartConnection(patient);

            // Load BP observations from EHR
            await loadBPFromSMART(client);

            // Show main content
            document.getElementById('connectionCard').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';

            updateDashboard();

        } catch (error) {
            console.log('Not a SMART launch or error:', error.message);
            // Not from SMART launch, continue normal flow
            if (appState.bpReadings.length > 0) {
                updateDashboard();
            }
        }
    } else {
        // Normal page load (not from SMART launch)
        if (appState.bpReadings.length > 0) {
            updateDashboard();
        }
    }
}

// Extract patient name from FHIR Patient resource
function getPatientName(patient) {
    if (patient.name && patient.name.length > 0) {
        const name = patient.name[0];
        if (name.text) return name.text;

        let parts = [];
        if (name.given) parts = parts.concat(name.given);
        if (name.family) parts.push(name.family);
        return parts.join(' ');
    }
    return 'Unknown Patient';
}

// Show SMART connection status
function showSmartConnection(patient) {
    const statusDiv = document.getElementById('fhirStatus');
    statusDiv.className = 'card fhir-connected';
    statusDiv.innerHTML = `
        <strong>SMART on FHIR Connected</strong>
        <p class="mb-0 mt-2">Patient: ${appState.patientName}</p>
        <p class="mb-0">ID: ${patient.id}</p>
        ${patient.birthDate ? `<p class="mb-0">DOB: ${patient.birthDate}</p>` : ''}
    `;
}

// Load BP observations from SMART on FHIR
async function loadBPFromSMART(client) {
    try {
        // Search for blood pressure observations
        // LOINC code 85354-9 = Blood pressure panel
        const response = await client.request(
            `/Observation?patient=${client.patient.id}&code=85354-9&_sort=-date&_count=100`,
            { flat: true }
        );

        if (response && response.length > 0) {
            const smartReadings = response.map(obs => {
                // Extract systolic and diastolic from components
                let systolic = null;
                let diastolic = null;

                if (obs.component) {
                    obs.component.forEach(comp => {
                        const code = comp.code?.coding?.[0]?.code;
                        if (code === '8480-6') { // Systolic
                            systolic = comp.valueQuantity?.value;
                        } else if (code === '8462-4') { // Diastolic
                            diastolic = comp.valueQuantity?.value;
                        }
                    });
                }

                return {
                    systolic,
                    diastolic,
                    dateTime: obs.effectiveDateTime || obs.effectivePeriod?.start,
                    source: 'smart-ehr'
                };
            }).filter(r => r.systolic && r.diastolic);

            // Merge with existing readings (SMART readings take priority)
            const existingNonSmart = appState.bpReadings.filter(r => r.source !== 'smart-ehr');
            appState.bpReadings = [...smartReadings, ...existingNonSmart];

            // Sort by date (newest first)
            appState.bpReadings.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

            saveBPReadings();
            console.log(`Loaded ${smartReadings.length} BP readings from EHR`);
        }
    } catch (error) {
        console.warn('Could not load BP observations from SMART:', error);
    }
}

// Save BP to SMART on FHIR server
async function saveBPToSMART(reading) {
    if (!appState.smartClient) return false;

    const observation = {
        resourceType: 'Observation',
        status: 'final',
        category: [{
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs'
            }]
        }],
        code: {
            coding: [{
                system: 'http://loinc.org',
                code: '85354-9',
                display: 'Blood pressure panel with all children optional'
            }],
            text: 'Blood Pressure'
        },
        subject: {
            reference: `Patient/${appState.smartClient.patient.id}`
        },
        effectiveDateTime: reading.dateTime,
        component: [
            {
                code: {
                    coding: [{
                        system: 'http://loinc.org',
                        code: '8480-6',
                        display: 'Systolic blood pressure'
                    }]
                },
                valueQuantity: {
                    value: reading.systolic,
                    unit: 'mmHg',
                    system: 'http://unitsofmeasure.org',
                    code: 'mm[Hg]'
                }
            },
            {
                code: {
                    coding: [{
                        system: 'http://loinc.org',
                        code: '8462-4',
                        display: 'Diastolic blood pressure'
                    }]
                },
                valueQuantity: {
                    value: reading.diastolic,
                    unit: 'mmHg',
                    system: 'http://unitsofmeasure.org',
                    code: 'mm[Hg]'
                }
            }
        ]
    };

    try {
        await appState.smartClient.create(observation);
        return true;
    } catch (error) {
        console.error('Failed to save to SMART server:', error);
        return false;
    }
}

// Set default datetime to now
function setDefaultDateTime() {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    document.getElementById('measurementTime').value = localDateTime;
}

// Connect to FHIR server
async function connectToFHIR() {
    const statusDiv = document.getElementById('fhirStatus');
    const connectionCard = document.getElementById('connectionCard');
    const mainContent = document.getElementById('mainContent');

    statusDiv.innerHTML = '<strong>⏳ 連接中...</strong><p class="mb-0 mt-2">正在連接到 FHIR 伺服器</p>';

    try {
        // Test connection to Taiwan HAPI FHIR server
        const response = await fetch(`${appState.fhirBaseUrl}/metadata`, {
            method: 'GET',
            headers: {
                'Accept': 'application/fhir+json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Connection successful
        appState.connected = true;
        appState.fhirMode = true;

        statusDiv.className = 'card fhir-connected';
        statusDiv.innerHTML = `
            <strong>✅ 已連接到 FHIR 伺服器</strong>
            <p class="mb-0 mt-2">Taiwan HAPI FHIR Server - ${data.fhirVersion || 'R4'}</p>
        `;

        connectionCard.style.display = 'none';
        mainContent.style.display = 'block';

        // Try to load some demo patient data
        await loadDemoPatientData();

    } catch (error) {
        console.error('FHIR connection error:', error);
        statusDiv.className = 'card fhir-disconnected';
        statusDiv.innerHTML = `
            <strong>❌ 連接失敗</strong>
            <p class="mb-0 mt-2">錯誤: ${error.message}</p>
            <p class="mb-0 mt-2">將使用本地模式，資料僅儲存在瀏覽器中</p>
        `;

        // Fall back to demo mode
        setTimeout(() => useDemoMode(), 2000);
    }
}

// Load demo patient data from FHIR
async function loadDemoPatientData() {
    try {
        // Search for patients
        const response = await fetch(`${appState.fhirBaseUrl}/Patient?_count=1`, {
            headers: { 'Accept': 'application/fhir+json' }
        });

        if (response.ok) {
            const bundle = await response.json();
            if (bundle.entry && bundle.entry.length > 0) {
                const patient = bundle.entry[0].resource;
                appState.patientId = patient.id;
                console.log('Loaded demo patient:', appState.patientId);

                // Try to load existing BP observations
                await loadBPFromFHIR();
            }
        }
    } catch (error) {
        console.warn('Could not load demo patient data:', error);
    }
}

// Load blood pressure observations from FHIR
async function loadBPFromFHIR() {
    if (!appState.patientId) return;

    try {
        const response = await fetch(
            `${appState.fhirBaseUrl}/Observation?patient=${appState.patientId}&code=85354-9&_sort=-date&_count=50`,
            { headers: { 'Accept': 'application/fhir+json' } }
        );

        if (response.ok) {
            const bundle = await response.json();
            if (bundle.entry) {
                const fhirReadings = bundle.entry.map(entry => {
                    const obs = entry.resource;
                    const systolic = obs.component?.find(c => c.code.coding[0].code === '8480-6')?.valueQuantity?.value;
                    const diastolic = obs.component?.find(c => c.code.coding[0].code === '8462-4')?.valueQuantity?.value;

                    return {
                        systolic,
                        diastolic,
                        dateTime: obs.effectiveDateTime,
                        source: 'fhir'
                    };
                }).filter(r => r.systolic && r.diastolic);

                // Merge with local readings
                appState.bpReadings = [...fhirReadings, ...appState.bpReadings.filter(r => r.source !== 'fhir')];
                saveBPReadings();
                updateDashboard();
            }
        }
    } catch (error) {
        console.warn('Could not load FHIR observations:', error);
    }
}

// Use demo mode
function useDemoMode() {
    const statusDiv = document.getElementById('fhirStatus');
    const connectionCard = document.getElementById('connectionCard');
    const mainContent = document.getElementById('mainContent');

    appState.connected = true;
    appState.demoMode = true;

    statusDiv.className = 'card fhir-connected';
    statusDiv.innerHTML = `
        <strong>ℹ️ Demo 模式</strong>
        <p class="mb-0 mt-2">資料僅儲存在本地瀏覽器中</p>
    `;

    connectionCard.style.display = 'none';
    mainContent.style.display = 'block';

    // Generate some demo data if empty
    if (appState.bpReadings.length === 0) {
        generateDemoData();
    }

    updateDashboard();
}

// Generate demo blood pressure data
function generateDemoData() {
    const now = new Date();
    const demoReadings = [];

    // Generate 30 days of sample data
    for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // Random BP values with realistic variation
        const systolic = 120 + Math.floor(Math.random() * 40) - 10;
        const diastolic = 70 + Math.floor(Math.random() * 30) - 5;

        demoReadings.push({
            systolic,
            diastolic,
            dateTime: date.toISOString(),
            source: 'demo'
        });
    }

    appState.bpReadings = demoReadings;
    saveBPReadings();
}

// Classify blood pressure
function classifyBP(systolic, diastolic) {
    const { red, yellow } = appState.thresholds;

    if (systolic >= red.systolic || diastolic >= red.diastolic) {
        return {
            level: 'red',
            label: '紅燈',
            icon: '🔴',
            desc: '血壓過高！建議立即就醫',
            class: 'light-red'
        };
    } else if (systolic >= yellow.systolic || diastolic >= yellow.diastolic) {
        return {
            level: 'yellow',
            label: '黃燈',
            icon: '🟡',
            desc: '血壓偏高，請注意監測',
            class: 'light-yellow'
        };
    } else {
        return {
            level: 'green',
            label: '綠燈',
            icon: '🟢',
            desc: '血壓正常，請維持',
            class: 'light-green'
        };
    }
}

// Submit blood pressure reading
async function submitBP() {
    const systolic = parseInt(document.getElementById('systolicInput').value);
    const diastolic = parseInt(document.getElementById('diastolicInput').value);
    const dateTime = document.getElementById('measurementTime').value;
    const resultDiv = document.getElementById('submitResult');

    // Validation
    if (!systolic || !diastolic) {
        resultDiv.innerHTML = '<div class="alert alert-warning">請輸入收縮壓和舒張壓</div>';
        return;
    }

    if (systolic < 60 || systolic > 250) {
        resultDiv.innerHTML = '<div class="alert alert-warning">收縮壓應介於 60-250 mmHg</div>';
        return;
    }

    if (diastolic < 40 || diastolic > 150) {
        resultDiv.innerHTML = '<div class="alert alert-warning">舒張壓應介於 40-150 mmHg</div>';
        return;
    }

    if (!dateTime) {
        resultDiv.innerHTML = '<div class="alert alert-warning">請選擇測量時間</div>';
        return;
    }

    const reading = {
        systolic,
        diastolic,
        dateTime: new Date(dateTime).toISOString(),
        source: appState.smartMode ? 'smart-ehr' : (appState.fhirMode ? 'fhir' : 'local')
    };

    // If SMART mode, try to save to EHR server
    if (appState.smartMode && appState.smartClient) {
        const saved = await saveBPToSMART(reading);
        if (saved) {
            resultDiv.innerHTML = '<div class="alert alert-success">✅ 已儲存至 EHR 系統</div>';
        } else {
            resultDiv.innerHTML = '<div class="alert alert-warning">⚠️ EHR 儲存失敗，已儲存至本地</div>';
        }
    }
    // If FHIR mode, try to save to server
    else if (appState.fhirMode && appState.patientId) {
        const saved = await saveBPToFHIR(reading);
        if (saved) {
            resultDiv.innerHTML = '<div class="alert alert-success">✅ 已儲存至 FHIR 伺服器</div>';
        } else {
            resultDiv.innerHTML = '<div class="alert alert-warning">⚠️ FHIR 儲存失敗，已儲存至本地</div>';
        }
    } else {
        resultDiv.innerHTML = '<div class="alert alert-success">✅ 已儲存至本地</div>';
    }

    // Save locally
    appState.bpReadings.unshift(reading);
    saveBPReadings();

    // Update dashboard
    updateDashboard();

    // Clear form
    document.getElementById('systolicInput').value = '';
    document.getElementById('diastolicInput').value = '';
    setDefaultDateTime();

    // Clear result after 3 seconds
    setTimeout(() => {
        resultDiv.innerHTML = '';
    }, 3000);

    // Switch to dashboard tab
    const dashboardTab = document.querySelector('[data-bs-target="#dashboard-tab"]');
    const tab = new bootstrap.Tab(dashboardTab);
    tab.show();
}

// Save BP reading to FHIR server
async function saveBPToFHIR(reading) {
    if (!appState.patientId) return false;

    const observation = {
        resourceType: 'Observation',
        status: 'final',
        category: [{
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs'
            }]
        }],
        code: {
            coding: [{
                system: 'http://loinc.org',
                code: '85354-9',
                display: 'Blood pressure panel'
            }]
        },
        subject: {
            reference: `Patient/${appState.patientId}`
        },
        effectiveDateTime: reading.dateTime,
        component: [
            {
                code: {
                    coding: [{
                        system: 'http://loinc.org',
                        code: '8480-6',
                        display: 'Systolic blood pressure'
                    }]
                },
                valueQuantity: {
                    value: reading.systolic,
                    unit: 'mmHg',
                    system: 'http://unitsofmeasure.org',
                    code: 'mm[Hg]'
                }
            },
            {
                code: {
                    coding: [{
                        system: 'http://loinc.org',
                        code: '8462-4',
                        display: 'Diastolic blood pressure'
                    }]
                },
                valueQuantity: {
                    value: reading.diastolic,
                    unit: 'mmHg',
                    system: 'http://unitsofmeasure.org',
                    code: 'mm[Hg]'
                }
            }
        ]
    };

    try {
        const response = await fetch(`${appState.fhirBaseUrl}/Observation`, {
            method: 'POST',
            headers: {
                'Accept': 'application/fhir+json',
                'Content-Type': 'application/fhir+json'
            },
            body: JSON.stringify(observation)
        });

        return response.ok;
    } catch (error) {
        console.error('Failed to save to FHIR:', error);
        return false;
    }
}

// Update dashboard with latest data
function updateDashboard() {
    if (appState.bpReadings.length === 0) {
        return;
    }

    // Update traffic light for latest reading
    const latest = appState.bpReadings[0];
    const classification = classifyBP(latest.systolic, latest.diastolic);

    document.getElementById('trafficLightIcon').textContent = classification.icon;
    document.getElementById('trafficLightLabel').textContent = classification.label;
    document.getElementById('trafficLightLabel').className = `traffic-light-label ${classification.class}`;
    document.getElementById('trafficLightDesc').textContent =
        `${latest.systolic}/${latest.diastolic} mmHg - ${classification.desc}`;

    // Update distribution stats
    updateDistributionStats();

    // Update history table
    updateHistoryTable();

    // Update chart
    updateChart();
}

// Update distribution statistics
function updateDistributionStats() {
    let redCount = 0, yellowCount = 0, greenCount = 0;

    appState.bpReadings.forEach(reading => {
        const classification = classifyBP(reading.systolic, reading.diastolic);
        if (classification.level === 'red') redCount++;
        else if (classification.level === 'yellow') yellowCount++;
        else greenCount++;
    });

    const total = appState.bpReadings.length;

    document.getElementById('redCount').textContent = redCount;
    document.getElementById('redPercent').textContent =
        `${total > 0 ? Math.round(redCount / total * 100) : 0}%`;

    document.getElementById('yellowCount').textContent = yellowCount;
    document.getElementById('yellowPercent').textContent =
        `${total > 0 ? Math.round(yellowCount / total * 100) : 0}%`;

    document.getElementById('greenCount').textContent = greenCount;
    document.getElementById('greenPercent').textContent =
        `${total > 0 ? Math.round(greenCount / total * 100) : 0}%`;
}

// Update history table
function updateHistoryTable() {
    const tbody = document.getElementById('historyTableBody');

    if (appState.bpReadings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">無資料</td></tr>';
        return;
    }

    // Show last 50 readings
    const recentReadings = appState.bpReadings.slice(0, 50);

    tbody.innerHTML = recentReadings.map(reading => {
        const classification = classifyBP(reading.systolic, reading.diastolic);
        const date = new Date(reading.dateTime);
        const formattedDate = date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <tr>
                <td>${formattedDate}</td>
                <td>${reading.systolic}/${reading.diastolic}</td>
                <td>${classification.icon} ${classification.label}</td>
            </tr>
        `;
    }).join('');
}

// Update chart
function updateChart() {
    const ctx = document.getElementById('bpChart').getContext('2d');

    // Prepare data (last 30 readings, reverse chronological)
    const chartData = appState.bpReadings.slice(0, 30).reverse();

    const labels = chartData.map(reading => {
        const date = new Date(reading.dateTime);
        return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
    });

    const systolicData = chartData.map(r => r.systolic);
    const diastolicData = chartData.map(r => r.diastolic);

    // Destroy existing chart
    if (appState.chart) {
        appState.chart.destroy();
    }

    // Create new chart
    appState.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '收縮壓',
                    data: systolicData,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    tension: 0.4
                },
                {
                    label: '舒張壓',
                    data: diastolicData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 40,
                    max: 200,
                    title: {
                        display: true,
                        text: 'mmHg'
                    }
                }
            }
        }
    });
}

// Save thresholds
function saveThresholds() {
    const redSystolic = parseInt(document.getElementById('redSystolic').value);
    const redDiastolic = parseInt(document.getElementById('redDiastolic').value);
    const yellowSystolic = parseInt(document.getElementById('yellowSystolic').value);
    const yellowDiastolic = parseInt(document.getElementById('yellowDiastolic').value);

    if (!redSystolic || !redDiastolic || !yellowSystolic || !yellowDiastolic) {
        alert('請輸入所有閾值');
        return;
    }

    appState.thresholds = {
        red: { systolic: redSystolic, diastolic: redDiastolic },
        yellow: { systolic: yellowSystolic, diastolic: yellowDiastolic }
    };

    localStorage.setItem('bp_thresholds', JSON.stringify(appState.thresholds));

    // Update dashboard with new thresholds
    updateDashboard();

    alert('✅ 閾值已儲存');
}

// Reset thresholds to default
function resetThresholds() {
    appState.thresholds = {
        red: { systolic: 160, diastolic: 100 },
        yellow: { systolic: 140, diastolic: 90 }
    };

    document.getElementById('redSystolic').value = 160;
    document.getElementById('redDiastolic').value = 100;
    document.getElementById('yellowSystolic').value = 140;
    document.getElementById('yellowDiastolic').value = 90;

    localStorage.setItem('bp_thresholds', JSON.stringify(appState.thresholds));

    updateDashboard();

    alert('✅ 已重置為預設值');
}

// Load thresholds from localStorage
function loadThresholds() {
    const saved = localStorage.getItem('bp_thresholds');
    if (saved) {
        appState.thresholds = JSON.parse(saved);

        document.getElementById('redSystolic').value = appState.thresholds.red.systolic;
        document.getElementById('redDiastolic').value = appState.thresholds.red.diastolic;
        document.getElementById('yellowSystolic').value = appState.thresholds.yellow.systolic;
        document.getElementById('yellowDiastolic').value = appState.thresholds.yellow.diastolic;
    }
}

// Save BP readings to localStorage
function saveBPReadings() {
    localStorage.setItem('bp_readings', JSON.stringify(appState.bpReadings));
}

// Load BP readings from localStorage
function loadBPReadings() {
    const saved = localStorage.getItem('bp_readings');
    if (saved) {
        appState.bpReadings = JSON.parse(saved);
    }
}

// Import smartwatch data from JSON file
function importSmartwatch() {
    const fileInput = document.getElementById('jsonFileInput');
    const resultDiv = document.getElementById('importResult');

    if (!fileInput.files || fileInput.files.length === 0) {
        resultDiv.innerHTML = '<div class="alert alert-warning">請先選擇 JSON 檔案</div>';
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            // Validate data structure
            if (!data.bp || !Array.isArray(data.bp)) {
                resultDiv.innerHTML = '<div class="alert alert-danger">❌ 檔案格式錯誤：找不到 bp 陣列</div>';
                return;
            }

            // Convert smartwatch format to app format
            let importedCount = 0;
            const importedReadings = [];

            data.bp.forEach(record => {
                // Validate required fields
                if (record.time && record.sys && record.dia) {
                    // Convert time format "2024-10-16 10:15:00" to ISO format
                    const dateTime = new Date(record.time.replace(' ', 'T')).toISOString();

                    importedReadings.push({
                        systolic: parseInt(record.sys),
                        diastolic: parseInt(record.dia),
                        dateTime: dateTime,
                        source: 'smartwatch'
                    });
                    importedCount++;
                }
            });

            if (importedCount === 0) {
                resultDiv.innerHTML = '<div class="alert alert-warning">⚠️ 沒有找到有效的血壓資料</div>';
                return;
            }

            // Merge with existing readings and remove duplicates
            const existingTimes = new Set(appState.bpReadings.map(r => r.dateTime));
            const newReadings = importedReadings.filter(r => !existingTimes.has(r.dateTime));

            appState.bpReadings = [...newReadings, ...appState.bpReadings];

            // Sort by date (newest first)
            appState.bpReadings.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

            // Save to localStorage
            saveBPReadings();

            // Update dashboard
            updateDashboard();

            // Show success message with statistics
            const totalRecords = data.bp.length;
            const duplicates = importedCount - newReadings.length;

            let message = `<div class="alert alert-success">
                ✅ 成功匯入 ${newReadings.length} 筆血壓記錄
            </div>`;

            if (duplicates > 0) {
                message += `<div class="alert alert-info">
                    ℹ️ 跳過 ${duplicates} 筆重複記錄
                </div>`;
            }

            // Show additional data info if available
            let additionalInfo = '<div class="alert alert-light"><strong>檔案包含的資料：</strong><ul class="mb-0">';
            if (data.bp) additionalInfo += `<li>血壓: ${data.bp.length} 筆</li>`;
            if (data.hb && data.hb.length > 0) additionalInfo += `<li>心率: ${data.hb.length} 筆</li>`;
            if (data.spo2 && data.spo2.length > 0) additionalInfo += `<li>血氧: ${data.spo2.length} 筆</li>`;
            additionalInfo += '</ul></div>';

            resultDiv.innerHTML = message + additionalInfo;

            // Clear file input
            fileInput.value = '';

            // Switch to dashboard tab to show results
            setTimeout(() => {
                const dashboardTab = document.querySelector('[data-bs-target="#dashboard-tab"]');
                const tab = new bootstrap.Tab(dashboardTab);
                tab.show();
            }, 2000);

        } catch (error) {
            console.error('Import error:', error);
            resultDiv.innerHTML = `<div class="alert alert-danger">
                ❌ 檔案解析失敗: ${error.message}
                <br><small>請確認檔案格式正確</small>
            </div>`;
        }
    };

    reader.onerror = function() {
        resultDiv.innerHTML = '<div class="alert alert-danger">❌ 檔案讀取失敗</div>';
    };

    reader.readAsText(file);
}
