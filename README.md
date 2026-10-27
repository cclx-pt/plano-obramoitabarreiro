# Plano da Obra

Plano da obra com fases, Gantt, responsáveis, datas planeadas e reais e % feita.

- **Página pública (só leitura):** https://cclx-pt.github.io/plano-obramoitabarreiro/
- **Admin (editar):** https://cclx-pt.github.io/plano-obramoitabarreiro/admin.html

## Como funciona

- Todos os dados estão em `data.json`. Esta é a cópia mestre do plano.
- A página de admin lê e grava `data.json` diretamente no GitHub, com um token pessoal
  (fine-grained, só este repositório, permissão *Contents: Read and write*). O token fica
  guardado apenas no navegador de quem o colou.
- Cada gravação é um commit, por isso o histórico de alterações fica em *Commits*.
- A página pública lê o mesmo `data.json`. As alterações aparecem cerca de 1 minuto depois.

## Ficheiros

- `index.html` — página pública
- `admin.html` — página de edição
- `app.js` — desenho do resumo, Gantt, sequência e tabela
- `style.css` — estilo
- `data.json` — dados do plano
