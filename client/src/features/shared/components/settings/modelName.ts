// The model's name as the model picker shows it ("GLM 5.3"), never the provider path ("@cf/zai-org/glm-5.3"). A model
// the picker does not list gets its last part written out ("deepseek-v4.1-flash-1017" -> "Deepseek V4.1 Flash").
// Used by Settings > Usage and by the super admin's user page (Plans & Usage), so both histories read the same.
import { MODEL_GROUPS } from "@/components/ai/components/ModelPicker";

const MODEL_NAMES = new Map(MODEL_GROUPS.flatMap((g) => g.models.map((m) => [m.id, m.name] as const)));

export function modelName(id: string) {
  const known = MODEL_NAMES.get(id);
  if (known) return known;
  const last = String(id || "").split("/").pop() || id;
  return last
    .replace(/-\d{3,}$/, "") // a date or build number at the end
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => (/^v?\d/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
