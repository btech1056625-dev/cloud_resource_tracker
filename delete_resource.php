<?php
require 'db.php';
require 'auth.php';

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Origin: *");
header("Access-Control-Methods: DELETE, OPTIONS");
header("Access-Control-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if (!isset($current_user_id)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input']);
    exit;
}

if (!empty($data->resource_id)) {

    try {

        $pdo->beginTransaction();

        $fetchStmt = $pdo->prepare(
            "SELECT resource_name, service_type, monthly_cost 
             FROM resources 
             WHERE resource_id = ? AND user_id = ?"
        );

        $fetchStmt->execute([$data->resource_id, $current_user_id]);
        $resource = $fetchStmt->fetch();

        if (!$resource) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Resource not found']);
            exit;
        }

        $delStmt = $pdo->prepare(
            "DELETE FROM resources WHERE resource_id = ? AND user_id = ?"
        );

        $delStmt->execute([$data->resource_id, $current_user_id]);

        $updateCost = $pdo->prepare(
            "UPDATE cost_summary
             SET total_cost = GREATEST(total_cost - ?, 0)
             WHERE user_id = ? AND service_name = ?"
        );

        $updateCost->execute([
            $resource['monthly_cost'],
            $current_user_id,
            $resource['service_type']
        ]);

        $pdo->commit();

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Resource deleted and cost updated'
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Unable to delete resource']);
    }

} else {
    http_response_code(400);
    echo json_encode(['error' => 'resource_id is required']);
}
?>