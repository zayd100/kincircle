<?php
require_once "config.php";
requireLogin();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moments - Reed & Weaver</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <nav class="top-nav">
        <div class="nav-wrap">
            <a href="index.php" class="logo">Reed & Weaver</a>
            <div class="nav-links">
                <a href="index.php">Home</a>
                <a href="recipes.php">Recipes</a>
                <a href="messages.php">Messages</a>
                <a href="calendar.php">Calendar</a>
                <a href="moments.php" class="active">Moments</a>
                <a href="directory.php">Directory</a>
                <a href="cousin-connect.php">Connect</a>
                <?php if (isAdmin()): ?>
                    <a href="admin.php">Admin</a>
                <?php endif; ?>
                <a href="logout.php">Logout</a>
            </div>
        </div>
    </nav>

    <main class="content-main">
        <section class="page-hero">
            <h1>Moments</h1>
            <p>Family photos and shared memories</p>
        </section>

        <section class="content-section">
            <div class="photo-submission">
                <h2>Submit Photos</h2>
                <p>Email photos to: <strong>cc@zyzd.cc</strong></p>
                <p>Include: Event name, date, and who's in the photo</p>
            </div>
        </section>

        <section class="content-section">
            <h2>Recent Photo Albums</h2>
            <div id="photo-albums" class="photo-albums">
                <div class="album-card">
                    <div class="album-preview">
                        <div class="album-placeholder">📸</div>
                    </div>
                    <h3>Summer BBQ 2024</h3>
                    <p>12 photos • Added by Sarah</p>
                </div>
                
                <div class="album-card">
                    <div class="album-preview">
                        <div class="album-placeholder">🎂</div>
                    </div>
                    <h3>Mike's Birthday</h3>
                    <p>8 photos • Added by Jenny</p>
                </div>
                
                <div class="album-card">
                    <div class="album-preview">
                        <div class="album-placeholder">🎮</div>
                    </div>
                    <h3>Family Game Night</h3>
                    <p>5 photos • Added by Admin</p>
                </div>
            </div>
        </section>

        <section class="content-section">
            <h2>All Photos</h2>
            <div class="photo-filters">
                <button class="filter-btn active" data-filter="all">All</button>
                <button class="filter-btn" data-filter="events">Events</button>
                <button class="filter-btn" data-filter="holidays">Holidays</button>
                <button class="filter-btn" data-filter="birthdays">Birthdays</button>
                <button class="filter-btn" data-filter="gatherings">Gatherings</button>
            </div>
            
            <div id="photo-grid" class="photo-grid">
                <div class="photo-placeholder">
                    <p>Photos will appear here once uploaded</p>
                    <p><small>Email photos to get them added to the gallery</small></p>
                </div>
            </div>
        </section>
    </main>

    <footer>
        <p>Reed & Weaver Family Hub</p>
    </footer>

    <style>
        .photo-submission {
            background: var(--eggshell);
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 1rem;
        }
        
        .photo-albums {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
        }
        
        .album-card {
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
            transition: transform 0.3s;
        }
        
        .album-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow);
        }
        
        .album-preview {
            height: 200px;
            background: var(--eggshell);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .album-placeholder {
            font-size: 4rem;
            opacity: 0.6;
        }
        
        .album-card h3 {
            padding: 1rem 1rem 0.5rem;
            margin-bottom: 0;
        }
        
        .album-card p {
            padding: 0 1rem 1rem;
            margin-bottom: 0;
            color: var(--light-gray);
            font-size: 0.875rem;
        }
        
        .photo-filters {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
            flex-wrap: wrap;
        }
        
        .filter-btn {
            background: var(--white);
            color: var(--black);
            border: 2px solid var(--border);
            padding: 0.5rem 1rem;
            border-radius: 25px;
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.3s;
        }
        
        .filter-btn:hover,
        .filter-btn.active {
            background: var(--black);
            color: var(--eggshell);
            border-color: var(--black);
        }
        
        .photo-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
        }
        
        .photo-placeholder {
            grid-column: 1 / -1;
            text-align: center;
            padding: 4rem 2rem;
            background: var(--eggshell);
            border-radius: 8px;
            border: 2px dashed var(--border);
        }
    </style>
</body>
</html>