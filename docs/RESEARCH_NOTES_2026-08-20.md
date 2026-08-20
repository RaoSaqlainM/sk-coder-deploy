# Deployment Research Notes

## Oracle Cloud Always Free

Oracle's official Always Free documentation, updated June 12, 2026, states that an Always Free tenancy has a combined **200 GB** block-volume allowance shared by boot volumes and added block volumes, plus **20 GB** of Object Storage. It also documents an Ampere A1 equivalent allowance of **2 OCPUs and 12 GB memory** per tenancy when fully allocated, and notes that idle Always Free compute instances can be reclaimed after a seven-day period where CPU, network, and applicable memory utilization are all low.

The backend design must therefore avoid treating the 200 GB block allowance as unlimited user storage. It should reserve disk capacity for the operating system, Docker images, logs, active shell workspaces, and temporary compile artifacts. User project source remains browser-persistent first; backend copies must be bounded and disposable.

Sources:

- https://docs.oracle.com/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- https://www.oracle.com/cloud/free/faq/

## Hostinger DNS

Hostinger's DNS documentation states that DNS records are managed in hPanel under either `Domains → DNS` or `Websites → Advanced → DNS Zone Editor`, depending on the product. An A record points a hostname to an IPv4 address; a CNAME maps a hostname to another hostname. DNS changes can take up to 24 hours to propagate. The final custom-domain topology should use independent hostnames for the frontend and API, for example `app.example.com` and `api.example.com`, rather than a temporary tunnel.

Sources:

- https://www.hostinger.com/support/1583249-how-to-manage-dns-records-at-hostinger/
- https://www.hostinger.com/support/how-to-use-hostingers-dns-zone-editor/
- https://www.hostinger.com/support/4738777-how-to-manage-cname-records-at-hostinger/

## Public Runtime Fallbacks

Wandbox publishes a changing compiler catalog that includes multiple language families. It can be used only as a source-only fallback for small single-file programs because it does not provide a persistent user project directory, interactive terminal, or dependable package installation environment. The production runtime plan must query its compiler catalog at execution time and report an unavailable result rather than claiming a language is supported when a compiler is absent.

Pyodide runs Python in the browser. Its documentation states that it supports pure-Python wheels from PyPI and packages built for wasm32/emscripten, but it has WebAssembly constraints and does not support normal threading or multiprocessing. It is therefore an offline Python fallback, not a replacement for the server terminal or for arbitrary native Python package projects.

Sources:

- https://wandbox.org/
- https://pyodide.org/en/stable/usage/packages-in-pyodide.html
- https://pyodide.org/en/stable/usage/loading-packages.html
- https://pyodide.org/en/stable/usage/wasm-constraints.html

## Permanent Custom-Domain Backend

The temporary `trycloudflare.com` URL must be replaced for production because its hostname changes when the tunnel restarts. The permanent topology should expose the backend as an API subdomain, for example `api.example.com`, pointed by a Hostinger A record to the Oracle instance public IPv4 address. Nginx should terminate HTTPS and reverse-proxy only the backend API and WebSocket paths to the local container port. The frontend can remain on Vercel under `app.example.com` or the apex domain.

Oracle documents that security lists control ingress and egress traffic for a subnet's VNICs. The deployment needs explicit ingress only for TCP ports 80 and 443, plus restricted SSH access. Certbot documentation states that it can switch an existing HTTP Nginx site to HTTPS and renew certificates, subject to the certificate authority validation path being reachable.

Sources:

- https://docs.oracle.com/iaas/Content/Network/Concepts/securitylists.htm
- https://docs.oracle.com/en/learn/publish-webserver-using-oci/index.html
- https://certbot.eff.org/
- https://eff-certbot.readthedocs.io/en/stable/using.html

## Browser-First Project Storage

The browser Storage API manages IndexedDB, Cache API, and Origin Private File System storage per origin. The fixed browser `localStorage` quota is only 5 MiB per origin, so it must not store project file contents. IndexedDB and OPFS use browser-managed quotas that vary by browser, device, free disk space, and storage mode. The application must call `navigator.storage.estimate()` before a large import and handle `QuotaExceededError` honestly.

The application may request persistent storage through `navigator.storage.persist()` only after a meaningful user action such as saving or importing a project. Persistent storage reduces eviction risk but does not bypass device space limitations and is not guaranteed to be granted by every browser. Safari can proactively evict script-created storage after seven days without user interaction, so SK Coder must clearly offer a downloadable project archive and never promise that a browser-only copy survives users clearing site data.

The correct 1 GB rule is therefore an import target, not an unconditional guarantee: the import UI must stream files, check the browser quota, request persistence, and explain when the user’s particular device cannot reserve enough local space. A temporary runner still receives only a bounded execution snapshot, not an unrestricted 1 GB server upload.

Sources:

- https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- https://developer.mozilla.org/en-US/docs/Web/API/Storage_API
- https://web.dev/articles/persistent-storage

## Vercel Frontend Domain

Vercel's official documentation specifies that an apex domain is configured with an A record using the exact value displayed in the Vercel project domain card, while a subdomain is configured with the unique CNAME target shown by Vercel. The recommended production design is to assign the frontend to `app.example.com` or `www.example.com` and the backend to a separate Oracle-routed `api.example.com` hostname. This avoids mixing the Vercel static site and Oracle backend at one hostname.

Sources:

- https://vercel.com/docs/domains/working-with-domains/add-a-domain
- https://vercel.com/kb/guide/a-record-and-caa-with-vercel

## Streaming Transfer Correction

Browser-resident project files cannot be mounted directly into an Oracle or AWS runtime container. A large local file must be staged across the network when a terminal or runner needs it. The File API supports `Blob.slice()` for bounded byte ranges, and modern browsers expose `Blob.stream()` as a `ReadableStream`, allowing staged transfer without first converting a full file to a base64 string in JavaScript memory.

The implementation must use resumable chunk records, integrity metadata, and a temporary per-session staging directory. It should release staging data, command outputs, and package-install caches on the configured lifecycle deadline while retaining the browser project unless the user explicitly deletes or exports it.

Browser storage remains finite and browser-specific. `navigator.storage.estimate()` is an estimate, `navigator.storage.persist()` can reduce eviction risk but is not guaranteed, and private browsing typically deletes stored data when the private session ends. The app must report actual capacity rather than pretend every device has unlimited storage.

Sources:

- https://developer.mozilla.org/en-US/docs/Web/API/Blob/stream
- https://developer.mozilla.org/en-US/docs/Web/API/Blob/slice
- https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
