<?php
require_once "config.php";
requireLogin();

$displayName = $_SESSION['display_name'] ?? 'Family Member';
$isAdmin = isAdmin();

// Fetch approved memorials from database
try {
    $stmt = $pdo->prepare("
        SELECT m.*, u.display_name as created_by_name
        FROM memorials m
        JOIN users u ON m.created_by = u.id
        WHERE m.is_active = 1
        ORDER BY m.created_at DESC
    ");
    $stmt->execute();
    $memorials = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $memorials = [];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>In Loving Memory - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/memorials.css">
</head>
<body>
    <!-- Back to Site Button (10% top area) -->
    <div class="memorial-header">
        <a href="index.php" class="back-to-site">← Back to Family Site</a>
    </div>

    <!-- Memorial Content (90% area) -->
    <main class="memorial-container">
        <header class="memorial-page-header">
            <h1 class="memorial-title">In Loving Memory</h1>
            <p class="memorial-subtitle">Honoring those who remain forever in our hearts</p>
            <a href="memorial-create.php" class="create-memorial-btn">✨ Create Memorial</a>
        </header>

        <div class="memorial-list">
            <?php if (empty($memorials)): ?>
                <div class="no-memorials">
                    <p>No memorials have been created yet.</p>
                    <p>Be the first to honor a loved one's memory.</p>
                </div>
            <?php else: ?>
                <?php foreach ($memorials as $memorial): ?>
                    <div class="memorial-card" data-memorial="<?= $memorial['id'] ?>">
                        <div class="memorial-photo">
                            <?php if ($memorial['photo_filename']): ?>
                                <img src="uploads/memorials/<?= htmlspecialchars($memorial['photo_filename']) ?>"
                                     alt="<?= htmlspecialchars($memorial['name']) ?>">
                            <?php else: ?>
                                <div class="memorial-photo-placeholder">
                                    <span>🕊️</span>
                                </div>
                            <?php endif; ?>
                        </div>
                        <div class="memorial-info">
                            <h3 class="memorial-name"><?= htmlspecialchars($memorial['name']) ?></h3>
                            <p class="memorial-dates">
                                <?php if ($memorial['birth_date'] && $memorial['death_date']): ?>
                                    <?= htmlspecialchars($memorial['birth_date']) ?> - <?= htmlspecialchars($memorial['death_date']) ?>
                                <?php elseif ($memorial['birth_date']): ?>
                                    Born <?= htmlspecialchars($memorial['birth_date']) ?>
                                <?php elseif ($memorial['death_date']): ?>
                                    Passed <?= htmlspecialchars($memorial['death_date']) ?>
                                <?php endif; ?>
                            </p>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </main>

    <!-- Memorial Detail Slide-out (90% width) -->
    <div class="memorial-slideout" id="memorialSlideout">
        <div class="slideout-header">
            <button class="close-slideout" id="closeSlideout">← Back to List</button>
        </div>

        <div class="slideout-content" id="slideoutContent">
            <!-- Content will be populated by JavaScript -->
        </div>
    </div>

    <script src="js/memorials.js"></script>
</body>
</html>
