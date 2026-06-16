# ingress-nginx — routes external traffic to the TerraMind services.
# Configured for Kind: binds to the control-plane node via hostPort 80/443
# (mapped to host 8080/8443 in kind-config.yaml).
resource "helm_release" "ingress_nginx" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  namespace        = "ingress-nginx"
  create_namespace = true
  wait             = true
  timeout          = 600

  set {
    name  = "controller.hostPort.enabled"
    value = "true"
  }
  set {
    name  = "controller.service.type"
    value = "NodePort"
  }
  set {
    name  = "controller.nodeSelector.ingress-ready"
    value = "true"
    type  = "string"
  }
  set {
    name  = "controller.tolerations[0].key"
    value = "node-role.kubernetes.io/control-plane"
  }
  set {
    name  = "controller.tolerations[0].operator"
    value = "Equal"
  }
  set {
    name  = "controller.tolerations[0].effect"
    value = "NoSchedule"
  }
  set {
    name  = "controller.watchIngressWithoutClass"
    value = "true"
  }
  # Admission webhook is flaky to become ready on a fresh Kind node; disabling it
  # keeps `kubectl apply` of Ingress resources reliable for the demo.
  set {
    name  = "controller.admissionWebhooks.enabled"
    value = "false"
  }
}
