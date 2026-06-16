# Platform namespaces for the monitoring / logging / vault phases.
# (The application namespace `terramind` is owned by ../kubernetes manifests.)
resource "kubernetes_namespace" "platform" {
  for_each = toset(var.platform_namespaces)
  metadata {
    name = each.key
    labels = {
      "app.kubernetes.io/part-of" = "terramind"
      "managed-by"                = "terraform"
    }
  }
}
