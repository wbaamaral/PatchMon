---
title: "Guia do Administrador do PatchMon"
description: "Guia de uso diário para administradores e operadores do PatchMon que trabalham na interface web."
lang: "pt-BR"
translation_of: "docs/patchmon-admin-guide.md"
source_commit: "05576062"
---

# Guia do Administrador do PatchMon

Este é o guia de uso diário para administradores e operadores do PatchMon que trabalham na interface web. Para instalar ou operar o próprio servidor do PatchMon, consulte o **Guia do Operador**. Para integrações e a API REST, consulte o **Guia de API e Integrações**.

> **Sobre esta tradução.** A interface do PatchMon está disponível apenas em inglês. Por isso, nomes de telas, abas, botões e campos aparecem aqui como estão na interface (por exemplo, **Settings → Host Groups**). Comandos, variáveis de ambiente, caminhos e exemplos de código não foram traduzidos. Em caso de divergência, vale a versão original em inglês.

## Sumário

- [Capítulo 1: Bem-vindo ao PatchMon](#welcome-to-patchmon)
- [Capítulo 2: Configurações na interface web](#settings-in-the-web-ui)
- [Capítulo 3: Adicionando um host](#adding-a-host)
- [Capítulo 4: Página de detalhes do host](#host-detail-page)
- [Capítulo 5: Gerenciando grupos de hosts](#managing-host-groups)
- [Capítulo 6: Inventário de pacotes](#package-inventory)
- [Capítulo 7: Acompanhamento de repositórios](#repository-tracking)
- [Capítulo 8: Visão geral de patching](#patching-overview)
- [Capítulo 9: Executando um patch](#running-a-patch)
- [Capítulo 10: Políticas de patch e agendamento](#patch-policies-and-scheduling)
- [Capítulo 11: Histórico de patches e logs ao vivo](#patch-history-and-live-logs)
- [Capítulo 12: Ativando a integração com Docker](#enabling-docker-integration)
- [Capítulo 13: Conhecendo o inventário Docker](#docker-inventory-tour)
- [Capítulo 14: Visão geral de conformidade](#compliance-overview)
- [Capítulo 15: Executando varreduras de conformidade](#running-compliance-scans)
- [Capítulo 16: Resultados de conformidade e correção](#results-and-remediation)
- [Capítulo 17: Visão geral de alertas](#alerts-overview)
- [Capítulo 18: Destinos de notificação](#notification-destinations)
- [Capítulo 19: Rotas de notificação e log de entregas](#notification-routes-and-delivery-log)
- [Capítulo 20: Relatórios agendados](#scheduled-reports)
- [Capítulo 21: Terminal SSH web](#web-ssh-terminal)
- [Capítulo 22: RDP via Guacamole](#rdp-via-guacamole)
- [Capítulo 23: Assistente de IA no terminal](#ai-terminal-assistant)
- [Capítulo 24: Usuários, papéis e RBAC](#users-and-roles-rbac)
- [Capítulo 25: Autenticação em dois fatores](#two-factor-authentication)
- [Capítulo 26: Métricas e telemetria](#metrics-and-telemetry)

---

## Capítulo 1: Bem-vindo ao PatchMon {#welcome-to-patchmon}

O [PatchMon](https://patchmon.net) é uma plataforma de código aberto para gestão de patches e monitoramento de infraestrutura. Ele dá a sysadmins e equipes de TI uma visão centralizada de patches, pacotes, conformidade e acesso remoto em todo o parque de servidores.

Funciona com os gerenciadores de pacotes padrão do Linux (**apt**, **yum** e **dnf**) e não exige nenhuma porta de entrada aberta nos hosts monitorados.

---

### Como funciona

O PatchMon usa um modelo de agente leve:

1. **Implante o servidor.** Hospede o PatchMon você mesmo, com Docker ou com o instalador nativo, ou use o [PatchMon Cloud](https://patchmon.net), que é gerenciado.
2. **Instale o agente.** Adicione um host no painel e rode, no servidor Linux, o comando de instalação de uma linha.
3. **Monitore.** O agente envia periodicamente dados do sistema e dos pacotes para o PatchMon, sempre em conexão de saída. Nenhuma porta de entrada precisa ser aberta nos seus servidores.

> **Requisitos de rede:** os agentes só precisam de acesso de saída na porta 443 (HTTPS). Se os seus sistemas estão atrás de firewalls que inspecionam tráfego SSL/DNS, ou em redes isoladas (air-gapped), ajuste as regras conforme necessário.

---

### Principais recursos

| Área | Detalhes |
|------|---------|
| **Dashboard** | Layout de cards personalizável por usuário, com visão geral de todo o parque |
| **Gestão de hosts** | Inventário de hosts, agrupamento e acompanhamento de detalhes do sistema operacional |
| **Acompanhamento de pacotes** | Inventário de pacotes, contagem de pacotes desatualizados e acompanhamento de repositórios por host |
| **Varreduras de conformidade** | Varreduras OpenSCAP com CIS Benchmark e Docker Bench for Security (agendadas ou sob demanda) |
| **Monitoramento de Docker** | Descoberta de contêineres e acompanhamento de status em todos os hosts |
| **Sistema de agentes** | Agentes leves com comunicação apenas de saída, sem superfície de ataque nos seus servidores |
| **Acesso remoto** | RDP no navegador via Guacamole e terminal SSH com análise assistida por IA |
| **Análise com IA** | Assistência por IA dentro do terminal SSH |
| **Usuários e autenticação** | Várias contas de usuário com papéis, permissões e RBAC |
| **OIDC SSO** | Login único por provedores de identidade externos (por exemplo, Authentik, Keycloak, Entra ID) |
| **TOTP 2FA** | Autenticação em dois fatores com senha de uso único baseada em tempo |
| **Registro automático** | Registro automático de agentes em contêineres LXC do Proxmox |
| **API** | API REST com autenticação JWT em `/api/v1` |
| **Limite de requisições** | Limites configuráveis para endpoints gerais, de autenticação e de agentes |

---

### Links rápidos

- Instalando o servidor do PatchMon com Docker
- Instalando o agente do PatchMon
- Guia de registro automático de LXC no Proxmox
- Referência de variáveis de ambiente do PatchMon
- [Métricas e telemetria](#metrics-and-telemetry)
- [Roadmap de recursos](https://feedback.patchmon.net/roadmap) (peça e vote em recursos)
- [Reportar um bug](https://github.com/PatchMon/PatchMon/issues) (bugs são acompanhados no GitHub, não no portal de feedback)
- [YouTube](https://www.youtube.com/@patchmonTV)
- [Comunidade no Discord](https://patchmon.net/discord)
- [Repositório no GitHub](https://github.com/PatchMon/PatchMon)

---

### Arquitetura

O PatchMon é um **único binário Go** que serve tanto a API quanto o frontend React embutido. Não há contêiner de frontend nem servidor web separado. O binário também executa as migrações do banco de dados automaticamente ao iniciar.

```
End Users (Browser)  ──HTTPS──▶  Reverse Proxy (optional)
                                        │
                                        ▼
                               patchmon-server (Go binary)
                               - REST API (/api/v1)
                               - Embedded React frontend
                               - Background job worker (asynq)
                               - Database migrations
                                        │
                               ┌────────┴────────┐
                               ▼                 ▼
                          PostgreSQL 17       Redis 7
                                         (job queues)

                                        ▲
Agents on your servers  ──HTTPS──▶  patchmon-server
     (outbound only)

In-browser RDP  ──────────────────▶  guacd (Guacamole daemon)
```

| Componente | Tecnologia |
|-----------|-----------|
| **Servidor** | Binário único em Go (API + frontend embutido + migrações) |
| **Frontend** | React + Vite (embutido no binário do servidor) |
| **Banco de dados** | PostgreSQL 17 |
| **Fila de jobs** | Redis 7 (via asynq) |
| **Gateway RDP** | guacd (daemon do Apache Guacamole), opcional (necessário para RDP) |

---

### Suporte

- **Discord:** [patchmon.net/discord](https://patchmon.net/discord)
- **E-mail:** support@patchmon.net
- **GitHub Issues:** [Reportar um bug](https://github.com/PatchMon/PatchMon/issues)

### Licença

O PatchMon é licenciado sob a [AGPLv3](https://github.com/PatchMon/PatchMon/blob/main/LICENSE).

---

## Capítulo 2: Configurações na interface web {#settings-in-the-web-ui}

### Visão geral

O PatchMon 2.0 tira a maior parte dos ajustes do dia a dia do `.env` do contêiner e os leva para a área **Settings** da interface web. É ali que você gerencia usuários e papéis, grupos de hosts, a frequência de atualização dos agentes, opções do servidor, identidade visual, integrações e provedores de autenticação. As configurações ficam no banco de dados, e o servidor as relê a cada requisição (com um cache curto em memória nos caminhos mais usados). Por isso, a maioria das mudanças vale sem reiniciar o contêiner.

> **Variável de ambiente vence o banco.** Quando a mesma configuração existe como variável de ambiente e como valor na interface, prevalece a variável de ambiente. A interface marca com um pequeno selo amarelo "env" os valores sobrescritos pelo `.env`, e assim dá para ver na hora por que sua alteração "não salvou". O modelo completo de prioridade está na Referência de variáveis de ambiente do PatchMon.

Esta seção é o mapa da área Settings: o que cada página faz, qual permissão a libera e qual capítulo consultar para mais detalhes.

---

### Como chegar a Settings

Clique no ícone de engrenagem na barra de navegação superior ou acesse diretamente `/settings`. Você cai na página de configurações de maior prioridade para o seu perfil: usuários, para quem tem `can_view_users`; identidade visual (branding), para os demais que têm permissões de configuração.

A barra lateral esquerda organiza as configurações em quatro seções:

1. **User Management**: usuários, papéis, o seu próprio perfil e autenticação social/SSO
2. **Hosts Management**: grupos de hosts e comportamento de atualização dos agentes
3. **Integrations**: integrações de API (tokens de registro automático) e AI Terminal
4. **Server**: URL do servidor, variáveis de ambiente, identidade visual, versão do servidor e métricas

Alguns itens só aparecem conforme a sua implantação ou edição. **Server URL** e **Metrics**, por exemplo, só existem na versão auto-hospedada. Recursos como **Roles** (RBAC personalizado), **Branding** e **AI Terminal** dependem dos módulos correspondentes nos planos pagos.

---

### Páginas de Settings: referência rápida

| Página | Caminho | Finalidade | Permissão necessária |
|---|---|---|---|
| Users | `/settings/users` | Criar, editar e desativar contas | `can_view_users` / `can_manage_users` |
| Roles | `/settings/roles` | Criar e editar papéis RBAC personalizados (plano Plus) | `can_manage_settings` + módulo `rbac_custom` |
| My Profile | `/settings/profile` | Seu nome, e-mail, senha, MFA e dispositivos confiáveis | Qualquer usuário autenticado |
| Discord Auth | `/settings/discord-auth` | Configurar login via OAuth do Discord | `can_manage_settings` |
| OIDC / SSO | `/settings/oidc-auth` | Configurar login único com OpenID Connect | `can_manage_settings` |
| Host Groups | `/settings/host-groups` | Organizar hosts em grupos para políticas e visibilidade | `can_manage_settings` |
| Agent Updates | `/settings/agent-config` | Comportamento global de atualização automática e intervalo de atualização | `can_manage_settings` |
| Agent Version | `/settings/agent-version` | Verificar e gerenciar as versões dos binários de agente incluídos | `can_manage_settings` |
| API integrations | `/settings/integrations` | Tokens de registro automático, Proxmox LXC, getHomepage etc. | `can_manage_settings` |
| AI Terminal | `/settings/ai-terminal` | Configurar o provedor de IA do assistente do terminal SSH (plano Max) | `can_manage_settings` + módulo `ai` |
| Server URL | `/settings/server-url` | Protocolo, host e porta que os agentes usam para se conectar ao servidor | `can_manage_settings` |
| Environment | `/settings/environment` | Ler e editar variáveis de ambiente do servidor pela interface | `can_manage_settings` |
| Branding | `/settings/branding` | Enviar logo e favicon personalizados (plano Plus) | `can_manage_settings` + módulo `custom_branding` |
| Server Version | `/settings/server-version` | Mostrar a versão em execução e verificar atualizações | `can_manage_settings` |
| Metrics | `/settings/metrics` | Controlar a adesão opcional à telemetria | `can_manage_settings` |

Na versão 2.0, notificações, canais de alerta, configurações de alerta e políticas de gestão de patches ficam fora da área Settings. Veja [Onde ficam alertas e políticas de patch](#where-alerts-and-patch-policies-live), mais abaixo.

---

### User Management

#### Users

**Caminho:** `/settings/users`

Diretório central de todas as contas do PatchMon. Aqui você pode:

- Criar usuários (usuário e senha locais, ou vinculados via OIDC)
- Atribuir um papel (`superadmin`, `admin`, `host_manager`, `user`, `readonly` ou qualquer papel personalizado que você tenha criado)
- Redefinir a senha de um usuário (redefinição feita pelo administrador, não pelo próprio usuário)
- Ativar, desativar ou excluir uma conta
- Ver quando cada usuário entrou pela última vez

Cada usuário também tem um botão que cria, com um clique, um token de API no estilo dos tokens de registro automático, restrito a ele próprio. É útil para integrações que precisam agir em nome de um operador específico.

#### Roles

**Caminho:** `/settings/roles`
**Requer:** módulo `rbac_custom` (plano Plus)

É no editor de Roles que se criam os papéis personalizados. Um papel é um conjunto nomeado de flags de permissão:

- `can_view_dashboard`, `can_view_hosts`, `can_view_users`, `can_view_packages`, `can_view_reports`, `can_view_notification_logs`
- `can_manage_hosts`, `can_manage_users`, `can_manage_settings`, `can_manage_alerts`, `can_manage_notifications`, `can_manage_compliance`, `can_manage_patching`, `can_manage_automation`, `can_manage_docker`
- `can_use_remote_access` (terminal SSH e RDP)

Os papéis nativos (`superadmin`, `admin`, `user`, `readonly`) não podem ser alterados. O editor permite criar e editar papéis adicionais ao lado deles e atribuir qualquer usuário a qualquer papel personalizado.

#### My Profile

**Caminho:** `/settings/profile`

As configurações da sua própria conta. Todo usuário autenticado tem acesso. Inclui:

- Nome, sobrenome e e-mail
- Troca de senha (com limite de tentativas; por padrão, 5 a cada janela de 15 minutos)
- **Two-Factor Authentication**: ativar ou desativar TOTP e gerar novos códigos de backup
- **Trusted Devices**: listar e revogar as exceções de "lembrar este dispositivo" nos desafios de MFA
- **Preferências do painel**: modo claro/escuro, layout dos cards e aba inicial padrão

As regras da política de senha são aplicadas na hora: não é possível salvar uma senha que não atenda à política do servidor. Veja Referência de variáveis de ambiente do PatchMon: Password Policy.

#### Discord Auth

**Caminho:** `/settings/discord-auth`

Configura um aplicativo do Discord como provedor de login. Cada usuário pode vincular a identidade do Discord na página de perfil. Depois disso, pode entrar pelo botão do Discord na tela de login, sem digitar senha.

O Discord Auth tem, de propósito, menos recursos que o OIDC SSO: não há mapeamento de grupos para papéis, nem modo de SSO obrigatório, nem criação automática de usuários. Use-o para comunidades e equipes pequenas; para o resto, use OIDC SSO.

#### OIDC / SSO

**Caminho:** `/settings/oidc-auth`

Configuração completa de OpenID Connect: URL do emissor (issuer), client ID e secret, URI de redirecionamento, escopos, texto do botão, criação automática de usuários, mapeamento de grupos para papéis e a opção de SSO obrigatório. O botão **Import from environment** traz para o banco os valores `OIDC_*` que já estão no `.env`, para você migrar da configuração em arquivo sem redigitar nada.

O passo a passo (Authentik, Keycloak, Entra ID, Okta) está em Configurando OIDC SSO.

---

### Hosts Management

#### Host Groups

**Caminho:** `/settings/host-groups`

Os grupos são a principal forma de organizar hosts para políticas de patch, roteamento de alertas e filtros do painel. Um host pode pertencer a vários grupos. Os grupos servem só para organização (sem hierarquia nem aninhamento) e são referenciados pelo nome em políticas, relatórios agendados e rotas de notificação.

#### Agent Updates

**Caminho:** `/settings/agent-config`

Controla como e quando os agentes do PatchMon conversam com o servidor e se atualizam:

- **Update interval**: com que frequência os agentes fazem check-in (padrão: 60 minutos). Hosts com o canal WebSocket aberto recebem mudanças de intervalo na hora. A partir da v2.0.3, cada ciclo é um check-in condicionado a hash: o agente envia um hash do conteúdo de cada seção, e o servidor só pede o conteúdo completo das seções cujo hash mudou. Em regime normal, cada ciclo trafega alguns KB em vez de alguns MB.
- **Auto-update behaviour**: liga ou desliga, globalmente, a atualização automática do binário do agente. As exceções por host ficam na página de detalhes do host.
- **Signup enabled**: define se o assistente de configuração inicial ainda atende o endpoint de criação do primeiro administrador.

#### Agent Version

**Caminho:** `/settings/agent-version`

Mostra as versões dos binários de agente incluídos no servidor (um por sistema operacional/arquitetura), verifica se há versões mais novas publicadas e força um novo download desses binários. É útil depois de atualizar o servidor. Os agentes recebem os novos binários pelo fluxo de atualização automática, sem distribuição manual.

Veja Gerenciando o agente do PatchMon para saber como os agentes usam essa informação.

---

### Integrations

#### API integrations

**Caminho:** `/settings/integrations`

Tokens de registro automático e credenciais de API por integração:

- **Auto-enrolment tokens**: tokens de uso único ou de longa duração que permitem a scripts de registro cadastrar novos hosts sem intervenção humana. Cada token pode ser restrito a grupos de hosts específicos e marcado para integrações como Proxmox LXC ou getHomepage.
- **Integration-type tokens**: o modelo de token com escopo usado pelas rotas `/api/*` de integração, incluindo `gethomepage` para o widget de painel.

#### AI Terminal

**Caminho:** `/settings/ai-terminal`
**Requer:** módulo `ai` (plano Max)

Configura o provedor de IA usado pelo assistente do terminal SSH no navegador. Provedores suportados: OpenAI, Anthropic, Google Gemini e OpenRouter. As credenciais são criptografadas em repouso com `AI_ENCRYPTION_KEY` (veja a Referência de variáveis de ambiente). A página tem um botão "Test connection" para confirmar que a chave funciona antes de salvar.

---

### Server

#### Server URL

**Caminho:** `/settings/server-url`
**Oculto no:** PatchMon Cloud

Três campos (protocolo, host e porta) que juntos definem a URL base que os agentes usam para chegar ao servidor. É a mesma URL que o assistente de configuração inicial pediu para confirmar. Ela fica gravada no banco para que a interface gere os comandos de instalação corretos para cada novo host.

Se você mudar a URL depois, os agentes existentes continuam usando a URL com que foram instalados; só os novos agentes pegam a mudança. Para apontar um host para a nova URL, rode novamente o comando de instalação nele.

#### Environment

**Caminho:** `/settings/environment`
**Requer:** `can_manage_settings`

Novidade da 2.0: toda variável de ambiente ajustável que pode ser alterada com segurança em tempo de execução aparece aqui com o **valor efetivo**, a **origem** (env / banco de dados / padrão), o **valor padrão** e uma descrição de uma linha. As variáveis editáveis têm botão de edição. As sensíveis ou usadas só na inicialização (como `DATABASE_URL`, `JWT_SECRET`, `REDIS_PASSWORD`, `AI_ENCRYPTION_KEY`, `SESSION_SECRET`) aparecem somente para leitura e continuam sendo alteradas no `.env`.

As variáveis são agrupadas por categoria: Database, Server, Logging, Authentication, Password policy, Server performance, Rate limits, Redis, Encryption e Deployment.

Ao editar um valor, a interface grava no banco e mostra na hora o aviso "Restart the application for changes to take effect". Algumas configurações passam a valer na próxima requisição (origem CORS, nível de log, limites de requisição); outras exigem reinício. A interface nem sempre sabe distinguir, então a regra segura é: altere e depois rode `docker compose restart server`.

> **Dica:** se você gerencia o PatchMon por arquivos `.env` há muito tempo e quer levar a configuração para o banco, primeiro remova a variável do `.env` e só então altere o valor aqui. Caso contrário, o valor do env continua prevalecendo.

Referência completa: Referência de variáveis de ambiente do PatchMon.

#### Branding

**Caminho:** `/settings/branding`
**Requer:** módulo `custom_branding` (plano Plus)

Permite enviar logo e favicon personalizados. Os arquivos ficam no banco de dados e são servidos por `GET /api/v1/settings/logos/{type}`, então sobrevivem a reinícios do contêiner sem precisar de volume persistente. As variantes para modo escuro e modo claro são enviadas separadamente. A leitura é pública (para a tela de login mostrar a sua identidade visual antes da autenticação), mas o envio e a redefinição dependem do módulo `custom_branding`.

#### Server Version

**Caminho:** `/settings/server-version`
**Oculto no:** PatchMon Cloud

Mostra a versão do servidor em execução, a versão mais recente publicada (verificada diariamente pelo job de automação `version-update-check`; veja Jobs em segundo plano e automação) e um botão manual "Check for updates". A página não faz a atualização. Atualizar o PatchMon significa trocar a imagem do contêiner (veja Instalando o servidor do PatchMon com Docker).

#### Metrics

**Caminho:** `/settings/metrics`
**Oculto no:** PatchMon Cloud

Telemetria anônima, com adesão opcional. Uma vez por dia, o PatchMon envia ao endpoint de métricas do projeto um pequeno sinal com a versão do servidor, o número de hosts e a distribuição aproximada de sistemas operacionais. Você pode desligar o envio, gerar um novo ID anônimo da instância ou mandar um envio avulso na hora. O que é enviado, exatamente, está em [Métricas e telemetria](#metrics-and-telemetry).

---

### Onde ficam alertas e políticas de patch {#where-alerts-and-patch-policies-live}

Na 1.4.x, esses itens ficavam dentro de Settings. Na 2.0, foram para lugares mais naturais:

- **Alerts (Open alerts, History)**: `/reporting` → aba **Alerts**
- **Alert Lifecycle**: `/reporting` → aba **Alert Lifecycle** (retenção, resolução automática, jobs de limpeza; requer o módulo `alerts_advanced`, plano Plus)
- **Destinations** (SMTP, webhook, ntfy): `/reporting` → aba **Destinations**
- **Event Rules** (roteamento de alertas para destinos): `/reporting` → aba **Event Rules**
- **Delivery Log**: `/reporting` → aba **Delivery Log**
- **Scheduled Reports**: `/reporting` → aba **Scheduled Reports**
- **Patch Policies** (agendamento, regras de aprovação, exclusões): `/patching?tab=policies`

A barra lateral de Settings não os lista porque as páginas onde eles são usados de fato (Reporting e Patching) são o lugar certo para eles. As permissões não mudaram: `can_manage_notifications`, `can_manage_alerts` e `can_manage_patching` continuam controlando quem vê cada área.

---

### Solução de problemas

#### "Mudei uma configuração e nada aconteceu"

Procure na página Environment a variável que você alterou. Se a coluna "Source" mostrar `env`, o valor que você gravou no banco está sendo sobrescrito por uma variável de ambiente definida no `.env` ou na especificação do contêiner. Remova o valor do env e o valor do banco passa a valer.

#### "Salvei uma configuração e a interface pede 'Restart to take effect'"

Algumas configurações (valores lidos só na inicialização, como `PORT`, `DATABASE_URL` e tamanhos de pool) são lidas uma vez no boot e ficam em cache enquanto o processo roda. Reinicie o contêiner `server`:

```bash
docker compose restart server
```

Um pequeno número de configurações (origem CORS, nível de log, janelas de limite de requisição) é recalculado a cada requisição e não exige reinício. A interface nem sempre diferencia uns dos outros; na dúvida, reinicie.

#### "Branding / AI Terminal / Roles aparecem desabilitados"

São recursos dos planos pagos. Quem usa a versão auto-hospedada no plano gratuito vê esses itens na barra lateral, mas não consegue abri-los: o clique leva para uma página de upgrade. Se você está num plano pago e eles continuam bloqueados, abra **Settings → My Profile → Subscription** e confirme se o módulo aparece entre os módulos habilitados.

---

### Veja também

- Configuração inicial do administrador
- Referência de variáveis de ambiente do PatchMon
- Gerenciando o agente do PatchMon
- Configurando OIDC SSO
- Jobs em segundo plano e automação

---

## Capítulo 3: Adicionando um host {#adding-a-host}

### Visão geral

Adicionar um host envolve os dois lados. No servidor, você pré-cadastra o host na interface web: dá um nome amigável, escolhe a família de sistema operacional, opcionalmente o coloca em grupos de hosts e recebe um API ID e uma API key exclusivos. No host, você roda o comando de instalação de uma linha, que baixa e configura o agente com essas credenciais.

Este capítulo percorre o assistente Add Host, o comando de instalação, a tela de espera pela conexão e o que fazer se o agente nunca aparecer.

O lado do servidor é feito **só pela interface**. Não é preciso acesso de shell ao servidor do PatchMon. Instalar o agente no host de destino é outra tarefa; os pré-requisitos por distribuição estão em Instalando o agente do PatchMon.

**Permissão necessária:** `can_manage_hosts`. Usuários que têm só `can_view_hosts` veem a lista de hosts, mas não o botão **Add Host**.

### Antes de começar

Você vai precisar de:

- Uma **conta de usuário do PatchMon** com `can_manage_hosts` (normalmente Admin ou um papel personalizado).
- **Acesso ao console ou SSH** do host que será adicionado, como root / `sudo` (Linux/FreeBSD) ou Administrator (Windows).
- **HTTPS de saída** do host para o servidor do PatchMon na porta 443. Nenhuma porta de entrada é aberta no host.
- Se o seu servidor do PatchMon usa um **certificado autoassinado**, decidir antes se vai instalar a CA no repositório de confiança do host ou desativar a verificação de TLS no comando de instalação.

### Abrindo o assistente Add Host

1. Na navegação à esquerda, clique em **Hosts**. A página abre com os cards de resumo **Total Hosts**, **Needs Updates**, **Needs Reboots** e **Connection Status** no topo.
2. No cabeçalho da página, clique no botão azul **Add Host** (ícone `+`). Abre-se uma janela chamada **Add New Host**.

O assistente tem quatro etapas:

| Etapa | O que acontece |
|------|--------------|
| **1. Choose OS** | Escolher Linux, FreeBSD ou Windows |
| **2. Host details** | Dar nome ao host, escolher grupos, ligar integrações |
| **3. Copy command** | Copiar o comando de instalação e rodá-lo no host |
| **4. Connection** | O assistente espera o agente se conectar e enviar o relatório |

Os indicadores no topo mostram em que etapa você está. Dá para voltar (**Back**) a qualquer momento antes de a etapa 3 ser enviada.

### Etapa 1: Choose OS

Você escolhe um de três blocos:

- **Linux**: Ubuntu, Debian, CentOS, RHEL, Rocky, Alma, Fedora, Alpine etc.
- **FreeBSD**: FreeBSD 13 / 14, incluindo pfSense.
- **Windows**: Windows 10/11 (amd64 ou ARM64) e Windows Server 2019 / 2022 / 2025.

A escolha define qual comando de instalação o assistente gera e qual URL de download o servidor usa. A arquitetura (amd64 / arm64 / arm / 386) **não** é escolhida aqui: o script de instalação a detecta no host de destino e baixa o binário correspondente.

Clique em **Next** para continuar.

### Etapa 2: Host Details

Este formulário cria o registro do host no servidor. São três grupos de campos.

#### Friendly Name (obrigatório)

Um rótulo legível, como `web-01.prod` ou `billing-db`. Ele aparece na lista de hosts, nos painéis, nos alertas e na barra de endereço (`/hosts/<id>`). Pode ser editado depois na página de detalhes do host, então não precisa acertar de primeira.

O texto de exemplo `server.example.com` **não** é usado como hostname do sistema. O hostname real é detectado quando o agente envia o primeiro relatório.

#### Host Groups (opcional)

Uma lista de caixas de seleção com os grupos existentes, cada um com um ponto colorido ao lado do nome. Marque os grupos a que o host deve pertencer; um host pode estar em vários. A participação pode ser alterada depois na tabela de hosts ou na página de detalhes do host.

Se você ainda não tem grupos, esta seção fica vazia. Crie-os antes em **Settings → Host Groups**; veja [Gerenciando grupos de hosts](#managing-host-groups).

#### Integrations (opcional)

Duas chaves:

- **Docker**: ativa a descoberta de contêineres, imagens, volumes e redes pelo socket do Docker. Exige o módulo `docker` no seu plano.
- **Compliance**: ativa as varreduras OpenSCAP com CIS Benchmark. Exige o módulo `compliance` no seu plano.

Essas chaves gravam o estado inicial de `docker_enabled` / `compliance_enabled` no registro do host. O agente lê esses valores na primeira conexão e atualiza o `config.yml`. Se estiver em dúvida, deixe desligado; dá para ligar depois em Host Detail → aba Integrations. Veja [Ativando a integração com Docker](#enabling-docker-integration).

Clique em **Next**. O PatchMon cria o host no estado **Pending** e gera um API ID e uma API key exclusivos. A chave aparece **uma única vez**, dentro do comando da próxima etapa. Se você fechar o assistente sem copiá-la, terá de gerar novas credenciais na página de detalhes do host.

### Etapa 3: Copiar o comando de instalação

O assistente mostra agora um comando somente leitura, montado a partir de:

- O sistema operacional escolhido (Linux / FreeBSD / Windows).
- A URL configurada do seu servidor.
- O API ID e a API key do novo host.
- A sua configuração global de TLS (`ignore_ssl_self_signed`): se estiver ligada, o comando para Linux usa `curl -sk` e, no Windows, as opções já vêm marcadas para ignorar a verificação SSL.

#### Linux / FreeBSD

```
curl -s "https://patchmon.example.com/api/v1/hosts/install" \
  -H "X-API-ID: patchmon_xxxxxxxx" \
  -H "X-API-KEY: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | sudo sh
```

No FreeBSD, o script dispensa o `sudo`, porque normalmente o próprio root executa o comando.

#### Windows

No Windows, o comando é um trecho de PowerShell que baixa o instalador com `Invoke-WebRequest` e o executa. Duas caixas de seleção o ajustam:

- **Self-signed certificate (SSL bypass)**: acrescenta no início um código que força TLS 1.2 e desativa a validação de certificado durante o download. Use apenas em laboratório ou em ambientes com CA interna.
- **Use curl instead of Invoke-WebRequest (if download fails)**: passa a usar `curl.exe` no download, útil quando ferramentas corporativas de proteção de endpoint quebram o `Invoke-WebRequest`.

O comando do Windows precisa ser executado num **PowerShell elevado** (Executar como administrador).

#### Copiar

Clique no botão **Copy command** (ou no ícone **Copy**). O comando vai para a área de transferência e o assistente avança para a etapa 4. Se o navegador bloquear o acesso à área de transferência, o assistente abre uma caixa `prompt()` com o comando já selecionado; copie dali.

> **Dica:** guarde o comando em lugar seguro só se for reutilizá-lo depois. A API key não volta a aparecer nesta tela. Se perdê-la, gere novas credenciais em **Host Detail → Deploy Agent → API Credentials → Regenerate**.

### Etapa 4: Aguardando a conexão

Depois que você copia o comando, o assistente passa para uma tela de progresso. Ela consulta o servidor a cada 2 segundos e passa por quatro estágios:

| Estágio | Ícone | Significado |
|-------|------|---------------|
| **Waiting for connection** | Wi-Fi pulsando | O registro do host existe, mas nenhum agente se conectou ainda. Rode o comando agora. |
| **Connected** | Visto verde | O agente abriu um WebSocket com o servidor. O relatório inicial ainda está a caminho. |
| **Receiving initial report** | Download animado | O agente está enviando o primeiro inventário de sistema e pacotes. |
| **Done** | Visto verde | Relatório inicial recebido. O assistente leva você à página de detalhes do novo host. |

Rode o comando copiado no host de destino. Em poucos segundos o status muda para **Connected** e, logo depois, para **Done**. Nesse ponto a janela fecha e a URL muda para `/hosts/<hostId>`.

Se precisar ver o comando de novo (por exemplo, porque colou no terminal errado), clique em **View command again** para voltar à etapa 3. O comando e as credenciais são mantidos.

> **Observação:** fechar o assistente antes de o agente se conectar **não** cancela o host. Ele continua em **Pending** e o registro pode ser concluído depois pela página de detalhes do host. Só que a **API key em texto claro** é apagada da memória quando a janela fecha. Se o registro não terminou, abra o host, clique em **Deploy Agent** e gere novas credenciais para obter um comando novo.

### Depois do registro

Quando o agente se conecta e envia o primeiro relatório:

- O host passa de **Pending** para **Active**.
- Tipo e versão do sistema operacional, arquitetura, hostname, IP, kernel e lista de pacotes são preenchidos automaticamente.
- A coluna **Connection** da página Hosts mostra um selo verde **WSS** (ou **WS**, se você estiver rodando sem TLS).
- Pacotes, repositórios e as integrações ativadas (Docker, conformidade) passam a ser reportados no intervalo configurado.

### Solução de problemas: o host não faz check-in

Se o assistente ficar parado em **Waiting for connection** por mais de um ou dois minutos, faça as verificações abaixo no host de destino.

#### Confirme que o comando de instalação rodou de fato

No Linux e no FreeBSD, o script de instalação é detalhado. Procure por:

- `Downloading patchmon-agent-<os>-<arch>...`
- `Installing to /usr/local/bin/patchmon-agent`
- `Writing /etc/patchmon/config.yml`
- `Writing /etc/patchmon/credentials.yml`
- `Starting patchmon-agent service`

Se o script parou no meio, rode-o de novo. Se o `apt-get` falhar por causa de pacotes quebrados, abra o host outra vez pela página Hosts, clique em **Deploy Agent**, marque **Force install (bypass broken packages)** na aba **Quick Install** e use o comando gerado.

#### Confirme que o serviço está rodando

**Linux (systemd):**

```bash
sudo systemctl status patchmon-agent
```

**Alpine (OpenRC):**

```bash
sudo rc-service patchmon-agent status
```

**Windows:**

```powershell
Get-Service -Name PatchMonAgent
```

Os detalhes de gerenciamento do serviço estão em Gerenciando o agente do PatchMon.

#### Teste a conexão manualmente

No host, rode o teste de conectividade e credenciais embutido no agente:

```bash
sudo patchmon-agent ping
```

Uma resposta bem-sucedida é assim:

```
API credentials are valid
Connectivity test successful
```

Se falhar, o próximo passo é o log do agente:

```bash
sudo tail -n 50 /etc/patchmon/logs/patchmon-agent.log
```

Causas comuns:

- **HTTP 401**: a API key no host não bate com a que está no servidor. Em geral, o assistente foi fechado e o host recriado, ou as credenciais foram trocadas. Gere novas credenciais em **Host Detail → Deploy Agent**.
- **Erro de TLS / certificado**: o host não confia no certificado TLS do servidor. Instale a CA no repositório de confiança do host ou defina `skip_ssl_verify: true` em `/etc/patchmon/config.yml` (só em laboratório).
- **Conexão recusada / timeout**: problema de firewall, DNS ou proxy reverso. No host, `curl -I https://patchmon.example.com` deve retornar uma resposta HTTP.

O diagnóstico completo, com o comando `patchmon-agent diagnostics`, está em Gerenciando o agente do PatchMon.

#### Nada de errado no host, e continua "Waiting"?

Abra o registro do host mesmo assim: na página Hosts, clique no nome amigável do host (mesmo que ele esteja em **Pending**). A página mostra um botão **Deploy Agent** perto do canto superior direito. Clique nele para reabrir o comando de instalação e a tela de espera, e tente de novo.

Se o host está em **Pending** há muito tempo e você quer recomeçar, exclua-o na página Hosts (ícone de lixeira ou seleção em massa → **Delete**) e adicione-o do zero.

### Registro em massa ou automatizado

O assistente Add Host foi feito para um host por vez. Para registrar hosts de forma automatizada:

- **Proxmox LXC:** o PatchMon pode registrar automaticamente todos os contêineres de um host Proxmox. Veja o Guia de registro automático de LXC no Proxmox.
- **Implantações por script:** use a Integration API para criar os hosts e distribua o comando de instalação com gerência de configuração (Ansible, Salt, Chef, cloud-init). Veja a Documentação da Integration API.

### Páginas relacionadas

- [Gerenciando grupos de hosts](#managing-host-groups): crie grupos antes (ou depois) de adicionar hosts.
- [Página de detalhes do host](#host-detail-page): um tour pela página que aparece depois do registro.
- Instalando o agente do PatchMon: documentação completa do instalador do agente.
- Gerenciando o agente do PatchMon: CLI, logs e diagnóstico depois da instalação.
- Referência de configuração do agente: todos os campos do `config.yml` explicados.

---

## Capítulo 4: Página de detalhes do host {#host-detail-page}

### Visão geral

A página **Host Detail** é a bancada de trabalho de um host no PatchMon. Chega-se a ela clicando no nome amigável de qualquer host na página **Hosts**, ou acessando diretamente `/hosts/<hostId>`. Todas as ações, estatísticas e abas de um host ficam aqui: status da conexão, contagem de pacotes, repositórios, integrações, execuções de patch, fila do agente, credenciais e, quando os módulos correspondentes estão ativos, inventário Docker e resultados de conformidade.

Este capítulo é um tour pelo layout: onde clicar e para que serve cada aba.

**Permissão necessária:** `can_view_hosts` para abrir a página. Ações que alteram algo (pedir relatório, mudar grupos, ligar integrações, excluir o host, rodar patches) exigem `can_manage_hosts`.

### Cabeçalho da página

O topo da página tem quatro áreas principais.

#### Faixa de identificação

- **Friendly name** (título grande), editável ali mesmo.
- **Hostname** e **IP** logo abaixo, ambos editáveis no lugar (o clique abre um campo de texto; Enter salva, Esc cancela).
- **Indicadores de status** (quatro indicadores independentes, cada um com uma dica ao passar o mouse):
  - **WS** — estado do canal de controle WebSocket. Verde quando conectado; âmbar enquanto está desconectado dentro da janela de tolerância configurada; vermelho quando essa janela se esgota. A janela de tolerância é o limite do alerta `host_down` (padrão de 30 segundos; veja [Configuração por tipo de alerta](#per-alert-type-configuration)).
  - **Reporting** — quão recente é o relatório do agente. Cinza ("Awaiting report") até o agente mandar o primeiro relatório. Depois, verde quando o agente reportou dentro do intervalo de atualização; âmbar quando está atrasado mas o WebSocket continua conectado (o agente está vivo, só não enviou ainda); vermelho ("Stale") quando está atrasado *e* o WebSocket também caiu.
  - **Reboot pending** — só aparece quando o host sinalizou reinício pendente (por exemplo, `/var/run/reboot-required` ou atualização de kernel).
  - **Updates** — cinza, "No package data", até chegar o primeiro relatório. Depois: verde "Up to date"; âmbar "Updates pending" (só atualizações que não são de segurança); vermelho "Security patches required" quando há uma ou mais atualizações de segurança disponíveis.
- **Uptime** e **Last updated**, em tempo relativo.

**Máquinas suspensas se atualizam sozinhas.** Um notebook ou uma VM não roda o timer de relatório enquanto está suspenso, então acorda com o indicador Reporting em âmbar (ou vermelho, enquanto ainda dormia e o WebSocket estava fora). Quando um agente se conecta e o host não reportou dentro do intervalo de atualização, o servidor pede um relatório novo no minuto seguinte, e o indicador volta ao normal sem ninguém clicar em **Fetch Report**. O mesmo vale para um host que estava desligado ou isolado por uma queda de rede. Hosts que reportam no horário não são afetados.

Se houver uma execução de patch esperando o relatório pós-patch, aparece um selo **Awaiting inventory report** com link para a execução.

#### Botões de ação (canto superior direito)

| Botão | O que faz | Precisa do agente online? |
|--------|--------------|:---:|
| **Apply** | Só aparece quando há mudanças de configuração pendentes (por exemplo, chaves de integração) que precisam ser enviadas ao agente. | Sim |
| **Fetch Report** | Envia pelo WebSocket um comando pedindo ao agente que colete e envie um relatório novo agora. | Sim |
| **Patch all** | Abre o assistente de patching já restrito a este host. Oculto em hosts Windows. | Sim |
| **Deploy Agent** (ícone de chave) | Abre a janela de credenciais, com o comando de instalação e as credenciais da API. | Não |
| **Refresh** (seta circular) | Busca de novo os dados do host no servidor do PatchMon (só na interface). | Não |
| **Delete host** (ícone de lixeira) | Abre uma confirmação e depois remove o registro do host. | Não |

#### Cards de estatística de pacotes

Quatro cards clicáveis:

- **Total Installed** → abre **Packages** filtrado por este host.
- **Outdated Packages** → **Packages** filtrado por este host, só com os que precisam de atualização.
- **Security Updates** → **Packages** filtrado por este host, só com atualizações de segurança.
- **Repos** → abre **Repositories** filtrado por este host.

São atalhos com o host já selecionado. A página **Packages** que se abre continua restrita a esse host: o título traz o nome dele, os cards de resumo contam só esse host e um botão **Clear filter** amplia a visão de volta para o parque inteiro.

### A faixa de abas

Abaixo dos cards há uma barra horizontal de abas. No desktop, todo o conteúdo fica dentro das abas; no celular, as seções aparecem empilhadas como cards e as abas viram links de atalho.

A faixa de abas depende do contexto. Algumas só aparecem em certas condições:

| Aba | Sempre visível? | Observações |
|-----|:---:|-------|
| **Host Info** | Sim | Aba inicial padrão. |
| **Network** | Sim | |
| **System** | Sim | |
| **Agent Activity** | Sim | Linha do tempo única dos ciclos de comunicação do agente (ping, relatório completo, relatório parcial, Docker, conformidade) e dos jobs da fila de saída. Substitui as abas separadas Package Reports e Agent Queue das versões anteriores. |
| **Notes** | Sim | Anotações em texto livre. |
| **Integrations** | Sim | Chaves de Docker / Compliance por host. |
| **Reporting** | Condicional | Oculta quando os alertas globais estão desligados. |
| **Docker** | Condicional | Só quando o host reportou uma integração Docker funcionando. Depende do módulo `docker`; mostra um selo PLUS se o seu plano não o inclui. |
| **Patching** | Sim | Depende do módulo `patching`; mostra um selo de plano se o seu plano não o inclui. |
| **Compliance** | Condicional | Só quando o host reportou a integração de conformidade. Depende do módulo `compliance`. |
| **Terminal** | Sim, em Linux/FreeBSD | SSH no navegador. Depende do módulo `ssh_terminal`. |
| **RDP** | Só em hosts Windows | RDP no navegador via Guacamole. Depende do módulo `rdp`. |

A seguir, cada aba é descrita pelo que você vê e pelo que pode fazer nela.

### Host Info

Painel de consulta rápida com a identidade do host e as configurações do agente. Campos:

- **Friendly Name**: editável no lugar.
- **IP Address**: editável no lugar. Se o agente escolheu uma interface principal, o campo fica somente leitura e marcado *from eth0* (ou o nome da interface).
- **Hostname**: editável no lugar.
- **Machine ID**: identificador único do hardware, somente leitura.
- **Host Groups**: seleção múltipla com etiquetas coloridas. Adicione ou remova grupos; as mudanças são salvas quando o campo perde o foco.
- **Operating System**: ícone, tipo e versão do sistema operacional (detectados pelo agente).
- **Agent Version**: versão do `patchmon-agent` que está reportando.
- **Agent Auto-update**: chave por host. Se a atualização automática global estiver desligada, aparece um selo amarelo de aviso com uma dica apontando para **Settings → Agent Updates**.
- **Force Agent Version Upgrade**: o botão **Update Now** envia na hora um comando de atualização pelo WebSocket. Fica desabilitado quando o agente está offline.

O que o agente faz ao receber um comando de atualização está em Gerenciando o agente do PatchMon.

### Network

Visível quando o agente já reportou dados de rede. Duas seções:

- **DNS Servers**: grade com os resolvedores que o host usa.
- **Network Interfaces**: um card por placa de rede, com:
  - Nome, tipo e status UP/DOWN.
  - Endereço MAC, MTU e velocidade / duplex do link.
  - Todos os endereços `inet` e `inet6`, com máscara e gateway.
  - Um ícone de **estrela** para marcar uma interface como **principal**. O PatchMon passa a usar o endereço principal dessa interface como IP do host em toda a interface web, no lugar da detecção automática.

Desmarcar a interface principal reativa a detecção automática.

### System

Detalhes de hardware e sistema operacional coletados a cada relatório:

- **Versão do kernel**, **status do SELinux**, **arquitetura**, **gerenciador de pacotes**.
- Modelo de **CPU**, número de sockets/núcleos, frequência.
- **Memória**: total, usada, livre e swap (em GiB).
- **Armazenamento / layout de discos**.
- **Fabricante, produto e número de série do hardware** (quando o agente consegue ler).
- **Versão do SSG (OpenSCAP)**, quando a integração de conformidade está ativa.

A aba é somente leitura. Todos os valores vêm do relatório do agente.

### Agent Activity

Linha do tempo única de todos os ciclos de comunicação do agente com este host. Cada linha é de um destes tipos:

- **Ping**: check-in condicionado a hash (acontece em todo ciclo, mesmo quando nada mudou).
- **Full / Partial**: `/hosts/update` com o inventário completo ou só com as seções que o servidor marcou como desatualizadas.
- **Docker / Compliance**: envios específicos dessas integrações.
- **Job**: jobs da fila de saída que o servidor mandou para o agente (pedir relatório, execução de patch, configuração de integração etc.).

Os quatro cards de estatística da fila (Waiting / Active / Delayed / Failed) ficam acima da tabela e mostram os jobs do servidor para o agente que estão em andamento. A atualização automática acontece a cada 30 segundos.

Cada linha de relatório também mostra etiquetas por seção: "Updated", em verde, para as seções em que o agente mandou dados novos neste ciclo, e "Skipped", apagada, para as seções cujo hash o servidor já tinha. Use esta aba para:

- Confirmar que um host está fazendo check-in (procure linhas `Ping` recentes).
- Verificar quando uma mudança de pacote, repositório, interface de rede ou hostname foi propagada pela última vez.
- Investigar uma queixa do tipo "cliquei em Fetch Report e nada aconteceu", acompanhando a linha do job por `Waiting → Active → Completed` (ou `Failed`, com a mensagem de erro).

A retenção é definida pela variável de ambiente `AGENT_REPORTS_RETENTION_DAYS` (padrão de 30 dias, faixa de 7 a 365). A limpeza diária às 02:00 apaga o que for mais antigo. Os detalhes de ajuste estão no Guia do Operador.

> Versões anteriores dividiam esta visão em duas abas (Package Reports e Agent Queue). Favoritos com os parâmetros antigos `?tab=history` e `?tab=queue` são redirecionados para `?tab=activity`.

### Notes

Área de texto livre para anotações operacionais: janelas de mudança, responsáveis, configurações especiais, contatos de suporte. Clique na área de texto para editar e depois em **Save**.

As anotações ficam visíveis para qualquer usuário com `can_view_hosts` nesta instalação do PatchMon.

### Integrations

Chaves por host e status de configuração das integrações opcionais do agente. São dois painéis principais.

#### Docker

- **Chave**: ativa a descoberta de Docker neste host. Desligada, nenhum contêiner, imagem, volume ou rede é coletado.
- A mudança fica registrada como **configuração pendente**; uma faixa amarela aparece no topo da aba até que ela seja aplicada.
- Clique em **Apply** no cabeçalho da página para enviar a mudança ao agente pelo WebSocket. O agente atualiza o `config.yml` e confirma.

Pré-requisitos e solução de problemas estão em [Ativando a integração com Docker](#enabling-docker-integration).

#### Compliance Scanning

- Um seletor de três estados: **Disabled**, **On-Demand**, **Enabled**.
  - **Disabled**: nenhuma varredura.
  - **On-Demand**: só roda quando disparada pela interface; não entra nos relatórios agendados.
  - **Enabled**: as varreduras rodam no intervalo normal de relatório do agente.
- Indicador de **status de configuração** (Installing / Ready / Partial / Error), com o status de cada componente (OpenSCAP, Docker Bench).
- Seção **Scanner Types**: chaves individuais para **OpenSCAP (CIS Benchmarks)** e **Docker Bench** (a chave do Docker Bench fica desabilitada se a integração Docker estiver desligada neste host).

As mudanças exigem que o agente esteja conectado pelo WebSocket.

#### Refresh Status

O botão **Refresh Status**, no canto superior direito da aba, pede ao agente que informe na hora a situação atual das integrações. É útil depois de instalar o OpenSCAP manualmente no host.

### Reporting

Exceções de alerta específicas deste host. A aba fica oculta quando os alertas globais estão desativados em **Settings**.

O recurso principal é **Host Agent Down Alerts**, com três estados:

- **Inherit from global settings** (padrão).
- **Enabled**: sempre cria alertas quando o agente deste host cai, independentemente dos padrões globais.
- **Disabled**: nunca cria alertas para este host, mesmo com a configuração global ligada.

Use a exceção Disabled para hosts que devem ficar fora do ar de vez em quando (notebooks de desenvolvimento, runners de CI temporários), para que não inundem os seus canais de alerta.

### Docker (condicional)

Só aparece quando o host de fato reportou uma integração Docker funcionando em pelo menos um relatório. A aba é uma versão compacta, por host, da visão do parque inteiro descrita em [Conhecendo o inventário Docker](#docker-inventory-tour).

Subabas: **Stacks**, **Containers**, **Images**, **Volumes**, **Networks**. Cada uma mostra a contagem num selo ao lado do nome.

Exige o módulo `docker` ativo no seu plano. Planos sem o módulo mostram um selo de plano na aba e um convite de upgrade dentro dela.

### Patching

Histórico de execuções de patch do host e ponto de partida para novas execuções. Mostra:

- Uma lista de execuções deste host, com filtro, ordenação e paginação.
- Etiquetas de status (queued, running, completed, failed, approval pending).
- A saída das execuções concluídas, ali mesmo.
- O botão **Patch all**, no topo da página de detalhes do host, é o jeito rápido de iniciar uma nova execução restrita a este host.

Exige o módulo `patching`. Sem ele, a aba mostra um selo de plano.

### Compliance (condicional)

Aparece quando a integração de conformidade foi configurada e pelo menos uma varredura rodou. Mostra os resultados mais recentes do benchmark, as regras que falharam com orientação de correção e o histórico. O agente instala o OpenSCAP automaticamente quando a integração é ativada; esta aba mostra o andamento dessa instalação e a saída das varreduras.

Exige o módulo `compliance`.

### Terminal

Sessão SSH no navegador até o host, intermediada pelo agente. Não é preciso nenhuma porta de entrada no host: a conexão passa pelo WebSocket que o agente já mantém. O fluxo típico:

1. Abra a aba **Terminal**.
2. O PatchMon obtém um ticket SSH de curta duração e abre um WebSocket até o agente.
3. O agente se conecta ao SSH local (ou ao destino configurado) e repassa a sessão.
4. A análise assistida por IA fica disponível na própria interface do terminal.

Depende do módulo `ssh_terminal`. Além disso, a opção `ssh-proxy-enabled` do lado do agente, no `config.yml`, precisa estar ligada. Por causa das implicações de segurança, ela **não** é uma chave na interface. Veja a seção de SSH da Referência de configuração do agente.

### RDP (só Windows)

Sessão RDP no navegador usando um gateway Guacamole (`guacd`) no servidor do PatchMon. Como na aba Terminal, o agente é usado para chegar ao host, sem exigir regras de entrada no firewall.

Só aparece em hosts Windows, depende do módulo `rdp` e exige que a opção `rdp-proxy-enabled` esteja ligada no `config.yml` do agente.

### Janela de credenciais (Deploy Agent)

Clique em **Deploy Agent** (ícone de chave) no cabeçalho da página para abrir a janela. São duas abas.

#### Quick Install

Um comando de instalação pronto para copiar, já com o API ID e a API key deste host. Opções:

- **Force install (bypass broken packages)**: só Linux / FreeBSD.
- **Self-signed certificate (SSL bypass)**: só Windows.
- **Use curl instead of Invoke-WebRequest**: só Windows; contorna hosts em que o downloader do PowerShell é bloqueado.

Clique em **Copy**. Você é levado automaticamente para a tela **Waiting for Connection**, que fica consultando até o agente se conectar e mandar o primeiro relatório. É a mesma etapa 4 do assistente Add Host.

#### API Credentials

- **API ID**: pode ser copiado.
- **API Key**: oculta por padrão. A chave em texto claro **só** fica disponível logo depois de ser criada ou gerada de novo; fora isso, o campo mostra *hashed – not usable*.
- **Regenerate**: cria um novo API ID e uma nova chave e invalida os anteriores. Use se as credenciais foram perdidas ou comprometidas. O agente no host vai precisar ser reconfigurado, ou o comando de instalação rodado de novo.

### Ações comuns: onde clicar

Referência rápida para as perguntas "como eu faço…" mais comuns:

| Objetivo | Onde |
|------|-------|
| Pedir um relatório imediato | Cabeçalho da página → **Fetch Report** |
| Forçar o agente a se atualizar | Aba **Host Info** → **Update Now** |
| Abrir um shell no navegador | Aba **Terminal** |
| Ver o que o agente está fazendo agora | Aba **Agent Activity** |
| Mudar os grupos do host | Aba **Host Info** → campo **Host Groups** (ou edição direta na tabela de hosts) |
| Ligar / desligar o monitoramento de Docker | Aba **Integrations** → chave **Docker** e depois **Apply** no cabeçalho |
| Rodar varreduras CIS | Aba **Integrations** → seletor **Compliance** → **Enabled** ou **On-Demand** |
| Copiar de novo o comando de instalação | **Deploy Agent** (ícone de chave) → **Quick Install** |
| Trocar a API key | **Deploy Agent** → **API Credentials** → **Regenerate** |
| Aplicar patches só neste host | Cabeçalho da página → **Patch all** (abre o assistente restrito ao host) |
| Remover o host de vez | Cabeçalho da página → ícone de lixeira |

### Layout no celular

Em telas menores, a faixa de abas dá lugar a cards empilhados (**Host Information**, **Network**, **System**, **Agent Activity** e assim por diante). Os botões de ação viram uma fileira de ícones. Algumas seções mais densas (como o seletor de modo de Integrations) mostram um atalho **Manage in Integrations tab**.

Os dados no celular são os mesmos do desktop; só o layout muda.

### Páginas relacionadas

- [Adicionando um host](#adding-a-host): como um host chega até aqui.
- [Gerenciando grupos de hosts](#managing-host-groups): edição da participação em grupos.
- Gerenciando o agente do PatchMon: equivalentes em linha de comando das ações desta página.
- [Ativando a integração com Docker](#enabling-docker-integration): o que a chave Docker faz de fato.
- [Conhecendo o inventário Docker](#docker-inventory-tour): a visão de todo o parque dos dados que aparecem na aba Docker.

---

## Capítulo 5: Gerenciando grupos de hosts {#managing-host-groups}

### Visão geral

Os grupos de hosts são a principal forma de organizar o parque no PatchMon. Um grupo é um conjunto com nome, cor e descrição opcional. Cada host pode estar em quantos grupos quiser. Os grupos aparecem como coluna e filtro na página Hosts, como seletor na página Patching, como escopo das políticas de patch e como filtro na Integration API.

Este capítulo trata de criar, editar e excluir grupos, de colocar hosts neles e de como os grupos alimentam outras partes do PatchMon.

**Permissão necessária:** `can_manage_settings` para criar, editar e excluir grupos (a página fica em **Settings**); `can_manage_hosts` para mudar os grupos de um host.

### Onde ficam os grupos de hosts

A interface tem dois lugares para gerenciar grupos, e os dois editam os mesmos dados:

- **Settings → Host Groups**: a página completa, com tabela, ações de criar / editar / excluir e contagem de hosts.
- **Página Options** (`/options`): o mesmo componente de grupos, exibido ali para operadores que têm `can_manage_hosts` mas não `can_manage_settings`.

Os dois lugares dão acesso à contagem e à atribuição de hosts, mas o caminho oficial é **Settings → Host Groups**, e é ele que este capítulo descreve.

### Criando um grupo

1. Na navegação à esquerda, abra **Settings**.
2. Clique em **Host Groups** no submenu de configurações. A página abre com uma tabela dos grupos existentes e um botão **Create Group** no canto superior direito.
3. Clique em **Create Group**. Abre-se uma janela chamada **Create Host Group**.

O formulário tem três campos:

| Campo | Obrigatório? | Observações |
|-------|-----------|-------|
| **Name** | Sim | Identificador curto, como `Production`, `Web servers`, `DB tier`. Aparece na interface e nas respostas da API. |
| **Description** | Não | Texto livre exibido nas dicas e no card do grupo. Use para escopo ou responsável. |
| **Color** | Sim | Valor hexadecimal usado no ponto colorido ao lado do nome do grupo. Seletor + campo de texto; padrão `#3B82F6` (azul). |

Clique em **Create Group** para salvar. O novo grupo aparece na tabela na hora, com contagem **0 hosts**.

### Colocando hosts num grupo

A atribuição é feita no host, não no grupo. Há três caminhos.

#### Durante o registro

Na etapa 2 do assistente **Add Host** (**Host details**), marque cada grupo a que o host deve pertencer. Veja [Adicionando um host](#adding-a-host).

#### Direto na página Hosts

1. Abra **Hosts** na navegação à esquerda.
2. Encontre a linha do host que quer mudar.
3. Clique no valor da coluna **Group**. Ele vira uma seleção múltipla editável, com as etiquetas coloridas dos grupos.
4. Marque ou desmarque os grupos e clique fora (ou pressione Enter) para salvar.

#### Atribuição em massa

1. Abra **Hosts**.
2. Selecione várias linhas pelas caixas da coluna **Select**.
3. Aparece acima da tabela uma barra com **Fetch Reports**, **Assign to Group** e **Delete**.
4. Clique em **Assign to Group**. Uma janela lista todos os grupos com caixas de seleção.
5. Marque um ou mais grupos e clique em **Assign to Groups**. Todos os hosts selecionados são atualizados numa única chamada.

> **Atenção ao comportamento em massa:** a janela de atribuição em massa **define** os grupos selecionados em cada host; ela não acrescenta aos grupos que o host já tem. Para incluir um grupo sem tirar os outros, use a edição direta na tabela de hosts ou o seletor Host Groups na página de detalhes do host.

#### Pela página de detalhes do host

Abra qualquer host (**Hosts** → clique no nome amigável). Na aba **Host Info**, o campo **Host Groups** é uma seleção múltipla idêntica à da lista de hosts. Marque ou desmarque e clique fora para salvar.

### Editando um grupo

Em **Settings → Host Groups**:

1. Clique no ícone de lápis na coluna **Actions** do grupo que quer mudar.
2. Abre-se uma janela chamada **Edit Host Group**, com **Name**, **Description** e **Color** atuais já preenchidos.
3. Altere o que precisar e clique em **Update Group**.

Mudar o nome ou a cor de um grupo reflete em **todo lugar**: a tabela de hosts, a página de detalhes do host, os alvos de patching e a API passam a mostrar o novo valor imediatamente.

### Excluindo um grupo

A exclusão é restrita para você não deixar hosts órfãos por engano.

1. Em **Settings → Host Groups**, clique no ícone de lixeira ao lado do grupo.
2. Abre-se a janela **Delete Host Group**.
3. Se o grupo **não tem hosts**, o botão **Delete Group** fica habilitado. Confirme para excluir.
4. Se o grupo **tem um ou mais hosts**, a janela mostra um aviso amarelo com a lista de hosts do grupo, e o botão **Delete Group** continua desabilitado.

#### O que acontece com os hosts quando o grupo é excluído?

Não é possível excluir um grupo que ainda tem hosts. A interface impede e o servidor retorna erro. Para excluir um grupo com membros, primeiro mova ou retire os hosts:

- Tire cada host do grupo: abra o host, desmarque o grupo no campo **Host Groups** e salve. O host continua no PatchMon e mantém os outros grupos.
- Ou use a atribuição em massa na página Hosts para reatribuir muitos hosts de uma vez.

Com o grupo vazio, volte a **Settings → Host Groups** e exclua-o.

> **Observação:** excluir um grupo **não** exclui hosts. Os hosts que estavam só nesse grupo ficam **sem grupo** e continuam na lista de hosts. Podem ser colocados em outro grupo depois.

### Filtrando por grupo

#### Na página Hosts

1. Clique em **Filters** na barra da página Hosts para abrir o painel de filtros.
2. Abra a lista **Host Group**. Ela mostra todos os grupos e uma opção **Ungrouped**.
3. Escolha um grupo. A tabela recarrega mostrando só os hosts desse grupo.
4. Use **Clear Filters** para limpar.

Também dá para usar link direto: `/hosts?group=<groupId>`. Os cliques em grupos em outras partes da interface (por exemplo, no selo de contagem de hosts da página Host Groups) fazem exatamente isso.

#### Agrupando a tabela

Acima do painel de filtros, a lista **No Grouping** permite agrupar as linhas por **Group**, **Status** ou **OS**. Com **By Group**, a tabela de hosts é dividida em seções, uma por grupo, cada uma com a contagem no cabeçalho. Hosts em vários grupos aparecem em cada um deles. É um agrupamento visual, não um filtro.

#### Ocultando hosts desatualizados

A chave **Hide Stale**, na barra da página Hosts, pode ser combinada com o filtro de grupo para chegar, por exemplo, a "hosts ativos do grupo de produção".

### Como os grupos alimentam outros recursos

Os grupos funcionam como **seletor** no produto inteiro. Onde um fluxo pergunta "quais hosts?", normalmente dá para responder "este grupo".

#### Patching

- Ao montar uma execução de patch, o seletor de alvo oferece **Host** ou **Host group** como tipo de alvo.
- Ao escolher um grupo, o alvo passa a incluir todos os membros que o grupo tiver no momento em que a execução entra na fila.
- As políticas de patch (execuções recorrentes) podem usar um grupo como seletor principal. Assim, um host novo adicionado ao grupo entra automaticamente na próxima execução agendada.

O fluxo completo está nos capítulos de patching.

#### Integration API

A Integration API expõe a participação em grupos como filtro nos endpoints relacionados a hosts. Usos comuns:

- Listar os hosts de um grupo específico.
- Buscar o status de pacotes consolidado por grupo para um painel externo.
- Disparar relatórios em massa só para os hosts de `Production`.

Os endpoints e parâmetros exatos estão na Documentação da Integration API.

#### Alertas e relatórios

Alguns canais de alerta e relatórios agendados podem ser restritos por grupo de hosts. Assim, por exemplo, a equipe de plataforma recebe notificações só dos hosts de `Production`, enquanto a equipe de desenvolvimento cuida de `Staging`. Os detalhes estão nos capítulos de alertas e notificações.

#### Painéis

Os cards do painel e as contagens de resumo da página Hosts consideram o parque inteiro por padrão. As visões centradas num host (Host Detail) mostram os grupos do host como etiquetas coloridas; clicar numa etiqueta leva à lista de hosts filtrada por aquele grupo.

### Boas práticas

Alguns padrões que valem a pena:

- **Mantenha os nomes de grupo curtos.** Eles aparecem em etiquetas, tabelas e listas de filtro com largura limitada.
- **Um grupo por finalidade.** Ambiente (`Production`, `Staging`), função (`Web`, `DB`, `Cache`), localização (`EU-West`, `US-East`) ou responsável (`Platform`, `Billing`) são eixos razoáveis. Combine-os dando vários grupos a um host, em vez de criar grupos compostos como `Prod-Web-EU`.
- **Use as cores de forma consistente.** Por exemplo: vermelho para produção, amarelo para homologação, verde para desenvolvimento. Cores consistentes deixam as etiquetas da tabela de hosts e dos painéis legíveis num relance.
- **Grupo vazio não é problema.** Grupos sem hosts são válidos e muitas vezes são criados com antecedência, no planejamento das políticas de patch. A interface só não deixa excluir um grupo que ainda tem hosts.

### Páginas relacionadas

- [Adicionando um host](#adding-a-host): atribua grupos durante o registro.
- [Página de detalhes do host](#host-detail-page): edite os grupos de um único host.
- Documentação da Integration API: consulte hosts por grupo de forma programática.

---

## Capítulo 6: Inventário de pacotes {#package-inventory}

### Visão geral

A página **Packages** é o inventário de pacotes de todo o parque no PatchMon. Ela reúne numa única lista pesquisável todos os pacotes reportados por todos os agentes, com uma linha por nome de pacote. Cada linha mostra em quantos hosts o pacote está instalado, quantos precisam de atualização, se alguma dessas atualizações é de segurança e quais repositórios fornecem a versão mais recente.

Este capítulo percorre a lista de pacotes, os filtros, a página de detalhes de cada pacote e a ligação do inventário com o card **Outdated Packages** do painel.

**Permissão necessária:** `can_view_packages` para ver os pacotes; `can_manage_hosts` para disparar execuções de patch a partir desta página.

### Como chegar

Clique em **Packages** na navegação à esquerda. A página mostra uma linha de resumo, uma barra de filtros e uma tabela paginada.

Também dá para usar links diretos:

- `/packages?host=<hostId>`: já filtrado por um host específico.
- `/packages?filter=outdated`: só pacotes com pelo menos uma atualização pendente.
- `/packages?filter=security` ou `/packages?filter=security-updates`: só pacotes com atualizações de segurança disponíveis.
- `/packages?filter=regular`: só pacotes com atualizações que não são de segurança.

O card **Outdated Packages** do painel e os cards da página de detalhes do host usam esses atalhos na query string.

### Cards de resumo

O título indica o que os cards estão contando, e os cards sempre acompanham o título.

Sem filtro de host, o título é **Packages on all Hosts** e cinco cards resumem o parque inteiro:

| Card | Significado | Ao clicar |
|------|---------|-----------------|
| **Packages** | Nomes de pacote distintos no parque | – |
| **Installations** | Soma das instalações por host de todos os pacotes listados | – |
| **Outdated Packages** | Pacotes com pelo menos um host precisando de atualização | Filtra para **Packages Needing Updates** |
| **Security Packages** | Pacotes com pelo menos um host precisando de atualização de segurança | Filtra para **Security Updates Only** |
| **Outdated Hosts** | Hosts distintos que aparecem do lado "precisa de atualização" desses pacotes | Vai para **Hosts** filtrado pelos hosts que precisam de atualização |

Com filtro de host (por exemplo, ao clicar em **Outdated Packages** na página de detalhes de um host), o título passa a **Packages for <host> Host** e ganha um botão **Clear filter** que volta à visão do parque. Aparecem três cards, e todos os números contam só aquele host:

| Card | Significado | Ao clicar |
|------|---------|-----------------|
| **Packages** | Pacotes instalados neste host | – |
| **Outdated Packages** | Pacotes deste host que precisam de atualização | Filtra os pacotes deste host que precisam de atualização |
| **Security Packages** | Pacotes deste host que precisam de atualização de segurança | Filtra as atualizações de segurança deste host |

**Installations** e **Outdated Hosts** ficam ocultos com filtro de host. Os dois são medidas do parque: num único host, cada pacote está instalado exatamente uma vez, então Installations só repetiria Packages, e Outdated Hosts nem é um número por host.

Os cards **Outdated Packages** e **Security Packages** mantêm o filtro de host ativo; clicar neles estreita a lista em vez de reiniciar o escopo. Já o card **Outdated Hosts** leva para a página Hosts em vez de filtrar ali mesmo.

> **Observação:** os números do parque inteiro vêm de um retrato estatístico periódico, não de uma consulta ao vivo. Logo depois de um agente reportar, eles podem ficar alguns minutos atrás da tabela. Os números com filtro de host são lidos ao vivo e sempre batem com a lista abaixo deles.

### A barra de filtros

Acima da tabela:

- **Search**: busca em texto livre pelos nomes de pacote (com atraso de digitação e processada no servidor).
- **Category**: categoria do pacote informada pelo gerenciador de pacotes (só é preenchida nos gerenciadores que expõem categorias, principalmente apt/dpkg).
- **Update Status**: o filtro principal. Quatro opções:
  - **All Packages**
  - **Packages Needing Updates**
  - **Security Updates Only**
  - **Regular Updates Only**
- **Host**: limita a lista aos pacotes presentes num único host. Com ele definido, a página mostra só os pacotes desse host e libera o botão **Patch all**, para aplicar patches apenas nesse host.
- **Columns**: escolhe quais colunas aparecem e em que ordem.

> **Observação:** a barra filtra por um único **host**, não por **grupo de hosts**. Para revisar os pacotes de um grupo, abra a página **Hosts**, filtre pelo grupo, selecione os hosts e revise os pacotes pelos links de cada host ou pelos assistentes de patch. O patching de um grupo inteiro é feito pela página Patching, não por aqui.

### Lendo a tabela

Colunas padrão:

| Coluna | Conteúdo |
|--------|---------|
| **(seleção)** | Caixa de seleção. Marque para incluir o pacote numa execução de patch em vários hosts. |
| **Package** | Nome do pacote com o ícone `Package`. Clique no nome para abrir a página de detalhes do pacote. Um balão `Info` aparece quando o pacote tem descrição; clique nele para ver a descrição numa janela. |
| **Installed On** | Número de hosts com o pacote. Quando alguns desses hosts (mas não todos) precisam de atualização, a coluna mostra `N/M hosts` (por exemplo, `3/12 hosts` significa que 3 de 12 estão desatualizados). Clicar na célula abre esse conjunto de hosts na página Hosts. |
| **Status** | Um de três selos: **Up to Date** (verde), **Update Available** (âmbar), **Security Update Available** (vermelho, com ícone de escudo). |
| **Latest Version** | A versão mais nova do pacote que o PatchMon viu reportada em qualquer host. |
| **Source Repos** | Etiquetas de repositório, cada uma com link para o repositório. Se houver mais de três origens, o excedente aparece como `+N`. |

O botão **Columns** permite ocultar qualquer coluna, menos a de seleção, arrastar para reordenar e voltar ao padrão. O layout das colunas fica salvo localmente no navegador.

#### Como "Installed On" é calculado

A contagem inclui todos os hosts que o PatchMon viu reportando o pacote, seja qual for a versão. A parte "precisa de atualização" de `N/M hosts` são os hosts cuja versão instalada é mais antiga que a mais recente disponível nos repositórios configurados neles.

#### Atualizações de segurança e atualizações comuns

Um pacote é de "segurança" quando pelo menos um host vê para ele uma atualização marcada como de segurança (normalmente porque ela vem de um canal de segurança da distribuição, como `*-security` no Debian/Ubuntu, ou de um aviso do fornecedor no RHEL). Atualizações comuns são as que não são de segurança. A coluna **Status** mostra a de maior prioridade.

### Ordenação e paginação

- Clique em qualquer cabeçalho de coluna ordenável para alternar a direção.
- A ordenação por status segue uma prioridade: primeiro **Security Update Available**, depois **Update Available**, depois **Up to Date**. Em ordem crescente, os pacotes de maior risco ficam no topo.
- O seletor de tamanho de página (no pé da tabela) aceita 25, 50, 100 ou 200 linhas. A escolha fica lembrada no navegador.

### Abrindo um pacote

Clicar no nome de um pacote (ou usar a etiqueta de filtro na página de detalhes de um host) abre `/packages/<id>`, a página **Package Detail**. São duas abas.

#### Aba Hosts (padrão)

Lista todos os hosts em que o pacote está instalado. Elementos principais:

- Cards de resumo no topo: **Updates Needed**, **Latest Version**, **Updated** (quando o PatchMon viu pela última vez um relatório com o pacote), **Hosts with Package**, **Up to Date**.
- Uma faixa **Source Repositories** com todos os repositórios do parque que fornecem este pacote (clique para ver os detalhes do repositório).
- Painel **Description**: a descrição do pacote informada pelo gerenciador de pacotes do host.
- Filtro **Only pending**: marcado por padrão; desmarque para ver todos os hosts, inclusive os que já estão atualizados.
- **Search**: filtra a lista de hosts.
- Ações por linha: em hosts Linux/FreeBSD, dá para disparar um patch só deste pacote. Hosts Windows aparecem marcados como gerenciados pelo Windows Update / WinGet.
- Selecione várias linhas e use **Patch selected** para aplicar a mesma atualização em muitos hosts numa só execução de patch.

#### Aba Activity

Execuções de patch recentes em que este pacote foi atualizado, com horários, hosts alvo e resultados. Útil em auditorias do tipo "quando esta CVE foi fechada no parque?".

### Patch em massa pela página Packages

Há dois fluxos que geram uma execução de patch a partir da página Packages.

#### Aplicar patch nos pacotes selecionados, nos hosts escolhidos

1. Marque a caixa de cada pacote a incluir. O cabeçalho mostra `N selected`.
2. Clique em **Patch selected (N)** (canto superior direito).
3. O **assistente de patch** abre no modo de vários hosts, descobre quais hosts têm os pacotes selecionados instalados e precisando de atualização e deixa você escolher quais incluir.
4. Se o filtro **Host** já estiver num único host, o assistente fica preso a esse host, para não oferecer hosts sem relação.

#### Aplicar todos os patches num único host

1. Defina o filtro **Host** para um host.
2. Clique em **Patch all** (canto superior direito; só aparece quando um único host que não seja Windows está filtrado).
3. Confirme no assistente para atualizar todos os pacotes desatualizados desse host.

Os dois fluxos levam aos capítulos de patching. O que acontece em seguida está descrito lá.

### O card Outdated Packages do painel

O painel mostra um card **Outdated Packages** perto do topo do layout de cards (a posição exata depende da personalização do seu painel). O número exibido é a contagem, no parque inteiro, de pacotes com pelo menos um host precisando de atualização, o mesmo número do card **Outdated Packages** da página Packages quando ela não está filtrada por um host.

Clicar no card do painel leva a `/packages?filter=outdated`, que:

- Define o filtro **Update Status** como **Packages Needing Updates**.
- Limpa o filtro **Category**.
- Deixa os outros filtros no padrão.

A partir dali, você pode abrir pacotes individuais, montar uma execução de patch ou restringir a um host específico.

### Dicas

- **Lista ao vivo, dados de base periódicos.** As linhas vêm do servidor do PatchMon e refletem os relatórios mais recentes de cada host. Para atualizar na hora os dados de um host, abra a página de detalhes dele e clique em **Fetch Report**. A lista de pacotes pega o novo estado na próxima consulta (ou clique em **Refresh** na página Packages).
- **Investigando o estado de patches.** A página **Hosts** é o melhor ponto de partida quando a pergunta é quais *hosts* estão atrasados. Use a página Packages quando a pergunta é quais *pacotes* deixam o parque exposto.
- **Hosts Windows.** O inventário de pacotes funciona no Windows (via `winget`, `chocolatey` e inventário de MSI), mas as ações **Patch all** / **Patch selected** não se aplicam ao Windows. O patching no Windows é feito pelo Windows Update ou pelo WinGet diretamente no host.

### Páginas relacionadas

- [Página de detalhes do host](#host-detail-page): resumo de pacotes por host e ação de pedir relatório.
- [Acompanhamento de repositórios](#repository-tracking): de que repositório vem cada pacote.
- Gerenciando o agente do PatchMon: como o agente coleta os dados de pacotes.
- Documentação da Integration API: o mesmo inventário, de forma programática.

---

## Capítulo 7: Acompanhamento de repositórios {#repository-tracking}

### Visão geral

Todo host Linux tem um ou mais **repositórios de pacotes** configurados: entradas do `sources.list` no Debian/Ubuntu, arquivos `.repo` em `/etc/yum.repos.d/` na família RHEL, `repositories` no Alpine, entradas do `pacman.conf` no Arch e origens do `pkg` no FreeBSD. O agente do PatchMon inventaria esses repositórios a cada relatório e os envia junto com a lista de pacotes. O servidor consolida tudo numa visão única do parque, na página **Repositories**.

Este capítulo percorre a lista e os detalhes dos repositórios, os filtros, como a segurança é determinada e como os dados de repositório se mantêm atualizados.

**Permissão necessária:** `can_view_hosts` para ver os repositórios; `can_manage_hosts` para editar ou excluir registros de repositório.

### O que um registro de repositório representa

Um registro de repositório no PatchMon corresponde a uma origem de pacotes informada pelo gerenciador de pacotes de um host:

| Gerenciador de pacotes | Origem do repositório |
|-----------------|-------------------|
| **apt** (Debian, Ubuntu) | Cada entrada em `/etc/apt/sources.list` e em `/etc/apt/sources.list.d/*.list` ou `*.sources` |
| **yum / dnf** (CentOS, RHEL, Rocky, Alma, Fedora) | Cada entrada habilitada em `/etc/yum.repos.d/*.repo` |
| **apk** (Alpine) | Cada linha de `/etc/apk/repositories` |
| **pacman** (Arch) | Cada seção `[repo]` de `/etc/pacman.conf` |
| **pkg** (FreeBSD) | Cada repositório pkg configurado |

Vários hosts configurados com a mesma URL são reunidos num **único registro de repositório** na visão do parque, e assim dá para ver num relance quais hosts usam uma dada origem. A relação com cada host é guardada à parte, para você poder detalhar exatamente onde o repositório está em uso.

Campos principais de um registro de repositório:

- **Name**: identificador legível (muitas vezes o `Label` ou o `id` do repositório).
- **URL**: a URL base de onde o gerenciador de pacotes baixa.
- **Distribution / codinome da versão**: por exemplo, `jammy`, `el9`, `3.19`.
- **Is Secure**: `true` quando a URL começa com `https://`; `false` para `http://` em texto claro.
- **Is Active**: se o repositório está habilitado em pelo menos um host.
- **Host count**: número de hosts configurados com este repositório.

### Chegando à página Repositories

Clique em **Repositories** na navegação à esquerda. Também dá para usar link direto:

- `/repositories?host=<hostId>`: já filtrado pelos repositórios de um host.
- O card **Repos** da página de detalhes do host e as etiquetas de repositório da página Packages usam esses atalhos na query string.

### Cards de resumo

Quatro cards no topo:

| Card | Significado |
|------|---------|
| **Total Repositories** | Repositórios distintos no parque |
| **Active Repositories** | Repositórios habilitados em pelo menos um host |
| **Secure (HTTPS)** | Quantos repositórios usam HTTPS na URL |
| **Security Score** | `secure ÷ total`, em porcentagem |

Um Security Score baixo é um sinal rápido de que ainda há repositórios só em HTTP no parque, o que é um bom alvo de correção.

### Barra de filtros

- **Search**: busca em texto livre pelo nome e pela URL do repositório (com atraso de digitação e processada no servidor).
- **Indicador de filtro de host**: com `?host=<id>` definido, uma etiqueta mostra *Filtered by: <nome amigável>*, com um `X` para limpar.
- **Security**: **All Security Types** / **HTTPS Only** / **HTTP Only**.
- **Status**: **All Statuses** / **Active Only** / **Inactive Only**.
- **Columns**: escolhe as colunas visíveis e a ordem delas.

### Lendo a tabela

Colunas padrão:

| Coluna | Conteúdo |
|--------|---------|
| **Repository** | Nome, com ícone de banco de dados. Clique para abrir a página de detalhes. |
| **URL** | URL completa. Nos repositórios da família Debian, o prefixo `deb-` / `deb-src-` é retirado dos nomes exibidos para facilitar a leitura. |
| **Distribution** | Distribuição / codinome / versão. |
| **Security** | **Secure** (HTTPS), com ícone de cadeado fechado, ou **Insecure** (HTTP), com cadeado aberto. |
| **Status** | Active ou Inactive. |
| **Hosts** | Quantos hosts estão configurados com este repositório. Clique para filtrar a página Hosts pelos hosts que o usam. |
| **Actions** | Ícone de exclusão (exige `can_manage_hosts`). |

A visibilidade e a ordem das colunas ficam salvas no navegador.

### Abrindo um repositório

Clicar num repositório abre `/repositories/<id>`, a página **Repository Detail**. Ela tem três seções principais, uma abaixo da outra.

#### Repository Details

- **Name**, **Description**, **URL**, **Distribution**, **Is Active**, **Priority**.
- A edição no lugar (ícone de lápis, exige `can_manage_hosts`) permite mudar o nome amigável, a descrição, a flag de ativo e a prioridade.
- O botão **Delete repository** abre uma confirmação.
- Etiquetas de resumo no canto superior direito: seguro / inseguro, ativo / inativo, última atualização.

Editar ou excluir um repositório nesta tela afeta o **registro no PatchMon**, não a configuração do host. No próximo relatório do agente, o PatchMon se acerta com o que existe de fato no host: se o repositório ainda estiver configurado em algum host, ele reaparece. A exclusão serve mais para registros antigos que nenhum host usa.

#### Hosts Using This Repository

Uma lista pesquisável e paginada de todos os hosts que têm este repositório configurado. Cada linha mostra:

- Nome amigável (com link para a página de detalhes do host).
- Hostname e IP.
- Ícone do sistema operacional e versão.
- Quando o host reportou o repositório pela última vez.
- Configurações específicas do host (prioridade própria, flag de habilitado).

Use esta visão para responder perguntas como "quem ainda baixa deste espelho antigo?".

#### Packages from this Repository

Uma lista pesquisável e paginada de todos os pacotes que o PatchMon viu vindo por este repositório. Cada linha mostra:

- Nome do pacote (com link para a página de detalhes do pacote).
- Versão mais recente.
- Selo de status: **Up to Date**, **Update Available** ou **Security Update**.
- Etiqueta do repositório de origem.

É o jeito fácil de auditar "quais pacotes do meu parque vêm deste repositório de terceiros?".

### Como os repositórios se mantêm atualizados

Os agentes coletam a configuração de repositórios a cada ciclo de relatório:

1. O agente consulta o gerenciador de pacotes (`apt-cache policy`, `dnf repolist` etc.).
2. O resultado é serializado e enviado junto com o inventário de pacotes e as informações do sistema.
3. O servidor do PatchMon cria ou atualiza os registros de repositório e a tabela de ligação com cada host:
   - Repositórios novos aparecem.
   - Repositórios removidos são marcados como inativos (e os registros ficam guardados, para que o histórico de pacotes continue podendo apontar para eles).
   - Mudanças de URL ou distribuição são conciliadas. Se você muda uma URL em `/etc/apt/sources.list`, o próximo relatório atualiza o registro.

Como a atualização **depende dos relatórios**, a página Repositories mostra o último estado conhecido. Para forçar a atualização de um host na hora, abra o host e clique em **Fetch Report**.

### O filtro de segurança na prática

O filtro **HTTPS Only** / **HTTP Only** é a ferramenta de auditoria mais rápida para exigir origens de pacotes seguras:

1. Defina **Security** como **HTTP Only**.
2. A lista passa a mostrar todos os repositórios em texto claro do parque.
3. Para cada um, abra o repositório e use a lista **Hosts Using This Repository** para ver quem precisa ser reconfigurado.
4. Corrija no host (troque a URL para HTTPS no arquivo `.list` / `.repo` / `apk repositories` correspondente e, se preciso, atualize os repositórios de certificados da distribuição) e rode **Fetch Report** no host.
5. O próximo relatório tira o host do registro inseguro e o coloca no registro HTTPS.

Algumas configurações legítimas não têm como sair do HTTP: espelhos locais na intranet, por exemplo, ou repositórios com transporte inseguro mas assinados, como os arquivos clássicos do Debian, protegidos só por GPG. Use a descrição do repositório (no diálogo de edição) para marcar entradas como "HTTP aprovado", para que quem revisar depois saiba que isso foi avaliado.

### Excluindo um registro de repositório

Na tabela de repositórios ou na página de detalhes, operadores com `can_manage_hosts` podem excluir um registro. A confirmação lista o impacto:

- O registro do repositório é removido do PatchMon.
- As ligações dos hosts com esse registro são removidas.
- A configuração do host **não** muda; nenhum arquivo no host é alterado.

Como o agente reporta de novo a cada ciclo, a exclusão só é permanente se nenhum host tiver mais o repositório configurado. Por isso o filtro de status **Inactive Only** ajuda: registros sem hosts podem ser limpos com segurança, enquanto os que ainda estão ligados a hosts voltam no próximo relatório.

### Páginas relacionadas

- [Inventário de pacotes](#package-inventory): navegue pelos pacotes e use as etiquetas de repositório para ir aos detalhes do repositório.
- [Página de detalhes do host](#host-detail-page): os repositórios de cada host aparecem pelo card de resumo **Repos**.
- Gerenciando o agente do PatchMon: como o agente coleta os dados de repositório a cada relatório.
- Documentação da Integration API: os repositórios são expostos como objetos da API para ferramentas externas e relatórios de conformidade.

---

## Capítulo 8: Visão geral de patching {#patching-overview}

### O que é o patching

Patching é o recurso do PatchMon que aplica atualizações de pacotes e de segurança em hosts Linux e FreeBSD, sob demanda ou por agendamento, com validação, aprovação, interrupção, nova tentativa e transmissão dos logs ao vivo por WebSocket. Você o conduz pela página **Patching** da interface web ou pela aba **Patching** da página de detalhes de qualquer host.

Na 2.0, o patching deixou de ser um recurso secundário e virou um módulo completo. As execuções ficam gravadas, entram numa fila no Redis/asynq, são executadas pelo agente no host e transmitidas de volta ao navegador em tempo real.

---

### Liberação por módulo

As duas partes do recurso dependem de um módulo do plano. Se o módulo não estiver habilitado, a área correspondente da interface aparece bloqueada com o aviso "Upgrade required", e as rotas da API recusam a requisição.

| Área da interface | Módulo necessário |
|---|---|
| Painel de patching, Runs & History, disparar execução de patch, aprovar, interromper, tentar de novo | `patching` |
| Aba Policies, atribuições de política, exclusões, execuções agendadas | `patching_policies` |

Sem o módulo `patching`, a página Patching some da barra lateral. Com `patching` habilitado mas sem `patching_policies`, a aba Policies aparece com um selo de plano.

---

### Quem pode usar

Além do módulo, o patching usa duas permissões de RBAC:

| Ação | Permissão | Padrão de rota |
|---|---|---|
| Ver o painel, listar execuções, abrir uma execução, acompanhar a transmissão ao vivo | `can_view_hosts` | `GET /patching/*` |
| Disparar uma execução, aprovar, repetir a validação, interromper, excluir uma execução | `can_manage_patching` | `POST /patching/trigger`, `POST /patching/runs/{id}/approve` etc. |
| Ver políticas | `can_view_hosts` | `GET /patching/policies` |
| Criar, editar e excluir políticas, atribuições e exclusões | `can_manage_patching` | `POST/PUT/DELETE /patching/policies/*` |

Se o seu papel tem `can_view_hosts` mas não `can_manage_patching`, a página Patching aparece somente para leitura. Os botões de ação (Patch all, Approve, Stop, Delete) não aparecem ou retornam 403.

---

### Os três conceitos centrais

Tudo no módulo de patching gira em torno de três conceitos.

#### 1. Execução de patch

Uma **execução de patch** (patch run) é uma unidade de trabalho de patching sobre um único host. Toda vez que você clica em "Patch all" num host, aprova um envio ou repete uma validação, uma linha de execução é criada no banco de dados.

Cada execução tem:

- Um **tipo**: `patch_all` (instala todas as atualizações de pacote disponíveis) ou `patch_package` (instala um pacote ou um conjunto de pacotes específicos).
- Uma **flag de simulação**: com `dry_run=true`, o agente informa o que *mudaria*, sem instalar nada. Isso só vale para `patch_package`. Um `patch_all` não pode ser simulado, porque o caminho de atualização em massa do agente não suporta `--dry-run` de forma confiável.
- Um **status**, que avança pelo ciclo de vida da execução (veja abaixo).
- Uma **saída de shell** gravada, com cada linha de stdout/stderr produzida pelo gerenciador de pacotes. Quem está acompanhando ao vivo recebe a saída pelo WebSocket; os demais recebem o conteúdo completo ao final.
- **Metadados de política**, opcionais: a política de patch efetiva é copiada para a execução no momento do disparo, e assim o detalhe da execução mostra "qual política valia quando isto entrou na fila".

#### Status de uma execução

O servidor passa a execução pelos status abaixo, que aparecem como selos na tabela Runs & History e no cabeçalho do detalhe da execução:

| Status | Significado |
|---|---|
| `queued` | A tarefa de execução entrou na fila do asynq e está esperando o worker pegá-la. |
| `pending_validation` | Uma simulação foi colocada na fila para validação, mas ainda não terminou (o host pode estar offline). |
| `validated` | A simulação terminou com sucesso; a execução espera a aprovação de um operador. |
| `pending_approval` | Uma execução de patch foi enviada para aprovação sem simulação (por exemplo, um `patch_all`, que não pode ser simulado). Alguém com poder de aprovação precisa aprovar antes de ela entrar na fila. |
| `approved` | A execução de validação original, depois de aprovada. Uma nova execução real (ligada por `validation_run_id`) é criada ao lado desta linha e colocada na fila. |
| `scheduled` | A execução foi aceita, mas espera o horário de `run_at` (política com atraso ou horário fixo). |
| `running` | O agente está executando o comando do gerenciador de pacotes no host. É este status que abre a transmissão ao vivo pelo WebSocket. |
| `completed` | A execução terminou com sucesso. A `shell_output` gravada passa a ser a referência. |
| `dry_run_completed` | Uma simulação terminou com sucesso (estado final das simulações que não viram execução real). |
| `failed` | A execução terminou com código de saída diferente de zero ou o host reportou um erro. |
| `cancelled` | A execução foi interrompida por um operador em **Stop Run** (ou excluída antes de rodar). O cancelamento é registrado primeiro no banco, que prevalece; se o agente estiver conectado, o servidor também manda um `patch_run_stop` para interromper o subprocesso. Com essa ordem, um agente offline ou sem resposta não deixa a linha presa em `running`. |
| `timed_out` | A limpeza periódica de execuções encontrou esta execução ainda em `running` além do tempo limite configurado (`PATCH_RUN_STALL_TIMEOUT_MIN`, padrão de 30 minutos) e a marcou como expirada. A limpeza roda a cada 10 minutos. |
| `agent_disconnected` | O WebSocket do agente caiu enquanto esta execução estava em `running`. O servidor marca todas as execuções em andamento daquele host como `agent_disconnected`, para que a linha não fique em `running` indefinidamente. Se o agente reconectar e mandar depois um `completed` / `failed` / `cancelled` para a mesma execução, o servidor atualiza a linha para esse estado final. |

#### 2. Política de patch

Uma **política de patch** controla *quando* uma execução aprovada é de fato disparada. As políticas são opcionais: um host sem política recebe a política implícita "Default", que aplica os patches assim que são disparados.

Cada política tem um **tipo de atraso**:

- **Immediate**: roda assim que a tarefa sai da fila.
- **Delayed**: espera N minutos depois do disparo (útil para "me dê 30 minutos para eu mudar de ideia").
- **Fixed time**: roda num horário específico (`HH:MM`), interpretado no **fuso horário da organização** (Settings → General → Timezone). Usado para janelas de manutenção.

As políticas são atribuídas a **hosts** ou a **grupos de hosts**. Também dá para criar **exclusões** por host, para tirar hosts específicos de uma política atribuída a um grupo. Os detalhes completos estão em [Políticas de patch e agendamento](#patch-policies-and-scheduling).

#### 3. Simulação / validação

Uma **simulação** (dry-run, também chamada de execução de validação) pede ao agente que simule a instalação dos pacotes sem aplicá-la. Ela existe para pegar problemas *antes* de mexer no host:

- Com `apt-get`, o agente roda `apt-get -s install <packages>` e interpreta a saída da simulação.
- Com `dnf`/`yum`, o agente roda a etapa de planejamento que informa "o que seria instalado" sem efetivar.
- Com `pkg` no FreeBSD, o agente roda `pkg upgrade -n` ou o equivalente de instalação sem execução.
- Com `pacman`, o agente usa `pacman -S -p` / `pacman -Syu -p` (só imprime) como etapa de validação.

Quando a simulação termina, a execução passa para `validated` e mostra a lista de pacotes que *seriam* instalados, incluindo as dependências puxadas. Se forem instalados mais pacotes do que você pediu, a interface marca a execução com o selo **Extra deps** e mostra a lista completa no painel "Packages affected" do detalhe da execução, para você revisar antes de aprovar.

A **aprovação** é a etapa que transforma uma simulação validada numa execução real. Na aprovação:

1. A execução de validação é marcada como `approved` (estado final) e guardada com a saída, para auditoria.
2. Uma **nova** execução de patch é criada com `dry_run=false`, ligada à validação por `validation_run_id`.
3. A nova execução entra na fila conforme a política efetiva. Assim, um "Approve & Patch" às 14:00 num host com política de horário fixo `03:00` gera uma execução `scheduled`, não imediata.
4. Na aprovação, dá para passar por cima da política escolhendo **Immediate** no assistente de aprovação, o que ignora o atraso.

---

### Sistemas operacionais suportados

O agente escolhe o mecanismo de patching detectando o gerenciador de pacotes do host. O patching em Linux e FreeBSD é totalmente suportado; o Windows tem um caminho próprio.

| Gerenciador de pacotes | Sistemas | Patching suportado |
|---|---|:---:|
| `apt-get` | Debian, Ubuntu, Raspbian | Sim |
| `dnf` | RHEL 8+, Rocky, AlmaLinux, Fedora | Sim |
| `yum` | RHEL 7, CentOS 7 | Sim |
| `pacman` | Arch Linux, Manjaro | Sim |
| `pkg` | FreeBSD 13+ (mais `freebsd-update` para o sistema base no `patch_all`) | Sim |
| `apk` | Alpine Linux | **Não.** O agente reporta o inventário do `apk`, mas recusa execuções de patch com `package manager "apk" not supported for patching (apt, dnf, yum, pkg, pacman required)`. Hosts Alpine aparecem no PatchMon e recebem varreduras de conformidade, mas as execuções de patch neles falham do lado do agente. |
| `zypper` | openSUSE Leap, openSUSE Tumbleweed, SLES | **Não, e também sem inventário. Em breve.** O instalador detecta o zypper e conclui, e o agente detecta o sistema corretamente, mas o agente não tem suporte a zypper. Por isso a coleta de pacotes falha com `unsupported package manager: unknown` e o host nunca completa o primeiro relatório, ficando em "Waiting for initial system report". Acompanhe e vote no suporte a zypper em [feedback.patchmon.net](https://feedback.patchmon.net/b/feature-requests/posts/post_01kyza53c0fzst214afbr1qn9a). |
| Windows Update Agent (WUA) + WinGet | Windows 10/11, Server 2019/2022/2025 | Sim (caminho separado) |

> **Observação:** as notas da versão 2.0 descrevem o patching em Linux de forma geral. Se você precisa aplicar patches em hosts Alpine, acompanhe o roadmap de gerenciadores de pacotes ou use as suas ferramentas atuais de Alpine até o suporte a `apk` chegar.

#### Patching no Windows

Quando o agente detecta que está no Windows, as execuções de patch seguem o caminho WUA + WinGet, e não o dos gerenciadores de pacotes do Linux:

- **Patch all** instala todas as atualizações do Windows Update que o servidor marcou como `approved` para aquele host e roda `winget upgrade --all` para os aplicativos gerenciados pelo WinGet.
- **Patch package** decide pelo nome: textos com cara de atualização `KB...` / GUID vão pelo WUA; o resto é tratado como ID de pacote do WinGet.
- O estado de reinício, a limpeza de atualizações substituídas e a sincronização de GUIDs aprovados passam por endpoints próprios, `/patching/windows-updates/*`, usados pelo agente Windows em beta.

O patching no Windows está marcado como **beta** na 2.0, e a página de detalhe da execução é igual em qualquer sistema. O painel do terminal só mostra saída de PowerShell / `winget` em vez de `apt-get`.

---

### Onde o patching fica na interface

Há dois caminhos para o patching pela navegação à esquerda:

1. **Patching** (item principal da barra lateral): a visão do parque inteiro. É a página descrita em [Executando um patch](#running-a-patch), [Políticas de patch e agendamento](#patch-policies-and-scheduling) e [Histórico de patches e logs ao vivo](#patch-history-and-live-logs).
2. **Hosts → *selecione um host* → aba Patching**: a visão por host. Ali você inicia um **Patch all** para o host, acompanha a lista de pacotes e abre qualquer execução anterior daquele host. A aba some quando o módulo `patching` está desabilitado.

Também se chega à interface de patching por:

- Um link de pacote na página Packages. "Patch this package" abre o assistente de `patch_package` já com o pacote selecionado e os hosts em que ele está instalado.
- Os cards de patching do painel (contagem de execuções na fila e em andamento), que levam à aba Runs & History com o filtro de status correspondente.

---

### O que acontece quando você clica em "Patch All"

O fluxo completo de uma execução `patch_all`:

1. Você clica em **Patch all** na página de detalhes de um host. O **Patch Wizard** abre, já com o host.
2. Opcionalmente, você passa por cima da política (por exemplo, "Run immediately" num host com política de atraso) e clica no botão de disparo.
3. O navegador chama `POST /patching/trigger` com `patch_type=patch_all`. Como `patch_all` não pode ser simulado, a execução começa em `pending_approval` se você marcou "Submit for approval"; caso contrário, vai direto para `queued`.
4. O servidor insere uma linha em `patch_runs`, copia para ela a política efetiva e coloca uma tarefa `run_patch` na fila `patching` do asynq. Se a política tiver atraso, o asynq agenda a tarefa para depois e a execução aparece como `scheduled`.
5. Quando a tarefa sai da fila, o servidor manda uma mensagem WebSocket `run_patch` para o agente conectado daquele host.
6. O agente muda a execução para `running`, chama `apt-get --with-new-pkgs upgrade -y` (ou o equivalente do sistema) e devolve stdout/stderr por `POST /patching/runs/{id}/output`, em pedaços pequenos. No Debian e no Ubuntu, `--with-new-pkgs` permite que a atualização instale pacotes que ainda não estão no sistema, que é o que uma mudança de ABI do kernel exige. Sem essa opção, o apt segura essas atualizações e elas continuam aparecendo como pendentes depois de cada execução.
7. O servidor repassa cada pedaço aos navegadores inscritos em `GET /patching/runs/{id}/stream` e grava a saída combinada no banco.
8. Em caso de sucesso, o agente manda um estágio final `completed` com a saída de shell definitiva. O servidor marca a execução como `completed`, emite a notificação `patch_run_completed` e marca o host como "aguardando relatório pós-patch", para que a próxima sincronização de inventário atualize o status dos pacotes.
9. A página de detalhe da execução troca o selo verde **Live** por um discreto **Awaiting inventory report** e, depois, por **New report received**, quando o agente manda o próximo relatório de inventário agendado e o sistema sabe que os pacotes no host refletem a realidade.

O passo a passo para o operador está em [Executando um patch](#running-a-patch). Tudo o que envolve o painel do terminal e a transmissão de logs está em [Histórico de patches e logs ao vivo](#patch-history-and-live-logs).

---

### Documentação relacionada

- [Executando um patch](#running-a-patch): passo a passo, do disparo ao log ao vivo e ao estado final.
- [Políticas de patch e agendamento](#patch-policies-and-scheduling): configure quando os patches rodam de fato.
- [Histórico de patches e logs ao vivo](#patch-history-and-live-logs): a tabela Runs & History e a saída ao vivo do terminal.
- Notas da versão 2.0.0: a versão que introduziu o módulo de patching.

---

## Capítulo 9: Executando um patch {#running-a-patch}

Este capítulo mostra como iniciar uma execução de patch pela interface web do PatchMon: do primeiro clique à validação por simulação, à aprovação e aos logs ao vivo, até o estado final. Tudo acontece no navegador, numa sessão autenticada.

Parte-se do princípio de que o módulo `patching` está habilitado e que você tem a permissão `can_manage_patching`. Se os botões de ação não aparecerem, a matriz de permissões está em [Visão geral de patching](#patching-overview).

---

### Pontos de partida

Uma execução de patch pode começar de três lugares:

| Ponto de partida | O que já vem preenchido | Uso típico |
|---|---|---|
| **Host Detail → aba Patching → Patch all** | Host alvo fixo; tipo `patch_all` | "Atualize tudo neste host, agora." |
| **Host Detail → aba Patching → Patch selected packages** | Host alvo fixo; tipo `patch_package` com os pacotes que você marcou | "Corrija só estas duas CVEs neste host." |
| **Packages → *selecione um pacote* → Patch this package** | Nome do pacote fixo; a lista de hosts vem do inventário do parque (só os hosts que de fato precisam da atualização) | "Distribua este pacote no parque inteiro." |

Os três levam ao mesmo **Patch Wizard**, uma janela única usada em todo lugar onde se inicia um patch. O modelo mental é o mesmo, seja qual for o ponto de partida.

---

### O Patch Wizard

O assistente tem uma sequência fixa de seis etapas, mas pula sozinho as que não exigem decisão no seu caso. As etapas não usadas aparecem apagadas no indicador, para você sempre ver o fluxo completo.

| # | Etapa | Aparece quando |
|---|---|---|
| 1 | **Hosts** | Você entrou por Packages (distribuição no parque) e precisa escolher em quais hosts aplicar. Oculta quando o host já vem fixo. |
| 2 | **Packages** | Você entrou com uma lista de vários pacotes e quer enxugá-la. Oculta em `patch_all` ou em execuções de um só pacote. |
| 3 | **Validate** | Só em `patch_package`. Oculta em `patch_all` (não pode ser simulado) e nos fluxos de aprovação (a validação já existe). |
| 4 | **Timing** | Sempre. Revise a política efetiva e, se quiser, passe por cima dela com "run immediately". |
| 5 | **Approval** | Só em `patch_package`. Escolha "Approve & Patch now" ou "Submit for approval". Oculta no modo de aprovação. |
| 6 | **Submit** | Sempre. Resumo final por host e botão de disparo. |

A navegação no assistente é só para a frente; o botão **Back** percorre as etapas ativas e pula as ocultas.

---

### Fluxo A: Patch all num único host

É o caso mais simples: atualizar todos os pacotes desatualizados de um host.

1. Abra **Hosts** → *selecione o host* → aba **Patching**.
2. Clique em **Patch all**. O assistente abre na etapa **Timing** (Hosts, Packages, Validate e Approval são puladas no `patch_all`).
3. Revise a política de patch efetiva mostrada na etapa Timing. Se o host tiver uma política com atraso ou horário fixo, o assistente informa quando a execução vai começar de fato (por exemplo, "Runs at 03:00 Europe/London").
4. Se precisar ignorar o atraso, marque **Run immediately**. Isso define `schedule_override=immediate` na chamada de disparo, e a execução roda assim que o worker a tira da fila.
5. Clique em **Next** para ir a **Submit**.
6. Em **Submit**, leia o resumo por host (nome do host, tipo de patch, horário efetivo) e clique em **Queue & patch**.

O que acontece em seguida no servidor:

- Uma linha é inserida em `patch_runs` com `patch_type=patch_all`, `dry_run=false` e a cópia da política.
- Uma tarefa `run_patch` entra na fila `patching` do asynq.
- Se a política tiver atraso, a tarefa é agendada para depois e a execução aparece como `scheduled` em Runs & History. Senão, vai direto para `queued`.
- O navegador leva você à página **Run Detail**, para acompanhar o terminal ao vivo.

> **Observação:** `patch_all` não pode ser simulado. O caminho de atualização em massa do agente (`apt-get --with-new-pkgs upgrade`, `dnf upgrade`, `pkg upgrade`, `pacman -Syu`) não tem um modo de simulação confiável. Se quiser simular, aplique patches em pacotes específicos.

---

### Fluxo B: Patch de um pacote específico, com simulação

É o fluxo mais completo, e o indicado para qualquer coisa sensível do ponto de vista de segurança. A simulação roda primeiro, você revisa a transação e depois aprova.

1. Abra **Patching** → entre no pacote a partir de um host, ou comece por **Packages** → *nome do pacote* → **Patch this package**.
2. O assistente abre na etapa **Validate** (as etapas Hosts e Packages podem aparecer em distribuições no parque).
3. Clique em **Run dry-run**. O navegador chama `POST /patching/trigger` com `dry_run=true`. Para cada host alvo, o servidor:
    - Cria uma linha em `patch_runs` com status `pending_validation`.
    - Manda ao agente o comando `run_patch` com `DryRun=true`.
    - O agente roda a etapa de simulação do gerenciador de pacotes (por exemplo, `apt-get -s install <packages>`).
4. O assistente consulta cada execução até ela terminar. Enquanto espera, você vê:
    - O selo de status de cada host (pending validation → running → validated).
    - Um trecho ao vivo do terminal do host em execução.
5. Quando a simulação termina, a execução passa para `validated` e o assistente mostra:
    - A lista final **Packages affected** (o que seria instalado; sempre inclui o pedido original e pode ter mais, por causa da resolução de dependências).
    - Um selo **Extra deps**, se a resolução de dependências puxou pacotes que você não pediu.
    - O stdout/stderr capturado da simulação.
6. Revise a saída. Se a transação estiver correta, clique em **Next** para ir a **Timing**, escolha **Run immediately** ou mantenha o atraso da política, e depois clique em **Approve & Patch** na etapa Submit.
7. O navegador chama `POST /patching/runs/{validationId}/approve`. O servidor:
    - Marca a execução de validação como `approved` (estado final; a linha e a saída ficam guardadas para auditoria).
    - Cria uma **nova** linha em `patch_runs` com `dry_run=false`, ligada à validação por `validation_run_id`.
    - Coloca na fila a tarefa `run_patch` real, com o atraso da política efetiva.
    - Devolve o ID da nova execução; se ela for começar na hora, a interface leva você à página de detalhe dela.

#### Repetindo uma validação travada

Se o agente estava offline quando você disparou a simulação, a execução fica em `pending_validation` até ele voltar. Há duas saídas:

- **Retry Validation**: coloca de novo na fila a mesma tarefa de simulação. Use depois que o agente voltar. Funciona via `POST /patching/runs/{id}/retry-validation` e só está disponível para execuções `patch_package`.
- **Skip & Patch**: pula a simulação e coloca direto na fila a execução real. Use quando você tem certeza da mudança e o host não vai voltar tão cedo. A interface pinta o botão de âmbar para deixar claro que uma etapa de segurança está sendo pulada.

As duas opções estão na tabela Runs & History, na página de detalhe da execução e nas ações de cada linha.

#### Enviando um patch_all para aprovação

O `patch_all` não pode ser simulado, mas ainda pode passar por uma aprovação. Na etapa **Approval** do assistente, marque **Submit for approval**. A execução é criada com status `pending_approval` e nenhuma tarefa entra na fila. Outra pessoa com `can_manage_patching` pode então abrir Runs & History e clicar em **Approve** naquela linha; o servidor monta a execução real do mesmo jeito que numa aprovação de simulação. Até lá, a execução fica no banco e também pode ser excluída.

---

### Fluxo C: Patch de um pacote no parque inteiro

Igual ao Fluxo B, mas começando pela página **Packages**. O assistente descobre quais hosts têm o pacote desatualizado (só esses aparecem na etapa Hosts) e valida cada um em paralelo.

1. Vá a **Packages** → clique no nome do pacote → **Patch this package**.
2. O assistente abre em **Hosts**. Marque os hosts em que quer aplicar o patch, ou **Select all**.
3. Clique em **Next** para ir a **Validate**. O assistente dispara as simulações nos hosts selecionados com concorrência limitada (5 por vez, por padrão), para não sobrecarregar a fila.
4. Quando todos os hosts chegam a um estado final de validação, aparece uma tabela de resultados por host. Hosts com simulação que falhou ficam marcados, para você excluí-los da aprovação ou tentar de novo.
5. **Timing** permite escolher uma exceção de política por host, útil quando o parque mistura políticas.
6. **Submit** chama `POST /patching/runs/{id}/approve` uma vez para cada execução validada. As falhas aparecem numa faixa de resultado da aprovação em massa quando você volta a Runs & History.

---

### Acompanhando uma execução: a página Run Detail

Depois que uma execução é disparada, se não houver atraso, a interface leva você a `/patching/runs/{id}`. A página tem:

- Um cabeçalho com o nome do host, o selo de status, o selo **Awaiting inventory report** (pós-patch) e os botões de ação para o estado atual (Approve & Patch, Retry Validation, Skip & Patch, Stop Run).
- À esquerda, um card **Run summary**: host, tipo, quem iniciou, quem aprovou, horários de início e fim, link para a execução de validação (se houver), política de patch em vigor e pacotes afetados.
- À direita, um terminal **Shell output** com a transmissão ao vivo dos logs.

#### Logs ao vivo

Enquanto a execução está em `running`, a página Run Detail abre uma conexão WebSocket com `/api/v1/patching/runs/{id}/stream`. O hub `patchstream`, dentro do processo do servidor, repassa os eventos publicados pelo agente para todos os navegadores conectados:

- **snapshot**: enviado uma vez, na conexão. Traz o estágio atual e a `shell_output` já gravada, para o terminal já vir preenchido mesmo que você chegue no meio da execução.
- **chunk**: um pedaço curto de stdout/stderr do agente, acrescentado ao terminal assim que chega.
- **done**: um estágio final (`completed`, `failed`, `cancelled`, `validated` ou `dry_run_completed`). O socket fecha e a interface busca de novo os metadados da execução para mostrar o estado final.

O cabeçalho mostra um selo verde pulsante **Live** enquanto o WebSocket está aberto. Se você rolar o terminal para cima para ler saídas anteriores, a rolagem automática para; volte ao fim e ela recomeça.

Se você abre uma execução que já está num estado final, o servidor manda uma única mensagem `snapshot` com a `shell_output` gravada, mais uma mensagem `done` sintética, e fecha a conexão. O banco é a fonte da verdade, então você vê exatamente o mesmo conteúdo de terminal que qualquer outra pessoa.

#### Copiando a saída

Quando a execução não está em `queued` nem em `running`, aparece um botão **Copy output** acima do terminal. Ele copia toda a saída de shell para a área de transferência. Use para relatórios de incidente ou para colar num chamado.

O terminal normaliza os retornos de carro. O `apt-get` e o `dpkg` usam `\r` para redesenhar barras de progresso numa mesma linha, o que ficaria invisível numa rolagem. A interface converte `\r` em `\n`, e cada atualização de progresso vira uma linha legível.

---

### Interrompendo um patch em andamento

Uma execução pode ser interrompida enquanto está em `running`. É uma parada imediata, sem "deixar terminar o pacote atual".

1. Na página Run Detail, clique em **Stop Run** no cabeçalho.
2. Confirme na caixa de diálogo. O aviso "Partially-installed packages may leave the host in an intermediate state" existe por um motivo: interromper o `apt` ou o `dnf` no meio de uma transação pode deixar o dpkg ou o rpmdb precisando de reparo manual.
3. O navegador chama `POST /patching/runs/{id}/stop`. O servidor localiza o agente no `agentregistry`, manda uma mensagem WebSocket `patch_run_stop` e responde `202 Accepted`.
4. O agente cancela o subprocesso com `SIGINT`, junta a saída que tiver e informa ao servidor um estágio final `cancelled`.
5. A transmissão ao vivo fecha e o status final da execução é `cancelled`.

#### Quando Stop Run não está disponível

- A execução não está em `running` (não há subprocesso para interromper). Em `queued`, `scheduled`, `pending_validation`, `pending_approval` ou `validated`, use **Delete** em Runs & History. Isso também remove da fila do asynq qualquer tarefa agendada.
- O agente não está conectado. A interface retorna 409 com "Agent is not currently connected". Espere o agente reconectar ou pare o serviço systemd do agente, se precisar matar o processo de patch no nível do sistema operacional.

---

### Depois do patch: o selo Awaiting inventory report

Quando um `patch_all` ou um `patch_package` real (não simulado) termina, o servidor preenche `awaiting_post_patch_report_run_id` no host. A página Run Detail mostra o selo **Awaiting inventory report** ao lado do status, e a consulta continua a cada 3 segundos.

O próximo relatório de inventário agendado do agente (normalmente em até 60 minutos, antes se for disparado manualmente) atualiza a lista de pacotes do host. O servidor limpa a marcação de espera e:

- Se o `last_update` do host for mais recente que o `completed_at` da execução, o selo muda para **New report received**.
- Caso contrário, o selo some. A ausência dele é o sinal discreto de sucesso.

É assim que você sabe que os pacotes instalados pela execução já aparecem no inventário de pacotes, e não só que o comando do apt retornou 0.

---

### Solução de problemas comuns

#### A execução fica em `queued` para sempre

O worker do asynq pegou a tarefa, mas não consegue falar com o agente, ou o agente nunca recebeu o comando pelo WebSocket.

- Verifique o status de conexão do agente na página de detalhes do host (selo verde Connected).
- Procure nos logs do servidor entradas `patching:` com o ID da tarefa (`patch-run-<run-id>`).
- Se o agente estava offline e acabou de reconectar, espere até 30 segundos pelo novo handshake do WebSocket.

#### "package manager ... not supported for patching"

O agente recusou a execução porque o gerenciador de pacotes detectado no host não está na lista suportada (`apt`, `dnf`, `yum`, `pkg`, `pacman`). É o erro que aparece hoje em hosts Alpine (`apk`). A execução passa na hora para `failed`, com a mensagem em `error_message`.

#### A execução termina, mas o inventário de pacotes não atualiza

O agente ainda não mandou o relatório de inventário pós-patch. O selo **Awaiting inventory report** muda sozinho quando ele chegar. Se não chegar em uma hora, force um relatório pela CLI do agente:

```bash
sudo patchmon-agent report
```

#### Approve retorna 400 "Only validated... runs can be approved"

Outro operador aprovou ou excluiu a execução enquanto você olhava para ela. Recarregue Runs & History; a linha estará em `approved` ou terá sumido.

---

### Documentação relacionada

- [Visão geral de patching](#patching-overview): os três conceitos centrais, a liberação por módulos e os sistemas suportados.
- [Políticas de patch e agendamento](#patch-policies-and-scheduling): controle quando as execuções aprovadas rodam de fato.
- [Histórico de patches e logs ao vivo](#patch-history-and-live-logs): a tabela Runs & History, os filtros e mais detalhes sobre a transmissão de logs.
- Gerenciando o agente do PatchMon: CLI do agente, gerenciamento do serviço e solução de problemas de conexão.

---

## Capítulo 10: Políticas de patch e agendamento {#patch-policies-and-scheduling}

Uma **política de patch** controla *quando* uma execução de patch aprovada é de fato disparada num host. Com políticas, você define janelas de manutenção, cria um intervalo de segurança para execuções em que talvez mude de ideia ou força a execução imediata no que for importante. Atribuições e exclusões permitem aplicar uma política de forma ampla (a um grupo de hosts) e ainda assim tirar hosts específicos dela.

Este capítulo percorre o modelo de política, como a política efetiva é determinada, a interface de configuração e como as políticas interagem com o disparo das execuções.

---

### Liberação por módulo e permissões

As políticas de patch dependem do módulo `patching_policies`, separado do módulo base `patching`. Uma instalação com `patching` mas sem `patching_policies` continua disparando execuções de patch; elas só rodam imediatamente e não podem ser agendadas por política.

| Ação | Módulo necessário | Permissão necessária |
|---|---|---|
| Ver políticas e suas atribuições | `patching_policies` | `can_view_hosts` |
| Criar, editar e excluir políticas | `patching_policies` | `can_manage_patching` |
| Incluir ou remover atribuições de política (host / grupo de hosts) | `patching_policies` | `can_manage_patching` |
| Incluir ou remover exclusões de host | `patching_policies` | `can_manage_patching` |

Sem `patching_policies`, a aba **Policies** da página Patching aparece com o aviso "Upgrade required" e um selo de plano.

---

### Onde as políticas ficam na interface

Há duas entradas equivalentes, ambas com a mesma lista de políticas e o mesmo editor:

- **Página Patching → aba Policies**: a visão principal. Lista todas as políticas, mostra o tipo de agendamento e o número de atribuições, e permite expandir uma política para gerenciar atribuições e exclusões ali mesmo.
- **Settings → Patch Management**: a visão voltada ao administrador, idêntica na função, mantida para que as políticas de patch fiquem junto das outras configurações operacionais.

As duas páginas usam os mesmos endpoints `/api/v1/patching/policies`, então uma mudança feita numa aparece na outra na hora.

---

### O modelo de política

Cada política tem os seguintes campos:

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | string, obrigatório | Nome exibido da política. |
| `description` | string, opcional | Descrição em texto livre. |
| `patch_delay_type` | enum, obrigatório | `immediate`, `delayed` ou `fixed_time`. |
| `delay_minutes` | inteiro, obrigatório com `delayed` | Minutos de espera depois do disparo. |
| `fixed_time_utc` | string, obrigatório com `fixed_time` | Horário do dia no formato `HH:MM` (ou `HH:MM:SS`). Interpretado como hora local no fuso horário da organização. O nome da coluna foi mantido por compatibilidade; veja a observação sobre fuso horário abaixo. |
| `timezone` | string, obsoleto | Campo antigo de fuso horário IANA. **Não é mais lido pelo agendador** e é ignorado na criação e na atualização. Daqui em diante é gravado como `NULL`. Os valores que já existem em linhas antigas ficam só para auditoria. |

#### Os três tipos de atraso

**Immediate.** A execução é disparada assim que o worker do asynq tira a tarefa da fila. É o comportamento padrão quando o host não tem política. Use em hosts de desenvolvimento ou quando você aprova cada execução ativamente.

**Delayed.** A execução é agendada para `now + delay_minutes` no momento do disparo. Valores típicos ficam entre 30 e 60 minutos: tempo para um operador cancelar se o disparo foi engano, mas curto o bastante para o patch cair no mesmo turno. O atraso conta a partir do disparo (ou da aprovação, no `patch_package`), não da criação da política.

**Fixed time.** A execução é agendada para a próxima ocorrência de `HH:MM`, em hora local do fuso da organização. Se esse horário já passou hoje (no fuso local), a execução fica para o mesmo horário do próximo dia. Use para janelas de manutenção (reinícios diários às `03:00`, por exemplo). A espera pode ser longa: uma execução disparada às 14:00 com política de horário fixo às 03:00 fica em `scheduled` até as 03:00 locais seguintes.

#### Fuso horário

Políticas de horário fixo disparam no `HH:MM` configurado, interpretado como **hora local** no **fuso horário da organização**. O fuso da organização é definido nesta ordem:

1. Variável de ambiente `TZ` do processo do servidor.
2. Variável de ambiente `TIMEZONE` do processo do servidor.
3. **Settings → General → Timezone** (gravado no banco).
4. Último recurso: `UTC`.

O formulário da política mostra o fuso em vigor ao lado do campo de horário, para o operador confirmar qual fuso vale antes de salvar. Não há seleção de fuso por política: o agendamento segue um único fuso da organização, por consistência.

**Horário de verão.** Quando o relógio adianta, um horário de política que cai na hora que deixa de existir é empurrado uma hora para a frente (por exemplo, `02:30` no dia da transição de primavera na Europa dispara às `03:30` locais naquele dia). Quando o relógio atrasa e um horário acontece duas vezes, vale a ocorrência do horário padrão (depois da mudança). Revise as políticas de horário fixo em fusos com horário de verão se um deslocamento de um dia nas datas de transição afetar alguma janela de manutenção.

**Nome da coluna.** A coluna no banco continua se chamando `fixed_time_utc` por compatibilidade, mas o conteúdo agora é hora local no fuso em vigor, e não UTC. Renomear exigiria uma migração em várias etapas; o nome foi mantido para evitar retrabalho.

> **Mudança incompatível nesta versão.** Versões anteriores liam `fixed_time_utc` literalmente como UTC e ignoravam a seleção de fuso por política. As políticas de horário fixo criadas no comportamento antigo passam a disparar num instante diferente; revise e ajuste depois de atualizar. O campo `timezone` por política na API passa a ser ignorado, sem aviso, na criação e na atualização.

---

### Criando uma política

1. Abra **Patching → Policies** (ou **Settings → Patch Management**).
2. Clique em **Create policy**. Abre-se uma janela com o formulário.
3. Preencha:
    - **Name**: obrigatório. Escolha um nome que descreva a janela, não o conjunto de hosts (por exemplo, "Nightly 03:00 UTC", e não "Production web tier"). A atribuição de hosts é feita à parte.
    - **Description**: opcional, mas ajuda.
    - **Patch delay**: `Immediate`, `Delayed (run after N minutes)` ou `Fixed time (e.g. 3:00 AM)`.
4. Se escolheu **Delayed**, informe o número de minutos (mínimo 1).
5. Se escolheu **Fixed time**:
    - Informe o horário no formato `HH:MM`. O formulário mostra o fuso da organização ao lado do campo, e o horário é interpretado como hora local nesse fuso (veja a observação sobre fuso horário acima).
    - Não há seleção de fuso por política. Se precisar de outro padrão para o agendamento, mude o fuso da organização em **Settings → General → Timezone**.
6. Clique em **Create**. A política aparece na lista com `0 assignment(s)`.

Uma política recém-criada não faz nada até ser atribuída; ela não se aplica automaticamente a nenhum host.

---

### Atribuindo políticas

Uma política pode ser atribuída a um **host** (direta) ou a um **grupo de hosts** (indireta). Atribuições diretas têm precedência sobre as de grupo; veja [Como a política efetiva é determinada](#effective-policy-resolution), abaixo.

Para atribuir uma política:

1. Na lista de políticas, clique no link **N assignment(s)** da linha da política. A linha se expande e mostra o painel **Applied to**.
2. Escolha **Host** ou **Host group** na lista.
3. Escolha o host ou o grupo alvo na segunda lista.
4. Clique em **Add**.

A atribuição vale na hora para as próximas execuções de patch naquele alvo. Execuções que já estão na fila com a política anterior não são recalculadas: elas mantêm a cópia da política do momento em que foram disparadas (visível na barra lateral de Run Detail).

Para remover uma atribuição, clique no `×` ao lado da etiqueta dela na lista **Applied to**.

---

### Exclusões

As exclusões tiram um host específico de uma política que ele herdaria por um grupo de hosts. **Atribuições diretas a um host não podem ser excluídas**, porque pelas regras de precedência a atribuição direta sempre vence.

Uso típico:

1. Você tem um grupo `production-web` com 50 hosts.
2. Atribui ao grupo uma política `Nightly 03:00 UTC`.
3. Um host desse grupo (`prod-web-api-01`) atende um cliente em Singapura que não tolera parada às 03:00 UTC (é meio do dia para ele).
4. Você inclui `prod-web-api-01` como **exclusão** na política. Esse host passa a ser tratado como sem política (volta para Default / immediate), embora continue no grupo `production-web`.
5. Se quiser, atribua `prod-web-api-01` diretamente a outra política, com horário fixo às 19:00 UTC.

Para incluir uma exclusão, expanda a política e use a linha **Exclusions**: escolha um host na lista e clique em **Exclude host**. O host aparece como etiqueta âmbar na lista de exclusões.

A exclusão vale só para aquela política. Se o host estiver em outro grupo atribuído a outra política, essa outra política ainda pode se aplicar.

---

### Como a política efetiva é determinada {#effective-policy-resolution}

Quando uma execução de patch é disparada, o servidor determina a política efetiva do host alvo com esta precedência:

1. **Atribuição direta ao host**: se o host tem alguma política atribuída diretamente, ela vence. Exclusões não se aplicam aqui (não dá para atribuir diretamente e depois excluir).
2. **Atribuição por grupo**: se o host está em um ou mais grupos, o servidor percorre as atribuições de política desses grupos e escolhe a **primeira** política (pela ordem crescente de `created_at` da atribuição) em que o host **não** está excluído.
3. **Default**: se nada acima se aplica, a política efetiva é a política implícita "Default", equivalente a `patch_delay_type=immediate`. A barra lateral de Run Detail mostra isso como "Default policy. Runs immediately on trigger."

Se um host está em vários grupos com políticas conflitantes, vence a atribuição mais antiga. A ordem importa. Se você precisa de comportamento previsível num parque complexo, prefira atribuições diretas a camadas de políticas por grupo, ou organize os grupos de modo que cada host esteja em um só grupo de "agendamento".

#### Conferindo a política efetiva

Antes de disparar uma execução, a etapa Timing do Patch Wizard chama `GET /patching/preview-run?host_id=<id>` para cada host selecionado. A resposta traz o horário `run_at_iso` (o que `ComputeRunAt` retorna *naquele momento*, calculado no fuso da organização para políticas de horário fixo) e o nome, o ID e o tipo de atraso da política em vigor. É assim que o assistente diz "Runs at 03:00 (Europe/London) via Nightly-Window" antes de você disparar.

#### A cópia da política

Quando uma execução é criada, o servidor também grava uma **cópia** da política efetiva na linha da execução (JSON `policy_snapshot`). É essa cópia que a página Run Detail mostra, e ela não muda: alterar ou excluir a política depois não reescreve a cópia. Isso importa para auditoria: a pergunta "qual política valia quando esta execução rodou em 12 de março?" sempre tem resposta, mesmo que a política tenha sido excluída.

Nas políticas de horário fixo, a cópia também registra `schedule_timezone`: o nome IANA do fuso de fato usado quando `run_at` foi calculado. Run Detail usa esse campo de preferência ao exibir o agendamento, então mudar o fuso da organização depois não reescreve o histórico de auditoria.

---

### Como o agendamento funciona

Depois de determinar a política efetiva, o servidor a converte num atraso de job do asynq:

| Tipo de política | Cálculo de `delayMs` | Status visível da execução |
|---|---|---|
| `immediate` | `0` | `queued` imediatamente |
| `delayed` | `delay_minutes × 60 × 1000` | `scheduled` para `run_at = now + delay_minutes` |
| `fixed_time` | ms até o próximo `HH:MM` no fuso da organização | `scheduled` para `run_at = next HH:MM` (hora local no fuso da organização, gravada em UTC) |

A linha em `patch_runs` guarda tanto `created_at` (quando a execução foi inserida) quanto `scheduled_at` (quando o asynq deve liberá-la para o worker). A tabela Runs & History mostra `scheduled_at` como horário "Started" enquanto a execução não começa.

#### Passando por cima da política no disparo ou na aprovação

Tanto `POST /patching/trigger` quanto `POST /patching/runs/{id}/approve` aceitam o campo `schedule_override`. O único valor suportado hoje é `"immediate"`, que força `delayMs=0` seja qual for a política efetiva. É isso que a caixa **Run immediately** da etapa Timing do Patch Wizard define.

A cópia gravada na execução continua vindo da política efetiva. A exceção muda só o horário real de disparo, não os metadados da política. Run Detail mostra a política real (por exemplo, "Nightly 03:00 UTC"), mas a execução fica sem `scheduled_at` e o status vai direto para `queued`.

#### Excluindo uma execução agendada

Uma execução `scheduled` pode ser excluída em Runs & History. Ao clicar em **Delete** numa linha agendada:

1. O servidor remove a linha da tabela `patch_runs`.
2. Também chama `inspector.DeleteTask("patching", "patch-run-<id>")` para tirar a tarefa da fila do asynq, e assim a execução não dispara depois de excluída.

Só dá para excluir execuções com status `queued`, `pending_validation`, `pending_approval`, `validated`, `approved` ou `scheduled`. O que estiver em `running` ou num estado final não pode ser excluído (use **Stop Run** numa execução em andamento; execuções finalizadas são registros históricos e não podem ser removidas pela interface).

---

### Editando e excluindo políticas

A lista de políticas permite editar uma política no lugar (nome, descrição, tipo de atraso ou valor do atraso). Clique no ícone de lápis na linha da política para abrir a janela de edição e depois em **Update**.

Execuções existentes **não** são reagendadas quando você edita uma política; a cópia delas foi gravada no disparo. Só as próximas execuções usam os novos valores.

Excluir uma política a remove na hora, junto com todas as atribuições e exclusões ligadas a ela (exclusão em cascata). Execuções em `scheduled` criadas a partir dessa política mantêm o `scheduled_at` e disparam no horário previsto. O ID da política na execução passa a apontar para algo que não existe, mas o nome da política continua guardado na coluna `policy_snapshot` para a interface.

Se você vai trocar uma política por outra, prefira reatribuir hosts e grupos à nova antes de excluir a antiga.

---

### Padrões comuns

#### Uma única janela de manutenção para o parque inteiro

Crie uma política (`Nightly 03:00 UTC`) do tipo `fixed_time` às `03:00`. Atribua-a a um grupo que contenha tudo, ou diretamente a cada host. Use exclusões para os poucos hosts que precisam de outra janela.

#### Canário antes da produção

Crie duas políticas:

- `Canary 01:00 UTC`, `fixed_time` às `01:00`, atribuída ao grupo `canary`.
- `Production 04:00 UTC`, `fixed_time` às `04:00`, atribuída ao grupo `production-all`.

Dispare a mesma execução `patch_package` nos dois grupos ao mesmo tempo. Os hosts canário recebem o patch primeiro; a produção vem três horas depois. Se o canário apontar falhas, exclua as execuções de produção que ainda estão em `scheduled`, antes que disparem.

#### Distribuição lenta: "segure por 30 minutos"

Crie uma política `Delayed 30min` com `patch_delay_type=delayed` e `delay_minutes=30`. Atribua a tudo. Toda execução aprovada fica 30 minutos em `scheduled` antes de disparar. Se perceber que aprovou a coisa errada, exclua a execução agendada; caso contrário, ela dispara sozinha.

#### Misto: imediato por padrão, janela fixa na produção

- Deixe a maioria dos hosts sem atribuição. Eles caem na política Default (imediata).
- Crie uma política `Prod 03:00 UTC` e atribua diretamente ao grupo `production`.
- Um patch disparado pela página Packages no parque inteiro roda na hora em desenvolvimento e homologação e espera as próximas 03:00 UTC na produção.

---

### Documentação relacionada

- [Visão geral de patching](#patching-overview): os três conceitos centrais e como as peças do patching se encaixam.
- [Executando um patch](#running-a-patch): o fluxo do Patch Wizard, incluindo a etapa Timing, que lê a política efetiva.
- [Histórico de patches e logs ao vivo](#patch-history-and-live-logs): leitura do histórico de execuções, incluindo a cópia da política mostrada em cada execução.
- Hosts e grupos: gerenciamento de grupos de hosts, a unidade mais comum de atribuição de política.

---

## Capítulo 11: Histórico de patches e logs ao vivo {#patch-history-and-live-logs}

A aba **Runs & History** da página Patching reúne todas as execuções de patch, passadas e pendentes. Este capítulo mostra como ler a tabela de histórico, filtrar e pesquisar, selecionar execuções para ações em massa e trabalhar com a transmissão de logs ao vivo na página Run Detail.

---

### Chegando a Runs & History

Na barra lateral esquerda, clique em **Patching** e mude para a aba **Runs & History**. A URL vira `/patching?tab=runs` e pode ser compartilhada.

Também há filtros por link direto, via parâmetros de URL:

- `/patching?tab=runs&status=active`: queued + running
- `/patching?tab=runs&status=failed`: só execuções com falha
- `/patching?tab=runs&status=completed`: só execuções concluídas
- `/patching?tab=runs&status=pending_approval&type=patch_all`: filtro combinado

São as mesmas URLs para onde levam os cards do painel de patching quando você clica nos blocos **Total runs / Queued / Completed / Failed** no topo da página.

---

### A tabela Runs & History

No desktop, a tabela tem oito colunas:

| Coluna | O que mostra |
|---|---|
| Caixa de exclusão | Seleciona a linha para exclusão em massa. Só aparece nos status que podem ser excluídos (`queued`, `pending_validation`, `pending_approval`, `validated`, `approved`, `scheduled`). |
| Caixa de aprovação | Seleciona a linha para aprovação em massa. Só aparece nos status que podem ser aprovados (`validated`, `pending_validation`, `pending_approval`). |
| Host | Nome amigável, se houver; senão o hostname; senão o UUID do host. Clicável na barra lateral da página Run Detail. |
| Type | Resumo do tipo de execução: "Patch all" ou uma lista compacta de nomes de pacote no `patch_package` (por exemplo, `curl, openssl`). Simulações aparecem do mesmo jeito, mas o selo de status indica que foi uma validação. |
| Status | O [selo de status da execução](#patching-overview) e, quando uma execução validada instalaria mais pacotes do que você pediu, um selo **Extra deps**. |
| Initiated by | O usuário do operador que disparou a execução. Fica vazio nas execuções disparadas por automação. |
| Started | `created_at` para execuções que ainda não começaram; `started_at` para as em andamento ou concluídas. |
| Completed | `completed_at`, se a execução terminou; em branco caso contrário. |
| Actions | Botões de ação na linha: **Retry**, **Skip & Patch**, **Approve**, **View**. Veja [Ações na linha](#inline-row-actions), abaixo. |

No celular (<768px), a tabela vira um card por execução, com as mesmas informações empilhadas. As ações ficam no pé de cada card, como botões de largura total.

#### Paginação e tamanho da página

A paginação é feita no servidor, via `GET /patching/runs?limit=<N>&offset=<M>`. O padrão é de 25 linhas por página. Dá para mudar para 50, 100 ou 200 na lista do rodapé; a escolha fica guardada no `localStorage`, em `patching-runs-limit`.

Por padrão, a lista é ordenada por `created_at` decrescente, com as execuções mais novas no topo. O servidor também aceita `sort_by` (`created_at`, `started_at`, `completed_at`, `status`) e `sort_dir` (`asc`, `desc`), mas a interface ainda não expõe controles de ordenação; use filtros e paginação para estreitar a visão.

#### Filtros

Há dois filtros acima da tabela:

- **Status**: `All`, `Active (queued + running)`, `Queued`, `Pending validation`, `Pending approval`, `Validated (awaiting approval)`, `Approved`, `Scheduled`, `Running`, `Completed`, `Failed`, `Cancelled`.
- **Type**: `All`, `Patch all`, `Patch package`.

Os filtros voltam a paginação para a página 1. Clique em **Clear filters** para remover os dois. Os filtros escolhidos também vão para a URL, então dá para salvar nos favoritos ou compartilhar uma visão filtrada.

#### Tabela vazia

- Se os filtros não encontram nada, a tabela mostra "No runs match your filters" e sugere ajustar o filtro.
- Se não há nenhuma execução (instalação nova), a tabela mostra "No patch runs yet. Patch runs triggered from the Overview tab or from host detail pages will appear here."

---

### Ações na linha {#inline-row-actions}

A coluna **Actions**, à direita, mostra botões conforme o status atual da linha:

| Status | Botões exibidos |
|---|---|
| `pending_validation` | **Retry** (coloca a simulação de novo na fila), **Skip & Patch** (pula a validação e vai direto para a execução), **View** |
| `pending_approval` | **Approve**, **View** |
| `validated` | **Approve**, **View** |
| Todos os outros | Só **View** |

**View** sempre abre a página Run Detail em `/patching/runs/{id}`.

**Approve** e **Skip & Patch** passam pelo **Patch Wizard** em modo de aprovação, mesmo para uma única linha. É uma escolha deliberada de consistência: todo caminho que transforma uma validação numa execução real usa a mesma interface, e com isso você ganha a exceção de política por host (por exemplo, dá para escolher "Run immediately" na aprovação mesmo que o host normalmente tenha uma política com atraso).

**Retry** recoloca a tarefa de simulação na fila sem abrir o assistente. Use depois de trazer de volta um host que estava offline. Só existe para execuções `patch_package`; um `patch_all` não pode ser revalidado, porque não pode ser simulado.

#### Seleção e ações em massa

No início de cada linha há duas caixas opcionais, uma para exclusão e outra para aprovação. Marcá-las inclui a linha num conjunto de seleção; a caixa do cabeçalho seleciona todas as linhas elegíveis da página atual.

Com pelo menos uma linha selecionada, aparece uma **barra de ações em massa** acima da tabela:

- **Delete N selected**: exclui todas as execuções selecionadas, removendo também as tarefas agendadas no asynq de cada uma.
- **Approve N selected**: abre o Patch Wizard com todas as validações selecionadas. Você passa por uma única sequência Timing / Submit para o lote, com exceções de política por host.

Depois de uma aprovação em massa, a interface mostra uma faixa de resumo (por exemplo, "Approved 5, 1 failed"). Falhas em hosts individuais aparecem sem bloquear as outras aprovações.

Não dá para misturar seleção de exclusão e de aprovação na mesma linha. As duas caixas funcionam de forma independente e os dois conjuntos são acompanhados. Qualquer uma das seleções pode ser limpa a qualquer momento com os botões **Clear delete** ou **Clear approve**.

---

### A página Run Detail

Clique em **View** em qualquer linha, ou acesse diretamente `/patching/runs/{id}`, para abrir a página Run Detail. O layout é:

- **Cabeçalho**: seta de voltar, nome do host como título (H1), subtítulo com tipo de execução / selo de status / selo pós-patch e, alinhados à direita, os botões de ação principais (Approve & Patch, Retry Validation, Skip & Patch, Stop Run).
- Barra lateral **Run summary** (à esquerda, no desktop): host, tipo, quem iniciou, quem aprovou, início / fim / agendado para, link para a execução de validação ligada (quando houver), política de patch em vigor e a lista completa de pacotes afetados.
- **Conteúdo principal** (à direita): faixas de estado para os status não finais (`pending_validation`, `pending_approval`, `validated`), um painel de erro quando `error_message` está preenchido, e o terminal **Shell output**.

#### Faixas de estado

A página Run Detail mostra uma faixa específica para cada estado não final, para você saber na hora o que a execução está esperando:

- **Pending validation**: "Validation pending. Host may be offline." Explica que dá para tentar de novo quando o host voltar, ou pular a validação.
- **Pending approval**: "Awaiting approval." Explica que a execução foi enviada para aprovação e precisa de uma segunda pessoa.
- **Validated**: "Validation complete. Approval required." Se a execução instalaria mais pacotes do que você pediu, a faixa mostra a quantidade de dependências, para você saber que deve revisar o painel **Packages affected**.

#### Frequência de atualização

Com a página aberta, a consulta de Run Detail se repete num intervalo que depende do status:

- `queued`, `pending_validation`: a cada 3 segundos.
- `running`: a cada 5 segundos se o WebSocket ao vivo estiver aberto; a cada 3 segundos caso contrário (a consulta mais rápida é uma rede de segurança para quando o WebSocket cai).
- `completed` com o host ainda marcado como "aguardando relatório de inventário pós-patch": a cada 3 segundos, para o selo **Awaiting inventory report** virar **New report received** assim que o próximo relatório do agente chegar.
- Todo o resto: sem atualização automática.

---

### Logs ao vivo

Quando uma execução está em `running`, a página Run Detail abre um WebSocket com `/api/v1/patching/runs/{id}/stream`. A autenticação é o mesmo cookie JWT usado no resto da interface; o middleware de autenticação cuida do upgrade da conexão.

#### Tipos de mensagem

A transmissão usa JSON. Três tipos de mensagem chegam do servidor:

```json
// Sent exactly once when the browser connects
{ "type": "snapshot",
  "patch_run_id": "...",
  "stage": "running",
  "shell_output": "Reading package lists...\n...",
  "error_message": "" }

// Sent for each line-buffered stdout/stderr chunk the agent pushes
{ "type": "chunk",
  "patch_run_id": "...",
  "stage": "progress",
  "chunk": "Setting up libssl3 (3.0.2-0ubuntu1.15)...\n" }

// Sent once when the run reaches a terminal stage on the agent
{ "type": "done",
  "patch_run_id": "...",
  "stage": "completed",        // or failed / cancelled / validated / dry_run_completed
  "error_message": "" }
```

O `snapshot` é enviado uma única vez, na conexão do navegador; cada `chunk` traz um pedaço de stdout/stderr que o agente envia; o `done` chega uma vez, quando a execução atinge um estágio final no agente. O navegador acrescenta cada `chunk.chunk` ao buffer local do terminal. Quando chega o `done`, o navegador fecha o socket e invalida a consulta da execução, e a página busca o estado final gravado.

#### Keepalive

O servidor manda um frame de ping do WebSocket a cada 30 segundos, para manter a conexão viva através de proxies e balanceadores de carga. As escritas têm prazo de 10 segundos; um cliente travado é derrubado em vez de prender uma goroutine. Não há lógica de nova tentativa no agente nem no servidor para o socket do navegador. Se a página reconectar (por exemplo, depois de uma oscilação rápida de rede), o `snapshot` reenvia toda a saída acumulada, incluindo os pedaços perdidos que já tinham sido gravados no banco.

#### Por que pode aparecer "(No output yet)"

Existe uma pequena janela, depois de clicar em **Queue & patch**, em que a execução ainda está em `queued`:

- O worker do asynq ainda não tirou a tarefa da fila.
- O agente ainda não recebeu o comando `run_patch`.
- Nenhuma saída foi publicada.

Nessa janela, o terminal mostra "(No output yet)" e o selo de status indica `Queued`. Quando o agente passa para `running`, o primeiro `chunk` chega em um ou dois segundos.

#### Exibição do terminal

A página Run Detail mostra a saída num `<pre>` com estilo escuro semelhante ao do GitHub, com cerca de 420px de altura (máximo de 55vh). Ele tem rolagem e mantém a quebra de linha. Os caracteres `\r` das barras de progresso do `apt-get` e do `dpkg` são convertidos em `\n`, e cada atualização de progresso vira uma linha no histórico. Perde-se a animação de sobrescrita, mas ganha-se legibilidade.

Se você rolar para cima manualmente (mais de ~32px acima do fim), a interface para a rolagem automática para não disputar com você. Volte para menos de 32px do fim e a rolagem automática recomeça.

#### Copiando a saída

Em qualquer estado que não seja `running` nem `queued`, aparece um botão **Copy output** acima do terminal. Ele copia toda a `shell_output` para a área de transferência via `navigator.clipboard.writeText`. Use para colar num chamado, num e-mail ou num relatório pós-incidente.

---

### Sem exportação nem download embutidos

Não há endpoint de exportação de execuções no servidor. Não dá para baixar o log de uma execução como arquivo, e não há exportação CSV/JSON da tabela Runs & History. Se precisar disso:

- Para uma execução: use **Copy output** na página Run Detail e cole num arquivo.
- Para análise em massa: chame a API diretamente (`GET /api/v1/patching/runs?limit=200&offset=0`) e grave o JSON em disco. A API pagina com no máximo 200 linhas por requisição e autentica com o mesmo token JWT bearer da interface web.

> **Observação:** a resposta de `GET /patching/runs` traz os metadados das execuções (status, horários, dados do host, lista de pacotes), mas não a saída de shell completa. Para obter a saída de shell em massa, percorra os IDs das execuções e busque cada uma com `GET /patching/runs/{id}`.

---

### Notificações de execuções

Os eventos do ciclo de vida das execuções geram notificações pelo fluxo normal de notificações. Os destinos configurados em **Settings → Notifications**, como SMTP, webhooks ou ntfy, recebem esses eventos:

| Tipo de evento | Emitido quando | Severidade padrão |
|---|---|---|
| `patch_run_started` | O agente informa o estágio `running` | informational |
| `patch_run_approved` | Um operador aprova uma validação | informational |
| `patch_run_completed` | O agente informa o estágio `completed` (sem ser simulação) | informational |
| `patch_run_failed` | O agente informa o estágio `failed` | error |
| `patch_run_cancelled` | Um operador exclui uma execução que ainda não começou | informational |

A mensagem de notificação traz o nome do host, o tipo de patch, a lista de pacotes (limitada a 5, com "... and N more"), o nome da política efetiva e, nas falhas, a mensagem de erro capturada, limitada a 300 caracteres. A severidade vem das configurações de alerta por evento, então dá para subir ou baixar o padrão de cada tipo de evento na configuração de alertas.

---

### Excluindo execuções

Execuções em `queued`, `pending_validation`, `pending_approval`, `validated`, `approved` ou `scheduled` podem ser excluídas. A exclusão:

1. Remove a linha de `patch_runs`.
2. Remove da fila a tarefa do asynq (`patch-run-<id>` e, se existir, `patch-run-<id>-retry`).
3. Emite um evento de notificação `patch_run_cancelled`.

Execuções finalizadas (`completed`, `failed`, `cancelled`, `dry_run_completed`) não podem ser excluídas pela interface; são registros históricos de auditoria. Se precisar apagar execuções antigas por questão de espaço, fale com o suporte ou escreva uma consulta direta no banco filtrando por `patch_runs.created_at`.

**Execuções em andamento** não podem ser excluídas. Use **Stop Run** (veja [Executando um patch](#running-a-patch)), que pede o cancelamento pelo agente.

---

### Documentação relacionada

- [Visão geral de patching](#patching-overview): os três conceitos centrais: execução, política e simulação.
- [Executando um patch](#running-a-patch): como disparar, aprovar e interromper uma execução, em detalhes.
- [Políticas de patch e agendamento](#patch-policies-and-scheduling): modelo de política, atribuições e como o agendamento é calculado.
- Alertas e notificações: configure para onde vão os eventos de execução de patch.

---

## Capítulo 12: Ativando a integração com Docker {#enabling-docker-integration}

### Visão geral

O agente do PatchMon tem uma **integração com Docker** opcional, que descobre contêineres, imagens, volumes e redes no host e os reporta ao servidor do PatchMon. Com ela ativa, o agente também acompanha o fluxo de eventos do Docker e repassa os eventos de ciclo de vida dos contêineres (start, stop, die, pause, unpause, kill, destroy) como atualizações de status. Assim, o inventário Docker do parque fica, em linhas gerais, alinhado com o que está rodando.

Este capítulo explica o que a integração faz, como ativá-la por host na interface do PatchMon, do que o agente precisa no host, como a chave aparece no `config.yml` e o que verificar quando a integração não reporta.

**Liberação por módulo:** as telas de Docker (rotas `/docker/*` e abas Docker em Host Detail) exigem o módulo `docker` no seu plano. Planos sem o módulo mostram um selo de plano na aba Docker e um convite de upgrade ao acessar `/docker`.

**Permissão necessária:** `can_manage_hosts` para ligar e desligar a integração; `can_view_hosts` para ver o inventário.

### O que a integração faz

Ativada num host, o agente:

1. **Descobre o inventário a cada relatório**: lista todos os contêineres (em execução e parados), imagens (incluindo as camadas intermediárias que o PatchMon opta por ignorar), volumes (local / NFS / driver personalizado) e redes (bridge / host / overlay / macvlan / definidas pelo usuário).
2. **Transmite eventos de contêiner em tempo real**: acompanha o barramento de eventos do daemon do Docker. Cada evento relevante (start, stop, die, pause, unpause, kill, destroy) vira um evento de status `container_start` / `container_stop` / `container_die` / `container_pause` / `container_unpause` / `container_kill` / `container_destroy` e é enviado ao servidor pelo WebSocket do agente.
3. **Identifica a origem das imagens**: para cada imagem, o PatchMon tenta atribuí-la a um registry (Docker Hub, GHCR, GitLab, Quay, ECR, ACR, GCR, local, privado) e, quando possível, deixa a entrada do registry clicável.
4. **Acompanha atualizações disponíveis**: compara a tag da imagem em uso com as tags disponíveis no registry (quando o registry permite) e marca as imagens que têm versão mais nova.
5. **Alimenta o módulo de conformidade**: se as varreduras de conformidade também estiverem ativas no host, o Docker Bench for Security pode rodar como varredura adicional (veja os capítulos de conformidade).

Esses dados abastecem dois lugares da interface:

- A página **Docker Inventory**, em `/docker`: visão do parque inteiro. Veja [Conhecendo o inventário Docker](#docker-inventory-tour).
- A **aba Docker** da página de detalhes do host: os mesmos dados, filtrados por um host.

### Pré-requisitos do agente no host

A integração com Docker conversa diretamente com o daemon do Docker pelo socket Unix. O que o agente precisa no host:

| Requisito | Detalhe |
|-------------|--------|
| **Docker Engine instalado** | Qualquer versão razoavelmente recente; o agente usa o SDK do cliente Docker em Go. |
| **Socket do Docker presente** | O agente procura `/var/run/docker.sock`. Se o socket não existir (Docker não instalado ou ainda não iniciado), a integração aparece como indisponível. |
| **Agente com acesso de leitura ao socket** | O agente roda como `root`, que tem acesso nas instalações padrão. Em hosts em que o `docker.sock` tem modo `0660` e dono `root:docker`, o acesso como root funciona. Configurações personalizadas do Docker que restringem ainda mais as permissões do socket podem precisar de ajuste. |
| **Daemon do Docker respondendo** | O agente faz um ping no daemon ao verificar a disponibilidade pela primeira vez; uma resposta confirma que o Docker está no ar. Se o Docker está instalado mas o serviço não está rodando, o agente espera e tenta de novo, em vez de travar. |

O binário `docker` **não** precisa estar no PATH. O agente usa a API do Docker Engine direto pelo socket, então a CLI é opcional. Dá para conferir o caminho do socket e a versão do daemon no host com um comando rápido:

```bash
ls -l /var/run/docker.sock
docker version   # if the CLI is installed
```

Hosts Windows: a integração com Docker do agente é só para Linux / FreeBSD. Hosts Windows não mostram a aba Docker, com ou sem Docker Desktop instalado.

### Ativando a integração pela interface

Há dois lugares para ligá-la.

#### Num host novo, durante o registro

Na **etapa 2** do assistente **Add Host** (**Host details**), a seção **Integrations** tem uma chave **Docker**. Marque-a antes de clicar em **Next**. Quando o agente se conectar pela primeira vez, o `config.yml` dele já terá `docker: true`, e a coleta começa no primeiro relatório.

Veja [Adicionando um host](#adding-a-host).

#### Num host existente

1. Abra **Hosts** → clique no nome amigável do host para abrir a página de detalhes.
2. Clique na aba **Integrations**.
3. Encontre o painel **Docker**.
4. Clique na chave à direita do painel para deixá-la em **Enabled**.
5. Aparece uma faixa amarela no topo da aba e no cabeçalho da página: *Pending configuration changes*.
6. Clique em **Apply** no cabeçalho da página para enviar a mudança ao agente pelo WebSocket.

O agente então:

- Atualiza o `config.yml` com `integrations.docker: true`.
- Reinicializa o gerenciador de integrações.
- Começa a coletar o inventário Docker no próximo ciclo de relatório (normalmente dentro de um intervalo de relatório; o padrão é de 60 minutos, mas o primeiro relatório depois da ativação é enviado na hora).
- Começa a transmitir os eventos dos contêineres.

#### O que significa "Pending configuration changes"

A chave na interface grava no servidor do PatchMon o estado **desejado**. A mudança só vai de fato para o agente quando você clica em **Apply**, que transmite a nova configuração pelo WebSocket. Se o agente estiver offline, **Apply** fica desabilitado e a faixa avisa isso. A mudança fica pendente até o agente reconectar.

O `integrations.docker` muda no `config.yml` do agente pouco depois do clique em **Apply**, sem reiniciar o serviço (o intervalo de atualização e as chaves de integração são sincronizados em tempo de execução).

### Desativando a integração

Na mesma aba **Integrations** do host:

1. Mude a chave **Docker** para **Disabled**.
2. Clique em **Apply** no cabeçalho da página.

Aplicada a mudança:

- O agente para de descobrir o inventário Docker.
- Os registros de inventário existentes continuam no PatchMon (as consultas históricas e o histórico de eventos são preservados), mas o agente não os atualiza mais.
- A transmissão de eventos dos contêineres para.

Desativar não remove o Docker do host nem para contêineres; só diz ao agente para parar de monitorar.

### Como fica no `config.yml`

O arquivo de configuração do agente fica em:

- **Linux / FreeBSD:** `/etc/patchmon/config.yml`
- **Windows:** `C:\ProgramData\PatchMon\config.yml`

O bloco de integrações contém a chave do Docker:

```yaml
integrations:
  docker: true          # Enabled by the UI toggle
  compliance:
    enabled: false
    on_demand_only: true
    openscap_enabled: true
    docker_bench_enabled: false
```

O esquema completo e o comportamento de cada campo estão na Referência do config.yml do agente.

Dá para ativar a integração com Docker editando o arquivo de configuração diretamente, mas é muito melhor usar a chave na interface: ela mantém a visão que o servidor tem do host alinhada com a configuração e evita que um **Apply** posterior sobrescreva a sua edição sem aviso.

### Quando a integração com Docker não reporta

Sintomas possíveis:

- A aba **Docker** nunca aparece na página de detalhes do host, mesmo depois de ativar a integração e clicar em **Apply**.
- O Docker foi ativado no host, mas nenhum contêiner ou imagem aparece em `/docker`.
- O status em tempo real (início / parada de contêineres) não atualiza.

Siga as verificações abaixo, nesta ordem.

#### 1. Confirme que o servidor registrou a chave

Na página de detalhes do host, abra a aba **Integrations**. O painel Docker deve mostrar **Enabled**, com selo verde. Se mostrar **Disabled**, a mudança não foi salva. Ligue a chave de novo e clique em **Apply**.

#### 2. Confirme que o agente recebeu a configuração

No host:

```bash
sudo grep -A 4 '^integrations:' /etc/patchmon/config.yml
```

O esperado é:

```yaml
integrations:
  docker: true
  ...
```

Se o arquivo ainda mostrar `docker: false`, o botão **Apply** não foi clicado ou o WebSocket do agente não estava conectado naquele momento. Volte à interface e olhe o cabeçalho da página. Se o botão **Apply** ainda estiver visível, clique nele de novo (o agente precisa estar conectado).

#### 3. Confirme que o socket do Docker está acessível

```bash
ls -l /var/run/docker.sock
sudo docker ps        # agent runs as root, so sudo mimics its view
```

Se o socket não existir, o Docker não está instalado ou não está rodando. Instale ou inicie o Docker e acompanhe o próximo relatório.

#### 4. Procure erros de Docker no log do agente

```bash
sudo tail -n 50 /etc/patchmon/logs/patchmon-agent.log | grep -i docker
```

Mensagens típicas:

- `Docker socket not found`: o Docker não está instalado, ou o socket está num caminho fora do padrão.
- `Failed to create Docker client`: o socket existe, mas o agente não consegue abrir um cliente; verifique as permissões.
- `Docker container event`: confirma que o fluxo de eventos está ativo e recebendo eventos.
- `Docker daemon ping failed, retrying`: o Docker está instalado, mas não responde. O agente continua tentando.

A referência completa de logs está em Gerenciando o agente do PatchMon.

#### 5. Force um relatório e verifique de novo

Na interface, na página de detalhes do host, clique em **Fetch Report**. O agente coleta um inventário novo (incluindo Docker) e reporta na hora. Acompanhe os selos de contagem da aba **Docker**.

#### 6. Atualize o status das integrações

Na aba **Integrations**, o botão **Refresh Status** pede ao agente que informe a situação atual das integrações. É útil depois de instalar o Docker, corrigir as permissões do socket ou iniciar o serviço do Docker.

#### 7. Liberação por módulo

Se a aba Docker mostrar um selo de plano em vez de conteúdo, o módulo `docker` não está habilitado no seu plano. Fale com o administrador do PatchMon para habilitá-lo na assinatura.

### Páginas relacionadas

- [Conhecendo o inventário Docker](#docker-inventory-tour): como fica o inventário quando a integração está funcionando.
- [Página de detalhes do host](#host-detail-page): onde fica a aba Integrations e como o **Apply** funciona.
- [Adicionando um host](#adding-a-host): ative o Docker já no registro.
- Referência do config.yml do agente: todos os campos do `config.yml`, incluindo o bloco de integrações.
- Gerenciando o agente do PatchMon: logs, diagnóstico e gerenciamento do serviço do agente.

---

## Capítulo 13: Conhecendo o inventário Docker {#docker-inventory-tour}

### Visão geral

Com a **integração com Docker** ativa em um ou mais hosts, o PatchMon reúne os contêineres, imagens, volumes e redes descobertos num **inventário Docker** do parque inteiro. O inventário responde a perguntas do tipo "o que está rodando onde": quais hosts têm Docker, quais contêineres estão rodando, quais imagens estão desatualizadas e quais volumes e redes existem no ambiente.

Este capítulo é um tour por `/docker` (visão do parque), `/docker/hosts/:id` (visão por host) e pelas páginas de detalhe de contêineres, imagens, volumes e redes.

**Módulo necessário:** `docker`. Planos sem o módulo mostram um aviso com selo de plano na aba Docker e nas rotas `/docker`. Fale com o administrador do PatchMon para habilitá-lo.

**Permissão necessária:** `can_view_hosts` para ver o inventário; `can_manage_hosts` para excluir recursos Docker pela interface.

### Chegando à página Docker

Clique em **Docker** na navegação à esquerda. Você cai em `/docker`, com **Stacks** selecionada por padrão. A URL aceita o parâmetro `?tab=` (`stacks`, `containers`, `images`, `volumes`, `networks`, `hosts`), para links diretos a uma aba específica.

Se nenhum host tiver a integração com Docker ativa, as listas ficam vazias. Veja [Ativando a integração com Docker](#enabling-docker-integration) para ligá-la num host.

### Estatísticas no topo da página

Quatro cards de resumo ficam acima das abas:

| Card | Significado | Ao clicar |
|------|---------|-----------------|
| **Hosts with Docker** | Hosts que estão reportando inventário Docker | – |
| **Running Containers** | Contagem `running / total` no parque | – |
| **Total Images** | Imagens distintas reportadas em todos os hosts | – |
| **Updates Available** | Imagens que o PatchMon sabe que têm tags mais novas no registry | Abre a aba **Images** filtrada por *Updates available* |

Esses números vêm do endpoint `/docker/dashboard` e são atualizados automaticamente a cada **30 segundos** enquanto a página está aberta.

### Faixa de abas

São seis abas. Cada uma tem um selo de contagem que mostra num relance o tamanho do parque naquela dimensão:

- **Stacks**: contêineres agrupados pelo projeto do Compose / rótulo de stack.
- **Containers**: todos os contêineres de todos os hosts.
- **Images**: todas as imagens de todos os hosts.
- **Volumes**: todos os volumes de todos os hosts.
- **Networks**: todas as redes de todos os hosts.
- **Hosts**: uma lista dos hosts com Docker ativo.

Clicar numa aba limpa o campo de busca da página e aplica uma ordenação padrão adequada àquela visão (status nos contêineres, repositório nas imagens, nome nas demais).

#### Aba Stacks

Agrupa os contêineres em execução pelo projeto do Compose / rótulo de stack. Cada card de grupo mostra:

- O nome da stack.
- Quantos contêineres a stack tem, divididos por status.
- O host em que a stack roda (as stacks são por host; uma stack com o mesmo nome em dois hosts aparece duas vezes).
- Links para cada contêiner e para as imagens deles.

Use esta aba quando você pensa em "minha stack `wordpress`", e não em contêineres soltos.

#### Aba Containers

Uma linha por contêiner. Colunas:

- **Name**: clique para abrir a página de detalhe do contêiner (`/docker/containers/:id`).
- **Image**: a tag da imagem, com link conforme o registry (clique numa imagem do Docker Hub para ir ao Docker Hub, numa do GHCR para ir ao GitHub etc.).
- **Status**: selo colorido: **running** (verde), **exited** (vermelho), **paused** (amarelo), **restarting** (azul), ou sem cor nos demais estados.
- **Host**: nome amigável do host onde o contêiner está. Clique para ir à visão Docker daquele host.
- Colunas opcionais: data de criação, portas, transições de estado.

Filtros:

- Busca por nome, imagem e host.
- Filtro **Status**: All, Running, Exited, Paused, Restarting.
- Ordenação por nome, imagem, status (com nome como critério secundário dentro de cada status) ou host.

Ações:

- **Delete** (ícone de lixeira): exclui o contêiner por meio do agente. Exige `can_manage_hosts`. Erros aparecem num alerta.

#### Aba Images

Uma linha por imagem. As linhas mostram:

- Repositório + tag (e link para o registry, quando reconhecido).
- Tamanho.
- Origem (Docker Hub, GHCR, GitLab, Quay, ECR, ACR, GCR, local, private, unknown), como selo colorido.
- Contagem de contêineres: quantos contêineres, em quais hosts, usam esta imagem.
- Indicador de atualização: uma etiqueta quando há tag mais nova no registry.

Os filtros incluem o tipo de origem e **Updates available** (o mesmo filtro que o card **Updates Available** do topo abre).

Clicar numa imagem abre `/docker/images/:id`: a página de detalhe da imagem, com os hosts que a têm e os contêineres que a usam.

#### Aba Volumes

Uma linha por volume, com:

- Nome e driver (`local`, `nfs`, personalizado).
- Ponto de montagem no host.
- Host onde o volume está.
- Contagem de contêineres: quantos contêineres o montam.

Filtre por **Driver** e use a busca. Clique no nome de um volume para abrir `/docker/volumes/:id`, que mostra quais contêineres o montam no momento, junto com o host.

#### Aba Networks

Uma linha por rede, com:

- Nome, driver (`bridge`, `host`, `overlay`, `macvlan`, `none`, personalizado) e escopo.
- Sub-rede / gateway do IPAM.
- Host onde a rede existe.
- Contagem de contêineres.

Filtre por **Driver** e use a busca. Clique no nome de uma rede para abrir `/docker/networks/:id`, com os contêineres ligados a ela.

#### Aba Hosts

Uma lista compacta dos hosts com a integração Docker ativa, em ordem alfabética pelo nome amigável. Cada linha resume a contagem de contêineres e imagens do host e leva à visão Docker dele, em `/docker/hosts/:id`.

Use esta aba como ponto de partida quando quiser focar num host, em vez de navegar por tipo de recurso.

### Visão Docker por host

A URL `/docker/hosts/:id` (e o link da linha na aba **Hosts**) abre uma visão restrita a um host. Ela mostra:

- O nome amigável e o hostname do host, com link de volta para a página de detalhes principal.
- Contagens de contêineres e imagens, com a divisão running / exited / paused.
- A lista de contêineres do host, agrupada por stack quando possível.
- A lista de imagens do host.

Esta visão equivale à aba **Docker** da página de detalhes do host (veja [Página de detalhes do host](#host-detail-page)). Qualquer uma serve; use a que estiver mais à mão.

### Páginas de detalhe dos recursos

Cada recurso Docker tem sua página de detalhe. Todas seguem o mesmo padrão: uma seção superior com os metadados de identificação, cards de estatística, recursos relacionados e as ações disponíveis.

#### Detalhe do contêiner: `/docker/containers/:id`

Mostra nome, imagem, status, portas, host, datas de criação e de início, política de reinício, comando e entrypoint, rótulos, montagens e redes do contêiner.

Uma faixa **Similar containers**, no pé da página, lista outros contêineres do parque que usam a mesma imagem. Ajuda em perguntas como "este `redis:7` está rodando em outro lugar?".

#### Detalhe da imagem: `/docker/images/:id`

Mostra repositório, tag, digest, tamanho, arquitetura, sistema operacional, rótulos, histórico (camadas) e o link para o registry.

Abaixo, duas listas:

- **Hosts with this image**: todos os hosts que baixaram a imagem, com a tag que cada um tem.
- **Containers using this image**: todos os contêineres do parque que usam esta imagem.

Um painel **Updates** aparece quando há tag mais nova no registry de origem.

#### Detalhe do volume: `/docker/volumes/:id`

Mostra driver, ponto de montagem, tamanho (quando o Docker informa), rótulos e opções. A lista **Containers using this volume** mostra onde ele está montado.

#### Detalhe da rede: `/docker/networks/:id`

Mostra driver, escopo, configuração de IPAM e opções. A lista **Containers attached** mostra o que está conectado à rede.

### Como os dados se mantêm atualizados

Os dados de Docker chegam ao PatchMon por dois canais.

#### Relatórios periódicos de inventário

A cada ciclo normal de relatório (padrão de 60 minutos, configurável no servidor), o agente enumera contêineres, imagens, volumes e redes e envia esse retrato ao servidor. O inventário completo em `/docker` reflete o **último retrato** de cada host.

Para forçar a atualização imediata de um host, abra a página de detalhes dele e clique em **Fetch Report**.

#### Eventos de contêiner em tempo real

Com a integração com Docker ativa, o agente também acompanha o fluxo de eventos do Docker e envia os eventos de ciclo de vida dos contêineres pela conexão WebSocket que já mantém. Os tipos de evento relevantes são:

- `container_start` (vira `running`)
- `container_stop` / `container_die` / `container_kill` (todos viram `exited`)
- `container_pause` (`paused`)
- `container_unpause` (`running`)
- `container_destroy` (`removed`)

O servidor registra esses eventos no registro do contêiner. Com isso, por exemplo, uma queda de contêiner aparece na interface em segundos, sem esperar o próximo relatório completo.

#### Frequência de atualização da interface

Além do que o agente envia, a própria página `/docker` atualiza o resumo do painel a cada 30 segundos por consulta periódica, e as consultas de cada aba são refeitas quando você troca de aba. O botão manual **Refresh** (canto superior direito, seta circular) força a atualização imediata da aba ativa.

> **Dica:** se você muda algo num host (inicia ou para um contêiner, baixa uma imagem) e quer ver na interface, o evento deve aparecer em poucos segundos pelo WebSocket. A atualização completa do inventário de imagens, volumes e redes espera o próximo relatório. Use **Fetch Report** na página de detalhes do host se não puder esperar.

### Excluindo recursos Docker

Contêineres, imagens, volumes e redes podem ser excluídos pela linha da tabela (ícone de lixeira) ou pela página de detalhe. A exclusão:

- Exige `can_manage_hosts`.
- Abre uma janela de confirmação com o recurso e o host.
- Envia um comando de exclusão ao agente pelo WebSocket.
- O agente executa o equivalente a `docker rm` / `docker rmi` / `docker volume rm` / `docker network rm` e informa o resultado.

Se o Docker recusar (por exemplo, porque o contêiner ainda está rodando ou a imagem ainda é usada por um contêiner), a interface mostra o erro ali mesmo.

### Busca e ordenação

A busca e os filtros valem por aba e são limpos quando você troca de aba (assim, passar de Containers para Images não leva um filtro de contêiner para a visão de imagens). O campo e a direção de ordenação também voltam ao padrão da aba na troca.

O botão principal **Refresh** também limpa o filtro "updates available" que tenha sido aplicado pelo clique no card do painel.

### Páginas relacionadas

- [Ativando a integração com Docker](#enabling-docker-integration): como ligar a integração num host.
- [Página de detalhes do host](#host-detail-page): a aba Docker por host, equivalente a `/docker/hosts/:id`.
- Gerenciando o agente do PatchMon: o agente que coleta os dados de Docker.
- Referência do config.yml do agente: a configuração `integrations.docker` no `config.yml`.

---

## Capítulo 14: Visão geral de conformidade {#compliance-overview}

### O que são as varreduras de conformidade

As varreduras de conformidade avaliam os hosts contra benchmarks de segurança publicados: os **CIS Benchmarks**, para o sistema operacional, e o **Docker Bench for Security**, para hosts de contêineres. Os resultados voltam para a interface web por regra (aprovada, reprovada, aviso) e dão a você uma nota de conformidade do parque, o detalhe de cada regra por host e, opcionalmente, a correção automática das regras reprovadas.

Quem faz a varredura é o agente do PatchMon em cada host, não o servidor. O agente roda o scanner localmente, interpreta a saída e envia os resultados estruturados ao servidor por `POST /api/v1/compliance/scans`. O servidor consolida os dados em painéis e visões por regra.

Este capítulo trata do modelo geral: quais são os scanners, como o conteúdo SSG é entregue na 2.0, a liberação por módulo e a matriz de permissões. Os passo a passos para rodar varreduras e ler os resultados estão em [Executando varreduras de conformidade](#running-compliance-scans) e em [Resultados e correção](#results-and-remediation).

---

### Liberação por módulo

Todas as telas e rotas de API de conformidade dependem do módulo `compliance`. Alguns planos (os menores) não incluem conformidade; neles, o item **Security Compliance** some da barra lateral e os endpoints da API retornam 403.

| Área da interface | Módulo necessário |
|---|---|
| Página Security Compliance (todas as abas) | `compliance` |
| Host Detail → aba Compliance | `compliance` |
| Configurações de conformidade por host (modo, chaves dos scanners, perfil padrão) | `compliance` |

Com o módulo desabilitado, a página de detalhes do host mostra o aviso "Upgrade required" na aba Compliance e o painel esconde os cards de conformidade.

---

### Matriz de permissões

Além do módulo, a conformidade usa três permissões de RBAC. Cada rota da API aplica uma combinação específica:

| Ação | Permissão necessária | Rota de exemplo |
|---|---|---|
| Ver o painel, o histórico de varreduras, o detalhe de conformidade do host, o detalhe de regras, tendências e a lista de varreduras ativas | `can_view_reports` | `GET /compliance/dashboard`, `GET /compliance/scans/{hostId}` |
| Disparar varreduras (uma ou em massa), cancelar uma varredura em andamento, instalar o scanner, atualizar o conteúdo SSG, disparar a correção de uma regra | `can_manage_compliance` | `POST /compliance/trigger/{hostId}`, `POST /compliance/cancel/{hostId}`, `POST /compliance/remediate/{hostId}` |
| Mudar o modo de conformidade do host, as chaves de scanner por host (OpenSCAP / Docker Bench) e o perfil padrão de um host | `can_manage_hosts` | `POST /hosts/{hostId}/integrations/compliance/mode`, `POST /hosts/{hostId}/integrations/compliance/scanners` |

Na prática, um papel de "operador de conformidade" costuma ter `can_view_reports` + `can_manage_compliance`, e um papel de "dono do host" costuma ter `can_manage_hosts`, para ligar ou desligar a conformidade nos próprios hosts. Um papel de auditor, só com `can_view_reports`, vê tudo mas não muda nada.

> **Observação:** o resumo das notas de versão, "can_view_reports e can_manage_hosts", não bate exatamente com o código: disparar uma varredura exige `can_manage_compliance`, não `can_manage_hosts`. Use a tabela acima como referência.

---

### Os dois scanners

A integração de conformidade do agente (`patchmon-agent/internal/integrations/compliance/compliance.go`) roda dois scanners independentes. Uma "varredura" enviada ao servidor é, na verdade, uma lista de subvarreduras, uma para cada scanner que rodou com sucesso.

#### 1. OpenSCAP: CIS Benchmarks

**O que é.** O OpenSCAP é o scanner de conformidade de segurança no nível do sistema operacional. Nas distribuições Linux suportadas, ele avalia o host contra os datastreams de CIS Benchmark publicados pelo SCAP Security Guide (SSG). O agente escolhe o datastream `ssg-*-ds.xml` correspondente ao sistema do host e roda `oscap xccdf eval` sobre ele.

**Níveis de perfil.** Cada datastream traz dois perfis derivados do CIS:

- **CIS Level 1 Server** (`level1_server`): o perfil de base, pensado para sistemas de uso geral, com impacto operacional mínimo. É o perfil padrão das varreduras avulsas.
- **CIS Level 2 Server** (`level2_server`): o perfil estendido, para ambientes que exigem defesa em profundidade (cargas sigilosas ou reguladas). Algumas regras do L2 impõem restrições operacionais reais (por exemplo, desativar `wireless` onde houver).

A configuração de **perfil padrão** por host (Host Detail → Integrations → Compliance) define qual perfil as varreduras agendadas usam. Uma varredura manual pode trocar o padrão passando `profile_id` na requisição de disparo; a aba Compliance de Host Detail mostra isso como "Pick a profile".

**Sistemas operacionais suportados** (conforme o painel Compliance Settings):

| Sistema | Perfis incluídos no SSG |
|---|---|
| Ubuntu | CIS Level 1 Server, CIS Level 2 Server |
| Debian | CIS Level 1 Server, CIS Level 2 Server |
| RHEL | CIS Level 1 Server, CIS Level 2 Server |
| CentOS | CIS Level 1 Server, CIS Level 2 Server |
| Rocky Linux | CIS Level 1 Server, CIS Level 2 Server |
| AlmaLinux | CIS Level 1 Server, CIS Level 2 Server |
| Fedora | CIS Level 1 Server, CIS Level 2 Server |
| SLES | CIS Level 1 Server, CIS Level 2 Server |
| OpenSUSE | CIS Level 1 Server, CIS Level 2 Server |

Sistemas fora da lista não têm datastream SSG disponível, e as varreduras OpenSCAP são puladas neles. O scanner continua "disponível" nos metadados das integrações se o `oscap` estiver instalado; só não tem o que avaliar.

> **SLES e OpenSUSE:** os datastreams acima vêm com o servidor, e o agente já associa hosts da família SUSE aos perfis certos, mas na prática essas linhas ainda não servem. Hosts SUSE não conseguem concluir o registro, porque o agente não tem suporte a zypper (veja a tabela de gerenciadores de pacotes, antes neste guia), e por isso nunca chegam a rodar uma varredura. Esses perfis passam a funcionar quando o suporte a zypper chegar.

**Estado padrão por host:** o OpenSCAP vem **ativado por padrão** em todo host com conformidade ligada. Isso é controlado pela flag de host `compliance_openscap_enabled`, com padrão `true` desde a 1.4.2 e mantida nas atualizações.

#### 2. Docker Bench for Security

**O que é.** O Docker Bench é o scanner de segurança para hosts de contêineres do Center for Internet Security. Ele avalia o daemon do Docker, os arquivos de configuração, os contêineres em execução, as imagens e a configuração do Swarm contra o [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker). As regras são divididas em seções:

- Host Configuration
- Docker Daemon Configuration
- Docker Daemon Configuration Files
- Container Images and Build File
- Container Runtime
- Docker Security Operations
- Docker Swarm Configuration

Os resultados seguem um modelo de status diferente do OpenSCAP: em vez de aprovado/reprovado, a maioria das regras do Docker Bench ou **passa** ou gera um **aviso**. Reprovações de fato são raras. O painel de conformidade mostra as estatísticas do Docker Bench à parte, na seção "Docker Bench Analysis", com gráficos "Warnings by Section" em vez dos gráficos por severidade usados no OpenSCAP.

**Quando roda.** O Docker Bench só roda quando as **duas** condições abaixo são verdadeiras:

1. A integração com Docker está ativa no host (o scanner lê o mesmo socket do Docker).
2. O Docker Bench está ligado na chave de scanner do host.

Se uma delas estiver desligada, o Docker Bench é pulado, mesmo com o binário instalado.

**Estado padrão por host:** desde a 1.4.2, o Docker Bench vem desativado em todos os hosts. É preciso ligá-lo host a host (Host Detail → Integrations → Compliance → Docker Bench). A maioria dos hosts não roda Docker, e rodar o Docker Bench num host sem Docker gera uma longa lista de falhas enganosas do tipo "Docker daemon not running".

---

### Configuração de scanner por host

Todo host com conformidade ligada tem quatro campos de conformidade, que podem ser gerenciados no painel **Host Detail → Integrations → Compliance** ou na aba **Hosts** da página de conformidade:

| Campo | Valores | Significado |
|---|---|---|
| `compliance_mode` | `disabled`, `on-demand`, `enabled` | Chave geral de conformidade do host. `disabled`: o agente não roda nenhum scanner. `on-demand`: as varreduras só rodam quando disparadas manualmente. `enabled`: as varreduras rodam no `compliance_scan_interval` definido para o parque. |
| `compliance_openscap_enabled` | `true` / `false` | Se o OpenSCAP roda neste host. Padrão `true`. |
| `compliance_docker_bench_enabled` | `true` / `false` | Se o Docker Bench roda neste host. Padrão `false`. |
| `compliance_default_profile_id` | ID de perfil ou null | O perfil OpenSCAP usado nas varreduras agendadas / de "todos os perfis" deste host. Null significa que o agente usa `level1_server`. |

Mudanças nesses campos ficam como **configuração pendente** e são enviadas ao agente no próximo heartbeat pelo fluxo Apply Pending Config (veja Gerenciando o agente do PatchMon). Elas só valem depois que o agente confirma o recebimento.

#### Modo: disabled, on-demand e enabled

- **Disabled**: nada roda neste host. A integração do scanner fica desligada e a interface de conformidade mostra "Disabled" na coluna Mode.
- **On-demand**: as varreduras agendadas ficam desligadas, mas os botões manuais **Run Scan** continuam funcionando. Use quando só quiser varrer durante uma investigação.
- **Enabled**: o agente roda varreduras agendadas no intervalo do parque definido em **Security Compliance → Settings → Scan Interval** (padrão de 24 horas, configurável de 6 horas a 7 dias).

O **modo de conformidade padrão** do parque (Security Compliance → Settings → Default Compliance Mode) vale só para hosts recém-registrados. Os hosts existentes mantêm o modo atual nas atualizações do servidor.

---

### O conteúdo SSG vem dentro do binário do servidor

Esta é uma das mudanças de arquitetura mais importantes da 2.0 para a conformidade.

Na 1.x e antes, cada agente baixava o conteúdo do SCAP Security Guide (SSG) do GitHub na hora da varredura. Isso exigia que todo agente tivesse acesso de saída a `github.com`, causava falhas passageiras quando o GitHub estava indisponível e deixava agentes em versões diferentes do SSG, conforme a última vez que tinham baixado.

Na 2.0, o conteúdo SSG e de CIS Benchmark **é embutido na imagem do servidor no momento do build** e servido a partir de um único `SSG_CONTENT_DIR` no servidor. Os agentes agora buscam o conteúdo no próprio servidor, por dois endpoints novos:

- `GET /api/v1/compliance/ssg-version`: retorna a versão do SSG e a lista de arquivos `ssg-*-ds.xml` disponíveis.
- `GET /api/v1/compliance/ssg-content/{filename}`: envia ao agente um arquivo de datastream específico.

Os dois aceitam autenticação por API key de agente.

#### O que isso significa na operação

- **Nenhuma chamada de rede externa na hora da varredura.** O servidor é o único lugar de onde um agente obtém conteúdo SSG. Em nenhuma circunstância os agentes procuram `github.com` para isso; parques isolados (air-gapped) não precisam de nada além do acesso ao servidor que já tinham para os heartbeats.
- **Uma única versão do SSG no parque.** Todos os agentes recebem o mesmo pacote de conteúdo. A página Compliance Settings mostra a versão em uso e a lista de arquivos em **OpenSCAP Content**.
- **Varredura com versão fixa.** Como a imagem já traz o conteúdo, atualizar o servidor é o caminho para obter novas regras do SSG. Os hosts pegam a nova versão sozinhos na verificação diária de conteúdo, e dá para antecipar isso para um host com a chamada de API descrita em "Atualizando o conteúdo SSG de um host".
- **Um servidor sem conteúdo falha de forma visível.** Se o diretório de conteúdo estiver vazio (por exemplo, porque um volume foi montado por cima dele), o servidor registra um aviso na inicialização, Compliance Settings mostra o conteúdo como indisponível e os agentes são avisados disso explicitamente, em vez de recorrerem em silêncio a outra fonte.

#### Onde ver a versão em uso

**Security Compliance → Settings → OpenSCAP Content** mostra:

- A versão do SSG (por exemplo, `0.1.77`).
- Quantos arquivos de conteúdo estão incluídos.
- Uma lista recolhível com o nome de cada `ssg-*-ds.xml`.
- A tabela de sistemas suportados e seus perfis.

---

### Onde a conformidade fica na interface

Há três entradas:

1. **Security Compliance** (item principal da barra lateral): a visão do parque inteiro. Cinco abas: Overview (painel), Hosts (tabela por host com controles de varredura), Scan Results (detalhe das regras), History (lista cronológica de varreduras) e Settings (modo padrão, intervalo, conteúdo SSG).
2. **Hosts → selecione um host → aba Compliance**: o detalhe por host, com os mesmos controles de varredura, o resumo da última varredura, as regras divididas por status / severidade / seção e uma ação de correção por regra.
3. **Dashboard → cards de conformidade**: o painel principal do PatchMon tem um card de resumo de conformidade que leva à página de conformidade com o filtro correspondente. Fica oculto quando o módulo `compliance` está desabilitado.

O topo de toda visão de conformidade tem cinco cards de status: Total hosts, Compliant, Warning, Critical e Never scanned. Clicar em "Never scanned" filtra a aba Hosts só pelos hosts nunca varridos, para você fechar as lacunas de cobertura.

---

### Uma varredura do início ao fim

Uma varredura avulsa típica segue este caminho:

1. Um operador clica em **Run Scan** num host (na aba Hosts de conformidade ou na página de detalhes do host).
2. O navegador chama `POST /compliance/trigger/{hostId}`. O servidor limpa no Redis qualquer flag de "cancelar" antiga desse host, coloca uma tarefa `run_scan` na fila `compliance` do asynq e devolve o ID do job.
3. A tarefa sai da fila e manda um comando WebSocket `run_scan` ao agente. O servidor muda o registro em `compliance_scans` para `running` assim que o agente confirma o recebimento.
4. O agente roda um ou os dois scanners, em sequência. O OpenSCAP chama `oscap xccdf eval` sobre o datastream SSG; o Docker Bench chama `docker-bench-security` (que vem com o agente).
5. Cada subvarredura produz resultados estruturados por regra. O agente os junta num `CompliancePayload` e envia por `POST /api/v1/compliance/scans`.
6. O handler `ReceiveScans` do servidor valida as credenciais da API, aplica um limite de 10 requisições por minuto e grava a varredura e os resultados no banco numa única transação. Ele também respeita, do lado do servidor, as flags `openscap_enabled` e `docker_bench_enabled` do host, e por isso recusa envios acidentais de um scanner que o host tem desativado.
7. Em caso de sucesso, o servidor emite um evento de notificação `compliance_scan_completed` (com os resumos por perfil) e, se alguma varredura deu erro, um evento separado `compliance_scan_failed`.
8. A consulta de varreduras ativas da interface percebe que a linha sumiu do endpoint `active_scans`, mostra o aviso "Compliance scan completed", e o painel busca os dados de novo.

As varreduras agendadas passam pelo mesmo caminho `run_scan` → agente → `ReceiveScans`; só muda quem as inicia.

---

### Varreduras travadas e limpeza automática

Varreduras de conformidade podem demorar: uma varredura OpenSCAP L2 completa num host médio pode levar de 15 a 45 minutos. Por isso o PatchMon usa um limite explícito de detecção de travamento, e não um timeout curto.

Uma varredura é considerada **travada** se estiver em `running` há mais de **3 horas** sem terminar. Um job recorrente do asynq (`ComplianceScanCleanup`, em `POST /api/v1/compliance/scans/cleanup`) roda periodicamente e leva toda varredura travada a um estado final, com a mensagem de erro `Scan terminated automatically after running for more than 3 hours`. Isso impede que o widget **Scans in Progress** acumule varreduras fantasmas e libera a marcação de "varrendo agora" do host.

O endpoint `GET /compliance/scans/stalled` mostra quais varreduras estão prestes a ser limpas. A página de conformidade exibe isso no widget de varreduras travadas (quando há alguma).

---

### Documentação relacionada

- [Executando varreduras de conformidade](#running-compliance-scans): disparo de varreduras, janela de varredura em massa, cancelamento, varreduras travadas.
- [Resultados e correção](#results-and-remediation): como ler o painel, detalhar hosts e regras e usar a correção automática.
- Monitoramento de Docker: a integração com Docker, pré-requisito do Docker Bench.
- Gerenciando o agente do PatchMon: o fluxo Apply Pending Config, usado para enviar as chaves de conformidade aos agentes.
- Notas da versão 1.4.0: a versão que introduziu as varreduras de conformidade.
- Notas da versão 1.4.2: chaves de scanner por host, cancelamento de varredura, limpeza automática de 3 horas.
- Notas da versão 2.0.0: conteúdo SSG embutido e a reescrita.

---

## Capítulo 15: Executando varreduras de conformidade {#running-compliance-scans}

Este capítulo mostra como disparar uma varredura de conformidade, acompanhar o andamento, cancelar se preciso e configurar varreduras agendadas no parque. Tudo é feito pela interface web, numa sessão autenticada e com o módulo `compliance` habilitado.

Você precisa de `can_manage_compliance` para disparar, cancelar ou instalar scanners; `can_view_reports` para acompanhar o andamento sem mudar nada; e `can_manage_hosts` para mudar o modo de conformidade ou as chaves de scanner de um host.

---

### Três jeitos de iniciar uma varredura

| Ponto de partida | Melhor para | Escopo |
|---|---|---|
| Botão **Host Detail → Run Scan** | Investigar um único host | 1 host, "todos os perfis" (os scanners ativos naquele host) |
| **Security Compliance → aba Hosts → botão verde Play** | Varrer de novo um host específico a partir da visão do parque | 1 host, "todos os perfis" |
| **Security Compliance → agendado, pelo intervalo do parque** | Cobertura contínua nos hosts com modo de conformidade `enabled` | Todos os hosts com modo `enabled`, periodicamente |

Também há varreduras avulsas em massa sobre um conjunto de hosts selecionados. Veja [Varreduras em massa](#bulk-scans-across-the-fleet), abaixo.

---

### Disparando uma varredura num host

#### Pela página de detalhes do host

1. Abra **Hosts → *selecione o host* → aba Compliance** (também se chega por Security Compliance → linha do host → link com o nome do host).
2. Olhe o canto superior direito da aba Compliance. Você verá:
    - Um selo **Connected** ou **Disconnected**: o status da conexão WebSocket do agente. Varreduras exigem agente conectado.
    - Um botão **Run Scan** (verde, com ícone de Play).
3. Clique em **Run Scan**. A interface chama `POST /api/v1/compliance/trigger/{hostId}` com `profile_type=all` (roda todos os scanners ativos neste host).
4. O botão vira um indicador de carregamento com "Scanning…" e um aviso confirma "Compliance scan triggered". A resposta traz um `jobId`, que dá para cruzar com os logs do servidor se necessário.

Se o agente estiver desconectado, o botão fica desabilitado e a dica diz "Host is disconnected". Restabeleça a conectividade (veja Gerenciando o agente do PatchMon) antes de tentar de novo.

Também dá para escolher um perfil específico em vez de rodar todos os scanners:

1. Na aba Compliance de Host Detail, abra o seletor de perfil (se aparecer para o seu papel) e escolha um perfil, por exemplo `level2_server` em vez do padrão `level1_server`.
2. Marque **Enable Remediation** se quiser que o agente aplique os scripts de correção do OpenSCAP nas regras que falharem durante esta varredura. A correção durante a varredura altera o sistema; só marque depois de revisar o que as regras fariam.
3. Clique em **Run Scan**. O corpo da requisição inclui `profile_type`, `profile_id` e `enable_remediation`.

#### Pela aba Hosts de Security Compliance

1. Abra **Security Compliance** → aba **Hosts**. Aparece uma tabela com todos os hosts com conformidade ativa.
2. Clique no botão verde Play na coluna **Run** do host que quer varrer. O efeito é exatamente o mesmo do **Run Scan** em Host Detail, com `profile_type=all`.
3. A linha fica azul: a coluna **Last activity** mostra um rótulo animado "OpenSCAP" / "Docker Bench" / "Scanning…" enquanto a varredura está em andamento.

Com a varredura ativa, o botão Play vira um botão vermelho **StopCircle**. Clique nele para cancelar. Veja [Cancelando uma varredura](#cancelling-a-scan), abaixo.

---

### Acompanhando o andamento

Ao contrário das execuções de patch, as varreduras de conformidade não têm transmissão de log ao vivo. A interface depende de **consulta periódica das varreduras ativas**.

#### O widget de varreduras ativas

Na aba Overview da página de conformidade, quando há alguma varredura rodando, aparece um card azul **Scans in Progress** com um indicador de carregamento. Cada varredura em andamento aparece como uma etiqueta com:

- O nome do host (com link para o detalhe de conformidade do host).
- Um selo com o tipo de perfil (OpenSCAP ou Docker Bench) e o horário de início.
- Um indicador de conexão (ícone de Wi-Fi verde se o agente está conectado, vermelho se não).

A lista também aparece acima da tabela de hosts e é consultada por `GET /api/v1/compliance/scans/active` a cada **30 segundos** enquanto há varreduras ativas, e a cada **2 minutos** quando não há. O painel usa a mesma frequência.

#### A janela das varreduras pendentes

Entre o clique em Run Scan e o momento em que o agente muda a linha do banco para `running`, há um intervalo de alguns segundos em que a varredura existe como tarefa do asynq, mas ainda não como linha no banco. A interface cobre esse intervalo com o estado **pendingScans**: o host recém-disparado aparece na hora no widget de varreduras ativas com o status "Triggering…" e é trocado pela linha real do banco quando ela surge (ou removido depois de 60 segundos, se nenhuma varredura correspondente aparecer).

#### Avisos de conclusão

Quando uma varredura ativa some da resposta de `/compliance/scans/active`, a interface compara com o conjunto da consulta anterior e mostra um aviso de sucesso:

- "Compliance scan completed", numa conclusão genérica.
- "Scan completed for *nome do host*", numa varredura pendente acompanhada.

Nesse momento, o painel e a aba de histórico buscam os dados de novo automaticamente.

#### Progresso durante a instalação do scanner

Se o host ainda não tem o OpenSCAP ou o conteúdo do CIS Benchmark instalado, a primeira ação costuma ser instalar o scanner, que tem seu próprio modelo de progresso. Veja [Instalando o scanner](#installing-the-scanner), abaixo.

---

### Cancelando uma varredura {#cancelling-a-scan}

Uma varredura pode ser cancelada enquanto está rodando. Ao contrário das execuções de patch, não há janela de confirmação do tipo "Stop Run". O cancelamento é de um clique, porque os scanners só leem o sistema e podem ser interrompidos com segurança.

#### Pela aba Hosts

1. Na aba **Hosts**, encontre a linha com o indicador azul "Scanning…".
2. Clique no botão vermelho **StopCircle** na coluna **Run**. A interface chama `POST /api/v1/compliance/cancel/{hostId}`.
3. Um aviso confirma "Cancel request sent for *host*".

#### O que o cancelamento faz de fato

O handler `CancelScan` do servidor faz três coisas:

1. **Remove do asynq qualquer tarefa `run_scan` na fila**, para que uma varredura que ainda não chegou ao agente não comece.
2. **Grava no Redis uma flag `compliance_scan_cancel`** para o host. Assim, se o worker pegar a tarefa entre o DeleteTask e a mensagem ao agente, ele vê a flag e não executa.
3. **Manda ao agente uma mensagem WebSocket `compliance_scan_cancel`**, para interromper, no nível do processo, uma varredura que já esteja rodando.

Se o agente estiver conectado e varrendo, ele recebe o cancelamento, encerra o subprocesso do OpenSCAP / Docker Bench e envia os resultados parciais que tiver. O registro da varredura é marcado como cancelado.

Se o agente estiver offline, só vale o cancelamento na fila: a varredura não roda quando o agente reconectar, porque a tarefa já foi tirada da fila.

O cancelamento é idempotente. Chamá-lo num host sem varredura ativa retorna sucesso, com "Scan cancel sent".

---

### Varreduras agendadas

As varreduras agendadas são o caminho "configure e esqueça". Todo host com `compliance_mode=enabled` é varrido no intervalo do parque, sem intervenção do operador.

#### Padrões do parque

Definidos em **Security Compliance → Settings**:

- **Default Compliance Mode**: vale só para hosts recém-registrados. Os hosts existentes mantêm o modo que já têm.
    - `Disabled`: hosts novos entram com a conformidade desligada. É preciso ativar host a host.
    - `On-Demand`: hosts novos entram com a varredura disponível, mas sem agendamento. O `Run Scan` manual funciona.
    - `Enabled`: hosts novos já entram prontos para varreduras agendadas.
- **Scan Interval**: com que frequência os hosts `enabled` são varridos. Opções prontas: 6h, 12h, 24h (padrão), 48h, 3d, 7d. Também aceita um valor bruto em minutos, entre 60 e 10080 (7 dias).

Salvar as configurações envia o novo intervalo a todos os agentes conectados no próximo heartbeat. Agentes offline pegam o valor quando reconectam.

#### Exceções de modo por host

O padrão é só uma sugestão; cada host tem seu próprio `compliance_mode`. Para mudá-lo:

1. Abra **Hosts → *host* → aba Integrations**.
2. Role até **Compliance**.
3. Escolha **Disabled**, **On-Demand** ou **Enabled**.
4. A mudança fica como **configuração pendente** e é aplicada pelo fluxo Apply Pending Config no próximo heartbeat do agente do host.

A aba Hosts da página de conformidade mostra o modo atual na coluna **Mode** (`Disabled`, `On-demand`, `Scheduled`).

#### Chaves de scanner por host

No mesmo painel Integrations → Compliance há duas caixas de seleção:

- **OpenSCAP**: padrão `on`. Marque para o agente rodar varreduras OpenSCAP de CIS em cada varredura agendada e sob demanda.
- **Docker Bench**: padrão `off`. Marque só em hosts que de fato rodam Docker e têm a integração com Docker ativa.

Essas chaves também aparecem na coluna **Scanners** da aba Hosts (`OpenSCAP`, `Docker`, `OpenSCAP, Docker` ou `-` se nada estiver ativo).

#### Perfil padrão

Definido em **Host Detail → Integrations → Compliance → Default profile**. Escolha entre os perfis disponíveis informados pelo agente (normalmente `level1_server`, `level2_server` e, em hosts com Docker, possivelmente `docker-bench`). É o perfil usado nas varreduras agendadas e nas avulsas em que nenhum perfil é informado (`profile_type=all`).

---

### Varreduras em massa no parque {#bulk-scans-across-the-fleet}

Para operações avulsas do tipo "varra tudo agora", use a janela Bulk Scan (aberta pela página de conformidade; o ponto de entrada exato depende do seu módulo / edição, normalmente um botão de ação em massa na aba Hosts).

A janela permite:

1. Escolher o **Profile Type**: `All Profiles`, `OpenSCAP Only` ou `Docker Bench Only`.
2. Marcar **Enable Remediation**, se quiser que o OpenSCAP aplique os scripts de correção durante a varredura.
3. Marcar os hosts a incluir (ou **Select All**).
4. Clicar em **Scan N Hosts**.

A interface manda uma única requisição `POST /api/v1/compliance/trigger/bulk` com a lista completa de hosts. O servidor coloca na fila uma tarefa `run_scan` por host. Hosts offline também entram na fila: são varridos assim que reconectarem e o worker tirar a tarefa deles da fila (ou a tarefa é descartada, se a fila a remover antes da reconexão).

A janela mostra uma faixa de resultado:

- Verde, se todos os disparos deram certo.
- Amarela, se alguns falharam, com a lista dos hosts e o erro de cada um.

Depois de uma varredura em massa bem-sucedida, a janela fecha sozinha em três segundos, e cada host disparado aparece no widget de varreduras ativas como pendente / em andamento.

---

### Instalando o scanner {#installing-the-scanner}

A varredura de conformidade num host exige o OpenSCAP (binário `oscap`) instalado e o conteúdo SSG disponível localmente. Na primeira vez que você ativa a conformidade num host, o scanner normalmente ainda não está lá. O PatchMon resolve isso com um job de instalação.

1. Ative o **modo de conformidade** no host (`On-Demand` ou `Enabled`).
2. No próximo Apply Pending Config, o agente recebe o novo estado da integração e informa que o scanner não está instalado.
3. Na aba Compliance de Host Detail, clique em **Install Scanner**. A interface chama `POST /api/v1/compliance/install-scanner/{hostId}`.
4. O servidor coloca na fila uma tarefa de instalação. O worker manda uma mensagem de instalação ao agente.
5. O agente instala o scanner OpenSCAP com o gerenciador de pacotes do próprio host e depois baixa o conteúdo SSG do servidor por `GET /api/v1/compliance/ssg-content/{filename}`. Os eventos de progresso vão para o Redis e aparecem na interface via `GET /compliance/install-job/{hostId}`, que retorna o estado atual, uma mensagem por etapa e o percentual de progresso. Os estados são `none` (nenhuma instalação foi pedida), `waiting`, `active`, `completed`, `failed` e `unknown`, quando o job não é mais encontrado. O estado `failed` também traz um campo `error` com o motivo.
6. Quando a instalação termina, o botão Run Scan fica ativo.

O nome do pacote do scanner não é o mesmo em todas as versões, então o agente pergunta ao repositório qual existe, em vez de supor. Debian 12 ou mais novo e Ubuntu 24.04 ou mais novo fornecem `openscap-scanner` mais `openscap-common`; Debian 10 e Ubuntu 22.04 fornecem `libopenscap8`. Hosts da família RHEL usam `openscap-scanner`, e hosts SUSE, `openscap-utils`.

O conteúdo é tratado à parte do scanner, e um host que recebe um sem o outro não é considerado falha. O Ubuntu não empacota nenhum conteúdo SSG, então no Ubuntu o datastream sempre vem do servidor do PatchMon. A instalação só falha de vez quando o host fica sem um binário `oscap` funcionando.

A instalação pode ser cancelada no meio, pela mesma interface, via `POST /api/v1/compliance/install-scanner/{hostId}/cancel`.

#### Plataformas em que o scanner não pode ser instalado

Alguns hosts suportados pelo PatchMon não conseguem rodar varreduras de conformidade de jeito nenhum, porque a plataforma não publica pacote do OpenSCAP, conteúdo SCAP, ou nenhum dos dois. Na maioria desses casos, a instalação informa o motivo com clareza. A exceção é o Amazon Linux 2, em que a falha aparece como saída bruta do `yum`:

| Plataforma | Motivo |
|----------|--------|
| Debian 11 (bullseye) | O OpenSCAP foi retirado do repositório antes do lançamento do bullseye, então nenhum pacote fornece o `oscap` |
| Amazon Linux 2 | Os repositórios amzn2 não têm nem `openscap-scanner` nem `scap-security-guide` |
| Alpine Linux | Não há datastream SCAP publicado para o Alpine, então o scanner não teria contra o que varrer |
| Arch Linux | O OpenSCAP só está disponível no AUR, e não há datastream publicado |
| FreeBSD | Não há port do OpenSCAP nem datastream |
| Windows | O agente não tem integração de conformidade no Windows |

Todo o resto da matriz suportada consegue instalar o scanner: Debian 10, 12, 13 e 14, Ubuntu 22.04 e 24.04, a família RHEL (Rocky, AlmaLinux, CentOS Stream, Oracle Linux, Fedora, Amazon Linux 2023) e openSUSE.

No Debian 10, a instalação funciona, mas os resultados não servem. O PatchMon não traz datastream para o Debian 10, então o host recorre ao conteúdo muito antigo do próprio pacote `ssg-debian` do buster, e todas as regras voltam como "not applicable", porque o conteúdo foi feito para uma versão anterior do Debian. Na prática, considere as varreduras de conformidade indisponíveis no Debian 10.

Se o painel de status mostrar **Partial Installation**, alguns scanners estão presentes e outros não. Um caso comum é um host com Docker, em que o Docker Bench está pronto mas o OpenSCAP falta: as varreduras retornam só resultados do Docker Bench e o painel do scanner informa "No SCAP content found". Nesse estado aparece o mesmo botão, com o rótulo **Retry install**, que instala o que estiver faltando.

#### Atualizando o conteúdo SSG de um host

Quando o servidor é atualizado para uma versão do PatchMon com conteúdo SSG mais novo embutido, os hosts existentes podem continuar com conteúdo mais antigo guardado localmente.

Normalmente não é preciso fazer nada. Uma verificação diária compara a versão do SSG informada por cada host com a versão que vem com o servidor e envia uma atualização aos hosts que estiverem atrás. Assim, o parque se acerta sozinho em até um dia depois da atualização do servidor.

Para antecipar isso num host:

1. Chame `POST /api/v1/compliance/upgrade-ssg/{hostId}` (exige a permissão `can_manage_compliance`). O servidor coloca na fila uma tarefa `ssg_upgrade`, e o agente baixa do servidor o `ssg-*-ds.xml` atual do seu sistema operacional.
2. Consulte `GET /api/v1/compliance/ssg-upgrade-job/{hostId}` até ver `waiting`, `active` ou `completed`, com uma mensagem.

Rodar de novo **Install Scanner** em Host Detail também ressincroniza o conteúdo com o servidor, como parte da instalação.

A página Compliance Settings sempre mostra a versão do SSG em uso no servidor em **OpenSCAP Content → SSG *x.y.z***.

---

### Varreduras travadas

Qualquer varredura em `running` há mais de **3 horas** é considerada travada. Um job recorrente de limpeza (`ComplianceScanCleanup`, disparado em `POST /api/v1/compliance/scans/cleanup`) marca cada uma delas como cancelada, com a mensagem de erro:

> Scan terminated automatically after running for more than 3 hours

Isso evita que varreduras órfãs "eternamente em andamento" entupam o widget de varreduras ativas. A limpeza roda num agendamento definido pela fila de automação recorrente; administradores com `can_manage_compliance` também podem dispará-la sob demanda pela interface de automação.

#### Vendo as varreduras travadas

O endpoint `GET /api/v1/compliance/scans/stalled` retorna todas as varreduras com mais de 3 horas que ainda estão marcadas como `running`. Se a página de conformidade mostrar um widget **Stalled Scans** (exibido quando há alguma linha travada), clicar numa linha leva ao detalhe de conformidade do host, para você investigar.

#### Por que uma varredura pode travar de verdade

- O agente caiu no meio da varredura e não teve como enviar um resultado final.
- O agente perdeu a conectividade no meio da varredura. Os resultados foram gerados mas não enviados, e quando a conexão voltou a janela de 3 horas já tinha passado.
- Um perfil num host muito grande simplesmente passou de 3 horas (incomum no L1; possível no L2, com regras pesadas de integridade de arquivos em sistemas de arquivos profundos). A limpeza vai agir; rode a varredura de novo manualmente depois.

#### O que o operador deve fazer

Se uma varredura foi limpa automaticamente e você precisa dos resultados:

1. Verifique a saúde do agente (`sudo patchmon-agent diagnostics` no host, ou os logs recentes do host na página de detalhes).
2. Se o agente estiver saudável, rode **Run Scan** de novo em Host Detail ou na aba Hosts de conformidade.
3. Se as varreduras passam de 3 horas com frequência num host específico (normalmente um servidor de arquivos muito grande), considere deixar esse host em modo sob demanda, para que ele só seja varrido quando você estiver acompanhando.

---

### Limites de requisição

O envio de resultados de varredura pelo agente é limitado a **10 envios por minuto por host** em `POST /api/v1/compliance/scans`. O uso normal nunca chega nisso: um host só envia uma vez por varredura. O limite existe para conter um agente com defeito que tente reenviar resultados em loop.

Os disparos de varredura no servidor não têm limite próprio além dos limites gerais de autenticação que você configura para a API, mas o pool de workers do asynq naturalmente dita o ritmo: um "varra tudo agora" no parque coloca mais de 100 tarefas na fila e as processa num ritmo razoável.

---

### Documentação relacionada

- [Visão geral de conformidade](#compliance-overview): liberação por módulo, permissões, arquitetura dos scanners, conteúdo SSG embutido.
- [Resultados e correção](#results-and-remediation): o que fazer com os resultados das varreduras.
- Monitoramento de Docker: a integração com Docker necessária para as varreduras do Docker Bench.
- Gerenciando o agente do PatchMon: diagnóstico e o fluxo Apply Pending Config, usado para enviar as configurações de conformidade.

---

## Capítulo 16: Resultados de conformidade e correção {#results-and-remediation}

Quando uma varredura de conformidade termina, os resultados aparecem em três camadas da interface web: o **painel** do parque, a **aba Compliance** de cada host e a página **Rule Detail** de cada regra. Este capítulo percorre cada camada do ponto de vista do operador e depois trata dos caminhos opcionais de correção automática e da visão de tendências.

Você precisa de `can_view_reports` para ver qualquer parte disto, e de `can_manage_compliance` para disparar correções.

---

### Painel do parque

A página inicial de **Security Compliance** abre na aba **Overview**, que é o painel do parque. Ela foi feita para responder, num relance, "como está a minha postura geral de conformidade e por onde começo?".

#### Os cinco cards de resumo

No topo de todas as visões da página de conformidade ficam cinco cards idênticos:

| Card | O que conta | De onde vem |
|---|---|---|
| Total hosts | `total_hosts + unscanned`: todos os hosts visíveis na conformidade, varridos ou não | `summary.total_hosts` + `summary.unscanned` |
| Compliant | Hosts cuja última varredura teve nota **≥ 80%** | `summary.hosts_compliant` |
| Warning | Hosts cuja última varredura teve nota entre **60% e 79%** | `summary.hosts_warning` |
| Critical | Hosts cuja última varredura teve nota **< 60%** | `summary.hosts_critical` |
| Never scanned | Hosts que nunca enviaram uma varredura com sucesso | `summary.unscanned` |

O card Never scanned é clicável: ele liga um filtro na aba **Hosts** que mostra só os hosts nunca varridos, o jeito mais rápido de achar lacunas de cobertura.

#### Os gráficos

A grade da aba Overview tem cinco gráficos:

- **Failures by Severity**: rosca empilhada com as regras reprovadas no parque por severidade (critical / high / medium / low). Clicar numa fatia leva à aba Scan Results filtrada por aquela severidade.
- **OpenSCAP Distribution**: divisão entre regras aprovadas e reprovadas nas varreduras OpenSCAP.
- **Compliance Profiles**: pizza das varreduras por tipo de perfil (OpenSCAP ou Docker Bench). Clicar aplica o filtro correspondente.
- **Last Scan Age**: distribuição de quando os hosts foram varridos pela última vez (hoje / esta semana / este mês / antes).
- **Host Compliance Status**: gráfico de barras dos hosts por Compliant / Warning / Critical / Never Scanned.

Todos os gráficos são atualizados a cada 2 minutos (ou a cada 30 segundos, quando há pelo menos uma varredura ativa), e o painel continua útil para o operador que deixa a página aberta durante uma implantação.

#### Filtro por tipo de perfil

Acima dos gráficos há um filtro de **tipo de perfil** com três valores: `All Scans` (padrão), `OpenSCAP` e `Docker Bench`. Ao escolher OpenSCAP ou Docker Bench, aparecem painéis específicos daquele perfil:

- **OpenSCAP Analysis**: rosca Rule Results, barras Failures by Severity, Score Distribution e Scan Freshness.
- **Docker Bench Analysis**: rosca Rule Results (aprovadas × avisos), barras **Warnings by Section** (divididas nas seções do CIS Docker Benchmark), Score Distribution e Scan Freshness.

A visão do Docker Bench usa "Warnings" no lugar de "Failures" de propósito: na maioria das verificações, o modelo de status do Docker Bench é aprovado-ou-aviso, não aprovado-ou-reprovado.

---

### Aba Hosts: o parque host a host

A aba **Hosts** mostra uma linha por host com conformidade ativa. É a sua lista de trabalho: ordene e varra a partir dela.

| Coluna | O que mostra |
|---|---|
| Run | Botão verde Play (disparar varredura) ou botão vermelho Stop (cancelar varredura). |
| Host name | Nome amigável (clicável; abre o detalhe de conformidade do host). |
| Status | Ícone de escudo colorido: verde ≥80%, amarelo 60–79%, vermelho <60%, cinza nunca varrido. |
| Last activity | Data amigável da última varredura e rótulo da atividade ("Scan", ou "Scanning…" durante a varredura). |
| Passed / Failed / Skipped | Clique na contagem para ir à aba Scan Results filtrada por este host e por aquele status. |
| Scanner status | `Scanned`, `Enabled` ou `-`: se o agente já produziu uma varredura, se tem o scanner ativo mas sem resultados, ou se não tem integração de scanner ativa. |
| Mode | `Scheduled`, `On-demand` ou `Disabled`: o `compliance_mode` deste host. |
| Scanners | Quais scanners estão ativos no host: `OpenSCAP`, `Docker`, `OpenSCAP, Docker` ou `-`. |

Clicar em qualquer número de Passed / Failed / Skipped leva direto à aba Scan Results com os filtros de host e status aplicados. Clicar em "12 Failed" do hostA, por exemplo, dá a lista de regras filtrada da última varredura daquele host.

A página também respeita o filtro de tabela acionado pelo card de resumo `Never scanned`: clique nele e a tabela passa a mostrar só os hosts sem nenhum registro de varredura.

---

### Aba Scan Results: detalhando as regras

A aba **Scan Results** (também alcançada pelos cliques por host descritos acima) é onde você investiga regras específicas no parque. Ela mostra todas as regras avaliadas por qualquer host varrido, com:

- **Título da regra**, **referência da regra** (por exemplo, `xccdf_org.ssgproject.content_rule_...`) e **seção** (número da seção CIS no OpenSCAP; seção do benchmark no Docker Bench).
- Selo de **severidade** (critical / high / medium / low / unknown).
- Selo de **tipo de perfil** (OpenSCAP / Docker Bench).
- **Hosts aprovados / reprovados / com aviso / total** no parque.

Filtros acima da tabela: status (pass / fail / warn / error / skipped), severidade, tipo de perfil, host específico e busca em texto livre. Todos eles são repassados a `GET /api/v1/compliance/rules`, então a filtragem é feita no servidor e bate com os links de detalhamento do painel.

Clique em qualquer regra para abrir **Rule Detail**.

---

### Rule Detail: uma regra no parque inteiro

A página Rule Detail (`/compliance/rules/{ruleId}`) é a que você abre quando quer entender "que regra é esta, por que está falhando, como corrijo e quais hosts ela afeta?".

Ela tem as seguintes seções.

#### 1. Cards de resumo

Quatro cards no topo: **Affected Hosts**, **Passing**, **Failing** e **Warnings**, com as contagens no parque para a última varredura de cada host nessa regra.

#### 2. Descrição

A explicação legível do benchmark, por inteiro. Nas regras OpenSCAP, é o elemento SCAP `<Description>`; no Docker Bench, é o texto da regra no benchmark.

#### 3. Por que falhou (justificativa)

A justificativa do benchmark para a existência da regra: por que ela importa e que risco mitiga. Aparece como texto simples.

#### 4. O que a correção faz + correção

A coluna da direita tem dois painéis que ajudam o operador a agir sobre uma falha:

- **What the fix does**: uma explicação curta, em linguagem simples (em inglês), da correção, deduzida do texto do script de correção (por exemplo, "This fix will update file permissions or ownership…" quando o script usa `chmod` / `chown`; "This fix will update SSH daemon configuration…" quando o script mexe em `/etc/ssh`). É um apoio de interface, não serve como evidência de auditoria. Leia sempre o script de correção de verdade, logo abaixo.
- **Remediation**: o script exato que o scanner rodaria. Nas regras OpenSCAP, é a correção em shell tirada do SSG. No Docker Bench, é o comando indicado pelo benchmark. Um botão **Copy** copia o script para a área de transferência, para colar num chamado de mudança ou num runbook.

Se o benchmark não traz script de correção (comum em regras genéricas do tipo "documente isto"), o painel mostra "No remediation steps available."

#### 5. Tabela de hosts afetados

Todo host que avaliou esta regra aparece aqui, com:

- O nome do host (clique para abrir o detalhe de conformidade do host).
- O status desta regra neste host (Pass / Fail / Warning / N/A / Skipped / Error).
- **Why (this host)**: o texto `finding` do scanner, ou uma string `Current: X → Required: Y` montada a partir de `actual` + `expected`. É o motivo concreto da falha *neste* host, e costuma bastar para o diagnóstico sem abrir um shell.

Use esta visão para medir o impacto: "esta regra falha em 14 hosts; a causa é a mesma em todos?". Ordene pela coluna de status, procure grupos com o mesmo texto de finding e corrija-os em lote.

---

### Detalhe de conformidade do host

A visão de conformidade por host (`/compliance/hosts/{hostId}`) abre ao clicar em qualquer nome de host na área de conformidade. O layout:

- **Cabeçalho**: link de voltar, ícone de escudo, nome do host como título (H1), botão **Run Scan** com o selo de status de conexão e link para Full Host Details.
- **Cinco cards de resumo**: Passed, Failed, Warning, N/A e Score (ou metadados da varredura recente).
- **Tabela Scan Results**: paginada em 25 linhas, mostrando por padrão a varredura mais recente deste host, com filtros por status e severidade.
- **Ações nas regras**: cada regra reprovada tem um botão de expandir que mostra ali mesmo o Why / Rationale / Remediation, mais um botão "Remediate this rule" (veja abaixo).

Os cinco cards de resumo também filtram: clique no card **Passed rules** para ver só as aprovadas, em **Failed** para ver só as reprovadas e assim por diante. O card selecionado ganha um contorno colorido, para você saber qual filtro está ativo.

A varredura exibida é a mais recente de cada perfil. Um filtro de tipo de perfil acima da tabela alterna entre a última varredura OpenSCAP e a última varredura Docker Bench do host. Se a última varredura tiver mais de uma semana, um aviso discreto lembra que os resultados podem estar desatualizados.

---

### Correção automática

Há dois caminhos de correção, cada um acionado de uma parte diferente da interface.

#### 1. Correção sob demanda, regra a regra

Corrige uma única regra reprovada sem rodar uma varredura completa.

1. Abra o **detalhe de conformidade** do host.
2. Na tabela Scan Results, expanda uma regra reprovada.
3. Clique em **Remediate this rule**.
4. A interface chama `POST /api/v1/compliance/remediate/{hostId}` com `{ "rule_id": "<rule-ref>" }`. O servidor confirma que o agente está conectado e manda a ele uma mensagem WebSocket `remediate_rule`.
5. O agente roda `oscap xccdf eval --remediate --rule <rule>` sobre o datastream SSG, o que executa o script de correção do OpenSCAP só para aquela regra.
6. A interface mostra o aviso "Remediation triggered". A próxima varredura (manual ou agendada) deve mostrar a regra passando de Fail para Pass, se a correção funcionou.

Hoje, a correção por regra está limitada às regras OpenSCAP. O Docker Bench não traz scripts de correção executáveis no benchmark, e por isso a interface desabilita o botão Remediate nas regras do Docker Bench.

#### 2. Correção durante a varredura

Aplica os scripts de correção de *todas* as regras reprovadas como parte de uma varredura.

- Na janela **Run Scan** de Host Detail, marque **Enable Remediation** antes de iniciar a varredura.
- Na janela **Bulk Compliance Scan** (página de conformidade), marque **Enable Remediation** antes de disparar o lote.

Com `enable_remediation=true` no disparo, o agente roda o OpenSCAP no modo `--remediate`, que tenta aplicar a correção de cada regra que falhar. Os resultados enviados ao servidor incluem um resumo `remediation_applied` / `remediation_count`, para você distinguir uma varredura comum de uma varredura com correção.

#### Quando usar cada um

- **Por regra**: mudanças bem delimitadas, sobretudo em produção, onde você quer ver uma única coisa mudar de cada vez. Mais seguro e mais lento.
- **Durante a varredura**: limpeza em massa num host recém-montado, ou num laboratório que você acabou de reconstruir e quer endurecer de uma vez. Mais rápido, mas aplica todas as correções; revise antes o conjunto de regras afetadas.

> **Atenção:** alguns scripts de correção do OpenSCAP alteram o sistema de forma drástica. Eles podem mudar a configuração do SSH, desativar protocolos, alterar configurações do PAM ou definir parâmetros de kernel que quebram ferramentas sem relação com a regra. Teste sempre a correção durante a varredura num host que não seja de produção antes de aplicá-la no parque. A correção por regra é mais segura porque você leu o script antes.

#### Histórico nas notas de versão

A correção automática entrou na 1.4.0 ("Optional auto-remediation of failed rules during scans"). Na 2.0, ela continua no módulo de conformidade; **não** foi para o módulo de patching. Se você estiver lendo notas de versão antigas: a correção por regra continua passando por `POST /api/v1/compliance/remediate/{hostId}`, e não por uma execução de patch.

---

### Tendências ao longo do tempo

`GET /api/v1/compliance/trends/{hostId}?days=30` retorna o histórico de varreduras do host como série temporal: `completed_at`, `score`, `profile_name` e `profile_type` de cada varredura no período. A interface usa isso para mostrar linhas de tendência no detalhe de conformidade do host.

A API aceita `days` entre 1 e 365. O uso típico é o padrão de 30 dias no acompanhamento do dia a dia, ou 365 ao preparar um relatório anual de conformidade.

---

### Aba History: varreduras em ordem cronológica

A aba **History** é uma lista simples de todas as varreduras que o sistema já registrou, da mais nova para a mais antiga. É paginada em 25 por página e pode ser filtrada por status, tipo de perfil e host.

Cada linha mostra:

- O nome do host.
- O perfil (por exemplo, `level1_server` do OpenSCAP, ou `Docker Bench for Security`).
- Início e duração.
- Totais: total de regras, aprovadas, reprovadas, avisos, puladas e não aplicáveis.
- A nota e qualquer mensagem de erro.

As varreduras canceladas automaticamente depois do limite de travamento de 3 horas aparecem aqui com a mensagem de erro "Scan terminated automatically after running for more than 3 hours" e status de cancelada. Isso ajuda a achar hosts que estouram o tempo com frequência.

Não há endpoint de exportação do histórico de varreduras. Para arquivar varreduras para órgãos reguladores, chame `GET /api/v1/compliance/scans/history` diretamente e grave o JSON em disco.

---

### Notificações de varreduras

Toda varredura concluída emite um evento de notificação `compliance_scan_completed`. O corpo da notificação inclui:

- Um título legível: `Compliance Scan - <hostname>` (com o sufixo `- N Failed Rules` quando há falhas).
- Linhas de resumo por perfil: nome do perfil, nota em porcentagem, quantidade de aprovadas e de reprovadas.
- Metadados estruturados para processamento posterior: ID e nome do host, quantidade de reprovadas, de aprovadas, total de regras e resumos por perfil.

A severidade padrão é `informational`, elevada para `warning` quando há pelo menos uma regra reprovada. As configurações de alerta por evento permitem mudar a severidade ou suprimir essas notificações, se você já acompanha por um painel.

Um evento separado, `compliance_scan_failed`, é emitido para cada subvarredura que deu erro numa execução com vários scanners (por exemplo, o OpenSCAP funcionou mas o Docker Bench falhou). A severidade padrão é `error`. Os metadados incluem o nome e o tipo do perfil e o erro capturado.

---

### Fluxo de trabalho na prática

Um ciclo típico de conformidade no PatchMon:

1. **Linha de base**: ligue a conformidade no parque (`Default Compliance Mode = On-Demand` e depois ative host a host) e faça uma varredura em massa de tudo uma vez, para montar a linha de base. Espere muitas falhas; esse é o ponto de partida.
2. **Triagem**: abra a aba Overview. Use **Failures by Severity** para achar as falhas críticas e clique para ir à aba Scan Results filtrada por críticas.
3. **Investigação**: em cada regra, abra Rule Detail. Leia a justificativa e a correção, escolha alguns hosts com o mesmo finding e corrija-os manualmente ou com a correção por regra.
4. **Nova varredura**: em cada host corrigido, clique em Run Scan. Confirme que a regra passou para Pass.
5. **Agendamento**: com a linha de base limpa, mude `compliance_mode=enabled` nos hosts que importam, defina o intervalo de varredura em 24h (ou o que fizer sentido para o seu SLO) e deixe rodando. O painel passa a ser o seu sinal contínuo de desvios.
6. **Revisão**: o gráfico **Scan Freshness**, nas abas OpenSCAP / Docker Bench, mostra quais hosts não foram varridos recentemente; traga esses hosts de volta para o ciclo.

---

### Documentação relacionada

- [Visão geral de conformidade](#compliance-overview): arquitetura dos scanners, permissões, liberação por módulo.
- [Executando varreduras de conformidade](#running-compliance-scans): disparo, cancelamento, agendamento e varreduras travadas.
- Monitoramento de Docker: a integração com Docker, pré-requisito das varreduras do Docker Bench.
- Alertas e notificações: roteamento dos eventos `compliance_scan_completed` e `compliance_scan_failed` para os seus destinos.
- Notas da versão 1.4.0: a introdução da correção automática.

---

## Capítulo 17: Visão geral de alertas {#alerts-overview}

### O que são alertas no PatchMon

Um **alerta** é o registro de uma condição relevante detectada pelo servidor: um host que parou de reportar, um limite de atualizações de segurança ultrapassado, uma nova versão do servidor do PatchMon disponível e assim por diante. Os alertas aparecem em **Reporting** e podem ser encaminhados para chat, e-mail ou ntfy pelo fluxo de notificações. O mesmo evento que cria um alerta também pode ser enviado a destinos externos. Os alertas são a representação, dentro do aplicativo, dos sinais operacionais.

Nas configurações e na interface, os alertas são agrupados em categorias: **host**, **patching**, **compliance**, **docker**, **security**, **remote_access** e **system**.

A chave geral fica em **Reporting → Alert Lifecycle → Alerts system**. Com ela desligada, nenhum alerta é criado, seja qual for a configuração de cada tipo.

### Tipos de alerta implementados hoje

Os tipos de alerta abaixo são disparados pelo código do servidor na 2.0. Cada um pode ser ligado, ajustado e roteado individualmente.

| Tipo | Categoria | Disparado quando |
|------|----------|-----------|
| `host_down` | host | O WebSocket do agente do host está desconectado há mais tempo que o limite de `host_down` (padrão de 30 segundos, configurável em **Reporting → Alert Lifecycle**), ou o host não reportou dentro desse limite numa verificação periódica. Aparece como **Host Agent Down**. |
| `host_recovered` | host | O agente de um host que estava fora reconecta ou volta a reportar. Aparece como **Host Agent Recovered**. |
| `host_enrolled` | host | Um novo host é registrado com sucesso |
| `host_deleted` | host | Um host é removido do inventário |
| `host_security_updates_exceeded` | security | Um host tem mais atualizações de segurança que o limite configurado |
| `host_pending_updates_exceeded` | security | Um host tem mais atualizações pendentes que o limite configurado |
| `host_security_updates_resolved` | security | A contagem de atualizações de segurança volta a ficar abaixo do limite |
| `host_pending_updates_resolved` | security | A contagem de atualizações pendentes volta a ficar abaixo do limite |
| `server_update` | system | Uma versão mais nova do servidor do PatchMon é detectada pela verificação de versão via DNS |
| `agent_update` | system | Uma versão mais nova do agente é lançada |
| `patch_run_started` | patching | Uma execução de patch começa |
| `patch_run_completed` | patching | Uma execução de patch termina |
| `patch_run_failed` | patching | Uma execução de patch termina com erros |
| `patch_run_approved` | patching | Uma execução de patch é aprovada para execução |
| `patch_run_cancelled` | patching | Uma execução de patch é cancelada por um operador |
| `patch_reboot_required` | patching | Foram instalados pacotes que exigem reinício |
| `compliance_scan_completed` | compliance | Uma varredura de conformidade OpenSCAP termina |
| `compliance_scan_failed` | compliance | Uma varredura de conformidade dá erro |
| `container_stopped` | docker | Um contêiner Docker acompanhado para de forma inesperada |
| `container_started` | docker | Um contêiner que estava parado volta a rodar |
| `container_image_update_available` | docker | Há um digest de imagem mais novo para um contêiner acompanhado |
| `ssh_session_started` | remote_access | Um usuário abre uma sessão SSH web com um host |
| `rdp_session_started` | remote_access | Um usuário abre uma sessão RDP web com um host |
| `user_login` | system | Um usuário entra |
| `user_login_failed` | system | Uma tentativa de login falha |
| `account_locked` | system | Uma conta é bloqueada depois de falhas repetidas |
| `user_created` | system | Um novo usuário é criado |
| `user_role_changed` | system | O papel de um usuário muda |
| `user_tfa_disabled` | system | A autenticação em dois fatores de um usuário é removida |

Se um tipo citado nas notas de versão não está nesta tabela, ele não está implementado no servidor. Por compatibilidade, qualquer tipo ausente da tabela `alert_config` é tratado como ligado por padrão, mas só disparam de fato os tipos que têm emissor no código do servidor.

### A página Reporting

Os alertas são gerenciados em **Reporting**, na navegação principal. A página tem um cabeçalho fixo com quatro cards de severidade (Informational, Warning, Error, Critical) e um card **Total Active**, com uma barra de abas logo abaixo.

#### Abas

| Aba | Finalidade |
|-----|---------|
| **Overview** | Painéis: alertas por severidade, tendência de volume, alertas por tipo, alertas recentes, carga por responsável, entregas por destino |
| **Alerts** | A tabela filtrável de alertas abertos e históricos |
| **Alert Lifecycle** | Configuração por tipo (depende do módulo `alerts_advanced`) |
| **Destinations** | Destinos de notificação (SMTP, webhook, ntfy, interno) |
| **Event Rules** | Regras de roteamento que distribuem os eventos aos destinos |
| **Scheduled Reports** | Relatórios do parque agendados por cron e entregues aos destinos |
| **Delivery Log** | Todas as tentativas de envio de notificação, com status e erros |

Clicar num card de severidade leva direto à aba **Alerts**, filtrada por aquela severidade e com status = `open`.

#### Filtros

A aba **Alerts** tem quatro filtros, além de uma caixa de busca em texto livre:

| Filtro | Valores |
|--------|--------|
| **Severity** | `All Severities`, `Informational`, `Warning`, `Error`, `Critical` |
| **Type** | `All Types` ou qualquer tipo de alerta presente no seu histórico |
| **Status** | `All Status`, `Open`, `Acknowledged`, `Investigating`, `Escalated`, `Silenced`, `Done`, `Resolved` |
| **Assignment** | `All Assignments`, `Assigned to me`, `Assigned`, `Unassigned` ou um responsável específico |

Os filtros ficam na URL (`?tab=alerts&severity=critical&status=open`), então dá para criar links diretos para uma visão filtrada. Os cards de severidade do cabeçalho também ficam destacados quando há um filtro ativo.

A filtragem e a busca são aplicadas pelo servidor sobre todos os alertas, não só os da página que você está vendo, então a busca sempre traz resultados do histórico inteiro. A caixa de busca espera um instante depois que você para de digitar, para os resultados se acomodarem em vez de piscarem a cada tecla.

#### Ordenação

Três colunas da tabela de alertas podem ser ordenadas clicando no cabeçalho: **Severity**, **Type** e **Created**. A seta ao lado do cabeçalho indica a direção atual. A ordenação é aplicada sobre todo o conjunto filtrado, então a primeira página sempre mostra o verdadeiro topo da ordenação.

#### Paginação

A tabela de alertas é paginada. Abaixo dela há:

- **Rows per page**: 25, 50, 100 ou 200. A escolha fica lembrada no navegador.
- A contagem das linhas exibidas e o total de alertas que atendem aos filtros atuais.
- Controles de página anterior e seguinte, com o número da página atual.

Mudar um filtro, o texto da busca, a ordenação ou o tamanho da página leva você de volta à página um. A seleção de linhas é limpa ao trocar de página ou de filtro, e assim uma ação em massa só se aplica a alertas que você está vendo.

### Ciclo de vida do alerta

O PatchMon acompanha os alertas com dois conceitos:

- **`is_active`**: um booleano na linha do alerta. O alerta está **ativo** enquanto está aberto ou em tratamento, e **inativo** depois de resolvido.
- **Estado atual**: um rótulo derivado da ação mais recente registrada no alerta (por exemplo, `acknowledged`, `resolved`).

#### Ações

As ações disponíveis vêm de uma tabela do banco, não do código, então a lista pode variar um pouco entre instalações. Elas se dividem em dois grupos.

As **ações de fluxo** mantêm o alerta ativo e só registram o andamento. Nomes típicos:

- `acknowledged`
- `investigating`
- `escalated`
- `silenced`

As **ações de resolução** fecham o alerta: definem `is_active=false`, registram `resolved_at` e `resolved_by` e tiram o alerta das estatísticas de ativos. Nomes típicos:

- `resolved`
- `done`

Rodar uma ação de resolução num alerta já resolvido não causa problema. Rodar uma ação de fluxo num alerta resolvido o reativa; na prática, é assim que se "reabre" um alerta: escolha uma ação de fluxo como `acknowledged`.

As ações de fluxo aparecem em **Workflow** e as de resolução em **Resolve**, tanto no menu da linha quanto na janela de detalhes do alerta.

#### Atribuição

Um alerta pode ser atribuído a um usuário em três lugares:

1. A lista **Assigned To** na tabela de alertas: muda a atribuição ali mesmo.
2. A lista **Assigned To** na janela de detalhes do alerta.
3. A coluna **Auto-assign** em **Alert Lifecycle**: define um responsável padrão para todos os alertas novos de um tipo.

Escolha **Unassigned** para limpar. Toda mudança de atribuição fica registrada no histórico do alerta.

#### Histórico

Toda ação (criação, atribuição, remoção de atribuição, reconhecimento, resolução e qualquer ação personalizada) fica registrada em `alert_history`. Abra a janela de detalhes do alerta e role até **History** para ver quem fez o quê e quando. Ações do próprio sistema (por exemplo, um `host_recovered` resolvendo automaticamente um alerta `host_down`) aparecem com o usuário "System".

### Ações em massa

Selecione um ou mais alertas pelas caixas da aba **Alerts** para abrir uma barra de ações em massa acima da tabela. Você pode:

- Aplicar qualquer ação de fluxo ou de resolução a todos os alertas selecionados numa única chamada.
- **Delete**: excluir os alertas selecionados de forma permanente.

As atualizações em massa passam pelo mesmo registro de histórico das ações individuais. Excluir um alerta não deixa rastro no histórico; use uma ação de resolução se quiser manter o registro de auditoria.

A quantidade de alertas selecionados aparece à esquerda. Use a caixa do cabeçalho da tabela para selecionar ou desmarcar todas as linhas da página atual. A seleção não passa de uma página para outra: para agir sobre mais alertas de uma vez, aumente antes o número de linhas por página.

### Configuração por tipo de alerta {#per-alert-type-configuration}

Cada tipo de alerta tem sua linha em **Reporting → Alert Lifecycle**. Esta aba depende do módulo `alerts_advanced`; planos sem ele mostram aqui um convite de upgrade.

Cada linha tem:

| Coluna | Significado |
|--------|---------|
| **Active** | Chave geral deste tipo de alerta. Desligada, nenhum alerta deste tipo é criado e nenhuma notificação é emitida. |
| **Severity** | Severidade padrão aplicada aos novos alertas deste tipo. |
| **Alert delay** | Segundos de espera antes de enviar a notificação. Se o evento que cancela este (por exemplo, `host_recovered` para `host_down`) disparar dentro dessa janela, a notificação é suprimida. Útil para hosts instáveis. |
| **Frequency** | Só para verificações periódicas (`host_down`, `host_security_updates_exceeded`, `host_pending_updates_exceeded`). Minutos entre as verificações. |
| **Threshold** | Para alertas de limite. O valor numérico acima do qual o alerta dispara. A unidade depende do tipo: `host_security_updates_exceeded` e `host_pending_updates_exceeded` usam uma *contagem* (número de atualizações pendentes); `host_down` usa *segundos* (quanto tempo o WebSocket do agente pode ficar desconectado antes de o alerta disparar). A linha de `host_down` mostra o sufixo `sec` para deixar isso explícito; o padrão é de 30 segundos. |
| **Auto-assign** | Chave e seletor de usuário: todo alerta novo deste tipo é atribuído automaticamente ao usuário escolhido. |
| **Retention** | Dias para manter os alertas deste tipo antes da limpeza. Vazio = nunca limpa automaticamente. |
| **Auto-resolve** | Dias depois dos quais os alertas ativos são resolvidos automaticamente, se ninguém mexer neles. |

As mudanças ficam guardadas localmente até você salvar. Use o botão **Apply**, na barra superior, para salvar, ou **Discard** para desfazer. O navegador avisa se você tentar sair com mudanças não salvas.

#### Limpeza

Abaixo da tabela, o card **Alert cleanup** aplica a política de retenção:

- **Preview cleanup** mostra a lista de alertas que seriam excluídos pelas regras atuais de retenção e resolução automática.
- **Delete N alerts** efetiva a prévia. A ação não pode ser desfeita.

A limpeza só exclui alertas que atendem a `retention_days`. Se ela também exclui alertas não resolvidos depende de **cleanup_resolved_only**, definido por tipo (padrão: só os resolvidos).

### Permissões

| Permissão | O que libera |
|-----------|----------------|
| `can_manage_alerts` | Criar e alterar configurações de alerta, rodar a limpeza, agir sobre alertas |
| `can_manage_notifications` | Criar, editar, testar e excluir destinos, rotas e relatórios agendados |
| `can_view_notification_logs` | Ler a aba **Delivery Log** |
| `can_view_hosts` | Listar grupos de hosts e hosts ao montar rotas e relatórios |

Admins e superadmins passam por cima dessas verificações. Usuários comuns sem `can_manage_alerts` ainda podem ver a aba **Alerts**, mas não conseguem executar ações.

### Páginas relacionadas

- [Destinos de notificação](#notification-destinations)
- [Rotas de notificação e log de entregas](#notification-routes-and-delivery-log)
- [Relatórios agendados](#scheduled-reports)
- Alertas Host Agent Down e Host Agent Recovered

---

## Capítulo 18: Destinos de notificação {#notification-destinations}

### O que é um destino

Um **destino** é o ponto final para onde vão as notificações: uma caixa de e-mail via SMTP, uma URL de webhook HTTP, um tópico do ntfy ou o destino embutido **Internal Alerts**, que registra os alertas dentro do próprio PatchMon.

Os destinos são a metade "para onde" do fluxo de notificações. A metade "o que vai para lá" fica com as **regras de evento**, tratadas em [Rotas de notificação e log de entregas](#notification-routes-and-delivery-log).

Os destinos ficam em **Reporting → Destinations**, na interface web.

### Tipos de canal

O PatchMon 2.0 tem quatro tipos de canal de destino. A lista é fixa no código do servidor:

| Canal | Valor | O que faz |
|---------|-------|--------------|
| **Webhook** | `webhook` | HTTP POST de um payload JSON para qualquer URL. Genérico por padrão; URLs de webhook do Discord, Slack, Mattermost e Rocket.Chat são detectadas automaticamente e recebem o payload formatado adequado. |
| **Email** | `email` | Envio por SMTP para um ou mais destinatários, com corpo em HTML e anexo opcional nos relatórios agendados. |
| **ntfy** | `ntfy` | Notificação push via [ntfy.sh](https://ntfy.sh) ou um servidor ntfy próprio. |
| **Internal Alerts** | `internal` | Destino embutido que coloca os eventos na aba **Alerts**. Não pode ser criado nem excluído; é criado automaticamente e só pode ser ativado ou desativado. |

> **Discord é um webhook, não um tipo de canal.** Para mandar alertas a um canal do Discord, crie um destino **Webhook** com a URL de webhook do Discord. A área separada **Settings → Discord Authentication** serve só para o login via OAuth2 do Discord e não tem relação com notificações.

### Permissões

Criar, editar, testar e excluir destinos exige a permissão `can_manage_notifications`. Admins e superadmins passam por cima da verificação. Usuários sem a permissão nem veem a aba **Destinations**.

### Criando um destino

1. Abra **Reporting → Destinations**.
2. Clique em **Add destination**.
3. Escolha o tipo de canal (Webhook, Email ou ntfy) e clique em **Next**.
4. Dê ao destino um **Display name**: é o que aparece no seletor das regras de evento, no log de entregas e nos seletores de relatório agendado.
5. Preencha a configuração específica do canal (veja abaixo).
6. Deixe **Enabled** ligado (padrão) ou desligue para salvar a configuração sem enviar nada por enquanto.
7. Clique em **Create**.

Um destino criado com sucesso aparece na tabela de destinos com o ícone do canal, o nome de exibição e a chave de ativação.

#### Webhook

Escolha este para **webhooks JSON genéricos, Discord, Slack, Mattermost ou Rocket.Chat**. As URLs do Discord, Slack, Mattermost e Rocket.Chat são detectadas automaticamente e recebem payloads formatados; as demais recebem um corpo JSON genérico.

| Campo | Obrigatório | Observações |
|-------|:--------:|-------|
| **Webhook URL** | Sim | URL HTTPS completa. Discord: `https://discord.com/api/webhooks/...`. Slack: `https://hooks.slack.com/services/...`. Mattermost: `https://your-mattermost/hooks/...`. Genérico: qualquer endpoint que aceite `POST` com `Content-Type: application/json`. |
| **Signing secret** | Não | Segredo HMAC opcional. Quando definido, cada webhook é assinado com SHA-256 sobre o payload; a assinatura vai num cabeçalho, para o receptor verificar a autenticidade. |

> **Mattermost e Rocket.Chat.** Os dois rodam no seu próprio domínio, então o PatchMon não tem como detectá-los pelo hostname. A detecção é feita pelo caminho `/hooks/<token>`, que ambos usam para webhooks de entrada, e o PatchMon envia o payload compatível com Slack que eles esperam. Uma URL como `https://chat.example.com/hooks/xxxgeneratedkeyxxx` é reconhecida, e também uma atrás de proxy num subcaminho, como `https://example.com/mattermost/hooks/xxxgeneratedkeyxxx`. A regra exige um ou dois tokens longos e opacos depois de `/hooks/`, para que uma plataforma de automação que use um caminho `/hooks/` para roteamento (um catch hook do Zapier, por exemplo) não seja confundida com um servidor de chat e continue recebendo o corpo genérico. As URLs de automação do Jira e do Confluence em `automation.atlassian.com` são excluídas pelo nome, porque têm formato de webhook de chat, mas são consumidas como dados estruturados.

O corpo JSON genérico também traz uma chave `text` no nível superior, ao lado dos campos estruturados `event_type`, `severity`, `title`, `message`, `reference` e `metadata`. Receptores que leem os campos estruturados não são afetados, e qualquer receptor que exija uma chave `text` funciona sem configuração extra. Note que `text` vem formatado em markdown no estilo do Slack, com marcadores `*bold*` e sintaxe de link do Slack, como `<https://…|View in PatchMon>`; um receptor que o exiba como texto literal vai mostrar essa marcação. Nos relatórios agendados, a chave `text` é só uma prévia curta, porque o relatório completo já vai nos campos `html` e `csv`.

#### Email (SMTP)

| Campo | Obrigatório | Observações |
|-------|:--------:|-------|
| **SMTP host** | Sim | Por exemplo, `smtp.example.com`, `smtp.sendgrid.net`. |
| **SMTP port** | Não | Padrão `587`. Use `465` para TLS implícito e `25` para relay sem criptografia (evite). |
| **Username** | Não | Usuário de autenticação SMTP. Deixe em branco se o seu relay não exigir. |
| **Password** | Não | Senha de autenticação SMTP. Guardada criptografada. |
| **From** | Sim | Endereço `From` do envelope e do cabeçalho, por exemplo `patchmon@example.com`. Precisa ser aceito pelo relay. |
| **To** | Sim | Lista de destinatários separados por vírgula. |
| **TLS mode** | Sim | Define como o transporte SMTP protege a conexão. Veja **Modos de TLS**, abaixo. Padrão **STARTTLS** nos destinos novos. |

##### Modos de TLS

O PatchMon oferece quatro modos de TLS em todo destino de e-mail. Escolha o que o seu relay de fato suporta, em vez de deixar em **Auto**, para que um servidor mal configurado falhe de forma segura em vez de cair silenciosamente para texto claro.

- **STARTTLS (recomendado).** O PatchMon se conecta em texto claro na porta SMTP (normalmente 587) e exige que o servidor anuncie `STARTTLS`. A conexão passa para TLS antes de qualquer credencial ou corpo de mensagem ser enviado. Se o servidor não anunciar `STARTTLS`, o PatchMon se recusa a enviar e registra a falha. É a escolha certa para a grande maioria dos relays modernos (Microsoft 365, Google Workspace, SendGrid, Postmark, Mailgun, Amazon SES na porta 587 e a maioria dos servidores de e-mail locais).
- **Implicit TLS / SSL.** O PatchMon abre uma conexão TLS desde o primeiro byte, sem handshake em texto claro. A porta padrão deste modo é 465. Use quando o relay só aceita TLS numa porta dedicada e não suporta `STARTTLS`. Alguns servidores antigos ou em appliance só oferecem este modo.
- **None (insecure).** SMTP em texto claro, sem TLS em nenhuma etapa. Se o destino tiver usuário ou senha, o PatchMon se recusa a enviar a menos que você também marque **Send credentials over an unencrypted connection**, porque autenticar em texto claro expõe as credenciais na rede. Veja **Relays autenticados sem TLS**, abaixo. Use este modo só com relays internos confiáveis, numa rede privada em que TLS realmente não esteja disponível.
- **Auto.** Modo oportunista antigo, mantido por compatibilidade. O PatchMon tenta `STARTTLS` primeiro e, se `STARTTLS` não for anunciado, recorre a TLS implícito no mesmo host e porta. Destinos salvos antes da existência dos modos explícitos carregam como **Auto**, para continuarem funcionando sem mudança. Depois de confirmar qual modo o seu relay suporta, abra o destino, escolha **STARTTLS** ou **Implicit TLS / SSL** explicitamente e salve. Destinos novos não devem ser configurados como **Auto**.

##### Relays autenticados sem TLS

Alguns relays internos exigem SMTP AUTH mas não oferecem TLS. Por padrão, o PatchMon recusa essa combinação, porque a autenticação PLAIN em texto claro expõe usuário e senha a qualquer um no caminho da rede.

Se o relay está numa rede confiável e você aceita esse risco, defina **TLS mode** como **None (insecure)** e marque **Send credentials over an unencrypted connection** no destino. O PatchMon passa então a autenticar em texto claro, só para esse destino.

Pontos a saber antes de ativar:

- A configuração é por destino, não global. Os outros destinos de e-mail não são afetados.
- Só vale no modo **None (insecure)**. Em **STARTTLS**, **Implicit TLS / SSL** e **Auto** ela é ignorada, então nunca enfraquece um modo que usa TLS.
- Vem desligada por padrão, inclusive em todos os destinos já existentes.
- Qualquer pessoa que consiga observar o tráfego entre o PatchMon e o relay pode ler as credenciais. Use uma conta de relay dedicada, sem nenhum privilégio além de enviar e-mail, e nunca reaproveite uma senha usada em outro lugar.
- A correção preferível continua sendo ativar STARTTLS no relay, mesmo com certificado autoassinado ou de CA interna.

> Porta e modo são independentes. O campo de porta é só a porta TCP de conexão; o modo de TLS define como a conexão é protegida. Os padrões (587 para STARTTLS, 465 para TLS implícito) seguem as portas convencionais, mas dá para mudar a porta se o seu relay escuta em outra.

##### Send test email

Os destinos de e-mail salvos têm um botão **Send test email** ao lado da ação padrão **Test**. Ao contrário do **Test**, que coloca uma notificação sintética na fila do worker, o **Send test email** faz uma sondagem SMTP ao vivo e síncrona, direto da requisição à API, e mostra o resultado na hora:

- Em caso de sucesso, o aviso confirma a entrega e os destinatários devem receber uma mensagem curta de teste.
- Em caso de falha, o PatchMon informa em qual etapa da troca SMTP a falha ocorreu: `validate` (a configuração foi rejeitada antes de qualquer atividade de rede, por exemplo host ausente, ou usuário definido com o modo TLS **None** sem a opção de credenciais em texto claro), `dial` (não foi possível estabelecer a conexão TCP ou o handshake de TLS implícito), `starttls` (o servidor não anunciou `STARTTLS` no modo escolhido), `auth` (o relay recusou as credenciais) ou `send` (o relay aceitou a sessão, mas recusou os destinatários ou a mensagem). O aviso inclui a mensagem de erro retornada pelo relay.

É o jeito mais rápido de diagnosticar um erro de configuração de TLS ou de autenticação sem vasculhar os logs do servidor. A sondagem exige a mesma permissão `can_manage_notifications` que a edição do destino.

> A sondagem sempre usa a configuração **salva por último**, não o que está na tela. Salve o destino antes de testar; caso contrário, você estará testando a configuração anterior. Isso importa principalmente quando você acabou de marcar **Send credentials over an unencrypted connection**: até salvar, a sondagem continua falhando na etapa `validate`.

#### ntfy

| Campo | Obrigatório | Observações |
|-------|:--------:|-------|
| **Server URL** | Não | Deixe vazio para `https://ntfy.sh`. Informe a sua URL se usar um ntfy próprio. |
| **Topic** | Sim | Nome do tópico do ntfy. Assine o mesmo tópico no celular ou no desktop para receber as notificações push. |
| **Access token** | Não | Token bearer do ntfy para tópicos protegidos. Alternativa à autenticação básica. |
| **Username** / **Password** | Não | Autenticação básica. Use no lugar do token quando o seu servidor ntfy estiver configurado com autenticação básica HTTP. |

#### Internal Alerts

Este destino não pode ser criado: ele é gerado automaticamente com o ID `internal-alerts` e aparece com a etiqueta **Built-in**. Sua única função é gravar os eventos na aba **Alerts** do aplicativo. Você pode:

- **Ativá-lo ou desativá-lo** na tabela de destinos (desative se não quiser nenhum registro interno de alerta, por exemplo quando usa só chat ou e-mail externos).
- Usá-lo nas regras de evento, como qualquer outro destino.

Não é possível excluí-lo. A tentativa retorna `400 Bad Request: The Internal Alerts destination cannot be deleted. You can disable it instead.`

### Editando um destino

Clique em **Edit** na tabela de destinos. A janela recarrega a configuração atual (segredos incluídos, para você não precisar redigitar senhas ou tokens) e permite mudar qualquer campo. Clique em **Save** para aplicar.

A chave **enabled** fica na própria tabela; clique nela para alternar sem abrir a janela.

Os segredos são sempre criptografados em repouso com o `SESSION_SECRET` do PatchMon. Ao digitar um segredo de novo e salvar, o valor é criptografado outra vez. O valor descriptografado só é devolvido a operadores com `can_manage_notifications`.

### Testando um destino

Use **Test** na linha do destino para verificar a configuração sem esperar um evento real:

1. Clique em **Test** ao lado de qualquer destino ativo que não seja embutido.
2. O PatchMon coloca na fila um evento sintético com tipo `test`, severidade `informational` e a mensagem *"This is a test message from PatchMon notification settings."*
3. Um aviso confirma que o teste foi **colocado na fila**. A entrega de fato passa pelo worker de notificações e leva um ou dois segundos.
4. O **Delivery Log** se atualiza sozinho depois de cerca de três segundos; veja o resultado lá.

> Os testes **não** passam por cima do limite global de envio. Se o destino já estiver no teto por minuto (60 mensagens/minuto), o teste retorna `429 Too many notifications; try again shortly`.

Falhas que o endpoint de teste pode retornar:

| HTTP | Mensagem | Significado |
|------|---------|---------|
| `400 Bad Request` | `Destination is disabled` | Ative o destino antes. |
| `404 Not Found` | `Destination not found` | O destino provavelmente foi excluído em outra aba. |
| `429 Too Many Requests` | `Too many notifications; try again shortly` | Limite de envio atingido. |
| `503 Service Unavailable` | `Notifications not configured` | O worker em segundo plano ou o Redis não está rodando. |

### Excluindo um destino

Clique no ícone de lixeira na tabela de destinos. A confirmação avisa que a ação é permanente. Excluir um destino **não** exclui as regras de evento que apontam para ele: essas rotas ficam órfãs e devem ser apontadas para outro destino ou removidas. As entregas no **Delivery Log** mantêm o `destination_id` histórico e aparecem com o ID bruto se o nome não puder mais ser resolvido.

O destino `internal-alerts` não pode ser excluído (veja acima).

### O que fica guardado

Cada destino é uma linha no banco com:

- Um UUID estável (`id`), usado pelas regras de evento e pelo log de entregas.
- `channel_type`, da lista acima.
- `display_name`.
- O booleano `enabled`.
- `config_encrypted`: a configuração em JSON, criptografada com `SESSION_SECRET`, para que um dump do banco não exponha senhas SMTP, tokens do ntfy ou segredos HMAC.
- Os horários `created_at` / `updated_at`.

O endpoint de listagem nunca devolve a configuração bruta, só uma flag `has_secret`. A configuração descriptografada é buscada sob demanda num endpoint separado, quando a janela de edição abre.

### Login pelo Discord e webhooks do Discord

As duas áreas "Discord" do PatchMon são independentes:

| Área | Finalidade | Onde |
|------|---------|-------|
| **Discord Authentication** | Login via OAuth2: os usuários entram no PatchMon com a conta do Discord, podendo exigir participação num servidor e num cargo. | Settings → Discord Authentication |
| **Destino webhook do Discord** | Envia alertas para um canal do Discord por uma URL de webhook do canal. | Reporting → Destinations → Add destination → Webhook |

Configure cada uma separadamente. As configurações de OAuth2 não são necessárias para mandar alertas ao Discord.

### Páginas relacionadas

- [Visão geral de alertas](#alerts-overview)
- [Rotas de notificação e log de entregas](#notification-routes-and-delivery-log)
- [Relatórios agendados](#scheduled-reports)

---

## Capítulo 19: Rotas de notificação e log de entregas {#notification-routes-and-delivery-log}

### Visão geral

No PatchMon, uma **rota** (chamada **Event Rule** na interface) liga um ou mais tipos de evento, e opcionalmente uma severidade mínima, um escopo de hosts ou uma regra de correspondência, a um **destino**. Quando um evento dispara, o mecanismo de notificações avalia todas as rotas ativas, e cada rota que casa gera uma entrega para o seu destino.

As rotas cuidam da distribuição: um único evento `host_down` pode avisar o tópico do ntfy do plantão, postar no canal #alerts do Discord e gravar um registro de alerta interno, tudo a partir de uma única emissão.

As rotas e o **Delivery Log** ficam em **Reporting**, na navegação principal:

- **Reporting → Event Rules**: criar, editar e desativar rotas.
- **Reporting → Delivery Log**: todas as tentativas de entrega, enviadas ou com falha.

### Permissões

| Ação | Permissão |
|--------|-----------|
| Criar / editar / desativar / excluir rotas | `can_manage_notifications` |
| Ler o log de entregas | `can_view_notification_logs` |

Admins e superadmins passam por cima dessas verificações.

### Criando uma rota

1. Vá a **Reporting → Event Rules**.
2. Clique em **Add event rule**. (O botão fica desabilitado até existir pelo menos um destino. Crie um antes em [Destinos de notificação](#notification-destinations).)
3. Preencha a janela:

| Campo | Observações |
|-------|-------|
| **Destination** | Obrigatório. Escolha na lista de destinos configurados. Só é possível rotear para destinos ativos; destinos desativados são pulados na hora da entrega. |
| **Events** | Marque **All events** para casar com todos os tipos de evento, ou marque eventos individuais. Marcar todos os eventos individualmente equivale a "All events". |
| **Minimum severity** | Severidade mínima da rota. Eventos abaixo dela são ignorados. A ordem é `informational < warning < error < critical`. |
| **Host groups** | Opcional. Se houver algum selecionado, só casam os eventos cujo host pertence a pelo menos um dos grupos. Deixe vazio para "qualquer host". |
| **Individual hosts** | Opcional. Se houver algum selecionado, só casam os eventos desses hosts. Deixe vazio para "qualquer host". |
| **Enabled** | Ligado por padrão. Desligue para guardar a regra para depois sem que ela dispare. |

4. Clique em **Add**.

#### Referência de tipos de evento

Escolha no mesmo conjunto documentado em [Visão geral de alertas](#alerts-overview): `host_down`, `host_recovered`, `patch_run_completed`, `ssh_session_started` e assim por diante. Também dá para selecionar eventos de alto ou baixo volume, como `user_login` e `account_locked`, para rotear a telemetria de login.

#### Grupos de hosts e hosts combinados

Se **host groups** e **individual hosts** estiverem definidos, o evento precisa atender aos **dois** filtros. Na prática, costuma-se escolher um ou outro.

Eventos sem contexto de host (por exemplo, `server_update`, `user_created`) são barrados por **qualquer** escopo de host que você defina. Deixe os dois campos de escopo vazios para que eles também casem.

#### Severidade, atraso e ciclo de vida

O **Alert delay** por tipo, em **Alert Lifecycle**, é aplicado *antes* da distribuição pelas rotas: se o evento tem `alert_delay_seconds` configurado, o PatchMon coloca a entrega na fila com esse atraso. Se o evento correspondente disparar dentro da janela (por exemplo, um `host_recovered` enquanto um `host_down` atrasado está na fila), a notificação atrasada é cancelada. Correspondências:

| Evento atrasado | Cancelado por |
|---------------|--------------|
| `host_down` | `host_recovered` |
| `container_stopped` | `container_started` |
| `host_security_updates_exceeded` | `host_security_updates_resolved` |
| `host_pending_updates_exceeded` | `host_pending_updates_resolved` |

### Editando e excluindo rotas

Cada linha em **Event Rules** tem os botões **Edit** e **Delete**.

- **Edit** reabre a janela com os valores salvos. Salve para atualizar; os novos critérios valem a partir do próximo evento que casar.
- **Delete** remove a regra por completo. As entregas já na fila terminam, mas nenhuma nova é gerada.

Rotas desativadas aparecem com um selo apagado **Disabled** e não recebem entregas. Desativar é a opção mais segura para pausar uma regra por um tempo.

### Como a correspondência funciona

Para cada evento de saída, o servidor:

1. Busca todas as rotas cujo `event_types` inclui o tipo do evento (ou o curinga `*`).
2. Descarta as rotas cujo **destino está desativado**.
3. Descarta as rotas cujo `min_severity` está acima da severidade do evento.
4. Aplica, a cada rota restante, os filtros de grupo de hosts e de ID de host.
5. Remove duplicatas: eventos que se repetem numa janela de 2 minutos para o mesmo destino viram uma única entrega. A chave de identificação é `event_type + reference_id + destination_id + 2-minute bucket`.
6. Limita o ritmo: cada destino tem um teto de **60 entregas por minuto**. As entregas acima do teto são descartadas, com um aviso no log do servidor.
7. Coloca uma tarefa do asynq na fila `notifications`, com `MaxRetry=5`.

O worker da fila então despacha a entrega conforme o tipo de canal do destino (envio SMTP, HTTP POST, publicação no ntfy ou gravação de alerta interno).

### O Delivery Log

A aba **Delivery Log** mostra todas as tentativas de envio de notificação, com o resultado. Use-a quando um destino não está recebendo mensagens, quando o receptor de um webhook reporta erros ou quando você quer uma trilha de auditoria do que foi para onde.

#### Colunas

| Coluna | Significado |
|--------|---------|
| **Time** | Quando a entrega foi processada, em tempo relativo ("5m ago"). Passe o mouse para ver o horário exato. |
| **Status** | `sent` para sucesso (verde); qualquer outro valor é falha (vermelho). |
| **Event** | O tipo de evento que gerou a entrega (por exemplo, `host_down`, `patch_run_failed`). |
| **Destination** | O nome de exibição do destino no momento da entrega. Mostra o UUID se o destino tiver sido excluído. |
| **Reference** | `reference_type:reference_id`, clicável para referências `host`, `patch_run` e `alert`, para você ir até a origem. |
| **Error** | A mensagem de erro retornada pela tentativa de entrega. Vazia nas entregas bem-sucedidas. |

#### Paginação

O log é paginado em 50 linhas por página. Use as setas no rodapé para navegar pelo histórico. As entregas mais recentes ficam na página 1.

Use o botão **Refresh log**, no cabeçalho da página, para trazer as entradas mais recentes sem sair dela.

#### Novas tentativas

O worker de notificações tenta de novo as entregas com falha até **5 vezes**, com espera exponencial entre tentativas (gerenciada pelo asynq). Cada tentativa é registrada na mesma linha do log de entregas: o campo `attempt_count` aumenta e a linha é atualizada com o `status` e a `error_message` mais recentes. O ID de mensagem do provedor (por exemplo, o ID de fila do SMTP ou o `Message-ID` do webhook) fica em `provider_message_id` quando o lado remoto devolve um.

Se as cinco tentativas falharem, a linha da entrega fica no último estado `failed`. Não há escalonamento automático; diagnostique a falha pela coluna **Error**.

#### Motivos comuns de falha

| Erro (trecho) | Causa provável |
|-----------------|--------------|
| `connect: connection refused` / `i/o timeout` | O host de destino não é alcançável a partir do servidor do PatchMon. Verifique firewall / rede. |
| `authentication failed` / `535 5.7.8` | Credenciais SMTP ou token errados. Edite o destino e digite de novo. |
| `400 Bad Request` do webhook do Discord/Slack | A URL do webhook está errada ou foi revogada, ou o payload formatado não serve para um app do Slack personalizado. |
| `webhook status 400` do Mattermost ou Rocket.Chat | O webhook foi excluído, o token está errado ou o canal de destino não existe mais. Copie a URL de novo na página da integração. Versões anteriores à 2.1.3 retornavam isso em toda entrega, independentemente da URL; atualize se estiver numa versão mais antiga. |
| `403 Forbidden` do ntfy | O tópico exige uma autenticação que você não informou, ou o token expirou. |
| `destination disabled` | Alguém desativou o destino entre a entrada na fila e a entrega. Reative e dispare de novo. |

Se uma entrada esperada não aparece, verifique se a rota está ativa, se o destino está ativo, se o evento passou pelos filtros de severidade e de escopo e se o próprio tipo de alerta está ativo em **Alert Lifecycle**.

#### Remoção de duplicatas e limite de envio no log

As duplicatas suprimidas pela janela de 2 minutos **não** aparecem no log de entregas; elas são puladas em silêncio antes de a tarefa de entrega ser criada. As entregas barradas pelo limite de envio também são puladas em silêncio (um aviso vai para o log do servidor, não para o log de entregas). Se um destino parar de receber eventos de repente, verifique:

1. Se o destino está ativo.
2. Se nenhuma rota foi excluída.
3. Se o teto por minuto não está sendo ultrapassado na origem. O limite de 60 mensagens/minuto é por destino.

#### Diagnosticando um webhook com `LOG_LEVEL=debug`

O log de entregas registra o resultado de uma entrega, não como ela foi montada. Para ver qual formato de payload um destino webhook recebeu de fato, defina `LOG_LEVEL` como `debug` (**Settings > Environment**, ou a variável de ambiente `LOG_LEVEL`). Cada entrega de webhook passa a gravar uma linha:

```
level=DEBUG msg="webhook dispatch" destination_id=... event_type=host_down
  format=slack_compatible host=chat.example.com body_bytes=229 signed=true
```

| Campo | Significado |
|-------|---------|
| `format` | `discord`, `slack_compatible` ou `generic`. É o formato do payload enviado, e por ele você sabe se a detecção automática reconheceu o seu receptor. |
| `host` | O host da URL de destino. O caminho é omitido de propósito, porque carrega o token secreto do webhook. |
| `body_bytes` | O tamanho do corpo JSON, útil quando o receptor impõe um limite de tamanho. |
| `signed` | Se foi anexado um cabeçalho de assinatura HMAC. |

Se `format` vier como `generic` para um servidor de chat que você esperava ver reconhecido, a URL não está num caminho `/hooks/<token>`. A entrega funciona mesmo assim, porque o corpo genérico traz a chave `text`, mas a mensagem sai com formatação mais pobre. O formulário do destino mostra o mesmo resultado de detecção antes de você salvar.

O nível debug deixa o servidor inteiro bem verboso, então volte para `info` depois de obter a resposta.

### Links para o aplicativo nas notificações

Toda notificação traz, nos metadados, um `app_link` apontando para a página mais relevante do PatchMon:

| Tipo de referência | Link |
|---------------|------|
| `patch_run` | `/patching/runs/<id>` |
| `host` | `/hosts/<id>` |
| `alert` | `/hosts/<host_id>`, se conhecido; caso contrário, `/` |
| `user` | `/settings/users` |
| `test` | `/reporting` |

Os formatadores de cada canal transformam isso num botão clicável (embeds do Discord/Slack), numa tag `<a>` (e-mail) ou numa ação `Click` (ntfy).

### Páginas relacionadas

- [Visão geral de alertas](#alerts-overview)
- [Destinos de notificação](#notification-destinations)
- [Relatórios agendados](#scheduled-reports)

---

## Capítulo 20: Relatórios agendados {#scheduled-reports}

### Visão geral

Um **relatório agendado** é um resumo periódico do parque que o PatchMon monta em HTML (com um anexo CSV) e entrega por um ou mais destinos de notificação, num agendamento cron. Use para manter a liderança e as equipes de plantão informadas sobre a postura de conformidade, o volume de patching, as atualizações pendentes e os alertas abertos, sem que ninguém precise entrar na interface.

Os relatórios agendados ficam em **Reporting → Scheduled Reports**. Eles usam os mesmos destinos das notificações por evento, então qualquer destino de e-mail, webhook ou ntfy que você já configurou também pode receber relatórios.

### Permissões

Criar, editar, executar e excluir relatórios agendados exige `can_manage_notifications`. Admins e superadmins passam por cima da verificação. Usuários sem a permissão não veem a aba.

Para restringir por grupo de hosts, o usuário também precisa de `can_view_hosts` (para o seletor de grupos ser preenchido).

### Criando um relatório

1. Abra **Reporting → Scheduled Reports**.
2. Clique em **New report**. (O botão fica desabilitado até existir pelo menos um destino. Crie um em [Destinos de notificação](#notification-destinations).)
3. Preencha a janela:

| Campo | Observações |
|-------|-------|
| **Report name** | Obrigatório. Aparece na tabela e como prefixo do assunto do e-mail. |
| **Schedule** | Frequência + horário. Veja [Opções de agendamento](#schedule-options). |
| **Sections** | Quais blocos entram no relatório. Veja [Seções do relatório](#report-sections). |
| **Deliver to** | Marque todos os destinos que devem receber este relatório. O mesmo relatório pode ir para vários destinos. |
| **Scope to host groups** | Opcional. Limita as seções por host aos grupos selecionados. Deixe vazio para o parque inteiro. |
| **Top rows per section** | Limite numérico das listas por host; padrão **20**. |
| **Enabled** | Ligado por padrão. Desligue para manter o relatório salvo, mas pausado. |

4. Clique em **Create**.

Depois de criado, o relatório aparece na tabela com o próximo horário de execução, o selo de status e os botões de ação.

### Opções de agendamento {#schedule-options}

A janela monta para você uma expressão cron padrão de cinco campos, então raramente você vê a sintaxe cron. Frequências e o cron resultante:

| Frequência | Cron gerado | Significado |
|-----------|---------------|---------------|
| **Daily** | `M H * * *` | Todo dia, no horário escolhido. |
| **Weekdays (Mon to Fri)** | `M H * * 1-5` | De segunda a sexta, no horário escolhido. |
| **Weekly** | `M H * * D,D,…` | Nos dias da semana escolhidos. Escolha um ou mais pelos botões Mon/Tue/…. |
| **Monthly** | `M H D * *` | No dia do mês escolhido (`1st`, `15th`, `Last day` ou um dia personalizado de `1–31`). |

Todos os agendamentos são avaliados no **fuso horário do servidor** configurado nas configurações do PatchMon; a janela indica isso ao lado do seletor de horário. Mudar o fuso do servidor depois de salvar o relatório **não** reagenda automaticamente os relatórios existentes. Edite o relatório e salve de novo para reavaliar.

A tabela mostra o agendamento em linguagem simples, em inglês ("Daily at 08:00", "Weekdays at 09:30", "15th of month at 06:00"), calculado a partir do cron.

### Seções do relatório {#report-sections}

Cada relatório é composto de **seções**, marcadas de forma independente:

| Seção | Conteúdo |
|---------|---------|
| **Executive summary** | Total de hosts, nota média de conformidade, hosts críticos, hosts em conformidade e um resumo de patching (execuções, concluídas, com falha, em andamento). |
| **Compliance summary** | Regras aprovadas, regras reprovadas, hosts críticos, hosts sem varredura recente. |
| **Recent patch runs** | Execuções de patch mais recentes por status, com horários e quantidade de alvos. |
| **Hosts / status** | Consolidação do status dos hosts: offline, desatualizados, ativos. |
| **Open alerts** | Alertas ativos no momento, agrupados por severidade. |
| **Hosts by outstanding updates** | Os hosts com mais atualizações pendentes (respeita o limite **Top rows per section**). |
| **Top outdated security packages** | Os pacotes com mais hosts precisando de atualização de segurança. |

Relatórios novos vêm com **Executive summary + Compliance summary + Recent patch runs**, a menos que você personalize a seleção.

### Entregando um relatório

Cada destino marcado em **Deliver to** entra na distribuição do relatório. Na hora da execução, o PatchMon:

1. Resolve os destinos (pula os desativados).
2. Monta o corpo HTML e o anexo CSV uma única vez.
3. Envia o mesmo conteúdo a cada destino, em paralelo.

O conteúdo se adapta a cada tipo de canal:

| Destino | O que o destinatário vê |
|-------------|------------------------|
| **Email** | E-mail em HTML exibido no corpo, com o CSV anexado. O assunto traz o nome do relatório e o horário. |
| **Webhook** | POST JSON com os metadados do relatório, um resumo e o corpo HTML num campo. Use para levar relatórios a um sistema posterior (data warehouse, importador para Google Sheets etc.). |
| **ntfy** | Notificação push curta com link para o relatório mais recente na interface. O HTML completo não cabe no ntfy, então vai resumido. |
| **Internal Alerts** | Um registro do sistema na aba **Alerts**, útil quando você quer o histórico de execuções dentro do PatchMon sem e-mail. |

No **Delivery Log**, os relatórios aparecem com `event_type: scheduled_report`. Filtre o log pelos destinos do relatório para auditar as entregas.

### Executando um relatório manualmente

Clique no botão verde **Play** na linha do relatório para executá-lo na hora. O relatório entra na fila para execução imediata e é entregue aos destinos configurados.

As execuções manuais respeitam o estado dos destinos: os desativados são pulados e os limites de envio continuam valendo.

Relatórios desativados mostram o botão Play apagado. Ative o relatório (ou edite e marque **Enabled**) antes de executar. A dica do botão explica por que ele está indisponível.

### Editando e excluindo

- **Edit** reabre a mesma janela, preenchida com o agendamento, as seções e os destinos atuais. Salvar recalcula o próximo horário de execução.
- **Delete** remove o relatório de vez. As entregas passadas continuam no log.
- **Chave Enabled**: edite o relatório e alterne **Enabled** na janela. Relatórios desativados mantêm o agendamento, mas não disparam até serem reativados; o próximo horário de execução continua aparecendo.

### Como o agendamento funciona por dentro

Os relatórios agendados ficam na tabela `scheduled_reports`. Na criação ou na atualização, o PatchMon calcula a próxima execução pela expressão cron no fuso do servidor e grava em `next_run_at`. O agendador coloca a tarefa do relatório no asynq exatamente para esse horário, sem laço de consulta em segundo plano.

Quando a tarefa executa, o worker:

1. Relê a linha do relatório.
2. Desiste se o relatório foi desativado depois de entrar na fila.
3. Monta HTML + CSV com o gerador de relatórios do servidor (veja `internal/notifications/report_render.go`).
4. Distribui a cada destino com as mesmas regras de identificação, limite de envio e nova tentativa das notificações comuns.
5. Atualiza `last_run_at` e coloca a próxima ocorrência na fila.

Como o agendamento é guardado como uma string cron mais um fuso horário, as mudanças de horário de verão ficam por conta da biblioteca de cron. Execuções que cairiam numa hora pulada vão para o próximo horário válido; execuções numa hora repetida disparam uma vez só.

### Limitações conhecidas

- O fluxo de relatórios agendados **não** tenta reenviar a distribuição inteira de um relatório em caso de falha passageira. Uma entrega que falha é tentada de novo por destino (até 5 vezes, via asynq), mas o relatório não é montado de novo. Na prática, ou o relatório chegou a cada destino (com as novas tentativas cobrindo problemas passageiros), ou ficou registrado no log de entregas como `failed` para aquele destino.
- Não há opção "pular a próxima execução". Para pular uma execução, desative o relatório antes do horário agendado e reative depois.
- Na 2.0, os modelos de relatório não podem ser personalizados pela interface. O layout do HTML é fixo; a personalização é pela escolha de seções e pelo escopo de grupos de hosts. Modelos personalizados são candidatos a uma versão futura.

### Páginas relacionadas

- [Visão geral de alertas](#alerts-overview)
- [Destinos de notificação](#notification-destinations)
- [Rotas de notificação e log de entregas](#notification-routes-and-delivery-log)

---

## Capítulo 21: Terminal SSH web {#web-ssh-terminal}

### Visão geral

O PatchMon traz um terminal SSH no navegador que permite ao operador se conectar a qualquer host Linux/FreeBSD monitorado sem sair da interface web. É um xterm completo, com edição de linha, cores, histórico de rolagem, redimensionamento e atalhos de teclado, funcionando sobre um WebSocket entre o navegador e o servidor do PatchMon.

Há dois modos de conexão:

- **Direct**: o servidor do PatchMon se conecta à porta SSH do host (22 por padrão) e faz a ponte da sessão. Use quando o servidor tem alcance de rede até os hosts.
- **Proxy**: o servidor do PatchMon pede ao próprio agente do host que abra uma conexão SSH local (para `localhost:22` no host) e a devolve por dentro do WebSocket de saída que o agente já mantém. **Não é preciso expor nenhuma porta SSH de entrada no host de destino.**

A autenticação no host usa senha SSH ou chave privada SSH (com passphrase opcional). A autenticação no próprio PatchMon usa os cookies da sua sessão mais um **ticket** de uso único, descrito abaixo.

O SSH web existe no PatchMon desde a 1.4.0; na 2.0, faz parte do módulo **remote_access**.

### Permissões

| Papel | Acesso ao SSH web |
|------|----------------|
| **admin** / **superadmin** | Sempre liberado. |
| Qualquer outro papel | Exige `can_use_remote_access` nas permissões do papel. |

Usuários sem `can_use_remote_access` que tentam abrir o terminal são recusados com HTTP `403 Access denied` no handshake do WebSocket.

A permissão de hosts (`can_manage_hosts`) é necessária para que o controle "Open Terminal" apareça na página de detalhes do host.

### Abrindo um terminal

1. Vá a **Hosts** e clique no host ao qual quer se conectar.
2. Na página **Host Detail**, abra a aba **Terminal** (ou clique no botão **SSH Terminal** no cabeçalho).
3. Escolha o **Connection mode** (Direct ou Proxy).
4. Informe o **username** SSH (padrão `root`; o último usuário usado em cada host fica guardado no armazenamento local do navegador).
5. Escolha o **Authentication method**:
   - **Password**: digite a senha do host.
   - **Key**: cole a chave privada (formato OpenSSH ou PEM) e a passphrase, se estiver criptografada.
6. Ajuste a **SSH port**, se necessário (padrão `22`).
7. Se escolheu o modo **Proxy**, defina **Proxy host** (padrão `localhost`) e **Proxy port** (padrão `22`). É o destino a que o agente vai se conectar; normalmente `localhost:22`, quando você quer que o agente abra SSH no próprio host.
8. Clique em **Connect**.

Quando aparece a linha verde *"SSH connection established"*, o terminal está ativo e interativo.

As suas credenciais SSH **nunca são guardadas** pelo servidor nem pelo navegador. Elas são enviadas uma vez pelo WebSocket autenticado, na conexão, e ficam só no estado do navegador enquanto a sessão dura. Desconectar as apaga da memória.

### Modo Direct

No modo Direct, o servidor do PatchMon se conecta diretamente ao host:

1. Navegador → `POST /api/v1/auth/ssh-ticket` com `{ "hostId": "<id>" }`. Exige o cookie da sua sessão no PatchMon. Retorna um ticket de uso único, válido por 30 segundos.
2. O navegador abre `wss://<patchmon-host>/api/v1/ssh-terminal/<hostId>?ticket=<ticket>`.
3. O servidor consome o ticket (apagado do Redis no uso), verifica se o usuário está ativo e tem permissão e faz o upgrade para WebSocket.
4. O navegador envia a mensagem `connect` com as credenciais, o tamanho do terminal e o modo de conexão.
5. O servidor se conecta a `host.ip` (ou, na falta dele, a `host.hostname`) na porta escolhida, autentica com senha ou chave privada e inicia um shell interativo.

**Verificação da chave do host**: o servidor usa o `~/.ssh/known_hosts` do contêiner do PatchMon, se existir; senão, recorre a `InsecureIgnoreHostKey`. O modo Direct **não** pede ao usuário que aceite chaves de host. Com esse recurso ativo, as chaves são aceitas no primeiro uso. Em produção, onde a verificação estrita é exigida, forneça um arquivo `known_hosts` por montagem de volume.

**Use o modo Direct quando:**
- O servidor do PatchMon tem alcance de rede até o host na porta SSH.
- Você aceita fazer a ponte do SSH pelo servidor, e não pelo agente do host.

### Modo Proxy

O modo Proxy passa a sessão SSH pelo WebSocket que o agente do host já mantém, sem exigir que uma porta SSH seja exposta ao PatchMon.

Fluxo:

1. Navegador → ticket + WebSocket, como no modo Direct.
2. O servidor recebe a mensagem `connect` com `connection_mode: "proxy"`.
3. O servidor gera um ID de sessão de 16 bytes, grava um registro da sessão de proxy e manda `{ "type": "ssh_proxy", "session_id": …, "host": "localhost", "port": 22, "username": … }` pelo WebSocket do agente.
4. O agente se conecta a `<proxy_host>:<proxy_port>` (padrão `localhost:22`) **no próprio host** e devolve o fluxo ao servidor pelo WebSocket, em frames `ssh_proxy_data`.
5. O servidor repassa esses frames ao navegador como eventos `data` do terminal.

**Requisito na configuração do agente.** O modo Proxy exige `integrations.ssh-proxy-enabled: true` no `/etc/patchmon/config.yml` do agente. Essa opção não é enviada pelo servidor: precisa ser definida manualmente, com reinício do serviço do agente. Se o agente recusar o pedido, o terminal mostra *"Agent not connected"* ou um erro informado pelo agente.

**Use o modo Proxy quando:**
- O host não tem exposição de SSH de entrada (atrás de NAT, numa VPC restrita, atrás de um firewall corporativo).
- Você já confia na conexão de saída do agente com o PatchMon e quer reaproveitá-la.
- Você quer abrir SSH em `localhost` através do agente sem abrir buracos no firewall de borda.

### Tickets de uso único para autenticar o WebSocket

Os upgrades de WebSocket não conseguem levar os cookies de autenticação de forma confiável em todos os navegadores, e passar tokens de longa duração por parâmetros de URL os exporia nos logs do servidor e no histórico do navegador. O PatchMon evita os dois problemas com **tickets de uso único**:

- Os tickets têm 64 caracteres hexadecimais, gerados com `crypto/rand` no servidor.
- Ficam no Redis com **TTL de 30 segundos**.
- Cada ticket carrega o ID do usuário e o ID do host para o qual foi emitido.
- O handler do WebSocket **consome** o ticket no primeiro uso (`DEL` atômico). Uma segunda tentativa de abrir WebSocket com o mesmo ticket falha com `Invalid or expired ticket`.
- A validação também confere se o `hostId` da URL é o mesmo gravado no ticket. Um ticket roubado não pode ser usado contra outro host.

Você recebe o ticket implicitamente ao clicar em **Connect** na interface; nenhuma string de ticket fica visível para o operador.

### Teclado e interação com o terminal

O xterm embutido aceita os atalhos habituais:

| Ação | Atalho |
|--------|----------|
| Copiar a seleção | Padrão do navegador (Ctrl+Shift+C / Cmd+C) |
| Colar | Ctrl+Shift+V / Cmd+V |
| Enviar Ctrl+C ao host remoto | Ctrl+C (sem seleção) |
| Rolagem do histórico | Roda do mouse ou trackpad |
| Limpar a tela | Comando remoto `clear` |

O terminal se redimensiona sozinho quando a janela do navegador muda de tamanho, quando o painel do assistente de IA abre ou fecha e quando a barra lateral é recolhida. O servidor é avisado pelo WebSocket, para o TTY remoto manter `cols` e `rows` em sincronia. O redimensionamento funciona no modo Direct (quando o servidor SSH remoto suporta) e no modo Proxy, por mensagens `ssh_proxy_resize` ao agente.

A saída do terminal também é guardada num buffer rotativo de 5.000 caracteres para o [assistente de IA no terminal](#ai-terminal-assistant), se ele estiver ativo.

### Duração da sessão e desconexão por inatividade

- **TTL do ticket**: 30 segundos. Uma sessão que demore mais que isso para começar precisa pedir outro ticket.
- **Desconexão por inatividade**: depois de **15 minutos** sem atividade no terminal, a sessão é fechada automaticamente. Um aviso aparece 1 minuto antes. Qualquer entrada ou saída zera o contador.
- **Desconexão manual**: clique em **Disconnect** na barra de ferramentas ou feche o painel do terminal. As credenciais são apagadas do estado do navegador na desconexão.

### O que acontece quando o WebSocket cai

- Se o processo SSH do lado do servidor terminar (por exemplo, você digita `exit` no shell remoto), o terminal mostra *"SSH connection closed"* e o WebSocket continua aberto para um eventual novo `connect`.
- Se o próprio WebSocket cair de forma inesperada enquanto você estava conectado, o terminal tenta **reconectar uma vez** depois de 3 segundos, com ticket e WebSocket novos. A autenticação reaproveita o usuário guardado, mas você precisa digitar de novo a senha ou a chave, porque as credenciais não ficam guardadas no navegador.
- Códigos de fechamento que **não** geram nova tentativa: `1000` (fechamento normal), `1006` (fechamento anormal, muitas vezes falha de autenticação) e `1008` (violação de política). Nesses casos aparece *"Connection failed: Session may have expired. Please refresh the page or log in again."*.

### Auditoria

Toda emissão de ticket bem-sucedida (isto é, o usuário pediu uma sessão de terminal) dispara um evento `ssh_session_started`:

- Severidade: `informational` (configurável em **Alert Lifecycle**).
- Metadados: `host_id`, `host_name`, `user_id`.
- Referência: o registro do host.

Encaminhe esse tipo de evento para um destino (por exemplo, um canal `#security` no Discord) se quiser uma trilha de auditoria ao vivo de todas as sessões SSH web. O roteamento é configurado em [Rotas de notificação e log de entregas](#notification-routes-and-delivery-log).

Os logs do servidor também registram cada upgrade e cada consumo de ticket, nas linhas `ssh-terminal connected` e `ssh-terminal ticket invalid`.

### Solução de problemas

| Sintoma | Causa provável e correção |
|---------|---------------------|
| *"Authentication required. Please log in again."* ao clicar em **Connect** | O cookie da sua sessão no PatchMon está ausente ou expirou. Recarregue a página e entre de novo. |
| *"Invalid or expired ticket"* no upgrade | Passaram mais de 30 segundos entre a emissão do ticket e a abertura do WebSocket, ou o ticket já foi consumido. Tente de novo; o PatchMon emite um ticket novo na nova tentativa. |
| *"Agent not connected."* no modo Proxy | O WebSocket do agente do host caiu. Confira em **Host Detail → Status** e reinicie o serviço do agente no host. |
| O agente recusa com *"ssh-proxy-enabled must be true"* | Defina `integrations.ssh-proxy-enabled: true` no `config.yml` do agente e reinicie o serviço. |
| *"Failed to parse private key"* | A chave está criptografada: informe a passphrase. Ou o formato da chave não é suportado; use OpenSSH ou PEM PKCS#8. |
| Conexão estabelecida, mas com aviso de chave de host no primeiro uso no log do servidor | O contêiner do PatchMon não tem `known_hosts` para este host. Adicione um por montagem de volume, ou aceite que as chaves do primeiro uso sejam confiadas automaticamente. |

### Páginas relacionadas

- [Assistente de IA no terminal](#ai-terminal-assistant)
- [RDP via Guacamole](#rdp-via-guacamole)
- Gerenciando o agente do PatchMon
- Referência de configuração do agente

---

## Capítulo 22: RDP via Guacamole {#rdp-via-guacamole}

> **Problema conhecido (2.0.0).** O fluxo de conexão RDP tem um bug conhecido no PatchMon 2.0.0. Em certos ambientes, as sessões podem não se estabelecer, cair cedo ou retornar erros pouco claros. Uma correção está prevista para a próxima versão. Veja os detalhes nas notas da versão 2.0.0. Se o RDP é essencial na sua implantação, valide o fluxo numa instância de homologação antes de depender dele em produção.

### Visão geral

O PatchMon 2.0 permite abrir uma sessão RDP completa com um **host Windows** pelo navegador, sem cliente RDP instalado localmente e sem nenhuma porta RDP de entrada exposta. A sessão percorre este caminho:

- Do navegador, como um túnel WebSocket do Guacamole, até o servidor do PatchMon.
- Do servidor do PatchMon até um sidecar `guacd`, que fala o protocolo RDP.
- Do `guacd`, por um proxy TCP de curta duração, até o agente do PatchMon no host, que repassa para `localhost:3389` no host Windows.

É uma conexão com ticket de uso único, com suporte a teclado, mouse e área de transferência. O tamanho da tela é configurável, e NLA/TLS/RDP legado são negociados automaticamente.

O RDP faz parte do módulo **remote_access**.

### Problema conhecido: o bug de RDP da 2.0.0

> **Leia isto antes de usar o RDP em produção.**
>
> A versão 2.0.0 tem um bug conhecido no fluxo de conexão RDP que pode causar:
> - Falhas no handshake das sessões, com erros genéricos.
> - Problemas na resolução do ticket, que aparecem como *"invalid or expired ticket"* em sessões que seriam válidas.
> - Quedas logo depois de um handshake bem-sucedido, em algumas condições de rede.
>
> Uma correção está prevista para a próxima versão. Enquanto isso:
>
> - Se o RDP é crítico, fique na última versão 1.4.x que funciona para você, ou tente a sessão de novo.
> - Confirme antes que o **terminal SSH web** funciona de ponta a ponta. Ele não tem problema conhecido desse tipo e serve de verificação básica de conectividade e da saúde do agente.
> - Ao reportar problemas de RDP, inclua as linhas do **log do servidor** marcadas com `rdp-ticket` e `rdp tunnel`, e as linhas `rdp_proxy_*` do log do agente.
>
> Contexto completo: notas da versão 2.0.0, seção **Known issues**.

### Arquitetura

```
┌──────────┐  Guacamole protocol over WSS  ┌──────────────────┐   TCP 4822   ┌───────┐  TCP  ┌──────────────────┐   TCP 3389  ┌──────────────┐
│ Browser  │ ───────────────────────────→ │ patchmon-server  │ ───────────→ │ guacd │ ────→ │  Ephemeral port  │ ──────────→ │  Windows     │
│ (guac-   │                              │  (Go binary)     │              │       │       │   on the server  │             │  Agent relay │
│  common- │ ←─────────────────────────── │                  │ ←─────────── │       │ ←──── │  (local listen)  │ ←────────── │  → localhost │
│  js)     │                              │                  │              │       │       │                  │             │    3389      │
└──────────┘                              └──────────────────┘              └───────┘       └──────────────────┘             └──────────────┘
                                                   │                                                 ▲
                                                   │           Agent WebSocket (rdp_proxy_*)         │
                                                   └─────────────────────────────────────────────────┘
```

Componentes principais:

- **`guacd`**: o daemon do Apache Guacamole, distribuído como contêiner sidecar no Docker Compose do PatchMon (`guacamole/guacd:1.6.0`). Roda em `4822/tcp` dentro da rede `patchmon-internal`. Sem portas públicas.
- **Servidor do PatchMon**: funciona como ponta do túnel WebSocket do Guacamole e guarda os tickets de RDP. Ele pede ao agente do host que monte um proxy TCP local e entrega esse proxy ao `guacd`.
- **Proxy do agente**: ao receber `rdp_proxy` pelo WebSocket, o agente abre uma ponte TCP local e repassa os bytes entre o PatchMon e `localhost:3389` no host Windows. Exige `integrations.rdp-proxy-enabled: true` na configuração do agente.
- **Host Windows**: roda o serviço RDP padrão do Windows em `127.0.0.1:3389` (ligado em localhost via agente; não é preciso exposição de entrada).

A configuração do sidecar, como vem no arquivo compose padrão, está em Instalando o servidor do PatchMon com Docker. Se você roda o PatchMon sem o sidecar, instale o `guacd` à parte (`apt install guacd` / `yum install guacd`) e aponte `GUACD_ADDRESS` para ele.

### Permissões e módulo

| Acesso | Requisito |
|--------|-------------|
| Abrir uma sessão RDP | **admin**, **superadmin**, ou `can_use_remote_access` + `can_view_hosts` no seu papel |
| Criar ticket de RDP para um host | `can_manage_hosts` (necessário para o controle aparecer na página de detalhes do host) |
| Implantação | Módulo `remote_access` habilitado |

Usuários sem a permissão necessária são recusados em `POST /auth/rdp-ticket` com `403 Access denied`.

### Pré-requisitos

Para abrir uma sessão RDP com um host, tudo isto precisa ser verdade:

1. O host está identificado como **Windows** no PatchMon (`os_type` ou `expected_platform` contém "windows"). Hosts que não são Windows são recusados com `400 RDP is only available for Windows hosts`.
2. O **agente do PatchMon no host está online** e conectado pelo WebSocket.
3. O `config.yml` do agente tem `integrations.rdp-proxy-enabled: true`. Essa opção **não** pode ser enviada pelo servidor: você a edita no host e reinicia o serviço `PatchMonAgent`.
4. O RDP está ativo no host Windows, e o contexto de usuário do agente alcança `localhost:3389`. (O modo NLA padrão serve; o PatchMon negocia a segurança automaticamente.)
5. O servidor do PatchMon alcança o `guacd` no endereço configurado (padrão `127.0.0.1:4822` ou `guacd:4822`, conforme a implantação). Se não alcançar, a criação do ticket de RDP falha logo de início com `503 guacd is not reachable on the PatchMon server`.

### Abrindo uma sessão RDP

1. Vá a **Hosts** e clique no host Windows.
2. Em **Host Detail**, abra a área **Remote Access** e clique em **Open RDP** (ou no ícone de RDP na barra de ferramentas).
3. Informe o **username** e a **password** do Windows da conta com que vai entrar.
4. Se quiser, ajuste o **Screen size**. O padrão é `1024 × 768`. A faixa permitida é de `320–8192` em cada eixo; valores fora dela são ajustados ao limite.
5. Clique em **Connect**.

O servidor então:

- Faz uma verificação prévia do `guacd`, com uma conexão TCP de 2 segundos.
- Pede ao rdpproxy que aloque um listener efêmero (um por sessão), que é a "porta" a que o `guacd` vai se conectar.
- Manda `rdp_proxy` ao agente do host e espera até **12 segundos** pela confirmação `rdp_proxy_connected`.
- Emite um ticket de RDP e devolve ao navegador a URL do túnel WebSocket.
- O navegador abre `wss://<patchmon-host>/api/v1/rdp/websocket-tunnel?ticket=…&width=…&height=…`, conclui o handshake do Guacamole e começa a receber os frames.

Conectado, você vê a tela de login do Windows (ou a área de trabalho, se a autenticação NLA já tiver ocorrido) no navegador.

### Tratamento das credenciais

- Usuário e senha são enviados uma vez, por HTTPS, a `POST /auth/rdp-ticket` e guardados **criptografados** no registro do ticket de RDP, junto com o ID da sessão, o ID do host e as dimensões da tela.
- O ticket é **de uso único** e expira rápido (dezenas de segundos). Quando o `guacd` o consome para montar o túnel, as credenciais guardadas são repassadas ao `guacd` e depois ao RDP. O próprio PatchMon não as mantém depois que a sessão começa.
- Para ambientes em que o Windows apresenta um certificado, a configuração padrão do guacd usa `ignore-cert=true` para aceitar o certificado autoassinado que o Windows gera por padrão, igual ao comportamento do `mstsc.exe`. Exceções mais rígidas por host são candidatas a uma versão futura.
- O modo de segurança é negociado como `any`, o que deixa o FreeRDP escolher o modo mais forte em comum (NLA → TLS → RDP legado). Fixar NLA quebraria hosts com camadas de segurança só Negotiate/TLS e recusaria sessões com credenciais em branco.
- Usuário e senha vazios são permitidos (alguns hosts aceitam sessões com credenciais em branco), mas nesse caso o `guacd` costuma falhar no handshake; o servidor registra `missing_username_or_password: true`, para você identificar isso na trilha de auditoria.

### Tickets de uso único

Os tickets de RDP funcionam como os de SSH:

- String hexadecimal de 64 caracteres, com entropia de `crypto/rand`.
- Guardados no Redis com TTL curto.
- Consumidos de forma atômica no primeiro uso, por `doGuacConnect`.
- Ligados a um ID de usuário, um ID de host, um ID de sessão de proxy, uma porta, as credenciais criptografadas e a largura/altura de tela pedidas.
- Validados contra o estado ativo atual do usuário. Um usuário desativado não consegue reaproveitar um ticket ainda válido.

Você nunca vê nem manipula o ticket diretamente; a interface o pede por baixo dos panos quando você clica em **Connect**.

### Layouts de teclado e área de transferência

- **Teclado**: o cliente do Guacamole converte os eventos de tecla do navegador em scancodes. Na maioria dos teclados latinos (en-GB, en-US), funciona sem ajuste. Em layouts não latinos, deixe o layout do Windows igual ao do navegador. No PatchMon 2.0, o Guacamole não tem seletor de layout de teclado por sessão.
- **Área de transferência**: há suporte a área de transferência de texto nos dois sentidos, pelo canal nativo do Guacamole. Copie no Windows e cole no navegador, ou vice-versa. Conteúdo rico (imagens, listas de arquivos) não é suportado.
- **Mouse**: botões principal, secundário e roda. O clique do botão do meio pela roda é suportado.
- **Tela cheia**: alterne pelo F11 / modo de tela cheia do navegador. O Guacamole ajusta a sessão RDP à área visível do navegador quando o host permite resolução dinâmica.

Redirecionamento de impressora, áudio, mapeamento de unidades e encaminhamento de USB **não** estão habilitados na 2.0.

### Limites de sessão

| Limite | Padrão | Origem |
|-------|---------|--------|
| Sessões RDP simultâneas por servidor | **50** | `rdpproxy.DefaultMaxSessions` |
| Tempo limite de inatividade por sessão | **30 minutos** | `rdpproxy.sessionIdleTimeout` |
| Tempo limite da verificação prévia do `guacd` | 2 segundos | `guacdPreflightTimeout` |
| Tempo limite do handshake com o agente | 12 segundos | `agentHandshakeTimeout` |

Passar do limite de sessões simultâneas retorna `503 Too many concurrent RDP sessions on this server, please try again later.`

### Desconectando

- **Desconexão manual**: feche a aba do navegador ou clique no controle de desconexão do painel RDP. O servidor encerra a sessão, pede ao agente que feche a ponte TCP e libera o registro do ticket no Redis.
- **Saída do Windows**: a sessão RDP fecha normalmente; o túnel fica aberto por um curto período antes da limpeza.
- **Fechamento por inatividade**: depois de 30 minutos sem tráfego de dados, a sessão é encerrada pelo servidor.

### Auditoria

Toda criação de ticket de RDP bem-sucedida dispara um evento `rdp_session_started`:

- Severidade: `informational`.
- Metadados: `host_id`, `host_name`, `user_id`.
- Referência: o registro do host.

Roteie esse tipo de evento em [Rotas de notificação e log de entregas](#notification-routes-and-delivery-log) se quiser uma trilha de auditoria ao vivo de quem entra em hosts Windows pelo PatchMon.

Os logs do servidor trazem linhas `rdp-ticket` e `rdp session opened` com o ID da sessão, o ID do usuário, o ID do host, a postura de segurança negociada e um campo `missing_username_or_password`. Use-os para investigar incidentes; o ID da sessão liga tudo.

### Solução de problemas

| Sintoma | Resposta do servidor | Causa provável e correção |
|---------|-------------------------|----------------------|
| `guacd is not reachable on the PatchMon server.` | `503`, `code: guacd_unavailable` | O sidecar não está rodando. Verifique `docker compose ps guacd`, ou instale o `guacd` no host e defina `GUACD_ADDRESS`. |
| `The PatchMon agent on this host is not connected.` | `503`, `code: agent_disconnected` | O agente está offline. Inicie ou reinicie o serviço `PatchMonAgent` no host. |
| `The PatchMon agent did not respond to the RDP proxy request in time.` | `504`, `code: agent_timeout` | O agente está conectado, mas o handler travou ou está bloqueado por firewall. Procure entradas `rdp_proxy` nos logs do agente. |
| *rdp proxy is not enabled* (via `rdp-proxy-enabled`) | `502`, `code: agent_rdp_disabled` | Defina `integrations.rdp-proxy-enabled: true` no `config.yml` do agente e reinicie o agente. |
| *invalid host* | `502`, `code: agent_invalid_host` | Formato de host do proxy recusado (reservado para futuros proxies por destino). |
| *connection refused* / *no route to host* na porta 3389 | `502`, `code: rdp_port_unreachable` | O RDP não está rodando no host Windows, ou um firewall local bloqueia `localhost:3389`. Ative o RDP no host. |
| `RDP is only available for Windows hosts` | `400` | O host não é Windows. Use o [terminal SSH web](#web-ssh-terminal). |
| `Forbidden: origin not allowed` no upgrade do WebSocket | `403` | O cabeçalho `Origin` do seu navegador não está na lista `CORS_ORIGIN` do PatchMon. Atualize `CORS_ORIGIN` (ou o resolvedor dinâmico de origem) para incluir a URL do seu PatchMon e reinicie. |
| O handshake do Guacamole falha repetidamente com usuário e senha válidos | — | Procure `rdp tunnel guacd handshake failed` no log do servidor. É o cenário do problema conhecido da 2.0.0; consulte as notas de versão e tente de novo. |

### Páginas relacionadas

- [Terminal SSH web](#web-ssh-terminal)
- [Assistente de IA no terminal](#ai-terminal-assistant)
- Instalando o servidor do PatchMon com Docker
- Notas da versão 2.0.0

---

## Capítulo 23: Assistente de IA no terminal {#ai-terminal-assistant}

### Visão geral

O **AI Terminal Assistant** é um painel de chat opcional dentro do [terminal SSH web](#web-ssh-terminal) do PatchMon. O operador o abre ao lado do terminal para fazer perguntas sobre o que está vendo ("por que o `apt` falhou?", "como reinicio este serviço?", "explique este stack trace") e receber respostas de um LLM da sua escolha. O assistente também transforma os trechos de código das respostas em ações de colar no terminal, para você não sair da janela.

O assistente usa o PatchMon como intermediário até um provedor de IA terceiro suportado (OpenRouter, Anthropic, OpenAI ou Google Gemini). Provedor, modelo e API key são configurados uma vez, no nível do sistema; cada operador não precisa configurar nada.

O SSH web chegou na 1.4.0, e o assistente de IA na mesma versão.

### Provedores suportados

Na 2.0 há quatro provedores suportados, cada um com uma lista selecionada de modelos:

| Provedor | Modelo padrão | Outros modelos |
|----------|---------------|-------------------|
| **OpenRouter** | `anthropic/claude-3.5-sonnet` | Claude 3 Haiku, GPT-4o, GPT-4o Mini, Gemini Pro 1.5, Llama 3.1 70B |
| **Anthropic** | `claude-sonnet-4-20250514` | Claude 3.5 Sonnet, Claude 3.5 Haiku |
| **OpenAI** | `gpt-4o-mini` | GPT-4o, GPT-4 Turbo |
| **Google Gemini** | `gemini-1.5-flash` | Gemini 1.5 Pro, Gemini 2.0 Flash (experimental) |

Escolha um provedor por instalação do PatchMon. Para trocar de provedor, edite as configurações de IA. A API key é apagada automaticamente na troca, e será pedida uma nova para o novo provedor.

### Liberação por módulo

O assistente de IA faz parte do módulo **ai** (chamado de **ai_assist** em algumas configurações). Se a sua assinatura não inclui o módulo de IA, a página de configurações aparece, mas não pode ser ativada. Se os recursos de IA não aparecem de jeito nenhum na sua instância, fale com o administrador da conta.

### Permissões

| Área | Permissão |
|------|-----------|
| Configurar a IA (provedor, modelo, API key) | Só `admin` ou `superadmin` |
| Usar o assistente de IA num terminal | Qualquer usuário que possa abrir o terminal SSH (admin/superadmin, ou `can_use_remote_access`) |

Não há chave separada por usuário. Se a IA está ativa no sistema e você tem acesso ao terminal, o assistente está disponível para você.

### Configurando um provedor

Vá a **Settings → AI Terminal Assistant**.

#### 1. Escolha o provedor

Use a lista **Provider**. A lista **Model**, logo abaixo, é preenchida com os modelos daquele provedor e já seleciona o padrão dele. Trocar o provedor apaga na hora a API key guardada (porque cada chave pertence a um provedor).

#### 2. Informe a API key

Cada provedor emite a sua chave:

| Provedor | Onde obter a chave |
|----------|-------------------|
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) |
| Anthropic | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

Cole a chave no campo **API Key** e clique em **Save**. O PatchMon criptografa a chave com o `SESSION_SECRET` da sua instância antes de gravá-la no banco. Depois de salva, a chave nunca volta para o navegador; a API expõe só um booleano indicando se ela está definida.

> **A API key precisa ser informada de novo.** Se depois o PatchMon não conseguir descriptografar a chave guardada (por exemplo, porque o `SESSION_SECRET` foi trocado ou ficou inconsistente entre reinícios), a página de configurações mostra uma faixa amarela. Informe a chave de novo para limpar o aviso.

#### 3. Teste a conexão

Clique em **Test Connection**. O servidor manda uma frase de ida e volta ao provedor configurado e confere a resposta. Um visto verde com *"AI connection test successful"* confirma que está tudo certo; um erro vermelho significa chave errada, modelo indisponível ou provedor fora do alcance do servidor do PatchMon.

#### 4. Ative o assistente

Ligue a chave **Enable AI Assistant**, no topo da página. Enquanto ela estiver desligada, o painel de chat dentro do terminal SSH fica oculto para todos.

### Usando o assistente num terminal

1. Abra um terminal SSH web com qualquer host (veja [Terminal SSH web](#web-ssh-terminal)).
2. Clique no ícone de robô na barra de ferramentas do terminal para abrir o painel do assistente à direita.
3. Digite uma pergunta e pressione **Enter**. Exemplos:
   - *"A saída de `systemctl status nginx` diz `(code=exited, status=1/FAILURE)`. O que está errado?"*
   - *"Como vejo o uso de disco neste host Ubuntu?"*
   - *"Explique esta mensagem de erro."*
4. O assistente responde no próprio painel. Trechos de código (entre três crases ou marcados como comando) ganham os botões **Play** e **Copy**, para você colar o comando no terminal sem digitar.

O painel é um chat comum. Você pode continuar perguntando, e o assistente mantém o contexto.

### Quais dados vão para o provedor

Cada requisição a `/api/v1/ai/assist` inclui:

- O **prompt de sistema**: fixo no PatchMon, posiciona o modelo como ajudante de terminal para administração Linux/Unix.
- O **contexto do terminal**: os últimos ~3.000 caracteres da saída do terminal, tirados do buffer do navegador e envolvidos em blocos Markdown, para o modelo ler o que você está vendo. Como rede de segurança, o servidor limita o contexto enviado a 10.000 caracteres.
- O **histórico da conversa**: até as últimas 10 mensagens (usuário + assistente) da sessão de chat atual, cada uma cortada em 2.000 caracteres.
- A **pergunta**: a sua mensagem atual, de 1 a 2.000 caracteres.

A pergunta é então repassada ao provedor configurado (OpenRouter, Anthropic, OpenAI ou Gemini). O PatchMon não guarda a requisição além do log de acesso normal do servidor.

As requisições de completar comandos (quando você pausa enquanto digita no terminal, se o recurso estiver ativo) enviam:

- Até 5.000 caracteres de contexto.
- O comando parcial que você está digitando (de 2 a 500 caracteres).
- Um prompt de baixa temperatura que pede ao modelo só o complemento.

#### Questões de privacidade

- A saída do terminal que fica no buffer **é** enviada ao provedor terceiro como contexto. Se você acabou de rodar um comando que mostra dados sensíveis (API keys, segredos, dados de clientes), limpe o terminal ou não pergunte nada ao assistente sobre isso.
- Os termos de serviço do seu provedor definem o que ele pode fazer com a requisição. Revise a política de tratamento de dados do provedor antes de ativar em hosts de produção. OpenRouter, Anthropic, OpenAI e Gemini publicam suas políticas.
- Sigilo da API key: as chaves ficam criptografadas em repouso e nunca voltam pela API. Administradores com acesso ao banco ainda poderiam ler o valor criptografado; troque o `SESSION_SECRET` com cuidado.
- Todo o tráfego com o provedor sai do servidor do PatchMon por HTTPS direto para o endpoint do provedor. O PatchMon não o passa por nenhum serviço intermediário.

Se essas condições não forem aceitáveis num ambiente, deixe o assistente desativado. O terminal SSH funciona normalmente sem ele.

### Limite de requisições

Cada usuário tem um limite de **30 requisições de IA por minuto**, somando `assist` e `complete`. O limite é aplicado no Redis, com uma janela de 60 segundos. Ultrapassá-lo retorna `429 Rate limit exceeded. Please wait a moment.` O painel mostra o erro e você pode tentar de novo quando a janela reiniciar.

O limite é por usuário do PatchMon, não por IP. Ele existe para proteger o seu gasto com o provedor, não para travar o uso interativo normal. 30 por minuto sobra para um operador, e ainda pega scripts descontrolados.

### Limites de entrada e de resposta

- Perguntas: de 1 a 2.000 caracteres. Entradas maiores são recusadas com `400`.
- Contexto: no máximo 10.000 caracteres (o servidor corta o excesso).
- Histórico da conversa: as últimas 10 mensagens são enviadas ao provedor.
- Corte por mensagem: 2.000 caracteres.
- Entrada de complemento: de 2 a 500 caracteres.
- Contexto de complemento: 5.000 caracteres.
- `max_tokens` por resposta do assistente: **1024**.
- `temperature` do assistente: **0.7** (criativo, mas focado).
- `temperature` do complemento: **0.3** (conservador).

Esses valores seguem os padrões do produto em `internal/ai/service.go` e hoje não podem ser configurados pela interface.

### Ativando e desativando

- **Por instalação**: a chave de administrador em **Settings → AI Terminal Assistant**. Desligada = painel oculto para todos.
- **Por usuário** (informal): qualquer usuário pode simplesmente deixar o painel fechado. Não há flag de desativação por usuário.
- **Desligamento de emergência**: apague a API key em **Settings → AI Terminal Assistant**. Os endpoints de IA do servidor passam a retornar `400 AI API key not configured`, e o painel mostra esse erro.

### Solução de problemas

| Sintoma | Causa provável |
|---------|-------------|
| O painel de IA não aparece no terminal | O módulo de IA não está na sua assinatura, a IA não foi ativada nas configurações ou não há API key definida. |
| *"AI assistant is not enabled"* no painel | A chave está desligada nas configurações. |
| *"AI API key not configured"* | O campo da chave está vazio ou a descriptografia falhou. Informe a chave de novo. |
| *"Rate limit exceeded. Please wait a moment."* | O seu usuário atingiu o limite de 30 requisições por minuto. Espere e tente de novo. |
| O teste de conexão falha com `401` do provedor | A API key está errada ou foi revogada. Gere outra e informe de novo. |
| O teste de conexão falha com `404 model not found` | O modelo listado no PatchMon não está disponível na sua conta. Troque de modelo na lista. |
| As respostas são cortadas no meio da frase | A resposta atingiu o teto de 1024 tokens. Faça uma pergunta mais específica ou cole um contexto menor. |

### Páginas relacionadas

- [Terminal SSH web](#web-ssh-terminal)
- [RDP via Guacamole](#rdp-via-guacamole)

---

## Capítulo 24: Usuários, papéis e RBAC {#users-and-roles-rbac}

O PatchMon usa controle de acesso baseado em papéis (RBAC) para decidir quem vê e faz o quê dentro do aplicativo. Cada usuário tem exatamente um papel, e cada papel é um conjunto de permissões. Este capítulo trata dos papéis nativos, da lista completa de permissões e de como gerenciar usuários e papéis pela interface de Settings.

> **Páginas relacionadas:**
> - Configurando OIDC / Login único: autenticar usuários num IdP externo
> - Configurando o Microsoft Azure Entra ID (SSO) com o PatchMon: passo a passo específico do Entra
> - [Autenticação em dois fatores](#two-factor-authentication): TOTP por usuário e dispositivos confiáveis

---

### Os papéis nativos

O PatchMon vem com cinco papéis. Eles aparecem em **Settings → Users** (na lista **Role**) e em **Settings → Roles** (como colunas da matriz).

| Papel | Permissões padrão | Uso típico |
|------|--------------------|-------------|
| **Super Admin** (`superadmin`) | Tudo, inclusive gerenciar outros superadmins | O primeiro usuário, ou responsáveis dedicados pela plataforma |
| **Admin** (`admin`) | Tudo, menos gerenciar outros superadmins | Administradores da plataforma no dia a dia |
| **Host Manager** (`host_manager`) | Monitoramento + gestão de hosts/infraestrutura + operações (patching, conformidade, alertas, automação, acesso remoto) | Engenheiros de NOC / operações |
| **User** (`user`) | Monitoramento + exportação de dados | Engenheiros que precisam olhar sem quebrar nada |
| **Readonly** (`readonly`) | Só monitoramento | Auditores, painéis somente leitura, gestão |

Duas regras importantes sobre os papéis nativos:

- **Não podem ser excluídos.** `superadmin`, `admin`, `host_manager`, `user` e `readonly` sempre existem. O botão **Delete** não aparece para eles.
- **As permissões dos três principais não podem ser editadas.** `superadmin`, `admin` e `user` são *travados*: a matriz de permissões deles é fixa no código e o botão **Edit** fica desabilitado. `host_manager` e `readonly` ainda podem ser editados, se você quiser ajustá-los.

> **O primeiro usuário é sempre Super Admin.** Quando o PatchMon é instalado e ainda não tem usuários, o assistente de configuração cria a conta inicial como `superadmin`, seja qual for o papel digitado. Se o OIDC estiver configurado com criação automática antes do primeiro boot, o primeiro login via OIDC também é promovido automaticamente a `superadmin`, para você não ficar trancado do lado de fora.

---

### A lista completa de permissões

As permissões são divididas em quatro faixas de risco. A cor que aparece na matriz **Roles** corresponde a esse nível de risco.

#### Monitoramento e visibilidade (risco baixo)

Acesso somente leitura a painéis, hosts, pacotes, relatórios e logs.

| Chave da permissão | Rótulo | O que permite |
|----------------|-------|--------------------------|
| `can_view_dashboard` | View Dashboard | Ver o painel principal e os seus quadros de estatística |
| `can_view_hosts` | View Hosts | Ver a lista de hosts, as páginas de detalhes e o status de conexão |
| `can_view_packages` | View Packages | Ver o inventário de pacotes de todos os hosts |
| `can_view_reports` | View Reports | Ver resultados de varreduras de conformidade e relatórios de alertas |
| `can_view_notification_logs` | View Notification Logs | Ver o histórico e o status das entregas de notificações |

#### Hosts e infraestrutura (risco médio)

Criar, alterar e excluir hosts, pacotes e contêineres.

| Chave da permissão | Rótulo | O que permite |
|----------------|-------|--------------------------|
| `can_manage_hosts` | Manage Hosts | Criar / editar / excluir hosts, grupos de hosts, repositórios e integrações |
| `can_manage_packages` | Manage Packages | Editar o inventário e os metadados de pacotes |
| `can_manage_docker` | Manage Docker | Excluir contêineres, imagens, volumes e redes Docker |

#### Operações (risco médio a alto)

Tarefas de NOC do dia a dia.

| Chave da permissão | Rótulo | O que permite |
|----------------|-------|--------------------------|
| `can_manage_patching` | Manage Patching | Disparar patches, aprovar execuções de patch, gerenciar políticas |
| `can_manage_compliance` | Manage Compliance | Disparar varreduras de conformidade, corrigir achados, instalar scanners |
| `can_manage_alerts` | Manage Alerts | Atribuir, excluir e aplicar ações em massa a alertas |
| `can_manage_automation` | Manage Automation | Disparar e gerenciar jobs de automação |
| `can_use_remote_access` | Remote Access | Abrir terminais SSH e RDP nos hosts gerenciados |

#### Administração (risco alto)

Controle sobre toda a organização.

| Chave da permissão | Rótulo | O que permite |
|----------------|-------|--------------------------|
| `can_view_users` | View Users | Ver a lista de usuários e os detalhes das contas |
| `can_manage_users` | Manage Users | Criar, editar e excluir contas de usuário |
| `can_manage_superusers` | Manage Superusers | Gerenciar contas `superadmin` e privilégios elevados |
| `can_manage_settings` | Manage Settings | Configuração do sistema, OIDC / SSO, IA, configuração de alertas, tokens de registro |
| `can_manage_notifications` | Manage Notifications | Configurar destinos de notificação e regras de roteamento |
| `can_export_data` | Export Data | Baixar e exportar dados e relatórios |

> **Cobrança:** no PatchMon Cloud também existe a permissão `can_manage_billing`, que controla o acesso à página de cobrança. Em instalações auto-hospedadas, essa permissão existe no esquema, mas a página de cobrança não vem habilitada por padrão.

---

### Vendo a matriz de papéis

1. Entre com um usuário que tenha `can_manage_settings`.
2. Vá a **Settings → Roles**.
3. Aparece uma matriz: as linhas são permissões (agrupadas por faixa) e as colunas são papéis. Um visto verde indica que o papel tem aquela permissão.

O cabeçalho de cada coluna também mostra um contador `n/N`, com quantas das 20 permissões aquele papel tem.

---

### Criando um papel personalizado

Papéis personalizados permitem montar conjuntos de permissões além dos cinco nativos.

> **Disponibilidade:** o botão **Add Role** só aparece quando o módulo `rbac_custom` está habilitado na sua instalação do PatchMon. Em instalações auto-hospedadas, esse módulo normalmente vem habilitado; no PatchMon Cloud, depende do plano. Se você não vê **Add Role** e a URL `https://patchmon.example.com/settings/roles` mostra uma tela "Not Available", o módulo não está habilitado no seu plano.

Para criar um:

1. Vá a **Settings → Roles**.
2. Clique em **Add Role**, no canto superior direito.
3. Preencha a janela:
   - **Role Name:** minúsculas, com sublinhado no lugar de espaço. Exemplos: `host_manager`, `compliance_auditor`, `noc_operator`. É a chave interna e não pode ser renomeada depois.
   - **Preset** (opcional): quatro pontos de partida rápidos:
     - **Read Only:** só o grupo Monitoramento e visibilidade
     - **Operator:** tudo, menos o grupo Administração
     - **Admin:** todas as permissões
     - **Clear All:** começa do zero
   - **Permissions:** marque ou desmarque permissões individuais, ou use o atalho **Select all / Deselect all** no cabeçalho de cada grupo.
4. Confira o contador no rodapé (`n/20 permissions selected`).
5. Clique em **Create Role**.

O novo papel aparece como uma nova coluna na matriz e pode ser escolhido ao criar ou editar usuários.

#### Editando um papel personalizado

1. Na matriz, clique no ícone de lápis no cabeçalho da coluna do papel.
2. Abre-se, abaixo da matriz, um painel de edição com todas as permissões.
3. Marque ou desmarque o que precisar e clique em **Save**.

As mudanças valem na hora. Qualquer sessão de um usuário com aquele papel tem as permissões em memória atualizadas na próxima requisição.

#### Excluindo um papel personalizado

Só é possível excluir um papel que **não está atribuído a nenhum usuário**. Se algum usuário tiver o papel, o endpoint de exclusão recusa com "Cannot delete role: users are assigned to it". Passe esses usuários para outro papel antes (veja [Mudando o papel de um usuário existente](#editing-a-role-for-an-existing-user)).

Para excluir:

1. Clique no lápis no cabeçalho da coluna do papel para abrir o painel de edição.
2. Clique em **Delete** (só aparece em papéis que não são nativos).
3. Confirme.

---

### Criando usuários

Vá a **Settings → Users** e clique em **Add User**, no canto superior direito.

| Campo | Observações |
|-------|-------|
| **Username** | Mínimo de 3 caracteres. Recomenda-se minúsculas |
| **Email** | Precisa ser um e-mail válido. Usado para vincular contas OIDC e para alertas por e-mail |
| **First Name / Last Name** | Opcionais |
| **Password** | Precisa atender à política de senha em vigor (configurada em **Settings → Server Config → Security**) |
| **Role** | Escolha entre os papéis nativos ou personalizados |

Clique em **Add User**. A conta é criada na hora e já pode entrar.

> **Proteção contra escalada de papel:** não é possível criar um usuário com um papel mais privilegiado que o seu. Só usuários `superadmin` podem criar contas `admin` ou `superadmin`. Contas que não são superadmin mas têm a permissão `can_manage_superusers` também podem criar e gerenciar contas `superadmin`.

#### Cadastro pelo próprio usuário

O PatchMon também pode deixar os usuários se cadastrarem sozinhos, em vez de depender de convite de um administrador.

1. Vá a **Settings → Users**.
2. Role até **User Registration Settings**.
3. Marque **Enable User Self-Registration**.
4. Escolha o **Default Role for New Users**: o papel dado às contas cadastradas pelo próprio usuário.
5. Clique em **Save Settings**.

Passa a aparecer um link de cadastro na tela de login. Qualquer pessoa que chegue à tela de login pode criar uma conta.

> **Aviso de segurança:** só ative o autocadastro em instalações internas ou em rede privada. Se o seu PatchMon está exposto à Internet, deixe desligado e convide os usuários manualmente, ou coloque o OIDC SSO na frente (e deixe o seu IdP decidir quem pode entrar).

---

### Mudando o papel de um usuário existente {#editing-a-role-for-an-existing-user}

1. Vá a **Settings → Users**.
2. Encontre o usuário na tabela e clique no ícone **Edit** (lápis).
3. Mude o **Role** na lista e clique em **Save**.

Efeitos colaterais importantes:

- **As sessões são revogadas.** Quando o papel de um usuário muda, todas as sessões JWT dele são invalidadas no servidor e ele precisa entrar de novo. Assim, os privilégios do papel antigo não podem ser reaproveitados numa aba de navegador aberta.
- **Você não pode mudar o próprio papel.** A API recusa com "Cannot change your own role". É uma proteção deliberada: dois admins precisam cooperar para rebaixar um ao outro.
- **Você não pode promover alguém acima de você.** Um `admin` não pode promover um usuário a `superadmin`. Só um `superadmin` cria ou promove a `superadmin`, e só um `superadmin` pode atribuir o papel `admin`.

#### Redefinindo a senha de um usuário

1. Na tabela de usuários, clique no ícone **Reset** (chave) na linha do usuário.
2. Informe uma nova senha.
3. Clique em **Reset Password**.

Depois da redefinição, todas as sessões e todos os dispositivos confiáveis desse usuário são revogados. É a resposta padrão depois de um comprometimento. O usuário precisa entrar com a nova senha em todos os dispositivos.

> Não é possível redefinir a senha de um usuário inativo. Reative-o antes.

---

### Desativando um usuário

Desativar é a alternativa mais segura à exclusão. O registro do usuário, o histórico e a trilha de auditoria são preservados, mas ele não consegue entrar.

1. Vá a **Settings → Users**.
2. Clique no ícone **Edit** do usuário que quer desativar.
3. Desmarque a caixa **Active**.
4. Clique em **Save**.

Efeitos:

- Todas as sessões dele são revogadas na hora.
- Todos os dispositivos confiáveis dele são revogados (assim, reativá-lo depois não permite reaproveitar um cookie de "lembrar este dispositivo" anterior à desativação).
- A linha do usuário aparece com um selo vermelho **Inactive** na tabela de usuários.

Para reativar: edite e marque **Active** de novo.

#### Excluindo um usuário

A exclusão é permanente e remove o registro do usuário junto com as preferências de painel, as sessões, os dispositivos confiáveis e as preferências de notificação.

1. Clique no ícone **Delete** (lixeira) na linha do usuário.
2. Confirme.

Restrições:

- Você não pode excluir a própria conta.
- Você não pode excluir o último `superadmin` (a API recusa).
- Você não pode excluir o último `admin` se não houver nenhum `superadmin` (garante que sempre exista pelo menos um administrador).
- Você não pode excluir um usuário com papel mais privilegiado que o seu.

---

### Como as permissões são avaliadas

- **Admin e Super Admin** sempre têm todas as permissões, mesmo que a tabela `role_permissions` diga outra coisa. O middleware pula as verificações de permissão deles. É uma proteção: se alguém editar errado a linha de `admin` (o que a interface não deveria permitir, mas pode acontecer por acesso direto ao banco), os admins não ficam trancados do lado de fora.
- **Todos os outros papéis** (nativos ou personalizados) têm as permissões lidas do banco a cada requisição. Mudanças feitas em **Settings → Roles** valem na próxima chamada de API do usuário, sem reinício.
- A **hierarquia de papéis para gestão de usuários** é aplicada à parte das permissões acima:
  - `superadmin` → nível 100
  - `admin` → nível 90
  - `host_manager` → nível 50
  - papéis personalizados → nível 30 (intermediário)
  - `user` → nível 20
  - `readonly` → nível 10

Você só pode alterar, excluir ou redefinir a senha de usuários cujo nível de papel é menor ou igual ao seu. Isso é independente das verificações de permissão. Mesmo que um papel personalizado recebesse `can_manage_users`, quem o tivesse ainda não poderia mexer em contas `admin` ou `superadmin`, a menos que também tivesse `can_manage_superusers`.

---

### Quando a sincronização de papéis do OIDC está ativa {#when-oidc-role-sync-is-enabled}

Se **Settings → OIDC / SSO → Sync roles from IdP** estiver ligado, o PatchMon deixa de permitir que admins gerenciem usuários e papéis pela interface. Em vez disso:

- Os botões **Add User** e **Add Role** desaparecem.
- A aba Users mostra uma lista somente leitura.
- A aba Roles mostra uma faixa lembrando que a participação em grupos no seu IdP define o papel, por meio das variáveis de ambiente `OIDC_SUPERADMIN_GROUP`, `OIDC_ADMIN_GROUP`, `OIDC_HOST_MANAGER_GROUP`, `OIDC_USER_GROUP` e `OIDC_READONLY_GROUP`.
- O papel de cada usuário é reavaliado a cada login, conforme os grupos a que ele pertence no IdP naquele momento.

Se você quer usar OIDC para autenticação mas continuar gerenciando os papéis no PatchMon, deixe **Sync roles from IdP** desligado. A referência completa das opções está em Configurando OIDC / Login único.

---

### Solução de problemas

#### "You do not have permission to assign the role: admin"

Só um `superadmin` pode criar usuários ou promovê-los a `admin` ou `superadmin`. Se você é `admin` e tenta promover alguém a `admin`, a API recusa. Peça a um superadmin.

#### "Cannot modify built-in role permissions"

As linhas `superadmin`, `admin` e `user` estão travadas contra edição de permissões. Se precisar de um papel com permissões ajustadas, crie um papel personalizado a partir de um preset e atribua os usuários a ele.

#### "Cannot delete role: users are assigned to it"

Antes de excluir um papel, reatribua todos os usuários que o têm. Use **Settings → Users → Edit** para mudar o papel de cada usuário e tente excluir de novo.

#### "Cannot delete the last superadmin user" / "Cannot delete the last admin user"

Sempre precisa existir pelo menos um `superadmin`. Se não houver nenhum superadmin, precisa existir pelo menos um `admin`. Crie um substituto antes (e entre com ele para confirmar que o login funciona) e só então exclua o último.

#### O papel antigo do usuário continua valendo depois da mudança

Mudar o papel revoga todas as sessões, mas o navegador do usuário pode ainda ter um cookie JWT antigo que ainda não foi recusado. Peça que ele recarregue a página ou saia e entre de novo; o servidor recusa o token antigo e o manda para o login.

#### O botão "Add User" / "Add Role" não aparece

Três causas possíveis:

1. **O seu papel não tem `can_manage_settings` nem `can_view_users`.** Abra `/settings/users`: se a página vier vazia ou der Forbidden, falta ao seu papel a permissão de visualização.
2. **A sincronização de papéis do OIDC está ligada.** Veja [Quando a sincronização de papéis do OIDC está ativa](#when-oidc-role-sync-is-enabled).
3. **O módulo `rbac_custom` não está habilitado.** Isso afeta só o botão **Add Role** da aba Roles; a criação de papéis personalizados é um recurso liberado por módulo. O botão **Add User** da aba Users sempre aparece quando as outras duas condições são atendidas.

---

## Capítulo 25: Autenticação em dois fatores {#two-factor-authentication}

O PatchMon suporta autenticação em dois fatores (2FA, às vezes chamada de MFA) com senha de uso único baseada em tempo (TOTP), além do login normal com usuário e senha. Com ela ativa numa conta, todo login pede um código de 6 dígitos de um aplicativo autenticador, ou um código de backup de uso único.

Este capítulo trata de como ativar o 2FA por usuário, usar os códigos de backup, o recurso de dispositivo confiável "Remember Me" e como os administradores recuperam uma conta quando o usuário perde o autenticador.

> **Páginas relacionadas:**
> - [Usuários, papéis e RBAC](#users-and-roles-rbac): gestão de contas de usuário
> - Configurando OIDC / Login único: delegar a autenticação a um IdP externo
> - Referência de variáveis de ambiente do PatchMon: a lista completa de variáveis

---

### Escopo e limitações

- O 2FA é **opcional, por usuário**. Cada um decide se liga ou não no próprio perfil.
- O 2FA **não está disponível para contas OIDC.** Se o usuário entra via OIDC / SSO, o MFA fica por conta do IdP. A aba de TFA do PatchMon fica oculta no perfil de contas só OIDC, e o endpoint de configuração recusa com *"MFA is managed by your OIDC provider"*.
- **Não há** na versão atual uma opção global de "exigir 2FA para todos os usuários". Os administradores não conseguem impor 2FA a todas as contas, nem pela interface nem por variável de ambiente. Se precisar de 2FA obrigatório, faça a autenticação por um provedor OIDC que exija MFA (por exemplo, Authentik ou Entra ID) e defina `OIDC_DISABLE_LOCAL_AUTH=true`.
- O assistente de configuração inicial oferece ao novo administrador a opção de configurar 2FA na criação da conta (etapa 2 do assistente). É voluntário e pode ser pulado.

---

### Ativando o 2FA na sua conta

Cada usuário ativa o 2FA sozinho, pelo próprio perfil. Os administradores não conseguem ativá-lo em nome de outra pessoa.

1. Entre no PatchMon com usuário e senha.
2. Clique no seu avatar (canto superior direito) → **Profile**.
3. Abra a aba **Multi-Factor Authentication**.
4. Clique em **Enable TFA**.
5. Aparece um QR code. Leia-o com o aplicativo autenticador da sua preferência. Opções que funcionam:
   - **Authy**
   - **Google Authenticator**
   - **1Password**
   - **Bitwarden**
   - **Microsoft Authenticator**
   - **Duo Mobile**
6. Se não conseguir ler o QR code (dispositivo compartilhado, aplicativo só de desktop), copie a **Manual Entry Key** e cole no autenticador.
7. Clique em **Continue to Verification**.
8. Informe o código de 6 dígitos atual do aplicativo autenticador.
9. Clique em **Verify & Enable**.

Em seguida aparece, uma única vez, uma lista de **códigos de backup** (veja a próxima seção). Guarde-os antes de clicar em **Done**.

A partir daí, todo login com senha vai pedir um código de verificação de 6 dígitos depois da senha.

#### Códigos de backup: guarde-os

Depois de ativar o 2FA, o PatchMon gera um lote de códigos de backup de uso único. Eles permitem entrar se você perder o acesso ao aplicativo autenticador (celular perdido, aparelho formatado etc.).

- **Cada código só pode ser usado uma vez.** Depois de usado, ele é consumido e não vale mais.
- **Eles aparecem uma única vez**, em texto claro, logo depois da configuração ou de uma nova geração. O PatchMon os guarda como hashes bcrypt no banco; nem você nem um administrador conseguem recuperar o texto depois.
- **Trate-os como uma segunda senha.** Guarde num gerenciador de senhas, ou imprima e tranque.
- Clique em **Download Codes** para salvar um arquivo de texto e guardar offline.

#### Gerando novos códigos de backup

Se você acha que os códigos vazaram, ou já usou a maioria:

1. Vá a **Profile → Multi-Factor Authentication**.
2. Role até o painel **Backup Codes**.
3. Clique em **Regenerate Codes**.
4. Um novo conjunto é gerado e exibido. O conjunto anterior é invalidado na hora.

#### Usando um código de backup {#using-a-backup-code}

Na tela de 2FA do login, os códigos de backup vão no **mesmo campo** dos códigos TOTP. Não há um botão separado de "usar código de backup". O PatchMon testa o código primeiro como TOTP; se falhar, verifica se ele bate com algum dos hashes de código de backup guardados. Se bater, esse código é consumido (sai da lista guardada) e você entra.

Fluxo típico para quem perdeu o celular:

1. Na tela de login, informe usuário e senha como de costume.
2. Na tela "Two-Factor Authentication", digite um dos seus códigos de backup no campo **Verification Code**.
3. Clique em **Verify**.

O código foi gasto. O próximo login não pode usar o mesmo código de novo.

---

### "Remember Me": dispositivos confiáveis

Ao informar o código de 2FA, há uma caixa **Remember me on this computer (skip TFA for 30 days)**. Se marcada, o PatchMon grava naquele navegador um cookie HttpOnly de longa duração, `patchmon_device_trust`, e registra no banco um token de confiança em forma de hash.

Nos próximos logins pelo mesmo navegador:

- Você continua informando a senha.
- O PatchMon vê o cookie de confiança, o associa ao registro no banco, confirma que o registro é seu e não expirou, e pula a tela de 2FA.
- Um horário `last_used_at` no registro de confiança é atualizado a cada uso, para você ver quando cada dispositivo lembrado entrou pela última vez.

#### Como a confiança é identificada

O cookie de confiança é identificado só por **(ID do usuário, hash do cookie)**. Ele **não** é amarrado ao endereço IP nem ao user agent, de propósito. Por isso:

- Circular entre Wi-Fi, hotspot do celular e rede do escritório não invalida a confiança.
- Atualizar o navegador não invalida a confiança.
- Copiar o cookie para outro navegador em outra máquina **passaria** pelo 2FA daquele usuário (é o modelo de segurança padrão de cookies na web). Proteja o seu perfil de navegador de acordo.

#### Duração da confiança

A duração padrão é de **30 dias**, configurável para todo o servidor pela variável de ambiente `TFA_REMEMBER_ME_EXPIRES_IN`. Ela aceita durações como `7d`, `30d`, `90d`. A lista completa está na Referência de variáveis de ambiente do PatchMon.

Há um teto para quantos dispositivos confiáveis um usuário pode acumular, definido por `TFA_MAX_REMEMBER_SESSIONS` (padrão `5`). Quando um sexto dispositivo é marcado como confiável, a confiança mais antiga é removida automaticamente.

#### Revendo os seus dispositivos confiáveis

1. Vá a **Profile → Trusted Devices**.
2. Aparece uma lista com, para cada dispositivo:
   - **Label** (nome aproximado do dispositivo, tirado do user agent)
   - **User agent**
   - **Endereço IP** no último uso
   - Horários **Created** / **Last used** / **Expires**
   - Um selo **This device** ao lado do dispositivo em que você está conectado agora

#### Revogando um dispositivo confiável

Para um dispositivo específico parar de pular o 2FA (por exemplo, um notebook antigo que vai ser desativado):

1. **Profile → Trusted Devices**.
2. Encontre o dispositivo na lista e clique em **Revoke**.
3. Confirme.

Se o dispositivo revogado for o navegador **atual**, o cookie de confiança dele também é apagado, e o próximo login por esse navegador volta a pedir 2FA.

#### Revogando todos os dispositivos confiáveis

Clique em **Forget all trusted devices**, no topo do painel. Isso:

- Remove todos os registros de confiança da sua conta.
- Apaga o cookie de confiança do navegador atual.
- Faz todos os dispositivos pedirem o 2FA completo no próximo login.

Use depois de uma suspeita de comprometimento da conta ou da perda de um dispositivo.

---

### Desativando o 2FA

Para desligar o 2FA na sua conta:

1. **Profile → Multi-Factor Authentication**.
2. Clique em **Disable TFA**.
3. Informe a sua senha para confirmar.
4. Clique em **Disable TFA**.

Efeitos colaterais:

- O segredo TOTP é apagado do banco.
- Todos os códigos de backup existentes são invalidados.
- **Todos os seus dispositivos confiáveis são revogados.** Isso é proposital. Um registro de confiança só serve para pular o 2FA; com o 2FA desligado, ele não tem função. Se você reativar o 2FA depois, os cookies de confiança antigos não voltam, e todos os dispositivos precisam confirmar o 2FA de novo.

> Não é possível desativar o 2FA numa conta só OIDC. A API recusa com *"Cannot disable TFA for accounts without a password"*, porque desativar o 2FA exige confirmação por senha, e contas só OIDC não têm senha.

---

### Tentativas com falha e bloqueio

Para impedir força bruta sobre o espaço de códigos de 6 dígitos, o endpoint de verificação de 2FA tem limite de tentativas por usuário.

| Variável | Padrão | O que faz |
|---------|---------|--------------|
| `MAX_TFA_ATTEMPTS` | `5` | Códigos errados seguidos permitidos antes do bloqueio |
| `TFA_LOCKOUT_DURATION_MINUTES` | `30` | Quanto tempo o bloqueio dura |

Atingido o limite, o endpoint retorna HTTP `429 Too Many Requests` com a mensagem *"Too many failed TFA attempts. Please try again later."* Espere o bloqueio passar ou peça ajuda a um administrador (veja abaixo).

Cada falha também traz na resposta um contador `remainingAttempts`, para a tela de login informar ao usuário quantas tentativas restam.

---

### Assistente inicial: configuração opcional do 2FA

Ao subir uma instância nova do PatchMon e concluir o assistente de configuração, a **etapa 2 (Multi-Factor Authentication)** oferece duas opções:

- **Setup MFA now:** ler um QR code e registrar um autenticador para a nova conta de administrador antes de terminar o assistente. Você também já guarda os códigos de backup.
- **Skip for now:** a conta de administrador é criada sem 2FA. Dá para ativar depois em **Profile → Multi-Factor Authentication**.

O assistente não tem opção de "impor para todos". A decisão é sempre por usuário.

---

### Recuperação pelo administrador: usuário perdeu o autenticador

O PatchMon não tem um botão dedicado de "redefinir MFA pelo administrador". A recuperação segue o fluxo padrão de recuperação de conta, que desativa o 2FA de forma segura.

#### Opção A: o usuário tem um código de backup

Peça que ele entre com um código de backup (veja [Usando um código de backup](#using-a-backup-code)). Lá dentro, ele pode:

1. **Profile → Multi-Factor Authentication → Disable TFA**, para remover por completo o segredo do autenticador antigo, e depois reativar com o celular novo.
2. Ou **Regenerate Codes**, para obter um conjunto novo de códigos de backup sem mexer no autenticador.

#### Opção B: o usuário não tem códigos de backup nem autenticador

Um administrador precisa redefinir a conta:

1. Entre com um usuário que tenha `can_manage_users` (admin, superadmin ou qualquer papel personalizado com essa permissão).
2. Vá a **Settings → Users**.
3. Encontre o usuário afetado e clique em **Reset Password**.
4. Defina uma nova senha e passe-a por um canal seguro, fora da plataforma.

> **Redefinir a senha, por si só, não desativa o 2FA.** O usuário continua recebendo o pedido de código TOTP ou de backup depois do primeiro login com a nova senha.

Se o usuário ainda não conseguir apresentar um código, há mais duas opções:

- **Desativar e reativar a conta.** Edite o usuário, desmarque **Active** e salve (isso também apaga os dispositivos confiáveis dele); depois marque **Active** de novo. O 2FA continua ativo na conta, então isso sozinho não resolve a falta do autenticador.
- **Excluir e recriar o usuário**, como último recurso. Você perde o ID do usuário, as preferências de notificação e o que estiver ligado à conta dele, então prefira o caminho do código de backup sempre que possível.

> **Lacuna de recurso:** uma ação de administrador para "apagar o 2FA de outro usuário" está no roadmap. Se isso acontece com frequência, considere passar a sua instalação para OIDC / SSO, para que o MFA fique por conta do IdP (veja Configurando OIDC / Login único).

#### Contorno direto no banco (só auto-hospedado)

Se você hospeda o PatchMon e precisa mesmo limpar o 2FA de um usuário sem códigos de backup, um DBA pode limpar as colunas `tfa_enabled`, `tfa_secret` e `tfa_backup_codes` do usuário diretamente na tabela `users` e depois forçar uma redefinição de senha pela interface. É um último recurso. Faça backup antes e nunca faça isso no PatchMon Cloud (onde não há acesso direto ao banco).

```sql
-- Replace 'alice' with the affected username. Make a backup first.
UPDATE users
SET tfa_enabled = false,
    tfa_secret = NULL,
    tfa_backup_codes = NULL
WHERE username = 'alice';
```

(No exemplo, troque `'alice'` pelo usuário afetado.) Depois disso, o usuário consegue entrar só com a senha; ele deve se registrar de novo no 2FA pelo perfil imediatamente.

---

### Referência de variáveis de ambiente

Todas estas são lidas uma vez, na inicialização do servidor. Mudanças exigem reinício para valer. A tabela completa está na Referência de variáveis de ambiente do PatchMon; reproduzida aqui por conveniência:

| Variável | Padrão | Descrição |
|----------|---------|-------------|
| `MAX_TFA_ATTEMPTS` | `5` | Códigos de 2FA errados seguidos antes de a conta ser bloqueada temporariamente |
| `TFA_LOCKOUT_DURATION_MINUTES` | `30` | Quanto tempo dura um bloqueio de 2FA |
| `TFA_REMEMBER_ME_EXPIRES_IN` | `30d` | Quanto tempo vale um registro de dispositivo confiável "Remember me". Aceita `7d`, `30d`, `90d` etc. |
| `TFA_MAX_REMEMBER_SESSIONS` | `5` | Número máximo de dispositivos confiáveis por usuário; o mais antigo é removido quando o limite é atingido |

---

### Solução de problemas

#### "Invalid verification code" quando tenho certeza de que o código está certo

1. **Relógio fora de sincronia.** Os códigos TOTP dependem do horário. Se o relógio do seu celular estiver mais de ~30 segundos diferente do servidor, os códigos são recusados. Ative data/hora automáticas no celular. O PatchMon já tolera uma pequena diferença do lado do servidor, mas não mais que isso.
2. **Código vencido.** Os códigos TOTP mudam a cada 30 segundos. Colar um código de 60 segundos atrás ou mais vai falhar. Espere um código novo.
3. **Código de backup já usado.** Os códigos de backup são de uso único. Se já usou um, tente outro.

#### "Too many failed TFA attempts"

Você atingiu `MAX_TFA_ATTEMPTS`. Espere `TFA_LOCKOUT_DURATION_MINUTES` (padrão de 30) e tente de novo. Não há botão de "desbloquear" para o administrador; a chave de bloqueio no Redis expira sozinha. Quem hospeda o PatchMon pode apagar a chave reiniciando o Redis.

#### Marquei "Remember me", mas o 2FA continua sendo pedido

Três causas prováveis:

- O registro de confiança expirou. A duração padrão é de 30 dias; confira `TFA_REMEMBER_ME_EXPIRES_IN` no seu servidor.
- Você está entrando por outro navegador, ou numa janela privada / anônima, que não tem o cookie.
- A sua senha foi redefinida. Redefinições de senha (feitas por você ou por um administrador) revogam todos os dispositivos confiáveis como parte da resposta de segurança. Marque **Remember me** de novo no próximo pedido de 2FA.

#### A aba de MFA não aparece no meu perfil

Você entrou via OIDC. Nesse caso, o PatchMon deixa o MFA com o seu IdP. Se quiser MFA, ative-o no seu IdP (Entra ID, Authentik, Keycloak etc.).

#### Gerei novos códigos de backup, mas os antigos ainda funcionam

Os códigos antigos são invalidados no mesmo momento em que o novo lote aparece. Se um código antigo parece continuar funcionando, confira se você está na conta certa. Os códigos de backup não podem ser transferidos entre usuários.

---

## Capítulo 26: Métricas e telemetria {#metrics-and-telemetry}

### O que coletamos e por quê

Coletamos três informações sobre as instâncias do PatchMon em uso:

1. Quantidade de instalações / ambientes ativos
2. Quantidade de hosts monitorados
3. Número da versão da instância

Com isso, publicamos em [patchmon.net](https://patchmon.net) uma estatística ao vivo da adoção na comunidade e, mais importante, sabemos quantas instâncias estão numa versão antiga se for encontrado um problema de segurança.

Isso foi discutido com a comunidade no Discord; a conversa original está fixada no canal **Security**.

---

### O que **não** coletamos

- **Endereços IP.** Os IPs não são gravados em nenhum log nem armazenados quando a sua instância se comunica conosco.
- **Dados de hosts, usuários ou pacotes.** Só os três campos acima, mais um UUID aleatório da instância, que identifica a sua instalação entre os envios.

---

### Como deixar de participar

Vá a **Settings → Metrics** na interface web e desligue o agendamento. A partir daí, a sua instância para de enviar telemetria.

---

### Perguntas frequentes

#### Como apago as informações que vocês têm sobre a minha instância?

Mande um e-mail para <support@patchmon.net> com o seu UUID e removemos o seu registro do banco. É o único momento em que conseguimos associar o seu UUID à sua instância; depois de apagado, não temos mais nenhum vínculo com você.

#### O que acontece se eu gerar um novo ID de instância?

Um novo ID aparece nos nossos relatórios e é contado como uma nova instância. Não temos como saber qual instância ele substituiu. A métrica do site conta só as instâncias ativas nos últimos 7 dias, então os UUIDs antigos saem da conta depois de uma semana.

#### Posso ver o código disso?

Sim, o PatchMon é de código aberto. O coletor de métricas pode ser inspecionado no [repositório do PatchMon](https://github.com/PatchMon/PatchMon).
