# TerraMind — Webinar Spin-Up Runbook

Everything is one command. Do a **dry run once** before the webinar (some images pull on
first use). Order below is the fastest path to "all 14 deliverables demonstrated live."

> **Colima port-forward:** Docker services (Grafana, Vault, Jenkins, Kibana, Loki) aren't
> reachable from your Mac browser until you run the tunnel. Native app ports (3100/8000/8001)
> need no tunnel. One tunnel covers everything:
> ```
> ./monitoring/local-stack/tunnel.sh &
> ```

---

## Step 0 — Make the repo public (you run this; I can't change repo access for you)
```
gh repo edit AnshumanAtrey/terramind --visibility public --accept-visibility-change-consequences
```
Needed for: the grader to see it, the Jenkins job to clone over https, and GHCR packages to be visible.

## Step 1 — App + Monitoring + Vault (the core live demo) — ~2 min
```
# app: 3 native services (already your normal run)
#   frontend :3100   backend :8000   ai-service :8001
cd monitoring/local-stack && ./start.sh        # Prometheus + Grafana + Vault, wired to the live app
cd ../.. && ./monitoring/local-stack/tunnel.sh &
```
Show: app `localhost:3100`, Grafana `localhost:3000` (admin/terramind), Vault `localhost:8200/ui` (token `terramind-root`).

## Step 2 — Jenkins (deliverable #4) — ~3 min first build
```
./jenkins/run-jenkins.sh        # builds image + boots Jenkins, wizard pre-skipped
```
Tunnel covers 8081. Open `localhost:8081` (admin/admin) → job **terramind-ci** → **Build Now**
→ watch Checkout + Terraform validate + kubeconform + lint go green. Screenshot the stage view.

## Step 3 — Terraform apply (deliverable #5) — ~3 min
```
./terraform/run-local.sh        # kind cluster + terraform apply (namespaces + metrics-server + ingress-nginx)
```
Show the terminal: `terraform apply` creating real resources, then `terraform state list`.
(Also proven green in CI: the **terraform-apply** GitHub Action.) Tear down: `./terraform/run-local.sh destroy`.

## Step 4 — Logging (deliverable #8) — pick ONE
**ELK (the spec — use this for the grade):** heavy (~2 GB). Give Colima room first:
```
colima stop && colima start --cpu 4 --memory 6     # then re-run Steps 1-3 as needed
./logging/run-elk.sh
```
Tunnel covers 5601. Kibana `localhost:5601` → Data View `terramind-logs-*` → Discover. Screenshot.

**Loki (bonus, light ~200 MB):** if the laptop is tight, show this live and present ELK as the spec config.
```
./logging/run-loki.sh
```
Grafana → add Loki datasource `http://loki:3100` → Explore → `{job="terramind"}`.

## Step 5 — Public URL (Vercel) + optional real backend (Render)
**Vercel (frontend, sim mode, always-on, free):**
```
npm i -g vercel && vercel login        # you authenticate
cd frontend && vercel --prod
```
**Render (optional — only if you want the public URL to run the REAL AI, not the sim):**
Render → New → Blueprint → pick the repo (uses `render.yaml`) → set the `TOKENROUTER_API_KEY` secret.
Then rebuild Vercel with `NEXT_PUBLIC_API_URL` = the Render backend URL. See `HOSTING.md`.

---

## My recommendations (you asked)

**Loki or ELK?** → **Use ELK for the deliverable.** The brief says "Logging using ELK Stack" verbatim —
a grader checking the list wants to see ELK, so don't hand them a reason to dock the mark. Loki is
genuinely better engineering (10× lighter, one Grafana for metrics+logs), so I gave you `run-loki.sh`
too — show it as *"what we'd run in production"*. Lead with ELK; mention Loki as the upgrade.

**Render + Vercel?** → **Vercel yes, Render optional.** Vercel hosts the frontend sim free + always-on —
that's your permanent clickable link, zero risk. Render only earns its keep if you want the professor to
click a link and see the *real* MiniMax-M3 AI (not the sim). The catch: Render free idles after 15 min and
needs a Vercel rebuild to point at it — more live-failure surface. For the webinar I'd **screen-share the
real stack running locally** (snappier, you control it) and keep the Vercel link as the public artifact.
Spin up Render only if a real-AI public URL is specifically required.

---

## Screenshots to capture (deliverable #13) — the last gap
1. App `:3100` — swarm map, zoom a carrier-pier flag (the money shot) + a threat popup with AI confidence
2. Grafana `:3000` — live dashboard
3. Vault `:8200/ui` — the stored secret
4. Jenkins `:8081` — green pipeline stage view
5. Terraform — terminal showing `apply` + `state list` (and the green `terraform-apply` Action)
6. Kibana `:5601` (or Grafana/Loki) — a real log line
7. GitHub Actions — green `deploy` run + the `k8s-deploy-evidence` artifact
8. The live DR demo terminal (`./disaster-recovery/dr-demo.sh`)

After these, all 14 deliverables are *demonstrated*, not just submitted.
