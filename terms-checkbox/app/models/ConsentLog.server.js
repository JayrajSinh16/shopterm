import db from "../db.server";

/**
 * Create a new consent record.
 * @param {object} data
 */
export async function createLog(data) {
  return db.consentLog.create({ data });
}

/**
 * Get paginated, filtered consent logs for a shop.
 * @param {string} shop
 * @param {object} opts
 */
export async function getLogs(
  shop,
  { page = 1, limit = 25, dateFrom, dateTo, email } = {}
) {
  const where = buildWhere(shop, { dateFrom, dateTo, email });

  const [logs, total] = await Promise.all([
    db.consentLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.consentLog.count({ where }),
  ]);

  return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Get all logs for CSV export (no pagination).
 * @param {string} shop
 * @param {object} filters
 */
export async function exportLogs(shop, filters = {}) {
  const where = buildWhere(shop, filters);
  return db.consentLog.findMany({
    where,
    orderBy: { timestamp: "desc" },
  });
}

/**
 * Delete all logs for a specific customer email (GDPR CUSTOMERS_REDACT).
 * @param {string} shop
 * @param {string} email
 */
export async function deleteCustomerLogs(shop, email) {
  return db.consentLog.deleteMany({
    where: { shop, customerEmail: email },
  });
}

/**
 * Delete all logs for a shop (GDPR SHOP_REDACT).
 * @param {string} shop
 */
export async function deleteShopLogs(shop) {
  return db.consentLog.deleteMany({ where: { shop } });
}

/**
 * Get all logs for a specific customer email (GDPR CUSTOMERS_DATA_REQUEST).
 * @param {string} shop
 * @param {string} email
 */
export async function getCustomerLogs(shop, email) {
  return db.consentLog.findMany({
    where: { shop, customerEmail: email },
    orderBy: { timestamp: "desc" },
  });
}

// --- Helpers ---

function buildWhere(shop, { dateFrom, dateTo, email } = {}) {
  const where = { shop };

  if (email) {
    where.customerEmail = { contains: email };
  }

  if (dateFrom || dateTo) {
    where.timestamp = {};
    if (dateFrom) where.timestamp.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.timestamp.lte = end;
    }
  }

  return where;
}
