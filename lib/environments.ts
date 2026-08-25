// Must stay pinned to the undici version bundled with the Node runtime we
// deploy on (`process.versions.undici`) — passing an Agent from a mismatched
// undici version as fetch's `dispatcher` throws UND_ERR_INVALID_ARG.
import { Agent } from "undici";
import { getDb } from "@/lib/db";

export type EnvironmentStatus = "operational" | "down";

export type EnvironmentGroup = "qa" | "production" | "e2e" | "other";

export const GROUP_LABELS: Record<EnvironmentGroup, string> = {
  qa: "QA environments",
  production: "Production environments",
  e2e: "E2E environments",
  other: "Other",
};

// e2e is listed last, as a compact list rather than a card grid (see app/page.tsx).
export const GROUP_ORDER: EnvironmentGroup[] = ["production", "qa", "other", "e2e"];

// e2e environments serve certificates signed by Let's Encrypt's *staging* CA,
// which isn't in Node's default trust store, so plain fetch() fails TLS
// verification with "unable to get local issuer certificate" even though the
// service is up. Pin the public staging root so we can verify those requests
// properly instead of skipping TLS verification altogether.
// https://letsencrypt.org/docs/staging-environment/
const LETSENCRYPT_STAGING_ROOT_CA = `-----BEGIN CERTIFICATE-----
MIIFmDCCA4CgAwIBAgIQU9C87nMpOIFKYpfvOHFHFDANBgkqhkiG9w0BAQsFADBm
MQswCQYDVQQGEwJVUzEzMDEGA1UEChMqKFNUQUdJTkcpIEludGVybmV0IFNlY3Vy
aXR5IFJlc2VhcmNoIEdyb3VwMSIwIAYDVQQDExkoU1RBR0lORykgUHJldGVuZCBQ
ZWFyIFgxMB4XDTE1MDYwNDExMDQzOFoXDTM1MDYwNDExMDQzOFowZjELMAkGA1UE
BhMCVVMxMzAxBgNVBAoTKihTVEFHSU5HKSBJbnRlcm5ldCBTZWN1cml0eSBSZXNl
YXJjaCBHcm91cDEiMCAGA1UEAxMZKFNUQUdJTkcpIFByZXRlbmQgUGVhciBYMTCC
AiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBALbagEdDTa1QgGBWSYkyMhsc
ZXENOBaVRTMX1hceJENgsL0Ma49D3MilI4KS38mtkmdF6cPWnL++fgehT0FbRHZg
jOEr8UAN4jH6omjrbTD++VZneTsMVaGamQmDdFl5g1gYaigkkmx8OiCO68a4QXg4
wSyn6iDipKP8utsE+x1E28SA75HOYqpdrk4HGxuULvlr03wZGTIf/oRt2/c+dYmD
oaJhge+GOrLAEQByO7+8+vzOwpNAPEx6LW+crEEZ7eBXih6VP19sTGy3yfqK5tPt
TdXXCOQMKAp+gCj/VByhmIr+0iNDC540gtvV303WpcbwnkkLYC0Ft2cYUyHtkstO
fRcRO+K2cZozoSwVPyB8/J9RpcRK3jgnX9lujfwA/pAbP0J2UPQFxmWFRQnFjaq6
rkqbNEBgLy+kFL1NEsRbvFbKrRi5bYy2lNms2NJPZvdNQbT/2dBZKmJqxHkxCuOQ
FjhJQNeO+Njm1Z1iATS/3rts2yZlqXKsxQUzN6vNbD8KnXRMEeOXUYvbV4lqfCf8
mS14WEbSiMy87GB5S9ucSV1XUrlTG5UGcMSZOBcEUpisRPEmQWUOTWIoDQ5FOia/
GI+Ki523r2ruEmbmG37EBSBXdxIdndqrjy+QVAmCebyDx9eVEGOIpn26bW5LKeru
mJxa/CFBaKi4bRvmdJRLAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNVHRMB
Af8EBTADAQH/MB0GA1UdDgQWBBS182Xy/rAKkh/7PH3zRKCsYyXDFDANBgkqhkiG
9w0BAQsFAAOCAgEAncDZNytDbrrVe68UT6py1lfF2h6Tm2p8ro42i87WWyP2LK8Y
nLHC0hvNfWeWmjZQYBQfGC5c7aQRezak+tHLdmrNKHkn5kn+9E9LCjCaEsyIIn2j
qdHlAkepu/C3KnNtVx5tW07e5bvIjJScwkCDbP3akWQixPpRFAsnP+ULx7k0aO1x
qAeaAhQ2rgo1F58hcflgqKTXnpPM02intVfiVVkX5GXpJjK5EoQtLceyGOrkxlM/
sTPq4UrnypmsqSagWV3HcUlYtDinc+nukFk6eR4XkzXBbwKajl0YjztfrCIHOn5Q
CJL6TERVDbM/aAPly8kJ1sWGLuvvWYzMYgLzDul//rUF10gEMWaXVZV51KpS9DY/
5CunuvCXmEQJHo7kGcViT7sETn6Jz9KOhvYcXkJ7po6d93A/jy4GKPIPnsKKNEmR
xUuXY4xRdh45tMJnLTUDdC9FIU0flTeO9/vNpVA8OPU1i14vCz+MU8KX1bV3GXm/
fxlB7VBBjX9v5oUep0o/j68R/iDlCOM4VVfRa8gX6T2FU7fNdatvGro7uQzIvWof
gN9WUwCbEMBy/YhBSrXycKA8crgGg3x1mIsopn88JKwmMBa68oS7EHM9w7C4y71M
7DiA+/9Qdp9RBWJpTS9i/mDnJg1xvo8Xz49mrrgfmcAXTCJqXi24NatI3Oc=
-----END CERTIFICATE-----`;

