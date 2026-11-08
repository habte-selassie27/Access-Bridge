import { isEthiopianDate } from "./verify/calendar/ethiopian.ts";

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
  const deadlines = (old.deadlines || []).map((d: any, i: number) => {
    const span = resolveSpan(sourceText, d.sourceSpan, d.matchedSource);
    const quote = spanQuote(sourceText, span);
    const verified = Boolean(d.verified);
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
      warning: d.warning ?? (verified ? null : "Check the original document."),
    };
  });
  const costs = (old.costs || []).map((c: any, i: number) => {
    const span = resolveSpan(sourceText, c.sourceSpan, c.matchedSource);
    const quote = spanQuote(sourceText, span);
    const verified = Boolean(c.verified);
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
      warning: c.warning ?? (verified ? null : "Check the original document."),
    };
  });
  const actions = (old.actions || []).map((a: any, i: number) => ({
    id: a.id || genId("act", i),
    step: a.step,
    urgent: Boolean(a.urgent),
    evidence: null,
  }));
  return {
    docType: old.docType,
    summary: old.summary,
    actions,
    deadlines,
    costs,
    documentsToBring: old.documentsToBring || [],
    confidence: old.confidence || "medium",
    warnings: old.warnings || [],
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

  const confidence = ["high", "medium", "low"].includes(raw.confidence) ? raw.confidence : "medium";
  const warnings = Array.isArray(raw.warnings) ? raw.warnings.map((x: any) => String(x)) : [];

  return {
    docType,
    summary,
    actions,
    deadlines,
    costs,
    documentsToBring,
    confidence,
    warnings,
    lang,
    originalText: raw.originalText || sourceText,
  };
}
