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

# 📱 How to Build the 3 Apps & Pass Google Play Review

This guide explains how to generate your 3 separate APKs (Student, Faculty, Admin) from this single codebase, and the rules we followed to ensure Google Play approves your WebView app.

---

## 🏗️ PART 1: How to Generate the 3 Apps (APKs/AABs)

Because we used **Build Flavors** in your `build.gradle.kts`, you have 3 apps inside 1 project. Here is how you export them from Android Studio:

### For Testing Locally (Debug APK)
1. Open the `android` folder in Android Studio.
2. On the left side of Android Studio, click the **"Build Variants"** tab (usually bottom-left).
3. You will see a dropdown for the `app` module. You can choose:
   - `studentDebug` (Builds the Student App)
   - `facultyDebug` (Builds the Faculty App)
   - `adminDebug`   (Builds the Admin App)
4. Select the one you want, and hit the **Green Play Button** to install it on your phone.

### For Uploading to Google Play Store (Release Bundle)
Google Play requires an `.aab` (Android App Bundle) file, not an `.apk`.
1. In Android Studio, go to top menu: **Build > Generate Signed Bundle / APK...**
2. Select **Android App Bundle** -> click Next.
3. Choose your Keystore (you will create one during this process) -> click Next.
4. **THE IMPORTANT STEP:** It will ask which "Flavors" you want to build. 
   - Check `studentRelease`
   - Check `facultyRelease`
   - Check `adminRelease`
5. Click **Finish**. Android Studio will generate 3 separate `.aab` files. You upload these 3 files to 3 different App Listings on your Google Play Console!

---

## 🛡️ PART 2: Google Play Store Approval Rules (Why we won't get rejected)

Google actively rejects "WebView-only" apps that behave like simple websites. **Here is why your app will BE APPROVED**, because we added these native features:

### 1. The OAuth / Google Login Rule (SOLVED ✅)
*   **Rule:** Google rejects apps that open Google Sign-In inside a WebView because it's a security risk.
*   **Our Solution:** We implemented **Native Google One Tap**. The sign-in happens using the phone's native Android UI (the Instagram-style bottom sheet), and we pass the secure token back to React via the JavaScript Bridge.

### 2. The Back Button Rule (SOLVED ✅)
*   **Rule:** If a user presses the physical back button on their Android phone, the app should navigate to the previous page, NOT close the app entirely.
*   **Our Solution:** We intercepted the native `onBackPressed` in `MainActivity.kt`. If the WebView has a history, it goes back in React Router. If it's at the root `/`, it confirms before closing.

### 3. External Links Rule (SOLVED ✅)
*   **Rule:** If a user clicks a Zoom link, Google Meet link, or Razorpay payment, it should not get trapped inside the WebView.
*   **Our Solution:** In our `shouldOverrideUrlLoading`, we explicitly detect `zoom.us`, `meet.google.com`, and `razorpay.com`. If tapped, the Kotlin code forces opening the phone's default external browser (like Chrome), ensuring payments and meetings never break.

### 4. Native Device Features (SOLVED ✅)
*   **Rule:** An app must feel like an app, utilizing device hardware.
*   **Our Solution:** 
    - Native Push Notifications (Firebase)
    - Native Biometric Login (Fingerprint/FaceID via `androidx.biometric`)
    - Native Haptic Feedback / Vibrations (triggered via JS Bridge)
    - Edge-to-Edge full screen layout (no ugly white status bars)

### ⚠️ Final Checklist Before Submitting to Play Store:
1. Ensure your website (`app.classgrid.in`) has a visible **Privacy Policy** page. Google Play requires a link to it.
2. In the Play Console, when it asks for Data Safety, you MUST declare that you collect Email/Names for Account Management.
3. Make sure to update the App Icons in `android/app/src/main/res/mipmap...` replacing the default Android logos with your highly aesthetic Classgrid logos!
