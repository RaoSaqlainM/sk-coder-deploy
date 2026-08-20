# Administrator Dashboard and Lifecycle Design

## Administrator Access

The dashboard is a separate Oracle owner-only surface and is not part of the normal seven-tab user workspace navigation. It must not be publicly accessible through the normal SK Coder frontend. Production deployment uses a dedicated administrative domain or private route protected by the server reverse proxy. The reverse proxy verifies the owner before it serves the dashboard and injects the server-only `ADMIN_DASHBOARD_TOKEN` when forwarding administrator API requests to the backend.

The owner does not enter an administrator token inside the ordinary SK Coder app. The secret remains in Oracle server deployment settings and reverse-proxy configuration. Every destructive request also requires a second explicit confirmation in the dashboard interface.

## Dashboard Views

| View | Information shown | Administrator action |
|---|---|---|
| Overview | Free disk, target storage-lane use, active sessions, scheduled deletions, active runner count, and command/run totals. | None. |
| Workspaces | Anonymous workspace ID, state, created time, retention deadline, last activity, quota, measured size, and execution state. | Schedule cleanup of inactive server workspaces after confirmation. |
| Runners | Active disposable runners, start time, workspace ID, current command status, and scratch use. | Stop a stuck runner after confirmation. |
| Staging and cleanup | Incomplete chunk transfers, staging age, scratch directories, log use, and cleanup result. | Remove expired staging or safely prune inactive artifacts. |
| Capacity | Retained projects, scratch, staging, images/cache, logs, and reserve compared with the 150 GB operating targets. | Run non-destructive refresh; cleanup is separate and confirmation-gated. |

## Close-Tab Lifecycle

The lifecycle prompt is displayed only if a user has a server-resident workspace. Browser-only IndexedDB work has no server deletion prompt.

1. Closing a tab must not be confused with refresh, navigation inside the app, another browser tab, or a temporary connection drop.
2. The browser attempts to show the choice during close intent, but browsers do not guarantee custom dialogs during tab close. The application therefore also shows the same choice from workspace controls before the user leaves.
3. Selecting **I will be back** calls the retention endpoint once and sets `expiresAt` to exactly confirmation time plus 72 hours. Commands and heartbeats must not silently extend that deadline.
4. Selecting **Delete**, then confirming, calls the deletion endpoint once. It sets a deletion deadline to confirmation time plus four hours and creates an undo deadline for the same four-hour window.
5. Undo restores the prior 72-hour retention deadline only when used before the scheduled deletion deadline.
6. Server cleanup removes expired retained server workspaces, scheduled deletions, runner scratch, staging data, logs, and package artifacts by independent policies. It never uses scratch cleanup to delete browser-only IndexedDB data.

## Metrics Boundaries

The dashboard records only operational metrics needed to run the service: anonymous workspace IDs, timestamps, byte counts, counts of terminal commands and runs, cleanup state, and error categories. It must not store source-code contents, API keys, terminal input text, chat messages, or user personal data in the dashboard metrics.
