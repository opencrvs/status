import { Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migrations must stay decoupled from the current Database type
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("instances")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn("country_code", "text", (col) => col.notNull())
    .addColumn("domain", "text")
    .addColumn("environment", "text", (col) =>
      col.notNull().defaultTo("production")
    )
    .addColumn("api_key_hash", "text", (col) => col.notNull())
    .addColumn("label", "text")
    .addColumn("disabled", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex("instances_api_key_hash_idx")
    .on("instances")
    .column("api_key_hash")
    .unique()
    .execute();

  await db.schema
    .createTable("reports")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn("country_code", "text", (col) => col.notNull())
    .addColumn("domain", "text")
    .addColumn("environment", "text", (col) =>
      col.notNull().defaultTo("production")
    )
    .addColumn("app_version", "text")
    .addColumn("schema_version", "text", (col) => col.notNull())
    .addColumn("reported_at", "timestamptz", (col) => col.notNull())
    .addColumn("received_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  // NULLS NOT DISTINCT keeps retries with a null domain colliding on the same
  // report instead of inserting a duplicate row per retry. Not expressible
  // through the schema builder.
  await sql`
    create unique index reports_dedupe_key
    on reports (country_code, domain, reported_at, schema_version)
    nulls not distinct
  `.execute(db);

  await db.schema
    .createTable("metrics")
    .addColumn("id", sql`bigint generated always as identity`, (col) =>
      col.primaryKey()
    )
    .addColumn("report_id", "uuid", (col) =>
      col.notNull().references("reports.id").onDelete("cascade")
    )
    .addColumn("country_code", "text", (col) => col.notNull())
    .addColumn("recorded_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("metric", "text", (col) => col.notNull())
    .addColumn("value", "double precision")
    .addColumn("value_text", "text")
    .execute();

  await db.schema
    .createIndex("metrics_report_id_idx")
    .on("metrics")
    .column("report_id")
    .execute();

  await db.schema
    .createIndex("metrics_metric_recorded_at_idx")
    .on("metrics")
    .columns(["metric", "recorded_at"])
    .execute();

  await sql`alter table instances enable row level security`.execute(db);
  await sql`alter table reports enable row level security`.execute(db);
  await sql`alter table metrics enable row level security`.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migrations must stay decoupled from the current Database type
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("metrics").execute();
  await db.schema.dropTable("reports").execute();
  await db.schema.dropTable("instances").execute();
}
