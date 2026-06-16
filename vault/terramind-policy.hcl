# Least-privilege: the ai-service may only READ its own secret path.
path "secret/data/terramind/ai" {
  capabilities = ["read"]
}
