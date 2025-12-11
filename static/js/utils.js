/**
 * Utility functions for RAG Q&A System UI
 */

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 */
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toastId = `toast-${Date.now()}`;

    const bgClass = {
        success: 'bg-success',
        error: 'bg-danger',
        warning: 'bg-warning',
        info: 'bg-info'
    }[type] || 'bg-info';

    const icon = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    }[type] || 'ℹ';

    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${icon}</strong> ${escapeHtml(message)}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 4000
    });

    toast.show();

    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

/**
 * Show confirmation modal
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {Function} onConfirm - Callback function on confirmation
 * @param {boolean} requiresTyping - Require typing "DELETE" to confirm
 */
function showConfirmModal(title, message, onConfirm, requiresTyping = false) {
    const modalId = 'confirmModal';

    const confirmInput = requiresTyping ? `
        <div class="mt-3">
            <input type="text" class="form-control" id="confirmInput"
                   placeholder="Type DELETE to confirm" autocomplete="off">
        </div>
    ` : '';

    const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="${modalId}Label">${escapeHtml(title)}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>${escapeHtml(message)}</p>
                        ${confirmInput}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" id="confirmButton" ${requiresTyping ? 'disabled' : ''}>
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalElement = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalElement);
    const confirmButton = document.getElementById('confirmButton');

    if (requiresTyping) {
        const confirmInput = document.getElementById('confirmInput');
        confirmInput.addEventListener('input', (e) => {
            confirmButton.disabled = e.target.value !== 'DELETE';
        });
    }

    confirmButton.addEventListener('click', () => {
        modal.hide();
        onConfirm();
    });

    modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
    });

    modal.show();
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format file size to human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format timestamp to human-readable format
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Format relative time (e.g., "2 minutes ago")
 * @param {string|Date} timestamp - Timestamp
 * @returns {string} Relative time string
 */
function formatRelativeTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Get color class for RAGAS score
 * @param {number} score - Score value (0-1)
 * @returns {string} Bootstrap color class
 */
function getScoreColor(score) {
    if (score === null || score === undefined) return 'secondary';
    if (score > 0.8) return 'success';
    if (score > 0.6) return 'warning';
    return 'danger';
}

/**
 * Validate question input
 * @param {string} question - Question text
 * @returns {{valid: boolean, error: string}} Validation result
 */
function validateQuestion(question) {
    if (!question || question.trim().length === 0) {
        return { valid: false, error: 'Question cannot be empty' };
    }

    if (question.length > 1000) {
        return { valid: false, error: 'Question must be 1000 characters or less' };
    }

    return { valid: true, error: null };
}

/**
 * Validate file for upload
 * @param {File} file - File to validate
 * @returns {{valid: boolean, error: string}} Validation result
 */
function validateFile(file) {
    const allowedExtensions = ['.pdf', '.txt', '.csv'];
    const fileName = file.name.toLowerCase();

    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
        return {
            valid: false,
            error: `Invalid file type. Please upload ${allowedExtensions.join(', ')} files only.`
        };
    }

    return { valid: true, error: null };
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
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

/**
 * Set button loading state
 * @param {HTMLElement} button - Button element
 * @param {boolean} loading - Loading state
 * @param {string} loadingText - Text to show when loading
 */
function setButtonLoading(button, loading, loadingText = 'Processing...') {
    if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ${loadingText}
        `;
        button.classList.add('btn-loading');
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || button.innerHTML;
        button.classList.remove('btn-loading');
        delete button.dataset.originalText;
    }
}

/**
 * Show/hide loading overlay on an element
 * @param {HTMLElement} element - Element to show overlay on
 * @param {boolean} show - Show or hide
 */
function toggleLoadingOverlay(element, show) {
    if (show) {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        element.style.position = 'relative';
        element.appendChild(overlay);
    } else {
        const overlay = element.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard', 'success');
    } catch (err) {
        console.error('Failed to copy:', err);
        showToast('Failed to copy to clipboard', 'error');
    }
}

/**
 * Format processing time
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time
 */
function formatProcessingTime(ms) {
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Initialize Bootstrap tooltips
 */
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Scroll to element smoothly
 * @param {HTMLElement} element - Element to scroll to
 */
function scrollToElement(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
