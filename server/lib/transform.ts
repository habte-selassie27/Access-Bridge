import { isEthiopianDate } from "./verify/calendar/ethiopian.ts";
import { runVerification } from "../../frontend/src/lib/verify.ts";
import { languageTier } from "../../frontend/src/lib/languages.ts";

function genId(prefix: string, i: number): string {
  return `${prefix}_${i}`;
}

function spanQuote(source: string, span?: [number, number]): string | null {
  if (!span || span.length !== 2) return null;
  const [s, e] = span;
  if (s < 0 || e > source.length || s >= e) return null;
  return source.slice(s, e);
}

// The model is not asked for offsets, so fall back to the text the deterministic
// verifier matched. That keeps evidence traceable to the source, not to the model.
function resolveSpan(
  source: string,
  span?: [number, number],
  matchedText?: string | null
): [number, number] | undefined {
  if (span && span.length === 2 && span[0] >= 0 && span[1] <= source.length && span[0] < span[1]) {
    return span;
  }
  if (matchedText) {
    const i = source.indexOf(matchedText);
    if (i >= 0) return [i, i + matchedText.length];
  }
  return undefined;
}

export function toFrontendResult(old: any, sourceText: string): any {
  const lang = old.lang || "en";
  // Verification is never inherited from the caller (model output or cached demo
  // JSON). Recompute it from the source text and fail closed, so a stale or
  // forged `verified: true` can never reach the UI.
  const checks = runVerification(
    (old.deadlines || []).map((d: any) => ({ label: d.label, date: d.date ?? null })),
    (old.costs || []).map((c: any) => ({ label: c.label, amount: c.amount ?? undefined, currency: c.currency || "ETB" })),
    sourceText
  );
  const deadlines = (old.deadlines || []).map((d: any, i: number) => {
    const check = checks.verifiedDeadlines[i];
    const span = resolveSpan(sourceText, undefined, check?.matchedSource);
    const quote = spanQuote(sourceText, span);
    const verified = Boolean(check?.verified) && Boolean(quote);
    const evidence = quote
      ? { sourceSpan: span, quote, verification: verified ? "verified" : "unverified" }
      : null;
    return {
      id: d.id || genId("dl", i),
      label: d.label,
      originalValue: d.date ?? null,
      normalizedDate: d.date ?? null,
      calendar: isEthiopianDate(sourceText) ? "ethiopian" : "gregorian",
      deadlineType: d.date ? "absolute" : "unknown",
      evidence,
      verified,
      warning: check?.warning ?? (verified ? null : "Check the original document."),
    };
  });
  const costs = (old.costs || []).map((c: any, i: number) => {
    const check = checks.verifiedCosts[i];
    const span = resolveSpan(sourceText, undefined, check?.matchedSource);
    const quote = spanQuote(sourceText, span);
    const verified = Boolean(check?.verified) && Boolean(quote);
    const evidence = quote
      ? { sourceSpan: span, quote, verification: verified ? "verified" : "unverified" }
      : null;
    return {
      id: c.id || genId("cost", i),
      label: c.label,
      originalValue: c.amount != null ? `${c.currency || "ETB"} ${c.amount}` : "",
      amount: c.amount ?? null,
      currency: c.currency || "ETB",
      evidence,
      verified,
      warning: check?.warning ?? (verified ? null : "Check the original document."),
    };
  });
  const actions = (old.actions || []).map((a: any, i: number) => ({
    id: a.id || genId("act", i),
    step: a.step,
    urgent: Boolean(a.urgent),
    evidence: null,
  }));
  const sections = (old.sections || [])
    .map((s: any) => ({ title: String(s?.title ?? "").trim(), summary: String(s?.summary ?? "").trim() }))
    .filter((s: { title: string; summary: string }) => s.title && s.summary);
  const glossary = (old.glossary || [])
    .map((g: any) => ({
      term: String(g?.term ?? "").trim(),
      meaning: String(g?.meaning ?? "").trim(),
      quote: String(g?.quote ?? "").trim(),
    }))
    .filter((g: { term: string; meaning: string }) => g.term && g.meaning);
  const contacts = (old.contacts || [])
    .map((c: any) => ({
      label: String(c?.label ?? "").trim(),
      value: String(c?.value ?? "").trim(),
      kind: ["email", "phone", "address", "website", "person", "organization", "other"].includes(c?.kind)
        ? c.kind
        : "other",
      quote: String(c?.quote ?? "").trim(),
    }))
    .filter((c: { label: string; value: string }) => c.label && c.value);
  const examples = Array.isArray(old.examples) ? old.examples.map((x: any) => String(x).trim()).filter(Boolean) : [];
  return {
    docType: old.docType,
    summary: old.summary,
    actions,
    eligibility: old.eligibility || [],
    howToApply: old.howToApply || [],
    deadlines,
    costs,
    documentsToBring: old.documentsToBring || [],
    sections,
    glossary,
    contacts,
    examples,
    level: old.level || "standard",
    confidence: old.confidence || "medium",
    warnings: old.warnings || [],
    languageQuality: languageTier(lang),
    lang,
    originalLanguage: lang,
    originalText: old.originalText || sourceText,
  };
}


