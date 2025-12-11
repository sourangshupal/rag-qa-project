/**
 * UI Component Templates for RAG Q&A System
 */

const Components = {
    /**
     * Create source accordion HTML
     * @param {Array} sources - Array of source documents
     * @returns {string} Accordion HTML
     */
    sourceAccordion(sources) {
        if (!sources || sources.length === 0) {
            return '<div class="empty-state"><p class="text-muted">No sources available</p></div>';
        }

        const accordionItems = sources.map((source, index) => {
            const sourceTitle = source.metadata?.source || source.metadata?.filename || 'Unknown Source';
            const page = source.metadata?.page ? ` (Page ${source.metadata.page})` : '';
            const metadata = Object.entries(source.metadata || {})
                .filter(([key]) => key !== 'source' && key !== 'filename')
                .map(([key, value]) => `<span class="badge bg-secondary me-1">${key}: ${value}</span>`)
                .join('');

            return `
                <div class="accordion-item">
                    <h2 class="accordion-header" id="heading${index}">
                        <button class="accordion-button ${index !== 0 ? 'collapsed' : ''}"
                                type="button"
                                data-bs-toggle="collapse"
                                data-bs-target="#collapse${index}"
                                aria-expanded="${index === 0 ? 'true' : 'false'}"
                                aria-controls="collapse${index}">
                            <i class="bi bi-file-text me-2"></i>
                            ${escapeHtml(sourceTitle)}${page}
                        </button>
                    </h2>
                    <div id="collapse${index}"
                         class="accordion-collapse collapse ${index === 0 ? 'show' : ''}"
                         aria-labelledby="heading${index}"
                         data-bs-parent="#sourcesAccordion">
                        <div class="accordion-body">
                            <pre class="source-content">${escapeHtml(source.content)}</pre>
                            ${metadata ? `<div class="source-metadata">${metadata}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="accordion" id="sourcesAccordion">
                ${accordionItems}
            </div>
        `;
    },

    /**
     * Create evaluation display HTML
     * @param {Object} evaluation - Evaluation scores
     * @returns {string} Evaluation HTML
     */
    evaluationDisplay(evaluation) {
        if (!evaluation) return '';

        if (evaluation.error) {
            return `
                <div class="evaluation-section">
                    <div class="alert alert-warning" role="alert">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <strong>Evaluation failed:</strong> ${escapeHtml(evaluation.error)}
                    </div>
                </div>
            `;
        }

        const faithfulnessScore = evaluation.faithfulness;
        const relevancyScore = evaluation.answer_relevancy;
        const evalTime = evaluation.evaluation_time_ms;

        const faithfulnessBadge = faithfulnessScore !== null && faithfulnessScore !== undefined
            ? this.metricBadge('Faithfulness', faithfulnessScore, 'Measures how factually consistent the answer is with the source documents')
            : '';

        const relevancyBadge = relevancyScore !== null && relevancyScore !== undefined
            ? this.metricBadge('Answer Relevancy', relevancyScore, 'Measures how relevant the answer is to the question')
            : '';

        return `
            <div class="evaluation-section">
                <div class="evaluation-card">
                    <div class="card-title">
                        <i class="bi bi-bar-chart me-2"></i>
                        Evaluation Metrics
                    </div>
                    <div class="row mt-3">
                        <div class="col-md-6 mb-2">
                            ${faithfulnessBadge}
                        </div>
                        <div class="col-md-6 mb-2">
                            ${relevancyBadge}
                        </div>
                    </div>
                    ${evalTime ? `<div class="text-muted small mt-2">Evaluation time: ${formatProcessingTime(evalTime)}</div>` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Create metric badge HTML
     * @param {string} label - Metric label
     * @param {number} score - Metric score (0-1)
     * @param {string} tooltip - Tooltip text
     * @returns {string} Badge HTML
     */
    metricBadge(label, score, tooltip) {
        if (score === null || score === undefined) return '';

        const color = getScoreColor(score);
        const scoreDisplay = score.toFixed(3);

        return `
            <div class="metric-badge">
                <span class="badge bg-${color} d-flex align-items-center justify-content-between"
                      style="font-size: 0.9rem; padding: 0.5rem 0.75rem; width: 100%;"
                      data-bs-toggle="tooltip"
                      data-bs-placement="top"
                      title="${escapeHtml(tooltip)}">
                    <span>${escapeHtml(label)}: ${scoreDisplay}</span>
                    <i class="bi bi-info-circle ms-2 metric-info"></i>
                </span>
            </div>
        `;
    },

    /**
     * Create health indicator HTML
     * @param {Object} status - Health status
     * @returns {string} Health indicator HTML
     */
    healthIndicator(status) {
        const isHealthy = status.status === 'ready' || status.status === 'healthy';
        const statusClass = isHealthy ? 'healthy' : 'unhealthy';
        const statusText = isHealthy ? 'Healthy' : 'Unhealthy';

        return `
            <div class="health-indicator">
                <span class="status-dot ${statusClass}"></span>
                <span class="fw-semibold">${statusText}</span>
            </div>
        `;
    },

    /**
     * Create loading spinner HTML
     * @param {string} message - Loading message
     * @returns {string} Spinner HTML
     */
    loadingSpinner(message = 'Loading...') {
        return `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="mt-2 text-muted">${escapeHtml(message)}</div>
            </div>
        `;
    },

    /**
     * Create empty state HTML
     * @param {string} message - Empty state message
     * @param {string} icon - Bootstrap icon class
     * @returns {string} Empty state HTML
     */
    emptyState(message, icon = 'inbox') {
        return `
            <div class="empty-state">
                <i class="bi bi-${icon}"></i>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    },

    /**
     * Create upload result HTML
     * @param {Object} result - Upload result data
     * @returns {string} Result HTML
     */
    uploadResult(result) {
        return `
            <div class="upload-result">
                <div class="result-title">
                    <i class="bi bi-check-circle-fill text-success me-2"></i>
                    Upload Successful
                </div>
                <div class="result-details">
                    <span class="badge bg-primary">Filename: ${escapeHtml(result.filename)}</span>
                    <span class="badge bg-info">Chunks: ${result.chunks_created}</span>
                    <span class="badge bg-secondary">Documents: ${result.document_ids?.length || 0}</span>
                </div>
            </div>
        `;
    },

    /**
     * Create status card HTML
     * @param {string} label - Status label
     * @param {string} value - Status value
     * @param {string} badgeClass - Badge color class
     * @returns {string} Status card HTML
     */
    statusItem(label, value, badgeClass = 'bg-secondary') {
        return `
            <div class="status-item">
                <span class="status-label">${escapeHtml(label)}</span>
                <span class="badge ${badgeClass} status-value">${escapeHtml(value)}</span>
            </div>
        `;
    },

    /**
     * Create collection stat card HTML
     * @param {string} value - Stat value
     * @param {string} label - Stat label
     * @returns {string} Stat card HTML
     */
    collectionStat(value, label) {
        return `
            <div class="collection-stat">
                <div class="stat-value">${escapeHtml(value)}</div>
                <div class="stat-label">${escapeHtml(label)}</div>
            </div>
        `;
    },

    /**
     * Create streaming indicator HTML
     * @returns {string} Streaming indicator HTML
     */
    streamingIndicator() {
        return `<span class="streaming-indicator"></span>`;
    },

    /**
     * Create cursor for streaming text
     * @returns {string} Cursor HTML
     */
    streamingCursor() {
        return `<span class="streaming-cursor"></span>`;
    },

    /**
     * Create answer display HTML
     * @param {Object} queryResult - Query result object
     * @param {boolean} isStreaming - Whether this is a streaming response
     * @returns {string} Answer display HTML
     */
    answerDisplay(queryResult, isStreaming = false) {
        const questionHtml = `
            <div class="question-text">
                <strong>Question:</strong> ${escapeHtml(queryResult.question)}
            </div>
        `;

        const answerHtml = `
            <div class="answer-text">${escapeHtml(queryResult.answer)}</div>
        `;

        const processingTimeHtml = queryResult.processing_time_ms
            ? `<div class="processing-time">
                <span class="badge bg-info">
                    <i class="bi bi-clock me-1"></i>
                    Processing time: ${formatProcessingTime(queryResult.processing_time_ms)}
                </span>
            </div>`
            : '';

        return `
            <div class="answer-card">
                ${questionHtml}
                ${answerHtml}
                ${processingTimeHtml}
            </div>
        `;
    },

    /**
     * Create error alert HTML
     * @param {string} error - Error message
     * @returns {string} Error alert HTML
     */
    errorAlert(error) {
        return `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>Error:</strong> ${escapeHtml(error)}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    },

    /**
     * Create success alert HTML
     * @param {string} message - Success message
     * @returns {string} Success alert HTML
     */
    successAlert(message) {
        return `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="bi bi-check-circle me-2"></i>
                ${escapeHtml(message)}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
};

// Export for use in other scripts
window.Components = Components;
