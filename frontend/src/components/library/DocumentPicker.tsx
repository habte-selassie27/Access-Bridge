import type { LibraryDoc } from "../../lib/library.ts";

export interface DocumentPickerProps {
  docs: LibraryDoc[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}

/** Pick which saved document a tool should work on. */
export function DocumentPicker({ docs, value, onChange, label = "Document" }: DocumentPickerProps) {
  return (
    <label className="block">
      <span className="form-label">{label}</span>
      <select className="textfield mt-1" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose a document…</option>
        {docs.map((d) => (
          <option key={d.id} value={d.id}>
            {d.title}
          </option>
        ))}
      </select>
    </label>
  );
}
