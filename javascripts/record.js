
const token = localStorage.getItem('accessToken');
let assignedKpis = [];
let currentUser = null;

if (!token) { window.location.href = 'login.html'; }

// --- Element References ---
const kpiDropdownButton = document.getElementById('kpiDropdownButton');
const kpiDropdownMenu = document.getElementById('kpiDropdownMenu');
const kpiDropdownLabel = document.getElementById('kpiDropdownLabel');
const kpiList = document.getElementById('kpiList');
const kpiSelectValue = document.getElementById('kpiSelectValue');
const statusModal = document.getElementById('statusModal');
const closeStatusModalIcon = document.querySelector('.close-status-button');
const recordForm = document.getElementById('recordForm');
const logoutButton = document.getElementById('logoutButton');

// --- Core Functions ---
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

async function fetchAssignedKPIs() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/me/kpis/`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
            assignedKpis = await response.json();
            kpiList.innerHTML = '';
            assignedKpis.forEach(kpi => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = "#";
                a.textContent = kpi.kpi_name;
                a.className = "block px-4 py-2 hover:bg-gray-100";
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    kpiDropdownLabel.textContent = kpi.kpi_name;
                    kpiSelectValue.value = kpi.id;
                    kpiDropdownMenu.classList.add('hidden');
                    displayKpiDetails(kpi);
                });
                li.appendChild(a);
                kpiList.appendChild(li);
            });
        } else {
            kpiDropdownLabel.textContent = '-- โหลดข้อมูลล้มเหลว --';
        }
    } catch (error) {
        kpiDropdownLabel.textContent = '-- เกิดข้อผิดพลาด --';
    }
}

function displayKpiDetails(selectedKpi) {
    const container = document.getElementById('kpiDetailContainer');
    if (!selectedKpi) { container.innerHTML = ''; return; }
    const targetValue = selectedKpi.kpi_target_value ?? '';
    container.innerHTML = `
        <div class="kpi-detail-box">
            <div class="detail-header">
                <h3>${selectedKpi.kpi_name || 'N/A'}</h3>
                <span>เป้าหมาย ${selectedKpi.kpi_decition || ''} ${targetValue}</span>
            </div>
            <div class="detail-body">
                <div class="detail-row"><label>ตัวตั้ง : ${selectedKpi.kpi_dividend || 'N/A'}</label><div class="input-wrapper"><input type="number" step="any" id="dividendValue" class="data-input rounded-lg" placeholder="กรอกค่า"></div></div>
                <div class="detail-row"><label>ตัวหาร : ${selectedKpi.kpi_divisor || 'N/A'}</label><div class="input-wrapper"><input type="number" step="any" id="divisorValue" class="data-input rounded-lg" placeholder="กรอกค่า"></div></div>
                <div class="detail-row result-row"><label>ผลลัพธ์</label><div class="input-wrapper"><input type="text" id="kpiResult" class="result-output rounded-lg" readonly placeholder="0.00"></div></div>
            </div>
        </div>
    `;
    const dividendInput = document.getElementById('dividendValue');
    const divisorInput = document.getElementById('divisorValue');
    const resultOutput = document.getElementById('kpiResult');
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
    function calculateResult() {
        const dividend = parseFloat(dividendInput.value);
        const divisor = parseFloat(divisorInput.value);
        let result = 0.00;
        if (!isNaN(dividend) && !isNaN(divisor) && divisor !== 0) {
            result = dividend / divisor;
            resultOutput.value = result.toFixed(2);
        } else {
            resultOutput.value = "0.00";
        }
        const isSuccess = checkTarget(result, selectedKpi.kpi_decition, selectedKpi.kpi_target_value);
        resultOutput.classList.remove('result-success', 'result-fail');
        if (isSuccess === true) { resultOutput.classList.add('result-success'); }
        else if (isSuccess === false) { resultOutput.classList.add('result-fail'); }
    }
    dividendInput.addEventListener('input', calculateResult);
    divisorInput.addEventListener('input', calculateResult);
}

function showStatusModal(state, title, message) {
    const statusIcon = document.getElementById('statusIcon');
    document.getElementById('statusTitle').textContent = title;
    document.getElementById('statusMessage').textContent = message;
    statusIcon.innerHTML = '';
    if (state === 'loading') {
        statusIcon.innerHTML = '<div class="spinner"></div>';
        closeStatusModalIcon.style.display = 'none';
    } else {
        const iconClass = state === 'success' ? 'fa-solid fa-circle-check success-icon' : 'fa-solid fa-circle-xmark error-icon';
        statusIcon.innerHTML = `<i class="${iconClass}"></i>`;
        closeStatusModalIcon.style.display = 'block';
    }
    statusModal.style.display = 'flex';
}

// --- Event Listeners ---
kpiDropdownButton.addEventListener('click', () => { kpiDropdownMenu.classList.toggle('hidden'); });
window.addEventListener('click', (e) => { if (!kpiDropdownButton.contains(e.target) && !kpiDropdownMenu.contains(e.target)) { kpiDropdownMenu.classList.add('hidden'); } });
logoutButton.addEventListener('click', () => { localStorage.removeItem('accessToken'); window.location.href = 'login.html'; });
closeStatusModalIcon.onclick = () => { statusModal.style.display = 'none'; };

recordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kpiId = document.getElementById('kpiSelectValue').value;
    const recordDate = document.getElementById('recordDate').value;
    const dividendInput = document.getElementById('dividendValue');
    const divisorInput = document.getElementById('divisorValue');

    if (!kpiId || !recordDate) {
        showStatusModal('error', 'ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกตัวชี้วัดและวันที่ให้ครบถ้วน');
        return;
    }

    const payload = {
        kpi_id: parseInt(kpiId),
        kpi_dividend_value: dividendInput ? parseFloat(dividendInput.value) : null,
        kpi_divisor_value: divisorInput ? parseFloat(divisorInput.value) : null,
        kpi_value: parseFloat(document.getElementById('kpiResult')?.value || 0),
        kpi_date: recordDate
    };

    showStatusModal('loading', 'กำลังบันทึกข้อมูล', 'กรุณารอสักครู่...');

    try {
        const response = await fetch(`${API_BASE_URL}/kpi-results/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if (response.status === 201) {
            showStatusModal('success', 'บันทึกข้อมูลสำเร็จ', 'ข้อมูลของคุณถูกบันทึกเรียบร้อยแล้ว');
            document.getElementById('kpiDetailContainer').innerHTML = '';
            recordForm.reset();
            kpiDropdownLabel.textContent = '-- กรุณาเลือกตัวชี้วัด --';
        } else {
            const errorData = await response.json();
            showStatusModal('error', 'เกิดข้อผิดพลาด', errorData.detail || 'ไม่สามารถบันทึกข้อมูลได้');
        }
    } catch (error) {
        showStatusModal('error', 'การเชื่อมต่อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
});

// --- Initial calls ---
document.addEventListener('DOMContentLoaded', () => {
    fetchUserInfo();
    fetchAssignedKPIs();
});
