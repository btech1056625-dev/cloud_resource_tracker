// Base URL of your backend (EC2 or local server)
const API_BASE_URL = "https://cloud-resource-tracker.duckdns.org/cloud_resource_tracker/";

// ===== UTILITY FUNCTIONS =====

/**
 * Check if stored token is expired
 */
function isTokenExpired() {
    const tokenExpiry = localStorage.getItem("tokenExpiry");
    if (!tokenExpiry) return true;
    return parseInt(tokenExpiry) < Date.now();
}

/**
 * Verify token exists and is valid before making API calls
 */
function getValidToken() {
    const token = localStorage.getItem("idToken");
    if (!token) {
        console.warn("⚠️ No token found - redirecting to login");
        window.location.href = "/index.html";
        return null;
    }
    
    if (isTokenExpired()) {
        console.warn("⚠️ Token expired - force logout");
        logout();
        return null;
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
        const token = getValidToken();
        if (!token) return { success: false, data: [], message: "Authentication required" };

        const response = await fetch(`${API_BASE_URL}get_resource.php`, {
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
        
        const token = getValidToken();
        if (!token) return { success: false, message: "Authentication required" };
        
        const response = await fetch(`${API_BASE_URL}add_resource.php`, {
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
        const token = getValidToken();
        if (!token) return { success: false, data: [], message: "Authentication required" };
        
        const response = await fetch(`${API_BASE_URL}get_cost_by_service.php`, {
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
        const token = getValidToken();
        if (!token) return { success: false, message: "Authentication required" };
        
        const response = await fetch(`${API_BASE_URL}get_summary_status.php`, {
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
        
        const token = getValidToken();
        if (!token) return { success: false, message: "Authentication required" };
        
        const response = await fetch(`${API_BASE_URL}delete_resource.php`, {
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