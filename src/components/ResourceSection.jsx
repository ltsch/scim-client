import { useState, useEffect } from 'react';

/**
 * Resource section component for displaying SCIM resources (Users, Groups)
 * @param {Object} props - Component props
 * @param {string} props.title - Section title
 * @param {string} props.resourceType - Resource type ('Users', 'Groups')
 * @param {Object} props.apiClient - API client instance
 * @param {Object} props.config - Configuration object
 */
const ResourceSection = ({ title, resourceType, apiClient, config }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());

  const fetchResources = async () => {
    if (!config?.endpoint) {
      setError('No endpoint configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getResources(resourceType);
      
      if (response.success && response.data?.Resources) {
        setResources(response.data.Resources);
      } else if (response.success && Array.isArray(response.data)) {
        setResources(response.data);
      } else {
        setResources([]);
        if (!response.success) {
          setError(`Failed to fetch ${resourceType}: ${response.statusText || response.error}`);
        }
      }
    } catch (err) {
      setError(`Error fetching ${resourceType}: ${err.message}`);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (config?.endpoint) {
      fetchResources();
    }
  }, [config?.endpoint, resourceType]);

  const toggleExpanded = (id) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatJson = (data) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const getResourceId = (resource) => {
    return resource.id || resource.userName || resource.displayName || 'unknown';
  };

  return (
    <div className="resource-section" data-testid={`${resourceType.toLowerCase()}-section`}>
      <div className="section-header">
        <h2>{title}</h2>
        <div className="section-actions">
          <button 
            onClick={fetchResources} 
            disabled={loading}
            data-testid={`refresh-${resourceType.toLowerCase()}-button`}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-message">
          Loading {resourceType}...
        </div>
      )}

      {!loading && resources.length === 0 && !error && (
        <div className="no-resources">
          No {resourceType} found
        </div>
      )}

      {!loading && resources.length > 0 && (
        <div className="resources-list">
          {resources.map((resource, index) => {
            const id = getResourceId(resource);
            const isExpanded = expandedItems.has(id);
            
            return (
              <div key={id} className="resource-item" data-testid={`resource-item-${index}`}>
                <div className="resource-header">
                  <button
                    className="expand-button"
                    onClick={() => toggleExpanded(id)}
                    aria-expanded={isExpanded}
                    data-testid={`expand-${resourceType.toLowerCase()}-${index}`}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  <span className="resource-title">
                    {resource.displayName || resource.userName || resource.id || `Resource ${index + 1}`}
                  </span>
                  <span className="resource-id">ID: {resource.id || 'N/A'}</span>
                </div>
                
                {isExpanded && (
                  <div className="resource-details" data-testid={`resource-details-${index}`}>
                    <div className="json-viewer">
                      <h4>Resource Data:</h4>
                      <pre>{formatJson(resource)}</pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ResourceSection; 