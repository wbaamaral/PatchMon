---
title: "Guia de API e Integrações do PatchMon"
description: "Discord, gethomepage, Ansible, registro automático no Proxmox e as APIs REST de registro automático e de integração, com um navegador OpenAPI embutido."
lang: "pt-BR"
translation_of: "docs/patchmon-api-integrations-guide.md"
source_commit: "05576062"
---

# Guia de API e Integrações do PatchMon

Este guia trata das integrações do PatchMon com terceiros (Discord, gethomepage, Ansible, registro automático de LXC no Proxmox) e das APIs REST expostas pelo servidor (Auto-Enrollment API e Integration API). A versão publicada deste livro em patchmon.net/docs traz embutido um navegador interativo da API, gerado a partir da especificação OpenAPI do servidor.

> **Sobre esta tradução.** A interface do PatchMon está disponível apenas em inglês. Por isso, nomes de telas, abas, botões e campos aparecem aqui como estão na interface (por exemplo, **Settings → Discord Auth**). Comandos, endpoints, parâmetros, variáveis, exemplos de requisição e resposta e demais trechos de código não foram traduzidos. Em caso de divergência, vale a versão original em inglês.

## Sumário

- [Capítulo 1: Notificações no Discord](#discord-notifications)
- [Capítulo 2: Card do PatchMon no gethomepage](#gethomepage-dashboard-card)
- [Capítulo 3: Inventário dinâmico do Ansible](#ansible-dynamic-inventory)
- [Capítulo 4: Guia de registro automático de LXC no Proxmox](#proxmox-lxc-auto-enrollment-guide)
- [Capítulo 5: Documentação da Auto-Enrollment API](#auto-enrolment-api-docs)
- [Capítulo 6: Documentação da Integration API](#integration-api-documentation)

---

## Capítulo 1: Notificações no Discord {#discord-notifications}

O PatchMon se integra ao Discord de duas formas separadas e independentes:

1. **Login via OAuth2 do Discord**: permite que os usuários entrem no PatchMon com a conta do Discord, ou vinculem uma conta existente do PatchMon a uma identidade do Discord. Configurado em **Settings → Discord Auth**.
2. **Discord como destino de notificações / alertas**: envia alertas e relatórios agendados do PatchMon para um canal do Discord por um webhook de entrada. Configurado em **Settings → Alert Channels**, como um destino `webhook`.

Você pode ativar um, os dois ou nenhum. Um não depende do outro.

> **Páginas relacionadas:**
> - Usuários, papéis e RBAC: gestão de papéis e vínculo de contas
> - Configurando OIDC / Login único: outra forma de delegar o login a um IdP externo

---

### Parte 1: login via OAuth2 do Discord

Permite que os usuários se autentiquem no PatchMon com a conta do Discord. O PatchMon suporta três fluxos relacionados:

- **Entrar com o Discord** (para quem ainda não existe no PatchMon): cria uma conta automaticamente, se o autocadastro estiver ativo.
- **Entrar com o Discord** (para quem já existe): vincula automaticamente, associando o e-mail verificado do Discord ao e-mail do usuário no PatchMon.
- **Vincular o Discord a uma conta existente já conectada**: pela página de perfil, associa uma identidade do Discord à sua conta do PatchMon sem mudar a senha.

Tudo é configurado pela interface Settings. Não é preciso nenhuma variável de ambiente; os segredos ficam criptografados no banco do PatchMon.

### O resultado

- Um botão extra, **Login with Discord**, na tela de login do PatchMon.
- Criação automática de conta, opcional, no primeiro login pelo Discord (controlada pela configuração de cadastro do PatchMon).
- O avatar e o nome de usuário do Discord visíveis no perfil de cada usuário.

### Antes de começar

Você vai precisar de:

| Item | Observações |
|------|-------|
| Uma instância do PatchMon rodando | Acessível numa URL fixa, por exemplo `https://patchmon.example.com` |
| HTTPS na URL do PatchMon | O Discord exige redirect URIs em `https://` em produção |
| Uma conta de administrador do PatchMon com `can_manage_settings` | Para chegar à página de configuração Discord Auth |
| Uma conta do Discord | Para acessar o Discord Developer Portal |

### Etapa 1: descubra a sua URL de callback

O callback é derivado da URL do servidor configurada no PatchMon e aparece na tela de configurações, mas, para referência, o caminho oficial é:

```
https://patchmon.example.com/api/v1/auth/discord/callback
```

Se o PatchMon estiver mostrando o hostname errado (por exemplo, `http://localhost:3000` quando você está em produção), corrija antes a **Server URL** em **Settings → Server Config**. A URL de callback é somente leitura no painel de configurações do Discord e é refeita a partir da URL do servidor sempre que você salva.

### Etapa 2: crie uma aplicação no Discord

1. Vá ao [Discord Developer Portal](https://discord.com/developers/applications).
2. Clique em **New Application** e dê um nome a ela (por exemplo, `PatchMon`).
3. No menu à esquerda, abra **OAuth2**.
4. Em **Redirects**, clique em **Add Redirect** e cole a sua URL de callback:

   ```
   https://patchmon.example.com/api/v1/auth/discord/callback
   ```

5. Clique em **Save Changes**, no pé da página.
6. Copie o **Client ID** (que aparece no topo). Você vai colá-lo no PatchMon na próxima etapa.
7. Clique em **Reset Secret** (ou em **Copy**, se o secret já estiver visível) e guarde o valor. O Discord só o mostra uma vez; se você perder, terá de redefini-lo de novo.

> **Não** é preciso configurar um gerador de URL OAuth2 / URL de redirecionamento no Discord. O PatchMon monta a URL de autorização sozinho. O único campo que importa na interface do Discord é a lista **Redirects**.

### Etapa 3: configure o PatchMon

1. Entre no PatchMon como administrador.
2. Vá a **Settings → Discord Auth**.
3. Preencha o painel OAuth2 Configuration:
   - **Client ID**: o Application ID que aparece na visão geral da aplicação no Discord.
   - **Client Secret**: cole o secret da etapa 2 no campo e clique em **Save**. O selo **Not set** deve virar **Set** (visto verde). O PatchMon criptografa o secret em repouso com a `SECRET_ENCRYPTION_KEY` configurada.
   - **Redirect URI**: normalmente fica em branco. O PatchMon deriva o callback da URL do servidor sozinho. Só preencha se estiver atrás de um proxy que apresenta outra URL pública.
   - **Button Text**: personalize o rótulo do botão de login, por exemplo `Sign in with Discord`. O padrão é `Login with Discord`.
4. Clique em **Apply** para salvar os campos de texto.
5. No topo do painel, ligue **Enable Discord OAuth**.

### Etapa 4: teste

1. Abra o PatchMon numa janela privada / anônima do navegador.
2. Na tela de login deve aparecer o botão **Login with Discord** (ou o seu rótulo personalizado).
3. Clique nele. O Discord vai pedir para você autorizar a aplicação `PatchMon`.
4. Aceite. Você volta ao PatchMon.

#### Comportamento no primeiro login

- **Se já existe um usuário do PatchMon com o mesmo e-mail** e o e-mail do Discord está **verificado**, o PatchMon vincula as contas automaticamente. Você entra.
- **Se não existe usuário no PatchMon e o autocadastro está ligado** (**Settings → Users → User Registration Settings → Enable User Self-Registration**), o PatchMon cria uma conta nova com:
  - Nome de usuário: derivado do nome de usuário do Discord, sem os caracteres inseguros, com um sufixo numérico se o nome base já existir.
  - E-mail: o e-mail do Discord (ou `discord_<id>@discord.local`, se o Discord não expuser e-mail).
  - Papel: a configuração **Default Role for New Users**.
- **Se não existe usuário no PatchMon e o autocadastro está desligado**, o fluxo de login redireciona para `/login?error=User+not+found`. Um administrador precisa criar a conta antes; na próxima vez, o vínculo automático pelo e-mail verificado entra em ação.

### Vinculando o Discord a uma conta existente do PatchMon

É a alternativa mais segura ao "Entrar com o Discord" para quem já tem conta no PatchMon. O usuário mantém o fluxo de usuário / e-mail / senha e só ganha um selo do Discord.

1. O usuário entra no PatchMon normalmente.
2. Clica no avatar → **Profile**.
3. Rola até a seção **Linked Accounts** e clica em **Link Discord**.
4. O PatchMon o leva ao Discord para autorizar e depois de volta à página de perfil.
5. Dando certo, o perfil mostra o nome de usuário e o avatar do Discord, e uma pequena faixa de sucesso "discord_linked=true".

#### Desvinculando

No mesmo painel → **Unlink Discord**. O PatchMon se recusa a desvincular se o Discord for a única forma de login do usuário (sem senha definida e sem OIDC vinculado), porque isso trancaria o usuário do lado de fora. Defina uma senha antes, no painel **Change Password**, e tente desvincular de novo.

### Solução de problemas: login OAuth

#### O botão "Login with Discord" não aparece na tela de login

- **A chave está desligada.** Confira **Settings → Discord Auth → Enable Discord OAuth**.
- **Falta o client secret.** O selo ao lado do campo deve dizer **Set**. Se disser **Not set**, cole o secret e clique em **Save**.
- **O Client ID está em branco.** Confira no mesmo painel; o campo Client ID precisa estar preenchido.

#### Erro de redirecionamento: "The redirect URI isn't registered"

A URL para onde o Discord está sendo mandado redirecionar não bate com nada na lista **Redirects** da aplicação no Discord.

- No Developer Portal do Discord, abra a sua aplicação → **OAuth2** → **Redirects** e confirme que `https://patchmon.example.com/api/v1/auth/discord/callback` está listada **exatamente** assim. Protocolo (`https://`), host, porta e caminho precisam bater.
- Não inclua barra no final nem query string.
- Se o PatchMon estiver atrás de um proxy reverso, confirme que a **Server URL** do PatchMon reflete a URL pública, e não a interna.

#### Erro: "Discord is not fully configured"

Falta o **Client ID** ou o **Client Secret**. Preencha os dois e clique em **Apply** e em **Save**, respectivamente.

#### Erro "Already linked" ao vincular

Outro usuário do PatchMon já está vinculado àquela conta do Discord. Só um usuário do PatchMon pode ter uma dada identidade do Discord por vez.

#### A criação automática no primeiro login não aconteceu

A criação automática só roda com **Settings → Users → User Registration Settings → Enable User Self-Registration** ligado. Se estiver desligado, crie o usuário antes (com o mesmo e-mail) e tente de novo.

---

### Parte 2: Discord como destino de notificações / alertas

O PatchMon pode mandar alertas, eventos e relatórios agendados para um canal do Discord por um **webhook de entrada** (o mecanismo nativo do Discord para postar num canal a partir de um serviço externo). Isso é feito pelo canal de alerta genérico "webhook". O PatchMon detecta as URLs do Discord automaticamente e formata a mensagem como um embed do Discord.

### O resultado

- Um canal do Discord que recebe mensagens com embeds formatados para cada evento do PatchMon dos tipos que você assinou.
- Severidade indicada por cor (critical = vermelho, error = laranja, warning = amarelo, informational = azul).
- Campos estruturados conforme o tipo de evento (contêineres parados, host fora do ar, mudanças de papel de usuário etc.).
- Relatórios agendados (resumos diários / semanais / mensais) também entregues como embeds, com um trecho em texto simples e CSV anexado quando suportado.

### Etapa 1: crie um webhook de entrada no Discord

1. No Discord, abra o **servidor** (guild) dono do canal de destino.
2. Configurações do servidor → **Integrations** → **Webhooks** → **New Webhook**.
3. Dê um nome ao webhook (por exemplo, `PatchMon`), escolha o canal de destino e, se quiser, defina um avatar.
4. Clique em **Copy Webhook URL**. Você terá uma URL neste formato:

   ```
   https://discord.com/api/webhooks/1234567890/abcdefgh-ABCDEFGH1234567890
   ```

   Guarde-a bem. Qualquer um que tenha essa URL consegue postar no seu canal.

### Etapa 2: adicione o webhook ao PatchMon

1. Entre no PatchMon com um papel que tenha `can_manage_notifications`.
2. Vá a **Settings → Alert Channels**.
3. Clique em **Add Destination**.
4. Escolha **Webhook** como tipo de canal.
5. Preencha:
   - **Display Name**: por exemplo, `Ops Discord`. Qualquer rótulo que ajude a identificar o canal depois.
   - **Webhook URL**: cole a URL do webhook do Discord da etapa 1.
6. O PatchMon detecta sozinho que é uma URL do Discord (a interface mostra "Discord and Slack URLs are auto-detected for rich formatting"). Não há mais nada a configurar para o Discord.
7. Clique em **Save**.

> **Atenção:** qualquer URL que comece com `https://discord.com/api/webhooks/`, `https://discordapp.com/api/webhooks/` ou `https://www.discord.com/api/webhooks/` é tratada como Discord e formatada com embeds. As URLs do Slack são detectadas do mesmo jeito. Todo o resto é enviado como um POST JSON simples `{"title":..., "message":..., "severity":...}`, que você pode consumir com o seu próprio handler.

### Etapa 3: encaminhe os alertas para o destino

Criar o destino não encaminha nenhum evento para ele automaticamente. É preciso pelo menos uma regra de roteamento.

1. Ainda em **Settings → Alert Channels**, role até a seção **Routing Rules**.
2. Clique em **Add Rule**.
3. Escolha na lista o destino que você acabou de criar.
4. Escolha os eventos / severidades que quer enviar. O conjunto inicial recomendado:
   - `host_went_down`
   - `host_came_up`
   - `container_stopped`
   - `security_updates_available`
   - `user_tfa_disabled`
   - `account_locked`
5. Salve a regra.

O seu canal do Discord deve começar a receber notificações no próximo evento que casar. Para testar rápido, simule um host fora do ar parando o agente do PatchMon em qualquer host não crítico e esperando o próximo ciclo de check-in.

### Etapa 4 (opcional): encaminhe os relatórios agendados

Além dos alertas em tempo real, o PatchMon pode mandar um relatório-resumo periódico para o mesmo webhook.

1. Na página **Alert Channels**, role até **Scheduled Reports**.
2. Clique em **Add Schedule**.
3. Configure:
   - **Destinations**: marque o seu webhook do Discord.
   - **Frequency**: diário, dias úteis, semanal (escolha os dias) ou mensal (escolha o dia ou "last day").
   - **Delivery time**: hora e minuto no fuso horário do seu servidor.
   - **Sections**: quais seções do relatório incluir (Open alerts, Hosts by outstanding updates, Top outdated security packages).
4. Salve.

Na entrega pelo Discord, os relatórios agendados aparecem como:

- Um título com o assunto do relatório.
- Um trecho curto, em texto simples, do corpo HTML (sem as tags).
- Um rodapé **PatchMon**.
- Se houver anexo CSV configurado, ele é postado como arquivo separado, pelo upload multipart do Discord.

### Formato das mensagens

#### Alertas em tempo real

Cada evento vira um embed do Discord:

- **Title**: o título do evento (por exemplo, `Host Down: web01.example.com`).
- **Description**: a mensagem completa do evento.
- **Colour**: derivada da severidade (`critical` vermelho, `error` laranja, `warning` amarelo, `informational` azul, todo o resto cinza).
- **Fields**: campos estruturados por tipo de evento (por exemplo, em `container_stopped`: nome do host, nome do contêiner, imagem, status anterior, status novo).
- **Footer**: `PatchMon`.

#### Relatórios agendados

- **Title**: a linha de assunto do relatório.
- **Description**: trecho do corpo HTML, com as tags (inclusive blocos `<script>`) removidas.
- **Footer**: `PatchMon`.

---

### Solução de problemas: notificações

#### A URL do webhook mostra "Webhook URL is required"

O formulário recusou uma URL vazia. Cole a URL completa do webhook do Discord que você copiou na etapa 1.

#### O destino foi salvo, mas nenhuma mensagem chega ao Discord

Siga esta lista, nesta ordem:

1. **Algum evento correspondente disparou?** Veja **Alerts → Notification Logs**. Se o log não mostra nenhuma linha para o seu destino, nenhum evento casou com as suas regras de roteamento. Ajuste as regras.
2. **O log mostra falha?** Filtre o log pelo destino. Se a tentativa de entrega falhou, passe o mouse na linha para ver o erro que o Discord devolveu. Os mais comuns:
   - `401` ou `404`: o webhook foi apagado no Discord. Crie outro e atualize a URL.
   - `429 Too Many Requests`: você está batendo no limite de requisições do Discord. Reduza o volume de eventos, ou divida entre vários webhooks / canais.
3. **O PatchMon chegou a tentar?** Veja os logs do servidor do PatchMon:

   ```bash
   # Docker
   docker compose logs patchmon-server | grep -i notification
   ```

4. **A URL é mesmo do Discord?** O PatchMon só formata como embed quando o hostname da URL é `discord.com`, `discordapp.com` ou `www.discord.com` **e** o caminho contém `/api/webhooks/`. Um erro de digitação na URL (por exemplo, `discord.co`, ou sem o trecho `/api/`) cai no formato genérico de POST JSON, que o Discord recusa. Confirme que a URL contém `/api/webhooks/`.

#### As postagens saem em texto simples, sem embed

A URL não está sendo reconhecida como do Discord. Veja o último item acima e confira o hostname e o caminho exatos.

#### Tudo funciona, mas as mensagens caem no canal errado

A URL do webhook já define o canal de destino. No Discord, vá às configurações do servidor → **Integrations** → **Webhooks**, selecione o webhook e mude o **Channel**. Outra opção é criar um webhook novo para o canal certo e atualizar o PatchMon para usá-lo.

#### Quero remover o webhook direito

1. No PatchMon, em **Settings → Alert Channels**, encontre o destino e clique em **Delete**.
2. No Discord, em configurações do servidor → **Integrations** → **Webhooks**, encontre o webhook e clique em **Delete Webhook**. É o jeito confiável de revogar. Apagar só no PatchMon deixa a URL válida; se alguém tiver capturado a URL, ainda consegue postar no seu canal.

---

### Observações de segurança

#### Login OAuth

- O **Client Secret** do Discord fica criptografado no banco do PatchMon com a `SECRET_ENCRYPTION_KEY` do servidor. Confirme que essa variável de ambiente está definida e não está no valor padrão em produção.
- O vínculo de contas por e-mail só é feito quando o Discord informa que o e-mail do usuário está **verificado**, para impedir a tomada de conta por meio de um e-mail não verificado.
- O PatchMon usa **PKCE (S256)** na troca do código OAuth2 do Discord, então o código de autorização não pode ser reaproveitado mesmo que seja interceptado.
- O **state** do OAuth do Discord fica preso a uma sessão de curta duração (10 minutos) guardada no Redis; ele é de uso único e ligado a um cookie HttpOnly `discord_state`.

#### Webhooks

- As URLs de webhook do Discord são **tokens bearer**. Qualquer um com a URL consegue postar no seu canal. Trate a URL do webhook como uma senha.
- O PatchMon guarda as URLs de webhook criptografadas em repouso se houver uma `SECRET_ENCRYPTION_KEY` configurada. Sem ela, as URLs ficam em texto claro. Não deixe de definir a chave de criptografia.
- Não cole URLs de webhook em issues públicas no GitHub, capturas de tela ou canais de chat.
- Considere criar um canal e um webhook do Discord por ambiente do PatchMon (produção / homologação), para poder revogá-los de forma independente.

---

### Referência rápida

| Tarefa | Onde |
|------|-------|
| Criar / editar a aplicação OAuth no Discord | [Discord Developer Portal](https://discord.com/developers/applications) |
| Ativar o login pelo Discord no PatchMon | **Settings → Discord Auth** |
| Entrar pelo Discord | Tela de login → botão **Login with Discord** |
| Vincular uma conta existente ao Discord | **Profile → Linked Accounts → Link Discord** |
| Criar o webhook no Discord | Servidor → Settings → Integrations → Webhooks |
| Adicionar o webhook ao PatchMon | **Settings → Alert Channels → Add Destination → Webhook** |
| Encaminhar eventos para o Discord | **Settings → Alert Channels → Routing Rules** |
| Agendar relatórios-resumo para o Discord | **Settings → Alert Channels → Scheduled Reports** |
| Ver o histórico de entregas | **Alerts → Notification Logs** |

---

## Capítulo 2: Card do PatchMon no gethomepage {#gethomepage-dashboard-card}

O PatchMon expõe um endpoint dedicado, somente leitura, feito para ser consumido por um widget `customapi` do [GetHomepage](https://gethomepage.dev/) (antigo *Homepage*). Coloque um card do PatchMon na sua homepage e veja num relance o total de hosts, as atualizações pendentes e as atualizações de segurança.

> **Páginas relacionadas:**
> - [Documentação da Integration API](#integration-api-documentation): a API genérica com escopo (outro tipo de integração)
> - Usuários, papéis e RBAC: a permissão necessária para criar a API key

---

### Num relance

- **Endpoint:** `GET /api/v1/gethomepage/stats`
- **Autenticação:** HTTP Basic, com uma API key emitida pelo PatchMon e dedicada à integração com o GetHomepage
- **Tipo de widget:** [`customapi`](https://gethomepage.dev/widgets/services/customapi/) no GetHomepage
- **Campos disponíveis:** 8 métricas principais + os 3 sistemas operacionais mais comuns + o array completo `os_distribution`
- **Limite de requisições:** compartilha o limite padrão da API; o GetHomepage consulta a cada 60 segundos, bem dentro do limite

#### Widget padrão

De fábrica, o widget mostra três métricas:

- **Total Hosts**
- **Hosts Needing Updates**
- **Security Updates**

Dá para acrescentar outras editando os `mappings:` no `services.yml` do GetHomepage. Veja [Opções de configuração](#configuration-options), abaixo.

---

### Pré-requisitos {#prerequisites}

- Uma instância do PatchMon 2.x rodando e alcançável a partir da máquina que roda o GetHomepage.
- O GetHomepage já instalado e mostrando pelo menos uma página.
- Caminho de rede entre o GetHomepage e o PatchMon, por HTTP ou HTTPS. HTTPS é muito recomendado.
- Acesso de administrador no PatchMon (é preciso `can_manage_settings` para criar API keys).

---

### Configuração

#### Etapa 1: crie uma API key para o GetHomepage

1. Entre no PatchMon como administrador.
2. Vá a **Settings → Integrations**.
3. Abra a aba **GetHomepage**.
4. Clique em **New API Key** e preencha:
   - **Token Name**: por exemplo, `GetHomepage dashboard`.
   - **Allowed IP Addresses** *(opcional)*: restrinja ao IP da máquina que roda o GetHomepage.
   - **Expiration Date** *(opcional)*: defina uma data se a chave for temporária.
5. Clique em **Create Token**.

#### Etapa 2: copie as credenciais

Aparece uma janela de sucesso com:

- **Token Key**: o usuário da API.
- **Token Secret**: a senha da API. **Aparece uma única vez. Guarde na hora.**
- **Base64-encoded credentials**: o valor `Authorization: Basic` já montado, pronto para colar.
- **Complete widget configuration**: um trecho YAML pronto para usar.

> Clique em **Copy Config** para copiar o bloco YAML inteiro. Depois que você fecha esta janela, o secret não pode mais ser recuperado. Se perdê-lo, terá de excluir a chave e criar outra.

#### Etapa 3: configure o GetHomepage

##### Opção A: cole o YAML copiado (o mais rápido)

1. Abra o `services.yml` do GetHomepage.
2. Cole o bloco YAML que o PatchMon forneceu.
3. Salve o arquivo.
4. Reinicie o GetHomepage.

O YAML é assim:

```yaml
- PatchMon:
    href: https://patchmon.example.com
    description: PatchMon Statistics
    icon: https://patchmon.example.com/assets/favicon.svg
    widget:
      type: customapi
      url: https://patchmon.example.com/api/v1/gethomepage/stats
      headers:
        Authorization: Basic <base64_encoded_credentials>
      mappings:
        - field: total_hosts
          label: Total Hosts
        - field: hosts_needing_updates
          label: Needs Updates
        - field: security_updates
          label: Security Updates
```

##### Opção B: monte à mão

1. Codifique as credenciais:

   ```bash
   echo -n "YOUR_TOKEN_KEY:YOUR_TOKEN_SECRET" | base64
   ```

2. Cole o widget no `services.yml`, trocando `<your_base64_credentials>` pelo resultado:

   ```yaml
   - PatchMon:
       href: https://patchmon.example.com
       description: PatchMon Statistics
       icon: https://patchmon.example.com/assets/favicon.svg
       widget:
         type: customapi
         url: https://patchmon.example.com/api/v1/gethomepage/stats
         headers:
           Authorization: Basic <your_base64_credentials>
         mappings:
           - field: total_hosts
             label: Total Hosts
           - field: hosts_needing_updates
             label: Needs Updates
           - field: security_updates
             label: Security Updates
   ```

3. Reinicie o GetHomepage:

   ```bash
   docker restart gethomepage
   # or
   systemctl restart gethomepage
   ```

---

### Opções de configuração {#configuration-options}

#### Escolhendo os campos exibidos

A configuração padrão mostra **3 métricas**, e dá para acrescentar mais. O PatchMon devolve **8 métricas numéricas** e os 3 sistemas operacionais mais comuns, e o widget acomoda bem de 6 a 8 antes de ficar poluído.

Cada entrada de `mappings` tem duas partes:

- `field:` a chave JSON devolvida pela API do PatchMon (diferencia maiúsculas e minúsculas, exatamente como na lista abaixo)
- `label:` o rótulo legível que o GetHomepage exibe

#### Campos disponíveis

| Campo | Tipo | Descrição | Incluído por padrão |
|-------|------|-------------|---------------------|
| `total_hosts` | Número | Total de hosts no PatchMon, igual ao card Total Hosts do painel | Sim |
| `hosts_needing_updates` | Número | Hosts com pelo menos um pacote desatualizado | Sim |
| `security_updates` | Número | Total de atualizações de segurança disponíveis em todos os hosts | Sim |
| `up_to_date_hosts` | Número | Hosts sem nenhum pacote desatualizado | Não |
| `total_outdated_packages` | Número | Soma de todos os pacotes desatualizados nos hosts | Não |
| `hosts_with_security_updates` | Número | Hosts que precisam de pelo menos um patch de segurança | Não |
| `total_repos` | Número | Repositórios ativos monitorados | Não |
| `recent_updates_24h` | Número | Atualizações bem-sucedidas nas últimas 24 horas | Não |
| `top_os_1_name` | String | Nome do sistema operacional mais comum (por exemplo, "Ubuntu") | Não (use o label; veja abaixo) |
| `top_os_1_count` | Número | Quantidade do sistema operacional mais comum | Não |
| `top_os_2_name` | String | Nome do 2º sistema operacional mais comum | Não |
| `top_os_2_count` | Número | Quantidade do 2º sistema operacional mais comum | Não |
| `top_os_3_name` | String | Nome do 3º sistema operacional mais comum | Não |
| `top_os_3_count` | Número | Quantidade do 3º sistema operacional mais comum | Não |
| `os_distribution` | Array | Distribuição completa de sistemas operacionais (só para uso avançado; o GetHomepage não exibe arrays diretamente) | Não |
| `last_updated` | String (ISO 8601) | Momento em que as estatísticas foram geradas | Não |

> Os campos de texto `top_os_*_name` aparecem mal em widgets `customapi`. Use os campos `_count` correspondentes e ponha o nome do sistema no `label:`. Veja [Exibindo a distribuição de sistemas operacionais](#displaying-os-distribution).

#### Receita rápida: acrescente uma quarta métrica

**Antes:**

```yaml
mappings:
  - field: total_hosts
    label: Total Hosts
  - field: hosts_needing_updates
    label: Needs Updates
  - field: security_updates
    label: Security Updates
```

**Depois:**

```yaml
mappings:
  - field: total_hosts
    label: Total Hosts
  - field: hosts_needing_updates
    label: Needs Updates
  - field: security_updates
    label: Security Updates
  - field: recent_updates_24h      # newly added
    label: Updated (24h)
```

Salve, reinicie o GetHomepage, e você passou de 3 para 4 métricas.

---

### Exemplos de configuração do widget

Todos os exemplos partem do princípio de que você já preencheu o cabeçalho `Authorization` com as suas credenciais codificadas.

#### Widget focado em segurança

```yaml
widget:
  type: customapi
  url: https://patchmon.example.com/api/v1/gethomepage/stats
  headers:
    Authorization: Basic <credentials>
  mappings:
    - field: security_updates
      label: Security Patches
    - field: hosts_with_security_updates
      label: Hosts at Risk
    - field: hosts_needing_updates
      label: Total Pending
```

#### Widget de repositórios / cobertura

```yaml
widget:
  type: customapi
  url: https://patchmon.example.com/api/v1/gethomepage/stats
  headers:
    Authorization: Basic <credentials>
  mappings:
    - field: total_repos
      label: Repositories
    - field: total_hosts
      label: Managed Hosts
    - field: up_to_date_hosts
      label: Up-to-Date
```

#### Widget de atividade

```yaml
widget:
  type: customapi
  url: https://patchmon.example.com/api/v1/gethomepage/stats
  headers:
    Authorization: Basic <credentials>
  mappings:
    - field: recent_updates_24h
      label: Updated (24h)
    - field: hosts_needing_updates
      label: Pending Updates
    - field: up_to_date_hosts
      label: Fully Patched
```

#### Widget com o máximo de informação (as 8 métricas numéricas)

```yaml
widget:
  type: customapi
  url: https://patchmon.example.com/api/v1/gethomepage/stats
  headers:
    Authorization: Basic <credentials>
  mappings:
    - field: total_hosts
      label: Total Hosts
    - field: hosts_needing_updates
      label: Needs Updates
    - field: up_to_date_hosts
      label: Up-to-Date
    - field: security_updates
      label: Security Updates
    - field: hosts_with_security_updates
      label: Security Hosts
    - field: total_outdated_packages
      label: Outdated Packages
    - field: total_repos
      label: Repositories
    - field: recent_updates_24h
      label: Updated (24h)
```

Este widget fica bem alto. Na maioria dos layouts, fique entre 3 e 5 métricas.

#### Vários ambientes

```yaml
# Production - security-focused
- PatchMon Prod:
    href: https://patchmon-prod.example.com
    description: Production Patches
    icon: https://patchmon-prod.example.com/assets/favicon.svg
    widget:
      type: customapi
      url: https://patchmon-prod.example.com/api/v1/gethomepage/stats
      headers:
        Authorization: Basic <prod_credentials>
      mappings:
        - field: total_hosts
          label: Hosts
        - field: security_updates
          label: Security
        - field: hosts_needing_updates
          label: Pending

# Development - package-focused
- PatchMon Dev:
    href: https://patchmon-dev.example.com
    description: Development Patches
    icon: https://patchmon-dev.example.com/assets/favicon.svg
    widget:
      type: customapi
      url: https://patchmon-dev.example.com/api/v1/gethomepage/stats
      headers:
        Authorization: Basic <dev_credentials>
      mappings:
        - field: total_hosts
          label: Hosts
        - field: total_outdated_packages
          label: Packages
        - field: up_to_date_hosts
          label: Updated
```

---

### Exibindo a distribuição de sistemas operacionais {#displaying-os-distribution}

#### Etapa 1: descubra os seus 3 sistemas operacionais mais comuns

```bash
curl -s -H "Authorization: Basic YOUR_BASE64_CREDENTIALS" \
  https://patchmon.example.com/api/v1/gethomepage/stats \
  | jq '{top_os_1_name, top_os_1_count, top_os_2_name, top_os_2_count, top_os_3_name, top_os_3_count}'
```

Exemplo de saída:

```json
{
  "top_os_1_name": "Ubuntu",
  "top_os_1_count": 35,
  "top_os_2_name": "Debian",
  "top_os_2_count": 18,
  "top_os_3_name": "Rocky Linux",
  "top_os_3_count": 12
}
```

#### Etapa 2: acrescente as contagens ao widget, usando os nomes como rótulos

```yaml
mappings:
  - field: total_hosts
    label: Total Hosts
  - field: top_os_1_count
    label: Ubuntu          # from top_os_1_name
  - field: top_os_2_count
    label: Debian          # from top_os_2_name
  - field: top_os_3_count
    label: Rocky Linux     # from top_os_3_name
```

#### Etapa 3: reinicie o GetHomepage

```bash
docker restart gethomepage
# or
systemctl restart gethomepage
```

O widget passa a mostrar a distribuição de sistemas operacionais da sua infraestrutura. Se os 3 mais comuns mudarem com o tempo, atualize os rótulos; o PatchMon reordena as contagens sozinho, conforme o número real de hosts.

#### Ícone personalizado

```yaml
# PatchMon logo
icon: https://patchmon.example.com/assets/favicon.svg
icon: https://patchmon.example.com/assets/logo_dark.png
icon: https://patchmon.example.com/assets/logo_light.png

# GetHomepage built-in icon
icon: server

# Local icon inside your GetHomepage image / volume
icon: /icons/patchmon.png
```

---

### Referência da API {#api-reference}

#### Endpoints

| Método | Caminho | Descrição |
|--------|------|-------------|
| `GET` | `/api/v1/gethomepage/stats` | Devolve o payload do widget descrito acima |
| `GET` | `/api/v1/gethomepage/health` | Probe simples de liveness. Devolve `status: "ok"`, o horário atual e o nome da API key usada. |

#### Autenticação {#authentication}

- **Tipo:** HTTP Basic Authentication
- **Formato:** `Authorization: Basic <base64(token_key:token_secret)>`
- **Tipo de token:** `gethomepage` (verificado no servidor; uma credencial criada na aba **API** não funciona aqui, e vice-versa)

#### Resposta de stats

```json
{
  "total_hosts": 42,
  "total_outdated_packages": 156,
  "total_repos": 12,
  "hosts_needing_updates": 15,
  "up_to_date_hosts": 27,
  "security_updates": 23,
  "hosts_with_security_updates": 8,
  "recent_updates_24h": 34,
  "os_distribution": [
    { "name": "Ubuntu",     "count": 20, "os_type": "linux", "os_version": "22.04" },
    { "name": "Debian",     "count": 12, "os_type": "linux", "os_version": "12" },
    { "name": "Rocky Linux", "count": 10, "os_type": "linux", "os_version": "9" }
  ],
  "top_os_1_name": "Ubuntu",
  "top_os_1_count": 20,
  "top_os_2_name": "Debian",
  "top_os_2_count": 12,
  "top_os_3_name": "Rocky Linux",
  "top_os_3_count": 10,
  "last_updated": "2026-04-24T12:34:56Z"
}
```

#### Resposta de health

```json
{
  "status": "ok",
  "timestamp": "2026-04-24T12:34:56Z",
  "api_key": "GetHomepage dashboard"
}
```

---

### Gerenciando as API keys

#### Vendo as chaves existentes

Vá a **Settings → Integrations → GetHomepage**. Para cada chave, você vê:

- Nome do token
- Data de criação
- Horário do último uso
- Estado Active / Inactive
- Data de expiração (se definida)

#### Desativar / ativar / excluir

- **Disable / Enable**: use o botão na linha para bloquear ou restaurar o acesso temporariamente, sem excluir a credencial.
- **Delete**: clique no ícone de lixeira. É permanente; qualquer widget que use essa chave passa a receber 401.

#### Recursos de segurança

- **Restrição por IP**: lista de IPs permitidos por chave (aceita CIDRs).
- **Datas de expiração**: desativação automática.
- **Registro do último uso**: identifica chaves que pararam de funcionar sem aviso, ou uso suspeito.
- **Secret exibido uma vez**: o secret aparece uma única vez, na criação. Nunca mais.

---

### Solução de problemas {#troubleshooting}

#### Erro: "Missing or invalid authorization header"

O GetHomepage não está enviando o cabeçalho `Authorization` corretamente.

- Confira se a seção `headers:` está bem indentada no `services.yml`.
- Codifique as credenciais de novo; use `-n` no `echo`, para não ir uma quebra de linha no fim do base64.
- Confirme que está usando `type: customapi`, porque os outros tipos de widget ignoram cabeçalhos arbitrários.

#### Erro: "Invalid API key"

A chave não existe no PatchMon.

- Procure a chave em **Settings → Integrations → GetHomepage**.
- Se não existir, crie de novo e atualize a configuração do GetHomepage com as novas credenciais.

#### Erro: "API key is disabled" / "API key has expired"

Ative a chave ou crie uma nova com uma expiração mais distante.

#### Erro: "IP address not allowed"

O IP de saída da sua instância do GetHomepage não está na lista de permitidos da credencial. Acrescente-o, ou remova a lista se ela não for necessária.

#### O widget não mostra nada

Siga esta lista de verificação:

- O GetHomepage alcança o PatchMon? Teste com `curl` de dentro do contêiner do GetHomepage: `curl -v https://patchmon.example.com/api/v1/gethomepage/health -H "Authorization: Basic ..."`
- A API key está ativa e dentro da validade?
- A credencial em base64 está correta?
- O `services.yml` é um YAML válido? (rode `yamllint services.yml` se estiver em dúvida)
- O GetHomepage foi reiniciado depois da última mudança?
- Veja nos logs do contêiner do GetHomepage se há mensagens de erro.

#### Testando o endpoint diretamente

```bash
# Step 1: encode
echo -n "your_key:your_secret" | base64

# Step 2: test
curl -H "Authorization: Basic YOUR_BASE64" \
     https://patchmon.example.com/api/v1/gethomepage/stats | jq
```

Qualquer campo numérico da resposta (inclusive `top_os_*_count`) pode ser usado num mapeamento do widget.

---

### Boas práticas de segurança {#security-best-practices}

- **Use sempre HTTPS.** As credenciais vão em cada consulta de 60 segundos. Não as deixe trafegar em texto claro.
- **Restrinja a chave por IP** ao IP da instância do GetHomepage.
- **Dê uma expiração à chave** e troque-a dentro da sua rotina normal de rotação de credenciais.
- **Acompanhe o horário do último uso** para identificar atividade suspeita.
- **Uma chave por instância do GetHomepage**, se você roda várias, para facilitar a rotação e a revogação.
- **Guarde o `services.yml` com permissões de arquivo adequadas** no host do GetHomepage.

---

### Arquitetura da integração

```
┌──────────────────┐
│   GetHomepage    │
│    Dashboard     │
└────────┬─────────┘
         │
         │ HTTP(S) GET, every 60s
         │ Authorization: Basic <base64>
         │
         ▼
┌──────────────────┐
│    PatchMon      │
│   API server     │
│                  │
│ /api/v1/         │
│ gethomepage/     │
│   stats          │
└────────┬─────────┘
         │
         │ Aggregate query
         │
         ▼
┌──────────────────┐
│   PostgreSQL     │
│                  │
│  - Hosts         │
│  - Packages      │
│  - Updates       │
│  - Repositories  │
└──────────────────┘
```

---

### Limite de requisições {#rate-limiting}

Os endpoints `/api/v1/gethomepage/*` seguem o limite geral de requisições da API do PatchMon, por padrão de 100 requisições a cada 15 minutos por IP. O intervalo de consulta padrão do GetHomepage, de 60 segundos, fica bem dentro desse limite (15 requisições a cada 15 minutos). Se você reduzir muito o intervalo de consulta do GetHomepage, pode começar a receber `429 Too Many Requests`; fique acima de 10 segundos.

---

### Suporte e recursos

- **Documentação do PatchMon:** [patchmon.net/docs](https://patchmon.net/docs)
- **Documentação do GetHomepage:** [gethomepage.dev](https://gethomepage.dev)
- **Discord do PatchMon:** [patchmon.net/discord](https://patchmon.net/discord)
- **Issues no GitHub:** [github.com/PatchMon/PatchMon/issues](https://github.com/PatchMon/PatchMon/issues)

---

## Capítulo 3: Inventário dinâmico do Ansible {#ansible-dynamic-inventory}

O plugin **patchmon.dynamic_inventory** do Ansible consulta a Integration API com escopo do PatchMon e a transforma num inventário do Ansible ao vivo. Os hosts e os grupos a que eles pertencem ficam sincronizados com o PatchMon automaticamente, e você deixa de editar o `hosts.ini` à mão.

- **Repositório no GitHub:** [github.com/PatchMon/PatchMon-ansible](https://github.com/PatchMon/PatchMon-ansible)
- **Namespace no Ansible Galaxy:** `patchmon.dynamic_inventory`
- **Licença:** AGPL-3.0-or-later

> **Páginas relacionadas:**
> - [Documentação da Integration API](#integration-api-documentation): referência completa dos endpoints com escopo `/api/v1/api/...` com que o plugin conversa
> - [Documentação da Auto-Enrollment API](#auto-enrolment-api-docs): como criar as credenciais Basic Auth de que este plugin precisa

---

### O que o plugin faz

A cada requisição, o plugin:

1. Chama `GET /api/v1/api/hosts` na sua instância do PatchMon, com HTTP Basic Auth.
2. Recebe uma lista JSON dos hosts ativos, com os IPs e os grupos de hosts do PatchMon a que pertencem.
3. Monta em memória um inventário do Ansible:
   - Cada host do PatchMon vira um host do Ansible, identificado pelo `hostname`.
   - `ansible_host` recebe o campo `ip` do host (assim o Ansible se conecta direto ao IP, mesmo que o DNS esteja instável).
   - Cada **grupo de hosts** do PatchMon vira um grupo do Ansible, e o host é incluído nele.

O resultado é uma árvore `ansible-inventory --list` totalmente dinâmica, definida pelos agrupamentos do PatchMon.

---

### Requisitos

| Componente | Versão mínima |
|-----------|-----------------|
| Ansible | 2.19.0 |
| Python | 3.6 |
| `requests` | 2.25.1 |

Instale a dependência Python na máquina que roda o `ansible`:

```bash
pip install 'requests>=2.25.1'
```

---

### Instalação

#### Pelo Ansible Galaxy (recomendado)

```bash
ansible-galaxy collection install patchmon.dynamic_inventory
```

#### A partir do código-fonte

```bash
git clone https://github.com/PatchMon/PatchMon-ansible.git
cd PatchMon-ansible/patchmon/dynamic_inventory

# Build the collection tarball
ansible-galaxy collection build

# Install it locally
ansible-galaxy collection install patchmon-dynamic_inventory-*.tar.gz

# Install Python dependencies
pip install -r requirements.txt
```

---

### Criando uma credencial de API no PatchMon

O plugin se autentica como uma credencial da **integration API** (um dos tokens Basic Auth com escopo gerenciados pela Integration API do PatchMon). **Não** é a senha de um usuário comum.

1. Entre no PatchMon com um usuário que tenha `can_manage_settings`.
2. Vá a **Settings → Integrations** e escolha a aba **API**.
3. Clique em **Create API Key** e preencha:
   - **Name**: por exemplo, `Ansible inventory`
   - **Scopes**: no mínimo, `host:read`. Se quiser que o plugin também leia as estatísticas dos hosts, acrescente os outros escopos de leitura. A lista completa de escopos está na [Documentação da Integration API](#integration-api-documentation).
   - **Allowed IP addresses** (opcional): restrinja a credencial ao IP público do seu controlador Ansible.
   - **Expiration** (opcional): defina uma data se a credencial for temporária.
4. Clique em **Create**.
5. **Copie o secret na hora.** Ele aparece uma única vez. Guarde o **Token Key** (o usuário) e o **Token Secret** (a senha).

> O valor de configuração `api_key` do plugin é o **Token Key** do PatchMon. O `api_secret` do plugin é o **Token Secret** do PatchMon. Os rótulos são diferentes, mas o significado é o mesmo.

---

### Configuração

Crie um arquivo de inventário, por exemplo `patchmon_inventory.yml`:

```yaml
---
plugin: patchmon.dynamic_inventory
api_url: https://patchmon.example.com/api/v1/api/hosts/
api_key: your_token_key
api_secret: your_token_secret
verify_ssl: true
```

#### Opções de configuração

| Opção | Obrigatória | Padrão | Descrição |
|--------|----------|---------|-------------|
| `plugin` | sim | (obrigatório) | Precisa ser `patchmon.dynamic_inventory` |
| `api_url` | sim | (obrigatório) | URL do endpoint de hosts com escopo do PatchMon. No PatchMon 2.x é `https://<your-patchmon-host>/api/v1/api/hosts/` |
| `api_key` | sim | (obrigatório) | O **Token Key** da credencial de API do PatchMon |
| `api_secret` | sim | (obrigatório) | O **Token Secret** da credencial de API do PatchMon |
| `verify_ssl` | não | `true` | Se o certificado TLS do servidor do PatchMon deve ser verificado. Só desative em ambientes internos de desenvolvimento com certificados autoassinados |

#### Usando variáveis de ambiente e o Ansible Vault

Não é recomendado colocar o secret fixo no `patchmon_inventory.yml`. Use o lookup de variáveis de ambiente do Ansible ou o Ansible Vault:

```yaml
---
plugin: patchmon.dynamic_inventory
api_url: https://patchmon.example.com/api/v1/api/hosts/
api_key: "{{ lookup('env', 'PATCHMON_API_KEY') }}"
api_secret: "{{ lookup('env', 'PATCHMON_API_SECRET') }}"
verify_ssl: true
```

Depois:

```bash
export PATCHMON_API_KEY=your_token_key
export PATCHMON_API_SECRET=your_token_secret
ansible-inventory -i patchmon_inventory.yml --list
```

#### Tornando-o o inventário padrão

Acrescente ao seu `ansible.cfg`:

```ini
[defaults]
inventory = patchmon_inventory.yml

[inventory]
enable_plugins = patchmon.dynamic_inventory.dynamic_inventory
```

Toda chamada de `ansible` / `ansible-playbook` / `ansible-inventory` feita a partir deste diretório passa a usar o PatchMon como fonte da verdade.

---

### Uso

#### Listar todos os hosts

```bash
ansible-inventory -i patchmon_inventory.yml --list
```

#### Fazer ping em todos os hosts

```bash
ansible all -i patchmon_inventory.yml -m ping
```

#### Rodar um playbook num grupo de hosts do PatchMon

Se o seu grupo de hosts no PatchMon se chama `web_servers`, o nome do grupo no Ansible também é `web_servers`:

```bash
ansible-playbook -i patchmon_inventory.yml playbook.yml --limit web_servers
```

#### Cruzar vários grupos

Vale a sintaxe padrão de padrões de grupo do Ansible. Por exemplo, para atingir todos os hosts que estão em `web_servers` **e** em `production`:

```bash
ansible-playbook -i patchmon_inventory.yml playbook.yml --limit 'web_servers:&production'
```

---

### Formato da resposta da API

O plugin espera que o endpoint da API do PatchMon devolva um JSON neste formato:

```json
{
  "hosts": [
    {
      "hostname": "server1.example.com",
      "ip": "192.168.1.10",
      "host_groups": [
        { "name": "web_servers" },
        { "name": "production" }
      ]
    },
    {
      "hostname": "server2.example.com",
      "ip": "192.168.1.11",
      "host_groups": [
        { "name": "db_servers" },
        { "name": "production" }
      ]
    }
  ],
  "total": 2
}
```

É o formato devolvido por `GET /api/v1/api/hosts` no PatchMon 2.x (o array `host_groups` também traz um campo `id`, que o plugin ignora).

#### Correspondência no inventário

- **Nome do host**: `hostname` vira a chave no inventário do Ansible.
- **IP de conexão**: `ip` vira a variável `ansible_host` daquele host.
- **Grupos**: cada `{ "name": "...", "id": "..." }` em `host_groups` vira um grupo do Ansible, e o host é incluído nele.

Hosts sem nenhuma entrada em `host_groups` caem no grupo nativo `ungrouped` do Ansible.

---

### Exemplos

#### Saída do inventário listado

```bash
ansible-inventory -i patchmon_inventory.yml --list
```

Exemplo de saída:

```json
{
  "_meta": {
    "hostvars": {
      "server1.example.com": { "ansible_host": "192.168.1.10" },
      "server2.example.com": { "ansible_host": "192.168.1.11" }
    }
  },
  "all": {
    "children": ["ungrouped", "web_servers", "db_servers", "production"]
  },
  "db_servers":   { "hosts": ["server2.example.com"] },
  "production":   { "hosts": ["server1.example.com", "server2.example.com"] },
  "web_servers":  { "hosts": ["server1.example.com"] }
}
```

#### Atingir grupos específicos

```bash
ansible-playbook -i patchmon_inventory.yml playbook.yml --limit web_servers
ansible-playbook -i patchmon_inventory.yml playbook.yml --limit production
```

#### Filtrando no nível da API

A API com escopo `/api/v1/api/hosts` também aceita o parâmetro de query `?hostgroup=`. Se você quer que uma chamada do plugin devolva, por exemplo, só o grupo `production`, defina:

```yaml
api_url: https://patchmon.example.com/api/v1/api/hosts/?hostgroup=production
```

Isso reduz o tamanho do payload e é útil quando você tem milhares de hosts e quer que o Ansible veja só uma parte.

---

### Autenticação e SSL

O plugin usa **HTTP Basic Authentication**. O cabeçalho `Authorization` que ele envia é `Basic base64(api_key:api_secret)`.

A verificação do certificado SSL vem ligada por padrão (`verify_ssl: true`). Só a desative em testes contra uma instância interna com certificado autoassinado, e nunca em produção.

---

### Solução de problemas

#### Teste o endpoint da API diretamente

```bash
curl -u "TOKEN_KEY:TOKEN_SECRET" https://patchmon.example.com/api/v1/api/hosts
```

Deve voltar um documento JSON com um array `hosts`. Se não voltar, confira:

- A URL. O PatchMon 2.x expõe o endpoint em `/api/v1/api/hosts` (atenção ao `/api/` repetido).
- A credencial. Use o **Token Key** como usuário e o **Token Secret** como senha, e não o login de um usuário comum do PatchMon.
- Se a credencial tem o escopo `host:read` (ou não tem escopo).
- Se a eventual lista de IPs permitidos da credencial inclui o IP de onde o Ansible está chamando.

#### Depure o inventário

```bash
ansible-inventory -i patchmon_inventory.yml --list --debug
ansible-inventory -i patchmon_inventory.yml --list -vvv
```

Procure na saída detalhada por 401 Unauthorized (credenciais erradas) ou 403 Forbidden (escopo faltando / restrição de IP).

#### Problemas comuns

| Sintoma | Causa provável | Correção |
|---------|--------------|-----|
| `401 Unauthorized` | Token key ou secret errados | Gere a credencial de novo em **Settings → Integrations** |
| `403 Forbidden` com "IP address not allowed" | A lista de permitidos da credencial bloqueia o controlador | Edite a credencial e acrescente o IP público do controlador, ou remova a lista |
| `403 Forbidden` com "Insufficient scope" | A credencial não tem `host:read` | Edite a credencial e marque o escopo `host:read` |
| Erro de certificado SSL | Certificado autoassinado, ou `verify_ssl: true` contra uma PKI interna | Instale a cadeia da CA no controlador, ou defina temporariamente `verify_ssl: false` |
| Inventário vazio | Não há hosts no PatchMon, ou o filtro `?hostgroup=` não casa com nada | Teste antes com `curl`; confira a grafia do nome do grupo |
| Erros de parsing do JSON | A URL da API aponta para o caminho errado (por exemplo, `/api/v1/hosts` em vez de `/api/v1/api/hosts`) | Corrija a URL. A API com escopo fica em `/api/v1/api/` |

---

### Boas práticas de segurança

- **Crie uma credencial exclusiva para o Ansible.** Não reaproveite a mesma API key em várias ferramentas. Se uma vazar, você quer revogar só aquela.
- **Restrinja o escopo ao mínimo.** `host:read` basta para o inventário; não conceda mais que isso.
- **Restrinja a credencial por IP** ao(s) seu(s) controlador(es) Ansible.
- **Defina uma expiração** na credencial e troque-a dentro da sua rotina normal de rotação de chaves.
- **Guarde o secret no Vault.** Use `ansible-vault encrypt_string` ou uma variável de ambiente. Nunca faça commit de segredos em texto claro no git.
- **Use sempre HTTPS** e `verify_ssl: true` em produção.

---

### Contribuindo

Pull requests são bem-vindos no [PatchMon-ansible](https://github.com/PatchMon/PatchMon-ansible). Issues e pedidos de recurso podem ser abertos em [PatchMon-ansible/issues](https://github.com/PatchMon/PatchMon-ansible/issues).

---

## Capítulo 4: Guia de registro automático de LXC no Proxmox {#proxmox-lxc-auto-enrollment-guide}

### Visão geral {#overview}

O recurso de registro automático do Proxmox no PatchMon descobre os contêineres LXC dos seus hosts Proxmox e os registra no PatchMon automaticamente, para a gestão centralizada de patches. Isso elimina o cadastro manual de hosts e garante a cobertura completa da sua infraestrutura Proxmox.

#### O que ele faz

- **Descobre automaticamente** os contêineres LXC em execução nos hosts Proxmox
- **Registra em massa** os contêineres no PatchMon, sem intervenção manual  
- **Instala o agente** dentro de cada contêiner, automaticamente
- **Atribui a grupos de hosts** conforme a configuração do token
- **Registra o histórico de cadastro**, com log de auditoria completo

#### Principais vantagens

- **Registro sem intervenção** - roda uma vez e registra todos os contêineres
- **Seguro desde o projeto** - autenticação por token, com segredos em hash
- **Limite de ritmo** - evita abuso com limites de hosts por dia
- **Restrição por IP** - lista de IPs permitidos opcional, para mais segurança
- **Totalmente auditável** - registra quem cadastrou o quê e quando
- **Seguro para rodar de novo** - contêineres já registrados são pulados automaticamente

### Sumário

- [Como funciona](#how-it-works)
- [Pré-requisitos](#prerequisites)
- [Início rápido](#quick-start)
- [Configuração passo a passo](#step-by-step-setup)
- [Exemplos de uso](#usage-examples)
- [Opções de configuração](#configuration-options)
- [Boas práticas de segurança](#security-best-practices)
- [Solução de problemas](#troubleshooting)
- [Uso avançado](#advanced-usage)
- [Referência da API](#api-reference)

### Como funciona {#how-it-works}

#### Visão geral da arquitetura

```
┌─────────────────────┐
│   PatchMon Admin    │
│                     │
│  1. Creates Token   │
│  2. Gets Key/Secret │
└──────────┬──────────┘
           │
           ├─────────────────────────────────┐
           ▼                                 ▼
┌─────────────────────┐          ┌─────────────────────┐
│  Proxmox Host       │          │   PatchMon Server   │
│                     │          │                     │
│  3. Runs Script ────┼──────────▶  4. Validates Token │
│  4. Discovers LXCs  │          │  5. Creates Hosts   │
│  5. Gets Credentials│◀─────────┤  6. Returns Creds   │
│  6. Installs Agents │          │                     │
└──────────┬──────────┘          └─────────────────────┘
           │
           ▼
┌─────────────────────┐
│   LXC Containers    │
│                     │
│  • curl installed   │
│  • Agent installed  │
│  • Reporting to PM  │
└─────────────────────┘
```

#### O processo de registro, passo a passo

1. **O administrador cria um token de registro automático** na interface do PatchMon
   - Configura os limites de ritmo, as restrições de IP e a atribuição de grupo de hosts
   - Recebe o `token_key` e o `token_secret` (mostrados uma única vez!)

2. **O administrador roda o script de registro** no host Proxmox
   - O script se autentica com o token de registro automático
   - Descobre todos os contêineres LXC em execução com `pct list`

3. **Para cada contêiner**, o script:
   - Reúne hostname, endereço IP, informações do sistema operacional e machine ID
   - Chama a API do PatchMon para criar o registro do host
   - Recebe um `api_id` e uma `api_key` exclusivos daquele contêiner
   - Usa `pct exec` para entrar no contêiner
   - Instala o curl, se faltar
   - Baixa e roda o instalador do agente do PatchMon
   - O agente se autentica com as credenciais daquele contêiner

4. **Os contêineres aparecem no PatchMon** com o acompanhamento completo de patches ativo

#### Modelo de segurança em duas camadas

**1. Token de registro automático** (script → PatchMon)
- **Finalidade**: criar novos registros de host
- **Escopo**: limitado às operações de registro
- **Armazenamento**: o secret fica em hash no banco
- **Duração**: reutilizável até ser revogado ou expirar
- **Segurança**: limites de ritmo + restrições de IP

**2. Credenciais de API do host** (agente → PatchMon)
- **Finalidade**: reportar patches, enviar dados, receber comandos
- **Escopo**: credenciais exclusivas por host
- **Armazenamento**: a API key fica em hash (bcrypt) no banco
- **Duração**: permanente para aquele host
- **Segurança**: específica do host, pode ser gerada de novo

**Por que isso importa:**
- Token de registro comprometido ≠ hosts comprometidos
- Credencial de host comprometida ≠ registro comprometido
- Token de registro revogado = nenhum registro novo (os hosts existentes não são afetados)
- Credenciais perdidas = crie um token novo, sem afetar a infraestrutura existente

### Pré-requisitos

#### Requisitos do servidor do PatchMon

- Versão do PatchMon com suporte a registro automático
- Usuário administrador com a permissão "Manage Settings"
- Acessível pela rede a partir dos hosts Proxmox

#### Requisitos do host Proxmox

- Proxmox VE instalado e rodando
- Um ou mais contêineres LXC (VMs não são suportadas)
- Acesso root ao host Proxmox
- Conectividade de rede com o servidor do PatchMon
- Comandos necessários: `pct`, `curl`, `jq`, `bash`

#### Requisitos dos contêineres

- Em execução (contêineres parados são pulados)
- Distribuição Linux baseada em Debian ou em RPM
- Conectividade de rede com o servidor do PatchMon
- Gerenciador de pacotes (apt/yum/dnf) funcionando

#### Requisitos de rede

| Origem | Destino | Porta | Protocolo | Finalidade |
|--------|-------------|------|----------|---------|
| Host Proxmox | Servidor do PatchMon | 443 (HTTPS) | TCP | Chamadas à API de registro |
| Contêineres LXC | Servidor do PatchMon | 443 (HTTPS) | TCP | Instalação do agente e relatórios |

**Observações sobre firewall:**
- Só conexões de saída (nenhuma porta de entrada é necessária)
- HTTPS recomendado (HTTP é suportado em redes internas)
- Certificados autoassinados são suportados com a flag `-k`

### Início rápido {#quick-start}

#### 1. Crie o token (na interface do PatchMon)

1. Vá a **Settings → Integrations → Auto-Enrollment & API**
2. Clique em **"New Token"**
3. Configure:
   - **Name**: "Production Proxmox"
   - **Max Hosts/Day**: 100
   - **Host Group**: escolha o grupo de destino
   - **IP Restriction**: o IP do seu host Proxmox
4. **Guarde as credenciais na hora** (elas aparecem uma única vez!)

#### 2. Registro em uma linha (no host Proxmox)

```bash
curl -s "https://patchmon.example.com/api/v1/auto-enrollment/script?type=proxmox-lxc&token_key=YOUR_KEY&token_secret=YOUR_SECRET" | bash
```

Pronto! Todos os contêineres LXC em execução são registrados e recebem o agente do PatchMon.

#### 3. Confira no PatchMon

- Vá à página **Hosts**
- Os seus contêineres aparecem com status "pending"
- O agente se conecta sozinho depois da instalação (normalmente em segundos)
- O status passa para "active", com os dados de pacotes

### Configuração passo a passo {#step-by-step-setup}

#### Etapa 1: crie o token de registro automático

##### Pela interface web do PatchMon

1. **Entre no PatchMon** como administrador

2. **Vá a Settings**
   ```
   Dashboard → Settings → Integrations → Auto-Enrollment & API tab
   ```

3. **Clique no botão "New Token"**

4. **Preencha os dados do token:**
   
   | Campo | Valor | Obrigatório | Descrição |
   |-------|-------|----------|-------------|
   | **Token Name** | `Proxmox Production` | Sim | Nome descritivo do token |
   | **Max Hosts Per Day** | `100` | Sim | Limite de ritmo (1-1000) |
   | **Default Host Group** | `Proxmox LXC` | Não | Atribui automaticamente os hosts registrados |
   | **Allowed IP Addresses** | `192.168.1.10` | Não | IPs separados por vírgula |
   | **Expiration Date** | `2027-01-01` | Não | Desativa automaticamente depois da data |

5. **Clique em "Create Token"**

6. **IMPORTANTE: guarde as credenciais agora!**

   Aparece uma janela de sucesso com:
   ```
   Token Key:    patchmon_ae_a1b2c3d4e5f6...
   Token Secret: 8f7e6d5c4b3a2f1e0d9c8b7a...
   ```

   **Copie os dois valores na hora!** Eles não podem ser recuperados depois.

   **Dica**: copie o comando de instalação de uma linha que aparece na janela; ele já vem com as credenciais preenchidas.

#### Etapa 2: prepare o host Proxmox

##### Instale as dependências necessárias

```bash
# SSH to your Proxmox host
ssh root@proxmox-host

# Install jq (JSON processor)
apt-get update && apt-get install -y jq curl

# Verify installations
which pct jq curl
# Should show paths for all three commands
```

##### Baixe o script de registro

**Método A: download direto do PatchMon (recomendado)**

```bash
# Download with credentials embedded (copy from PatchMon UI)
curl -s "https://patchmon.example.com/api/v1/auto-enrollment/script?type=proxmox-lxc&token_key=YOUR_KEY&token_secret=YOUR_SECRET" \
    -o /root/proxmox_auto_enroll.sh

chmod +x /root/proxmox_auto_enroll.sh
```

**Método B: configuração manual**

```bash
# Download script template
cd /root
wget https://raw.githubusercontent.com/PatchMon/PatchMon/main/agents/proxmox_auto_enroll.sh
chmod +x proxmox_auto_enroll.sh

# Edit configuration
nano proxmox_auto_enroll.sh

# Update these lines:
PATCHMON_URL="https://patchmon.example.com"
AUTO_ENROLLMENT_KEY="patchmon_ae_your_key_here"
AUTO_ENROLLMENT_SECRET="your_secret_here"
```

#### Etapa 3: teste com simulação

**Teste sempre antes!**

```bash
# Dry run shows what would happen without making changes
DRY_RUN=true ./proxmox_auto_enroll.sh
```

Saída esperada:
```
[INFO] Found 5 LXC container(s)
[INFO] Processing LXC 100: webserver (status: running)
[INFO]   [DRY RUN] Would enroll: proxmox-webserver
[INFO] Processing LXC 101: database (status: running)
[INFO]   [DRY RUN] Would enroll: proxmox-database
...
[INFO] Successfully Enrolled:  5 (dry run)
```

#### Etapa 4: rode o registro de verdade

```bash
# Enroll all containers
./proxmox_auto_enroll.sh
```

Acompanhe a saída:
- `[SUCCESS]` em verde = contêiner registrado e agente instalado
- `[WARN]` em amarelo = contêiner pulado (já registrado ou parado)
- `[ERROR]` em vermelho = falha (veja a seção de solução de problemas)

#### Etapa 5: confira no PatchMon

1. **Vá à página Hosts** na interface do PatchMon
2. **Procure os contêineres recém-registrados** (nomes com o prefixo "proxmox-")
3. **O status inicial é "pending"** (normal!)
4. **O agente se conecta sozinho** depois da instalação (normalmente em segundos)
5. **O status passa para "active"**, com os dados de pacotes preenchidos

**Solução de problemas**: se o status continuar "pending" depois de alguns minutos, veja a seção [O agente não reporta](#agent-not-reporting).

### Exemplos de uso {#usage-examples}

#### Registro básico

```bash
# Enroll all running LXC containers
./proxmox_auto_enroll.sh
```

#### Modo de simulação

```bash
# Preview what would be enrolled (no changes made)
DRY_RUN=true ./proxmox_auto_enroll.sh
```

#### Modo de depuração

```bash
# Show detailed logging for troubleshooting
DEBUG=true ./proxmox_auto_enroll.sh
```

#### Prefixo personalizado nos hosts

```bash
# Prefix container names (e.g., "prod-webserver" instead of "webserver")
HOST_PREFIX="prod-" ./proxmox_auto_enroll.sh
```

#### Modo de instalação forçada (pacotes quebrados)

Se os contêineres têm pacotes quebrados (CloudPanel, WHM, cPanel etc.) que travam o `apt-get`:

```bash
# Bypass broken packages during agent installation
FORCE_INSTALL=true ./proxmox_auto_enroll.sh
```

Ou use o parâmetro force no download:

```bash
curl -s "https://patchmon.example.com/api/v1/auto-enrollment/script?type=proxmox-lxc&token_key=KEY&token_secret=SECRET&force=true" | bash
```

**O que o modo forçado faz:**
- Pula o `apt-get update` se detectar pacotes quebrados
- Só instala as ferramentas críticas que faltarem (jq, curl, bc)
- Usa as flags `--fix-broken --yes` de forma segura
- Valida as instalações antes de seguir

#### Registro agendado (cron)

Registra novos contêineres automaticamente, num agendamento. Como o cron roda com um ambiente mínimo (`PATH` limitado, sem variáveis de usuário), é preciso garantir que o crontab tenha o ambiente certo para o script encontrar comandos como `pct`, `curl` e `jq`.

##### Configurando o crontab

Edite o crontab do root:

```bash
crontab -e
```

Acrescente o seguinte. O `PATH` e as variáveis de ambiente no topo são essenciais: sem eles, o script falha, porque o cron não herda o ambiente do seu shell:

```cron
# === PatchMon Auto-Enrollment Environment ===
# Cron uses a minimal PATH by default (/usr/bin:/bin). The enrollment script
# requires pct, curl, and jq which may live in /usr/sbin or other paths.
# Set a full PATH so all commands are found.
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Enrollment credentials (required by the script)
PATCHMON_URL=https://patchmon.example.com
AUTO_ENROLLMENT_KEY=patchmon_ae_your_key_here
AUTO_ENROLLMENT_SECRET=your_secret_here

# Optional overrides
# HOST_PREFIX=proxmox-
# FORCE_INSTALL=false
# CURL_FLAGS=-sk

# === Schedule ===
# Run daily at 2 AM
0 2 * * * /root/proxmox_auto_enroll.sh >> /var/log/patchmon-enroll.log 2>&1

# Or hourly for dynamic environments where containers are created frequently
# 0 * * * * /root/proxmox_auto_enroll.sh >> /var/log/patchmon-enroll.log 2>&1
```

##### Por que isso importa

O cron não carrega o perfil do seu shell interativo (`~/.bashrc`, `~/.profile` etc.). Isso significa:

| O que falta no cron | Impacto | Correção |
|----------------------|--------|-----|
| O `PATH` só inclui `/usr/bin:/bin` | `pct` não é encontrado (fica em `/usr/sbin`) | Defina o `PATH` no topo do crontab |
| Nenhuma variável exportada | `PATCHMON_URL` e as credenciais ficam vazias | Defina-as no crontab ou use um script wrapper |
| Sem TTY | Os códigos de cor da saída podem poluir o log | Redirecione para um arquivo de log com `2>&1` |

##### Alternativa: script wrapper

Se preferir não colocar credenciais no crontab, crie um script wrapper:

```bash
cat > /root/patchmon_enroll_cron.sh << 'EOF'
#!/bin/bash
# Wrapper that sets the environment for cron execution

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
export PATCHMON_URL="https://patchmon.example.com"
export AUTO_ENROLLMENT_KEY="patchmon_ae_your_key_here"
export AUTO_ENROLLMENT_SECRET="your_secret_here"
# export HOST_PREFIX="proxmox-"
# export CURL_FLAGS="-sk"

/root/proxmox_auto_enroll.sh
EOF

chmod 700 /root/patchmon_enroll_cron.sh
```

Depois referencie o wrapper no crontab:

```cron
0 2 * * * /root/patchmon_enroll_cron.sh >> /var/log/patchmon-enroll.log 2>&1
```

Deixe o script wrapper legível só pelo root (`chmod 700`), porque ele contém segredos.

##### Rotação de logs

Em agendamentos de cron que rodam por muito tempo, considere acrescentar rotação de logs, para o log não crescer sem limite:

```bash
cat > /etc/logrotate.d/patchmon-enroll << 'EOF'
/var/log/patchmon-enroll.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
EOF
```

##### Conferindo se o cron está funcionando

```bash
# Check the cron job is registered
crontab -l | grep patchmon

# Check recent cron execution logs
grep patchmon /var/log/syslog | tail -n 20

# Check enrollment log output
tail -f /var/log/patchmon-enroll.log
```

Contêineres já registrados são pulados automaticamente a cada execução, então rodar várias vezes não gera duplicatas nem erros.

#### Configuração para vários ambientes

```bash
# Production environment (uses prod token)
export PATCHMON_URL="https://patchmon.example.com"
export AUTO_ENROLLMENT_KEY="patchmon_ae_prod_..."
export AUTO_ENROLLMENT_SECRET="prod_secret..."
export HOST_PREFIX="prod-"
./proxmox_auto_enroll.sh

# Development environment (uses dev token with different host group)
export AUTO_ENROLLMENT_KEY="patchmon_ae_dev_..."
export AUTO_ENROLLMENT_SECRET="dev_secret..."
export HOST_PREFIX="dev-"
./proxmox_auto_enroll.sh
```

### Opções de configuração

#### Variáveis de ambiente

Toda a configuração pode ser definida por variáveis de ambiente:

| Variável | Padrão | Descrição | Exemplo |
|----------|---------|-------------|---------|
| `PATCHMON_URL` | Obrigatória | URL do servidor do PatchMon | `https://patchmon.example.com` |
| `AUTO_ENROLLMENT_KEY` | Obrigatória | Token key do PatchMon | `patchmon_ae_abc123...` |
| `AUTO_ENROLLMENT_SECRET` | Obrigatória | Token secret do PatchMon | `def456ghi789...` |
| `CURL_FLAGS` | `-s` | Opções do curl | `-sk` (para SSL autoassinado) |
| `DRY_RUN` | `false` | Modo de simulação (sem mudanças) | `true`/`false` |
| `HOST_PREFIX` | `""` | Prefixo dos nomes de host | `proxmox-`, `prod-` etc. |
| `FORCE_INSTALL` | `false` | Passa por cima de pacotes quebrados | `true`/`false` |
| `DEBUG` | `false` | Ativa os logs de depuração | `true`/`false` |

#### Seção de configuração do script

Ou edite o script diretamente:

```bash
# ===== CONFIGURATION =====
PATCHMON_URL="${PATCHMON_URL:-https://patchmon.example.com}"
AUTO_ENROLLMENT_KEY="${AUTO_ENROLLMENT_KEY:-your_key_here}"
AUTO_ENROLLMENT_SECRET="${AUTO_ENROLLMENT_SECRET:-your_secret_here}"
CURL_FLAGS="${CURL_FLAGS:--s}"
DRY_RUN="${DRY_RUN:-false}"
HOST_PREFIX="${HOST_PREFIX:-}"
FORCE_INSTALL="${FORCE_INSTALL:-false}"
```

#### Configuração do token (interface do PatchMon)

Configure os tokens em **Settings → Integrations → Auto-Enrollment & API**:

**Configurações gerais:**
- **Token Name**: identificação descritiva
- **Active Status**: ativa/desativa sem excluir
- **Expiration Date**: desativa automaticamente depois da data

**Configurações de segurança:**
- **Max Hosts Per Day**: limite de ritmo (zera todo dia à meia-noite)
- **Allowed IP Addresses**: lista de IPs permitidos, separados por vírgula
- **Default Host Group**: atribui automaticamente os hosts registrados

**Estatísticas de uso:**
- **Hosts Created Today**: contagem do dia
- **Last Used**: horário do registro mais recente
- **Created By**: o administrador que criou o token
- **Created At**: data e hora de criação do token

### Boas práticas de segurança

#### Gestão dos tokens

1. **Guarde em lugar seguro**
   - Guarde as credenciais num gerenciador de senhas (1Password, LastPass etc.)
   - Nunca faça commit no controle de versão
   - Use variáveis de ambiente ou uma gestão de configuração segura (Vault)

2. **Princípio do menor privilégio**
   - Crie tokens separados para produção, desenvolvimento e homologação
   - Use tokens diferentes para clusters Proxmox diferentes
   - Defina limites de ritmo adequados a cada ambiente

3. **Rotação periódica**
   - Troque os tokens a cada 90 dias
   - Desative na hora os tokens sem uso
   - Acompanhe o uso dos tokens em busca de anomalias

4. **Restrições de IP**
   - Defina sempre `allowed_ip_ranges` em produção
   - Atualize se os IPs dos hosts Proxmox mudarem
   - Use IPs de VPN / rede privada sempre que possível

5. **Datas de expiração**
   - Defina expiração para tokens temporários ou de teste
   - Revise e prorrogue antes de expirar
   - Exclua os tokens expirados, para reduzir a superfície de ataque

#### Segurança de rede

1. **Use HTTPS**
   - Use sempre conexões criptografadas em produção
   - Use certificados SSL válidos (evite a flag `-k`)
   - Certificado autoassinado serve para ambientes internos ou de teste

2. **Segmentação de rede**
   - Faça o registro por rede privada, se possível
   - Use regras de firewall adequadas
   - Restrinja o acesso ao servidor do PatchMon a IPs conhecidos

#### Controle de acesso

1. **Permissões de administrador**
   - Só administradores com "Manage Settings" podem criar tokens
   - Usuários comuns não veem os secrets dos tokens
   - Use controle de acesso baseado em papéis (RBAC)

2. **Log de auditoria**
   - Acompanhe a criação e a exclusão de tokens nos logs do PatchMon
   - Acompanhe a atividade de registro de cada token
   - Revise as anotações dos hosts para ver a origem do registro

3. **Segurança dos contêineres**
   - Garanta que os contêineres tenham o mínimo de privilégios
   - Não rode o registro como usuário sem privilégios
   - Use contêineres unprivileged quando possível (o registro continua funcionando)

#### Resposta a incidentes

**Se um token for comprometido:**

1. **Desative o token na hora** na interface do PatchMon
   - Settings → Integrations → Auto-Enrollment & API → alterne para "Disable"

2. **Revise os hosts registrados recentemente**
   - Veja nas anotações dos hosts o nome do token e a data do registro
   - Confirme que todos os registros recentes são legítimos
   - Exclua os hosts suspeitos

3. **Crie um token novo**
   - Gere novas credenciais
   - Atualize o script do Proxmox com as novas credenciais
   - Teste o registro com simulação

4. **Investigue a causa**
   - Como as credenciais vazaram?
   - Atualize os procedimentos para não se repetir
   - Considere medidas de segurança adicionais

5. **Exclua o token antigo**
   - Depois de confirmar que o novo funciona
   - Registre o incidente no histórico de mudanças

### Solução de problemas

#### Erros comuns e soluções

##### Erro: "pct command not found"

**Sintoma:**
```
[ERROR] This script must run on a Proxmox host (pct command not found)
```

**Causa:** o script está rodando numa máquina que não é Proxmox

**Solução:**
```bash
# SSH to Proxmox host first
ssh root@proxmox-host
cd /root
./proxmox_auto_enroll.sh
```

##### Erro: "Auto-enrollment credentials required"

**Sintoma:**
```
[ERROR] Failed to enroll hostname - HTTP 401
Response: {"error":"Auto-enrollment credentials required"}
```

**Causa:** faltam na requisição os cabeçalhos `X-Auto-Enrollment-Key` e/ou `X-Auto-Enrollment-Secret`

**Solução:**
1. Confira se o script tem `AUTO_ENROLLMENT_KEY` e `AUTO_ENROLLMENT_SECRET` definidos
2. Procure espaços ou quebras de linha a mais nas credenciais
3. Confirme que o token_key começa com `patchmon_ae_`
4. Gere o token de novo se perdeu as credenciais

```bash
# Test credentials manually
curl -X POST \
  -H "X-Auto-Enrollment-Key: YOUR_KEY" \
  -H "X-Auto-Enrollment-Secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"friendly_name":"test","machine_id":"test"}' \
  https://patchmon.example.com/api/v1/auto-enrollment/enroll
```

##### Erro: "Invalid or inactive token" / "Invalid token secret"

**Sintoma:**
```
[ERROR] Failed to enroll hostname - HTTP 401
Response: {"error":"Invalid or inactive token"}
```
ou
```
[ERROR] Failed to enroll hostname - HTTP 401
Response: {"error":"Invalid token secret"}
```

**Causa:** o token key não foi encontrado ou está desativado (`Invalid or inactive token`), o secret não bate (`Invalid token secret`), ou o token expirou (`Token expired`)

**Solução:**
1. Veja o estado do token na interface do PatchMon (Settings → Integrations)
2. Ative-o, se estiver desativado
3. Prorrogue a expiração, se tiver expirado
4. Confira se o secret é o mesmo mostrado na criação do token
5. Crie um token novo se perdeu as credenciais (os secrets não podem ser recuperados)

##### Erro: "Rate limit exceeded"

**Sintoma:**
```
[ERROR] Rate limit exceeded - maximum hosts per day reached
```

**Causa:** o limite `max_hosts_per_day` do token foi atingido

**Solução:**
```bash
# Option 1: Wait until tomorrow (limit resets at midnight)
date
# Check current time, wait until 00:00

# Option 2: Increase limit in PatchMon UI
# Settings → Integrations → Edit Token → Max Hosts Per Day: 200

# Option 3: Create additional token for large enrollments
```

##### Erro: "IP address not authorized"

**Sintoma:**
```
[ERROR] Failed to enroll hostname - HTTP 403
Response: {"error":"IP address not authorized for this token"}
```

**Causa:** o IP do host Proxmox não está em `allowed_ip_ranges` do token

**Solução:**
1. Descubra o IP do seu host Proxmox:
   ```bash
   ip addr show | grep 'inet ' | grep -v 127.0.0.1
   ```

2. Atualize o token na interface do PatchMon:
   - Settings → Integrations → Edit Token
   - Allowed IP Addresses: acrescente o seu IP

3. Ou remova de vez a restrição de IP (não recomendado em produção)

##### Erro: "jq: command not found"

**Sintoma:**
```
[ERROR] Required command 'jq' not found. Please install it first.
```

**Causa:** falta uma dependência

**Solução:**
```bash
# Debian/Ubuntu
apt-get update && apt-get install -y jq

# CentOS/RHEL
yum install -y jq

# Alpine
apk add --no-cache jq
```

##### Erro: "Failed to install agent in container"

**Sintoma:**
```
[WARN] Failed to install agent in container-name (exit: 1)
Install output: E: Unable to locate package curl
```

**Causa:** a instalação do agente falhou dentro do contêiner LXC

**Soluções:**

**A. Problema de conectividade de rede:**
```bash
# Test from Proxmox host
pct exec 100 -- ping -c 3 patchmon.example.com

# Test from inside container
pct enter 100
curl -I https://patchmon.example.com
exit
```

**B. Problema no gerenciador de pacotes:**
```bash
# Enter container
pct enter 100

# Update package lists
apt-get update
# or
yum makecache

# Try manual agent install
curl https://patchmon.example.com/api/v1/hosts/install \
  -H "X-API-ID: patchmon_xxx" \
  -H "X-API-KEY: xxx" | bash
```

**C. Sistema operacional não suportado:**
- O agente suporta: Ubuntu, Debian, CentOS, RHEL, Rocky Linux, AlmaLinux, Alpine
- Veja o `/etc/os-release` do contêiner
- Em outras distribuições, instale manualmente

**D. Pacotes quebrados (use o modo forçado):**
```bash
FORCE_INSTALL=true ./proxmox_auto_enroll.sh
```

##### Erro: problemas com certificado SSL

**Sintoma:**
```
curl: (60) SSL certificate problem: self signed certificate
```

**Causa:** certificado autoassinado no servidor do PatchMon

**Solução:**
```bash
# Use -k flag to skip certificate verification
export CURL_FLAGS="-sk"
./proxmox_auto_enroll.sh
```

**Solução melhor:** instale um certificado SSL válido no servidor do PatchMon, com Let's Encrypt ou a CA corporativa

##### Aviso: contêiner já registrado

**Sintoma:**
```
[INFO] ✓ Host already enrolled and agent ping successful - skipping enrollment
```

**Causa:** o script detectou uma configuração de agente existente (`/etc/patchmon/config.yml` e `/etc/patchmon/credentials.yml`) dentro do contêiner, e o ping do agente ao servidor do PatchMon deu certo.

**Isso é normal!** O script pula com segurança os hosts já registrados. Não é preciso fazer nada.

Se precisar registrar de novo:
1. Exclua o host na interface do PatchMon (página Hosts)
2. Remova a configuração do agente dentro do contêiner: `pct exec <vmid> -- rm -rf /etc/patchmon/`
3. Rode o script de registro de novo

#### O agente não reporta {#agent-not-reporting}

Se os contêineres ficam com status "pending" depois do registro:

**1. Confira se o serviço do agente está rodando:**
```bash
pct enter 100

# For systemd-based containers
systemctl status patchmon-agent.service

# For OpenRC-based containers (Alpine)
rc-service patchmon-agent status

# For containers without init systems (crontab fallback)
ps aux | grep patchmon-agent
```

**2. Confira se os arquivos do agente existem:**
```bash
ls -la /etc/patchmon/
# Should show: config.yml and credentials.yml

ls -la /usr/local/bin/patchmon-agent
# Should show the agent binary
```

**3. Veja os logs do agente:**
```bash
# Systemd journal logs
journalctl -u patchmon-agent.service --no-pager -n 50

# Or check the agent log file
cat /etc/patchmon/logs/patchmon-agent.log
```

**4. Teste a conectividade do agente:**
```bash
/usr/local/bin/patchmon-agent ping
# Should show success if credentials and connectivity are valid
```

**5. Confira as credenciais:**
```bash
cat /etc/patchmon/credentials.yml
# Should show api_id and api_key

cat /etc/patchmon/config.yml
# Should show patchmon_server URL
```

**6. Reinicie o serviço do agente:**
```bash
# Systemd
systemctl restart patchmon-agent.service

# OpenRC
rc-service patchmon-agent restart
```

#### Modo de depuração

Ative os logs detalhados:

```bash
DEBUG=true ./proxmox_auto_enroll.sh
```

A saída de depuração inclui:
- Corpos de requisição e resposta da API
- Detalhes da execução dos comandos nos contêineres
- Mensagens de erro detalhadas
- Saída detalhada do curl

#### Obtendo ajuda

Se os problemas continuarem:

1. **Veja os logs do servidor do PatchMon:**
   ```bash
   tail -f /path/to/patchmon/backend/logs/error.log
   ```

2. **Abra uma issue no GitHub** com:
   - Versão do PatchMon
   - Versão do Proxmox
   - Saída do script (oculte as credenciais!)
   - Saída do modo de depuração
   - Logs do servidor (se tiver acesso)

3. **Entre na comunidade do Discord** para suporte em tempo real

### Uso avançado {#advanced-usage}

#### Registro seletivo

Registre só contêineres específicos:

```bash
# Only enroll containers 100-199
nano proxmox_auto_enroll.sh

# Add after line "while IFS= read -r line; do"
vmid=$(echo "$line" | awk '{print $1}')
if [[ $vmid -lt 100 ]] || [[ $vmid -gt 199 ]]; then
    continue
fi
```

Ou filtre pelo nome do contêiner:

```bash
# Only enroll containers with "prod" in name
if [[ ! "$name" =~ prod ]]; then
    continue
fi
```

#### Nomes de host personalizados

Estratégias avançadas de nomes:

```bash
# Include Proxmox node name
HOST_PREFIX="$(hostname)-"
# Result: proxmox01-webserver, proxmox02-database

# Include datacenter/location
HOST_PREFIX="dc1-"
# Result: dc1-webserver, dc1-database

# Include environment and node
HOST_PREFIX="prod-$(hostname | cut -d. -f1)-"
# Result: prod-px01-webserver
```

#### Cluster Proxmox com vários nós

Para clusters Proxmox com vários nós:

**Opção 1: o mesmo token, com prefixo diferente em cada nó**

```bash
# On node 1
HOST_PREFIX="node1-" ./proxmox_auto_enroll.sh

# On node 2
HOST_PREFIX="node2-" ./proxmox_auto_enroll.sh
```

**Opção 2: tokens diferentes em cada nó**

- Crie um token para cada nó, com grupos de hosts padrão diferentes
- Nó 1 → grupo "Proxmox Node 1"
- Nó 2 → grupo "Proxmox Node 2"

**Opção 3: automação centralizada**

```bash
#!/bin/bash
# central_enroll.sh

NODES=(
  "root@proxmox01.example.com"
  "root@proxmox02.example.com"
  "root@proxmox03.example.com"
)

for node in "${NODES[@]}"; do
  echo "Enrolling containers from $node..."
  ssh "$node" "bash /root/proxmox_auto_enroll.sh"
done
```

#### Integração com infraestrutura como código

**Playbook do Ansible:**

```yaml
---
- name: Enroll Proxmox LXC containers in PatchMon
  hosts: proxmox_hosts
  become: yes
  tasks:
    - name: Install dependencies
      apt:
        name:
          - curl
          - jq
        state: present

    - name: Download enrollment script
      get_url:
        url: "{{ patchmon_url }}/api/v1/auto-enrollment/script?type=proxmox-lxc&token_key={{ token_key }}&token_secret={{ token_secret }}"
        dest: /root/proxmox_auto_enroll.sh
        mode: '0700'

    - name: Run enrollment
      command: /root/proxmox_auto_enroll.sh
      register: enrollment_output

    - name: Show enrollment results
      debug:
        var: enrollment_output.stdout_lines
```

**Terraform (com null_resource):**

```hcl
resource "null_resource" "patchmon_enrollment" {
  triggers = {
    cluster_instance_ids = join(",", proxmox_lxc.containers.*.vmid)
  }

  provisioner "remote-exec" {
    connection {
      host = var.proxmox_host
      user = "root"
      private_key = file(var.ssh_key_path)
    }

    inline = [
      "apt-get install -y jq",
      "curl -s '${var.patchmon_url}/api/v1/auto-enrollment/script?type=proxmox-lxc&token_key=${var.token_key}&token_secret=${var.token_secret}' | bash"
    ]
  }
}
```

#### Registro em massa pela API

Em implantações muito grandes (100+ contêineres), use diretamente o endpoint de registro em massa da API:

```bash
#!/bin/bash
# bulk_enroll.sh

# Gather all container info
containers_json=$(pct list | tail -n +2 | while read -r line; do
  vmid=$(echo "$line" | awk '{print $1}')
  name=$(echo "$line" | awk '{print $3}')
  
  echo "{\"friendly_name\":\"$name\",\"machine_id\":\"proxmox-lxc-$vmid\"}"
done | jq -s '.')

# Send bulk enrollment request
curl -X POST \
  -H "X-Auto-Enrollment-Key: $AUTO_ENROLLMENT_KEY" \
  -H "X-Auto-Enrollment-Secret: $AUTO_ENROLLMENT_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"hosts\":$containers_json}" \
  "$PATCHMON_URL/api/v1/auto-enrollment/enroll/bulk"
```

**Vantagens:**
- Uma única chamada de API para todos os contêineres
- Mais rápido a partir de 50 contêineres
- Aceita sucesso parcial (falhas individuais não bloqueiam os outros)

**Limitações:**
- No máximo 50 hosts por requisição
- Não instala os agentes (isso precisa ser feito à parte)
- Relatório de erros por host menos detalhado

#### Registro disparado por webhook

Dispare o registro a partir de um webhook do PatchMon (exige configuração própria):

```bash
#!/bin/bash
# webhook_listener.sh

# Simple webhook listener
while true; do
  # Listen for webhook on port 9000
  nc -l -p 9000 -c 'echo -e "HTTP/1.1 200 OK\n\n"; /root/proxmox_auto_enroll.sh'
done
```

Depois configure o PatchMon (ou o sistema de monitoramento) para chamar o webhook quando as condições forem atendidas.

### Referência da API

#### Endpoints de administração (exigem autenticação)

Todos os endpoints de administração exigem autenticação JWT:
```
Authorization: Bearer <jwt_token>
```

##### Criar token

**Endpoint:** `POST /api/v1/auto-enrollment/tokens`

**Requisição:**
```json
{
  "token_name": "Proxmox Production",
  "max_hosts_per_day": 100,
  "default_host_group_id": "uuid",
  "allowed_ip_ranges": ["192.168.1.10", "10.0.0.5"],
  "expires_at": "2026-12-31T23:59:59Z",
  "metadata": {
    "integration_type": "proxmox-lxc",
    "environment": "production"
  }
}
```

**Resposta:** `201 Created`
```json
{
  "message": "Auto-enrollment token created successfully",
  "token": {
    "id": "uuid",
    "token_name": "Proxmox Production",
    "token_key": "patchmon_ae_abc123...",
    "token_secret": "def456...",  // Only shown here!
    "max_hosts_per_day": 100,
    "default_host_group": {
      "id": "uuid",
      "name": "Proxmox LXC",
      "color": "#3B82F6"
    },
    "created_by": {
      "id": "uuid",
      "username": "admin",
      "first_name": "John",
      "last_name": "Doe"
    },
    "expires_at": "2026-12-31T23:59:59Z"
  },
  "warning": "Save the token_secret now - it cannot be retrieved later!"
}
```

##### Listar tokens

**Endpoint:** `GET /api/v1/auto-enrollment/tokens`

**Resposta:** `200 OK`
```json
[
  {
    "id": "uuid",
    "token_name": "Proxmox Production",
    "token_key": "patchmon_ae_abc123...",
    "is_active": true,
    "allowed_ip_ranges": ["192.168.1.10"],
    "max_hosts_per_day": 100,
    "hosts_created_today": 15,
    "last_used_at": "2025-10-11T14:30:00Z",
    "expires_at": "2026-12-31T23:59:59Z",
    "created_at": "2025-10-01T10:00:00Z",
    "default_host_group_id": "uuid",
    "metadata": {"integration_type": "proxmox-lxc"},
    "host_groups": {
      "id": "uuid",
      "name": "Proxmox LXC",
      "color": "#3B82F6"
    },
    "users": {
      "id": "uuid",
      "username": "admin",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
]
```

##### Detalhes do token

**Endpoint:** `GET /api/v1/auto-enrollment/tokens/:tokenId`

**Resposta:** `200 OK` (mesma estrutura de um token na lista)

##### Atualizar token

**Endpoint:** `PATCH /api/v1/auto-enrollment/tokens/:tokenId`

**Requisição:**
```json
{
  "is_active": false,
  "max_hosts_per_day": 200,
  "allowed_ip_ranges": ["192.168.1.0/24"],
  "expires_at": "2027-01-01T00:00:00Z"
}
```

**Resposta:** `200 OK`
```json
{
  "message": "Token updated successfully",
  "token": { /* updated token object */ }
}
```

##### Excluir token

**Endpoint:** `DELETE /api/v1/auto-enrollment/tokens/:tokenId`

**Resposta:** `200 OK`
```json
{
  "message": "Auto-enrollment token deleted successfully",
  "deleted_token": {
    "id": "uuid",
    "token_name": "Proxmox Production"
  }
}
```

#### Endpoints de registro (autenticação por token)

Autenticação por cabeçalhos:
```
X-Auto-Enrollment-Key: patchmon_ae_abc123...
X-Auto-Enrollment-Secret: def456...
```

##### Baixar o script de registro

**Endpoint:** `GET /api/v1/auto-enrollment/script`

**Parâmetros de query:**
- `type` (obrigatório): tipo de script (`proxmox-lxc` ou `direct-host`)
- `token_key` (obrigatório): token key de registro automático
- `token_secret` (obrigatório): token secret de registro automático
- `force` (opcional): `true` para ativar o modo de instalação forçada

**Exemplo:**
```bash
curl "https://patchmon.example.com/api/v1/auto-enrollment/script?type=proxmox-lxc&token_key=KEY&token_secret=SECRET&force=true"
```

**Resposta:** `200 OK` (script bash com as credenciais embutidas)

##### Registrar um único host

**Endpoint:** `POST /api/v1/auto-enrollment/enroll`

**Requisição:**
```json
{
  "friendly_name": "webserver",
  "machine_id": "proxmox-lxc-100-abc123",
  "metadata": {
    "vmid": "100",
    "proxmox_node": "proxmox01",
    "ip_address": "10.0.0.10",
    "os_info": "Ubuntu 22.04 LTS"
  }
}
```

**Resposta:** `201 Created`
```json
{
  "message": "Host enrolled successfully",
  "host": {
    "id": "uuid",
    "friendly_name": "webserver",
    "api_id": "patchmon_abc123",
    "api_key": "def456ghi789",
    "host_group": {
      "id": "uuid",
      "name": "Proxmox LXC",
      "color": "#3B82F6"
    },
    "status": "pending"
  }
}
```

**Respostas de erro:**

> **Observação:** a API não verifica hosts duplicados. A prevenção de duplicatas é feita do lado do cliente, pelo script de registro, que procura uma configuração de agente existente dentro de cada contêiner antes de chamar a API.

`429 Too Many Requests` - limite de ritmo excedido:
```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 100 hosts per day allowed for this token"
}
```

##### Registrar hosts em massa

**Endpoint:** `POST /api/v1/auto-enrollment/enroll/bulk`

**Requisição:**
```json
{
  "hosts": [
    {
      "friendly_name": "webserver",
      "machine_id": "proxmox-lxc-100-abc123"
    },
    {
      "friendly_name": "database",
      "machine_id": "proxmox-lxc-101-def456"
    }
  ]
}
```

**Limites:**
- Mínimo: 1 host
- Máximo: 50 hosts por requisição

**Resposta:** `201 Created`
```json
{
  "message": "Bulk enrollment completed: 2 succeeded, 0 failed, 0 skipped",
  "results": {
    "success": [
      {
        "id": "uuid",
        "friendly_name": "webserver",
        "api_id": "patchmon_abc123",
        "api_key": "def456"
      },
      {
        "id": "uuid",
        "friendly_name": "database",
        "api_id": "patchmon_ghi789",
        "api_key": "jkl012"
      }
    ],
    "failed": [],
    "skipped": []
  }
}
```

### Perguntas frequentes

#### Perguntas gerais

**P: Posso usar o mesmo token em vários hosts Proxmox?**  
R: Sim, desde que a soma dos registros fique dentro do limite `max_hosts_per_day`. Os limites de ritmo são por token, não por host.

**P: O que acontece se eu rodar o script várias vezes?**  
R: Os contêineres já registrados são pulados automaticamente. O script procura uma configuração de agente existente dentro de cada contêiner e pula aqueles em que o agente já está instalado e respondendo. É seguro rodar de novo!

**P: Posso registrar contêineres LXC parados?**  
R: Não, os contêineres precisam estar rodando. O script precisa executar comandos dentro do contêiner para instalar o agente. Inicie os contêineres antes de registrar.

**P: Isto funciona com VMs do Proxmox (QEMU)?**  
R: Não, este script é específico para LXC e usa `pct exec` para entrar nos contêineres. VMs exigem registro manual ou outra forma de automação (baseada em SSH).

**P: Como removo o registro de um host?**  
R: Vá à interface do PatchMon → Hosts → selecione o host → Delete. O agente para de reportar e o registro do host é removido do banco.

**P: Posso mudar o grupo de hosts depois do registro?**  
R: Sim! Na interface do PatchMon → Hosts → selecione o host → Edit → mude o grupo de hosts.

**P: Dá para ver quais hosts foram registrados por qual token?**  
R: Sim, veja o campo "Notes" do host no PatchMon. Ele traz o nome do token e o horário do registro.

**P: E se o endereço IP do meu host Proxmox mudar?**  
R: Atualize o `allowed_ip_ranges` do token na interface do PatchMon (Settings → Integrations → Edit Token).

**P: Posso ter vários tokens com grupos de hosts diferentes?**  
R: Sim! Crie tokens separados para produção, desenvolvimento e homologação, com grupos de hosts padrão diferentes. É ótimo para separar ambientes.

**P: Há como disparar o registro pela interface do PatchMon?**  
R: Hoje não (isso exigiria acesso de rede de entrada). O script precisa rodar no host Proxmox. Versões futuras podem suportar webhooks ou registro iniciado pelo agente.

#### Perguntas de segurança

**P: Os secrets dos tokens são guardados com segurança?**  
R: Sim, os secrets dos tokens passam por hash com bcrypt antes de serem guardados. Só o hash fica no banco, nunca o texto claro.

**P: O que acontece se alguém roubar o meu token de registro automático?**  
R: A pessoa consegue criar hosts novos até o limite de ritmo, mas não consegue controlar os hosts existentes nem acessar os dados deles. Se o token for comprometido, desative-o na hora na interface do PatchMon.

**P: Dá para auditar quem criou cada token?**  
R: Sim, cada token guarda o `created_by_user_id`. Veja na interface do PatchMon ou consulte o banco.

**P: Como funciona a lista de IPs permitidos?**  
R: O PatchMon verifica o IP do cliente na requisição HTTP. Se `allowed_ip_ranges` estiver configurado, o IP precisa estar numa das faixas permitidas, em notação CIDR (por exemplo, `192.168.1.0/24`). Endereços IP isolados também são aceitos (por exemplo, `192.168.1.10`).

**P: Posso usar as mesmas credenciais para o registro e para a comunicação do agente?**  
R: Não, elas são separadas. As credenciais de registro automático criam hosts. Cada host recebe credenciais de API exclusivas para a comunicação do agente. Essa separação limita o estrago caso uma credencial vaze.

#### Perguntas técnicas

**P: Por que o agente precisa de curl dentro do contêiner?**  
R: O script do agente usa o curl para se comunicar com o PatchMon. O script de registro instala o curl automaticamente, se faltar.

**P: Quais distribuições Linux são suportadas nos contêineres?**  
R: Ubuntu, Debian, CentOS, RHEL, Rocky Linux, AlmaLinux, Alpine Linux. Qualquer distribuição com os gerenciadores de pacotes apt/yum/dnf/apk.

**P: Quanto de banda o registro consome?**  
R: Pouco. O download do script tem ~15KB, e a instalação do agente, ~50-100KB por contêiner. Total: ~1-2MB para 10 contêineres.

**P: Posso rodar o registro em paralelo, para ir mais rápido?**  
R: Não é recomendado. O script processa os contêineres em sequência para não sobrecarregar o servidor do PatchMon. Com mais de 100 contêineres, considere o endpoint de registro em massa da API.

**P: O registro reinicia os contêineres?**  
R: Não, os contêineres continuam rodando. O agente é instalado sem reinícios nem interrupção de serviços.

**P: E se o contêiner não tiver hostname?**  
R: O script usa como alternativa o nome do contêiner no Proxmox.

**P: Posso personalizar a instalação do agente?**  
R: Sim, altere o `install_url` no script de registro ou use os parâmetros da API de instalação do agente do PatchMon.

#### Perguntas de solução de problemas

**P: Por que o registro falha com "dpkg was interrupted"?**  
R: O seu contêiner tem pacotes quebrados. Use `FORCE_INSTALL=true` para passar por cima, ou conserte o dpkg manualmente:
```bash
pct enter 100
dpkg --configure -a
apt-get install -f
```

**P: Por que o agente fica com status "pending" para sempre?**  
R: O agente provavelmente não alcança o servidor do PatchMon. Verifique:
1. A conectividade de rede do contêiner: `pct exec 100 -- ping patchmon.example.com`
2. Se o serviço do agente está rodando: `pct exec 100 -- systemctl status patchmon-agent.service`
3. Os logs do agente: `pct exec 100 -- journalctl -u patchmon-agent.service`

**P: Posso testar o registro sem criar hosts de verdade?**  
R: Sim, use o modo de simulação: `DRY_RUN=true ./proxmox_auto_enroll.sh`

**P: Como obtenho uma saída mais detalhada?**  
R: Use o modo de depuração: `DEBUG=true ./proxmox_auto_enroll.sh`

### Suporte e recursos

#### Documentação

- **Documentação do PatchMon**: https://patchmon.net/docs
- **Referência da API**: https://patchmon.net/docs/api-reference
- **Documentação do agente**: https://patchmon.net/docs/patchmon-operator-guide#managing-the-patchmon-agent

#### Comunidade

- **Discord**: https://patchmon.net/discord
- **GitHub Issues**: https://github.com/PatchMon/PatchMon/issues
- **GitHub Discussions**: https://github.com/PatchMon/PatchMon/discussions

#### Suporte profissional

Para suporte corporativo, treinamento ou integrações personalizadas:
- **E-mail**: support@patchmon.net
- **Site**: https://patchmon.net/support

---

**Equipe PatchMon**

---

## Capítulo 5: Documentação da Auto-Enrollment API {#auto-enrolment-api-docs}

### Visão geral

A API de registro automático do PatchMon permite cadastrar dispositivos de forma automatizada, com ferramentas como Ansible, Terraform ou scripts próprios. Ela cobre os endpoints de gestão de tokens, de registro de hosts e de instalação do agente.

### Sumário

- [Arquitetura da API](#api-architecture)
- [Autenticação](#authentication)
- [Endpoints de administração](#admin-endpoints)
- [Endpoints de registro](#enrollment-endpoints)
- [Endpoints de gestão de hosts](#host-management-endpoints)
- [Exemplos de integração com o Ansible](#ansible-integration-examples)
- [Tratamento de erros](#error-handling)
- [Limite de requisições](#rate-limiting)
- [Considerações de segurança](#security-considerations)

### Arquitetura da API {#api-architecture}

#### Estrutura da URL base

```
https://your-patchmon-server.com/api/v1/
```

A versão da API é `v1` e é fixa no servidor.

#### Categorias de endpoint

| Categoria | Prefixo do caminho | Autenticação | Finalidade |
|----------|-------------|----------------|---------|
| **Admin** | `/auto-enrollment/tokens/*` | JWT (Bearer token) | Gestão de tokens (CRUD) |
| **Enrollment** | `/auto-enrollment/*` | Token key + secret (cabeçalhos) | Registro de hosts e download do script |
| **Host** | `/hosts/*` | API ID + key (cabeçalhos) | Instalação do agente e envio de dados |

#### Modelo de segurança em duas camadas

**Camada 1: token de registro automático**
- **Finalidade**: criar novos registros de host pelo registro automático
- **Escopo**: limitado às operações de registro
- **Autenticação**: cabeçalhos `X-Auto-Enrollment-Key` + `X-Auto-Enrollment-Secret`
- **Limite de ritmo**: sim (hosts por dia configuráveis por token)
- **Armazenamento**: o secret fica em hash (bcrypt) no banco

**Camada 2: credenciais de API do host**
- **Finalidade**: comunicação do agente (envio de dados, atualizações, comandos)
- **Escopo**: credenciais exclusivas por host
- **Autenticação**: cabeçalhos `X-API-ID` + `X-API-KEY`
- **Limite de ritmo**: não (por host)
- **Armazenamento**: a API key fica em hash (bcrypt) no banco

**Por que duas camadas?**
- Um token de registro comprometido não compromete os hosts existentes
- Uma credencial de host comprometida não compromete o registro
- Revogar um token de registro impede novos registros sem afetar os hosts existentes

### Autenticação

#### Endpoints de administração (JWT)

Todos os endpoints de administração exigem um token JWT Bearer válido de um usuário autenticado com a permissão "Manage Settings":

```bash
curl -H "Authorization: Bearer <jwt_token>" \
     -H "Content-Type: application/json" \
     https://your-patchmon-server.com/api/v1/auto-enrollment/tokens
```

#### Endpoints de registro (token key + secret)

Os endpoints de registro se autenticam por cabeçalhos próprios:

```bash
curl -H "X-Auto-Enrollment-Key: patchmon_ae_abc123..." \
     -H "X-Auto-Enrollment-Secret: def456ghi789..." \
     -H "Content-Type: application/json" \
     https://your-patchmon-server.com/api/v1/auto-enrollment/enroll
```

#### Endpoints de host (API ID + key)

Os endpoints de host se autenticam pelos cabeçalhos de credencial de API:

```bash
curl -H "X-API-ID: patchmon_abc123" \
     -H "X-API-KEY: def456ghi789" \
     https://your-patchmon-server.com/api/v1/hosts/install
```

### Endpoints de administração {#admin-endpoints}

Todos os endpoints de administração exigem autenticação JWT e a permissão "Manage Settings".

#### Criar token de registro automático

**Endpoint:** `POST /api/v1/auto-enrollment/tokens`

**Corpo da requisição:**

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|----------|---------|-------------|
| `token_name` | string | Sim | (obrigatório) | Nome descritivo (máx. 255 caracteres) |
| `max_hosts_per_day` | integer | Não | `100` | Limite de ritmo (1–1000) |
| `default_host_group_id` | string | Não | `null` | UUID do grupo de hosts a atribuir automaticamente |
| `allowed_ip_ranges` | string[] | Não | `[]` | Lista de IPs permitidos (IPs exatos ou notação CIDR) |
| `expires_at` | string | Não | `null` | Data de expiração em ISO 8601 |
| `metadata` | object | Não | `{}` | Metadados próprios (por exemplo, `integration_type`, `environment`) |
| `scopes` | object | Não | `null` | Escopos de permissão (só para tokens do tipo integração de API) |

**Exemplo de requisição:**
```json
{
  "token_name": "Proxmox Production",
  "max_hosts_per_day": 100,
  "default_host_group_id": "uuid-of-host-group",
  "allowed_ip_ranges": ["192.168.1.10", "10.0.0.0/24"],
  "expires_at": "2026-12-31T23:59:59Z",
  "metadata": {
    "integration_type": "proxmox-lxc",
    "environment": "production"
  }
}
```

**Resposta:** `201 Created`
```json
{
  "message": "Auto-enrollment token created successfully",
  "token": {
    "id": "uuid",
    "token_name": "Proxmox Production",
    "token_key": "patchmon_ae_abc123...",
    "token_secret": "def456ghi789...",
    "max_hosts_per_day": 100,
    "default_host_group": {
      "id": "uuid",
      "name": "Proxmox LXC",
      "color": "#3B82F6"
    },
    "created_by": {
      "id": "uuid",
      "username": "admin",
      "first_name": "John",
      "last_name": "Doe"
    },
    "expires_at": "2026-12-31T23:59:59Z",
    "scopes": null
  },
  "warning": "Save the token_secret now - it cannot be retrieved later!"
}
```

> **Importante:** o `token_secret` só é devolvido nesta resposta. Ele passa por hash antes de ser guardado e não pode ser recuperado de novo.

#### Listar tokens de registro automático

**Endpoint:** `GET /api/v1/auto-enrollment/tokens`

**Resposta:** `200 OK`
```json
[
  {
    "id": "uuid",
    "token_name": "Proxmox Production",
    "token_key": "patchmon_ae_abc123...",
    "is_active": true,
    "allowed_ip_ranges": ["192.168.1.10"],
    "max_hosts_per_day": 100,
    "hosts_created_today": 15,
    "last_used_at": "2025-10-11T14:30:00Z",
    "expires_at": "2026-12-31T23:59:59Z",
    "created_at": "2025-10-01T10:00:00Z",
    "default_host_group_id": "uuid",
    "metadata": { "integration_type": "proxmox-lxc" },
    "scopes": null,
    "host_groups": {
      "id": "uuid",
      "name": "Proxmox LXC",
      "color": "#3B82F6"
    },
    "users": {
      "id": "uuid",
      "username": "admin",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
]
```

Os tokens vêm em ordem decrescente de data de criação. O `token_secret` nunca aparece nas respostas de listagem.

#### Detalhes do token

**Endpoint:** `GET /api/v1/auto-enrollment/tokens/{tokenId}`

**Resposta:** `200 OK`. Mesma estrutura de um token na resposta da listagem (sem `token_secret`).

**Erro:** `404 Not Found` se o `tokenId` não existir.

#### Atualizar token

**Endpoint:** `PATCH /api/v1/auto-enrollment/tokens/{tokenId}`

Todos os campos são opcionais. Inclua só os que quer mudar.

**Corpo da requisição:**

| Campo | Tipo | Descrição |
|-------|------|-------------|
| `token_name` | string | Novo nome (1–255 caracteres) |
| `is_active` | boolean | Ativa ou desativa o token |
| `max_hosts_per_day` | integer | Novo limite de ritmo (1–1000) |
| `allowed_ip_ranges` | string[] | Nova lista de IPs permitidos |
| `default_host_group_id` | string | Novo grupo de hosts (string vazia para limpar) |
| `expires_at` | string | Nova data de expiração (ISO 8601) |
| `scopes` | object | Novos escopos (só tokens do tipo integração de API) |

**Exemplo de requisição:**
```json
{
  "is_active": false,
  "max_hosts_per_day": 200,
  "allowed_ip_ranges": ["192.168.1.0/24"]
}
```

**Resposta:** `200 OK`
```json
{
  "message": "Token updated successfully",
  "token": {
    "id": "uuid",
    "token_name": "Proxmox Production",
    "token_key": "patchmon_ae_abc123...",
    "is_active": false,
    "max_hosts_per_day": 200,
    "allowed_ip_ranges": ["192.168.1.0/24"],
    "host_groups": { "id": "uuid", "name": "Proxmox LXC", "color": "#3B82F6" },
    "users": { "id": "uuid", "username": "admin", "first_name": "John", "last_name": "Doe" }
  }
}
```

**Erros:**
- `404 Not Found`: o token não existe
- `400 Bad Request`: grupo de hosts não encontrado, ou tentativa de atualizar escopos num token que não é de API

#### Excluir token

**Endpoint:** `DELETE /api/v1/auto-enrollment/tokens/{tokenId}`

**Resposta:** `200 OK`
```json
{
  "message": "Auto-enrollment token deleted successfully",
  "deleted_token": {
    "id": "uuid",
    "token_name": "Proxmox Production"
  }
}
```

**Erro:** `404 Not Found` se o `tokenId` não existir.

### Endpoints de registro {#enrollment-endpoints}

#### Baixar o script de registro

**Endpoint:** `GET /api/v1/auto-enrollment/script`

Este endpoint valida as credenciais do token e entrega um script bash com a URL do servidor do PatchMon, as credenciais do token e a configuração já embutidas.

**Parâmetros de query:**

| Parâmetro | Obrigatório | Descrição |
|-----------|----------|-------------|
| `type` | Sim | Tipo de script: `proxmox-lxc` ou `direct-host` |
| `token_key` | Sim | Token key de registro automático |
| `token_secret` | Sim | Token secret de registro automático |
| `force` | Não | Defina `true` para ativar o modo de instalação forçada (para pacotes quebrados) |

**Exemplo:**
```bash
curl "https://patchmon.example.com/api/v1/auto-enrollment/script?type=proxmox-lxc&token_key=KEY&token_secret=SECRET"
```

**Resposta:** `200 OK`. Script bash em texto simples, com as credenciais embutidas.

**Erros:**
- `400 Bad Request`: parâmetro `type` ausente ou inválido
- `401 Unauthorized`: credenciais ausentes, token inválido/inativo, secret inválido ou token expirado
- `404 Not Found`: o arquivo do script não foi encontrado no servidor

#### Registrar um único host

**Endpoint:** `POST /api/v1/auto-enrollment/enroll`

**Cabeçalhos:**
```
X-Auto-Enrollment-Key: patchmon_ae_abc123...
X-Auto-Enrollment-Secret: def456ghi789...
Content-Type: application/json
```

**Corpo da requisição:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|----------|-------------|
| `friendly_name` | string | Sim | Nome de exibição do host (máx. 255 caracteres) |
| `machine_id` | string | Não | Identificador único da máquina (máx. 255 caracteres) |
| `metadata` | object | Não | Metadados adicionais (vmid, proxmox_node, ip_address, os_info etc.) |

**Exemplo de requisição:**
```json
{
  "friendly_name": "webserver",
  "machine_id": "proxmox-lxc-100-abc123",
  "metadata": {
    "vmid": "100",
    "proxmox_node": "proxmox01",
    "ip_address": "10.0.0.10",
    "os_info": "Ubuntu 22.04 LTS"
  }
}
```

**Resposta:** `201 Created`
```json
{
  "message": "Host enrolled successfully",
  "host": {
    "id": "uuid",
    "friendly_name": "webserver",
    "api_id": "patchmon_abc123def456",
    "api_key": "raw-api-key-value",
    "host_group": {
      "id": "uuid",
      "name": "Proxmox LXC",
      "color": "#3B82F6"
    },
    "status": "pending"
  }
}
```

> **Observação:** a `api_key` só é devolvida nesta resposta (em texto claro). Ela passa por hash antes de ser guardada. O `host_group` vem como `null` se o token não tiver grupo de hosts padrão configurado.

**Respostas de erro:**

| Status | Erro | Causa |
|--------|-------|-------|
| `400` | Erros de validação | `friendly_name` ausente ou inválido |
| `401` | `Auto-enrollment credentials required` | Faltam os cabeçalhos `X-Auto-Enrollment-Key` ou `X-Auto-Enrollment-Secret` |
| `401` | `Invalid or inactive token` | Token key não encontrado ou token desativado |
| `401` | `Invalid token secret` | O secret não bate |
| `401` | `Token expired` | O token passou da data de expiração |
| `403` | `IP address not authorized for this token` | O IP do cliente não está em `allowed_ip_ranges` |
| `429` | `Rate limit exceeded` | O limite `max_hosts_per_day` do token foi atingido |

> **Tratamento de duplicatas:** a API não verifica hosts duplicados no servidor. A prevenção de duplicatas é feita do lado do cliente, pelo script de registro, que procura uma configuração de agente existente (`/etc/patchmon/config.yml`) dentro de cada contêiner antes de chamar a API.

### Endpoints de gestão de hosts {#host-management-endpoints}

Estes endpoints são usados pelo agente do PatchMon (não pelo script de registro). Eles se autenticam com as credenciais `X-API-ID` e `X-API-KEY` de cada host, devolvidas no registro.

#### Baixar o script de instalação do agente

**Endpoint:** `GET /api/v1/hosts/install`

Entrega um script de shell que prepara o agente do PatchMon num host. O script usa um mecanismo seguro de token de bootstrap; as credenciais de API de verdade não vão embutidas diretamente no script.

**Cabeçalhos:**
```
X-API-ID: patchmon_abc123
X-API-KEY: def456ghi789
```

**Parâmetros de query:**

| Parâmetro | Obrigatório | Descrição |
|-----------|----------|-------------|
| `force` | Não | Defina `true` para ativar o modo de instalação forçada |
| `arch` | Não | Força uma arquitetura (por exemplo, `amd64`, `arm64`); detectada automaticamente se omitida |

**Resposta:** `200 OK`. Script de shell em texto simples, com o token de bootstrap embutido.

#### Baixar o binário / script do agente

**Endpoint:** `GET /api/v1/hosts/agent/download`

Baixa o binário do agente do PatchMon (binário Go, nos agentes atuais) ou o script de migração (nos agentes antigos em bash).

**Cabeçalhos:**
```
X-API-ID: patchmon_abc123
X-API-KEY: def456ghi789
```

**Parâmetros de query:**

| Parâmetro | Obrigatório | Descrição |
|-----------|----------|-------------|
| `arch` | Não | Arquitetura (por exemplo, `amd64`, `arm64`) |
| `force` | Não | Defina `binary` para forçar o download do binário |

**Resposta:** `200 OK`. Arquivo binário ou script de shell.

#### Atualização de dados do host

**Endpoint:** `POST /api/v1/hosts/update`

Usado pelo agente para reportar os dados de pacotes, as informações do sistema e os detalhes de hardware.

**Cabeçalhos:**
```
X-API-ID: patchmon_abc123
X-API-KEY: def456ghi789
Content-Type: application/json
```

**Campos do corpo da requisição:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|----------|-------------|
| `packages` | array | Sim | Array de objetos de pacote (máx. 10.000) |
| `packages[].name` | string | Sim | Nome do pacote |
| `packages[].currentVersion` | string | Sim | Versão instalada |
| `packages[].availableVersion` | string | Não | Versão disponível para atualização |
| `packages[].needsUpdate` | boolean | Sim | Se há atualização disponível |
| `packages[].isSecurityUpdate` | boolean | Não | Se a atualização é de segurança |
| `agentVersion` | string | Não | Versão do agente que está reportando |
| `osType` | string | Não | Tipo de sistema operacional |
| `osVersion` | string | Não | Versão do sistema operacional |
| `hostname` | string | Não | Hostname do sistema |
| `ip` | string | Não | Endereço IP do sistema |
| `architecture` | string | Não | Arquitetura da CPU |
| `cpuModel` | string | Não | Modelo da CPU |
| `cpuCores` | integer | Não | Número de núcleos da CPU |
| `ramInstalled` | float | Não | RAM instalada, em GB |
| `swapSize` | float | Não | Tamanho do swap, em GB |
| `diskDetails` | array | Não | Array de objetos de disco |
| `gatewayIp` | string | Não | IP do gateway padrão |
| `dnsServers` | array | Não | Array de IPs de servidores DNS |
| `networkInterfaces` | array | Não | Array de objetos de interface de rede |
| `kernelVersion` | string | Não | Versão do kernel em execução |
| `installedKernelVersion` | string | Não | Versão do kernel instalada (em disco) |
| `selinuxStatus` | string | Não | Status do SELinux (`enabled`, `disabled` ou `permissive`) |
| `systemUptime` | string | Não | Uptime do sistema. Dentro de um contêiner (Proxmox LXC, Docker), é o uptime do próprio contêiner, não o do host |
| `bootTime` | string | Não | Instante do boot, como horário ISO 8601 em UTC. Permite que a interface atualize o uptime ao vivo entre os relatórios |
| `loadAverage` | array | Não | Valores de load average |
| `machineId` | string | Não | Machine ID |
| `needsReboot` | boolean | Não | Se é preciso reiniciar |
| `rebootReason` | string | Não | Motivo pelo qual é preciso reiniciar |
| `repositories` | array | Não | Repositórios de pacotes configurados |
| `executionTime` | string | Não | Tempo gasto para coletar os dados |

**Exemplo de requisição:**
```json
{
  "packages": [
    {
      "name": "nginx",
      "currentVersion": "1.18.0",
      "availableVersion": "1.20.0",
      "needsUpdate": true,
      "isSecurityUpdate": false
    }
  ],
  "agentVersion": "1.5.0",
  "cpuModel": "Intel Xeon E5-2680 v4",
  "cpuCores": 8,
  "ramInstalled": 16.0,
  "swapSize": 2.0,
  "diskDetails": [
    {
      "device": "/dev/sda1",
      "mountPoint": "/",
      "size": "50GB",
      "used": "25GB",
      "available": "25GB"
    }
  ],
  "gatewayIp": "192.168.1.1",
  "dnsServers": ["8.8.8.8", "8.8.4.4"],
  "networkInterfaces": [
    {
      "name": "eth0",
      "ip": "192.168.1.10",
      "mac": "00:11:22:33:44:55"
    }
  ],
  "kernelVersion": "5.4.0-74-generic",
  "selinuxStatus": "disabled"
}
```

**Resposta:** `200 OK`
```json
{
  "message": "Host updated successfully",
  "packagesProcessed": 1,
  "updatesAvailable": 1,
  "securityUpdates": 0
}
```

### Exemplos de integração com o Ansible {#ansible-integration-examples}

#### Playbook básico para registro no Proxmox

```yaml
---
- name: Enroll Proxmox LXC containers in PatchMon
  hosts: proxmox_hosts
  become: yes
  vars:
    patchmon_url: "https://patchmon.example.com"
    token_key: "{{ vault_patchmon_token_key }}"
    token_secret: "{{ vault_patchmon_token_secret }}"
    host_prefix: "prod-"

  tasks:
    - name: Install dependencies
      apt:
        name:
          - curl
          - jq
        state: present

    - name: Download enrollment script
      get_url:
        url: "{{ patchmon_url }}/api/v1/auto-enrollment/script?type=proxmox-lxc&token_key={{ token_key }}&token_secret={{ token_secret }}"
        dest: /root/proxmox_auto_enroll.sh
        mode: '0700'

    - name: Run enrollment
      command: /root/proxmox_auto_enroll.sh
      environment:
        HOST_PREFIX: "{{ host_prefix }}"
        DEBUG: "true"
      register: enrollment_output

    - name: Show enrollment results
      debug:
        var: enrollment_output.stdout_lines
```

#### Playbook avançado, com gestão de tokens

```yaml
---
- name: Manage PatchMon Proxmox Integration
  hosts: localhost
  vars:
    patchmon_url: "https://patchmon.example.com"
    admin_token: "{{ vault_patchmon_admin_token }}"

  tasks:
    - name: Create Proxmox enrollment token
      uri:
        url: "{{ patchmon_url }}/api/v1/auto-enrollment/tokens"
        method: POST
        headers:
          Authorization: "Bearer {{ admin_token }}"
          Content-Type: "application/json"
        body_format: json
        body:
          token_name: "{{ inventory_hostname }}-proxmox"
          max_hosts_per_day: 200
          default_host_group_id: "{{ proxmox_host_group_id }}"
          allowed_ip_ranges: ["{{ proxmox_host_ip }}"]
          expires_at: "2026-12-31T23:59:59Z"
          metadata:
            integration_type: "proxmox-lxc"
            environment: "{{ environment }}"
        status_code: 201
      register: token_response

    - name: Store token credentials
      set_fact:
        enrollment_token_key: "{{ token_response.json.token.token_key }}"
        enrollment_token_secret: "{{ token_response.json.token.token_secret }}"

    - name: Deploy enrollment script to Proxmox hosts
      include_tasks: deploy_enrollment.yml
      vars:
        enrollment_token_key: "{{ enrollment_token_key }}"
        enrollment_token_secret: "{{ enrollment_token_secret }}"
```

#### Role do Ansible

```yaml
# roles/patchmon_proxmox/tasks/main.yml
---
- name: Install PatchMon dependencies
  package:
    name:
      - curl
      - jq
    state: present

- name: Create PatchMon directory
  file:
    path: /opt/patchmon
    state: directory
    mode: '0755'

- name: Download enrollment script
  get_url:
    url: "{{ patchmon_url }}/api/v1/auto-enrollment/script?type=proxmox-lxc&token_key={{ token_key }}&token_secret={{ token_secret }}&force={{ force_install | default('false') }}"
    dest: /opt/patchmon/proxmox_auto_enroll.sh
    mode: '0700'

- name: Run enrollment script
  command: /opt/patchmon/proxmox_auto_enroll.sh
  environment:
    PATCHMON_URL: "{{ patchmon_url }}"
    AUTO_ENROLLMENT_KEY: "{{ token_key }}"
    AUTO_ENROLLMENT_SECRET: "{{ token_secret }}"
    HOST_PREFIX: "{{ host_prefix | default('') }}"
    DRY_RUN: "{{ dry_run | default('false') }}"
    DEBUG: "{{ debug | default('false') }}"
    FORCE_INSTALL: "{{ force_install | default('false') }}"
  register: enrollment_output

- name: Display enrollment results
  debug:
    var: enrollment_output.stdout_lines
  when: enrollment_output.stdout_lines is defined

- name: Fail if enrollment had errors
  fail:
    msg: "Enrollment failed with errors"
  when: enrollment_output.rc != 0
```

#### Ansible Vault para as credenciais

```yaml
# group_vars/all/vault.yml (encrypted with ansible-vault)
---
vault_patchmon_admin_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
vault_patchmon_token_key: "patchmon_ae_abc123..."
vault_patchmon_token_secret: "def456ghi789..."
```

#### Playbook com tratamento de erros e novas tentativas

```yaml
---
- name: Robust Proxmox enrollment with error handling
  hosts: proxmox_hosts
  become: yes
  vars:
    patchmon_url: "https://patchmon.example.com"
    token_key: "{{ vault_patchmon_token_key }}"
    token_secret: "{{ vault_patchmon_token_secret }}"
    max_retries: 3
    retry_delay: 30

  tasks:
    - name: Test PatchMon connectivity
      uri:
        url: "{{ patchmon_url }}/api/v1/auto-enrollment/tokens"
        method: GET
        headers:
          Authorization: "Bearer {{ vault_patchmon_admin_token }}"
        status_code: 200
      retries: "{{ max_retries }}"
      delay: "{{ retry_delay }}"

    - name: Download enrollment script
      get_url:
        url: "{{ patchmon_url }}/api/v1/auto-enrollment/script?type=proxmox-lxc&token_key={{ token_key }}&token_secret={{ token_secret }}"
        dest: /root/proxmox_auto_enroll.sh
        mode: '0700'
      retries: "{{ max_retries }}"
      delay: "{{ retry_delay }}"

    - name: Run enrollment with retry logic
      shell: |
        for i in {1..{{ max_retries }}}; do
          echo "Attempt $i of {{ max_retries }}"
          if /root/proxmox_auto_enroll.sh; then
            echo "Enrollment successful"
            exit 0
          else
            echo "Enrollment failed, retrying in {{ retry_delay }} seconds..."
            sleep {{ retry_delay }}
          fi
        done
        echo "All enrollment attempts failed"
        exit 1
      register: enrollment_result

    - name: Handle enrollment failure
      fail:
        msg: "Proxmox enrollment failed after {{ max_retries }} attempts"
      when: enrollment_result.rc != 0

    - name: Parse enrollment results
      set_fact:
        enrolled_count: "{{ enrollment_result.stdout | regex_search('Successfully Enrolled:\\s+(\\d+)', '\\1') | default('0') }}"
        failed_count: "{{ enrollment_result.stdout | regex_search('Failed:\\s+(\\d+)', '\\1') | default('0') }}"

    - name: Report enrollment statistics
      debug:
        msg: |
          Enrollment completed:
          - Successfully enrolled: {{ enrolled_count }} containers
          - Failed: {{ failed_count }} containers
```

### Tratamento de erros {#error-handling}

#### Códigos de status HTTP

| Código | Significado | Quando acontece |
|------|---------|----------------|
| `200` | OK | Operações de leitura/atualização bem-sucedidas |
| `201` | Created | Token ou host criado com sucesso |
| `400` | Bad Request | Erros de validação, grupo de hosts inválido, tipo de script inválido |
| `401` | Unauthorized | Credenciais ausentes, inválidas ou expiradas |
| `403` | Forbidden | O endereço IP não está na lista de permitidos do token |
| `404` | Not Found | Token ou recurso não encontrado |
| `429` | Too Many Requests | O limite diário de criação de hosts do token foi excedido |
| `500` | Internal Server Error | Erro inesperado no servidor |

#### Formatos das respostas de erro

**Erro simples:**
```json
{
  "error": "Error message describing what went wrong"
}
```

**Erro com detalhe:**
```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 100 hosts per day allowed for this token"
}
```

**Erros de validação (400):**
```json
{
  "errors": [
    {
      "msg": "Token name is required (max 255 characters)",
      "param": "token_name",
      "location": "body"
    }
  ]
}
```

### Limite de requisições

#### Limites por token

Cada token de registro automático tem um limite `max_hosts_per_day` configurável:

- **Padrão**: 100 hosts por dia por token
- **Faixa**: de 1 a 1000 hosts por dia
- **Reinício**: diário (quando chega a primeira requisição de um novo dia)
- **Escopo**: por token, não por IP

Quando o limite é excedido, a API retorna `429 Too Many Requests`:

```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 100 hosts per day allowed for this token"
}
```

#### Limite global de requisições

Os endpoints de registro automático também estão sujeitos ao limitador global de autenticação do servidor, que vale para todos os endpoints relacionados à autenticação.

### Considerações de segurança {#security-considerations}

#### Segurança dos tokens

- **Hash do secret**: os secrets dos tokens passam por hash com bcrypt (fator de custo 10) antes de serem guardados
- **Exibição única**: os secrets só são devolvidos na criação do token
- **Rotação**: recomendada a cada 90 dias
- **Escopo limitado**: os tokens só criam hosts. Não conseguem ler, alterar nem excluir dados de hosts existentes.

#### Restrições de IP

Os tokens aceitam lista de IPs permitidos, com IPs exatos e notação CIDR:

```json
{
  "allowed_ip_ranges": ["192.168.1.10", "10.0.0.0/24"]
}
```

Endereços IPv6 que mapeiam IPv4 (por exemplo, `::ffff:192.168.1.10`) são tratados automaticamente.

#### Segurança da API key do host

- As API keys dos hosts (`api_key`) passam por hash com bcrypt antes de serem guardadas
- O script de instalação usa um mecanismo de token de bootstrap; as credenciais de API de verdade não vão embutidas no script
- Os tokens de bootstrap são de uso único e expiram depois de 5 minutos

#### Segurança de rede

- Use sempre HTTPS em produção
- A configuração de servidor `ignore_ssl_self_signed` ajusta automaticamente as flags do curl nos scripts entregues
- Implemente regras de firewall para restringir o acesso ao servidor do PatchMon a IPs conhecidos

#### Trilha de auditoria

Toda atividade de registro fica registrada:
- O nome do token vai nas anotações do host (por exemplo, "Auto-enrolled via Production Proxmox on 2025-10-11T14:30:00Z")
- A criação do token registra o `created_by_user_id`
- O horário `last_used_at` é atualizado a cada registro

### Resumo completo dos endpoints

#### Endpoints de administração (autenticação JWT)

| Método | Caminho | Descrição |
|--------|------|-------------|
| `POST` | `/api/v1/auto-enrollment/tokens` | Criar token |
| `GET` | `/api/v1/auto-enrollment/tokens` | Listar todos os tokens |
| `GET` | `/api/v1/auto-enrollment/tokens/{tokenId}` | Obter um token |
| `PATCH` | `/api/v1/auto-enrollment/tokens/{tokenId}` | Atualizar token |
| `DELETE` | `/api/v1/auto-enrollment/tokens/{tokenId}` | Excluir token |

#### Endpoints de registro (autenticação por token)

| Método | Caminho | Descrição |
|--------|------|-------------|
| `GET` | `/api/v1/auto-enrollment/script?type=...` | Baixar o script de registro |
| `POST` | `/api/v1/auto-enrollment/enroll` | Registrar um host |

#### Endpoints de host (credenciais de API)

| Método | Caminho | Descrição |
|--------|------|-------------|
| `GET` | `/api/v1/hosts/install` | Baixar o script de instalação |
| `GET` | `/api/v1/hosts/agent/download` | Baixar o binário / script do agente |
| `POST` | `/api/v1/hosts/update` | Reportar os dados do host |

#### Referência rápida: exemplos com curl

**Criar um token:**
```bash
curl -X POST \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "token_name": "Production Proxmox",
    "max_hosts_per_day": 100,
    "default_host_group_id": "uuid",
    "allowed_ip_ranges": ["192.168.1.10"]
  }' \
  https://patchmon.example.com/api/v1/auto-enrollment/tokens
```

**Baixar e rodar o script de registro:**
```bash
curl -s "https://patchmon.example.com/api/v1/auto-enrollment/script?type=proxmox-lxc&token_key=KEY&token_secret=SECRET" | bash
```

**Registrar um host diretamente:**
```bash
curl -X POST \
  -H "X-Auto-Enrollment-Key: patchmon_ae_abc123..." \
  -H "X-Auto-Enrollment-Secret: def456ghi789..." \
  -H "Content-Type: application/json" \
  -d '{
    "friendly_name": "webserver",
    "machine_id": "proxmox-lxc-100-abc123"
  }' \
  https://patchmon.example.com/api/v1/auto-enrollment/enroll
```

**Baixar o script de instalação do agente:**
```bash
curl -H "X-API-ID: patchmon_abc123" \
     -H "X-API-KEY: def456ghi789" \
     https://patchmon.example.com/api/v1/hosts/install | bash
```

#### Padrões de integração

**Padrão 1: por script (o mais simples)**
```bash
# Download and execute in one command (credentials are injected into the script)
curl -s "https://patchmon.example.com/api/v1/auto-enrollment/script?type=proxmox-lxc&token_key=KEY&token_secret=SECRET" | bash
```

**Padrão 2: API primeiro (mais controle)**
```bash
# 1. Create token via admin API
# 2. Enroll hosts via enrollment API
# 3. Download agent scripts using per-host API credentials
# 4. Install agents with host-specific credentials
```

**Padrão 3: híbrido (recomendado para automação)**
```bash
# 1. Create token via admin API (or UI)
# 2. Download enrollment script with token embedded
# 3. Distribute and run script on Proxmox hosts
# 4. Script handles both enrollment and agent installation
```

---

## Capítulo 6: Documentação da Integration API {#integration-api-documentation}

### Sumário

- [Visão geral](#overview)
- [Referência interativa da API (Swagger)](#interactive-api-reference-swagger)
- [Criando credenciais de API](#creating-api-credentials)
- [Autenticação](#authentication)
- [Escopos e permissões disponíveis](#available-scopes--permissions)
- [Endpoints da API](#api-endpoints)
  - [Listar hosts](#list-hosts)
  - [Estatísticas do host](#get-host-statistics)
  - [Informações do host](#get-host-information)
  - [Informações de rede do host](#get-host-network-information)
  - [Informações de sistema do host](#get-host-system-information)
  - [Pacotes do host](#get-host-packages)
  - [Relatórios de pacotes do host](#get-host-package-reports)
  - [Fila do agente do host](#get-host-agent-queue)
  - [Anotações do host](#get-host-notes)
  - [Integrações do host](#get-host-integrations)
  - [Excluir host](#delete-host)
- [Exemplos de uso](#usage-examples)
- [Boas práticas de segurança](#security-best-practices)
- [Solução de problemas](#troubleshooting)

---

### Visão geral

A Integration API do PatchMon dá acesso programático à sua instância do PatchMon, para automação, integração com ferramentas de terceiros e fluxos de trabalho próprios. As credenciais de API usam **HTTP Basic Authentication**, com permissões por escopo que controlam o acesso a recursos e ações específicos.

#### Principais recursos

- **Permissões por escopo**: controle fino sobre o que cada credencial pode acessar
- **Restrições de IP**: lista opcional de IPs permitidos, para mais segurança
- **Datas de expiração**: expiração automática para acessos temporários
- **Basic Authentication**: método de autenticação padrão de mercado (RFC 7617)
- **Limite de requisições**: proteção embutida contra abuso
- **Trilha de auditoria**: acompanhamento do uso das credenciais pelo horário do último uso

#### Casos de uso

- **Automação**: integrar os dados do PatchMon a pipelines de CI/CD
- **Gestão de inventário**: usar com Ansible, Terraform ou outras ferramentas de IaC
- **Monitoramento**: alimentar painéis de monitoramento com os dados do PatchMon
- **Scripts próprios**: criar ferramentas próprias que conversam com o PatchMon
- **Integrações de terceiros**: conectar o PatchMon a outros sistemas

---

### Referência interativa da API (Swagger) {#interactive-api-reference-swagger}

O PatchMon traz uma referência interativa da API embutida, feita com o Swagger UI. Nela dá para explorar todos os endpoints disponíveis, ver os esquemas de requisição e resposta e testar chamadas à API direto no navegador.

**Para acessar o Swagger UI:**

```
https://<your-patchmon-url>/api/v1/api-docs
```

> **Observação:** o Swagger UI exige que você esteja conectado ao PatchMon (autenticação JWT). Entre antes no painel do PatchMon e depois abra a URL acima na mesma sessão do navegador.

A referência do Swagger cobre todos os endpoints internos e com escopo. Esta documentação trata especificamente da **Integration API com escopo**, que usa Basic Authentication com credenciais de API.

---

### Criando credenciais de API {#creating-api-credentials}

#### Passo a passo

##### 1. Vá a Settings

1. Entre na sua instância do PatchMon como administrador
2. Vá a **Settings** → **Integrations**
3. Aparece a aba **Auto-Enrollment & API**

##### 2. Clique em "New Token"

Clique no botão **"New Token"**. Abre-se uma janela em que você escolhe o tipo de credencial.

##### 3. Escolha "API" como tipo de uso

Na janela de criação, escolha **"API"** como tipo de uso. Isso configura a credencial para acesso programático via Basic Authentication.

##### 4. Configure a credencial

Preencha os campos abaixo.

**Campos obrigatórios:**

| Campo | Descrição | Exemplo |
|-------|-------------|---------|
| **Token Name** | Um nome descritivo, para identificação e auditoria | `Ansible Inventory`, `Monitoring Dashboard` |
| **Scopes** | As permissões que esta credencial deve ter (pelo menos uma é obrigatória) | `host: get` |

**Campos opcionais:**

| Campo | Descrição | Exemplo |
|-------|-------------|---------|
| **Allowed IP Addresses** | Lista, separada por vírgula, de IPs ou faixas CIDR que podem usar esta credencial. Deixe vazio para acesso sem restrição. | `192.168.1.100, 10.0.0.0/24` |
| **Expiration Date** | Data de expiração automática da credencial. Deixe vazio para não expirar. | `2026-12-31T23:59:59` |
| **Default Host Group** | Atribui, opcionalmente, um grupo de hosts padrão | `Production` |

##### 5. Guarde as suas credenciais

**IMPORTANTE: guarde estas credenciais na hora. O secret não pode ser recuperado depois.**

Depois da criação, aparece uma janela de sucesso com:

- **Token Key**: a API key (usada como usuário no Basic Auth), com o prefixo `patchmon_ae_`
- **Token Secret**: o secret da API (usado como senha). **Aparece uma única vez.**
- **Granted Scopes**: as permissões atribuídas
- **Usage Examples**: comandos cURL já preenchidos, prontos para copiar

Copie o Token Key e o Token Secret e guarde-os em lugar seguro antes de fechar a janela.

---

### Autenticação

#### Basic Authentication

As credenciais de API do PatchMon usam HTTP Basic Authentication, conforme a [RFC 7617](https://tools.ietf.org/html/rfc7617).

##### Formato

```
Authorization: Basic <base64(token_key:token_secret)>
```

##### Como funciona

1. Junte o seu token key e o secret com dois-pontos: `token_key:token_secret`
2. Codifique a string resultante em Base64
3. Coloque `Basic ` na frente da string codificada
4. Envie no cabeçalho `Authorization`

A maioria dos clientes HTTP faz isso sozinha (por exemplo, a flag `-u` do cURL ou o `HTTPBasicAuth` do Python).

#### Fluxo de autenticação

```
┌─────────────┐                                  ┌─────────────┐
│   Client     │                                  │  PatchMon   │
│ Application  │                                  │   Server    │
└──────┬──────┘                                  └──────┬──────┘
       │                                                │
       │  1. Send request with Basic Auth               │
       │  Authorization: Basic <base64>                 │
       │───────────────────────────────────────────────>│
       │                                                │
       │                  2. Validate credentials       │
       │                     a. Decode Base64           │
       │                     b. Find token by key       │
       │                     c. Check is_active         │
       │                     d. Check expiration        │
       │                     e. Verify integration type │
       │                     f. Verify secret (bcrypt)  │
       │                     g. Check IP restrictions   │
       │                     h. Update last_used_at     │
       │                                                │
       │                  3. Validate scopes            │
       │                     a. Check resource access   │
       │                     b. Check action permission │
       │                                                │
       │                  4. Return response            │
       │<───────────────────────────────────────────────│
       │  200 OK + Data (if authorised)                 │
       │  401 Unauthorised (if auth fails)              │
       │  403 Forbidden (if scope/IP check fails)       │
```

#### Etapas de validação (em ordem)

O servidor faz estas verificações em sequência. Se qualquer etapa falhar, a requisição é recusada na hora:

1. **Cabeçalho Authorization**: procura o cabeçalho `Authorization: Basic`
2. **Formato da credencial**: valida o formato `key:secret` depois de decodificar o Base64
3. **Existência do token**: procura o token key no banco
4. **Estado ativo**: confirma que a flag `is_active` é `true`
5. **Expiração**: confirma que o token não expirou (`expires_at`)
6. **Tipo de integração**: confirma que `metadata.integration_type` é `"api"`
7. **Verificação do secret**: compara o secret informado com o hash bcrypt
8. **Restrição de IP**: valida o IP do cliente contra `allowed_ip_ranges` (se configurado)
9. **Atualização do último uso**: atualiza o horário `last_used_at` (acontece durante a autenticação, antes de o handler rodar)
10. **Validação de escopo**: confirma que a credencial tem o escopo exigido pelo endpoint (feito por um middleware separado)

---

### Escopos e permissões disponíveis {#available-scopes--permissions}

As credenciais de API usam um modelo de escopo **recurso–ação**:

```json
{
  "resource": ["action1", "action2"]
}
```

#### Recurso host

**Nome do recurso:** `host`

| Ação | Descrição |
|--------|-------------|
| `get` | Ler dados dos hosts (listar hosts, ver detalhes, estatísticas, pacotes, rede, sistema, relatórios, anotações, integrações) |
| `delete` | Excluir hosts |

**Exemplos de configuração de escopo:**

```json
// Read-only access
{ "host": ["get"] }

// Read and delete
{ "host": ["get", "delete"] }
```

#### Observações importantes

- Os escopos são **explícitos**: não há herança nem curingas. Cada ação precisa ser concedida explicitamente.
- `get` **não** inclui automaticamente `delete` nem nenhuma outra ação.
- É preciso conceder pelo menos uma ação em pelo menos um recurso. Credenciais sem escopo são recusadas na criação.

---

### Endpoints da API {#api-endpoints}

Todos os endpoints têm o prefixo `/api/v1/api` e exigem Basic Authentication com uma credencial que tenha o escopo adequado.

#### Resumo dos endpoints

| Endpoint | Método | Escopo | Descrição |
|----------|--------|-------|-------------|
| `/api/v1/api/hosts` | GET | `host:get` | Lista todos os hosts, com IP, grupos e estatísticas opcionais |
| `/api/v1/api/hosts/:id/stats` | GET | `host:get` | Estatísticas de pacotes e repositórios do host |
| `/api/v1/api/hosts/:id/info` | GET | `host:get` | Informações detalhadas do host |
| `/api/v1/api/hosts/:id/network` | GET | `host:get` | Configuração de rede do host |
| `/api/v1/api/hosts/:id/system` | GET | `host:get` | Detalhes de sistema do host |
| `/api/v1/api/hosts/:id/packages` | GET | `host:get` | Pacotes do host (com filtro opcional de atualizações) |
| `/api/v1/api/hosts/:id/package_reports` | GET | `host:get` | Histórico de atualizações de pacotes |
| `/api/v1/api/hosts/:id/agent_queue` | GET | `host:get` | Estado e jobs da fila do agente |
| `/api/v1/api/hosts/:id/notes` | GET | `host:get` | Anotações do host |
| `/api/v1/api/hosts/:id/integrations` | GET | `host:get` | Estado das integrações do host |
| `/api/v1/api/hosts/:id` | DELETE | `host:delete` | Exclui um host e todos os dados relacionados |

---

#### Listar hosts {#list-hosts}

Obtém a lista de todos os hosts, com os endereços IP e os grupos de hosts a que pertencem. Opcionalmente, inclui as estatísticas de atualização de pacotes junto com cada host.

**Endpoint:**

```
GET /api/v1/api/hosts
```

**Escopo necessário:** `host:get`

**Parâmetros de query:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|----------|-------------|
| `hostgroup` | string | Não | Filtra por nome(s) ou UUID(s) de grupo de hosts. Separe por vírgula para vários grupos (lógica OU). |
| `include` | string | Não | Lista, separada por vírgula, de dados adicionais a incluir. Valores suportados: `stats`. |

**Filtrando por grupos de hosts:**

```bash
# Filter by group name
GET /api/v1/api/hosts?hostgroup=Production

# Filter by multiple groups (hosts in ANY of the listed groups)
GET /api/v1/api/hosts?hostgroup=Production,Development

# Filter by group UUID
GET /api/v1/api/hosts?hostgroup=550e8400-e29b-41d4-a716-446655440000

# Mix names and UUIDs
GET /api/v1/api/hosts?hostgroup=Production,550e8400-e29b-41d4-a716-446655440000
```

**Incluindo estatísticas:**

Use `?include=stats` para acrescentar a cada host, numa única requisição, as contagens de atualizações de pacotes e metadados adicionais. É mais eficiente do que fazer chamadas `/stats` separadas para cada host.

```bash
# List all hosts with stats
GET /api/v1/api/hosts?include=stats

# Combine with host group filter
GET /api/v1/api/hosts?hostgroup=Production&include=stats
```

> **Observação:** se os nomes dos seus grupos de hosts tiverem espaços, codifique-os na URL com `%20` (por exemplo, `Web%20Servers`). A maioria dos clientes HTTP faz isso sozinha.

**Resposta (200 OK) sem estatísticas:**

```json
{
  "hosts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "friendly_name": "web-server-01",
      "hostname": "web01.example.com",
      "ip": "192.168.1.100",
      "host_groups": [
        {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "name": "Production"
        }
      ]
    }
  ],
  "total": 1,
  "filtered_by_groups": ["Production"]
}
```

**Resposta (200 OK) com estatísticas (`?include=stats`):**

```json
{
  "hosts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "friendly_name": "web-server-01",
      "hostname": "web01.example.com",
      "ip": "192.168.1.100",
      "host_groups": [
        {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "name": "Production"
        }
      ],
      "os_type": "Ubuntu",
      "os_version": "24.04 LTS",
      "last_update": "2026-02-12T10:30:00.000Z",
      "status": "active",
      "effective_status": "active",
      "reporting_state": "reporting",
      "update_state": "security_required",
      "needs_reboot": false,
      "updates_count": 15,
      "security_updates_count": 3,
      "total_packages": 342
    }
  ],
  "total": 1,
  "filtered_by_groups": ["Production"]
}
```

> O campo `filtered_by_groups` só aparece quando um filtro `hostgroup` é aplicado.

**Campos da resposta:**

| Campo | Tipo | Descrição |
|-------|------|-------------|
| `hosts` | array | Array de objetos de host |
| `hosts[].id` | string (UUID) | Identificador único do host |
| `hosts[].friendly_name` | string | Nome legível do host |
| `hosts[].hostname` | string | Hostname do sistema |
| `hosts[].ip` | string | Endereço IP principal |
| `hosts[].host_groups` | array | Grupos a que o host pertence |
| `hosts[].os_type` | string | Tipo de sistema operacional (só com `include=stats`) |
| `hosts[].os_version` | string | Versão do sistema operacional (só com `include=stats`) |
| `hosts[].last_update` | string (ISO 8601) | Horário da última atualização do agente (só com `include=stats`) |
| `hosts[].status` | string | Estado do ciclo de registro, `pending` ou `active` (só com `include=stats`). Veja "Qual campo de status devo usar?", abaixo |
| `hosts[].effective_status` | string | O status que a interface web mostra: `pending`, `active` ou `inactive` (só com `include=stats`) |
| `hosts[].reporting_state` | string | Atualidade dos relatórios: `reporting`, `overdue` ou `stale` (só com `include=stats`) |
| `hosts[].update_state` | string | Situação de patches: `up_to_date`, `updates_pending` ou `security_required` (só com `include=stats`) |
| `hosts[].needs_reboot` | boolean | Se há reinício pendente (só com `include=stats`) |
| `hosts[].updates_count` | integer | Número de pacotes que precisam de atualização (só com `include=stats`) |
| `hosts[].security_updates_count` | integer | Número de atualizações de segurança disponíveis (só com `include=stats`) |
| `hosts[].total_packages` | integer | Total de pacotes instalados (só com `include=stats`) |
| `total` | integer | Número total de hosts devolvidos |
| `filtered_by_groups` | array | Grupos usados no filtro (só aparece quando há filtro) |

##### Qual campo de status devo usar?

A resposta traz quatro campos com cara de status porque eles respondem a quatro perguntas diferentes. Escolher o errado é a fonte de confusão mais comum quando uma integração discorda do que a interface web mostra.

| Campo | Pergunta que responde | Valores |
|-------|--------------------|--------|
| `status` | Este host terminou o registro? | `pending` até o primeiro check-in; depois, `active` para sempre |
| `effective_status` | O que a interface web mostra para este host? | `pending`, `active`, `inactive` |
| `reporting_state` | Quão recentes são os dados deste host? | `reporting`, `overdue`, `stale` |
| `update_state` | Este host precisa de patches? | `up_to_date`, `updates_pending`, `security_required` |

Dois pontos que vale saber:

- **`status` nunca vira `inactive`.** Ele registra até onde o host chegou no registro, não se ele está vivo. Depois que um host faz check-in uma vez, ele fica `active` até ser excluído, mesmo que nunca mais reporte. Se o que você quer saber é "este host ainda conversa com o PatchMon?", use `effective_status` ou `reporting_state`.
- **`effective_status` é calculado no momento da requisição**, a partir do `last_update` e do Update Interval configurado em Settings. Um host aparece como `inactive` quando fica em silêncio por mais que o dobro desse intervalo, exatamente a regra que a interface web aplica. `reporting_state` usa o mesmo relógio, mas separa a faixa do meio: `overdue` cobre de um a dois intervalos de silêncio, e `stale` é além de dois.

O caso `pending` é o único ponto em que os dois discordam de propósito. Um host que foi criado mas nunca fez check-in continua `pending` em `effective_status`, porque "nunca terminou o registro" é mais útil que "ficou em silêncio", enquanto `reporting_state` o informa como `stale`.

> O `effective_status` foi acrescentado no PatchMon 2.0.3. Nas versões anteriores, o endpoint devolve só `status`, e você mesmo pode reproduzir o valor da interface web comparando o `last_update` com o dobro do Update Interval configurado.

---

#### Estatísticas do host {#get-host-statistics}

Obtém as estatísticas de pacotes e repositórios de um host específico.

**Endpoint:**

```
GET /api/v1/api/hosts/:id/stats
```

**Escopo necessário:** `host:get`

**Resposta (200 OK):**

```json
{
  "host_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_installed_packages": 342,
  "outdated_packages": 15,
  "security_updates": 3,
  "total_repos": 8
}
```

**Campos da resposta:**

| Campo | Tipo | Descrição |
|-------|------|-------------|
| `host_id` | string (UUID) | O identificador do host |
| `total_installed_packages` | integer | Total de pacotes instalados neste host |
| `outdated_packages` | integer | Pacotes que precisam de atualização |
| `security_updates` | integer | Pacotes com atualizações de segurança disponíveis |
| `total_repos` | integer | Total de repositórios associados ao host |

---

#### Informações do host {#get-host-information}

Obtém informações detalhadas de um host específico, incluindo detalhes do sistema operacional e grupos de hosts.

**Endpoint:**

```
GET /api/v1/api/hosts/:id/info
```

**Escopo necessário:** `host:get`

**Resposta (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "machine_id": "abc123def456",
  "friendly_name": "web-server-01",
  "hostname": "web01.example.com",
  "ip": "192.168.1.100",
  "os_type": "Ubuntu",
  "os_version": "24.04 LTS",
  "agent_version": "1.5.0",
  "host_groups": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Production"
    }
  ]
}
```

---

#### Informações de rede do host {#get-host-network-information}

Obtém os detalhes de configuração de rede de um host específico.

**Endpoint:**

```
GET /api/v1/api/hosts/:id/network
```

**Escopo necessário:** `host:get`

**Resposta (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "ip": "192.168.1.100",
  "gateway_ip": "192.168.1.1",
  "dns_servers": ["8.8.8.8", "8.8.4.4"],
  "network_interfaces": [
    {
      "name": "eth0",
      "ip": "192.168.1.100",
      "mac": "00:11:22:33:44:55"
    }
  ]
}
```

---

#### Informações de sistema do host {#get-host-system-information}

Obtém informações de sistema de um host específico, incluindo hardware, kernel e estado de reinício.

**Endpoint:**

```
GET /api/v1/api/hosts/:id/system
```

**Escopo necessário:** `host:get`

**Resposta (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "architecture": "x86_64",
  "kernel_version": "6.8.0-45-generic",
  "installed_kernel_version": "6.8.0-50-generic",
  "selinux_status": "disabled",
  "system_uptime": "15 days, 3:22:10",
  "cpu_model": "Intel Xeon E5-2680 v4",
  "cpu_cores": 4,
  "ram_installed": 8192,
  "swap_size": 2048,
  "load_average": {
    "1min": 0.5,
    "5min": 0.3,
    "15min": 0.2
  },
  "disk_details": [
    {
      "filesystem": "/dev/sda1",
      "size": "50G",
      "used": "22G",
      "available": "28G",
      "use_percent": "44%",
      "mounted_on": "/"
    }
  ],
  "needs_reboot": true,
  "reboot_reason": "Kernel update pending"
}
```

---

#### Pacotes do host {#get-host-packages}

Obtém a lista de pacotes instalados num host específico. Use o parâmetro opcional `updates_only` para devolver só os pacotes com atualizações disponíveis.

**Endpoint:**

```
GET /api/v1/api/hosts/:id/packages
```

**Escopo necessário:** `host:get`

**Parâmetros de query:**

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|----------|---------|-------------|
| `updates_only` | string | Não | (nenhum) | Defina `true` para devolver só os pacotes que precisam de atualização |

**Exemplos:**

```bash
# Get all packages for a host
curl -u "patchmon_ae_abc123:your_secret_here" \
  https://patchmon.example.com/api/v1/api/hosts/HOST_UUID/packages

# Get only packages with available updates
curl -u "patchmon_ae_abc123:your_secret_here" \
  "https://patchmon.example.com/api/v1/api/hosts/HOST_UUID/packages?updates_only=true"
```

**Resposta (200 OK):**

```json
{
  "host": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "hostname": "web01.example.com",
    "friendly_name": "web-server-01"
  },
  "packages": [
    {
      "id": "package-host-uuid",
      "name": "nginx",
      "description": "High performance web server",
      "category": "web",
      "current_version": "1.18.0-0ubuntu1.5",
      "available_version": "1.24.0-2ubuntu1",
      "needs_update": true,
      "is_security_update": false,
      "last_checked": "2026-02-12T10:30:00.000Z"
    },
    {
      "id": "package-host-uuid-2",
      "name": "openssl",
      "description": "Secure Sockets Layer toolkit",
      "category": "security",
      "current_version": "3.0.2-0ubuntu1.14",
      "available_version": "3.0.2-0ubuntu1.18",
      "needs_update": true,
      "is_security_update": true,
      "last_checked": "2026-02-12T10:30:00.000Z"
    }
  ],
  "total": 2
}
```

**Campos da resposta:**

| Campo | Tipo | Descrição |
|-------|------|-------------|
| `host` | object | Identificação básica do host |
| `host.id` | string (UUID) | Identificador do host |
| `host.hostname` | string | Hostname do sistema |
| `host.friendly_name` | string | Nome legível do host |
| `packages` | array | Array de objetos de pacote |
| `packages[].id` | string (UUID) | Identificador do registro host-pacote |
| `packages[].name` | string | Nome do pacote |
| `packages[].description` | string | Descrição do pacote |
| `packages[].category` | string | Categoria do pacote |
| `packages[].current_version` | string | Versão instalada |
| `packages[].available_version` | string \| null | Versão disponível para atualização (null se estiver atualizado) |
| `packages[].needs_update` | boolean | Se há atualização disponível |
| `packages[].is_security_update` | boolean | Se a atualização disponível é de segurança |
| `packages[].last_checked` | string (ISO 8601) | Quando o pacote foi verificado pela última vez |
| `total` | integer | Número total de pacotes devolvidos |

> **Dica:** os pacotes vêm ordenados primeiro pelas atualizações de segurança e depois pela disponibilidade de atualização. Assim, os pacotes mais críticos ficam no topo.

---

#### Relatórios de pacotes do host {#get-host-package-reports}

Obtém os relatórios do histórico de atualizações de pacotes de um host específico.

**Endpoint:**

```
GET /api/v1/api/hosts/:id/package_reports
```

**Escopo necessário:** `host:get`

**Parâmetros de query:**

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|----------|---------|-------------|
| `limit` | integer | Não | 10 | Número máximo de relatórios a devolver |

**Resposta (200 OK):**

```json
{
  "host_id": "550e8400-e29b-41d4-a716-446655440000",
  "reports": [
    {
      "id": "report-uuid",
      "status": "success",
      "date": "2026-02-12T10:30:00.000Z",
      "total_packages": 342,
      "outdated_packages": 15,
      "security_updates": 3,
      "payload_kb": 12.5,
      "execution_time_seconds": 4.2,
      "error_message": null
    }
  ],
  "total": 1
}
```

---

#### Fila do agente do host {#get-host-agent-queue}

Obtém o estado da fila do agente e o histórico de jobs de um host específico.

**Endpoint:**

```
GET /api/v1/api/hosts/:id/agent_queue
```

**Escopo necessário:** `host:get`

**Parâmetros de query:**

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|----------|---------|-------------|
| `limit` | integer | Não | 10 | Número máximo de jobs a devolver |

**Resposta (200 OK):**

```json
{
  "host_id": "550e8400-e29b-41d4-a716-446655440000",
  "queue_status": {
    "waiting": 0,
    "active": 1,
    "delayed": 0,
    "failed": 0
  },
  "job_history": [
    {
      "id": "job-history-uuid",
      "job_id": "bull-job-id",
      "job_name": "package_update",
      "status": "completed",
      "attempt": 1,
      "created_at": "2026-02-12T10:00:00.000Z",
      "completed_at": "2026-02-12T10:05:00.000Z",
      "error_message": null,
      "output": null
    }
  ],
  "total_jobs": 1
}
```

---

#### Anotações do host {#get-host-notes}

Obtém as anotações associadas a um host específico.

**Endpoint:**

```
GET /api/v1/api/hosts/:id/notes
```

**Escopo necessário:** `host:get`

**Resposta (200 OK):**

```json
{
  "host_id": "550e8400-e29b-41d4-a716-446655440000",
  "notes": "Production web server. Enrolled via Proxmox auto-enrollment on 2026-01-15."
}
```

---

#### Integrações do host {#get-host-integrations}

Obtém o estado e os detalhes das integrações de um host específico (por exemplo, Docker).

**Endpoint:**

```
GET /api/v1/api/hosts/:id/integrations
```

**Escopo necessário:** `host:get`

**Resposta (200 OK, Docker ativo):**

```json
{
  "host_id": "550e8400-e29b-41d4-a716-446655440000",
  "integrations": {
    "docker": {
      "enabled": true,
      "containers_count": 12,
      "volumes_count": 5,
      "networks_count": 3,
      "description": "Monitor Docker containers, images, volumes, and networks. Collects real-time container status events."
    }
  }
}
```

**Resposta (200 OK, Docker não ativo):**

```json
{
  "host_id": "550e8400-e29b-41d4-a716-446655440000",
  "integrations": {
    "docker": {
      "enabled": false,
      "description": "Monitor Docker containers, images, volumes, and networks. Collects real-time container status events."
    }
  }
}
```

---

#### Excluir host {#delete-host}

Exclui um host específico e todos os dados relacionados (em cascata). Isso remove de vez o host e os pacotes, repositórios, histórico de atualizações, dados de Docker, histórico de jobs e participação em grupos associados a ele.

**Endpoint:**

```
DELETE /api/v1/api/hosts/:id
```

**Escopo necessário:** `host:delete`

**Parâmetros de caminho:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Sim | O identificador único do host a excluir |

**Resposta (200 OK):**

```json
{
  "message": "Host deleted successfully",
  "deleted": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "friendly_name": "web-server-01",
    "hostname": "web01.example.com"
  }
}
```

**Campos da resposta:**

| Campo | Tipo | Descrição |
|-------|------|-------------|
| `message` | string | Mensagem de confirmação |
| `deleted.id` | string (UUID) | O ID do host excluído |
| `deleted.friendly_name` | string | O nome amigável do host excluído |
| `deleted.hostname` | string | O hostname do host excluído |

**Respostas de erro:**

| Código HTTP | Erro | Descrição |
|-----------|-------|-------------|
| 400 | `Invalid host ID format` | O ID informado não é um UUID válido |
| 403 | `Access denied` | A credencial não tem a permissão `host:delete` |
| 404 | `Host not found` | Não existe host com o ID informado |
| 500 | `Failed to delete host` | Erro inesperado durante a exclusão do host |

> **Atenção:** esta ação é **irreversível**. Todos os dados associados ao host (pacotes, repositórios, histórico de atualizações, contêineres Docker, histórico de jobs, participação em grupos etc.) são excluídos de forma permanente.

---

#### Respostas de erro comuns (todos os endpoints)

**404 Not Found**: o host não existe (nos endpoints de um único host):
```json
{
  "error": "Host not found"
}
```

**500 Internal Server Error**: erro inesperado no servidor:
```json
{
  "error": "Failed to fetch hosts"
}
```

Os erros de autenticação e de permissão estão na seção [Solução de problemas](#troubleshooting).

---

### Exemplos de uso

#### Exemplos com cURL

##### Listar todos os hosts

```bash
curl -u "patchmon_ae_abc123:your_secret_here" \
  https://patchmon.example.com/api/v1/api/hosts
```

##### Listar hosts com estatísticas

```bash
curl -u "patchmon_ae_abc123:your_secret_here" \
  "https://patchmon.example.com/api/v1/api/hosts?include=stats"
```

##### Filtrar por grupo de hosts

```bash
curl -u "patchmon_ae_abc123:your_secret_here" \
  "https://patchmon.example.com/api/v1/api/hosts?hostgroup=Production"
```

##### Filtrar por grupo de hosts, com estatísticas

```bash
curl -u "patchmon_ae_abc123:your_secret_here" \
  "https://patchmon.example.com/api/v1/api/hosts?hostgroup=Production&include=stats"
```

##### Filtrar por vários grupos

```bash
curl -u "patchmon_ae_abc123:your_secret_here" \
  "https://patchmon.example.com/api/v1/api/hosts?hostgroup=Production,Development"
```

##### Estatísticas do host

```bash
curl -u "patchmon_ae_abc123:your_secret_here" \
  https://patchmon.example.com/api/v1/api/hosts/HOST_UUID/stats
```

##### Informações de sistema do host

```bash
curl -u "patchmon_ae_abc123:your_secret_here" \
  https://patchmon.example.com/api/v1/api/hosts/HOST_UUID/system
```

##### Todos os pacotes de um host

```bash
curl -u "patchmon_ae_abc123:your_secret_here" \
  https://patchmon.example.com/api/v1/api/hosts/HOST_UUID/packages
```

##### Só os pacotes com atualizações disponíveis

```bash
curl -u "patchmon_ae_abc123:your_secret_here" \
  "https://patchmon.example.com/api/v1/api/hosts/HOST_UUID/packages?updates_only=true"
```

##### Excluir um host

```bash
curl -X DELETE -u "patchmon_ae_abc123:your_secret_here" \
  https://patchmon.example.com/api/v1/api/hosts/HOST_UUID
```

##### Saída JSON formatada

```bash
curl -u "patchmon_ae_abc123:your_secret_here" \
  https://patchmon.example.com/api/v1/api/hosts | jq .
```

---

#### Exemplos em Python

##### Usando a biblioteca `requests`

```python
import requests
from requests.auth import HTTPBasicAuth

# API credentials
API_KEY = "patchmon_ae_abc123"
API_SECRET = "your_secret_here"
BASE_URL = "https://patchmon.example.com"

# Create session with authentication
session = requests.Session()
session.auth = HTTPBasicAuth(API_KEY, API_SECRET)

# List all hosts
response = session.get(f"{BASE_URL}/api/v1/api/hosts")

if response.status_code == 200:
    data = response.json()
    print(f"Total hosts: {data['total']}")

    for host in data['hosts']:
        groups = ', '.join([g['name'] for g in host['host_groups']])
        print(f"  {host['friendly_name']} ({host['ip']}) - Groups: {groups}")
else:
    print(f"Error: {response.status_code} - {response.json()}")
```

##### Filtrar por grupo de hosts

```python
# Filter by group name (requests handles URL encoding automatically)
response = session.get(
    f"{BASE_URL}/api/v1/api/hosts",
    params={"hostgroup": "Production"}
)
```

##### Listar hosts com estatísticas embutidas

```python
# Get hosts with stats in a single request (more efficient than per-host /stats calls)
response = session.get(
    f"{BASE_URL}/api/v1/api/hosts",
    params={"include": "stats"}
)

if response.status_code == 200:
    data = response.json()
    for host in data['hosts']:
        print(f"{host['friendly_name']}: {host['updates_count']} updates, "
              f"{host['security_updates_count']} security, "
              f"{host['total_packages']} total packages")
```

##### Pacotes do host (só atualizações)

```python
# Get only packages that need updates for a specific host
response = session.get(
    f"{BASE_URL}/api/v1/api/hosts/{host_id}/packages",
    params={"updates_only": "true"}
)

if response.status_code == 200:
    data = response.json()
    print(f"Host: {data['host']['friendly_name']}")
    print(f"Packages needing updates: {data['total']}")
    for pkg in data['packages']:
        security = " [SECURITY]" if pkg['is_security_update'] else ""
        print(f"  {pkg['name']}: {pkg['current_version']} → {pkg['available_version']}{security}")
```

##### Detalhes e estatísticas do host

```python
# First, get list of hosts
hosts_response = session.get(f"{BASE_URL}/api/v1/api/hosts")
hosts = hosts_response.json()['hosts']

# Then get stats for the first host
if hosts:
    host_id = hosts[0]['id']

    stats = session.get(f"{BASE_URL}/api/v1/api/hosts/{host_id}/stats").json()
    print(f"Installed: {stats['total_installed_packages']}")
    print(f"Outdated: {stats['outdated_packages']}")
    print(f"Security: {stats['security_updates']}")

    info = session.get(f"{BASE_URL}/api/v1/api/hosts/{host_id}/info").json()
    print(f"OS: {info['os_type']} {info['os_version']}")
    print(f"Agent: {info['agent_version']}")
```

##### Excluir um host

```python
# Delete a host by UUID (requires host:delete scope)
host_id = "550e8400-e29b-41d4-a716-446655440000"
response = session.delete(f"{BASE_URL}/api/v1/api/hosts/{host_id}")

if response.status_code == 200:
    data = response.json()
    print(f"Deleted: {data['deleted']['friendly_name']} ({data['deleted']['hostname']})")
else:
    print(f"Error: {response.status_code} - {response.json()}")
```

##### Tratamento de erros

```python
def get_hosts(hostgroup=None):
    """Get hosts with error handling."""
    try:
        params = {"hostgroup": hostgroup} if hostgroup else {}
        response = session.get(
            f"{BASE_URL}/api/v1/api/hosts",
            params=params,
            timeout=30
        )
        response.raise_for_status()
        return response.json()

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            print("Authentication failed - check credentials")
        elif e.response.status_code == 403:
            print("Access denied - insufficient permissions")
        else:
            print(f"HTTP error: {e}")
        return None

    except requests.exceptions.Timeout:
        print("Request timed out")
        return None

    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None
```

##### Gerar um inventário do Ansible

```python
import json
import requests
from requests.auth import HTTPBasicAuth

API_KEY = "patchmon_ae_abc123"
API_SECRET = "your_secret_here"
BASE_URL = "https://patchmon.example.com"

def generate_ansible_inventory():
    """Generate Ansible inventory from PatchMon hosts."""
    auth = HTTPBasicAuth(API_KEY, API_SECRET)
    response = requests.get(f"{BASE_URL}/api/v1/api/hosts", auth=auth, timeout=30)

    if response.status_code != 200:
        print(f"Error fetching hosts: {response.status_code}")
        return

    data = response.json()

    inventory = {
        "_meta": {"hostvars": {}},
        "all": {"hosts": [], "children": []}
    }

    for host in data['hosts']:
        hostname = host['friendly_name']
        inventory["all"]["hosts"].append(hostname)

        inventory["_meta"]["hostvars"][hostname] = {
            "ansible_host": host['ip'],
            "patchmon_id": host['id'],
            "patchmon_hostname": host['hostname']
        }

        for group in host['host_groups']:
            group_name = group['name'].lower().replace(' ', '_')

            if group_name not in inventory:
                inventory[group_name] = {"hosts": [], "vars": {}}
                inventory["all"]["children"].append(group_name)

            inventory[group_name]["hosts"].append(hostname)

    print(json.dumps(inventory, indent=2))

if __name__ == "__main__":
    generate_ansible_inventory()
```

---

#### Exemplos em JavaScript/Node.js

##### Usando o `fetch` nativo (Node.js 18+)

```javascript
const API_KEY = 'patchmon_ae_abc123';
const API_SECRET = 'your_secret_here';
const BASE_URL = 'https://patchmon.example.com';

const authHeader = 'Basic ' + Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

async function getHosts(hostgroup = null) {
  const url = new URL('/api/v1/api/hosts', BASE_URL);
  if (hostgroup) {
    url.searchParams.append('hostgroup', hostgroup);
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`HTTP ${response.status}: ${error.error}`);
  }

  return await response.json();
}

// List all hosts
getHosts()
  .then(data => {
    console.log(`Total: ${data.total}`);
    data.hosts.forEach(host => {
      console.log(`${host.friendly_name}: ${host.ip}`);
    });
  })
  .catch(error => console.error('Error:', error.message));
```

---

#### Inventário dinâmico do Ansible

Salve isto como `patchmon_inventory.py` e torne-o executável (`chmod +x`):

```python
#!/usr/bin/env python3
"""
PatchMon Dynamic Inventory Script for Ansible.
Usage: ansible-playbook -i patchmon_inventory.py playbook.yml
"""

import json
import os
import sys
import requests
from requests.auth import HTTPBasicAuth

API_KEY = os.environ.get('PATCHMON_API_KEY')
API_SECRET = os.environ.get('PATCHMON_API_SECRET')
BASE_URL = os.environ.get('PATCHMON_URL', 'https://patchmon.example.com')

if not API_KEY or not API_SECRET:
    print("Error: PATCHMON_API_KEY and PATCHMON_API_SECRET must be set", file=sys.stderr)
    sys.exit(1)

def get_inventory():
    auth = HTTPBasicAuth(API_KEY, API_SECRET)
    try:
        response = requests.get(f"{BASE_URL}/api/v1/api/hosts", auth=auth, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching inventory: {e}", file=sys.stderr)
        sys.exit(1)

def build_ansible_inventory(patchmon_data):
    inventory = {
        "_meta": {"hostvars": {}},
        "all": {"hosts": []}
    }
    groups = {}

    for host in patchmon_data['hosts']:
        hostname = host['friendly_name']
        inventory["all"]["hosts"].append(hostname)

        inventory["_meta"]["hostvars"][hostname] = {
            "ansible_host": host['ip'],
            "patchmon_id": host['id'],
            "patchmon_hostname": host['hostname']
        }

        for group in host['host_groups']:
            group_name = group['name'].lower().replace(' ', '_').replace('-', '_')
            if group_name not in groups:
                groups[group_name] = {
                    "hosts": [],
                    "vars": {"patchmon_group_id": group['id']}
                }
            groups[group_name]["hosts"].append(hostname)

    inventory.update(groups)
    return inventory

def main():
    if len(sys.argv) == 2 and sys.argv[1] == '--list':
        patchmon_data = get_inventory()
        inventory = build_ansible_inventory(patchmon_data)
        print(json.dumps(inventory, indent=2))
    elif len(sys.argv) == 3 and sys.argv[1] == '--host':
        print(json.dumps({}))
    else:
        print("Usage: patchmon_inventory.py --list", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
```

**Uso:**

```bash
export PATCHMON_API_KEY="patchmon_ae_abc123"
export PATCHMON_API_SECRET="your_secret_here"
export PATCHMON_URL="https://patchmon.example.com"

# Test inventory
./patchmon_inventory.py --list

# Use with ansible
ansible-playbook -i patchmon_inventory.py playbook.yml
ansible -i patchmon_inventory.py all -m ping
```

---

### Boas práticas de segurança

#### Gestão de credenciais

**Faça:**
- Guarde as credenciais num gerenciador de senhas ou cofre de segredos (por exemplo, HashiCorp Vault, AWS Secrets Manager)
- Use variáveis de ambiente nos scripts de automação
- Defina datas de expiração (recomendado: 90 dias)
- Conceda só as permissões mínimas necessárias (princípio do menor privilégio)
- Troque as credenciais periodicamente e exclua as antigas depois da migração

**Não faça:**
- Colocar credenciais fixas no código-fonte
- Fazer commit de credenciais no controle de versão
- Compartilhar credenciais por e-mail ou chat
- Guardar credenciais em arquivos de texto simples

#### Restrições de IP

Sempre que possível, restrinja as credenciais a endereços IP conhecidos:

```
Allowed IPs: 192.168.1.100, 10.0.0.0/24
```

Para IPs dinâmicos, considere usar uma VPN com IP de saída fixo, um NAT gateway na nuvem ou um servidor proxy.

#### Segurança de rede

- **Use sempre HTTPS** em ambientes de produção
- **Verifique os certificados SSL**: só desative a verificação (`-k`) em desenvolvimento ou teste
- **Use regras de firewall** para restringir o acesso à API do PatchMon no nível da rede

#### Monitoramento e auditoria

- Confira periodicamente o horário "Last Used" na página de configurações Integrations
- Investigue as credenciais sem uso há 30 dias ou mais
- Revise todas as credenciais ativas mensalmente
- Remova as credenciais de sistemas desativados

#### Se as credenciais forem comprometidas

1. **Desative a credencial na hora** na interface do PatchMon (Settings → Integrations → desligue a chave)
2. **Veja o horário "Last Used"** para entender a janela de exposição
3. **Procure nos logs do servidor** qualquer acesso não autorizado
4. **Crie novas credenciais**, com outro escopo se necessário
5. **Exclua a credencial comprometida** depois de conferir
6. **Avise a sua equipe de segurança** se dados sensíveis podem ter sido acessados

---

### Solução de problemas

#### Referência de erros

| Mensagem de erro | Código HTTP | Causa | Solução |
|---------------|-----------|-------|----------|
| `Missing or invalid authorization header` | 401 | Não há cabeçalho `Authorization`, ou ele não começa com `Basic ` | Use `-u key:secret` no cURL, ou defina o cabeçalho `Authorization: Basic <base64>` |
| `Invalid credentials format` | 401 | O valor decodificado do Base64 não tem o separador de dois-pontos | Confira se o formato é `key:secret` e se não há caracteres a mais |
| `Invalid API key` | 401 | O token key não foi encontrado no banco | Confirme que a credencial existe em Settings → Integrations |
| `API key is disabled` | 401 | A credencial foi desativada manualmente | Reative em Settings → Integrations, ou crie uma credencial nova |
| `API key has expired` | 401 | A data de expiração passou | Crie uma credencial nova para substituir a expirada |
| `Invalid API key type` | 401 | O `integration_type` da credencial não é `"api"` | Confirme que você criou a credencial com o tipo de uso "API" |
| `Invalid API secret` | 401 | O secret não bate com o hash bcrypt guardado | Crie uma credencial nova (os secrets não podem ser recuperados) |
| `IP address not allowed` | 403 | O IP do cliente não está em `allowed_ip_ranges` da credencial | Acrescente o seu IP; descubra-o com `curl https://ifconfig.me` |
| `Access denied: does not have permission to {action} {resource}` | 403 | Falta à credencial o escopo necessário | Edite a credencial e acrescente a permissão necessária |
| `Access denied: does not have access to {resource}` | 403 | O recurso não está em nenhum dos escopos da credencial | Edite os escopos da credencial para incluir o recurso |
| `Host not found` | 404 | O UUID do host não existe | Confira o UUID no endpoint de listagem de hosts |
| `Invalid host ID format` | 400 | O ID do host não é um UUID válido (endpoint DELETE) | Confirme que o ID está no formato UUID |
| `Failed to delete host` | 500 | Erro inesperado durante a exclusão do host | Veja os detalhes nos logs do servidor do PatchMon |
| `Failed to fetch hosts` | 500 | Erro inesperado no servidor | Veja os detalhes nos logs do servidor do PatchMon |
| `Authentication failed` | 500 | Erro inesperado no processamento da autenticação | Veja os logs do servidor do PatchMon; pode indicar um problema no banco |

#### Dicas de depuração

**Modo detalhado do cURL:**
```bash
curl -v -u "patchmon_ae_abc123:your_secret_here" \
  https://patchmon.example.com/api/v1/api/hosts
```

**Logs de depuração no Python:**
```python
import logging
logging.basicConfig(level=logging.DEBUG)
requests_log = logging.getLogger("requests.packages.urllib3")
requests_log.setLevel(logging.DEBUG)
requests_log.propagate = True
```

#### Problemas comuns

##### Array de hosts vazio

- Confirme que existem hosts na interface do PatchMon → página Hosts
- Confira se a grafia do filtro `hostgroup` bate exatamente (diferencia maiúsculas e minúsculas)
- Liste antes todos os hosts, sem filtro, para confirmar que o acesso à API funciona

##### Tempo limite de conexão

```bash
# Test basic connectivity
ping patchmon.example.com
curl -I https://patchmon.example.com/health
```

##### Erros de certificado SSL

Em desenvolvimento ou teste, com certificados autoassinados:
```bash
curl -k -u "patchmon_ae_abc123:your_secret_here" \
  https://patchmon.example.com/api/v1/api/hosts
```

Em produção, instale um certificado SSL válido (por exemplo, Let's Encrypt).

#### Obtendo ajuda

Se os problemas continuarem:

1. Veja nos logs do servidor do PatchMon as informações de erro detalhadas
2. Use o [Swagger UI](#interactive-api-reference-swagger) embutido para testar os endpoints de forma interativa
3. Pesquise ou abra uma issue em [github.com/PatchMon/PatchMon](https://github.com/PatchMon/PatchMon/issues)
4. Entre na comunidade do PatchMon no [Discord](https://patchmon.net/discord)
