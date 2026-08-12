export type EnvironmentStatus = "operational" | "down";

export type EnvironmentGroup = "qa" | "production" | "other";

export const GROUP_LABELS: Record<EnvironmentGroup, string> = {
  qa: "QA environments",
  production: "Production environments",
  other: "Other",
};

export const GROUP_ORDER: EnvironmentGroup[] = ["production", "qa", "other"];

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

// Every OpenCRVS instance we deploy and host, identified by its base domain.
const DOMAINS: { domain: string; group: EnvironmentGroup }[] = [
  { domain: "qa-hotfix.opencrvs.dev", group: "qa" },
  { domain: "qa.opencrvs.dev", group: "qa" },
  { domain: "farajaland-qa.opencrvs.org", group: "qa" },
  { domain: "farajaland.opencrvs.org", group: "production" },
  { domain: "farajaland-integration.opencrvs.dev", group: "production" },
  { domain: "farajaland-staging.opencrvs.org", group: "production" },
  { domain: "migration-staging.opencrvs.dev", group: "other" },
  { domain: "migration-production.opencrvs.dev", group: "other" },
];

const REQUEST_TIMEOUT_MS = 10_000;

async function getPingStatus(
  domain: string
): Promise<{ status: EnvironmentStatus; version?: string; error?: string }> {
  try {
    const res = await fetch(`https://gateway.${domain}/ping`, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const version = res.headers.get("x-version") ?? undefined;

    if (!res.ok) {
      return { status: "down", version, error: `HTTP ${res.status}` };
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
  domain: string
): Promise<{ name?: string; logo?: string }> {
  for (const path of APPLICATION_CONFIG_PATHS) {
    try {
      const res = await fetch(`https://countryconfig.${domain}${path}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
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
): Promise<Environment> {
  const [ping, config] = await Promise.all([
    getPingStatus(domain),
    getApplicationConfig(domain),
  ]);

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
  return Promise.all(DOMAINS.map(({ domain, group }) => getEnvironment(domain, group)));
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
