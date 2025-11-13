<?php
require_once "config.php";

$message = '';
$messageType = 'error';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $firstName = sanitizeInput($_POST['first_name'] ?? '');
    $lastName = sanitizeInput($_POST['last_name'] ?? '');
    $email = sanitizeInput($_POST['email'] ?? '');
    $phone = sanitizeInput($_POST['phone'] ?? '');
    $birthday = $_POST['birthday'] ?? '';
    $username = sanitizeInput($_POST['username'] ?? '');
    $relationshipNote = sanitizeInput($_POST['relationship_note'] ?? '');
    $familyConnection = sanitizeInput($_POST['family_connection'] ?? '');
    
    // Three-field password system
    $nameField = sanitizeInput($_POST['name_field'] ?? '');
    $beverageField = sanitizeInput($_POST['beverage_field'] ?? '');
    $numberField = sanitizeInput($_POST['number_field'] ?? '');
    $confirmNameField = sanitizeInput($_POST['confirm_name_field'] ?? '');
    $confirmBeverageField = sanitizeInput($_POST['confirm_beverage_field'] ?? '');
    $confirmNumberField = sanitizeInput($_POST['confirm_number_field'] ?? '');
    
    // Validation with specific error messages
    $missingFields = [];
    if (!$firstName) $missingFields[] = 'First Name';
    if (!$lastName) $missingFields[] = 'Last Name';
    if (!$email) $missingFields[] = 'Email';
    if (!$phone) $missingFields[] = 'Phone Number';
    if (!$birthday) $missingFields[] = 'Birthday';
    if (!$username) $missingFields[] = 'Username';
    if (!$relationshipNote) $missingFields[] = 'Family Connection Explanation';
    if (!$familyConnection) $missingFields[] = 'Family Connection Type';
    if (!$nameField) $missingFields[] = 'Password Name Field';
    if (!$beverageField) $missingFields[] = 'Password Beverage Field';
    if (!$numberField) $missingFields[] = 'Password Number Field';
    
    if (!empty($missingFields)) {
        $message = 'All fields are required. Missing: ' . implode(', ', $missingFields);
    } elseif ($nameField !== $confirmNameField || $beverageField !== $confirmBeverageField || $numberField !== $confirmNumberField) {
        $message = 'Password fields do not match. Please verify your name, beverage, and number.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $message = 'Please enter a valid email address.';
    } elseif (!DateTime::createFromFormat('Y-m-d', $birthday)) {
        $message = 'Please enter a valid birthday date (YYYY-MM-DD format).';
    } else {
        try {
            // Check if username already exists in users or pending
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
            $stmt->execute([$username]);
            if ($stmt->fetchColumn() > 0) {
                $message = 'Username already exists. Please choose another.';
            } else {
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM pending_users WHERE username = ?");
                $stmt->execute([$username]);
                if ($stmt->fetchColumn() > 0) {
                    $message = 'Username already exists in pending registrations.';
                } else {
                    // Create three-field password hash
                    $threeFieldPassword = $nameField . '|' . $beverageField . '|' . $numberField;
                    $passwordHash = password_hash($threeFieldPassword, PASSWORD_DEFAULT);
                    $displayName = $firstName . ' ' . $lastName;
                    
                    $stmt = $pdo->prepare("
                        INSERT INTO pending_users 
                        (username, password_hash, display_name, email, phone, birthday, family_connection, relationship_note, password_type) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'three_field')
                    ");
                    $stmt->execute([$username, $passwordHash, $displayName, $email, $phone, $birthday, $familyConnection, $relationshipNote]);
                    
                    $message = 'Registration submitted! Your account is pending admin approval. You\'ll be contacted once approved.';
                    $messageType = 'success';
                }
            }
        } catch (PDOException $e) {
            $message = 'Error submitting registration. Please try again.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Join the Family - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <style>
        /* Registration-specific styling with impossible design */
        .register-container {
            max-width: 800px;
            margin: 3rem auto;
            padding: 3rem;
            background: var(--glass-bg);
            backdrop-filter: var(--glass-backdrop);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-xl);
            box-shadow: var(--glass-shadow-hover);
            position: relative;
            overflow: hidden;
        }
        
        .register-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--primary), var(--primary-light), transparent);
        }
        
        .register-header {
            text-align: center;
            margin-bottom: 3rem;
        }
        
        .register-title {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--primary), var(--primary-light));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 0.5rem;
        }
        
        .register-subtitle {
            color: var(--text-secondary);
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .family-notice {
            background: linear-gradient(135deg, var(--glass-bg-hover), var(--glass-bg-active));
            border: 1px solid var(--glass-border);
            padding: 2rem;
            border-radius: var(--radius-lg);
            margin-bottom: 3rem;
            text-align: center;
            position: relative;
        }
        
        .family-notice::before {
            content: '👨‍👩‍👧‍👦';
            position: absolute;
            top: -1rem;
            left: 50%;
            transform: translateX(-50%);
            background: var(--glass-bg);
            padding: 0.5rem 1rem;
            border-radius: var(--radius-full);
            font-size: 1.5rem;
        }
        
        .family-notice h3 {
            color: var(--primary);
            margin-bottom: 1rem;
            font-size: 1.3rem;
        }
        
        .family-notice p {
            color: var(--text-secondary);
            line-height: 1.6;
        }
        
        .form-section {
            margin-bottom: 2.5rem;
        }
        
        .section-title {
            color: var(--primary);
            font-size: 1.2rem;
            font-weight: 700;
            margin-bottom: 1.5rem;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
            margin-bottom: 1.5rem;
        }
        
        .form-full {
            grid-column: 1 / -1;
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
        
        .form-input, .form-select, .form-textarea {
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

        /* Fix dropdown option text visibility */
        .form-select option {
            background: #ffffff;
            color: #000000;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            background: var(--glass-bg-active);
        }
        
        .form-input::placeholder, .form-textarea::placeholder {
            color: var(--text-secondary);
            opacity: 0.7;
        }
        
        .password-section {
            background: linear-gradient(135deg, var(--glass-bg-hover), rgba(99, 102, 241, 0.05));
            border: 1px solid var(--glass-border);
            padding: 2rem;
            border-radius: var(--radius-lg);
            margin-bottom: 2rem;
        }
        
        .password-explanation {
            text-align: center;
            margin-bottom: 2rem;
            padding: 1.5rem;
            background: var(--glass-bg-active);
            border-radius: var(--radius-md);
        }
        
        .password-explanation h3 {
            color: var(--primary);
            margin-bottom: 1rem;
            font-size: 1.2rem;
        }
        
        .password-explanation p {
            color: var(--text-secondary);
            line-height: 1.6;
            margin-bottom: 0.5rem;
        }
        
        .three-field-container {
            margin-bottom: 2rem;
        }
        
        .three-field-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1rem;
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
            margin-bottom: 0.5rem;
            display: block;
        }
        
        .confirm-section {
            border-top: 1px solid var(--glass-border);
            padding-top: 1.5rem;
        }
        
        .confirm-label {
            text-align: center;
            color: var(--text-secondary);
            font-size: 0.9rem;
            margin-bottom: 1rem;
            font-style: italic;
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
        
        .btn-register {
            width: 100%;
            padding: 1.25rem 2rem;
            background: linear-gradient(135deg, var(--primary), var(--primary-light));
            color: white;
            border: none;
            border-radius: var(--radius-md);
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all var(--animation-normal);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 1rem;
        }
        
        .btn-register:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 35px rgba(99, 102, 241, 0.4);
        }
        
        .btn-register:active {
            transform: translateY(-1px);
        }
        
        .register-footer {
            text-align: center;
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid var(--glass-border);
        }
        
        .register-footer p {
            color: var(--text-secondary);
            margin-bottom: 1rem;
        }
        
        .register-footer a {
            color: var(--primary);
            text-decoration: none;
            font-weight: 600;
            transition: all var(--animation-normal);
        }
        
        .register-footer a:hover {
            color: var(--primary-light);
        }
        
        .process-info {
            background: var(--glass-bg-hover);
            border: 1px solid var(--glass-border);
            padding: 2rem;
            border-radius: var(--radius-md);
            margin-top: 2rem;
        }
        
        .process-info h4 {
            color: var(--primary);
            margin-bottom: 1rem;
            font-size: 1.1rem;
        }
        
        .process-info ul {
            color: var(--text-secondary);
            line-height: 1.8;
            list-style: none;
            padding: 0;
        }
        
        .process-info li {
            margin-bottom: 0.5rem;
            padding-left: 2rem;
            position: relative;
        }
        
        .process-info li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: var(--primary);
            font-weight: bold;
        }
        
        @media (max-width: 768px) {
            .register-container {
                margin: 2rem 1rem;
                padding: 2rem;
            }
            
            .form-row, .three-field-grid {
                grid-template-columns: 1fr;
            }
            
            .register-title {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <!-- Header automatically inserted by header.js -->
    
    <main class="main-content">
        <div class="register-container">
            <div class="register-header">
                <h1 class="register-title">Join Our Family</h1>
                <p class="register-subtitle">Connect with Reed & Weaver family members worldwide</p>
            </div>
            
            <div class="family-notice">
                <h3>Family Members Only</h3>
                <p>This is an exclusive family platform for Reed and Weaver family members. All registrations are personally reviewed to verify family connections before approval.</p>
            </div>
            
            <?php if ($message): ?>
                <div class="message <?= $messageType ?>">
                    <?= htmlspecialchars($message) ?>
                </div>
            <?php endif; ?>
            
            <form method="POST" class="register-form">
                <div class="form-section">
                    <h3 class="section-title">👤 Personal Information</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="first_name">First Name</label>
                            <input type="text" id="first_name" name="first_name" class="form-input" 
                                   placeholder="Your first name" required 
                                   value="<?= htmlspecialchars($_POST['first_name'] ?? '') ?>">
                        </div>
                        <div class="form-group">
                            <label for="last_name">Last Name</label>
                            <input type="text" id="last_name" name="last_name" class="form-input" 
                                   placeholder="Your last name" required 
                                   value="<?= htmlspecialchars($_POST['last_name'] ?? '') ?>">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="email">Email Address</label>
                            <input type="email" id="email" name="email" class="form-input" 
                                   placeholder="your.email@example.com" required 
                                   value="<?= htmlspecialchars($_POST['email'] ?? '') ?>">
                        </div>
                        <div class="form-group">
                            <label for="phone">Phone Number</label>
                            <input type="tel" id="phone" name="phone" class="form-input" 
                                   placeholder="(555) 123-4567" required
                                   value="<?= htmlspecialchars($_POST['phone'] ?? '') ?>">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="birthday">Birthday</label>
                            <input type="date" id="birthday" name="birthday" class="form-input" required
                                   value="<?= htmlspecialchars($_POST['birthday'] ?? '') ?>">
                        </div>
                        <div class="form-group">
                            <label for="username">Username</label>
                            <input type="text" id="username" name="username" class="form-input" 
                                   placeholder="Choose a username" required 
                                   value="<?= htmlspecialchars($_POST['username'] ?? '') ?>">
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3 class="section-title">👨‍👩‍👧‍👦 Family Connection</h3>
                    <div class="form-group">
                        <label for="family_connection">How are you connected to the family?</label>
                        <select id="family_connection" name="family_connection" class="form-select" required>
                            <option value="">Select your connection...</option>
                            <option value="reed" <?= ($_POST['family_connection'] ?? '') === 'reed' ? 'selected' : '' ?>>Reed family member</option>
                            <option value="weaver" <?= ($_POST['family_connection'] ?? '') === 'weaver' ? 'selected' : '' ?>>Weaver family member</option>
                            <option value="married-in" <?= ($_POST['family_connection'] ?? '') === 'married-in' ? 'selected' : '' ?>>Married into the family</option>
                            <option value="other" <?= ($_POST['family_connection'] ?? '') === 'other' ? 'selected' : '' ?>>Other family connection</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="relationship_note">Please explain your family connection</label>
                        <textarea id="relationship_note" name="relationship_note" class="form-textarea" rows="4" required
                                  placeholder="Include names of relatives you're connected through, which side of the family, and any other details that help us verify your connection..."><?= htmlspecialchars($_POST['relationship_note'] ?? '') ?></textarea>
                    </div>
                </div>
                
                <div class="password-section">
                    <h3 class="section-title">🔐 Create Your Family Password</h3>
                    
                    <div class="password-explanation">
                        <h3>Revolutionary Three-Field Security</h3>
                        <p><strong>Instead of a complex password</strong>, you'll login with three simple things:</p>
                        <p>Your <strong>name</strong>, your favorite <strong>beverage</strong>, and any <strong>number</strong> you choose.</p>
                        <p>Easy to remember, impossible to forget, and still secure!</p>
                    </div>
                    
                    <div class="three-field-container">
                        <div class="three-field-grid">
                            <div class="three-field-item">
                                <label for="name_field">Name</label>
                                <input type="text" id="name_field" name="name_field" class="form-input" 
                                       placeholder="Your name" required
                                       value="<?= htmlspecialchars($_POST['name_field'] ?? '') ?>">
                            </div>
                            <div class="three-field-item">
                                <label for="beverage_field">Beverage</label>
                                <input type="text" id="beverage_field" name="beverage_field" class="form-input" 
                                       placeholder="Favorite drink" required
                                       value="<?= htmlspecialchars($_POST['beverage_field'] ?? '') ?>">
                            </div>
                            <div class="three-field-item">
                                <label for="number_field">Number</label>
                                <input type="text" id="number_field" name="number_field" class="form-input" 
                                       placeholder="Any number" required
                                       value="<?= htmlspecialchars($_POST['number_field'] ?? '') ?>">
                            </div>
                        </div>
                        
                        <div class="confirm-section">
                            <div class="confirm-label">Please confirm your three fields:</div>
                            <div class="three-field-grid">
                                <div class="three-field-item">
                                    <label for="confirm_name_field">Confirm Name</label>
                                    <input type="text" id="confirm_name_field" name="confirm_name_field" class="form-input" 
                                           placeholder="Same name again" required
                                           value="<?= htmlspecialchars($_POST['confirm_name_field'] ?? '') ?>">
                                </div>
                                <div class="three-field-item">
                                    <label for="confirm_beverage_field">Confirm Beverage</label>
                                    <input type="text" id="confirm_beverage_field" name="confirm_beverage_field" class="form-input" 
                                           placeholder="Same beverage again" required
                                           value="<?= htmlspecialchars($_POST['confirm_beverage_field'] ?? '') ?>">
                                </div>
                                <div class="three-field-item">
                                    <label for="confirm_number_field">Confirm Number</label>
                                    <input type="text" id="confirm_number_field" name="confirm_number_field" class="form-input" 
                                           placeholder="Same number again" required
                                           value="<?= htmlspecialchars($_POST['confirm_number_field'] ?? '') ?>">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <button type="submit" class="btn-register">
                    Submit Registration for Review
                </button>
            </form>
            
            <div class="register-footer">
                <p>Already have an account?</p>
                <a href="login.php">Sign in here</a>
                
                <div class="process-info">
                    <h4>What happens next?</h4>
                    <ul>
                        <li>Your registration will be personally reviewed by the site administrator</li>
                        <li>We'll verify your family connection using the information you provided</li>
                        <li>You'll receive an email notification when your account is approved</li>
                        <li>Once approved, you can login and access all family features</li>
                    </ul>
                </div>
            </div>
        </div>
    </main>
    
    <script src="js/header.js"></script>
</body>
</html>