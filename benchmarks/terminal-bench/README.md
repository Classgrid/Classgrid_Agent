# Classgrid on Terminal-Bench

Runs Classgrid's own agent harness (the `/api/ai/ask` loop) on Terminal-Bench through [Harbor](https://docs.harborframework.com/).
`classgrid_agent.py` gives the AI one tool, `terminal`, and runs each call inside the task's container.

## Needs

- Docker running on this computer (each task runs in its own container)
- Python 3.12+ and `uv`
- A Classgrid login token for the account that pays for the AI tokens

## Setup (once)

```bash
uv tool install harbor
pip install httpx
```

Get the token: open chat.classgrid.in, press F12 → Application → Cookies → `token`, copy its value.

```bash
export CLASSGRID_TOKEN="paste-the-token"
```

On Windows PowerShell: `$env:CLASSGRID_TOKEN = "paste-the-token"`

## Small trial (5 tasks)

Run from this folder:

```bash
harbor run -d terminal-bench/terminal-bench@4.0.0 -l 5 -n 1 \
  -a classgrid_agent:ClassgridAgent \
  -m @cf/deepseek-ai/deepseek-v4-pro-0813
```

`-l 5` runs only 5 tasks, `-n 1` runs one at a time. If your Harbor version says `-a` can't find the agent, use
`--agent-import-path classgrid_agent:ClassgridAgent` instead.

Each task's commands and the AI's answer are saved in the job's logs as `classgrid_trajectory.jsonl`.

## Notes

- Every task uses real AI tokens from the account above.
- One answer can run at most 100 tool steps (the harness's own limit).
- The test chats are hidden (incognito) and deleted when each task ends.
