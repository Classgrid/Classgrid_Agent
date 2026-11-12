---
name: classgrid-docs
description: Read, create and edit the user's Classgrid live docs and answer comments on them.
---

Use the Classgrid live doc tools for documents the user keeps in Classgrid (chat.classgrid.in/docs/...).

- To find a doc, use list_my_docs (optionally with a query), then read_doc with its doc_id. A link like
  chat.classgrid.in/docs/<id> also works as the doc_id.
- To write something the user wants to keep, share or keep working on (a plan, report, notes, a draft), use
  create_doc with clean markdown and give the user the link. Short answers stay in the chat.
- To change a doc, read it first, then use edit_doc with small exact edits (old_text copied from the doc without
  the line numbers). Each edit saves a version the user can go back to.
- For comments, read them with read_doc, make the asked changes, then answer each one with doc_comments (reply)
  and resolve the ones that are done.
- Before replacing a whole doc, confirm with the user.

Reading needs the "Read your live docs" permission; creating, editing and answering comments needs "Create and
edit your live docs", which is off unless the user ticked it. If a tool says a permission is missing (insufficient
scope), tell the user which one and that they can grant it by reconnecting Classgrid and ticking that box.
