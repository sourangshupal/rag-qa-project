/**
 * Main Application Logic for RAG Q&A System
 */

// Global API client instance
let apiClient;

// Health check interval
let healthCheckInterval;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize API client
    apiClient = new APIClient();

    // Initialize all components
    initializeDocumentUpload();
    initializeQueryForm();
    initializeStatusTab();
    initializeCollectionInfo();
    initializeHealthCheck();

    // Initialize Bootstrap tooltips
    initializeTooltips();

    // Set up tab event listeners
    setupTabListeners();

    console.log('RAG Q&A System initialized');
});

/**
 * Initialize document upload functionality
 */
function initializeDocumentUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const deleteBtn = document.getElementById('deleteCollectionBtn');

    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });

    // Drag and drop events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    // Delete collection button
    deleteBtn.addEventListener('click', handleDeleteCollection);
}

/**
 * Handle file upload
 */
async function handleFileUpload(file) {
    const uploadResult = document.getElementById('uploadResult');
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadProgressBar = document.getElementById('uploadProgressBar');

    // Clear previous results
    uploadResult.innerHTML = '';

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
        uploadResult.innerHTML = Components.errorAlert(validation.error);
        return;
    }

    // Show progress bar
    uploadProgress.style.display = 'block';
    uploadProgressBar.style.width = '0%';
    uploadProgressBar.textContent = '0%';

    try {
        // Upload file
        const { data, error } = await apiClient.uploadDocument(file, (progress) => {
            const percent = Math.round(progress);
            uploadProgressBar.style.width = `${percent}%`;
            uploadProgressBar.textContent = `${percent}%`;
        });

        // Hide progress bar
        uploadProgress.style.display = 'none';

        if (error) {
            uploadResult.innerHTML = Components.errorAlert(error);
            showToast(error, 'error');
        } else {
            uploadResult.innerHTML = Components.uploadResult(data);
            showToast(`Successfully uploaded ${data.filename}`, 'success');

            // Refresh collection info
            refreshCollectionInfo();
        }

    } catch (err) {
        uploadProgress.style.display = 'none';
        uploadResult.innerHTML = Components.errorAlert('Upload failed: ' + err.message);
        showToast('Upload failed', 'error');
    }
}

/**
 * Handle delete collection
 */
function handleDeleteCollection() {
    showConfirmModal(
        'Delete Collection',
        'This will permanently delete all documents from the collection. This action cannot be undone. Type DELETE to confirm.',
        async () => {
            const btn = document.getElementById('deleteCollectionBtn');
            setButtonLoading(btn, true, 'Deleting...');

            const { data, error } = await apiClient.deleteCollection();

            setButtonLoading(btn, false);

            if (error) {
                showToast(error, 'error');
            } else {
                showToast('Collection deleted successfully', 'success');

                // Clear upload result
                document.getElementById('uploadResult').innerHTML = '';

                // Refresh collection info
                refreshCollectionInfo();
            }
        },
        true // Require typing DELETE
    );
}

/**
 * Initialize query form
 */
function initializeQueryForm() {
    const form = document.getElementById('queryForm');
    const questionInput = document.getElementById('questionInput');
    const charCounter = document.getElementById('charCounter');
    const useStreamingCheck = document.getElementById('useStreamingCheck');
    const includeSourcesCheck = document.getElementById('includeSourcesCheck');

    // Character counter
    questionInput.addEventListener('input', () => {
        const length = questionInput.value.length;
        charCounter.textContent = `${length} / 1000`;

        if (length > 900) {
            charCounter.classList.add('warning');
        } else {
            charCounter.classList.remove('warning');
        }

        if (length > 950) {
            charCounter.classList.add('danger');
            charCounter.classList.remove('warning');
        } else {
            charCounter.classList.remove('danger');
        }
    });

    // Disable sources when streaming is enabled
    useStreamingCheck.addEventListener('change', () => {
        if (useStreamingCheck.checked) {
            includeSourcesCheck.checked = false;
            includeSourcesCheck.disabled = true;
        } else {
            includeSourcesCheck.disabled = false;
        }
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleQuerySubmit();
    });
}

/**
 * Handle query submission
 */
