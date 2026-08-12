import { EnvironmentCard } from "@/components/environment-card";
import { OpenCrvsLogo } from "@/components/opencrvs-logo";
import { getEnvironments, groupEnvironments } from "@/lib/environments";

export const dynamic = "force-dynamic";

export default async function Home() {
  const environments = await getEnvironments();
  const checkedAt = new Date();
  const upCount = environments.filter((e) => e.status === "operational").length;
  const allUp = upCount === environments.length;
  const groups = groupEnvironments(environments);

  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2.5 px-6 py-4">
          <OpenCrvsLogo className="h-7 w-7" />
          <span className="text-lg font-semibold text-[#373050]">
            OpenCRVS <span className="text-[#0058E0]">Status</span>
          </span>
        </div>
      </header>

      <section className="bg-[#FBF1E9]">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-14">
          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              allUp
                ? "bg-[#ECF8F4] text-[#1C8A6E]"
                : "bg-[#FFEDEA] text-[#D14A3A]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                allUp ? "bg-[#1C8A6E]" : "bg-[#D14A3A]"
              }`}
              aria-hidden
            />
            {upCount} / {environments.length} environments operational
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-[#373050] sm:text-4xl">
            Environment status
          </h1>
          <p className="text-sm text-[#373050]/60">
            Last checked {checkedAt.toLocaleString()}
          </p>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-12">
        {groups.map(({ group, label, environments }) => (
          <section key={group} className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-[#373050]">{label}</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {environments.map((env) => (
                <EnvironmentCard key={env.domain} env={env} />
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="border-t border-black/5 bg-white py-6">
        <p className="mx-auto w-full max-w-5xl px-6 text-xs text-[#373050]/50">
          © OpenCRVS
        </p>
      </footer>
    </div>
  );
}
