import { register } from '../controllers/auth/RegistrationController';
import { refreshToken } from '../controllers/auth/RefreshTokenController';
import { logout } from '../controllers/auth/LogoutController';
import { Router } from 'express';
import { login } from '../controllers/auth/LoginController';
import { limiters } from '../middleware/bruteForceMiddleware';
import { sendMailVerifyCode } from '../controllers/auth/SendEmailVerifyCodeController';
import { verifyEmailCode } from '../controllers/auth/VerifyCodeController';
import { loginWithGoogle } from '../controllers/auth/LoginWithGoogleController';
import { LoginWithGoogleCallback } from '../controllers/auth/LoginWithGoogleCallback';
import { verifyRecaptchaController } from '../controllers/auth/VerifyRecaptchaControler';
import { loginWithGithub } from '../controllers/auth/LoginWithGithubController';
import { githubCallback } from '../controllers/auth/LoginWithGithubCallback';

const router = Router();


router.post('/register', limiters.register, register);
router.post('/refresh-token' ,refreshToken);
router.post('/logout', limiters.logout ,logout);
router.post('/login', limiters.login ,login);
router.post('/send-verification-code',sendMailVerifyCode);
router.post('/verify-code', limiters.verifyCode ,verifyEmailCode);
router.post('/verify-recaptcha' ,verifyRecaptchaController);
router.get('/login-with-google' ,loginWithGoogle);
router.get('/login-with-google/callback' ,LoginWithGoogleCallback);
router.get('/login-with-github', limiters.loginWithGithub ,loginWithGithub);
router.get('/login-with-github/callback', limiters.loginWithGithubCallback ,githubCallback);


export default router;