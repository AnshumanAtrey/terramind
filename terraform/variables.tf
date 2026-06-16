variable "kubeconfig" {
  description = "Path to kubeconfig"
  type        = string
  default     = "~/.kube/config"
}

variable "kube_context" {
  description = "kubectl context for the Kind cluster"
  type        = string
  default     = "kind-terramind"
}

variable "platform_namespaces" {
  description = "Namespaces for the platform services added in later phases"
  type        = list(string)
  default     = ["monitoring", "logging", "vault"]
}
