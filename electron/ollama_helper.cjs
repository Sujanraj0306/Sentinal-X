/**
 * Ollama REST Helper — Direct HTTP calls to local Ollama API.
 * No MCP, no AirLLM, no SSD locks. Just clean REST.
 */
const http = require('http');

const OLLAMA_BASE = 'http://localhost:11434';

/**
 * Generate text from a local Ollama model via REST API.
 * @param {string} model - Ollama model name (e.g., 'llama3:latest', 'deepseek-r1:8b')
 * @param {string} prompt - The full prompt string
 * @param {object} [options] - Optional generation parameters
 * @param {number} [options.timeout=120000] - Request timeout in ms
 * @param {number} [options.num_predict=1024] - Max tokens to generate
 * @returns {Promise<string>} Generated text
 */
function ollamaGenerate(model, prompt, options = {}) {
     const { timeout = 120000, num_predict = 1024 } = options;

     return new Promise((resolve, reject) => {
          const payload = JSON.stringify({
               model,
               prompt,
               stream: false,
               options: { num_predict }
          });

          const url = new URL(`${OLLAMA_BASE}/api/generate`);

          const req = http.request({
               hostname: url.hostname,
               port: url.port,
               path: url.pathname,
               method: 'POST',
               headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
               },
               timeout
          }, (res) => {
               let data = '';
               res.on('data', (chunk) => { data += chunk; });
               res.on('end', () => {
                    try {
                         const parsed = JSON.parse(data);
                         resolve(parsed.response || '[Empty response from Ollama]');
                    } catch (e) {
                         reject(new Error(`Ollama JSON parse error: ${e.message}`));
                    }
               });
          });

          req.on('error', (e) => reject(new Error(`Ollama connection failed: ${e.message}`)));
          req.on('timeout', () => { req.destroy(); reject(new Error(`Ollama request timed out after ${timeout}ms`)); });

          req.write(payload);
          req.end();
     });
}

/**
 * Check if Ollama server is reachable.
 * @returns {Promise<boolean>}
 */
function ollamaHealthCheck() {
     return new Promise((resolve) => {
          const req = http.get(`${OLLAMA_BASE}/api/tags`, { timeout: 5000 }, (res) => {
               let data = '';
               res.on('data', (chunk) => { data += chunk; });
               res.on('end', () => resolve(true));
          });
          req.on('error', () => resolve(false));
          req.on('timeout', () => { req.destroy(); resolve(false); });
     });
}

module.exports = { ollamaGenerate, ollamaHealthCheck };
