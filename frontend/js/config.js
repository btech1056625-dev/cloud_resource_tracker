/**
 * Cloud Resource Tracker - Centralized Frontend Configuration
 * Provides environment-aware API endpoints and Cognito credentials
 */

class FrontendConfig {
    /**
     * Detect current environment and determine API base URL
     */
    static getApiBaseUrl() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const port = window.location.port ? `:${window.location.port}` : '';
        
        // Local development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `http://${hostname}:8000`;
        }
        
        // Production - duckdns
        if (hostname === 'cloud-resource-tracker.duckdns.org') {
            return 'https://cloud-resource-tracker.duckdns.org';
        }
        
        // Amplify hosted
        if (hostname.includes('amplifyapp.com')) {
            return 'https://cloud-resource-tracker.duckdns.org';
        }
        
        // Fallback to development server
        return 'http://localhost:8000';
    }

    /**
     * Get backend API URL (typically /backend endpoint)
     */
    static getBackendUrl() {
        return `${this.getApiBaseUrl()}/backend`;
    }

    /**
     * Get specific endpoint URL
     */
    static getEndpointUrl(endpoint) {
        return `${this.getBackendUrl()}${endpoint}`;
    }
}

/**
 * Cognito Configuration
 * These values are non-sensitive (public) configuration
 */
const COGNITO_CONFIG = {
    userPoolId: 'ap-southeast-2_ZMufTlAjo',
    clientId: '6tkb0i2gbosk9j00f4ue3rq5ca',
    region: 'ap-southeast-2',
    cognitoDomain: 'ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com',
};

/**
 * API Endpoints Configuration
 * Uses FrontendConfig to get dynamic base URL
 */
const API_CONFIG = {
    baseUrl: FrontendConfig.getApiBaseUrl(),
    backendUrl: FrontendConfig.getBackendUrl(),
    
    // Authentication endpoints
    signup: '/backend/signup.php',
    confirmSignup: '/backend/confirm-signup.php',
    resendCode: '/backend/resend-confirmation-code.php',
    auth: '/backend/auth.php',
    
    // Resource endpoints
    getResources: '/get_resource.php',
    addResource: '/add_resource.php',
    deleteResource: '/delete_resource.php',
    getCostSummary: '/get_summary_status.php',
    getCostByService: '/get_cost_by_service.php',
    
    /**
     * Build full URL for API endpoint
     */
    getUrl(endpoint) {
        // If endpoint already has base path, use it directly
        if (endpoint.startsWith('http')) {
            return endpoint;
        }
        
        // Otherwise, append to base URL
        return `${this.baseUrl}${endpoint}`;
    },
    
    /**
     * Build full URL for backend endpoint
     */
    getBackendUrl(endpoint) {
        return `${this.backendUrl}${endpoint}`;
    },
    
    /**
     * Build full URL for resource endpoint
     */
    getResourceUrl(endpoint) {
        return `${this.baseUrl}${endpoint}`;
    }
};

// Log configuration on load for debugging
console.log('🔧 FrontendConfig initialized');
console.log('  API Base URL:', API_CONFIG.baseUrl);
console.log('  Backend URL:', API_CONFIG.backendUrl);
console.log('  Cognito Domain:', COGNITO_CONFIG.cognitoDomain);

