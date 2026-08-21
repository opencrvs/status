import type { Environment } from "@/lib/environments";

export function EnvironmentListItem({ env }: { env: Environment }) {
  const isUp = env.status === "operational";

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          isUp ? "bg-[#1C8A6E]" : "bg-[#D14A3A]"
        }`}
        aria-hidden
      />
      <span className="font-medium text-[#373050]">{env.name}</span>
      <span className="truncate text-sm text-[#373050]/50">{env.domain}</span>
      {env.version && (
        <span className="rounded bg-[#F5F4FA] px-1.5 py-0.5 font-mono text-xs text-[#373050]/60">
          v{env.version}
        </span>
      )}
      {!isUp && env.error && (
        <span className="text-xs text-[#D14A3A]">{env.error}</span>
      )}
      <a
        href={env.registerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto text-sm font-medium text-[#0058E0] hover:underline"
      >
        Open app
      </a>
    </li>
  );
}

export function EnvironmentCard({ env }: { env: Environment }) {
  const isUp = env.status === "operational";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        {env.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={env.logo}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg border border-black/5 object-contain p-1"
          />
        ) : (
          <div className="h-10 w-10 shrink-0 rounded-lg bg-[#EFECF9]" />
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#373050]">{env.name}</p>
          <p className="truncate text-sm text-[#373050]/50">{env.domain}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            isUp
              ? "bg-[#ECF8F4] text-[#1C8A6E]"
              : "bg-[#FFEDEA] text-[#D14A3A]"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isUp ? "bg-[#1C8A6E]" : "bg-[#D14A3A]"
            }`}
            aria-hidden
          />
          {isUp ? "Operational" : "Down"}
        </span>
        {env.version && (
          <span className="rounded bg-[#F5F4FA] px-1.5 py-0.5 font-mono text-xs text-[#373050]/60">
            v{env.version}
          </span>
        )}
      </div>

      {!isUp && env.error && (
        <p className="text-xs text-[#D14A3A]">{env.error}</p>
      )}

      <a
        href={env.registerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center gap-1 rounded-full bg-[#0058E0] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#0048BC]"
      >
        Open app
      </a>
    </div>
  );
}
