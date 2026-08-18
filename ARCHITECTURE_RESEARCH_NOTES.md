# Architecture Research Notes

## Storage facts

Oracle Always Free currently provides 200 GB total combined boot and block-volume storage in the home region, not a guaranteed separate 150 GB application disk. The default boot volume consumes part of that combined allowance. Its Always Free Object Storage allowance is 20 GB combined in a free-only account.[1]

Browser IndexedDB is suitable for an offline project copy, but it is not a server disk extension. Its quota is controlled by each browser and device, it is normally best-effort storage, and it may be evicted under storage pressure. Applications can ask for persistence and can inspect estimated browser usage and quota, but neither is a promise of a fixed capacity.[2] [3]

## Execution provider facts

Piston is open source and can be self-hosted, but its maintainers state that the public API is no longer freely available and requires authorization. It cannot be treated as an anonymous public fallback.[4]

Wandbox exposes many language compilers for individual compile and run submissions. It is useful for limited source-code fallback only; it is not a user workspace, package manager, or durable shell.[5]

Judge0 supports sandboxed compilation, time and memory controls, and multi-file submissions. A hosted deployment can require authentication; it is best used only after the owner self-hosts it or deliberately configures a provider credential.[6]

## AI workspace facts

Current coding-agent guidance treats file writes, terminal commands, URL access, and external tool calls as actions that require approval by default. Sandboxing and per-command approval are recommended because model-produced instructions and external content can be unsafe.[7] GitHub’s own cloud agent runs in an isolated temporary environment and still expects users to review the resulting code and changes.[8]

## References

[1]: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm "Oracle Cloud Always Free Resources"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria "MDN Storage quotas and eviction criteria"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate "MDN StorageManager estimate"
[4]: https://github.com/engineer-man/piston "Piston project documentation"
[5]: https://wandbox.org/ "Wandbox"
[6]: https://ce.judge0.com/ "Judge0 CE API documentation"
[7]: https://code.visualstudio.com/docs/agents/run/approvals "VS Code approvals and permissions"
[8]: https://docs.github.com/copilot/concepts/agents/cloud-agent/about-cloud-agent "GitHub Copilot cloud agent"
