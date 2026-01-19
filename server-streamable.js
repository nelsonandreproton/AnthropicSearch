import express from 'express';
import cors from 'cors';

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

// Main MCP endpoint using custom HTTP handling
app.post('/mcp', async (req, res) => {
  console.log('MCP request received:', JSON.stringify(req.body).substring(0, 200));
  
  try {
    const request = req.body;
    
    // Validate JSON-RPC format
    if (!request.jsonrpc || request.jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: request.id || null,
        error: {
          code: -32600,
          message: 'Invalid Request: jsonrpc must be 2.0'
        }
      });
    }

    // Handle different methods
    let result;
    
    if (request.method === 'initialize') {
      console.log('Initialize request');
      result = {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'mcp-fetch-server',
          version: '1.0.0',
        },
      };
    } 
    else if (request.method === 'tools/list') {
      console.log('Tools list request');
      result = {
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
    }
    else if (request.method === 'tools/call') {
      console.log('Tool call request:', request.params?.name);
      
      if (request.params?.name === 'fetch') {
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

          const fetchResult = {
            content: content,
            length: content.length,
            url: url,
            truncated: endIndex < content.length,
          };

          console.log(`Fetch successful, content length: ${content.length}`);

          result = {
            content: [
              {
                type: 'text',
                text: JSON.stringify(fetchResult, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error('Fetch error:', error.message);
          result = {
            content: [
              {
                type: 'text',
                text: `Error fetching URL: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      } else {
        throw new Error(`Unknown tool: ${request.params?.name}`);
      }
    }
    else {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: request.id || null,
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`
        }
      });
    }

    // Send successful response
    res.json({
      jsonrpc: '2.0',
      id: request.id,
      result: result,
    });

  } catch (error) {
    console.error('Error handling MCP request:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body.id || null,
      error: {
        code: -32603,
        message: error.message,
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`MCP Fetch Server (Streamable HTTP) running on port ${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
