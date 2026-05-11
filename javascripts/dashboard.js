
const token = localStorage.getItem('accessToken');
let currentUser = null;
const kpiChartInstances = {}; // Object to hold all Chart.js instances, keyed by KPI ID

// Check Token and Redirect if none
if (!token) {
    window.location.href = 'login.html';
}

// Element References
const logoutButton = document.getElementById('logoutButton');
const kpiCardsContainer = document.getElementById('kpiCardsContainer');
const endYearSelect = document.getElementById('endYearSelect'); // Changed ID to reflect its purpose
const filterButton = document.getElementById('filterButton');

/**
 * @function populateYears
 * @description Populates the year selection dropdown dynamically.
 */
function populateYears() {
    const currentYear = new Date().getFullYear();
    const startYearForDropdown = 2019; // Starting year for the dropdown options
    for (let year = currentYear; year >= startYearForDropdown; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        endYearSelect.appendChild(option);
    }
    // Select current year by default
    endYearSelect.value = currentYear;
}

/**
 * @function fetchUserInfo
 * @description Fetches current user information from the API to display in the header.
 */
async function fetchUserInfo() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/me/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            throw new Error('Token invalid');
        }
        currentUser = await response.json();
        document.getElementById('userInfo').innerHTML = `<i class="fas fa-user-circle"></i><span>${currentUser.full_name || currentUser.user_name}</span>`;
    } catch (error) {
        // If token is invalid or an error occurs, log out
        localStorage.removeItem('accessToken');
        window.location.href = 'login.html';
    }
}

/**
 * @function fetchAndRenderKPIs
 * @description Fetches all assigned KPIs and their multi-year monthly performance data, then renders them.
 * @param {number} selectedEndYear - The end year for fetching KPI performance data.
 */
async function fetchAndRenderKPIs(selectedEndYear) {
    kpiCardsContainer.innerHTML = '<p class="text-center text-gray-500 col-span-full"><div class="spinner mx-auto"></div> กำลังโหลดข้อมูล KPI...</p>';

    try {
        // Fetch all KPIs assigned to the current user
        const kpiResponse = await fetch(`${API_BASE_URL}/users/me/kpis/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!kpiResponse.ok) {
            throw new Error('Failed to fetch assigned KPIs');
        }
        const assignedKpis = await kpiResponse.json();

        if (assignedKpis.length === 0) {
            kpiCardsContainer.innerHTML = '<p class="text-center text-gray-500 col-span-full">ไม่พบตัวชี้วัดที่ถูกมอบหมาย</p>';
            return;
        }

        kpiCardsContainer.innerHTML = ''; // Clear loading message

        // Define the start year for the multi-year trend (e.g., 5 years back from selectedEndYear)
        const trendStartYear = selectedEndYear - 4; // Display 5 years of data
        const currentYear = new Date().getFullYear(); // Actual current year for up-to-date range if needed

        const resultsResponse = await fetch(`${API_BASE_URL}/kpi-results/multi-year-monthly-summary/?start_year=${trendStartYear}&end_year=${selectedEndYear}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!resultsResponse.ok) {
            // It's acceptable if there's no data (e.g., for a new employee), so check for 404 specifically
            if (resultsResponse.status === 404) {
                console.log(`No KPI results found for the period ${trendStartYear}-${selectedEndYear}.`);
                // Continue to render cards, but with empty data for charts
            } else {
                throw new Error('Failed to fetch multi-year KPI results');
            }
        }
        const kpiResults = resultsResponse.status === 404 ? [] : await resultsResponse.json();

        // Process and render each assigned KPI
        assignedKpis.forEach(kpi => {
            const kpiId = kpi.id;
            // Filter results for the current KPI
            const filteredResults = kpiResults.filter(result => result.kpi_id === kpiId);
            renderKpiCard(kpi, filteredResults, trendStartYear, selectedEndYear);
        });

    } catch (error) {
        console.error('Error fetching KPI data:', error);
        kpiCardsContainer.innerHTML = `<p class="text-center text-red-500 col-span-full">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}</p>`;
    }
}

/**
 * @function renderKpiCard
 * @description Renders a single KPI card with its summary and a chart.
 * @param {Object} kpi - The KPI object.
 * @param {Array<Object>} monthlyResults - Monthly performance data for this KPI across multiple years.
 * @param {number} chartStartYear - The start year for the chart's x-axis.
 * @param {number} chartEndYear - The end year for the chart's x-axis.
 */
