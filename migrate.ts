import { promises as fs } from "node:fs";
import path from "node:path";
import { Kysely, PostgresDialect } from "kysely";
import { FileMigrationProvider, Migrator } from "kysely/migration";
import { Pool } from "pg";
import { withoutSslMode } from "./lib/db/connection-string";

// Migrations run DDL, so they go over a direct/session connection rather than
// the Supavisor transaction-mode pooler used by the app at runtime.
function migrationConnectionString(): string {
  const url =
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "Missing DATABASE_URL_UNPOOLED (or POSTGRES_URL_NON_POOLING) environment variable"
    );
  }
  return withoutSslMode(url);
}

async function main() {
  const db = new Kysely<unknown>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: migrationConnectionString(),
        // Supabase's pooler presents a chain Node's default CA bundle
        // doesn't verify; the connection itself is still encrypted.
        ssl: { rejectUnauthorized: false },
      }),
    }),
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(process.cwd(), "migrations"),
    }),
  });

  const direction = process.argv[2] === "down" ? "down" : "up";
  const { error, results } =
    direction === "down"
      ? await migrator.migrateDown()
      : await migrator.migrateToLatest();

  for (const result of results ?? []) {
    if (result.status === "Success") {
      console.log(`✔ ${result.direction} ${result.migrationName}`);
    } else if (result.status === "Error") {
      console.error(`✘ ${result.direction} ${result.migrationName}`);
    }
  }

  await db.destroy();

  if (error) {
    console.error("Migration failed");
    console.error(error);
    process.exitCode = 1;
  }
}

main();
