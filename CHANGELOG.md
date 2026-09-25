# Changelog

## 1.0.1

- Overlay scrolled: default `box-shadow` is `none` (was a 1px hairline). Themes that already draw `border-bottom` no longer get a doubled edge when `.is-scrolled` applies. Set **Shadow when fixed** only when you want elevation beyond the theme border.

## 1.0.0

- Versão inicial publicada no GitHub.
- Variação **Site Header** em `core/group` com modos default, sticky e overlay.
- Atributos de fundo e sombra ao fixar (painéis nativos de Cor e Borda no editor).
- CSS e JS de front-end carregados apenas quando o conteúdo inclui o grupo com classe `site-header`.
