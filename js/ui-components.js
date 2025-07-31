// js/ui-components.js - Refactored UI Components

import { UI_CONFIG, SCIM_CONFIG } from './config.js';
import { 
  validateElement, 
  validateRequired,
  escapeHTML,
  createElement,
  addEventListener,
  removeEventListener,
  clearElement,
  parseError as parseErrorUtil
} from './utils.js';

// ============================================================================
// RFC CONTEXT MAPPING
// ============================================================================

/**
 * Get RFC context for error types
 * @param {string} errorType - Error type
 * @param {Object} error - Error object
 * @returns {Object|null} RFC context information
 */
function getRFCContext(errorType, error) {
  // Check SCIM_CONFIG first
  if (SCIM_CONFIG.RFC_SECTIONS[errorType]) {
    return SCIM_CONFIG.RFC_SECTIONS[errorType];
  }

  // Check error message for common patterns
  const message = error?.message || error?.detail || '';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('serviceproviderconfig') || lowerMessage.includes('service provider config')) {
    return SCIM_CONFIG.RFC_SECTIONS['MISSING_SERVICE_PROVIDER_CONFIG'];
  }

  if (lowerMessage.includes('filter') || lowerMessage.includes('invalid filter')) {
    return SCIM_CONFIG.RFC_SECTIONS['INVALID_FILTER_SYNTAX'];
  }

  if (lowerMessage.includes('schema') || lowerMessage.includes('schemas')) {
    return SCIM_CONFIG.RFC_SECTIONS['MISSING_SCHEMAS'];
  }

  if (lowerMessage.includes('authentication') || lowerMessage.includes('unauthorized')) {
    return SCIM_CONFIG.RFC_SECTIONS['AUTHENTICATION_ERROR'];
  }

  if (lowerMessage.includes('authorization') || lowerMessage.includes('forbidden')) {
    return SCIM_CONFIG.RFC_SECTIONS['AUTHORIZATION_ERROR'];
  }

  if (lowerMessage.includes('syntax') || lowerMessage.includes('malformed')) {
    return SCIM_CONFIG.RFC_SECTIONS['INVALID_SYNTAX'];
  }

  if (lowerMessage.includes('path') || lowerMessage.includes('not found')) {
    return SCIM_CONFIG.RFC_SECTIONS['INVALID_PATH'];
  }

  if (lowerMessage.includes('value') || lowerMessage.includes('invalid value')) {
    return SCIM_CONFIG.RFC_SECTIONS['INVALID_VALUE'];
  }

  if (lowerMessage.includes('mutability') || lowerMessage.includes('readonly')) {
    return SCIM_CONFIG.RFC_SECTIONS['MUTABILITY_ERROR'];
  }

  if (lowerMessage.includes('uniqueness') || lowerMessage.includes('duplicate')) {
    return SCIM_CONFIG.RFC_SECTIONS['UNIQUENESS_ERROR'];
  }

  if (lowerMessage.includes('too many') || lowerMessage.includes('exceeded')) {
    return SCIM_CONFIG.RFC_SECTIONS['TOO_MANY_ERROR'];
  }

  if (lowerMessage.includes('version') || lowerMessage.includes('etag')) {
    return SCIM_CONFIG.RFC_SECTIONS['INVALID_VERS_ERROR'];
  }

  if (lowerMessage.includes('sensitive') || lowerMessage.includes('permission')) {
    return SCIM_CONFIG.RFC_SECTIONS['SENSITIVITY_ERROR'];
  }

  return null;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate container element
 * @param {HTMLElement} container - Container to validate
 * @throws {Error} If validation fails
 */
function validateContainer(container) {
  validateElement(container, 'container');
}

/**
 * Validate data for rendering
 * @param {*} data - Data to validate
 * @throws {Error} If validation fails
 */
function validateData(data) {
  validateRequired(data, 'data');
}

/**
 * Validate error object
 * @param {*} error - Error to validate
 * @throws {Error} If validation fails
 */
