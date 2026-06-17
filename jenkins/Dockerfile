# Jenkins controller pre-loaded with the tools the TerraMind pipeline needs
# (terraform, kubeconform, python/ruff) and the setup wizard skipped, so it boots
# straight into a ready-to-run pipeline. arch-aware (works on arm64 Colima + amd64 CI).
FROM jenkins/jenkins:lts-jdk17

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl unzip ca-certificates python3 python3-pip git \
  && rm -rf /var/lib/apt/lists/*

RUN ARCH=$(dpkg --print-architecture) && \
    curl -fsSL "https://releases.hashicorp.com/terraform/1.9.5/terraform_1.9.5_linux_${ARCH}.zip" -o /tmp/tf.zip && \
    unzip -o /tmp/tf.zip -d /usr/local/bin && rm /tmp/tf.zip && \
    curl -fsSL "https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-${ARCH}.tar.gz" \
      | tar xz -C /usr/local/bin kubeconform

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli -f /usr/share/jenkins/ref/plugins.txt

# skip the unlock/setup wizard; load config from JCasC
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
ENV CASC_JENKINS_CONFIG=/var/jenkins_conf/casc.yaml

USER jenkins
