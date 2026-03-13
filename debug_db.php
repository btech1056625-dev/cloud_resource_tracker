<?php
require 'db.php';
header("Content-Type: application/json");

try {
    $stmt = $pdo->query("DESCRIBE resources");
    $columns = $stmt->fetchAll();
    
    $stmt2 = $pdo->query("DESCRIBE cost_summary");
    $cost_columns = $stmt2->fetchAll();

    echo json_encode([
        'success' => true,
        'resources_table' => $columns,
        'cost_summary_table' => $cost_columns
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
