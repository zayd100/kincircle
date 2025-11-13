-- Reed & Weaver Family Database Setup
-- Run this SQL to create the database and tables

CREATE DATABASE IF NOT EXISTS reedweaver_family;
USE reedweaver_family;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    birthday DATE NULL,
    is_admin TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    cousin_connect_available TINYINT(1) DEFAULT 0,
    cousin_connect_interests TEXT,
    cousin_connect_since TIMESTAMP NULL,
    -- Three-field password system: stores "name|beverage|number" as hashed password
    -- This revolutionary approach makes login memorable while maintaining security
    password_type ENUM('traditional', 'three_field') DEFAULT 'three_field'
);

-- Recipes table
CREATE TABLE recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    difficulty VARCHAR(20),
    serves INT,
    prep_time VARCHAR(100),
    cook_time VARCHAR(100),
    ingredients TEXT NOT NULL,
    instructions TEXT NOT NULL,
    story TEXT,
    source VARCHAR(200),
    occasion VARCHAR(200),
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active TINYINT(1) DEFAULT 1,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Recipe modifications/notes
CREATE TABLE recipe_modifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    modified_by INT NOT NULL,
    modification_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    FOREIGN KEY (modified_by) REFERENCES users(id)
);

-- Messages/Board posts
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    posted_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active TINYINT(1) DEFAULT 1,
    FOREIGN KEY (posted_by) REFERENCES users(id)
);

-- Message replies
CREATE TABLE message_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    content TEXT NOT NULL,
    posted_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id),
    FOREIGN KEY (posted_by) REFERENCES users(id)
);

-- Calendar events (approved events that appear on calendar)
CREATE TABLE calendar_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    event_date DATE NOT NULL,
    description TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Event submissions table for moderation workflow
CREATE TABLE event_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    event_date DATE NOT NULL,
    description TEXT,
    submitter_id INT NOT NULL,
    event_type ENUM('birthday', 'anniversary', 'reunion', 'holiday', 'gathering', 'other') DEFAULT 'other',
    recurring ENUM('none', 'yearly', 'monthly') DEFAULT 'none',
    contact_info VARCHAR(200), -- For event coordination
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    reviewer_notes TEXT,
    approved_event_id INT NULL, -- Reference to calendar_events.id when approved
    FOREIGN KEY (submitter_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    FOREIGN KEY (approved_event_id) REFERENCES calendar_events(id)
);

-- Pending user registrations table
CREATE TABLE pending_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    birthday DATE NULL,
    family_connection ENUM('reed', 'weaver', 'married-in', 'other') NOT NULL,
    relationship_note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewed_by INT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    admin_notes TEXT,
    password_type ENUM('traditional', 'three_field') DEFAULT 'three_field',
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- Admin messages table for password help and other admin communications
CREATE TABLE admin_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_type ENUM('password_help', 'general', 'bug_report', 'feature_request') DEFAULT 'general',
    username VARCHAR(50),
    email VARCHAR(100),
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('unread', 'read', 'resolved') DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    resolved_by INT NULL,
    admin_notes TEXT,
    FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- Photo submissions table for upload moderation system
CREATE TABLE photo_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    file_type VARCHAR(100),
    uploader_id INT NOT NULL,
    event_name VARCHAR(200),
    date_taken VARCHAR(100),
    people_in_photo TEXT,
    description TEXT,
    photo_title VARCHAR(200),
    photo_description TEXT,
    location_name VARCHAR(200),
    location_city VARCHAR(100),
    location_state VARCHAR(50),
    suggested_album VARCHAR(100),
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    reviewer_notes TEXT,
    final_album VARCHAR(100) NULL,
    FOREIGN KEY (uploader_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    INDEX idx_location_city (location_city),
    INDEX idx_date_taken (date_taken)
);

-- Albums metadata table
CREATE TABLE albums (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folder_name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    emoji VARCHAR(10) DEFAULT '📸',
    description TEXT,
    date_range VARCHAR(50),
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active TINYINT(1) DEFAULT 1,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Event commitments table - tracks user attendance commitments for events
CREATE TABLE event_commitments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    committed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_commitment (event_id, user_id)
);

