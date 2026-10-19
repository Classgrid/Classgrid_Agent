<!--
─────────────────────────────────────────────────────────
🚨 HOSTING & ARCHITECTURE RULE 🚨
1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
2. FRONTEND IS HOSTED ON VERCEL
─────────────────────────────────────────────────────────
-->

<!--
─────────────────────────────────────────────────────────
🚨 NAMING CONVENTION RULE 🚨
1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
─────────────────────────────────────────────────────────
-->

<!--
─────────────────────────────────────────────────────────
🚨 CRITICAL AI AND SYSTEM RULES 🚨
1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
─────────────────────────────────────────────────────────
-->

# 🏗️ THE GREAT REBUILD: FULL EXHAUSTIVE COMPONENT ROADMAP

**Directive:** Complete rewrite of the React Frontend (excluding Marketing Pages).
**Pace:** Exactly 2 files per day.
**Total Scope:** 300+ React Files.
**Estimated Duration:** 150 Days.

*Below is the exact, unskipped list of every single Shadcn/React component required to rebuild the entire ERP, mapped perfectly to your massive backend schemas.*

---

## Phase 1: Authentication & Global Shell (Days 1–10)
*Day 1:* `StudentLogin.jsx`, `StudentMobileLogin.jsx`
*Day 2:* `FacultyMobileLogin.jsx`, `FacultyActivate.jsx`
*Day 3:* `OrgLogin.jsx`, `OrgMobileLogin.jsx`
*Day 4:* `AdminLogin.jsx`, `ResetPassword.jsx`
*Day 5:* `StudentOnboarding.jsx`, `FacultyOnboarding.jsx`
*Day 6:* `AppLayout.jsx` (Master Shell), `ThemeContextProvider.jsx`
*Day 7:* `DesktopSidebar.jsx`, `MobileNavigationDock.jsx`
*Day 8:* `TopHeaderBar.jsx`, `GlobalSearchCommandPrompt.jsx`
*Day 9:* `NotificationDropdown.jsx`, `NotificationToastProvider.jsx`
*Day 10:* `UserProfileAvatars.jsx`, `LogoutConfirmationDialog.jsx`

## Phase 2: Student Dashboard & LMS Core (Days 11–25)
*Day 11:* `StudentDashboardEntry.jsx`, `UpcomingTasksWidget.jsx`
*Day 12:* `ClassroomGrid.jsx`, `ClassroomCardItem.jsx`
*Day 13:* `ClassroomDetailView.jsx`, `ClassroomTabs.jsx`
*Day 14:* `AssignmentListView.jsx`, `AssignmentFilterPills.jsx`
*Day 15:* `AssignmentDetailContainer.jsx`, `FileUploadDropzone.jsx`
*Day 16:* `AssignmentSubmissionForm.jsx`, `SubmissionStatusBadge.jsx`
*Day 17:* `LibraryVideoGrid.jsx`, `VideoCategorySidebar.jsx`
*Day 18:* `VideoWatchPlayer.jsx`, `VideoTranscriptionPanel.jsx` (CourseVideo.js)
*Day 19:* `WatchProgressTracker.jsx`, `RelatedVideosList.jsx`
*Day 20:* `TimetableWeeklyView.jsx`, `TimetableDailyList.jsx`
*Day 21:* `EventCalendarWidget.jsx`, `EventDetailModal.jsx`
*Day 22:* `GlobalChatShell.jsx`, `ChatRoomSidebar.jsx`
*Day 23:* `ChatMessageList.jsx`, `ChatMessageInputArea.jsx`
*Day 24:* `ForumThreadList.jsx`, `ForumPostCommentThread.jsx`
*Day 25:* `LibraryDocumentViewer.jsx`, `GoogleDriveIntegration.jsx`

## Phase 3: The NTA Live Exam & Proctoring Engine (Days 26–40)
*Day 26:* `ExamCountdownAwaiting.jsx`, `HallTicketVerification.jsx`
*Day 27:* `ExamPlayerMasterLayout.jsx`, `QuestionNavigationGrid.jsx` (ExamRecord.js)
*Day 28:* `MultipleChoiceRenderer.jsx`, `NumericAnswerInput.jsx`
*Day 29:* `WebcamProctoringFeed.jsx`, `AntiCheatBarrierHook.jsx`
*Day 30:* `NetworkDisconnectWarning.jsx`, `ExamAutoSubmitTimer.jsx`
*Day 31:* `LiveProctoringDashboard.jsx`, `InvigilatorSuspiciousAlerts.jsx`
*Day 32:* `ExamResultCertificate.jsx`, `ResultPercentileChart.jsx`
*Day 33:* `DetailedResultBreakdown.jsx`, `SubjectPerformanceRadar.jsx`
*Day 34:* `OnlineExamBuilderShell.jsx`, `QuestionBankSelector.jsx`
*Day 35:* `ExamGradingDashboard.jsx`, `VivaGradingPanel.jsx` (VivaRecord.js)
*Day 36:* `QuizManagerList.jsx`, `ClassgridQuizBuilder.jsx`
*Day 37:* `AiQuizGeneratorModal.jsx`, `GoogleFormsQuizImport.jsx`
*Day 38:* `StudentQuizOverview.jsx`, `QuizLeaderboard.jsx`
*Day 39:* `StudentMarkLedger.jsx`, `ResultAuditHistoryTable.jsx` (ResultAuditLog.js)
*Day 40:* `ExamAnalyticsDashboard.jsx`, `TopperComparisonChart.jsx`

