<?php
require_once "config.php";
requireLogin();

$userId = $_SESSION['user_id'];
$displayName = $_SESSION['display_name'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Memorial - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="upload/upload.css">
    <style>
        /* Memorial creation form styling */
        .memorial-create-container {
            max-width: 800px;
            margin: 3rem auto;
            padding: 3rem;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(99, 102, 241, 0.05));
            border: 2px solid rgba(139, 92, 246, 0.2);
            border-radius: var(--radius-xl);
            box-shadow: 0 8px 32px rgba(139, 92, 246, 0.15);
        }

        .memorial-create-header {
            text-align: center;
            margin-bottom: 2.5rem;
            padding-bottom: 2rem;
            border-bottom: 2px solid rgba(139, 92, 246, 0.2);
        }

        .memorial-create-header h1 {
            font-size: 2.5rem;
            color: var(--primary-light);
            margin-bottom: 0.5rem;
        }

        .memorial-create-header p {
            color: var(--text-secondary);
            font-size: 1.1rem;
        }

        .form-section {
            margin-bottom: 2.5rem;
        }

        .form-section h2 {
            color: var(--primary);
            margin-bottom: 1.5rem;
            font-size: 1.5rem;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-group label {
            display: block;
            color: var(--text-primary);
            font-weight: 600;
            margin-bottom: 0.5rem;
            font-size: 0.95rem;
        }

        .form-input, .form-textarea {
            width: 100%;
            padding: 1rem;
            background: var(--glass-bg-hover);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: var(--radius-md);
            color: var(--text-primary);
            font-size: 1rem;
            transition: all var(--animation-normal);
        }

        .form-input:focus, .form-textarea:focus {
            outline: none;
            border-color: var(--primary-light);
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
            background: var(--glass-bg-active);
        }

        .form-textarea {
            min-height: 200px;
            resize: vertical;
            font-family: inherit;
            line-height: 1.6;
        }

        .photo-upload-area {
            border: 2px dashed rgba(139, 92, 246, 0.3);
            border-radius: var(--radius-lg);
            padding: 2rem;
            text-align: center;
            background: var(--glass-bg);
            transition: all var(--animation-normal);
            cursor: pointer;
        }

        .photo-upload-area:hover {
            border-color: var(--primary-light);
            background: var(--glass-bg-hover);
        }

        .photo-upload-area.has-file {
            border-color: var(--success);
            background: rgba(16, 185, 129, 0.05);
        }

        .upload-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }

        .photo-preview {
            max-width: 300px;
            max-height: 300px;
            margin: 1rem auto;
            border-radius: var(--radius-md);
            display: none;
        }

        .photo-preview.show {
            display: block;
        }

        input[type="file"] {
            display: none;
        }

        .form-actions {
            display: flex;
            gap: 1rem;
            margin-top: 2.5rem;
            padding-top: 2rem;
            border-top: 2px solid rgba(139, 92, 246, 0.2);
        }

        .btn {
            flex: 1;
            padding: 1rem 2rem;
            border: none;
            border-radius: var(--radius-md);
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all var(--animation-normal);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--primary), var(--primary-light));
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(139, 92, 246, 0.3);
        }

        .btn-secondary {
            background: var(--glass-bg-hover);
            color: var(--text-primary);
            border: 1px solid var(--glass-border);
        }

        .btn-secondary:hover {
            background: var(--glass-bg-active);
        }

        .message {
            padding: 1rem;
            border-radius: var(--radius-md);
            margin-bottom: 1.5rem;
            text-align: center;
            font-weight: 600;
        }

        .message.success {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: var(--success);
        }

        .message.error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: var(--error);
        }

        .help-text {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-top: 0.5rem;
        }

        @media (max-width: 768px) {
            .memorial-create-container {
                margin: 1rem;
                padding: 2rem 1.5rem;
            }

            .form-actions {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <!-- Header automatically inserted by header.js -->

    <main class="main-content">
        <div class="memorial-create-container">
            <div class="memorial-create-header">
                <h1>🕊️ Create Memorial</h1>
                <p>Honor a loved one's memory with a beautiful tribute</p>
            </div>

            <div id="messageArea"></div>

            <form id="memorialForm" enctype="multipart/form-data">
                <!-- Memorial Details -->
                <div class="form-section">
                    <h2>Memorial Details</h2>

                    <div class="form-group">
                        <label for="memorialName">Name *</label>
                        <input type="text" id="memorialName" name="memorial_name" class="form-input"
                               placeholder="Full name of loved one" required>
                    </div>

                    <div class="form-group">
                        <label for="birthDate">Birth Date</label>
                        <input type="text" id="birthDate" name="birth_date" class="form-input"
                               placeholder="e.g., January 15, 1945">
                        <p class="help-text">Optional - Enter in any format you prefer</p>
                    </div>

                    <div class="form-group">
                        <label for="deathDate">Date of Passing</label>
                        <input type="text" id="deathDate" name="death_date" class="form-input"
                               placeholder="e.g., March 20, 2020">
                        <p class="help-text">Optional - Enter in any format you prefer</p>
                    </div>
                </div>

                <!-- Memorial Text -->
                <div class="form-section">
                    <h2>Memorial Message</h2>

                    <div class="form-group">
                        <label for="memorialText">Share Your Tribute *</label>
                        <textarea id="memorialText" name="memorial_text" class="form-textarea"
                                  placeholder="Share your memories, stories, and what made them special..." required></textarea>
                        <p class="help-text">Write from the heart - share what made them special to you and the family</p>
                    </div>
                </div>

                <!-- Photo Upload -->
                <div class="form-section">
                    <h2>Memorial Photos</h2>

                    <div class="form-group">
                        <label>Upload Photos (Optional)</label>
                        <p class="help-text" style="margin-bottom: 1rem;">You can upload multiple photos to honor their memory</p>
                        <div class="drop-zone" id="dropZone">
                            <div class="drop-content">
                                <div class="drop-icon">📸</div>
                                <p class="drop-text">Drag & drop multiple photos here</p>
                                <p class="drop-subtext">or click to browse and select files</p>
                                <input type="file" id="memorialPhoto" name="memorial_photos[]" multiple accept="image/*" hidden>
                            </div>
                        </div>
                        <div class="file-list" id="fileList"></div>
                    </div>
                </div>

                <!-- Submit Actions -->
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="window.location.href='memorials.php'">
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary" id="submitBtn">
                        Submit for Approval
                    </button>
                </div>
            </form>
        </div>
    </main>

    <script src="js/header.js"></script>
    <script src="upload/upload.js"></script>
    <script>
        // Customize photoUploader for memorial context
        document.addEventListener('DOMContentLoaded', async () => {
            // Override form submission for memorial
            const form = document.getElementById('memorialForm');
            const submitBtn = document.getElementById('submitBtn');
            const messageArea = document.getElementById('messageArea');

            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const name = document.getElementById('memorialName').value.trim();
                const birthDate = document.getElementById('birthDate').value.trim();
                const deathDate = document.getElementById('deathDate').value.trim();
                const memorialText = document.getElementById('memorialText').value.trim();

                if (!name || !memorialText) {
                    messageArea.innerHTML = `<div class="message error">Name and memorial message are required</div>`;
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = 'Uploading photos...';

                try {
                    // Upload photos to R2
                    const uploadedPhotos = [];

                    if (photoUploader.selectedFiles.length > 0) {
                        for (const file of photoUploader.selectedFiles) {
                            // Get upload URL
                            const urlResponse = await fetch('/api/get-upload-url.php', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    filename: file.name,
                                    fileType: file.type,
                                    fileSize: file.size,
                                    uploadType: 'photo'
                                })
                            });

                            const urlData = await urlResponse.json();
                            if (!urlData.success) {
                                throw new Error(urlData.error || 'Failed to get upload URL');
                            }

                            // Upload to R2
                            await photoUploader.uploadToR2(file, urlData.upload, () => {});

                            // Add to uploaded photos array
                            uploadedPhotos.push({
                                key: urlData.upload.key,
                                original_name: file.name,
                                file_type: file.type,
                                file_size: file.size
                            });
                        }
                    }

                    submitBtn.textContent = 'Submitting memorial...';

                    // Submit memorial with photo keys
                    const response = await fetch('/api/memorial-submit.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: name,
                            birth_date: birthDate,
                            death_date: deathDate,
                            memorial_text: memorialText,
                            photos: uploadedPhotos
                        })
                    });

                    const result = await response.json();

                    if (result.success) {
                        messageArea.innerHTML = `
                            <div class="message success">
                                ${result.message}<br>
                                Your memorial will be reviewed by an admin before being published.
                            </div>
                        `;

                        setTimeout(() => {
                            window.location.href = 'memorials.php';
                        }, 2000);
                    } else {
                        messageArea.innerHTML = `<div class="message error">${result.error}</div>`;
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Submit for Approval';
                    }
                } catch (error) {
                    console.error('Error submitting memorial:', error);
                    messageArea.innerHTML = `<div class="message error">Error submitting memorial. Please try again.</div>`;
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit for Approval';
                }
            });
        });
    </script>
</body>
</html>
