// js/server-info.js
// Enhanced server capability visualization for developers

import { checkRFCCompliance } from './scim-rfc-schemas.js';

export function renderServerCapabilities(container, serverConfig, resourceTypes, schemas) {
  // Check RFC compliance
  const complianceChecks = serverConfig ? checkRFCCompliance(serverConfig, 'ServiceProviderConfig') : [];
  
  container.innerHTML = `
    <div class="server-info">
      <h2>SCIM Server Capabilities</h2>
      <p class="info-description">Developer-focused view of server capabilities and RFC compliance status.</p>
      
      <div class="capability-section">
        <h3>🔍 RFC Compliance Status</h3>
        <div class="compliance-status">
          ${serverConfig ? 
            '<span class="status compliant">✅ RFC 7644 §4.4 Compliant - ServiceProviderConfig endpoint available</span>' :
            '<span class="status non-compliant">❌ RFC 7644 §4.4 Non-Compliant - Missing ServiceProviderConfig endpoint</span>'
          }
        </div>
        ${complianceChecks.length > 0 ? `
          <div class="compliance-details">
            ${complianceChecks.map(check => `
              <div class="compliance-item ${check.status.toLowerCase()}">
                <strong>${check.type}:</strong> ${check.status}
                ${check.issues ? `
                  <details class="compliance-details-expanded">
                    <summary>Show Issues</summary>
                    <ul class="compliance-issues-list">
                      ${check.issues.map(issue => `<li>${issue.path}: ${issue.message}</li>`).join('')}
                    </ul>
                  </details>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
      
      <div class="capability-section">
        <h3>📋 Supported Resources</h3>
        <div class="resource-list">
          ${resourceTypes && resourceTypes.length > 0 ? 
            resourceTypes.map(rt => `
              <div class="resource-item">
                <div class="resource-header">
                  <strong>${rt.name}</strong>
                  <span class="resource-schema">${rt.schema}</span>
                </div>
                <div class="resource-description">${rt.description || 'No description available'}</div>
                <div class="resource-details">
                  <small>Endpoint: <code>${rt.endpoint}</code></small>
                  ${rt.schemaExtensions ? `
                    <br><small>Extensions: ${rt.schemaExtensions.map(ext => ext.schema).join(', ')}</small>
                  ` : ''}
                </div>
              </div>
            `).join('') :
            '<div class="no-resources">No resource types discovered</div>'
          }
        </div>
      </div>
      
      ${serverConfig ? `
        <div class="capability-section">
          <h3>⚙️ Server Features</h3>
          <div class="features-grid">
            <div class="feature-item ${serverConfig.patch?.supported ? 'supported' : 'not-supported'}">
              <span class="feature-icon">${serverConfig.patch?.supported ? '✅' : '❌'}</span>
              <span class="feature-name">Patch Operations</span>
              <span class="feature-desc">RFC 7644 §3.5.2</span>
            </div>
            <div class="feature-item ${serverConfig.bulk?.supported ? 'supported' : 'not-supported'}">
              <span class="feature-icon">${serverConfig.bulk?.supported ? '✅' : '❌'}</span>
              <span class="feature-name">Bulk Operations</span>
              <span class="feature-desc">RFC 7644 §3.7 (Max: ${serverConfig.bulk?.maxOperations || 'N/A'})</span>
            </div>
            <div class="feature-item ${serverConfig.filter?.supported ? 'supported' : 'not-supported'}">
              <span class="feature-icon">${serverConfig.filter?.supported ? '✅' : '❌'}</span>
              <span class="feature-name">Filtering</span>
              <span class="feature-desc">RFC 7644 §3.4.2.2 (Max: ${serverConfig.filter?.maxResults || 'N/A'})</span>
            </div>
            <div class="feature-item ${serverConfig.sort?.supported ? 'supported' : 'not-supported'}">
              <span class="feature-icon">${serverConfig.sort?.supported ? '✅' : '❌'}</span>
              <span class="feature-name">Sorting</span>
              <span class="feature-desc">RFC 7644 §3.4.2.3</span>
            </div>
            <div class="feature-item ${serverConfig.changePassword?.supported ? 'supported' : 'not-supported'}">
              <span class="feature-icon">${serverConfig.changePassword?.supported ? '✅' : '❌'}</span>
              <span class="feature-name">Change Password</span>
              <span class="feature-desc">RFC 7644 §3.5.1</span>
            </div>
            <div class="feature-item ${serverConfig.etag?.supported ? 'supported' : 'not-supported'}">
              <span class="feature-icon">${serverConfig.etag?.supported ? '✅' : '❌'}</span>
              <span class="feature-name">ETags</span>
              <span class="feature-desc">RFC 7644 §3.11</span>
            </div>
          </div>
        </div>
        
        <div class="capability-section">
          <h3>🔐 Authentication Schemes</h3>
          <div class="auth-schemes">
            ${serverConfig.authenticationSchemes && serverConfig.authenticationSchemes.length > 0 ?
              serverConfig.authenticationSchemes.map(scheme => `
                <div class="auth-scheme">
                  <div class="scheme-header">
                    <strong>${scheme.name}</strong>
                    <span class="scheme-type">${scheme.type}</span>
                  </div>
                  <div class="scheme-description">${scheme.description || 'No description available'}</div>
                </div>
              `).join('') :
              '<div class="no-auth">No authentication schemes specified</div>'
            }
          </div>
        </div>
      ` : ''}
      
      <div class="capability-section">
        <h3>📊 Schema Information</h3>
        <div class="schema-info">
          ${schemas && schemas.length > 0 ?
            `<div class="schema-count">${schemas.length} schema(s) available</div>
             <div class="schema-list">
               ${schemas.map(schema => `
                 <div class="schema-item">
                   <div class="schema-id">${schema.id}</div>
                   <div class="schema-name">${schema.name || 'Unnamed Schema'}</div>
                   <div class="schema-description">${schema.description || 'No description available'}</div>
                 </div>
               `).join('')}
             </div>` :
            '<div class="no-schemas">No schemas discovered</div>'
          }
        </div>
      </div>
      
      <div class="capability-section">
        <h3>🔧 Raw Server Configuration</h3>
        <details>
          <summary>Show Raw ServiceProviderConfig</summary>
          <div class="raw-config">
            <pre>${JSON.stringify(serverConfig, null, 2)}</pre>
          </div>
        </details>
      </div>
    </div>
  `;
}