## Phase 4: Teacher Command Center & Grading (Days 41–60)
*Day 41:* `TeacherDashboardHome.jsx`, `QuickActionShortcuts.jsx`
*Day 42:* `ManageClassroomView.jsx`, `RosterStudentTable.jsx`
*Day 43:* `TeacherJoinRequestsList.jsx`, `ApproveRejectButtons.jsx`
*Day 44:* `AssignmentCreatorForm.jsx`, `RubricBuilderTable.jsx`
*Day 45:* `AttendanceMarkingGrid.jsx`, `AttendanceStatusToggles.jsx` (AttendanceSession.js)
*Day 46:* `LiveClassLauncher.jsx`, `AgoraStreamHostControls.jsx`
*Day 47:* `VideoUploaderStudio.jsx`, `UploadProgressIndicator.jsx` (Native S3 Upload)
*Day 48:* `TeacherSyllabusPlanner.jsx`, `TopicCompletionCheckbox.jsx`
*Day 49:* `AcademicPlanningDashboard.jsx`, `LessonPlanTimeline.jsx`
*Day 50:* `InternalTestCreator.jsx`, `TestAnalyticsBreakdown.jsx`
*Day 51:* `StudentBehaviorLog.jsx`, `DisciplinaryActionModal.jsx`
*Day 52:* `VirtualIdCardGenerator.jsx`, `StudentIdCardPreview.jsx`
*Day 53:* `FeedbackResponseViewer.jsx`, `SurveyResultsChart.jsx` (FeedbackResponse.js)
*Day 54:* `TeacherNoticeBoard.jsx`, `PinnedAnnouncementCard.jsx`
*Day 55:* `LeaveRequestForm.jsx`, `SubstituteTeacherSelector.jsx` (LeaveRequest.js)
*Day 56:* `GradebookMasterTable.jsx`, `InlineGradeEditorCell.jsx`
*Day 57:* `ExportGradesCSVButton.jsx`, `BulkUploadMarksPanel.jsx`
*Day 58:* `FacultyAnalyticsOverview.jsx`, `StudentAtRiskFlag.jsx`
*Day 59:* `ClassgridAiTutorPanel.jsx`, `AiPromptInput.jsx`
*Day 60:* `NotesMarketplaceUpload.jsx`, `TeacherRevenueGraph.jsx`

## Phase 5: Multi-Tier Admission Engine (Days 61–80)
*Day 61:* `AdmissionPortalPublicShell.jsx`, `AdmissionStreamSelector.jsx`
*Day 62:* `EngineeringApplicationForm.jsx`, `AcademicHistorySection.jsx`
*Day 63:* `JuniorCollegeApplication.jsx`, `CoachingAdmissionForm.jsx`
*Day 64:* `SchoolApplicationStepper.jsx`, `ParentContactInfoForm.jsx`
*Day 65:* `DocumentUploadDropzone.jsx`, `ImageCropperModal.jsx` (S3 specific)
*Day 66:* `AdmissionFeePaymentGateway.jsx`, `ApplicationSuccessScreen.jsx`
*Day 67:* `LiveWaitlistTracker.jsx`, `MeritScoreCardPreview.jsx`
*Day 68:* `OrgAdminAdmissionsDashboard.jsx`, `ApplicantDataTable.jsx` (AdmissionApplication.js)
*Day 69:* `ApplicantReviewSidebar.jsx`, `VerifyDocumentButton.jsx`
*Day 70:* `CETAllotmentEngineTrigger.jsx`, `AllotmentRoundConfig.jsx` (CETAllotment.js)
*Day 71:* `AllotmentResultsTable.jsx`, `SeatMatrixVisualizer.jsx`
*Day 72:* `SendAdmissionOfferButton.jsx`, `EmailTemplatePreview.jsx`
*Day 73:* `ApplicantRejectionDialog.jsx`, `RefundProcessor.jsx`
*Day 74:* `SeatConfigDashboard.jsx`, `CategoryQuotaSliders.jsx` (SeatConfig.js)
*Day 75:* `AdmissionOtpVerification.jsx`, `ResendOtpButton.jsx` (AdmissionOTP.js)
*Day 76:* `AdmissionEmailJobTracker.jsx`, `EmailResendFailedButton.jsx`
*Day 77:* `AdmissionSettingsGlobal.jsx`, `AdmissionDeadlineCalendar.jsx`
*Day 78:* `ImportMahaDBTBatch.jsx`, `MahaDBTMapperPanel.jsx` (ImportBatch.js)
*Day 79:* `AutoAssignRollNumber.jsx`, `GeneratePRNDialog.jsx`
*Day 80:* `AdmissionAnalyticsFunnel.jsx`, `ConversionRateChart.jsx`

