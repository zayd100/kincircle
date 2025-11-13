<?php
require_once "config.php";
requireLogin();

$displayName = $_SESSION['display_name'] ?? 'Family Member';
$userId = $_SESSION['user_id'] ?? null;
$isAdmin = isAdmin();

// Initialize data arrays
$events = [];
$userCommitments = [];
$commitmentCounts = [];

// Fetch calendar events from database
try {
    // Get all events
    $stmt = $pdo->prepare("SELECT * FROM calendar_events ORDER BY event_date ASC");
    $stmt->execute();
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get user commitments
    $stmt = $pdo->prepare("SELECT event_id FROM event_commitments WHERE user_id = ?");
    $stmt->execute([$userId]);
    $userCommitments = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Get commitment counts per event
    $stmt = $pdo->prepare("SELECT event_id, COUNT(*) as count FROM event_commitments GROUP BY event_id");
    $stmt->execute();
    $counts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($counts as $count) {
        $commitmentCounts[$count['event_id']] = $count['count'];
    }
} catch (PDOException $e) {
    // If tables don't exist yet, just use empty arrays
    error_log("Calendar data fetch error: " . $e->getMessage());
    // Also add a visible indicator for debugging
    $debugMessage = "Calendar tables not found - using empty data";
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Family Time Machine - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/calendar.css">
</head>
<body>
    <!-- Header will be automatically inserted here by header.js -->

    <main class="main-content">
        <div class="calendar-universe">
            <header class="calendar-header">
                <h1 class="calendar-title">Family Time Machine</h1>
                <p class="calendar-subtitle">Where memories meet the future</p>
            </header>

            <div class="time-machine-nav">
                <div class="nav-controls">
                    <!-- Section 1: Decade Selector -->
                    <div class="decade-selector">
                        <button class="decade-button" data-decade="2000">2000s</button>
                        <button class="decade-button" data-decade="2010">2010s</button>
                        <button class="decade-button active" data-decade="2020">2020s</button>
                        <button class="decade-button" data-decade="2030">2030s</button>
                    </div>

                    <!-- Section 2: Month/Year Navigation -->
                    <div class="time-travel-buttons">
                        <button class="nav-button-small" id="prevYear">← Year</button>
                        <button class="nav-button-small" id="prevMonth">← Month</button>
                        <div class="current-period" id="currentPeriod">Loading...</div>
                        <button class="nav-button-small" id="nextMonth">Month →</button>
                        <button class="nav-button-small" id="nextYear">Year →</button>
                    </div>

                    <!-- Section 3: Action Buttons -->
                    <div class="action-buttons">
                        <button class="nav-button" id="todayButton">✨ Today</button>
                        <button class="nav-button" id="commitmentButton">💖 Attending</button>
                    </div>
                </div>
            </div>

            <div class="calendar-container">
                <div class="calendar-grid" id="calendarGrid">
                    <!-- Calendar will be dynamically populated here -->
                </div>
            </div>
        </div>
    </main>

    <!-- Tooltip for hover events -->
    <div class="tooltip" id="eventTooltip"></div>

    <!-- Day Detail Modal -->
    <div class="day-modal" id="dayModal">
        <div class="day-modal-content">
            <button class="close-modal" id="closeModal">&times;</button>
            
            <div class="modal-header">
                <div class="modal-date" id="modalDate">Day Details</div>
                <div class="modal-day-name" id="modalDayName">Monday</div>
            </div>
            <div class="modal-body">
                <div class="events-section" id="modalEvents">
                    <!-- Events will be populated here -->
                </div>

                <div class="add-event-section">
                    <h3>Add New Event</h3>
                    <div class="form-group">
                        <label for="eventTitle">Event Title</label>
                        <input type="text" id="eventTitle" placeholder="Enter event title">
                    </div>
                    
                    <div class="form-group">
                        <label for="eventDescription">Description</label>
                        <textarea id="eventDescription" placeholder="Tell us about this event..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="eventType">Event Type</label>
                        <select id="eventType">
                            <option value="birthday">🎂 Birthday</option>
                            <option value="anniversary">💍 Anniversary</option>
                            <option value="reunion">👨‍👩‍👧‍👦 Family Reunion</option>
                            <option value="holiday">🎄 Holiday</option>
                            <option value="gathering">🎉 Family Gathering</option>
                            <option value="other">📅 Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="eventRecurring">Recurring</label>
                        <select id="eventRecurring">
                            <option value="none">One-time event</option>
                            <option value="yearly">Every year</option>
                            <option value="monthly">Every month</option>
                        </select>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="familyCalendar.clearEventForm()">Clear</button>
                        <button type="button" class="btn btn-primary" onclick="familyCalendar.submitEvent()">Submit for Review</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script>
        // Pass PHP data to JavaScript
        window.currentUser = {
            id: <?= json_encode($userId ?? $_SESSION['user_id'] ?? null) ?>,
            displayName: <?= json_encode($_SESSION['display_name'] ?? 'User') ?>,
            isAdmin: <?= json_encode($isAdmin) ?>
        };
        
        window.calendarData = {
            events: <?= json_encode($events) ?>,
            userCommitments: <?= json_encode($userCommitments) ?>,
            commitmentCounts: <?= json_encode($commitmentCounts) ?><?= isset($debugMessage) ? ',
            debugMessage: ' . json_encode($debugMessage) : '' ?>
        };
        
        // Debug output
        console.log('Calendar data loaded:', window.calendarData);
    </script>
    <script src="js/header.js"></script>
    <script src="js/calendar.js"></script>
</body>
</html>