import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'MCP Fetch Server',
    version: '1.0.0',
    status: 'running',
    description: 'Web content fetching and conversion for LLMs',
    endpoints: {
      sse: '/sse',
      health: '/'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SSE endpoint for MCP
app.get('/sse', async (req, res) => {
  console.log('New SSE connection established');
  
  const transport = new SSEServerTransport('/message', res);
  const server = new Server(
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
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'fetch') {
      const url = String(request.params.arguments?.url);
      const maxLength = Number(request.params.arguments?.max_length) || 5000;
      const startIndex = Number(request.params.arguments?.start_index) || 0;
      const raw = Boolean(request.params.arguments?.raw);

      try {
        // Fetch the URL
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'MCP-Fetch-Server/1.0',
          },
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

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
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

  await server.connect(transport);
  
  console.log('MCP Server connected via SSE');
});

// POST endpoint for SSE messages
app.post('/message', async (req, res) => {
  // This endpoint receives messages from the client
  // The SSE transport handles the actual processing
  res.status(200).end();
});

app.listen(PORT, () => {
  console.log(`MCP Fetch Server running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
});
