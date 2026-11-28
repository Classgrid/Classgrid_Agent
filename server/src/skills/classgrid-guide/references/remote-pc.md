# Remote PC (follow and answer a computer chat from your phone)

Remote PC lets you follow a chat that runs on your computer, and answer it, from the Classgrid phone app. The work
(files, commands, the browser, the screen) keeps running on the computer; the phone sees everything live and sends
messages into the same chat.

It works in chats of the **Classgrid desktop app (Windows)**, **Classgrid Code** and the **Classgrid extension**
(VS Code, Cursor, Windsurf, VSCodium). Not in website chats.

There is nothing to pair: the phone and the computer are signed in to the same Classgrid account.

--------------------------------------------------------------------------------

## 1. Turn it on and off

-   **On:** in the chat on the computer, send `/remote`. The chat answers that Remote PC is on.
-   **Off:** send `/remote off` in that chat on the computer, or on the phone open the chat → **⋮ → Turn off Remote
    PC**, or **Settings → Remote PC → Turn off** next to the chat. The chat stays on the computer.
-   Each chat is turned on by itself. A Remote PC chat is not shown in the phone's normal chat list; it is under
    **Remote PC**.

## 2. On the phone

-   Open the menu (top left) → **Remote PC**: the computer chats turned on with `/remote`, each with its computer,
    a dot and "Working" while it answers.
-   Open one: the chat as it is on the computer, live (thinking, steps, file edits with their code, commands with
    their output, helpers, pictures, the answer).
-   The box is the normal chat box: **+** for photos and files, the **mic**, the **model picker** (shared with the
    computer: a model picked on the phone becomes the chat's model there too), the **permission mode** (Request
    Review, Default, Auto, Turbo), the **"/"** commands of Studio and Project chats, **Stop**.
-   When the computer needs your OK for a step, a **permission card** opens above the box (allow this time, always
    in this chat, always, or No with what to do instead). A phone notification "Your computer needs your OK" comes
    when the app is not open.
-   A message sent while the AI is answering waits above the box (**Send now**, **Remove**), as in the normal chat.
-   The **⋮** menu: Files in chat, Your questions, Rename, Pin, Archive, Copy, then **Details**
    (computer, connected since, total connected time, project folder, mode), **Changes** (every file the chat
    changed), **Review** (each answer's changes with Accept / Reject / Undo), **Files** (the project's files, read
    from the computer when opened, read only), **Terminal** (the chat's commands and their output),
    **Disconnect this computer**, Delete and **Turn off Remote PC**. No Share.
-   The computer icon at the top shows a dot: **green** = the Classgrid app is open, **yellow** = its window is
    closed and it runs on in the tray (it still works), **red** = not connected (the app is not running, the computer
    is off or asleep, or it was disconnected from the phone).

## 3. On the computer

-   The **Classgrid app must be running**. Closing its window (X) keeps it running in the tray by the clock, and
    Remote PC still works. Quit it from the tray icon (**Quit Classgrid**) to stop.
-   **Settings → General → Remote PC** (desktop app and Classgrid Code): **Control this computer from your phone**
    (off = the phone's messages are refused), the phone's starting permission mode, **keep running in the tray when
    the window is closed**, **keep the computer awake while the AI works**, and **Start Classgrid with Windows**
    (starts hidden in the tray, so Remote PC is ready after the computer starts).
-   A closed laptop lid follows Windows' own setting; the app does not change it.

## 4. Good to know

-   Files opened on the phone are an exact copy of the file's text sent from the computer at that moment (up to
    512 KB; pictures up to 600 KB). Nothing is kept on the server.
-   Review and Undo from the phone need the desktop app 1.0.31 or newer.
-   The phone app is on Android.
