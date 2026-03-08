import db from "../db.server";
import { getSettings } from "./Settings.server";

export const PLANS = {
  FREE: "free",
  PRO: "pro",
};

export const PRO_PLAN_NAME = "Pro Plan";
export const FREE_LOG_LIMIT = 50;

/**
 * Get the current plan for a shop.
 * @param {string} shop
 * @returns {"free"|"pro"}
 */
export async function getPlan(shop) {
  const settings = await db.appSettings.findUnique({
    where: { shop },
    select: { plan: true },
  });
  return settings?.plan ?? PLANS.FREE;
}

/**
 * Set the plan for a shop. Ensures settings row exists first.
 * @param {string} shop
 * @param {"free"|"pro"} plan
 */
export async function setPlan(shop, plan) {
  await getSettings(shop); // ensure row exists
  return db.appSettings.update({ where: { shop }, data: { plan } });
}

/**
 * Returns true if the shop is on the Pro plan.
 * @param {string} shop
 * @returns {boolean}
 */
export async function isPro(shop) {
  const plan = await getPlan(shop);
  return plan === PLANS.PRO;
}
