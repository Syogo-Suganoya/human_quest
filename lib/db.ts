import { Pool } from "pg";

declare global {
  var pgPool: Pool | undefined;
}

export const db =
  global.pgPool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgres://humanquest:humanquest@localhost:5436/humanquest",
    max: 5,
  });

if (process.env.NODE_ENV !== "production") global.pgPool = db;
