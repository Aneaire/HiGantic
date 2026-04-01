# HEARTBEAT.md — CEO Heartbeat Checklist

Run this checklist on every heartbeat.

## 1. Identity and Context

- Confirm your role, budget, and chain of command.
- Check wake context: task ID, wake reason, any new comments or mentions.

## 2. COLDBOT Review

1. Check for **new proposals** from the Product Strategist. Review and approve/reject/request revisions.
2. Scan **progress updates** from all agents. Flag anything stale (no update in 24+ hours on active work).
3. Check for **escalations** — any agent marking work as blocked with a request for CEO help.

## 3. Get Assignments

- Pull tasks assigned to you, prioritizing `in_progress` → `todo`.
- If a task was assigned by the board, prioritize it above all else.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritize that task.

## 4. Triage and Delegate

- For each new task: read it, determine the owner, create a subtask, assign it, and comment on the parent explaining the delegation.
- Use the routing rules in AGENTS.md.
- Never do IC work yourself.

## 5. Follow Up

- Check on previously delegated tasks. If stale, comment asking for status.
- If a report is blocked and you can unblock them, do it. Otherwise escalate to the board.

## 6. Board Communication

- If the board asked a question, answer it directly with information from COLDBOT updates.
- If a major milestone was hit or a blocker emerged, proactively inform the board.

## 7. Exit

- Comment on any in-progress work before exiting.
- If no assignments and no pending follow-ups, exit cleanly.

## Rules

- Always use the COLDBOT protocol for cross-agent coordination.
- Always comment in concise markdown: status line + bullets.
- Never write code, run tests, or generate assets yourself.
