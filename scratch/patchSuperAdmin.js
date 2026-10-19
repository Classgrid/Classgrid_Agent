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
const fs = require('fs');

const file = 'client/src/features/shared/components/SuperAdminProfileView.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add imports
if (!content.includes('import { Select')) {
  content = content.replace(
    `import { User, Globe } from "lucide-react";`,
    `import { User, Globe, Code, PenTool, Database, Microscope, Target, Megaphone, TrendingUp, Headset, Settings, PenLine, Laptop, Users, Building, UserPlus, PiggyBank, Scale, Star } from "lucide-react";\nimport { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/marketing_ui/select";`
  );
}

// 2. Add ROLES array
const rolesArr = `
const ROLES = [
  { value: "software_engineer", label: "Software Engineer", icon: Code },
  { value: "designer", label: "Designer", icon: PenTool },
  { value: "data_scientist", label: "Data Scientist", icon: Database },
  { value: "researcher", label: "Researcher", icon: Microscope },
  { value: "product_manager", label: "Product Manager", icon: Target },
  { value: "marketer", label: "Marketer", icon: Megaphone },
  { value: "sales", label: "Sales", icon: TrendingUp },
  { value: "customer_support", label: "Customer Support", icon: Headset },
  { value: "operations", label: "Operations", icon: Settings },
  { value: "writer", label: "Writer", icon: PenLine },
  { value: "freelancer", label: "Freelancer", icon: Laptop },
  { value: "consultant", label: "Consultant", icon: Users },
  { value: "executive", label: "Executive", icon: Building },
  { value: "hr", label: "Human Resources", icon: UserPlus },
  { value: "finance", label: "Finance", icon: PiggyBank },
  { value: "legal", label: "Legal", icon: Scale },
  { value: "other", label: "Other", icon: Star },
];
`;

if (!content.includes('const ROLES = [')) {
  content = content.replace(
    `export function SuperAdminProfileView`,
    rolesArr + `\nexport function SuperAdminProfileView`
  );
}

// 3. Ensure role and age are pulled into initial state
if (!content.includes('"age": m?.["age"]')) {
  content = content.replace(
    `"tech_stack": m?.["tech_stack"] || m?.["tech_stack"] || "",`,
    `"tech_stack": m?.["tech_stack"] || m?.["tech_stack"] || "",\n        "age": m?.["age"] || "",\n        "job_role": m?.["job_role"] || "",`
  );
}

// 4. Ensure age and job_role are saved
if (!content.includes('age: formData["age"]')) {
  content = content.replace(
    `"facebook_url": formData["facebook_url"] || "",`,
    `"facebook_url": formData["facebook_url"] || "",\n          "age": formData["age"] || "",\n          "job_role": formData["job_role"] || "",`
  );
}

// 5. Render Role and Age inputs below Date of Birth
const htmlToInject = `
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Age</label>
            <input 
              type="number"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" 
              value={formData["age"] || ""} 
              onChange={e => handleInputChange("age", e.target.value)} 
              disabled={!isEditing} 
              placeholder="e.g. 24" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Role</label>
            <Select 
              value={formData["job_role"] || ""} 
              onValueChange={val => handleInputChange("job_role", val)}
              disabled={!isEditing}
            >
              <SelectTrigger className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm transition-all outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:text-foreground disabled:bg-muted/10" size="default">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  return (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span>{r.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
`;

if (!content.includes('label>Age</label>')) {
  content = content.replace(
    `placeholder="Not specified"\n              className={cn("w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10", !isEditing && "pointer-events-none opacity-60")}\n            />\n          </div>`,
    `placeholder="Not specified"\n              className={cn("w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10", !isEditing && "pointer-events-none opacity-60")}\n            />\n          </div>` + htmlToInject
  );
}

fs.writeFileSync(file, content);
console.log("SuperAdminProfileView updated successfully");
