# Direção visual da JUST

Este documento registra as decisões visuais do usuário. Atualizar conforme novas escolhas forem aprovadas, distinguindo decisões aprovadas de propostas de implementação.

## 24/10/2026 — Tela de autenticação

### Direção aprovada

- A rede social deve ter uma identidade memeira, divertida e informal.
- Referência aprovada: proposta de login apresentada no chat, com fundo claro, preto, verde-limão, adesivos e um gato de expressão desconfiada.
- Humor na identidade e nas mensagens, mantendo o formulário claro e fácil de usar.
- Chamada principal: “Seu feed merece um pouco de caos.”
- Texto de apoio: “Memes, amigos e opiniões que ninguém pediu.”
- Ação principal: “Bora entrar”.
- Formulário em um painel claro com contorno preto, cantos arredondados e sombra sólida deslocada.
- Colagem de memes e rabiscos na área editorial; formulário com menos ruído visual.
- No celular, dar prioridade ao formulário e reduzir a colagem.

### Paleta inicial da implementação

Os valores abaixo traduzem a referência aprovada em tokens; ainda podem ser refinados pelo usuário.

| Token          | Cor       | Uso                          |
| -------------- | --------- | ---------------------------- |
| `--just-paper` | `#FAF8F2` | Fundo principal              |
| `--just-ink`   | `#111111` | Texto, bordas e sombras      |
| `--just-lime`  | `#D4FF3F` | Ações principais e destaques |
| `--just-lilac` | `#CCB1FF` | Selos e detalhes             |
| `--just-coral` | `#FF747D` | Acentos da colagem           |
| `--just-muted` | `#74746D` | Texto secundário             |
| `--just-line`  | `#DAD8D0` | Divisórias                   |
| `--just-error` | `#A52A3A` | Mensagens de erro            |

### Regras de aplicação

- Tipografia grande e pesada nas chamadas; fonte simples e legível nos controles.
- Contraste alto, foco de teclado visível e labels permanentes.
- Elementos de meme são decorativos: não devem prejudicar leitura, navegação ou estados de erro.
- Evitar gradientes, aparência corporativa genérica, excesso de cartões e estatísticas inventadas.
- Não alterar cores e estilo das outras páginas sem uma decisão correspondente registrada aqui.

### Pendências de identidade

- Fonte definitiva e identidade da marca além do lettering JUST.
- Direção visual das páginas de perfil.
- Paleta e comportamento de um eventual tema escuro.

## 24/10/2026 — Protótipo do feed

### Direção proposta para revisão

- Aplicar a mesma paleta aprovada na tela de autenticação, com fundo papel e tinta escura.
- Usar verde-limão para seleção e ações, lilás para boas-vindas e coral para pequenos destaques.
- O feed deve parecer uma rede social divertida, com humor nos textos e adesivos, sem perder legibilidade.
- Organização desktop em três áreas: navegação e comunidades; publicações; tendências e sugestões de pessoas.
- Em telas menores, priorizar a timeline, ocultar as laterais e usar navegação fixa inferior.
- Não criar posts, métricas ou sugestões de pessoas fictícias; mostrar estados vazios até a API fornecer conteúdo real.

### Componentes propostos

- Faixa de boas-vindas com saudação personalizada e selo “sem filtro”.
- Saudação, navegação e estados vazios para timeline, comunidades, assuntos em alta e sugestões.
- Painéis laterais com recados bem-humorados, sem inventar dados sociais.

### Em aberto

- Aprovar ou ajustar a identidade do feed e os textos de humor.
- Definir as categorias, comunidades e regras reais de recomendação.
- Implementar publicação e carregar timeline quando a API de feed estiver disponível.

## 24/10/2026 — Protótipo do perfil

### Direção aprovada

- Reaproveitar a navegação e os tokens de cor do protótipo do feed.
- Dar destaque à capa e ao avatar, com composição gráfica simples em lilás, verde-limão e coral.
- Manter os dados reais da conta fáceis de ler e editar.
- Mostrar abas para publicações, respostas, mídia e curtidas.
- Exibir estado vazio na timeline até existirem publicações reais; o protótipo não cria posts nem métricas fictícias.
- No celular, recolher as barras laterais e priorizar os dados do perfil e a timeline.
- Usar fotos reais de perfil e capa quando cadastradas; mostrar iniciais quando ainda não houver foto.

### Em aberto

- Definir campos reais de bio e nome de usuário no modelo de perfil.
- Ligar as abas de publicações, respostas, mídia e curtidas às APIs correspondentes.
