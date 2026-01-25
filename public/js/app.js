// Common utility functions for App Setup Portal

// Escape HTML to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Format date for display
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
}

// Format datetime for display
function formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
}

// Get color class for environment badge
function getEnvColor(env) {
    const colors = {
        development: 'info',
        qa: 'warning',
        staging: 'secondary',
        production: 'danger'
    };
    return colors[env] || 'secondary';
}

// Get color class for status badge
function getStatusColor(status) {
    const colors = {
        pending: 'warning',
        approved: 'info',
        completed: 'success',
        rejected: 'danger'
    };
    return colors[status] || 'secondary';
}

// Check authentication status
async function checkAuth() {
    try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        return data.authenticated;
    } catch (err) {
        return false;
    }
}

// Logout user
async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
}

// Show notification toast
function showNotification(message, type = 'info') {
    // Create toast container if not exists
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }

    // Create toast
    const toastId = 'toast-' + Date.now();
    const html = `
        <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">${escapeHtml(message)}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);

    // Show toast
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl);
    toast.show();

    // Remove after hidden
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// API request helper with error handling
async function apiRequest(url, options = {}) {
    try {
        const res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (res.status === 401) {
            window.location.href = '/login';
            return null;
        }

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Request failed');
        }

        return res.json();
    } catch (err) {
        console.error('API request failed:', err);
        showNotification(err.message, 'danger');
        return null;
    }
}

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
