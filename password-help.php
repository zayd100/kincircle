<?php
require_once "config.php";

$message = '';
$messageType = 'error';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = sanitizeInput($_POST['username'] ?? '');
    $email = sanitizeInput($_POST['email'] ?? '');
    $helpRequest = sanitizeInput($_POST['help_request'] ?? '');
    
    if ($username && $email && $helpRequest) {
        try {
            // Check if user exists
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ? AND email = ?");
            $stmt->execute([$username, $email]);
            
            if ($stmt->fetchColumn() > 0) {
                // Insert help request for admins to review
                $stmt = $pdo->prepare("
                    INSERT INTO admin_messages 
                    (message_type, username, email, subject, message, created_at) 
                    VALUES ('password_help', ?, ?, 'Password Help Request', ?, NOW())
                ");
                $stmt->execute([$username, $email, $helpRequest]);
                
                $message = 'Your help request has been sent to the family administrators. They will contact you directly to help reset your password.';
                $messageType = 'success';
            } else {
                $message = 'No account found with that username and email combination.';
            }
        } catch (PDOException $e) {
            $message = 'Error submitting help request. Please try again.';
        }
    } else {
        $message = 'Please fill in all fields.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Help Familiagram</title>
    <link rel="stylesheet" href="css/main.css">
    <style>
        .help-container {
            max-width: 600px;
            margin: 4rem auto;
            padding: 3rem;
            background: var(--glass-bg);
            backdrop-filter: var(--glass-backdrop);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-xl);
            box-shadow: var(--glass-shadow-hover);
            position: relative;
            overflow: hidden;
        }
        
        .help-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--primary), transparent);
        }
        
        .help-header {
            text-align: center;
            margin-bottom: 2.5rem;
        }
        
        .help-title {
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, var(--primary), var(--primary-light));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .help-subtitle {
            color: var(--text-secondary);
            font-size: 1rem;
            opacity: 0.8;
        }
        
        .help-explanation {
            background: var(--glass-bg-hover);
            border: 1px solid var(--glass-border);
            padding: 2rem;
            border-radius: var(--radius-lg);
            margin-bottom: 2rem;
            text-align: center;
        }
        
        .help-explanation h3 {
            color: var(--primary);
            margin-bottom: 1rem;
            font-size: 1.2rem;
        }
        
        .help-explanation p {
            color: var(--text-secondary);
            line-height: 1.6;
            margin-bottom: 0.5rem;
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
            font-weight: 600;
            font-size: 0.9rem;
        }
        
        .form-input, .form-textarea {
            width: 100%;
            padding: 1rem;
            background: var(--glass-bg-hover);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-md);
            color: var(--text-primary);
            font-size: 1rem;
            transition: all var(--animation-normal);
            backdrop-filter: var(--glass-backdrop);
        }
        
        .form-input:focus, .form-textarea:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            background: var(--glass-bg-active);
        }
        
        .form-input::placeholder, .form-textarea::placeholder {
            color: var(--text-secondary);
            opacity: 0.7;
        }
        
        .btn-help {
            width: 100%;
            padding: 1rem 2rem;
            background: linear-gradient(135deg, var(--primary), var(--primary-light));
            color: white;
            border: none;
            border-radius: var(--radius-md);
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all var(--animation-normal);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .btn-help:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
        }
        
        .message {
            padding: 1.5rem;
            border-radius: var(--radius-md);
            margin-bottom: 2rem;
            font-weight: 600;
            text-align: center;
        }
        
        .message.success {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: var(--success);
        }
        
        .message.error {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1));
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: var(--error);
        }
        
        .help-footer {
            text-align: center;
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid var(--glass-border);
        }
        
        .help-footer a {
            color: var(--primary);
            text-decoration: none;
            font-weight: 600;
            transition: all var(--animation-normal);
        }
        
        .help-footer a:hover {
            color: var(--primary-light);
        }
    </style>
</head>
<body>
    <!-- Header automatically inserted by header.js -->
    
    <main class="main-content">
        <div class="help-container">
            <div class="help-header">
                <h1 class="help-title">Password Help</h1>
                <p class="help-subtitle">Get help with your three-field login</p>
            </div>
            
            <div class="help-explanation">
                <h3>💬 Direct Admin Support</h3>
                <p><strong>Forgot your three fields?</strong> No problem!</p>
                <p>Our family administrators will personally help you reset your Name, Beverage, and Number combination.</p>
                <p>Just fill out the form below and we'll contact you directly.</p>
            </div>
            
            <?php if ($message): ?>
                <div class="message <?= $messageType ?>">
                    <?= htmlspecialchars($message) ?>
                </div>
            <?php endif; ?>
            
            <form method="POST" class="help-form">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" class="form-input" 
                           placeholder="Your username" required 
                           value="<?= htmlspecialchars($_POST['username'] ?? '') ?>">
                </div>
                
                <div class="form-group">
                    <label for="email">Email Address</label>
                    <input type="email" id="email" name="email" class="form-input" 
                           placeholder="your.email@example.com" required 
                           value="<?= htmlspecialchars($_POST['email'] ?? '') ?>">
                </div>
                
                <div class="form-group">
                    <label for="help_request">How can we help?</label>
                    <textarea id="help_request" name="help_request" class="form-textarea" rows="4" required
                              placeholder="Please describe what you remember about your three fields (name, beverage, number) or any other details that might help us assist you..."><?= htmlspecialchars($_POST['help_request'] ?? '') ?></textarea>
                </div>
                
                <button type="submit" class="btn-help">
                    Send Help Request to Admins
                </button>
            </form>
            
            <div class="help-footer">
                <p>Remember your login details? <a href="login.php">Back to Login</a></p>
            </div>
        </div>
    </main>
    
    <script src="js/header.js"></script>
</body>
</html>