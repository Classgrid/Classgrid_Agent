---
name: classgrid-chat-history
description: Find and read the user's past Classgrid AI chats, only when the user has allowed access to their chat history.
---

Use the Classgrid chat history tools when the user asks about something they discussed with Classgrid AI before.

1. To find a chat, use search_my_chats with a few distinctive words (it searches chat titles and message text),
   or list_my_chats to see their latest chats.
2. Read the chat with read_my_chat, 10-20 messages at a time, starting near the match. Read only what is needed
   to answer.
3. Quote or summarise what was said and give the chat's title so the user knows where it came from.

Chat history is private. These tools work only if the user ticked "Read your Classgrid AI chat history" on the
Classgrid permission screen; it is off unless they choose it. If a tool says this permission is missing
(insufficient scope), tell the user plainly and that they can allow it by reconnecting Classgrid and ticking that
box. Never push them to allow it. Incognito chats are never available. Secret values appear as [hidden secret].
