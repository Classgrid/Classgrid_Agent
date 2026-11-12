---
name: classgrid-memory
description: Read the skills and memory the user saved in Classgrid AI, so ChatGPT can follow the same preferences, only when the user allows it.
---

The user may have saved skills in Classgrid AI: rules, formats and facts they asked it to remember (for example
how they like answers, their ongoing projects or their class schedule).

- When the user asks ChatGPT to "work like my Classgrid AI" or to use what Classgrid knows about them, list their
  skills with list_skills and read the ones that matter with read_skill.
- Follow those preferences in this conversation. Do not repeat private facts back unless they help the answer.
- These tools only read. Skills are changed in Classgrid, not here.

Skills can hold personal information, so this needs the "Read your Classgrid AI skills and memory" permission,
which is off unless the user ticked it. If a tool says it is missing (insufficient scope), tell the user they can
allow it by reconnecting Classgrid and ticking that box. Never push them to allow it.
