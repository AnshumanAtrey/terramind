# DevOps Viva Questions — 50 Questions

> Focused on topics outside basic GitHub / full-stack / E2E (End-to-End) testing knowledge.
> All short forms have their full forms in brackets.

---

## Module 1 — DevOps Fundamentals

**Q1. What is the DevOps lifecycle and what are its key phases?**

The DevOps lifecycle is a continuous loop of: Plan → Code → Build → Test → Release → Deploy → Operate → Monitor. Unlike traditional waterfall, each phase feeds back into the next without a hard stop. The key idea is that Dev (Development) and Ops (Operations) teams share ownership across all phases instead of throwing work over the wall.

---

**Q2. What is CI/CD (Continuous Integration / Continuous Delivery or Deployment) and what is the difference between Continuous Delivery and Continuous Deployment?**

- **CI (Continuous Integration):** Every code commit triggers an automated build + test pipeline.
- **Continuous Delivery:** Code is always in a deployable state; deployment to production still needs a manual click/approval.
- **Continuous Deployment:** Every passing build is automatically deployed to production with zero manual intervention.

The difference matters: Continuous Delivery = automated readiness, Continuous Deployment = automated release.

---

**Q3. What is the "shift-left" principle in DevOps?**

Shift-left means moving testing, security checks, and quality gates earlier in the SDLC (Software Development Life Cycle) — towards the development phase — rather than discovering issues late at release time. E.g., running SAST (Static Application Security Testing) on every commit instead of only before production release.

---

## Module 2 — Version Control (Advanced Git)

**Q4. What is the difference between `git rebase` and `git merge`? When would you use rebase?**

- **Merge** creates a new merge commit that joins two branch histories — history stays non-linear.
- **Rebase** replays your commits on top of another branch — history stays linear, cleaner log.

Use rebase for feature branches before merging into main to keep a clean history. Never rebase shared/public branches — it rewrites commit hashes and breaks collaborators' copies.

---

**Q5. What is a Git hook and give one practical DevOps use case for it?**

Git hooks are scripts that run automatically at specific Git lifecycle events (pre-commit, pre-push, post-merge, etc.). A practical DevOps use case: a `pre-commit` hook that runs a linter or unit tests before allowing a commit, enforcing code quality locally before code ever reaches CI (Continuous Integration).

---

**Q6. What is the difference between GitLab and GitHub, and what does GitLab offer that GitHub doesn't natively?**

GitHub is primarily a hosting platform with Actions for CI/CD. GitLab is a full DevOps platform — it bundles source control + CI/CD pipelines + container registry + security scanning + monitoring hooks all in one product. GitLab's `.gitlab-ci.yml` pipelines run natively without needing a third-party tool like Jenkins.

---

## Module 3 — CI (Continuous Integration) — Jenkins & GitLab CI

**Q7. What is a Jenkinsfile and what are the two ways to write one?**

A Jenkinsfile defines a Jenkins pipeline as code stored in the repo. Two syntaxes:
- **Declarative pipeline:** structured YAML-like syntax with `pipeline { }` block — easier to read.
- **Scripted pipeline:** Groovy-based, starts with `node { }` — more flexible but verbose.

Storing the Jenkinsfile in the repo means the pipeline is version-controlled alongside the code.

---

**Q8. What are Jenkins agents (slaves) and why are they used?**

A Jenkins agent (also called a slave or node) is a machine that executes pipeline jobs on behalf of the Jenkins master (controller). Agents are used to:
- Distribute builds across multiple machines to run jobs in parallel.
- Run builds on specific OS (Operating System) environments (Linux, Windows, etc.).
- Avoid overloading the master with heavy build tasks.

---

**Q9. What is the difference between a pipeline stage and a pipeline step in Jenkins?**

- **Stage:** A logical grouping shown in the Jenkins UI (User Interface) — e.g., `Build`, `Test`, `Deploy`. Stages make pipeline progress human-readable.
- **Step:** The actual command or action inside a stage — e.g., `sh 'mvn clean package'` or `docker build`.

Multiple steps execute inside one stage.

---

