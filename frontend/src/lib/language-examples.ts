/**
 * Compact cross-lingual few-shot examples for the client-side hybrid path.
 *
 * The server path already uses the Adaption dataset, but the browser path did
 * not, so cloud Gemini often answered in English when the target was Amharic,
 * Afaan Oromoo or Tigrinya. These examples pair one English source with the
 * measured target-language explanation so the model sees the required output
 * language and JSON shape without bundling the whole 156 KB dataset.
 *
 * Source: data/adaption/dataset.json (row: health-insurance-renewal), built
 * from data/adaption/seeds.json. Facts are illustrative only; the prompt tells
 * the model not to copy them.
 */
export const LANGUAGE_EXAMPLE_SOURCE =
  "Your health insurance coverage will expire on 2026-12-15. To keep your benefits, renew by paying ETB 500 before the deadline. Bring your ID card and previous insurance card to the nearest health office. If you miss the deadline, your coverage will stop.";

const EXAMPLES: Record<string, unknown> = {
  "am": {
    "docType": "government_notice",
    "summary": "የጤና ኢንሹራንስዎ በቅርቡ ያከብራል። ጥቅሞችዎን ለመቀጠል ማደስ አለብዎት።",
    "actions": [
      {
        "step": "ከ2026-12-15 በፊት የጤና ኢንሹራንስዎን ያድሱ።",
        "urgent": true
      },
      {
        "step": "ክፍያዎን ለመቀጠል ብር 500 ይክፈሉ።",
        "urgent": true
      },
      {
        "step": "የመታወቂያ ካርድዎን እና የኢንሹራንስ ካርድዎን ይዘው ወደ የጤና ጽ/ቤት ይምጡ።",
        "urgent": false
      }
    ],
    "eligibility": [
      "አሁን ባለው የጤና ኢንሹራንስ ክፍያ ንቁ የሆኑ ሰዎች።"
    ],
    "howToApply": [
      "ከ2026-12-15 በፊት በቅርቡ የጤና ጽ/ቤት ብር 500 ይክፈሉ።"
    ],
    "deadlines": [
      {
        "label": "የማደሻ ጊዜ",
        "date": "2026-12-15"
      }
    ],
    "costs": [
      {
        "label": "የማደሻ ክፍያ",
        "amount": 500,
        "currency": "ETB"
      }
    ],
    "documentsToBring": [
      "የመታወቂያ ካርድ",
      "የቀድሞ የኢንሹራንስ ካርድ"
    ]
  },
  "om": {
    "docType": "government_notice",
    "summary": "Misoomni fayyaa keessan baay'ee waan dhiyaateef. Faayidaa keessan itti fufuuf haaromsuu qabdu.",
    "actions": [
      {
        "step": "Misooma fayyaa keessan bara 2026-12-15 dura haaromsaa.",
        "urgent": true
      },
      {
        "step": "Misoomni keessan akka itti fufuuf Birrii 500 kaffalaa.",
        "urgent": true
      },
      {
        "step": "Waraqaa eenyummaa keessanii fi kaardii misoomaa waajjira fayyaa geessaa.",
        "urgent": false
      }
    ],
    "eligibility": [
      "Namoota misoomni fayyaa isaanii amma hojii irra jiru."
    ],
    "howToApply": [
      "Yeroo murtaa'ee 2026-12-15 dura waajjira fayyaa isa dhiyoo jiruutti Birrii 500 kaffalaa."
    ],
    "deadlines": [
      {
        "label": "Yeroo murtaa'ee haaromsaa",
        "date": "2026-12-15"
      }
    ],
    "costs": [
      {
        "label": "Gatii haaromsaa",
        "amount": 500,
        "currency": "ETB"
      }
    ],
    "documentsToBring": [
      "Waraqaa eenyummaa",
      "Kaardii misooma darbe"
    ]
  },
  "ti": {
    "docType": "government_notice",
    "summary": "መድሕን ጥዕናኹም ይዛዘም ኣሎ። ጥቕምታትኩም ንምቕጻል ክትሐድስዎ የድሊ።",
    "actions": [
      {
        "step": "መድሕን ጥዕናኹም ቅድሚ 2026-12-15 ኣሐድስዎ።",
        "urgent": true
      },
      {
        "step": "መድሕንኩም ንምቕጻል 500 ብር ክፈሉ።",
        "urgent": true
      },
      {
        "step": "መንነትኩም ዘረጋግጽ ካርዲን ከምኡ'ውን ናይ መድሕን ካርዲኹም ዓጺፍኩም ናብ ቤት ጽሕፈት ጥዕና ክትመጹ።",
        "urgent": false
      }
    ],
    "eligibility": [
      "መድሕን ጥዕናኦም ዝነጥፍ ዘሎ ሰባት።"
    ],
    "howToApply": [
      "ቅድሚ 2026-12-15 ኣብ ዝቐረበ ቤት ጽሕፈት ጥዕና 500 ብር ክፈሉ።"
    ],
    "deadlines": [
      {
        "label": "ዝተወሰነ ግዜ ምሕዳስ",
        "date": "2026-12-15"
      }
    ],
    "costs": [
      {
        "label": "ክፍሊት ምሕዳስ",
        "amount": 500,
        "currency": "ETB"
      }
    ],
    "documentsToBring": [
      "መንነትኩም ዘረጋግጽ ካርዲ",
      "ናይ ቅድሚ ሕጂ መድሕን ካርዲ"
    ]
  }
};

/** Example block for EXPLAIN_USER, or "" for languages without one. */
export function languageExampleBlock(lang: string): string {
  const example = EXAMPLES[lang];
  if (!example) return "";
  return (
    "\n\nFollow this example pattern. The document is in English; the explanation JSON is in the target language. " +
    "Copy the language and JSON shape, not the facts.\n" +
    `Document: "${LANGUAGE_EXAMPLE_SOURCE}"\n` +
    `Explanation JSON: ${JSON.stringify(example)}`
  );
}
