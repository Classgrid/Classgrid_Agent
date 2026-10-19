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
const filePath = 'client/src/features/org-admin/pages/BillingPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldHandleSaveSettings = `  const handleSaveSettings = async () => {
    if (!billingContactName?.trim()) return toast.error("Billing Contact Name is required.");
    if (!billingEmail?.trim()) return toast.error("Invoice Email is required.");
    if (!emailVerified) return toast.error("You must verify your Invoice Email before saving.");
    if (!billingPhone?.trim()) return toast.error("Billing Phone is required.");
    if (!phoneVerified) return toast.error("You must verify your Billing Phone before saving.");
    if (!billingAddress1?.trim()) return toast.error("Address Line 1 is required.");
    if (!billingCity?.trim()) return toast.error("City is required.");
    if (!billingState?.trim()) return toast.error("State / Province is required.");
    if (!billingPincode?.trim()) return toast.error("ZIP / Postal Code is required.");

    try {
      setIsSavingSettings(true);
      const res = await fetch("/api/org/billing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": \`Bearer \${localStorage.getItem("token")}\` },
        body: JSON.stringify({ 
          invoice_email: billingEmail, 
          phone: billingPhone,
          gstin: billingGstin,
          address_line1: billingAddress1,
          address_line2: billingAddress2,
          city: billingCity,
          state: billingState,
          pincode: billingPincode,
          billing_contact_name: billingContactName
        })
      });
      if (!res.ok) throw new Error("Failed to save settings");
      toast.success("Billing settings saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["orgBilling"] });
    } catch (err: any) {
      toast.error(err.message || "Could not save settings");
    } finally {
      setIsSavingSettings(false);
    }
  };`;

const newSaveFunctions = `
  const handleSaveName = async () => {
    if (!billingContactName?.trim()) return toast.error("Billing Name is required.");
    try {
      setIsSavingSettings(true);
      const res = await fetch("/api/org/billing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": \`Bearer \${localStorage.getItem("token")}\` },
        body: JSON.stringify({ billing_contact_name: billingContactName })
      });
      if (!res.ok) throw new Error("Failed to save name");
      toast.success("Name saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["orgBilling"] });
    } catch (err: any) {
      toast.error(err.message || "Could not save name");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveGstin = async () => {
    try {
      setIsSavingSettings(true);
      const res = await fetch("/api/org/billing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": \`Bearer \${localStorage.getItem("token")}\` },
        body: JSON.stringify({ gstin: billingGstin })
      });
      if (!res.ok) throw new Error("Failed to save GSTIN");
      toast.success("GSTIN saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["orgBilling"] });
    } catch (err: any) {
      toast.error(err.message || "Could not save GSTIN");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveAddress = async () => {
    try {
      setIsSavingSettings(true);
      const res = await fetch("/api/org/billing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": \`Bearer \${localStorage.getItem("token")}\` },
        body: JSON.stringify({ 
          address_line1: billingAddress1,
          address_line2: billingAddress2,
          city: billingCity,
          state: billingState,
          pincode: billingPincode
        })
      });
      if (!res.ok) throw new Error("Failed to save address");
      toast.success("Address saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["orgBilling"] });
    } catch (err: any) {
      toast.error(err.message || "Could not save address");
    } finally {
      setIsSavingSettings(false);
    }
  };
`;

if (content.includes(oldHandleSaveSettings)) {
  content = content.replace(oldHandleSaveSettings, newSaveFunctions);
} else {
  console.log("Could not find handleSaveSettings");
}

const oldNameInput = `<Label className="text-sm font-medium">Billing Contact Name</Label>
              <Input 
                value={billingContactName} 
                onChange={(e) => setBillingContactName(e.target.value)} 
                placeholder="John Doe"
              />`;
const newNameInput = `<Label className="text-sm font-medium">Billing Name</Label>
              <div className="flex gap-2">
                <Input 
                  value={billingContactName} 
                  onChange={(e) => setBillingContactName(e.target.value)} 
                  placeholder="John Doe"
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleSaveName} disabled={isSavingSettings || !billingContactName?.trim()}>
                  Save
                </Button>
              </div>`;
if (content.includes(oldNameInput)) {
  content = content.replace(oldNameInput, newNameInput);
} else {
  console.log("Could not find oldNameInput");
}

content = content.replace(/<Label className="text-sm font-medium">Invoice Email<\/Label>/g, '<Label className="text-sm font-medium">Billing Email</Label>');

const oldGstinInput = `<Label className="text-sm font-medium">GSTIN (Optional)</Label>
              <Input 
                value={billingGstin} 
                onChange={(e) => setBillingGstin(e.target.value)} 
                placeholder="27AADCB2230M1Z2"
                disabled={!phoneVerified}
              />`;
const newGstinInput = `<Label className="text-sm font-medium">GSTIN (Optional)</Label>
              <div className="flex gap-2">
                <Input 
                  value={billingGstin} 
                  onChange={(e) => setBillingGstin(e.target.value)} 
                  placeholder="27AADCB2230M1Z2"
                  disabled={!phoneVerified}
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleSaveGstin} disabled={isSavingSettings || !phoneVerified}>
                  Save
                </Button>
              </div>`;
if (content.includes(oldGstinInput)) {
  content = content.replace(oldGstinInput, newGstinInput);
} else {
  console.log("Could not find oldGstinInput");
}

const addressSaveButton = `
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveAddress} disabled={isSavingSettings || !phoneVerified} className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-6">
                Save Address
              </Button>
            </div>
          </div>
        </Card>
`;
content = content.replace(/            <\/div>\s*<\/div>\s*<\/Card>/g, addressSaveButton);

const oldCommonSave = `        <div className="flex justify-end mt-6">
          <Button onClick={handleSaveSettings} disabled={isSavingSettings} className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-8 py-2 font-medium shadow-sm transition-all hover:shadow-md">
            {isSavingSettings ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving Profile...
              </>
            ) : "Save All Changes"}
          </Button>
        </div>`;

if (content.includes(oldCommonSave)) {
  content = content.replace(oldCommonSave, '');
} else {
  console.log("Could not find common save button");
}

fs.writeFileSync(filePath, content);
console.log("Script finished");