**Q10. What is GitLab CI/CD (Continuous Integration / Continuous Deployment) and what is the `.gitlab-ci.yml` file?**

GitLab CI/CD is GitLab's built-in pipeline system. The `.gitlab-ci.yml` file lives at the repo root and defines all pipeline jobs, stages, and rules. When a commit is pushed, GitLab automatically reads this file and triggers the pipeline. Jobs run inside Docker containers on GitLab runners — no separate Jenkins server needed.

---

## Module 4 — IaC (Infrastructure as Code) & Configuration Management

**Q11. What is IaC (Infrastructure as Code) and what problem does it solve?**

IaC means defining and provisioning infrastructure (servers, networks, databases) through code files rather than manual clicks in a cloud console. Problems it solves:
- **Consistency:** Same code → same environment every time, no "works on my machine."
- **Version control:** Infrastructure changes are tracked in Git like application code.
- **Repeatability:** Spin up identical staging + production environments from the same file.

---

**Q12. What is Ansible and how is it different from Terraform?**

- **Ansible:** A configuration management tool — it manages what's *running on* existing servers (install packages, configure files, deploy apps). It's agentless (uses SSH/WinRM — Windows Remote Management). Uses YAML (Yet Another Markup Language) Playbooks.
- **Terraform:** An infrastructure provisioning tool — it creates/destroys the servers themselves (EC2 (Elastic Compute Cloud) instances, VPCs (Virtual Private Clouds), databases). Uses HCL (HashiCorp Configuration Language).

Simple rule: Terraform builds the house, Ansible furnishes it.

---

**Q13. What is an Ansible Playbook and what is a Role in Ansible?**

- **Playbook:** A YAML file that defines a series of tasks to run on target hosts. E.g., install Nginx, copy a config file, restart the service.
- **Role:** A structured, reusable folder layout that organizes tasks, handlers, templates, and variables. Instead of one giant Playbook, you split it into roles (e.g., `webserver`, `database`) and reuse them across different Playbooks.

---

**Q14. What is Puppet and how does it differ from Ansible?**

