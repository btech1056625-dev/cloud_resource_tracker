<?php
require 'db.php';
require 'auth.php'; 
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$data = json_decode(file_get_contents("php://input"));
if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
    exit;
}

if (!isset($current_user_id)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

// Frontend uses: resource_name, service_type, provider, monthly_cost
if (
    isset($data->resource_name, $data->service_type) &&
    !empty($data->resource_name) &&
    !empty($data->service_type)
) {
    $cost = (isset($data->monthly_cost) && is_numeric($data->monthly_cost))
        ? (float)$data->monthly_cost
        : 0.00;

    try {
        $pdo->beginTransaction();

        // 1. Insert into resources using correct DB columns
        $db_service_name = trim($data->resource_name); // UI Resource Name -> DB service_name
        $db_instance_type = trim($data->service_type); // UI Service Type -> DB instance_type
        $db_region = isset($data->provider) ? trim($data->provider) : 'AWS'; // UI Provider -> DB region
        $status = 'active';

        $stmt = $pdo->prepare("INSERT INTO resources (user_id, service_name, instance_type, region, monthly_cost, status) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$current_user_id, $db_service_name, $db_instance_type, $db_region, $cost, $status]);
        
        // 2. Update cost_summary table (Grouped by Service Type)
        // We use $db_instance_type (the service type like EC2) to group costs in the summary
        $checkCost = $pdo->prepare("SELECT summary_id FROM cost_summary WHERE user_id = ? AND service_name = ?");
        $checkCost->execute([$current_user_id, $db_instance_type]);
        
        if ($checkCost->rowCount() > 0) {
            $updateCost = $pdo->prepare("UPDATE cost_summary SET total_cost = total_cost + ? WHERE user_id = ? AND service_name = ?");
            $updateCost->execute([$cost, $current_user_id, $db_instance_type]);
        } else {
            $insertCost = $pdo->prepare("INSERT INTO cost_summary (user_id, service_name, total_cost) VALUES (?, ?, ?)");
            $insertCost->execute([$current_user_id, $db_instance_type, $cost]);
        }

        $pdo->commit();
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Resource added successfully.']);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Unable to add resource.', 'details' => $e->getMessage()]);
    }
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Incomplete data. resource_name and service_type are required.']);
}
?>