-- People table - stores unique people that can be tagged in content
CREATE TABLE people (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_by_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_normalized_name (normalized_name),
    INDEX idx_display_name (display_name)
);

-- Content tags table - universal tagging system for photos, media, etc.
CREATE TABLE content_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    person_id INT NOT NULL,
    content_type ENUM('photo', 'media') NOT NULL,
    content_id INT NOT NULL,
    tagged_by_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
    FOREIGN KEY (tagged_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_tag (person_id, content_type, content_id),
    INDEX idx_person_id (person_id),
    INDEX idx_content (content_type, content_id)
);

-- Photo tags table (LEGACY - kept for backward compatibility)
-- New code should use content_tags instead
CREATE TABLE photo_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    photo_id INT NOT NULL,
    person_name VARCHAR(100) NOT NULL,
    tagged_by_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (photo_id) REFERENCES photo_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (tagged_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_photo_id (photo_id),
    INDEX idx_person_name (person_name)
);

-- Private messages table - user-to-user direct messaging
CREATE TABLE private_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    recipient_id INT NOT NULL,
    subject VARCHAR(200),
    content TEXT NOT NULL,
    is_important TINYINT(1) DEFAULT 0,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sender (sender_id),
    INDEX idx_recipient (recipient_id),
    INDEX idx_conversation (sender_id, recipient_id),
    INDEX idx_created_at (created_at),
    INDEX idx_is_read (is_read)
);

-- Memorial submissions table for moderation workflow
CREATE TABLE memorial_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    birth_date VARCHAR(100),
    death_date VARCHAR(100),
    memorial_text TEXT NOT NULL,
    photo_filename VARCHAR(255),
    submitted_by INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    reviewer_notes TEXT,
    approved_memorial_id INT NULL,
    FOREIGN KEY (submitted_by) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- Approved memorials table
CREATE TABLE memorials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    birth_date VARCHAR(100),
    death_date VARCHAR(100),
    memorial_text TEXT NOT NULL,
    photo_filename VARCHAR(255),
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active TINYINT(1) DEFAULT 1,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create default admin user (password: admin123 - CHANGE THIS!)
INSERT INTO users (username, password_hash, display_name, email, is_admin) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Clarke', 'cc@zyzd.cc', 1);

-- Create sample test users (all passwords: family123)
INSERT INTO users (username, password_hash, display_name, email) VALUES 
('user1', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test User 1', 'user1@example.com'),
('user2', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test User 2', 'user2@example.com'),
('user3', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test User 3', 'user3@example.com');

-- Sample recipe
INSERT INTO recipes (name, ingredients, instructions, created_by) VALUES 
('Sample Recipe', 
'Ingredient 1\nIngredient 2\nIngredient 3\nIngredient 4',
'Step 1: Do something\nStep 2: Do something else\nStep 3: Complete the recipe',
2);

-- Sample recipe modification
INSERT INTO recipe_modifications (recipe_id, modified_by, modification_text) VALUES 
(1, 3, 'Test modification note');

-- Sample message
INSERT INTO messages (subject, content, posted_by) VALUES 
('Test Message Subject', 'Sample message content for testing purposes.', 2);

-- Sample calendar events
INSERT INTO calendar_events (title, event_date, created_by) VALUES 
('Sample Event 1', '2025-01-15', 1),
('Sample Event 2', '2025-01-28', 1),
('Sample Event 3', '2025-07-15', 1),
('Sample Event 4', '2025-12-25', 1);

-- Insert existing albums into database
INSERT INTO albums (folder_name, display_name, emoji, description, date_range, created_by) VALUES
('BBQ', 'BBQ Album', '🔥', 'Sample BBQ album', 'Summer 2024', 1),
('Birthday', 'Birthday Album', '🎂', 'Sample birthday album', 'January 2024', 1),
('GameNight', 'Game Night Album', '🎮', 'Sample game night album', 'December 2023', 1),
('Christmas', 'Christmas Album', '🎄', 'Sample holiday album', 'December 2023', 1),
('Picnic', 'Picnic Album', '🌸', 'Sample picnic album', 'Spring 2024', 1),
('Anniversary', 'Anniversary Album', '💍', 'Sample anniversary album', 'June 2024', 1);