// Ensure API_BASE_URL is defined in config.js and loaded before this file.

// --- Element References ---
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const registerModal = document.getElementById('registerModal');
const openModalBtn = document.getElementById('openRegisterModal');
const statusModal = document.getElementById('statusModal');
const closeStatusModalIcon = document.querySelector('.close-status-button');

// Login Form Elements
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const usernameError = document.getElementById('usernameError');
const passwordError = document.getElementById('passwordError');
const loginMessage = document.getElementById('loginMessage');

// Register Form Elements
const regFullNameInput = document.getElementById('regFullName');
const regUsernameInput = document.getElementById('regUsername');
const regPasswordInput = document.getElementById('regPassword');
const regDepartIdSelect = document.getElementById('regDepartId');
const regFullNameError = document.getElementById('regFullNameError');
const regUsernameError = document.getElementById('regUsernameError');
const regPasswordError = document.getElementById('regPasswordError');
const registerMessage = document.getElementById('registerMessage');

// Password Requirements Elements
const reqLength = document.getElementById('reqLength');
const reqUppercase = document.getElementById('reqUppercase');
const reqLowercase = document.getElementById('reqLowercase');
const reqNumber = document.getElementById('reqNumber');
const reqSpecial = document.getElementById('reqSpecial');


// --- Validation Functions ---

/**
 * @function clearErrors
 * @description Clears all error messages on the page.
 */
function clearErrors() {
    usernameError.textContent = '';
    passwordError.textContent = '';
    loginMessage.innerHTML = '';
    regFullNameError.textContent = '';
    regUsernameError.textContent = '';
    regPasswordError.textContent = '';
    registerMessage.innerHTML = '';
}

/**
 * @function updateRequirementStatus
 * @description Updates the visual status of a password requirement, including icon and color.
 * @param {HTMLElement} element - The list item element to update.
 * @param {boolean} isMet - True if the requirement is met, false otherwise.
 */
function updateRequirementStatus(element, isMet) {
    const icon = element.querySelector('i');
    // Remove all existing status classes first
    icon.classList.remove('fa-times-circle', 'fa-check-circle');
    // Remove existing color classes
    icon.classList.remove('text-red-500', 'text-green-500');

    // Set icon and color directly via style to ensure override
    if (isMet) {
        icon.classList.add('fa-check-circle'); // Checkmark icon
        icon.style.color = '#22C55E'; // Tailwind green-500 hex color
    } else {
        icon.classList.add('fa-times-circle'); // Times-circle icon
        icon.style.color = '#EF4444'; // Tailwind red-500 hex color
    }
}

/**
 * @function updatePasswordRequirements
 * @description Updates the visual display of password requirements based on the input password.
 * @param {string} password - The current password string.
 */
