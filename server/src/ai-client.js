const DEFAULT_AI_CONFIG = {
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: '',
  temperature: 0.7,
  topP: 1,
  maxTokens: 512,
  presencePenalty: 0,
  frequencyPenalty: 0,
  systemPrompt: '你是小达老师，是一个面向校园场景的 AI 助手。请优先用简洁、友好的中文回答。'
};

const DEFAULT_USER_AI_SETTINGS = {
  mode: 'preset',
  selectedPresetId: '',
  customOpenAI: {
    ...DEFAULT_AI_CONFIG,
    provider: 'openai'
  },
  customAnthropic: {
    ...DEFAULT_AI_CONFIG,
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1'
  }
};

function parseJson(value, fallback) {
  try {
    if (!value) {
      return fallback;
    }
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, num));
}

function normalizeAiConfig(raw = {}) {
  const merged = { ...DEFAULT_AI_CONFIG, ...(raw || {}) };
  return {
    provider: merged.provider === 'anthropic' ? 'anthropic' : 'openai',
    baseUrl: String(merged.baseUrl || DEFAULT_AI_CONFIG.baseUrl).trim().replace(/\/$/, ''),
    apiKey: String(merged.apiKey || '').trim(),
    model: String(merged.model || '').trim(),
    temperature: clampNumber(merged.temperature, 0, 2, DEFAULT_AI_CONFIG.temperature),
    topP: clampNumber(merged.topP, 0, 1, DEFAULT_AI_CONFIG.topP),
    maxTokens: Math.round(clampNumber(merged.maxTokens, 1, 8192, DEFAULT_AI_CONFIG.maxTokens)),
    presencePenalty: clampNumber(merged.presencePenalty, -2, 2, DEFAULT_AI_CONFIG.presencePenalty),
    frequencyPenalty: clampNumber(merged.frequencyPenalty, -2, 2, DEFAULT_AI_CONFIG.frequencyPenalty),
    systemPrompt: String(merged.systemPrompt || DEFAULT_AI_CONFIG.systemPrompt).trim()
  };
}

function validateAiConfig(config) {
  if (!config.baseUrl) {
    return 'Base URL 不能为空';
  }
  if (!/^https?:\/\//i.test(config.baseUrl)) {
    return 'Base URL 必须以 http:// 或 https:// 开头';
  }
  if (!config.apiKey) {
    return 'API Key 不能为空';
  }
  if (!config.model) {
    return '模型名称不能为空';
  }
  if (!['openai', 'anthropic'].includes(config.provider)) {
    return '暂不支持该模型供应商';
  }
  return '';
}

function sanitizeMessages(messages = []) {
  return messages
    .filter((item) => item && ['user', 'assistant'].includes(item.role) && String(item.content || '').trim())
    .slice(-20)
    .map((item) => ({
      role: item.role,
      content: String(item.content || '').trim()
    }));
}

async function readResponseJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (error) {
    return { raw: text };
  }
}

async function safeFetch(url, options, label) {
  try {
    return await fetch(url, options);
  } catch (error) {
    const reason = error && error.message ? error.message : '未知网络错误';
    throw new Error(`${label} 请求失败：${reason} (${url})`);
  }
}

async function callOpenAI(config, messages) {
  const url = `${config.baseUrl}/chat/completions`;
  const response = await safeFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: config.systemPrompt },
        ...messages
      ],
      temperature: config.temperature,
      top_p: config.topP,
      max_tokens: config.maxTokens,
      presence_penalty: config.presencePenalty,
      frequency_penalty: config.frequencyPenalty,
      stream: false
    })
  }, 'OpenAI');

  const data = await readResponseJson(response);
  if (!response.ok) {
    throw new Error(data.error && data.error.message ? data.error.message : 'OpenAI 接口调用失败');
  }

  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) {
    throw new Error('OpenAI 返回内容为空');
  }
  return String(content).trim();
}

async function callAnthropic(config, messages) {
  const url = `${config.baseUrl}/messages`;
  const response = await safeFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model,
      system: config.systemPrompt,
      messages,
      temperature: config.temperature,
      top_p: config.topP,
      max_tokens: config.maxTokens
    })
  }, 'Anthropic');

  const data = await readResponseJson(response);
  if (!response.ok) {
    throw new Error(data.error && data.error.message ? data.error.message : 'Anthropic 接口调用失败');
  }

  const content = Array.isArray(data.content)
    ? data.content
        .filter((item) => item && item.type === 'text' && item.text)
        .map((item) => item.text)
        .join('\n')
        .trim()
    : '';
  if (!content) {
    throw new Error('Anthropic 返回内容为空');
  }
  return content;
}

async function chatWithAi(rawConfig, rawMessages) {
  const config = normalizeAiConfig(rawConfig);
  const error = validateAiConfig(config);
  if (error) {
    throw new Error(error);
  }

  const messages = sanitizeMessages(rawMessages);
  if (!messages.length) {
    throw new Error('消息内容不能为空');
  }

  if (config.provider === 'anthropic') {
    return callAnthropic(config, messages);
  }
  return callOpenAI(config, messages);
}

async function validateAiConnection(rawConfig) {
  const content = await chatWithAi(rawConfig, [{ role: 'user', content: '请回复“配置校验成功”。' }]);
  return {
    ok: true,
    preview: content
  };
}

module.exports = {
  DEFAULT_AI_CONFIG,
  DEFAULT_USER_AI_SETTINGS,
  parseJson,
  normalizeAiConfig,
  validateAiConfig,
  sanitizeMessages,
  chatWithAi,
  validateAiConnection
};