function validateError(error) {
  validateRequired(error, 'error');
}

/**
 * Validate message string
 * @param {string} message - Message to validate
 * @throws {Error} If validation fails
 */
function validateMessage(message) {
  if (typeof message !== 'string' || message.trim() === '') {
    throw new Error('Message must be a non-empty string');
  }
}

// ============================================================================
// ERROR PARSING
// ============================================================================

/**
 * Parse error for display with RFC context
 * @param {*} error - Error to parse
 * @returns {Object} Parsed error information
 */
function parseError(error) {
  const parsed = parseErrorUtil(error);
  
  // Get RFC context
  const rfcContext = getRFCContext(parsed.type, error);
  
  return {
    ...parsed,
    rfcContext
  };
}

// ============================================================================
// MAIN UI FUNCTIONS
// ============================================================================

/**
 * Render JSON data in a container
 * @param {HTMLElement} container - Container element
 * @param {*} data - Data to render
 */
export function renderJSON(container, data) {
  try {
    validateContainer(container);
    validateData(data);
    
    // Clear container
    clearElement(container);
    
    if (typeof data === 'object' && data !== null) {
      const pre = createElement('pre', {
        className: UI_CONFIG.CLASSES.JSON_VIEWER
      });
      pre.textContent = JSON.stringify(data, null, 2);
      container.appendChild(pre);
    } else {
      container.textContent = String(data);
    }
  } catch (error) {
    // Fallback to simple text display
    container.innerHTML = `
      <div class="${UI_CONFIG.CLASSES.ERROR_MESSAGE}">
        Failed to render JSON: ${escapeHTML(error.message)}
      </div>
    `;
  }
}

/**
 * Show loading spinner
 * @param {HTMLElement} container - Container element
 * @param {string} message - Loading message
 * @param {string} details - Additional details
 * @param {string} type - Loading type
 */
export function showLoading(container, message = UI_CONFIG.MESSAGES.LOADING, details = '', type = UI_CONFIG.LOADING_TYPES.DEFAULT) {
  try {
    validateContainer(container);
    validateMessage(message);
    
    const spinnerClass = type === UI_CONFIG.LOADING_TYPES.RETRY ? 'retry-loading' : 
                        type === UI_CONFIG.LOADING_TYPES.ERROR_RECOVERY ? 'error-recovery' : 
                        type === UI_CONFIG.LOADING_TYPES.METADATA ? 'metadata-loading' : '';
    
    const loadingHTML = `
      <div class="${UI_CONFIG.CLASSES.LOADING_SPINNER} ${spinnerClass}">
        <div class="${UI_CONFIG.CLASSES.SPINNER}"></div>
        <div class="${UI_CONFIG.CLASSES.LOADING_TITLE}">
          ${escapeHTML(message)}
        </div>
        ${details ? `<div class="${UI_CONFIG.CLASSES.LOADING_DESCRIPTION}">${escapeHTML(details)}</div>` : ''}
      </div>
    `;
    
    container.innerHTML = loadingHTML;
  } catch (error) {
    container.innerHTML = `
      <div class="${UI_CONFIG.CLASSES.ERROR_MESSAGE}">
        Failed to show loading: ${escapeHTML(error.message)}
      </div>
    `;
  }
}

/**
 * Show error message with enhanced SCIM error context
 * @param {HTMLElement} container - Container element
 * @param {*} error - Error to display
 */
