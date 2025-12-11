/**
 * API Client for RAG Q&A System
 */

class APIClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
    }

    /**
     * Make API request with error handling
     * @param {string} endpoint - API endpoint
     * @param {object} options - Fetch options
     * @returns {Promise<{data: any, error: any}>} Response data or error
     */
    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    ...options.headers,
                },
                ...options
            });

            // For non-JSON responses, return text
            const contentType = response.headers.get('content-type');
            if (contentType && !contentType.includes('application/json')) {
                const text = await response.text();
                if (!response.ok) {
                    return {
                        data: null,
                        error: text || `HTTP ${response.status}: ${response.statusText}`
                    };
                }
                return { data: text, error: null };
            }

            const data = await response.json();

            if (!response.ok) {
                return {
                    data: null,
                    error: data.error || data.message || data.detail || `HTTP ${response.status}: ${response.statusText}`
                };
            }

            return { data, error: null };

        } catch (error) {
            console.error('API request failed:', error);
            return {
                data: null,
                error: error.message || 'Network error. Please check your connection.'
            };
        }
    }

    /**
     * Upload document
     * @param {File} file - File to upload
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<{data: any, error: any}>} Upload result
     */
    async uploadDocument(file, onProgress) {
        return new Promise((resolve) => {
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();

            // Track upload progress
            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        onProgress(percentComplete);
                    }
                });
            }

            xhr.addEventListener('load', () => {
                try {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const data = JSON.parse(xhr.responseText);
                        resolve({ data, error: null });
                    } else {
                        const errorData = JSON.parse(xhr.responseText);
                        resolve({
                            data: null,
                            error: errorData.error || errorData.message || errorData.detail || `Upload failed with status ${xhr.status}`
                        });
                    }
                } catch (e) {
                    resolve({ data: null, error: 'Failed to parse server response' });
                }
            });

            xhr.addEventListener('error', () => {
                resolve({ data: null, error: 'Network error during upload' });
            });

            xhr.addEventListener('abort', () => {
                resolve({ data: null, error: 'Upload cancelled' });
            });

            xhr.open('POST', `${this.baseURL}/documents/upload`);
            xhr.send(formData);
        });
    }

    /**
     * Get collection information
     * @returns {Promise<{data: any, error: any}>} Collection info
     */
    async getCollectionInfo() {
        return this.request('/documents/info', {
            method: 'GET'
        });
    }

    /**
     * Delete collection
     * @returns {Promise<{data: any, error: any}>} Delete result
     */
    async deleteCollection() {
        return this.request('/documents/collection', {
            method: 'DELETE'
        });
    }

    /**
     * Submit query
     * @param {string} question - Question text
     * @param {boolean} includeSources - Include source documents
     * @param {boolean} enableEvaluation - Enable RAGAS evaluation
     * @returns {Promise<{data: any, error: any}>} Query result
     */
    async query(question, includeSources = true, enableEvaluation = false) {
        return this.request('/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question,
                include_sources: includeSources,
                enable_evaluation: enableEvaluation
            })
        });
    }

    /**
     * Submit streaming query
     * @param {string} question - Question text
     * @param {Function} onChunk - Callback for each chunk
     * @returns {Promise<{data: string, error: any}>} Complete streamed response or error
     */
    async queryStream(question, onChunk) {
        try {
            const response = await fetch(`${this.baseURL}/query/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question,
                    include_sources: false,
                    enable_evaluation: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    data: null,
                    error: errorText || `HTTP ${response.status}: ${response.statusText}`
                };
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;

                if (onChunk) {
                    onChunk(chunk);
                }
            }

            return { data: fullText, error: null };

        } catch (error) {
            console.error('Streaming query failed:', error);
            return {
                data: null,
                error: error.message || 'Streaming failed. Please try again.'
            };
        }
    }

    /**
     * Search documents without generating answer
     * @param {string} question - Search query
     * @returns {Promise<{data: any, error: any}>} Search results
     */
    async searchDocuments(question) {
        return this.request('/query/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question })
        });
    }

    /**
     * Health check
     * @returns {Promise<{data: any, error: any}>} Health status
     */
    async healthCheck() {
        return this.request('/health', {
            method: 'GET'
        });
    }

    /**
     * Readiness check
     * @returns {Promise<{data: any, error: any}>} Readiness status
     */
    async readinessCheck() {
        return this.request('/health/ready', {
            method: 'GET'
        });
    }
}

// Export for use in other scripts
window.APIClient = APIClient;
