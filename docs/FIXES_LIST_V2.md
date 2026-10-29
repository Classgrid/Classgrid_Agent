# Full fix list v2 (23 Oct 6 PM → 24 Oct 11:30 AM)

Made on 24 Oct by 3 agents. They read every commit and the 4 deleted files, and changed nothing.

**Live server now:** the 23 Oct 12:11 PM code, plus the call limit of 50.

**Rule:** big fixes come first. A big feature is never thrown away. Only the exact part that broke something gets fixed.

---

## 0. Four files were deleted when the code went back to 12 PM. They must come back.

| File | What it is |
|---|---|
| `server/src/models/AgentTask.js` | saves each long task in the database |
| `server/src/services/agent-task.service.js` | **the 48-hour system**: sleep, alarm, wake on WhatsApp, pause when tokens run out, end after 48 h |
| `server/src/services/whatsapp-inbox.service.js` | keeps the user's WhatsApp messages and files for 3 days |
| `server/src/services/whatsapp-updates.service.js` | (24 Oct 11:40 AM) small AI reads WhatsApp messages during a call task and passes them to the big AI |

---

## 1. GOOD: BIG (add these first)

1. **The 48-hour long-task system** (23 Oct 9:15 PM, "Long Agent tasks: sleep, alarm, WhatsApp wake-up, 48h limit").
   - A task is saved in the database.
   - The AI can sleep without using tokens. It wakes at a set time, on the user's WhatsApp reply, or both.
   - An alarm runs every 5 minutes. It:
     - wakes tasks whose time has come;
     - wakes tasks when tokens come back;
     - continues tasks cut by a restart;
     - ends tasks after 48 hours.
   - When tokens run out, the task pauses, tells the user once, and goes on by itself on the reset date.
   - A WhatsApp message wakes the task, with the blue tick and "typing…".
   - After 5 runs in a row with no progress, it waits for the user.
2. **WhatsApp inbox and the `read_whatsapp_messages` tool** (23 Oct 6:14 PM). Messages and files are kept, and the AI can read them.
3. **Call tasks survive restarts** (23 Oct 7:09 PM, plus the lock from 7:26 PM). It continues in the same chat, never runs twice, and stops after 3 tries.
4. **Background tasks get every tool from the start** (24 Oct 11:35 AM, "Step 1"). Gmail, Drive and the rest don't depend on words in the message.
5. **The small AI passes WhatsApp messages to the big AI during a call task** (24 Oct 11:40 AM, "Step 2"). It needs fixes; see 6.C #5.

## 2. GOOD: MEDIUM

6. **Each task sees only its own WhatsApp messages** (24 Oct 9:42 AM). This fixes old messages mixing into new tasks.
7. **Calls listen fully** (9:42 AM). It waits for 1.5 s of pause, takes up to 30 s per turn, and joins speech the caller keeps adding. The changes to how easily the caller can talk over the AI are left out; see 6.B #8.
8. **The AI can't hang up; the call ends on silence** (10:01 AM). The silence limit becomes 60 s, not 14 s.
9. **One run per task** (1:21 AM). Live call work finishes first, and the task then continues in that same chat.
10. **No repeated results.** The `alreadySent` check stays, but it needs the fix in 6.C #6.
11. **The same message is never sent twice**, but only within 15 minutes, not 3 days.
12. **Messages that came during a run are picked up** after the run (10:01 AM).
13. **The task goal keeps its history**, keeping the start and the end (10:39 PM).
14. **A PDF goes as a real PDF file, never as a link** (10:09 PM, the PDF part only).
15. **`send_whatsapp_message` sends real files**: PDF, photos, audio, video (7:13 PM).
16. **WhatsApp text fixes**: formatting, splitting at 4000 characters, one retry, clear errors (7:26 PM).
17. **Calls don't break on errors**: time limits and retries for the voice services and Claude, and a last answer without tools after 4 rounds (7:26 PM).
18. **The server's public address for calls**, plus a log when a call fails (6:34 PM).
19. **`wait_for_whatsapp_reply`**: ask on WhatsApp and wait (6:40 PM).
20. **Voice in sentence parts, plus the echo fix** (11:34 PM and 11:45 PM, only together). It needs the `speakingParts` fix in 6.B #8.