export async function showError(container, error) {
  try {
    validateContainer(container);
    validateError(error);
    
    const parsed = parseError(error);
    
    // Clear container
    clearElement(container);
    
    // Create error container
    const errorContainer = createElement('div', {
      className: UI_CONFIG.CLASSES.ERROR_MESSAGE
    });
    
    // Error title with status code if available
    let titleText = `Error: ${parsed.message}`;
    if (error.status) {
      titleText += ` (HTTP ${error.status})`;
    }
    
    const title = createElement('h3', {
      textContent: titleText
    });
    errorContainer.appendChild(title);
    
    // SCIM Error Details if available
    if (error.scimError) {
      const scimErrorSection = createElement('div', {
        className: 'scim-error-details'
      });
      
      scimErrorSection.innerHTML = `
        <h4>SCIM Error Details</h4>
        <div class="scim-error-grid">
          ${error.scimError.scimCode ? `<div><strong>SCIM Code:</strong> ${escapeHTML(error.scimError.scimCode)}</div>` : ''}
          ${error.scimError.scimType ? `<div><strong>SCIM Type:</strong> ${escapeHTML(error.scimError.scimType)}</div>` : ''}
          ${error.scimError.detail ? `<div><strong>Detail:</strong> ${escapeHTML(error.scimError.detail)}</div>` : ''}
        </div>
      `;
      
      errorContainer.appendChild(scimErrorSection);
    }
    
    // RFC context if available
    if (parsed.rfcContext) {
      const rfcSection = createElement('div', {
        className: 'rfc-context'
      });
      
      rfcSection.innerHTML = `
        <h4>RFC Context</h4>
        <div class="rfc-context-grid">
          <div><strong>Section:</strong> ${escapeHTML(parsed.rfcContext.section)}</div>
          <div><strong>Requirement:</strong> ${escapeHTML(parsed.rfcContext.requirement)}</div>
          <div><strong>Impact:</strong> ${escapeHTML(parsed.rfcContext.impact)}</div>
          ${parsed.rfcContext.solution ? `<div><strong>Solution:</strong> ${escapeHTML(parsed.rfcContext.solution)}</div>` : ''}
        </div>
      `;
      
      errorContainer.appendChild(rfcSection);
    }
    
    // HTTP Status Context if available
    if (error.status) {
      const { SCIM_CONFIG } = await import('./config.js');
      const statusMapping = SCIM_CONFIG.HTTP_STATUS_MAPPING[error.status];
      
      if (statusMapping) {
        const httpSection = createElement('div', {
          className: 'http-status-context'
        });
        
        httpSection.innerHTML = `
          <h4>HTTP Status Context</h4>
          <div class="http-context-grid">
            <div><strong>Status:</strong> ${error.status} - ${escapeHTML(statusMapping.description)}</div>
            <div><strong>Common Causes:</strong> ${escapeHTML(statusMapping.commonCauses.join(', '))}</div>
            ${statusMapping.scimCode ? `<div><strong>SCIM Code:</strong> ${escapeHTML(statusMapping.scimCode)}</div>` : ''}
          </div>
        `;
        
        errorContainer.appendChild(httpSection);
      }
    }
    
    // Error details if available
    if (parsed.details) {
      const details = createElement('div', {
        className: 'error-details'
      });
      
      details.innerHTML = `
        <h4>Error Details</h4>
        <pre>${escapeHTML(parsed.details)}</pre>
      `;
      
      errorContainer.appendChild(details);
    }
    
    // Raw error response if available
    if (error.scimError && error.scimError.rawError) {
      const rawSection = createElement('div', {
        className: 'raw-error-response'
      });
      
      rawSection.innerHTML = `
        <h4>Raw Error Response</h4>
        <pre>${escapeHTML(JSON.stringify(error.scimError.rawError, null, 2))}</pre>
      `;
      
      errorContainer.appendChild(rawSection);
    }
    
    // Error stack if available (development only)
    if (parsed.stack && window.location.hostname === 'localhost') {
      const stack = createElement('div', {
        className: 'error-stack'
      });
      
      stack.innerHTML = `
        <h4>Stack Trace</h4>
        <pre>${escapeHTML(parsed.stack)}</pre>
      `;
      
      errorContainer.appendChild(stack);
    }
    
    // Action buttons for common scenarios
    const actions = createElement('div', {
      className: 'error-actions'
    });
    
    // Add retry button for network errors
    if (error.type === 'NETWORK_ERROR' || error.status >= 500) {
      const retryBtn = createElement('button', {
        className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_SECONDARY}`,
        textContent: 'Retry Request'
      });
      
      addEventListener(retryBtn, 'click', () => {
        // This would need to be handled by the calling component
        console.log('Retry requested for error:', error);
      });
      
      actions.appendChild(retryBtn);
    }
    
    // Add view logs button
    const logsBtn = createElement('button', {
      className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_SECONDARY}`,
      textContent: 'View Request Logs'
    });
    
    addEventListener(logsBtn, 'click', () => {
      // This would open the request logs panel
      console.log('View logs requested');
    });
    
    actions.appendChild(logsBtn);
    
    if (actions.children.length > 0) {
      errorContainer.appendChild(actions);
    }
    
    container.appendChild(errorContainer);
  } catch (displayError) {
    // Fallback to simple error display
    container.innerHTML = `
      <div class="${UI_CONFIG.CLASSES.ERROR_MESSAGE}">
        Error: ${escapeHTML(String(error))}
      </div>
    `;
  }
}

