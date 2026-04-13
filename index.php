<?php
require_once "config.php";
requireLogin();

$displayName = $_SESSION['display_name'] ?? 'Family Member';
$isAdmin = isAdmin();

// Get dashboard statistics
try {
    // Recent activity count
    $recentPhotosStmt = $pdo->prepare("
        SELECT COUNT(*) as count
        FROM photo_submissions
        WHERE status = 'approved' AND uploaded_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    ");
    $recentPhotosStmt->execute();
    $recentPhotosCount = $recentPhotosStmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Upcoming events count
    $upcomingEventsStmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM calendar_events 
        WHERE event_date >= CURDATE() AND event_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    ");
    $upcomingEventsStmt->execute();
    $upcomingEventsCount = $upcomingEventsStmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Total family photos
    $totalPhotosStmt = $pdo->prepare("SELECT COUNT(*) as count FROM photo_submissions WHERE status = 'approved'");
    $totalPhotosStmt->execute();
    $totalPhotosCount = $totalPhotosStmt->fetch(PDO::FETCH_ASSOC)['count'];
    
} catch (PDOException $e) {
    $recentPhotosCount = 0;
    $upcomingEventsCount = 0;
    $totalPhotosCount = 0;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <base href="/kincircle/">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reed & Weaver - Family Dashboard</title>
    <link rel="stylesheet" href="css/main.css">
    <style>
        /* Dashboard-specific styles */
        .dashboard-container {
            min-height: 100vh;
            padding: 2rem;
            padding-top: 100px; /* Space for header */
            background: var(--universe-gradient-subtle);
            position: relative;
            overflow: hidden;
        }
        
        /* Animated background particles */
        .dashboard-container::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(circle at 20% 50%, var(--particle-glow) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, var(--particle-glow) 0%, transparent 50%),
                radial-gradient(circle at 40% 20%, var(--particle-glow) 0%, transparent 50%);
            animation: particleFloat 20s ease-in-out infinite;
            pointer-events: none;
            z-index: 0;
        }
        
        @keyframes particleFloat {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(30px, -30px) rotate(120deg); }
            66% { transform: translate(-20px, 20px) rotate(240deg); }
        }
        
        .dashboard-content {
            position: relative;
            z-index: 1;
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .dashboard-header {
            text-align: center;
            margin-bottom: 3rem;
            animation: fadeInDown 0.8s ease-out;
        }
        
        .family-title {
            font-size: 3rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--text-primary) 0%, var(--accent-light) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }
        
        .family-tagline {
            font-size: 1.25rem;
            color: var(--text-secondary);
            font-weight: 300;
        }
        
        .welcome-message {
            background: var(--glass-bg);
            backdrop-filter: var(--glass-backdrop);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-lg);
            padding: 2rem;
            margin-bottom: 3rem;
            text-align: center;
            color: var(--text-primary);
            box-shadow: var(--glass-shadow);
            animation: fadeInUp 0.8s ease-out 0.2s both;
        }
        
        .welcome-message h2 {
            font-size: 1.75rem;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
        }
        
        .welcome-message p {
            color: var(--text-secondary);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
            animation: fadeInUp 0.8s ease-out 0.4s both;
        }
        
        .stat-card {
            background: var(--glass-bg);
            backdrop-filter: var(--glass-backdrop);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-lg);
            padding: 1.5rem;
            text-align: center;
            transition: all var(--animation-normal);
            box-shadow: var(--glass-shadow);
        }
        
        a.stat-card:hover {
            background: var(--glass-bg-hover);
            transform: translateY(-2px);
            box-shadow: var(--glass-shadow-hover);
            border-color: var(--primary-light);
            text-decoration: none;
        }
        
        .stat-card:hover {
            background: var(--glass-bg-hover);
            transform: translateY(-4px);
            box-shadow: var(--glass-shadow-hover);
            border-color: var(--glass-border-hover);
        }
        
        .stat-number {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--primary-light) 0%, var(--accent-light) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }
        
        .stat-label {
            color: var(--text-secondary);
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        /* Navigation Cards Grid */
        .card-navigation {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
            animation: fadeInUp 0.8s ease-out 0.6s both;
        }
        
        .nav-card {
            background: var(--glass-bg);
            backdrop-filter: var(--glass-backdrop);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-lg);
            padding: 2rem;
            text-decoration: none;
            color: var(--text-primary);
            transition: all var(--animation-normal);
            text-align: center;
            box-shadow: var(--glass-shadow);
            position: relative;
            overflow: hidden;
        }
        
        .nav-card::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, var(--primary-light) 0%, transparent 70%);
            opacity: 0;
            transition: opacity var(--animation-normal);
            pointer-events: none;
        }
        
        .nav-card:hover {
            background: var(--glass-bg-hover);
            transform: translateY(-4px);
            box-shadow: var(--glass-shadow-hover);
            border-color: var(--glass-border-hover);
        }
        
        .nav-card:hover::before {
            opacity: 0.1;
        }
        
        .card-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            display: block;
            filter: drop-shadow(0 0 20px var(--particle-glow));
        }
        
        .nav-card h3 {
            font-size: 1.25rem;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .nav-card p {
            color: var(--text-secondary);
            font-size: 0.875rem;
            line-height: 1.5;
        }
        
        /* Special card colors */
        .photos-card:hover .card-icon { color: var(--primary-light); }
        .calendar-card:hover .card-icon { color: var(--secondary-light); }
        .messages-card:hover .card-icon { color: var(--accent-light); }
        .recipes-card:hover .card-icon { color: var(--success); }
        .contacts-card:hover .card-icon { color: var(--info); }
        .upload-card:hover .card-icon { color: var(--warning); }
        .admin-card:hover .card-icon { color: var(--error); }
        .memorials-card:hover .card-icon { color: var(--text-secondary); }
        
        /* Animations */
        @keyframes fadeInDown {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .dashboard-container {
                padding: 1rem;
                padding-top: 80px;
            }

            .landing-container {
                padding: 1rem;
                padding-top: 80px;
            }

            .dashboard-header,
            .landing-header {
                margin-bottom: 2rem;
            }

            .family-title {
                font-size: 1.75rem;
                line-height: 1.2;
            }

            .family-tagline {
                font-size: 1rem;
            }

            .welcome-message {
                padding: 1.5rem;
                margin-bottom: 2rem;
            }

            .welcome-message h2 {
                font-size: 1.25rem;
            }

            .card-navigation {
                grid-template-columns: 1fr;
                gap: 1rem;
            }

            .stats-grid {
                grid-template-columns: 1fr 1fr;
                gap: 0.75rem;
            }

            .stat-card {
                padding: 1rem;
            }

            .stat-number {
                font-size: 2rem;
            }

            .nav-card {
                padding: 1.5rem;
            }

            .card-icon {
                font-size: 2.5rem;
                margin-bottom: 0.75rem;
            }

            .nav-card h3 {
                font-size: 1.1rem;
            }

            .nav-card p {
                font-size: 0.8rem;
            }
        }

        @media (max-width: 480px) {
            .family-title {
                font-size: 1.5rem;
            }

            .family-tagline {
                font-size: 0.9rem;
            }

            .stats-grid {
                grid-template-columns: 1fr;
            }

            .stat-card {
                padding: 1rem 0.75rem;
            }

            .nav-card {
                padding: 1.25rem 1rem;
            }
        }
    </style>
</head>
<body>
    <!-- Header will be automatically inserted here -->
    
    <!-- Main Dashboard Content -->
    <main class="landing-container">
        <header class="landing-header">
            <h1 class="family-title">Reed & Weaver</h1>
            <p class="family-tagline">Welcome back, <?= htmlspecialchars($displayName) ?>!</p>
        </header>
        
        <!-- Welcome message with quick stats -->
        <div class="welcome-message">
            <h2>🏡 Family Dashboard</h2>
            <p>Your central hub for all family activities and memories</p>
        </div>
        
        <!-- Quick Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number"><?= $totalPhotosCount ?></div>
                <div class="stat-label">Family Photos</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?= $recentPhotosCount ?></div>
                <div class="stat-label">New This Week</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?= $upcomingEventsCount ?></div>
                <div class="stat-label">Upcoming Events</div>
            </div>
            <?php if ($isAdmin): ?>
            <a href="admin.php" class="stat-card" style="cursor: pointer; text-decoration: none; color: inherit;">
                <div class="stat-number">🛠️</div>
                <div class="stat-label">Admin Access</div>
            </a>
            <?php endif; ?>
        </div>
        
        <!-- Navigation Cards -->
        <nav class="card-navigation">
            <a href="photos.php" class="nav-card photos-card">
                <div class="card-icon">📸</div>
                <h3>Photos</h3>
                <p>Share and view family memories</p>
            </a>
            
            <a href="calendar.php" class="nav-card calendar-card">
                <div class="card-icon">📅</div>
                <h3>Time Machine</h3>
                <p>Family events and birthdays</p>
            </a>
            
            <a href="board.php" class="nav-card messages-card">
                <div class="card-icon">💬</div>
                <h3>Family Board</h3>
                <p>Family announcements and discussions</p>
            </a>
            
            <a href="recipes.php" class="nav-card recipes-card">
                <div class="card-icon">🍝</div>
                <h3>Recipes</h3>
                <p>Traditional family recipes</p>
            </a>
            
            <a href="directory.php" class="nav-card contacts-card">
                <div class="card-icon">📖</div>
                <h3>Directory</h3>
                <p>Family connections and contacts</p>
            </a>
            
            <a href="upload/" class="nav-card upload-card">
                <div class="card-icon">📤</div>
                <h3>Upload</h3>
                <p>Share new photos and memories</p>
            </a>

            <a href="upload/media.php" class="nav-card media-card">
                <div class="card-icon">🎬</div>
                <h3>Media</h3>
                <p>Videos, audio, and documents</p>
            </a>

            <a href="events.php" class="nav-card events-card">
                <div class="card-icon">🎉</div>
                <h3>Events</h3>
                <p>Submit family events and gatherings</p>
            </a>

            <?php if ($isAdmin): ?>
            <a href="admin.php" class="nav-card admin-card">
                <div class="card-icon">🛠️</div>
                <h3>Admin</h3>
                <p>Moderate content and manage users</p>
            </a>
            <?php endif; ?>

            <a href="memorials.php" class="nav-card memorials-card">
                <div class="card-icon">🕊️</div>
                <h3>Memorials</h3>
                <p>Remembering loved ones</p>
            </a>
        </nav>
    </main>
    
    <!-- Set current user for header -->
    <script>
        window.currentUser = {
            id: <?= json_encode($userId ?? $_SESSION['user_id'] ?? null) ?>,
            displayName: <?= json_encode($displayName) ?>,
            isAdmin: <?= json_encode($isAdmin) ?>
        };
    </script>
    <script src="js/header.js"></script>
    <script src="js/landing.js"></script>
</body>
</html>