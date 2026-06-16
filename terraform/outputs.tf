output "platform_namespaces" {
  description = "Namespaces created for the platform services"
  value       = [for ns in kubernetes_namespace.platform : ns.metadata[0].name]
}

output "ingress_endpoint" {
  description = "Where the TerraMind platform is reachable"
  value       = "http://localhost:8080"
}

output "ingress_release" {
  value = helm_release.ingress_nginx.status
}
