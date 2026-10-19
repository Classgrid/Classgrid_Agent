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
const file = 'C:\\CLASSGRIDPLATFORM\\classgrid_platoform-desktop-\\client\\src\\features\\superadmin\\pages\\SettingsPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/Palette, /g, 'Palette, Eye, ');

const stateLogic = `type PrivacyPrefs = {
  hideEmail: boolean;
  hideHobbies: boolean;
};

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const [prefs, setPrefs] = useState<EmailPrefs>({
    global: true,
    announcements: true,
    notes: true,
    quizzes: true,
    joinApproval: true,
    emailOnPost: true,
    digestMode: "instant",
  });

  const [privacy, setPrivacy] = useState<PrivacyPrefs>({
    hideEmail: false,
    hideHobbies: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["superadmin-settings"],
    queryFn: () => apiClient.get("/api/user/email-preferences").then((r) => r.data),
  });

  useEffect(() => {
    if (data?.emailNotifications) {
      setPrefs((prev) => ({ ...prev, ...data.emailNotifications }));
    }
    if (data?.privacySettings) {
      setPrivacy((prev) => ({ ...prev, ...data.privacySettings }));
    }
  }, [data]);

  const updatePrefs = useMutation({
    mutationFn: (updates: { emailNotifications?: EmailPrefs, privacySettings?: PrivacyPrefs }) => apiClient.put("/api/user/email-preferences", updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["global-profile"] });
      toast.success("Settings saved successfully.");
    },
    onError: () => {
      toast.error("Failed to save settings. Please try again.");
    }
  });

  const handlePrefChange = (field: keyof EmailPrefs, value: any) => {
    const newPrefs = { ...prefs, [field]: value };
    setPrefs(newPrefs);
    updatePrefs.mutate({ emailNotifications: newPrefs, privacySettings: privacy });
  };

  const handlePrivacyChange = (field: keyof PrivacyPrefs, value: any) => {
    const newPrivacy = { ...privacy, [field]: value };
    setPrivacy(newPrivacy);
    updatePrefs.mutate({ emailNotifications: prefs, privacySettings: newPrivacy });
  };

  const isPending = updatePrefs.isPending;`;

content = content.replace(/export function SettingsPage\(\) \{[\s\S]*?const isPending = updatePrefs\.isPending;/g, stateLogic);

const uiLogic = `      {/* Privacy Settings */}
      <div className="border border-border/50 bg-card rounded-xl p-6 space-y-6 shadow-sm">
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Eye size={18} /> Privacy
          </h2>
          <p className="text-sm text-muted-foreground">Manage what others can see on your profile.</p>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4">Loading preferences...</div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-foreground">Hide Email</span>
                <span className="text-[13px] text-muted-foreground">Prevent others from seeing your email address</span>
              </div>
              <label className="flex items-center">
                <Switch
                  checked={privacy.hideEmail}
                  onCheckedChange={(checked) => handlePrivacyChange("hideEmail", checked)}
                />
              </label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/40">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-foreground">Hide Hobbies</span>
                <span className="text-[13px] text-muted-foreground">Prevent others from seeing your hobbies</span>
              </div>
              <label className="flex items-center">
                <Switch
                  checked={privacy.hideHobbies}
                  onCheckedChange={(checked) => handlePrivacyChange("hideHobbies", checked)}
                />
              </label>
            </div>
          </>
        )}
      </div>

      {/* Notifications */}`;

content = content.replace(/\{\/\* Notifications \*\/\}/, uiLogic);

fs.writeFileSync(file, content);
console.log('Done');
