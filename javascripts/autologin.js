document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        return;
    }
    try {
        const response = await fetch('http://blossomsara.trueddns.com:33941/users/me/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            if (!window.location.pathname.endsWith('home.html')) {
                window.location.href = './home.html';
            }
        } else {
            localStorage.removeItem('accessToken');
        }
    } catch (error) {
        console.error('Auto-login check failed:', error);
    }
});

