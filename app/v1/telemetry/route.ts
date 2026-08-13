import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs"; // pg is not Edge-compatible

const MAX_BODY_BYTES = 256 * 1024;
const MAX_CLOCK_SKEW_MS = 48 * 60 * 60 * 1000;
const MIN_METRICS = 1;
const MAX_METRICS = 500;

type MetricValue = number | string | boolean;
type Metrics = Record<string, MetricValue>;

type ValidatedBody = {
  schema_version: string;
  reported_at: string;
  environment?: string;
  app_version?: string;
  metrics: Metrics;
};

function errorResponse(
  status: number,
  error: string,
  detail?: string
): NextResponse {
  return NextResponse.json(detail ? { error, detail } : { error }, {
    status,
  });
}

// Reads the body ourselves (rather than request.json()) so an oversized
// payload is rejected before it's fully buffered in memory.
async function readBodyWithLimit(
  request: NextRequest
): Promise<string | null> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return null;
  }

  const reader = request.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString(
    "utf8"
  );
}

async function resolveInstance(token: string) {
  const hash = createHash("sha256").update(token).digest("hex");
  return getDb()
    .selectFrom("instances")
    .select(["id", "country_code", "domain", "environment"])
    .where("api_key_hash", "=", hash)
    .where("disabled", "=", false)
    .executeTakeFirst();
}

function isMetricValue(value: unknown): value is MetricValue {
  if (typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return false;
}

function validateBody(
  body: unknown
): { ok: true; value: ValidatedBody } | { ok: false; error: string; detail?: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.schema_version !== "string" || b.schema_version.length === 0) {
    return { ok: false, error: "schema_version is required" };
  }

  if (typeof b.reported_at !== "string") {
    return { ok: false, error: "reported_at is required" };
  }
  const reportedAtMs = new Date(b.reported_at).getTime();
  if (Number.isNaN(reportedAtMs)) {
    return {
      ok: false,
      error: "reported_at must be a valid ISO 8601 timestamp",
    };
  }
  if (Math.abs(Date.now() - reportedAtMs) > MAX_CLOCK_SKEW_MS) {
    return { ok: false, error: "reported_at is too far from server time" };
  }

  let environment: string | undefined;
  let appVersion: string | undefined;
  if (b.instance !== undefined) {
    if (
      typeof b.instance !== "object" ||
      b.instance === null ||
      Array.isArray(b.instance)
    ) {
      return { ok: false, error: "instance must be an object" };
    }
    const instance = b.instance as Record<string, unknown>;
    if (instance.environment !== undefined) {
      if (typeof instance.environment !== "string") {
        return { ok: false, error: "instance.environment must be a string" };
      }
      environment = instance.environment;
    }
    if (instance.app_version !== undefined) {
      if (typeof instance.app_version !== "string") {
        return { ok: false, error: "instance.app_version must be a string" };
      }
      appVersion = instance.app_version;
    }
  }

  if (typeof b.metrics !== "object" || b.metrics === null || Array.isArray(b.metrics)) {
    return { ok: false, error: "metrics is required" };
  }
  const entries = Object.entries(b.metrics as Record<string, unknown>);
  if (entries.length < MIN_METRICS || entries.length > MAX_METRICS) {
    return {
      ok: false,
      error: `metrics must have between ${MIN_METRICS} and ${MAX_METRICS} entries`,
    };
  }

  const metrics: Metrics = {};
  for (const [key, value] of entries) {
    if (!isMetricValue(value)) {
      return {
        ok: false,
        error: "Invalid metric value",
        detail: `metrics.${key} must be a finite number, string, or boolean`,
      };
    }
    metrics[key] = value;
  }

  return {
    ok: true,
    value: {
      schema_version: b.schema_version,
      reported_at: b.reported_at,
      environment,
      app_version: appVersion,
      metrics,
    },
  };
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/.exec(authHeader);
  const token = match?.[1]?.trim();
  if (!token) {
    return errorResponse(401, "Missing or invalid Authorization header");
  }

  const instance = await resolveInstance(token);
  if (!instance) {
    return errorResponse(401, "Invalid or disabled API key");
  }

  const raw = await readBodyWithLimit(request);
  if (raw === null) {
    return errorResponse(413, "Request body exceeds 256 KB limit");
  }

  let parsed: unknown;
  try {
    parsed = raw.length > 0 ? JSON.parse(raw) : undefined;
  } catch {
    return errorResponse(400, "Request body must be valid JSON");
  }

  const validated = validateBody(parsed);
  if (!validated.ok) {
    return errorResponse(400, validated.error, validated.detail);
  }

  const { schema_version, reported_at, environment, app_version, metrics } =
    validated.value;
  const countryCode = instance.country_code;
  const domain = instance.domain;
  const resolvedEnvironment = environment ?? instance.environment;
  const reportedAt = new Date(reported_at);

  try {
    const db = getDb();
    const result = await db.transaction().execute(async (trx) => {
      const inserted = await trx
        .insertInto("reports")
        .values({
          country_code: countryCode,
          domain,
          environment: resolvedEnvironment,
          app_version: app_version ?? null,
          schema_version,
          reported_at: reportedAt,
        })
        .onConflict((oc) =>
          oc
            .columns(["country_code", "domain", "reported_at", "schema_version"])
            .doNothing()
        )
        .returning("id")
        .executeTakeFirst();

      if (!inserted) {
        let existingQuery = trx
          .selectFrom("reports")
          .select("id")
          .where("country_code", "=", countryCode)
          .where("reported_at", "=", reportedAt)
          .where("schema_version", "=", schema_version);
        existingQuery =
          domain === null
            ? existingQuery.where("domain", "is", null)
            : existingQuery.where("domain", "=", domain);

        const existing = await existingQuery.executeTakeFirstOrThrow();
        return { reportId: existing.id, duplicate: true as const };
      }

      const recordedAt = new Date();
      const rows = Object.entries(metrics).map(([metric, value]) => ({
        report_id: inserted.id,
        country_code: countryCode,
        recorded_at: recordedAt,
        metric,
        value: typeof value === "number" ? value : null,
        value_text: typeof value === "number" ? null : String(value),
      }));
      await trx.insertInto("metrics").values(rows).execute();

      return {
        reportId: inserted.id,
        duplicate: false as const,
        metricsRecorded: rows.length,
      };
    });

    if (result.duplicate) {
      return NextResponse.json(
        { report_id: result.reportId, status: "duplicate", metrics_recorded: 0 },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        report_id: result.reportId,
        status: "accepted",
        metrics_recorded: result.metricsRecorded,
      },
      { status: 202 }
    );
  } catch (err) {
    console.error("telemetry ingest failed", err);
    return errorResponse(500, "Failed to store telemetry report");
  }
}
