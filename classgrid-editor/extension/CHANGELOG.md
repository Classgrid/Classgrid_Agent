# Changelog

## 0.1.8

- Review under an answer opens the Review tab: the same Review as the Classgrid app's Studio, every changed file with its diff, Accept, Reject (one file or all) and Undo. Review and Undo also work in Project Mode, for a chat made by the same message, and when the server cannot be reached.

## 0.1.7

- Review works for folders on this computer: the answer's changes show as a diff to accept, reject (one file or all) or undo. The chat's Review and Undo buttons under an answer work the same way.

## 0.1.6

- A request no longer hangs for a minute after the editor sat idle: idle connections to the server are closed after 10 seconds, and a request on a connection that died meanwhile is sent again on a fresh one.

## 0.1.3

- The Agent panel, the chats sidebar and Settings take the colors of the editor's own theme (Dark Modern, Light Modern or any theme you use), like the editor's other panels, instead of Classgrid's own colors.

## 0.1.0

- First release in the VS Code Marketplace and Open VSX.
- The Classgrid Agent in the right side panel of VS Code, Cursor, Windsurf and VSCodium.
- Sign in with your Classgrid account in the browser, with a paste-code option.
- Commands: Sign in, Paste sign-in code, Sign out, Show the Agent, Open Classgrid, Search Chat History, Settings.