## 3. GOOD: SMALL

- Calls last up to 15 minutes (6:47 PM).
- No chat link in the first "working on it" message (7:48 PM).
- The Agent talks to the caller as "you".
- These small parts from 7:26 PM:
  - noise filter;
  - repeated or early call signals handled;
  - one job per project;
  - a recap after a call, and a "call dropped" message;
  - the 24-hour note;
  - safe files;
  - each message kept once;
  - delivery reports.
- Full WhatsApp messages, with no 6000-character cut (12:16 AM). Only together with item 6.
- `last_answer`, and "closed" instead of "failed" after 48 hours (10:09 PM).
- A step log in the database; `end_call` "only on goodbye" (9:42 AM).
- Logs for every wake-up (10:01 AM).
- The caller's number is kept on the task, and the user is told when the AI waits (10:45 AM).
- `<thinking>` text is never sent (11:06 AM). It needs the stronger strip in 6.B #6.
- Task text stays plain (11:21 AM).

**Owner's choice:** the small checker AI from the plan (continue / sleep more / done). It was turned off at 10:01 AM. Bring it back only if you say so.

---

## 4. BAD: never add these back (only these parts)

1. **"Front desk":** the small AI answered the user with no tools (10:09 PM).
2. **Closing summary written by the small AI**, which made up "what was done" lists (10:39 PM).
3. **"Quick reply first" with no tools** (24 Oct 10:45 AM).
4. **A new WhatsApp message kills the running AI** (`stopRunFor`, 10:10 AM).
5. **The BLOCKED "reply first" tool lock** (10:10 AM).
6. **The call AI lost `ask_classgrid`, and "no work during the call"** (10:01 AM).
7. **The call conversation pasted into the task** (9:42 AM).
8. **Prompt rules that push the AI to stop**: "keep it short", "don't redo", "never send again" (1:21 AM to 10:45 AM).
9. **The "help bot silent" key that is never cleared** (`markBusy`, 7:26 PM). It has to be cleared when the task ends.
10. **The 45-minute run limit.** Raise it to 3 hours.

---

## 5. Changes to the big work (made in the same step as the restore)

1. **When a run ends without `sleep_until`, don't close the task.** Set it to sleeping with "wake on reply". The 48-hour alarm still closes it later. Drop the "✅ Task completed" line.
2. **A message with no open task:** wake the number's latest task from the last 3 days, or create a new task. Never send it to the help bot.
3. **Don't stop a running AI on a new message.** The message is picked up after the run.
4. **`sleep_until` leaves the always-on tools** and moves to the WhatsApp/email group.
5. **WhatsApp tools use the task's phone number** (the caller's), not the account's saved number.
6. **A task stuck as "working"** is set to sleeping when its run dies.

---

## 6. Every problem the agents found

### A. Why the AI stopped using tools
1. The quick reply with no tools put "done" claims in the chat, so the main run trusted them (10:45 AM).
2. A new message killed the run in the middle of a tool (10:10 AM).
3. BLOCKED lock: every tool except WhatsApp returned "BLOCKED" (10:10 AM).
4. The task closed at once, and the next message went to the old help bot, which has no tools and made things up (1:21 AM and 10:01 AM).
5. Front desk: the small AI answered with no tools (10:09 PM).
6. The call AI's look-up tool `ask_classgrid` was removed, so it guessed (10:01 AM).
7. The pasted call conversation: the call AI's promises were read as already done (9:42 AM).
8. Prompt rules: "keep it short, don't redo, never send again" (1:21 to 10:45 AM).
9. `sleep_until` was always offered, so the AI could stop instead of working (9:15 PM).
10. The WhatsApp tools read the wrong phone number (the account's saved one, not the caller's).
11. `read_whatsapp_messages` hid messages sent before the call and said "no messages in 3 days".
12. "ALREADY SENT" blocked real resends for 3 days.
13. A WhatsApp update added at the end of a long tool result was cut off and lost (11:40 AM).
14. Tools loaded only by words in the message. A reply like "yes" got only the basic tools. *This is still in today's code.*
15. The 45-minute limit killed long builds mid-tool.
16. A task stuck as "working" answered nobody for up to 48 hours.

