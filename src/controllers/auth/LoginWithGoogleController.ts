import { Request, Response } from "express";
import jwt from 'jsonwebtoken';
import redis from "../../Redis";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_AUTH_CLIENT_ID;
const REDIRECT_URI = "http://localhost:3000/api/auth/login-with-google/callback";

export const loginWithGoogle = async (req: Request, res: Response) => {
    console.log('Redirecting to Google OAuth 2.0 authorization endpoint');
    if (!GOOGLE_CLIENT_ID) {
        return res.status(500).json({ error: true, message: 'Google Client ID is not configured' });
    }

    const recaptchaToken = req.cookies.recaptchaToken;

    if (!recaptchaToken) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=recaptcha_failed`);
    }

    try {
      const decoded = jwt.verify(recaptchaToken, process.env.JWT_RECAPTCHA_SECRET as string) as any;

      const key = decoded.jti;

      const result = await redis.get(`recaptcha:${key}`);

      if (!result) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=recaptcha_failed`);
      }

      await redis.del(`recaptcha:${key}`);

      const url =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent('openid email profile')}` +
        `&access_type=offline` +
        `&prompt=consent`;

      res.redirect(url);
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=recaptcha_failed`);
      }

      console.error('Failed during recaptcha validation: ' + error);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
};