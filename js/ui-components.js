// js/ui-components.js

import { getRFCSection } from './scim-rfc-schemas.js';

// Export to global scope for use in other modules
window.renderJSON = renderJSON;

export function renderJSON(container, data) {
  if (typeof data === 'object' && data !== null) {
    const pre = document.createElement('pre');
    pre.style.cssText = `
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 1em;
      margin: 0.5em 0;
      overflow-x: auto;
      font-family: monospace;
      font-size: 0.9em;
    `;
    pre.textContent = JSON.stringify(data, null, 2);
    container.appendChild(pre);
  } else {
    container.textContent = String(data);
  }
}

export function showLoading(container, message = 'Loading...') {
  container.innerHTML = `<div class="loading-spinner">${message}</div>`;
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
  errorDiv.style.cssText = `
    color: #d32f2f;
    background: #ffebee;
    border: 1px solid #f44336;
    border-radius: 4px;
    padding: 1em;
    margin: 1em 0;
    font-family: monospace;
    white-space: pre-wrap;
    max-height: 600px;
    overflow-y: auto;
  `;
  
  // Build the error display HTML
  let errorHTML = `
    <div style="font-weight: bold; margin-bottom: 0.5em; font-size: 1.1em;">❌ Error: ${escapeHTML(errorMessage)}</div>
    <div style="margin-bottom: 0.5em; color: #666;">Type: ${errorType}</div>
  `;
  
  // Add RFC context if available
  if (rfcContext) {
    errorHTML += `
      <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 0.5em; margin: 0.5em 0; border-radius: 2px;">
        <div style="font-weight: bold; color: #1976d2; margin-bottom: 0.25em;">📋 RFC Context</div>
        <div style="color: #1565c0; margin-bottom: 0.25em;"><strong>Section:</strong> ${rfcContext.section}</div>
        <div style="color: #1565c0; margin-bottom: 0.25em;"><strong>Requirement:</strong> ${rfcContext.requirement}</div>
        <div style="color: #1565c0;"><strong>Impact:</strong> ${rfcContext.impact}</div>
      </div>
    `;
  }
  
  // Add stack trace if available
  if (errorStack) {
    errorHTML += `
      <details style="margin-top: 0.5em;">
        <summary style="cursor: pointer; color: #666; font-weight: bold;">📋 Show Stack Trace</summary>
        <pre style="background: #f5f5f5; padding: 0.5em; margin: 0.5em 0; border-radius: 2px; font-size: 0.9em; color: #d32f2f;">${escapeHTML(errorStack)}</pre>
      </details>
    `;
  }
  
  // Add error details if available
  if (errorDetails) {
    errorHTML += `
      <details style="margin-top: 0.5em;">
        <summary style="cursor: pointer; color: #666; font-weight: bold;">🔍 Show Error Details</summary>
        <pre style="background: #f5f5f5; padding: 0.5em; margin: 0.5em 0; border-radius: 2px; font-size: 0.9em;">${escapeHTML(errorDetails)}</pre>
      </details>
    `;
  }
  
  // Add full error object for debugging (always show raw data)
  errorHTML += `
    <details style="margin-top: 0.5em;">
      <summary style="cursor: pointer; color: #666; font-weight: bold;">🔧 Show Full Error Object</summary>
      <pre style="background: #f5f5f5; padding: 0.5em; margin: 0.5em 0; border-radius: 2px; font-size: 0.9em;">${escapeHTML(JSON.stringify(error, null, 2))}</pre>
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