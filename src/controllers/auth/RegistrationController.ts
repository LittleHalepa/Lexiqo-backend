import  db  from '../../db';
import bcrypt from 'bcrypt';
import { validateUserInput, verifyRecaptcha } from '../../utils/validators'; 
import { Request, Response } from 'express';
import { sendMailVerifyCode } from '../auth/SendEmailVerifyCodeController';
import { encryptEmail, hashEmail } from '../../utils/encryptionUtills';


export const register = async (req: Request, res: Response) => {
    const { username, email, password, recaptchaToken } = req.body;

    if (!recaptchaToken) {
        return res.json({
            error: true,
            message: 'reCAPTCHA token missing'
        });
    }

    const isValidCaptcha = await verifyRecaptcha(recaptchaToken);

    if (!isValidCaptcha) {
        return res.json({
            error: true,
            message: 'reCAPTCHA verification failed'
        });
    }

    const validation = validateUserInput(username, email, password);

    if (!validation.isValid) {
        return res.status(400).json({error: true, message: 'Validation failed', errors: validation.errors });
    }

    try {

        const hashedEmail = hashEmail(email);
        const {encrypted, iv, tag} = encryptEmail(email);

        // Check if user with the same email or username already exists
        const existingUserEmail = await db.query(
            'SELECT * FROM users WHERE hashed_email = $1'
            , [hashedEmail]);

        if (existingUserEmail.rows.length > 0) {
            return res.status(400).json({error: true, message: 'User with this email already exists!'});
        }

        const existingUserUsername = await db.query(
            'SELECT * FROM users WHERE username = $1'
            , [username]);

        if (existingUserUsername.rows.length > 0) {
            return res.status(400).json({error: true, message: 'User with this username already exists!'});
        }

        // Hash the password before storing it
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(String(password), salt);

        // Insert the new user into the database
        const result = await db.query('INSERT INTO users (username, password, hashed_email, email_iv, email_tag, email_encrypted) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [username, hashedPassword, hashedEmail, iv, tag, encrypted]);

        // Check if the user was successfully created
        if (result.rows.length > 0) {
            
            const user = result.rows[0];

            try {
                await sendMailVerifyCode({ body: { email } } as Request, {
                    status: () => ({ json: (data: any) => data }) 
                } as unknown as Response);
            } catch (err) {
                console.error('Failed to send verification code:', err);
            }

            return res.status(201).json({
                error: false,
                message: 'User registered successfully',
                user: {
                    id: user.id,
                    username: user.username,
                    email: email,
                    public_id: user.public_id,
                    profile_picture: user.profile_picture,
                }
            });

        } else {
            return res.status(500).json({error: true, message: 'Failed to register user' });
        }

    } catch (error: unknown) {
        console.error('Error registering user:', error);
        
        if ((error as any).code === '23505') {
            return res.status(409).json({error: true, message: 'User already exists!' });
        }

        return res.status(500).json({error: true, message: 'Internal server error' });
    }
}