function renderKpiCard(kpi, monthlyResults, chartStartYear, chartEndYear) {
    const kpiId = kpi.id;
    const targetValue = kpi.kpi_target_value ?? 'N/A';
    const decision = kpi.kpi_decition || '';

    // Aggregate data for summary metrics (e.g., for the entire displayed period)
    let totalKpiValue = 0;
    let successfulEntries = 0;
    let totalEntriesWithData = 0;

    monthlyResults.forEach(item => {
        totalKpiValue += item.avg_kpi_value;
        totalEntriesWithData++;
        if (decision && targetValue !== 'N/A') {
            const isSuccess = checkTarget(item.avg_kpi_value, decision, targetValue);
            if (isSuccess === true) {
                successfulEntries++;
            }
        }
    });

    const averageKpiValue = totalEntriesWithData > 0 ? (totalKpiValue / totalEntriesWithData).toFixed(2) : 'N/A';
    const successRate = totalEntriesWithData > 0 ? ((successfulEntries / totalEntriesWithData) * 100).toFixed(2) : 'N/A';

    const cardHtml = `
        <div class="kpi-card bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 class="text-xl font-bold text-gray-900 mb-3">${kpi.kpi_name || 'ชื่อ KPI ไม่ระบุ'}</h3>
            <div class="summary-details mb-4 grid grid-cols-2 gap-2 text-sm">
                <p><strong>เป้าหมาย:</strong> ${decision} ${targetValue}</p>
                <p><strong>ความถี่:</strong> ${kpi.kpi_frequency || 'N/A'}</p>
                <p><strong>ตัวตั้ง:</strong> ${kpi.kpi_dividend || 'N/A'}</p>
                <p><strong>ตัวหาร:</strong> ${kpi.kpi_divisor || 'N/A'}</p>
            </div>
            <div class="kpi-card-metrics grid grid-cols-3 gap-2 text-center mb-4">
                <div class="p-2 bg-blue-50 rounded-md">
                    <p class="text-sm font-semibold text-blue-700">ค่าเฉลี่ย</p>
                    <p class="text-lg font-bold text-blue-900">${averageKpiValue}</p>
                </div>
                <div class="p-2 bg-green-50 rounded-md">
                    <p class="text-sm font-semibold text-green-700">ความสำเร็จ</p>
                    <p class="text-lg font-bold text-green-900">${successRate}%</p>
                </div>
                <div class="p-2 bg-purple-50 rounded-md">
                    <p class="text-sm font-semibold text-purple-700">บันทึก</p>
                    <p class="text-lg font-bold text-purple-900">${totalEntriesWithData}</p>
                </div>
            </div>
            <div class="chart-area mt-4">
                <canvas id="kpiChart-${kpiId}" class="w-full h-48"></canvas>
            </div>
        </div>
    `;

    kpiCardsContainer.insertAdjacentHTML('beforeend', cardHtml);

    // Render the chart for this specific KPI
    renderKpiChart(kpiId, kpi.kpi_name, decision, targetValue, monthlyResults, chartStartYear, chartEndYear);
}


/**
 * @function renderKpiChart
 * @description Renders a Chart.js line chart for a single KPI, aggregating data by year and quarter.
 * @param {number} kpiId - The ID of the KPI.
 * @param {string} kpiName - The name of the KPI.
 * @param {string} decision - The comparison operator for the target.
 * @param {number|string} targetValue - The target value for the KPI.
 * @param {Array<Object>} monthlyResults - Monthly performance data for this KPI across multiple years.
 * @param {number} chartStartYear - The start year for the chart's x-axis.
 * @param {number} chartEndYear - The end year for the chart's x-axis.
 */
