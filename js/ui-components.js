// js/ui-components.js

import { getRFCSection } from './scim-rfc-schemas.js';

// Export to global scope for use in other modules
window.renderJSON = renderJSON;

export function renderJSON(container, data) {
  if (typeof data === 'object' && data !== null) {
    const pre = document.createElement('pre');
    pre.className = 'json-viewer';
    pre.textContent = JSON.stringify(data, null, 2);
    container.appendChild(pre);
  } else {
    container.textContent = String(data);
  }
}

export function showLoading(container, message = 'Loading...', details = '', type = 'default') {
  const spinnerClass = type === 'retry' ? 'retry-loading' : 
                      type === 'error-recovery' ? 'error-recovery' : 
                      type === 'metadata' ? 'metadata-loading' : '';
  
  container.innerHTML = `
    <div class="loading-spinner ${spinnerClass}">
      <div class="spinner"></div>
      <div class="loading-title">
        ${message}
      </div>
      ${details ? `<div class="loading-description">${details}</div>` : ''}
    </div>
  `;
}

export function showError(container, error) {
  let errorMessage = '';
  let errorDetails = '';
  let errorType = 'UNKNOWN_ERROR';
  let errorStack = '';
  
  // Handle different error formats
  if (typeof error === 'string') {
    errorMessage = error;
    errorType = 'STRING_ERROR';
  } else if (error && typeof error === 'object') {
    // Handle error objects with detailed information
    if (error.error) {
      errorMessage = error.error;
    } else if (error.message) {
      errorMessage = error.message;
    } else {
      errorMessage = 'An unknown error occurred';
    }
    
    // Get error type
    if (error.type) {
      errorType = error.type;
    } else if (error.name) {
      errorType = error.name;
    }
    
    // Get stack trace
    if (error.stack) {
      errorStack = error.stack;
    }
    
    // Build detailed error information
    const details = [];
    if (error.status) details.push(`Status: ${error.status}`);
    if (error.statusText) details.push(`Status Text: ${error.statusText}`);
    if (error.contentType) details.push(`Content-Type: ${error.contentType}`);
    if (error.requestInfo) {
      details.push(`Request URL: ${error.requestInfo.url}`);
      details.push(`Request Method: ${error.requestInfo.method}`);
      if (error.requestInfo.headers) {
        details.push(`Request Headers: ${JSON.stringify(error.requestInfo.headers, null, 2)}`);
      }
    }
    if (error.details) {
      if (typeof error.details === 'object') {
        details.push(`Details: ${JSON.stringify(error.details, null, 2)}`);
      } else {
        details.push(`Details: ${error.details}`);
      }
    }
    if (error.parseError) details.push(`Parse Error: ${error.parseError}`);
    if (error.suggestion) details.push(`Suggestion: ${error.suggestion}`);
    
    if (details.length > 0) {
      errorDetails = details.join('\n');
    }
  } else {
    errorMessage = String(error);
    errorType = 'UNKNOWN_ERROR';
  }
  
  // Get RFC context for the error
  const rfcContext = getRFCContext(errorType, error);
  
  // Create comprehensive error display
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  
  // Build the error display HTML
  let errorHTML = `
    <div class="error-title">❌ Error: ${escapeHTML(errorMessage)}</div>
    <div class="error-type">Type: ${errorType}</div>
  `;
  
  // Add RFC context if available
  if (rfcContext) {
    errorHTML += `
      <div class="error-rfc-context">
        <div class="error-rfc-title">📋 RFC Context</div>
        <div class="error-rfc-section"><strong>Section:</strong> ${rfcContext.section}</div>
        <div class="error-rfc-requirement"><strong>Requirement:</strong> ${rfcContext.requirement}</div>
        <div class="error-rfc-impact"><strong>Impact:</strong> ${rfcContext.impact}</div>
      </div>
    `;
  }
  
  // Add stack trace if available
  if (errorStack) {
    errorHTML += `
      <details class="error-details-expanded">
        <summary>📋 Show Stack Trace</summary>
        <pre class="error-stack-trace">${escapeHTML(errorStack)}</pre>
      </details>
    `;
  }
  
  // Add error details if available
  if (errorDetails) {
    errorHTML += `
      <details class="error-details-expanded">
        <summary>🔍 Show Error Details</summary>
        <pre class="error-details-content">${escapeHTML(errorDetails)}</pre>
      </details>
    `;
  }
  
  // Add full error object for debugging (always show raw data)
  errorHTML += `
    <details class="error-details-expanded">
      <summary>🔧 Show Full Error Object</summary>
      <pre class="error-details-content">${escapeHTML(JSON.stringify(error, null, 2))}</pre>
    </details>
  `;
  
  errorDiv.innerHTML = errorHTML;
  
  container.innerHTML = '';
  container.appendChild(errorDiv);
  
  // Log to console for debugging (but now the full details are also in the UI)
  console.error('showError called with:', error);
}

