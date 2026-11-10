import { Eye, Type, Contrast, AlignLeft, LayoutList } from "lucide-react";
import { SegmentedControl } from "../common/SegmentedControl.tsx";
import { useA11y, setA11y, resetA11y } from "../../lib/a11y.ts";
import type { A11ySettings } from "../../lib/a11y.ts";

/**
 * Accessibility controls.
 *
 * The same panel is used on the Settings screen and in the dashboard drawer,
 * so the preferences are always reachable and always in the same place.
 */
export function A11yControls({ compact = false }: { compact?: boolean }) {
  const settings = useA11y();

  const set = <K extends keyof A11ySettings>(key: K, value: A11ySettings[K]) =>
    setA11y({ [key]: value } as Partial<A11ySettings>);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-text">
          <Type size={16} aria-hidden="true" /> Text size
        </p>
        <SegmentedControl
          label="Text size"
          value={settings.fontScale}
          onChange={(v) => set("fontScale", v)}
          options={[
            { value: "sm", label: "Small" },
            { value: "md", label: "Default" },
            { value: "lg", label: "Large" },
            { value: "xl", label: "Extra large" },
          ]}
        />
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-text">
          <Contrast size={16} aria-hidden="true" /> Contrast
        </p>
        <SegmentedControl
          label="Contrast"
          value={settings.contrast}
          onChange={(v) => set("contrast", v)}
          options={[
            { value: "normal", label: "Normal" },
            { value: "high", label: "High contrast" },
          ]}
        />
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-text">
          <Eye size={16} aria-hidden="true" /> Theme
        </p>
        <SegmentedControl
          label="Theme"
          value={settings.theme}
          onChange={(v) => set("theme", v)}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
          ]}
        />
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-text">
          <AlignLeft size={16} aria-hidden="true" /> Spacing
        </p>
        <SegmentedControl
          label="Spacing"
          value={settings.spacing}
          onChange={(v) => set("spacing", v)}
          options={[
            { value: "normal", label: "Normal" },
            { value: "relaxed", label: "Relaxed" },
          ]}
        />
      </div>

      {!compact && (
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-text">
            <LayoutList size={16} aria-hidden="true" /> Simple interface
          </p>
          <SegmentedControl
            label="Simple interface"
            value={settings.simpleMode ? "on" : "off"}
            onChange={(v) => set("simpleMode", v === "on")}
            options={[
              { value: "off", label: "Off", hint: "Show every detail" },
              { value: "on", label: "On", hint: "One idea per screen" },
            ]}
            note="Simple interface hides secondary text so each screen has one clear job."
          />
        </div>
      )}

      <button
        type="button"
        onClick={resetA11y}
        className="touch-target rounded-md border border-input px-3 py-2 text-sm text-text hover:bg-neutral-subtle-hovered"
      >
        Reset to defaults
      </button>
    </div>
  );
}
