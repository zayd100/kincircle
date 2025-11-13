<?php
require_once '../config.php';
requireLogin();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($method) {
        case 'GET':
            if ($action === 'events') {
                // Get events for a specific month/year
                $year = (int)($_GET['year'] ?? date('Y'));
                $month = (int)($_GET['month'] ?? date('n'));
                
                $startDate = sprintf('%04d-%02d-01', $year, $month);
                $endDate = date('Y-m-t', strtotime($startDate));
                
                $stmt = $pdo->prepare("
                    SELECT ce.*, u.display_name as created_by_name 
                    FROM calendar_events ce 
                    JOIN users u ON ce.created_by = u.id 
                    WHERE ce.event_date BETWEEN ? AND ?
                    ORDER BY ce.event_date ASC
                ");
                $stmt->execute([$startDate, $endDate]);
                $events = $stmt->fetchAll();
                
                // Format events by date
                $eventsByDate = [];
                foreach ($events as $event) {
                    $date = $event['event_date'];
                    if (!isset($eventsByDate[$date])) {
                        $eventsByDate[$date] = [];
                    }
                    $eventsByDate[$date][] = $event;
                }
                
                echo json_encode(['success' => true, 'events' => $eventsByDate]);
                
            } elseif ($action === 'upcoming') {
                // Get upcoming events
                $stmt = $pdo->prepare("
                    SELECT ce.*, u.display_name as created_by_name 
                    FROM calendar_events ce 
                    JOIN users u ON ce.created_by = u.id 
                    WHERE ce.event_date >= CURDATE() 
                    ORDER BY ce.event_date ASC 
                    LIMIT 10
                ");
                $stmt->execute();
                $events = $stmt->fetchAll();
                
                echo json_encode(['success' => true, 'events' => $events]);
                
            } elseif ($action === 'getEvents') {
                // Get all approved events for events tab
                $stmt = $pdo->prepare("
                    SELECT ce.*, u.display_name as created_by_name 
                    FROM calendar_events ce 
                    JOIN users u ON ce.created_by = u.id 
                    ORDER BY ce.event_date DESC
                ");
                $stmt->execute();
                $events = $stmt->fetchAll();
                
                echo json_encode(['success' => true, 'events' => $events]);
                
            } elseif ($action === 'admin_events') {
                // Get pending and approved events for admin management
                if (!isAdmin()) {
                    throw new Exception('Access denied');
                }
                
                // Get pending events from event_submissions
                $stmt = $pdo->prepare("
                    SELECT es.*, u.display_name as submitted_by_name
                    FROM event_submissions es
                    JOIN users u ON es.submitter_id = u.id
                    WHERE es.status = 'pending'
                    ORDER BY es.submitted_at DESC
                ");
                $stmt->execute();
                $pendingEvents = $stmt->fetchAll();
                
                // Get approved events from calendar_events  
                $stmt = $pdo->prepare("
                    SELECT ce.*, u.display_name as created_by_name 
                    FROM calendar_events ce 
                    JOIN users u ON ce.created_by = u.id 
                    ORDER BY ce.event_date DESC
                    LIMIT 20
                ");
                $stmt->execute();
                $approvedEvents = $stmt->fetchAll();
                
                echo json_encode([
                    'success' => true, 
                    'pending' => $pendingEvents,
                    'approved' => $approvedEvents
                ]);
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if ($action === 'add') {
                // Add new event - goes to submissions for moderation unless admin
                $title = sanitizeInput($input['title'] ?? '');
                $date = sanitizeInput($input['date'] ?? '');
                $description = sanitizeInput($input['description'] ?? '');
                
                if (!$title || !$date) {
                    throw new Exception('Title and date are required');
                }
                
                // Validate date format
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                    throw new Exception('Invalid date format (use YYYY-MM-DD)');
                }
                
                if (isAdmin()) {
                    // Admins can directly add to calendar_events
                    $stmt = $pdo->prepare("
                        INSERT INTO calendar_events (title, event_date, description, created_by) 
                        VALUES (?, ?, ?, ?)
                    ");
                    $stmt->execute([$title, $date, $description, $_SESSION['user_id']]);
                    echo json_encode(['success' => true, 'message' => 'Event added directly to calendar']);
                } else {
                    // Regular users submit to event_submissions for moderation
                    $stmt = $pdo->prepare("
                        INSERT INTO event_submissions (title, event_date, description, submitter_id, status)
                        VALUES (?, ?, ?, ?, 'pending')
                    ");
                    $stmt->execute([$title, $date, $description, $_SESSION['user_id']]);
                    echo json_encode(['success' => true, 'message' => 'Event submitted for review']);
                }
                
            } elseif ($action === 'delete') {
                // Delete event - admin only
                if (!isAdmin()) {
                    throw new Exception('Only administrators can delete events');
                }
                
                $eventId = (int)($input['event_id'] ?? 0);
                
                if (!$eventId) {
                    throw new Exception('Event ID is required');
                }
                
                // Delete from calendar_events table
                $stmt = $pdo->prepare("DELETE FROM calendar_events WHERE id = ?");
                $stmt->execute([$eventId]);
                
                // Also check event_submissions table
                $stmt = $pdo->prepare("DELETE FROM event_submissions WHERE id = ?");
                $stmt->execute([$eventId]);
                
                echo json_encode(['success' => true, 'message' => 'Event deleted successfully']);
            }
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>