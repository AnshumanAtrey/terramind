#!/usr/bin/env bash
# Run the Terraform platform layer locally against a kind cluster (deliverable #5, LIVE).
# Provisions: monitoring/logging/vault namespaces + metrics-server + ingress-nginx.
# Lightweight — fits a small Colima VM. Run from the repo root or terraform/.
#
#   ./terraform/run-local.sh          # create cluster + apply + show
#   ./terraform/run-local.sh destroy  # tear it all down
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
CLUSTER=terramind

if [ "${1:-}" = "destroy" ]; then
  cd "$HERE"
  terraform destroy -auto-approve -var "kube_context=kind-${CLUSTER}" || true
  kind delete cluster --name "$CLUSTER" || true
  exit 0
fi

echo "== 1/3  kind cluster (ingress-ready node) =="
kind get clusters 2>/dev/null | grep -qx "$CLUSTER" || \
  kind create cluster --name "$CLUSTER" --config "$REPO/kind/kind-config.yaml"

echo "== 2/3  terraform init + apply =="
cd "$HERE"
terraform init -input=false
terraform apply -auto-approve -input=false -var "kube_context=kind-${CLUSTER}"

echo "== 3/3  what Terraform provisioned =="
kubectl get ns monitoring logging vault
kubectl -n kube-system get deploy metrics-server
kubectl -n ingress-nginx get deploy,svc
echo "--- terraform state ---"
terraform state list
echo "Done. Tear down with: ./terraform/run-local.sh destroy"
