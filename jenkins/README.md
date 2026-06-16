# Jenkins CI/CD — TerraMind

Declarative pipeline (`Jenkinsfile`) that takes a push on `main` all the way to a
running Kubernetes deployment.

## Pipeline stages
1. **Checkout** — pull the repo (GitHub webhook trigger).
2. **Static Analysis** (parallel) — `terraform validate`, `kubeconform` on the K8s
   manifests, `ruff` on the Python services.
3. **Build images** — Docker build for ai-service, backend, frontend (frontend gets
   `NEXT_PUBLIC_API_URL` as a build arg).
4. **Security scan** — Trivy scans each image for HIGH/CRITICAL CVEs (SAST/image scan,
   maps to the *Security in DevOps* module).
5. **Push** — tag + push all three images to Docker Hub.
6. **Deploy** — create/refresh the `terramind-ai-secret` from a Jenkins credential
   (never in git), `kubectl apply -f kubernetes/`, roll the new image tags, wait for rollout.
7. **Smoke test** — in-cluster `curl` of the backend `/health`.

## Run Jenkins locally (Docker)
```bash
docker run -d --name jenkins -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts
# unlock with: docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```
Install the **Docker Pipeline**, **Kubernetes CLI**, and **Git** plugins. Add the
`kubectl`, `terraform`, `kubeconform`, and `trivy` binaries to the agent (or use a
custom agent image).

## Required credentials (Manage Jenkins → Credentials)
| ID | Kind | Purpose |
|----|------|---------|
| `dockerhub-creds` | Username/Password | push images |
| `kubeconfig` | Secret file | cluster access for deploy |
| `tokenrouter-key` | Secret text | seeds the `terramind-ai-secret` |

## Webhook
GitHub repo → Settings → Webhooks → `http://<jenkins-host>:8080/github-webhook/`,
content type `application/json`, event: push. Enable *GitHub hook trigger* on the job.