/**
 * Show success message
 * @param {HTMLElement} container - Container element
 * @param {string} message - Success message
 * @param {string} details - Additional details
 */
export function showSuccess(container, message, details = '') {
  try {
    validateContainer(container);
    validateMessage(message);
    
    const successHTML = `
      <div class="${UI_CONFIG.CLASSES.SUCCESS_MESSAGE}">
        <h3>${escapeHTML(message)}</h3>
        ${details ? `<p>${escapeHTML(details)}</p>` : ''}
      </div>
    `;
    
    container.innerHTML = successHTML;
  } catch (error) {
    container.innerHTML = `
      <div class="${UI_CONFIG.CLASSES.ERROR_MESSAGE}">
        Failed to show success: ${escapeHTML(error.message)}
      </div>
    `;
  }
}

/**
 * Show warning message
 * @param {HTMLElement} container - Container element
 * @param {string} message - Warning message
 * @param {string} details - Additional details
 */
export function showWarning(container, message, details = '') {
  try {
    validateContainer(container);
    validateMessage(message);
    
    const warningHTML = `
      <div class="${UI_CONFIG.CLASSES.WARNING_MESSAGE}">
        <h3>Warning: ${escapeHTML(message)}</h3>
        ${details ? `<p>${escapeHTML(details)}</p>` : ''}
      </div>
    `;
    
    container.innerHTML = warningHTML;
  } catch (error) {
    container.innerHTML = `
      <div class="${UI_CONFIG.CLASSES.ERROR_MESSAGE}">
        Failed to show warning: ${escapeHTML(error.message)}
      </div>
    `;
  }
}

// ============================================================================
// MODAL COMPONENTS
// ============================================================================

/**
 * Create a modal dialog
 * @param {HTMLElement} container - Container element
 * @param {string} title - Modal title
 * @param {string|HTMLElement} content - Modal content
 * @param {Object} options - Modal options
 * @returns {Object} Modal instance with close method
 */
