import { Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migrations must stay decoupled from the current Database type
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("reports")
    .addColumn("organisation_name", "text")
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migrations must stay decoupled from the current Database type
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("reports")
    .dropColumn("organisation_name")
    .execute();
}
