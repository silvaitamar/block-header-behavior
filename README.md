# Block Header Behavior

Plugin WordPress que adiciona uma **variação de bloco** ao `core/group` ("Site Header") com comportamentos de cabeçalho reutilizáveis no **editor de blocos** e em **temas FSE** (Full Site Editing).

Útil quando você não quer reinventar, a cada projeto, o mesmo padrão de grupo semântico (`<header>`), classes, sticky/overlay e estilos ao rolar a página.

## Requisitos

- WordPress **6.5+**
- PHP **7.4+**

## Instalação

1. Copie a pasta `block-header-behavior` para `wp-content/plugins/`.
2. Ative **Block Header Behavior** em **Plugins**.

## Uso (resumo)

1. No editor de site ou no conteúdo, insira um **Grupo** e escolha a variação **Site Header** (ou equivalente no seu idioma).
2. O grupo usa `tagName: header` e a classe `site-header`.
3. No painel do bloco, defina o **modo do cabeçalho**:
   - **Default** — fluxo normal.
   - **Sticky** — fixa no topo ao rolar (`position: sticky`).
   - **Overlay** — sobrepõe o conteúdo inicialmente; ao rolar, fundo/sombra configuráveis (via variáveis CSS e classe `is-scrolled`).
4. Nos modos sticky/overlay, use os controles nativos de **Cor** ("Fundo ao fixar") e **Borda** ("Sombra ao fixar") quando disponíveis.

O CSS/JS de front-end **só são enfileirados** se o conteúdo analisado contiver um `core/group` com `site-header` na classe (singular, templates e partes em temas de blocos).

## Hooks (desenvolvedores)

| Filtro | Descrição |
|--------|-------------|
| `bhb_site_header_hidden_inspector_panels` | Painéis do inspetor a ocultar na variação Site Header (`layout`, `position`). |
| `bhb_header_modes` | Lista de slugs de modo permitidos (`default`, `sticky`, `overlay`). |
| `bhb_header_behavior_scan_sources` | Fontes extras de markup de blocos para detecção de carregamento de assets. |

Prefixos e handles usam o prefixo **`bhb_`** / **`bhb-`** (constantes `BHB_*`).

## Estrutura do código

```
block-header-behavior/
├── block-header-behavior.php   # Bootstrap e constantes
├── includes/
│   ├── class-plugin.php        # Singleton e i18n
│   ├── class-block.php         # Atributos + variação
│   └── class-assets.php        # Registro condicional de assets
├── assets/
│   ├── css/style.css
│   └── js/editor.js | frontend.js
└── languages/                  # Traduções (.pot manual ou WP-CLI)
```

## Boas práticas aplicadas

- Namespace PHP `BHB\BlockHeaderBehavior` e função global `bhb_plugin()`.
- `ABSPATH` em todos os arquivos PHP executáveis.
- `load_plugin_textdomain()` no hook `init` (prioridade 0), conforme recomendado pelo WordPress.
- `index.php` vazio nas pastas para evitar listagem de diretório.
- Text domain único: `block-header-behavior`.
- Scripts com dependências explícitas; traduções do script de editor via `wp_set_script_translations`.
- Sem dados em `options` no banco — não é obrigatório `uninstall.php` para limpeza.

## Licença

[GPL-2.0-or-later](LICENSE) — alinhado ao ecossistema WordPress.

## Changelog

Ver [CHANGELOG.md](CHANGELOG.md).
