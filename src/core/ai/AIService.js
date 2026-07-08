/**
 * ClawBoard - Ollama AI 集成
 * 本地 LLM 提供摘要、标签、搜索增强
 */

const http = require('http');

// Simple logger
const log = {
  info: (...args) => console.log('[AI]', ...args),
  warn: (...args) => console.warn('[AI]', ...args),
  error: (...args) => console.error('[AI]', ...args),
  debug: (...args) => console.log('[AI:DEBUG]', ...args)
};

const OLLAMA_HOST = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen2.5:3b';
const DEFAULT_EMBED_MODEL = 'nomic-embed-text';

// 可从设置覆盖
const config = {
  chatModel: DEFAULT_MODEL,
  embedModel: DEFAULT_EMBED_MODEL,
  ollamaUrl: OLLAMA_HOST,
  autoSummary: true,
  autoTag: true,
  autoEmbed: true,
  enabled: true
};

// v0.58.0: 提示词模板
const prompts = {
  summary: '请为以下内容生成一个简短的中文摘要（不超过50字）：\n\n{{content}}',
  tag: '请为以下内容生成3-5个中文标签（用逗号分隔）：\n\n{{content}}\n\n类型：{{type}}\n来源：{{source}}',
  search:
    '将以下搜索query转换为一个更适合搜索的关键词短句（保留核心语义，去除口语化表达）：\n\n搜索: {{query}}\n\n只输出转换后的关键词，不要其他解释。',
  qa: '你是一个基于用户剪贴板历史的智能问答助手。以下是用户剪贴板中与问题相关的内容：\n\n{{context}}\n\n请基于以上剪贴板历史记录回答用户的问题：{{question}}\n\n要求：\n- 如果信息足够，给出准确具体的回答，并引用相关记录 ID\n- 如果信息不足以回答，请如实说明\n- 答案用中文\n- 保持简洁'
};

// 保存默认值用于一键重置
const _defaultConfig = JSON.parse(JSON.stringify(config));
const _defaultPrompts = JSON.parse(JSON.stringify(prompts));

// 兼容旧接口
function setConfig(newConfig) {
  if (newConfig.chatModel || newConfig.model)
    config.chatModel = newConfig.chatModel || newConfig.model;
  if (newConfig.embedModel) config.embedModel = newConfig.embedModel;
  if (newConfig.ollamaUrl || newConfig.host)
    config.ollamaUrl = newConfig.ollamaUrl || newConfig.host;
  if (newConfig.summarizePrompt) prompts.summary = newConfig.summarizePrompt;
  if (newConfig.tagsPrompt) prompts.tag = newConfig.tagsPrompt;
  if (newConfig.searchPrompt) prompts.search = newConfig.searchPrompt;
  if (newConfig.autoSummary !== undefined) config.autoSummary = newConfig.autoSummary;
  if (newConfig.autoTag !== undefined) config.autoTag = newConfig.autoTag;
  if (newConfig.autoEmbed !== undefined) config.autoEmbed = newConfig.autoEmbed;
  if (newConfig.enabled !== undefined) config.enabled = newConfig.enabled;
}

function getConfig() {
  return { ...config };
}

// v0.58.0: AI 配置管理
function getPrompts() {
  return { ...prompts };
}

function getDefaultConfig() {
  return JSON.parse(JSON.stringify(_defaultConfig));
}

function getDefaultPrompts() {
  return JSON.parse(JSON.stringify(_defaultPrompts));
}

function updateConfig(updates) {
  Object.assign(config, updates);
  return { ...config };
}

function updatePrompt(key, template) {
  if (Object.prototype.hasOwnProperty.call(prompts, key)) {
    prompts[key] = template;
    return true;
  }
  return false;
}

function resetToDefaults() {
  Object.assign(config, JSON.parse(JSON.stringify(_defaultConfig)));
  Object.assign(prompts, JSON.parse(JSON.stringify(_defaultPrompts)));
  return true;
}

function renderPrompt(key, variables) {
  let template = prompts[key] || '';
  for (const [k, v] of Object.entries(variables || {})) {
    template = template.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v || '');
  }
  return template;
}

