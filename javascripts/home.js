
const token = localStorage.getItem('accessToken');

if (!token) { window.location.href = './login.html'; }

async function fetchUserInfo() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/me/`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) { localStorage.removeItem('accessToken'); window.location.href = './login.html'; return; }
        const userData = await response.json();
        document.getElementById('userInfo').innerHTML = `<i class="fas fa-user-circle"></i><span>${userData.full_name || userData.user_name}</span>`;
    } catch (error) {
        document.getElementById('userInfo').innerHTML = `<i class="fas fa-exclamation-triangle"></i> <span>Error</span>`;
    }
}

document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('accessToken');
    window.location.href = './login.html';
});

document.addEventListener('DOMContentLoaded', fetchUserInfo);
