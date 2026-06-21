# TerraMind — Autonomous Drone Swarm Command & Geospatial Intelligence Platform

> **DevOps Case Study 124** · B.Tech CSE 2024–28 · ITM Skills University
> A drone-swarm command console where an operator defines natural-language **watch markers**
> ("armored convoy in open terrain"), a real **vision AI** (MiniMax-M3) scans drone camera
> frames against them, and confirmed threats trigger an autonomous interceptor — all wrapped
> in a full DevOps lifecycle (Docker · Kubernetes · CI/CD · Terraform · Prometheus/Grafana · ELK · Vault).

This README is also a **learn-the-stack guide**: every tool is explained from the ground up, in the
order the pieces actually stack, so you can read it top-to-bottom and understand the whole system.

## Contents
1. [What this project is](#1-what-this-project-is)
2. [The whole system in one picture](#2-the-whole-system-in-one-picture)
3. [Learn the stack from the ground up](#3-learn-the-stack-from-the-ground-up)
   · [3.1 Servers & ports](#31-servers--ports-start-here) · [3.2 Docker](#32-docker-images--containers)
   · [3.3 YAML & TOML](#33-yaml--toml-the-config-languages) · [3.4 Compose vs Kubernetes](#34-docker-compose-vs-kubernetes--the-honest-docker-truth)
   · [3.5 Terraform](#35-terraform) · [3.6 CI/CD pipeline](#36-the-cicd-pipeline--the-complete-flow)
   · [3.7 Prometheus & Grafana](#37-prometheus--grafana-the-metrics-flow) · [3.8 Vault](#38-vault--secrets-the-deep-dive)
   · [3.9 ELK](#39-elk-the-logs-flow)
4. [Counting: servers, images, pods, containers](#4-counting--servers-images-pods-containers)
5. [Run it locally](#5-run-it-locally)
6. [Simulate failure (live demo menu)](#6-simulate-failure-live-demo-menu)
7. [DevOps deliverables — status](#7-devops-deliverables--status)
8. [Appendix: deployment strategies](#appendix--deployment-strategies-viva--interview-reference)

---

## 1. What this project is

Three small services + a database make up the **application**; everything else is the **DevOps wrapper** around it.

```
┌──────────────┐     /api/command/snapshot     ┌──────────────┐    /scan     ┌──────────────┐
│  frontend    │ ───── (poll every 2s) ───────▶ │   backend    │ ───────────▶ │  ai-service  │
│  Next.js 14  │                                │  FastAPI     │              │  FastAPI     │
│  :3000       │ ◀──── camelCase JSON ───────── │  swarm sim   │ ◀─ detection │  MiniMax-M3  │
└──────────────┘                                │  + AI loop   │              │  vision      │
   tactical map                                 │  :8000       │              │  :8001       │
   (Esri satellite)                             └──────┬───────┘              └──────────────┘
                                                       │ markers + detections
                                                 ┌─────▼──────┐
                                                 │ PostgreSQL │
                                                 └────────────┘
```

- **frontend** (Next.js) — the command console: live satellite map, watch markers, threat feed, telemetry, event log. Falls back to an in-browser simulation if the backend is gone (graceful degradation).
- **backend** (FastAPI) — the authoritative swarm simulation + AI scan loop. Sends frames to the AI, injects confirmed threats, tasks interceptors, persists to the database, exposes Prometheus `/metrics`.
- **ai-service** (FastAPI) — the vision engine. Sends a frame + the markers to **MiniMax-M3** and returns a detection. Deterministic mock fallback when the model is unreachable.
- **PostgreSQL** — stores watch markers + the detection log.

**The AI loop (real, validated):** `watch marker → MiniMax-M3 scans a frame → detection matched to a marker → threat confirmed (≥55%) → LANCE interceptor dispatched → neutralized → saved to DB + counted in Prometheus`. The drones are simulated; **the vision AI is genuinely real** (it reads the satellite imagery and counts vehicles correctly).

---

## 2. The whole system in one picture

This is the entire DevOps lifecycle. Read it once now; the rest of the README explains each box.

```
 YOU write:  app code  +  Dockerfiles  +  Kubernetes YAML  +  pipeline YAML
      │
      │  git push
      ▼
 ┌─────────────────────── CI/CD pipeline (Jenkins / GitHub Actions) ───────────────────────┐
 │  checkout → validate (terraform·kubeconform·gitleaks) → build 3 images → scan (Trivy)    │
 │  → push images to registry → deploy to Kubernetes → smoke-test                           │
 └──────────────────────────────────────────┬───────────────────────────────────────────────┘
                                             ▼
                       ┌──────────── Kubernetes cluster ────────────┐
   Terraform builds    │  pods: frontend ×2 · backend · ai-service  │   Vault injects the
   the platform   ───▶ │        · postgres   (self-healing,         │ ◀── MiniMax key into
   (ingress, metrics)  │         autoscaling)                       │     the ai-service pod
                       └─────┬──────────────────────────────┬───────┘
                             │ /metrics scraped              │ logs shipped
                             ▼                               ▼
                   Prometheus → Grafana                  ELK (Elasticsearch+Kibana)
                   ("is it healthy?")                    ("what exactly happened?")
```

---

## 3. Learn the stack from the ground up

Each tool below uses the same shape: **what it is → how it works → what I use in this project.** Read in order — every concept builds on the one before it.

### 3.1 Servers & ports (start here)

This is the foundation everything else sits on, and the part that confuses people most.

- A **server** = one computer (your laptop, or a rented cloud VM). It has one main address (an **IP**) and **65,535 numbered ports**.
- A **port** = a numbered door on that computer. A running service listens on **exactly one** port. **Two services cannot share the same port on the same machine.**
  - *Real example from this repo:* my work app (UnitPay) already used port **3000**, so I had to run TerraMind's frontend on **3100**. That's a port conflict, resolved by picking a free door.
- **One server runs MANY services — each on its own port.** My one laptop runs all of TerraMind at once:

  | Service | Port (door) |
  |---|---|
  | frontend | `:3100` |
  | backend | `:8000` |
  | ai-service | `:8001` |
  | postgres | `:5432` |

  → **4 services, 4 ports, 1 machine.** You do **not** need a separate server per service.

- **"Do I need one server or many?"** One server can run everything (that's what `docker compose up` does — all on your laptop). You add **more servers only when**: (a) one runs out of CPU/RAM, (b) you want reliability (one dies, others keep serving), or (c) you must handle more users. Managing many servers is exactly **Kubernetes'** job (§3.4).

- **The container-port twist** (the genuinely confusing bit): *inside* a container, the app listens on a port (the backend listens on 8000 inside its box). Each container has its **own private set of ports**. Docker then **maps** a container's port to a host port:
  ```
  -p 8000:8000   means   host port 8000  →  container port 8000
  ```
  This is why two containers can **both** use port 8000 *internally*, yet you map them to different *host* ports (8000 and 8001) so the one machine can tell them apart.

**Your exact questions, answered:**
- *"One server, one port, multiple images?"* → **No.** One host port maps to **one** container. But each container has its own internal ports.
- *"One server, multiple ports running?"* → **Yes — that's normal.** Each service gets its own host port.
- *"Multiple servers?"* → **Only when one isn't enough** (capacity or reliability). For this project, **one machine runs all 5** containers.

### 3.2 Docker: images & containers

- An **image** = the recipe — your app + its exact runtime + libraries + a slice of OS, packed into one file, built once.
- A **container** = a running copy of an image. **One image → many containers.**
- **Why Docker exists:** to kill "works on my machine." The image carries its whole world, so it runs **identically** on your laptop, a CI runner, or a Kubernetes node.
- **In my project:** I build **3 images** (frontend, backend, ai-service). **postgres** is an official image I use as-is (I didn't build it).

**Docker commands I used:**
| Command | What it does |
|---|---|
| `docker build -t terramind-backend ./backend` | Builds an image from the Dockerfile in `./backend` and tags it. This is the "build" step of the pipeline. |
| `docker images` | Lists every image on the machine (name, tag, size). Confirms your 3 images + postgres exist. |
| `docker ps` | Lists **running** containers (`ps` = process status); add `-a` to include stopped ones. Shows id, image, ports, status. |
| `docker logs <name>` | Prints a container's logs. First stop for "why did this container crash?". |
| `docker exec -it <name> sh` | Opens a shell **inside** a running container, so you can inspect its files/env live. |
| `docker push ghcr.io/anshumanatrey/terramind-backend` | Uploads a built image to a registry (GHCR). The "push" step of the pipeline. |

### 3.3 YAML & TOML (the config languages)

Before CI/CD makes sense, know what the files are written in. Both are just **human-readable settings files — no logic, only "here are the settings."**

| Format | Looks like | Used in my project for |
|---|---|---|
| **YAML** (`.yaml`/`.yml`) | `key: value`, nested by **indentation** | Kubernetes manifests, GitHub Actions, docker-compose |
| **TOML** (`.toml`) | `[section]` headers + `key = value` | `.gitleaks.toml` (secret-scan rules) |

- **Difference:** YAML nests with indentation; TOML groups with `[sections]` and explicit `=`. Same idea, different syntax.
- **Who writes them:** a developer writes them **by hand** and commits them to the repo — the app code, the Dockerfiles, the Kubernetes YAML, and the pipeline YAML all live in git. **The CI/CD pipeline reads these files** (that's the "flow of a person making YAML" → the pipeline acts on it).

### 3.4 Docker Compose vs Kubernetes (+ the honest Docker truth)

**First, the question: "you said Kubernetes dropped Docker — but isn't Kubernetes there *because of* Docker containers?"** Both are true once you separate four things people lump together:

```
container  = a Linux KERNEL feature (namespaces + cgroups) — isolation. NOT a Docker invention.
   ▲
OCI image  = the standard package format. A "Docker image" is really an OCI image.
   ▲
containerd + runc  = the actual ENGINE that turns an image into a running container.
   ▲
Docker     = a friendly WRAPPER (CLI + daemon + image builder) around containerd.
```

- Containers are a **Linux feature** — Docker didn't invent them, it made them usable and created the image format (now the **OCI** standard).
- **Kubernetes was born to orchestrate containers.** Early on (2014–2022) it drove the **Docker engine** through an adapter called **dockershim**.
- Kubernetes **removed dockershim in v1.24 (May 2022)** and now talks **directly to containerd** (or CRI-O).
- **But containerd *is* Docker's own engine** — Docker built it and donated it. And your `docker build` images still run on Kubernetes because they're **OCI-standard**.
- **So "Kubernetes dropped Docker" means:** it stopped using the Docker *daemon as a middleman* and now uses Docker's *engine (containerd)* directly. **It kept the guts, dropped the wrapper.** Kubernetes still exists to run containers, and still runs Docker-built images.

**Now Compose vs Kubernetes** — both read YAML and run containers, but they are *not* the same:

| | **Docker Compose** | **Kubernetes** |
|---|---|---|
| What it is | Docker's own commands written as YAML | A separate system with its **own API** + objects (`Pod`, `Deployment`, `Service`, `HPA`) Docker doesn't have |
| Scope | a few containers on **one machine** | many containers across a **cluster** |
| Lifetime | runs them, then it's done | a **control loop runs forever**, self-healing |
| Use | local dev | production |

> Your earlier mental model — *"Docker's functions as YAML controlling multiple containers"* — describes **Docker Compose exactly.** Kubernetes goes further: its own control system that runs containers via containerd and **never stops watching them** (restarts crashes, adds copies under load, reschedules when a node dies).

**The Terraform parallel:** both Terraform and Kubernetes are *declarative* (you write the desired state, the tool reconciles reality to match). The difference: **Terraform reconciles once** per `apply` then exits; **Kubernetes reconciles continuously** — which is *why* it self-heals and Terraform doesn't.

**Docker Compose commands I used:**
| Command | What it does |
|---|---|
| `docker compose up --build` | Builds all images and starts every service in `docker-compose.yml` together. The one-command full-stack run. |
| `docker compose up -d` | Same, but **detached** — runs in the background and frees your terminal. |
| `docker compose ps` | Lists the containers Compose is managing, with their status and ports. |
| `docker compose logs -f` | Streams the combined logs of all services (`-f` = follow live). |
| `docker compose down` | Stops and removes all containers + the network Compose created. Clean teardown. |

**Kubernetes (`kubectl`) commands I used:**
| Command | What it does |
|---|---|
| `kubectl apply -f kubernetes/` | Creates/updates all resources from the YAML manifests. Idempotent — re-running applies only the changes. |
| `kubectl get pods -n terramind` | Lists pods in the namespace (kubectl's `ps`). Shows status, READY (e.g. `2/2`), restarts, age. |
| `kubectl logs <pod> -n terramind` | Prints a pod's logs; add `-f` to follow. The Kubernetes equivalent of `docker logs`. |
| `kubectl describe pod <pod> -n terramind` | Detailed state + recent events for a pod. First stop when a pod is stuck or CrashLooping. |
| `kubectl scale deploy/ai-service --replicas=3 -n terramind` | Sets how many copies of a deployment run. This is the spike/scale demo. |
| `kubectl exec -it <pod> -n terramind -- sh` | Opens a shell inside a running pod's container — same idea as `docker exec`. |

### 3.5 Terraform

- **What it is:** Infrastructure-as-code. You declare the infrastructure you want in `.tf` files; `terraform apply` makes reality match (idempotent — running it twice is safe).
- **How it works:** `apply` reads your `.tf` → calls the target's API (AWS, Kubernetes, Helm) → creates only the difference between what exists and what you declared.
- **In my project:** Terraform provisions the **Kubernetes platform layer** — ingress-nginx, metrics-server (so autoscaling works), and the monitoring/logging/vault namespaces — into the Kind cluster via the `kubernetes` + `helm` providers. **Not raw AWS.** Then `kubectl` deploys my app pods on top.

### 3.6 The CI/CD pipeline — the complete flow

**CI/CD = automated build → test → deploy, triggered on every code push.** This is the spine that ties everything above together.

**What runs, in order, on every `git push`:**
```
1. push        you push code (or click "Run", or a schedule fires)
2. checkout    the pipeline grabs the latest repo
3. validate    terraform validate · kubeconform (k8s YAML) · gitleaks (secret-scan) · lint
4. build       build the 3 Docker images
5. scan        Trivy scans images for known vulnerabilities — fail on HIGH/CRITICAL
6. push        upload images → registry (GHCR / Docker Hub)
7. deploy      kubectl apply → Kubernetes rolls out new pods (Rolling update)
8. smoke test  curl /health inside the cluster → prove it's alive
```

**Jenkins vs GitHub Actions — I have both, on purpose:**

| | **Jenkins** (`jenkins/Jenkinsfile`) | **GitHub Actions** (`.github/workflows/`) |
|---|---|---|
| What | self-hosted automation server | the same automation, hosted free by GitHub |
| Status in this repo | **the named deliverable** — complete, portable, *not run on a live server* | **what actually runs** — live & green on every push (build, deploy to a real Kind cluster, secret-scan) |

Same job; different host. **Jenkins = the deliverable the rubric names; GitHub Actions = the running proof.** The secret-leak demo (§6) turns **GitHub Actions** red.

### 3.7 Prometheus & Grafana (the metrics flow)

**The naked flow — no magic:**
1. **`/metrics` is not free — I added it.** Only my **two Python services** expose it (`backend:8000`, `ai-service:8001`); one line — `Instrumentator().instrument(app).expose(app)` — creates the route. **Frontend `/metrics` → 404, postgres → none.** Those two aren't scraped.
2. **Two kinds of metric on that endpoint:** *(a) auto* — the instrumentator counts every HTTP call for free (`http_requests_total{handler="/api/command/snapshot"}`); *(b) custom* — gauges/counters I declare and update in code (`ACTIVE_DRONES.set(6)`, `THREATS_INJECTED.labels(priority="critical").inc()`).
3. **PULL, not push (the key bit):** when an API is called, the app just **increments a number in its own memory** — it does **not** send anything anywhere. The numbers sit as plain text at `GET /metrics`.
4. **The chain:** API call → counter++ in app memory → exposed at `/metrics` → **Prometheus scrapes** both services every 5s → stores time-series → **Grafana** queries it (`terramind_active_drones`) → live charts → *(optional)* alert fires if a value crosses a threshold.

### 3.8 Vault — secrets (the deep dive)

**The question: at runtime, how does Vault hand the key to the app, and what's the encryption behind it?**

In this project **only the ai-service needs a secret** — the MiniMax/TokenRouter API key. frontend, backend and postgres do not. Here's the **exact runtime injection flow** (my real setup):

```
1. setup-vault.sh stores the key in Vault at  secret/terramind/ai  (KV-v2 engine).
2. terramind-policy.hcl says: identity "terramind-ai" may ONLY read that one path (least privilege).
3. The ai-service pod runs as Kubernetes ServiceAccount "terramind-ai".
4. The Vault Agent Injector (a mutating webhook) sees the pod's annotations and adds a
   "vault-agent" sidecar container to the pod — no app code change.
5. The sidecar authenticates to Vault with the pod's ServiceAccount token (Kubernetes auth);
   Vault verifies that token against the Kubernetes API.
6. Vault checks the policy → returns the secret. The sidecar renders it via a template to a file:
      /vault/secrets/ai-config   →   export TOKENROUTER_API_KEY="..."
7. That file lives on an in-memory tmpfs volume in the pod — never written to disk.
8. The ai-service container sources that file at startup, then runs uvicorn with the key in its env.
   The key is never in the image and never in git.
```

**The encryption behind the scenes (what Vault actually does):**
- **At rest:** Vault encrypts everything in its storage with **AES-256-GCM** (its "barrier").
- **Key hierarchy:** that encryption key is itself locked by a **master (root) key**.
- **Unseal:** the master key is split with **Shamir's Secret Sharing** into N shares; a threshold (e.g. 3 of 5) is needed to *unseal* Vault on startup. *(My dev-mode Vault auto-unseals — demo only; production uses real unseal keys + a non-root token.)*
- **In transit:** app ↔ Vault traffic is over **TLS**.
- **Identity:** Kubernetes auth — the pod proves who it is with its ServiceAccount JWT; Vault hands back a short-lived token (TTL 1h) scoped by the policy.

**Per-service secret summary:**

| Service | Needs a secret? | How it gets it |
|---|---|---|
| **ai-service** | yes (MiniMax key) | **Vault Agent injects it at runtime** |
| backend | no | — |
| frontend | no | — |
| postgres | its own password | a Kubernetes Secret (could be moved into Vault) |

### 3.9 ELK (the logs flow)

- **ELK = Elasticsearch (store + search) + Kibana (UI) + Filebeat (log shipper).**
- **Metrics vs logs:** Prometheus/Grafana = numbers, *"is it healthy?"* · ELK = text events, *"what exactly happened and why did it fail?"*
- **Flow:** each service prints log lines → **Filebeat** ships them → **Elasticsearch** indexes them → you search/visualize in **Kibana**.

---

## 4. Counting — servers, images, pods, containers

**First, which runs inside which?** (the pod-vs-container confusion, settled)

A **Docker container runs *inside* a Kubernetes pod.** Kubernetes never runs a bare container — it always wraps it in a **pod**. The full nesting, smallest → biggest:

```
image   →   container   →   pod        →   node       →   cluster
recipe      running         a K8s box      one server     many
(a file)    copy of it      holding 1+     (a machine)    servers
                            container(s)
```

- **Container** = Docker's unit — your running app, started from an image.
- **Pod** = Kubernetes' smallest unit — a box that holds **one or more** containers sharing one IP + storage. Kubernetes schedules *pods*, not containers.
- Usually **1 container per pod**, but a pod can hold a helper too — *real examples in this repo*:
  - **ai-service + Vault** → the pod has **2 containers**: the app + the `vault-agent` sidecar → `kubectl get pods` shows `2/2`.
  - **backend** → 1 main container + a `busybox` **init-container** that waits for postgres to be ready first.
- **Node** = one server (machine) that runs pods. **Cluster** = many nodes Kubernetes spreads pods across.

**One line:** *a **container** is the running app (Docker's unit); a **pod** is the box Kubernetes wraps it in; pods run on **nodes** (servers).*

Now the four numbers that trip everyone up, settled:

```
3 images I BUILT          →   run on Kubernetes as:
  frontend    ──────────────►   2 pods   ← 2 copies for reliability
  backend     ──────────────►   1 pod
  ai-service  ──────────────►   1 pod    ← autoscales to 5 under load (HPA)
+ postgres (official image) ──►   1 pod    ← I didn't build this one
                                  ───────
                                  5 pods total
```

- **Images:** 3 I built + postgres (official) = **4**.
- **Pods:** **5** at rest, up to **9** under load. (An **image** is the recipe; a **pod** is a running copy — one image → many pods.)
- **Containers:** *"3 of my own images plus postgres — running as 5 pods."*
- **Servers:** **1 machine** runs everything locally; in production it's a **cluster of N nodes** that Kubernetes spreads the pods across.

**One-breath summary:** 3 services → 3 Docker **images** (+postgres) → run as 5 **pods** on **Kubernetes** → built & deployed by **CI/CD** (Jenkinsfile + live GitHub Actions) → infra by **Terraform** → monitored by **Prometheus + Grafana** → logs in **ELK** → secrets in **Vault** → all config in **YAML**.

---

## 5. Run it locally

> Docker not running? Use **Option B** (native). Port 3000 taken? Use any free port (e.g. 3100).

### Option A — Docker (full stack, one command)
```bash
# put your TokenRouter key in ai-service/.env first (see ai-service/.env.example)
docker compose up --build
# frontend → http://localhost:3000 · backend → :8000/api/command/snapshot · ai-service → :8001/info
```

### Option B — native (dev)
```bash
# 1. AI service
cd ai-service && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python seed_frames.py
.venv/bin/uvicorn main:app --port 8001

# 2. Backend (new terminal)
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --port 8000

# 3. Frontend (new terminal)
cd frontend && npm install
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local
npm run dev -- -p 3100      # http://localhost:3100  (3000 if free)
```

**Layout**
```
frontend/  backend/  ai-service/   # the application (runs natively + Docker)
kind/  terraform/  kubernetes/      # cluster: config + platform (TF) + app (kubectl)
jenkins/                            # CI/CD pipeline (named deliverable)
monitoring/  logging/  vault/       # Prometheus+Grafana · ELK · Vault
disaster-recovery/  docs/           # DR plan · architecture + deployment diagrams
.github/workflows/                  # live CI: validate · deploy-to-kind · secret-scan
```

---

## 6. Simulate failure (live demo menu)

PS124 reviewers "may simulate satellite-comms failure, storage corruption, cyberattacks, cloud-region outages, analytics-pipeline failures, and workload spikes." Each maps to a one-command live demo — the platform **degrades, never crashes, and recovers**.

### A. Secret leakage → CI/CD turns RED  (cyberattack)
The `secret-scan` job (`gitleaks` + `.gitleaks.toml`) fails the build if any key is committed.
```bash
# leak a FAKE key in a code comment, then push:
echo '# leaked key: sk-tokenrouterFAKEdemoLEAK1234567890abcd' >> backend/main.py
git add -A && git commit -m "oops: hardcoded a key" && git push
#  → GitHub ▸ Actions ▸ secret-scan job goes RED, pointing at backend/main.py:<line>
# recover: remove the line and push again → GREEN
git revert --no-edit HEAD && git push
```
Prove it locally first (no push needed):
```bash
gitleaks detect --no-git --source . --config .gitleaks.toml --redact -v   # exit 1 = caught
```

### B. Analytics-pipeline / satellite-comms failure  (kill the AI)
```bash
./disaster-recovery/dr-demo.sh
#  kills ai-service → gauge terramind_ai_engine_online 1→0, swarm keeps flying on mock
#  detections, UI stays up → auto-restarts → gauge 0→1 (recovered in ~12s)
```

### C. Cloud-region / backend outage  (kill the backend)
```bash
pkill -f 'uvicorn main:app .*--port 8000'        # backend down
#  refresh the UI → "DEGRADED" badge; console keeps running on its in-browser
#  simulation and never blanks. Restart to recover:
cd backend && .venv/bin/uvicorn main:app --port 8000 &
```

### D. Workload spike / node outage  (Kubernetes self-heal + autoscale)
```bash
kubectl -n terramind scale deploy/ai-service --replicas=3   # spike → scale out 1→3
kubectl -n terramind delete pod -l app=backend              # node outage → auto-recreated
kubectl -n terramind get pods -w
```

> Framing that scores: *"I don't have a DR plan PDF — I have a chaos menu. Kill any component and watch it degrade and recover."* The rubric rewards the verb **demonstrate**.

---

## 7. DevOps deliverables — status
| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Working application | ✅ frontend + backend + ai-service (runs, real MiniMax-M3) |
| 2 | Source repo (GitHub) | ✅ pushed |
| 3 | Dockerfiles + images | ✅ all 3 services |
| 4 | Jenkins CI/CD | ✅ `jenkins/Jenkinsfile` (build·scan·push·deploy·smoke) |
| 5 | Terraform | ✅ `terraform/` — `terraform validate` PASS |
| 6 | Kubernetes manifests | ✅ `kubernetes/` — kubeconform 18/18 valid |
| 7 | Prometheus + Grafana | ✅ `/metrics` + scrape config + dashboard JSON |
| 8 | ELK logging | ✅ `logging/` ES + Kibana + Filebeat values |
| 9 | Vault secrets | ✅ `vault/` policy + k8s-auth + agent injection |
| 10 | Architecture diagram | ✅ `docs/architecture.md` (mermaid) |
| 11 | Deployment diagram | ✅ `docs/deployment.md` (mermaid) |
| 12 | Disaster Recovery plan | ✅ `disaster-recovery/DR-PLAN.md` |
| 13 | Demonstration screenshots | ⏳ captured from native app + per-component runs |
| 14 | Project documentation | ✅ this README + per-component READMEs |

> **Validation:** all infra is statically validated (`terraform validate`, `kubeconform`, JSON/YAML parse) locally and in CI; the live GitHub Actions `deploy` workflow spins a real Kind cluster, deploys the stack, and proves HPA scaling on every push.

---

## Appendix — Deployment strategies (viva / interview reference)

For viva, interviews, and system design, remember deployment strategies like this:

| Strategy    | Simple Meaning                                                        | Downtime  | Rollback  |
| ----------- | --------------------------------------------------------------------- | --------- | --------- |
| Recreate    | Stop old version → Start new version                                  | Yes       | Slow      |
| Rolling     | Update servers one by one                                             | Minimal   | Moderate  |
| Blue-Green  | Two identical environments. Switch all traffic at once.               | Near Zero | Instant   |
| Canary      | Send small % users to new version first (5%, 10%, 50%, 100%)          | Zero      | Easy      |
| Red-Black   | Like Blue-Green but only one environment receives traffic at any time | Zero      | Instant   |
| A/B Testing | Different users get different versions/features                       | Zero      | Easy      |
| Shadow      | New version gets copied traffic but users still see old version       | Zero      | Very Easy |

> **My project uses Rolling by default** — that's what `kubectl rollout` / `set image` does in the Jenkinsfile and `deploy.yml`: pods update one at a time, old ones keep serving until new ones are healthy (minimal downtime). For *zero* downtime + instant rollback you'd switch to **Blue-Green** (run v2 alongside v1, flip the Service selector).

### Blue-Green Deployment

```
Users
  |
 Blue (v1)  <-- Live
 Green(v2)  <-- New Release
```

After testing:

```
Users
  |
 Green(v2) <-- Live
 Blue(v1)  <-- Backup
```

Advantages:

* Zero downtime
* Instant rollback
* Easy to understand

Disadvantage:

* Need double infrastructure/resources. ([Octopus Deploy][1])

---

### Red-Black Deployment

Almost same as Blue-Green.

Difference:

* Blue-Green may briefly have traffic hitting both environments during transition.
* Red-Black ensures only one environment receives production traffic at a time. ([Octopus Deploy][2])

---

### Canary Deployment

Deploy to only a few servers/users first:

```
90% Users -> v1
10% Users -> v2
```

If healthy:

```
50% Users -> v1
50% Users -> v2
```

Then:

```
100% Users -> v2
```

Advantages:

* Safer for risky releases
* Real user feedback
* Small blast radius if bug occurs

Disadvantage:

* Requires traffic routing and monitoring. ([Octopus Deploy][3])

---

### Selective Instance Deployment

Deploy only to specific servers.

Example:

```
Server1 -> v2
Server2 -> v1
Server3 -> v1
Server4 -> v1
```

Used for:

* Testing
* Canary releases
* High-risk changes

---

### Staging → Production Deployment

Typical enterprise flow:

```
Developer
   ↓
Dev Environment
   ↓
QA/Test
   ↓
Staging
   ↓
Production
```

**Staging** = exact copy of production where final testing happens before customers see changes.

---

### What Octopus Deploy Does

Octopus lets you automate:

```
Build
 ↓
Deploy to Staging
 ↓
Approval
 ↓
Deploy to Canary
 ↓
Deploy to Production
```

Or

```
Build
 ↓
Deploy to Green
 ↓
Switch Traffic
 ↓
Production
```

using Blue-Green deployments. ([Octopus Deploy][4])

### Viva Question You May Get

**Q: Difference between Blue-Green and Canary Deployment?**

**Answer:**

* Blue-Green deploys the entire application to a separate environment and switches all users at once.
* Canary deploys to a small percentage of users first and gradually increases traffic.
* Blue-Green provides instant rollback.
* Canary provides safer gradual validation. ([Octopus Deploy][3])

### One-Line Revision

* **Recreate** = Stop old, start new.
* **Rolling** = Update one server at a time.
* **Blue-Green** = Two environments, switch traffic.
* **Red-Black** = Blue-Green with strict single active environment.
* **Canary** = Release to few users first.
* **A/B** = Different users get different versions.
* **Shadow** = Test with mirrored traffic.
* **Staging** = Production-like testing environment before release.

[1]: https://octopus.com/devops/ci-cd/ci-cd-tools-for-blue-green/?utm_source=chatgpt.com "Top 6 CI/CD Tools With Blue/green Deployment In 2025"
[2]: https://octopus.com/blog/blue-green-red-black?utm_source=chatgpt.com "What Is The Difference Between Blue/green And Red/black ..."
[3]: https://octopus.com/devops/software-deployments/blue-green-vs-canary-deployments/?utm_source=chatgpt.com "Blue/green Versus Canary Deployments: 6 Differences ..."
[4]: https://octopus.com/docs/deployments/patterns/blue-green-deployments-with-octopus?utm_source=chatgpt.com "Blue-green Deployments In Octopus Using Environments"