## Phase 6: Core ERP Financials & Ledger (Days 81–100)
*Day 81:* `FeeStructureBuilderHome.jsx`, `FeeCategoryManagerTable.jsx` (FeeCategory.js)
*Day 82:* `NewFeeComponentForm.jsx`, `GstTaxSlabSelector.jsx` (FeeComponent.js)
*Day 83:* `InstallmentPlanCreator.jsx`, `AssignFeeToBatchModal.jsx`
*Day 84:* `StudentFeeLedgerUI.jsx`, `LedgerDebtRow.jsx` (StudentFeeLedger.js)
*Day 85:* `FeeTransactionHistory.jsx`, `PaymentStatusBadge.jsx` (FeeTransaction.js)
*Day 86:* `RazorpayCheckoutWrapper.jsx`, `VerifyPaymentHashHooks.jsx`
*Day 87:* `InvoiceGeneratorView.jsx`, `DownloadPdfReceiptButton.jsx`
*Day 88:* `OfflinePaymentEntryForm.jsx`, `CashReceiptAcknowledgment.jsx`
*Day 89:* `RefundRequestManager.jsx`, `ApproveRefundDisbursement.jsx`
*Day 90:* `DiscountScholarshipForm.jsx`, `ApplyCouponModal.jsx`
*Day 91:* `LateFeePenaltyConfig.jsx`, `AutoPenaltyCronLog.jsx`
*Day 92:* `HostelFeeManagement.jsx`, `HostelRoomAllocator.jsx`
*Day 93:* `TransportFeeManagement.jsx`, `BusRouteSelector.jsx`
*Day 94:* `GlobalCollegeRevenueChart.jsx`, `DailyCollectionReport.jsx`
*Day 95:* `DefaulterListTable.jsx`, `SendDefaulterSmsButton.jsx`
*Day 96:* `ExportLedgerExcel.jsx`, `TallyIntegrationPanel.jsx`
*Day 97:* `StudentWalletBalance.jsx`, `AddWalletFundsModal.jsx`
*Day 98:* `FacultyPayrollDashboard.jsx`, `GenerateSalarySlipButton.jsx` (FacultyPayroll.js)
*Day 99:* `BiometricRosterSync.jsx`, `DeductUnpaidLeave.jsx`
*Day 100:* `ExpenseTrackerTable.jsx`, `VendorPaymentEntry.jsx`

## Phase 7: Canteen, Auxiliary & HR (Days 101–120)
*Day 101:* `CanteenKitchenDisplay.jsx`, `LiveOrderTicket.jsx` (CanteenOrder.js)
*Day 102:* `PointOfSaleTerminal.jsx`, `PosItemGrid.jsx`
*Day 103:* `PosShoppingCart.jsx`, `CheckoutCashoutDialog.jsx`
*Day 104:* `OrgAdminCanteenMenu.jsx`, `AddCanteenItemForm.jsx` (CanteenItem.js)
*Day 105:* `StudentCanteenApp.jsx`, `MobileCanteenMenu.jsx`
*Day 106:* `StudentOrderHistory.jsx`, `QrCodeOrderPickup.jsx`
*Day 107:* `CanteenRevenueAnalytics.jsx`, `InventoryLowWarning.jsx`
*Day 108:* `LibraryAssetManager.jsx`, `IssueBookModal.jsx`
*Day 109:* `ReturnBookProcessor.jsx`, `LateFeeLibraryCalculator.jsx`
*Day 110:* `HostelWardenDashboard.jsx`, `GatepassApprovalQueue.jsx`
*Day 111:* `StudentGatepassApp.jsx`, `OutpassQrGenerator.jsx`
*Day 112:* `FacilityBookingCalendar.jsx`, `TennisCourtReserver.jsx`
*Day 113:* `CertificateGeneratorUi.jsx`, `BonafideTemplateEditor.jsx`
*Day 114:* `PrintCertificateButton.jsx`, `BulkCertificatePrint.jsx`
*Day 115:* `AttendanceAppealReview.jsx`, `ApproveAppealButton.jsx` (AttendanceAppeal.js)
*Day 116:* `LeaveApprovalQueueAdmin.jsx`, `RejectLeaveDialog.jsx`
*Day 117:* `AlumniNetworkDashboard.jsx`, `AlumniDirectoryTable.jsx`
*Day 118:* `JobPlacementBoard.jsx`, `PostJobOpportunity.jsx`
*Day 119:* `PlatformFeedbackSubmit.jsx`, `BugReportScreenshot.jsx`
*Day 120:* `WhatsNewChangelog.jsx`, `UpdateVersionBanner.jsx`

