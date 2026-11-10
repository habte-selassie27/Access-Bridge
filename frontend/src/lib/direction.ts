// Direction and language for *content* regions.
//
// The application chrome (header, nav, buttons, labels) is written in English
// and must always read left-to-right. Only the text that the model generated
// in a target language (an Arabic explanation, an Amharic source quote) runs
// in that language's direction.
//
// Setting `dir` on <html> would flip the whole interface — nav would jump to
// the other side, English labels would right-align, and Latin text would get
// its punctuation reordered by the bidi algorithm. So direction is applied
// per content region instead.
import { isRtl } from "./languages.ts";

export interface ContentLangProps {
  lang: string;
  dir: "ltr" | "rtl";
}

/** Props for a region whose text is in `code`. */
export function contentLang(code: string): ContentLangProps {
  return { lang: code, dir: isRtl(code) ? "rtl" : "ltr" };
}
