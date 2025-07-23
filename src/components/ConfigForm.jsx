import { useState } from 'react';

/**
 * Configuration form component for SCIM client settings
 * @param {Object} props - Component props
 * @param {Object} props.config - Current configuration
 * @param {Function} props.onConfigUpdate - Callback for config updates
 * @param {Function} props.onSave - Callback for saving config
 * @param {Function} props.onClearCache - Callback for clearing cache
 * @param {string} props.error - Error message to display
 */
const ConfigForm = ({ config, onConfigUpdate, onSave, onClearCache, error }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [corsProxyError, setCorsProxyError] = useState('');

  /**
   * Validate CORS proxy URL to prevent path traversal and file path attacks
   * @param {string} url - The URL to validate
   * @returns {string|null} Error message or null if valid
   */
  const validateCorsProxyUrl = (url) => {
    if (!url || url.trim() === '') {
      return null; // Empty is allowed
    }

    const trimmedUrl = url.trim();

    // Check for path traversal patterns
    if (trimmedUrl.includes('..') || 
        trimmedUrl.includes('\\') || 
        trimmedUrl.includes('//') ||
        trimmedUrl.includes('~') ||
        trimmedUrl.includes('file://') ||
        trimmedUrl.includes('ftp://') ||
        trimmedUrl.includes(':///')) {
      return 'Invalid URL: Path traversal and file access patterns are not allowed';
    }

    // Check for absolute file paths (Unix and Windows)
    if (trimmedUrl.startsWith('/') && 
        (trimmedUrl.includes('/etc/') || 
         trimmedUrl.includes('/var/') || 
         trimmedUrl.includes('/home/') || 
         trimmedUrl.includes('/root/') ||
         trimmedUrl.includes('/proc/') ||
         trimmedUrl.includes('/sys/'))) {
      return 'Invalid URL: File system paths are not allowed';
    }

    // Check for Windows file paths
    if (trimmedUrl.match(/^[a-zA-Z]:\\/) || 
        trimmedUrl.includes('C:\\') || 
        trimmedUrl.includes('D:\\') ||
        trimmedUrl.includes('\\Windows\\') ||
        trimmedUrl.includes('\\System32\\')) {
      return 'Invalid URL: File system paths are not allowed';
    }

    // For relative paths, ensure they start with / and don't contain dangerous patterns
    if (trimmedUrl.startsWith('/')) {
      // Allow safe relative paths like /proxy, /api/proxy, etc.
      if (!trimmedUrl.match(/^\/[a-zA-Z0-9\-_\/]+$/)) {
        return 'Invalid relative path: Only alphanumeric characters, hyphens, underscores, and forward slashes are allowed';
      }
    }

    // For full URLs, validate the format
    if (trimmedUrl.includes('://')) {
      try {
        const urlObj = new URL(trimmedUrl);
        // Only allow HTTP and HTTPS
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          return 'Invalid URL: Only HTTP and HTTPS protocols are allowed';
        }
        // Check for localhost/private IP patterns
        if (urlObj.hostname === 'localhost' || 
            urlObj.hostname === '127.0.0.1' ||
            urlObj.hostname.startsWith('192.168.') ||
            urlObj.hostname.startsWith('10.') ||
            urlObj.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
          return 'Invalid URL: Local and private IP addresses are not allowed';
        }
      } catch (e) {
        return 'Invalid URL format';
      }
    }

    return null; // Valid URL
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate CORS proxy URL before submitting
    if (config.useCorsProxy && config.corsProxyUrl) {
      const validationError = validateCorsProxyUrl(config.corsProxyUrl);
      if (validationError) {
        setCorsProxyError(validationError);
        return;
      }
    }
    
    setIsSubmitting(true);
    setCorsProxyError('');
    
    try {
      await onSave();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearCache = async () => {
    // Show confirmation dialog first
    const confirmed = window.confirm('Are you sure you want to clear all cached data? This will reset your configuration and clear any stored data.');
    if (!confirmed) return;
    setIsClearing(true);
    try {
      if (onClearCache) {
        await onClearCache();
      }
    } finally {
      setIsClearing(false);
    }
  };

  const handleInputChange = (field, value) => {
    // Clear CORS proxy error when user starts typing
    if (field === 'corsProxyUrl') {
      setCorsProxyError('');
    }
    onConfigUpdate({ [field]: value });
  };

  return (
    <div className="config-form">
      <h2>SCIM Client Configuration</h2>
      
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} data-testid="config-form">
        <div className="form-group">
          <label htmlFor="endpoint">SCIM Endpoint URL:</label>
          <input
            type="url"
            id="endpoint"
            name="endpoint"
            value={config.endpoint || ''}
            onChange={(e) => handleInputChange('endpoint', e.target.value)}
            placeholder="https://your-scim-server.com/scim/v2"
            required
            data-testid="endpoint-input"
          />
          <small>Enter the base URL of your SCIM server</small>
        </div>

        <div className="form-group">
          <label htmlFor="apiKey">API Key (Optional):</label>
          <input
            type="password"
            id="apiKey"
            name="apiKey"
            value={config.apiKey || ''}
            onChange={(e) => handleInputChange('apiKey', e.target.value)}
            placeholder="Enter your API key if required"
            data-testid="api-key-input"
          />
          <small>API key for authentication (if required by your SCIM server)</small>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={config.useCorsProxy || false}
              onChange={(e) => handleInputChange('useCorsProxy', e.target.checked)}
              data-testid="cors-proxy-checkbox"
            />
            Use CORS Proxy
          </label>
          <small>Enable if you need to bypass CORS restrictions</small>
        </div>

        {config.useCorsProxy && (
          <div className="form-group">
            <label htmlFor="corsProxyUrl">CORS Proxy URL:</label>
            <input
              type="text"
              id="corsProxyUrl"
              name="corsProxyUrl"
              value={config.corsProxyUrl || '/proxy'}
              onChange={(e) => handleInputChange('corsProxyUrl', e.target.value)}
              placeholder="/proxy or https://cors-proxy.com/proxy"
              data-testid="cors-proxy-url-input"
            />
            {corsProxyError && (
              <div className="error-message" role="alert">
                {corsProxyError}
              </div>
            )}
            <small>URL of your CORS proxy server (can be relative like /proxy or full URL)</small>
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            disabled={isSubmitting || !config.endpoint?.trim() || corsProxyError}
            data-testid="save-config-button"
          >
            {isSubmitting ? 'Saving...' : 'Save Configuration'}
          </button>
          
          <button
            type="button"
            onClick={handleClearCache}
            disabled={isClearing}
            className="clear-cache-button"
            data-testid="clear-cache-button"
          >
            {isClearing ? 'Clearing...' : 'Clear Cache'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConfigForm; 