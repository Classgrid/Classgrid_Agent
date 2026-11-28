# Remote PC tools (phone app)

Inside a Remote PC chat, the **⋮** menu opens the chat's tools: what changed, the project's files, the commands that
ran, and the computer's details. This page also covers the Remote PC settings on the phone.

## The ⋮ menu of a Remote PC chat
Open the chat (side menu > **Remote PC** > the chat), then tap **⋮** at the top right. It has:
- **Files in chat**, **Your questions** (when the chat has questions), **Rename**, **Pin** / **Unpin**, **Archive**,
  **Copy** (Copy link, Copy chat, Copy chat ID).
- **Details**, **Changes**, **Review**, **Files**, **Terminal**.
- **Disconnect this computer** (or **Connect this computer** after a disconnect).
- **Delete** and **Turn off Remote PC**. There is no Share.

## How to see Details
1. Tap **⋮** > **Details**.
2. It shows the computer with its dot and state (**Connected**, **App closed, still working**, **Not connected** or
   **Disconnected**), **Connected since**, **Total connected time**, the project folder, **Permission mode** and when
   **Remote PC turned on**.

## How to see Changes
1. Tap **⋮** > **Changes**.
2. Every file the AI created or changed on the computer in this chat, with lines added and removed. It updates live
   while the AI writes.
3. Tap a file to see each change with the code it wrote.

## How to Review (accept, reject or undo)
1. Tap **⋮** > **Review**, or tap **Review** on the "files changed" box under an answer.
2. The top shows **Newest answer**; tap it to pick another answer that changed files.
3. Tap a file to open its diff. The **Files changed** list is above the diffs (the list button hides or shows it).
4. Use the buttons at the top: the check mark = **Accept all** (keeps the changes), the X = **Reject all**, the
   curved arrow = **Undo**. For one file, tap **Reject file** on that file.
5. Reject and Undo ask first. Reject puts the files back as they were before that answer. **Undo this answer** puts the
   whole project back as it was before that answer, and changes made after it are undone too. Neither can be undone.
- The ⋮ in Review has **View split diff**, **Hide whitespace changes**, **Collapse all** / **Expand all** and
  **Collapse unchanged lines**. The magnifier opens **Find** (with **Match case**, **Match whole word**, **Use regular
  expression**).
- "Update the Classgrid app on your computer to review its changes from your phone." means the computer's app is too
  old for Review.

## How to look at Files
1. Tap **⋮** > **Files**.
2. The chat's project files as a folder tree. Use **Filter files** to search. Tap a file to open it (read only).
3. A blue dot marks a file just changed; "Writing" shows next to a file while the AI writes one.
4. The file's ⋮ (**More file actions**) has **Copy Content**, **Download File**, **Copy Path** and, for a GitHub
   project, **Show in GitHub**.
5. To comment or quote code: tap a line number (tap another to select a range), then tap **Comment** (type in **Leave
   a comment**, then **Add Comment**) or **Quote**. They wait above the chat's message box and go with your next
   message.
- "No project picked" means the chat on the computer has no project; pick one above the chat box on the computer.
- Very big files show only the first part ("Only the first 512 KB is shown.").

## How to see the Terminal
1. Tap **⋮** > **Terminal**.
2. **Agent terminal** lists the commands the AI ran in this chat and what they printed, live. **Running** shows while
   one runs. **Clear** clears the list on the phone. You cannot type commands here.

## How to disconnect or turn off
- **Disconnect this computer**: your phone stops controlling that computer. Messages from the phone are refused and an
  answer started from the phone stops. The chats stay on the computer. Tap **Connect this computer** to undo.
- **Turn off Remote PC**: this chat leaves Remote PC on the phone. It stays on the computer; send /remote there to
  turn it on again.

## Remote PC settings on the phone
1. Open the side menu (tap ☰ at the top left), tap the gear at the bottom, then tap **Remote PC**.
   (Or tap the computer icon at the top of a chat, then **Manage Remote PC**.)
2. **Needs your OK**: a notification when your computer asks before running a step.
3. **Your computers**: each computer with its dot, state and number of chats.
4. **Remote PC chats**: tap **Turn off** next to a chat, then **Turn off** to confirm.

## Not on the phone
- **Control this computer from your phone** and the phone's starting permission mode: on the computer, **Settings >
  General > Remote PC**.
