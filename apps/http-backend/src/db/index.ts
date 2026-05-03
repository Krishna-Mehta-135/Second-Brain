import { prisma } from "@repo/db";

const connectDB = async () => {
  try {
    let dbUrl = process.env.DATABASE_URL || "";

    if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) {
      console.warn(
        "[DB] Found literal quotes in DATABASE_URL. Stripping them.",
      );
      dbUrl = dbUrl.substring(1, dbUrl.length - 1);
      process.env.DATABASE_URL = dbUrl;
    }

    const match = dbUrl.match(/postgresql:\/\/([^:]+):[^@]+@([^/]+)\/(.+)/);
    if (match) {
      console.log(
        `[DB] Attempting connection: user=${match[1]}, host=${match[2]}, db=${match[3]?.split("?")[0]}`,
      );
    } else {
      console.log(`[DB] Attempting connection with custom URL format`);
    }

    await prisma.$connect();
    console.log(`Postgres DB connected successfully`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[DB] Failed to connect to postgres:`, message);

    if (message.includes("Authentication failed")) {
      console.error(
        "\x1b[31m%s\x1b[0m",
        "HINT: If you are using Docker, your database volume might be stale.",
      );
      console.error(
        "\x1b[31m%s\x1b[0m",
        "Try running: docker-compose down -v && docker-compose up -d",
      );
    }
    throw error;
  }
};

export default connectDB;
