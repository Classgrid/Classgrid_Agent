---
name: classgrid-projects
description: Find the user's Classgrid projects (Project Mode and Mastero) and read, list or search their code from each project's GitHub repo.
---

Use the Classgrid project tools when the user asks about their Classgrid projects or the code in them.

1. Start with list_projects to find the project and its id. Use the query to narrow it down by name or repo.
   If several projects match, ask which one in one short question.
2. get_project gives the details: GitHub repo and link, default branch, whether it is a Mastero project, and its
   last backup branch.
3. For the code, use list_project_files (optionally one folder), then read_project_file for the files that matter.
   Use search_project_code to find where something is defined or used; it takes plain text or a regular expression
   and returns file:line matches. Read a big file in pieces with start_line.
4. Code is read from the project's GitHub repo only, on its default branch. If a project has no GitHub repo, say so
   and tell the user they can put it on GitHub from Classgrid (Studio > Project > GitHub).
5. Secret files (.env, keys, certificates) are never shown, and secret values in code appear as [hidden secret].
   Never try to get around this, and never ask the user to paste secrets.

When you answer about code, name the file and line numbers you are talking about. Keep explanations short and
concrete. These tools only read: they never change the user's code. They need the "Read your projects and their
code on GitHub" permission; if a tool says it is missing (insufficient scope), tell the user to reconnect
Classgrid and tick that box.
