import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    throw new Error('EMAIL_ENCRYPTION_KEY must be set and be 64 characters (32 bytes) long');
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, "hex");

export interface EncryptedEmail {
    encrypted: string;
    iv: string;
    tag: string;
}

export function encryptEmail(email: string): EncryptedEmail {

    if (!email) {
        throw new Error('Email is missing!');
    }

    try {

        const normalizedEmail = email.toLowerCase().trim();

        const iv = crypto.randomBytes(IV_LENGTH);

        const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv);

        let encrypted = cipher.update(normalizedEmail, "utf8", "hex");
        encrypted += cipher.final("hex");

        const tag = cipher.getAuthTag();

        return {
            encrypted,
            iv: iv.toString('hex'),
            tag: tag.toString('hex')
        };
    } catch (error) {
        console.error('Email encryption failed:', error);
        throw new Error('Failed to encrypt email');
    }

}

export function decryptEmail(encryptedData: EncryptedEmail): string {

    if (!encryptedData) {
        throw new Error('Encrypted data missing!');
    }

    try {
        const { encrypted, iv, tag} = encryptedData;

        if (!encrypted || !iv || !tag) {
            throw new Error('Missing encrypted email or iv or tag!');
        }

        const ivBuffer = Buffer.from(iv, 'hex');
        const tagBuffer = Buffer.from(tag, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BUFFER, ivBuffer);
        decipher.setAuthTag(tagBuffer);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Email decryption failed:', error);
        throw new Error('Failed to decrypt email');
    }

}

export function checkEmailMatch(plainEmail: string, encryptedData: EncryptedEmail): boolean {

    if (!plainEmail || !encryptedData) {
        throw new Error("Plain email or encrypted email missing!");
    }

    try {
        const decrypted = decryptEmail(encryptedData);
        return decrypted === plainEmail.toLowerCase().trim();
    } catch (error) {
        return false;
    }

}

export function hashEmail(email: string) {
    if (!email) {
        throw new Error("Email is missing!");
    }

    const key = process.env.EMAIL_PEPPER;

    if (!key) {
        throw new Error('EMAIL_PEPPER is not set in environment variables');
    }

    return crypto
        .createHmac('sha256', key)
        .update(email.toLocaleLowerCase().trim())
        .digest('hex');
}

export function hashCode(code: string) {
    if (!code) {
        throw new Error("Code is missing!");
    }

    const key = process.env.CODE_PEPPER;

    if (!key) {
        throw new Error('CODE_PEPPER is not set in environment variables');
    }

    return crypto
        .createHmac('sha256', key)
        .update(code)
        .digest('hex');
}
