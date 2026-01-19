# MCP Fetch Server para Render

Este é um servidor MCP (Model Context Protocol) que expõe a funcionalidade de fetch de URLs, pronto para deploy no Render.

**Disponível em 2 versões de transporte:**
- **SSE** (Server-Sent Events) - `server.js`
- **Streamable HTTP** - `server-streamable.js`

## 🚀 Deploy no Render

### 1. Cria um repositório no GitHub
- Cria um novo repositório (público ou privado)
- Faz upload de TODOS estes ficheiros:
  - `package.json`
  - `server.js` (SSE)
  - `server-streamable.js` (Streamable HTTP)
  - `.gitignore`
  - `README.md`

### 2. Conecta ao Render
1. Vai a [render.com](https://render.com) e faz login
2. Clica em "New +" → "Web Service"
3. Conecta o teu repositório GitHub
4. Seleciona o repositório

### 3. Configuração no Render

#### Opção A: Testar com Streamable HTTP (Recomendado primeiro)
- **Name**: `mcp-fetch-server`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm run start:streamable`
- **Plan**: **Free**

#### Opção B: Testar com SSE
- **Name**: `mcp-fetch-server`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: **Free**

### 4. Deploy
- Clica em "Create Web Service"
- Aguarda 2-3 minutos
- URL final: `https://mcp-fetch-server.onrender.com`

## 🔧 Configuração no OutSystems ODC

### Se usaste Streamable HTTP:
```json
{
  "type": "url",
  "url": "https://SEU-APP.onrender.com/mcp",
  "transport": "streamable-http",
  "name": "fetch-server"
}
```

### Se usaste SSE:
```json
{
  "type": "url",
  "url": "https://SEU-APP.onrender.com/sse",
  "transport": "sse",
  "name": "fetch-server"
}
```

## 🧪 Testar ANTES de Configurar no ODC

### 1. Testa o Health Check
```bash
curl https://SEU-APP.onrender.com/health
```

Deves ver:
```json
{
  "status": "ok",
  "timestamp": "2025-01-19T..."
}
```

### 2. Testa a Info do Servidor
```bash
curl https://SEU-APP.onrender.com/
```

Deves ver informação sobre endpoints e status.

### 3. Testa o MCP Protocol (Streamable HTTP)
```bash
curl -X POST https://SEU-APP.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

Deves ver uma resposta com a lista de tools disponíveis.

## ❗ Troubleshooting - Timeout no ODC

### Problema: Timeout ao testar conexão

**Causa mais comum**: O serviço está em "cold start" (dormindo) no plano free do Render.

**Solução**:
1. **Primeiro**, acorda o serviço:
   ```bash
   curl https://SEU-APP.onrender.com/health
   ```
   
2. **Aguarda 30-60 segundos** se for o primeiro request

3. **Depois** tenta testar no ODC

4. Se continuar com timeout:
   - Verifica os **logs no Render Dashboard**
   - Testa manualmente os endpoints com curl
   - Confirma que o URL está correto
   - Tenta trocar entre SSE e Streamable HTTP

### Para evitar cold starts:
Cria um cron job (ex: cron-job.org) que faz ping ao `/health` a cada 10 minutos.

## 🔄 Trocar entre SSE e Streamable HTTP

Se uma versão não funcionar, podes facilmente trocar:

1. No Render Dashboard
2. Vai a Settings → Build & Deploy
3. Muda o **Start Command**:
   - Para Streamable HTTP: `npm run start:streamable`
   - Para SSE: `npm start`
4. Faz "Manual Deploy"
5. No ODC, atualiza o URL e transport type conforme necessário

## 📋 Funcionalidades do Tool "fetch"

**Parâmetros:**
- `url` (obrigatório): URL para fazer fetch
- `max_length` (opcional): Máximo de caracteres (default: 5000)
- `start_index` (opcional): Índice inicial (default: 0)
- `raw` (opcional): Conteúdo raw vs markdown (default: false)

**Exemplo de uso no ODC:**
```
"Fetch the content from https://example.com and summarize it"
```

## 📊 Diferenças entre Transportes

| Característica | SSE | Streamable HTTP |
|---|---|---|
| Conexão | Persistente | Por request |
| Complexidade | Média | Baixa |
| Compatibilidade | Boa | Muito boa |
| Recomendado para ODC | ⚠️ Depende | ✅ Sim |

**Recomendação**: Começa com **Streamable HTTP** - é mais simples e normalmente funciona melhor.

## 🐛 Logs e Debugging

### Ver logs no Render:
1. Dashboard → Teu serviço → "Logs"
2. Procura por:
   - `MCP request received` - pedidos a chegar
   - `Error` - erros
   - `Session created` - sessões SSE

### Testar localmente:
```bash
npm install
npm run start:streamable  # ou npm start para SSE

# Noutro terminal:
curl http://localhost:3000/health
```

## ⚠️ Notas Importantes

- ✅ **Plano Free do Render**: Dorme após 15 min de inatividade
- ✅ **Cold Start**: Primeiro request pode demorar 30-50s
- ✅ **Logs**: Sempre verifica os logs se houver problemas
- ✅ **URL**: Usa HTTPS (não HTTP)
- ✅ **CORS**: Já está configurado para aceitar qualquer origem

## 🎯 Checklist de Deploy

- [ ] Repositório GitHub criado
- [ ] Todos os ficheiros commitados
- [ ] Serviço criado no Render
- [ ] Build terminou com sucesso
- [ ] `/health` responde corretamente
- [ ] Endpoint principal responde (SSE ou HTTP)
- [ ] Configurado no ODC
- [ ] Testado com um prompt simples

## 💡 Próximos Passos

1. Deploy no Render (começa com Streamable HTTP)
2. Testa `/health` endpoint
3. Acorda o serviço (curl /health)
4. Configura no ODC
5. Testa com prompt: "Fetch https://example.com"

Se tiveres problemas, partilha os logs do Render! 🚀