// RFC context mapping for common SCIM errors
function getRFCContext(errorType, error) {
  const contextMap = {
    'SCIM_VALIDATION_ERROR': {
      section: 'RFC 7643 §3.1 - Common Attributes',
      requirement: 'All SCIM resources must include a schemas attribute',
      impact: 'Resource creation/update will fail'
    },
    'MISSING_SERVICE_PROVIDER_CONFIG': {
      section: 'RFC 7644 §4.4 - Service Provider Configuration',
      requirement: 'ServiceProviderConfig endpoint is mandatory',
      impact: 'Client discovery will fail'
    },
    'INVALID_SCHEMA': {
      section: 'RFC 7643 §3 - Resource Schema',
      requirement: 'Resources must conform to their defined schema',
      impact: 'Resource operations will be rejected'
    },
    'AUTHENTICATION_ERROR': {
      section: 'RFC 7644 §2.1 - Authentication',
      requirement: 'Valid authentication credentials required',
      impact: 'All operations will be rejected'
    },
    'AUTHORIZATION_ERROR': {
      section: 'RFC 7644 §2.1 - Authorization',
      requirement: 'Sufficient permissions required for operation',
      impact: 'Operation will be rejected'
    },
    'RATE_LIMIT_EXCEEDED': {
      section: 'RFC 7644 §3.12 - Rate Limiting',
      requirement: 'Client must respect rate limits',
      impact: 'Operations will be throttled or rejected'
    },
    'INVALID_FILTER': {
      section: 'RFC 7644 §3.4.2.2 - Filtering',
      requirement: 'Filter expressions must follow SCIM filter syntax',
      impact: 'Search operations will fail'
    },
    'INVALID_SORT': {
      section: 'RFC 7644 §3.4.2.3 - Sorting',
      requirement: 'Sort parameters must reference valid attributes',
      impact: 'Sort operations will fail'
    },
    'BULK_OPERATION_ERROR': {
      section: 'RFC 7644 §3.7 - Bulk Operations',
      requirement: 'Bulk operations must follow bulk request format',
      impact: 'Bulk operations will fail'
    },
    'PATCH_OPERATION_ERROR': {
      section: 'RFC 7644 §3.5.2 - Patch Operations',
      requirement: 'Patch operations must follow JSON Patch format',
      impact: 'Update operations will fail'
    }
  };
  
  // Try to match error type
  if (contextMap[errorType]) {
    return contextMap[errorType];
  }
  
  // Try to match based on error message content
  if (error && error.message) {
    const message = error.message.toLowerCase();
    if (message.includes('schemas')) {
      return contextMap['SCIM_VALIDATION_ERROR'];
    }
    if (message.includes('serviceproviderconfig') || message.includes('service provider config')) {
      return contextMap['MISSING_SERVICE_PROVIDER_CONFIG'];
    }
    if (message.includes('authentication') || message.includes('unauthorized')) {
      return contextMap['AUTHENTICATION_ERROR'];
    }
    if (message.includes('authorization') || message.includes('forbidden')) {
      return contextMap['AUTHORIZATION_ERROR'];
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return contextMap['RATE_LIMIT_EXCEEDED'];
    }
    if (message.includes('filter') || message.includes('invalid filter')) {
      return contextMap['INVALID_FILTER'];
    }
    if (message.includes('sort') || message.includes('invalid sort')) {
      return contextMap['INVALID_SORT'];
    }
    if (message.includes('bulk') || message.includes('batch')) {
      return contextMap['BULK_OPERATION_ERROR'];
    }
    if (message.includes('patch') || message.includes('update')) {
      return contextMap['PATCH_OPERATION_ERROR'];
    }
  }
  
  return null;
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
} 