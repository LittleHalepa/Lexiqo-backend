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
        // Використовуємо userId (якщо залогінений) або email
        const userId = (req as any).user?.id;
        const email = (req as any).user?.email || (req.body?.email);
        return userId ? String(userId) : (email ? email.toLowerCase().trim() : null);
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
          message: `Too many requests. Please wait ${sec} seconds before trying again.`
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
      return next(); // У разі помилки пропускаємо запит
    }
  };
}

export async function resetAccountLimit(identifier: string) {
  // Підтримуємо і email і userId
  const key = `account:${identifier.toLowerCase().trim()}`;
  await redis.del(`bf:${key}`);
}

export const limiters = {
  login: buildLimiter({
    scopes: ["ip", "account"],
    points: 10,              // 10 спроб
    durationSec: 60 * 5,     // за 5 хвилин
    blockDurationSec: 60,    // блок на 1 хвилину
  }),

  register: buildLimiter({
    scopes: ["ip"],
    points: 5,               // 5 реєстрацій
    durationSec: 60 * 60,    // за годину
    blockDurationSec: 60 * 5, // блок на 5 хвилин
  }),

  refresh: buildLimiter({
    scopes: ["ip", "token"],
    points: 30,              
    durationSec: 60,         
    blockDurationSec: 60,    
  }),

  logout: buildLimiter({
    scopes: ["ip", "token"],
    points: 20,
    durationSec: 60,
    blockDurationSec: 60,
  }),

  sendVerifyEmail: buildLimiter({
    scopes: ["ip", "account"],
    points: 5,               // 5 листів
    durationSec: 60 * 60,    // за годину
    blockDurationSec: 60 * 30, // блок на 30 хвилин
  }),

  verifyCode: buildLimiter({
    scopes: ["ip", "account"],
    points: 10,
    durationSec: 60 * 60,
    blockDurationSec: 60 * 30,
  }),

  loginWithGoogle: buildLimiter({
    scopes: ["ip"],
    points: 20,
    durationSec: 60 * 5,
    blockDurationSec: 60,
  }),

  loginWithGoogleCallback: buildLimiter({
    scopes: ["ip"],
    points: 20,
    durationSec: 60 * 5,
    blockDurationSec: 60,
  }),

  loginWithGithub: buildLimiter({
    scopes: ["ip"],
    points: 20,
    durationSec: 60 * 5,
    blockDurationSec: 60,
  }),

  loginWithGithubCallback: buildLimiter({
    scopes: ["ip"],
    points: 20,
    durationSec: 60 * 5,
    blockDurationSec: 60,
  }),

  verifyRecaptcha: buildLimiter({
    scopes: ["ip", "account"],
    points: 30,
    durationSec: 60 * 5,
    blockDurationSec: 60 * 5,
  }),

  // Read-only ендпоінти — більш м'які ліміти
  getCollections: buildLimiter({
    scopes: ["ip", "account"],
    points: 100,             // 100 запитів
    durationSec: 60,         // за хвилину
    blockDurationSec: 60,    // блок на 1 хвилину
  }),

  createCollection: buildLimiter({
    scopes: ["ip", "account"],
    points: 30,              // 30 колекцій
    durationSec: 60 * 10,    // за 10 хвилин
    blockDurationSec: 60 * 5, // блок на 5 хвилин
  }),

  bookmarkCollection: buildLimiter({
    scopes: ["ip", "account"],
    points: 100,
    durationSec: 60,
    blockDurationSec: 60,
  }),

  getCards: buildLimiter({
    scopes: ["ip", "account"],
    points: 100,
    durationSec: 60,
    blockDurationSec: 60,
  }),

  getRecentCollections: buildLimiter({
    scopes: ["ip", "account"],
    points: 100,
    durationSec: 60,
    blockDurationSec: 60,
  }),

  addToRecentCollections: buildLimiter({
    scopes: ["ip", "account"],
    points: 100,
    durationSec: 60,
    blockDurationSec: 60,
  }),

  getCollectionsInfo: buildLimiter({
    scopes: ["ip", "account"],
    points: 100,
    durationSec: 60,
    blockDurationSec: 60,
  }),

  getUserInfo: buildLimiter({
    scopes: ["ip", "account"],
    points: 100,
    durationSec: 60,
    blockDurationSec: 60,
  }),

  getTestData: buildLimiter({
    scopes: ["ip", "account"],
    points: 100,
    durationSec: 60,
    blockDurationSec: 60,
  }),
  
};