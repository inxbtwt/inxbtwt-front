# Just Rede Social

Frontend com Angular, TypeScript e Tailwind CSS.

## Desenvolvimento

```sh
npm install
npm start
```

Acesse http://localhost:4200. O servidor de desenvolvimento usa HTTP local, sem certificado.

O proxy encaminha `/api` para `http://localhost:8081` e ajusta o caminho do cookie de refresh. Inicie a API nessa porta ou altere `proxy.conf.json`. Em produção, configure o mesmo encaminhamento no servidor/proxy HTTPS.

A rota inicial verifica `/me`: usuários autenticados seguem para `/home`; visitantes são direcionados a `/auth`. O acesso direto à home também exige autenticação. Se necessário, a sessão é renovada pelo cookie de refresh. O login obtém o CSRF antes de enviar as credenciais. Nenhum JWT é armazenado no localStorage.

## Estrutura

- `src/app`: componente raiz, configuração e rotas.
- `src/pages`: páginas da aplicação.
- `src/components`: componentes reutilizáveis.
- `src/services`: serviços e integrações.
- `src/utils`: funções auxiliares.
- `src/styles.css`: importação do Tailwind e estilos globais.

## Validação

```sh
npm run build
npm test -- --watch=false
```

## Busca de usuários

A busca usa `GET /api/search?user=...&page=...&size=10`, com os cookies da sessão. A API principal encaminha a consulta à search-api pelo OpenFeign; os dois serviços precisam estar ativos. O interceptor e o proxy continuam ajustando o endereço conforme o environment.

Os resultados contêm nome, username e foto, sem UUID. A lista identifica cada resultado pelo username e permite abrir o perfil pela mesma informação. Quando há foto, o componente consulta o perfil para obter o UUID necessário ao download autenticado da imagem. A busca pode incluir o próprio usuário, conforme o contrato atual do microsserviço.

## Environments

A configuração da API fica em `src/environments/environment.ts`. O interceptor registrado em `app.config.ts` aplica `environment.apiUrl` às chamadas que começam com `/api`.

- `npm start`: usa `environment.development.ts`, com o proxy local para a porta 8081.
- `npm run build`: usa `environment.ts`, para produção.
- `npm run build -- --configuration production,local`: usa `environment.local.ts` com as otimizações de produção, para o front na Vercel acessando o back-end local por túnel.

No deploy de testes, `apiUrl` permanece `/api` para preservar os cookies na mesma origem. Configure a URL HTTPS do túnel em `BACKEND_TUNNEL_URL`, no GitHub Environment `local` do repositório `w-just`. O proxy da Vercel usa essa URL. Quando ela mudar, execute novamente o deploy. A pipeline busca a main do front, portanto publique os arquivos de environment nessa branch antes de executá-la.
