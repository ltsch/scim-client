// js/ui-components.js

export function renderJSON(container, data) {
  if (!container) return;
  if (window.$ && window.$.fn && window.$.fn.JSONView) {
    container.innerHTML = '';
    window.$(container).JSONView(data, { collapsed: false });
  } else {
    // fallback
    let jsonString;
    try {
      jsonString = JSON.stringify(data, null, 2);
    } catch (e) {
      jsonString = String(data);
    }
    container.innerHTML = `<pre class="json-viewer">${syntaxHighlight(jsonString)}</pre>`;
  }
}

// Export to global scope for use in other modules
window.renderJSON = renderJSON;

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
  
  // Add full error object for debugging
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

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

// Simple JSON syntax highlighter
function syntaxHighlight(json) {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2);
  }
  json = escapeHTML(json);
  return json.replace(/(\"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\\"])*\"(?=:))/g, '<span class="json-key">$1</span>')
    .replace(/(\"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\\"])*\")/g, '<span class="json-string">$1</span>')
    .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
    .replace(/\b(null)\b/g, '<span class="json-null">$1</span>')
    .replace(/(-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g, '<span class="json-number">$1</span>');
} 