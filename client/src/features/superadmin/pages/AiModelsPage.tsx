import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { Card, CardContent } from "@/components/marketing_ui/card";
import { Switch } from "@/components/marketing_ui/switch";
import { apiClient } from "@/lib/apiClient";
import { MODEL_GROUPS } from "@/components/ai/components/ModelPicker";

// Model manager: turn chat models on or off for everyone. A model that is off is hidden from the model picker,
// a message that still asks for it goes to Auto, and helpers never get it.
export function AiModelsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["ai-models-admin"],
    queryFn: async () => (await apiClient.get("/api/super-admin/ai-models")).data as { disabledModels: string[] },
  });
  const disabled = new Set(data?.disabledModels || []);

  const toggle = useMutation({
    mutationFn: async ({ model, enabled }: { model: string; enabled: boolean }) =>
      (await apiClient.put("/api/super-admin/ai-models", { model, enabled })).data as { disabledModels: string[] },
    onMutate: ({ model, enabled }) => {
      const before = queryClient.getQueryData<{ disabledModels: string[] }>(["ai-models-admin"]);
      const list = new Set(before?.disabledModels || []);
      if (enabled) list.delete(model); else list.add(model);
      queryClient.setQueryData(["ai-models-admin"], { disabledModels: [...list] });
      return { before };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.before) queryClient.setQueryData(["ai-models-admin"], ctx.before);
      toast.error("Could not change the model. Try again.");
    },
    onSuccess: (res) => {
      queryClient.setQueryData(["ai-models-admin"], { disabledModels: res.disabledModels });
      queryClient.invalidateQueries({ queryKey: ["model-access"] });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageBreadcrumbs items={[{ label: "AI Usage & Credits", href: "/superadmin/ai-usage" }, { label: "Models" }]} />
      <PageHeader
        title="Models"
        description="Turn a model off and nobody can use it: it disappears from the model picker, and messages that pick it go to Auto."
      />
      {MODEL_GROUPS.map((group) => (
        <Card key={group.label}>
          <CardContent className="p-0">
            <div className="px-5 pt-4 pb-2 text-sm font-semibold text-muted-foreground">{group.label}</div>
            <div className="divide-y divide-border">
              {group.models.map((model) => {
                const on = !disabled.has(model.id);
                return (
                  <div key={model.id} className="flex items-center gap-3 px-5 py-3">
                    <img
                      src={model.logo.src}
                      alt=""
                      aria-hidden="true"
                      className={`h-5 w-5 shrink-0 object-contain ${model.logo.monochrome ? "brightness-0 dark:invert" : ""} ${on ? "" : "opacity-40"}`}
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className={`truncate text-[15px] font-medium ${on ? "text-foreground" : "text-muted-foreground"}`}>{model.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{on ? model.description : "Off for everyone"}</span>
                    </div>
                    <Switch
                      checked={on}
                      disabled={isLoading}
                      aria-label={`${on ? "Turn off" : "Turn on"} ${model.name}`}
                      onCheckedChange={(checked) => toggle.mutate({ model: model.id, enabled: checked })}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