Puppet is a declarative configuration management tool where you define the *desired state* of a system (using Puppet's DSL — Domain Specific Language called Puppet Manifests), and Puppet's agent on each machine continuously enforces that state. Key difference from Ansible: Puppet requires an agent installed on every managed node and uses a pull model (agents check the Puppet master periodically). Ansible is push-based and agentless.

---

**Q15. What is idempotency in the context of configuration management tools like Ansible?**

Idempotency means running the same task multiple times produces the same result as running it once — no side effects on repeat runs. E.g., an Ansible task that installs Nginx won't reinstall or error if Nginx is already installed; it simply checks "is the desired state met?" and skips if yes. This is critical for safely re-running playbooks without breaking production.

---

## Module 5 & 6 — Docker & Kubernetes

**Q16. What is the difference between a Docker image and a Docker container?**

- **Image:** A read-only template (like a class in OOP — Object Oriented Programming). Built from a Dockerfile, stored in a registry.
- **Container:** A running instance of an image (like an object). It has its own isolated filesystem, network, and process space.

You can run multiple containers from the same image simultaneously.

---

**Q17. What is a Dockerfile and what do the `COPY`, `RUN`, and `CMD` instructions do?**

A Dockerfile is a script of instructions to build a Docker image.
- `COPY` — copies files from the host machine into the image filesystem.
- `RUN` — executes a command during the image build (e.g., `RUN npm install`). Creates a new layer.
- `CMD` — defines the default command that runs when a container starts (not during build). Can be overridden at runtime.

---

**Q18. What is Docker Compose and when would you use it over plain Docker commands?**

Docker Compose lets you define and run multi-container applications using a single `docker-compose.yml` file. Instead of running separate `docker run` commands for a web server, database, and Redis cache, you define all three as services and bring them up with `docker-compose up`. Used for local development environments and simple multi-service setups. For production scale, Kubernetes takes over.

---

**Q19. What is a Docker volume and why is it needed?**

By default, data written inside a container is lost when the container stops — containers are ephemeral. A Docker volume is a persistent storage mechanism managed by Docker, mounted into the container. Data written to the volume survives container restarts and deletions. Used for databases, log files, and any state that must persist.

---

**Q20. What is Kubernetes and what problem does it solve that Docker alone cannot?**

Kubernetes (K8s) is a container orchestration platform. Docker runs individual containers; Kubernetes manages containers at scale across a cluster of machines. Problems it solves:
- **Scheduling:** Decides which node (machine) to run a container on.
- **Self-healing:** Restarts crashed containers, replaces unhealthy ones.
- **Scaling:** Auto-scales pods based on CPU (Central Processing Unit)/memory usage.
- **Load balancing:** Distributes traffic across pod replicas.
- **Rolling updates:** Deploys new versions without downtime.

---

**Q21. What are Kubernetes Pods, Deployments, and Services? How do they relate?**

- **Pod:** The smallest deployable unit in K8s (Kubernetes) — one or more containers that share network and storage.
- **Deployment:** A controller that manages a set of identical Pods — handles rolling updates, scaling, and rollbacks. You rarely create Pods directly.
- **Service:** A stable network endpoint (IP + DNS name) that routes traffic to a set of Pods. Pods come and go; the Service address stays constant.

---

**Q22. What is `kubectl` and what are 3 commonly used `kubectl` commands?**

`kubectl` is the CLI (Command Line Interface) tool to interact with a Kubernetes cluster.
- `kubectl get pods` — list all pods in the current namespace.
- `kubectl describe pod <name>` — detailed info about a pod (events, status, container states).
- `kubectl apply -f <file.yaml>` — create or update resources from a YAML manifest file.

---

**Q23. What is a Kubernetes ConfigMap and a Secret? What is the difference?**

- **ConfigMap:** Stores non-sensitive configuration data as key-value pairs (e.g., database hostname, feature flags). Injected into pods as environment variables or files.
- **Secret:** Stores sensitive data (passwords, API keys, TLS certificates) — values are base64-encoded and access can be restricted via RBAC (Role-Based Access Control).

Key difference: Secrets have additional security controls; ConfigMaps are plaintext.

---

**Q24. What is Kubernetes autoscaling? What is HPA (Horizontal Pod Autoscaler)?**

Kubernetes autoscaling automatically adjusts the number of running pods based on demand.
- **HPA (Horizontal Pod Autoscaler):** Scales the *number* of pod replicas based on observed CPU/memory or custom metrics. E.g., if CPU exceeds 70%, add more replicas.
- **VPA (Vertical Pod Autoscaler):** Adjusts the *resource limits* of existing pods.
- **Cluster Autoscaler:** Adds or removes entire nodes from the cluster.

---

## Module 7 — Infrastructure Provisioning (Terraform & CloudFormation)

**Q25. What is Terraform state and why is it important?**

Terraform maintains a state file (`terraform.tfstate`) that maps your Terraform configuration to the real-world infrastructure. It uses this file to determine what needs to be created, updated, or destroyed on the next `terraform apply`. Without state, Terraform can't know what already exists. In teams, state is stored remotely (e.g., in AWS S3 + DynamoDB for locking) to avoid conflicts between multiple engineers running Terraform simultaneously.

---

**Q26. What is the difference between `terraform plan` and `terraform apply`?**

- `terraform plan` — dry run. Shows what changes Terraform *would* make (create, modify, destroy) without actually making them. Safe to run anytime.
- `terraform apply` — executes the plan and makes the real changes to infrastructure.

Best practice: always review `plan` output before running `apply` in production.

---

**Q27. What is HCL (HashiCorp Configuration Language) and how does it differ from YAML?**

HCL is Terraform's native configuration language — designed specifically for defining infrastructure. Unlike YAML (Yet Another Markup Language) which is a generic data serialization format, HCL supports expressions, functions, loops (`for_each`, `count`), and modules natively. It's more declarative and readable for infrastructure definitions than YAML but has tighter scope.

---

**Q28. What is AWS CloudFormation and how does it differ from Terraform?**

CloudFormation is AWS's (Amazon Web Services) native IaC (Infrastructure as Code) service — you define stacks in YAML or JSON and AWS manages the provisioning. Key differences from Terraform:
- CloudFormation is AWS-only. Terraform is multi-cloud (AWS, Azure, GCP (Google Cloud Platform), etc.).
- CloudFormation state is managed by AWS automatically. Terraform state must be managed by you.
- Terraform has a larger provider ecosystem; CloudFormation only covers AWS resources.

---

## Module 8 — Monitoring & Logging

**Q29. What is Prometheus and what is its data model?**

Prometheus is an open-source monitoring and alerting toolkit. Its data model is time-series based — metrics are stored as (metric\_name + labels) → value over time. Prometheus uses a **pull model**: it scrapes metrics from `/metrics` HTTP endpoints on your services at regular intervals. Metrics types include: Counter, Gauge, Histogram, Summary.

---

**Q30. What is Grafana and how does it relate to Prometheus?**

Grafana is a visualization and dashboarding tool. It connects to data sources (Prometheus, ELK (Elasticsearch, Logstash, Kibana), CloudWatch, etc.) and renders the data as graphs, heatmaps, and alerts. Grafana does not collect data — it only visualizes. Prometheus collects and stores the time-series data; Grafana queries it using PromQL (Prometheus Query Language) and displays the dashboards.

---

**Q31. What is the ELK Stack (Elasticsearch, Logstash, Kibana) and what does each component do?**

- **E — Elasticsearch:** A distributed search and analytics engine. Stores and indexes log data. Supports fast full-text search.
- **L — Logstash:** A data processing pipeline — collects logs from various sources, transforms/filters them (parse, enrich), and ships them to Elasticsearch.
- **K — Kibana:** The UI (User Interface) layer — visualizes data stored in Elasticsearch, lets you search logs, create dashboards, and set up alerts.

Together they form a centralized logging solution.

---

**Q32. What is the difference between monitoring and observability?**

- **Monitoring:** Watching predefined metrics and firing alerts when thresholds are crossed. You know what to ask in advance.
- **Observability:** The ability to understand the internal state of a system from its external outputs (metrics, logs, traces). You can explore and ask *new* questions about unknown failure modes.

Observability is the superset. The three pillars of observability are: **Metrics, Logs, Traces**.

---

## Module 9 — CD (Continuous Deployment) — ArgoCD & Spinnaker

**Q33. What is GitOps and how does ArgoCD implement it?**

GitOps is a deployment pattern where the Git repository is the single source of truth for the desired state of infrastructure and applications. ArgoCD is a Kubernetes-native CD (Continuous Deployment) tool that implements GitOps by:
1. Watching a Git repo for changes to Kubernetes manifests.
2. Comparing the desired state (Git) with the actual state (cluster).
3. Automatically syncing the cluster to match Git — deployments happen when code is merged, not when someone runs a script.

---

**Q34. What is a canary deployment and how does it differ from a blue-green deployment?**

- **Blue-Green Deployment:** Two identical environments (blue = current production, green = new version). Traffic is switched all at once from blue to green. Rollback = switch back.
- **Canary Deployment:** New version is released to a small percentage of users (e.g., 5%) while the rest stay on the old version. If metrics look healthy, the percentage is gradually increased to 100%.

Canary = gradual rollout with real traffic testing. Blue-green = instant full cutover.

---

**Q35. What is Spinnaker and what makes it different from ArgoCD?**

Spinnaker is a multi-cloud CD (Continuous Deployment) platform originally built by Netflix. It supports deploying to AWS, GCP, Azure, and Kubernetes. Unlike ArgoCD which is Kubernetes-native and GitOps-first, Spinnaker is pipeline-driven and supports complex deployment strategies (canary, blue-green, rolling) across multiple cloud providers from a single UI. ArgoCD is simpler and tighter for Kubernetes-only workloads.

---

## Module 10 — Cloud Platforms

**Q36. What is AWS EKS (Elastic Kubernetes Service) and how does it differ from running Kubernetes yourself?**

AWS EKS is a managed Kubernetes control plane service. AWS manages the Kubernetes master nodes (API server, etcd, scheduler) — you only manage the worker nodes (or use Fargate for serverless nodes). Compared to self-hosted Kubernetes (kubeadm), EKS eliminates: control plane patching, high availability setup for masters, and etcd backup management. You pay AWS to handle that operational burden.

---

**Q37. What is AWS CodePipeline and how does it fit into a DevOps workflow on AWS (Amazon Web Services)?**

AWS CodePipeline is a fully managed CI/CD (Continuous Integration / Continuous Deployment) service on AWS. A typical pipeline: CodeCommit (source) → CodeBuild (build + test) → CodeDeploy (deploy to EC2/ECS/Lambda). It integrates natively with other AWS services and can trigger from GitHub pushes. It's the AWS-native alternative to Jenkins + ArgoCD running on AWS infrastructure.

---

**Q38. What is the difference between AWS RDS (Relational Database Service) and self-hosting a database on EC2 (Elastic Compute Cloud)?**

- **RDS:** Fully managed — AWS handles provisioning, patching, backups, replication, failover. You manage schema and queries.
- **Self-hosted on EC2:** You manage everything — OS (Operating System) patches, database installation, backup scripts, replication config.

RDS is more expensive but removes operational toil. In DevOps, using managed services = less infrastructure to maintain and monitor.

---

## Module 11 — Security in DevOps (DevSecOps)

**Q39. What is DevSecOps and how does it differ from traditional security practices?**

DevSecOps integrates security into every phase of the DevOps pipeline — "security as code." Traditional security = a security team reviews the application once, near release. DevSecOps = security scans run on every commit (SAST), every container build (image scanning), and every deployment (runtime protection). Security becomes shared responsibility, not a gate at the end.

---

**Q40. What is the difference between SAST (Static Application Security Testing) and DAST (Dynamic Application Security Testing)?**

- **SAST (Static Application Security Testing):** Analyzes source code, bytecode, or binary without running the application. Finds vulnerabilities at development time (e.g., SQL injection patterns, hardcoded secrets). Tools: SonarQube, Checkmarx, Semgrep.
- **DAST (Dynamic Application Security Testing):** Tests the running application by sending malicious inputs and observing responses. Simulates real attacks from outside. Tools: OWASP ZAP (Zed Attack Proxy), Burp Suite.

SAST = white-box (has access to code). DAST = black-box (treats app as opaque).

---

**Q41. What is HashiCorp Vault and what problem does it solve in DevOps?**

HashiCorp Vault is a secrets management tool. It centralizes the storage, access, and rotation of secrets (API keys, database passwords, TLS (Transport Layer Security) certificates). In DevOps, the problem it solves: secrets should never be hardcoded in code or `.env` files. Vault provides:
- **Dynamic secrets:** Generates short-lived credentials on demand (e.g., a database password valid for 1 hour).
- **Access policies:** Fine-grained control over which service can access which secret.
- **Audit logging:** Every secret access is logged.

---

**Q42. What is the principle of least privilege and how is it applied in Kubernetes RBAC (Role-Based Access Control)?**

Least privilege = every entity (user, service, process) should have only the minimum permissions needed to do its job. In Kubernetes RBAC:
- **Role/ClusterRole:** Defines a set of allowed actions (get, list, create, delete) on specific resources.
- **RoleBinding/ClusterRoleBinding:** Attaches a Role to a user, group, or ServiceAccount.

Example: a monitoring pod should have `get/list` on pods but not `delete`. You define a Role with exactly those permissions and bind it to that pod's ServiceAccount.

---

## Module 12 — SRE (Site Reliability Engineering)

**Q43. What is SRE (Site Reliability Engineering) and how is it different from traditional Ops (Operations)?**

SRE is a discipline created by Google that applies software engineering practices to operations problems. Traditional Ops teams manually manage systems reactively. SRE teams:
- Write code to automate manual tasks (toil reduction).
- Define and measure reliability through SLOs (Service Level Objectives).
- Own the production system alongside developers.
- Cap manual operational work at 50% — the rest must be engineering/automation.

---

**Q44. What is the difference between SLI (Service Level Indicator), SLO (Service Level Objective), and SLA (Service Level Agreement)?**

- **SLI (Service Level Indicator):** A quantitative measure of reliability — e.g., "request success rate" or "p99 latency." The metric itself.
- **SLO (Service Level Objective):** An internal target for an SLI — e.g., "99.9% of requests succeed." What you aim for.
- **SLA (Service Level Agreement):** A contractual commitment with customers — e.g., "We guarantee 99.5% uptime or issue credits." SLA ≥ SLO in strictness.

If SLO is breached, the team investigates. If SLA is breached, the company owes the customer money.

---

**Q45. What is an error budget in SRE (Site Reliability Engineering)?**

An error budget is `100% − SLO (Service Level Objective)`. If your SLO is 99.9% availability, your error budget is 0.1% — about 43 minutes of allowed downtime per month. When the error budget is being spent too fast, the team slows down risky deployments and focuses on reliability. When there's budget left, the team can ship faster. It's a negotiation tool between velocity and reliability that replaces arbitrary arguments about "is it stable enough to ship."

---

**Q46. What is Chaos Engineering and what is the Chaos Monkey tool?**

Chaos Engineering is the practice of intentionally injecting failures into a system to discover weaknesses before they cause real outages. The principle: if you don't test failure, you don't know how your system behaves when it fails.

**Chaos Monkey** is the original tool built by Netflix — it randomly terminates EC2 instances in production to ensure the system is resilient enough to survive instance failure. Modern successors: **Gremlin**, **LitmusChaos** (for Kubernetes). The Simian Army is Netflix's suite of chaos tools.

---

**Q47. What is a post-mortem (or incident review) in DevOps/SRE (Site Reliability Engineering) culture?**

A post-mortem is a blameless written analysis conducted after a production incident. It covers:
- **Timeline:** Exact sequence of events.
- **Root cause:** The underlying technical cause (not "human error" — that's a symptom).
- **Contributing factors:** What made the system fragile.
- **Action items:** Concrete fixes to prevent recurrence.

"Blameless" is key — the goal is systemic improvement, not finding someone to blame. Psychological safety enables engineers to be honest about mistakes.

---

## Module 13 — DevOps Practices & Metrics

**Q48. What are DORA (DevOps Research and Assessment) metrics and why do they matter?**

DORA metrics are 4 key measurements used to evaluate software delivery performance, backed by research from the DORA (DevOps Research and Assessment) team at Google:

1. **Deployment Frequency:** How often you deploy to production.
2. **Lead Time for Changes:** Time from code commit to running in production.
3. **Change Failure Rate:** Percentage of deployments that cause a production failure.
4. **MTTR (Mean Time to Restore):** How quickly you recover from a production failure.

Elite teams (per DORA research) deploy multiple times per day, with lead times under an hour and MTTR under an hour.

---

**Q49. What is the difference between Agile and DevOps? Are they in conflict?**

- **Agile:** A software development methodology focused on iterative development, collaboration, and responding to change. Scrum and Kanban are Agile frameworks. Agile solves how dev teams *build* software.
- **DevOps:** A culture and set of practices focused on the entire software delivery lifecycle — including deployment, operations, and monitoring. DevOps solves how software is *shipped and operated*.

They are complementary, not in conflict. Agile sprints produce working code; DevOps pipelines ship that code to users reliably and continuously.

---

**Q50. What is "toil" in SRE (Site Reliability Engineering) and why is reducing it a priority?**

Toil is manual, repetitive, operational work that:
- Is triggered by a service being in production.
- Scales linearly with service growth (more users = more toil).
- Produces no lasting improvement (you do it again next week).
- Could be automated.

Examples: manually restarting crashed services, running deployment scripts by hand, responding to repetitive alerts that require the same fix each time.

SRE culture mandates capping toil at 50% of an SRE's time. Anything above that means automation is falling behind growth — which eventually collapses the team under operational load.

---

*File generated for DevOps Sem IV Viva — ITM Skills University, B.Tech CSE 2024-28*
