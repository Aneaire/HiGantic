# Time Tracking

Native time tracking for agents. Track time spent on tasks and activities with start/stop timers, manual logging, and summaries.

## Tool Set Key

`time_tracking`

## Plan Requirement

Pro or Enterprise

## Credential Required

None (native feature)

## Tools

### `start_time_tracking`

Start tracking time on an activity. Only one timer can run at a time — starting a new one automatically stops the previous.

**Parameters:**
- `description` (string, required) — What you're tracking
- `tags` (string[], optional) — Tags for categorization
- `task_id` (string, optional) — Link to an existing task
- `billable` (boolean, optional) — Whether this time is billable

### `stop_time_tracking`

Stop the currently running timer.

**Parameters:** None

### `log_time`

Manually log a completed time entry.

**Parameters:**
- `description` (string, required) — What was worked on
- `duration_minutes` (number, required) — Duration in minutes
- `tags` (string[], optional) — Tags for categorization
- `task_id` (string, optional) — Link to an existing task
- `billable` (boolean, optional) — Whether billable

### `list_time_entries`

List recent time entries.

**Parameters:**
- `limit` (number, optional) — Number of entries to return (default 10)

### `get_time_summary`

Get aggregated time totals for a period.

**Parameters:**
- `period` ("today" | "week" | "month", optional) — Time period (default "today")

### `delete_time_entry`

Delete a time entry by ID.

**Parameters:**
- `entry_id` (string, required) — ID of the entry to delete

## Events

| Event | Description |
|-------|-------------|
| `time_tracking.started` | A timer was started |
| `time_tracking.stopped` | A timer was stopped |
| `time_tracking.logged` | A time entry was manually logged |
| `time_tracking.deleted` | A time entry was deleted |

## Page Type

The `time_tracking` page type displays:
- Active timer banner with live elapsed counter
- Start/stop controls
- Manual entry form
- Entries list grouped by day
- Summary stats (today, this week)
- Tag filtering

## Setup

No setup required. Enable the "Time Tracking" tool set in agent settings and create a Time Tracking page (or the agent will auto-create one on first use).