function renderKpiChart(kpiId, kpiName, decision, targetValue, monthlyResults, chartStartYear, chartEndYear) {
    const canvas = document.getElementById(`kpiChart-${kpiId}`);
    if (!canvas) {
        console.warn(`Canvas for KPI ID ${kpiId} not found.`);
        return;
    }

    const ctx = canvas.getContext('2d');
    const targetNumValue = targetValue !== 'N/A' ? parseFloat(targetValue) : null;

    // Group monthly results by year and quarter
    const aggregatedData = {}; // { '2021': { 'Q1': [], 'Q2': [] ... }, '2022': { ... } }

    for (let year = chartStartYear; year <= chartEndYear; year++) {
        aggregatedData[year] = {};
        for (let q = 1; q <= 4; q++) {
            aggregatedData[year][`Q${q}`] = [];
        }
    }

    monthlyResults.forEach(item => {
        const date = new Date(item.month);
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // 1-12
        const quarter = Math.ceil(month / 3);
        const quarterKey = `Q${quarter}`;

        if (aggregatedData[year] && aggregatedData[year][quarterKey]) {
            aggregatedData[year][quarterKey].push(parseFloat(item.avg_kpi_value));
        }
    });

    const labels = [];
    const chartDataValues = [];
    const targetLineData = [];

    // Populate labels and data for the chart (Yearly and Quarterly)
    for (let year = chartStartYear; year <= chartEndYear; year++) {
        // Add yearly average if desired, or just quarters
        // For simplicity and matching the image, we'll aim for yearly average and then quarterly.
        // If there's full year data, we can sum and average.
        // For now, let's just push quarters if data exists.

        // First, add a yearly average if we want it for past years, before breaking into quarters for current year
        const yearDataPoints = [];
        for (let q = 1; q <= 4; q++) {
            if (aggregatedData[year][`Q${q}`] && aggregatedData[year][`Q${q}`].length > 0) {
                yearDataPoints.push(...aggregatedData[year][`Q${q}`]);
            }
        }

        if (yearDataPoints.length > 0 && year < chartEndYear) { // For full past years, show yearly average
            labels.push(`ปี${year % 100}`); // e.g., ปี64
            chartDataValues.push((yearDataPoints.reduce((sum, val) => sum + val, 0) / yearDataPoints.length).toFixed(2));
            targetLineData.push(targetNumValue);
        } else if (year === chartEndYear) { // For the latest year, break into quarters
            for (let q = 1; q <= 4; q++) {
                const quarterValues = aggregatedData[year][`Q${q}`];
                if (quarterValues && quarterValues.length > 0) {
                    labels.push(`ปี${year % 100} ไตรมาส ${q}`);
                    chartDataValues.push((quarterValues.reduce((sum, val) => sum + val, 0) / quarterValues.length).toFixed(2));
                    targetLineData.push(targetNumValue);
                } else if (year === new Date().getFullYear() && q > Math.ceil((new Date().getMonth() + 1) / 3)) {
                    // Don't add future quarters for the current year if no data
                    continue;
                } else {
                    // For quarters with no data, show null
                    labels.push(`ปี${year % 100} ไตรมาส ${q}`);
                    chartDataValues.push(null);
                    targetLineData.push(targetNumValue);
                }
            }
        }
    }


    // Destroy existing chart instance if it exists
    if (kpiChartInstances[kpiId]) {
        kpiChartInstances[kpiId].destroy();
    }

    kpiChartInstances[kpiId] = new Chart(ctx, {
        type: 'line', // Use line chart for trend
        data: {
            labels: labels,
            datasets: [
                {
                    label: `${kpiName}`,
                    data: chartDataValues,
                    borderColor: 'rgb(0, 0, 255)', // Blue color for KPI values
                    backgroundColor: 'rgba(0, 0, 255, 0.2)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 5,
                    pointBackgroundColor: 'rgb(0, 0, 255)',
                    spanGaps: true // Connect points over null values
                },
                {
                    label: 'เป้าหมาย',
                    data: targetLineData,
                    borderColor: 'rgb(255, 0, 0)', // Red color for target
                    backgroundColor: 'rgba(255, 0, 0, 0.2)',
                    borderDash: [5, 5], // Dotted line for target
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0, // No points for target line
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `ผลการปฏิบัติงาน KPI ${chartStartYear}-${chartEndYear}` // Dynamic title
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true, // Use point style for legend items
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            if (context.raw === null) return `ไม่มีข้อมูล`;
                            return `${context.dataset.label}: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'ค่า KPI'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'ช่วงเวลา'
                    }
                }
            }
        }
    });
}


/**
 * @function checkTarget
 * @description Helper function to check if KPI value meets the target.
 * @param {number} result - The calculated KPI value.
 * @param {string} operator - The comparison operator (e.g., '<', '>=', '=').
 * @param {number} target - The target value.
 * @returns {boolean|null} true if target is met, false if not, null if data is incomplete.
 */
function checkTarget(result, operator, target) {
    if (target === null || target === '' || operator === null || operator === '') return null;
    const numResult = parseFloat(result);
    const numTarget = parseFloat(target);

    switch (operator.trim()) {
        case '<': return numResult < numTarget;
        case '<=': return numResult <= numTarget;
        case '>': return numResult > numTarget;
        case '>=': return numResult >= numTarget;
        case '=': return numResult == numTarget; // Note: using == for number comparison
        default: return null;
    }
}

// --- Event Listeners ---
logoutButton.addEventListener('click', () => {
    localStorage.removeItem('accessToken');
    window.location.href = 'login.html';
});

filterButton.addEventListener('click', () => {
    const selectedEndYear = parseInt(endYearSelect.value);
    if (!isNaN(selectedEndYear)) {
        fetchAndRenderKPIs(selectedEndYear);
    } else {
        kpiCardsContainer.innerHTML = '<p class="text-center text-red-500 col-span-full">กรุณาเลือกปีที่ถูกต้อง</p>';
    }
});

// Initial calls when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    fetchUserInfo();
    populateYears();
    // Fetch and render for the initially selected year (current year)
    const initialEndYear = parseInt(endYearSelect.value);
    if (!isNaN(initialEndYear)) {
        fetchAndRenderKPIs(initialEndYear);
    }
});
