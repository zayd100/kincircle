<?php
require_once "config.php";
requireLogin();

$isAdmin = isAdmin();
$userId = $_SESSION['user_id'];

// Fetch events from database
try {
    // Get upcoming and recent events
    $stmt = $pdo->prepare("
        SELECT ce.*, u.display_name as created_by_name,
               COUNT(ec.user_id) as attending_count
        FROM calendar_events ce
        LEFT JOIN users u ON ce.created_by = u.id
        LEFT JOIN event_commitments ec ON ce.id = ec.event_id AND ec.status = 'attending'
        WHERE ce.event_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY ce.id
        ORDER BY ce.event_date ASC
    ");
    $stmt->execute();
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get user's event commitments
    $userCommitmentsStmt = $pdo->prepare("
        SELECT event_id FROM event_commitments
        WHERE user_id = ? AND status = 'attending'
    ");
    $userCommitmentsStmt->execute([$userId]);
    $userCommitments = $userCommitmentsStmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Calculate stats
    $upcomingEvents = count(array_filter($events, fn($e) => $e['event_date'] >= date('Y-m-d')));
    $totalAttending = array_sum(array_column($events, 'attending_count'));
    
} catch (PDOException $e) {
    $events = [];
    $userCommitments = [];
    $upcomingEvents = 0;
    $totalAttending = 0;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Family Events - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/events.css">
</head>
<body>
    <main class="main-content">
        <!-- Events Hero Section -->
        <section class="events-hero">
            <div class="hero-backdrop"></div>
            <div class="hero-content">
                <div class="hero-header">
                    <h1 class="hero-title">
                        <span class="title-icon">🎉</span>
                        <span class="title-text">Family Events</span>
                    </h1>
                    <button class="hero-upload-btn" id="addEventBtn">
                        <span class="upload-text">Add Event</span>
                    </button>
                </div>
            </div>
        </section>

        <!-- Events Controls Section -->
        <section class="events-controls">
            <div class="controls-container">
                <div class="filter-section">
                    <button class="filter-btn active" data-filter="all">
                        <span class="filter-icon">📅</span>
                        All Events
                    </button>
                    <button class="filter-btn" data-filter="thisMonth">
                        <span class="filter-icon">📆</span>
                        This Month
                    </button>
                    <button class="filter-btn" data-filter="attending">
                        <span class="filter-icon">💖</span>
                        Attending
                    </button>
                    <button class="filter-btn" id="filterBtn" title="More Filters">
                        <span class="filter-icon">🔽</span>
                        Filter
                    </button>
                    <div class="view-divider"></div>
                    <button class="view-btn active" data-view="list">
                        <span>📋</span> List
                    </button>
                    <button class="view-btn" data-view="timeline">
                        <span>📊</span> Timeline
                    </button>
                </div>
                
                <div class="search-section">
                    <input type="text" 
                           id="eventSearch" 
                           class="event-search" 
                           placeholder="Search events, locations, hosts...">
                    <button class="search-icon">🔍</button>
                </div>
            </div>
        </section>

        <div class="container">

            <!-- Filter Panel (Hidden by default) -->
            <div class="filter-panel" id="filterPanel">
                <div class="filter-group">
                    <label>Event Type</label>
                    <select id="typeFilter" class="form-select">
                        <option value="">All Types</option>
                        <option value="birthday">🎂 Birthdays</option>
                        <option value="anniversary">💍 Anniversaries</option>
                        <option value="reunion">👨‍👩‍👧‍👦 Reunions</option>
                        <option value="holiday">🎄 Holidays</option>
                        <option value="gathering">🎉 Gatherings</option>
                        <option value="other">📌 Other</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Time Range</label>
                    <select id="timeFilter" class="form-select">
                        <option value="upcoming">Upcoming</option>
                        <option value="thisweek">This Week</option>
                        <option value="thismonth">This Month</option>
                        <option value="thisyear">This Year</option>
                        <option value="all">All Events</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>My Events</label>
                    <div class="filter-checkbox">
                        <input type="checkbox" id="committedFilter">
                        <label for="committedFilter">Only show events I'm attending</label>
                    </div>
                    <div class="filter-checkbox">
                        <input type="checkbox" id="tasksFilter">
                        <label for="tasksFilter">Only show events with my tasks</label>
                    </div>
                </div>
            </div>

            <!-- Events List Container -->
            <div class="events-container" id="eventsContainer">
                <div class="events-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading family events...</p>
                </div>
            </div>

            <!-- Pagination -->
            <div class="events-pagination" id="pagination"></div>
        </div>
    </main>

    <!-- Task Management Modal -->
    <div class="modal-backdrop" id="taskModal">
        <div class="task-modal">
            <div class="task-modal-header">
                <h2 id="taskModalTitle">Event Tasks</h2>
                <button class="modal-close" id="closeTaskModal">✕</button>
            </div>
            <div class="task-modal-body">
                <!-- Dynamic task boards will be inserted here -->
            </div>
        </div>
    </div>

    <!-- Add Event Modal -->
    <div class="modal-backdrop" id="addEventModal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add New Event</h2>
                <button class="modal-close" id="closeAddModal">✕</button>
            </div>
            <form id="addEventForm" class="event-form">
                <div class="form-group">
                    <label for="eventTitle">Event Title</label>
                    <input type="text" id="eventTitle" class="form-input" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="eventDate">Date</label>
                        <input type="date" id="eventDate" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="eventType">Type</label>
                        <select id="eventType" class="form-select" required>
                            <option value="birthday">🎂 Birthday</option>
                            <option value="anniversary">💍 Anniversary</option>
                            <option value="reunion">👨‍👩‍👧‍👦 Reunion</option>
                            <option value="holiday">🎄 Holiday</option>
                            <option value="gathering">🎉 Gathering</option>
                            <option value="other">📌 Other</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="eventDescription">Description</label>
                    <textarea id="eventDescription" class="form-textarea" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label for="eventLocation">Location</label>
                    <input type="text" id="eventLocation" class="form-input">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelAddEvent">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Event</button>
                </div>
            </form>
        </div>
    </div>


    <!-- Events Stats Footer -->
    <div class="events-stats">
        <div class="stat-card">
            <div class="stat-number" id="upcomingCount">0</div>
            <div class="stat-label">Upcoming</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" id="thisMonthCount">0</div>
            <div class="stat-label">This Month</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" id="committedCount">0</div>
            <div class="stat-label">Attending</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" id="tasksCount">0</div>
            <div class="stat-label">Your Tasks</div>
        </div>
    </div>

    <!-- Pass PHP data to JavaScript -->
    <script>
        window.eventsData = {
            events: <?= json_encode($events) ?>,
            userCommitments: <?= json_encode($userCommitments) ?>,
            stats: {
                upcomingEvents: <?= json_encode($upcomingEvents) ?>,
                totalAttending: <?= json_encode($totalAttending) ?>
            },
            currentUser: {
                id: <?= json_encode($userId) ?>,
                isAdmin: <?= json_encode($isAdmin) ?>
            }
        };
    </script>
    <script>
        window.currentUser = {
            id: <?= json_encode($userId ?? $_SESSION['user_id'] ?? null) ?>,
            displayName: <?= json_encode($_SESSION['display_name'] ?? 'User') ?>,
            isAdmin: <?= json_encode($isAdmin) ?>
        };
    </script>
    <script src="js/header.js"></script>
    <script src="js/family-events.js"></script>
</body>
</html>