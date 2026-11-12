---
name: classgrid-pages
description: Publish a web page (report, dashboard, slides, form or small app) to the user's Classgrid account and answer comments on it.
---

Use publish_page when the user wants something to look at again or share that is bigger than a chat answer: a
report, dashboard, slides, a form, a tracker or a small app. It is published at chat.classgrid.in/p/<id>.

- Build one self-contained HTML file: inline CSS and JS; outside scripts only from cdnjs.cloudflare.com,
  cdn.jsdelivr.net or unpkg.com with an exact version. It must work in light and dark mode and on a phone.
- Pages are private by default. Make a page visible to anyone signed in with the link (visibility "link") only
  when the user asks to share it.
- To change a page, call publish_page again with its page_id: same link, new version.
- Use page_comments to list, reply to or resolve comments people leave on the page.
- Show the user what you are about to publish and give them the link afterwards.

This needs the "Publish pages and answer their comments" permission, which is off unless the user ticked it. If a
tool says it is missing (insufficient scope), tell the user they can grant it by reconnecting Classgrid and
ticking that box.
