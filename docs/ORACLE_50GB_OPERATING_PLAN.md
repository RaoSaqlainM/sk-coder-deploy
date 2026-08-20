# Oracle 50 GB Operating Plan

## Scope

This plan uses the user-requested 50 GB primary retained project-workspace target inside a 150 GB server disk. It is an operating allocation, not a claim that the Oracle Free Tier supplies exactly 150 GB to every account. Oracle currently documents 200 GB total Always Free block-volume storage across boot and attached volumes, subject to the selected account, home region, and provisioned volumes. [1]

## Proposed Allocation for a 150 GB Server Disk

| Storage lane | Target | Purpose | Automatic policy |
|---|---:|---|---|
| Retained user workspaces | 50 GB | Server-resident source projects chosen for cloud persistence. | Retain exactly 72 hours when the user selects “I will be back.” |
| Isolated terminal and runner scratch | 35 GB | Active command workspaces, compiler inputs, package installs, build outputs, stdin, and temporary previews. | Remove when command/session lifecycle ends; never count as retained user source storage. |
| Resumable staging | 15 GB | Browser-to-server and repository-to-server chunk transfer data. | Remove completed staging after promotion and stale transfers after timeout. |
| Runtime images and package cache | 25 GB | Docker images, language toolchains, shared safe package cache, and updates. | Prune only unused images/caches under controlled maintenance. |
| System, logs, metrics, and reserve | 25 GB | OS, Docker metadata, bounded logs, administrator metrics, and free-space reserve. | Preserve a hard reserve before admitting new scratch/staging work. |
| Total | 150 GB | Server-disk operating target. | Measure real disk use rather than enforcing a false browser upload cap. |

## Workspace Lifecycle

The close-tab decision appears only for a user who has server-resident workspace data. Browser-only IndexedDB files stay on the user’s device and are not controlled by an Oracle server timer.

| User action | Retention result |
|---|---|
| Close tab and choose “I will be back” | Retain the server workspace for exactly 72 hours from the recorded confirmation time. |
| Close tab, choose Delete, then confirm | Schedule server deletion for four hours later. Provide undo until deletion begins. |
| Refresh, open another tab, or temporary network loss | Do not trigger the close-tab deletion decision. |
| Browser data/site data cleared | Browser-only IndexedDB data may be removed by the browser. The server cannot undo browser data deletion. |
| Terminal/running command data | Clean separately from retained source files according to runner/session completion and safety policy. |

## Browser Storage Bridge

Browser IndexedDB is a local project continuation location. Its data does not consume Oracle disk while it remains in the browser. When a user requests a terminal command or run, the browser stages required files to temporary server workspace storage in resumable chunks. The runner works from the staged copy; temporary runner data is then cleaned independently.

## Scale Boundaries

Oracle documents Always Free compute as resources for small-scale applications and proof-of-concept testing. It provides up to two Ampere A1 OCPUs and 12 GB memory in the Always Free allocation, and idle instances can be reclaimed under Oracle’s published utilization rule. [1] A single instance should therefore be treated as the first execution node, not as a system capable of millions or billions of simultaneous terminal and compiler workloads.

## References

[1] [Oracle Always Free Resources](https://docs.oracle.com/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
