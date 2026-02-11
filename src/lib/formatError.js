/**
 * 统一格式化 API 错误输出，便于 CLI 排查问题
 */
import { getErrorUrl } from './auth.js';

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

/**
 * 从 axios 错误中提取用户可读的消息
 */
function extractMessage(err, fallback = 'Request failed') {
  if (err._overrideMsg) return err._overrideMsg;
  if (err.response?.data && !Buffer.isBuffer(err.response.data)) {
    const d = err.response.data;
    return d.error || d.message || (typeof d === 'string' ? d : fallback);
  }
  if (err.code === 'ECONNREFUSED') {
    return 'Connection refused. Server may not be running.';
  }
  if (err.code === 'ENOTFOUND') {
    return 'DNS lookup failed. Check API URL or network.';
  }
  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
    return 'Request timed out.';
  }
  if (err.code === 'ERR_NETWORK') {
    return 'Network error.';
  }
  return err.message || fallback;
}

/**
 * 根据错误类型返回排查提示
 */
function getHints(err) {
  const hints = [];
  const status = err.response?.status;
  const code = err.code;

  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT' || code === 'ERR_NETWORK') {
    hints.push('Run "skm config" to view or set API URL');
    hints.push('Ensure the backend server is running');
  }
  if (status === 401) {
    hints.push('Run "skm login" to authenticate');
  }
  if (status === 404) {
    hints.push('Check if the resource exists');
  }
  if (status === 403) {
    hints.push('Your account may not have permission');
  }
  if (status && status >= 500) {
    hints.push('Server error. Try again later or contact support');
  }

  return hints;
}

/**
 * 格式化并输出 API 错误信息（符合 CLI 风格，便于排查）
 * @param {Error} err - axios 错误
 * @param {Object} opts - 选项
 * @param {string} opts.prefix - 错误前缀，如 "List failed"、"Download failed"
 * @param {string} opts.fallback - 无消息时的默认文案
 * @param {boolean} opts.skipUrl - 是否跳过 URL 输出（如登录失败时 URL 可能重复）
 */
export function formatApiError(err, opts = {}) {
  const { prefix = 'Error', fallback = 'Request failed', skipUrl = false } = opts;
  const msg = extractMessage(err, fallback);
  const url = getErrorUrl(err);
  const status = err.response?.status;
  const hints = getHints(err);

  const lines = [];

  // 主错误信息
  lines.push(red(`${prefix}: ${msg}`));

  // 辅助信息：URL、状态码
  const meta = [];
  if (!skipUrl) meta.push(`URL: ${url}`);
  if (status) meta.push(`HTTP ${status}`);
  if (meta.length) lines.push(dim(meta.join('  |  ')));

  // 排查提示
  if (hints.length) {
    lines.push('');
    lines.push(yellow('Hint:'));
    hints.forEach((h) => lines.push(dim(`  • ${h}`)));
  }

  return lines.join('\n');
}

/**
 * 输出错误并退出
 */
export function printApiError(err, opts = {}) {
  console.error(formatApiError(err, opts));
  process.exit(1);
}

/**
 * 输出简单错误（无 API 上下文，如 NOT_LOGGED_IN、FILE_NOT_FOUND）
 */
export function printSimpleError(message, hint = null) {
  console.error(red(`Error: ${message}`));
  if (hint) console.error(dim(`Hint: ${hint}`));
  process.exit(1);
}
