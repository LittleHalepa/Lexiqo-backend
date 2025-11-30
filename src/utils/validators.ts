import validator from 'validator';

export const isValidEmail = (email: string) => {
    return validator.isEmail(email);
}

export const isValidUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,19}$/;
    const isValid = usernameRegex.test(username);
    
    return isValid;
}

export const isValidPassword = (password: string) => {
    
    const requirements = {
        length: password.length >= 8,
        maxLength: password.length <= 50,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        controlCharRegex: /[\x00-\x1F\x7F]/.test(password)
    }

    const errors = [];
    if (!requirements.length) errors.push('Password must be at least 8 characters long');
    if (!requirements.maxLength) errors.push('Password must not exceed 50 characters');
    if (!requirements.uppercase) errors.push('Password must contain at least one uppercase letter');
    if (!requirements.lowercase) errors.push('Password must contain at least one lowercase letter');
    if (!requirements.number) errors.push('Password must contain at least one number');
    if (requirements.controlCharRegex) errors.push('Password must not contain control characters');
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

export const validateUserInput = (username: string, email: string, password: string) => {
    const errors: string[] = [];

    if (!username || !email || !password) {
        errors.push('All fields are required');
        return { isValid: false, errors };
    }

    if (!isValidEmail(email)) {
        errors.push('Please enter a valid email format!');
    }

    if (!isValidUsername(username)) {
        errors.push('Username must be 3-20 characters long and can only contain letters, numbers, underscores, and hyphens');
    }

    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

export async function verifyRecaptcha(token: string) {
    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                secret: String(process.env.RECAPTCHA_SECRET_KEY),
                response: token
            })
        });

        const data = await response.json();
        console.log(data);

        return data.success && data.score > 0.5;
    } catch (error) {
        console.error('reCAPTCHA verification error:', error);
        return false;
    }
}

export function isValidURL(url: string) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

export function isTrustedGoogleImage(url: string) {
    return isValidURL(url) && (url.includes('googleusercontent.com'));
}

export async function isImage(url: string) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');
        return contentType ? contentType.startsWith('image/') : false;
    } catch {
        return false;
    }
}