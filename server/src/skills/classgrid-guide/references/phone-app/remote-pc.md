# Remote PC (phone app)

Remote PC lets you follow a chat that runs on your computer, and answer it, from the Classgrid phone app. The work
(files, commands, the browser) keeps running on the computer; the phone sees it live and sends your messages into
the same chat.

## What must be set up on the computer
1. Use the Classgrid desktop app (Windows), Classgrid Code or the Classgrid extension (VS Code, Cursor, Windsurf,
   VSCodium), signed in to the same Classgrid account as the phone. There is nothing to pair.
2. In the chat you want on your phone, send **/remote** on the computer. That chat now shows under Remote PC.
3. Keep the Classgrid app running on the computer. Closing its window keeps it running in the tray, and Remote PC
   still works.
4. On the computer, **Settings > General > Remote PC** has **Control this computer from your phone** (must be on)
   and the permission mode the phone starts with. These are set on the computer only.

## How to open Remote PC
1. Open the side menu (tap ☰ at the top left).
2. Tap **Remote PC**.

Other ways: once you have a Remote PC chat, a computer icon with a coloured dot shows at the top right of a normal
chat. Tap it to see your computers, then tap **Remote PC chats**. A "needs your OK" notification also opens the chat
straight away.

## The list of chats
- Each row is one chat turned on with /remote: its title, then the computer's name and **Working** (the AI is
  answering), **Online**, **App closed, still working** or **Offline**.
- The dot in front: **green** = the Classgrid app is open on the computer; **yellow** = its window is closed and it
  runs in the tray (it still works); **red** = not connected (the app is not running, the computer is off or asleep,
  or it was disconnected from the phone).
- With no chats: "No Remote PC chats yet". Send /remote in a chat on the computer first.
- Pull down to refresh. The list also updates by itself when a chat is turned on or off or starts answering.

## How to follow and answer a chat
1. Open Remote PC and tap the chat.
2. The chat shows as it is on the computer, live: thinking, steps, file edits with their code, commands with their
   output, and the answer.
3. Type in the message box and tap send. The message goes to the computer and the answer appears as it is written.
4. To stop an answer, tap the stop button where the send arrow was. It stops wherever the answer was started.

The message box works like the normal one: **+** for photos, files and @ items, the mic, the model button (the
model you pick becomes that chat's model on the computer too) and, in Studio and Project chats, the **/** commands.
A message sent while the AI is answering waits above the box with **Send now** and a cross to remove it.

## How to change the permission mode
1. In the Remote PC chat, tap the shield button in the message box (it shows the mode's name).
2. Pick **Request Review** (every command asks you first), **Default** (asks before sensitive actions), **Auto**
   (asks only before destructive actions) or **Turbo** (runs everything without asking).

## How to answer a permission card
When the computer needs your OK for a command, a push or a browser step, a card opens above the message box with
what it wants to run. Tap one:
- **Yes, allow this time**
- **Yes, and always allow <this> in this chat**
- **Yes, and always allow <this>**
- **No**, or type what to do instead in **No (tell the agent what to do instead)** and tap the send arrow.
The X at the top skips it. Some steps that change files offer only **Yes, allow this time** and **No**. Whichever
answer comes first, from the phone or the computer, counts.

## Good to know
- Turn on the "needs your OK" notification in **Settings > Remote PC** (switch **Needs your OK**) or **Settings >
  Notifications > Remote PC**.
- If the computer is not connected, the files and apps on it are not available; messages you send can be refused.
  Open Classgrid on the computer to continue.
- Inside the chat, the **⋮** menu has Review, Changes, Files, Terminal, Details and more. See "Remote PC tools
  (phone app)".

## Not on the phone
- Turning Remote PC on for a chat: send **/remote** in that chat on the computer.
- Allowing the computer to be controlled, and the phone's starting permission mode: on the computer, **Settings >
  General > Remote PC**.