async function handleQuerySubmit() {
    const questionInput = document.getElementById('questionInput');
    const question = questionInput.value.trim();
    const resultsArea = document.getElementById('resultsArea');
    const submitBtn = document.getElementById('submitQueryBtn');

    const includeSources = document.getElementById('includeSourcesCheck').checked;
    const enableEvaluation = document.getElementById('enableEvaluationCheck').checked;
    const useStreaming = document.getElementById('useStreamingCheck').checked;

    // Validate question
    const validation = validateQuestion(question);
    if (!validation.valid) {
        showToast(validation.error, 'error');
        return;
    }

    // Clear previous results
    resultsArea.innerHTML = '';

    // Set button loading state
    setButtonLoading(submitBtn, true, 'Processing...');

    try {
        if (useStreaming) {
            await handleStreamingQuery(question);
        } else {
            await handleStandardQuery(question, includeSources, enableEvaluation);
        }
    } catch (err) {
        resultsArea.innerHTML = Components.errorAlert(err.message);
        showToast('Query failed', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

/**
 * Handle standard query
 */
async function handleStandardQuery(question, includeSources, enableEvaluation) {
    const resultsArea = document.getElementById('resultsArea');
    const startTime = Date.now();

    // Show loading
    resultsArea.innerHTML = Components.loadingSpinner('Processing your question...');

    // Make query
    const { data, error } = await apiClient.query(question, includeSources, enableEvaluation);

    if (error) {
        resultsArea.innerHTML = Components.errorAlert(error);
        showToast(error, 'error');
        return;
    }

    // Display answer
    let html = Components.answerDisplay(data);

    // Display sources
    if (includeSources && data.sources && data.sources.length > 0) {
        html += `
            <div class="sources-section">
                <div class="section-title">
                    <i class="bi bi-file-text me-2"></i>
                    Sources (${data.sources.length})
                </div>
                ${Components.sourceAccordion(data.sources)}
            </div>
        `;
    }

    // Display evaluation
    if (enableEvaluation && data.evaluation) {
        html += Components.evaluationDisplay(data.evaluation);
    }

    resultsArea.innerHTML = html;

    // Re-initialize tooltips for new elements
    initializeTooltips();

    // Scroll to results
    scrollToElement(resultsArea);

    showToast('Answer generated successfully', 'success');
}

/**
 * Handle streaming query
 */
async function handleStreamingQuery(question) {
    const resultsArea = document.getElementById('resultsArea');

    // Create answer card with streaming cursor
    resultsArea.innerHTML = `
        <div class="answer-card">
            <div class="question-text">
                <strong>Question:</strong> ${escapeHtml(question)}
            </div>
            <div class="answer-text" id="streamingAnswer">${Components.streamingCursor()}</div>
            <div class="mt-2">
                <span class="badge bg-info">
                    <i class="bi bi-broadcast me-1"></i>
                    Streaming${Components.streamingIndicator()}
                </span>
            </div>
        </div>
    `;

    const answerDiv = document.getElementById('streamingAnswer');
    let fullAnswer = '';

    // Stream the response
    const { data, error } = await apiClient.queryStream(question, (chunk) => {
        fullAnswer += chunk;
        // Update answer text (keep cursor at end)
        answerDiv.innerHTML = escapeHtml(fullAnswer) + Components.streamingCursor();
        // Auto-scroll
        answerDiv.scrollTop = answerDiv.scrollHeight;
    });

    if (error) {
        resultsArea.innerHTML = Components.errorAlert(error);
        showToast(error, 'error');
        return;
    }

    // Final update - remove cursor and streaming indicator
    answerDiv.innerHTML = escapeHtml(fullAnswer);
    resultsArea.querySelector('.badge').remove();

    showToast('Answer generated successfully', 'success');
}

/**
 * Initialize status tab
 */
function initializeStatusTab() {
    const refreshBtn = document.getElementById('refreshStatusBtn');
    refreshBtn.addEventListener('click', () => {
        refreshStatusInfo();
    });
}

/**
 * Refresh status information
 */
async function refreshStatusInfo() {
    const healthContent = document.getElementById('healthStatusContent');
    const readinessContent = document.getElementById('readinessStatusContent');
    const lastUpdated = document.getElementById('lastUpdated');
    const refreshBtn = document.getElementById('refreshStatusBtn');

    // Set button loading
    setButtonLoading(refreshBtn, true, 'Refreshing...');

    // Show loading
    healthContent.innerHTML = Components.loadingSpinner();
    readinessContent.innerHTML = Components.loadingSpinner();

    // Fetch health status
    const { data: healthData, error: healthError } = await apiClient.healthCheck();

    if (healthError) {
        healthContent.innerHTML = Components.errorAlert(healthError);
    } else {
        healthContent.innerHTML = `
            ${Components.statusItem('Status', healthData.status, 'bg-success')}
            ${Components.statusItem('Version', healthData.version, 'bg-info')}
            ${Components.statusItem('Timestamp', formatTimestamp(healthData.timestamp), 'bg-secondary')}
        `;
    }

    // Fetch readiness status
    const { data: readinessData, error: readinessError } = await apiClient.readinessCheck();

    if (readinessError) {
        readinessContent.innerHTML = Components.errorAlert(readinessError);
    } else {
        const qdrantStatus = readinessData.qdrant_connected ? 'Connected' : 'Disconnected';
        const qdrantBadge = readinessData.qdrant_connected ? 'bg-success' : 'bg-danger';

        readinessContent.innerHTML = `
            ${Components.statusItem('Status', readinessData.status, 'bg-success')}
            ${Components.statusItem('Qdrant Connection', qdrantStatus, qdrantBadge)}
            ${readinessData.collection_info ? Components.statusItem('Collection', readinessData.collection_info.name, 'bg-info') : ''}
            ${readinessData.collection_info ? Components.statusItem('Points Count', readinessData.collection_info.points_count.toString(), 'bg-primary') : ''}
        `;
    }

    // Update last updated time
    lastUpdated.textContent = new Date().toLocaleTimeString();

    // Reset button
    setButtonLoading(refreshBtn, false);
}

/**
 * Initialize collection info tab
 */
function initializeCollectionInfo() {
    const refreshBtn = document.getElementById('refreshInfoBtn');
    refreshBtn.addEventListener('click', () => {
        refreshCollectionInfo();
    });
}

/**
 * Refresh collection information
 */
async function refreshCollectionInfo() {
    const content = document.getElementById('collectionInfoContent');
    const refreshBtn = document.getElementById('refreshInfoBtn');

    // Set button loading
    if (refreshBtn) {
        setButtonLoading(refreshBtn, true, 'Refreshing...');
    }

    // Show loading
    content.innerHTML = `<div class="col-12">${Components.loadingSpinner()}</div>`;

    // Fetch collection info
    const { data, error } = await apiClient.getCollectionInfo();

    if (error) {
        content.innerHTML = `<div class="col-12">${Components.errorAlert(error)}</div>`;
    } else {
        // Format status to be more readable
        const formattedStatus = data.status.charAt(0).toUpperCase() + data.status.slice(1);

        content.innerHTML = `
            <div class="col-md-4">
                ${Components.collectionStat(data.collection_name, 'Collection Name')}
            </div>
            <div class="col-md-4">
                ${Components.collectionStat(data.total_documents.toString(), 'Total Documents')}
            </div>
            <div class="col-md-4">
                ${Components.collectionStat(formattedStatus, 'Status')}
            </div>
        `;

        // Update navbar badge
        document.getElementById('docCount').textContent = data.total_documents;
    }

    // Reset button
    if (refreshBtn) {
        setButtonLoading(refreshBtn, false);
    }
}

/**
 * Initialize health check polling
 */
function initializeHealthCheck() {
    // Initial check
    updateHealthIndicator();

    // Poll every 30 seconds
    healthCheckInterval = setInterval(() => {
        updateHealthIndicator();
    }, 30000);
}

/**
 * Update health indicator in navbar
 */
async function updateHealthIndicator() {
    const healthStatus = document.getElementById('healthStatus');

    // Set checking state
    healthStatus.innerHTML = `
        <span class="status-dot checking"></span>
        <span class="fw-semibold">Checking...</span>
    `;

    // Fetch readiness status
    const { data, error } = await apiClient.readinessCheck();

    if (error) {
        healthStatus.innerHTML = `
            <span class="status-dot unhealthy"></span>
            <span class="fw-semibold">Unhealthy</span>
        `;
    } else {
        const isHealthy = data.status === 'ready' && data.qdrant_connected;
        const statusClass = isHealthy ? 'healthy' : 'unhealthy';
        const statusText = isHealthy ? 'Healthy' : 'Degraded';

        healthStatus.innerHTML = `
            <span class="status-dot ${statusClass}"></span>
            <span class="fw-semibold">${statusText}</span>
        `;
    }
}

/**
 * Setup tab event listeners
 */
function setupTabListeners() {
    const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');

    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', (e) => {
            const targetId = e.target.getAttribute('data-bs-target');

            // Load data when tabs are activated
            if (targetId === '#status') {
                refreshStatusInfo();
            } else if (targetId === '#info') {
                refreshCollectionInfo();
            }
        });
    });
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
    }
});
