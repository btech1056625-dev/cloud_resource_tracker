// Base URL of your backend (EC2 or local server)
const API_BASE_URL = "http://13.237.72.150/cloud_resource_tracker/";

// ----------------------------
// Get all resources
// ----------------------------
export async function getResources() {
    try {
        const response = await fetch(API_BASE_URL + "get_resources.php");
        return await response.json();
    } catch (error) {
        console.error("Error fetching resources:", error);
    }
}

// ----------------------------
// Add a new resource
// ----------------------------
export async function addResource(resourceData) {
    try {
        const response = await fetch(API_BASE_URL + "add_resource.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(resourceData)
        });

        return await response.json();
    } catch (error) {
        console.error("Error adding resource:", error);
    }
}

// ----------------------------
// Get cost by service
// ----------------------------
export async function getCostByService() {
    try {
        const response = await fetch(API_BASE_URL + "get_cost_by_service.php");
        return await response.json();
    } catch (error) {
        console.error("Error fetching cost summary:", error);
    }
}

// ----------------------------
// Get resource status summary
// ----------------------------
export async function getStatusSummary() {
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
export async function deleteResource(resourceId) {
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