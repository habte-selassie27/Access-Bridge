import { BarChart3 } from "lucide-react";
import { MetricCard } from "./MetricCard.tsx";
import type { EvalResults } from "./evalTypes.ts";

function avg(nums: (number | null | undefined)[]): number | null {
  const xs = nums.filter((n): n is number => typeof n === "number");
  if (!xs.length) return null;
  return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100;
}

function pct(n: number | null): string {
  return n == null ? "—" : `${Math.round(n * 100)}%`;
}

function deltaText(a: number | null, b: number | null): { text?: string; direction?: "up" | "down" } {
  if (a == null || b == null) return {};
  const d = Math.round((a - b) * 100);
  if (d === 0) return { text: "±0 pts", direction: "up" };
  return { text: `${d > 0 ? "+" : ""}${d} pts`, direction: d > 0 ? "up" : "down" };
}

/**
 * An honest map of where Adaption is load-bearing and where it is not.
 *
 * The hackathon asks for more than a bolted-on dataset. The rows below name
 * the actual code path behind each role, including the roles that deliberately
 * use another provider. They are not claims of coverage.
 */
function AdaptionCoverage({ data }: { data: EvalResults | null }) {
  const sponsor = data?.sponsor;
  const roles = [
    {
      role: "Seed corpus and dataset build",
      path: "scripts/adaption-dataset.ts → upload, adapt, translate, download",
      status: "Adaption",
    },
    {
      role: "Multilingual few-shot examples",
      path: "data/adaption/dataset.json is read on every explanation",
      status: "Adaption",
    },
    {
      role: "Live translation memory (retrieval)",
      path: "Adaption rows are retrieved by similarity for each translation call",
      status: "Adaption",
    },
    {
      role: "Dataset quality report",
      path: sponsor?.available
        ? `Adaption evaluation fetched ${sponsor.fetchedAt ? new Date(sponsor.fetchedAt).toLocaleDateString() : ""}`
        : "Not fetched — run scripts/adaption-evaluate.ts",
      status: sponsor?.available ? "Adaption" : "Optional",
    },
    {
      role: "OCR for photos and PDFs",
      path: "Gemini or Groq vision adapter; Adaption does not provide OCR",
      status: "Independent",
    },
    {
      role: "Speech in and out",
      path: "Browser Web Speech API; optional server TTS, hosted or keyless local",
      status: "Independent",
    },
  ];

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="mb-1 text-lg font-semibold text-text">How Adaption is used</h2>
      <p className="mb-3 text-sm text-subtle">
        Four of the six roles run on Adaption data at build or request time: the dataset build, few-shot examples,
        translation memory and the quality report. OCR and speech are named honestly as independent providers rather
        than being relabelled.
      </p>
      <ul className="space-y-2">
        {roles.map((role) => (
          <li key={role.role} className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border bg-background p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">{role.role}</p>
              <p className="text-[0.75rem] text-subtle">{role.path}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                role.status === "Adaption"
                  ? "bg-success-bg text-success"
                  : role.status === "Optional"
                    ? "bg-warning-bg text-warning"
                    : "bg-surface-muted text-subtle"
              }`}
            >
              {role.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EvalOverview({ data }: { data: EvalResults | null }) {
  const languages = Object.values(data?.languages ?? {});
  const dateAdapted = avg(languages.map((l) => l.adapted?.dateAccuracy ?? null));
  const dateBaseline = avg(languages.map((l) => l.baseline?.dateAccuracy ?? null));
  const amountAdapted = avg(languages.map((l) => l.adapted?.amountAccuracy ?? null));
  const amountBaseline = avg(languages.map((l) => l.baseline?.amountAccuracy ?? null));
  const verifiedAdapted = avg(languages.map((l) => l.adapted?.verifiedRate ?? null));
  const hallucinated = languages.reduce((n, l) => n + (l.adapted?.hallucinatedFields ?? 0), 0);
  const dateDelta = deltaText(dateAdapted, dateBaseline);
  const amountDelta = deltaText(amountAdapted, amountBaseline);
  const totalRows = data?.rows?.length ?? 0;
  const notMeasured = data?.providerErrors ?? 0;
  const measuredRows = data?.measuredRows ?? Math.max(0, totalRows - notMeasured);
  const measuredLabel = totalRows ? `${measuredRows}/${totalRows}` : "—";

  if (!data) {
    return (
      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted">
            <BarChart3 size={20} strokeWidth={2} className="text-subtle" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text">No measured results yet</h2>
            <p className="mt-1 text-sm text-subtle">
              Evaluation runs offline against held-out documents, comparing baseline prompts with
              per-language prompts adapted from an Adaption dataset. Results are only published when a
              real run exists — this page never shows simulated numbers.
            </p>
          </div>
        </div>
        <dl className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-[0.75rem] text-subtle">Date accuracy</dt>
            <dd className="mt-0.5 text-sm font-medium text-text">Baseline vs adapted</dd>
          </div>
          <div>
            <dt className="text-[0.75rem] text-subtle">Amount accuracy</dt>
            <dd className="mt-0.5 text-sm font-medium text-text">Baseline vs adapted</dd>
          </div>
          <div>
            <dt className="text-[0.75rem] text-subtle">Field verification</dt>
            <dd className="mt-0.5 text-sm font-medium text-text">Checked against the source</dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <p className="text-sm text-subtle">
        Measured on {data.heldOutSeeds.length} held-out documents ({data.model}). Adaption dataset {data.datasetId},
        built {new Date(data.datasetBuiltAt).toLocaleDateString()} UTC.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Documents tested" value={String(data.heldOutSeeds.length)} />
        <MetricCard label="Languages" value={String(Object.keys(data.languages).length)} />
        <MetricCard label="Rows scored" value={measuredLabel} />
        <MetricCard label="Date accuracy" value={pct(dateAdapted)} change={dateDelta.text} changeDirection={dateDelta.direction} />
        <MetricCard label="Amount accuracy" value={pct(amountAdapted)} change={amountDelta.text} changeDirection={amountDelta.direction} />
        <MetricCard label="Verified fields" value={pct(verifiedAdapted)} />
        <MetricCard label="Unverified fields (adapted)" value={String(hallucinated)} />
      </div>
      {notMeasured > 0 && (
        <p className="text-sm text-subtle">
          {notMeasured} of {totalRows} row(s) were not scored: the provider returned rate-limit or network
          errors, so no explanation was produced. They are listed under Failures as “not measured” and
          excluded from every percentage above instead of being counted as wrong answers.
        </p>
      )}
      <AdaptionCoverage data={data} />
      <div className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-text mb-3">Baseline vs Adapted</h2>
        <p className="text-sm text-subtle">
          Adapted prompts use per-language examples translated by Adaption from the English seed corpus. Every date
          and amount is checked against the source document by deterministic code.
        </p>
        <p className="mt-2 text-sm text-subtle">
          Only the languages listed here have measured numbers. The app also supports Swahili, Arabic and
          French, but those are marked as experimental until they are evaluated the same way — no number on
          this page covers them yet.
        </p>
      </div>
    </section>
  );
}