export function createModal(container, title, content, options = {}) {
  try {
    validateContainer(container);
    validateMessage(title);
    
    // Create modal overlay
    const overlay = createElement('div', {
      className: UI_CONFIG.CLASSES.MODAL_OVERLAY
    });
    
    // Create modal container
    const modalContainer = createElement('div', {
      className: UI_CONFIG.CLASSES.MODAL_CONTAINER
    });
    
    // Create modal header
    const header = createElement('div', {
      className: UI_CONFIG.CLASSES.MODAL_HEADER
    });
    
    const titleElement = createElement('h2', {
      textContent: title
    });
    
    const closeButton = createElement('button', {
      className: UI_CONFIG.CLASSES.MODAL_CLOSE,
      textContent: '×'
    });
    
    header.appendChild(titleElement);
    header.appendChild(closeButton);
    
    // Create modal body
    const body = createElement('div', {
      className: UI_CONFIG.CLASSES.MODAL_BODY
    });
    
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else if (content instanceof Element) {
      body.appendChild(content);
    } else {
      body.textContent = String(content);
    }
    
    // Create modal footer if buttons provided
    let footer = null;
    if (options.buttons && Array.isArray(options.buttons)) {
      footer = createElement('div', {
        className: UI_CONFIG.CLASSES.MODAL_FOOTER
      });
      
      options.buttons.forEach(button => {
        const btn = createElement('button', {
          className: button.className || UI_CONFIG.CLASSES.BTN_SECONDARY,
          textContent: button.text
        });
        
        if (button.onClick) {
          addEventListener(btn, 'click', button.onClick);
        }
        
        footer.appendChild(btn);
      });
    }
    
    // Assemble modal
    modalContainer.appendChild(header);
    modalContainer.appendChild(body);
    if (footer) {
      modalContainer.appendChild(footer);
    }
    
    overlay.appendChild(modalContainer);
    document.body.appendChild(overlay);
    
    // Close functionality
    const closeModal = () => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    };
    
    addEventListener(closeButton, 'click', closeModal);
    addEventListener(overlay, 'click', (event) => {
      if (event.target === overlay) {
        closeModal();
      }
    });
    
    // Escape key handler
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    return {
      close: closeModal,
      overlay,
      container: modalContainer
    };
  } catch (error) {
    container.innerHTML = `
      <div class="${UI_CONFIG.CLASSES.ERROR_MESSAGE}">
        Failed to create modal: ${escapeHTML(error.message)}
      </div>
    `;
    
    return {
      close: () => {},
      overlay: null,
      container: null
    };
  }
}

/**
 * Create an accordion component
 * @param {HTMLElement} container - Container element
 * @param {string} title - Accordion title
 * @param {string|HTMLElement} content - Accordion content
 * @param {Object} options - Accordion options
 * @returns {Object} Accordion instance
 */
export function createAccordion(container, title, content, options = {}) {
  try {
    validateContainer(container);
    validateMessage(title);
    
    // Create accordion container
    const accordion = createElement('div', {
      className: 'reqres-accordion'
    });
    
    // Create toggle button
    const toggleButton = createElement('button', {
      className: 'reqres-toggle-btn',
      textContent: title
    });
    
    // Create content panel
    const panel = createElement('div', {
      className: 'reqres-panel'
    });
    
    if (typeof content === 'string') {
      panel.innerHTML = content;
    } else if (content instanceof Element) {
      panel.appendChild(content);
    } else {
      panel.textContent = String(content);
    }
    
    // Toggle functionality
    let isOpen = options.defaultOpen || false;
    
    const togglePanel = () => {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
      toggleButton.classList.toggle('open', isOpen);
    };
    
    addEventListener(toggleButton, 'click', togglePanel);
    
    // Set initial state
    if (isOpen) {
      panel.classList.add('open');
      toggleButton.classList.add('open');
    }
    
    accordion.appendChild(toggleButton);
    accordion.appendChild(panel);
    container.appendChild(accordion);
    
    return {
      toggle: togglePanel,
      isOpen: () => isOpen,
      accordion,
      button: toggleButton,
      panel
    };
  } catch (error) {
    container.innerHTML = `
      <div class="${UI_CONFIG.CLASSES.ERROR_MESSAGE}">
        Failed to create accordion: ${escapeHTML(error.message)}
      </div>
    `;
    
    return {
      toggle: () => {},
      isOpen: () => false,
      accordion: null,
      button: null,
      panel: null
    };
  }
}

// ============================================================================
// REQUEST LOGS VIEWER
// ============================================================================

/**
 * Create a request logs viewer component
 * @param {HTMLElement} container - Container element
 * @param {Object} options - Viewer options
 * @returns {Object} Logs viewer instance
 */
