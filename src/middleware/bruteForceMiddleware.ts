import { Request, Response, NextFunction } from "express";
import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import redis from "../Redis";

function createBaseLimiter(points: number, durationSec: number, blockDurationSec: number) {
  return new RateLimiterRedis({
    storeClient: redis,
    points,                 
    duration: durationSec,  
    blockDuration: blockDurationSec, 
    keyPrefix: "bf",        
    execEvenly: false,      
  });
}

export type Scope = "ip" | "account" | "token";

type Policy = {
  scopes: Scope[];
  points: number;
  durationSec: number;
  blockDurationSec: number;
  softBlockRemaining?: number; 
};

function buildLimiter(policy: Policy) {
  const base = createBaseLimiter(policy.points, policy.durationSec, policy.blockDurationSec);

  function keyForScope(req: Request, scope: Scope): string | null {
    switch (scope) {
      case "ip":
        return req.ip || (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null;
      case "account": {
        const userId = (req as any).user?.id;
        return userId ? String(userId) : null;
      }
      case "token": {
        const tokenHash = (req as any).refreshTokenHash || null;
        return tokenHash;
      }
      default:
        return null;
    }
  }

  return async function bruteForceMiddleware(req: Request, res: Response, next: NextFunction) {
    const keys: string[] = [];
    for (const s of policy.scopes) {
      const k = keyForScope(req, s);
      if (k) keys.push(`${s}:${k}`); 
    }
    if (!keys.length) return next();

    try {
      const results = await Promise.all(
        keys.map(k => base.consume(k).then(r => ({ ok: true as const, res: r })).catch((err: RateLimiterRes) => ({ ok: false as const, err })))
      );

      const failed = results.find(r => !r.ok) as { ok: false; err: RateLimiterRes } | undefined;
      if (failed) {
        const ms = failed.err.msBeforeNext ?? 0;
        const sec = Math.ceil(ms / 1000);
        res.setHeader("Retry-After", String(sec));
        return res.status(429).json({
          error: true,
          message: 'Please wait before trying again!'
        });
      }

      if (typeof policy.softBlockRemaining === "number" && policy.softBlockRemaining >= 0) {
        const remain = Math.min(...results.filter(r => r.ok).map(r => (r as any).res.remainingPoints));
        if (remain <= policy.softBlockRemaining) {
          res.setHeader("X-Captcha-Required", "1");
        }
      }

      return next();
    } catch (e) {
      console.error("Bruteforce middleware error:", e);
      return next();
    }
  };
}

export async function resetAccountLimit(email: string) {
  const key = `account:${email.toLowerCase().trim()}`;
  await redis.del(`bf:${key}`);
}

export const limiters = {
  login: buildLimiter({
    scopes: ["ip", "account"],
    points: 5,
    durationSec: 60,
    blockDurationSec: 15 * 60,
  }),

  register: buildLimiter({
    scopes: ["ip"],
    points: 10,
    durationSec: 60 * 60,
    blockDurationSec: 24 * 60 * 60,
  }),

  refresh: buildLimiter({
    scopes: ["ip", "token"],
    points: 20,
    durationSec: 60,
    blockDurationSec: 10 * 60,
  }),

  logout: buildLimiter({
    scopes: ["ip", "token"],
    points: 10,
    durationSec: 60,
    blockDurationSec: 5 * 60,
  }),

  sendVerifyEmail: buildLimiter({
    scopes: ["ip", "account"],
    points: 7,
    durationSec: 60 * 60,
    blockDurationSec: 60 * 60,
  }),

  verifyCode: buildLimiter({
    scopes: ["ip", "account"],
    points: 10,
    durationSec: 60 * 60,
    blockDurationSec: 60 * 60,
  }),

  loginWithGoogle: buildLimiter({
    scopes: ["ip", "account"],
    points: 10,
    durationSec: 60 * 5,
    blockDurationSec: 15 * 60,
  }),

  loginWithGoogleCallback: buildLimiter({
    scopes: ["ip", "account"],
    points: 10,
    durationSec: 60 * 5,
    blockDurationSec: 15 * 60,
  }),

  loginWithGithub: buildLimiter({
    scopes: ["ip", "account"],
    points: 10,
    durationSec: 60 * 5,
    blockDurationSec: 15 * 60,
  }),

  loginWithGithubCallback: buildLimiter({
    scopes: ["ip", "account"],
    points: 10,
    durationSec: 60 * 5,
    blockDurationSec: 15 * 60,
  }),

  verifyRecaptcha: buildLimiter({
    scopes: ["ip", "account"],
    points: 7,
    durationSec: 60 * 5,
    blockDurationSec: 30 * 60,
  }),

  getCollections: buildLimiter({
    scopes: ["ip", "account"],
    points: 30,
    durationSec: 60,
    blockDurationSec: 30 * 60,
  }),

  createCollection: buildLimiter({
    scopes: ["ip", "account"],
    points: 20,             
    durationSec: 60 * 10,   
    blockDurationSec: 30 * 60, 
  }),

};
