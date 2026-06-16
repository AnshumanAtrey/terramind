# Secret Management — HashiCorp Vault

The TerraMind / MiniMax-M3 API key is **never** committed and **never** baked into an
image. Locally it lives in `ai-service/.env` (gitignored); in Kubernetes it lives in
Vault and is injected into the ai-service pod at runtime.

```
Vault (secret/terramind/ai) ──auth: k8s ServiceAccount──▶ Vault Agent sidecar
                                                              │ renders template
                                                              ▼
                                            /vault/secrets/ai-config  (in pod)
                                                              │ sourced at startup
                                                              ▼
                                            ai-service  env TOKENROUTER_API_KEY
```

## Deploy
```bash
helm repo add hashicorp https://helm.releases.hashicorp.com && helm repo update
helm install vault hashicorp/vault -n vault --create-namespace -f vault/vault-values.yaml

# configure Vault (port-forward in another shell first)
kubectl -n vault port-forward svc/vault 8200:8200 &
cd vault && ./setup-vault.sh

# swap the static-Secret ai-service for the Vault-injected one
kubectl apply -f vault/ai-service-injected.yaml
kubectl -n terramind delete secret terramind-ai-secret   # no longer needed
```

## Verify the injection
```bash
kubectl -n terramind get pod -l app=ai-service        # 2/2 (app + vault-agent)
kubectl -n terramind exec deploy/ai-service -c ai-service -- env | grep TOKENROUTER
kubectl -n terramind logs deploy/ai-service -c ai-service | grep -i minimax
```
The `/info` endpoint should report `"live": true` — the key arrived from Vault, not
from any file in the repo or image.

> Dev-mode Vault (root token, in-memory) is for the demo only. Production uses
> standalone/HA Vault with real unseal keys and a scoped token.
