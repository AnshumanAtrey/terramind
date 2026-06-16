# metrics-server — provides CPU/memory metrics that the HorizontalPodAutoscalers
# need to scale the backend / ai-service. Kind requires --kubelet-insecure-tls.
resource "helm_release" "metrics_server" {
  name       = "metrics-server"
  repository = "https://kubernetes-sigs.github.io/metrics-server/"
  chart      = "metrics-server"
  namespace  = "kube-system"
  wait       = true
  timeout    = 300

  set {
    name  = "args[0]"
    value = "--kubelet-insecure-tls"
  }
}
