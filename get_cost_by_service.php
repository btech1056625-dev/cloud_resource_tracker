<?php
require 'db.php';
require 'auth.php';

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if (!isset($current_user_id)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

try {

    $stmt = $pdo->prepare(
        "SELECT service_name, total_cost 
         FROM cost_summary 
         WHERE user_id = ?"
    );

    $stmt->execute([$current_user_id]);
    $costs = $stmt->fetchAll();

    $grand_total = 0;

    foreach ($costs as $cost) {
        $grand_total += (float)$cost['total_cost'];
    }

    echo json_encode([
        'total_monthly_cost' => number_format($grand_total, 2, '.', ''),
        'breakdown' => $costs
    ]);

} catch (Exception $e) {

    http_response_code(500);

    echo json_encode([
        'error' => 'Failed to fetch cost summary'
    ]);
}
?>