const e2eAgent = new Agent({ connect: { ca: LETSENCRYPT_STAGING_ROOT_CA } });

const REQUEST_TIMEOUT_MS = 10_000;

// The DOM RequestInit type Next.js's tsconfig pulls in doesn't know about
// undici's Node-only `dispatcher` option, so give fetch() calls their own
// typed init object rather than an inline literal (which excess-property
// checks would reject).
type FetchInit = RequestInit & { dispatcher?: Agent };

function fetchInit(group: EnvironmentGroup): FetchInit {
  return {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    dispatcher: group === "e2e" ? e2eAgent : undefined,
  };
}

export type Environment = {
  domain: string;
  group: EnvironmentGroup;
  name: string;
  logo?: string;
  status: EnvironmentStatus;
  version?: string;
  error?: string;
  registerUrl: string;
};

// Only environments reporting in under this organisation are shown on the page.
const LISTED_ORGANISATION_NAME = "OpenCRVS";

function toGroup(environment: string): EnvironmentGroup {
  if (environment === "production") return "production";
  if (environment === "qa") return "qa";
  if (environment === "e2e") return "e2e";
  return "other";
}

// e2e environments are ephemeral (spun up per PR/branch and torn down), so a
// stale one that stopped reporting shouldn't stick around on the page.
const E2E_STALE_AFTER_MS = 2 * 24 * 60 * 60 * 1000;

// The domains we list are whichever ones have reported in under
// LISTED_ORGANISATION_NAME, not a static deploy list — pulling one row per
// domain (its most recent report) tells us which group each belongs to.
async function getListedDomains(): Promise<
  { domain: string; group: EnvironmentGroup }[]
> {
  const rows = await getDb()
    .selectFrom("reports")
    .distinctOn("domain")
    .select(["domain", "environment", "reported_at"])
    .where("organisation_name", "=", LISTED_ORGANISATION_NAME)
    .where("domain", "is not", null)
    .orderBy("domain")
    .orderBy("reported_at", "desc")
    .execute();

  const staleCutoff = Date.now() - E2E_STALE_AFTER_MS;

  return rows
    .filter(
      (row): row is { domain: string; environment: string; reported_at: Date } =>
        Boolean(row.domain)
    )
    .map((row) => ({
      domain: row.domain,
      group: toGroup(row.environment),
      reportedAt: new Date(row.reported_at).getTime(),
    }))
    .filter(({ group, reportedAt }) => group !== "e2e" || reportedAt >= staleCutoff)
    .map(({ domain, group }) => ({ domain, group }));
}

async function getPingStatus(
  domain: string,
  group: EnvironmentGroup
): Promise<{
  status: EnvironmentStatus;
  version?: string;
  error?: string;
  httpStatus?: number;
}> {
  try {
    const res = await fetch(`https://gateway.${domain}/ping`, fetchInit(group));
    const version = res.headers.get("x-version") ?? undefined;

    if (!res.ok) {
      return {
        status: "down",
        version,
        error: `HTTP ${res.status}`,
        httpStatus: res.status,
      };
    }

    const body = await res.json().catch(() => null);
    if (body?.success === true) {
      return { status: "operational", version };
    }

    return { status: "down", version, error: "Unexpected /ping response" };
  } catch (err) {
    return {
      status: "down",
      error: err instanceof Error ? err.message : "Request failed",
    };
  }
}

// v2.0+ serves this at /config/application; earlier versions used /application-config.
const APPLICATION_CONFIG_PATHS = ["/config/application", "/application-config"];

async function getApplicationConfig(
  domain: string,
  group: EnvironmentGroup
): Promise<{ name?: string; logo?: string }> {
  for (const path of APPLICATION_CONFIG_PATHS) {
    try {
      const res = await fetch(
        `https://countryconfig.${domain}${path}`,
        fetchInit(group)
      );
      if (!res.ok) continue;

      const data = await res.json();
      return {
        name:
          typeof data?.APPLICATION_NAME === "string"
            ? data.APPLICATION_NAME
            : undefined,
        // COUNTRY_LOGO.file is already a `data:image/...;base64,...` URI.
        logo:
          typeof data?.COUNTRY_LOGO?.file === "string"
            ? data.COUNTRY_LOGO.file
            : undefined,
      };
    } catch {
      // try the next path
    }
  }

  return {};
}

async function getEnvironment(
  domain: string,
  group: EnvironmentGroup
): Promise<Environment | null> {
  const [ping, config] = await Promise.all([
    getPingStatus(domain, group),
    getApplicationConfig(domain, group),
  ]);

  // A 404 from an e2e gateway means the review app has already been torn
  // down, not that it's down — drop it instead of showing it as broken.
  if (group === "e2e" && ping.httpStatus === 404) {
    return null;
  }

  return {
    domain,
    group,
    name: config.name ?? domain,
    logo: config.logo,
    status: ping.status,
    version: ping.version,
    error: ping.error,
    registerUrl: `https://register.${domain}`,
  };
}

export async function getEnvironments(): Promise<Environment[]> {
  const domains = await getListedDomains();
  const environments = await Promise.all(
    domains.map(({ domain, group }) => getEnvironment(domain, group))
  );
  return environments.filter((env): env is Environment => env !== null);
}

export function groupEnvironments(
  environments: Environment[]
): { group: EnvironmentGroup; label: string; environments: Environment[] }[] {
  return GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    environments: environments.filter((env) => env.group === group),
  })).filter((section) => section.environments.length > 0);
}