/**
 * 生成摘要
 */
async function summarize(text) {
  if (!config.enabled) return null;
  if (!text || text.length < 50) return text;

  try {
    const prompt = renderPrompt('summary', { content: text.substring(0, 1000) });
    const result = await _chat(prompt);
    return result;
  } catch (err) {
    log.warn('AI 摘要生成失败:', err.message);
    return null;
  }
}

/**
 * 为内容生成标签
 */
async function generateTags(text) {
  if (!config.enabled) return [];
  try {
    const prompt = renderPrompt('tag', { content: text.substring(0, 500) });
    const result = await _chat(prompt);
    if (result) {
      return result
        .split(/[,，、]/)
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .slice(0, 5);
    }
    return [];
  } catch (err) {
    log.warn('AI 标签生成失败:', err.message);
    return [];
  }
}

/**
 * 自然语言搜索增强
 */
async function searchEnhance(query) {
  if (!config.enabled) return query;
  try {
    const prompt = renderPrompt('search', { query });
    const result = await _chat(prompt);
    return result || query;
  } catch (err) {
    log.warn('搜索增强失败:', err.message);
    return query;
  }
}

/**
 * 基于剪贴板历史进行自然语言问答（RAG）
 * @param {string} question - 用户问题
 * @param {Array<{id: number, type: string, content: string, summary: string, created_at: string}>} contextRecords - 相关上下文记录
 * @returns {Promise<{answer: string, sources: Array<{id: number, type: string}>}>}
 */
async function ask(question, contextRecords) {
  if (!config.enabled) return { answer: 'AI 服务未启用，请启用后重试', sources: [] };
  if (!question) return { answer: '请输入问题', sources: [] };
  if (!contextRecords || contextRecords.length === 0) {
    return { answer: '剪贴板历史中没有找到相关信息', sources: [] };
  }

  try {
    const context = contextRecords
      .map(r => `[记录 ${r.id}] (${r.type}) ${r.created_at || ''}\n${(r.content || '').substring(0, 800)}`)
      .join('\n\n---\n\n');

    const prompt = renderPrompt('qa', { context, question });
    const answer = await _chat(prompt);

    const sources = contextRecords.map(r => ({
      id: r.id,
      type: r.type,
      summary: r.ai_summary || r.summary || null
    }));

    return { answer: answer || '无法生成回答', sources };
  } catch (err) {
    log.warn('AI 问答失败:', err.message);
    return { answer: `AI 问答失败: ${err.message}`, sources: [] };
  }
}

/**
 * 生成嵌入向量（用于语义搜索）
 */
async function getEmbedding(text) {
  try {
    const body = JSON.stringify({
      model: config.embedModel,
      input: text.substring(0, 2000)
    });

    const result = await _request('POST', '/api/embeddings', body);
    return result.embedding;
  } catch (err) {
    log.warn('嵌入生成失败:', err.message);
    return null;
  }
}

/**
 * 检查 Ollama 是否可用
 */
async function checkHealth() {
  try {
    const result = await _request('GET', '/api/tags');
    return result.models && result.models.length > 0;
  } catch {
    return false;
  }
}

/**
 * 获取已安装的模型列表
 */
async function listModels() {
  try {
    const result = await _request('GET', '/api/tags');
    return (result.models || []).map(m => m.name);
  } catch {
    return [];
  }
}

// ==================== 内部方法 ====================

async function _chat(prompt, model = config.chatModel) {
  const body = JSON.stringify({
    model,
    prompt,
    stream: false,
    options: {
      temperature: 0.7,
      num_predict: 200
    }
  });

  const result = await _request('POST', '/api/generate', body);
  return result.response?.trim();
}

function _request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, config.ollamaUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

module.exports = {
  summarize,
  generateTags,
  searchEnhance,
  ask,
  getEmbedding,
  checkHealth,
  listModels,
  setConfig,
  getConfig,
  // v0.58.0: AI 配置管理
  getPrompts,
  getDefaultConfig,
  getDefaultPrompts,
  updateConfig,
  updatePrompt,
  resetToDefaults,
  renderPrompt
};
