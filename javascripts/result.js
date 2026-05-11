
const token = localStorage.getItem('accessToken');
let currentUser = null;

if (!token) { window.location.href = 'login.html'; }

const searchButton = document.getElementById('searchButton');
const logoutButton = document.getElementById('logoutButton');

// ** เพิ่มการอ้างอิงถึง element ใหม่ **
const yearSelect = document.getElementById('yearSelect');

// ** ฟังก์ชันใหม่สำหรับสร้างตัวเลือกปี **
function populateYears() {
    const currentYear = new Date().getFullYear();
    const startYear = 2020; // กำหนดปีเริ่มต้นที่คุณต้องการ
    for (let year = currentYear; year >= startYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
}

async function fetchUserInfo() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/me/`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) { throw new Error('Token invalid'); }
        currentUser = await response.json();
        document.getElementById('userInfo').innerHTML = `<i class="fas fa-user-circle"></i><span>${currentUser.full_name || currentUser.user_name}</span>`;
    } catch (error) {
        localStorage.removeItem('accessToken');
        window.location.href = 'login.html';
    }
}

function checkTarget(result, operator, target) {
    if (target === null || target === '' || operator === null || operator === '') return null;
    switch (operator.trim()) {
        case '<': return result < target;
        case '<=': return result <= target;
        case '>': return result > target;
        case '>=': return result >= target;
        case '=': return result == target;
        default: return null;
    }
}

function renderResults(data) {
    const contentDiv = document.getElementById('resultsContent');
    if (data.length === 0) {
        contentDiv.classList.add('results-placeholder');
        contentDiv.innerHTML = '<p class="text-center text-gray-500">ไม่พบข้อมูลในข่วงเวลาที่เลือก</p>';
        return;
    }
    const groupedResults = data.reduce((acc, result) => {
        if (!acc[result.kpi_id]) {
            acc[result.kpi_id] = {
                kpi_name: result.kpi_name,
                kpi_decition: result.kpi_decition,
                kpi_target_value: result.kpi_target_value,
                results: []
            };
        }
        acc[result.kpi_id].results.push(result);
        return acc;
    }, {});
    let html = '';
    for (const kpiId in groupedResults) {
        const kpiGroup = groupedResults[kpiId];
        const targetValue = kpiGroup.kpi_target_value ?? '';
        html += `
            <div class="kpi-group">
                <div class="kpi-group-header">
                    <h3>${kpiGroup.kpi_name}</h3>
                    <span>เป้าหมาย ${kpiGroup.kpi_decition || ''} ${targetValue}</span>
                </div>
                <div class="kpi-results-grid">
        `;
        kpiGroup.results.forEach(res => {
            const avgValue = parseFloat(res.avg_kpi_value);
            const isSuccess = checkTarget(avgValue, kpiGroup.kpi_decition, kpiGroup.kpi_target_value);
            let cardClass = 'result-card-neutral';
            if (isSuccess === true) cardClass = 'result-card-success';
            if (isSuccess === false) cardClass = 'result-card-fail';
            // ** แก้ไขการแสดงผลวันที่ **
            const date = new Date(res.month);
            const monthName = date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
            html += `
                <div class="result-card ${cardClass}">
                    <div class="result-card-date">${monthName}</div>
                    <div class="result-card-value">${avgValue.toFixed(2)}</div>
                </div>
            `;
        });
        html += `</div></div>`;
    }
    contentDiv.innerHTML = html;
}

// ** แก้ไขฟังก์ชัน searchResults **
async function searchResults() {
    const selectedYear = yearSelect.value;
    const contentDiv = document.getElementById('resultsContent');

    if (!selectedYear) {
        contentDiv.classList.add('results-placeholder');
        contentDiv.innerHTML = '<p class="text-center text-red-500">กรุณาเลือกปีที่ต้องการค้นหา</p>';
        return;
    }

    contentDiv.classList.remove('results-placeholder');
    contentDiv.innerHTML = '<div class="flex justify-center items-center p-10"><div class="spinner"></div></div>';

    try {
        // ** แก้ไข URL API **
        const response = await fetch(`${API_BASE_URL}/kpi-results/by-year/?year=${selectedYear}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            renderResults(data);
        } else {
            const error = await response.json();
            contentDiv.classList.add('results-placeholder');
            contentDiv.innerHTML = `<p class="text-center text-red-500">เกิดข้อผิดพลาด: ${error.detail}</p>`;
        }
    } catch (error) {
        contentDiv.classList.add('results-placeholder');
        contentDiv.innerHTML = '<p class="text-center text-red-500">ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้</p>';
    }
}

searchButton.addEventListener('click', searchResults);
logoutButton.addEventListener('click', () => {
    localStorage.removeItem('accessToken');
    window.location.href = 'login.html';
});

// ** แก้ไขการเรียกใช้ฟังก์ชันเริ่มต้น **
document.addEventListener('DOMContentLoaded', () => {
    fetchUserInfo();
    populateYears(); // เรียกใช้ฟังก์ชันใหม่
});
