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

if (!isset($current_user_id)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

try {
    // Mapping DB columns to Frontend keys
    // service_name -> resource_name
    // instance_type -> service_type
    // region -> provider
    $stmt = $pdo->prepare("
        SELECT 
            resource_id, 
            service_name AS resource_name, 
            instance_type AS service_type, 
            region AS provider, 
            monthly_cost, 
            status, 
            created_at 
        FROM resources 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    ");
    $stmt->execute([$current_user_id]);
    $resources = $stmt->fetchAll();

    echo json_encode([
        'success'     => true,
        'total_count' => count($resources),
        'data'        => $resources
    ]);
} 
catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Failed to fetch resources",
        "details" => $e->getMessage()
    ]);
}   
?>