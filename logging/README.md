# Centralized Logging — ELK Stack

Elasticsearch + Kibana + Filebeat. Filebeat runs as a DaemonSet, tails every
container's logs, enriches them with Kubernetes metadata, filters to the
`terramind` namespace, and ships them to Elasticsearch under the `terramind-*`
index. Kibana visualizes them.

```
[ pods ] → stdout/stderr → /var/log/containers/*.log
                                  │
                            Filebeat (DaemonSet)
                                  │  + k8s metadata, namespace=terramind
                                  ▼
                          Elasticsearch (terramind-*)
                                  │
                                Kibana
```

## Deploy
```bash
helm repo add elastic https://helm.elastic.co && helm repo update

helm install elasticsearch elastic/elasticsearch -n logging --create-namespace \
  -f logging/elasticsearch-values.yaml
helm install kibana elastic/kibana -n logging -f logging/kibana-values.yaml
helm install filebeat elastic/filebeat -n logging -f logging/filebeat-values.yaml

# Kibana → create data view "terramind-*"
kubectl -n logging port-forward svc/kibana-kibana 5601:5601   # http://localhost:5601
```

## What to show
- The AI **detection log** lines from the backend (`AI-CORE CONFIRMED: …`) and the
  interceptor events (`LANCE-2 Target … neutralized`) flowing into Kibana.
- Filter `kubernetes.labels.app: ai-service` to watch the vision service's logs.

> ⚠️ **Resource note:** Elasticsearch alone wants ~1–1.5 GB RAM. On the 8 GB demo
> machine, bring the app stack down first, run ELK on its own, capture the Kibana
> screenshots, then tear it back down. This is why the project default ships logs
> here but does not run ELK concurrently with monitoring + the app.