function updatePasswordRequirements(password) {
    // Length
    updateRequirementStatus(reqLength, password.length >= 8);
    // Uppercase
    updateRequirementStatus(reqUppercase, /[A-Z]/.test(password));
    // Lowercase
    updateRequirementStatus(reqLowercase, /[a-z]/.test(password));
    // Number
    updateRequirementStatus(reqNumber, /\d/.test(password));
    // Special Character
    updateRequirementStatus(reqSpecial, /[!@#$%^&*(),.?":{}|<>]/.test(password));
}


/**
 * @function validatePasswordComplexity
 * @description Validates if a password meets complexity requirements.
 * @param {string} password - The password string to validate.
 * @returns {string|null} An error message if validation fails, otherwise null.
 */
function validatePasswordComplexity(password) {
    if (password.length < 8) {
        return "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร";
    }
    if (!/[A-Z]/.test(password)) {
        return "รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว";
    }
    if (!/[a-z]/.test(password)) {
        return "รหัสผ่านต้องมีตัวอักษรพิมพ์เล็กอย่างน้อย 1 ตัว";
    }
    if (!/\d/.test(password)) {
        return "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return "รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว (!@#$%^&*(),.?)";
    }
    return null; // Password is valid
}

/**
 * @function validateLoginForm
 * @description Performs client-side validation for the login form.
 * @returns {boolean} True if the form is valid, false otherwise.
 */
function validateLoginForm() {
    clearErrors();
    let isValid = true;

    // Validate Username
    if (usernameInput.value.length < 3) {
        usernameError.textContent = "ชื่อผู้ใช้งานต้องมีความยาวอย่างน้อย 3 ตัวอักษร";
        isValid = false;
    }

    // Validate Password
    const passwordErrorMsg = validatePasswordComplexity(passwordInput.value);
    if (passwordErrorMsg) {
        passwordError.textContent = passwordErrorMsg;
        isValid = false;
    }

    return isValid;
}

/**
 * @function validateRegisterForm
 * @description Performs client-side validation for the registration form.
 * @returns {boolean} True if the form is valid, false otherwise.
 */
function validateRegisterForm() {
    clearErrors();
    let isValid = true;

    // Validate Full Name
    if (!regFullNameInput.value.trim()) {
        regFullNameError.textContent = "ชื่อ-นามสกุล ไม่สามารถเว้นว่างได้";
        isValid = false;
    }

    // Validate Username
    if (regUsernameInput.value.length < 3) {
        regUsernameError.textContent = "ชื่อผู้ใช้งานต้องมีความยาวอย่างน้อย 3 ตัวอักษร";
        isValid = false;
    }

    // Validate Password
    const passwordErrorMsg = validatePasswordComplexity(regPasswordInput.value);
    if (passwordErrorMsg) {
        regPasswordError.textContent = passwordErrorMsg;
        isValid = false;
    }

    // Validate Department ID (assuming it's required and has a default empty option)
    if (!regDepartIdSelect.value) {
        // You might want a specific error message for department if needed
        // For now, it's handled by the 'required' attribute and general form validation
    }

    return isValid;
}


// --- Function to Load Departments ---
async function loadDepartments() {
    const departSelect = document.getElementById('regDepartId');
    if (departSelect.options.length > 1) return; // Prevent re-loading if already loaded
    try {
        const response = await fetch(`${API_BASE_URL}/departments/`);
        const departments = await response.json();
        if (response.ok) {
            departSelect.innerHTML = '<option value="" disabled selected>-- เลือกแผนก --</option>';
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = dept.depart_name;
                departSelect.appendChild(option);
            });
        } else {
            departSelect.innerHTML = '<option value="" disabled>-- ไม่สามารถโหลดแผนกได้ --</option>';
        }
    } catch (error) {
        departSelect.innerHTML = '<option value="" disabled>-- เกิดข้อผิดพลาด --</option>';
    }
}

// --- Modal Logic ---
openModalBtn.onclick = () => {
    clearErrors(); // Clear errors when opening modal
    loadDepartments();
    registerModal.style.display = 'block';
    updatePasswordRequirements(''); // Reset password requirements display when opening
};
document.querySelector('.close-button').onclick = () => {
    registerModal.style.display = 'none';
    clearErrors(); // Clear errors when closing modal
    registerForm.reset(); // Reset form fields
    updatePasswordRequirements(''); // Reset password requirements display when closing
};
// Removed window.onclick to prevent closing when clicking outside the modal
closeStatusModalIcon.onclick = () => { statusModal.style.display = 'none'; };

// --- Function to show Status Modal ---
function showStatusModal(state, title, message) {
    const statusIcon = document.getElementById('statusIcon');
    document.getElementById('statusTitle').textContent = title;
    document.getElementById('statusMessage').textContent = message;

    statusIcon.innerHTML = ''; // Clear previous icon
    if (state === 'loading') {
        statusIcon.innerHTML = '<div class="spinner"></div>';
        closeStatusModalIcon.style.display = 'none'; // Hide X during loading
    } else {
        const iconClass = state === 'success' ? 'fa-solid fa-circle-check success-icon' : 'fa-solid fa-circle-xmark error-icon';
        statusIcon.innerHTML = `<i class="${iconClass}"></i>`;
        closeStatusModalIcon.style.display = 'block'; // Show X for result
    }
    statusModal.style.display = 'flex';
}

// --- Login Handler ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(); // Clear previous errors

    if (!validateLoginForm()) {
        return; // Stop submission if client-side validation fails
    }

    const formData = new FormData();
    formData.append('username', usernameInput.value);
    formData.append('password', passwordInput.value);
    formData.append('remember_me', document.getElementById('rememberMeCheckbox').checked);

    showStatusModal('loading', 'กำลังเข้าสู่ระบบ', 'กรุณารอสักครู่...'); // Show loading status

    try {
        const response = await fetch(`${API_BASE_URL}/token`, { method: 'POST', body: formData });
        const data = await response.json();

        statusModal.style.display = 'none'; // Hide loading modal before showing specific message

        if (response.ok) {
            localStorage.setItem('accessToken', data.access_token);
            window.location.href = './home.html';
        } else {
            loginMessage.innerHTML = `<div class="error">${data.detail || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'}</div>`;
        }
    } catch (error) {
        statusModal.style.display = 'none'; // Hide loading modal
        loginMessage.innerHTML = `<div class="error">ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้</div>`;
    }
});

// --- Register Handler ---
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(); // Clear previous errors

    if (!validateRegisterForm()) {
        return; // Stop submission if client-side validation fails
    }

    const userData = {
        user_name: regUsernameInput.value,
        full_name: regFullNameInput.value,
        position: document.getElementById('regPosition').value, // Position is optional, no validation needed here
        depart_id: parseInt(regDepartIdSelect.value),
        password: regPasswordInput.value
    };

    registerModal.style.display = 'none';
    registerForm.reset();
    showStatusModal('loading', 'กำลังดำเนินการ', 'กรุณารอสักครู่...');

    try {
        const response = await fetch(`${API_BASE_URL}/register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        const data = await response.json();

        if (response.status === 201) {
            showStatusModal('success', 'สมัครสมาชิกสำเร็จ', 'คุณสามารถเข้าสู่ระบบได้แล้ว');
        } else {
            showStatusModal('error', 'เกิดข้อผิดพลาด', data.detail || 'ไม่สามารถสมัครสมาชิกได้');
        }
    } catch (error) {
        showStatusModal('error', 'การเชื่อมต่อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
});

// --- Event Listener for real-time password validation ---
regPasswordInput.addEventListener('input', (event) => {
    updatePasswordRequirements(event.target.value);
});

// Initialize password requirements display when modal opens
// (This is also handled in openModalBtn.onclick and window.onclick now)
// document.addEventListener('DOMContentLoaded', () => {
//     updatePasswordRequirements('');
// });
