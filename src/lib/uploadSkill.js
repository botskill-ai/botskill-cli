import path from 'path';
import fs from 'fs-extra';
import { createApiClient, getToken } from './auth.js';

const validCategories = ['ai', 'data', 'web', 'devops', 'security', 'tools'];

/**
 * Find uploadable file in cwd
 * Priority: SKILL.md, skill.zip, skill.tar.gz, dist.zip, {name}-{version}.zip
 */
export async function findUploadFile(cwd = process.cwd()) {
  const candidates = [
    path.join(cwd, 'SKILL.md'),
    path.join(cwd, 'skill.zip'),
    path.join(cwd, 'skill.tar.gz'),
    path.join(cwd, 'dist.zip'),
  ];
  for (const p of candidates) {
    if (await fs.pathExists(p)) {
      const stat = await fs.stat(p);
      if (stat.isFile()) return p;
    }
  }
  // 查找 {name}-{version}.zip 格式的打包文件
  try {
    const files = await fs.readdir(cwd);
    const zipMatch = files.find((f) => /-\d+\.\d+\.\d+\.zip$/i.test(f));
    if (zipMatch) {
      const p = path.join(cwd, zipMatch);
      const stat = await fs.stat(p);
      if (stat.isFile()) return p;
    }
  } catch (_) {}
  return null;
}

/**
 * Load skill.config.json from directory (same dir as file or parent)
 */
export async function loadSkillConfig(filePath) {
  const dir = path.dirname(path.resolve(filePath));
  const configPath = path.join(dir, 'skill.config.json');
  if (!(await fs.pathExists(configPath))) return null;
  try {
    return await fs.readJson(configPath);
  } catch {
    return null;
  }
}

/**
 * Append skill.config.json fields to FormData (version, category, license, tags, urls)
 */
function appendConfigToForm(form, config) {
  if (!config) return;
  const fields = [
    'version',
    'category',
    'license',
    'repositoryUrl',
    'documentationUrl',
    'demoUrl',
  ];
  for (const key of fields) {
    const val = config[key];
    if (val !== undefined && val !== null && val !== '') {
      form.append(key, Array.isArray(val) ? JSON.stringify(val) : String(val));
    }
  }
  if (Array.isArray(config.tags) && config.tags.length > 0) {
    form.append('tags', JSON.stringify(config.tags));
  }
}

/**
 * Upload skill file (SKILL.md, .zip, .tar.gz) to BotSkill
 * @param {string} filePath - Path to file
 * @param {Object} [opts] - 可选
 * @param {string} [opts.apiUrl] - 覆盖 API 地址（来自 --api-url）
 * @param {string} [opts.configDir] - 指定读取 skill.config.json 的目录（默认与文件同目录）
 */
export async function uploadSkillFile(filePath, opts = {}) {
  const token = getToken();
  if (!token) {
    throw new Error('NOT_LOGGED_IN');
  }

  if (!await fs.pathExists(filePath)) {
    throw new Error('FILE_NOT_FOUND');
  }

  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('file', await fs.createReadStream(filePath), {
    filename: path.basename(filePath),
  });

  const configDir = opts.configDir ?? path.dirname(path.resolve(filePath));
  const configPath = path.join(configDir, 'skill.config.json');
  if (await fs.pathExists(configPath)) {
    try {
      const config = await fs.readJson(configPath);
      appendConfigToForm(form, config);
    } catch (_) {}
  }

  const api = createApiClient(opts.apiUrl);
  const res = await api.post('/skills/upload', form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  return res.data?.skill || res.data;
}

/**
 * Legacy: upload via JSON (for backward compatibility, may be deprecated)
 */
export async function uploadSkill(options = {}) {
  const token = getToken();
  if (!token) throw new Error('NOT_LOGGED_IN');

  let config = {};
  const configPath = path.join(process.cwd(), 'skill.config.json');
  if (await fs.pathExists(configPath)) {
    config = await fs.readJson(configPath);
  }

  const skillData = {
    name: options.name || config.name,
    description: options.description || config.description,
    version: options.version || config.version || '1.0.0',
    category: options.category || config.category || 'tools',
    tags: config.tags || [],
    license: config.license || 'MIT',
    repositoryUrl: config.repositoryUrl || undefined,
    documentationUrl: config.documentationUrl || undefined,
    demoUrl: config.demoUrl || undefined,
  };

  if (!skillData.name || !skillData.description) throw new Error('MISSING_FIELDS');
  if (!validCategories.includes(skillData.category)) {
    throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
  }

  const api = createApiClient();
  const res = await api.post('/skills', skillData);
  return res.data?.skill || res.data;
}

export { validCategories };
