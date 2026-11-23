// Two copies of this server run (main and rescue: services/sibling-process.js) and a chat's helpers live in the memory
// of the copy that started them. This says whether a message of a chat has to be passed on to the other copy:
// only when the helpers are NOT here and the note in Redis names the other copy (ai-chat.controller.js HELPERS_AT).
//   hasBoardHere: this copy holds helpers of the chat (working, or finished with reports to give)
//   markedAt: the copy named in Redis ("main" / "rescue"), or nothing when no helpers were started lately
//   here: this copy's own name
// Owner, 2026-11-21: five helpers working in the main copy, his next message answered by the rescue copy, which said
// "No helpers are working in this chat" and started five more.
export function passOnToHelpersCopy({ hasBoardHere, markedAt, here }) {
    if (hasBoardHere) return false; // they are here
    if (!markedAt) return false; // no helpers anywhere
    return String(markedAt) !== String(here); // they are in the other copy
}
