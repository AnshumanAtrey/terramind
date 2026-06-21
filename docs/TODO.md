# TerraMind — Project Status & Presentation Playbook

**Case Study 124** · Autonomous Drone Swarm Command & Geospatial Intelligence Platform
Repo: `github.com/AnshumanAtrey/terramind` · Last audited: 2026-06-17

---

## 0. My honest read first (no flattery)

You called me out for rubber-stamping your ideas. Fair. So here's the blunt version:

**The build is ~90% done on artifacts but the riskiest gap isn't "what's missing" — it's "what's written vs. what I can put on a screen."** Right now if an examiner says *"show me Grafana,"* *"show me the pipeline run,"* or *"scale this pod,"* I point at a YAML file, not a running screen. Configs that only *validate* are worth half marks of configs that *run*. The grading rubric and the professor's own line — *"demonstrate how DevOps tools automate deployment, scaling, monitoring, recovery, security"* — rewards the verb **demonstrate**, not the noun **file**.

**Three things I'd fix that you didn't ask about:**
1. **The repo is PRIVATE.** The grader literally cannot open it. Free, 30-second fix, total fail if missed.
2. **The app is your strongest asset and it's the *least* documented for presentation.** The money-shot (drone reaches a real carrier → MiniMax-M3 flags it at 95% → interceptor neutralizes) has zero screenshots. That one feature is what separates you from 40 other teams who built a CRUD dashboard.
3. **Your graceful AI-fallback is secretly a live Disaster Recovery demo and nobody's using it that way.** Kill the AI service mid-demo, the app keeps flagging on mock detections, restart it, it recovers. That answers the professor's *"reviewers may simulate analytics pipeline failures"* line with a live act instead of a PDF. This is the highest-leverage idea in this doc and it costs nothing — the code already exists.

---

## 1. Deliverable scorecard (asked vs. built)

Legend: ✅ **DONE & LIVE** (provable on screen right now) · 🟡 **CONFIG DONE** (file written + validated, never executed on real infra) · ⬜ **REMAINING**

| # | Deliverable (from professor's email) | Status | Evidence / Gap |
|---|---|---|---|
| 1 | Working Application (Web/Dashboard/API) | ✅ DONE & LIVE | 3 services up: frontend `:3100`, backend `:8000`, AI `:8001`. 6 drones, live AI threat flagging. |
| 2 | Source Code Repository (GitHub) | ✅ DONE & LIVE | 8 commits pushed. **⚠ repo is PRIVATE — grader can't see it.** |
| 3 | Dockerfile and Docker Images | ✅ **DONE & PUBLISHED** | 3 multi-stage Dockerfiles + compose. CI builds all 3 green and **pushes to GHCR** (`ghcr.io/anshumanatrey/terramind-*`). |
| 4 | Jenkins CI/CD Pipeline | 🟡 CONFIG | `jenkins/Jenkinsfile` (declarative, 5 stages). Never run on a Jenkins server. *GitHub Actions CI IS green & live — bonus.* |
| 5 | Terraform Infrastructure Scripts | 🟡 CONFIG | `terraform/` full module set. `terraform validate` passes. Never `apply`'d. |
| 6 | Kubernetes Deployment Files | ✅ **DONE & DEPLOYED** | `.github/workflows/deploy.yml` spins a real `kind` cluster on every push, deploys the full stack — **all pods Running**, in-cluster smoke test passes (backend/ai/frontend healthy, live swarm snapshot from inside k8s), **HPA autoscaling proven** (`cpu:3%/60%`, scaled 1→3). Evidence artifact `k8s-deploy-evidence`. |
| 7 | Monitoring (Prometheus + Grafana) | ✅ **DONE & LIVE** | `monitoring/local-stack/` — Prometheus scrapes the live app (all targets UP), Grafana renders the dashboard on real data (6 drones, 3897 neutralized). Evidence: `docs/DEMO-EVIDENCE.md`. |
| 8 | Logging (ELK Stack) | 🟡 CONFIG | ES/Kibana/Filebeat values written. Never ran. |
| 9 | Secret Management (Vault) | ✅ **DONE & LIVE** | Vault dev server running; real TokenRouter key stored at `terramind/ai-service` (KV-v2) + least-privilege read-only policy. Reproduce: `monitoring/local-stack/start.sh`. |
| 10 | Architecture Diagram | ✅ DONE | `docs/architecture.md` (Mermaid). |
| 11 | Deployment Diagram | ✅ DONE | `docs/deployment.md` (Mermaid). |
| 12 | Disaster Recovery Plan | ✅ **DONE + LIVE DEMO** | `disaster-recovery/DR-PLAN.md` + `dr-demo.sh` — validated live: AI killed → degraded (`online=0`, swarm still flying) → restarted → recovered (`online=1`) in ~25s. |
| 13 | **Demonstration Screenshots** | ⬜ **REMAINING** | **Zero captured. This is the one true gap — and it's the artifact that proves all the others.** |
| 14 | Project Documentation | ✅ DONE | Root `README.md` + per-component READMEs. |

