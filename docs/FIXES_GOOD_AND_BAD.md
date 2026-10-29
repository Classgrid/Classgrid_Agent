# Fixes: good vs bad (23 Oct 6 PM → 24 Oct 11:30 AM)

This list was made on 24 Oct by 3 agents. They read every commit in git and changed nothing.

**Live server now:** the code from 23 Oct **12:11 PM** (`9aed6f43`), plus one change: `MAX_CALLS_PER_DAY = 50`. Calls last 5 minutes.

**Rule from now on:** rebuild only the GOOD items, by hand, one small fix at a time. The owner tests each one before the next. Never add a BAD item back.

---
E
## 1. Every commit, one by one

| # | Time | Commit | What it did | Verdict |
|---|---|---|---|---|
| 1 | 23 Oct 06:06 PM | Limit raised to 50 calls a day | Daily call limit 5 → 50 | ✅ GOOD (already live) |
| 2 | 06:14 PM | Incoming WhatsApp messages kept + `read_whatsapp_messages` | The AI can read the user's WhatsApp messages and files | ✅ GOOD |
| 3 | 06:34 PM | Calls always get the server's public address | More reliable call connection, plus a log of why a call failed | ✅ GOOD |
| 4 | 06:40 PM | `wait_for_whatsapp_reply` tool | The AI can ask on WhatsApp and wait for the answer | 🟡 MIXED: good tool, but a 15-minute wait looks stuck (rebuild with about 5 minutes) |
| 5 | 06:47 PM | Calls up to 15 minutes | Call length 5 → 15 minutes | ✅ GOOD (optional, the owner chose 5 minutes) |
| 6 | 07:09 PM | Call tasks survive restarts | A deploy doesn't kill a running task | ✅ GOOD (only together with the lock and 3-tries limit from #8) |
| 7 | 07:13 PM | Send real files on WhatsApp | PDFs and photos go as real files | ✅ GOOD |
| 8 | 07:26 PM | Fixes from 5 reviews | Many call and message fixes | 🟡 MIXED: see the BAD list for which parts to skip |
| 9 | 07:48 PM | No chat link in the first "working on it" message | Message text only | ✅ GOOD |
| 10 | 09:15 PM | Long Agent tasks: sleep, alarm, 48 hours | The whole "long task" system | ❌ BAD |
| 11 | 09:15 PM | (same name, `dummy/` C++ files only) | Not related to the AI | ⚪ skip |
| 12 | 10:09 PM | "new" | PDF links sent as real files, plus a small-AI "front desk" | 🟡 MIXED: the PDF part is good, the front desk is BAD |
| 13 | 10:39 PM | "mew" | Small-AI checks and closing message | ❌ BAD |
| 14 | 10:39 PM | "mew" | One line in the task system | ❌ BAD (part of #10) |
| 15 | 11:34 PM | "nEW" | Speak in sentence parts (faster first words) | 🟡 MIXED: only together with #16 |
| 16 | 11:45 PM | The AI counts as talking between its sentence parts | Its own echo doesn't count as the caller speaking | ✅ GOOD (with #15) |
| 17 | 24 Oct 12:16 AM | Full WhatsApp messages (no 6000-character cut) | The AI sees long messages in full | ✅ GOOD (only with #2 and #4) |
| 18 | 01:21 AM | One run per task, no repeated results | Doesn't build the same project twice | 🟡 MIXED: the "already sent" check and the "keep it short" rule are BAD |
| 19 | 09:42 AM | Task completed, calls listen fully, call conversation pasted | Many things | 🟡 MIXED, mostly BAD: only the `end_call` "only on goodbye" text is good |
| 20 | 10:01 AM | AI can't hang up, no work during call, one model | Removed the call AI's work tool | ❌ BAD |
| 21 | 10:10 AM | "WhatsApp first": a new message stops the AI | "BLOCKED" tool lock, and it stopped the AI mid-work | ❌ BAD |
| 22 | 10:45 AM | Quick reply first (no tools) | A reply with no tools made things up | ❌ BAD |
| 23 | 11:06 AM | Never send `<thinking>` on WhatsApp | Removes the AI's private thinking text | ✅ GOOD |
| 24 | 11:21 AM | Agent task text back to plain | Only cleaned up after bad commits | ⚪ nothing to add |
| 25 | 11:27 AM | Server back to 12:11 PM | The reset | ⚪ not a fix |

---

## 2. ✅ GOOD: rebuild these by hand, one at a time

1. **#2**: keep incoming WhatsApp messages and files, plus the `read_whatsapp_messages` tool. **Don't** add the "busy" answer that silences the help bot.
2. **#3**: the server's public address for calls, and the "why it failed" log.
3. **#4**: the `wait_for_whatsapp_reply` tool, with a shorter wait (about 5 minutes).
4. **#5**: 15-minute calls. Optional.
5. **#6 + parts of #8**: tasks survive restarts, with a safe lock and at most 3 tries.
6. **#7**: send real files (PDF, photos) with `fileUrl`.
7. **#8, good parts only**:
   - every tool request in a call gets an answer;
   - time limits and retries for voice and Claude;
   - no empty answers;
   - a last answer without tools after 4 rounds;
   - repeated or early call signals handled;
   - noise filter;
   - one job per project;
   - call recap and "call dropped" messages;
   - WhatsApp formatting and splitting long messages;
   - send retries and clear errors;
   - the 24-hour note;
   - safe file download;
   - repeated messages saved once.
8. **#9**: no link in the first "working on it" message.
9. **#12, PDF part only**: our PDF links go as real PDF files.
10. **#15 + #16 together**: faster voice in sentence parts, without the echo problem.
11. **#17**: full WhatsApp messages for the AI.
12. **#18, one part**: after a call, carry on in the same chat the live work started in, with a time limit on the wait.
13. **#19, one part**: `end_call` is used "only when the caller says goodbye".
14. **#23**: remove `<thinking>` before sending on WhatsApp.

---

## 3. ❌ BAD: never add these back

- **The whole long-task system** (#10, #13, #14, and the task parts of #12, #18, #19, #22):
  - `sleep_until` in the always-loaded tools (it gives the AI a "stop working now" button);
  - the AI taking every WhatsApp message and silencing the help bot;
  - the small-AI "front desk" that answers with no tools;
  - the small-AI "done?" judge;
  - `afterRun` replacing the direct result message.
- **From #8**: `markBusy` / `isNumberBusy` and the `{ busy }` answer. They silence the help bot for about 17 minutes.
- **From #18**: the "already sent" check, which could skip the final result, and waiting for live work with no time limit.
- **From #19**:
  - dropping the AI's answer when there's any noise (the AI goes quiet on calls);
  - lower interrupt levels (echo cuts the AI off);
  - wiping WhatsApp memory;
  - the "only this task's messages" filter;
  - pasting the call conversation into the task.
- **From #20**:
  - removing `ask_classgrid` and `end_call` from the call AI;
  - the 14-second silence hang-up;
  - "No work starts during the call";
  - "run without sleep = completed".
- **From #21**: the `BLOCKED … reply first` tool lock, and stopping the AI on every new message.
- **From #22**:
  - the quick reply with **no tools**;
  - the "ALREADY SENT" check in the tool and in the server send;
  - the 45-minute stop.

---

## 4. Why the AI stopped using tools and made things up

1. **#22 (10:45 AM), quick reply with no tools.** The most direct cause: it wrote "I read your rubric, here are 5 problems" with no tools and sent it as fact.
2. **#20 (10:01 AM).** The call AI's work tool (`ask_classgrid`) was removed, so on the call it answered from nothing. Its task text also got "use sleep, otherwise the task counts as completed".
3. **#21 (10:10 AM).** Every real tool (web search, Gmail, Google, Drive, code) returned **BLOCKED** until a WhatsApp reply went out.
4. **#19 (09:42 AM).** The call conversation was pasted into the task, so the AI read the call AI's promises ("I'll check your rubric") as already done.
5. **#18 (01:21 AM).** "Keep it short, say only what you did" pushed it toward fast, short answers instead of real work.
6. **#10 (09:15 PM).** `sleep_until` was always offered, which is an easy way to stop working.
7. **#19.** Messages and files sent before the call were hidden from the AI, and all of them were wiped when a task closed, so it claimed to read files it couldn't see.
8. Tool groups load by words in the message. Wake-up texts often don't mention Gmail or Drive, so those tools weren't preloaded and the AI had to load them itself.

**None of these are in the live code now.**

---

## 5. Why WhatsApp replies broke

**No reply:**
- the AI "took" the message and silenced the help bot, then nobody answered (#10);
- tasks were wrongly marked "done", so later messages were ignored (#18, #20);
- a call task was left "working" forever (#19);
- messages were hidden after a task closed (#19);
- after the AI read a message, a wake-up found "nothing new" and put the task to sleep with no alarm (#10);
- the BLOCKED lock (#21).

**Double or triple sends:**
- the AI sent the PDF itself, then the server sent it again from the final answer (#12);
- the "already sent" check missed it (#18);
- the AI was stopped and restarted on every new message and redid the work (#21);
- the extra quick-reply run (#22).

**Late replies:**
- 5-minute retry alarm (#10);
- small-AI checks waiting up to 45 seconds each (#13);
- waiting for live work with no limit (#18).

**Thinking text sent:** the quick reply with no tools wrote its thinking as plain text (#22). #23 fixes it for server messages.

---

## 6. Two things to check before re-adding #8

- The webhook check now needs `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in `.env`. If it isn't set, Meta's webhook check fails.
- `fromWhatsappServer` refuses requests carrying `x-forwarded-for`. If the ai.classgrid.in server reaches us through nginx, calls get a 403.