export async function createRequestLogsViewer(container, options = {}) {
  try {
    validateContainer(container);
    
    const { requestLogger } = await import('./utils.js');
    
    // Create viewer container
    const viewer = createElement('div', {
      className: 'request-logs-viewer'
    });
    
    // Create header
    const header = createElement('div', {
      className: 'logs-viewer-header'
    });
    
    const title = createElement('h3', {
      textContent: 'Request/Response Logs'
    });
    
    const controls = createElement('div', {
      className: 'logs-viewer-controls'
    });
    
    // Filter controls
    const filterContainer = createElement('div', {
      className: 'logs-filter-container'
    });
    
    const methodFilter = createElement('select', {
      className: UI_CONFIG.CLASSES.FORM_CONTROL,
      id: 'method-filter'
    });
    
    const methodOptions = [
      { value: '', text: 'All Methods' },
      { value: 'GET', text: 'GET' },
      { value: 'POST', text: 'POST' },
      { value: 'PUT', text: 'PUT' },
      { value: 'PATCH', text: 'PATCH' },
      { value: 'DELETE', text: 'DELETE' }
    ];
    
    methodOptions.forEach(option => {
      const optionElement = createElement('option', {
        value: option.value,
        textContent: option.text
      });
      methodFilter.appendChild(optionElement);
    });
    
    const statusFilter = createElement('select', {
      className: UI_CONFIG.CLASSES.FORM_CONTROL,
      id: 'status-filter'
    });
    
    const statusOptions = [
      { value: '', text: 'All Status' },
      { value: 'success', text: 'Success (2xx)' },
      { value: 'error', text: 'Error (4xx/5xx)' },
      { value: '400', text: '400 Bad Request' },
      { value: '401', text: '401 Unauthorized' },
      { value: '403', text: '403 Forbidden' },
      { value: '404', text: '404 Not Found' },
      { value: '500', text: '500 Server Error' }
    ];
    
    statusOptions.forEach(option => {
      const optionElement = createElement('option', {
        value: option.value,
        textContent: option.text
      });
      statusFilter.appendChild(optionElement);
    });
    
    const clearBtn = createElement('button', {
      className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_SECONDARY}`,
      textContent: 'Clear Logs'
    });
    
    const exportBtn = createElement('button', {
      className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_SECONDARY}`,
      textContent: 'Export Logs'
    });
    
    filterContainer.appendChild(methodFilter);
    filterContainer.appendChild(statusFilter);
    controls.appendChild(filterContainer);
    controls.appendChild(clearBtn);
    controls.appendChild(exportBtn);
    
    header.appendChild(title);
    header.appendChild(controls);
    viewer.appendChild(header);
    
    // Create logs container
    const logsContainer = createElement('div', {
      className: 'logs-container'
    });
    
    viewer.appendChild(logsContainer);
    
    // Performance stats
    const statsContainer = createElement('div', {
      className: 'logs-stats-container'
    });
    
    viewer.appendChild(statsContainer);
    
    // Function to render logs
    const renderLogs = (logs) => {
      clearElement(logsContainer);
      
      if (logs.length === 0) {
        logsContainer.innerHTML = `
          <div class="no-logs-message">
            <p>No request logs available.</p>
            <p>Make some SCIM requests to see logs here.</p>
          </div>
        `;
        return;
      }
      
      logs.forEach(log => {
        const logEntry = createLogEntry(log);
        logsContainer.appendChild(logEntry);
      });
    };
    
    // Function to create individual log entry
    const createLogEntry = (log) => {
      const entry = createElement('div', {
        className: `log-entry ${log.success ? 'success' : 'error'}`
      });
      
      const timestamp = new Date(log.timestamp).toLocaleString();
      const duration = log.duration ? `${log.duration}ms` : 'N/A';
      const statusClass = log.status >= 200 && log.status < 300 ? 'success' : 'error';
      
      entry.innerHTML = `
        <div class="log-entry-header">
          <div class="log-method ${log.method.toLowerCase()}">${log.method}</div>
          <div class="log-status ${statusClass}">${log.status}</div>
          <div class="log-duration">${duration}</div>
          <div class="log-timestamp">${timestamp}</div>
        </div>
        <div class="log-url">${escapeHTML(log.url)}</div>
        <div class="log-details">
          <div class="log-sizes">
            <span>Request: ${log.requestSize || 0}B</span>
            <span>Response: ${log.responseSize || 0}B</span>
          </div>
          ${log.error ? `<div class="log-error">${escapeHTML(log.error)}</div>` : ''}
        </div>
        <div class="log-actions">
          <button class="btn-details" data-log-id="${log.id}">View Details</button>
        </div>
      `;
      
      // Add click handler for details
      const detailsBtn = entry.querySelector('.btn-details');
      addEventListener(detailsBtn, 'click', () => {
        showLogDetails(log);
      });
      
      return entry;
    };
    
    // Function to show detailed log information
    const showLogDetails = (log) => {
      const modal = createModal(container, `Request Details - ${log.method} ${log.url}`, '', {
        buttons: [
          {
            text: 'Close',
            className: UI_CONFIG.CLASSES.BTN_SECONDARY,
            onClick: () => modal.close()
          }
        ]
      });
      
      const detailsContent = createElement('div', {
        className: 'log-details-content'
      });
      
      detailsContent.innerHTML = `
        <div class="log-detail-section">
          <h4>Request Information</h4>
          <div class="detail-grid">
            <div><strong>Method:</strong> ${escapeHTML(log.method)}</div>
            <div><strong>URL:</strong> ${escapeHTML(log.url)}</div>
            <div><strong>Timestamp:</strong> ${new Date(log.timestamp).toLocaleString()}</div>
            <div><strong>Duration:</strong> ${log.duration || 'N/A'}ms</div>
            <div><strong>Request Size:</strong> ${log.requestSize || 0}B</div>
            <div><strong>Response Size:</strong> ${log.responseSize || 0}B</div>
          </div>
        </div>
        
        <div class="log-detail-section">
          <h4>Response Information</h4>
          <div class="detail-grid">
            <div><strong>Status:</strong> ${log.status} ${escapeHTML(log.statusText)}</div>
            <div><strong>Success:</strong> ${log.success ? 'Yes' : 'No'}</div>
          </div>
        </div>
        
        ${log.requestHeaders ? `
        <div class="log-detail-section">
          <h4>Request Headers</h4>
          <pre>${escapeHTML(JSON.stringify(log.requestHeaders, null, 2))}</pre>
        </div>
        ` : ''}
        
        ${log.responseHeaders ? `
        <div class="log-detail-section">
          <h4>Response Headers</h4>
          <pre>${escapeHTML(JSON.stringify(log.responseHeaders, null, 2))}</pre>
        </div>
        ` : ''}
        
        ${log.requestBody ? `
        <div class="log-detail-section">
          <h4>Request Body</h4>
          <pre>${escapeHTML(JSON.stringify(log.requestBody, null, 2))}</pre>
        </div>
        ` : ''}
        
        ${log.responseBody ? `
        <div class="log-detail-section">
          <h4>Response Body</h4>
          <pre>${escapeHTML(JSON.stringify(log.responseBody, null, 2))}</pre>
        </div>
        ` : ''}
        
        ${log.scimError ? `
        <div class="log-detail-section">
          <h4>SCIM Error</h4>
          <pre>${escapeHTML(JSON.stringify(log.scimError, null, 2))}</pre>
        </div>
        ` : ''}
      `;
      
      modal.container.querySelector(`.${UI_CONFIG.CLASSES.MODAL_BODY}`).appendChild(detailsContent);
    };
    
    // Function to update performance stats
    const updateStats = () => {
      const stats = requestLogger.getPerformanceStats();
      
      statsContainer.innerHTML = `
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">Total Requests</div>
            <div class="stat-value">${stats.totalRequests}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Success Rate</div>
            <div class="stat-value">${stats.successRate.toFixed(1)}%</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Avg Response Time</div>
            <div class="stat-value">${stats.averageResponseTime.toFixed(0)}ms</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Error Rate</div>
            <div class="stat-value">${stats.errorRate.toFixed(1)}%</div>
          </div>
        </div>
      `;
    };
    
    // Function to apply filters
    const applyFilters = () => {
      const methodValue = methodFilter.value;
      const statusValue = statusFilter.value;
      
      let filters = {};
      
      if (methodValue) {
        filters.method = methodValue;
      }
      
      if (statusValue) {
        if (statusValue === 'success') {
          filters.success = true;
        } else if (statusValue === 'error') {
          filters.success = false;
        } else {
          filters.status = parseInt(statusValue);
        }
      }
      
      const filteredLogs = requestLogger.getFilteredLogs(filters);
      renderLogs(filteredLogs);
    };
    
    // Bind event listeners
    addEventListener(methodFilter, 'change', applyFilters);
    addEventListener(statusFilter, 'change', applyFilters);
    
    addEventListener(clearBtn, 'click', () => {
      if (confirm('Are you sure you want to clear all request logs?')) {
        requestLogger.clearLogs();
        renderLogs([]);
        updateStats();
      }
    });
    
    addEventListener(exportBtn, 'click', () => {
      const logs = requestLogger.getLogs();
      const dataStr = JSON.stringify(logs, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `scim-request-logs-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    });
    
    // Initial render
    const logs = requestLogger.getLogs();
    renderLogs(logs);
    updateStats();
    
    // Listen for new log entries
    const logListener = (newLog) => {
      const currentLogs = requestLogger.getLogs();
      renderLogs(currentLogs);
      updateStats();
    };
    
    requestLogger.addListener(logListener);
    
    container.appendChild(viewer);
    
    return {
      viewer,
      renderLogs,
      updateStats,
      destroy: () => {
        requestLogger.removeListener(logListener);
      }
    };
    
  } catch (error) {
    container.innerHTML = `
      <div class="${UI_CONFIG.CLASSES.ERROR_MESSAGE}">
        Failed to create logs viewer: ${escapeHTML(error.message)}
      </div>
    `;
    
    return {
      viewer: null,
      renderLogs: () => {},
      updateStats: () => {},
      destroy: () => {}
    };
  }
}

/**
 * Create a JSON viewer modal with copy functionality
 * @param {HTMLElement} container - Container element (unused but kept for consistency)
 * @param {string} title - Modal title
 * @param {Object} data - JSON data to display
 * @param {Object} options - Modal options
 * @returns {Object} Modal instance
 */
export function createJSONViewerModal(container, title, data, options = {}) {
  try {
    // Create JSON content container
    const jsonContainer = createElement('div', {
      className: 'json-viewer-container'
    });
    
    // Create JSON display
    const jsonDisplay = createElement('pre', {
      className: UI_CONFIG.CLASSES.JSON_VIEWER,
      textContent: JSON.stringify(data, null, 2)
    });
    
    jsonContainer.appendChild(jsonDisplay);
    
    // Create copy button
    const copyButton = createElement('button', {
      className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_SECONDARY}`,
      textContent: 'Copy JSON'
    });
    
    addEventListener(copyButton, 'click', async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
          copyButton.textContent = 'Copy JSON';
        }, 2000);
      } catch (error) {
        console.error('Failed to copy JSON:', error);
        copyButton.textContent = 'Copy Failed';
        setTimeout(() => {
          copyButton.textContent = 'Copy JSON';
        }, 2000);
      }
    });
    
    jsonContainer.appendChild(copyButton);
    
    // Create modal with the JSON content
    return createModal(container, title, jsonContainer, {
      ...options,
      buttons: [
        {
          text: 'Close',
          className: UI_CONFIG.CLASSES.BTN_SECONDARY,
          onClick: () => {} // Modal will close automatically
        }
      ]
    });
  } catch (error) {
    console.error('Failed to create JSON viewer modal:', error);
    return createModal(container, 'Error', `Failed to create JSON viewer: ${error.message}`);
  }
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

// Export configuration for external use
export { UI_CONFIG, SCIM_CONFIG }; 