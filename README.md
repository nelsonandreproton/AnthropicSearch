# MCP Fetch Server para Render

Este é um servidor MCP (Model Context Protocol) que expõe a funcionalidade de fetch de URLs via SSE (Server-Sent Events), pronto para deploy no Render.

## 🚀 Deploy no Render

### Opção 1: Deploy via GitHub (Recomendado)

1. **Cria um repositório no GitHub**
   - Cria um novo repositório (pode ser privado)
   - Faz upload destes ficheiros: `package.json`, `server.js`, e `README.md`

2. **Conecta ao Render**
   - Vai a [render.com](https://render.com) e faz login
   - Clica em "New +" → "Web Service"
   - Conecta o teu repositório GitHub
   - Seleciona o repositório que criaste

3. **Configuração no Render**
   - **Name**: `mcp-fetch-server` (ou o nome que quiseres)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Seleciona o plano **Free**

4. **Deploy**
   - Clica em "Create Web Service"
   - Aguarda o deploy (pode demorar 2-3 minutos)
   - Quando terminar, terás um URL tipo: `https://mcp-fetch-server.onrender.com`

### Opção 2: Deploy Manual via Render Dashboard

1. No Render Dashboard, clica em "New +" → "Web Service"
2. Seleciona "Build and deploy from a Git repository"
3. Ou usa "Deploy from a public Git repository" e cola o URL do teu repo

## 🔧 Configuração no OutSystems ODC

Depois do deploy, usa este URL no ODC:

```
https://SEU-APP.onrender.com/sse
```

**Exemplo**: Se o teu app se chamar `mcp-fetch-server`, o URL será:
```
https://mcp-fetch-server.onrender.com/sse
```

### Formato da Configuração MCP no ODC

```json
{
  "type": "url",
  "url": "https://mcp-fetch-server.onrender.com/sse",
  "name": "fetch-server"
}
```

## 🧪 Testar o Servidor

### 1. Health Check
Abre no browser:
```
https://SEU-APP.onrender.com/health
```

Deves ver:
```json
{
  "status": "ok",
  "timestamp": "2025-01-19T..."
}
```

### 2. Informação do Servidor
```
https://SEU-APP.onrender.com/
```

Deves ver informação sobre o servidor e os endpoints disponíveis.

## 📋 Funcionalidades do Tool "fetch"

O servidor expõe um tool chamado `fetch` com os seguintes parâmetros:

- **url** (obrigatório): URL para fazer fetch
- **max_length** (opcional): Número máximo de caracteres a retornar (default: 5000)
- **start_index** (opcional): Começar conteúdo a partir deste índice (default: 0)
- **raw** (opcional): Obter conteúdo raw em vez de markdown (default: false)

### Exemplo de Uso no ODC

Depois de configurar o MCP server no ODC, podes usar assim:

```
"Fetch the content from https://example.com and summarize it"
```

O AI vai automaticamente chamar o tool `fetch` com o URL fornecido.

## ⚠️ Notas Importantes sobre o Plano Free do Render

- **Spin down automático**: Após 15 minutos de inatividade, o serviço entra em modo sleep
- **Primeiro request lento**: Quando o serviço está em sleep, o primeiro request pode demorar 30-50 segundos a acordar
- **Solução**: Considera fazer um ping periódico ao endpoint `/health` para manter o serviço ativo

## 🔍 Troubleshooting

### O servidor não arranca
- Verifica os logs no Render Dashboard
- Certifica-te que o `package.json` está correto
- Verifica se o Node version é >= 18

### Erro de conexão no ODC
- Confirma que o URL está correto (deve terminar em `/sse`)
- Testa primeiro o endpoint `/health` no browser
- Verifica os logs no Render para ver se há erros

### Timeout no primeiro request
- Normal no plano free do Render (cold start)
- Aguarda até 1 minuto no primeiro request
- Requests seguintes serão rápidos

## 📝 Estrutura dos Ficheiros

```
.
├── package.json    # Dependências e configuração npm
├── server.js       # Servidor MCP com Express e SSE
└── README.md       # Este ficheiro
```

## 🎯 Next Steps

1. Deploy no Render
2. Testa o endpoint `/health`
3. Configura no OutSystems ODC
4. Testa com um prompt tipo: "Fetch https://example.com"

## 🆘 Suporte

Se tiveres problemas:
1. Verifica os logs no Render Dashboard
2. Testa os endpoints manualmente
3. Confirma a configuração no ODC

Boa sorte! 🚀
