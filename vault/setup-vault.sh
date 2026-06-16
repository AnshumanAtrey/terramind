#!/usr/bin/env bash
# Configure Vault to hold the TokenRouter key and hand it to the ai-service pod.
# Prereq:  kubectl -n vault port-forward svc/vault 8200:8200   (in another shell)
set -euo pipefail

export VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
export VAULT_TOKEN="${VAULT_TOKEN:-root}"

echo "==> enable KV v2 at secret/"
vault secrets enable -path=secret kv-v2 2>/dev/null || echo "   (already enabled)"

echo "==> store the TokenRouter key (from ../ai-service/.env)"
KEY="$(grep '^TOKENROUTER_API_KEY' ../ai-service/.env | cut -d= -f2-)"
vault kv put secret/terramind/ai TOKENROUTER_API_KEY="$KEY"

echo "==> write the least-privilege policy"
vault policy write terramind-ai ./terramind-policy.hcl

echo "==> enable + configure Kubernetes auth"
vault auth enable kubernetes 2>/dev/null || echo "   (already enabled)"
vault write auth/kubernetes/config kubernetes_host="https://kubernetes.default.svc"

echo "==> bind the terramind-ai ServiceAccount to the policy"
vault write auth/kubernetes/role/terramind-ai \
  bound_service_account_names=terramind-ai \
  bound_service_account_namespaces=terramind \
  policies=terramind-ai \
  ttl=1h

echo "==> done. Now apply vault/ai-service-injected.yaml to roll the pod with injection."
