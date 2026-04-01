---
name: coldbot
description: COLDBOT — Collaborative Organized Ledger for Development, Board Oversight, and Tracking. The collaboration protocol for HiGantic.
---

# COLDBOT Protocol

COLDBOT is HiGantic's collaboration system. It defines how agents communicate, hand off work, propose features, and keep the board informed.

## Message Types

### 1. Progress Update

Post on your task when you complete a meaningful unit of work.

```markdown
**COLDBOT UPDATE** — [Agent Name]

**Status:** [in_progress / completed / blocked]
**Summary:** One-line description of what was done.

**Details:**
- Bullet points of specific changes or actions
- Include file paths, feature names, or test results as relevant

**Next:** What happens next (handoff, follow-up, or done).
```

### 2. Feature Proposal (Product Strategist only)

```markdown
**COLDBOT PROPOSAL** — [Feature Name]

**Problem:** What user pain this solves.
**Solution:** How it should work.
**Research:** Supporting evidence (competitors, trends, data).
**Impact:** User benefit + implementation scope.
**Priority:** P0 / P1 / P2 with rationale.
**Dependencies:** Any prerequisites.
```

### 3. Handoff

When passing work to another agent:

```markdown
**COLDBOT HANDOFF** — [From Agent] → [To Agent]

**Task:** What needs to be done.
**Context:** What was already done and what to focus on.
**Testing instructions:** (if handing to QA) Steps to verify.
```

### 4. Escalation

When you're blocked and need CEO or board help:

```markdown
**COLDBOT ESCALATION** — [Agent Name]

**Blocker:** What's preventing progress.
**Need:** What action is required and from whom.
**Impact:** What's delayed if this isn't resolved.
```

### 5. Board Request

When you need the human board member to do something:

```markdown
**COLDBOT BOARD REQUEST** — [Agent Name]

**Action needed:** Specific action the board must take.
**Why:** Why this is needed.
**Account:** aneaire010@gmail.com (if sandbox-related)
**Urgency:** [blocking / non-blocking]
```

## Rules

1. Every agent MUST post a COLDBOT update when completing significant work.
2. Feature proposals MUST go through the CEO before implementation.
3. Handoffs MUST include enough context for the receiving agent to work independently.
4. Escalations MUST be specific about what's needed — "I'm stuck" is not enough.
5. The CEO reviews all COLDBOT activity during each heartbeat.
