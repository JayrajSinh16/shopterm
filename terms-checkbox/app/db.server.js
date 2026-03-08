import { PrismaClient } from "@prisma/client";

let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  // In development, prevent multiple Prisma instances due to hot reload
  if (!global.__db__) {
    global.__db__ = new PrismaClient();
  }
  prisma = global.__db__;
  prisma.$connect();
}

export default prisma;
