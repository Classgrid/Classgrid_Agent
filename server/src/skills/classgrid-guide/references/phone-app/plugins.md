# Plugins (phone app)

Plugins connect your apps (Gmail, Google Calendar, Notion, GitHub and more) so Classgrid AI can search, read and
take actions in them for you. Use this page to open Plugins, connect or disconnect an app, and try it in a chat.

## How to open Plugins
From the message box:
1. In any chat, tap **+** at the bottom left of the message box. The **Add to chat** sheet opens.
2. Under **AI Hub**, tap **Plugins**.

From Settings:
1. Open the side menu (tap ☰ at the top left).
2. Tap the gear at the bottom, next to your name.
3. Tap **Plugins** (it shows how many are connected, for example "3 connected").

If a project screen says **Connect GitHub** ("Projects need GitHub"), tap **Open Connectors**: it opens the same
Plugins screen.

## What the Plugins screen shows
- A search box (**Search plugins**) and three filters: **All**, **Connected**, **Not connected**.
- **Connected**: the apps you have connected, each marked **Connected**.
- **Available**: the apps you can connect. Built-in plugins: Notion, Gmail, Google Calendar, Google Drive, Google
  Classroom, Google Meet, Google Forms, Microsoft Outlook, Microsoft Teams, Zoom, Vercel, Slack, GitHub, YouTube,
  Supabase and Sanity CMS. Below them, more apps that have their own official connection (this part of the list
  comes from Classgrid and can change).
- Pull the list down to refresh it.

## How to open a plugin's page
1. Open Plugins (see above).
2. Tap the app's card. Its page opens with its logo, a status (**Connected** or **Not connected**), the main
   button, **What it can do**, its **Tools** (tap **View tools** to see each one, marked **Read**, **Write** or
   **Can delete**) and **Information** (developer, website, how it logs in).

## How to connect a plugin
1. Open Plugins and tap the app.
2. Tap **Connect**. The button shows **Connecting**.
3. Your phone's browser opens the app's own sign-in page. Sign in and allow access.
4. Go back to the Classgrid app. The page turns **Connected** by itself and says "<app> connected successfully!".

Sanity CMS works differently: **Connect** opens **Connect Sanity CMS**. Fill in **Project ID** and **API Token**,
then tap **Verify & Connect**.

Some apps in the lower part of **Available** show a **Set up** box first (for example your own address for that
app, or an API key). Fill it in, then tap **Connect**.

## How to try a plugin in chat
1. Open a connected plugin's page.
2. Tap **Try in chat**, or tap one of the example requests under **Try in chat**.
3. A new chat opens and the request is sent at once.

## How to disconnect a plugin
1. Open Plugins and tap the connected app.
2. Tap the **⋯** button next to **Try in chat**.
3. Tap **Disconnect**, then **Disconnect** again to confirm.

## Connect cards in a chat
When the AI adds an app for you during a chat, a card with the app's logo shows in its answer:
- **Log in** (or **Try again** for an app with no login): tap it, sign in in the browser, come back. The card turns
  **Connected** and the AI carries on with your task by itself.
- **Removed**: that connection was removed since; ask again or connect it from Plugins.

## Good to know
- "Connected" means Classgrid holds a working login for that app and the AI can use it in your chats.
- Disconnecting removes your login for that app from Classgrid. Things already done in the app stay there. You can
  connect it again any time.
- If you come back to the app without finishing the sign-in, the button stops waiting after a few seconds. Tap
  **Connect** again.
- **Add connector** (at the top of Plugins) adds any other app that has an MCP server: name, **Server URL**, how it
  logs in (**OAuth**, **API key** or **No login**), then turn on **I understand and want to continue** and tap
  **Create and log in** (or **Create**). Only add servers you trust.
- An added connector's **⋯** menu also has **Refresh tools**, **Turn off** / **Turn on** and **Log out**.
