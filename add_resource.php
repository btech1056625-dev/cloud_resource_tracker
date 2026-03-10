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
    echo json_encode(['error' => 'Invalid JSON input']);
    exit;
}

if (!$current_user_id) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

if (
    isset($data->service_name, $data->instance_type, $data->region, $data->status) &&
    !empty($data->service_name) &&
    !empty($data->instance_type) &&
    !empty($data->region) &&
    !empty($data->status)
) {
    $cost = (isset($data->monthly_cost) && is_numeric($data->monthly_cost))
        ? (float)$data->monthly_cost
        : 0.00;
}

    try {
        $pdo->beginTransaction();

        // 1. Insert into resources
        $service_name = trim($data->service_name);
        $instance_type = trim($data->instance_type);
        $region = trim($data->region);
        $status = trim($data->status);
        $stmt = $pdo->prepare("INSERT INTO resources (user_id, service_name, instance_type, region, monthly_cost, status) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$current_user_id, $service_name, $instance_type, $region, $cost, $status]);
        
        // 2. Update cost_summary table
        $checkCost = $pdo->prepare("SELECT summary_id FROM cost_summary WHERE user_id = ? AND service_name = ?");
        $checkCost->execute([$current_user_id, $service_name]);
        
        if ($checkCost->rowCount() > 0) {
            $updateCost = $pdo->prepare("UPDATE cost_summary SET total_cost = total_cost + ? WHERE user_id = ? AND service_name = ?");
            $updateCost->execute([$cost, $current_user_id, $service_name]);
        } else {
            $insertCost = $pdo->prepare("INSERT INTO cost_summary (user_id, service_name, total_cost) VALUES (?, ?, ?)");
            $insertCost->execute([$current_user_id, $service_name, $cost]);
        }

        $pdo->commit();
        http_response_code(201);
        echo json_encode(['message' => 'Resource added successfully.']);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(503);
        echo json_encode(['error' => 'Unable to add resource.', 'details' => $e->getMessage()]);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Incomplete data. service_name, instance_type, region, and status are required.']);
}
?>