## Phase 8: Org Admin Deep Settings (Days 121–140)
*Day 121:* `OrgAdminSettingsShell.jsx`, `SettingsSidebarNav.jsx`
*Day 122:* `OrgDetailsForm.jsx`, `UploadCollegeLogoDropzone.jsx` (Organization.js)
*Day 123:* `BrandingColorPicker.jsx`, `ThemePreviewCard.jsx`
*Day 124:* `AcademicStructureBuilder.jsx`, `AddSemesterDialog.jsx` (AcademicHierarchy.js)
*Day 125:* `SubjectManagerTable.jsx`, `AssignSyllabusOutline.jsx` (OrgSubject.js)
*Day 126:* `IdentifiersConfig.jsx`, `RollNumberFormatInput.jsx`
*Day 127:* `BatchBranchManager.jsx`, `AddNewDivisionModal.jsx`
*Day 128:* `RolePermissionMatrix.jsx`, `CheckboxPermissionRow.jsx`
*Day 129:* `SecuritySettings.jsx`, `RequireTwoFactorToggle.jsx`
*Day 130:* `SsoSamlConfig.jsx`, `AzureAdIntegration.jsx`
*Day 131:* `EmailRestrictionsPanel.jsx`, `DomainWhitelistInput.jsx`
*Day 132:* `WebhookConfigTable.jsx`, `TestWebhookEndpoint.jsx`
*Day 133:* `WebhookEventLog.jsx`, `RetryFailedWebhook.jsx`
*Day 134:* `NotificationRoutingTable.jsx`, `SmsProviderSelector.jsx`
*Day 135:* `SubscriptionBillingPanel.jsx`, `UpgradePlanCard.jsx` (OrgSubscription.js)
*Day 136:* `DataExportManager.jsx`, `PrivacyGdprAnonymize.jsx`
*Day 137:* `DeleteOrganizationDanger.jsx`, `ConfirmDeletionTypeKeyword.jsx`
*Day 138:* `AdminAuditLogViewer.jsx`, `AuditLogFilterBar.jsx` (AdminAuditLog.js)
*Day 139:* `OrganizationAnnouncementBuilder.jsx`, `RichTextEmailEditor.jsx` (OrganizationAnnouncement.js)
*Day 140:* `HolidayCalendarBuilder.jsx`, `MarkPublicHoliday.jsx`

## Phase 9: SuperAdmin Network Command (Days 141–150)
*Day 141:* `SuperAdminDashboard.jsx`, `GlobalNetworkStatsCard.jsx`
*Day 142:* `SuperAdminOrgList.jsx`, `SuspendCollegeButton.jsx`
*Day 143:* `SuperAdminUsersTable.jsx`, `ForcePasswordReset.jsx`
*Day 144:* `ImpersonationLogViewer.jsx`, `LoginAsAdminShield.jsx` (ImpersonationLog.js)
*Day 145:* `DeviceSecurityManager.jsx`, `RevokeDeviceAccess.jsx` (DeviceVerification.js)
*Day 146:* `SuperAdminApiUsage.jsx`, `TenantCostBreakdown.jsx` (ApiMetricBucket.js)
*Day 147:* `SuperAdminSalesCRM.jsx`, `B2BLeadPipeline.jsx` (Lead.js)
*Day 148:* `LeadDetailDrawer.jsx`, `SalesNoteAction.jsx`
*Day 149:* `SystemSettingsOverrides.jsx`, `FeatureFlagToggles.jsx` (SystemSettings.js)
*Day 150:* `MasterEmailJobQueue.jsx`, `SystemHealthChart.jsx` (EmailJob.js)

---

## ⚡ FINAL METRICS & RULES:
**Total Files Required:** 300 exactly. 
**Pace:** 2 Files per day -> 150 Days.
**Rule:** You are **NOT** allowed to write random CSS files. By Day 150, you will have deleted thousands of lines of legacy inline CSS. Your final project will consist purely of optimized, composable Shadcn primitives wired directly to your backend.
