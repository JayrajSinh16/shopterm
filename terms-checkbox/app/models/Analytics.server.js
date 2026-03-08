import db from "../db.server";

/**
 * Count consents logged today for a shop.
 * @param {string} shop
 */
export async function getTodayCount(shop) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return db.consentLog.count({
    where: {
      shop,
      timestamp: { gte: startOfDay },
      consentGiven: true,
    },
  });
}

/**
 * Total consent count for the shop (all time).
 * @param {string} shop
 */
export async function getTotalCount(shop) {
  return db.consentLog.count({ where: { shop, consentGiven: true } });
}

/**
 * Daily consent counts for the last 7 days.
 * Returns an array of { date: string, count: number }.
 * @param {string} shop
 */
export async function getWeeklyTrend(shop) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const start = new Date(d);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);

    const count = await db.consentLog.count({
      where: {
        shop,
        consentGiven: true,
        timestamp: { gte: start, lte: end },
      },
    });

    days.push({
      date: start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      count,
    });
  }
  return days;
}

/**
 * Get the 5 most recent consent logs for the dashboard.
 * @param {string} shop
 */
export async function getRecentLogs(shop, limit = 5) {
  return db.consentLog.findMany({
    where: { shop },
    orderBy: { timestamp: "desc" },
    take: limit,
  });
}
