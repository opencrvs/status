import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { withoutSslMode } from "./connection-string";
import type { Database } from "./schema";

export type { Database } from "./schema";

// Serverless routes must use the Supavisor pooler (port 6543, transaction
// mode) so we don't exhaust Postgres connections across invocations.
function connectionString(): string {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "Missing DATABASE_URL (or POSTGRES_URL) environment variable"
    );
  }
  return withoutSslMode(url);
}

let db: Kysely<Database> | undefined;

export function getDb(): Kysely<Database> {
  if (!db) {
    db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString: connectionString(),
          max: 5,
          // Supabase's pooler presents a chain Node's default CA bundle
          // doesn't verify; the connection itself is still encrypted.
          ssl: { rejectUnauthorized: false },
        }),
      }),
    });
  }
  return db;
}