**Tally (updated 2026-06-17): 10 live ✅ · 3 config-only 🟡 · 1 missing ⬜.** Monitoring (#7) and Vault (#9) run live locally; DR (#12) is a validated live demo; **K8s (#6) now actually deploys on GitHub's runner (kind) with HPA scaling, and images (#3) publish to GHCR** — GitHub Actions is the free "server" for the heavy stack. Remaining config-only: Jenkins (#4), Terraform (#5 — validated; could `apply` via the same kind cluster next), ELK (#8 — heaviest). The one true gap is still #13 screenshots (grab from your browser; CI evidence is auto-uploaded as an artifact).

---

## 2. What to do — prioritized by impact ÷ effort (constraint-aware: 8GB RAM, ~4GB disk, Colima)

### P0 — cheap + high impact, do these first
- [ ] **Make repo accessible to grader.** `gh repo edit --visibility public` OR add professor as collaborator. *(30 sec, blocks everything else from being graded.)*
- [ ] **Capture the app money-shot** → screenshots + a short GIF: live swarm over Norfolk satellite → drone reaches carrier pier → AI flags at 95% → interceptor neutralizes. *(Kills the biggest chunk of #13 AND showcases the wow feature. App is already running.)*
- [x] **Run Vault dev server live** — DONE. Real TokenRouter key in Vault KV-v2 + read-only policy. `monitoring/local-stack/start.sh`.
- [x] **Run Prometheus + Grafana** scraping the live app — DONE. All targets UP, dashboard on real data. `monitoring/local-stack/` + `tunnel.sh`.
- [ ] **Screenshot the green GitHub Actions runs** (already real & passing) as live CI/CD evidence. *(Free — grab from https://github.com/AnshumanAtrey/terramind/actions.)*

### P1 — medium effort, fills the remaining "config-only" rows
- [ ] **Jenkins**: run `jenkins/jenkins:lts` in Docker once, point at the repo, screenshot a green pipeline. *(If disk is tight, present GitHub Actions as the live CI and the Jenkinsfile as the portable/declarative config — defensible.)*
- [ ] **Kubernetes**: spin a single `k3d`/Kind cluster, apply just the AI-service pod to prove manifests work, screenshot `kubectl get pods`. *(If the full stack won't fit, screenshot kubeconform passing on all 7 — already validated.)*
- [ ] **ELK**: minimal memory-capped `elasticsearch` + `kibana` (`ES_JAVA_OPTS=-Xms256m -Xmx256m`), pipe one backend log line in, screenshot Kibana. *(Heaviest on disk — if it won't fit, present as config-only and say so honestly. Don't fake it.)*

### P2 — presentation polish (this is what makes it *easy and effective* to present)
- [x] **LIVE Disaster Recovery demo** — DONE & validated. `disaster-recovery/dr-demo.sh`: kill `ai-service` → `ai_engine_online` gauge → 0, swarm + UI stay up → restart → recovers to 1 in ~25s. Turns #12 from a PDF into a live act. Directly answers *"simulate analytics pipeline failure."*
- [ ] **Live "watch marker" add** during the demo: type a new natural-language marker, watch a new detection type appear on the map. Interactive = memorable to a judge.
- [ ] **One-command boot**: `start-all.sh` / `make demo` that launches all 3 services so the examiner sees the system in 10 seconds, not 3 terminals of fumbling.
- [ ] **`DEMO.md` presentation script**: for each of the 14 deliverables — the exact command, what to point the examiner at, and the one-line viva answer. (Pairs with `viva_questions.md`.)

---

## 3. Presentation walkthrough — the order to tell the story

Don't present the 14 deliverables in the professor's list order. Present them as a **narrative**, with the app as the hook and the DevOps lifecycle wrapped around it:

1. **The hook (30s):** Open the app. Live drone swarm over real Norfolk satellite imagery. "This is a government defence geospatial platform — autonomous drone swarm command."
2. **The AI brain (1 min):** Show watch markers → recon drones sweep the AO → one reaches a real carrier → MiniMax-M3 flags it at 95% on the real ship → interceptor vectors in and neutralizes. *Add a live marker to prove it's not scripted.*
3. **Resilience, live (30s):** Kill the AI service. App keeps flagging on fallback. Restart. It recovers. "That's Disaster Recovery, demonstrated — not just documented."
4. **The DevOps lifecycle around it (the deliverable sweep):** Docker images → CI green checks (GitHub Actions live + Jenkinsfile) → Terraform → K8s manifests → **Grafana live dashboard** → ELK → **Vault live secret fetch**. Each one: 20 seconds, point at the running thing or the validated config.
5. **The backing documents:** architecture + deployment diagrams, DR plan, docs — "everything an ops team needs to run this."

The arc is: **a real product → with a real AI feature → that survives failure → wrapped in a real DevOps pipeline.** That beats "here are 14 folders."

---

## 4. Honest caveats to keep (rigor, not hype)

- "Config validated" ≠ "deployed in production." Where something only validates, **say so** — examiners respect "here's the manifest, kubeconform-clean; I ran X live and have the rest as portable config" far more than a bluff that collapses under one question.
- The AI runs on a free TokenRouter key with a deterministic mock fallback — that's a feature (graceful degradation), state it as one.
- Machine constraints (8GB RAM, ~4GB disk, Colima) are why the heavy stacks are config-first. That's a legitimate engineering tradeoff, not a shortcut — own it.
