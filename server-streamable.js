import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/http.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: false
}));
app.use(express.json());

// Create MCP server instance
const mcpServer = new Server(
  {
    name: 'mcp-fetch-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define the fetch tool
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  console.log('ListTools request received');
  return {
    tools: [
      {
        name: 'fetch',
        description: 'Fetches a URL from the internet and extracts its contents as markdown.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL to fetch',
            },
            max_length: {
              type: 'number',
              description: 'Maximum number of characters to return (default: 5000)',
              default: 5000,
            },
            start_index: {
              type: 'number',
              description: 'Start content from this character index (default: 0)',
              default: 0,
            },
            raw: {
              type: 'boolean',
              description: 'Get raw content instead of markdown (default: false)',
              default: false,
            },
          },
          required: ['url'],
        },
      },
    ],
  };
});

// Handle tool calls
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.log('CallTool request:', request.params.name);
  
  if (request.params.name === 'fetch') {
    const url = String(request.params.arguments?.url);
    const maxLength = Number(request.params.arguments?.max_length) || 5000;
    const startIndex = Number(request.params.arguments?.start_index) || 0;
    const raw = Boolean(request.params.arguments?.raw);

    console.log(`Fetching URL: ${url}`);

    try {
      // Fetch the URL
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MCP-Fetch-Server/1.0',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let content = await response.text();

      // Simple markdown conversion if not raw
      if (!raw) {
        // Remove script and style tags
        content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
        
        // Convert common HTML tags to markdown
        content = content.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
        content = content.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
        content = content.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
        content = content.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
        content = content.replace(/<br\s*\/?>/gi, '\n');
        content = content.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
        content = content.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
        content = content.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
        content = content.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
        content = content.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
        
        // Remove remaining HTML tags
        content = content.replace(/<[^>]+>/g, '');
        
        // Clean up whitespace
        content = content.replace(/\n{3,}/g, '\n\n');
        content = content.trim();
      }

      // Apply start index and max length
      const endIndex = Math.min(startIndex + maxLength, content.length);
      content = content.substring(startIndex, endIndex);

      const result = {
        content: content,
        length: content.length,
        url: url,
        truncated: endIndex < content.length,
      };

      console.log(`Fetch successful, content length: ${content.length}`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Fetch error:', error.message);
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching URL: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Health check endpoints
app.get('/', (req, res) => {
  res.json({
    name: 'MCP Fetch Server',
    version: '1.0.0',
    transport: 'streamable-http',
    status: 'running',
    description: 'Web content fetching and conversion for LLMs',
    endpoints: {
      mcp: '/mcp',
      health: '/health'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
  });
});

// Main MCP endpoint using Streamable HTTP
app.post('/mcp', async (req, res) => {
  console.log('MCP request received:', JSON.stringify(req.body).substring(0, 200));
  
  try {
    // Create transport for this request
    const transport = new StreamableHTTPServerTransport(req, res);
    
    // Connect and handle the request
    await mcpServer.connect(transport);
    console.log('Request handled successfully');
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`MCP Fetch Server (Streamable HTTP) running on port ${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
