/**
 * Subscription constants — safe to import in both client and server code.
 * Keep only plain values here (no DB imports, no Prisma).
 */

export const PLANS = {
  FREE: "free",
  PRO: "pro",
};

export const PRO_PLAN_NAME = "Pro Plan";

/** Maximum number of consent logs stored for free-plan shops (rolling window). */
export const FREE_LOG_LIMIT = 50;