export function normalizeModelOutput(raw: any, sourceText: string, lang: string): any {
  if (!raw || typeof raw !== "object") raw = {};
  const docTypeMap: Record<string, string> = {
    government_notice: "government_notice",
    medical: "medical",
    financial: "financial",
    school: "school",
    scholarship: "scholarship",
    job: "job",
    internship: "internship",
    grant: "grant",
    fellowship: "fellowship",
    bootcamp: "bootcamp",
    form: "form",
    instructions: "instructions",
    instruction: "instructions",
  };
  const rawDocType = String(raw.docType || raw.document_type || raw.doc_type || "other").toLowerCase();
  const docType = docTypeMap[rawDocType] || "other";

  const summary = String(raw.summary || raw.description || raw.overview || raw.what_is_this || raw.what_this_is || raw.what_this_document_is || "Document explanation.").trim();

  // actions
  let actionsRaw = raw.actions || raw.action_required || raw.action_items || raw.steps || raw.what_you_must_do || raw.what_to_do || raw.required_actions || [];
  if (typeof actionsRaw === "string") actionsRaw = [{ step: actionsRaw, urgent: false }];
  if (!Array.isArray(actionsRaw)) actionsRaw = [];
  const actions = actionsRaw.map((a: any) => {
    if (typeof a === "string") return { step: a, urgent: false };
    return { step: String(a.step || a.action || a.text || a), urgent: Boolean(a.urgent) };
  });
  if (actions.length === 0) actions.push({ step: "Read the document carefully.", urgent: false });

  // deadlines
  let deadlinesRaw = raw.deadlines || raw.deadline || [];
  if (typeof deadlinesRaw === "string") deadlinesRaw = [{ label: "Deadline", date: deadlinesRaw }];
  if (!Array.isArray(deadlinesRaw)) deadlinesRaw = deadlinesRaw ? [deadlinesRaw] : [];
  const deadlines = deadlinesRaw.map((d: any) => {
    if (typeof d === "string") return { label: "Deadline", date: d, sourceSpan: undefined, verified: false };
    const date = d.date || d.deadline || d.value || null;
    return {
      label: String(d.label || d.name || "Deadline"),
      date: date ? String(date) : null,
      sourceSpan: d.sourceSpan,
      verified: false,
    };
  });

  // costs
  let costsRaw = raw.costs || raw.cost || raw.amounts || [];
  if (typeof costsRaw === "string") {
    const m = costsRaw.match(/[\d,]+\.?\d*/);
    const amt = m ? Number(m[0].replace(/,/g, "")) : null;
    const curMatch = costsRaw.match(/[A-Z]{3}/);
    costsRaw = [{ label: "Cost", amount: Number.isFinite(amt as number) ? amt : null, currency: curMatch ? curMatch[0] : "ETB" }];
  }
  if (!Array.isArray(costsRaw)) costsRaw = costsRaw ? [costsRaw] : [];
  const costs = costsRaw.map((c: any) => {
    if (typeof c === "string") return { label: "Cost", amount: null, currency: "ETB", sourceSpan: undefined, verified: false };
    let amount: number | undefined;
    const amtRaw = c.amount ?? c.value ?? c.cost;
    if (typeof amtRaw === "number") amount = amtRaw;
    else if (typeof amtRaw === "string") {
      const m = amtRaw.match(/[\d,]+\.?\d*/);
      if (m) amount = Number(m[0].replace(/,/g, ""));
    }
    return {
      label: String(c.label || c.name || "Cost"),
      amount: Number.isFinite(amount as number) ? amount : undefined,
      currency: String(c.currency || "ETB"),
      sourceSpan: c.sourceSpan,
      verified: false,
    };
  });

  const documentsToBring = Array.isArray(raw.documentsToBring || raw.required_documents || raw.documents_to_bring)
    ? (raw.documentsToBring || raw.required_documents || raw.documents_to_bring).map((x: any) => String(x))
    : [];

  // Opportunity discovery: who qualifies and how to apply. Both are optional
  // — an empty array means the document did not state them, never that the
  // person does not qualify.
  const toStringList = (v: any): string[] =>
    Array.isArray(v) ? v.map((x: any) => String(x)).filter(Boolean) : v ? [String(v)] : [];

  const eligibility = toStringList(raw.eligibility || raw.eligibility_requirements || raw.who_can_apply);
  const howToApply = toStringList(raw.howToApply || raw.how_to_apply || raw.application_steps);

  // Named sections of the document, for section-by-section reading.
  let sectionsRaw = raw.sections || raw.key_sections || raw.parts || [];
  if (!Array.isArray(sectionsRaw)) sectionsRaw = [];
  const sections = sectionsRaw
    .map((s: any) => ({
      title: String(s?.title ?? s?.name ?? "").trim(),
      summary: String(s?.summary ?? s?.description ?? s?.text ?? "").trim(),
    }))
    .filter((s: { title: string; summary: string }) => s.title && s.summary);

  // Hard terms explained in plain language, each with the text it came from.
  let glossaryRaw = raw.glossary || raw.terms || [];
  if (!Array.isArray(glossaryRaw)) glossaryRaw = [];
  const glossary = glossaryRaw
    .map((g: any) => ({
      term: String(g?.term ?? g?.word ?? "").trim(),
      meaning: String(g?.meaning ?? g?.explanation ?? g?.definition ?? "").trim(),
      quote: String(g?.quote ?? g?.source ?? "").trim(),
    }))
    .filter((g: { term: string; meaning: string }) => g.term && g.meaning);

  // People, offices and ways to get in touch.
  let contactsRaw = raw.contacts || raw.contact_information || [];
  if (!Array.isArray(contactsRaw)) contactsRaw = [];
  const contacts = contactsRaw
    .map((c: any) => ({
      label: String(c?.label ?? c?.name ?? c?.role ?? "").trim(),
      value: String(c?.value ?? c?.detail ?? c?.contact ?? "").trim(),
      kind: ["email", "phone", "address", "website", "person", "organization", "other"].includes(c?.kind)
        ? c.kind
        : "other",
      quote: String(c?.quote ?? c?.source ?? "").trim(),
    }))
    .filter((c: { label: string; value: string }) => c.label && c.value);

  const examples = Array.isArray(raw.examples) ? raw.examples.map((x: any) => String(x).trim()).filter(Boolean) : [];

  const confidence = ["high", "medium", "low"].includes(raw.confidence) ? raw.confidence : "medium";
  const warnings = Array.isArray(raw.warnings) ? raw.warnings.map((x: any) => String(x)) : [];

  return {
    docType,
    summary,
    actions,
    eligibility,
    howToApply,
    deadlines,
    costs,
    documentsToBring,
    sections,
    glossary,
    contacts,
    examples,
    confidence,
    warnings,
    lang,
    originalText: raw.originalText || sourceText,
  };
}
