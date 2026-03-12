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

    // Total resources
    $totalStmt = $pdo->prepare("SELECT COUNT(*) FROM resources WHERE user_id = ?");
    $totalStmt->execute([$current_user_id]);
    $totalResources = (int)$totalStmt->fetchColumn();

    // Active resources
    $activeStmt = $pdo->prepare("SELECT COUNT(*) FROM resources WHERE user_id = ? AND status = 'active'");
    $activeStmt->execute([$current_user_id]);
    $activeResources = (int)$activeStmt->fetchColumn();

    // Total cost
    $costStmt = $pdo->prepare("SELECT COALESCE(SUM(total_cost), 0) FROM cost_summary WHERE user_id = ?");
    $costStmt->execute([$current_user_id]);
    $totalCost = (float)$costStmt->fetchColumn();

    // Status breakdown
    $statusStmt = $pdo->prepare("SELECT status, COUNT(*) AS count FROM resources WHERE user_id = ? GROUP BY status");
    $statusStmt->execute([$current_user_id]);
    $statusBreakdown = $statusStmt->fetchAll();

    http_response_code(200);
    echo json_encode([
        'success'         => true,
        'totalResources'  => $totalResources,
        'activeResources' => $activeResources,
        'totalCost'       => number_format($totalCost, 2, '.', ''),
        'criticalAlerts'  => 0,
        'resourceChange'  => '0%',
        'spendChange'     => '0%',
        'statusBreakdown' => $statusBreakdown,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to fetch status summary']);
}
?>