# Universal LLM Integration Examples

Vulpes Celare acts as a **universal safety pipeline** for clinical AI systems. These examples show production-ready integrations with all major LLM providers and agent frameworks.

## Table of Contents

- [OpenAI](#openai)
- [Anthropic (Claude)](#anthropic-claude)
- [Google Gemini](#google-gemini)
- [Azure OpenAI](#azure-openai)
- [AWS Bedrock](#aws-bedrock)
- [Local Models (Ollama)](#local-models-ollama)
- [LangChain](#langchain)
- [LangGraph](#langgraph)
- [CrewAI](#crewai)
- [AutoGen](#autogen)
- [Express.js Middleware](#expressjs-middleware)
- [FastAPI Middleware](#fastapi-middleware)

---

## OpenAI

### Basic Integration

```typescript
import { VulpesCelare } from 'vulpes-celare';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function analyzeNote(clinicalNote: string) {
  // Step 1: Redact PHI
  const engine = new VulpesCelare();
  const redactionResult = await engine.process(clinicalNote);
  
  // Step 2: Send safe text to OpenAI
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a medical assistant analyzing de-identified clinical notes.'
      },
      {
        role: 'user',
        content: redactionResult.text
      }
    ]
  });
  
  // Step 3: Restore PHI in response (optional)
  const response = completion.choices[0].message.content;
  const restoredResponse = await engine.restore(response, redactionResult.tokenMap);
  
  return {
    safeResponse: response,
    fullResponse: restoredResponse,
    redactionStats: {
      phiElementsRemoved: redactionResult.redactionCount,
      processingTimeMs: redactionResult.executionTimeMs
    }
  };
}
```

### Streaming with OpenAI

```typescript
import { VulpesCelare } from 'vulpes-celare';
import OpenAI from 'openai';

async function streamingAnalysis(clinicalNote: string) {
  const engine = new VulpesCelare();
  const redactionResult = await engine.process(clinicalNote);
  
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: redactionResult.text }],
    stream: true
  });
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    process.stdout.write(content);
  }
}
```

### Function Calling with Redaction

```typescript
async function clinicalDecisionSupport(note: string) {
  const engine = new VulpesCelare();
  const redacted = await engine.process(note);
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: redacted.text }],
    functions: [
      {
        name: 'suggestDiagnosis',
        description: 'Suggest differential diagnoses based on clinical presentation',
        parameters: {
          type: 'object',
          properties: {
            diagnoses: {
              type: 'array',
              items: { type: 'string' }
            },
            confidence: { type: 'string' }
          }
        }
      }
    ],
    function_call: 'auto'
  });
  
  return completion.choices[0].message;
}
```

---

## Anthropic (Claude)

### Basic Integration

```typescript
import { VulpesCelare } from 'vulpes-celare';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function analyzeWithClaude(clinicalNote: string) {
  const engine = new VulpesCelare();
  const redacted = await engine.process(clinicalNote);
  
  const message = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: redacted.text
      }
    ]
  });
  
  return {
    response: message.content[0].text,
    usage: message.usage,
    redactionStats: {
      phiRemoved: redacted.redactionCount,
      processingMs: redacted.executionTimeMs
    }
  };
}
```

### Streaming with Claude

```typescript
async function streamWithClaude(clinicalNote: string) {
  const engine = new VulpesCelare();
  const redacted = await engine.process(clinicalNote);
  
  const stream = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 1024,
    messages: [{ role: 'user', content: redacted.text }],
    stream: true
  });
  
  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      process.stdout.write(event.delta.text);
    }
  }
}
```

### Tool Use with Claude

```typescript
async function claudeWithTools(clinicalNote: string) {
  const engine = new VulpesCelare();
  const redacted = await engine.process(clinicalNote);
  
  const message = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 1024,
    tools: [
      {
        name: 'calculate_risk_score',
        description: 'Calculate clinical risk score based on symptoms',
        input_schema: {
          type: 'object',
          properties: {
            symptoms: { type: 'array', items: { type: 'string' } },
            severity: { type: 'string', enum: ['low', 'medium', 'high'] }
          },
          required: ['symptoms']
        }
      }
    ],
    messages: [{ role: 'user', content: redacted.text }]
  });
  
  return message;
}
```

---

## Google Gemini

### Basic Integration

```typescript
import { VulpesCelare } from 'vulpes-celare';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function analyzeWithGemini(clinicalNote: string) {
  const engine = new VulpesCelare();
  const redacted = await engine.process(clinicalNote);
  
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  const result = await model.generateContent(redacted.text);
  const response = await result.response;
  
  return {
    text: response.text(),
    redactionStats: {
      phiRemoved: redacted.redactionCount,
      processingMs: redacted.executionTimeMs
    }
  };
}
```

### Streaming with Gemini

```typescript
async function streamWithGemini(clinicalNote: string) {
  const engine = new VulpesCelare();
  const redacted = await engine.process(clinicalNote);
  
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  const result = await model.generateContentStream(redacted.text);
  
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    process.stdout.write(chunkText);
  }
}
```

---

## Azure OpenAI

### Basic Integration

```typescript
import { VulpesCelare } from 'vulpes-celare';
import { OpenAIClient, AzureKeyCredential } from '@azure/openai';

const client = new OpenAIClient(
  process.env.AZURE_OPENAI_ENDPOINT,
  new AzureKeyCredential(process.env.AZURE_OPENAI_KEY)
);

async function analyzeWithAzure(clinicalNote: string) {
  const engine = new VulpesCelare();
  const redacted = await engine.process(clinicalNote);
  
  const deploymentId = 'gpt-4';
  const result = await client.getChatCompletions(
    deploymentId,
    [{ role: 'user', content: redacted.text }]
  );
  
  return {
    response: result.choices[0].message.content,
    redactionStats: {
      phiRemoved: redacted.redactionCount,
      processingMs: redacted.executionTimeMs
    }
  };
}
```

---

## AWS Bedrock

### Basic Integration

```typescript
import { VulpesCelare } from 'vulpes-celare';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });

async function analyzeWithBedrock(clinicalNote: string) {
  const engine = new VulpesCelare();
  const redacted = await engine.process(clinicalNote);
  
  const input = {
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: redacted.text
        }
      ]
    })
  };
  
  const command = new InvokeModelCommand(input);
  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  return {
    response: responseBody.content[0].text,
    redactionStats: {
      phiRemoved: redacted.redactionCount,
      processingMs: redacted.executionTimeMs
    }
  };
}
```

---

## Local Models (Ollama)

### Basic Integration

```typescript
import { VulpesCelare } from 'vulpes-celare';
import ollama from 'ollama';

async function analyzeWithOllama(clinicalNote: string) {
  const engine = new VulpesCelare();
  const redacted = await engine.process(clinicalNote);
  
  const response = await ollama.chat({
    model: 'llama2',
    messages: [
      {
        role: 'user',
        content: redacted.text
      }
    ]
  });
  
  return {
    response: response.message.content,
    redactionStats: {
      phiRemoved: redacted.redactionCount,
      processingMs: redacted.executionTimeMs
    }
  };
}
```

### Streaming with Ollama

```typescript
async function streamWithOllama(clinicalNote: string) {
  const engine = new VulpesCelare();
  const redacted = await engine.process(clinicalNote);
  
  const stream = await ollama.chat({
    model: 'llama2',
    messages: [{ role: 'user', content: redacted.text }],
    stream: true
  });
  
  for await (const chunk of stream) {
    process.stdout.write(chunk.message.content);
  }
}
```

---

## LangChain

### Basic Chain Integration

```typescript
import { VulpesCelare } from 'vulpes-celare';
import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';

// Create a PHI redaction runnable
const redactPHI = async (input: { text: string }) => {
  const engine = new VulpesCelare();
  const result = await engine.process(input.text);
  return { 
    text: result.text,
    tokenMap: result.tokenMap 
  };
};

// Create chain with redaction
const model = new ChatOpenAI({ modelName: 'gpt-4' });
const chain = RunnableSequence.from([
  redactPHI,
  async (input) => model.invoke(input.text)
]);

// Use the chain
const result = await chain.invoke({ text: clinicalNote });
```

### LangChain with Memory

```typescript
import { BufferMemory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';

const memory = new BufferMemory();
const model = new ChatOpenAI({ modelName: 'gpt-4' });

const chain = new ConversationChain({
  llm: model,
  memory: memory
});

async function chatWithRedaction(userMessage: string) {
  const engine = new VulpesCelare();
  const redacted = await engine.process(userMessage);
  
  const response = await chain.call({
    input: redacted.text
  });
  
  return response.response;
}
```

---

## LangGraph

### Agent with Redaction

```typescript
import { VulpesCelare } from 'vulpes-celare';
import { StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';

interface AgentState {
  input: string;
  redactedInput: string;
  output: string;
}

// Define redaction node
async function redactNode(state: AgentState): Promise<Partial<AgentState>> {
  const engine = new VulpesCelare();
  const result = await engine.process(state.input);
  return { redactedInput: result.text };
}

// Define LLM node
async function llmNode(state: AgentState): Promise<Partial<AgentState>> {
  const model = new ChatOpenAI({ modelName: 'gpt-4' });
  const response = await model.invoke(state.redactedInput);
  return { output: response.content.toString() };
}

// Build graph
const workflow = new StateGraph<AgentState>({
  channels: {
    input: { value: (x, y) => y ?? x },
    redactedInput: { value: (x, y) => y ?? x },
    output: { value: (x, y) => y ?? x }
  }
});

workflow.addNode('redact', redactNode);
workflow.addNode('llm', llmNode);
workflow.addEdge('redact', 'llm');
workflow.setEntryPoint('redact');

const app = workflow.compile();

// Use the graph
const result = await app.invoke({ input: clinicalNote });
```

---

## CrewAI

### Agent with Safe PHI Handling

```typescript
import { VulpesCelare } from 'vulpes-celare';
import { Agent, Task, Crew } from '@crewai/crewai';

// Create a safe agent wrapper
class SafeHealthcareAgent {
  private engine: VulpesCelare;
  private agent: Agent;
  
  constructor(role: string, goal: string, backstory: string) {
    this.engine = new VulpesCelare();
    this.agent = new Agent({
      role,
      goal,
      backstory,
      verbose: true
    });
  }
  
  async execute(input: string): Promise<string> {
    // Redact before processing
    const redacted = await this.engine.process(input);
    
    // Execute agent task
    const result = await this.agent.execute({
      description: redacted.text
    });
    
    return result;
  }
}

// Create safe crew
const diagnosticAgent = new SafeHealthcareAgent(
  'Clinical Diagnostician',
  'Analyze clinical presentations and suggest differential diagnoses',
  'Expert physician with 20 years of experience'
);

const task = new Task({
  description: clinicalNote,
  agent: diagnosticAgent.agent
});

const crew = new Crew({
  agents: [diagnosticAgent.agent],
  tasks: [task]
});

const result = await crew.kickoff();
```

---

## AutoGen

### Multi-Agent with Redaction

```typescript
import { VulpesCelare } from 'vulpes-celare';
import { AssistantAgent, UserProxyAgent } from 'autogen';

// Create safe wrapper for AutoGen
async function createSafeConversation(clinicalNote: string) {
  const engine = new VulpesCelare();
  const redacted = await engine.process(clinicalNote);
  
  const assistant = new AssistantAgent({
    name: 'MedicalAssistant',
    systemMessage: 'You are a medical AI assistant working with de-identified data.'
  });
  
  const userProxy = new UserProxyAgent({
    name: 'User',
    humanInputMode: 'NEVER',
    maxConsecutiveAutoReply: 5
  });
  
  await userProxy.initiateChat(assistant, {
    message: redacted.text
  });
  
  return userProxy.lastMessage;
}
```

---

## Express.js Middleware

### Production Middleware

```typescript
import express from 'express';
import { VulpesCelare } from 'vulpes-celare';

const app = express();
app.use(express.json());

// PHI Redaction Middleware
const phiRedactionMiddleware = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (req.body.text || req.body.content) {
    const engine = new VulpesCelare();
    const field = req.body.text ? 'text' : 'content';
    
    try {
      const result = await engine.process(req.body[field]);
      
      // Store original and redacted
      req.body[`${field}_original`] = req.body[field];
      req.body[field] = result.text;
      req.body.redactionStats = {
        phiRemoved: result.redactionCount,
        processingMs: result.executionTimeMs
      };
      req.body.tokenMap = result.tokenMap; // For restoration
      
      next();
    } catch (error) {
      res.status(500).json({ error: 'Redaction failed', details: error.message });
    }
  } else {
    next();
  }
};

// Apply to all AI routes
app.use('/api/ai/*', phiRedactionMiddleware);

// Example endpoint
app.post('/api/ai/analyze', async (req, res) => {
  // req.body.text is now safe to send to LLM
  const llmResponse = await yourLLMFunction(req.body.text);
  
  res.json({
    response: llmResponse,
    redactionStats: req.body.redactionStats
  });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

## FastAPI Middleware

### Python Integration

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import subprocess
import json

app = FastAPI()

async def redact_phi(text: str) -> dict:
    """
    Call Vulpes Celare via Node.js subprocess
    
    WARNING: This is a simplified example for demonstration.
    In production, use one of the following approaches:
    1. HTTP microservice (recommended)
    2. gRPC service
    3. Message queue (Redis, RabbitMQ)
    4. Native Python binding (if available)
    """
    # Security note: Properly escape input or use structured IPC
    import tempfile
    
    # Write text to temporary file to avoid injection
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
        f.write(text)
        temp_path = f.name
    
    try:
        result = subprocess.run(
            ['node', '-e', f'''
            const fs = require('fs');
            const VulpesCelare = require('vulpes-celare').VulpesCelare;
            (async () => {{
                const text = fs.readFileSync('{temp_path}', 'utf8');
                const engine = new VulpesCelare();
                const result = await engine.process(text);
                console.log(JSON.stringify(result));
            }})();
            '''],
            capture_output=True,
            text=True,
            timeout=30
        )
        return json.loads(result.stdout)
    finally:
        os.unlink(temp_path)

# Better approach: Use dependency injection
from fastapi import Depends

async def get_redacted_text(text: str = Body(...)) -> dict:
    """Dependency that provides redacted text"""
    return await redact_phi(text)

@app.post("/api/ai/analyze")
async def analyze(
    text: str = Body(...),
    redaction_result: dict = Depends(get_redacted_text)
):
    """
    Endpoint with automatic redaction via dependency injection.
    This is more FastAPI-idiomatic than middleware modification.
    """
    # text is already redacted via dependency
    llm_response = your_llm_function(redaction_result["text"])
    
    return {
        "response": llm_response,
        "redaction_stats": {
            "phi_removed": redaction_result["redactionCount"],
            "processing_ms": redaction_result["executionTimeMs"]
        }
    }

# Alternative: Middleware approach (less recommended)
@app.middleware("http")
async def phi_redaction_middleware(request: Request, call_next):
    """
    Note: Modifying request body in middleware is tricky in FastAPI.
    Dependency injection (above) is recommended instead.
    """
    if request.url.path.startswith("/api/ai/"):
        # Store original body
        body_bytes = await request.body()
        
        try:
            body = json.loads(body_bytes)
            
            if "text" in body:
                redaction_result = await redact_phi(body["text"])
                body["text"] = redaction_result["text"]
                body["redaction_stats"] = {
                    "phi_removed": redaction_result["redactionCount"],
                    "processing_ms": redaction_result["executionTimeMs"]
                }
                
                # Create new request with modified body
                async def receive():
                    return {"type": "http.request", "body": json.dumps(body).encode()}
                
                request._receive = receive
        except json.JSONDecodeError:
            pass  # Not JSON, continue without modification
    
    response = await call_next(request)
    return response

@app.post("/api/ai/analyze")
async def analyze(request: Request):
    body = await request.json()
    # body["text"] is now safe
    llm_response = your_llm_function(body["text"])
    
    return {
        "response": llm_response,
        "redaction_stats": body.get("redaction_stats")
    }
```

---

## Best Practices

### 1. Always Redact Before LLM

```typescript
// ❌ WRONG - Sending PHI to LLM
const response = await openai.chat.completions.create({
  messages: [{ role: 'user', content: clinicalNote }]
});

// ✅ CORRECT - Redact first
const engine = new VulpesCelare();
const redacted = await engine.process(clinicalNote);
const response = await openai.chat.completions.create({
  messages: [{ role: 'user', content: redacted.text }]
});
```

### 2. Log Redaction Stats

```typescript
const result = await engine.process(clinicalNote);

console.log({
  timestamp: new Date().toISOString(),
  phiElementsRemoved: result.redactionCount,
  processingTimeMs: result.executionTimeMs,
  documentLength: clinicalNote.length,
  redactedLength: result.text.length
});
```

### 3. Use Appropriate Policies

```typescript
// For production
const prodEngine = new VulpesCelare({ policy: 'maximum' });

// For research
const researchEngine = new VulpesCelare({ policy: 'research-relaxed' });

// For internal workflow
const internalEngine = new VulpesCelare({ policy: 'radiology-dept' });
```

### 4. Handle Errors Gracefully

```typescript
try {
  const redacted = await engine.process(clinicalNote);
  const llmResponse = await llm.complete(redacted.text);
  return llmResponse;
} catch (error) {
  if (error instanceof RedactionError) {
    // Log and alert - this is critical
    console.error('CRITICAL: PHI redaction failed', error);
    throw new Error('Cannot process - redaction required');
  }
  throw error;
}
```

### 5. Audit Trail

```typescript
const auditEntry = {
  timestamp: new Date().toISOString(),
  userId: req.user.id,
  action: 'LLM_ANALYSIS',
  phiRedacted: true,
  phiCount: result.redactionCount,
  llmProvider: 'openai',
  model: 'gpt-4'
};

await auditLog.write(auditEntry);
```

---

## Security Considerations

### BAA Requirements

When using cloud LLM providers with redacted data:

- ✅ **OpenAI:** Sign BAA through Azure OpenAI Service
- ✅ **Anthropic:** Enterprise plan includes BAA
- ✅ **Google:** Google Cloud Vertex AI includes BAA
- ✅ **AWS:** Bedrock with BAA

### Network Isolation

For maximum security, use local models:

```typescript
// ✅ No PHI leaves your network
const engine = new VulpesCelare();
const redacted = await engine.process(note);

// Local LLM via Ollama
const response = await ollama.chat({
  model: 'medllama',
  messages: [{ role: 'user', content: redacted.text }]
});
```

### Data Retention

Configure LLM providers for zero retention:

```typescript
// OpenAI zero retention
const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: redacted.text }],
  // Add this header for zero retention
  headers: {
    'OpenAI-Organization': process.env.OPENAI_ORG_ID,
    'OpenAI-Project': process.env.OPENAI_PROJECT_ID
  }
});
```

---

## Support

For integration questions:
- 📖 [Full Documentation](https://github.com/DocHatty/Vulpes-Celare)
- 💬 [Community Discussions](https://github.com/DocHatty/Vulpes-Celare/discussions)
- 🐛 [Report Issues](https://github.com/DocHatty/Vulpes-Celare/issues)
