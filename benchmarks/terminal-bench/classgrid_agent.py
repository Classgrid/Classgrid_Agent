"""Classgrid agent for Harbor (Terminal-Bench).

The agent loop is Classgrid's own harness (POST /api/ai/ask, the same one chat.classgrid.in uses). This file only
bridges it to the task: it gives the AI one client tool, `terminal`, and runs each call inside the task's container
with environment.exec(), then sends the output back to /api/ai/client-tool-result.

Environment variables:
    CLASSGRID_TOKEN   the login token of the Classgrid account that pays for the tokens (the "token" cookie)
    CLASSGRID_API     optional, default https://api.classgrid.in

Run (from this folder):
    harbor run -d terminal-bench/terminal-bench@4.0.0 -l 5 -n 1 \
        -a classgrid_agent:ClassgridAgent \
        -m @cf/deepseek-ai/deepseek-v4-pro-0813
"""

import json
import os
from pathlib import Path

import httpx

from harbor.agents.base import BaseAgent
from harbor.environments.base import BaseEnvironment
from harbor.models.agent.context import AgentContext

DEFAULT_MODEL = "@cf/deepseek-ai/deepseek-v4-pro-0813"
MAX_OUTPUT_CHARS = 20000

TERMINAL_TOOL = {
    "name": "terminal",
    "description": (
        "Run one bash command on the task's Linux computer and get its output (stdout, stderr and exit code). "
        "Each call is a new shell: cd, exports and other shell state do not carry over, so chain steps with && "
        "or write a script."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "command": {"type": "string", "description": "The bash command to run."},
            "timeout_sec": {"type": "integer", "description": "Optional: seconds to wait before stopping it (default 600, at most 1800)."},
        },
        "required": ["command"],
    },
}


def _clip(text: str) -> str:
    """Long output keeps its start and end, where errors and results usually are."""
    if len(text) <= MAX_OUTPUT_CHARS:
        return text
    half = MAX_OUTPUT_CHARS // 2
    return text[:half] + f"\n...[{len(text) - MAX_OUTPUT_CHARS} characters cut]...\n" + text[-half:]


class ClassgridAgent(BaseAgent):
    @staticmethod
    def name() -> str:
        return "classgrid-agent"

    def __init__(self, logs_dir: Path, model_name: str | None = None, **kwargs):
        kwargs.setdefault("skip_model_parsing", True)
        super().__init__(logs_dir=logs_dir, model_name=model_name, **kwargs)
        self._model = model_name or DEFAULT_MODEL
        self._api = os.environ.get("CLASSGRID_API", "https://api.classgrid.in").rstrip("/")
        token = os.environ.get("CLASSGRID_TOKEN", "")
        if not token:
            raise RuntimeError("Set CLASSGRID_TOKEN to your Classgrid login token.")
        self._headers = {"Authorization": f"Bearer {token}"}

    def version(self) -> str:
        return "1.0.0"

    async def setup(self, environment: BaseEnvironment) -> None:
        pass

    async def _run_terminal(self, environment: BaseEnvironment, args: dict) -> str:
        command = str(args.get("command") or "").strip()
        if not command:
            return "ERROR: command is empty."
        try:
            timeout = max(1, min(int(args.get("timeout_sec") or 600), 1800))
        except (TypeError, ValueError):
            timeout = 600
        try:
            result = await environment.exec(command=command, timeout_sec=timeout)
        except Exception as e:  # a timeout or a broken container is told to the AI, not raised
            return f"ERROR: the command could not finish: {e}"
        out = (result.stdout or "") + (("\n[stderr]\n" + result.stderr) if result.stderr else "")
        return _clip(f"{out}\n[exit code {result.return_code}]")

    async def run(self, instruction: str, environment: BaseEnvironment, context: AgentContext) -> None:
        question = (
            "You are working on a Terminal-Bench task. The task's Linux computer is reachable only through the "
            "`terminal` tool; your own code sandbox and other tools cannot see it. Do the task completely on that "
            "computer, check that it works, then reply with a short summary of what you did.\n\nTask:\n" + instruction
        )
        body = {"question": question, "selectedModel": self._model, "clientTools": [TERMINAL_TOOL], "isIncognito": True}
        log_path = self.logs_dir / "classgrid_trajectory.jsonl"
        session_id, answer, error, tool_calls = None, "", None, 0

        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, read=None), headers=self._headers) as client:
            with log_path.open("a", encoding="utf-8") as log:
                async with client.stream("POST", f"{self._api}/api/ai/ask", json=body) as resp:
                    if resp.status_code != 200:
                        error = f"HTTP {resp.status_code}: {(await resp.aread()).decode(errors='replace')[:500]}"
                    else:
                        async for line in resp.aiter_lines():
                            if not line.startswith("data:"):
                                continue  # blank lines and ": waiting" keep-alive comments
                            try:
                                event = json.loads(line[5:].strip())
                            except json.JSONDecodeError:
                                continue
                            kind = event.get("type")
                            if kind == "session_info":
                                session_id = event.get("sessionId")
                            elif kind == "client_tool_call":
                                tool_calls += 1
                                args = event.get("args") or {}
                                output = await self._run_terminal(environment, args) if event.get("name") == "terminal" else "ERROR: unknown tool."
                                log.write(json.dumps({"tool": event.get("name"), "args": args, "output": output}) + "\n")
                                log.flush()
                                await client.post(f"{self._api}/api/ai/client-tool-result", json={"id": event.get("id"), "result": output})
                            elif kind == "answer":
                                answer = str(event.get("answer") or "")
                            elif kind == "error":
                                error = str(event.get("error") or "error")
                log.write(json.dumps({"answer": answer, "error": error, "tool_calls": tool_calls}) + "\n")

            # The run's chat is hidden (incognito); delete it so test chats don't pile up in the account
            if session_id:
                try:
                    await client.delete(f"{self._api}/api/ai/sessions/{session_id}")
                except httpx.HTTPError:
                    pass

        context.metadata = {"harness": "classgrid", "model": self._model, "tool_calls": tool_calls, "answer": answer[:2000], "error": error}
