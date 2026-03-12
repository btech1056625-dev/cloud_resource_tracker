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
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

try {

    // Fetch per-service costs - return as [{service, amount}] array to match app.js
    $stmt = $pdo->prepare(
        "SELECT service_name AS service, total_cost AS amount
         FROM cost_summary
         WHERE user_id = ?
         ORDER BY total_cost DESC"
    );

    $stmt->execute([$current_user_id]);
    $costs = $stmt->fetchAll();

    $grand_total = array_sum(array_column($costs, 'amount'));

    echo json_encode([
        'success'            => true,
        'total_monthly_cost' => number_format($grand_total, 2, '.', ''),
        'data'               => $costs
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to fetch cost summary']);
}
?>