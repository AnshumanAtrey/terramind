# TerraMind — Deployment Topology

Kubernetes view: how the workloads, platform services, and CI/CD fit together.

```mermaid
flowchart TB
  subgraph Dev["Developer / GitHub"]
    GH["GitHub repo<br/>(push to main)"]
    JK["Jenkins<br/>build · Trivy scan · push · deploy"]
    DH["Docker Hub<br/>3 images"]
  end

  GH -- webhook --> JK
  JK -- push --> DH
  JK -- kubectl apply --> ING

  subgraph Cluster["Kubernetes (Kind / any)"]
    direction TB
    ING["ingress-nginx<br/>:80 → :8080 host"]

    subgraph NS["namespace: terramind"]
      FE["frontend Deploy ×2"]
      BE["backend Deploy ×1<br/>(singleton)"]
      AI["ai-service Deploy ×1..5<br/>(HPA on CPU)"]
      PG[("postgres + PVC")]
      SEC["Secret / Vault-injected key"]
    end

    subgraph MON["namespace: monitoring"]
      PR["Prometheus"]
      GR["Grafana"]
    end
    subgraph LOG["namespace: logging"]
      ES["Elasticsearch"]
      KB["Kibana"]
      FB["Filebeat DaemonSet"]
    end
    subgraph VLT["namespace: vault"]
      VA["Vault + Agent Injector"]
    end

    ING -- "/" --> FE
    ING -- "/api" --> BE
    BE --> AI
    BE --> PG
    AI -. key .- SEC
    SEC -. supplied by .- VA
    PR -- scrape /metrics --> BE
    PR -- scrape /metrics --> AI
    GR --> PR
    FB -- pod logs --> ES
    KB --> ES
  end

  DH -. pulled by .-> FE
  DH -. pulled by .-> BE
  DH -. pulled by .-> AI
```

## Layers
| Layer | Owns | Tooling |
|-------|------|---------|
| **Platform** | ingress-nginx, metrics-server (HPA), monitoring/logging/vault namespaces | **Terraform** (`terraform/`) |
| **Application** | namespace `terramind`, Postgres, the 3 services, ingress, HPA | **kubectl** manifests (`kubernetes/`) |
| **CI/CD** | build → scan → push → deploy → smoke test | **Jenkins** (`jenkins/Jenkinsfile`) |
| **Observability** | metrics + dashboards | Prometheus + Grafana (`monitoring/`) |
| **Logging** | centralized container logs | ELK + Filebeat (`logging/`) |
| **Secrets** | the MiniMax-M3 key | Vault injection (`vault/`) |

## Access (local Kind)
- Console → `http://localhost:8080/`
- Backend API → `http://localhost:8080/api/command/snapshot`
- Grafana → `kubectl -n monitoring port-forward svc/kps-grafana 3001:80`
- Kibana → `kubectl -n logging port-forward svc/kibana-kibana 5601:5601`
