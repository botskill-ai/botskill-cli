/**
 * 默认 API 地址，可通过 build 时环境变量 BOTSKILL_API_URL 注入
 * 发布生产: BOTSKILL_API_URL=https://api.botskill.ai npm run build
 * 开发/本地: 保持 __DEFAULT_API_URL__ 时使用 localhost
 */
export const DEFAULT_API_URL = '__DEFAULT_API_URL__';
export const FALLBACK_API_URL = 'http://localhost:3000/api';

export const getDefaultApiUrl = () =>
  DEFAULT_API_URL === '__DEFAULT_API_URL__' ? FALLBACK_API_URL : DEFAULT_API_URL;

/** Default skills directory for upgrade (Cursor) */
export const DEFAULT_SKILLS_DIR = '~/.cursor/skills';
