// Base URL of your backend (EC2 or local server)
const API_BASE_URL = "http://13.237.72.150/cloud_resource_tracker/";

// ----------------------------
// Get all resources
// ----------------------------
async function getResources() {

    const token = localStorage.getItem("idToken");

    const response = await fetch(`${API_BASE_URL}get_resources.php`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    return response.json();
}

// ----------------------------
// Add a new resource
// ----------------------------
async function addResource(resourceData) {
    try {
        const token = localStorage.getItem("idToken");
        const response = await fetch(API_BASE_URL + "add_resource.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(resourceData)
        });

        return await response.json();
    } catch (error) {
        console.error("Error adding resource:", error);
        return { success: false, message: error.message };
    }
}

// ----------------------------
// Get cost by service
// ----------------------------
async function getCostByService() {
    try {
        const token = localStorage.getItem("idToken");
        const response = await fetch(API_BASE_URL + "get_cost_by_service.php", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching cost summary:", error);
        return { success: false, message: error.message };
    }
}

// ----------------------------
// Get resource status summary
// ----------------------------
async function getStatusSummary() {
    try {
        const response = await fetch(API_BASE_URL + "get_status_summary.php");
        return await response.json();
    } catch (error) {
        console.error("Error fetching status summary:", error);
    }
}

// ----------------------------
// Delete resource
// ----------------------------
async function deleteResource(resourceId) {
    try {
        const response = await fetch(API_BASE_URL + "delete_resource.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                resource_id: resourceId
            })
        });

        return await response.json();
    } catch (error) {
        console.error("Error deleting resource:", error);
    }
}