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
