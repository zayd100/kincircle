-- Kin Circle Database Setup
-- Private Family Social Network
--
-- Instructions:
-- 1. Create a database for your installation
-- 2. Update config.php with your database credentials
-- 3. Run this script: mysql -u username -p database_name < setup_database.sql

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------

--
-- Table structure for table `admin_messages`
--

CREATE TABLE `admin_messages` (
  `id` int(11) NOT NULL,
  `message_type` enum('password_help','general','bug_report','feature_request') DEFAULT 'general',
  `username` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `subject` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `status` enum('unread','read','resolved') DEFAULT 'unread',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolved_by` int(11) DEFAULT NULL,
  `admin_notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `albums`
--

CREATE TABLE `albums` (
  `id` int(11) NOT NULL,
  `folder_name` varchar(100) NOT NULL,
  `display_name` varchar(200) NOT NULL,
  `emoji` varchar(10) DEFAULT '?',
  `description` text DEFAULT NULL,
  `date_range` varchar(50) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `calendar_events`
--

CREATE TABLE `calendar_events` (
  `id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `event_date` date NOT NULL,
  `description` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `content_tags`
--

CREATE TABLE `content_tags` (
  `id` int(11) NOT NULL,
  `person_id` int(11) NOT NULL,
  `content_type` enum('photo','media','document','post') NOT NULL,
  `content_id` int(11) NOT NULL,
  `tagged_by_user_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `event_commitments`
--

CREATE TABLE `event_commitments` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `committed` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `event_submissions`
--

CREATE TABLE `event_submissions` (
  `id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `event_date` date NOT NULL,
  `description` text DEFAULT NULL,
  `submitter_id` int(11) NOT NULL,
  `event_type` enum('birthday','anniversary','reunion','holiday','gathering','other') DEFAULT 'other',
  `recurring` enum('none','yearly','monthly') DEFAULT 'none',
  `contact_info` varchar(200) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `submitted_at` timestamp NULL DEFAULT current_timestamp(),
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewer_notes` text DEFAULT NULL,
  `approved_event_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `family_connection_cache`
--

CREATE TABLE `family_connection_cache` (
  `id` int(11) NOT NULL,
  `cache_key` varchar(255) NOT NULL,
  `graph_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`graph_data`)),
  `person_count` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `family_inferences`
--

CREATE TABLE `family_inferences` (
  `id` int(11) NOT NULL,
  `person_user_id` int(11) NOT NULL,
  `related_user_id` int(11) NOT NULL,
  `relationship` varchar(50) NOT NULL,
  `inference_path` text NOT NULL,
  `confidence` decimal(3,2) DEFAULT 1.00,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `family_relationships`
--

CREATE TABLE `family_relationships` (
  `id` int(11) NOT NULL,
  `claimer_user_id` int(11) NOT NULL,
  `claimed_user_id` int(11) NOT NULL,
  `relationship` enum('parent','child','sibling','spouse') NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `active` tinyint(1) DEFAULT 1,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `revoked_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Triggers `family_relationships`
--
DELIMITER $$
CREATE TRIGGER `update_family_inferences_on_relationship_change` AFTER INSERT ON `family_relationships` FOR EACH ROW BEGIN
    DELETE FROM family_inferences
    WHERE person_user_id = NEW.claimer_user_id
       OR person_user_id = NEW.claimed_user_id
       OR related_user_id = NEW.claimer_user_id
       OR related_user_id = NEW.claimed_user_id;
    DELETE FROM family_connection_cache
    WHERE expires_at < NOW() OR person_count > 0;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_family_inferences_on_relationship_revoke` AFTER UPDATE ON `family_relationships` FOR EACH ROW BEGIN
    IF OLD.active != NEW.active THEN
        DELETE FROM family_inferences
        WHERE person_user_id = NEW.claimer_user_id
           OR person_user_id = NEW.claimed_user_id
           OR related_user_id = NEW.claimer_user_id
           OR related_user_id = NEW.claimed_user_id;
        DELETE FROM family_connection_cache
        WHERE expires_at < NOW() OR person_count > 0;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `memorials`
--

CREATE TABLE `memorials` (
  `id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `birth_date` varchar(100) DEFAULT NULL,
  `death_date` varchar(100) DEFAULT NULL,
  `memorial_text` text NOT NULL,
  `photo_filename` varchar(255) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `memorial_submissions`
--

CREATE TABLE `memorial_submissions` (
  `id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `birth_date` varchar(100) DEFAULT NULL,
  `death_date` varchar(100) DEFAULT NULL,
  `memorial_text` text NOT NULL,
  `photo_filename` varchar(255) DEFAULT NULL,
  `submitted_by` int(11) NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `submitted_at` timestamp NULL DEFAULT current_timestamp(),
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewer_notes` text DEFAULT NULL,
  `approved_memorial_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int(11) NOT NULL,
  `subject` varchar(200) NOT NULL,
  `content` text NOT NULL,
  `posted_by` int(11) NOT NULL,
  `category` varchar(50) DEFAULT 'general',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  `is_pinned` tinyint(1) DEFAULT 0,
  `is_locked` tinyint(1) DEFAULT 0,
  `view_count` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `message_replies`
--

CREATE TABLE `message_replies` (
  `id` int(11) NOT NULL,
  `message_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `posted_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pending_users`
--

CREATE TABLE `pending_users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `birthday` date DEFAULT NULL,
  `family_connection` enum('direct','married-in','other') NOT NULL,
  `relationship_note` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `admin_notes` text DEFAULT NULL,
  `password_type` enum('traditional','three_field') DEFAULT 'three_field'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `people`
--

CREATE TABLE `people` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `normalized_name` varchar(255) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by_user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `photo_submissions`
--

CREATE TABLE `photo_submissions` (
  `id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_type` varchar(100) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `storage_key` varchar(512) DEFAULT NULL,
  `storage_provider` enum('local','r2') NOT NULL DEFAULT 'local',
  `mime_type` varchar(100) DEFAULT NULL,
  `uploader_id` int(11) NOT NULL,
  `event_name` varchar(200) DEFAULT NULL,
  `date_taken` varchar(100) DEFAULT NULL,
  `people_in_photo` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `photo_title` varchar(200) DEFAULT NULL,
  `photo_description` text DEFAULT NULL,
  `location_name` varchar(200) DEFAULT NULL,
  `location_city` varchar(100) DEFAULT NULL,
  `location_state` varchar(50) DEFAULT NULL,
  `suggested_album` varchar(100) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `uploaded_at` timestamp NULL DEFAULT current_timestamp(),
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewer_notes` text DEFAULT NULL,
  `final_album` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `photo_tags`
--

CREATE TABLE `photo_tags` (
  `id` int(11) NOT NULL,
  `photo_id` int(11) NOT NULL,
  `person_name` varchar(100) NOT NULL,
  `tagged_by_user_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `private_messages`
--

CREATE TABLE `private_messages` (
  `id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `subject` varchar(200) DEFAULT NULL,
  `content` text NOT NULL,
  `is_important` tinyint(1) DEFAULT 0,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `recipes`
--

CREATE TABLE `recipes` (
  `id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `difficulty` varchar(20) DEFAULT NULL,
  `serves` int(11) DEFAULT NULL,
  `prep_time` varchar(100) DEFAULT NULL,
  `cook_time` varchar(100) DEFAULT NULL,
  `ingredients` text NOT NULL,
  `instructions` text NOT NULL,
  `story` text DEFAULT NULL,
  `source` varchar(200) DEFAULT NULL,
  `occasion` varchar(200) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `recipe_modifications`
--

CREATE TABLE `recipe_modifications` (
  `id` int(11) NOT NULL,
  `recipe_id` int(11) NOT NULL,
  `modified_by` int(11) NOT NULL,
  `modification_text` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `relationship_notifications`
--

CREATE TABLE `relationship_notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` enum('claim_made','claim_revoked','relationship_suggested') NOT NULL,
  `relationship_id` int(11) DEFAULT NULL,
  `claimer_user_id` int(11) DEFAULT NULL,
  `message` text NOT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `birthday` date DEFAULT NULL,
  `is_admin` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL,
  `cousin_connect_available` tinyint(1) DEFAULT 0,
  `cousin_connect_interests` text DEFAULT NULL,
  `cousin_connect_since` timestamp NULL DEFAULT NULL,
  `password_type` enum('traditional','three_field') DEFAULT 'three_field'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

ALTER TABLE `admin_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `resolved_by` (`resolved_by`);

ALTER TABLE `albums`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `folder_name` (`folder_name`),
  ADD KEY `created_by` (`created_by`);

ALTER TABLE `calendar_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

ALTER TABLE `content_tags`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_content_tag` (`person_id`,`content_type`,`content_id`),
  ADD KEY `idx_person_content` (`person_id`,`content_type`),
  ADD KEY `idx_content_lookup` (`content_type`,`content_id`),
  ADD KEY `tagged_by_user_id` (`tagged_by_user_id`);

ALTER TABLE `event_commitments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_commitment` (`event_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `event_submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `submitter_id` (`submitter_id`),
  ADD KEY `reviewed_by` (`reviewed_by`),
  ADD KEY `approved_event_id` (`approved_event_id`);

ALTER TABLE `family_connection_cache`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_cache_key` (`cache_key`),
  ADD KEY `idx_expiry` (`expires_at`);

ALTER TABLE `family_inferences`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_inference` (`person_user_id`,`related_user_id`,`relationship`),
  ADD KEY `idx_person_inferences` (`person_user_id`,`relationship`),
  ADD KEY `idx_related_inferences` (`related_user_id`,`relationship`);

ALTER TABLE `family_relationships`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_claim` (`claimer_user_id`,`claimed_user_id`,`relationship`),
  ADD KEY `idx_claimer_lookup` (`claimer_user_id`,`relationship`,`active`),
  ADD KEY `idx_claimed_lookup` (`claimed_user_id`,`relationship`,`active`),
  ADD KEY `idx_active_relationships` (`active`,`relationship`),
  ADD KEY `revoked_by` (`revoked_by`);

ALTER TABLE `memorials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

ALTER TABLE `memorial_submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `submitted_by` (`submitted_by`),
  ADD KEY `reviewed_by` (`reviewed_by`);

ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `posted_by` (`posted_by`);

ALTER TABLE `message_replies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `message_id` (`message_id`),
  ADD KEY `posted_by` (`posted_by`);

ALTER TABLE `pending_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `reviewed_by` (`reviewed_by`);

ALTER TABLE `people`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_normalized_name` (`normalized_name`),
  ADD KEY `idx_name_search` (`normalized_name`,`display_name`),
  ADD KEY `created_by_user_id` (`created_by_user_id`);

ALTER TABLE `photo_submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uploader_id` (`uploader_id`),
  ADD KEY `reviewed_by` (`reviewed_by`),
  ADD KEY `idx_location_city` (`location_city`),
  ADD KEY `idx_date_taken` (`date_taken`),
  ADD KEY `idx_storage_key` (`storage_key`),
  ADD KEY `idx_storage_provider` (`storage_provider`);

ALTER TABLE `photo_tags`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tagged_by_user_id` (`tagged_by_user_id`),
  ADD KEY `idx_photo_id` (`photo_id`),
  ADD KEY `idx_person_name` (`person_name`);

ALTER TABLE `private_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sender` (`sender_id`),
  ADD KEY `idx_recipient` (`recipient_id`),
  ADD KEY `idx_conversation` (`sender_id`,`recipient_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_is_read` (`is_read`);

ALTER TABLE `recipes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

ALTER TABLE `recipe_modifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recipe_id` (`recipe_id`),
  ADD KEY `modified_by` (`modified_by`);

ALTER TABLE `relationship_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_notifications` (`user_id`,`read_at`,`created_at`),
  ADD KEY `idx_relationship_notifications` (`relationship_id`),
  ADD KEY `claimer_user_id` (`claimer_user_id`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

ALTER TABLE `admin_messages` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `albums` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `calendar_events` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `content_tags` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `event_commitments` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `event_submissions` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `family_connection_cache` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `family_inferences` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `family_relationships` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `memorials` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `memorial_submissions` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `messages` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `message_replies` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `pending_users` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `people` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `photo_submissions` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `photo_tags` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `private_messages` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `recipes` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `recipe_modifications` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `relationship_notifications` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `users` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

ALTER TABLE `admin_messages`
  ADD CONSTRAINT `admin_messages_ibfk_1` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`);

ALTER TABLE `albums`
  ADD CONSTRAINT `albums_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

ALTER TABLE `calendar_events`
  ADD CONSTRAINT `calendar_events_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

ALTER TABLE `content_tags`
  ADD CONSTRAINT `content_tags_ibfk_1` FOREIGN KEY (`person_id`) REFERENCES `people` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `content_tags_ibfk_2` FOREIGN KEY (`tagged_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `event_commitments`
  ADD CONSTRAINT `event_commitments_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `calendar_events` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `event_commitments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `event_submissions`
  ADD CONSTRAINT `event_submissions_ibfk_1` FOREIGN KEY (`submitter_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `event_submissions_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `event_submissions_ibfk_3` FOREIGN KEY (`approved_event_id`) REFERENCES `calendar_events` (`id`);

ALTER TABLE `family_inferences`
  ADD CONSTRAINT `family_inferences_ibfk_1` FOREIGN KEY (`person_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `family_inferences_ibfk_2` FOREIGN KEY (`related_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `family_relationships`
  ADD CONSTRAINT `family_relationships_ibfk_1` FOREIGN KEY (`claimer_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `family_relationships_ibfk_2` FOREIGN KEY (`claimed_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `family_relationships_ibfk_3` FOREIGN KEY (`revoked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

ALTER TABLE `memorials`
  ADD CONSTRAINT `memorials_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

ALTER TABLE `memorial_submissions`
  ADD CONSTRAINT `memorial_submissions_ibfk_1` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `memorial_submissions_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`);

ALTER TABLE `messages`
  ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`);

ALTER TABLE `message_replies`
  ADD CONSTRAINT `message_replies_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`),
  ADD CONSTRAINT `message_replies_ibfk_2` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`);

ALTER TABLE `pending_users`
  ADD CONSTRAINT `pending_users_ibfk_1` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`);

ALTER TABLE `people`
  ADD CONSTRAINT `people_ibfk_1` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `photo_submissions`
  ADD CONSTRAINT `photo_submissions_ibfk_1` FOREIGN KEY (`uploader_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `photo_submissions_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`);

ALTER TABLE `photo_tags`
  ADD CONSTRAINT `photo_tags_ibfk_1` FOREIGN KEY (`photo_id`) REFERENCES `photo_submissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `photo_tags_ibfk_2` FOREIGN KEY (`tagged_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `private_messages`
  ADD CONSTRAINT `private_messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `private_messages_ibfk_2` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `recipes`
  ADD CONSTRAINT `recipes_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

ALTER TABLE `recipe_modifications`
  ADD CONSTRAINT `recipe_modifications_ibfk_1` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`),
  ADD CONSTRAINT `recipe_modifications_ibfk_2` FOREIGN KEY (`modified_by`) REFERENCES `users` (`id`);

ALTER TABLE `relationship_notifications`
  ADD CONSTRAINT `relationship_notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `relationship_notifications_ibfk_2` FOREIGN KEY (`relationship_id`) REFERENCES `family_relationships` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `relationship_notifications_ibfk_3` FOREIGN KEY (`claimer_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
