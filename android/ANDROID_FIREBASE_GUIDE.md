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

# 🔥 How to get `google-services.json` for Classgrid Android

This guide will help you set up Firebase and get the configuration file required to enable **Push Notifications** and **Google One Tap Native Sign-In**.

---

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **"Add project"**.
3. Name it **"Classgrid"**.
4. (Optional) Enable Google Analytics and click **"Create project"**.

---

### Step 2: Add the Android App to Firebase
1. On the project overview page, click the **Android icon** (white robot) to add an app.
2. **Android package name:** Type exactly `com.classgrid.app`. (This must match the `build.gradle.kts` file).
3. **App nickname:** `Classgrid Android`.
4. **Debug signing certificate SHA-1 (CRITICAL FOR GOOGLE SIGN-IN):**
   - You need this for Google Sign-In to work.
   - In VS Code terminal (or Command Prompt), run:
     ```bash
     cd android
     ./gradlew signingReport
     ```
   - Find the `SHA-1` code under the `debug` variant and paste it into Firebase.
5. Click **"Register app"**.

---

### Step 3: Download and Place the File
1. Click the **"Download google-services.json"** button.
2. Open your file explorer and move the file into this exact folder:
   `c:\Users\nikhi\OneDrive\Documents\Classgrid\classgrid_platform\android\app\`
3. **Important:** Ensure the filename is exactly `google-services.json` (sometimes your browser adds a `(1)` to the name if you download it twice).

---

### Step 4: Add the Google Web Client ID (For Native Sign-In)
1. In the [Google Cloud Console](https://console.cloud.google.com/).
2. Go to **APIs & Services > Credentials**.
3. Look for the **"OAuth 2.0 Client IDs"** section.
4. Find the **"Web client (auto-created by Google Service)"**.
5. Copy the **Client ID** (it ends in `.apps.googleusercontent.com`).
6. Open `android/app/src/main/java/com/classgrid/app/GoogleSignInHelper.kt` in VS Code.
7. Paste your Client ID into the `GOOGLE_WEB_CLIENT_ID` variable on **Line 39**.

---

### Step 5: Build the App
1. Open the `android` folder in **Android Studio**.
2. Wait for the sync to finish.
3. Hit the **Green Run Button** (Play icon) at the top.

**You are done! Your app now has Push Notifications and Native Google Sign-In identity!** 🚀
