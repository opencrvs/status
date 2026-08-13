import { Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migrations must stay decoupled from the current Database type
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("reports")
    .addColumn("application_name", "text")
    .execute();

  // "production" as a silent default was misleading for reports that never
  // said what environment they came from — "unknown" doesn't guess.
  await db.schema
    .alterTable("reports")
    .alterColumn("environment", (ac) => ac.setDefault("unknown"))
    .execute();
  await db.schema
    .alterTable("instances")
    .alterColumn("environment", (ac) => ac.setDefault("unknown"))
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migrations must stay decoupled from the current Database type
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("instances")
    .alterColumn("environment", (ac) => ac.setDefault("production"))
    .execute();
  await db.schema
    .alterTable("reports")
    .alterColumn("environment", (ac) => ac.setDefault("production"))
    .execute();

  await db.schema.alterTable("reports").dropColumn("application_name").execute();
}
