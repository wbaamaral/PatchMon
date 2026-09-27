# Documentação do PatchMon em português do Brasil

Esta pasta traz a tradução para pt-BR dos três livros de documentação que ficam em `docs/`. Os originais em inglês continuam sendo a referência: em caso de divergência, vale o texto em inglês.

| Arquivo | Livro | Original |
| --- | --- | --- |
| `patchmon-admin-guide.md` | Guia do Administrador | `../patchmon-admin-guide.md` |
| `patchmon-operator-guide.md` | Guia do Operador | `../patchmon-operator-guide.md` |
| `patchmon-api-integrations-guide.md` | Guia de API e Integrações | `../patchmon-api-integrations-guide.md` |

## Versão de origem

Cada livro registra no frontmatter o commit do original que foi traduzido:

```yaml
lang: "pt-BR"
translation_of: "docs/patchmon-admin-guide.md"
source_commit: "05576062"
```

Para ver o que mudou no original desde a última tradução:

```bash
git diff 05576062..HEAD -- docs/patchmon-admin-guide.md
```

Ao atualizar um livro, traduza as mudanças e atualize o `source_commit` dele.

## Convenções

- **A interface continua em inglês.** O PatchMon não tem interface traduzida, então nomes de telas, abas, botões, campos e mensagens aparecem como estão na tela (por exemplo, **Settings → Host Groups**, "Waiting for connection"). Quem segue o passo a passo precisa encontrar na tela exatamente o texto do manual.
- **Código não se traduz.** Blocos de código, comandos, caminhos, variáveis de ambiente, chaves de configuração, endpoints, nomes de permissão e trechos de código inline ficam idênticos ao original, inclusive os comentários dentro dos blocos.
- **As âncoras são as do original.** Os títulos traduzidos que servem de destino de links internos levam a âncora em inglês explícita (`## Capítulo 3: Adicionando um host {#adding-a-host}`). Assim, os links entre capítulos e os links vindos de fora continuam funcionando.
- **Estrutura igual à do original.** Mesmos capítulos, seções, tabelas e blocos de código, na mesma ordem. Isso facilita comparar os dois arquivos lado a lado.
- **Texto em pt-BR natural.** A tradução prioriza a clareza para quem opera o sistema, e não a tradução palavra por palavra.

## Glossário

| Inglês | Tradução usada |
| --- | --- |
| host | host |
| agent | agente |
| fleet | parque (de servidores) |
| patch / patching | patch / patching |
| patch run | execução de patch |
| dry-run | simulação |
| host group | grupo de hosts |
| role | papel |
| permission / scope | permissão / escopo |
| compliance | conformidade |
| scan | varredura |
| remediation | correção |
| alert / notification | alerta / notificação |
| destination / route | destino / rota |
| enrolment / auto-enrolment | registro / registro automático |
| tier (plan) | plano |
| dashboard | painel |
| check-in | check-in |
| reverse proxy | proxy reverso |
| self-hosted | auto-hospedado |
| air-gapped | isolado (air-gapped) |

## Links quebrados herdados do original

Seis links internos do Guia do Operador apontam para âncoras que não existem no original em inglês (os títulos mudaram de travessão para dois-pontos). Na tradução, esses links funcionam:

- `#cannot-reach-server--dns`, `#cannot-reach-server--tls`, `#cannot-reach-server--firewall`, `#config-set-api--configure-credentials` e `#diagnostics--full-system-diagnostics` receberam a âncora explícita nos títulos correspondentes.
- `#section_2_server_configuration` foi apontado para `#2-server-configuration`.

Vale corrigir isso também no original.

## Validação

Na geração desta tradução, cada livro foi comparado com o original: mesma quantidade de títulos por nível, de linhas de tabela e de URLs, todos os blocos de código idênticos byte a byte e todos os links internos resolvendo para uma âncora existente.
