// Toggle password visibility
function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);
    const icon = passwordInput.nextElementSibling.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Form validation
document.addEventListener('DOMContentLoaded', function() {
    // Login form validation
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            let isValid = true;
            
            // Email validation
            const email = document.getElementById('email');
            if (!validateEmail(email.value)) {
                showError(email, 'Please enter a valid email address');
                isValid = false;
            } else {
                clearError(email);
            }
            
            // Password validation
            const password = document.getElementById('password');
            if (password.value.length < 6) {
                showError(password, 'Password must be at least 6 characters');
                isValid = false;
            } else {
                clearError(password);
            }
            
            if (!isValid) {
                e.preventDefault();
            }
        });
    }
    
    // Register form validation
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            let isValid = true;
            
            // First name validation
            const firstName = document.getElementById('firstName');
            if (firstName.value.trim() === '') {
                showError(firstName, 'First name is required');
                isValid = false;
            } else {
                clearError(firstName);
            }
            
            // Email validation
            const email = document.getElementById('email');
            if (!validateEmail(email.value)) {
                showError(email, 'Please enter a valid email address');
                isValid = false;
            } else {
                clearError(email);
            }
            
            // Password validation
            const password = document.getElementById('password');
            if (password.value.length < 6) {
                showError(password, 'Password must be at least 6 characters');
                isValid = false;
            } else {
                clearError(password);
            }
            
            // Confirm password validation
            const confirmPassword = document.getElementById('confirmPassword');
            if (confirmPassword.value !== password.value) {
                showError(confirmPassword, 'Passwords do not match');
                isValid = false;
            } else {
                clearError(confirmPassword);
            }
            
            if (!isValid) {
                e.preventDefault();
            }
        });
    }
    
    // Forgot password form validation
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', function(e) {
            let isValid = true;
            
            // Email validation
            const email = document.getElementById('email');
            if (!validateEmail(email.value)) {
                showError(email, 'Please enter a valid email address');
                isValid = false;
            } else {
                clearError(email);
                
                // Show success message (in a real app, this would happen after server response)
                if (isValid) {
                    showSuccessMessage('Password reset link has been sent to your email');
                }
            }
            
            if (!isValid) {
            } else {
                // For demo purposes only - in a real app, this would be handled by the server
                
                showSuccessMessage('Password reset link has been sent to your email');
            }
        });
    }
    
    // Reset password form validation
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', function(e) {
            let isValid = true;
            
            // Password validation
            const password = document.getElementById('password');
            if (password.value.length < 6) {
                showError(password, 'Password must be at least 6 characters');
                isValid = false;
            } else {
                clearError(password);
            }
            
            // Confirm password validation
            const confirmPassword = document.getElementById('confirmPassword');
            if (confirmPassword.value !== password.value) {
                showError(confirmPassword, 'Passwords do not match');
                isValid = false;
            } else {
                clearError(confirmPassword);
            }
            
            if (!isValid) {
                e.preventDefault();
            } else {
                // For demo purposes only - in a real app, this would be handled by the server
                e.preventDefault();
                showSuccessMessage('Your password has been reset successfully');
                
                // Redirect to login page after 2 seconds
                setTimeout(function() {
                    window.location.href = 'login.html';
                }, 2000);
            }
        });
    }
});

// Helper functions
function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function showError(input, message) {
    const formGroup = input.parentElement.closest('.form-group');
    formGroup.classList.add('error');
    
    let errorElement = formGroup.querySelector('.error-message');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        
        if (input.parentElement.className === 'password-input') {
            input.parentElement.parentElement.appendChild(errorElement);
        } else {
            input.parentElement.appendChild(errorElement);
        }
    }
    
    errorElement.textContent = message;
}

function clearError(input) {
    const formGroup = input.parentElement.closest('.form-group');
    formGroup.classList.remove('error');
    
    const errorElement = formGroup.querySelector('.error-message');
    if (errorElement) {
        errorElement.textContent = '';
    }
}

function showSuccessMessage(message) {
    // Remove any existing success message
    const existingMessage = document.querySelector('.success-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create and add new success message
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.textContent = message;
    
    const form = document.querySelector('form');
    form.parentNode.insertBefore(successMessage, form);
    
    // Scroll to top to show the message
    window.scrollTo(0, 0);
}