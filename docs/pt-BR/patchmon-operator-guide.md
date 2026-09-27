---
title: "Guia do Operador do PatchMon"
description: "Instale, configure e mantenha o PatchMon com Docker, Kubernetes ou atrás de um proxy reverso. Inclui OIDC SSO e o ciclo de vida do agente."
lang: "pt-BR"
translation_of: "docs/patchmon-operator-guide.md"
source_commit: "05576062"
---

# Guia do Operador do PatchMon

Este é o guia de implantação, configuração e manutenção para quem opera a plataforma PatchMon. Para o uso diário do aplicativo na interface web, consulte o **Guia do Administrador**. Para integrações e a API REST, consulte o **Guia de API e Integrações**.

> **Sobre esta tradução.** A interface do PatchMon está disponível apenas em inglês. Por isso, nomes de telas, abas, botões e campos aparecem aqui como estão na interface (por exemplo, **Settings → Environment**). Comandos, variáveis de ambiente, caminhos, arquivos de configuração e exemplos de código não foram traduzidos. Em caso de divergência, vale a versão original em inglês.

## Sumário

- [Capítulo 1: Instalando o servidor do PatchMon com Docker](#installing-patchmon-server-on-docker)
- [Capítulo 2: Instalando o PatchMon no Kubernetes](#installing-patchmon-on-kubernetes-helm)
- [Capítulo 3: Exemplos de proxy reverso](#reverse-proxy-examples)
- [Capítulo 4: Configuração inicial do administrador](#first-time-admin-setup)
- [Capítulo 5: Referência de variáveis de ambiente do PatchMon](#patchmon-environment-variables-reference)
- [Capítulo 6: Configurando OIDC SSO](#setting-up-oidc-sso)
- [Capítulo 7: Configurando SSO com o Azure Entra ID](#setting-up-azure-entra-id-sso)
- [Capítulo 8: Instalando o agente do PatchMon](#installing-the-patchmon-agent)
- [Capítulo 9: Gerenciando o agente do PatchMon](#managing-the-patchmon-agent)
- [Capítulo 10: Desinstalando o agente do PatchMon](#uninstalling-the-patchmon-agent)
- [Capítulo 11: Referência do config.yml do agente](#agent-config-yml-reference)
- [Capítulo 12: Solução de problemas do servidor](#server-troubleshooting)
- [Capítulo 13: Solução de problemas do agente](#agent-troubleshooting)
- [Capítulo 14: Erros no painel depois de uma atualização do Proxmox Community](#errors-on-dashboard-after-proxmox-community-update)
- [Capítulo 15: Verificando os artefatos da versão (SBOM e proveniência)](#verifying-release-artefacts)

---

## Capítulo 1: Instalando o servidor do PatchMon com Docker {#installing-patchmon-server-on-docker}

### Visão geral

O PatchMon roda como um único contêiner, apoiado por três serviços auxiliares. O binário do servidor do PatchMon serve tanto a API quanto o frontend React embutido. Não há contêiner de frontend separado.

| Serviço | Imagem | Finalidade |
|---------|-------|---------|
| `server` | `ghcr.io/patchmon/patchmon-server` | Aplicação PatchMon (API + frontend + migrações) |
| `database` | `postgres:17-alpine` | Armazenamento principal de dados |
| `redis` | `redis:7-alpine` | Filas de jobs em segundo plano (asynq) |
| `guacd` | `guacamole/guacd:1.6.0` | Gateway RDP (necessário para o RDP no navegador) |

Os quatro serviços se comunicam por uma rede Docker interna e isolada (`patchmon-internal`). Só a porta do `server` é exposta no host.

---

### Pré-requisitos

- Docker Engine 24+ e Docker Compose v2
- Um proxy reverso com certificado TLS válido (Nginx Proxy Manager, Traefik, Caddy ou similar), muito recomendado em qualquer implantação que não seja localhost
- Mínimo de 1 GB de RAM; 2 GB recomendados

---

### Início rápido

#### 1. Rode o script de configuração

O jeito mais rápido de começar é o script de configuração oficial. Ele baixa o arquivo compose, gera os segredos e cria o seu `.env` de uma vez:

```bash
mkdir patchmon && cd patchmon
bash -c "$(curl -fsSL https://raw.githubusercontent.com/PatchMon/PatchMon/refs/heads/main/docker/setup-env.sh)"
```

Quando terminar, pule para a [etapa 3](#3-configure-your-access-url).

#### 2. Configuração manual (alternativa)

Se preferir fazer tudo à mão:

```bash
mkdir patchmon && cd patchmon

# Download the compose file and example env
curl -fsSL -o docker-compose.yml https://raw.githubusercontent.com/PatchMon/PatchMon/refs/heads/main/docker/docker-compose.yml
curl -fsSL -o env.example https://raw.githubusercontent.com/PatchMon/PatchMon/refs/heads/main/docker/env.example

# Create your .env and generate the three required secrets
cp env.example .env
sed -i "s/^POSTGRES_PASSWORD=$/POSTGRES_PASSWORD=$(openssl rand -hex 32)/" .env
sed -i "s/^REDIS_PASSWORD=$/REDIS_PASSWORD=$(openssl rand -hex 32)/" .env
sed -i "s/^JWT_SECRET=$/JWT_SECRET=$(openssl rand -hex 64)/" .env
```

#### 3. Configure a URL de acesso {#3-configure-your-access-url}

Abra o `.env` e defina `CORS_ORIGIN` com a URL completa pela qual o PatchMon será acessado no navegador. É a única variável de ambiente relacionada a URL que o servidor lê do `.env`:

```env
CORS_ORIGIN=https://patchmon.example.com
```

Para um teste local sem proxy reverso:

```env
CORS_ORIGIN=http://localhost:3000
```

Se os usuários chegam ao PatchMon por mais de uma URL (por exemplo, um domínio externo e um endereço na LAN interna), separe os valores por vírgula, sem espaços:

```env
CORS_ORIGIN=https://patchmon.example.com,https://patchmon.internal.lan
```

Depois do primeiro login, vá a **Settings** na interface do PatchMon para configurar a URL do servidor que os agentes usam para se conectar (protocolo, host, porta). Esses valores ficam no banco de dados, não no `.env`. É também na página Settings que se configuram os intervalos de atualização, o comportamento da atualização automática e outras opções do servidor.

> **Dica:** não edite o `docker-compose.yml` para acrescentar variáveis de ambiente. O arquivo compose usa `env_file: .env` para passar o seu `.env` inteiro a cada contêiner. Toda a configuração fica no `.env`.

A lista completa de variáveis de ambiente disponíveis (limite de requisições, logs, OIDC SSO, TOTP, ajuste do pool do banco, tempos de sessão e mais) está na [Referência de variáveis de ambiente do PatchMon](#patchmon-environment-variables-reference).

#### 4. Inicie o PatchMon

```bash
docker compose up -d
```

O Docker baixa as imagens, espera cada serviço passar no health check e inicia o servidor. O servidor executa automaticamente as migrações do banco na inicialização.

Com todos os contêineres saudáveis, abra no navegador a URL que você configurou e conclua a configuração inicial para criar a conta de administrador.

Os logs de inicialização podem ser vistos a qualquer momento com:

```bash
docker compose logs -f server
```

> **Vindo da 2.0.2 ou anterior?** O `ENABLE_LOGGING` tinha `false` como padrão, e desligado o servidor não gravava nenhum log de aplicação, o que tornava inútil qualquer passo "verifique os logs" deste guia. A partir da 2.0.3, o padrão é `true`. Se você definiu `ENABLE_LOGGING=false` explicitamente no `.env`, ou desligou os logs em **Settings > Environment**, essa escolha é mantida e você continuará sem logs.

---

### Imagem do contêiner

A imagem do servidor do PatchMon é publicada em:

```
ghcr.io/patchmon/patchmon-server
```

#### Tags disponíveis

| Tag | Descrição |
|-----|-------------|
| `latest` | Versão estável mais recente |
| `x.y.z` | Versão exata fixada (por exemplo, `1.5.0`) |
| `x.y` | Última correção de uma série menor (por exemplo, `1.5`) |
| `x` | Última versão menor e correção de uma série principal (por exemplo, `1`) |
| `edge` | Build de desenvolvimento mais recente da branch main. Instável, só para testes. |

---

### Referência do arquivo compose

Este é o `docker-compose.yml` de produção usado pelo PatchMon. Não é preciso editá-lo; toda a configuração é controlada pelo seu arquivo `.env`.

```yaml
name: patchmon

services:

  server:
    image: ghcr.io/patchmon/patchmon-server:latest
    restart: unless-stopped
    env_file: .env
    ports:
      - "${PORT:-3000}:${PORT:-3000}"
    networks:
      - patchmon-internal
    depends_on:
      database:
        condition: service_healthy
      redis:
        condition: service_healthy
      guacd:
        condition: service_healthy

  database:
    image: postgres:17-alpine
    restart: unless-stopped
    env_file: .env
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - patchmon-internal

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    env_file: .env
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - patchmon-internal

  guacd:
    image: guacamole/guacd:1.6.0
    restart: unless-stopped
    networks:
      - patchmon-internal

volumes:
  postgres_data:
  redis_data:

networks:
  patchmon-internal:
    driver: bridge
```

---

### Volumes

| Volume | Finalidade |
|--------|---------|
| `postgres_data` | Diretório de dados do PostgreSQL |
| `redis_data` | Persistência do Redis |

Os binários do agente e o conteúdo de conformidade SCAP vêm embutidos na imagem `patchmon-server`. Não é preciso nenhum volume extra para eles.

Dá para ligar qualquer um dos volumes a um caminho do host editando o arquivo compose:

```yaml
volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/patchmon/postgres
```

> **Observação:** o contêiner do servidor roda com um usuário que não é root. Se você ligar volumes a caminhos do host, garanta que esse usuário tenha leitura e escrita nesses diretórios.

---

### Atualizando o PatchMon

Por padrão, o arquivo compose usa a tag `latest`. Para atualizar para a versão mais nova:

```bash
docker compose pull
docker compose up -d
```

Isso baixa a imagem mais recente, recria o contêiner `server` e executa automaticamente, na inicialização, as novas migrações do banco. Os seus dados ficam preservados nos volumes nomeados.

#### Fixando uma versão específica

Se preferir controlar quando atualizar, fixe a tag da imagem no seu `docker-compose.yml`:

```yaml
services:
  server:
    image: ghcr.io/patchmon/patchmon-server:1.5.0
```

Depois, quando quiser atualizar, baixe e reinicie:

```bash
docker compose pull
docker compose up -d
```

Antes de atualizar, consulte a [página de versões no GitHub](https://github.com/PatchMon/PatchMon/releases) para ver as mudanças e as notas de migração de cada versão.

#### Por que a versão mais nova pode levar um dia para aparecer {#why-the-newest-version-can-take-a-day-to-appear}

Publicar uma versão e anunciá-la às instâncias em execução são duas etapas separadas.

A sua instância verifica uma vez por dia se há versão nova do servidor, e essa verificação lê um valor que só atualizamos depois que a versão passou pela nossa implantação em fases. Por isso, nas primeiras 24 horas, mais ou menos, depois que uma versão nova aparece no GitHub, é normal o PatchMon continuar mostrando uma versão mais antiga como a mais recente, e o alerta `server_update` ainda não ter disparado. Não há nada errado com a sua instalação: ela pega a versão nova numa das verificações diárias seguintes.

O atraso é proposital. Com a implantação em fases, a versão roda por um tempo em ambientes reais antes de todas as instâncias serem avisadas, e qualquer problema aparece antes de a comunidade inteira ser convidada a atualizar.

Se não quiser esperar, baixe a imagem nova quando quiser. A verificação de versão só controla o aviso, nunca a sua possibilidade de atualizar.

---

### Configuração do proxy reverso

O PatchMon escuta na porta `3000` dentro do contêiner, mapeada por padrão para a porta `3000` do host. Aponte o seu proxy reverso para `http://<host>:3000`.

Ao implantar atrás de um proxy reverso, garanta que:

- As conexões WebSocket passem corretamente pelo proxy. O PatchMon usa WebSockets para a comunicação com os agentes, o terminal SSH e as sessões RDP.
- Os cabeçalhos `X-Forwarded-For`, `X-Forwarded-Proto` e `Host` sejam repassados, para o PatchMon montar as URLs corretas.

Se você usa o Nginx Proxy Manager, ative "Websockets Support" na entrada do proxy host.

---

### Solução de problemas {#troubleshooting}

#### O servidor não inicia: conexão com o banco recusada

O servidor espera o health check do banco antes de iniciar, mas, se ainda assim falhar:

```bash
# Check that the database container is healthy
docker compose ps

# Check database logs
docker compose logs database
```

Confira se `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` estão definidos no `.env` e são coerentes entre si.

#### O servidor não inicia: conexão com o Redis recusada

```bash
docker compose logs redis
```

Confira se `REDIS_PASSWORD` está definido no `.env`. O contêiner do Redis usa esse valor no comando de inicialização (`--requirepass`).

#### Vendo os logs do servidor

```bash
# Follow live logs
docker compose logs -f server

# Last 100 lines
docker compose logs --tail=100 server
```

#### Voltando a um estado limpo

> **Atenção:** isto apaga todos os dados do PatchMon. Só faça numa instalação nova, quando quiser recomeçar do zero.

```bash
docker compose down -v
docker compose up -d
```

#### Porta 3000 já em uso

Mude a porta do lado do host no `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"   # Expose on host port 8080 instead
```

Se os agentes precisarem chegar ao servidor diretamente por essa porta, ajuste `SERVER_PORT` no `.env` para o mesmo valor.

---

## Capítulo 2: Instalando o PatchMon no Kubernetes {#installing-patchmon-on-kubernetes-helm}

### Visão geral

Há dois jeitos de rodar o PatchMon no Kubernetes:

- **O Helm chart da comunidade**, que ocupa a maior parte deste capítulo. É o melhor caminho se você quer configuração por values e atualizações gerenciadas pelo chart.
- **Manifests simples**, tratados em [Implantando com manifests simples](#deploying-with-plain-manifests). É o melhor caminho se você implanta com Argo CD ou Flux, ou se simplesmente quer ver e controlar cada objeto. É também a rota indicada no k3s.

Nos dois casos, leia antes a nota "Importante: arquitetura do PatchMon 2.0", abaixo, que explica o que mudou em relação à stack Node.js da 1.4.x.

O Helm chart da comunidade para o PatchMon implanta o servidor em qualquer cluster Kubernetes 1.19+. Ele é mantido num repositório separado:

- Repositório do chart: [github.com/RuTHlessBEat200/PatchMon-helm](https://github.com/RuTHlessBEat200/PatchMon-helm)
- Repositório do aplicativo: [github.com/PatchMon/PatchMon](https://github.com/PatchMon/PatchMon)

> **Confira com o chart mais recente.** Esta seção descreve o formato dos values do chart. O chart é mantido pela comunidade e pode estar uma ou duas versões atrás da versão mais recente do PatchMon. Antes de atualizar, confira sempre no [README do próprio chart](https://github.com/RuTHlessBEat200/PatchMon-helm) os nomes e os padrões atuais dos values.

#### Importante: arquitetura do PatchMon 2.0

O Helm chart foi escrito originalmente para a stack Node.js da 1.4.x, que tinha imagens separadas `patchmon-backend` e `patchmon-frontend` e usava o BullMQ para jobs em segundo plano. **O PatchMon 2.0 junta tudo num único binário Go**: o frontend React vem embutido, o `chi` serve tanto `/api/*` quanto a SPA, os jobs em segundo plano rodam no [Asynq](https://github.com/hibiken/asynq) e as migrações de esquema são aplicadas automaticamente no boot pelo [golang-migrate](https://github.com/golang-migrate/migrate).

Consequências práticas para o chart:

| Conceito | 1.4.x (Node) | 2.0+ (Go) |
|---|---|---|
| Contêineres | `patchmon-backend` + `patchmon-frontend` | Um único `patchmon-server` |
| Fila | BullMQ | Asynq |
| Migrações | Prisma | golang-migrate (embutido, automático) |
| Porta de escuta | backend 3001, frontend 3000 | server 3000 (tanto `/api/*` quanto a SPA) |
| Sidecar de RDP | n/a | `guacamole/guacd` (opcional, necessário para o RDP no navegador) |

Se a sua versão do chart ainda traz deployments separados de backend e frontend, defina o deployment do frontend com `enabled: false` e aponte o Ingress só para a imagem do backend com tag `ghcr.io/patchmon/patchmon-server:2.0.0` ou posterior, exposta na porta 3000. Onde o arquivo de values do chart usa chaves `backend.env.*`, elas agora correspondem ao ambiente do contêiner único `patchmon-server`.

---

### Pré-requisitos

- Kubernetes 1.19+
- Helm 3.0+
- Um provisionador de PersistentVolume no cluster (para os dados do PostgreSQL e do Redis)
- Um Ingress controller (por exemplo, NGINX Ingress) para acesso externo (muito recomendado)
- cert-manager para gestão automática de certificados TLS (opcional)
- Metrics Server para o HPA (opcional)

---

### Imagens de contêiner

| Componente | Imagem | Tag padrão |
|-----------|-------|-------------|
| Servidor | `ghcr.io/patchmon/patchmon-server` | `2.0.0` |
| Banco de dados | `docker.io/postgres` | `17-alpine` |
| Redis | `docker.io/redis` | `7-alpine` |
| guacd (sidecar de RDP, opcional) | `docker.io/guacamole/guacd` | `1.6.0` |

#### Tags disponíveis (imagem do servidor)

| Tag | Descrição |
|-----|-------------|
| `latest` | Versão estável mais recente |
| `x.y.z` | Versão exata fixada (por exemplo, `2.0.0`) |
| `x.y` | Última correção de uma série menor (por exemplo, `2.0`) |
| `x` | Última versão menor e correção de uma série principal (por exemplo, `2`) |
| `edge` | Build de desenvolvimento mais recente da branch main. Instável, só para testes. |

---

### Início rápido

O jeito mais rápido de testar o PatchMon no Kubernetes é o `values-quick-start.yaml` fornecido. Ele traz segredos de exemplo e padrões razoáveis para uma instalação com um único comando.

> **Atenção:** o `values-quick-start.yaml` vem com segredos de exemplo e serve só para avaliação. Nunca o use em produção sem trocar todos os valores secretos.

#### 1. Instale o chart

```bash
wget https://raw.githubusercontent.com/RuTHlessBEat200/PatchMon-helm/refs/heads/main/values-quick-start.yaml

helm install patchmon oci://ghcr.io/ruthlessbeat200/charts/patchmon \
  --namespace patchmon \
  --create-namespace \
  --values values-quick-start.yaml
```

#### 2. Espere os pods ficarem prontos

```bash
kubectl get pods -n patchmon -w
```

O pod do servidor executa as migrações embutidas no primeiro boot. Acompanhe os logs para vê-las sendo aplicadas:

```bash
kubectl logs -n patchmon deploy/patchmon-server -f
```

#### 3. Acesse o PatchMon

Se houver um Ingress configurado, abra o host que você definiu (por exemplo, `https://patchmon.example.com`).

Sem Ingress, use port-forward:

```bash
kubectl port-forward -n patchmon svc/patchmon-server 3000:3000
```

Depois abra `http://localhost:3000` e conclua a [configuração inicial do administrador](#first-time-admin-setup).

---

### Implantação em produção

Em produção, comece pelo `values-prod.yaml` do repositório do chart. O exemplo abaixo mostra como:

- Usar um Secret externo do Kubernetes (gerenciado por SOPS, Sealed Secrets ou External Secrets Operator) em vez de senhas no próprio arquivo
- Configurar HTTPS com cert-manager
- Definir `CORS_ORIGIN` com a URL externa que os usuários acessam (separe várias URLs por vírgula, sem espaços, se o PatchMon for acessado por mais de uma origem)

#### 1. Crie os segredos

O chart **não** gera segredos automaticamente. Você precisa fornecê-los.

Segredos necessários numa implantação do PatchMon 2.0:

| Chave | Descrição |
|-----|-------------|
| `postgres-password` | Senha do PostgreSQL |
| `redis-password` | Senha do Redis |
| `jwt-secret` | Segredo de assinatura JWT usado pelo servidor |
| `ai-encryption-key` | Chave de criptografia das credenciais dos provedores de IA, dos tokens de bootstrap e de outros segredos em repouso |
| `oidc-client-secret` | Client secret do OIDC (só com OIDC ativo) |

**Exemplo: criando um Secret manualmente**

```bash
kubectl create namespace patchmon

kubectl create secret generic patchmon-secrets \
  --namespace patchmon \
  --from-literal=postgres-password="$(openssl rand -hex 32)" \
  --from-literal=redis-password="$(openssl rand -hex 32)" \
  --from-literal=jwt-secret="$(openssl rand -hex 64)" \
  --from-literal=ai-encryption-key="$(openssl rand -hex 32)"
```

**Ferramentas de gestão de segredos recomendadas para produção:**

- [SOPS](https://github.com/getsops/sops): criptografa segredos no Git
- [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets): descriptografia só dentro do cluster
- [External Secrets Operator](https://external-secrets.io/): sincroniza segredos do Vault, do AWS Secrets Manager etc.

#### 2. Crie o seu arquivo de values

Comece pelo `values-prod.yaml` e ajuste:

```yaml
global:
  storageClass: "your-storage-class"
  imageTag: "2.0.0"

fullnameOverride: "patchmon-prod"

server:
  env:
    # Comma-separate with no spaces to allow multiple origins, e.g.
    # "https://patchmon.example.com,https://patchmon.internal.lan"
    CORS_ORIGIN: "https://patchmon.example.com"
    ENABLE_HSTS: "true"
    TRUST_PROXY: "true"
  existingSecret: "patchmon-secrets"
  existingSecretJwtKey: "jwt-secret"
  existingSecretAiEncryptionKey: "ai-encryption-key"

database:
  auth:
    existingSecret: "patchmon-secrets"
    existingSecretPasswordKey: "postgres-password"

redis:
  auth:
    existingSecret: "patchmon-secrets"
    existingSecretPasswordKey: "redis-password"

secret:
  create: false

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-read-timeout: "86400"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "86400"
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
  hosts:
    - host: patchmon.example.com
      paths:
        - path: /
          pathType: Prefix
          service:
            name: server
            port: 3000
  tls:
    - secretName: patchmon-tls
      hosts:
        - patchmon.example.com
```

> **Confira com o chart mais recente.** As chaves exatas dos values (`server.*` ou `backend.*`) dependem de o chart já ter sido atualizado para a 2.0. Se o seu chart ainda separa backend e frontend, defina `frontend.enabled: false` e exponha só o backend na porta 3000.

#### 3. Instale

```bash
helm install patchmon oci://ghcr.io/ruthlessbeat200/charts/patchmon \
  --namespace patchmon \
  --create-namespace \
  --values values-prod.yaml
```

---

### Referência de configuração

> **Confira com o chart mais recente.** A tabela abaixo segue os nomes de values do chart original. Espera-se que as versões do chart para a 2.0 abandonem o bloco separado `frontend.*` e juntem tudo num único bloco `server.*`. Compare sempre com o `values.yaml` do chart antes de mudar algo.

#### Configurações globais

| Parâmetro | Descrição | Padrão |
|-----------|-------------|---------|
| `global.imageRegistry` | Troca o registry de imagens de todos os componentes | `""` |
| `global.imageTag` | Troca a tag da imagem do PatchMon (tem prioridade sobre as tags individuais) | `""` |
| `global.imagePullSecrets` | Image pull secrets aplicados a todos os pods | `[]` |
| `global.storageClass` | Storage class padrão de todos os PVCs | `""` |
| `nameOverride` | Troca o nome do chart usado nos nomes dos recursos | `""` |
| `fullnameOverride` | Troca o prefixo completo dos nomes dos recursos | `""` |
| `commonLabels` | Labels adicionados a todos os recursos | `{}` |
| `commonAnnotations` | Annotations adicionadas a todos os recursos | `{}` |

#### Banco de dados (PostgreSQL)

| Parâmetro | Descrição | Padrão |
|-----------|-------------|---------|
| `database.enabled` | Implanta o StatefulSet do PostgreSQL | `true` |
| `database.image.registry` | Registry da imagem | `docker.io` |
| `database.image.repository` | Repositório da imagem | `postgres` |
| `database.image.tag` | Tag da imagem | `17-alpine` |
| `database.auth.database` | Nome do banco | `patchmon_db` |
| `database.auth.username` | Usuário do banco | `patchmon_user` |
| `database.auth.password` | Senha do banco (obrigatória, a menos que `existingSecret` esteja definido) | `""` |
| `database.auth.existingSecret` | Secret existente com a senha | `""` |
| `database.auth.existingSecretPasswordKey` | Chave dentro do Secret existente | `postgres-password` |
| `database.persistence.enabled` | Ativa o armazenamento persistente | `true` |
| `database.persistence.size` | Tamanho do PVC | `5Gi` |
| `database.resources.requests.cpu` | Request de CPU | `100m` |
| `database.resources.requests.memory` | Request de memória | `128Mi` |
| `database.resources.limits.memory` | Limite de memória | `1Gi` |
| `database.service.port` | Porta do Service | `5432` |

#### Redis

| Parâmetro | Descrição | Padrão |
|-----------|-------------|---------|
| `redis.enabled` | Implanta o StatefulSet do Redis | `true` |
| `redis.image.tag` | Tag da imagem | `7-alpine` |
| `redis.auth.password` | Senha do Redis (obrigatória, a menos que `existingSecret` esteja definido) | `""` |
| `redis.auth.existingSecret` | Secret existente com a senha | `""` |
| `redis.auth.existingSecretPasswordKey` | Chave dentro do Secret existente | `redis-password` |
| `redis.persistence.enabled` | Ativa o armazenamento persistente | `true` |
| `redis.persistence.size` | Tamanho do PVC | `5Gi` |
| `redis.resources.requests.memory` | Request de memória | `10Mi` |
| `redis.resources.limits.memory` | Limite de memória | `512Mi` |
| `redis.service.port` | Porta do Service | `6379` |

#### Servidor (PatchMon 2.0)

Na 2.0, o servidor é um único binário Go que serve `/api/*` e a SPA React embutida na porta 3000. Nas versões do chart ainda não atualizadas para a 2.0, os values equivalentes ficam em `backend.*`, e `frontend.enabled` deve ser `false`.

| Parâmetro | Descrição | Padrão |
|-----------|-------------|---------|
| `server.enabled` | Implanta o servidor do PatchMon | `true` |
| `server.image.registry` | Registry da imagem | `ghcr.io` |
| `server.image.repository` | Repositório da imagem | `patchmon/patchmon-server` |
| `server.image.tag` | Tag da imagem (sobrescrita por `global.imageTag`, se definido) | `2.0.0` |
| `server.replicaCount` | Número de réplicas | `1` |
| `server.jwtSecret` | Segredo de assinatura JWT (obrigatório, a menos que `existingSecret` esteja definido) | `""` |
| `server.aiEncryptionKey` | Chave de criptografia dos segredos em repouso | `""` |
| `server.existingSecret` | Nome de um Secret existente com o JWT e a chave de criptografia | `""` |
| `server.existingSecretJwtKey` | Chave de `JWT_SECRET` dentro do Secret existente | `jwt-secret` |
| `server.existingSecretAiEncryptionKey` | Chave de `AI_ENCRYPTION_KEY` dentro do Secret existente | `ai-encryption-key` |
| `server.resources.requests.cpu` | Request de CPU | `100m` |
| `server.resources.requests.memory` | Request de memória | `256Mi` |
| `server.resources.limits.memory` | Limite de memória | `1Gi` |
| `server.service.port` | Porta do Service | `3000` |
| `server.autoscaling.enabled` | Ativa o HPA | `false` |

> **Migrações:** o servidor do PatchMon executa as migrações automaticamente no boot, pelo `golang-migrate` embutido. **Não** é preciso um Job de migração dedicado; remova-o do chart se houver um.

##### Variáveis de ambiente do servidor

As chaves `server.env.*` correspondem diretamente às variáveis de ambiente que o binário do PatchMon lê. A lista completa está na [Referência de variáveis de ambiente](#patchmon-environment-variables-reference).

| Chave | Descrição | Padrão |
|-----|-------------|---------|
| `CORS_ORIGIN` | Origem permitida no CORS (precisa ser a URL que os usuários digitam no navegador; separe por vírgula, sem espaços, para permitir várias, por exemplo `https://patchmon.example.com,https://patchmon.internal.lan`) | `http://localhost:3000` |
| `ENABLE_HSTS` | Ativa o cabeçalho HSTS para HTTPS | `false` |
| `TRUST_PROXY` | Confia nos cabeçalhos de proxy quando atrás de um Ingress controller | `true` |
| `ENABLE_LOGGING` | Ativa logs estruturados em stdout | `true` |
| `LOG_LEVEL` | Nível de log (`debug`, `info`, `warn`, `error`) | `info` |
| `JSON_BODY_LIMIT` | Tamanho máximo do corpo JSON | `5mb` |
| `AGENT_UPDATE_BODY_LIMIT` | Tamanho máximo do corpo de atualização do agente | `5mb` |
| `COMPLIANCE_BODY_LIMIT` | Tamanho máximo do corpo com resultados de varredura de conformidade | `20mb` |
| `AGENT_PING_BODY_LIMIT` | Tamanho máximo do corpo do ping do agente | `8kb` |
| `TZ` | Fuso horário IANA dos horários dos logs | `UTC` |

> **Dica:** muitas delas podem ser mudadas depois pela interface Settings, sem reiniciar o cluster inteiro. Veja Configurações na interface web.

##### OIDC / SSO

| Chave | Descrição | Padrão |
|-----|-------------|---------|
| `OIDC_ENABLED` | Ativa a autenticação OIDC | `false` |
| `OIDC_ISSUER_URL` | URL do emissor (issuer) OIDC | `""` |
| `OIDC_CLIENT_ID` | Client ID do OIDC | `""` |
| `OIDC_CLIENT_SECRET` | Client secret do OIDC (coloque num Secret existente) | `""` |
| `OIDC_REDIRECT_URI` | URL de callback (`https://<host>/api/v1/auth/oidc/callback`) | `""` |
| `OIDC_SCOPES` | Escopos separados por espaço | `openid email profile groups` |
| `OIDC_AUTO_CREATE_USERS` | Cria usuários automaticamente no primeiro login | `false` |
| `OIDC_DEFAULT_ROLE` | Papel padrão dos novos usuários OIDC | `user` |
| `OIDC_SYNC_ROLES` | Sincroniza papéis a partir das claims de grupo do OIDC a cada login | `false` |
| `OIDC_DISABLE_LOCAL_AUTH` | Desativa a autenticação local por usuário e senha | `false` |

A configuração completa do OIDC e as variáveis de mapeamento de grupos para papéis estão na [Referência de variáveis de ambiente](#patchmon-environment-variables-reference).

#### Sidecar guacd (opcional, para RDP)

O PatchMon 2.0 pode intermediar o RDP do Windows pelo [daemon do Apache Guacamole](https://guacamole.apache.org/). Se precisar de RDP no navegador, adicione um sidecar `guacd` e aponte `GUACD_ADDRESS` para ele:

```yaml
server:
  env:
    GUACD_ADDRESS: "guacd:4822"

guacd:
  enabled: true
  image:
    repository: guacamole/guacd
    tag: "1.6.0"
```

> **Confira com o chart mais recente.** O suporte ao `guacd` foi adicionado depois do chart original da 1.4.x. Se a sua versão do chart não tem a opção `guacd.enabled`, implante-o como um Deployment e um Service separados no mesmo namespace e defina `GUACD_ADDRESS` com o hostname do ClusterIP dele.

#### Ingress

| Parâmetro | Descrição | Padrão |
|-----------|-------------|---------|
| `ingress.enabled` | Ativa o recurso Ingress | `true` |
| `ingress.className` | Nome da classe do Ingress | `""` |
| `ingress.annotations` | Annotations do Ingress | `{}` |
| `ingress.hosts` | Lista de regras de host do Ingress | veja o `values.yaml` do chart |
| `ingress.tls` | Configuração de TLS | `[]` |

**Annotations necessárias para o suporte a WebSocket (WS dos agentes e transmissão ao vivo dos patches):**

```yaml
ingress:
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "86400"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "86400"
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
```

A configuração detalhada de proxy reverso (Nginx, Caddy, Traefik) está em [Exemplos de proxy reverso](#reverse-proxy-examples).

---

### Volumes persistentes

| PVC | Componente | Finalidade | Tamanho padrão |
|-----|-----------|---------|--------------|
| `postgres-data` | Banco de dados | Diretório de dados do PostgreSQL | `5Gi` |
| `redis-data` | Redis | Diretório de dados do Redis | `5Gi` |

> **Sem volume de arquivos do agente na 2.0.** Na 1.4.x, os binários do agente e o conteúdo de conformidade SCAP ficavam num PVC `agent-files`. Na 2.0, os dois vêm **embutidos no binário do servidor**, e nenhum volume específico do aplicativo é necessário. Se o seu chart ainda declara `backend.persistence`, ele pode ser removido.

---

### Atualizando o PatchMon

#### Usando `global.imageTag`

```bash
helm upgrade patchmon oci://ghcr.io/ruthlessbeat200/charts/patchmon \
  -n patchmon \
  -f values-prod.yaml \
  --set global.imageTag=2.0.1
```

Quando o novo pod inicia, o `golang-migrate` aplica automaticamente as migrações de esquema pendentes. Não é preciso Job manual.

#### Fixando tags individuais

```yaml
server:
  image:
    tag: "2.0.0"
```

#### Atualizando a versão do chart

```bash
helm upgrade patchmon oci://ghcr.io/ruthlessbeat200/charts/patchmon \
  --namespace patchmon \
  --values values-prod.yaml \
  --wait --timeout 10m
```

Antes de atualizar, consulte a [página de versões do chart](https://github.com/RuTHlessBEat200/PatchMon-helm/releases) e a [página de versões do PatchMon](https://github.com/PatchMon/PatchMon/releases).

> **Observação:** nas primeiras 24 horas, mais ou menos, depois que uma versão é publicada, o PatchMon pode continuar informando uma versão mais antiga como a mais recente. Isso é esperado e faz parte da nossa implantação em fases. Veja [Por que a versão mais nova pode levar um dia para aparecer](#why-the-newest-version-can-take-a-day-to-appear), no capítulo sobre Docker.

---

### Desinstalando

```bash
# Uninstall the release
helm uninstall patchmon -n patchmon

# Clean up PVCs (this deletes all data)
kubectl delete pvc -n patchmon -l app.kubernetes.io/instance=patchmon
```

---

### Configuração avançada

#### Registry de imagens próprio (air-gapped)

```yaml
global:
  imageRegistry: "registry.example.com"
```

Isso faz todos os pulls de imagem usarem o registry indicado:

- `registry.example.com/postgres:17-alpine`
- `registry.example.com/redis:7-alpine`
- `registry.example.com/patchmon/patchmon-server:2.0.0`
- `registry.example.com/guacamole/guacd:1.6.0` (quando o RDP está ativo)

#### Horizontal Pod Autoscaling

```yaml
server:
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70
```

> **Observação:** a partir da 2.0, é seguro escalar o servidor para mais de uma réplica. Não há volumes locais graváveis, e os jobs em segundo plano são coordenados pelo Redis + Asynq. As conexões WebSocket (WS dos agentes, WS do terminal SSH, transmissões ao vivo de patches) precisam de sessões fixas (sticky) no Ingress controller se você rodar várias réplicas; defina `nginx.ingress.kubernetes.io/affinity: cookie` nas annotations do Ingress.

#### Usando um banco de dados externo

Desative o banco embutido e defina `DATABASE_URL` apontando para uma instância externa do PostgreSQL:

```yaml
database:
  enabled: false

server:
  env:
    DATABASE_URL: "postgresql://patchmon:password@external-db.example.com:5432/patchmon"
```

#### Integração com OIDC / SSO

```yaml
server:
  env:
    OIDC_ENABLED: "true"
    OIDC_ISSUER_URL: "https://auth.example.com/realms/master"
    OIDC_CLIENT_ID: "patchmon"
    OIDC_REDIRECT_URI: "https://patchmon.example.com/api/v1/auth/oidc/callback"
    OIDC_SCOPES: "openid profile email groups"
    OIDC_BUTTON_TEXT: "Login with SSO"
    OIDC_AUTO_CREATE_USERS: "true"
    OIDC_SYNC_ROLES: "true"
    OIDC_ADMIN_GROUP: "patchmon-admins"
```

O client secret deve ficar num Secret do Kubernetes e ser montado como `OIDC_CLIENT_SECRET`, e não definido direto no arquivo.

---

### Implantando com manifests simples {#deploying-with-plain-manifests}

Se você implanta com Argo CD ou Flux, ou prefere controlar cada objeto, dá para dispensar o Helm por completo. Os manifests abaixo formam uma stack completa e funcional: PostgreSQL, Redis, o servidor do PatchMon, um Service e um Ingress.

Eles foram escritos para k3s com armazenamento [Longhorn](https://longhorn.io/) e o Ingress controller Traefik que vem embutido, por ser uma combinação comum em ambientes auto-hospedados, mas funcionam em qualquer cluster depois de ajustar `storageClassName` e `ingressClassName`.

> **Leia a observação sobre o volume antes de implantar.** O erro mais comum ao escrever manifests do PostgreSQL à mão custa o seu banco de dados já na primeira reimplantação. Ele é explicado em [O diretório de dados do PostgreSQL](#the-postgresql-data-directory), abaixo, e os manifests daqui já o levam em conta.

#### 1. Crie o namespace e os segredos

```bash
kubectl create namespace patchmon

kubectl create secret generic patchmon-secrets \
  --namespace patchmon \
  --from-literal=JWT_SECRET="$(openssl rand -hex 64)" \
  --from-literal=SESSION_SECRET="$(openssl rand -hex 64)" \
  --from-literal=AI_ENCRYPTION_KEY="$(openssl rand -hex 64)" \
  --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 32)" \
  --from-literal=REDIS_PASSWORD="$(openssl rand -hex 32)"
```

Se você guarda os manifests no Git, não faça commit disso em texto claro. Use [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets), [SOPS](https://github.com/getsops/sops) ou o [External Secrets Operator](https://external-secrets.io/). As chaves acima são consumidas como variáveis de ambiente, então mantenha os nomes exatamente como estão.

#### 2. Aplique os manifests

Salve isto como `patchmon.yaml`, troque `patchmon.example.com` pelo seu hostname tanto no ConfigMap quanto no Ingress e aplique.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: patchmon-config
  namespace: patchmon
data:
  # Must match exactly the URL your users open PatchMon on.
  CORS_ORIGIN: "https://patchmon.example.com"
  POSTGRES_HOST: "patchmon-db"
  POSTGRES_USER: "patchmon_user"
  POSTGRES_DB: "patchmon_db"
  REDIS_HOST: "patchmon-redis"
  REDIS_PORT: "6379"
  REDIS_DB: "0"
  PORT: "3000"
  # Required when running behind an Ingress controller.
  TRUST_PROXY: "true"
  TZ: "UTC"
---
# ------------------------------------------------------------------ PostgreSQL
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: patchmon-db-data
  namespace: patchmon
  annotations:
    # Keeps Argo CD from ever pruning or deleting the database volume.
    argocd.argoproj.io/sync-options: Prune=false,Delete=false
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: longhorn
  resources:
    requests:
      storage: 8Gi
---
apiVersion: v1
kind: Service
metadata:
  name: patchmon-db
  namespace: patchmon
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: patchmon-db
  ports:
    - name: postgres
      port: 5432
      targetPort: postgres
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: patchmon-db
  namespace: patchmon
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  replicas: 1
  # Never run two PostgreSQL pods against one ReadWriteOnce volume.
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app.kubernetes.io/name: patchmon-db
  template:
    metadata:
      labels:
        app.kubernetes.io/name: patchmon-db
    spec:
      containers:
        - name: postgres
          image: postgres:17-alpine
          ports:
            - name: postgres
              containerPort: 5432
          env:
            - name: POSTGRES_USER
              valueFrom:
                configMapKeyRef:
                  name: patchmon-config
                  key: POSTGRES_USER
            - name: POSTGRES_DB
              valueFrom:
                configMapKeyRef:
                  name: patchmon-config
                  key: POSTGRES_DB
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: patchmon-secrets
                  key: POSTGRES_PASSWORD
            # Do not change these two settings without reading
            # "The PostgreSQL data directory" below.
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: db-data
              mountPath: /var/lib/postgresql/data
          readinessProbe:
            exec:
              command:
                - sh
                - -c
                - pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" -h localhost
            initialDelaySeconds: 10
            periodSeconds: 10
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              memory: 512Mi
      volumes:
        - name: db-data
          persistentVolumeClaim:
            claimName: patchmon-db-data
---
# ----------------------------------------------------------------------- Redis
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: patchmon-redis-data
  namespace: patchmon
  annotations:
    argocd.argoproj.io/sync-options: Prune=false,Delete=false
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: longhorn
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Service
metadata:
  name: patchmon-redis
  namespace: patchmon
spec:
  selector:
    app.kubernetes.io/name: patchmon-redis
  ports:
    - name: redis
      port: 6379
      targetPort: 6379
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: patchmon-redis
  namespace: patchmon
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app.kubernetes.io/name: patchmon-redis
  template:
    metadata:
      labels:
        app.kubernetes.io/name: patchmon-redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          command: ["sh", "-c", "redis-server --requirepass \"$REDIS_PASSWORD\""]
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: patchmon-secrets
                  key: REDIS_PASSWORD
          ports:
            - name: redis
              containerPort: 6379
          volumeMounts:
            - name: data
              mountPath: /data
          readinessProbe:
            exec:
              command:
                - sh
                - -c
                - redis-cli --no-auth-warning -a "$REDIS_PASSWORD" ping
            periodSeconds: 10
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              memory: 256Mi
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: patchmon-redis-data
---
# ---------------------------------------------------------------------- Server
apiVersion: apps/v1
kind: Deployment
metadata:
  name: patchmon-server
  namespace: patchmon
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app.kubernetes.io/name: patchmon-server
  template:
    metadata:
      labels:
        app.kubernetes.io/name: patchmon-server
    spec:
      # Stable identity for the agent presence registry. Keep this, and give
      # each server process a distinct value if several share one Redis.
      hostname: patchmon-server
      containers:
        - name: server
          image: ghcr.io/patchmon/patchmon-server:latest
          ports:
            - name: http
              containerPort: 3000
          envFrom:
            - configMapRef:
                name: patchmon-config
            - secretRef:
                name: patchmon-secrets
          env:
            # $(VAR) resolves against the envFrom entries above, so this
            # assembles the URL from the ConfigMap and Secret values.
            - name: DATABASE_URL
              value: "postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@$(POSTGRES_HOST):5432/$(POSTGRES_DB)"
          startupProbe:
            tcpSocket:
              port: http
            # The first start applies the schema migrations.
            failureThreshold: 40
            periodSeconds: 10
          livenessProbe:
            tcpSocket:
              port: http
            periodSeconds: 30
          readinessProbe:
            tcpSocket:
              port: http
            periodSeconds: 15
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              memory: 1Gi
---
apiVersion: v1
kind: Service
metadata:
  name: patchmon-server
  namespace: patchmon
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: patchmon-server
  ports:
    - name: http
      port: 3000
      targetPort: http
---
# --------------------------------------------------------------------- Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: patchmon
  namespace: patchmon
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: traefik
  rules:
    - host: patchmon.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: patchmon-server
                port:
                  name: http
  tls:
    - hosts:
        - patchmon.example.com
      secretName: patchmon-tls
```

```bash
kubectl apply -f patchmon.yaml
kubectl get pods -n patchmon -w
```

Num cluster novo, o pod do servidor pode reiniciar uma ou duas vezes enquanto espera o PostgreSQL e o DNS do cluster subirem. Isso é esperado e se resolve sozinho. Acompanhe as migrações sendo aplicadas:

```bash
kubectl logs -n patchmon deploy/patchmon-server -f
```

Depois abra o seu hostname e conclua a [configuração inicial do administrador](#first-time-admin-setup).

#### O diretório de dados do PostgreSQL {#the-postgresql-data-directory}

Este é o detalhe que precisa sair certo. É por causa dele que um manifest de PostgreSQL escrito à mão pode parecer funcionar perfeitamente e ainda assim perder os dados na implantação seguinte.

A imagem `postgres` guarda os dados em `PGDATA`, cujo padrão é `/var/lib/postgresql/data`. O instinto óbvio é montar o volume no diretório pai, `/var/lib/postgresql`, e deixar o diretório de dados dentro dele. **Isso não funciona.** A imagem declara `VOLUME /var/lib/postgresql/data`, e o containerd respeita os volumes da imagem montando um diretório temporário exatamente nesse caminho. O seu volume persistente fica por baixo, e o `PGDATA` vai parar no diretório temporário:

```
/var/lib/postgresql       <- your PersistentVolumeClaim
/var/lib/postgresql/data  <- a per-container scratch directory, mounted on top
```

Esse diretório temporário é identificado pelo ID do contêiner. Ele é criado vazio e destruído junto com o contêiner. Por isso, toda reimplantação, e todo reinício de contêiner por falha de probe ou por falta de memória, entrega ao PostgreSQL um `PGDATA` vazio. O `initdb` roda de novo e você ganha um banco novo e vazio, enquanto o volume persistente guarda só um diretório `data` vazio.

Montar o volume em `/var/lib/postgresql/data` resolve isso, mas cria um segundo problema em armazenamento de bloco como Longhorn ou Ceph. Um volume ext4 recém-formatado já tem um diretório `lost+found`, e o `initdb` se recusa a usar um diretório que não esteja vazio:

```
initdb: error: directory "/var/lib/postgresql/data" exists but is not empty
initdb: detail: It contains a lost+found directory, perhaps due to it being a mount point.
initdb: hint: Using a mount point directly as the data directory is not recommended.
```

Então monte o volume em `/var/lib/postgresql/data` **e** aponte o `PGDATA` para um subdiretório dele, exatamente como os manifests acima fazem:

```yaml
env:
  - name: PGDATA
    value: /var/lib/postgresql/data/pgdata
volumeMounts:
  - name: db-data
    mountPath: /var/lib/postgresql/data
```

O Redis não precisa de tratamento equivalente. A imagem dele declara `VOLUME /data` e o manifest monta exatamente em `/data`, então a montagem explícita tem precedência.

Para confirmar que a sua implantação está correta, verifique se há só um sistema de arquivos montado sob o diretório de dados:

```bash
kubectl exec -n patchmon deploy/patchmon-db -- grep postgresql /proc/mounts
```

Uma linha significa que o volume está montado corretamente. Duas linhas significam que há um diretório temporário por cima dos seus dados, e o banco não vai sobreviver a uma reimplantação.

#### Observações para o Argo CD

- **Sync waves.** O banco e o Redis levam `argocd.argoproj.io/sync-wave: "0"` e o servidor leva `"1"`, então os serviços de dados se estabilizam antes de o servidor iniciar. Sem isso, o servidor entra em crash-loop algumas vezes na primeira sincronização antes de se recuperar.
- **Proteja os volumes.** Os dois PVCs levam `argocd.argoproj.io/sync-options: Prune=false,Delete=false`, então tirar o manifest do Git, ou excluir a Application do Argo CD, não leva o banco junto.
- **Nunca sincronize um PVC com Replace.** `Replace=true`, e a opção "Replace" numa sincronização manual, excluem e recriam o objeto. Numa StorageClass com a política de reclaim padrão `Delete`, isso destrói o volume e os dados.

#### Opcional: RDP no navegador

O servidor chega aos hosts Windows por RDP através de um sidecar `guacd`. Ele só é necessário para esse recurso. Para ativá-lo, adicione o Deployment e o Service abaixo e defina `GUACD_ADDRESS: "patchmon-guacd:4822"` no ConfigMap.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: patchmon-guacd
  namespace: patchmon
spec:
  selector:
    app.kubernetes.io/name: patchmon-guacd
  ports:
    - name: guacd
      port: 4822
      targetPort: 4822
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: patchmon-guacd
  namespace: patchmon
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: patchmon-guacd
  template:
    metadata:
      labels:
        app.kubernetes.io/name: patchmon-guacd
    spec:
      containers:
        - name: guacd
          image: guacamole/guacd:1.6.0
          ports:
            - name: guacd
              containerPort: 4822
          volumeMounts:
            - name: tmp
              mountPath: /tmp
          readinessProbe:
            tcpSocket:
              port: 4822
            initialDelaySeconds: 10
            periodSeconds: 10
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              memory: 512Mi
          securityContext:
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities:
              drop: [ALL]
      volumes:
        - name: tmp
          emptyDir:
            medium: Memory
            sizeLimit: 64Mi
```

#### Ingress controllers além do Traefik

O Traefik repassa WebSockets sem configuração extra, então o Ingress acima não precisa de annotations. No NGINX Ingress é preciso aumentar os tempos limite; caso contrário, as conexões dos agentes, os terminais SSH e as transmissões ao vivo de patches caem mais ou menos a cada 30 segundos:

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "86400"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "86400"
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
```

A lista completa de endpoints WebSocket a verificar está em [Exemplos de proxy reverso](#reverse-proxy-examples).

---

### Solução de problemas

#### Veja o status dos pods

```bash
kubectl get pods -n patchmon
kubectl describe pod <pod-name> -n patchmon
kubectl logs <pod-name> -n patchmon
```

#### Veja os logs dos init containers (esperando o banco ou o Redis)

```bash
kubectl logs <pod-name> -n patchmon -c wait-for-database
kubectl logs <pod-name> -n patchmon -c wait-for-redis
```

#### Veja os logs das migrações

As migrações rodam dentro do pod do servidor, na inicialização. Acompanhe os logs de inicialização:

```bash
kubectl logs -n patchmon deploy/patchmon-server --since=5m | grep migrate
```

Devem aparecer linhas como `[migrate] running migrations from embedded binary` e, em seguida, `[migrate] applied successfully (version N)` ou `[migrate] already up to date`.

#### Health check

O servidor expõe um probe de liveness em `/health`:

```bash
kubectl exec -n patchmon -it deploy/patchmon-server -- wget -qO- http://localhost:3000/health
```

A resposta é `healthy` (texto simples), ou uma estrutura JSON quando o cabeçalho `Accept: application/json` é enviado.

#### Problemas comuns

| Sintoma | Causa provável | Correção |
|---------|-------------|-----|
| Pods presos no estado `Init` | Banco ou Redis ainda não está rodando | `kubectl describe sts -n patchmon` |
| PVC preso em `Pending` | Nenhuma StorageClass compatível | Rode `kubectl get sc` e defina `global.storageClass` |
| `ImagePullBackOff` | Faltam credenciais do registry | Verifique `imagePullSecrets` e o caminho da imagem |
| O Ingress retorna 404 / 502 | Ingress mal configurado ou apontando para a porta errada | Todo o tráfego deve ir para `server:3000` |
| Conexões WebSocket caem a cada ~30s | Tempo limite de leitura padrão do Ingress curto demais | Defina `proxy-read-timeout: "86400"` |
| `secret ... not found` | O Secret necessário não foi criado antes da instalação | Crie o Secret ou defina `secret.create: true` |
| O banco volta a ficar vazio a cada reimplantação, e o assistente de configuração reaparece | Manifests escritos à mão montando o volume em `/var/lib/postgresql` em vez de em `PGDATA` | Veja [O diretório de dados do PostgreSQL](#the-postgresql-data-directory) |
| `initdb: error: directory ... exists but is not empty` | Volume montado direto em `PGDATA` num armazenamento de bloco, que tem `lost+found` | Aponte o `PGDATA` para um subdiretório da montagem. Veja [O diretório de dados do PostgreSQL](#the-postgresql-data-directory) |
| Erros de CORS no navegador | `CORS_ORIGIN` não bate com a URL que os usuários veem | Defina com a URL exata do host do Ingress. Se o chart expõe mais de um host no Ingress, separe-os por vírgula, sem espaços, por exemplo `https://patchmon.example.com,https://patchmon.internal.lan` |

---

### Suporte

- Problemas do chart: [github.com/RuTHlessBEat200/PatchMon-helm/issues](https://github.com/RuTHlessBEat200/PatchMon-helm/issues)
- Problemas do aplicativo: [github.com/PatchMon/PatchMon](https://github.com/PatchMon/PatchMon)
- Comunidade: [Discord](https://patchmon.net/discord)

---

### Veja também

- [Instalando o servidor do PatchMon com Docker](#installing-patchmon-server-on-docker): o método de implantação oficialmente suportado
- [Implantando com manifests simples](#deploying-with-plain-manifests): a stack YAML completa para k3s, Argo CD e Flux
- [Exemplos de proxy reverso](#reverse-proxy-examples): trechos para Nginx, Caddy e Traefik
- [Referência de variáveis de ambiente do PatchMon](#patchmon-environment-variables-reference): todas as variáveis que o servidor lê
- [Configuração inicial do administrador](#first-time-admin-setup): o que fazer depois que o pod estiver rodando

---

## Capítulo 3: Exemplos de proxy reverso {#reverse-proxy-examples}

### Visão geral

O PatchMon 2.0 roda como um único contêiner Docker que escuta na **porta 3000** dentro do contêiner. A API REST, o frontend React embutido e todos os endpoints WebSocket são servidos por essa mesma porta. Na frente dele fica um proxy reverso, para terminar o TLS, oferecer HTTP/2 e dar um hostname público estável.

Esta seção traz trechos prontos para os proxies reversos auto-hospedados mais comuns:

- [Nginx](#nginx)
- [Caddy](#caddy)
- [Traefik](#traefik)
- [Nginx Proxy Manager](#nginx-proxy-manager)

Todos os trechos partem do princípio de que o contêiner do PatchMon é alcançável em `http://patchmon:3000` (nome do serviço no Docker) ou em `http://<host>:3000` (servidor físico / VM). Ajuste conforme o seu caso.

---

### O que o seu proxy precisa fazer

Todo proxy reverso na frente do PatchMon, seja qual for, precisa acertar quatro coisas:

1. **Terminar o TLS** no hostname público (`patchmon.example.com`) e encaminhar ao servidor em HTTP simples.
2. **Fazer o upgrade das conexões WebSocket.** O PatchMon usa WebSockets de longa duração para:
   - Canal de controle dos agentes: `/api/v1/agents/ws`
   - Terminal SSH no navegador: `/api/v1/ssh-terminal/{hostId}`
   - Túnel RDP no navegador: `/api/v1/rdp/websocket-tunnel`
   - Transmissão ao vivo do log das execuções de patch: `/api/v1/patching/runs/{id}/stream`
3. **Repassar o protocolo original** em `X-Forwarded-Proto: https`. O servidor lê esse cabeçalho para saber que a conexão é segura e para montar as URLs `wss://` corretas para os agentes.
4. **Usar um tempo limite de leitura longo (86400 segundos / 24 horas).** O canal de controle dos agentes é uma conexão que tolera ficar ociosa e manda pings a cada 30 segundos; a maioria dos proxies tem por padrão um tempo limite de ociosidade de 60 segundos e derruba a conexão antes de o agente perceber a desconexão.

Se você também quer que o servidor enxergue o IP real do cliente para logs e limites de requisição (em vez do IP do proxy), defina `TRUST_PROXY=true` no `.env` do PatchMon. Os detalhes estão na [Referência de variáveis de ambiente](#patchmon-environment-variables-reference).

---

### Endpoints WebSocket a verificar

Ao ligar um proxy pela primeira vez, teste estes quatro endpoints pelo navegador ou pelo agente e confirme que eles continuam conectados. Os quatro exigem o mesmo tratamento de upgrade e tempo limite longo:

| Endpoint | Usado por | Autenticação |
|---|---|---|
| `/api/v1/agents/ws` | Agente do PatchMon | Cabeçalhos `X-API-ID` + `X-API-KEY` |
| `/api/v1/ssh-terminal/{hostId}` | Terminal SSH no navegador | Ticket de curta duração em `?ticket=...` |
| `/api/v1/rdp/websocket-tunnel` | RDP no navegador (Guacamole) | Ticket de curta duração |
| `/api/v1/patching/runs/{id}/stream` | Interface de log ao vivo das execuções de patch | Cookie JWT / bearer |

Se os seus agentes aparecem como "connecting" e caem a cada poucos minutos, o tempo limite de leitura quase certamente está curto demais.

---

### Nginx {#nginx}

Um bloco mínimo de produção para uma instância do PatchMon atrás do Nginx, com TLS do Let's Encrypt:

```nginx
# /etc/nginx/sites-available/patchmon.conf
#
# Put the WebSocket upgrade map in the http block (e.g. nginx.conf) or at the
# top of this file inside any 'http' context you manage.

map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    listen [::]:80;
    server_name patchmon.example.com;

    # Redirect everything to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name patchmon.example.com;

    ssl_certificate     /etc/letsencrypt/live/patchmon.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/patchmon.example.com/privkey.pem;

    # Modern TLS profile; adjust to taste
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # Allow large agent reports (packages, Docker inventory, compliance scan
    # results) through the proxy. The server also enforces its own limits: see
    # JSON_BODY_LIMIT, AGENT_UPDATE_BODY_LIMIT and COMPLIANCE_BODY_LIMIT.
    client_max_body_size 40m;

    location / {
        proxy_pass http://127.0.0.1:3000;

        # Required for WebSockets (agent WS, SSH terminal, RDP, patch stream)
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Preserve original host + client info
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;

        # Long-lived WebSockets — 24h idle timeout so agent connections
        # aren't dropped by the proxy. PatchMon sends its own keepalive pings.
        proxy_read_timeout  86400s;
        proxy_send_timeout  86400s;
        proxy_connect_timeout 60s;

        # Do not buffer Server-Sent Events or streaming responses
        proxy_buffering off;
        proxy_cache     off;
    }
}
```

Ative e recarregue:

```bash
sudo ln -s /etc/nginx/sites-available/patchmon.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

> **Dica:** se o PatchMon estiver num host diferente do Nginx, troque `127.0.0.1:3000` pelo endereço alcançável do contêiner. A configuração mais limpa é pôr o contêiner do PatchMon e o Nginx na mesma rede Docker e usar o nome do serviço.

---

### Caddy {#caddy}

O Caddy cuida sozinho dos certificados TLS, do HTTP/2 e do upgrade de WebSocket. O `Caddyfile` inteiro costuma ter quatro linhas:

```caddy
# /etc/caddy/Caddyfile

patchmon.example.com {
    reverse_proxy 127.0.0.1:3000 {
        # 24h timeout for long-lived agent WebSockets.
        # PatchMon sends its own pings; this just keeps Caddy from dropping
        # an otherwise-healthy idle connection.
        transport http {
            read_timeout 86400s
            write_timeout 86400s
        }
    }
}
```

Essa é a configuração completa. O Caddy:

- Obtém e renova o certificado TLS do Let's Encrypt automaticamente.
- Define `X-Forwarded-Proto` e `X-Forwarded-For` por padrão.
- Faz o upgrade das conexões WebSocket de forma transparente.

Recarregue:

```bash
sudo systemctl reload caddy
```

#### Trecho de Docker Compose

Se você roda o Caddy no Docker ao lado do PatchMon:

```yaml
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - patchmon-internal

volumes:
  caddy_data:
  caddy_config:
```

E aponte o Caddyfile para o nome do serviço no compose:

```caddy
patchmon.example.com {
    reverse_proxy server:3000 {
        transport http {
            read_timeout 86400s
            write_timeout 86400s
        }
    }
}
```

---

### Traefik {#traefik}

O Traefik combina bem com o Docker Compose porque descobre os serviços pelos labels dos contêineres.

#### docker-compose.yml: mínimo

```yaml
name: patchmon

services:
  traefik:
    image: traefik:v3
    restart: unless-stopped
    command:
      - "--api.dashboard=false"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      # Redirect http -> https
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      # Let's Encrypt
      - "--certificatesresolvers.le.acme.tlschallenge=true"
      - "--certificatesresolvers.le.acme.email=admin@example.com"
      - "--certificatesresolvers.le.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./letsencrypt:/letsencrypt
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - patchmon-internal

  server:
    image: ghcr.io/patchmon/patchmon-server:latest
    restart: unless-stopped
    env_file: .env
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.patchmon.rule=Host(`patchmon.example.com`)"
      - "traefik.http.routers.patchmon.entrypoints=websecure"
      - "traefik.http.routers.patchmon.tls.certresolver=le"
      - "traefik.http.services.patchmon.loadbalancer.server.port=3000"
    networks:
      - patchmon-internal
    depends_on:
      - database
      - redis

networks:
  patchmon-internal:
    driver: bridge
```

#### O middleware de tempo limite de leitura longo

O Traefik tem, por padrão, tempos limite por requisição muito curtos. Para o WebSocket do agente continuar vivo, adicione um `serversTransport` com tempo limite de leitura de 24 horas e ligue-o ao serviço. Coloque isso numa configuração **estática** (um arquivo referenciado por `--providers.file` ou uma flag de linha de comando, porque não é possível definir `serversTransport` por labels de contêiner):

```yaml
# /etc/traefik/dynamic.yml
http:
  serversTransports:
    patchmon-longtimeout:
      forwardingTimeouts:
        dialTimeout: "30s"
        responseHeaderTimeout: "0s"   # disable response header timeout
        idleConnTimeout: "86400s"

  services:
    patchmon:
      loadBalancer:
        serversTransport: patchmon-longtimeout
        servers:
          - url: "http://server:3000"
```

E diga ao Traefik para carregá-lo:

```yaml
# in the traefik command block
- "--providers.file.filename=/etc/traefik/dynamic.yml"
# mount it
volumes:
  - ./dynamic.yml:/etc/traefik/dynamic.yml:ro
```

> Os tempos limite padrão de leitura/escrita do Traefik servem para HTTP comum, mas derrubam o WebSocket de longa duração do agente. O `idleConnTimeout` de 24 horas e o `responseHeaderTimeout` zerado são as peças que resolvem.

O Traefik automaticamente:

- Termina o TLS no entry point `websecure`.
- Repassa `X-Forwarded-Proto`, `X-Forwarded-For` e `X-Forwarded-Host`.
- Faz o upgrade das conexões WebSocket quando o cliente manda `Upgrade: websocket`.

---

### Nginx Proxy Manager {#nginx-proxy-manager}

O [Nginx Proxy Manager](https://nginxproxymanager.com/) (NPM) é uma interface web auto-hospedada popular para gerenciar entradas de proxy reverso no Nginx. Ele resolve a maior parte do que o PatchMon precisa com duas chaves, mas o tempo limite de leitura padrão é curto demais para os WebSockets de longa duração dos agentes.

#### Passo a passo

1. No NPM, crie um **Proxy Host** apontando para o contêiner do PatchMon (esquema `http`, hostname `patchmon` ou o IP do host, porta `3000`).
2. Na aba **Details**, ative:
   - **Block Common Exploits**
   - **Websockets Support**
3. Associe o certificado SSL na aba **SSL** e ative **Force SSL** e **HTTP/2 Support**.
4. Na aba **Advanced**, cole o trecho abaixo para aumentar o tempo limite de leitura dos WebSockets dos agentes e da transmissão ao vivo dos logs de patch:

```nginx
# PatchMon — extend read timeout for long-lived WebSockets
# (agent control channel, SSH terminal, RDP tunnel, patch stream)
proxy_read_timeout  86400s;
proxy_send_timeout  86400s;
proxy_buffering     off;
proxy_request_buffering off;

# Ensure X-Forwarded-Proto is set correctly for HTTPS detection inside the app.
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host  $host;
```

5. Salve. Teste a URL no navegador e, quando a interface carregar, registre um agente e veja se ele continua online na página **Hosts** por mais de alguns minutos. Esse é o teste de verdade.

> **Dica:** se você usa Cloudflare ou qualquer outro proxy intermediário, ele também precisa estar configurado para deixar passar WebSockets. A Cloudflare tem WebSockets ativados por padrão; outras CDNs podem exigir ativação explícita.

---

### Verificando a configuração

Com o proxy no ar, verifique os quatro endpoints WebSocket, um de cada vez.

#### 1. A interface carrega por HTTPS

Abra `https://patchmon.example.com`. A tela de login do PatchMon deve aparecer com um certificado válido e sem avisos de conteúdo misto.

#### 2. Canal de controle dos agentes

Registre um agente com o comando de instalação de **Hosts → Add Host → Install**. Em poucos segundos, o host deve aparecer na lista com o indicador WebSocket verde **online**. Deixe rodando por pelo menos 10 minutos; se ele desconectar nesse intervalo, o tempo limite de leitura do proxy está curto demais.

Veja os logs do agente no servidor de destino:

```bash
sudo journalctl -u patchmon-agent -n 50
```

O que você quer ver é `WebSocket connected`, sem laços repetidos de reconexão.

#### 3. Transmissão ao vivo dos patches

Dispare uma simulação de patch em qualquer host pela interface. O painel de saída deve mostrar stdout/stderr à medida que o comando roda. Se ficar parado sem saída e depois imprimir tudo de uma vez no fim, o proxy está fazendo buffer. Confira de novo `proxy_buffering off` (Nginx, NPM) ou `proxy_request_buffering off` (NPM).

#### 4. Terminal SSH

Abra **Hosts → <um host> → SSH Terminal**. O terminal deve se conectar e ecoar as teclas em tempo real. Se ele conecta e trava depois de 30–60 segundos, o problema é, de novo, o tempo limite de leitura.

---

### Armadilhas comuns

| Sintoma | Causa provável | Correção |
|---|---|---|
| Os agentes reconectam a cada ~60 segundos | Tempo limite de leitura do proxy curto demais | Defina `86400s` |
| A saída ao vivo do patch chega toda de uma vez | Buffer do proxy ativado | `proxy_buffering off` |
| URLs `wss://` viram `http://` dentro do script de instalação do agente | `X-Forwarded-Proto` ausente ou errado | Defina explicitamente como `$scheme` (Nginx); no Caddy e no Traefik já é o padrão |
| Console do navegador: erros de "CORS policy" | `CORS_ORIGIN` não bate com a URL da barra de endereço | Defina exatamente `CORS_ORIGIN=https://patchmon.example.com`. Para permitir mais de uma origem, separe por vírgula, sem espaços, por exemplo `CORS_ORIGIN=https://patchmon.example.com,https://patchmon.internal.lan` |
| O login funciona, mas nada carrega | As requisições da API vão para outra origem | Mande todo o tráfego (API + SPA) para o mesmo hostname/porta |
| 413 Request Entity Too Large de repente | Limite de corpo do proxy menor que o relatório do agente ou o resultado da varredura de conformidade | `client_max_body_size 40m;` (Nginx) ou equivalente |
| A página do agente mostra "offline", mas os logs do agente dizem que está conectado | O proxy reverso não está mandando `X-Forwarded-For`, ou `TRUST_PROXY=false` foi definido explicitamente | Garanta que o proxy reverso acrescente `X-Forwarded-For` e deixe `TRUST_PROXY` no padrão, `true` |

---

### Veja também

- [Instalando o servidor do PatchMon com Docker](#installing-patchmon-server-on-docker): o arquivo compose oficial que fica atrás deste proxy
- [Referência de variáveis de ambiente do PatchMon](#patchmon-environment-variables-reference): detalhes de `CORS_ORIGIN`, `TRUST_PROXY` e `ENABLE_HSTS`
- Arquitetura de WebSockets: como o PatchMon usa WebSockets por dentro

---

## Capítulo 4: Configuração inicial do administrador {#first-time-admin-setup}

### Visão geral

Na primeira vez que você abre no navegador uma instalação nova do PatchMon, aparece o **assistente de configuração inicial** em vez da tela de login. O assistente cria a sua conta de superadmin, opcionalmente configura a autenticação multifator, confirma a URL que os agentes vão usar para se conectar ao servidor e leva você ao painel.

O assistente só aparece enquanto não existe nenhum usuário administrador no banco. Depois que a conta de superadmin é criada, ele some de vez e a tela de login assume.

Esta seção percorre cada etapa, para você saber o que esperar.

#### Pré-requisitos

Antes do assistente, o PatchMon já precisa estar rodando. Você deve conseguir abrir `http://localhost:3000` (ou a URL configurada) no navegador e ver a tela de boas-vindas do assistente. Se não conseguir, verifique:

- [Instalando o servidor do PatchMon com Docker](#installing-patchmon-server-on-docker): para implantações com Docker
- [Instalando o PatchMon no Kubernetes](#installing-patchmon-on-kubernetes-helm): para implantações no Kubernetes, com Helm ou manifests simples
- [Exemplos de proxy reverso](#reverse-proxy-examples): se você está atrás de Nginx, Caddy, Traefik ou NPM

---

### As etapas do assistente num relance

O assistente tem até cinco etapas. Algumas são puladas conforme o modo de implantação:

| Etapa | Nome | Sempre aparece? |
|---|---|---|
| 1 | Create Admin Account | Sim |
| 2 | Multi-Factor Authentication | Sim |
| 3 | Confirm Server URL | Só na versão auto-hospedada |
| 4 | Stay Updated (adesão à newsletter) | Oculta quando a newsletter está desativada |
| 5 | Get in Touch (links da comunidade) | Sim |

Na versão auto-hospedada, aparecem as cinco etapas. No PatchMon Cloud, a etapa 3 é pulada (a URL do servidor já vem definida) e algumas das outras podem não aparecer, conforme a identidade visual.

---

### Etapa 1: Create Admin Account

A primeira tela pede nome, usuário, e-mail e senha do superadmin.

#### Campos

| Campo | Regras |
|---|---|
| **First name** | Obrigatório |
| **Last name** | Obrigatório |
| **Username** | Obrigatório, com pelo menos 2 caracteres. Usado no login. |
| **Email** | Obrigatório, em formato de e-mail válido |
| **Password** | Precisa atender à política de senha em vigor (veja abaixo) |
| **Confirm password** | Precisa ser igual à senha |

#### Política de senha

A política de senha é lida do servidor na hora (`GET /api/v1/settings/login-settings`). Por padrão, exige:

- Pelo menos 8 caracteres
- Uma letra maiúscula
- Uma letra minúscula
- Um número
- Um caractere especial

Um medidor de força e uma lista de verificação por regra, abaixo do campo de senha, mostram quais regras estão atendidas enquanto você digita.

> **Dica:** se quiser uma política mais fraca ou mais forte antes do primeiro login, defina as variáveis `PASSWORD_*` no `.env` antes de rodar `docker compose up -d`. A lista completa está na [Referência de variáveis de ambiente](#patchmon-environment-variables-reference).

#### O que acontece ao clicar em Next

O formulário é validado primeiro no navegador; depois, o servidor confirma que ainda não existe nenhum administrador antes de aceitar o envio. Se alguém já criou um administrador (por exemplo, porque duas pessoas abriram o assistente ao mesmo tempo), aparece `Admin users already exist. This endpoint is only for first-time setup.` Vale o primeiro envio; entre com essas credenciais.

O usuário administrador é criado com o papel **`superadmin`**, que tem todas as permissões do sistema. Depois de entrar, você pode rebaixá-lo ou criar papéis mais restritos em **Settings → Users → Roles**.

---

### Etapa 2: Multi-Factor Authentication

Depois dos dados da conta de administrador, o assistente oferece configurar a autenticação multifator (MFA) baseada em TOTP. Há duas escolhas:

- **Setup MFA now**: a conta de administrador é criada na hora e a configuração de TFA aparece ali mesmo. Você lê um QR code, confirma com um código de 6 dígitos e recebe códigos de backup de uso único para guardar em lugar seguro.
- **Skip (I'll do it later)**: o assistente segue e a conta de administrador é criada no final, com MFA desativado. Dá para ativá-lo a qualquer momento em **Settings → My Profile → Two-Factor Authentication**.

#### O fluxo "Setup MFA now"

Clicar em **Setup MFA now** faz três coisas:

1. Cria a conta de administrador na hora (e não no fim do assistente).
2. Faz o seu login automaticamente (os cookies de sessão são definidos).
3. Mostra um QR code gerado pelo endpoint padrão de configuração de TOTP (`GET /api/v1/tfa/setup`).

Siga as instruções da página:

1. **Leia o QR code** com um aplicativo autenticador (Google Authenticator, Authy, 1Password, Bitwarden, Proton Authenticator etc.). A maioria dos aplicativos TOTP que seguem o padrão funciona.
2. **Informe o código de 6 dígitos** que o aplicativo mostra.
3. **Guarde os códigos de backup.** O PatchMon emite um conjunto de códigos de backup de uso único quando a verificação do MFA dá certo. Baixe-os como arquivo de texto e guarde num lugar que **não** seja o aplicativo autenticador (um gerenciador de senhas é o ideal). Cada código pode ser usado uma única vez se você perder o autenticador; quando acabarem, você precisará redefinir o MFA entrando com outra conta de administrador.
4. Clique em **Continue** para voltar ao assistente.

> **Importante:** os códigos de backup aparecem **uma única vez**. Se fechar a aba antes de copiá-los, você precisará desativar e reativar o MFA na página de perfil para gerar um conjunto novo.

#### Por que o MFA é recomendado

A conta de administrador tem controle total sobre o parque: pode disparar execuções de patch, ler o inventário de todos os hosts e gerenciar todos os usuários. Se a senha do administrador vazar, o MFA é a barreira que resta entre um atacante e a sua infraestrutura. Ative-o em toda implantação de produção.

---

### Etapa 3: Confirm Server URL

Esta etapa só aparece nas implantações auto-hospedadas. No PatchMon Cloud, a URL do servidor já vem definida e a etapa é pulada.

#### O que é a "URL do servidor"

É a URL que os **agentes** usam para se conectar ao servidor do PatchMon (não a URL que os usuários abrem no navegador, embora normalmente seja a mesma). Ela fica no banco e entra em todo comando de instalação de agente que a interface gera. Se você a mudar depois, os agentes novos passam a usar o novo valor; os existentes continuam com a URL com que foram instalados até você rodar de novo o script de instalação neles.

#### Campos

| Campo | Descrição |
|---|---|
| **Protocol** | `HTTP` ou `HTTPS`. Use `HTTPS` em qualquer implantação que não seja de laboratório. |
| **Host** | O nome DNS ou o IP que os agentes alcançam, por exemplo `patchmon.example.com`. |
| **Port** | Porta pública. Normalmente `443` para HTTPS, `80` para HTTP ou `3000` em instalações com acesso direto ao contêiner, sem proxy reverso. |

O assistente preenche esses campos chamando `GET /api/v1/settings/current-url`, que reflete a URL da barra de endereço do navegador. Se você abriu o assistente em `https://patchmon.example.com`, os valores já estão corretos.

#### Chave de SSL autoassinado

A chave **"Will you be using a self-signed SSL certificate?"** define se o comando de instalação gerado pela interface passa `-k` ao `curl`. Ative-a **só** se o seu certificado TLS não for confiável pelo pacote de CAs do sistema nos hosts de destino, por exemplo um certificado interno de CA privada.

> **Atenção:** `skip_ssl_verify` também desativa a verificação de TLS no agente, o que expõe os agentes a ataques man-in-the-middle no caminho de rede do registro. A correção preferível é instalar a sua CA no repositório de confiança do host (`/usr/local/share/ca-certificates/` no Debian/Ubuntu, `/etc/pki/ca-trust/source/anchors/` no RHEL/Fedora). Só ative a chave em laboratório ou em implantações isoladas (air-gapped).

Todos esses valores podem ser mudados depois em **Settings → Server URL**.

---

### Etapa 4: Stay Updated (opcional)

A etapa de adesão à newsletter oferece inscrever você na newsletter de segurança e novidades do PatchMon. Ligue a chave para se inscrever com o nome e o e-mail da etapa 1, ou deixe desligada para pular.

Não há rastreamento. A única chamada de rede é um pedido de inscrição ao endpoint de marketing do projeto quando você avança, e só com a chave ligada. O seu e-mail nunca é enviado a lugar nenhum sem a sua adesão explícita.

A etapa fica oculta se a resposta de login-settings do servidor trouxer `show_newsletter: false` (por exemplo, em instalações auto-hospedadas que desativaram o marketing).

---

### Etapa 5: Get in Touch

A tela final lista links de comunidade e suporte: Discord, GitHub, documentação, roadmap de recursos e reporte de bugs. Pedidos de recurso vão para o portal de feedback; bugs vão para as GitHub Issues. Clique em **Access Dashboard** para concluir a configuração.

#### O que acontece ao concluir

1. Se você não escolheu "Setup MFA now" antes, a conta de administrador é criada agora, via `POST /api/v1/auth/setup-admin`.
2. As configurações de URL do servidor são salvas via `PATCH /api/v1/settings` (só na versão auto-hospedada).
3. Se você aderiu à newsletter, sai um pedido de inscrição.
4. Os cookies da sua sessão de administrador são definidos e você vai para `/` (o painel).

O assistente inicial está concluído. Da próxima vez que abrir o PatchMon, você verá a tela de login normal.

---

### Erros que podem aparecer

#### "Admin users already exist"

O servidor já tem pelo menos uma conta de administrador. O assistente só aparece com o banco vazio. Entre com as credenciais do administrador existente.

#### "Password does not meet the password policy"

Uma ou mais regras de senha não foram atendidas. Releia a lista de verificação abaixo do campo de senha. Cada item sem marcação é uma regra que falhou.

#### "Setting up PatchMon" travado numa etapa

Se o indicador de carregamento ficar em "Creating admin account..." ou "Saving server URL..." por mais de 10 segundos, há algo errado entre o navegador e o servidor. Aparece uma barra vermelha de erro com dois botões:

- **Retry**: repete a mesma chamada. Útil para falhas de rede passageiras.
- **Skip and continue**: se a conta de administrador foi criada mas o salvamento da URL falhou, isso leva você ao painel mesmo assim. Dá para terminar a configuração da URL em **Settings → Server URL**.

Em paralelo, veja os logs do servidor:

```bash
docker compose logs -f server
```

#### O navegador mostra "CORS policy" depois de clicar em Next

O seu `CORS_ORIGIN` não bate com a URL da barra de endereço do navegador. Corrija no `.env`, reinicie o contêiner `server` e recarregue a página. Se os usuários acessam o PatchMon por mais de uma URL, separe os valores por vírgula, sem espaços, por exemplo `CORS_ORIGIN=https://patchmon.example.com,https://patchmon.internal.lan`. Veja [Referência de variáveis de ambiente: `CORS_ORIGIN`](#2-server-configuration).

---

### Próximos passos

Com o assistente concluído, os próximos passos habituais são:

1. **Registre o primeiro host.** Vá a **Hosts → Add Host**, escolha o sistema operacional e copie o comando de instalação de uma linha gerado, para rodar no servidor.
2. **Confirme que o agente reporta.** Em até um minuto, o host deve aparecer na página Hosts com o indicador verde "online". Se não aparecer, veja [Gerenciando o agente do PatchMon](#managing-the-patchmon-agent).
3. **Revise as configurações.** O capítulo Configurações na interface web percorre todas as áreas de configuração, incluindo onde configurar OIDC SSO, identidade visual, notificações e alertas.
4. **Proteja a implantação.** Ative HTTPS com um proxy reverso ([Exemplos de proxy reverso](#reverse-proxy-examples)), defina `ENABLE_HSTS=true` e `TRUST_PROXY=true` e, em produção, considere ativar o OIDC SSO ou `OIDC_DISABLE_LOCAL_AUTH`.

---

### Veja também

- [Instalando o servidor do PatchMon com Docker](#installing-patchmon-server-on-docker)
- Configurações na interface web
- [Referência de variáveis de ambiente do PatchMon](#patchmon-environment-variables-reference)
- [Exemplos de proxy reverso](#reverse-proxy-examples)

---

## Capítulo 5: Referência de variáveis de ambiente do PatchMon {#patchmon-environment-variables-reference}

**Vale para: PatchMon 2.0+ (servidor em Go)**

Este documento é a referência oficial de todas as variáveis de ambiente suportadas pelo servidor do PatchMon. Configure-as no arquivo `.env`, que o Docker lê e repassa ao contêiner `server` via `env_file:`.

Por padrão, as variáveis são carregadas do `.env` no diretório de trabalho. Para usar outro arquivo, defina a variável `ENV_FILE` com o caminho que o servidor deve ler na inicialização.

### Como os valores são resolvidos

O PatchMon resolve a configuração nesta ordem, da maior para a menor prioridade:

1. **Variável de ambiente** (definida no `.env` ou na especificação do contêiner/Pod)
2. **Valor no banco de dados** (definido pela interface Settings; só para os valores marcados como _Editable in UI_ abaixo)
3. **Padrão embutido**

Ou seja: se uma variável está definida no `.env`, editá-la em **Settings → Environment** não tem efeito até você remover o valor do env. A interface marca os valores sobrescritos com um selo amarelo "env", para você ver num relance por que a sua mudança está sendo ignorada. Mais sobre ajustes em tempo de execução em Configurações na interface web.

---

### Sumário

1. [Variáveis obrigatórias](#1-required-variables)
2. [Configuração do servidor](#2-server-configuration)
3. [Pool de conexões do banco de dados](#3-database-connection-pool)
4. [Autenticação e sessões](#4-authentication-and-sessions)
5. [Configuração do Redis](#5-redis-configuration)
6. [Limites de requisição](#6-rate-limiting)
7. [Política de senha](#7-password-policy)
8. [Logs e profiling](#8-logging-and-profiling)
9. [OIDC / SSO](#9-oidc--sso)
10. [Conformidade / SSG](#10-compliance--ssg)
11. [RDP / Acesso remoto](#11-rdp--remote-access)
12. [Limites de corpo](#12-body-limits)
13. [Fuso horário](#13-timezone)
14. [Chaves de criptografia](#14-encryption-keys)
15. [Substituição dos binários do agente](#15-agent-binary-overrides)
16. [Telemetria](#16-telemetry)
17. [Carregamento de arquivos](#17-file-loading)

---

### 1. Variáveis obrigatórias {#1-required-variables}

O servidor se recusa a iniciar se qualquer uma destas estiver ausente ou vazia.

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `DATABASE_URL` | _(nenhum)_ | **Sim** | String de conexão do PostgreSQL. |
| `JWT_SECRET` | _(nenhum)_ | **Sim** | Chave secreta usada para assinar os tokens JWT. Precisa ser um valor forte, gerado aleatoriamente. |

**Exemplos:**

```bash
DATABASE_URL="postgresql://patchmon_user:strongpassword@localhost:5432/patchmon_db"
JWT_SECRET="$(openssl rand -hex 64)"
```

> Mantenha o `JWT_SECRET` estável entre reinícios. Mudá-lo invalida todas as sessões ativas e obriga todos os usuários a entrar de novo.

---

### 2. Configuração do servidor {#2-server-configuration}

Configurações gerais do servidor HTTP e de rede.

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `PORT` | `3000` | Não | Porta TCP em que o servidor escuta. Na stack do Docker Compose, o mapeamento de porta publicado segue este valor, então basta ajustar `CORS_ORIGIN` para combinar. |
| `APP_ENV` | `production` | Não | Ambiente de execução. Valores aceitos: `production`, `development`. `NODE_ENV` também é lido, como alias por compatibilidade; `APP_ENV` prevalece quando os dois estão definidos. |
| `CORS_ORIGIN` | `http://localhost:3000` | Não | Origem(ns) permitida(s) no CORS. Precisa ser exatamente a URL usada para acessar o PatchMon no navegador (protocolo, hostname e porta; sem caminho e sem barra no final). Para permitir várias origens, separe por vírgula, sem espaços (por exemplo, `https://patchmon.example.com,https://patchmon.internal.lan`). |
| `ENABLE_HSTS` | `false` | Não | Com `true`, o servidor acrescenta o cabeçalho `HTTP Strict Transport Security` às respostas. Ative só quando o PatchMon é servido por HTTPS. |
| `TRUST_PROXY` | `true` | Não | Com `true`, o servidor confia em `X-Forwarded-For` / `X-Forwarded-Proto` e cabeçalhos relacionados vindos de um proxy reverso (Traefik, Caddy, nginx, NPM etc.). Necessário para detectar corretamente o IP do cliente, aplicar os limites de requisição direito e passar na verificação de HTTPS do OIDC quando o TLS termina no proxy. O padrão é `true` porque a implantação oficialmente suportada é Docker atrás de um proxy reverso; defina `false` explicitamente só se o PatchMon estiver exposto direto à Internet, sem proxy. |
| `TRUSTED_PROXY_RANGES` | (vazio) | Não | CIDRs ou IPs, separados por vírgula, dos proxies reversos na frente do PatchMon, por exemplo `10.0.0.0/8,172.16.0.0/12`. Usado junto com `TRUST_PROXY` para descobrir o IP real do cliente a partir de `X-Forwarded-For`, o que alimenta os limites de requisição, o bloqueio de login e os logs de auditoria. Deixe vazio quando há um único proxy reverso, que é o caso comum: o PatchMon usa então o endereço que o seu proxy acrescentou ao cabeçalho, que o cliente não consegue forjar. Defina só quando há proxies encadeados (por exemplo, Cloudflare na frente do Nginx Proxy Manager), listando os saltos intermediários, para que o IP original do cliente seja resolvido em vez do endereço de saída da sua CDN. Configurável só por variável de ambiente, e exibido como somente leitura na interface de configurações, porque ampliá-lo permitiria que clientes falsificassem o próprio IP. |

**Exemplo de produção:**

```bash
PORT=3000
APP_ENV=production
CORS_ORIGIN=https://patchmon.example.com
ENABLE_HSTS=true
TRUST_PROXY=true
```

> Defina `CORS_ORIGIN` com a URL completa que os usuários digitam no navegador. Uma divergência aqui é a causa mais comum de erros de CORS logo depois de uma implantação nova. Se o PatchMon é acessado por várias URLs (por exemplo, um domínio externo e um endereço na LAN interna), liste-as separadas por vírgula, sem espaços: `CORS_ORIGIN=https://patchmon.example.com,https://patchmon.internal.lan`.

---

### 3. Pool de conexões do banco de dados {#3-database-connection-pool}

Estas variáveis controlam como o servidor gerencia o pool de conexões com o PostgreSQL. Os padrões servem para a maioria das implantações; ajuste-os se você monitora muitos hosts ou vê erros de tempo limite de conexão.

Todos os tempos limite estão em segundos, salvo indicação em contrário.

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `PM_DB_CONN_MAX_ATTEMPTS` | `30` | Não | Quantas vezes o servidor tenta se conectar ao banco na inicialização antes de desistir. Útil em ambientes com contêineres, em que o banco pode não estar pronto na hora. |
| `PM_DB_CONN_WAIT_INTERVAL` | `2` | Não | Segundos de espera entre as tentativas de conexão na inicialização. |
| `DB_CONNECTION_LIMIT` | `30` | Não | Número máximo de conexões simultâneas com o banco no pool. |
| `DB_POOL_TIMEOUT` | `20` | Não | Segundos de espera por uma conexão livre no pool antes de retornar erro de tempo limite. |
| `DB_CONNECT_TIMEOUT` | `10` | Não | Segundos de espera ao abrir cada nova conexão com o PostgreSQL. |
| `DB_IDLE_TIMEOUT` | `300` | Não | Segundos que uma conexão ociosa fica aberta antes de ser fechada e retirada do pool. |
| `DB_MAX_LIFETIME` | `1800` | Não | Vida máxima, em segundos, de qualquer conexão do pool, independentemente de atividade. As conexões são recicladas depois desse tempo, para evitar conexões velhas. |
| `DB_TRANSACTION_MAX_WAIT` | `10000` | Não | Milissegundos de espera para uma transação obter um lock no banco antes de desistir. |
| `DB_TRANSACTION_TIMEOUT` | `30000` | Não | Milissegundos permitidos para uma transação comum terminar. |
| `DB_TRANSACTION_LONG_TIMEOUT` | `60000` | Não | Milissegundos permitidos para operações longas (por exemplo, importações de pacotes em massa ou varreduras de conformidade). Aumente se essas operações estiverem estourando o tempo. |

**Orientação de dimensionamento:**

| Tamanho da implantação | `DB_CONNECTION_LIMIT` |
|---|---|
| Pequena (1–10 hosts) | `15` |
| Média (10–50 hosts) | `30` (padrão) |
| Grande (50+ hosts) | `50` ou mais |

Se aparecerem erros `connection pool exhausted` nos logs do servidor, aumente `DB_CONNECTION_LIMIT` de 10 em 10 e acompanhe até os erros pararem.

---

### 4. Autenticação e sessões {#4-authentication-and-sessions}

Configurações de tokens JWT, sessões do navegador, bloqueio de conta, autenticação em dois fatores e papéis de usuário.

#### JWT e tokens

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `JWT_SECRET` | _(nenhum)_ | **Sim** | Veja [Variáveis obrigatórias](#1-required-variables). |
| `JWT_EXPIRES_IN` | `1h` | Não | Por quanto tempo um token de acesso vale. Aceita durações como `30m`, `1h`, `2h`, `1d`. A interface web renova o token automaticamente em segundo plano, então um valor curto não é percebido por quem está conectado; ele só define em quanto tempo um token roubado deixa de servir. |
| `AUTH_BROWSER_SESSION_COOKIES` | `false` | Não | Com `true`, os cookies `token` e `refresh_token` são emitidos sem o atributo `Max-Age`, virando cookies de sessão, apagados quando o navegador fecha, em vez de persistirem entre reinícios do navegador. |

#### Bloqueio de conta

O bloqueio é aplicado por combinação de endereço IP do cliente e nome de usuário digitado, depois de tentativas de login seguidas com falha. Nomes de usuário que não existem também contam, então dá para chegar ao bloqueio num nome que nunca foi uma conta. Isso é proposital: assim, o momento em que o bloqueio começa não revela quais nomes de usuário existem de verdade.

Como o contador é por nome de usuário, o bloqueio não detém um atacante que tente um nome diferente a cada vez. A proteção contra isso é o limite de requisições de autenticação (`AUTH_RATE_LIMIT_MAX` e `AUTH_RATE_LIMIT_WINDOW_MS`), aplicado por endereço IP do cliente sobre todas as tentativas de login.

Os nomes de usuário são comparados sem diferenciar maiúsculas e minúsculas, e o contador de bloqueio segue a mesma regra: `admin` e `Admin` são uma única conta, com uma única cota compartilhada.

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `MAX_LOGIN_ATTEMPTS` | `5` | Não | Número de tentativas seguidas com falha contra um nome de usuário, a partir de um IP de cliente, antes de novas tentativas nessa combinação serem recusadas. |
| `LOCKOUT_DURATION_MINUTES` | `15` | Não | Por quanto tempo (em minutos) essa combinação fica bloqueada depois de passar de `MAX_LOGIN_ATTEMPTS`. |

Todo login recusado é gravado no log do servidor em nível `warn`, então aparece no `LOG_LEVEL` padrão sem precisar mudar para `debug`. Veja [Tentativas de login com falha no log](#failed-login-attempts-in-the-log).

#### Inatividade da sessão

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `SESSION_INACTIVITY_TIMEOUT_MINUTES` | `30` | Não | Minutos sem atividade do usuário antes de a sessão ser invalidada e o navegador voltar à tela de login. Defina `0` para desativar por completo o tempo limite de inatividade. |

"Atividade" significa alguém usando a interface de fato: clicando, digitando, rolando a página, movendo o ponteiro ou voltando para a aba. Páginas que atualizam dados por timer não contam, então um navegador aberto numa máquina sem ninguém por perto expira do mesmo jeito.

O contador é aplicado pelo servidor e avaliado quando chega a próxima requisição. Por isso, uma sessão ociosa além do limite termina no próximo clique ou na próxima atualização em segundo plano, e não no segundo exato em que o limite passa. Sair da conta, ou um administrador revogar a sessão, encerra na hora em qualquer caso.

Esta configuração é independente de `JWT_EXPIRES_IN`. Os tokens de acesso são renovados em segundo plano enquanto a sessão está ativa, então um valor maior que `JWT_EXPIRES_IN` funciona como esperado.

#### Autenticação em dois fatores (TFA)

Estas configurações só valem para usuários com TFA ativo na conta.

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `MAX_TFA_ATTEMPTS` | `5` | Não | Número de códigos de TFA errados seguidos antes de a conta ser bloqueada temporariamente. |
| `TFA_LOCKOUT_DURATION_MINUTES` | `30` | Não | Por quanto tempo (em minutos) dura um bloqueio de TFA. |
| `TFA_REMEMBER_ME_EXPIRES_IN` | `30d` | Não | Por quanto tempo vale a dispensa de TFA de "lembrar este dispositivo". Aceita durações como `7d`, `30d`, `90d`. |
| `TFA_MAX_REMEMBER_SESSIONS` | `5` | Não | Número máximo de dispositivos lembrados por usuário. Atingido o limite, a sessão lembrada mais antiga é removida. |

#### Padrões de usuário

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `DEFAULT_USER_ROLE` | `user` | Não | Papel dado aos usuários recém-criados. Valores aceitos: `user`, `admin`, `readonly`. Não afeta os usuários existentes. |

---

### 5. Configuração do Redis {#5-redis-configuration}

O Redis é usado nas filas de jobs em segundo plano (asynq), nos tokens de bootstrap e no estado de bloqueio de TFA. É preciso ter uma instância do Redis rodando.

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `REDIS_HOST` | `localhost` | Não | Hostname ou endereço IP do servidor Redis. |
| `REDIS_PORT` | `6379` | Não | Porta em que o servidor Redis escuta. |
| `REDIS_PASSWORD` | _(nenhum)_ | Não | Senha de autenticação do Redis. Muito recomendada em qualquer implantação que não seja local. |
| `REDIS_USER` | _(nenhum)_ | Não | Usuário do Redis para autenticação por ACL (Redis 6.0+). Deixe vazio para autenticar só por senha. |
| `REDIS_DB` | `0` | Não | Número do banco lógico do Redis (0–15). Mude se compartilhar a instância do Redis com outros aplicativos. |
| `REDIS_TLS` | `false` | Não | Com `true`, o servidor se conecta ao Redis por TLS. |
| `REDIS_TLS_VERIFY` | `true` | Não | Com `false`, o servidor pula a verificação do certificado TLS do Redis. Use só em testes contra certificados autoassinados. |
| `REDIS_TLS_CA` | _(nenhum)_ | Não | Caminho para um arquivo de certificado de CA próprio, para verificar a conexão TLS com o Redis. Só usado com `REDIS_TLS=true`. |
| `REDIS_CONNECT_TIMEOUT_MS` | `60000` | Não | Milissegundos de espera ao abrir uma nova conexão com o Redis antes de estourar o tempo. |
| `REDIS_COMMAND_TIMEOUT_MS` | `60000` | Não | Milissegundos de espera para um comando do Redis terminar antes de estourar o tempo. |

**Permissões do Redis necessárias com ACLs:**

Se você define `REDIS_USER` e restringe esse usuário com uma lista de comandos permitidos por ACL, ele precisa poder rodar scripts Lua no servidor. O limite de requisições avalia um pequeno script para que um contador e a sua expiração sejam definidos juntos, o que impede que uma expiração perdida deixe um cliente preso em HTTP 429 indefinidamente.

Conceda pelo menos:

```
ACL SETUSER patchmon on >yourpassword ~* +@read +@write +@keyspace +eval +evalsha +script
```

Sem `+eval` e `+evalsha`, o limite de requisições falha. Os endpoints de login e de senha falham de forma fechada, de propósito, quando o limitador está indisponível, então o sintoma visível é `503 Service temporarily unavailable` no login, e não um aviso de limite de requisições. Se isso aparecer depois de apertar uma ACL, verifique estas permissões primeiro.

Usuários do Redis sem restrições de ACL, e implantações que usam só `REDIS_PASSWORD`, não precisam de mudança.

**Gerando uma senha segura para o Redis:**

```bash
openssl rand -hex 32
```

---

### 6. Limites de requisição {#6-rate-limiting}

Os limites de requisição protegem a API contra abuso. São aplicados por endereço IP, divididos em três categorias de endpoint. Todos os valores de janela estão em milissegundos.

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` | Não | Janela de tempo do limite geral da API (padrão: 15 minutos). |
| `RATE_LIMIT_MAX` | `5000` | Não | Máximo de requisições por janela nos endpoints gerais da API (painéis, hosts, pacotes, configurações). |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `600000` | Não | Janela de tempo dos endpoints de autenticação (login, renovação de token) (padrão: 10 minutos). |
| `AUTH_RATE_LIMIT_MAX` | `500` | Não | Máximo de requisições por janela nos endpoints de autenticação. |
| `AGENT_RATE_LIMIT_WINDOW_MS` | `60000` | Não | Janela de tempo dos endpoints de check-in e relatório dos agentes (padrão: 1 minuto). |
| `AGENT_RATE_LIMIT_MAX` | `1000` | Não | Máximo de requisições por janela nos endpoints dos agentes. Aumente se você tem muitos agentes fazendo check-in com frequência. |
| `PASSWORD_RATE_LIMIT_WINDOW_MS` | `900000` | Não | Janela de tempo das operações de troca e redefinição de senha (padrão: 15 minutos). |
| `PASSWORD_RATE_LIMIT_MAX` | `5` | Não | Máximo de tentativas de troca de senha por janela. Mantido baixo de propósito, para limitar ataques de força bruta nos fluxos de redefinição de senha. |

**Referência rápida: conversão de janelas**

| Milissegundos | Em tempo legível |
|---|---|
| `60000` | 1 minuto |
| `600000` | 10 minutos |
| `900000` | 15 minutos |

---

### 7. Política de senha {#7-password-policy}

Regras aplicadas quando um usuário define ou troca a senha de uma conta local. Não valem para usuários OIDC, que se autenticam no provedor de identidade.

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `PASSWORD_MIN_LENGTH` | `8` | Não | Número mínimo de caracteres da senha. |
| `PASSWORD_REQUIRE_UPPERCASE` | `true` | Não | Exige pelo menos uma letra maiúscula. Defina `false` para desativar. |
| `PASSWORD_REQUIRE_LOWERCASE` | `true` | Não | Exige pelo menos uma letra minúscula. Defina `false` para desativar. |
| `PASSWORD_REQUIRE_NUMBER` | `true` | Não | Exige pelo menos um dígito numérico. Defina `false` para desativar. |
| `PASSWORD_REQUIRE_SPECIAL` | `true` | Não | Exige pelo menos um caractere especial (por exemplo, `!`, `@`, `#`). Defina `false` para desativar. |

> As quatro opções de complexidade vêm com `true` por padrão. Para desativar uma regra, é preciso defini-la explicitamente como `false`: omitir a variável mantém a regra ativa.

---

### 8. Logs e profiling {#8-logging-and-profiling}

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `ENABLE_LOGGING` | `true` | Não | Logs estruturados da aplicação em stdout. **Definir `false` silencia o servidor por completo.** Não é log reduzido: é nenhum log, o que deixa sem nada para mostrar toda instrução deste guia que pede para verificar os logs do servidor. Mudou na 2.0.3; antes o padrão era `false`. Um `false` explícito, no `.env` ou em **Settings > Environment**, continua sendo respeitado. |
| `LOG_LEVEL` | `info` | Não | Nível mínimo de log exibido. Valores aceitos: `debug`, `info`, `warn`, `error`. Precisa ser exatamente uma dessas strings; o servidor não inicia com um valor inválido. |
| `ENABLE_PPROF` | `false` | Não | Com `true`, serve os endpoints de profiling pprof do Go num listener separado, só em loopback (veja `PPROF_PORT`). Só para diagnóstico. Não ative em produção, a menos que esteja investigando um problema de desempenho. |
| `PPROF_PORT` | `6060` | Não | Porta do listener de profiling com `ENABLE_PPROF=true`. Liga só em `127.0.0.1`, então não é preciso abrir nada no firewall nem no proxy reverso. |
| `MEMSTATS_INTERVAL_SEC` | `60` | Não | Com que frequência (em segundos) o servidor registra estatísticas de memória do runtime do Go quando o profiling está ativo. Só tem efeito com `ENABLE_PPROF=true`. |

**Guia de níveis de log:**

| Nível | Quando usar |
|---|---|
| `debug` | Investigação ativa: muito verboso, inclui operações internas |
| `info` | Operação normal em produção |
| `warn` | Produção mais silenciosa; só problemas não críticos e erros |
| `error` | Saída mínima; só erros críticos |

#### Tentativas de login com falha no log {#failed-login-attempts-in-the-log}

Todo login recusado gera exatamente uma linha `warn`, então aparece no `LOG_LEVEL` padrão e em `warn`. Um login bem-sucedido gera uma linha `info`.

```json
{"time":"2026-08-13T18:22:41Z","level":"WARN","msg":"login failed","reason":"user_not_found","username":"hackerman","ip":"203.0.113.9","user_agent":"curl/8.7.1"}
```

`username` e `user_agent` são o que o cliente mandou, truncados, e são gravados exatamente como recebidos. `username` é omitido quando o cliente não mandou nenhum. `ip` é o endereço do cliente resolvido por `TRUST_PROXY` e `TRUSTED_PROXY_RANGES`; acerte essas duas, ou todas as tentativas vão parecer vir do seu proxy reverso.

`"locked": true` é acrescentado quando aquela tentativa específica foi a que disparou o bloqueio. O `reason` continua descrevendo o que estava errado de fato, então contar um motivo nos seus logs continua dando o número certo.

O campo `reason` distingue a falha:

| Motivo | Significado |
|---|---|
| `user_not_found` | Nenhuma conta corresponde ao usuário ou e-mail digitado |
| `invalid_password` | A conta existe e a senha estava errada |
| `account_disabled` | A conta existe, mas está desativada |
| `no_password_set` | A conta não tem senha local, normalmente só SSO |
| `locked_out` | Recusado na chegada porque um bloqueio de tentativas anteriores ainda está valendo |
| `missing_credentials` | A requisição não trouxe o usuário ou a senha |
| `username_too_long` | O usuário enviado passou de 254 caracteres e foi recusado antes de qualquer consulta |
| `malformed_request` | O corpo da requisição não era JSON válido |
| `local_auth_disabled` | Houve tentativa de login com senha numa instância só SSO |
| `invalid_tfa_code` | A senha foi aceita, mas o código de dois fatores estava errado |
| `tfa_locked_out` | Recusado na chegada porque um bloqueio de dois fatores, por códigos errados anteriores, ainda está valendo |
| `tfa_token_malformed` | O código de dois fatores enviado não tinha seis caracteres alfanuméricos |
| `tfa_ticket_invalid` | A etapa de dois fatores foi alcançada sem um ticket válido e não expirado da etapa de senha |
| `tfa_user_ineligible` | O ticket levou a uma conta inativa ou sem dois fatores registrados |

Uma consulta que falha porque o banco está inalcançável **não** é registrada como `user_not_found`. Ela vai para o log à parte, em nível `error`, como `auth login lookup failed`, e não consome uma tentativa do bloqueio; assim, um problema no banco não bloqueia quem está tentando de novo com a senha certa.

Para acompanhar a atividade de login numa instalação com Docker:

```bash
docker compose logs -f server | grep -E '"msg":"login (failed|succeeded)"'
```

Esse grep supõe saída em JSON, que é o que uma instalação de produção emite. Definir `APP_ENV=development` passa o logger para texto simples, em que as mesmas linhas aparecem como `msg="login failed"`.

Nada é registrado com `ENABLE_LOGGING=false`, e essas linhas são suprimidas se `LOG_LEVEL` estiver em `error`.

---

### 9. OIDC / SSO {#9-oidc--sso}

Configuração do OpenID Connect para login único. Com `OIDC_ENABLED=true`, as quatro variáveis marcadas abaixo passam a ser obrigatórias e o servidor não inicia sem elas.

#### Configurações principais

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `OIDC_ENABLED` | `false` | Não | Defina `true` para ativar a autenticação OIDC. |
| `OIDC_ISSUER_URL` | _(nenhum)_ | Com OIDC ativo | A URL do emissor (issuer) do seu provedor de identidade (por exemplo, `https://auth.example.com`). O servidor busca o documento de descoberta do OIDC nessa URL. |
| `OIDC_CLIENT_ID` | _(nenhum)_ | Com OIDC ativo | O client ID registrado no seu provedor de identidade. |
| `OIDC_CLIENT_SECRET` | _(nenhum)_ | Com OIDC ativo | O client secret do seu provedor de identidade. |
| `OIDC_REDIRECT_URI` | _(nenhum)_ | Com OIDC ativo | A URL de callback registrada no seu provedor de identidade. Precisa ser: `https://your-patchmon-url/api/v1/auth/oidc/callback` |
| `OIDC_SCOPES` | `openid email profile groups` | Não | Lista de escopos OAuth a pedir, separados por espaço. O escopo `groups` é necessário para o mapeamento de grupos para papéis funcionar. |
| `OIDC_ENFORCE_HTTPS` | `true` | Não | Com `true` (padrão), o servidor recusa configurações OIDC com URL de emissor sem HTTPS. Defina `false` só num ambiente de desenvolvimento local com um provedor de identidade sem TLS. |
| `OIDC_TRUST_UNVERIFIED_EMAIL` | `false` | Não | Com `true`, o PatchMon vincula e cria contas mesmo que o provedor de identidade não confirme que o e-mail foi verificado. Isso reduz a proteção contra tomada de conta; só ative se o seu provedor não tiver como informar a verificação. Veja [A exigência de e-mail verificado](#the-verified-email-requirement). Também pode ser definida em **Settings > OIDC**, mas só quando o próprio OIDC é configurado pela interface, e não por variáveis de ambiente. |

#### Criação de usuários

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `OIDC_AUTO_CREATE_USERS` | `false` | Não | Com `true`, uma conta do PatchMon é criada automaticamente no primeiro login de um usuário OIDC. Com `false`, um administrador precisa criar a conta antes. |
| `OIDC_DEFAULT_ROLE` | `user` | Não | Papel dado aos usuários OIDC criados automaticamente quando nenhum mapeamento de grupo se aplica. Valores aceitos: `superadmin`, `admin`, `host_manager`, `user`, `readonly`. |
| `OIDC_DISABLE_LOCAL_AUTH` | `false` | Não | Com `true`, a autenticação local por usuário e senha é desativada e só o login OIDC é aceito. Útil para impor SSO na organização inteira. |

#### Tela de login

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `OIDC_BUTTON_TEXT` | `Login with SSO` | Não | Texto do botão de login SSO na tela de login do PatchMon. |
| `OIDC_POST_LOGOUT_URI` | Derivado de `FRONTEND_URL` e, na falta dele, de `CORS_ORIGIN` | Não | URL para onde o usuário é levado depois de sair do provedor de identidade. O padrão é a tela de login da sua instância do PatchMon. |

#### Sessão

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `OIDC_SESSION_TTL` | `600` | Não | Vida, em segundos, do estado temporário de sessão OIDC guardado durante o fluxo OAuth. Aumente só se usuários em redes muito lentas receberem erros de sessão expirada no meio do login. |

#### Mapeamento de grupos para papéis

Associe grupos do seu provedor de identidade diretamente a papéis do PatchMon. Defina `OIDC_SYNC_ROLES=true` para manter os papéis sincronizados com a participação nos grupos a cada login.

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `OIDC_SYNC_ROLES` | `false` | Não | Com `true`, o papel do usuário no PatchMon é atualizado a cada login conforme os grupos a que ele pertence no IdP naquele momento. Com `false`, os papéis são gerenciados no PatchMon e o login OIDC não os altera. |
| `OIDC_ADMIN_GROUP` | _(nenhum)_ | Não | Nome do grupo do IdP cujos membros recebem o papel `admin`. |
| `OIDC_SUPERADMIN_GROUP` | _(nenhum)_ | Não | Nome do grupo do IdP cujos membros recebem o papel `superadmin`. |
| `OIDC_HOST_MANAGER_GROUP` | _(nenhum)_ | Não | Nome do grupo do IdP cujos membros recebem o papel `host_manager`. |
| `OIDC_READONLY_GROUP` | _(nenhum)_ | Não | Nome do grupo do IdP cujos membros recebem o papel `readonly`. |
| `OIDC_USER_GROUP` | _(nenhum)_ | Não | Nome do grupo do IdP cujos membros recebem o papel padrão `user`. |

**Exemplo: Authentik**

```bash
OIDC_ENABLED=true
OIDC_ISSUER_URL=https://authentik.example.com/application/o/patchmon/
OIDC_CLIENT_ID=patchmon
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REDIRECT_URI=https://patchmon.example.com/api/v1/auth/oidc/callback
OIDC_SCOPES=openid email profile groups
OIDC_AUTO_CREATE_USERS=true
OIDC_DEFAULT_ROLE=user
OIDC_BUTTON_TEXT=Login with Authentik
OIDC_SYNC_ROLES=true
OIDC_ADMIN_GROUP=PatchMon Admins
OIDC_USER_GROUP=PatchMon Users
```

**Exemplo: Keycloak**

```bash
OIDC_ENABLED=true
OIDC_ISSUER_URL=https://keycloak.example.com/realms/your-realm
OIDC_CLIENT_ID=patchmon
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REDIRECT_URI=https://patchmon.example.com/api/v1/auth/oidc/callback
OIDC_SCOPES=openid email profile groups
OIDC_AUTO_CREATE_USERS=true
OIDC_DEFAULT_ROLE=user
OIDC_BUTTON_TEXT=Login with Keycloak
```

---

### 10. Conformidade / SSG {#10-compliance--ssg}

Configurações do conteúdo do SCAP Security Guide usado pelas varreduras de conformidade.

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `SSG_CONTENT_DIR` | `./ssg-content` | Não | Caminho do diretório com os arquivos de datastream do SCAP Security Guide (`ssg-*-ds.xml`), de onde os agentes baixam. A imagem oficial já traz esse conteúdo em `/app/ssg-content` e define esta variável para você; não mexa, a menos que esteja fornecendo o seu próprio conteúdo de propósito. Nesse caso, coloque os datastreams `ssg-*-ds.xml` no diretório; o servidor descobre a qual versão do SCAP Security Guide eles pertencem lendo os próprios arquivos, sem precisar de um arquivo de versão separado. Isso depende de os datastreams declararem a versão no formato `0.1.81`, como fazem as versões oficiais do ComplianceAsCode. Se você monta o seu próprio conteúdo, ou usa um build de fornecedor com a versão rotulada de outro jeito, acrescente ao diretório um arquivo `.ssg-version` contendo só essa string de versão. Compliance Settings avisa quando não consegue determinar a versão, e enquanto isso não for resolvido os hosts não conseguem atualizar o conteúdo. **Não monte um volume vazio neste caminho.** Isso esconde o conteúdo embutido e deixa todos os hosts do parque sem conseguir atualizar o conteúdo de conformidade. |

---

### 11. RDP / Acesso remoto {#11-rdp--remote-access}

Configuração do daemon do Guacamole (`guacd`), que viabiliza as sessões RDP no navegador.

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `GUACD_PATH` | _(nenhum)_ | Não | Caminho absoluto do binário `guacd`. Vazio, o servidor localiza o `guacd` pelo `PATH` do sistema. Defina se o `guacd` estiver instalado num local fora do padrão. |
| `GUACD_ADDRESS` | `127.0.0.1:4822` | Não | Host e porta que o servidor usa para se conectar ao processo `guacd` em execução. Mude se o `guacd` rodar em outro host ou numa porta fora do padrão. |

---

### Patching

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `PATCH_RUN_STALL_TIMEOUT_MIN` | `30` | Não | Minutos que uma execução de patch pode ficar em `running` antes de a limpeza periódica (a cada 10 minutos) marcá-la como `timed_out`. Mínimo `5`; valores abaixo disso são ajustados na inicialização, com um aviso. Também pode ser editada em Settings → Environment na interface web; a variável de ambiente continua prevalecendo se estiver definida. Mudanças feitas pela interface valem na próxima limpeza, sem reinício. |

### Relatórios

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `AGENT_REPORTS_RETENTION_DAYS` | `30` | Não | Dias de retenção das linhas de Agent Activity (cada ping, relatório completo, relatório parcial, envio de Docker e envio de varredura de conformidade grava uma linha). A limpeza diária às 02:00 apaga o que for mais antigo. Faixa de `7` a `365`; valores fora dela são ajustados na inicialização, com um aviso. Também pode ser editada em Settings → Environment na interface web; a variável de ambiente continua prevalecendo se estiver definida. Mudanças feitas pela interface valem na próxima limpeza, sem reinício. |

---

### 12. Limites de corpo {#12-body-limits}

Tamanhos máximos dos corpos de requisição aceitos pela API. Aumente só se aparecerem erros HTTP 413 causados por payloads grandes legítimos.

Sufixos aceitos: `b`, `kb`, `mb`, `gb`. Exemplos: `10mb`, `512kb`.

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `JSON_BODY_LIMIT` | `5mb` | Não | Tamanho máximo dos corpos JSON nos endpoints comuns da API (gestão de usuários, configurações, ações sobre hosts etc.). |
| `AGENT_UPDATE_BODY_LIMIT` | `5mb` | Não | Tamanho máximo dos corpos de requisição nos endpoints de check-in e de relatório de pacotes dos agentes. Aumente se agentes que gerenciam muitos pacotes atingirem o limite. |
| `COMPLIANCE_BODY_LIMIT` | `20mb` | Não | Tamanho máximo dos corpos de requisição no endpoint de resultados de varredura de conformidade. Os resultados do OpenSCAP são grandes: um perfil de 900 regras pode passar bem de 10 MB, e um único envio pode trazer uma varredura OpenSCAP e uma do Docker Bench. |
| `AGENT_PING_BODY_LIMIT` | `8kb` | Não | Tamanho máximo dos corpos de ping do agente. Aqui, um valor sem sufixo é lido em KB, então `16` significa 16 KB. |

> **Sufixos:** `b`, `kb` e `mb` são aceitos. `gb` é interpretado, mas qualquer valor em `gb` passa do teto de 32 MB e é reduzido a ele, então não há motivo para usá-lo.

---

### 13. Fuso horário {#13-timezone}

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `TZ` | `UTC` | Não | Nome de fuso horário IANA usado nos horários dos logs do servidor e nas operações agendadas. Se `TZ` não estiver definida, o servidor também verifica `TIMEZONE` antes de recorrer a `UTC`. Todos os horários guardados no banco continuam em UTC, seja qual for esta configuração. |

**Valores comuns:**

```bash
TZ=UTC                    # Recommended for servers
TZ=Europe/London
TZ=Europe/Paris
TZ=America/New_York
TZ=America/Chicago
TZ=America/Los_Angeles
TZ=Asia/Tokyo
```

---

### 14. Chaves de criptografia {#14-encryption-keys}

O PatchMon criptografa valores sensíveis em repouso: credenciais dos provedores de IA, tokens de bootstrap do registro, client secrets do OIDC e segredos dos destinos de notificação. A chave de criptografia é o primeiro valor não vazio desta lista:

1. `AI_ENCRYPTION_KEY`
2. `SESSION_SECRET`
3. Derivada de `DATABASE_URL` (último recurso; **não recomendado em produção**)

Se você trocar esse valor, todo segredo criptografado no banco fica ilegível. Defina uma vez, na instalação, e trate-o com o mesmo cuidado do `JWT_SECRET`.

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `AI_ENCRYPTION_KEY` | _(nenhum)_ | Recomendada | Segredo aleatório de 32+ bytes usado para criptografar as chaves dos provedores de IA, os tokens de bootstrap, os client secrets do OIDC e as credenciais dos destinos de notificação. Configure só pelo `.env` (não é editável pela interface Settings). |
| `SESSION_SECRET` | _(nenhum)_ | Não | Chave de criptografia usada na falta de `AI_ENCRYPTION_KEY`. Existe por compatibilidade com as primeiras instalações 1.x; prefira `AI_ENCRYPTION_KEY` nas implantações novas. |

**Gerando um valor seguro:**

```bash
openssl rand -hex 32
```

> Se nem `AI_ENCRYPTION_KEY` nem `SESSION_SECRET` estiverem definidas, o servidor deriva a chave de criptografia de `DATABASE_URL`. Funciona, mas a sua chave fica tão forte quanto a string de conexão do banco. Qualquer mudança de host, porta ou senha do banco troca a chave de criptografia e invalida todos os valores criptografados. Em produção, defina sempre `AI_ENCRYPTION_KEY` explicitamente.

---

### 15. Substituição dos binários do agente {#15-agent-binary-overrides}

Implantações avançadas que queiram trocar os binários de agente embutidos (por exemplo, para distribuir um build próprio ou guardar os binários em outro volume) podem mudar o diretório de onde o script de instalação serve os arquivos. Normalmente, deixe estas variáveis sem valor. O servidor embute todos os binários de agente suportados na imagem, no momento do build.

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `AGENT_BINARIES_DIR` | _(nenhum)_ | Não | Caminho absoluto de um diretório com binários de agente substitutos (por exemplo, `patchmon-agent-linux-amd64`). Tem precedência sobre `AGENTS_DIR` quando as duas estão definidas. |
| `AGENTS_DIR` | _(nenhum)_ | Não | Nome alternativo de `AGENT_BINARIES_DIR`. Mantido por compatibilidade com instalações que definiam esta variável antes da 2.0. |

Com as duas vazias, o servidor serve os binários do caminho `static/` embutido no próprio binário.

---

### 16. Telemetria {#16-telemetry}

O PatchMon pode enviar, uma vez por dia, sinais anônimos de uso (versão, número de hosts, distribuição aproximada de sistemas operacionais) ao endpoint de métricas do projeto. A adesão é totalmente opcional. O que é enviado está em Métricas e telemetria, e a chave fica na página **Settings → Metrics**.

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `METRICS_API_URL` | _(nenhum)_ | Não | Troca o endpoint de métricas do projeto. Deixe vazio para enviar ao serviço de telemetria padrão do PatchMon. Defina uma URL interna para coletar a telemetria de forma privada. |

---

### 17. Carregamento de arquivos {#17-file-loading}

| Variável | Padrão | Obrigatória | Descrição |
|----------|---------|----------|-------------|
| `ENV_FILE` | `.env` | Não | Caminho do arquivo `.env` que o servidor lê na inicialização. Se o arquivo não existir no caminho indicado, a inicialização continua sem aviso e só as variáveis de ambiente do processo são usadas. |
| `FRONTEND_URL` | _(nenhum)_ | Não | Alias opcional usado pelo OIDC ao calcular `OIDC_POST_LOGOUT_URI`. Se estiver definida e `OIDC_POST_LOGOUT_URI` não, o redirecionamento depois do logout vai para `<FRONTEND_URL>/login`. Caso contrário, o servidor usa `<CORS_ORIGIN>/login`. A maioria das implantações pode ignorá-la; com `CORS_ORIGIN` correto, ela não é necessária. |

---

### Configuração mínima completa

O menor `.env` válido para uma implantação de produção:

```bash
# Required
DATABASE_URL="postgresql://patchmon_user:strongpassword@database:5432/patchmon_db"
JWT_SECRET="paste-output-of-openssl-rand-hex-64-here"

# Encryption (strongly recommended in production)
AI_ENCRYPTION_KEY="paste-output-of-openssl-rand-hex-32-here"

# Server
PORT=3000
APP_ENV=production
CORS_ORIGIN=https://patchmon.example.com
ENABLE_HSTS=true
TRUST_PROXY=true

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD="paste-output-of-openssl-rand-hex-32-here"

# Logging
ENABLE_LOGGING=true
LOG_LEVEL=info

# Timezone
TZ=UTC
```

Todo o resto tem um padrão razoável para produção e não precisa ser definido, a menos que você queira mudar o comportamento descrito neste documento.

> O script `setup-env.sh` que acompanha o Docker Compose gera um `.env` válido com os três segredos (`JWT_SECRET`, `REDIS_PASSWORD` e `POSTGRES_PASSWORD`) já preenchidos. Veja [Instalando o servidor do PatchMon com Docker](#installing-patchmon-server-on-docker). Para mudanças do dia a dia em limites de requisição, logs, política de senha, fuso horário e valores semelhantes ajustáveis em tempo de execução, prefira a interface Settings. Veja Configurações na interface web.

---

### Solução de problemas

**O servidor não inicia, com "DATABASE_URL is required" ou "JWT_SECRET is required"**
Essas duas variáveis não têm padrão. Confira se estão no `.env` e se o arquivo está sendo carregado (verifique a variável `ENV_FILE`, se você usa um caminho próprio).

**Erros de CORS no navegador**
`CORS_ORIGIN` precisa ser exatamente a URL da barra de endereço do navegador, incluindo o protocolo (`http` ou `https`) e a porta. Um erro comum é definir `https://patchmon.example.com` e acessar o site por `http://`. Se você acessa o PatchMon por várias URLs, liste todas separadas por vírgula, sem espaços (por exemplo, `CORS_ORIGIN=https://patchmon.example.com,https://patchmon.internal.lan`).

**Erros de limite de requisição (HTTP 429)**
Aumente o `*_RATE_LIMIT_MAX` da categoria de endpoint que está atingindo o limite. Em parques grandes de agentes, `AGENT_RATE_LIMIT_MAX` é o que mais costuma precisar de aumento.

**Pool de conexões do banco esgotado**
Aumente `DB_CONNECTION_LIMIT`. Confira o `max_connections` do PostgreSQL, para que a soma de todas as instâncias do PatchMon não passe dele.

**O login OIDC falha logo depois de ativado**
Confira se `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` e `OIDC_REDIRECT_URI` estão todas definidas. O servidor as valida na inicialização e não inicia se alguma faltar com `OIDC_ENABLED=true`. Confirme também que `OIDC_REDIRECT_URI` está registrada como URL de callback permitida no seu provedor de identidade.

**Sessões perdidas depois de reiniciar o servidor**
Confira se o `JWT_SECRET` não mudou. Trocar esse valor invalida todos os tokens existentes.

---

*PatchMon 2.0+ (servidor em Go)*

---

## Capítulo 6: Configurando OIDC SSO {#setting-up-oidc-sso}

### Visão geral

O PatchMon suporta autenticação OpenID Connect (OIDC), que permite aos usuários entrar por um provedor de identidade (IdP) externo, no lugar das credenciais locais de usuário e senha ou junto com elas.

#### Provedores suportados

Qualquer provedor compatível com OIDC funciona, incluindo:

- Authentik
- Keycloak
- Okta
- Azure AD (Entra ID)
- Google Workspace

#### O que você ganha

- **Login SSO** por um botão configurável na tela de login
- **Criação automática de usuários** no primeiro login (sem precisar criar contas manualmente)
- **Mapeamento de papéis por grupo**, para o seu IdP decidir quem é admin, usuário ou leitor somente leitura
- **Opcional:** desativar por completo o login com senha local e impor SSO para todos os usuários

---

### Pré-requisitos

- PatchMon já instalado e rodando
- Um provedor de identidade compatível com OIDC, com uma aplicação OAuth2/OIDC configurada
- HTTPS em produção (as rotas OIDC exigem HTTPS com `OIDC_ENFORCE_HTTPS=true`, que é o padrão)

---

### Etapa 1 - Crie uma aplicação OIDC no seu IdP

Crie uma nova aplicação OAuth2 / OIDC no seu provedor de identidade com as configurações abaixo:

| Configuração | Valor |
|---------|-------|
| **Tipo de aplicação** | Web application / Confidential client |
| **Redirect URI** | `https://patchmon.example.com/api/v1/auth/oidc/callback` |
| **Escopos** | `openid`, `email`, `profile`, `groups` |
| **Grant type** | Authorization Code |
| **Autenticação no token endpoint** | Client Secret (Basic) |
| **Assinatura do ID token** | Um algoritmo assimétrico: `RS256` (ou `RS384`, `RS512`, `ES256`, `ES384`, `ES512`, `PS256`, `PS384`, `PS512`, `EdDSA`) |

Depois de criar a aplicação, anote o **Client ID** e o **Client Secret**; você vai precisar dos dois.

> **Importante: o PatchMon não aceita ID tokens assinados com HS256.** O PatchMon valida os ID tokens com as chaves públicas publicadas no endpoint JWKS do seu IdP, então o token precisa ser assinado de forma assimétrica, com um certificado ou par de chaves. A assinatura simétrica HMAC (`HS256`, `HS384`, `HS512`), em que o client secret também serve de chave de assinatura, é recusada. A maioria dos provedores de identidade usa `RS256` por padrão, mas o Authentik não, a menos que você mande. Veja a observação sobre o Authentik abaixo.

> **Dica:** se você pretende usar o mapeamento de papéis por grupo, garanta que o seu IdP inclua a claim `groups` no ID token. No Authentik, isso vem ativado por padrão. No Keycloak, talvez seja preciso adicionar um mapper "Group Membership" ao client scope.

#### Observações por provedor

**Authentik:**
- Crie um OAuth2/OIDC Provider e depois uma Application ligada a ele
- **Defina uma Signing Key no provider.** É obrigatório, e é de longe a causa mais comum de falha na configuração do Authentik. Abra o provider, expanda **Advanced protocol settings** e defina **Signing Key** com um certificado, por exemplo o `authentik Self-signed Certificate` que já vem com ele. Se **Signing Key** ficar vazio, o Authentik assina os ID tokens de forma simétrica com o client secret, usando `HS256`, o que o PatchMon recusa. Todo login passa então a falhar com a mensagem genérica "Authentication failed" na tela de login
- **Troque o scope mapping padrão de `email`.** O mapping de fábrica do Authentik sempre informa o endereço como não verificado, o que o PatchMon recusa a partir da 2.1.0. Veja [A exigência de e-mail verificado](#the-verified-email-requirement)
- Formato da URL do emissor: `https://auth.example.com/application/o/patchmon/`
- Os grupos vêm na claim `groups` ou `ak_groups` (as duas são suportadas)

**Keycloak:**
- Crie um Client com Access Type `confidential`
- Formato da URL do emissor: `https://keycloak.example.com/realms/your-realm`
- Adicione um protocol mapper "Group Membership" para incluir os grupos no token

**Okta / Azure AD:**
- Crie uma OIDC Web Application
- Garanta que os grupos venham nas claims do ID token
- **Só no Entra ID:** ele não envia `email_verified`, que o PatchMon exige a partir da 2.1.0 para vincular e criar contas automaticamente. Adicione a claim opcional `xms_edov`. Veja [A exigência de e-mail verificado](#the-verified-email-requirement)

---

### Etapa 2 - Configure o PatchMon

Acrescente as variáveis de ambiente abaixo ao seu `.env` (em implantações com Docker) ou ao ambiente do servidor.

#### Variáveis obrigatórias

```bash
OIDC_ENABLED=true
OIDC_ISSUER_URL=https://auth.example.com/application/o/patchmon/
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REDIRECT_URI=https://patchmon.example.com/api/v1/auth/oidc/callback
```

| Variável | Descrição |
|----------|-------------|
| `OIDC_ENABLED` | Defina `true` para ativar o OIDC |
| `OIDC_ISSUER_URL` | A URL do emissor / de descoberta do seu IdP |
| `OIDC_CLIENT_ID` | Client ID da aplicação no seu IdP |
| `OIDC_CLIENT_SECRET` | Client secret da aplicação no seu IdP |
| `OIDC_REDIRECT_URI` | Precisa ser exatamente o que você configurou no IdP |

#### Variáveis opcionais

```bash
OIDC_SCOPES=openid email profile groups
OIDC_AUTO_CREATE_USERS=false
OIDC_DEFAULT_ROLE=user
OIDC_DISABLE_LOCAL_AUTH=false
OIDC_BUTTON_TEXT=Login with SSO
OIDC_SESSION_TTL=600
OIDC_POST_LOGOUT_URI=https://patchmon.example.com/login
OIDC_ENFORCE_HTTPS=true
OIDC_SYNC_ROLES=false
```

| Variável | Padrão | Descrição |
|----------|---------|-------------|
| `OIDC_SCOPES` | `openid email profile groups` | Escopos a pedir, separados por espaço. Inclua `groups` para o mapeamento de papéis |
| `OIDC_AUTO_CREATE_USERS` | `false` | Com `true`, cria automaticamente uma conta do PatchMon no primeiro login OIDC. Com `false`, o usuário já precisa existir no PatchMon (associado pelo e-mail) |
| `OIDC_DEFAULT_ROLE` | `user` | Papel dado quando o usuário não se encaixa em nenhum mapeamento de grupo |
| `OIDC_DISABLE_LOCAL_AUTH` | `false` | Com `true`, esconde os campos de usuário e senha e mostra só o botão de SSO |
| `OIDC_BUTTON_TEXT` | `Login with SSO` | Rótulo do botão de login SSO |
| `OIDC_SESSION_TTL` | `600` | Segundos de validade do estado do login OIDC. Se o usuário demorar mais que isso no IdP, a sessão expira e ele precisa tentar de novo |
| `OIDC_POST_LOGOUT_URI` | `<CORS_ORIGIN>/login` | Para onde redirecionar depois do logout. O padrão é a tela de login do PatchMon |
| `OIDC_ENFORCE_HTTPS` | `true` | Com `true`, exige HTTPS nas rotas de login e de callback do OIDC. Defina `false` só em desenvolvimento local |
| `OIDC_TRUST_UNVERIFIED_EMAIL` | `false` | Com `true`, dispensa a exigência de e-mail verificado para vincular e criar contas automaticamente. Reduz a proteção contra tomada de conta |
| `OIDC_SYNC_ROLES` | `false` | Com `true`, o papel do usuário é atualizado a cada login conforme os grupos atuais. Com `false`, os papéis são gerenciados no PatchMon e o login OIDC não os altera |

> **Sobre `APP_ENV`:** o PatchMon lê `APP_ENV` para saber o ambiente de execução (por exemplo, `production`). `NODE_ENV` é aceito como alias por compatibilidade, mas `APP_ENV` é o preferido.

---

### Etapa 3 - Mapeamento de papéis por grupo (opcional)

Associe os grupos do seu IdP a papéis do PatchMon, para que as atribuições de papel acompanhem o seu diretório. A comparação de grupos **não diferencia maiúsculas e minúsculas**.

#### Hierarquia de papéis

O PatchMon verifica a participação nos grupos nesta ordem (maior prioridade primeiro):

| Papel no PatchMon | Grupo(s) necessário(s) no IdP | Descrição |
|---------------|----------------------|-------------|
| **Super Admin** | Membro de `OIDC_SUPERADMIN_GROUP` | Acesso total, inclusive para gerenciar outros superadmins |
| **Admin** | Membro de `OIDC_ADMIN_GROUP` | Acesso total |
| **Host Manager** | Membro de `OIDC_HOST_MANAGER_GROUP` | Gerencia hosts e grupos |
| **User** | Membro de `OIDC_USER_GROUP` | Acesso padrão, com exportação de dados |
| **Readonly** | Membro de `OIDC_READONLY_GROUP` | Acesso só para visualização |
| *Padrão* | Nenhum dos anteriores | Recebe `OIDC_DEFAULT_ROLE` (padrão `user`) |

> **Prioridade:** se o usuário está em vários grupos, vence o papel de maior prioridade. A ordem, da maior para a menor, é: Super Admin > Admin > Host Manager > Readonly > User.

#### Variáveis de ambiente

```bash
OIDC_ADMIN_GROUP=PatchMon Admins
OIDC_USER_GROUP=PatchMon Users
OIDC_SUPERADMIN_GROUP=PatchMon SuperAdmins
OIDC_HOST_MANAGER_GROUP=PatchMon Host Managers
OIDC_READONLY_GROUP=PatchMon Readonly
OIDC_SYNC_ROLES=true
```

| Variável | Descrição |
|----------|-------------|
| `OIDC_ADMIN_GROUP` | Nome do grupo do IdP associado ao papel Admin |
| `OIDC_USER_GROUP` | Nome do grupo do IdP associado ao papel User |
| `OIDC_SUPERADMIN_GROUP` | Nome do grupo do IdP associado a Super Admin |
| `OIDC_HOST_MANAGER_GROUP` | Nome do grupo do IdP associado ao papel Host Manager |
| `OIDC_READONLY_GROUP` | Nome do grupo do IdP associado ao papel Readonly |
| `OIDC_SYNC_ROLES` | Com `true`, o papel do usuário é atualizado a cada login conforme os grupos atuais. Com `false` (padrão), os papéis são gerenciados no PatchMon e o login OIDC não os altera |

Só é preciso definir os grupos que você vai usar. As variáveis sem valor são simplesmente ignoradas.

---

### Etapa 4 - Reinicie o PatchMon

Depois de atualizar o `.env`, reinicie o servidor para ele carregar a configuração do OIDC:

```bash
# Docker
docker compose restart patchmon-server

# Or if rebuilding
docker compose up -d --force-recreate patchmon-server

# Native systemd installation
sudo systemctl restart <your-domain>
```

Esta verificação precisa de `ENABLE_LOGGING=true`, o padrão a partir da 2.0.3. Se você definiu `ENABLE_LOGGING=false`, ou está na 2.0.2 ou anterior, em que `false` era o padrão, o servidor não grava log nenhum e os comandos abaixo não retornam nada, tenha o OIDC carregado ou não. Mantenha também o `LOG_LEVEL` em `info` ou abaixo, porque a linha de confirmação é registrada em nível info.

```bash
# Docker
docker compose logs patchmon-server | grep -i oidc

# Native systemd
journalctl -u <your-domain> | grep -i oidc
```

Deve aparecer uma linha confirmando que o SSO está ativo, com a mensagem `OIDC SSO enabled; provider discovery is deferred to the first login attempt` e o issuer e o client ID carregados.

**O PatchMon não contata o seu provedor de identidade na inicialização.** A descoberta do provedor (a requisição a `.well-known/openid-configuration`) é adiada de propósito até a primeira tentativa de login, para que um IdP temporariamente fora do ar não impeça o servidor de subir. Por isso, essa linha só confirma que as quatro variáveis obrigatórias foram lidas e que o botão de SSO vai aparecer. Ela não prova que o IdP está alcançável nem que o provedor está bem configurado. Quem testa isso é a primeira tentativa de login, e qualquer falha é registrada nesse momento.

O formato em volta depende de `APP_ENV`. Em produção, que é o padrão, os logs são em JSON:

```json
{"time":"2026-08-12T20:34:34.526Z","level":"INFO","msg":"OIDC SSO enabled; provider discovery is deferred to the first login attempt","version":"2.0.3","port":3000,"issuer":"https://auth.example.com/application/o/patchmon/","client_id":"patchmon","source":"environment variables"}
```

Com `APP_ENV` em qualquer outro valor, o mesmo registro sai em texto simples:

```
time=2026-08-12T20:34:34.526Z level=INFO msg="OIDC SSO enabled; provider discovery is deferred to the first login attempt" version=2.0.3 port=3000 issuer=https://auth.example.com/application/o/patchmon/ client_id=patchmon source="environment variables"
```

O campo `source` diz qual configuração venceu: `environment variables` ou `database settings`. Se você editou as configurações de SSO na interface web mas vê `environment variables`, o seu `.env` está sobrescrevendo essas configurações.

Se aparecer `OIDC is enabled but missing required config: ...`, uma ou mais das quatro variáveis obrigatórias está vazia. Se aparecer `OIDC is partially configured via env vars but SSO is disabled`, você definiu algumas, mas não todas.

> **Observação:** versões anteriores à 2.0.3 não registravam nada quando a configuração do OIDC dava certo. Se você está na 2.0.2 ou anterior, um `grep -i oidc` vazio é esperado e não significa que o OIDC falhou ao carregar. Verifique se o botão de SSO aparece na tela de login.

---

### Etapa 5 - Teste o login

1. Abra o PatchMon no navegador
2. Deve aparecer o botão **"Login with SSO"** (ou o seu `OIDC_BUTTON_TEXT` personalizado)
3. Clique nele e você será levado ao seu IdP
4. Autentique-se com as suas credenciais do IdP
5. Você volta ao PatchMon já conectado

Se `OIDC_AUTO_CREATE_USERS` for `true`, uma conta do PatchMon é criada automaticamente com o seu endereço de e-mail. O nome de usuário vem do prefixo do e-mail (por exemplo, `john.doe@example.com` vira `john.doe`).

---

### Configuração inicial (ainda sem usuários)

Quando o banco do PatchMon não tem usuários, aparece um assistente de configuração. Há duas opções.

#### Opção A - Use o assistente de configuração (recomendado)

Conclua o assistente para criar a primeira conta de administrador. Ela é criada como **Super Admin**, com acesso total. Depois, você pode ativar o OIDC em Settings.

#### Opção B - Entre direto pelo OIDC

Se você configurou o OIDC por variáveis de ambiente antes do primeiro boot:

1. Defina `OIDC_AUTO_CREATE_USERS=true`
2. O assistente de configuração é pulado automaticamente quando o OIDC com criação automática está ativo
3. O **primeiro usuário** a entrar pelo OIDC é promovido automaticamente a **Super Admin**, independentemente do mapeamento de grupos, para garantir que o sistema sempre tenha um administrador
4. Os usuários OIDC seguintes recebem papéis pelo mapeamento de grupos ou pelo papel padrão, normalmente

> **Observação:** não é preciso configurar o mapeamento de grupos para o primeiro usuário. A promoção automática acontece porque o PatchMon detecta que ainda não existe administrador.

---

### O que é sincronizado a partir do seu IdP

A cada login OIDC, o PatchMon sincroniza automaticamente do seu provedor de identidade:

- **Avatar / foto de perfil:** sincronizado se a claim `picture` estiver presente
- **Nome e sobrenome:** das claims `given_name` e `family_name`
- **E-mail:** usado para associar e vincular contas

O item abaixo **só é sincronizado com `OIDC_SYNC_ROLES=true`:**

- **Papel:** conforme a participação nos grupos. Com a sincronização desligada, os papéis são gerenciados no PatchMon e o login OIDC não os altera. Dá para usar o OIDC para autenticar e continuar gerenciando os papéis manualmente.

#### Vínculo de contas

Se já existe um usuário local no PatchMon com o mesmo e-mail do usuário OIDC, o PatchMon vincula as contas automaticamente, mas só se o IdP marcar esse e-mail como verificado. Veja [A exigência de e-mail verificado](#the-verified-email-requirement), abaixo, que vale também para contas novas, e não só para o vínculo.

#### A exigência de e-mail verificado {#the-verified-email-requirement}

*Vale a partir do PatchMon 2.1.0.*

Quando o PatchMon não consegue reconhecer você por um subject que já tenha guardado, o endereço de e-mail é a única coisa que decide quem você é. Confiar num e-mail não verificado permitiria que qualquer pessoa capaz de definir o próprio e-mail no seu IdP entrasse como um usuário existente do PatchMon. Por isso, nessa situação, o PatchMon exige que o IdP declare que o endereço é verificado, enviando a claim `email_verified` com valor `true`.

Isso vale em dois casos:

- **Vínculo com uma conta local existente**, pela correspondência do e-mail.
- **Criação de uma conta nova** no primeiro login, com `OIDC_AUTO_CREATE_USERS=true`.

Não vale depois que a conta está vinculada. Depois do primeiro login bem-sucedido, o PatchMon guarda o identificador de subject do IdP, passa a associar por ele e a claim de e-mail deixa de ser decisiva.

**Se a claim não vier, o PatchMon a trata como não verificada.** Vários provedores de identidade não a enviam por padrão, e dois dos mais comuns precisam de configuração.

##### Authentik

O scope mapping de fábrica do Authentik, `authentik default OAuth Mapping: OpenID 'email'`, retorna `email_verified: False` sempre, porque o Authentik não acompanha a verificação de e-mail por usuário. Por isso, todo login falha até você trocar esse mapping:

1. Entre no Authentik como administrador.
2. Vá a **Customisation** > **Property Mappings**.
3. Selecione **Create** e depois **Scope Mapping**.
4. Preencha assim:
   - **Name:** `authentik main OAuth Mapping: OpenID verified 'email'`
   - **Scope name:** `email`
   - **Description:** `Verified Email address`
   - **Expression:**

     ```python
     return {
         "email": request.user.email,
         "email_verified": True
     }
     ```

5. Selecione **Create**.
6. Abra o provider OAuth2 que você configurou para o PatchMon e selecione **Edit**.
7. Expanda **Advanced protocol settings** e role até **Scopes**.
8. Remova `authentik default OAuth Mapping: OpenID 'email'`.
9. Adicione o mapping criado na etapa 4.
10. Entre no PatchMon de novo.

Ao fazer essa mudança, você está afirmando que os endereços de e-mail do seu diretório Authentik são confiáveis. Isso é razoável para um diretório que você controla e alimenta. Não é razoável se os usuários puderem se cadastrar sozinhos com qualquer endereço.

##### Microsoft Entra ID

O Entra ID não envia `email_verified` de jeito nenhum, e não há como fazê-lo enviar. Acrescentar `email` como claim opcional não ajuda, porque isso fornece o endereço, e não o sinal de verificação.

Em vez disso, **a partir do PatchMon 2.1.2, adicione a claim opcional `xms_edov`.** É o sinal "Email Domain Owner Verified" da própria Microsoft, criado em resposta ao nOAuth, o mesmo ataque de tomada de conta por falsificação de e-mail que esta exigência existe para impedir. O PatchMon lê essa claim quando `email_verified` não vem, então nenhuma configuração de segurança precisa ser afrouxada.

1. No Microsoft Entra admin centre, abra o registro da sua aplicação.
2. Vá a **Manage** > **Token configuration** > **Add optional claim**.
3. Selecione o tipo de token **ID** e adicione `xms_edov`. Se o portal disser que não a reconhece, adicione editando o manifest: encontre o objeto `optionalClaims` e acrescente `xms_edov` ao array `idToken`.
4. Entre no PatchMon de novo.

Em versões mais antigas do PatchMon, ou se preferir não configurar a claim, deixe `OIDC_AUTO_CREATE_USERS` desligado e vincule as contas pedindo que cada usuário entre uma vez enquanto existe uma conta local correspondente, ou use a opção abaixo.

##### Se o seu provedor não tem como afirmar a verificação

*Disponível a partir do PatchMon 2.1.2.*

Alguns diretórios realmente não têm a noção de endereço de e-mail verificado. Nesses casos, ligue **Trust unverified email** em **Settings > OIDC**, ou defina `OIDC_TRUST_UNVERIFIED_EMAIL=true` no ambiente. Vem desligado por padrão.

> **Defina no mesmo lugar em que configurou o próprio OIDC.** O PatchMon lê toda a configuração do OIDC de uma única origem, nunca de uma mistura: se qualquer uma de `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`, `OIDC_SCOPES` ou `OIDC_ENABLED` estiver definida no ambiente, todas as configurações do OIDC vêm do ambiente e os valores em **Settings > OIDC** são ignorados. Então, se você configurou o OIDC por variáveis de ambiente, a chave na interface parece salvar mas não tem efeito, e é preciso definir `OIDC_TRUST_UNVERIFIED_EMAIL=true`. Se você configurou o OIDC pela interface, definir só `OIDC_TRUST_UNVERIFIED_EMAIL` no ambiente não faz nada, e é preciso usar a chave. Isso vale para todas as configurações do OIDC, não só para esta.

Tenha claro o que isto faz. Com a opção ligada, qualquer pessoa capaz de definir o próprio e-mail no seu provedor de identidade consegue entrar como um usuário existente do PatchMon com aquele endereço. Só é razoável quando você controla quem pode mudar endereços no seu diretório. Cada login que ela deixa passar fica registrado no log do servidor em nível warn, para que uma implantação com essa flexibilização continue visível:

```
oidc accepting unverified email: trust_unverified_email is enabled
```

Onde houver correção de verdade, prefira-a: o scope mapping do Authentik acima, ou o `xms_edov` no Entra.

##### Outros provedores

Keycloak, Okta e Google Workspace enviam `email_verified` corretamente com a configuração padrão e não precisam de mudança.

Para ver o que o seu IdP realmente envia, decodifique o ID token em [jwt.io](https://jwt.io) depois de uma tentativa de login, ou leia a recusa no log do servidor (veja [Solução de problemas](#troubleshooting)).

---

### Desativando a autenticação local

Para impor SSO a todos os usuários, defina:

```bash
OIDC_DISABLE_LOCAL_AUTH=true
```

Isso esconde os campos de usuário e senha na tela de login e mostra só o botão de SSO. A autenticação local só é desativada de fato se o OIDC também estiver ativo e tiver inicializado com sucesso. Essa verificação de segurança evita que você fique trancado do lado de fora se o OIDC estiver mal configurado.

> **Importante:** garanta que pelo menos um usuário OIDC tenha acesso de administrador antes de ativar isto; caso contrário, você pode perder a capacidade de gerenciar o PatchMon.

---

### Exemplos completos de configuração

#### Authentik

```bash
# .env
APP_ENV=production
OIDC_ENABLED=true
OIDC_ISSUER_URL=https://authentik.example.com/application/o/patchmon/
OIDC_CLIENT_ID=patchmon
OIDC_CLIENT_SECRET=your-client-secret-here
OIDC_REDIRECT_URI=https://patchmon.example.com/api/v1/auth/oidc/callback
OIDC_SCOPES=openid email profile groups
OIDC_AUTO_CREATE_USERS=true
OIDC_DEFAULT_ROLE=user
OIDC_BUTTON_TEXT=Login with Authentik
OIDC_ADMIN_GROUP=PatchMon Admins
OIDC_USER_GROUP=PatchMon Users
OIDC_SYNC_ROLES=true
```

> **Lembrete:** do lado do Authentik, a **Signing Key** do provider (em **Advanced protocol settings**) precisa estar definida com um certificado. Deixá-la vazia faz o Authentik assinar os ID tokens com `HS256`, o que o PatchMon recusa, e todo login falha com "Authentication failed".

#### Keycloak

```bash
# .env
APP_ENV=production
OIDC_ENABLED=true
OIDC_ISSUER_URL=https://keycloak.example.com/realms/your-realm
OIDC_CLIENT_ID=patchmon
OIDC_CLIENT_SECRET=your-client-secret-here
OIDC_REDIRECT_URI=https://patchmon.example.com/api/v1/auth/oidc/callback
OIDC_SCOPES=openid email profile groups
OIDC_AUTO_CREATE_USERS=true
OIDC_DEFAULT_ROLE=user
OIDC_BUTTON_TEXT=Login with Keycloak
OIDC_ADMIN_GROUP=PatchMon Admins
OIDC_USER_GROUP=PatchMon Users
OIDC_SYNC_ROLES=true
```

---

### Solução de problemas

#### O OIDC não inicializa

**Os logs mostram:** `OIDC is enabled but missing required config: ...`

As quatro variáveis obrigatórias precisam estar definidas: `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` e `OIDC_REDIRECT_URI`. Procure erros de digitação ou valores vazios. Uma mensagem relacionada, `OIDC is partially configured via env vars but SSO is disabled`, significa que algumas das quatro estão definidas, mas não todas.

#### O login falha com "no email in UserInfo or id_token"

**Os logs mostram:** `oidc exchange failed` com `error: oidc: no email in UserInfo or id_token`, enquanto a tela de login mostra um genérico "Authentication failed".

Corrigido na 2.1.3. Dois defeitos distintos geravam a mesma mensagem. O ADFS envia claims de valor único como array JSON (`"email": ["user@example.com"]`) no ID token, e o PatchMon só aceitava string simples. Além disso, em qualquer provedor cujo endpoint UserInfo não retorna e-mail, esse valor vazio escondia um e-mail perfeitamente válido no ID token. Agora o PatchMon aceita a forma de array no ID token e trata um valor vazio como ausente, seguindo corretamente para a próxima fonte.

Se você está na 2.1.3 ou posterior e ainda vê isso, o seu provedor realmente não está enviando endereço de e-mail. Confira se o escopo `email` é pedido e se a claim está mapeada do lado do provedor; depois decodifique o ID token em [jwt.io](https://jwt.io), após uma tentativa de login, para confirmar o que chega. O PatchMon lê só a claim padrão `email`; não há configuração de mapeamento de claims, e `upn` não é usado como substituto.

Uma falha parecida, mas diferente, registra `oidc: fetch userinfo: oidc: failed to decode userinfo`. Isso significa que o provedor devolveu um array (ou outro tipo que não é string) num campo da resposta de **UserInfo**, e não do ID token. Essa resposta é decodificada antes de o PatchMon vê-la, então o tratamento de arrays acima não se aplica. Faça o provedor devolver strings simples em `/userinfo`, ou mapeie a claim no ID token.

#### Nenhuma linha de OIDC nos logs de inicialização

Numa configuração saudável, o PatchMon 2.0.3 ou posterior registra `OIDC SSO enabled; provider discovery is deferred to the first login attempt` na inicialização. Ele **não** contata o seu provedor de identidade nesse momento, então nunca há mensagens de descoberta ou de conexão para procurar.

Um `grep -i oidc` vazio tem quatro causas possíveis, e só a última é problema na sua configuração de SSO:

- **Os logs estão desligados.** `ENABLE_LOGGING` tem padrão `true` a partir da 2.0.3, mas um `false` explícito no `.env` ou em **Settings > Environment** continua sendo respeitado, e era o padrão nas versões anteriores. Com os logs desligados, o servidor não grava nada, e esta verificação não diz coisa nenhuma
- **O `LOG_LEVEL` está acima de `info`.** A linha de confirmação é registrada em nível info, então `warn` ou `error` a escondem
- **Você está na 2.0.2 ou anterior.** Nessas versões, uma configuração correta não registrava nada
- **A sua configuração não foi resolvida.** Procure `missing required config` ou `partially configured` na mesma saída

Se os logs estão desligados e você prefere não ligá-los, verifique se o botão de SSO aparece na tela de login. Ele depende da mesma configuração resolvida.

Também pode aparecer uma segunda linha de OIDC avisando que a sincronização de papéis não consegue conceder superadmin. Isso não tem relação com o carregamento do SSO e é tratado na Etapa 3.

#### O botão de SSO não aparece

O botão aparece quando as quatro variáveis obrigatórias resolvem para valores não vazios (das variáveis de ambiente, ou das configurações na interface web). Como o PatchMon só contata o IdP quando alguém tenta entrar, um IdP inalcançável ou mal configurado **não** esconde o botão. Se o botão sumiu, o problema está nos valores de configuração, não no IdP:

- Uma das quatro variáveis obrigatórias está vazia ou com o nome errado. Procure `missing required config` ou `partially configured` nos logs de inicialização
- `OIDC_ENABLED` não é `true` e nenhuma configuração OIDC foi salva na interface web
- O client secret foi salvo na interface web, mas não pode ser descriptografado, o que é registrado como `OIDC client secret could not be decrypted; treating OIDC as unconfigured`. Isso costuma significar que a sua chave de criptografia mudou. Digite o secret de novo e salve

#### "Authentication Failed" depois do redirecionamento

É o erro genérico para qualquer falha na troca de tokens, depois que o IdP devolve o usuário ao PatchMon. **Procure nos logs do servidor a linha que começa com `oidc exchange failed`, que traz o motivo específico.** Causas comuns:

- **O seu IdP está assinando os ID tokens com HS256.** O log traz `unexpected signature algorithm "HS256"`. O PatchMon só aceita tokens com assinatura assimétrica. No Authentik, abra o provider OAuth2/OIDC, expanda **Advanced protocol settings** e defina **Signing Key** com um certificado, como `authentik Self-signed Certificate`. Uma Signing Key vazia é o que causa isso
- A **Redirect URI** no seu IdP não bate exatamente com `OIDC_REDIRECT_URI` (inclusive barras no final)
- Os cookies estão sendo bloqueados (o OIDC usa cookies httpOnly para o estado da sessão)
- O seu IdP não suporta PKCE (o PatchMon usa o code challenge S256)

#### "Unable to sign in with this account" depois de um login bem-sucedido no IdP

Você entrou no IdP, ele devolveu você e o PatchMon recusou. A troca de tokens funcionou, então não é o erro anterior. **Veja os logs do servidor**, onde uma destas linhas dá o motivo:

| Linha de log | Significado | Correção |
|----------|---------|-----|
| `oidc login rejected: unverified email claim` | O seu IdP não enviou `email_verified` nem `xms_edov`. A partir da 2.1.0, o PatchMon exige uma delas quando precisa identificar você pelo e-mail. Afeta o Authentik e o Microsoft Entra ID na configuração de fábrica | [A exigência de e-mail verificado](#the-verified-email-requirement) |
| `oidc accepting unverified email: trust_unverified_email is enabled` | Não é erro. Registra que um login passou com um endereço não verificado porque a opção está ligada | Esperado, se você a ligou de propósito. Se não, desligue em **Settings > OIDC** |
| `oidc user not found and auto-create disabled` | Nenhuma conta do PatchMon corresponde, e `OIDC_AUTO_CREATE_USERS` está desligado | Crie o usuário no PatchMon antes, ou defina `OIDC_AUTO_CREATE_USERS=true` |

Uma conta desativada é outro caso: aparece **"Account disabled"** em vez desta mensagem, e o log registra `oidc login inactive user`.

Se os logs não mostram nada, suba o `LOG_LEVEL` para `debug` e tente de novo.

#### "Failed to reach the OIDC provider" ao clicar no botão de SSO

Isso aparece na hora do clique no botão de SSO, antes de a tela de login do IdP surgir. O navegador mostra uma resposta JSON crua, e não uma página de erro formatada, e os logs registram `oidc auth url failed`.

O PatchMon busca o documento de descoberta do seu IdP (`.well-known/openid-configuration`) na primeira tentativa de login, e não na inicialização, então os problemas para alcançar ou validar esse documento aparecem neste momento:

- O PatchMon não alcança o IdP de dentro do contêiner (DNS, firewall ou política de rede)
- `OIDC_ISSUER_URL` está errada. Ela não pode incluir `.well-known/openid-configuration`, que o PatchMon acrescenta sozinho
- A URL do emissor no documento de descoberta não bate com `OIDC_ISSUER_URL`. No Authentik, a barra no final faz diferença
- O certificado TLS do IdP não é confiável para o contêiner do PatchMon

#### Erro "Session Expired"

O estado do login OIDC tem uma janela configurável (padrão de 600 segundos, via `OIDC_SESSION_TTL`). Se o usuário demorar mais que isso no IdP, a sessão expira. Basta tentar entrar de novo, ou aumentar `OIDC_SESSION_TTL` se isso acontecer com frequência.

#### O usuário recebe o papel errado

- Confira se o escopo `groups` está em `OIDC_SCOPES`
- Confirme que o seu IdP inclui os grupos no ID token (e não só no access token)
- Se os logs mostrarem `oidc no groups in token`, o seu IdP não enviou grupo nenhum. Configure-o para incluir a claim de grupos. No Authentik, isso significa adicionar um Scope Mapping que emita `groups`
- A comparação de grupos não diferencia maiúsculas e minúsculas, então `patchmon admins` casa com `PatchMon Admins`

#### Faixas / restrições de OIDC aparecendo quando não deveriam

Se aparecerem faixas "OIDC Authentication Enabled" nas páginas de configuração Users ou Roles, ou se os botões "Add User" / "Add Role" sumirem, é porque `OIDC_SYNC_ROLES` está ligado. Essas restrições só valem com a sincronização de papéis ativa. Se você quer usar o OIDC para login mas gerenciar os papéis localmente, defina `OIDC_SYNC_ROLES=false` (ou não defina; o padrão é `false`).

#### Erro "User Not Found"

`OIDC_AUTO_CREATE_USERS` está em `false` (o padrão) e não existe conta correspondente no PatchMon. Defina `OIDC_AUTO_CREATE_USERS=true` ou crie a conta manualmente no PatchMon antes (o e-mail precisa ser o mesmo).

#### Logs de depuração

Para investigar o OIDC em detalhe, ative os logs de depuração:

```bash
LOG_LEVEL=debug
```

Depois, veja os logs do servidor:

```bash
# Docker
docker compose logs -f patchmon-server | grep -i oidc

# Native systemd
journalctl -u <your-domain> -f | grep -i oidc
```

---

### Observações de segurança

- **O HTTPS é exigido** nas rotas de login e de callback do OIDC com `OIDC_ENFORCE_HTTPS=true` (o padrão). Defina `APP_ENV` como `production` no seu ambiente. `NODE_ENV` também é aceito, como alias por compatibilidade
- **PKCE (S256)** é usado em todas as trocas de authorization code
- **Os tokens ficam em cookies httpOnly**, e não no localStorage, para evitar ataques XSS
- **Client secrets** nunca devem ir para o controle de versão
- **O vínculo de contas** só acontece quando o IdP informa que o e-mail é verificado
- **A sincronização de papéis** pode ficar desligada (`OIDC_SYNC_ROLES=false`, que é o padrão) se você preferir gerenciar os papéis manualmente no PatchMon depois do primeiro login

---

## Capítulo 7: Configurando SSO com o Azure Entra ID {#setting-up-azure-entra-id-sso}

Este é um passo a passo para configurar o **Microsoft Azure Entra ID** (antigo Azure Active Directory) como provedor de login único do PatchMon, usando a **interface Settings**. Não é preciso editar o `.env`.


---

### O resultado

- Os usuários entram no PatchMon com a conta corporativa da Microsoft.
- As contas do PatchMon são criadas automaticamente no primeiro login.
- Os papéis do PatchMon (Super Admin / Admin / Host Manager / User / Readonly) são definidos por **grupos de segurança** do Entra ID.
- Opcionalmente, o login local por usuário e senha é desativado, e o SSO passa a ser a única forma de entrar.

Tudo é configurado em **Settings → OIDC / SSO**, na interface web do PatchMon.

---

### Antes de começar

Você vai precisar de:

| Item | Observações |
|------|-------|
| Uma instância do PatchMon rodando | Acessível numa URL fixa, por exemplo `https://patchmon.example.com` |
| HTTPS na URL do PatchMon | O Entra ID **não** aceita redirect URIs em `http://` simples (exceto `http://localhost`) |
| Uma conta de administrador existente no PatchMon | Para entrar e abrir Settings. Se ainda não tiver, conclua antes o assistente de configuração normal |
| Acesso ao Microsoft Entra admin center | `https://entra.microsoft.com`. É preciso ter o papel **Application Administrator** ou **Global Administrator** no tenant |

Abra duas abas do navegador lado a lado:

- **Aba 1:** PatchMon → entre como admin → **Settings → OIDC / SSO**
- **Aba 2:** [https://entra.microsoft.com](https://entra.microsoft.com)

Você vai juntar **seis valores** na aba 2 e colá-los na aba 1:

1. Tenant ID
2. Application (client) ID
3. Client secret (o **Value**, não o Secret ID)
4. Object ID do grupo de administradores
5. Object ID do grupo de usuários
6. (Opcional) os Object IDs de outros grupos de papel

---

### Parte A: configure o Entra ID (aba 2)

#### Etapa 1: pegue antes a URL de callback no PatchMon

Antes de começar no Entra, copie a URL de callback que o PatchMon vai usar. Você vai colá-la no Entra.

1. Na aba 1, vá a **Settings → OIDC / SSO**.
2. Role até a seção **OAuth2 Configuration**.
3. Veja o campo **Callback URL**. Ele mostra algo como:
   ```
   https://patchmon.example.com/api/v1/auth/oidc/callback
   ```
4. Copie. Você vai precisar dela na próxima etapa.

> **Observação:** este campo é somente leitura e vem da configuração de URL do servidor do PatchMon. Se ele parecer errado (por exemplo, `http://localhost:3000` quando você está em produção), corrija antes a **Server URL** em Settings → General.

---

#### Etapa 2: registre uma aplicação no Entra ID

1. Na aba 2, abra **Identity → Applications → App registrations**.
2. Clique em **+ New registration**.
3. Preencha o formulário:
   - **Name:** `PatchMon` (só cosmético, aparece na tela de consentimento)
   - **Supported account types:** na maioria das implantações, escolha **Accounts in this organizational directory only (Single tenant)**. Só escolha multi-tenant se quiser explicitamente que usuários de outros tenants do Entra entrem.
   - **Redirect URI:**
     - Platform: **Web**
     - URL: cole a URL de callback copiada na etapa 1
4. Clique em **Register**.

Você cai na página **Overview** da aplicação. Copie estes dois valores para uma nota de rascunho:

- **Application (client) ID**
- **Directory (tenant) ID**

---

#### Etapa 3: crie um client secret

1. No menu à esquerda, abra **Certificates & secrets**.
2. Em **Client secrets**, clique em **+ New client secret**.
3. Description: `PatchMon`. Expiry: escolha uma duração que combine com a sua política de rotação (até 24 meses).
4. Clique em **Add**.
5. **Copie a coluna `Value` na hora.** É a única vez que o Entra a mostra.

> **Não** copie o `Secret ID`. Ele é um GUID de metadados, não o segredo. O que você quer é a coluna `Value`.

Guarde esse valor na nota de rascunho como **Client Secret**.

---

#### Etapa 4: configure as claims do token (adicione os grupos)

O PatchMon associa grupos do Entra ID a papéis do PatchMon, então o Entra precisa incluir a informação de grupos no ID token.

1. No menu à esquerda, abra **Token configuration**.
2. Clique em **+ Add groups claim**.
3. Marque **Security groups**. Deixe as outras caixas desmarcadas, a menos que você use especificamente Directory roles ou Distribution lists.
4. Expanda cada uma das três seções (**ID**, **Access**, **SAML**) e confirme que **Group ID** está selecionado. É o padrão. **Não mude para sAMAccountName** em grupos do Entra só na nuvem (sAMAccountName só funciona com grupos sincronizados do AD local).
5. Clique em **Add**.

> **O que o PatchMon recebe:** com esta configuração, o Entra ID envia os grupos como um array de GUIDs (os Object IDs dos grupos) na claim `groups` do ID token. São esses GUIDs (e não os nomes dos grupos) que você vai colar na tabela Role Mapping do PatchMon.

##### Opcional, mas recomendado: adicione as claims de usuário padrão

O Entra nem sempre inclui todas as claims padrão do OIDC por padrão.

1. Ainda em **Token configuration**, clique em **+ Add optional claim**.
2. Token type: **ID**.
3. Marque `email`, `family_name`, `given_name` e `preferred_username`.
4. Clique em **Add**. Se pedir para ativar a permissão `email` do Microsoft Graph, aceite.

---

#### Etapa 5: permissões de API

1. Abra **API permissions** no menu à esquerda.
2. Já deve aparecer `User.Read` em **Microsoft Graph**. Isso basta. Se não aparecer, clique em **+ Add a permission → Microsoft Graph → Delegated permissions** e adicione `User.Read`, `openid`, `profile` e `email`.
3. Clique em **Grant admin consent for <your tenant>**, no topo, e confirme. Sem o consentimento do administrador, cada usuário terá de consentir individualmente no primeiro login.

---

#### Etapa 6: crie grupos de segurança para o mapeamento de papéis

Decida quais papéis do PatchMon você vai usar. No mínimo, provavelmente **Admin** e **User**. Dá para acrescentar outros depois.

Para **cada** papel:

1. No Entra, vá a **Identity → Groups → All groups**.
2. Clique em **+ New group**.
3. Preencha:
   - **Group type:** `Security`
   - **Group name:** por exemplo, `PatchMon Admins` (o nome é para pessoas; o PatchMon associa pelo Object ID)
   - **Membership type:** `Assigned` (o mais simples)
4. Adicione como **Members** os usuários que devem ter aquele papel.
5. Clique em **Create**.
6. Depois de criado, abra o grupo e **copie o Object ID** (um GUID como `11111111-2222-3333-4444-555555555555`) para a nota de rascunho.

Repita para cada papel que quiser usar.

#### Tabela de mapeamento

| Papel no PatchMon | Grupo do Entra (exemplo) | Onde colar o Object ID |
|---------------|----------------------|----------------------------------|
| Super Admin | `PatchMon SuperAdmins` | Tabela Role Mapping → linha `superadmin` |
| Admin | `PatchMon Admins` | Tabela Role Mapping → linha `admin` |
| Host Manager | `PatchMon Host Managers` | Tabela Role Mapping → linha `host_manager` |
| User | `PatchMon Users` | Tabela Role Mapping → linha `user` |
| Readonly | `PatchMon Readonly` | Tabela Role Mapping → linha `readonly` |

> Só é preciso preencher as linhas que você usa. Linhas vazias são ignoradas. Usuários que não se encaixam em nenhum grupo recebem o papel **Default (fallback)**.

---

### Parte B: configure o PatchMon (aba 1)

Volte à aba 1: **Settings → OIDC / SSO**.

#### Etapa 7: preencha a seção OAuth2 Configuration

Role até o painel **OAuth2 Configuration** e preencha os campos com os valores da nota de rascunho:

| Campo no PatchMon | O que colocar |
|-------------------|-------------------|
| **Issuer URL** | `https://login.microsoftonline.com/<TENANT_ID>/v2.0`. Troque `<TENANT_ID>` pelo Directory (tenant) ID da etapa 2. O sufixo `/v2.0` é obrigatório. |
| **Client ID** | O Application (client) ID da etapa 2 |
| **Client Secret** | Cole o Value do client secret da etapa 3 e clique no botão **Save** ao lado do campo. O selo muda de "Not set" para "Set" |
| **Callback URL** | Somente leitura, já preenchido. É a URL que você registrou no Entra na etapa 2 |
| **Redirect URI (optional override)** | Deixe vazio. Só use se o seu PatchMon estiver atrás de um proxy reverso que apresenta outra URL pública |
| **Scopes** | Troque o padrão `openid email profile groups` por **`openid email profile User.Read`**: tire o `groups` do fim e acrescente `User.Read`. O Entra recusa `groups` como escopo desconhecido. `User.Read` é necessário se você quer que o PatchMon busque a foto de perfil do usuário no Entra |
| **Button Text** | `Sign in with Microsoft` (ou o que preferir) |

Clique em **Apply**, no pé do painel. Deve aparecer o aviso **"OIDC settings saved"**.

> **Por que sem o escopo `groups` no Entra?** Outros IdPs (Authentik, Keycloak) usam um escopo `groups` para pedir as claims de grupo. O Entra não: ele usa a **Token configuration** da aplicação (configurada na etapa 4). Incluir `groups` no campo Scopes faz o Entra recusar o pedido de autorização com erro de "invalid scope".
>
> **Por que acrescentar `User.Read`?** O PatchMon usa `User.Read` para chamar o Microsoft Graph e buscar a foto de perfil do usuário conectado. Sem ele, o SSO funciona, mas as fotos de perfil do Entra não podem ser importadas.

---

#### Etapa 8: configure as chaves

No topo da página OIDC / SSO há um painel **Configuration** com cinco chaves. Configuração recomendada para o Entra ID:

| Chave | Recomendado | Por quê |
|--------|-------------|-----|
| **Enable OIDC / SSO** | **Deixe DESLIGADA por enquanto.** Você vai ligá-la na etapa 10, depois que todo o resto estiver pronto | Ligá-la cedo demais expõe um botão de SSO quebrado na tela de login |
| **Enforce HTTPS** | **LIGADA** | O Entra não funciona em HTTP simples de qualquer jeito |
| **Sync roles from IdP** | **LIGADA** | Necessária se você quer que os grupos de segurança do Entra definam os papéis do PatchMon |
| **Disable local auth** | **DESLIGADA** (por enquanto) | Deixe desligada até confirmar que o SSO funciona. Dá para ligar depois |
| **Auto-create users** | **LIGADA** | Cria as contas do PatchMon automaticamente no primeiro login, sem precisar cadastrar os usuários antes |

As chaves do topo não precisam de botão Save (exceto **Enable OIDC / SSO**, que salva na hora). As outras quatro são aplicadas quando você clica em **Apply** no painel OAuth2 Configuration.

---

#### Etapa 9: preencha a tabela Role Mapping

1. Role até **Role Mapping** e clique no cabeçalho para expandir.
2. Aparece uma tabela com uma linha **Default (fallback)** e uma linha por papel do PatchMon.
3. Para cada papel para o qual você criou um grupo no Entra, cole o **Object ID** do grupo (da etapa 6) na coluna **OIDC Mapped Role (IdP Group Name)**.

| Papel no PatchMon | Cole aqui |
|---------------|------------|
| Default (fallback) | Deixe `user`, ou mude para `readonly` se quiser que usuários sem correspondência não tenham acesso de escrita |
| superadmin | Object ID do `PatchMon SuperAdmins` no Entra (ou deixe em branco se não quiser que ninguém seja promovido a superadmin pelo SSO) |
| admin | Object ID do `PatchMon Admins` no Entra |
| host manager | Object ID do `PatchMon Host Managers` no Entra |
| user | Object ID do `PatchMon Users` no Entra |
| readonly | Object ID do `PatchMon Readonly` no Entra |

4. Role de volta até o painel **OAuth2 Configuration** e clique em **Apply** para salvar o mapeamento de papéis. (Os campos do mapeamento são salvos junto com os campos de OAuth2 pelo botão Apply.)

> **Importante:** o rótulo diz "IdP Group Name", mas no Entra ID você precisa colar o **Object ID (GUID)** do grupo, e não o nome de exibição. O Entra manda GUIDs no token, não nomes.

> **Aviso âmbar:** se a sincronização de papéis estiver ligada mas a linha superadmin estiver vazia, aparece um aviso âmbar. É esperado: significa que ninguém será promovido a superadmin pelo SSO. Os superadmins locais existentes mantêm o papel. Se é isso que você quer, ignore o aviso.

---

#### Etapa 10: ligue o OIDC e teste

1. No topo da página, mude **Enable OIDC / SSO** para **LIGADA**. Ela salva na hora.
2. Abra o PatchMon numa **janela privada/anônima** do navegador (para não usar a sessão atual).
3. Deve aparecer o botão **Sign in with Microsoft** na tela de login (ou o texto que você definiu).
4. Clique nele. Você é levado a `login.microsoftonline.com`.
5. Entre com uma conta do Entra que seja membro de um dos grupos do PatchMon.
6. Você volta ao PatchMon já conectado.

**Comportamento no primeiro login:**

- Uma conta do PatchMon é criada automaticamente. O nome de usuário vem do prefixo do e-mail (por exemplo, `alice@contoso.com` → `alice`).
- O papel é definido pela participação nos grupos; se nenhum grupo corresponder, vale o papel **Default (fallback)**.
- Se **ainda não houver administrador no PatchMon**, o primeiro usuário OIDC é promovido automaticamente a **Super Admin**, seja qual for o grupo, para você não ficar trancado do lado de fora.

---

### Opcional: impor só SSO (desativar o login com senha)

Depois de confirmar que pelo menos um usuário OIDC tem Admin ou Super Admin:

1. Volte a **Settings → OIDC / SSO**.
2. Ligue **Disable local auth**.
3. Clique em **Apply** no pé do painel OAuth2 Configuration.

A tela de login passa a mostrar só o botão **Sign in with Microsoft**. Os campos de usuário e senha locais ficam ocultos.

> **Segurança:** o PatchMon só aplica esta opção se o OIDC **também** estiver ativo *e* tiver inicializado com sucesso. Se o OIDC quebrar por qualquer motivo, o login local volta automaticamente, para você não ficar trancado do lado de fora.

---

### Solução de problemas

#### Faixa âmbar "OIDC is configured via .env" no topo

Isso aparece se as variáveis de ambiente do OIDC foram definidas no `.env` antes de a interface ser usada. Clique em **Load from .env** para importar esses valores para o banco, depois remova as linhas `OIDC_*` do `.env` e reinicie o servidor. A partir daí, tudo é gerenciado pela interface.

#### O botão "Sign in with Microsoft" não aparece na tela de login

O botão aparece quando o OIDC está ativo e os quatro valores obrigatórios estão preenchidos. O PatchMon só contata o Entra quando alguém clica no botão, então um firewall de saída que bloqueie `login.microsoftonline.com` **não** o esconde. Causas mais comuns:

- **Client Secret vazio ou errado:** o rótulo mostra "Not set". Digite de novo e clique em **Save** ao lado do campo do secret.
- **Issuer URL, Client ID ou Redirect URI vazio.** Qualquer um dos quatro em branco desativa o SSO.

Se o botão aparece mas o login falha, o problema está na conectividade ou na configuração do Entra. Um `login.microsoftonline.com` bloqueado dá "Failed to reach the OIDC provider" ao clicar no botão, e uma URL de emissor errada (ela precisa terminar em `/v2.0`; confira se o GUID do tenant não tem erro de digitação) dá o mesmo.

Veja os logs do servidor e procure `oidc`. Isso exige `ENABLE_LOGGING=true`, o padrão a partir da 2.0.3:

```bash
# Docker
docker compose logs patchmon-server | grep -i oidc

# Native systemd
journalctl -u <your-service-name> | grep -i oidc
```

#### `AADSTS50011: Reply URL does not match`

A redirect URI no Entra não bate com a URL de callback que o PatchMon está enviando. Vá à página **Authentication** da aplicação no Entra e confira:

- O protocolo é `https://`
- Host e porta são exatamente os da URL pública do PatchMon
- O caminho é `/api/v1/auth/oidc/callback`, **sem** barra no final
- Não há espaços invisíveis (cole num editor de texto simples para conferir)

Se você está atrás de um proxy reverso e o PatchMon gera a URL de callback errada, corrija primeiro a **Server URL** em **Settings → General**. Não use o campo "Redirect URI (optional override)" a menos que tenha certeza de que o proxy apresenta outra URL pública.

#### `AADSTS70011: The provided value for scope ... is not valid`

O campo Scopes inclui `groups`. O Entra recusa escopos desconhecidos. Mude o campo Scopes para:

```
openid email profile User.Read
```

Clique em **Apply**.

#### `AADSTS700016: Application with identifier ... was not found`

O campo **Client ID** não bate com o Application (client) ID no Entra. Copie de novo da página **Overview** da aplicação e clique em **Apply**.

#### `AADSTS7000215: Invalid client secret provided`

O secret está errado, foi trocado ou expirou. Crie um novo no Entra (**Certificates & secrets**), cole o novo Value no campo Client Secret e clique em **Save** ao lado do campo.

#### Entrou, mas com o papel errado (ou o papel padrão)

1. Confirme que a chave **Sync roles from IdP** está ligada.
2. Confirme que você colou na tabela Role Mapping o **Object ID (GUID)** do grupo do Entra, e não o nome de exibição.
3. Veja os logs do servidor. O PatchMon registra os grupos que recebeu:

   ```bash
   docker compose logs patchmon-server | grep -i "oidc groups"
   ```

4. Se os logs mostrarem `oidc no groups in token`, volte à etapa 4 e confirme que a claim de grupos foi adicionada em Token configuration com **Security groups** → **Group ID**.

#### Entrou, mas a foto de perfil não aparece

1. Confirme que o campo **Scopes** inclui `User.Read`.
2. Confirme que a aplicação no Entra tem **Microsoft Graph → Delegated permission → User.Read** e que o **consentimento do administrador** foi concedido.
3. Verifique se o usuário tem mesmo uma foto de perfil definida no Microsoft 365 / Entra.
4. Depois de mudar escopos ou permissões, saia e entre de novo, para o PatchMon receber um access token novo.

#### "Too many groups": o usuário pertence a mais de 200 grupos

Se um usuário é membro de 200 ou mais grupos no Entra, o token passa a trazer um indicador de excesso `_claim_names` e omite o array `groups`. Hoje o PatchMon não segue esse ponteiro de excesso.

**Contorno:** em **Token configuration → Edit groups claim** do Entra, selecione **Groups assigned to the application**. Isso limita a claim aos grupos atribuídos explicitamente à aplicação PatchMon, o que quase sempre mantém o total bem abaixo de 200.

#### "Session Expired" depois de clicar no botão de SSO

O cookie de estado tem, por padrão, TTL de 10 minutos. Se o usuário demorar demais na tela de login da Microsoft (MFA, redefinição de senha), ele expira. Basta clicar no botão de SSO de novo e concluir o login mais rápido. Se isso acontecer com frequência, o TTL pode ser configurado com `OIDC_SESSION_TTL` no `.env` (esta ainda não está na interface).

---

### Referência rápida: de onde vem cada valor

| Campo na interface do PatchMon | Onde encontrar no Entra |
|-------------------|---------------------------|
| **Issuer URL** | `https://login.microsoftonline.com/<Directory (tenant) ID>/v2.0`. O Tenant ID fica na página **Overview** da aplicação no Entra |
| **Client ID** | **Overview** da aplicação no Entra → **Application (client) ID** |
| **Client Secret** | Aplicação no Entra → **Certificates & secrets** → **Value** do client secret (mostrado uma única vez, na criação) |
| **Callback URL** | Já preenchido pelo PatchMon. Copie-o **para** o Entra, não dele |
| **Scopes** | `openid email profile User.Read` (sem `groups`) |
| **Role Mapping → cada linha** | Entra → **Groups → All groups → <grupo> → Overview → Object ID** |

---

## Capítulo 8: Instalando o agente do PatchMon {#installing-the-patchmon-agent}

### Visão geral

O agente do PatchMon é registrado pelo assistente **Add Host** da interface web. O assistente cria o registro do host no banco, emite um token de bootstrap de uso único e monta um comando de uma linha pronto para colar. Rodar esse comando no host de destino baixa o binário do agente para aquela plataforma por um canal HTTPS autenticado, grava a configuração e as credenciais, registra um serviço do sistema e abre uma conexão WebSocket persistente com o servidor.

Este capítulo cobre de ponta a ponta a instalação feita pela interface. Tudo o que acontece depois do primeiro check-in (comandos da CLI, gerenciamento do serviço, logs, atualizações) está em [Gerenciando o agente do PatchMon](#managing-the-patchmon-agent). Para registro em massa em hosts de contêineres, veja o Guia de registro automático de LXC no Proxmox.

#### Como funciona

1. A interface web chama `POST /api/v1/hosts` (com autenticação de administrador) para criar a linha do host e recebe um par `api_id` / `api_key` em texto claro. É a única vez em que a chave em texto claro é exposta.
2. O assistente monta uma URL de instalação (`GET /api/v1/hosts/install?os=<linux|freebsd|windows>`) e já passa as credenciais nos cabeçalhos `X-API-ID` / `X-API-KEY`.
3. O servidor responde com um script de instalação específico do sistema operacional. Um **token de bootstrap** de curta duração (TTL de 5 minutos, uso único) vai embutido no topo do script, para o host trocá-lo pelo seu `api_id` / `api_key` definitivo via `POST /api/v1/hosts/bootstrap/exchange`.
4. O instalador detecta a arquitetura sozinho (via `uname -m` ou `PROCESSOR_ARCHITECTURE`), baixa o binário do agente correspondente de `GET /api/v1/hosts/agent/download`, grava `/etc/patchmon/config.yml` e `/etc/patchmon/credentials.yml` (ou os equivalentes no Windows) e inicia o serviço.
5. No primeiro `serve`, o agente abre um WebSocket com `/api/v1/agents/ws` e manda um relatório inicial. O assistente consulta `/api/v1/ws/status/{apiId}` a cada 2 segundos e passa por quatro estados: **Waiting for connection → Connected → Receiving initial report → Done**. Depois leva você à página de detalhes do host.

#### Pré-requisitos

Antes de registrar um host, confira se:

- Você consegue entrar no PatchMon com um usuário que tem a permissão `can_manage_hosts` (admin, superadmin ou um papel personalizado com essa permissão).
- O host de destino alcança o servidor do PatchMon por HTTPS (TCP/443 ou a porta que o seu proxy reverso expõe).
- O relógio do host de destino está certo. O instalador verifica isso e avisa (ou interrompe, no modo interativo) se a hora do sistema parecer errada. TLS e tokens assinados falham sem aviso se o relógio estiver mais de alguns minutos fora.
- No Linux / FreeBSD você tem acesso `root` (ou `sudo`). No Windows, um PowerShell elevado (Executar como administrador).

### Passo a passo

#### Etapa 1: abra o assistente Add Host

Vá a **Hosts → Add Host** na interface web. Aparece um assistente de quatro etapas:

| Etapa | Rótulo | O que você faz |
|------|-------|-------------|
| 1 | Choose OS | Escolhe Linux, FreeBSD ou Windows |
| 2 | Host details | Nome amigável, grupos de hosts, integrações opcionais |
| 3 | Copy command | Copia o comando de instalação de uma linha gerado |
| 4 | Connection | Espera o agente fazer check-in |

#### Etapa 2: escolha o sistema operacional

Escolha o sistema operacional do host de destino. Isso define qual instalador o servidor entrega e qual binário é baixado.

| Sistema | Instalador | Formato do binário |
|----|-----------|----------------|
| **Linux** | Script de shell POSIX (`patchmon_install.sh`) | `patchmon-agent-linux-<arch>` |
| **FreeBSD** | Script de shell POSIX (o mesmo do Linux, com o parâmetro `os=freebsd`) | `patchmon-agent-freebsd-<arch>` |
| **Windows** | Script PowerShell (`patchmon_install_windows.ps1`) | `patchmon-agent-windows-<arch>.exe` |

A **arquitetura é detectada automaticamente na instalação**: você não a escolhe na interface. O instalador converte `uname -m` (ou `PROCESSOR_ARCHITECTURE`, no Windows) em `amd64`, `arm64`, `arm` ou `386` e baixa o binário correspondente.

> **Windows 32 bits (x86) não é suportado.** O instalador para com um erro claro. Todas as versões do Windows com suporte da Microsoft em 2026 são só de 64 bits.

#### Etapa 3: dados do host

Preencha o formulário:

| Campo | Obrigatório | Observações |
|-------|:--------:|-------|
| **Friendly Name** | Sim | Rótulo livre exibido na interface (por exemplo, `web-01.prod`). Não precisa ser igual ao hostname real; o hostname real é aprendido no primeiro relatório do agente. |
| **Host Groups** | Não | Marque um ou mais grupos para já etiquetar o host. Os grupos podem ser mudados depois. |
| **Docker integration** | Não | Ativa o relatório de contêineres, volumes e imagens Docker. Pode ser ligada ou desligada depois na página de detalhes do host. |
| **Compliance integration** | Não | Ativa o scanner de conformidade OpenSCAP. Pode ser ligada ou desligada depois. |

Clique em **Next**. A interface chama `POST /api/v1/hosts` para criar o registro do host e recebe de volta um `api_id` e uma `api_key` em texto claro. Eles só aparecem dentro do comando para copiar, na próxima etapa, e **nunca são guardados nem mostrados de novo** na interface. Se você perder o comando antes de rodá-lo, gere novas credenciais na página de detalhes do host (veja [Gerenciando o agente do PatchMon](#managing-the-patchmon-agent)).

#### Etapa 4: copie o comando de instalação

O assistente mostra agora um comando de uma linha feito para o sistema escolhido. Exemplos:

**Comando para Linux:**

```bash
curl -s "https://patchmon.example.com/api/v1/hosts/install" \
  -H "X-API-ID: patchmon_a1b2c3d4" \
  -H "X-API-KEY: <64-char-key>" | sudo sh
```

**Comando para FreeBSD** (atenção: sem `sudo`; no FreeBSD a instalação roda direto como root; use `su -` antes se não for root):

```sh
curl -s "https://patchmon.example.com/api/v1/hosts/install?os=freebsd" \
  -H "X-API-ID: patchmon_a1b2c3d4" \
  -H "X-API-KEY: <64-char-key>" | sh
```

**Comando para Windows** (PowerShell elevado, numa única linha):

```powershell
Invoke-WebRequest -Uri "https://patchmon.example.com/api/v1/hosts/install?os=windows" -Headers @{"X-API-ID"="patchmon_a1b2c3d4"; "X-API-KEY"="<64-char-key>"} -UseBasicParsing -OutFile "$env:TEMP\patchmon-install.ps1"; & "$env:TEMP\patchmon-install.ps1"
```

Clique em **Copy command**. O assistente avança sozinho para a **Etapa 5: Connection**.

##### Opções do Windows

Na etapa do Windows aparecem duas caixas opcionais:

| Opção | Quando usar |
|--------|-------------|
| **Self-signed certificate (SSL bypass)** | O seu servidor do PatchMon usa uma CA privada/interna em que o Windows não confia. O comando gerado define `[Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }` antes de chamar o servidor. |
| **Use curl instead of Invoke-WebRequest** | Alguns hosts Windows mais antigos ou endurecidos falham com `Invoke-WebRequest` por causa da negociação de TLS 1.0/1.1 ou de problemas com transferência em blocos. Marcar esta caixa passa a usar o `curl.exe` (que vem com o Windows 10 1803+ e o Server 2019+). |

Se o seu servidor usa um certificado TLS assinado comercialmente (Let's Encrypt, CA comercial), deixe as duas desmarcadas.

##### A flag `--force` (só Linux)

O instalador do Linux aceita a flag `--force`, que passa por cima de pacotes `apt` quebrados durante a instalação das dependências. O assistente não a mostra por padrão. Se `apt-get update` ou `apt-get install curl` falhar no host de destino, rode o comando de instalação de novo com `--force` depois de `sh`:

```bash
curl -s "https://patchmon.example.com/api/v1/hosts/install?force=true" \
  -H "X-API-ID: ..." -H "X-API-KEY: ..." | sudo sh -s -- --force
```

#### Etapa 5: rode o comando no host de destino

Cole o comando num terminal do host de destino.

**Linux / FreeBSD:** rode como `root` ou com `sudo`. Caso contrário, o instalador se recusa a rodar.

**Windows:** clique com o botão direito no PowerShell → **Executar como administrador** e cole.

O instalador vai:

1. Verificar a data/hora do sistema (pede confirmação quando roda num TTY; segue sem perguntar quando recebe o script por pipe).
2. Detectar o gerenciador de pacotes (`apt`, `dnf`, `yum`, `zypper`, `pacman`, `apk` ou `pkg`) e instalar o `curl`, se faltar.
3. Trocar o token de bootstrap pelo `api_id` / `api_key` reais via `POST /api/v1/hosts/bootstrap/exchange`.
4. Criar `/etc/patchmon/` (Linux/FreeBSD) ou `C:\ProgramData\PatchMon\` (Windows) com `config.yml` e `credentials.yml`, ambos com permissão `0600` / só para Administrators.
5. Baixar o binário do agente correspondente de `GET /api/v1/hosts/agent/download?arch=<arch>&os=<os>`.
6. Rodar `patchmon-agent ping` para confirmar que as credenciais funcionam.
7. Registrar o serviço:
   - **systemd** na maioria das distribuições Linux: `/etc/systemd/system/patchmon-agent.service`
   - **OpenRC** no Alpine: `/etc/init.d/patchmon-agent`
   - **rc.d** no FreeBSD: `/usr/local/etc/rc.d/patchmon_agent`
   - **Crontab**, como alternativa, se nenhum sistema de init for detectado
   - **Windows Service Control Manager** no Windows: serviço `PatchMonAgent`, com inicialização Automática
8. Iniciar o serviço, que abre o WebSocket e manda o relatório inicial do sistema.

Num host limpo e com rede funcionando, o processo todo leva de 10 a 30 segundos.

> **openSUSE e SLES:** o instalador detecta o `zypper` e conclui com sucesso, mas o inventário de pacotes em hosts da família SUSE **ainda está por vir**. O agente ainda não tem suporte a zypper, então a etapa 8 falha com `unsupported package manager: unknown` e o host fica em "Waiting for initial system report", sem ficar ativo. Uma instalação bem-sucedida nesses sistemas não significa que o host está sendo monitorado. Acompanhe e vote no suporte a zypper em [feedback.patchmon.net](https://feedback.patchmon.net/b/feature-requests/posts/post_01kyza53c0fzst214afbr1qn9a).

#### Etapa 6: acompanhe a tela "Waiting for Connection"

O assistente mostra agora o andamento da conexão. Ele consulta `/api/v1/ws/status/{apiId}` a cada 2 segundos e passa por quatro estados:

| Estado | Significado |
|-------|---------|
| **Waiting for connection** | Nenhum WebSocket foi aberto ainda. O instalador ainda está rodando no host, ou o host não alcança o servidor. |
| **Connected** | O agente abriu um WebSocket, mas ainda não mandou relatório. O relatório inicial roda em segundo plano logo depois que o `serve` começa. |
| **Receiving initial report** | O agente mandou um relatório e o servidor está processando (tipo de sistema, hostname, IP, arquitetura, pacotes). |
| **Done** | O registro está concluído. Depois de um breve estado "Done", o assistente leva você a **Hosts → <nome amigável>**. |

Se você fechar o assistente antes de chegar a **Done**, o registro termina mesmo assim, em segundo plano. O host aparece na lista **Hosts** com status "Pending" até o primeiro relatório chegar e depois passa para "Active".

### O que é instalado

| Caminho (Linux / FreeBSD) | Caminho (Windows) | Finalidade |
|---|---|---|
| `/usr/local/bin/patchmon-agent` | `C:\Program Files\PatchMon\patchmon-agent.exe` | Binário do agente |
| `/etc/patchmon/config.yml` | `C:\ProgramData\PatchMon\config.yml` | Configuração do agente |
| `/etc/patchmon/credentials.yml` | `C:\ProgramData\PatchMon\credentials.yml` | Credenciais da API (`api_id`, `api_key`) |
| `/etc/patchmon/logs/patchmon-agent.log` | `C:\ProgramData\PatchMon\patchmon-agent.log` | Arquivo de log rotativo |
| `/etc/systemd/system/patchmon-agent.service` *(systemd)* | | Unit do systemd |
| `/etc/init.d/patchmon-agent` *(OpenRC)* | | Script de init do OpenRC |
| `/usr/local/etc/rc.d/patchmon_agent` *(FreeBSD)* | | Script rc.d do FreeBSD |
| | Serviço do Windows `PatchMonAgent` | Entrada no Service Control Manager |

A referência completa de todos os parâmetros do `config.yml` está em [Referência de configuração do agente (config.yml)](#agent-config-yml-reference).

### Solução de problemas do primeiro check-in

Se a tela "Waiting for connection" nunca sair do estado inicial, faça as verificações abaixo, nesta ordem.

#### 1. O host não alcança o servidor

No host de destino:

```bash
curl -v https://patchmon.example.com/health
# expected: HTTP/1.1 200 and body "healthy"
```

Se falhar:

- **DNS**: `nslookup patchmon.example.com` ou `dig patchmon.example.com`. Corrija o `/etc/resolv.conf` ou atualize o seu DNS interno.
- **Roteamento / firewall**: `traceroute patchmon.example.com` e confira se a saída TCP/443 é permitida. Firewalls corporativos costumam bloquear a saída para hostnames novos.
- **Proxy**: se o host estiver atrás de um proxy HTTP de saída, defina `HTTPS_PROXY` e `HTTP_PROXY` no ambiente antes de colar o comando de instalação.

#### 2. A validação do certificado falha

Sintomas: `curl: (60) SSL certificate problem` no Linux, ou `Could not establish trust relationship for the SSL/TLS secure channel` no Windows.

- **Correção preferível**: instale a sua CA no repositório de confiança do sistema do host:
  - Debian/Ubuntu: copie a CA para `/usr/local/share/ca-certificates/` e rode `update-ca-certificates`.
  - RHEL/Rocky/Fedora: copie a CA para `/etc/pki/ca-trust/source/anchors/` e rode `update-ca-trust`.
  - Alpine: `apk add ca-certificates`, depois copie e rode `update-ca-certificates`.
  - Windows: importe a CA em **Local Computer → Trusted Root Certification Authorities** pelo `certlm.msc`.
- **Contorno rápido (só em laboratório)**: na interface web do PatchMon, vá a **Settings → Server → Ignore SSL self-signed** e ligue a opção. O servidor passa a entregar os scripts de instalação com `curl -sk` e a colocar `skip_ssl_verify: true` no `config.yml` gerado. No Windows, marque **Self-signed certificate (SSL bypass)** na etapa 3 do assistente antes de copiar o comando.

> Não use `skip_ssl_verify` em produção. Ela desativa por completo a verificação de TLS e expõe o agente a ataques man-in-the-middle. Mais sobre `skip_ssl_verify` na [Referência de configuração do agente](#agent-config-yml-reference).

#### 3. "Erro de CORS" no navegador (só do lado do assistente)

O próprio assistente chama `/api/v1/hosts/install` e `/api/v1/ws/status/{apiId}` a partir do seu navegador. Se qualquer uma falhar com erro de CORS, a variável `CORS_ORIGIN` do seu servidor não bate com a URL pela qual você está acessando o PatchMon.

Correção: defina `CORS_ORIGIN` no `.env` do servidor com a **origem exata** (protocolo + host + porta) que o navegador usa. Por exemplo:

```
CORS_ORIGIN=https://patchmon.example.com
```

Se os usuários chegam ao PatchMon por mais de uma URL (por exemplo, um domínio externo e um endereço na LAN interna), separe os valores por vírgula, sem espaços:

```
CORS_ORIGIN=https://patchmon.example.com,https://patchmon.internal.lan
```

Depois reinicie o contêiner do servidor (`docker compose restart server`). A seção completa sobre CORS está em [Solução de problemas do servidor](#server-troubleshooting).

#### 4. Porta 443 de saída bloqueada

Muitas redes de nuvem e corporativas liberam a porta 80 mas bloqueiam a 443 para hosts arbitrários. Teste com:

```bash
# TCP reachability
nc -vz patchmon.example.com 443
# or
timeout 5 bash -c "</dev/tcp/patchmon.example.com/443" && echo "open" || echo "blocked"
```

Se estiver bloqueada, libere no firewall de saída o TCP/443 para o seu servidor do PatchMon.

#### 5. Token de bootstrap expirado

O token de bootstrap no comando de instalação vale por **5 minutos** e é **de uso único**. Se você copiar o comando, esperar demais e depois rodar, verá:

```
ERROR: Failed to fetch credentials. Bootstrap token may have expired.
Please request a new installation script.
```

Volte à **etapa 4** do assistente e clique em **Copy command** de novo. Isso reaproveita o mesmo registro de host, mas emite um token novo.

#### 6. O instalador para por causa do relógio

Se o relógio do host estiver mais de alguns minutos fora do UTC, os handshakes de TLS falham. No Linux:

```bash
sudo timedatectl set-ntp true
sudo timedatectl set-timezone Europe/London
```

No Windows (PowerShell elevado):

```powershell
w32tm /resync
Set-TimeZone -Name "GMT Standard Time"
```

Depois rode o comando de instalação de novo.

#### 7. Agente instalado, mas o host continua "Pending"

O binário foi instalado e o serviço iniciou, mas o host nunca passa para "Active" na interface. Rode no host de destino:

```bash
sudo patchmon-agent diagnostics
sudo patchmon-agent ping
sudo systemctl status patchmon-agent        # or: rc-service patchmon-agent status
sudo journalctl -u patchmon-agent -n 50     # or: tail -n 50 /etc/patchmon/logs/patchmon-agent.log
```

As verificações detalhadas estão em [Gerenciando o agente do PatchMon: solução de problemas comuns](#common-troubleshooting) e em [Solução de problemas do agente](#agent-troubleshooting).

#### 8. O proxy reverso derruba o WebSocket

Se o estado "Connected" nunca aparece, mas as requisições HTTP funcionam, o seu proxy reverso não está repassando o handshake `Upgrade: websocket`. O agente abre o WebSocket em `/api/v1/agents/ws`. Os trechos de configuração para Nginx / Traefik / Caddy estão em [Solução de problemas do servidor: o agente não consegue se conectar por WebSocket](#server-troubleshooting).

### Rodando o instalador de novo num host já registrado

O instalador do Linux é idempotente. Se você colar o comando de instalação num host já registrado e saudável, ele:

1. Detecta o `config.yml`, o `credentials.yml` e o binário existentes.
2. Roda `patchmon-agent ping`.
3. Sai logo, com `Agent is already configured and ping successful`, sem mexer em nada.

Para forçar uma reinstalação completa:

```bash
sudo rm -f /etc/patchmon/config.yml /etc/patchmon/credentials.yml
# then paste the install command again
```

Ou gere novas credenciais pela interface antes (isso troca a API key, e a próxima execução do instalador pega a nova).

### Próximos passos

- [Gerenciando o agente do PatchMon](#managing-the-patchmon-agent): comandos da CLI, controle do serviço, logs, atualizações, remoção.
- [Referência de configuração do agente (config.yml)](#agent-config-yml-reference): todos os parâmetros de configuração, com os padrões.
- Guia de registro automático de LXC no Proxmox: registro em massa de contêineres pela API de tokens de registro automático.
- [Desinstalando o agente do PatchMon](#uninstalling-the-patchmon-agent): remover o agente de um host.
- [Solução de problemas do agente](#agent-troubleshooting): árvore de decisão rápida para os sintomas comuns.

---

## Capítulo 9: Gerenciando o agente do PatchMon {#managing-the-patchmon-agent}

### Visão geral

O agente do PatchMon é um binário Go compilado (`patchmon-agent`) que roda como serviço permanente nos hosts monitorados. Ele mantém uma conexão WebSocket com o servidor do PatchMon para comunicação em tempo real, envia relatórios periódicos de pacotes e do sistema, coleta dados das integrações (Docker, conformidade) e aceita comandos remotos, como sessões de proxy SSH.

Este guia cobre tudo o que é preciso para gerenciar o agente depois da instalação: comandos da CLI, gerenciamento do serviço, acesso aos logs, solução de problemas, atualizações e remoção.

#### Dados principais: Linux / FreeBSD

| Propriedade | Valor |
|----------|-------|
| **Local do binário** | `/usr/local/bin/patchmon-agent` |
| **Diretório de configuração** | `/etc/patchmon/` |
| **Arquivo de configuração** | `/etc/patchmon/config.yml` |
| **Arquivo de credenciais** | `/etc/patchmon/credentials.yml` |
| **Arquivo de log** | `/etc/patchmon/logs/patchmon-agent.log` |
| **Nome do serviço** | `patchmon-agent` (systemd ou OpenRC) |
| **Roda como** | `root` |
| **Modo principal** | `patchmon-agent serve` (serviço de longa duração) |

#### Dados principais: Windows

| Propriedade | Valor |
|----------|-------|
| **Local do binário** | `C:\Program Files\PatchMon\patchmon-agent.exe` |
| **Diretório de configuração** | `C:\ProgramData\PatchMon\` |
| **Arquivo de configuração** | `C:\ProgramData\PatchMon\config.yml` |
| **Arquivo de credenciais** | `C:\ProgramData\PatchMon\credentials.yml` |
| **Arquivo de log** | `C:\ProgramData\PatchMon\patchmon-agent.log` |
| **Nome do serviço** | `PatchMonAgent` (Windows Service Control Manager) |
| **Roda como** | `LocalSystem` |
| **Modo principal** | `patchmon-agent serve` (serviço de longa duração) |
| **Arquiteturas** | amd64, arm64 (Surface Pro X / Copilot+ PCs). Windows 32 bits não é suportado. |

### Sumário

- [Referência de comandos da CLI](#cli-command-reference)
- [Gerenciamento do serviço](#service-management)
- [Vendo os logs](#viewing-logs)
- [Testes e diagnóstico](#testing-and-diagnostics)
- [Relatório manual](#manual-reporting)
- [Gerenciamento da configuração](#configuration-management)
- [Atualizações do agente](#agent-updates)
- [Remoção do agente](#agent-removal)
- [Solução de problemas comuns](#common-troubleshooting)
- [Arquitetura e plataformas suportadas](#architecture-and-supported-platforms)

### Referência de comandos da CLI {#cli-command-reference}

Todos os comandos precisam de privilégios elevados:

- **Linux / FreeBSD**: rode como `root` ou com `sudo`. O agente se recusa a rodar sem privilégios de root.
- **Windows**: rode num PowerShell ou `cmd` elevado (Executar como administrador). O agente precisa de direitos de Administrator para ler o inventário de pacotes instalados e gerenciar o próprio serviço.

#### Referência rápida

```
patchmon-agent [command] [flags]
```

| Comando | Descrição | Exige root |
|---------|-------------|:---:|
| `serve` | Roda o agente como serviço de longa duração (modo principal) | Sim |
| `report` | Coleta e envia um relatório avulso do sistema e dos pacotes | Sim |
| `report --json` | Mostra o payload do relatório como JSON no stdout (não envia) | Sim |
| `ping` | Testa a conectividade e valida as credenciais da API | Sim |
| `diagnostics` | Mostra um diagnóstico completo do sistema e do agente | Sim |
| `config show` | Mostra a configuração atual e o estado das credenciais | Não |
| `config set-api` | Configura as credenciais da API e a URL do servidor | Sim |
| `check-version` | Verifica se há atualização do agente disponível | Sim |
| `update-agent` | Baixa e instala a versão mais recente do agente | Sim |
| `--version` | Mostra a versão do agente. É uma flag, não um subcomando | Não |

#### Flags globais

Estas flags podem ser usadas com qualquer comando:

| Flag | Padrão | Descrição |
|------|---------|-------------|
| `--config <path>` | `/etc/patchmon/config.yml` | Caminho do arquivo de configuração |
| `--log-level <level>` | `info` | Troca o nível de log (`debug`, `info`, `warn`, `error`) |
| `--version` | | Mostra a versão do agente e sai |
| `--help` | | Mostra a ajuda de qualquer comando |

---

#### `serve`: rodar como serviço

```bash
sudo patchmon-agent serve
```

É o modo principal de operação, o que a unit do serviço systemd/OpenRC executa. Ao iniciar, ele:

1. Carrega a configuração e as credenciais de `/etc/patchmon/`
2. Manda um ping de inicialização ao servidor do PatchMon
3. Abre uma conexão WebSocket persistente (comandos em tempo real)
4. Manda um relatório inicial do sistema em segundo plano
5. Começa os relatórios periódicos no intervalo configurado (padrão: 60 minutos)
6. Sincroniza com o servidor o estado das integrações e o intervalo de atualização
7. Fica escutando os comandos iniciados pelo servidor (relatório agora, atualização, varredura de conformidade etc.)

Normalmente **não** se roda `serve` à mão, porque quem cuida dele é o serviço do sistema. Se precisar testar de forma interativa, pare o serviço antes, para não ter duas instâncias.

**Exemplo: rodando de forma interativa para depurar:**

```bash
# Stop the service first
sudo systemctl stop patchmon-agent

# Run with debug logging to see all output
sudo patchmon-agent serve --log-level debug

# When finished, restart the service
sudo systemctl start patchmon-agent
```

---

#### `report`: enviar um relatório avulso

```bash
sudo patchmon-agent report
```

Coleta as informações do sistema, os pacotes instalados, os dados de repositórios, o hardware, os detalhes de rede e os dados das integrações (contêineres Docker, varreduras de conformidade), e manda tudo ao servidor do PatchMon.

Depois de enviar o relatório, o agente também:
- Verifica se há atualizações do agente e as aplica, se a atualização automática estiver ativa
- Coleta e envia à parte os dados das integrações (Docker, conformidade)

**Saída:**

O comando registra o andamento no arquivo de log configurado. Para ver a saída direto, rode com `--log-level debug` ou olhe o arquivo de log.

##### `report --json`: relatório em JSON

```bash
sudo patchmon-agent report --json
```

Coleta os mesmos dados do sistema e dos pacotes, mas **manda o payload JSON completo para o stdout** em vez de enviá-lo ao servidor. É útil para:

- **Depuração**: ver exatamente o que o agente enviaria
- **Validação**: conferir se a detecção de pacotes está correta
- **Integração**: passar o JSON por pipe para outras ferramentas de análise

**Exemplo: examinar o payload do relatório:**

```bash
sudo patchmon-agent report --json | jq .
```

**Exemplo: ver quantos pacotes precisam de atualização:**

```bash
sudo patchmon-agent report --json | jq '[.packages[] | select(.needsUpdate == true)] | length'
```

**Exemplo: guardar um retrato para comparar depois:**

```bash
sudo patchmon-agent report --json > /tmp/patchmon-report-$(date +%Y%m%d).json
```

> **Observação:** a flag `--json` **não** envia dados ao servidor e **não** exige credenciais de API válidas. Ela só precisa de acesso root para ler as informações de pacotes do sistema.

---

#### `ping`: testar a conectividade

```bash
sudo patchmon-agent ping
```

Testa duas coisas:
1. **Conectividade de rede**: o agente alcança o servidor do PatchMon?
2. **Credenciais da API**: o `api_id` e a `api_key` são válidos?

**Saída em caso de sucesso:**

```
✅ API credentials are valid
✅ Connectivity test successful
```

**Exemplo de saída em caso de falha:**

```
Error: connectivity test failed: server returned 401
```

Use este comando logo depois da instalação ou sempre que suspeitar de problema de credenciais ou de rede.

---

#### `diagnostics`: diagnóstico completo do sistema {#diagnostics--full-system-diagnostics}

```bash
sudo patchmon-agent diagnostics
```

Mostra um relatório de diagnóstico completo, com:

| Seção | Detalhes |
|---------|---------|
| **System Information** | Tipo/versão do sistema, arquitetura, versão do kernel, hostname, machine ID |
| **Agent Information** | Versão do agente, caminhos do arquivo de configuração, do arquivo de credenciais e do arquivo de log, nível de log |
| **Configuration Status** | Se os arquivos de configuração e de credenciais existem (✅/❌) |
| **Network Connectivity** | URL do servidor, teste de alcance TCP, validação das credenciais da API |
| **Recent Logs** | As 10 últimas entradas do arquivo de log do agente |

**Exemplo de saída:**

```
PatchMon Agent Diagnostics v1.5.0

System Information:
  OS: ubuntu 22.04
  Architecture: amd64
  Kernel: 5.15.0-91-generic
  Hostname: webserver-01
  Machine ID: a1b2c3d4e5f6...

Agent Information:
  Version: 1.5.0
  Config File: /etc/patchmon/config.yml
  Credentials File: /etc/patchmon/credentials.yml
  Log File: /etc/patchmon/logs/patchmon-agent.log
  Log Level: info

Configuration Status:
  ✅ Config file exists
  ✅ Credentials file exists

Network Connectivity & API Credentials:
  Server URL: https://patchmon.example.com
  ✅ Server is reachable
  ✅ API is reachable and credentials are valid

Last 10 log entries:
  2026-02-12T10:30:00 level=info msg="Report sent successfully"
  ...
```

É o melhor comando único para investigar problemas no agente.

---

#### `config show`: ver a configuração atual

```bash
sudo patchmon-agent config show
```

Mostra os valores de configuração atuais e o estado das credenciais:

```
Configuration:
  Server: https://patchmon.example.com
  Agent Version: 1.5.0
  Config File: /etc/patchmon/config.yml
  Credentials File: /etc/patchmon/credentials.yml
  Log File: /etc/patchmon/logs/patchmon-agent.log
  Log Level: info

Credentials:
  API ID: patchmon_a1b2c3d4
  API Key: Set ✅
```

> **Segurança:** a API key nunca é exibida. A saída só confirma se ela está definida.

---

#### `config set-api`: configurar as credenciais {#config-set-api--configure-credentials}

```bash
sudo patchmon-agent config set-api <API_ID> <API_KEY> <SERVER_URL>
```

Configura as credenciais da API e a URL do servidor no agente. O comando:

1. Valida as entradas (não vazias, URL em formato válido)
2. Grava a URL do servidor em `/etc/patchmon/config.yml`
3. Grava as credenciais em `/etc/patchmon/credentials.yml` (com permissão `600`)
4. Roda automaticamente um teste de conectividade (`ping`)

**Exemplo:**

```bash
sudo patchmon-agent config set-api \
  patchmon_a1b2c3d4 \
  abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890 \
  https://patchmon.example.com
```

> **Observação:** este comando serve principalmente para instalações manuais ou troca de credenciais. O script de instalação padrão define as credenciais sozinho.

---

#### `check-version`: verificar atualizações

```bash
sudo patchmon-agent check-version
```

Pergunta ao servidor do PatchMon se há uma versão mais nova do agente.

**Saída quando está atualizado:**

```
Agent is up to date (version 1.5.0)
```

**Saída quando há atualização:**

```
Agent update available!
  Current version: 1.4.0
  Latest version: 1.5.0

To update, run: patchmon-agent update-agent
```

**Saída quando a atualização automática está desativada no servidor:**

```
Current version: 1.4.0
Latest version: 1.5.0
Status: Auto-update disabled by server administrator

To update manually, run: patchmon-agent update-agent
```

---

#### `update-agent`: atualizar para a versão mais recente

```bash
sudo patchmon-agent update-agent
```

Baixa do servidor do PatchMon o binário mais recente do agente e atualiza no lugar. O processo:

1. Verifica se houve atualização recente (evita laços de atualização em menos de 5 minutos)
2. Pergunta ao servidor qual é a versão mais recente
3. Baixa o novo binário
4. **Verifica a integridade do binário** comparando o hash SHA-256 (obrigatório)
5. Faz um backup com data e hora do binário atual (por exemplo, `patchmon-agent.backup.20260212_143000`)
6. Grava o novo binário num arquivo temporário e o valida
7. Troca o binário atual de forma atômica
8. Limpa os backups antigos (mantém os 3 últimos)
9. Reinicia o serviço (systemd ou OpenRC) por meio de um script auxiliar

**Recursos de segurança:**
- A verificação do hash do binário é **obrigatória**: o agente se recusa a atualizar se o servidor não fornecer um hash
- Um hash divergente (possível adulteração) bloqueia a atualização
- `skip_ssl_verify` é bloqueado para download de binários em ambientes de produção
- Os arquivos de backup usam permissão `0700` (só o dono)

> **Observação:** na operação normal, o agente se atualiza sozinho quando o servidor sinaliza uma versão nova. Só é preciso rodar `update-agent` manualmente quando a atualização automática está desativada ou quando você quer forçar uma atualização imediata.

##### Windows: agentes presos na 2.0.2

No Windows, o `patchmon-agent.exe` em execução fica travado pelo Service Control Manager e não pode ser sobrescrito no lugar. Os agentes 2.1.0 ou posteriores resolvem isso delegando a troca e o reinício do serviço a um auxiliar separado, e a autoatualização funciona normalmente.

Os agentes 2.0.2 ou anteriores não têm esse auxiliar. Como quem faz a atualização é o próprio binário antigo, ele não consegue se atualizar e continua falhando com:

```
Error: failed to replace executable (permission denied): rename
C:\Program Files\PatchMon\patchmon-agent.exe.new ->
C:\Program Files\PatchMon\patchmon-agent.exe: Access is denied.
```

Atualizar o servidor para uma versão mais nova não resolve, porque a correção está no binário do agente, que não consegue ser instalado. Troque o binário à mão uma vez e a autoatualização passa a funcionar dali em diante:

```powershell
# 1. Stop the service
Stop-Service PatchMonAgent

# 2. Replace C:\Program Files\PatchMon\patchmon-agent.exe with the current
#    Windows agent (amd64 or arm64 to match the host), keeping the same filename

# 3. Start the service
Start-Service PatchMonAgent

# 4. Confirm the new version
& 'C:\Program Files\PatchMon\patchmon-agent.exe' --version
```

A configuração e as credenciais ficam em `C:\ProgramData\PatchMon\`, e não junto do binário, então o host mantém a identidade e não precisa ser registrado de novo.

---

#### `--version`: mostrar a versão

```bash
patchmon-agent --version
```

Mostra a versão do agente:

```
patchmon-agent version 2.0.2
```

Não existe subcomando `version`. `patchmon-agent version` retorna `Error: unknown command "version"`.

Este comando não exige acesso root.

### Gerenciamento do serviço {#service-management}

O agente do PatchMon roda como serviço do sistema gerenciado pelo **systemd** (na maioria das distribuições Linux) ou pelo **OpenRC** (Alpine Linux). Em ambientes sem nenhum dos dois, é usado o **crontab** como alternativa.

#### Systemd (Ubuntu, Debian, CentOS, RHEL, Rocky, Alma, Fedora etc.)

##### Local do arquivo de serviço

```
/etc/systemd/system/patchmon-agent.service
```

##### Conteúdo do arquivo de serviço

O instalador cria este arquivo de unit automaticamente:

```ini
[Unit]
Description=PatchMon Agent Service
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/patchmon-agent serve
Restart=always
RestartSec=10
WorkingDirectory=/etc/patchmon

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=patchmon-agent

[Install]
WantedBy=multi-user.target
```

**Propriedades principais:**
- `Restart=always`: o serviço reinicia sozinho se travar ou for morto
- `RestartSec=10`: espera 10 segundos antes de reiniciar (evita laços de reinício rápido)
- `After=network.target`: garante que a rede esteja no ar antes de iniciar
- Os logs vão para o **journal do systemd** e também para o arquivo de log do próprio agente

##### Comandos comuns do systemd

```bash
# Check if the agent is running
sudo systemctl status patchmon-agent

# Start the agent
sudo systemctl start patchmon-agent

# Stop the agent
sudo systemctl stop patchmon-agent

# Restart the agent (e.g., after config changes)
sudo systemctl restart patchmon-agent

# Enable auto-start on boot
sudo systemctl enable patchmon-agent

# Disable auto-start on boot
sudo systemctl disable patchmon-agent

# Check if enabled
sudo systemctl is-enabled patchmon-agent

# Check if active
sudo systemctl is-active patchmon-agent

# Reload systemd after editing the service file manually
sudo systemctl daemon-reload
```

##### Lendo os logs do journal do systemd

```bash
# Follow logs in real-time (like tail -f)
sudo journalctl -u patchmon-agent -f

# Show last 50 log entries
sudo journalctl -u patchmon-agent -n 50

# Show logs since last boot
sudo journalctl -u patchmon-agent -b

# Show logs from the last hour
sudo journalctl -u patchmon-agent --since "1 hour ago"

# Show logs from a specific date
sudo journalctl -u patchmon-agent --since "2026-02-12 10:00:00"

# Show only errors
sudo journalctl -u patchmon-agent -p err

# Show logs without pager (useful for scripts)
sudo journalctl -u patchmon-agent --no-pager -n 100

# Export logs to a file
sudo journalctl -u patchmon-agent --no-pager > /tmp/patchmon-logs.txt
```

---

#### OpenRC (Alpine Linux)

##### Local do arquivo de serviço

```
/etc/init.d/patchmon-agent
```

##### Conteúdo do arquivo de serviço

```sh
#!/sbin/openrc-run

name="patchmon-agent"
description="PatchMon Agent Service"
command="/usr/local/bin/patchmon-agent"
command_args="serve"
command_user="root"
pidfile="/var/run/patchmon-agent.pid"
command_background="yes"
working_dir="/etc/patchmon"

depend() {
    need net
    after net
}
```

##### Comandos comuns do OpenRC

```bash
# Check if the agent is running
sudo rc-service patchmon-agent status

# Start the agent
sudo rc-service patchmon-agent start

# Stop the agent
sudo rc-service patchmon-agent stop

# Restart the agent
sudo rc-service patchmon-agent restart

# Add to default runlevel (auto-start on boot)
sudo rc-update add patchmon-agent default

# Remove from default runlevel
sudo rc-update del patchmon-agent default

# List services in default runlevel
sudo rc-update show default
```

##### Lendo os logs no Alpine/OpenRC

O OpenRC não tem journal. Os logs são gravados só no arquivo de log do agente:

```bash
# Follow logs in real-time
sudo tail -f /etc/patchmon/logs/patchmon-agent.log

# Show last 50 lines
sudo tail -n 50 /etc/patchmon/logs/patchmon-agent.log

# Search logs for errors
sudo grep -i "error\|fail" /etc/patchmon/logs/patchmon-agent.log
```

---

#### Alternativa com crontab (sem sistema de init)

Em contêineres mínimos ou em ambientes sem systemd nem OpenRC, o instalador cria uma entrada no crontab:

```cron
@reboot /usr/local/bin/patchmon-agent serve >/dev/null 2>&1
```

O agente também é iniciado na hora, em segundo plano, durante a instalação.

##### Gerenciando a alternativa com crontab

```bash
# Check for PatchMon crontab entries
crontab -l | grep patchmon

# Stop the agent manually
sudo pkill -f 'patchmon-agent serve'

# Start the agent manually
sudo /usr/local/bin/patchmon-agent serve &

# Restart the agent
sudo pkill -f 'patchmon-agent serve' && sudo /usr/local/bin/patchmon-agent serve &
```

---

#### Gerenciador de serviços do Windows

No Windows, o agente roda como serviço nativo, gerenciado pelo Service Control Manager (SCM). O instalador o registra como `PatchMonAgent`, com `StartupType=Automatic`, para iniciar junto com o sistema.

##### Local do arquivo de serviço

O Windows não tem arquivo de serviço equivalente ao do systemd. O serviço fica no registro do SCM. Metadados do serviço:

| Propriedade | Valor |
|---|---|
| Nome do serviço | `PatchMonAgent` |
| Nome de exibição | PatchMon Agent |
| Caminho do binário | `"C:\Program Files\PatchMon\patchmon-agent.exe" serve` |
| Tipo de inicialização | Automatic |
| Conta | `LocalSystem` (padrão) |
| Diretório de configuração | `C:\ProgramData\PatchMon\` |
| Arquivo de configuração | `C:\ProgramData\PatchMon\config.yml` |
| Arquivo de credenciais | `C:\ProgramData\PatchMon\credentials.yml` |
| Arquivo de log | `C:\ProgramData\PatchMon\patchmon-agent.log` |

O binário fica em `C:\Program Files\PatchMon\` e é acrescentado ao `PATH` do sistema, então `patchmon-agent` funciona em qualquer PowerShell ou `cmd` elevado, sem o caminho completo.

##### Comandos comuns (rode num PowerShell elevado)

```powershell
# Service status
Get-Service -Name PatchMonAgent

# Start / stop / restart
Start-Service   -Name PatchMonAgent
Stop-Service    -Name PatchMonAgent -Force
Restart-Service -Name PatchMonAgent

# Disable auto-start (still able to start manually)
Set-Service -Name PatchMonAgent -StartupType Manual

# Re-enable auto-start
Set-Service -Name PatchMonAgent -StartupType Automatic

# Tail the log file
Get-Content 'C:\ProgramData\PatchMon\patchmon-agent.log' -Tail 50 -Wait

# Service events (Event Viewer)
Get-WinEvent -LogName System -MaxEvents 20 |
  Where-Object { $_.ProviderName -eq 'Service Control Manager' -and $_.Message -like '*PatchMonAgent*' }
```

A CLI do próprio agente também está disponível em qualquer prompt elevado (já que o caminho de instalação está no `PATH`):

```powershell
# Test connectivity
patchmon-agent ping

# Force a one-off report
patchmon-agent report

# Print detailed diagnostics
patchmon-agent diagnostics

# Show current config
patchmon-agent config show
```

##### Solução de problemas no Windows

- **O serviço não inicia.** Veja as últimas entradas do log de aplicação: `Get-WinEvent -LogName Application -MaxEvents 20 | Where-Object ProviderName -like '*PatchMon*'`. Causas comuns: falta do `credentials.yml`, um `skip_ssl_verify` que ficou para trás depois de uma troca de certificado no servidor, firewall bloqueando a saída 443/WSS.
- **Dispositivo ARM64 aparecendo como x64 no `Get-ComputerInfo`.** Se você rodou um instalador antigo (anterior à 2.0.0), o binário amd64 pode estar instalado e rodando em emulação x64. Rode de novo o script de instalação mais recente; ele detecta `PROCESSOR_ARCHITEW6432=ARM64` e troca pelo `patchmon-agent-windows-arm64.exe` nativo.
- **SmartScreen / Defender bloqueando o `.exe`.** Até a v2.0.0, o binário não é assinado, então a proteção em tempo real pode colocá-lo em quarentena ou mantê-lo aberto enquanto verifica. Use `Unblock-File 'C:\Program Files\PatchMon\patchmon-agent.exe'` ou autorize-o em Segurança do Windows → Proteção contra vírus e ameaças → Ameaças permitidas. A assinatura de código está prevista para uma versão futura.
- **A instalação falha com `Program 'patchmon-agent.exe' failed to run: Access is denied`.** Mesma causa do item anterior, só que durante a instalação, e não depois. Desde a v2.1.1, o próprio instalador limpa a marca de download, espera até 10 segundos para o antivírus liberar o binário recém-gravado e, se ainda assim falhar, mostra os passos de recuperação em vez de uma pilha de erro crua do PowerShell. Se continuar falhando, siga-os nesta ordem:

  ```powershell
  # 1. Was it quarantined?
  Get-MpThreat | Select-Object -Last 5

  # 2. Clear the download marker
  Unblock-File 'C:\Program Files\PatchMon\patchmon-agent.exe'

  # 3. Still blocked? Exclude the install directory, then re-run the installer
  Add-MpPreference -ExclusionPath 'C:\Program Files\PatchMon'
  ```

  Rodar o script de instalação de novo é seguro. Numa máquina gerenciada por AppLocker ou WDAC, um binário não assinado em `C:\Program Files\PatchMon` pode estar bloqueado por política, e nenhuma exclusão resolve isso; confira com `Get-AppLockerPolicy -Effective -Xml`.
- **Erros de TLS com o servidor do PatchMon.** O Windows 10 anterior à 1903 usa por padrão TLS 1.0/1.1; o instalador ativa explicitamente o TLS 1.2 na sessão. Em hosts mais antigos, atualize o .NET Framework ou defina as chaves de registro documentadas pela Microsoft no artigo da KB sobre `SchUseStrongCrypto`.

### Vendo os logs {#viewing-logs}

O agente grava logs em dois lugares, conforme o gerenciador de serviços:

| Gerenciador de serviços | Journal / Event Log | Arquivo de log |
|-----------------|:-------------------:|:--------:|
| **systemd** | ✅ `journalctl -u patchmon-agent` | ✅ `/etc/patchmon/logs/patchmon-agent.log` |
| **OpenRC** | ❌ | ✅ `/etc/patchmon/logs/patchmon-agent.log` |
| **Crontab** | ❌ | ✅ `/etc/patchmon/logs/patchmon-agent.log` |
| **Windows SCM** | ✅ Event Viewer (log Application, origem `PatchMonAgent`) para eventos do ciclo de vida do serviço | ✅ `C:\ProgramData\PatchMon\patchmon-agent.log` |

#### Detalhes do arquivo de log: Linux / FreeBSD

| Propriedade | Valor |
|----------|-------|
| **Local** | `/etc/patchmon/logs/patchmon-agent.log` |
| **Tamanho máximo** | 10 MB por arquivo |
| **Máximo de backups** | 5 arquivos rotacionados |
| **Idade máxima** | 14 dias |
| **Compressão** | Sim (logs antigos são comprimidos automaticamente) |
| **Rotação** | Automática (feita pelo agente, não pelo logrotate) |

#### Detalhes do arquivo de log: Windows

| Propriedade | Valor |
|----------|-------|
| **Local** | `C:\ProgramData\PatchMon\patchmon-agent.log` |
| **Tamanho máximo** | 10 MB por arquivo |
| **Máximo de backups** | 5 arquivos rotacionados |
| **Idade máxima** | 14 dias |
| **Compressão** | Sim (logs antigos são comprimidos automaticamente) |
| **Rotação** | Automática (feita pelo agente) |
| **Acompanhar ao vivo** | `Get-Content 'C:\ProgramData\PatchMon\patchmon-agent.log' -Tail 50 -Wait` |

O agente usa a biblioteca [lumberjack](https://github.com/natefinsh/lumberjack.v2) para a rotação de logs embutida. Não é preciso configurar o logrotate à parte.

#### Níveis de log

Defina o nível de log em `/etc/patchmon/config.yml` ou pela flag `--log-level`:

| Nível | Descrição | Uso |
|-------|-------------|----------|
| `debug` | Verboso: cada operação, corpos de requisição/resposta, detalhes de pacotes | Investigação ativa |
| `info` | Normal: eventos principais, resumos de relatório, estado da conectividade | Padrão / produção |
| `warn` | Avisos: falhas não críticas, novas tentativas, operação degradada | Menos ruído |
| `error` | Só erros: falhas críticas que precisam de atenção | Log mínimo |

**Mudar o nível de log temporariamente (até reiniciar o serviço):**

```bash
sudo patchmon-agent report --log-level debug
```

**Mudar o nível de log de forma permanente:**

Edite `/etc/patchmon/config.yml`:

```yaml
log_level: "debug"
```

Depois reinicie o serviço:

```bash
sudo systemctl restart patchmon-agent
# or
sudo rc-service patchmon-agent restart
```

No Windows, edite `C:\ProgramData\PatchMon\config.yml` e reinicie o serviço num PowerShell elevado:

```powershell
Restart-Service -Name PatchMonAgent
```

#### Formato do log

Os logs usam texto estruturado com horário:

```
2026-02-12T10:30:00 level=info msg="Detecting operating system..."
2026-02-12T10:30:00 level=info msg="Detected OS" osType=ubuntu osVersion=22.04
2026-02-12T10:30:01 level=info msg="Found packages" count=247
2026-02-12T10:30:02 level=info msg="Sending report to PatchMon server..."
2026-02-12T10:30:03 level=info msg="Report sent successfully"
2026-02-12T10:30:03 level=info msg="Processed packages" count=247
2026-02-12T10:30:08 level=info msg="Agent is up to date" version=1.5.0
```

### Testes e diagnóstico {#testing-and-diagnostics}

#### Verificação rápida de saúde

Rode estes comandos, nesta ordem, para confirmar que o agente funciona corretamente:

```bash
# 1. Is the service running?
sudo systemctl status patchmon-agent     # systemd
# or
sudo rc-service patchmon-agent status    # OpenRC

# 2. Can the agent reach the server?
sudo patchmon-agent ping

# 3. Full diagnostics
sudo patchmon-agent diagnostics

# 4. What data would the agent send?
sudo patchmon-agent report --json | jq '.hostname, .os_type, .os_version, .packages | length'
```

#### Investigando um problema {#debugging-a-problem}

Se o agente não está reportando dados ou aparece offline:

```bash
# Step 1: Check service status
sudo systemctl status patchmon-agent

# Step 2: Check recent logs for errors
sudo journalctl -u patchmon-agent -n 30 --no-pager
# or
sudo tail -n 30 /etc/patchmon/logs/patchmon-agent.log

# Step 3: Run diagnostics for full picture
sudo patchmon-agent diagnostics

# Step 4: Test connectivity explicitly
sudo patchmon-agent ping

# Step 5: If needed, restart with debug logging temporarily
sudo systemctl stop patchmon-agent
sudo patchmon-agent serve --log-level debug
# (Ctrl+C to stop, then restart the service normally)
sudo systemctl start patchmon-agent
```

### Relatório manual {#manual-reporting}

O agente envia relatórios sozinho no intervalo configurado, mas dá para disparar um a qualquer momento:

```bash
# Send a report immediately
sudo patchmon-agent report
```

Isso é útil depois de:
- Fazer mudanças no sistema (instalar ou remover pacotes)
- Conferir se o agente consegue se comunicar depois de uma mudança de rede
- Testar depois de reconfigurar o agente

O comando `report` também dispara a coleta de dados das integrações (Docker, conformidade) e verifica atualizações do agente, igual a um relatório agendado.

#### Examinando os dados do relatório

Para ver exatamente o que o agente coleta, sem enviar nada:

```bash
# Full JSON output
sudo patchmon-agent report --json

# Pretty-print with jq
sudo patchmon-agent report --json | jq .

# Just the package count and update summary
sudo patchmon-agent report --json | jq '{
  total_packages: (.packages | length),
  needs_update: [.packages[] | select(.needsUpdate)] | length,
  security_updates: [.packages[] | select(.isSecurityUpdate)] | length,
  hostname: .hostname,
  os: "\(.osType) \(.osVersion)"
}'
```

### Gerenciamento da configuração {#configuration-management}

A documentação completa de todos os parâmetros de configuração está na [Referência de configuração do agente (config.yml)](#agent-config-yml-reference).

#### Tarefas rápidas de configuração

**Ver a configuração atual:**

```bash
sudo patchmon-agent config show
```

**Definir ou trocar as credenciais da API:**

```bash
sudo patchmon-agent config set-api <API_ID> <API_KEY> <SERVER_URL>
```

**Editar o arquivo de configuração diretamente:**

```bash
sudo nano /etc/patchmon/config.yml
sudo systemctl restart patchmon-agent  # restart to apply changes
```

**Quando as mudanças exigem reinício?**

| Mudança | Precisa reiniciar? |
|--------|:---:|
| `patchmon_server` | Sim |
| `log_level` | Sim |
| `skip_ssl_verify` | Sim |
| `update_interval` | Não (sincronizado pelo servidor via WebSocket) |
| `integrations.docker` | Não (sincronizado pelo servidor) |
| `integrations.compliance` | Não (sincronizado pelo servidor) |
| `integrations.ssh-proxy-enabled` | Sim (só configuração manual) |
| Credenciais (`api_id` / `api_key`) | Sim |

### Atualizações do agente {#agent-updates}

#### Como a atualização automática funciona

O agente procura atualizações de dois jeitos:

1. **Depois de cada relatório**: o agente pergunta ao servidor qual é a versão mais recente e se atualiza sozinho, se houver uma nova
2. **Por iniciativa do servidor**: o servidor pode mandar um comando `update_agent` pelo WebSocket

Quando uma atualização é detectada:
1. O novo binário é baixado do servidor do PatchMon
2. O hash SHA-256 é verificado contra o hash informado pelo servidor (obrigatório)
3. É feito backup do binário atual (os 3 últimos backups são mantidos)
4. O novo binário substitui o antigo de forma atômica
5. O serviço é reiniciado por meio de um script auxiliar

#### Atualização manual

**Linux / FreeBSD:**

```bash
# Check what version is available
sudo patchmon-agent check-version

# Apply the update
sudo patchmon-agent update-agent
```

**Windows (PowerShell elevado):**

```powershell
patchmon-agent check-version
patchmon-agent update-agent
```

No Windows, o fluxo do `update-agent` para o serviço `PatchMonAgent`, troca de forma atômica o `C:\Program Files\PatchMon\patchmon-agent.exe` pelo novo binário verificado (mantendo ao lado os 3 últimos arquivos `.backup.*` com data e hora) e reinicia o serviço.

#### Recursos de segurança da atualização

- **Verificação de hash**: recusa instalar se o hash do binário não bater
- **Prevenção de laço de atualização**: bloqueia novas atualizações por 5 minutos depois de uma atualização
- **Backup automático**: cria um backup com data e hora antes de trocar o binário
- **Reversão**: se o novo binário falhar na validação, a atualização é abortada
- **Verificação de versão**: confere se o binário baixado informa a versão esperada

#### Arquivos de backup

Os backups da atualização ficam junto do binário.

**Linux / FreeBSD:**

```
/usr/local/bin/patchmon-agent                         # current binary
/usr/local/bin/patchmon-agent.backup.20260212_143000  # backup from update
/usr/local/bin/patchmon-agent.backup.20260210_090000  # older backup
/usr/local/bin/patchmon-agent.backup.20260201_120000  # oldest backup (3 kept)
```

**Windows:**

```
C:\Program Files\PatchMon\patchmon-agent.exe                         # current binary
C:\Program Files\PatchMon\patchmon-agent.exe.backup.20260212_143000  # backup from update
C:\Program Files\PatchMon\patchmon-agent.exe.backup.20260210_090000  # older backup
C:\Program Files\PatchMon\patchmon-agent.exe.backup.20260201_120000  # oldest backup (3 kept)
```

O agente remove sozinho os backups além dos 3 mais recentes.

### Remoção do agente {#agent-removal}

Há dois métodos para remover o agente do PatchMon de um host.

#### Método 1: script de remoção fornecido pelo servidor (recomendado)

**Linux / FreeBSD:**

```bash
curl -s https://patchmon.example.com/api/v1/hosts/remove | sudo sh
```

**Windows (rode num PowerShell elevado):**

```powershell
$ProgressPreference = 'SilentlyContinue'
Invoke-WebRequest https://patchmon.example.com/api/v1/hosts/remove?os=windows -UseBasicParsing -OutFile "$env:TEMP\patchmon-remove.ps1"
powershell.exe -ExecutionPolicy Bypass -File "$env:TEMP\patchmon-remove.ps1"
```

O `-OutFile` grava o script em disco byte a byte. Passar a resposta por pipe para o `iex` faz o Windows PowerShell 5.1 decodificá-la antes como texto, o que é uma fonte comum de erros de parsing.

O script do Linux/FreeBSD cuida de tudo:
- Para o serviço (systemd, OpenRC ou crontab)
- Remove o arquivo de serviço e recarrega o daemon
- Mata qualquer processo do agente que tenha sobrado
- Remove o binário do agente e os scripts antigos
- Remove os arquivos e diretórios de configuração (`/etc/patchmon/`)
- Remove os arquivos de log
- Limpa as entradas do crontab

O script do Windows faz o equivalente no Windows:
- Para o serviço `PatchMonAgent`
- Mata qualquer processo `patchmon-agent.exe` que tenha sobrado
- Exclui o serviço com `sc.exe delete PatchMonAgent`
- Remove `C:\Program Files\PatchMon\` e `C:\ProgramData\PatchMon\`
- Tira o caminho de instalação do `PATH` do sistema

**Opções:**

| Variável de ambiente | Padrão | Descrição |
|---------------------|---------|-------------|
| `REMOVE_BACKUPS` | `0` | Defina `1` para remover também os arquivos de backup |
| `SILENT` | não definida | Defina `1` para o modo silencioso (saída mínima) |

**Exemplos:**

```bash
# Standard removal (preserves backups)
curl -s https://patchmon.example.com/api/v1/hosts/remove | sudo sh

# Remove everything including backups
curl -s https://patchmon.example.com/api/v1/hosts/remove | sudo REMOVE_BACKUPS=1 sh

# Silent removal (for automation)
curl -s https://patchmon.example.com/api/v1/hosts/remove | sudo SILENT=1 sh

# Silent removal with backup cleanup
curl -s https://patchmon.example.com/api/v1/hosts/remove | sudo REMOVE_BACKUPS=1 SILENT=1 sh
```

#### Método 2: remoção manual

Se o servidor estiver inalcançável, dá para remover o agente manualmente.

**Linux / FreeBSD:**

```bash
# 1. Stop and disable the service
sudo systemctl stop patchmon-agent
sudo systemctl disable patchmon-agent
sudo rm -f /etc/systemd/system/patchmon-agent.service
sudo systemctl daemon-reload
# or for OpenRC:
sudo rc-service patchmon-agent stop
sudo rc-update del patchmon-agent default
sudo rm -f /etc/init.d/patchmon-agent

# 2. Kill any remaining processes
sudo pkill -f patchmon-agent

# 3. Remove the binary and backups
sudo rm -f /usr/local/bin/patchmon-agent
sudo rm -f /usr/local/bin/patchmon-agent.backup.*

# 4. Remove configuration and logs
sudo rm -rf /etc/patchmon/

# 5. Remove crontab entries (if any)
crontab -l 2>/dev/null | grep -v "patchmon-agent" | crontab -

# 6. Verify removal
which patchmon-agent          # should return nothing
ls /etc/patchmon/ 2>/dev/null # should show "No such file or directory"
systemctl status patchmon-agent 2>&1 | head -1  # should show "not found"
```

**Windows (PowerShell elevado):**

```powershell
# 1. Stop and delete the service
Stop-Service  -Name PatchMonAgent -Force -ErrorAction SilentlyContinue
sc.exe delete PatchMonAgent

# 2. Kill any remaining processes
Get-Process -Name patchmon-agent -ErrorAction SilentlyContinue | Stop-Process -Force

# 3. Remove the binary and data directories
Remove-Item -Recurse -Force 'C:\Program Files\PatchMon'
Remove-Item -Recurse -Force 'C:\ProgramData\PatchMon'

# 4. Remove the install path from the system PATH
$installPath = 'C:\Program Files\PatchMon'
$currentPath = [Environment]::GetEnvironmentVariable('Path', [EnvironmentVariableTarget]::Machine)
$newPath = ($currentPath -split ';' | Where-Object { $_ -and $_ -ne $installPath }) -join ';'
[Environment]::SetEnvironmentVariable('Path', $newPath, [EnvironmentVariableTarget]::Machine)

# 5. Verify
Get-Service -Name PatchMonAgent -ErrorAction SilentlyContinue   # should return nothing
Test-Path 'C:\Program Files\PatchMon'                           # should be False
```

> **Importante:** remover o agente do host **não** remove o registro do host no PatchMon. Para desativar um host por completo, exclua-o também na interface web do PatchMon (página Hosts).

### Solução de problemas comuns {#common-troubleshooting}

#### O agente aparece como "Pending" no PatchMon {#agent-shows-pending-in-patchmon}

O host foi criado, mas o agente ainda não mandou o primeiro relatório.

```bash
# Check service is running
sudo systemctl status patchmon-agent

# Test connectivity
sudo patchmon-agent ping

# If ping fails, check the server URL
sudo patchmon-agent config show

# Force an immediate report
sudo patchmon-agent report
```

#### O indicador WS do agente está vermelho no PatchMon {#agents-ws-pill-is-red-in-patchmon}

A conexão WebSocket do agente caiu e está desconectada há mais tempo que o limite de `host_down` (padrão de 30 segundos). Atenção: esse indicador sozinho **não** significa que o host está offline; olhe também o indicador **Reporting**. Se Reporting estiver verde, o host está vivo e mandando relatórios, mas o canal de controle em tempo real está indisponível.

```bash
# Check if the service is running
sudo systemctl is-active patchmon-agent

# If not running, check why it stopped
sudo journalctl -u patchmon-agent -n 50 --no-pager

# Restart the service
sudo systemctl restart patchmon-agent
```

#### Erros "Permission Denied" {#permission-denied-errors}

```bash
# All agent commands require root
sudo patchmon-agent <command>

# Verify file permissions
ls -la /etc/patchmon/config.yml        # should be -rw------- root
ls -la /etc/patchmon/credentials.yml   # should be -rw------- root
ls -la /usr/local/bin/patchmon-agent   # should be -rwxr-xr-x root
```

#### "Credentials File Not Found" {#credentials-file-not-found}

```bash
# Check if credentials exist
ls -la /etc/patchmon/credentials.yml

# If missing, reconfigure
sudo patchmon-agent config set-api <API_ID> <API_KEY> <SERVER_URL>
```

#### "Connectivity Test Failed" {#connectivity-test-failed}

```bash
# Run full diagnostics
sudo patchmon-agent diagnostics

# Test network connectivity manually
curl -I https://patchmon.example.com

# Check DNS resolution
nslookup patchmon.example.com
# or
dig patchmon.example.com

# Check firewall rules
sudo iptables -L -n | grep -i drop
```

#### Erros de certificado SSL {#ssl-certificate-errors}

```bash
# For self-signed certificates in non-production environments:
# Edit /etc/patchmon/config.yml
skip_ssl_verify: true

# Then restart
sudo systemctl restart patchmon-agent
```

> **Atenção:** `skip_ssl_verify: true` desativa por completo a verificação do certificado TLS e expõe o agente a ataques man-in-the-middle. Use só em laboratório ou em implantações isoladas (air-gapped). Para certificados autoassinados ou de CA interna, a correção preferível é instalar a CA no repositório de confiança do sistema do host (por exemplo, `/usr/local/share/ca-certificates/` + `update-ca-certificates` no Debian/Ubuntu, `/etc/pki/ca-trust/source/anchors/` + `update-ca-trust` no RHEL/Fedora), em vez de desativar a verificação. Também dá para definir `PATCHMON_SKIP_SSL_VERIFY=true` como variável de ambiente, em vez de editar o `config.yml`.

#### O serviço fica reiniciando {#service-keeps-restarting}

Procure laços de travamento:

```bash
# See restart count and recent failures
sudo systemctl status patchmon-agent

# Check logs around restart times
sudo journalctl -u patchmon-agent --since "30 minutes ago" --no-pager

# Common causes:
# - Invalid config.yml (syntax error)
# - Invalid credentials
# - Server unreachable (agent retries but logs errors)
```

#### O agente não se atualiza sozinho {#agent-not-auto-updating}

```bash
# Check current version
patchmon-agent --version

# Check if update is available
sudo patchmon-agent check-version

# Check if auto-update was recently performed
ls -la /etc/patchmon/.last_update_timestamp

# Try manual update
sudo patchmon-agent update-agent

# Check for update loop prevention (5-minute cooldown)
# If you see "update was performed X ago", wait 5 minutes
```

### Arquitetura e plataformas suportadas {#architecture-and-supported-platforms}

#### Arquiteturas suportadas: Linux

| Arquitetura | Nome do binário | Dispositivos comuns |
|-------------|-------------|----------------|
| `amd64` | `patchmon-agent-linux-amd64` | Servidores comuns, VMs, a maioria das instâncias de nuvem |
| `arm64` | `patchmon-agent-linux-arm64` | Servidores ARM, Raspberry Pi 4+, AWS Graviton |
| `arm` (v6/v7) | `patchmon-agent-linux-arm` | Raspberry Pi 2/3, placas ARM mais antigas |
| `386` | `patchmon-agent-linux-386` | Sistemas x86 de 32 bits (legado) |

#### Arquiteturas suportadas: FreeBSD

| Arquitetura | Nome do binário | Dispositivos comuns |
|-------------|-------------|----------------|
| `amd64` | `patchmon-agent-freebsd-amd64` | Servidores e jails FreeBSD comuns |
| `arm64` | `patchmon-agent-freebsd-arm64` | Servidores FreeBSD ARM |
| `arm` (v6/v7) | `patchmon-agent-freebsd-arm` | Placas FreeBSD ARM mais antigas |
| `386` | `patchmon-agent-freebsd-386` | FreeBSD x86 de 32 bits (legado) |

#### Arquiteturas suportadas: Windows

| Arquitetura | Nome do binário | Dispositivos comuns |
|-------------|-------------|----------------|
| `amd64` | `patchmon-agent-windows-amd64.exe` | PCs e servidores Windows comuns (Intel/AMD 64 bits) |
| `arm64` | `patchmon-agent-windows-arm64.exe` | Surface Pro X, Surface Pro 9/11 com Snapdragon, Surface Laptop 7, Windows Dev Kit 2023, Copilot+ PCs (Snapdragon X Elite/Plus: Lenovo, Dell, HP, Samsung etc.) |

Windows 32 bits (x86) não é suportado. Todas as versões do Windows com suporte da Microsoft em 2026 são só de 64 bits. O Windows 10 32 bits chegou ao fim do suporte em 14 de outubro de 2025, e o Windows 11 nunca teve edição de 32 bits. Em hosts de 32 bits, o instalador PowerShell para com um erro claro, em vez de instalar um binário que não funcionaria.

O instalador detecta a arquitetura do sistema por `PROCESSOR_ARCHITECTURE` / `PROCESSOR_ARCHITEW6432` e baixa o binário correspondente automaticamente. Dispositivos ARM64 recebem um binário ARM64 nativo, em vez de cair na emulação x64.

#### Sistemas operacionais suportados: Linux

| Distribuição | Sistema de init | Gerenciador de pacotes | Observações |
|-------------|-------------|-----------------|-------|
| Ubuntu | systemd | apt | Todas as versões LTS |
| Debian | systemd | apt | 10+ |
| CentOS | systemd | yum/dnf | 7+ |
| RHEL | systemd | yum/dnf | 7+ |
| Rocky Linux | systemd | dnf | Todas as versões |
| AlmaLinux | systemd | dnf | Todas as versões |
| Fedora | systemd | dnf | Versões recentes |
| Alpine Linux | OpenRC | apk | 3.x+ |

#### Sistemas operacionais suportados: Windows

| Versão | Gerenciador de serviços | Gerenciador de pacotes | Observações |
|---|---|---|---|
| Windows 10 (64 bits) | Service Control Manager (SCM) | winget / chocolatey (só relatório) | amd64. O Windows 10 32 bits chegou ao fim do suporte em 14 de outubro de 2025 e não é suportado. |
| Windows 11 | SCM | winget / chocolatey (só relatório) | amd64 e ARM64 nativo em Copilot+ PCs |
| Windows Server 2019 | SCM | winget / chocolatey (só relatório) | amd64 |
| Windows Server 2022 | SCM | winget / chocolatey (só relatório) | amd64 |
| Windows Server 2025 | SCM | winget / chocolatey (só relatório) | amd64 e ARM64 |

O agente Windows informa os pacotes instalados (via `winget`, `chocolatey` e inventário de MSI), mas não executa a aplicação de patches. O PatchMon se integra a fornecedores de patching terceiros para a distribuição no Windows.

#### Sistemas operacionais suportados: FreeBSD

| Versão | Sistema de init | Gerenciador de pacotes | Observações |
|---|---|---|---|
| FreeBSD 13.x | rc.d | pkg | amd64, arm64, arm, 386 |
| FreeBSD 14.x | rc.d | pkg | amd64, arm64, arm, 386 |

As atualizações do sistema base do FreeBSD são detectadas por `freebsd-update fetch`.

#### Uso de recursos

O agente é leve:

| Recurso | Uso típico |
|----------|--------------|
| **Memória** | ~15-30 MB de RSS |
| **CPU** | Quase zero ocioso; picos curtos durante a coleta do relatório |
| **Disco** | ~15 MB (binário) + logs |
| **Rede** | Keepalive do WebSocket (~1 KB/min); o tamanho dos relatórios varia com o número de pacotes |

---

**Veja também:**

- [Referência de configuração do agente (config.yml)](#agent-config-yml-reference): documentação detalhada de cada parâmetro de configuração
- Guia de registro automático de LXC no Proxmox: implantação em massa do agente no Proxmox
- Documentação da Integration API: endpoints da API usados pelo agente

---

## Capítulo 10: Desinstalando o agente do PatchMon {#uninstalling-the-patchmon-agent}

### Visão geral

Desativar um host no PatchMon tem dois lados:

1. **Remover o agente do host**: para o serviço e apaga o binário, a configuração, as credenciais, os logs e a unit do serviço.
2. **Remover o registro do host do servidor do PatchMon**: apaga a linha no banco, as credenciais de API, os relatórios históricos e a participação em grupos.

Quase sempre você quer fazer os dois. Este capítulo trata da remoção por script, da alternativa manual em cada plataforma e de como limpar o lado da interface.

O binário do agente **não** tem subcomando `uninstall`. A remoção é feita por um script de shell (Linux/FreeBSD) ou PowerShell (Windows) gerado pelo servidor. A seção "Remoção do agente" em [Gerenciando o agente do PatchMon](#agent-removal) traz os mesmos comandos numa referência mais compacta; este capítulo é o passo a passo detalhado, com as alternativas manuais para quando o script não for viável.

#### O que é removido

Os scripts de remoção fornecidos pelo servidor apagam tudo o que o instalador gravou:

| Artefato (Linux / FreeBSD) | Artefato (Windows) |
|---|---|
| Processos `patchmon-agent` em execução | Processos `patchmon-agent.exe` em execução |
| Serviço systemd + `/etc/systemd/system/patchmon-agent.service` | Serviço do Windows `PatchMonAgent` |
| Serviço OpenRC + `/etc/init.d/patchmon-agent` | - |
| Script rc.d do FreeBSD em `/usr/local/etc/rc.d/patchmon_agent` | - |
| Entradas do crontab que contêm `patchmon-agent` | - |
| Binário do agente `/usr/local/bin/patchmon-agent` | `C:\Program Files\PatchMon\` |
| Diretório de configuração `/etc/patchmon/` (configuração, credenciais, logs) | `C:\ProgramData\PatchMon\` |
| Arquivo de log `/var/log/patchmon-agent.log` (caminho antigo, se existir) | - |
| Arquivos de backup (`*.backup.*`), só com `REMOVE_BACKUPS=1` | Arquivos de backup `.exe.backup.*` |
| | Caminho de instalação removido do `PATH` do sistema |

Esses scripts **não** removem o registro do host no servidor. Para isso, use o botão **Delete Host** na interface web (veja abaixo).

### Método 1: script de remoção fornecido pelo servidor (recomendado)

O servidor expõe um endpoint público, sem autenticação, que devolve o script de remoção: `GET /api/v1/hosts/remove`. Passe `?os=windows` para receber a versão em PowerShell.

#### Linux / FreeBSD

```bash
curl -s https://patchmon.example.com/api/v1/hosts/remove | sudo sh
```

O script é idempotente: rodá-lo duas vezes não causa problema. Ele mostra um log de andamento e termina com um bloco "Removal Summary".

**Opções (variáveis de ambiente definidas antes do `sh`):**

| Variável | Padrão | Efeito |
|----------|---------|--------|
| `REMOVE_BACKUPS` | `0` | Defina `1` para apagar também os arquivos `*.backup.*` (backups de configuração, backups do binário, rotações de log). |
| `SILENT` | não definida | Defina `1` para saída mínima (útil em automação / Ansible). |

**Exemplos:**

```bash
# Standard removal, keep backups (safest)
curl -s https://patchmon.example.com/api/v1/hosts/remove | sudo sh

# Nuke everything including backups
curl -s https://patchmon.example.com/api/v1/hosts/remove | sudo REMOVE_BACKUPS=1 sh

# Silent removal (for Ansible / cron)
curl -s https://patchmon.example.com/api/v1/hosts/remove | sudo SILENT=1 sh

# Silent + full cleanup
curl -s https://patchmon.example.com/api/v1/hosts/remove | sudo REMOVE_BACKUPS=1 SILENT=1 sh
```

> Se o seu servidor do PatchMon usa certificado autoassinado e o host de destino não confia nele, o servidor já entrega o script com `-sk` (inseguro) embutido quando `Settings → Server → Ignore SSL self-signed` está ativo. Se não estiver, acrescente você mesmo o `-k` ao primeiro `curl`: `curl -sk https://patchmon.example.com/api/v1/hosts/remove | sudo sh`.

#### Windows (PowerShell elevado)

```powershell
$ProgressPreference = 'SilentlyContinue'
Invoke-WebRequest https://patchmon.example.com/api/v1/hosts/remove?os=windows -UseBasicParsing -OutFile "$env:TEMP\patchmon-remove.ps1"
powershell.exe -ExecutionPolicy Bypass -File "$env:TEMP\patchmon-remove.ps1"
```

Ou baixe primeiro, examine e depois rode:

```powershell
irm https://patchmon.example.com/api/v1/hosts/remove?os=windows -OutFile patchmon_remove.ps1
# inspect patchmon_remove.ps1
.\patchmon_remove.ps1 -RemoveAll -Force
```

**Parâmetros do script:**

| Parâmetro | Padrão | Efeito |
|-----------|---------|--------|
| `-RemoveConfig` | desligado | Remove `C:\ProgramData\PatchMon\` (configuração, credenciais, logs). |
| `-RemoveLogs` | desligado | Remove os arquivos de log. |
| `-RemoveAll` | desligado | Atalho para `-RemoveConfig` + `-RemoveLogs`. |
| `-Force` | desligado | Pula as perguntas de confirmação. |
| `-InstallPath` | `C:\Program Files\PatchMon` | Troca o local de instalação (raro). |
| `-ConfigPath` | `C:\ProgramData\PatchMon` | Troca o local da configuração (raro). |

Por padrão, o script do Windows remove o serviço e o binário, mas **mantém** a configuração e os logs. Passe `-RemoveAll` para apagar tudo.

### Método 2: remoção manual

Use os passos manuais quando:

- O servidor do PatchMon está inalcançável e não dá para baixar o script de remoção.
- Você está removendo uma instalação antiga ou corrompida em que o script falha.
- Você quer automatizar a remoção com uma ferramenta de gerência de configuração.

#### Linux: systemd

```bash
# 1. Stop and disable the service
sudo systemctl stop patchmon-agent
sudo systemctl disable patchmon-agent
sudo rm -f /etc/systemd/system/patchmon-agent.service
sudo systemctl daemon-reload

# 2. Kill any stragglers
sudo pkill -f patchmon-agent

# 3. Remove binary and timestamped backups
sudo rm -f /usr/local/bin/patchmon-agent
sudo rm -f /usr/local/bin/patchmon-agent.backup.*

# 4. Remove config, credentials, and logs
sudo rm -rf /etc/patchmon/

# 5. Remove any stale crontab entries
crontab -l 2>/dev/null | grep -v "patchmon-agent" | crontab -

# 6. Verify
which patchmon-agent                            # should print nothing
systemctl status patchmon-agent 2>&1 | head -1  # should show "not found"
ls /etc/patchmon/ 2>/dev/null                   # should be absent
```

#### Linux: OpenRC (Alpine)

```sh
# 1. Stop, remove from runlevel, delete init script
sudo rc-service patchmon-agent stop
sudo rc-update del patchmon-agent default
sudo rm -f /etc/init.d/patchmon-agent

# 2. Kill any stragglers
sudo pkill -f patchmon-agent

# 3. Remove binary and config
sudo rm -f /usr/local/bin/patchmon-agent /usr/local/bin/patchmon-agent.backup.*
sudo rm -rf /etc/patchmon/

# 4. Verify
rc-service patchmon-agent status 2>&1 | head -1
```

#### FreeBSD: rc.d

```sh
# 1. Stop the service
service patchmon_agent stop

# 2. Disable auto-start (remove or comment the enable line in rc.conf.local)
sysrc -x patchmon_agent_enable 2>/dev/null || true
sed -i '' '/patchmon_agent_enable/d' /etc/rc.conf.local 2>/dev/null || true

# 3. Remove the rc.d script
rm -f /usr/local/etc/rc.d/patchmon_agent

# 4. Kill any stragglers
pkill -f patchmon-agent || true
rm -f /var/run/patchmon_agent.pid

# 5. Remove binary, config, and backups
rm -f /usr/local/bin/patchmon-agent /usr/local/bin/patchmon-agent.backup.*
rm -rf /etc/patchmon/

# 6. Verify
service patchmon_agent status 2>&1 | head -1
```

> O nome do script rc.d do FreeBSD usa sublinhado (`patchmon_agent`), e não hífen. Isso segue a convenção de rc do FreeBSD. Não estranhe a diferença em relação ao Linux.

#### Hosts só com crontab (contêineres mínimos)

Em sistemas sem systemd, OpenRC nem rc.d, o instalador acrescenta uma entrada `@reboot` no crontab e inicia o agente em segundo plano. Para remover:

```bash
# 1. Kill the running agent
sudo pkill -f 'patchmon-agent serve'

# 2. Strip the crontab entry
crontab -l 2>/dev/null | grep -v "patchmon-agent" | crontab -

# 3. Remove binary and config
sudo rm -f /usr/local/bin/patchmon-agent /usr/local/bin/patchmon-agent.backup.*
sudo rm -rf /etc/patchmon/

# 4. Verify no processes remain
pgrep -f patchmon-agent
```

#### Windows: PowerShell elevado

```powershell
# 1. Stop and delete the service
Stop-Service -Name PatchMonAgent -Force -ErrorAction SilentlyContinue
sc.exe delete PatchMonAgent

# 2. Kill any stragglers
Get-Process -Name patchmon-agent -ErrorAction SilentlyContinue | Stop-Process -Force

# 3. Remove binary and data directories
Remove-Item -Recurse -Force 'C:\Program Files\PatchMon'
Remove-Item -Recurse -Force 'C:\ProgramData\PatchMon'

# 4. Strip the install path from the system PATH
$installPath = 'C:\Program Files\PatchMon'
$currentPath = [Environment]::GetEnvironmentVariable('Path', [EnvironmentVariableTarget]::Machine)
$newPath = ($currentPath -split ';' | Where-Object { $_ -and $_ -ne $installPath }) -join ';'
[Environment]::SetEnvironmentVariable('Path', $newPath, [EnvironmentVariableTarget]::Machine)

# 5. Verify
Get-Service -Name PatchMonAgent -ErrorAction SilentlyContinue   # should print nothing
Test-Path 'C:\Program Files\PatchMon'                           # should be False
Test-Path 'C:\ProgramData\PatchMon'                             # should be False
```

### Etapa 3: exclua o registro do host no PatchMon

Remover o agente do host **não** apaga o registro do host no banco do PatchMon. O host passa a aparecer como offline / desatualizado. Para desativá-lo por completo:

1. Entre com um usuário que tenha `can_manage_hosts`.
2. Vá a **Hosts**.
3. Encontre o host (ou selecione vários) e clique em **Delete Host** (um só) ou na ação em massa **Delete** (vários).
4. Confirme na janela. Isso remove:
   - A linha do host
   - As credenciais de API dele (`api_id` / `api_key` em hash)
   - O histórico de relatórios, o inventário de pacotes, a lista de repositórios, as varreduras de conformidade e o inventário Docker
   - A participação em grupos de hosts
5. Se você pretende registrar a mesma máquina de novo depois, ela volta como um host novo, com um novo `api_id`.

> **Atenção à reutilização de credenciais.** O `credentials.yml` do agente guarda o API ID antigo. Se você removeu o registro do host mas deixou o binário instalado, o agente passa a registrar `401 Unauthorized` a cada check-in, porque o servidor não conhece mais aquele API ID. Combine sempre a exclusão na interface com um dos métodos de remoção acima.

### Solução de problemas da remoção

#### O script falha com "Permission denied"

Faltou o `sudo`:

```bash
curl -s https://patchmon.example.com/api/v1/hosts/remove | sudo sh
```

No Windows, abra o PowerShell com **Executar como administrador**: um shell sem elevação dá o erro `This script must be run as Administrator`.

#### O serviço continua rodando depois da remoção

No systemd:

```bash
sudo systemctl status patchmon-agent
sudo systemctl stop patchmon-agent
sudo systemctl disable patchmon-agent
sudo rm -f /etc/systemd/system/patchmon-agent.service
sudo systemctl daemon-reload
sudo pkill -9 -f patchmon-agent   # force-kill stragglers
```

No Windows, se `sc.exe delete PatchMonAgent` informar "The specified service has been marked for deletion" e o serviço continuar na lista, reinicie a máquina uma vez. O SCM não consegue apagar um serviço enquanto o handle de arquivo do binário ainda está aberto. Outra saída é fechar as janelas do Event Viewer / Services.msc e tentar de novo.

#### Os arquivos de configuração continuam lá depois do script

O script do Linux/FreeBSD remove `/etc/patchmon/` sempre. O script do Windows só remove `C:\ProgramData\PatchMon\` com `-RemoveConfig` (ou `-RemoveAll`). Rode o script do Windows de novo com `-RemoveAll -Force`.

#### Os backups continuam lá depois da remoção

No Linux, os arquivos de backup (configuração, credenciais, binário, logs) são **mantidos por padrão**, como rede de segurança. Eles ficam em:

- `/etc/patchmon/credentials.yml.backup.*` (removidos junto com o diretório `/etc/patchmon/`)
- `/etc/patchmon/config.yml.backup.*` (removidos junto com o diretório `/etc/patchmon/`)
- `/usr/local/bin/patchmon-agent.backup.*` - **não** são removidos, a menos que `REMOVE_BACKUPS=1`
- `/etc/patchmon/logs/patchmon-agent.log.old.*` (removidos junto com o diretório `/etc/patchmon/`)

Passe `REMOVE_BACKUPS=1` ao chamar o script de remoção, ou apague-os manualmente:

```bash
sudo rm -f /usr/local/bin/patchmon-agent.backup.*
```

#### O host ainda aparece como "Connected" por um tempo depois da desinstalação

O status do WebSocket pode levar até ~60 segundos para refletir a desconexão. Se você exclui o registro do host na interface enquanto o agente ainda está rodando, o agente recebe `401` no ping seguinte e a interface se atualiza. O "Connected" que sobra é só visual e se corrige sozinho.

### Veja também

- [Gerenciando o agente do PatchMon](#managing-the-patchmon-agent): em especial a seção "Remoção do agente", com uma referência resumida.
- [Instalando o agente do PatchMon](#installing-the-patchmon-agent): como registrar um host de novo depois da remoção.
- [Referência de configuração do agente (config.yml)](#agent-config-yml-reference): o que há nos arquivos de configuração que são apagados.
- [Solução de problemas do agente](#agent-troubleshooting): árvore de decisão rápida para problemas do lado do agente.

---

## Capítulo 11: Referência do config.yml do agente {#agent-config-yml-reference}

### Visão geral

O agente do PatchMon é configurado por um arquivo YAML. No Linux, o caminho padrão é `/etc/patchmon/config.yml`; no Windows, `C:\ProgramData\PatchMon\config.yml`. Esse arquivo controla como o agente se comunica com o servidor do PatchMon, onde os logs ficam, quais integrações estão ativas e outros comportamentos em tempo de execução. Um arquivo de credenciais separado guarda os dados de autenticação na API do host (`/etc/patchmon/credentials.yml` no Linux, `C:\ProgramData\PatchMon\credentials.yml` no Windows).

No Linux, esses arquivos pertencem ao root e têm permissão `600` (leitura e escrita só para o dono), para proteger as informações sensíveis.

#### Locais dos arquivos

| Arquivo | Caminho padrão | Finalidade |
|------|-------------|---------|
| **Configuração** | Linux: `/etc/patchmon/config.yml`  Windows: `C:\ProgramData\PatchMon\config.yml` | Configurações do agente, URL do servidor, integrações |
| **Credenciais** | Linux: `/etc/patchmon/credentials.yml`  Windows: `C:\ProgramData\PatchMon\credentials.yml` | API ID e API Key para autenticação do host |
| **Arquivo de log** | Linux: `/etc/patchmon/logs/patchmon-agent.log`  Windows: `C:\ProgramData\PatchMon\patchmon-agent.log` | Saída de log do agente |
| **Arquivo de cron** | `/etc/cron.d/patchmon-agent` | Relatórios agendados (alternativa para sistemas sem systemd) |

#### Aspas em caminhos do Windows

O YAML trata a barra invertida dentro de aspas **duplas** como início de uma sequência de escape, então um caminho do Windows entre aspas duplas é recusado ou alterado sem aviso. `"C:\ProgramData\PatchMon\credentials.yml"` não é interpretado, porque `\c` não é um escape válido. `"C:\ProgramData\PatchMon\Notes"` é pior: é interpretado, mas `\N` é um escape válido e vira um caractere de controle, e o caminho resultante não é o que você escreveu.

Use aspas simples, ou nenhuma aspa, em qualquer valor que tenha barra invertida:

```yaml
credentials_file: 'C:\ProgramData\PatchMon\credentials.yml'
log_file: C:\ProgramData\PatchMon\patchmon-agent.log
```

Se o `config.yml` não puder ser interpretado, o **serviço** do agente se recusa a iniciar, em vez de recorrer aos padrões embutidos, e grava o erro de interpretação no log do agente. Isso é proposital: um agente rodando com os padrões não tem URL de servidor, então não reporta nada, e o primeiro salvamento sobrescreveria o seu arquivo com esses padrões. Comandos avulsos, como `report` e `ping`, incluindo a alternativa por cron em hosts sem systemd, continuam rodando, mas falham contra essa URL de servidor vazia.

O mesmo vale para um `config.yml` que existe mas está vazio, que é o que sobra de uma gravação interrompida por disco cheio ou queda de energia.

Para recuperar, conserte o arquivo ou rode `patchmon-agent config set-api <API_ID> <API_KEY> <SERVER_URL>` (`patchmon-agent.exe` no Windows) para gravar um novo. Atenção: isso grava um arquivo completo novo, então as outras configurações que o antigo tinha são perdidas.

### Referência completa da configuração

Abaixo, um `config.yml` completo com todos os parâmetros disponíveis, os padrões e as descrições:

```yaml
# PatchMon Agent Configuration
# Location: /etc/patchmon/config.yml

# ─── Server Connection ───────────────────────────────────────────────
# The URL of the PatchMon server this agent reports to.
# Required. Must start with http:// or https://
patchmon_server: "https://patchmon.example.com"

# API version to use when communicating with the server.
# Default: "v1". Do not change unless instructed.
api_version: "v1"

# ─── File Paths ──────────────────────────────────────────────────────
# Path to the credentials file containing api_id and api_key.
# Default: "/etc/patchmon/credentials.yml"
credentials_file: "/etc/patchmon/credentials.yml"

# Path to the agent log file. Logs are rotated automatically
# (max 10 MB per file, 5 backups, 14-day retention, compressed).
# Default: "/etc/patchmon/logs/patchmon-agent.log"
log_file: "/etc/patchmon/logs/patchmon-agent.log"

# ─── Logging ─────────────────────────────────────────────────────────
# Log verbosity level.
# Options: "debug", "info", "warn", "error"
# Default: "info"
log_level: "info"

# ─── SSL / TLS ───────────────────────────────────────────────────────
# Skip SSL certificate verification when connecting to the server.
# Set to true only if using self-signed certificates.
# Default: false
skip_ssl_verify: false

# ─── Reporting Schedule ──────────────────────────────────────────────
# How often (in minutes) the agent sends a full report to the server.
# This value is synced from the server on startup. If the server has
# a different value, the agent updates config.yml automatically.
# Default: 60
update_interval: 60

# Report offset (in seconds). Automatically calculated from the host's
# api_id to stagger reporting across hosts and avoid thundering-herd.
# You should not need to set this manually. The agent calculates and
# persists it automatically.
# Default: 0 (auto-calculated on first run)
report_offset: 0

# ─── Integrations ────────────────────────────────────────────────────
# Integration toggles control optional agent features.
# Most integrations can be toggled from the PatchMon UI and the server
# will push the change to the agent via WebSocket. The agent then
# updates config.yml and restarts the relevant service.
#
# EXCEPTION: ssh-proxy-enabled and rdp-proxy-enabled CANNOT be pushed from the server.
# It must be manually set in this file (see below).
integrations:
  # Docker integration: monitors containers, images, volumes, networks.
  # Can be toggled from the PatchMon UI (Settings → Integrations).
  # Default: false
  docker: false

  # Compliance integration: OpenSCAP and Docker Bench security scanning.
  #   enabled: false | "on-demand" | true
  #     false       - Disabled. No scans run.
  #     "on-demand"  - Scans only run when triggered from the PatchMon UI.
  #     true        - Enabled with automatic scheduled scans every report cycle.
  #   openscap_enabled: enable/disable OpenSCAP scanning (default: true)
  #   docker_bench_enabled: enable/disable Docker Bench scanning (default: false)
  # Can be toggled from the PatchMon UI.
  compliance:
    enabled: "on-demand"
    openscap_enabled: true
    docker_bench_enabled: false

  # SSH Proxy: allows browser-based SSH sessions through the agent.
  #     SECURITY: This setting can ONLY be enabled by manually editing
  #     this file. It cannot be pushed from the server to the agent.
  #     This is intentional. Enabling remote shell access should require
  #     deliberate action by someone with root access on the host.
  # Default: false
  ssh-proxy-enabled: false

  # RDP Proxy: allows browser-based RDP sessions through the agent.
  #     SECURITY: Same as SSH proxy. Requires manual configuration.
  #     Cannot be pushed from the server. Requires guacd sidecar on
  #     the server and RDP enabled on the Windows host.
  # Default: false
  rdp-proxy-enabled: false
```

### Os parâmetros em detalhe

#### `patchmon_server`

| | |
|---|---|
| **Tipo** | String (URL) |
| **Obrigatório** | Sim |
| **Padrão** | Nenhum (obrigatório) |
| **Exemplo** | `https://patchmon.example.com` |

A URL completa do servidor do PatchMon. Precisa incluir o protocolo (`http://` ou `https://`). Não inclua barra no final nem caminho.

#### `api_version`

| | |
|---|---|
| **Tipo** | String |
| **Obrigatório** | Não |
| **Padrão** | `v1` |

A versão da API acrescentada às chamadas. Deixe `v1`, a menos que a documentação ou as notas de versão do PatchMon digam outra coisa.

#### `credentials_file`

| | |
|---|---|
| **Tipo** | String (caminho de arquivo) |
| **Obrigatório** | Não |
| **Padrão** | `/etc/patchmon/credentials.yml` |

Caminho do arquivo YAML com o `api_id` e a `api_key` do host. O arquivo de credenciais tem esta estrutura:

```yaml
api_id: "patchmon_abc123def456"
api_key: "your_api_key_here"
```

#### `log_file`

| | |
|---|---|
| **Tipo** | String (caminho de arquivo) |
| **Obrigatório** | Não |
| **Padrão** | `/etc/patchmon/logs/patchmon-agent.log` |

Caminho do arquivo de log do agente. O diretório é criado automaticamente se não existir. Os logs são rotacionados com esta política:

- **Tamanho máximo do arquivo**: 10 MB
- **Máximo de backups**: 5 arquivos rotacionados
- **Idade máxima**: 14 dias
- **Compressão**: ativada (gzip)

#### `log_level`

| | |
|---|---|
| **Tipo** | String |
| **Obrigatório** | Não |
| **Padrão** | `info` |
| **Opções** | `debug`, `info`, `warn`, `error` |

Controla o nível de detalhe dos logs do agente. Use `debug` para investigar problemas: inclui o fluxo de execução detalhado e diagnósticos extras. Ative por pouco tempo e desative de novo quando tiver os logs de que precisa. Também pode ser trocado em tempo de execução com a flag de CLI `--log-level`.

#### `skip_ssl_verify`

| | |
|---|---|
| **Tipo** | Booleano |
| **Obrigatório** | Não |
| **Padrão** | `false` |

Com `true`, o agente pula a verificação do certificado TLS ao se conectar ao servidor do PatchMon. Use só em ambientes internos ou de teste com certificados autoassinados. **Não recomendado em produção.**

#### `update_interval`

| | |
|---|---|
| **Tipo** | Inteiro (minutos) |
| **Obrigatório** | Não |
| **Padrão** | `60` |

Com que frequência o agente manda um relatório completo do sistema (pacotes instalados, atualizações etc.) ao servidor. Este valor é **sincronizado a partir do servidor**: se você mudar o intervalo de relatório global ou do host na interface do PatchMon, o agente atualiza este valor no `config.yml` sozinho, na próxima inicialização ou quando receber uma atualização de configuração pelo WebSocket.

Se o valor for `0` ou negativo, o agente usa o padrão de 60 minutos.

#### `report_offset`

| | |
|---|---|
| **Tipo** | Inteiro (segundos) |
| **Obrigatório** | Não |
| **Padrão** | `0` (calculado automaticamente) |

Um deslocamento calculado a partir do `api_id` do host e do `update_interval` atual. Ele garante que os agentes do parque não reportem todos no mesmo instante (evitando o problema de "manada" no servidor).

**Não defina este valor manualmente.** O agente o calcula na primeira execução e o grava. Se o `update_interval` mudar, o deslocamento é recalculado automaticamente.

#### `integrations`

Um mapa com os nomes das integrações e o estado de cada uma (ativada/desativada). Os detalhes de cada integração estão na seção [Integrações](#integrations-1), abaixo.

### Integrações {#integrations-1}

#### Docker (`docker`)

| | |
|---|---|
| **Tipo** | Booleano |
| **Padrão** | `false` |
| **Pode ser enviado pelo servidor** | Sim |

Com a opção ativa, o agente monitora os contêineres, imagens, volumes e redes Docker do host. Ele manda ao servidor do PatchMon os eventos de status dos contêineres em tempo real e retratos periódicos do inventário.

**Requisitos:** o Docker precisa estar instalado e o socket do Docker precisa estar acessível.

**Ligar pela interface:** vá à página de detalhes do host, aba Integrations, e ligue ou desligue o Docker. O servidor manda a mudança ao agente pelo WebSocket, o agente atualiza o `config.yml` e o serviço reinicia sozinho.

#### Conformidade (`compliance`)

| | |
|---|---|
| **Tipo** | Booleano ou string |
| **Padrão** | `"on-demand"` |
| **Pode ser enviado pelo servidor** | Sim |
| **Valores válidos** | `false`, `"on-demand"`, `true` |

Controla as varreduras de conformidade de segurança do OpenSCAP e do Docker Bench.

| Valor | Comportamento |
|-------|-----------|
| `false` | As varreduras de conformidade ficam totalmente desativadas. Nada roda. |
| `"on-demand"` | As varreduras só rodam quando disparadas manualmente pela interface do PatchMon. As ferramentas ficam instaladas, mas não há varreduras agendadas automáticas. |
| `true` | Totalmente ativado. As varreduras rodam automaticamente a cada ciclo de relatório, além de continuarem disponíveis sob demanda. |

Na primeira ativação, o agente instala sozinho as ferramentas de conformidade necessárias (OpenSCAP, os pacotes de conteúdo SSG e a imagem do Docker Bench, se o Docker também estiver ativo).

#### Proxy SSH (`ssh-proxy-enabled`)

| | |
|---|---|
| **Tipo** | Booleano |
| **Padrão** | `false` |
| **Pode ser enviado pelo servidor** | Não (exige edição manual) |

Ativa as sessões de terminal SSH no navegador intermediadas pelo agente do PatchMon. Quando um usuário abre o terminal SSH na interface do PatchMon, o servidor manda o pedido de conexão SSH ao agente pelo WebSocket, e o agente abre uma conexão SSH local em nome do usuário.

##### Por que o proxy SSH exige configuração manual

**É uma decisão de projeto deliberada, por segurança.** Ativar o proxy SSH permite acesso de shell remoto ao host através do agente do PatchMon. Ao contrário das integrações de Docker e de conformidade, isso tem implicações diretas de segurança:

- Abre um caminho de conexão SSH através do agente.
- Pode ser explorado se um servidor do PatchMon ou uma conta de usuário forem comprometidos.
- O administrador do host deve fazer uma escolha consciente e deliberada para ativá-lo.

Por esses motivos, `ssh-proxy-enabled` **não pode ser ligado pela interface do PatchMon nem enviado pelo servidor**. Se o servidor tentar iniciar uma sessão de proxy SSH com a opção desligada, o agente recusa o pedido e devolve uma mensagem de erro explicando como ativá-la.

##### Como ativar o proxy SSH {#how-to-enable-ssh-proxy}

1. Entre por SSH no host em que o agente do PatchMon está instalado.
2. Abra o arquivo de configuração:

```bash
sudo nano /etc/patchmon/config.yml
```

3. Encontre a seção `integrations` e mude `ssh-proxy-enabled` para `true`:

```yaml
integrations:
  docker: false
  compliance:
    enabled: "on-demand"
    openscap_enabled: true
    docker_bench_enabled: false
  ssh-proxy-enabled: true    # ← Change from false to true
```

4. Salve o arquivo e reinicie o agente:

```bash
# Systemd
sudo systemctl restart patchmon-agent.service

# OpenRC (Alpine)
sudo rc-service patchmon-agent restart
```

5. O recurso de terminal SSH fica disponível para este host na interface do PatchMon.

##### Como desativar o proxy SSH

Volte `ssh-proxy-enabled` para `false` no `config.yml` e reinicie o serviço do agente. As sessões SSH existentes são encerradas.

#### Proxy RDP (`rdp-proxy-enabled`)

| | |
|---|---|
| **Tipo** | Booleano |
| **Padrão** | `false` |
| **Pode ser enviado pelo servidor** | Não (exige edição manual) |

Ativa as sessões RDP (Remote Desktop Protocol) no navegador intermediadas pelo agente do PatchMon. Quando um usuário abre a aba RDP de um host Windows na interface do PatchMon, o servidor manda o pedido de conexão RDP ao agente pelo WebSocket, e o agente abre uma conexão RDP local (padrão: `localhost:3389`) em nome do usuário, via o `guacd` (Apache Guacamole) que roda no servidor do PatchMon.

##### Por que o proxy RDP exige configuração manual

**O mesmo motivo de segurança do proxy SSH.** Ativar o proxy RDP permite acesso de área de trabalho remota ao host através do agente do PatchMon. Isso exige uma decisão deliberada do administrador do host:

- Abre um caminho de conexão RDP através do agente até a porta 3389.
- Pode ser explorado se um servidor do PatchMon ou uma conta de usuário forem comprometidos.
- O host Windows precisa ter o RDP ativo, e o `guacd` precisa estar disponível no servidor do PatchMon.

Por esses motivos, `rdp-proxy-enabled` **não pode ser ligado pela interface do PatchMon nem enviado pelo servidor**. Se o servidor tentar iniciar uma sessão de proxy RDP com a opção desligada, o agente recusa o pedido e devolve uma mensagem de erro explicando como ativá-la.

##### Pré-requisitos

- O **servidor** do PatchMon precisa ter o `guacd` disponível (a stack padrão do Docker Compose inclui `guacamole/guacd:1.6.0` como sidecar).
- O **host Windows** precisa ter a Área de Trabalho Remota ativada.
- O agente do PatchMon precisa estar instalado no host Windows.
- O PatchMon só precisa do RDP escutando em `localhost:3389` no host Windows. Não é preciso expor o RDP publicamente.
- Se o navegador alcança o host mas a sessão ainda falha, tente primeiro com credenciais do Windows explícitas. A interface do PatchMon distingue porta inalcançável, autenticação, negociação de segurança e falhas genéricas de configuração pós-conexão quando o guacd informa uma mensagem explícita do outro lado.

##### Como ativar o proxy RDP

1. Conecte-se ao host em que o agente do PatchMon está instalado.
2. Abra o arquivo de configuração no host:

```powershell
# Windows (PowerShell as Administrator)
notepad "C:\ProgramData\PatchMon\config.yml"
```

3. Encontre a seção `integrations` e mude `rdp-proxy-enabled` para `true`:

```yaml
integrations:
  docker: false
  compliance:
    enabled: "on-demand"
    openscap_enabled: true
    docker_bench_enabled: false
  ssh-proxy-enabled: false
  rdp-proxy-enabled: true    # ← Change from false to true
```

4. Salve o arquivo e reinicie o agente:

```bash
# Systemd
sudo systemctl restart patchmon-agent.service

# Windows (PowerShell as Administrator)
Restart-Service -Name PatchMonAgent
```

5. A aba RDP fica disponível para este host na interface do PatchMon.

##### Como desativar o proxy RDP

Volte `rdp-proxy-enabled` para `false` no `config.yml` e reinicie o serviço do agente. As sessões RDP existentes são encerradas.

### Como o `config.yml` é gerado

#### Geração inicial (instalação)

O `config.yml` é criado durante a instalação do agente pelo script `patchmon_install.sh`. O instalador gera uma configuração nova com:

- `patchmon_server` apontando para a URL do servidor usada na instalação
- `skip_ssl_verify` definido conforme o uso ou não das flags `-k` no curl
- Todas as integrações no padrão `false` (Docker, proxy SSH, proxy RDP) ou `"on-demand"` (conformidade)
- Caminhos padrão para as credenciais e os logs

```bash
# What the installer generates:
cat > /etc/patchmon/config.yml << EOF
# PatchMon Agent Configuration
# Generated on $(date)
patchmon_server: "https://patchmon.example.com"
api_version: "v1"
credentials_file: "/etc/patchmon/credentials.yml"
log_file: "/etc/patchmon/logs/patchmon-agent.log"
log_level: "info"
skip_ssl_verify: false
integrations:
  docker: false
  compliance:
    enabled: "on-demand"
    openscap_enabled: true
    docker_bench_enabled: false
  ssh-proxy-enabled: false
  rdp-proxy-enabled: false
EOF

chmod 600 /etc/patchmon/config.yml
```

#### Comportamento na reinstalação

Se o agente for reinstalado num host que já tem uma configuração funcionando:

1. O instalador **verifica se a configuração existente é válida** rodando `patchmon-agent ping`.
2. Se o ping der certo, o instalador **sai sem sobrescrever nada**. A configuração existente é preservada.
3. Se o ping falhar (ou o binário não existir), o instalador:
   - Cria um backup com data e hora: `config.yml.backup.YYYYMMDD_HHMMSS`
   - Mantém só os 3 últimos backups (os mais antigos são apagados)
   - Grava um `config.yml` novo

Reinstalar num agente saudável é seguro e não destrói a sua configuração.

### Como o `config.yml` é atualizado em tempo de execução

O agente atualiza o `config.yml` sozinho em várias situações. São atualizações no lugar: o agente lê o arquivo, muda o campo em questão e grava de volta. As suas outras configurações (inclusive `ssh-proxy-enabled`) são preservadas.

#### Atualizações comandadas pelo servidor

| Gatilho | O que muda | Como |
|---------|-------------|-----|
| **Inicialização do agente** | `update_interval`, `report_offset` | O agente busca o intervalo atual no servidor. Se for diferente do da configuração, o agente atualiza o config.yml. |
| **Inicialização do agente** | `integrations.docker`, `integrations.compliance` | O agente busca no servidor o estado das integrações. Se for diferente do da configuração, o agente atualiza o config.yml. |
| **WebSocket: `settings_update`** | `update_interval`, `report_offset` | O servidor manda um novo intervalo. O agente o grava e recalcula o deslocamento do relatório. |
| **WebSocket: `apply_config`** | `integrations.docker`, `integrations.compliance.enabled`, `integrations.compliance.openscap_enabled`, `integrations.compliance.docker_bench_enabled` | Ligar ou desligar uma integração na interface fica pendente, não é enviado na hora. O servidor guarda a mudança pendente até você clicar em **Apply** na página de detalhes do host, e então envia o bloco de integrações inteiro numa única mensagem. O agente grava no config.yml e se reinicia. |

#### Atualizações calculadas pelo agente

| Gatilho | O que muda | Como |
|---------|-------------|-----|
| **Primeira execução** | `report_offset` | Calculado a partir do hash do `api_id` e do `update_interval`, para escalonar os relatórios. |
| **Mudança de intervalo** | `report_offset` | Recalculado sempre que o `update_interval` muda. |
| **CLI: `config set-api`** | `patchmon_server`, credenciais | Rodar `patchmon-agent config set-api` sobrescreve a URL do servidor e grava as novas credenciais. |

#### O que nunca muda automaticamente

| Parâmetro | Por quê |
|-----------|-----|
| `ssh-proxy-enabled` | Segurança: exige ação manual no host |
| `rdp-proxy-enabled` | Segurança: exige ação manual no host |
| `log_level` | Só muda por edição manual ou pela flag de CLI `--log-level` |
| `log_file` | Só muda por edição manual |
| `credentials_file` | Só muda por edição manual ou por `config set-api` |
| `skip_ssl_verify` | Só muda por edição manual |

#### Importante: como o SaveConfig funciona

Quando o agente chama internamente o `SaveConfig()`, ele grava **todos os parâmetros** de volta no arquivo. Isso significa que:

- As suas configurações `ssh-proxy-enabled` e `rdp-proxy-enabled` são **preservadas** nas atualizações comandadas pelo servidor.
- Integrações novas trazidas por atualizações do agente são **acrescentadas automaticamente** ao arquivo com os padrões (elas aparecem depois de uma atualização do agente).
- O formato do arquivo pode ser ligeiramente reorganizado pelo serializador YAML (a ordem das chaves pode mudar), mas todos os valores são preservados.

### Comandos de configuração da CLI

O agente oferece comandos de CLI para gerenciar a configuração.

#### Ver a configuração atual

```bash
sudo patchmon-agent config show
```

**Saída:**
```
Configuration:
  Server: https://patchmon.example.com
  Agent Version: 1.4.0
  Config File: /etc/patchmon/config.yml
  Credentials File: /etc/patchmon/credentials.yml
  Log File: /etc/patchmon/logs/patchmon-agent.log
  Log Level: info

Credentials:
  API ID: patchmon_abc123def456
  API Key: Set ✅
```

#### Definir as credenciais da API

```bash
sudo patchmon-agent config set-api <API_ID> <API_KEY> <SERVER_URL>
```

Evite colar uma API key real num shell com histórico persistente ou gravação de sessão. Se o seu ambiente registra as linhas de comando, use um shell temporário com o histórico desligado, ou atualize o `credentials.yml` diretamente.

O comando:
1. Valida o formato da URL do servidor
2. Grava a URL do servidor no `config.yml`
3. Grava as credenciais no `credentials.yml`
4. Testa a conectividade com um ping ao servidor
5. Informa se deu certo ou não

#### Caminho próprio para o arquivo de configuração

Todos os comandos aceitam a flag `--config` para usar outro arquivo de configuração:

```bash
sudo patchmon-agent --config /path/to/custom/config.yml serve
```

### Arquivo de credenciais (`credentials.yml`)

O arquivo de credenciais fica separado do arquivo de configuração, para isolamento de segurança. Ele contém:

```yaml
api_id: "patchmon_abc123def456"
api_key: "your_api_key_here"
```

- **Permissões**: `600` (leitura e escrita só para o root)
- **Gravado com rename atômico**: o agente grava primeiro num arquivo temporário e depois o renomeia de forma atômica. Isso evita gravações parciais e condições de corrida.
- **Nunca contém a chave em hash**: a API key em texto claro fica aqui; o servidor guarda só o hash bcrypt.

### Solução de problemas

#### Arquivo de configuração ausente

Se `/etc/patchmon/config.yml` não existir, o agente usa os padrões embutidos. Com isso, ele não sabe a qual servidor se conectar. Reinstale o agente ou crie o arquivo manualmente.

#### Permissões do arquivo de configuração

```bash
# Check permissions (should be 600, owned by root)
ls -la /etc/patchmon/config.yml

# Fix if needed
sudo chmod 600 /etc/patchmon/config.yml
sudo chown root:root /etc/patchmon/config.yml
```

#### O proxy SSH não funciona

Se o terminal SSH na interface do PatchMon mostrar um erro como:

> SSH proxy is not enabled.
> To enable SSH proxy, edit the file /etc/patchmon/config.yml...

significa que `ssh-proxy-enabled` está em `false` (o padrão). Siga as instruções de [Como ativar o proxy SSH](#how-to-enable-ssh-proxy), acima.

#### A configuração é sobrescrita

Se você notar configurações mudando sem esperar, verifique:

1. **Sincronização com o servidor**: o `update_interval` e as chaves de integração (Docker, conformidade) são sincronizados a partir do servidor na inicialização e pelo WebSocket. Mudanças feitas na interface do PatchMon sobrescrevem os valores locais desses campos.
2. **Atualizações do agente**: depois de uma atualização do agente, novas chaves de integração podem aparecer no arquivo com os valores padrão.
3. **Reinstalação**: uma reinstalação só sobrescreve a configuração se o teste de ping da configuração existente falhar.

As suas configurações `ssh-proxy-enabled`, `rdp-proxy-enabled`, `log_level`, `skip_ssl_verify` e de caminhos de arquivo **nunca são sobrescritas** pela sincronização com o servidor.

#### Vendo os logs de depuração

```bash
# Temporarily enable debug logging
sudo patchmon-agent --log-level debug serve

# Or set permanently in config.yml
sudo nano /etc/patchmon/config.yml
# Change: log_level: "debug"
# Then restart the service
sudo systemctl restart patchmon-agent.service
```

Ative o `debug` só por pouco tempo, para investigar. Evite deixá-lo ligado durante sessões SSH ou RDP ativas, porque o tráfego de acesso remoto é mais sensível que a telemetria normal do agente. Volte para `info` depois de capturar o que precisa.

### Exemplos de configuração

#### Configuração mínima

```yaml
patchmon_server: "https://patchmon.example.com"
```

Todos os outros valores usam os padrões. O agente funciona só com a URL do servidor (e credenciais válidas no `credentials.yml`).

#### Configuração completa com proxy SSH e RDP ativos

```yaml
patchmon_server: "https://patchmon.internal.company.com"
api_version: "v1"
credentials_file: "/etc/patchmon/credentials.yml"
log_file: "/etc/patchmon/logs/patchmon-agent.log"
log_level: "info"
skip_ssl_verify: false
update_interval: 30
report_offset: 847
integrations:
  docker: true
  compliance:
    enabled: "on-demand"
    openscap_enabled: true
    docker_bench_enabled: false
  ssh-proxy-enabled: true
  rdp-proxy-enabled: true
```

#### SSL autoassinado com logs de depuração

```yaml
patchmon_server: "https://patchmon.lab.local"
api_version: "v1"
credentials_file: "/etc/patchmon/credentials.yml"
log_file: "/etc/patchmon/logs/patchmon-agent.log"
log_level: "debug"
skip_ssl_verify: true
update_interval: 60
integrations:
  docker: false
  compliance:
    enabled: false
    openscap_enabled: true
    docker_bench_enabled: false
  ssh-proxy-enabled: false
  rdp-proxy-enabled: false
```

---

## Capítulo 12: Solução de problemas do servidor {#server-troubleshooting}

### Visão geral

Este capítulo trata do diagnóstico e da correção de problemas do **servidor** do PatchMon 2.0 numa implantação com Docker Compose: falhas na inicialização do contêiner, problemas de banco de dados e Redis, CORS, WebSocket, proxy reverso e recuperação do acesso de administrador.

Se o problema está do lado do **agente** (não inicia, não alcança o servidor, falta o arquivo de credenciais), vá direto para [Solução de problemas do agente](#agent-troubleshooting).

#### Arquitetura de referência

Uma implantação com o `docker-compose.yml` padrão roda quatro contêineres na rede bridge `patchmon-internal`:

| Serviço | Imagem | Porta (exposta) | Depende de |
|---------|-------|----------------|-----------|
| `server` | `ghcr.io/patchmon/patchmon-server:latest` | `${PORT:-3000}:${PORT:-3000}` | `database`, `redis`, `guacd` |
| `database` | `postgres:17-alpine` | não exposta | n/a |
| `redis` | `redis:7-alpine` | não exposta | n/a |
| `guacd` | `guacamole/guacd:1.6.0` | não exposta | n/a |

O contêiner `server` traz embutidos o servidor HTTP em Go, o frontend, o worker das filas e o executor de migrações. Não é preciso job de migração separado. Na frente dele costuma ficar um Nginx / Traefik / Caddy / Cloudflare, que termina o TLS e encaminha para `server:3000`, ou para a porta que você definiu em `PORT`.

### Coletando informações de diagnóstico

Antes de tentar qualquer correção, registre o estado atual da stack. Estes comandos são seguros e não alteram nada.

> **Se os logs do servidor parecem vazios, confira o `ENABLE_LOGGING`.** O padrão é `true` a partir da 2.0.3, mas um `false` explícito silencia o servidor por completo, e `false` era o padrão na 2.0.2 e anteriores. Com ele desligado, `docker compose logs server` mostra a saída do ciclo de vida do contêiner e nada do próprio PatchMon, então não tire conclusões do silêncio.

```bash
# In the directory where your docker-compose.yml lives

# 1. Show container state (Up / Restarting / Exit)
docker compose ps

# 2. Server logs (last 200 lines)
docker compose logs --tail 200 server

# 3. Everything (server + database + redis + guacd)
docker compose logs --tail 200 --timestamps

# 4. Follow logs live
docker compose logs -f server

# 5. Health check (from the Docker host)
curl http://localhost:3000/health
# expected: 200 OK, body "healthy"

# 6. Health check as JSON
curl -H 'Accept: application/json' http://localhost:3000/health
# expected: {"status":"healthy","database":"healthy","redis":"healthy"}

# 7. Resource usage
docker stats --no-stream
```

O endpoint de saúde em `/health` é **público e sem autenticação** e informa o estado da conexão com o Postgres e com o Redis. Um `503 Service Unavailable` em `/health` significa que pelo menos uma dependência está fora.

Confira os valores do seu `.env` sem vazar segredos:

```bash
# Show keys only (no values) -- safe to share in a bug report
grep -v '^#' .env | grep '=' | cut -d= -f1 | sort
```

Veja o que o servidor enxerga em tempo de execução (interface Settings → aba Server):

- Entre no PatchMon como superadmin.
- Vá a **Settings → Server**.
- A coluna "Effective value" mostra o valor resolvido (env → banco → padrão), e "Source" diz qual camada venceu.
- "Conflict" marca qualquer configuração definida tanto no `.env` quanto no banco. O env sempre vence, mas vale resolver.

### 1. O contêiner não inicia / cai no boot

#### Sintomas

- `docker compose ps` mostra o `server` no estado `Restarting` ou `Exited (1)`.
- `docker compose logs server` mostra um erro logo de cara e o contêiner fica em laço.

#### Diagnóstico

```bash
docker compose logs --tail 100 server
```

Olhe as 30 primeiras linhas. A causa da queda quase sempre está registrada ali.

#### Causas comuns e correções

| Linha de log | Causa | Correção |
|----------|-------|-----|
| `config: DATABASE_URL is required` | `DATABASE_URL` vazia ou ausente do `.env` | Defina `DATABASE_URL=postgresql://user:pass@database:5432/patchmon?sslmode=disable` no `.env` e rode `docker compose up -d`. |
| `config: JWT_SECRET is required` | Falta o `JWT_SECRET` | Gere um: `openssl rand -base64 48`. Acrescente ao `.env`. |
| `migrations failed: ...` | Erro de migração do banco no boot | Veja **Erros de migração do banco**, abaixo. |
| `database: ...: connect: connection refused` | O Postgres ainda não está saudável ou o hostname em `DATABASE_URL` está errado | Rode `docker compose ps database` e confirme que aparece `healthy`. O hostname em `DATABASE_URL` precisa ser o nome do serviço no `docker-compose.yml` (`database`, não `localhost`). |
| `redis: ... NOAUTH Authentication required` | O servidor se conecta ao Redis sem senha, mas o Redis tem uma | Defina `REDIS_PASSWORD` com o mesmo valor passado a `redis-server --requirepass` no `docker-compose.yml`. Os dois leem do mesmo `.env`. |
| `encryption init failed` | Tokens de bootstrap / segredos do OIDC não vão funcionar. Defina pelo menos uma de `DATABASE_URL`, `SESSION_SECRET` ou `AI_ENCRYPTION_KEY`. | Defina `SESSION_SECRET` no `.env` (32+ caracteres, aleatório). |

#### Saída de emergência: abra um shell na imagem do servidor

Se o contêiner cai rápido demais para ser inspecionado, rode-o com um comando substituto:

```bash
docker compose run --rm --entrypoint /bin/sh server
```

No shell que abrir, dá para rodar `env | grep -E 'DATABASE_URL|REDIS|JWT'` e testar a conectividade com `nc -zv database 5432` e `redis-cli -h redis -a "$REDIS_PASSWORD" ping`.

### 2. Erros de migração do banco no boot

#### Sintomas

```
[fatal] migrations failed: Dirty database version N. Fix and force version.
```

ou

```
[fatal] migrations failed: migration file XXXX is corrupted
```

#### Contexto

O PatchMon usa o `golang-migrate` com arquivos SQL embutidos. A cada inicialização, o servidor roda as migrações pendentes antes de abrir o listener HTTP. Um estado **dirty** significa que uma migração anterior começou e caiu no meio. A tabela `schema_migrations` registra a versão, mas a coluna `dirty` fica `true`.

A partir da v2.1.1, o próprio servidor mostra o SQL de recuperação, com o nome do banco e o comando exato a rodar. Na maioria dos casos, basta seguir esse bloco, em vez de montá-lo à mão:

```
[migrate] Migration 42 did not complete on database "patchmon_db", so it is marked dirty and
[migrate] no further migrations will run against it until that marker is cleared.
...
[migrate]   UPDATE schema_migrations SET version = 41, dirty = false;
```

Uma exceção: se a versão dirty for `1`, não há versão anterior para onde voltar. Rode `DELETE FROM schema_migrations;`, que limpa só a marca de migração e não mexe em nenhum dado da aplicação, e deixe o servidor rodar as migrações de novo desde o início. O servidor mostra essa variante automaticamente.

#### Correção: preso em dirty

Quando os logs do servidor informam `Dirty database version N. Fix and force version.`, o caminho mais simples é conectar direto ao Postgres, confirmar se o trabalho da migração chegou a ser gravado e então marcar a versão como limpa ou voltar um passo, para a migração rodar de novo. As migrações do PatchMon são escritas para serem idempotentes, então rodar de novo uma migração limpa é seguro.

O exemplo abaixo usa o caso dirty-30 da v2.0.2 (a migração `000030_v1-5-0_compliance_scan_dedup`, que cria o índice único parcial `idx_compliance_scans_host_profile_completed`). Troque pelo número de versão da sua própria linha de log.

##### 1. Conecte-se ao banco

**Script da comunidade (LXC no Proxmox, Postgres instalado direto no sistema):**

```bash
sudo -u postgres psql -d patchmon_db
```

**Docker:**

```bash
docker compose exec database psql -U patchmon_user -d patchmon_db
```

(Use o `POSTGRES_USER` / `POSTGRES_DB` definidos no seu `.env`. Os padrões são `patchmon_user` / `patchmon_db`. Atenção: o serviço no compose se chama `database`, não `postgres`.)

##### 2. Veja o que foi de fato migrado

```sql
-- Current migration state. Should show version=30, dirty=t
SELECT * FROM schema_migrations;

-- Did migration 30 finish creating its index?
SELECT indexname FROM pg_indexes
WHERE indexname = 'idx_compliance_scans_host_profile_completed';
```

##### 3. Escolha uma das opções

**A. O índice existe.** O trabalho da migração 30 já foi feito. É o caso mais comum, e a falha costuma ter sido uma oscilação de conexão depois que o DDL já tinha sido efetivado. Marque a linha como limpa e deixe as migrações seguirem a partir da 31:

```sql
UPDATE schema_migrations SET dirty = false WHERE version = 30;
```

**B. O índice NÃO existe.** A migração 30 caiu antes de o `CREATE INDEX` rodar. Volte a marca para 29 e deixe o PatchMon rodar a 30 de novo, limpa, no próximo boot:

```sql
UPDATE schema_migrations SET dirty = false, version = 29;
```

##### 4. Reinicie o PatchMon

Depois de atualizar a `schema_migrations`, saia do psql e reinicie:

- **Script da comunidade (LXC):** reinicie o contêiner, ou rode `sudo systemctl restart patchmon-server` e acompanhe o log com `sudo journalctl -u patchmon-server -f`.
- **Docker:** `docker compose down && docker compose up -d` e depois `docker compose logs -f server`.

Você deve ver as migrações avançarem por 31, 32, 33 e depois `server starting`.

#### Correção: preso em dirty 42 depois de atualizar para a v2.1.0

A v2.1.0 trouxe uma migração (`000042`) que falhou em algumas poucas instalações com:

```
cannot set path in scalar (22023)
```

Isso acontece quando a linha `host_down` em `alert_config` guarda o `metadata` como o valor JSON `null`, em vez de um objeto vazio, caso que a migração não previa. A migração é desfeita de forma limpa quando falha, então nada fica aplicado pela metade, mas o banco fica dirty em 42 e o servidor entra em laço de queda.

**Atualize antes para a v2.1.1 ou posterior.** A migração foi corrigida ali e trata esse valor corretamente. Voltar a versão na v2.1.0 só faz falhar do mesmo jeito no próximo boot.

Já na imagem corrigida, conecte-se ao banco como mostrado acima e volte um passo:

```sql
UPDATE schema_migrations SET version = 41, dirty = false;
```

Depois reinicie. A migração 42 roda de novo e dá certo.

> **Só marque uma migração como limpa** depois de confirmar que o esquema está de fato consistente. Forçar sobre um esquema inconsistente só esconde o problema até a próxima migração.

#### Correção: rodar as migrações manualmente

O servidor roda as migrações automaticamente na inicialização, então normalmente nunca é preciso rodá-las à mão.

A imagem Docker não traz uma ferramenta de migração separada. As migrações estão embutidas no binário do servidor e não há comando `migrate` dentro do contêiner; conduza-as reiniciando o servidor e lendo os logs, e examine ou ajuste o estado com SQL, como mostrado acima:

```sql
-- Show current version
SELECT * FROM schema_migrations;
```

Se você compila a partir do código-fonte, `make build-migrate` em `server-source-code/` gera uma CLI `migrate` independente, com `up`, `down`, `force VERSION` e `version`. Ela precisa de `DATABASE_URL` definida e não faz parte de nenhuma imagem publicada.

### 3. "Erro de CORS" no navegador

#### Sintomas

- O painel de rede das DevTools do navegador mostra `OPTIONS /api/v1/...` retornando 403/404 com `No 'Access-Control-Allow-Origin' header`.
- As requisições de login ou do assistente falham sem aviso.

#### Causa

`CORS_ORIGIN` não bate com a URL que o navegador do usuário está acessando. `CORS_ORIGIN` aceita uma única origem ou uma lista de origens separadas por vírgula (sem espaços entre elas), e cada uma precisa ser exatamente a origem que o navegador usa (protocolo + host + porta, sem caminho e sem barra no final). Divergências comuns:

- O `.env` tem `CORS_ORIGIN=http://localhost:3000`, mas os usuários acessam o PatchMon em `https://patchmon.example.com`.
- `CORS_ORIGIN=https://patchmon.example.com`, mas os usuários acessam por `https://patchmon.example.com:8443`.
- Barra no final de `CORS_ORIGIN` (`https://patchmon.example.com/`). Tire a barra.
- O PatchMon é acessado por mais de uma URL (por exemplo, um domínio externo e um endereço na LAN interna), mas só uma está na lista.

#### Correção

Defina `CORS_ORIGIN` com a **origem exata** que o navegador usa (protocolo + host + porta, sem caminho e sem barra no final):

```
# .env
CORS_ORIGIN=https://patchmon.example.com
```

Para várias origens permitidas (por exemplo, homologação e produção compartilhando um banco durante uma migração, ou usuários que chegam ao PatchMon por uma URL externa e outra interna), separe por vírgula, sem espaços entre elas:

```
CORS_ORIGIN=https://patchmon.example.com,https://staging.patchmon.example.com
```

Depois reinicie o servidor:

```bash
docker compose restart server
```

> **Exige reinício do servidor.** A interface Settings marca `CORS_ORIGIN` como "Requires a server restart to take effect".

#### Alternativa: interface Settings

Também dá para definir `CORS_ORIGIN` em **Settings → Server → CORS_ORIGIN**, pela interface. Se a variável de ambiente e o valor da interface estiverem definidos, o env vence e a interface mostra a marca "Conflict". Escolha uma única fonte de verdade.

### 4. O agente não consegue se conectar por WebSocket

#### Sintomas

- Os agentes fazem check-in pelos relatórios HTTP (o indicador **Reporting** está verde), mas o indicador **WS** fica vermelho na lista de hosts.
- O log do agente mostra `websocket: bad handshake` repetido ou laços de reconexão.
- A tela "Waiting for Connection", depois do registro, passa de **Waiting** para **Connected** devagar ou nunca.

#### Causa

O agente abre um WebSocket em `GET /api/v1/agents/ws` com `Upgrade: websocket` / `Connection: Upgrade`. Se o seu proxy reverso **não repassa esses cabeçalhos**, o handshake de upgrade falha e a conexão cai para HTTP, que o agente então derruba.

#### Correção: Nginx

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;

    # Required for WebSocket upgrade
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection $connection_upgrade;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Don't time out long-lived connections (WS, SSE, patching streams)
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}

# Top of the config:
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

#### Correção: Traefik

O Traefik repassa os cabeçalhos necessários por padrão, e normalmente não é preciso configuração extra. Se você tem um middleware `headers` personalizado, confira se ele não tira `Upgrade` / `Connection`.

#### Correção: Caddy

```caddyfile
patchmon.example.com {
    reverse_proxy 127.0.0.1:3000
    # Caddy auto-handles WebSocket upgrades -- nothing extra needed.
}
```

#### Correção: Cloudflare

O plano gratuito da Cloudflare suporta WebSocket, mas confira no painel: **Network → WebSockets → On**.

#### Confira a correção

No host do servidor (não no host do agente), isto deve retornar `101 Switching Protocols`:

```bash
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: $(openssl rand -base64 16)" \
  https://patchmon.example.com/api/v1/agents/ws?apiId=dummy
```

Se aparecer `101`, o proxy está repassando o handshake. Aqui, um `4xx` vindo de `/api/v1/agents/ws` também serve: o agente usa credenciais reais, e o que importa é que o proxy não atrapalhou a tentativa de upgrade.

#### O `X-Forwarded-Proto` importa

Defina `X-Forwarded-Proto $scheme` (Nginx) ou o equivalente nos outros proxies. O PatchMon usa a configuração de ambiente `TRUST_PROXY=true` para ler esse cabeçalho quando ele vem. Sem ele, o servidor pode achar que está servindo por HTTP e emitir cookies `Secure` que o navegador depois se recusa a enviar.

### 5. 502 Bad Gateway vindo do proxy reverso

#### Sintomas

- O navegador mostra `502 Bad Gateway` ou `503 Service Unavailable`.
- O log do Nginx mostra `upstream prematurely closed connection` ou `connect() failed (111: Connection refused)`.

#### Diagnóstico

```bash
# 1. Is the server container up?
docker compose ps server

# 2. Is it healthy?
curl http://localhost:3000/health

# 3. Can the reverse proxy reach the container?
#    From the reverse-proxy host:
curl -v http://<server-host>:3000/health
```

#### Correções comuns

- **Contêiner parado**: `docker compose up -d server`.
- **Health check falhando**: siga **1. O contêiner não inicia**, acima.
- **Porta do upstream errada**: o padrão é `3000`. Se você mudou `PORT` no `.env`, ajuste a configuração do proxy reverso para bater.
- **Firewall bloqueando a 3000**: se o proxy reverso está em outro host, libere o TCP/3000 entre eles, ou ligue o contêiner a um socket UNIX / interface privada.
- **Tolerância do health check curta demais**: em armazenamento lento, o Postgres pode levar de 20 a 60 s para ficar saudável no primeiro boot. Aumente o `start_period` do health check do `database` e do `redis`, ou simplesmente espere.

### 6. Redis: conexão recusada / NOAUTH

#### Sintomas

```
redis: dial tcp redis:6379: connect: connection refused
```

ou

```
redis: NOAUTH Authentication required.
```

#### Causa

- **Conexão recusada**: o contêiner `redis` não está rodando ou caiu.
- **NOAUTH**: o servidor se conecta sem senha (ou com a senha errada), e o Redis exige uma.

#### Correção

O `docker-compose.yml` inicia o Redis com:

```yaml
redis:
  command: redis-server --requirepass ${REDIS_PASSWORD}
```

O servidor e o Redis leem o `REDIS_PASSWORD` do mesmo `.env`. Se você mudá-lo, **reinicie os dois**:

```bash
docker compose up -d redis server
```

Confira de dentro da rede:

```bash
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping
# expected: PONG
```

Confira se o servidor enxerga a senha certa:

```bash
docker compose exec server env | grep REDIS_
```

> Se o `REDIS_PASSWORD` tiver caracteres especiais do shell (`$`, `!`, espaço), o Docker Compose pode interpretar as aspas errado. Use só letras e números + `-_` na senha, ou coloque-a entre aspas simples no `.env`.

### 7. Erros de upload / limite de corpo

#### Sintomas

- Os relatórios do agente falham com HTTP 413 `Request Entity Too Large`.
- Páginas da interface com tabelas muito grandes (inventário Docker enorme, milhares de pacotes) retornam 413 ao salvar.

#### Causa

O PatchMon limita o tamanho dos corpos JSON das requisições para se proteger contra esgotamento de memória. Estes limites se aplicam:

| Variável | Padrão | O que limita |
|---------|---------|---------------|
| `JSON_BODY_LIMIT` | `5` (MB) | Todos os endpoints JSON que não são do agente (API da interface, configurações etc.). |
| `AGENT_UPDATE_BODY_LIMIT` | `5` (MB) | Só `POST /api/v1/hosts/update`: o payload do relatório do agente. |
| `COMPLIANCE_BODY_LIMIT` | `20` (MB) | Só `POST /api/v1/compliance/scans`: resultados do OpenSCAP e do Docker Bench. |
| `AGENT_PING_BODY_LIMIT` | `8` (KB) | Só `POST /api/v1/hosts/ping`. |

Um valor sem sufixo é lido em **megabytes**, exceto em `AGENT_PING_BODY_LIMIT`, em que é lido em kilobytes. Também dá para escrever a unidade explicitamente, por exemplo `20mb`.

Nenhum limite pode passar de **32 MB**. Um valor maior é reduzido a 32 MB, e não recusado, então uma configuração existente continua funcionando depois de uma atualização. Um valor que não seja um número positivo (em branco, zero, negativo ou que nem seja um tamanho) é ignorado, e vale o padrão. O teto de 32 MB existe porque o servidor roda com limite de 256 MB de memória, e uma única requisição ocupa várias vezes o próprio tamanho depois de decodificada.

Um host com milhares de pacotes + Docker pode passar do padrão de 5 MB do relatório do agente. A conformidade é a causa mais comum de estouro: um perfil OpenSCAP de 900 regras carrega cerca de 14 KB de texto de descrição e correção por regra, então os resultados passam folgados de 10 MB, e um único envio pode trazer uma varredura OpenSCAP e uma do Docker Bench juntas. Quando o limite atingido é o de conformidade, o log do agente diz isso:

```
compliance data request failed with status 413: Scan results exceed the 20mb COMPLIANCE_BODY_LIMIT...
```

#### Correção

Aumente os limites no `.env`:

```
JSON_BODY_LIMIT=10
AGENT_UPDATE_BODY_LIMIT=8
COMPLIANCE_BODY_LIMIT=32
```

`32` é o maior valor aceito. Os quatro também podem ser editados em **Settings > Environment**, na interface web, o que vale sem reinício.

Reinicie:

```bash
docker compose restart server
```

Se o PatchMon está atrás de um Nginx, aumente também o limite dele; caso contrário, o Nginx responde 413 antes de o servidor ver o corpo. Ele precisa ser pelo menos tão grande quanto o maior limite do PatchMon:

```nginx
client_max_body_size 40m;
```

### 8. Consultas lentas / pressão no banco

#### Sintomas

- As respostas da API ficam lentas à medida que o número de hosts cresce.
- O uso de CPU do contêiner do Postgres fica perto de 100% o tempo todo.
- Os logs do servidor mostram `context deadline exceeded` nas chamadas ao banco.

#### Diagnóstico

```bash
# Postgres activity
docker compose exec database psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT pid, state, wait_event, query_start, substr(query, 1, 120) FROM pg_stat_activity WHERE state != 'idle';"

# Check pool stats (from the server's perspective, via health+metrics if enabled)
curl -H 'Accept: application/json' http://localhost:3000/health
```

#### Correções comuns

Ajuste o pool e os tempos limite relacionados no `.env`:

| Variável | Padrão | Quando ajustar |
|---------|---------|---------------|
| `DB_CONNECTION_LIMIT` | `30` | Suba para `60`-`100` com mais de 1000 hosts. O padrão do Postgres é 100; não passe disso sem aumentar o `max_connections` do Postgres. |
| `DB_POOL_TIMEOUT` | `20` (s) | Aumente se aparecer "timeout acquiring connection" em picos de carga. |
| `DB_IDLE_TIMEOUT` | `300` (s) | Quanto tempo as conexões ociosas ficam no pool. |
| `DB_MAX_LIFETIME` | `1800` (s) | Teto rígido por conexão. Útil com balanceadores de carga que reiniciam conexões TCP ociosas. |

A referência completa de variáveis de ambiente está na seção de configuração da documentação principal de administração.

Se o problema continuar, ative o log de requisições (`ENABLE_LOGGING=true`, `LOG_LEVEL=debug`) por um curto período, para descobrir qual endpoint está sobrecarregado.

### 9. Administrador trancado do lado de fora

#### Situação

Você é o único superadmin e:

- Esqueceu a senha e desativou os fluxos de "Forgot password", ou
- Perdeu o acesso ao dispositivo de TFA e aos códigos de backup, ou
- Ativou `OIDC_DISABLE_LOCAL_AUTH=true` e o seu IdP agora está quebrado.

#### Não há redefinição embutida na CLI

O PatchMon **não** traz subcomando de CLI para redefinir senhas de administrador nem limpar o TFA. O binário do servidor é um único daemon (`patchmon-server`) sem subcomandos, e o binário separado `migrate` só suporta `up`, `down`, `force V` e `version`. O projeto é intencional: toda a gestão de usuários passa pela interface web.

O contorno é alterar o banco diretamente.

#### Contorno: redefinir a senha pelo `psql`

Etapa 1: gere um hash bcrypt da senha que quer definir. O PatchMon guarda as senhas com bcrypt de custo 10 (igual à implementação antiga em Node.js). Qualquer linguagem serve:

```bash
# With htpasswd (from apache2-utils / httpd-tools)
htpasswd -bnBC 10 "" 'new-password-here' | tr -d ':\n'
# prints something like: $2y$10$...

# Or with Python (bcrypt library)
python3 -c 'import bcrypt; print(bcrypt.hashpw(b"new-password-here", bcrypt.gensalt(10)).decode())'
```

Observação: o bcrypt produz hashes que começam com `$2a$10$`, `$2b$10$` ou `$2y$10$`; os três são compatíveis.

Etapa 2: conecte-se ao Postgres e atualize a linha do usuário:

```bash
docker compose exec database psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

```sql
-- See what accounts exist
SELECT id, username, email, role, is_active FROM users ORDER BY created_at;

-- Reset the password hash. Replace <bcrypt-hash> with the output from step 1.
-- Keep the single quotes and escape the hash's $ signs if your shell interprets them.
UPDATE users
SET password_hash = '<bcrypt-hash>', updated_at = NOW()
WHERE username = 'admin';

-- Confirm
SELECT username, role, is_active, updated_at FROM users WHERE username = 'admin';

\q
```

Etapa 3: entre com a nova senha e troque as credenciais logo em seguida pela interface (Profile → Change password), para confirmar que o fluxo funciona; registre o TFA de novo, se necessário.

#### Contorno: desbloquear uma conta bloqueada

Depois de muitas falhas de login, as contas ficam bloqueadas por `LOCKOUT_DURATION_MINUTES` (padrão de 15). Para liberar na hora:

```sql
UPDATE users
SET failed_login_attempts = 0, locked_until = NULL
WHERE username = 'admin';
```

#### Contorno: desativar o TFA de uma conta

```sql
UPDATE users
SET tfa_enabled = false, tfa_secret = NULL, tfa_backup_codes = NULL
WHERE username = 'admin';
```

O usuário pode registrar o TFA de novo depois de entrar.

#### Contorno: reativar o login local quando o OIDC está quebrado

Se o `OIDC_DISABLE_LOCAL_AUTH=true` está bloqueando você, edite o `.env`:

```
OIDC_DISABLE_LOCAL_AUTH=false
```

depois:

```bash
docker compose restart server
```

Entre com as credenciais locais, corrija a configuração do OIDC e volte a opção.

> **Faça sempre backup do banco antes de rodar comandos `UPDATE`.** `docker compose exec database pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > patchmon-backup-$(date +%F).sql`.

### 10. Referência rápida: o que reiniciar em cada caso

| Mudança | O que reiniciar |
|--------|-----------------|
| `DATABASE_URL`, `REDIS_*`, `JWT_SECRET`, `SESSION_SECRET` | `docker compose restart server` |
| `CORS_ORIGIN`, `TRUST_PROXY`, `ENABLE_HSTS` | `docker compose restart server` |
| `JSON_BODY_LIMIT`, `AGENT_UPDATE_BODY_LIMIT`, `COMPLIANCE_BODY_LIMIT`, `AGENT_PING_BODY_LIMIT` | `docker compose restart server` |
| `OIDC_*` | `docker compose restart server` |
| Mudança de configuração do Postgres (`postgresql.conf` próprio) | `docker compose restart database` (e espere ficar saudável) |
| Troca de senha do Redis | `docker compose up -d redis server` (os dois) |
| Configuração do proxy reverso | Recarregue o proxy reverso (`nginx -s reload`; no Traefik é ao vivo etc.) |
| Binário do agente recompilado e colocado em `AGENT_BINARIES_DIR` | Nada. Os agentes pegam no próximo `check-version`. |

### Veja também

- [Solução de problemas do agente](#agent-troubleshooting): árvore de decisão para problemas do lado do agente.
- [Gerenciando o agente do PatchMon](#managing-the-patchmon-agent): CLI, serviço, logs, atualização e remoção.
- [Instalando o agente do PatchMon](#installing-the-patchmon-agent): passo a passo do registro.
- [Referência de configuração do agente (config.yml)](#agent-config-yml-reference): todos os parâmetros de configuração do agente.

---

## Capítulo 13: Solução de problemas do agente {#agent-troubleshooting}

### Visão geral

Este capítulo é uma **árvore de decisão de consulta rápida** para os sintomas mais comuns do agente do PatchMon. Cada item aponta para os passos detalhados em [Gerenciando o agente do PatchMon: solução de problemas comuns](#common-troubleshooting) ou em outra seção pertinente. Use esta página para a triagem e depois siga a seção indicada para a correção completa.

Se o problema está do lado do **servidor** (contêiner caindo, migrações do banco, CORS, proxy reverso), vá para [Solução de problemas do servidor](#server-troubleshooting).

#### A triagem de 30 segundos

Antes de tudo, rode estes três comandos no host afetado:

```bash
sudo patchmon-agent diagnostics    # full picture in one shot
sudo systemctl status patchmon-agent    # (or: rc-service patchmon-agent status)
sudo journalctl -u patchmon-agent -n 50 --no-pager    # (or: tail -n 50 /etc/patchmon/logs/patchmon-agent.log)
```

No Windows (PowerShell elevado):

```powershell
patchmon-agent diagnostics
Get-Service PatchMonAgent
Get-Content 'C:\ProgramData\PatchMon\patchmon-agent.log' -Tail 50
```

A saída de `diagnostics` inclui informações do sistema, estado da configuração, alcance de rede, validade das credenciais e as 10 últimas linhas de log. Na maioria dos casos, ela já diz qual parte está quebrada. Detalhes completos: [Gerenciando o agente do PatchMon: `diagnostics`](#diagnostics--full-system-diagnostics).

### Árvore de decisão

#### Sintoma → causa provável → onde olhar

| Sintoma | Causa provável | Vá para |
|---------|--------------|---------|
| O host aparece como **Pending** na interface e nunca passa para Active | O agente não está rodando, ou o primeiro relatório nunca chegou | [O host aparece como Pending](#host-shows-pending) |
| O indicador **WS** do host está vermelho na interface | O WebSocket está fora além do limite de `host_down` (o serviço caiu ou a rede caiu) | [O indicador WS do host está vermelho](#host-ws-pill-is-red) |
| O indicador **Reporting** do host está vermelho ("Stale") | O agente não mandou relatórios *e* o WebSocket está desconectado; o host pode estar fora do ar ou inalcançável | [O indicador Reporting do host está desatualizado](#host-reporting-pill-is-stale) |
| O agente **não inicia** | `config.yml` com problema, credenciais erradas, problema de porta ou de permissão | [O agente não inicia](#agent-wont-start) |
| O agente **não alcança o servidor**: falha de DNS | A resolução de DNS no host está quebrada | [Não alcança o servidor: DNS](#cannot-reach-server--dns) |
| O agente **não alcança o servidor**: TLS / certificado | CA não confiável ou certificado inválido | [Não alcança o servidor: TLS](#cannot-reach-server--tls) |
| O agente **não alcança o servidor**: firewall | Saída na porta 443 bloqueada | [Não alcança o servidor: firewall](#cannot-reach-server--firewall) |
| O intervalo de relatório **não atualiza** | O agente usa o intervalo guardado; a sincronização com o servidor ainda não terminou | [O intervalo de relatório não atualiza](#report-interval-not-updating) |
| A atualização automática **falha** | Hash divergente, erro de SSL no download ou espera de prevenção de laço de atualização | [A atualização automática falha](#auto-update-failing) |
| O `credentials.yml` está **ausente ou corrompido** | Arquivo apagado, permissões erradas ou sintaxe YAML quebrada | [Arquivo de credenciais ausente ou corrompido](#credentials-file-missing-or-corrupt) |
| O agente roda, mas **os logs não são gravados** | Caminho errado, problema de permissão ou disco cheio | [Os logs não são gravados](#logs-not-being-written) |
| O serviço **fica reiniciando** em laço | Erro de configuração ou servidor inalcançável com `Restart=always` | [O serviço fica reiniciando](#service-keeps-restarting) |
| `Permission denied` em todo comando | Rodando sem `sudo` / Administrator | [Permissão negada](#permission-denied) |

---

### O host aparece como Pending {#host-shows-pending}

O registro do host foi criado, mas o agente ainda não mandou o primeiro relatório.

**Verificações rápidas:**

```bash
sudo systemctl status patchmon-agent
sudo patchmon-agent ping
sudo patchmon-agent report      # force an immediate report
```

**Se o `ping` falhar**, veja [Não alcança o servidor: DNS](#cannot-reach-server--dns), [TLS](#cannot-reach-server--tls) ou [firewall](#cannot-reach-server--firewall).

**Se o `ping` funcionar mas o host continuar Pending**, o agente ainda não mandou nenhum relatório. Rode `sudo patchmon-agent report` e acompanhe `journalctl -u patchmon-agent -f` para ver erros durante o envio. Uma causa comum é `413 Request Entity Too Large`. Veja [Solução de problemas do servidor: erros de upload / limite de corpo](#server-troubleshooting).

**Detalhes completos:** [Gerenciando o agente do PatchMon: o agente aparece como "Pending" no PatchMon](#agent-shows-pending-in-patchmon).

### O indicador WS do host está vermelho {#host-ws-pill-is-red}

O host já mandou pelo menos um relatório, mas o WebSocket dele está desconectado há mais tempo que o limite de `host_down` (padrão de 30 segundos, configurável em **Reporting → Alert Lifecycle**). O host pode continuar vivo; olhe o indicador **Reporting**: se estiver verde, o agente está mandando relatórios HTTP normalmente e só o canal de controle em tempo real está indisponível.

**Verificações rápidas:**

```bash
sudo systemctl is-active patchmon-agent    # should print "active"
sudo journalctl -u patchmon-agent -n 50 --no-pager
```

**Causas comuns:**

- **Serviço parado ou caído**: rode `sudo systemctl restart patchmon-agent` e acompanhe os logs para ver o erro de fundo.
- **Proxy reverso sem repassar os cabeçalhos de upgrade do WebSocket**: veja [Solução de problemas do servidor: o agente não consegue se conectar por WebSocket](#server-troubleshooting).
- **NAT / balanceador de carga encerrando conexões ociosas**: aumente o tempo limite de ociosidade do proxy para pelo menos 65 s. O agente manda pings de WebSocket a cada 30 s.
- **Oscilação passageira de rede**: o agente reconecta sozinho, com espera exponencial. Espere 60 s e confira de novo. O indicador WS fica âmbar durante a janela de tolerância e depois vermelho.

**Detalhes completos:** [Gerenciando o agente do PatchMon: o indicador WS do agente está vermelho no PatchMon](#agents-ws-pill-is-red-in-patchmon).

### O indicador Reporting do host está desatualizado {#host-reporting-pill-is-stale}

O agente não mandou um relatório HTTP dentro do intervalo de atualização **e** o WebSocket também está desconectado. É o sinal mais forte de que o host está realmente inalcançável (e não só sem o canal em tempo real).

**Verificações rápidas:**

```bash
# From the affected host (if you can reach it):
sudo systemctl status patchmon-agent
sudo patchmon-agent ping
sudo patchmon-agent report       # force an immediate report

# From another host:
ping <host-ip>
ssh <host>                       # confirm host is alive
```

**Causas comuns:**

- **O host está mesmo fora do ar** (desligado, kernel panic, falha de hardware). Verifique o console / o hypervisor.
- **Partição de rede** entre o host e o servidor do PatchMon. Confira se a saída HTTPS para a URL do servidor ainda funciona.
- **O serviço do agente parou sem avisar a desconexão do WebSocket** (por exemplo, o host foi suspenso). Rode `sudo systemctl restart patchmon-agent` assim que ele estiver alcançável.

Se o host *está* online e o indicador **Reporting** está vermelho junto com o WS, rode `sudo patchmon-agent report` para mandar um relatório novo, e o indicador deve voltar a verde.

### O agente não inicia {#agent-wont-start}

O serviço sai na hora ou nunca fica rodando.

**Diagnostique rodando o agente em primeiro plano, com logs de depuração:**

```bash
sudo systemctl stop patchmon-agent
sudo patchmon-agent serve --log-level debug
# (Ctrl+C to stop; then: sudo systemctl start patchmon-agent)
```

**Causas comuns:**

- **`config.yml` com problema**: erro de sintaxe YAML. Valide com `yq e . /etc/patchmon/config.yml` ou reinstale para gerar os padrões de novo.
- **Falta do `credentials.yml`**: veja [Arquivo de credenciais ausente ou corrompido](#credentials-file-missing-or-corrupt).
- **URL `patchmon_server` inválida**: precisa começar com `http://` ou `https://`, sem barra no final.
- **Conflito de porta (raro)**: o agente em si não escuta em nenhuma porta, mas, se você ativou a integração de proxy SSH com uma porta local fixa, confira com `ss -lntp | grep patchmon`.
- **Binário da arquitetura errada**: compare `file /usr/local/bin/patchmon-agent` com `uname -m`. Se não baterem, reinstale pela interface para baixar o binário certo.

**Detalhes completos:** [Gerenciando o agente do PatchMon: testes e diagnóstico](#testing-and-diagnostics) e [Investigando um problema](#debugging-a-problem).

### Não alcança o servidor: DNS {#cannot-reach-server--dns}

O log ou a saída do `ping` mostra `no such host`, `dial tcp: lookup <hostname>` ou `server misbehaving`.

**Diagnóstico:**

```bash
nslookup patchmon.example.com
# or
dig +short patchmon.example.com
```

**Correção:**

- Se a resolução de DNS falha, corrija o `/etc/resolv.conf` ou os seus registros de DNS internos.
- Dentro de contêineres (Docker/LXC/Kubernetes): confira se o resolvedor de DNS do contêiner alcança o seu DNS interno.
- Se você usa uma entrada no `/etc/hosts`, confira se ela bate com a URL em `/etc/patchmon/config.yml`.

**Detalhes completos:** [Gerenciando o agente do PatchMon: "Connectivity Test Failed"](#connectivity-test-failed).

### Não alcança o servidor: TLS {#cannot-reach-server--tls}

O log mostra `x509: certificate signed by unknown authority`, `tls: failed to verify certificate` ou (no Windows) `Could not establish trust relationship for the SSL/TLS secure channel`.

**Correção preferível: instale a CA no repositório de confiança do sistema:**

- **Debian/Ubuntu:** copie a CA para `/usr/local/share/ca-certificates/` (precisa ter a extensão `.crt`) e rode `sudo update-ca-certificates`.
- **RHEL/Rocky/Fedora:** copie a CA para `/etc/pki/ca-trust/source/anchors/` e rode `sudo update-ca-trust`.
- **Alpine:** `sudo apk add ca-certificates` e depois o mesmo que no Debian.
- **Windows:** importe pelo `certlm.msc` em **Local Computer → Trusted Root Certification Authorities**.

**Contorno rápido (só em laboratório):** defina `skip_ssl_verify: true` em `/etc/patchmon/config.yml` e reinicie o serviço, ou defina a variável de ambiente `PATCHMON_SKIP_SSL_VERIFY=true`.

> **Não** ative `skip_ssl_verify` em produção. Ela desativa por completo a verificação de TLS. Veja o aviso em [Gerenciando o agente do PatchMon: erros de certificado SSL](#ssl-certificate-errors).

**Detalhes completos:** [Gerenciando o agente do PatchMon: erros de certificado SSL](#ssl-certificate-errors).

### Não alcança o servidor: firewall {#cannot-reach-server--firewall}

O `ping` informa "connectivity test failed", mas DNS e TLS estão certos. Normalmente aparece `i/o timeout` ou `connection refused`.

**Diagnóstico:**

```bash
# TCP reachability on 443
timeout 5 bash -c "</dev/tcp/patchmon.example.com/443" && echo open || echo blocked
# or:
nc -vz patchmon.example.com 443
```

**Correção:**

- Libere a saída TCP/443 (ou a porta que o seu proxy reverso usa) para o servidor do PatchMon no firewall de saída do host ou da rede.
- Se o host estiver atrás de um proxy HTTP de saída, defina `HTTPS_PROXY` e `HTTP_PROXY` no ambiente do agente. No systemd, acrescente-as como linhas `Environment=` num drop-in em `/etc/systemd/system/patchmon-agent.service.d/proxy.conf`:

  ```ini
  [Service]
  Environment="HTTPS_PROXY=http://proxy.corp:3128"
  Environment="HTTP_PROXY=http://proxy.corp:3128"
  Environment="NO_PROXY=localhost,127.0.0.1"
  ```

  e depois rode `sudo systemctl daemon-reload && sudo systemctl restart patchmon-agent`.

**Detalhes completos:** [Gerenciando o agente do PatchMon: "Connectivity Test Failed"](#connectivity-test-failed).

### O intervalo de relatório não atualiza {#report-interval-not-updating}

Você mudou o intervalo de relatório em **Settings → Agent Updates**, mas o host afetado continua reportando no horário antigo.

**Contexto:** o servidor envia as mudanças de `update_interval` aos agentes conectados pelo WebSocket. Se o WebSocket estiver fora, ou se a mudança foi feita pouco antes de um reinício, o agente pode estar rodando com o valor guardado em `/etc/patchmon/config.yml`.

**Correção:**

```bash
# 1. Verify the WebSocket is up (host shows as Online in the UI)
# 2. Restart the agent so it fetches fresh values on startup
sudo systemctl restart patchmon-agent

# 3. Check the value the agent sees
sudo patchmon-agent config show | grep -i interval
```

O agente sincroniza `update_interval`, `docker_enabled` e `compliance_enabled` com o servidor na inicialização e a cada mudança de configuração enviada pelo WebSocket, e grava o resultado de volta no `config.yml`. Normalmente não é preciso reiniciar para a sincronização em tempo de execução; o reinício só é necessário para a sincronização da primeira inicialização.

**Detalhes completos:** [Gerenciando o agente do PatchMon: gerenciamento da configuração](#configuration-management) (veja a tabela "Quando as mudanças exigem reinício?").

### A atualização automática falha {#auto-update-failing}

O log do agente mostra `update failed`, `hash mismatch`, `binary verification failed` ou `update was performed X ago, skipping`.

**Diagnóstico:**

```bash
sudo patchmon-agent --version
sudo patchmon-agent check-version
ls -la /etc/patchmon/.last_update_timestamp
ls -la /usr/local/bin/patchmon-agent.backup.*
```

**Causas comuns:**

- **Espera de prevenção de laço**: o agente se recusa a se atualizar de novo em menos de 5 minutos desde a última tentativa. Espere 5 minutos.
- **O servidor não publicou um binário novo**: confira no servidor se o arquivo em `AGENT_BINARIES_DIR` (ou `AGENTS_DIR`) é da arquitetura esperada.
- **Hash divergente**: o servidor precisa mandar um hash SHA-256 do binário. Se não mandar, o agente se recusa a instalar (isso é obrigatório por segurança, não é bug). Atualize o servidor para uma versão que forneça os hashes.
- **Erro de SSL no download**: trate como [Não alcança o servidor: TLS](#cannot-reach-server--tls). O `skip_ssl_verify` é **explicitamente bloqueado** para download de binários em produção; corrija a confiança no certificado.
- **Atualização automática desativada**: `patchmon-agent check-version` vai dizer `Auto-update disabled by server administrator`. Ative em **Settings → Agent Updates → Master auto-update** e na chave por host, na página de detalhes do host.

**Forçar manualmente:**

```bash
sudo patchmon-agent update-agent
```

**Detalhes completos:** [Gerenciando o agente do PatchMon: atualizações do agente](#agent-updates) e [O agente não se atualiza sozinho](#agent-not-auto-updating).

### Arquivo de credenciais ausente ou corrompido {#credentials-file-missing-or-corrupt}

O log mostra `credentials file not found`, `failed to load credentials` ou `API credentials are missing`.

**Diagnóstico:**

```bash
ls -la /etc/patchmon/credentials.yml
# expected: -rw------- 1 root root  ~120  <date>  /etc/patchmon/credentials.yml

sudo cat /etc/patchmon/credentials.yml
# expected:
#   api_id: "patchmon_abc123"
#   api_key: "<64 hex chars>"
```

**Se o arquivo não existir:**

```bash
# Reconfigure using the credentials shown at enrolment time.
# If you don't have them, regenerate from the UI:
#   Hosts -> <host> -> Show Credentials -> Regenerate
sudo patchmon-agent config set-api <API_ID> <API_KEY> <SERVER_URL>
```

**Se o arquivo existir mas as permissões estiverem erradas:**

```bash
sudo chmod 600 /etc/patchmon/credentials.yml
sudo chown root:root /etc/patchmon/credentials.yml
```

**Se o YAML estiver malformado** (por exemplo, editado à mão e quebrado), restaure o backup mais recente (`ls -la /etc/patchmon/credentials.yml.backup.*`) ou rode `config set-api` de novo.

**Detalhes completos:** [Gerenciando o agente do PatchMon: "Credentials File Not Found"](#credentials-file-not-found) e [`config set-api`](#config-set-api--configure-credentials).

### Os logs não são gravados {#logs-not-being-written}

O agente está rodando, mas `/etc/patchmon/logs/patchmon-agent.log` está vazio ou não existe.

**Diagnóstico:**

```bash
# Does the directory exist and is it writable by root?
ls -la /etc/patchmon/logs/
# expected: drwx------ 2 root root ...

# Check disk space
df -h /etc/patchmon
```

**Causas comuns:**

- **Falta o diretório de log**: `sudo mkdir -p /etc/patchmon/logs && sudo chmod 700 /etc/patchmon/logs`.
- **`log_file` aponta para outro lugar**: rode `sudo patchmon-agent config show` e confira o caminho.
- **Disco cheio**: `df -h`. Libere espaço ou aponte o `log_file` para outra partição.
- **Rodando com o usuário errado** (instalação fora do padrão): o agente precisa rodar como root. Veja [Permissão negada](#permission-denied).
- **Log só no systemd**: no systemd, o agente grava tanto no journal quanto no arquivo. Se o arquivo estiver vazio mas `journalctl -u patchmon-agent` tiver entradas, o arquivo pode estar sendo rotacionado normalmente. Procure backups `.log.gz`.

O agente usa rotação de log embutida (10 MB por arquivo, 5 backups, retenção de 14 dias). **Não** é preciso logrotate.

**Detalhes completos:** [Gerenciando o agente do PatchMon: vendo os logs](#viewing-logs).

### O serviço fica reiniciando

`systemctl status patchmon-agent` mostra `activating (auto-restart)` repetidamente, ou o número de processos só cresce.

**Diagnóstico:**

```bash
sudo systemctl status patchmon-agent
sudo journalctl -u patchmon-agent --since "15 minutes ago" --no-pager
```

**Causas comuns:**

- **`config.yml` inválido** (erro de sintaxe YAML): o agente se recusa a iniciar, e o systemd o reinicia a cada 10 s.
- **Credenciais inválidas**: o agente registra "invalid API credentials" e sai.
- **Servidor inalcançável por muito tempo**: o agente continua tentando (na operação normal, ele **não** sai por erro de rede), então reinícios constantes apontam para uma das duas causas acima.
- **Queda do binário**: procure no `dmesg` mortes por falta de memória (OOM) ou segfaults: `sudo dmesg -T | grep -i patchmon`.

A unit do systemd usa `Restart=always` com `RestartSec=10`, o que é correto em produção, mas esconde laços de queda. Desative o reinício automático temporariamente para ver o erro real:

```bash
sudo systemctl edit patchmon-agent --force --full
# change: Restart=always  ->  Restart=no
sudo systemctl daemon-reload
sudo systemctl start patchmon-agent
# read the single run's output, then revert:
sudo systemctl edit patchmon-agent --force --full    # restore Restart=always
sudo systemctl daemon-reload
```

**Detalhes completos:** [Gerenciando o agente do PatchMon: o serviço fica reiniciando](#service-keeps-restarting).

### Permissão negada {#permission-denied}

Qualquer comando do agente sai na hora com `permission denied` ou `this script must be run as root`.

**Correção:**

- **Linux / FreeBSD:** use `sudo`. O agente lê os bancos de dados de pacotes, grava em `/etc/patchmon/` e gerencia o serviço do sistema; nada disso funciona sem root.
- **Windows:** abra o PowerShell com **Executar como administrador**. Um PowerShell sem elevação não consegue ler o inventário de pacotes instalados nem gerenciar o serviço `PatchMonAgent`.

Se você é root e ainda assim vê erros de permissão, confira o dono dos arquivos:

```bash
ls -la /etc/patchmon/config.yml /etc/patchmon/credentials.yml /usr/local/bin/patchmon-agent
# All three should be owned by root.
```

**Detalhes completos:** [Gerenciando o agente do PatchMon: erros "Permission Denied"](#permission-denied-errors).

### Escalonamento

Se nada na árvore de decisão acima corresponde ao seu sintoma, junte o seguinte antes de pedir ajuda:

```bash
# Everything in one command
sudo patchmon-agent diagnostics > /tmp/patchmon-diag.txt 2>&1
sudo journalctl -u patchmon-agent --since "1 hour ago" --no-pager \
  > /tmp/patchmon-journal.txt 2>&1
sudo tail -n 200 /etc/patchmon/logs/patchmon-agent.log \
  > /tmp/patchmon-log.txt 2>&1
sudo patchmon-agent config show > /tmp/patchmon-config.txt 2>&1
sudo patchmon-agent --version >> /tmp/patchmon-config.txt
uname -a >> /tmp/patchmon-config.txt
```

Oculte o `api_id` antes de compartilhar o pacote publicamente. O `api_id` completo é sensível, mesmo que o `config show` não mostre o hash da chave.

### Veja também

- [Gerenciando o agente do PatchMon](#managing-the-patchmon-agent): referência completa de CLI, serviço, logs e remoção.
- [Gerenciando o agente do PatchMon: solução de problemas comuns](#common-troubleshooting): a contraparte detalhada desta árvore de decisão.
- [Referência de configuração do agente (config.yml)](#agent-config-yml-reference): todos os parâmetros de configuração.
- [Instalando o agente do PatchMon](#installing-the-patchmon-agent): passo a passo do registro.
- [Desinstalando o agente do PatchMon](#uninstalling-the-patchmon-agent): passo a passo da remoção.
- [Solução de problemas do servidor](#server-troubleshooting): para problemas do lado do servidor.

---

## Capítulo 14: Erros no painel depois de uma atualização do Proxmox Community {#errors-on-dashboard-after-proxmox-community-update}

> **Observação:** isto só vale para **versões 1.x anteriores à 1.4.2**. Não se aplica à 2.0.

### Sintoma

Depois de atualizar pelos scripts da comunidade do Proxmox, o painel do PatchMon mostra erros como "network error" ou parecidos. A interface carrega, mas não consegue falar com o backend.

### Causa

A causa é uma variável `VITE_API_URL` desatualizada no arquivo de ambiente do frontend (`frontend/.env`). O frontend compilado embute essa URL e, em tempo de execução, não alcança mais o backend.

### Correção

1. Abra o arquivo de ambiente do frontend:

   ```bash
   sudo nano /opt/<your-domain>/frontend/.env
   ```

2. **Remova** ou comente a linha:

   ```
   VITE_API_URL=...
   ```

3. Vá ao diretório de instalação do PatchMon (onde ficam `frontend/` e `backend/`) e recompile o frontend:

   ```bash
   cd /opt/<your-domain>
   npm run build
   ```

4. Recarregue a página. O painel deve voltar a funcionar.

### Regra prática

- Se `VITE_API_URL` estiver definida, ela **precisa** bater com o `CORS_ORIGIN` do `.env` do backend. Se você compila e publica o frontend com vários valores diferentes de `VITE_API_URL` (por exemplo, pacotes interno e externo servidos pelo mesmo backend), cada uma dessas origens precisa estar em `CORS_ORIGIN`, separada por vírgula, sem espaços (por exemplo, `CORS_ORIGIN=https://patchmon.example.com,https://patchmon.internal.lan`).
- O ideal é deixar `VITE_API_URL` sem valor e deixar o frontend usar a origem atual. O build padrão está correto na maioria das implantações.

### Não resolveu?

Esse problema foi corrigido nas versões ≥ 1.4.2. Se você ainda está numa versão mais antiga, a correção preferível é atualizar para a mais recente.

---

## Capítulo 15: Verificando os artefatos da versão (SBOM e proveniência) {#verifying-release-artefacts}

### Visão geral

Toda versão do PatchMon publica uma lista de materiais de software (SBOM) e um atestado de proveniência do build, assinado. Juntos, eles permitem responder a duas perguntas antes da implantação:

- **O que há dentro deste build?** O SBOM lista os componentes e as versões.
- **De onde veio este build?** O atestado de proveniência é uma declaração assinada, produzida dentro da execução do GitHub Actions que gerou o artefato, que liga o artefato ao commit de código-fonte e ao workflow exatos que o produziram.

O SBOM é uma exigência do Cyber Resilience Act da União Europeia (Anexo I, Parte II). O atestado de proveniência não é exigido por esse regulamento, mas é o que a maioria das revisões de cadeia de suprimentos pede, então publicamos os dois.

Nada disto é necessário para rodar o PatchMon. Importa se você está sujeito a uma política de cadeia de suprimentos, se está respondendo a um questionário de segurança ou se simplesmente quer confirmar que a imagem que baixou é a que nós construímos.

### O que é publicado

| Artefato | Onde |
|----------|-------|
| Proveniência do build da imagem do servidor | Anexada à imagem no GHCR e no repositório de atestados do GitHub |
| SBOM da imagem do servidor | Anexado à imagem no GHCR e no repositório de atestados do GitHub |
| Proveniência do build dos binários da versão | Repositório de atestados do GitHub |
| `SHA256SUMS` | Assets da versão, na página da versão no GitHub |
| `sbom-source.cdx.json` | Assets da versão, na página da versão no GitHub |

Os SBOMs estão em CycloneDX JSON.

### Pré-requisitos

Uma GitHub CLI recente o bastante para ter o conjunto de comandos `gh attestation`:

```bash
gh attestation verify --help
```

Se o comando não for reconhecido, atualize a CLI.

A verificação não exige login em nada, nem que a imagem tenha sido baixada antes.

### Verificando a imagem do contêiner

```bash
gh attestation verify \
  oci://ghcr.io/patchmon/patchmon-server:2.0.3 \
  --repo PatchMon/PatchMon
```

Troque `2.0.3` pela versão que você está implantando. Uma execução bem-sucedida mostra o commit de origem e o workflow que construiu a imagem. Uma falha significa que a imagem não foi construída pelo nosso pipeline a partir do nosso repositório, e você não deve implantá-la.

Para fixar pelo digest em vez da tag, que é o que recomendamos em produção, porque uma tag pode ser movida:

```bash
gh attestation verify \
  oci://ghcr.io/patchmon/patchmon-server@sha256:<digest> \
  --repo PatchMon/PatchMon
```

### Verificando os binários da versão

Baixe da página da versão o binário de que precisa e o `SHA256SUMS`, e então:

```bash
# Confirm the download is intact
sha256sum -c SHA256SUMS --ignore-missing

# Confirm it came from our pipeline
gh attestation verify ./patchmon-agent-linux-amd64 --repo PatchMon/PatchMon
```

A verificação do checksum pega um download truncado ou corrompido. A do atestado é a que prova a origem, então rode as duas.

### Obtendo o SBOM

O caminho mais simples é a página da versão: baixe o `sbom-source.cdx.json` dos assets da versão.

Para extrair o SBOM da imagem direto do registry:

```bash
gh attestation download \
  oci://ghcr.io/patchmon/patchmon-server:2.0.3 \
  --repo PatchMon/PatchMon
```

Isso grava um bundle do Sigstore. O SBOM é o campo `predicate` dentro do payload assinado:

```bash
jq -r '.dsseEnvelope.payload' <bundle-file> | base64 -d | jq '.predicate' > sbom.cdx.json
```

Os dois SBOMs também ficam guardados como artefatos de build na execução do Actions que produziu a versão, com o nome `sbom-server-<version>`, enquanto o GitHub os mantiver.

### Por que há dois SBOMs

Você precisa dos dois para ter o quadro completo, porque nenhum deles é completo sozinho.

- **`sbom-image.cdx.json`** é gerado varrendo a imagem de contêiner já construída. Cobre os pacotes base do Alpine e o grafo de módulos Go do binário do servidor e dos binários de agente embutidos.
- **`sbom-source.cdx.json`** é gerado varrendo a árvore de código-fonte. Cobre a árvore de dependências do npm.

A árvore do npm não aparece na varredura da imagem. A interface web é empacotada pelo Vite e depois compilada direto dentro do binário Go, então, quando chega à imagem, não sobra nenhum metadado do npm para um scanner encontrar. Varrer a árvore de código-fonte é o único jeito de enumerar essas dependências.

Um componente não está em nenhum dos dois arquivos: o conteúdo de políticas de segurança SCAP usado nas varreduras de conformidade é baixado do projeto ComplianceAsCode durante o build da imagem. Ele é dado, não pacote, então não traz metadados para um scanner catalogar. A versão é fixada em cada versão do PatchMon pelo argumento de build `SSG_VERSION`.

### Verificando uma imagem que você já baixou

A verificação funciona contra um digest, então dá para conferir uma imagem que já está no host:

```bash
docker image inspect ghcr.io/patchmon/patchmon-server:2.0.3 \
  --format '{{index .RepoDigests 0}}'
```

Passe o valor `name@sha256:...` resultante para o `gh attestation verify`, com o prefixo `oci://`.

### Solução de problemas

**"no attestations found"**

Os atestados começam na versão em que este capítulo apareceu pela primeira vez. As versões anteriores não têm, e isso é esperado, não um sinal de adulteração. Veja nas notas de versão qual é a primeira versão que os traz.

A tag `edge` é construída a partir da branch main e traz atestados, mas a tag se move a cada merge, então verifique a `edge` pelo digest, e não pela tag.

**A verificação falha numa imagem vinda de um espelho ou de um registry privado**

O atestado é ligado ao digest da imagem, não ao local onde ela está, então uma cópia direta continua passando na verificação. Um espelho que recomprime ou reconstrói as camadas muda o digest, e a verificação falha, corretamente. Verifique contra o GHCR e depois copie pelo digest.

**Verificando uma cópia guardada no seu próprio registry**

Os atestados ficam registrados no repositório de atestados do GitHub, além de anexados à imagem, então a verificação não depende de onde a imagem está guardada. Uma cópia espelhada no seu próprio registry passa na verificação normalmente, desde que tenha sido copiada pelo digest. Aponte o `gh attestation verify` para a sua própria referência, com o prefixo `oci://`.

### Veja também

- Capítulo 1: Instalando o servidor do PatchMon com Docker
- Capítulo 8: Instalando o agente do PatchMon
- A nossa política de segurança e o processo de reporte de vulnerabilidades: `SECURITY.md` no repositório
