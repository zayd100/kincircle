-- Memorial Photos table for storing multiple photos per memorial
CREATE TABLE IF NOT EXISTS memorial_photos (
    id INT(11) NOT NULL AUTO_INCREMENT,
    memorial_id INT(11) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INT(11) NOT NULL,
    storage_provider VARCHAR(20) DEFAULT 'r2',
    display_order INT(11) DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY memorial_id (memorial_id),
    KEY display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Memorial Submission Photos table for pending memorial photos
CREATE TABLE IF NOT EXISTS memorial_submission_photos (
    id INT(11) NOT NULL AUTO_INCREMENT,
    submission_id INT(11) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INT(11) NOT NULL,
    storage_provider VARCHAR(20) DEFAULT 'r2',
    display_order INT(11) DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY submission_id (submission_id),
    KEY display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
