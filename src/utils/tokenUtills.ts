import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../db';
import jwksClient from 'jwks-rsa';

export interface TokenPayload {
    id: number;
    username: string;
    hashedEmail?: string;
    profile_picture?: string;
    public_id: string;
}

const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_AUTH_CLIENT_ID);

export const generateTokens = (payload: TokenPayload) => {

    const accessToken = jwt.sign(
        payload,
        process.env.JWT_SECRET as string,
        { expiresIn: '15m' } 
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');

    return { accessToken, refreshToken };
}

export const saveRefreshToken = async (userId: number, refreshToken: string) => {
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const hashToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    try {
        await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

        await db.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [userId, hashToken, expiresAt]
        );
    }catch (error) {
        console.error('Error saving refresh token:', error);
        throw new Error('Failed to save refresh token');
    }
}

export const validateRefreshToken = async (token: string) => {
    try {
        const hashToken = crypto.createHash('sha256').update(token).digest('hex');


        const result = await db.query(
            'SELECT rt.*, u.id, u.username, u.hashed_email, u.public_id FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.token = $1 AND rt.expires_at > NOW() AND rt.is_revoked = FALSE', [hashToken]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];
    }catch (error) {
        console.error('Error validating refresh token:', error);
        return null;
    }
}

export const revokeRefreshToken = async (token: string) => {
    try {
        const hashToken = crypto.createHash('sha256').update(token).digest('hex');

        await db.query(
            'UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = $1',
            [hashToken]
        );
    }catch (error) {
        console.error('Error revoking refresh token:', error);
        throw new Error('Failed to revoke refresh token');
    }
}

export const cleanUpExpiredTokens = async () => {
    try {
        await db.query(
            'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
        );
    }catch (error) {
        console.error('Error cleaning up expired tokens:', error);
        throw new Error('Failed to clean up expired tokens');
    }
}

export const validateGoogleAccessToken = async (token: string) => {

    try {

        const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
        const tokenInfo = await response.json();

        if (tokenInfo.error) {
            return {
                valid: false,
                message: tokenInfo.error_description || 'Invalid token'
            };
        }

        if (tokenInfo.audience !== GOOGLE_CLIENT_ID) {
            return { valid: false, error: 'Token not issued for this application' };
        }

        return { valid: true, data: tokenInfo };

    } catch (error) {
        console.error('Error validating Google access token:', error);
        return { valid: false, message: 'Failed to validate token' };
    }

}

const client = jwksClient({
    jwksUri: 'https://www.googleapis.com/oauth2/v3/certs'
});

const getKey = (header: any, callback: any) => {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            return callback(err);
        }

        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
    });
}

export const validateIdToken = (idToken: string) => {
    return new Promise((resolve, reject) => {
        jwt.verify(idToken, getKey, {
            audience: GOOGLE_CLIENT_ID,
            issuer: ['https://accounts.google.com', 'accounts.google.com'],
            algorithms: ['RS256']
        }, (err, decoded) => {
            if (err) {
                reject({ valid: false, error: err.message });
            } 
            resolve({ valid: true, data: decoded });
        });
    });
}

