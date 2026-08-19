import { Kysely, sql } from "kysely";

// Kysely's own migration-tracking tables are created automatically by the
// Migrator (not by our up() functions), so they never got the RLS treatment
// the app's own tables received in the initial migration. They sit in the
// public schema exposed to PostgREST, which Supabase's linter flags.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migrations must stay decoupled from the current Database type
export async function up(db: Kysely<any>): Promise<void> {
  await sql`alter table kysely_migration enable row level security`.execute(db);
  await sql`alter table kysely_migration_lock enable row level security`.execute(
    db
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migrations must stay decoupled from the current Database type
export async function down(db: Kysely<any>): Promise<void> {
  await sql`alter table kysely_migration_lock disable row level security`.execute(
    db
  );
  await sql`alter table kysely_migration disable row level security`.execute(
    db
  );
}
