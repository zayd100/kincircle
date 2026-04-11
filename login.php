<?php
require_once "config.php";

$error = '';
$returnUrl = $_GET['return'] ?? 'index.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Revolutionary three-field password system - NO USERNAME REQUIRED!
    $nameField = sanitizeInput($_POST['name_field'] ?? '');
    $beverageField = sanitizeInput($_POST['beverage_field'] ?? '');
    $numberField = sanitizeInput($_POST['number_field'] ?? '');
    
    if ($nameField && $beverageField && $numberField) {
        // Create the three-field combination
        $threeFieldPassword = $nameField . '|' . $beverageField . '|' . $numberField;
        
        // Check ALL users to find a match (revolutionary approach!)
        $stmt = $pdo->prepare("SELECT id, username, password_hash, display_name, is_admin, password_type FROM users");
        $stmt->execute();
        $users = $stmt->fetchAll();
        
        $loginSuccess = false;
        $matchedUser = null;
        
        foreach ($users as $user) {
            // Handle three-field password system (default)
            if (($user['password_type'] ?? 'three_field') === 'three_field') {
                if (password_verify($threeFieldPassword, $user['password_hash'])) {
                    $loginSuccess = true;
                    $matchedUser = $user;
                    break;
                }
            }
        }
        
        if ($loginSuccess && $matchedUser) {
            // Regenerate session ID for security
            session_regenerate_id(true);
            
            // Set all session variables
            $_SESSION['user_id'] = $matchedUser['id'];
            $_SESSION['username'] = $matchedUser['username'];
            $_SESSION['display_name'] = $matchedUser['display_name'];
            $_SESSION['is_admin'] = $matchedUser['is_admin'];
            $_SESSION['logged_in'] = true;
            $_SESSION['login_time'] = time();
            $_SESSION['last_activity'] = time();
            
            // Update last login
            $stmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
            $stmt->execute([$matchedUser['id']]);
            
            // Redirect to the originally requested page or index
            $redirect = $_POST['return_url'] ?? 'index.php';

            // Security: Validate redirect URL to prevent open redirect attacks
            // Only allow relative URLs (no external domains)
            $parsed = parse_url($redirect);
            if (isset($parsed['host']) || isset($parsed['scheme']) || strpos($redirect, '//') === 0) {
                // External URL detected - redirect to index instead
                $redirect = 'index.php';
            }

            header('Location: ' . $redirect);
            exit;
        } else {
            $error = 'Invalid login credentials. Check your name, beverage, and number combination.';
        }
    } else {
        $error = 'Please fill in all three fields: name, beverage, and number.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Family Login - Familiagram</title>
    <link rel="stylesheet" href="css/main.css">
    <style>
        /* Login-specific glass morphism styling */
        .login-container {
            max-width: 550px;
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
        
        .login-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--primary), transparent);
        }
        
        .login-header {
            text-align: center;
            margin-bottom: 2.5rem;
        }
        
        .login-title {
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, var(--primary), var(--primary-light));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .login-subtitle {
            color: var(--text-secondary);
            font-size: 1rem;
            opacity: 0.8;
        }
        
        .three-field-system {
            margin-bottom: 2rem;
        }
        
        .three-field-explanation {
            background: var(--glass-bg-hover);
            border: 1px solid var(--glass-border);
            padding: 1.5rem;
            border-radius: var(--radius-lg);
            margin-bottom: 2rem;
            text-align: center;
        }
        
        .three-field-explanation h3 {
            color: var(--primary);
            margin-bottom: 0.5rem;
            font-size: 1.1rem;
        }
        
        .three-field-explanation p {
            color: var(--text-secondary);
            font-size: 0.9rem;
            line-height: 1.5;
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
        
        .form-input {
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
        
        .form-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            background: var(--glass-bg-active);
        }
        
        .form-input::placeholder {
            color: var(--text-secondary);
            opacity: 0.7;
        }
        
        .three-field-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        
        .three-field-item {
            text-align: center;
        }
        
        .three-field-item label {
            color: var(--primary);
            font-weight: 700;
            text-transform: uppercase;
            font-size: 0.8rem;
            letter-spacing: 0.5px;
        }
        
        .btn-login {
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
            position: relative;
            overflow: hidden;
        }
        
        .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
        }
        
        .btn-login:active {
            transform: translateY(0);
        }
        
        .error-message {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1));
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: var(--error);
            padding: 1rem;
            border-radius: var(--radius-md);
            margin-bottom: 1.5rem;
            font-weight: 600;
            text-align: center;
        }
        
        .login-footer {
            text-align: center;
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid var(--glass-border);
        }
        
        .login-footer p {
            color: var(--text-secondary);
            margin-bottom: 1rem;
        }
        
        .login-footer a {
            color: var(--primary);
            text-decoration: none;
            font-weight: 600;
            transition: all var(--animation-normal);
        }
        
        .login-footer a:hover {
            color: var(--primary-light);
        }
        
        .demo-info {
            background: var(--glass-bg-hover);
            border: 1px solid var(--glass-border);
            padding: 1.5rem;
            border-radius: var(--radius-md);
            margin-top: 1rem;
            font-size: 0.85rem;
            color: var(--text-secondary);
        }
        
        .demo-info strong {
            color: var(--primary);
        }
        
        @media (max-width: 640px) {
            .login-container {
                margin: 2rem 1rem;
                padding: 2rem;
            }
            
            .three-field-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
            }
            
            .login-title {
                font-size: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <!-- Header automatically inserted by header.js -->
    
    <main class="main-content">
        <div class="login-container">
            <div class="login-header">
                <h1 class="login-title">Welcome Home</h1>
                <p class="login-subtitle">Sign in to connect with family</p>
            </div>
            
            <div class="three-field-explanation">
                <h3>Simple login!</h3>
                <p>Login with just three memorable things: your name, favorite beverage, and a number. No username needed - impossible to forget!</p>
            </div>
            
            <?php if ($error): ?>
                <div class="error-message">
                    <?= htmlspecialchars($error) ?>
                </div>
            <?php endif; ?>
            
            <form method="POST" class="login-form">
                <input type="hidden" name="return_url" value="<?= htmlspecialchars($returnUrl) ?>">
                <div class="three-field-system">
                    <div class="three-field-grid">
                        <div class="three-field-item">
                            <label for="name_field">Name</label>
                            <input type="password" id="name_field" name="name_field" class="form-input"
                                   placeholder="Your name" required autocomplete="off">
                        </div>
                        <div class="three-field-item">
                            <label for="beverage_field">Beverage</label>
                            <input type="password" id="beverage_field" name="beverage_field" class="form-input"
                                   placeholder="Favorite drink" required autocomplete="off">
                        </div>
                        <div class="three-field-item">
                            <label for="number_field">Number</label>
                            <input type="password" id="number_field" name="number_field" class="form-input"
                                   placeholder="Any number" required autocomplete="off">
                        </div>
                    </div>
                </div>
                
                <button type="submit" class="btn-login">
                    Sign In to Famaliagram
                </button>
            </form>
            
            <div class="login-footer">
                <p>Forgot your three fields? <a href="password-help.php">Get help from admins</a></p>
                <p>Not part of the family yet? <a href="register.php">Request Family Membership</a></p>
                
            </div>
        </div>
    </main>
    
    <script src="js/header.js"></script>
</body>
</html>