### B. WhatsApp problems
1. A new message killed the work, and the stopped run's work was not saved, so it was done again (double and triple sends).
2. Tasks closed too early, and messages were wiped, so there was no reply.
3. With no open task, the Agent ignored the message, and the help bot stayed quiet for 5 minutes (`markBusy`). After 4 messages the help bot goes silent for 1 hour.
4. A task stuck as "working" swallowed messages.
5. The quick reply added extra messages: quick reply, then the answer, then "Task completed".
6. Thinking text went out: an unclosed `<thinking>` tag was not removed, and the AI's own send tool removed nothing.
7. Old messages mixed in:
   - before the first step, 3 days of messages were shown;
   - cutoffs of "minus 2, 10 or 15 minutes" pulled in older messages;
   - a "stopped" wake sent the last 5 messages again.
8. Calls cut early and didn't listen fully:
   - a 14 s silence hang-up (make it 60 s);
   - easier talk-over, so echo cut the AI off (go back to 1500 / 250);
   - noise threw away the AI's answer (`turnGen`);
   - the voice-service wait counted as "AI talking" (`speakingParts`).
9. The help bot and the Agent both answered: the marketing server waits only 1.5 s for "busy" (make it 5 s). *This is in the marketing repo.*
10. Small things:
    - "tokens ran out" was told only once;
    - the same text was skipped for 48 hours;
    - the owner's number was saved wrong on the task;
    - about 20 pushes restarted the server in the middle of runs.
11. "Open" and "wake" don't match. A task sleeping only until a set time (from a web chat) silenced every WhatsApp message until then. Fix: use the same check in both places.
12. The "already read" marker went by time, not by message:
    - two messages in the same second, so the second one was never read;
    - a file that arrived late was skipped;
    - reading in another chat marked messages as read for every task.

    Fix: also save the IDs of the messages that were read.
13. A failed run didn't look at new messages, so the reply came 5 or more minutes late.
14. The goal grew with every message ("Later the user said…"), so old messages were answered again. Fix: keep the first request, and give the messages separately.
15. More than one open task per number. Fix: when a new task starts, close the older ones (without wiping messages).
16. Blue ticks and "typing…" were sent at once, then nothing came. Fix: show "typing…" only just before a reply.
17. In the 11:40 AM version, messages stayed on grey ticks (never marked as read).
18. `whatsapp-updates` (11:40 AM):
    - the small AI's reply was lost when its answer wasn't clean JSON;
    - only one running task per number;
    - updates that came after the last check were lost.
19. Replies were slow before anything happened, because every file was downloaded before any decision. Fix: download files only when the task wakes.
20. Restarts and the alarm (every 5 minutes, plus 5 minutes before a run counts as stuck) meant up to about 10 minutes of delay.

### C. Bad behaviour and made-up answers
1. "✅ Task completed" was added even when the work was not done.
2. The user's next message was ignored after an answer.
3. The quick reply with no tools claimed "done" or "sent".
4. Killed runs redid steps or thought they were done, and answered old messages again.
5. The small AI dropped "ok" (an approval) and lost messages that weren't JSON. It must always pass the user's own words on.
6. The final result was held back as "already sent" if 50% of its words had been sent before. Use 80%, and compare only with the last message.
7. The "never send twice" list lasted 3 days. Make it 1 hour or less.
8. The start of the task (the real request) was cut off after a few replies. Keep the start and the end.
9. The task was saved with the wrong phone number, so replies didn't wake it.
10. Normal chats saw every task's old messages. Limit them to the last hour.
11. Wiping messages when a task closed could hide a reply that had just come in.
12. Small things:
    - only the last paragraph was checked for "?";
    - sleeping with no message;
    - a wrong comment.

---

## 7. The order I will add things

1. **Bring back the big work:** the 4 files plus the 48-hour system, with all of section 5 fixed in the same step, so it never goes live broken.
2. Add GOOD: BIG items 2–5.
3. Add GOOD: MEDIUM items 6–20, with their fixes.
4. Add GOOD: SMALL.
5. Push only when you say "push".
6. Run the 35 tests with your FA2 message, word for word, no hosting.
