# Standards Based Single Page Application SCIM Client (SBSPASCIMC) 

I wanted a simple web interface for browsing SCIM servers, so I used AI tools to write this frontend.

**This project primarily contains AI generated code, with some pieces I had to do because the AI was incapable of figuring it out.**
- I am a strong believer that AI generated images, code, writing, and everything else should be called out.
- Full disclosure: I am completely inept at frontend code.
- Yes, the AI also wrote the documentation (ain't got time for that)

## What This Is

- **Unified Architecture**: Centralized configuration and shared utilities
- **Component System**: Reusable UI components with consistent patterns
- **SCIM 2.0 Compliant**: Full support for RFC 7643/7644 specifications
- **Developer Focused**: Clean, maintainable code for SCIM testing and development

## Features

- **User Management**: View, filter, search, create, edit, delete users
- **Group Management**: View, search, create, edit, delete groups  
- **Role Management**: View, search, create, edit, delete roles
- **Entitlement Management**: View, edit, delete entitlements
- **Server Configuration**: View SCIM server capabilities and schemas
- **Settings Management**: Configure SCIM endpoint, API key, and CORS proxy
- **Request/Response Logging**: Comprehensive HTTP request/response logging with performance metrics
- **Enhanced Error Handling**: SCIM-specific error parsing with RFC context and actionable guidance
- **Developer Tools**: Raw request/response viewing, performance statistics, and debugging information

## Architecture

### Unified Component System
- **Centralized Configuration**: Single source of truth for all settings (`config.js`)
- **Shared Utilities**: Common functionality centralized (`utils.js`)
- **Component Framework**: Reusable base classes and patterns (`components.js`)
- **Consistent UI**: Unified styling and behavior across all components

### Modular Design
- **Base Components**: `BaseListComponent`, `ModalManager`, `FormFieldRenderer`
- **Resource-Specific Components**: Specialized components for each SCIM resource type
- **Shared Utilities**: DOM manipulation, validation, error handling, storage
- **Configuration-Driven**: Components adapt to server schemas automatically

### SCIM Compliance
- **Server-Assigned IDs**: Properly handles immutable server-assigned identifiers
- **Mutability Requirements**: Respects schema mutability specifications
- **RFC 7643/7644**: Full compliance with SCIM 2.0 specifications
- **Error Handling**: Comprehensive error parsing with RFC context

## Getting Started

1. **Start the container**:
   ```bash
   docker-compose up -d
   ```

2. **Visit the app**:
   ```
   http://localhost:8001
   ```

3. **Configure SCIM endpoint**:
   - Go to Settings
   - Enter your SCIM endpoint URL
   - Enter your API key
   - Enable CORS proxy if needed
   - Save settings

## CORS Proxy Configuration

The application includes a built-in CORS proxy for development and testing:

### How It Works
- **Nginx Configuration**: Routes `/proxy/` requests to Python proxy
- **Python Proxy**: Validates and forwards HTTPS requests with CORS headers
- **Security**: Only accepts HTTPS URLs with proper validation

### Configuration
```nginx
# nginx.conf - CORS proxy routing
location /proxy/ {
    proxy_pass http://127.0.0.1:8002$request_uri;
    # ... headers and timeouts
}
```

### Usage
- **Direct**: `http://127.0.0.1:8002/proxy/https://api.example.com/endpoint`
- **Through Nginx**: `http://localhost/proxy/https://api.example.com/endpoint`

### Security Features
- **HTTPS Only**: Only accepts HTTPS URLs for security
- **URL Validation**: Regex validation of target URLs
- **IP Restrictions**: Only allows localhost and private networks
- **Rate Limiting**: Prevents abuse with request limits
- **Content Type Validation**: Restricts allowed content types

## File Structure

```
├── index.html                    # Main HTML entry point
├── css/
│   ├── main.css                 # Layout and base styles
│   ├── components.css           # Component-specific styles
│   └── accessibility.css        # Accessibility enhancements
├── js/
│   ├── config.js               # Centralized configuration
│   ├── utils.js                # Shared utility functions
│   ├── components.js           # Unified component system
│   ├── app.js                  # Main application logic
│   ├── scim-client.js          # SCIM API client
│   ├── ui-components.js        # Reusable UI components
│   ├── shared-list-utils.js    # Shared list functionality
│   ├── user-list.js            # User list component
│   ├── group-list.js           # Group list component
│   ├── role-list.js            # Role list component
│   ├── entitlement-list.js     # Entitlement list component
│   ├── user-create-modal.js    # User creation modal
│   ├── group-create-modal.js   # Group creation modal
│   ├── role-create-modal.js    # Role creation modal
│   ├── entitlement-create-modal.js # Entitlement creation modal
│   ├── user-edit-form.js       # User edit form
│   ├── group-edit-form.js      # Group edit form
│   ├── role-edit-form.js       # Role edit form
│   ├── entitlement-edit-form.js # Entitlement edit form
│   ├── user-form.js            # User form utilities
│   ├── group-form.js           # Group form utilities
│   ├── role-form.js            # Role form utilities
│   ├── entitlement-form.js     # Entitlement form utilities
│   ├── server-info.js          # Server configuration display
│   └── scim-rfc-schemas.js    # SCIM RFC compliance validation
├── simple-cors-proxy.py        # CORS proxy for development
├── docker-compose.yml          # Development environment
└── Dockerfile                  # Container configuration
```

## Component Architecture

### Core Components
- **`BaseListComponent`**: Common list functionality (pagination, search, filtering)
- **`ModalManager`**: Consistent modal behavior and lifecycle
- **`FormFieldRenderer`**: Schema-driven form field rendering
- **`SchemaAttributeProcessor`**: Server schema attribute processing

### Resource-Specific Components
Each SCIM resource type has specialized components:
- **List Components**: Display and manage resource lists
- **Create Modals**: Create new resources with validation
- **Edit Forms**: Edit existing resources with schema compliance
- **Form Utilities**: Resource-specific form handling

### Configuration System
- **`APP_CONFIG`**: Application-wide settings and constants
- **`UI_CONFIG`**: CSS classes and UI component settings
- **`FORM_CONFIG`**: Form validation and field configuration
- **`RESOURCE_CONFIG`**: Resource-specific settings and schemas
- **`SCIM_CONFIG`**: SCIM specification compliance settings

## Development

### Making Changes
1. Edit JavaScript files in `js/` directory
2. Rebuild container: `docker-compose down && docker-compose up -d --build`
3. Visit `http://localhost:8001`

### Component Development
- **New Components**: Extend base classes for consistency
- **Configuration**: Add settings to appropriate config sections
- **Utilities**: Use shared utilities for common operations
- **Validation**: Follow established validation patterns

## Common Issues

### Page not loading
- **Check**: Docker container is running (`docker ps`)
- **Solution**: Restart container (`docker-compose up -d`)

### Changes not appearing
- **Check**: Container needs rebuild after code changes
- **Solution**: `docker-compose down && docker-compose up -d --build`

### Modal issues
- **Check**: Browser console for JavaScript errors
- **Common**: Method name mismatches in edit forms
- **Specific**: `this.bindEvents is not a function` - check constructor calls

### SCIM errors
- **Check**: Endpoint configuration and API key in Settings
- **Verify**: Server is accessible and returning proper responses
- **Common**: `onSubmit must be a function` - ensure edit forms receive proper callback functions

### Schema-related issues
- **Check**: Server provides schemas via `/Schemas` endpoint
- **Verify**: API key has proper permissions
- **Fallback**: Application uses minimal schemas if server doesn't provide them
- **Common**: `SCIM Schema not available from server` - check SCIM endpoint URL format and API key

### localStorage quota exceeded
- **Check**: Request logs filling up storage
- **Solution**: Application automatically reduces log limit to prevent issues
- **Manual**: Clear browser storage if needed

### JSON rendering errors
- **Common**: `[object Object]` or `Failed to render JSON: data is required`
- **Cause**: Complex objects (arrays, nested objects) not properly formatted
- **Solution**: Application uses `safeRenderJSON()` utility for null/undefined handling

## Development Lessons Learned

### Architectural Mistakes to Avoid

#### 1. Code Duplication
- **Mistake**: Implementing the same logic in multiple files (e.g., JSON formatting, null checks)
- **Solution**: Create shared utility functions in `utils.js`
- **Examples**: `formatReadonlyValue()`, `safeRenderJSON()`, `fetchSchemaForResource()`

#### 2. Inconsistent Method Names
- **Mistake**: Importing `bindFormEvents` but calling `bindEvents` in constructor
- **Solution**: Use consistent naming across imports and method calls
- **Pattern**: Import name should match the actual method name

#### 3. Function Parameter Errors
- **Mistake**: Passing SCIMClient object instead of callback function to edit forms
- **Solution**: Pass proper async callback functions: `async (formData) => { return await client.updateUser(formData); }`

#### 4. SCIM Response Format Assumptions
- **Mistake**: Assuming direct arrays instead of ListResponse format `{ Resources: [...] }`
- **Solution**: Always check for `response.Resources` first in SCIM client methods

#### 5. localStorage Management
- **Mistake**: Overly complex retry logic and dynamic limits
- **Solution**: Simple error handling with automatic log reduction

#### 6. Configuration Hardcoding
- **Mistake**: Attempting to hardcode API keys in Docker environment variables
- **Solution**: Use localStorage for user-configurable settings, Docker for infrastructure only

### Best Practices Established

#### 1. DRY Principle
- **Rule**: Never duplicate logic across multiple files
- **Implementation**: Shared utilities in `utils.js` for common operations
- **Examples**: JSON rendering, schema fetching, error handling

#### 2. Consistent Error Handling
- **Pattern**: Use `safeAsync()` wrapper for all async operations
- **Display**: Use `showError()` component for user-facing errors
- **Logging**: Comprehensive error context with SCIM RFC references

#### 3. Schema-Driven Development
- **Approach**: Let server schemas drive form generation
- **Fallback**: Graceful degradation to minimal schemas
- **Validation**: Respect schema mutability and validation rules

#### 4. Component Architecture
- **Base Classes**: Extend `BaseListComponent`, `ModalManager` for consistency
- **Configuration**: Use centralized config objects
- **Utilities**: Leverage shared utilities for common operations

### Common Debugging Patterns

#### 1. Schema Issues
```javascript
// Check if schemas are being fetched correctly
console.log('Schemas:', await client.getSchemas());
console.log('Resource Types:', await client.getResourceTypes());
```

#### 2. Form Submission Issues
```javascript
// Ensure proper callback function
const onSubmit = async (formData) => {
  return await client.updateUser(formData);
};
```

#### 3. JSON Rendering Issues
```javascript
// Use safe rendering utility
safeRenderJSON(container, data, '(empty)');
```

#### 4. localStorage Issues
```javascript
// Check storage usage
console.log('localStorage usage:', JSON.stringify(localStorage).length);
```

## SCIM 2.0 Compliance

### Server-Assigned IDs
- **Immutable IDs**: Server-assigned IDs are preserved and never editable
- **Creation Process**: Server assigns unique ID during resource creation
- **Update Process**: Server-assigned ID is preserved during updates
- **Display**: Server-assigned fields shown as readonly

### Mutability Requirements
- **Schema Compliance**: Forms respect schema mutability specifications
- **Read-Only Fields**: Fields marked as read-only are properly excluded
- **Immutable Fields**: Server-assigned fields cannot be modified
- **Validation**: Proper validation of field mutability requirements

### RFC Compliance
- **RFC 7643**: Core SCIM schema compliance
- **RFC 7644**: Service provider configuration compliance
- **Error Handling**: RFC-compliant error parsing and display
- **Request/Response**: Full SCIM request/response visibility

## Why This Architecture

The refactored architecture provides:

- **Maintainability**: Centralized configuration and shared utilities
- **Consistency**: Unified component patterns across all resources
- **Scalability**: Easy to add new resource types and features
- **Compliance**: Full SCIM 2.0 specification compliance
- **Developer Experience**: Clean, predictable code structure
- **Error Handling**: Comprehensive error parsing and user feedback
- **Security**: XSS protection and input validation throughout

The unified component system makes the codebase more maintainable, consistent, and compliant with SCIM specifications while providing a better developer experience. 

## Schema Handling

The application automatically fetches and uses server schemas for form generation:

### Schema Sources
- **Server Schemas**: Fetched from `/Schemas` endpoint
- **Resource Types**: Fetched from `/ResourceTypes` endpoint  
- **Fallback Schemas**: Minimal schemas when server doesn't provide them

### Schema Usage
- **Form Generation**: Edit forms use server schemas for field validation
- **Attribute Display**: Forms show only schema-defined attributes
- **Mutability**: Respects schema mutability requirements
- **Validation**: Uses schema-defined validation rules

### Schema Fetching
- **Automatic**: Schemas fetched when editing resources
- **Caching**: Schemas cached for performance
- **Error Handling**: Graceful fallback to minimal schemas
- **Utility Function**: `fetchSchemaForResource()` handles schema retrieval 
