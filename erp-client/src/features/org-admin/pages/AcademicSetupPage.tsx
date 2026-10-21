/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

import { useState } from "react";
import { Plus, Users, School, BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hierarchyApi } from "../services/hierarchyApi";
import { Button } from "@/components/marketing_ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/marketing_ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/marketing_ui/alert";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Badge } from "@/components/marketing_ui/badge";

export function AcademicSetupPage() {
  const queryClient = useQueryClient();
  const [isSeeding, setIsSeeding] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["hierarchy", "tree"],
    queryFn: hierarchyApi.getTree,
  });

  const seedMutation = useMutation({
    mutationFn: hierarchyApi.seedHierarchy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hierarchy", "tree"] });
      setIsSeeding(false);
    },
    onError: () => {
      setIsSeeding(false);
    }
  });

  const handleSeed = () => {
    if (window.confirm("This will automatically generate Class 1 through Class 10. Continue?")) {
      setIsSeeding(true);
      seedMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load academic hierarchy.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const tree = data?.tree || [];
  const terminology = data?.terminology || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Class Structure</h1>
          <p className="text-muted-foreground mt-1">
            Configure your school's classes and sections/divisions.
          </p>
        </div>
        {tree.length === 0 && (
          <Button onClick={handleSeed} disabled={isSeeding}>
            {isSeeding ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Generate Standard Classes
          </Button>
        )}
      </div>

      {tree.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <School className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No classes found</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Your school has no classes set up yet. You can automatically generate standard classes (Class 1 to 10).
            </p>
            <Button size="lg" onClick={handleSeed} disabled={isSeeding}>
              {isSeeding ? "Generating..." : "Generate Standard Classes"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tree.map((node: any) => (
            <HierarchyCard key={node._id} node={node} />
          ))}
        </div>
      )}
    </div>
  );
}

function HierarchyCard({ node }: { node: any }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs uppercase bg-muted/50">
            {node.level_type}
          </Badge>
          <span className="text-xs text-muted-foreground">{node.code}</span>
        </div>
        <CardTitle className="text-lg mt-2">{node.name}</CardTitle>
      </CardHeader>
      <CardContent>
        {node.children && node.children.length > 0 ? (
          <div className="space-y-2 mt-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Sub-levels
            </div>
            {node.children.map((child: any) => (
              <div key={child._id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md hover:bg-muted/50">
                <span className="font-medium">{child.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {child.level_type}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic py-2">
            No nested levels
          </div>
        )}
      </CardContent>
    </Card>
  );
}
