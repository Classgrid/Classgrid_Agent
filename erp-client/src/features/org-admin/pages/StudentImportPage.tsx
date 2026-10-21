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

import { useState, useRef, useEffect } from "react";
import { Upload, FileDown, CheckCircle2, AlertCircle, Users } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/marketing_ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/marketing_ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/marketing_ui/tabs";
import { DataTable } from "@/components/marketing_ui/data-table";
import { Badge } from "@/components/marketing_ui/badge";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/marketing_ui/progress";

export function StudentImportPage() {
  const [activeTab, setActiveTab] = useState("all-students");
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<{ created: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isUploading) {
      setUploadProgress(0);
      interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return 90;
          return prev + 10;
        });
      }, 500);
    } else {
      setUploadProgress(100);
    }
    return () => clearInterval(interval);
  }, [isUploading]);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get("/api/student/org-students");
      setStudents(res.data.students || []);
    } catch (err) {
      console.error("Failed to fetch students", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleDownloadTemplate = () => {
    const csvContent = "\uFEFFfirst_name,last_name,email,phone_number\nJohn,Doe,john@example.com,987-654-3210";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "student_import_template.csv";
    link.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError("");

    try {
      const text = await file.text();
      const rows = text.split("\n").map(row => row.split(","));
      const headers = rows[0].map(h => h.trim().toLowerCase());
      
      const studentsToImport = rows.slice(1).filter(row => row.length === headers.length && row[0].trim() !== "").map(row => {
        const student: any = {};
        headers.forEach((header, index) => {
          student[header] = row[index].trim();
        });
        return student;
      });

      if (studentsToImport.length === 0) {
        throw new Error("No valid students found in CSV.");
      }

      const response = await apiClient.post("/api/student/batch-import", { students: studentsToImport }, {
        timeout: 20 * 60 * 1000 // 20 minutes timeout for massive imports (e.g. 2 lakh students)
      });
      setResults({ created: response.data.created, skipped: response.data.skipped });
      setIsDone(true);
      toast.success(`Successfully imported ${response.data.created} students!`);
      fetchStudents(); // Refresh the list
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || "Failed to process CSV file.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const studentColumns = [
    {
      key: "user",
      header: "Student",
      width: "w-[250px]",
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-xs">
            {row.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm truncate">{row.name}</span>
            <span className="text-muted-foreground text-xs truncate">{row.email}</span>
          </div>
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      width: "w-[120px]",
      render: (_: any, row: any) => (
        <Badge variant={row.status === "active" ? "default" : "secondary"} className="text-xs">
          {row.status || "Pending"}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Students</h1>
        <p className="text-muted-foreground mt-1">
          Manage all students across your school divisions.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all-students">All Students</TabsTrigger>
          <TabsTrigger value="import-students">Import from CSV</TabsTrigger>
        </TabsList>

        <TabsContent value="all-students" className="m-0 border border-border rounded-md bg-background">
          <DataTable
            columns={studentColumns}
            rows={students}
            isLoading={isLoading}
            emptyMessage="No students found. Use the Import tab to add students."
          />
        </TabsContent>

        <TabsContent value="import-students" className="m-0">
          <div className="space-y-6 max-w-4xl">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isDone ? (
              <Card className="border-emerald-500/50 bg-emerald-500/5">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Import Successful</h3>
                  <p className="text-muted-foreground mb-6">
                    Created {results?.created} accounts. Skipped {results?.skipped} duplicates.
                  </p>
                  <Button variant="outline" onClick={() => { setIsDone(false); setActiveTab("all-students"); }}>View Students</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Step 1: Download Template</CardTitle>
                    <CardDescription>Get the formatted CSV file to fill in your data.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full" onClick={handleDownloadTemplate}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Download Template.csv
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Step 2: Upload CSV</CardTitle>
                    <CardDescription>Upload the filled template to import students.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input 
                        type="file" 
                        accept=".csv" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                      />
                      <Upload className="h-8 w-8 text-muted-foreground mb-4" />
                      <p className="text-sm font-medium mb-1">Click to browse or drag and drop</p>
                      <p className="text-xs text-muted-foreground mb-4">CSV files only</p>
                      
                      {isUploading && (
                        <div className="w-full max-w-xs mb-4">
                          <Progress value={uploadProgress} className="w-full h-2">
                            <ProgressTrack>
                              <ProgressIndicator />
                            </ProgressTrack>
                          </Progress>
                          <p className="text-xs text-muted-foreground mt-2 text-center">Processing... {uploadProgress}%</p>
                        </div>
                      )}

                      <Button disabled={isUploading}>
                        {isUploading ? "Uploading Data..." : "Select File"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
