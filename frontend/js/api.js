/**
 * Cloud Resource Tracker - API Client Module
 * Uses centralized configuration from config.js
 * Handles authentication, CORS, and API calls to backend
 */

// Base URL of your backend - uses centralized config
// If config.js is not loaded, fallback to production URL
const API_BASE_URL = (typeof API_CONFIG !== 'undefined' && API_CONFIG.baseUrl) 
    ? API_CONFIG.baseUrl 
    : 'https://cloud-resource-tracker.duckdns.org';

console.log('📡 API Module initialized with base URL:', API_BASE_URL);

// ===== UTILITY FUNCTIONS =====

/**
 * Get the correct API endpoint URL based on current environment
 * Handles the '/backend' path or root-level endpoints
 */
function getApiEndpoint(endpoint) {
    // If endpoint already has protocol, use it as-is
    if (endpoint.startsWith('http')) {
        return endpoint;
    }
    
    // Always add a / before the endpoint if API_BASE_URL doesn't end with one
    const separator = API_BASE_URL.endsWith('/') ? '' : '/';
    return `${API_BASE_URL}${separator}${endpoint}`;
}

/**
 * Check if stored token is expired
 */
function isTokenExpired() {
    const tokenExpiry = localStorage.getItem("tokenExpiry");
    if (!tokenExpiry) return true;
    return parseInt(tokenExpiry) < Date.now();
}

/**
 * Get valid token - checks expiration before making API calls
 * Calls getValidToken() from auth.js to validate token status
 */
function getValidTokenForApi() {
    const token = typeof getValidToken === 'function' 
        ? getValidToken() 
        : localStorage.getItem("idToken");
    
    if (!token) {
        throw new Error("No valid authentication token. Please log in again.");
    }
    
    return token;
}

/**
 * Handle API response validation
 */
async function handleApiResponse(response) {
    if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            // Response is not JSON, use status text
            errorMessage = response.statusText || errorMessage;
        }
        
        // If 401 Unauthorized, user token is invalid - logout
        if (response.status === 401) {
            console.error("❌ Authentication failed - logging out");
            logout();
            throw new Error("Session expired. Please log in again.");
        }
        
        throw new Error(errorMessage);
    }
    
    try {
        return await response.json();
    } catch (e) {
        throw new Error("Invalid response format from server");
    }
}

// ----------------------------
// Get all resources
// ----------------------------
async function getResources() {
    try {
        const token = getValidTokenForApi();
        if (!token) return { success: false, data: [], message: "Authentication required" };

        const response = await fetch(getApiEndpoint('get_resource.php'), {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });

        return await handleApiResponse(response);
        
    } catch (error) {
        console.error("❌ Error fetching resources:", error.message);
        return { success: false, data: [], message: error.message };
    }
}

// ----------------------------
// Add a new resource
// ----------------------------
async function addResource(resourceData) {
    try {
        // Validate input
        if (!resourceData.resource_name || resourceData.resource_name.trim() === "") {
            throw new Error("Resource name is required");
        }
        if (!resourceData.service_type) {
            throw new Error("Service type is required");
        }
        if (isNaN(resourceData.monthly_cost) || resourceData.monthly_cost < 0) {
            throw new Error("Monthly cost must be a valid positive number");
        }
        if (!resourceData.provider) {
            throw new Error("Provider is required");
        }
        
        const token = getValidTokenForApi();
        if (!token) return { success: false, message: "Authentication required" };
        
        const response = await fetch(getApiEndpoint('add_resource.php'), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            },
            body: JSON.stringify(resourceData)
        });

        return await handleApiResponse(response);
        
    } catch (error) {
        console.error("❌ Error adding resource:", error.message);
        return { success: false, message: error.message };
    }
}

// ----------------------------
// Get cost by service
// ----------------------------
async function getCostByService() {
    try {
        const token = getValidTokenForApi();
        if (!token) return { success: false, data: [], message: "Authentication required" };
        
        const response = await fetch(getApiEndpoint('get_cost_by_service.php'), {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });
        
        return await handleApiResponse(response);
        
    } catch (error) {
        console.error("❌ Error fetching cost summary:", error.message);
        return { success: false, data: [], message: error.message };
    }
}

// ----------------------------
// Get resource status summary
// ----------------------------
async function getStatusSummary() {
    try {
        const token = getValidTokenForApi();
        if (!token) return { success: false, message: "Authentication required" };
        
        const response = await fetch(getApiEndpoint('get_summary_status.php'), {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });
        
        return await handleApiResponse(response);
        
    } catch (error) {
        console.error("❌ Error fetching status summary:", error.message);
        return { success: false, message: error.message };
    }
}

// ----------------------------
// Delete resource
// ----------------------------
async function deleteResource(resourceId) {
    try {
        // Validate input
        if (!resourceId || resourceId.toString().trim() === "") {
            throw new Error("Resource ID is required");
        }
        
        const token = getValidTokenForApi();
        if (!token) return { success: false, message: "Authentication required" };
        
        const response = await fetch(getApiEndpoint('delete_resource.php'), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            },
            body: JSON.stringify({
                resource_id: String(resourceId)
            })
        });

        return await handleApiResponse(response);
        
    } catch (error) {
        console.error("❌ Error deleting resource:", error.message);
        return { success: false, message: error.message };
    }
}