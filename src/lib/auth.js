import path from 'path';
import os from 'os';
import Configstore from 'configstore';
import axios from 'axios';
import { getDefaultApiUrl } from './constants.js';

const CONFIG_PATH = path.join(os.homedir(), '.skm', 'config.json');
const defaultUrl = getDefaultApiUrl();

const config = new Configstore('botskill-cli', { apiUrl: defaultUrl }, {
  configPath: CONFIG_PATH,
});

export const getConfigPath = () => config.path;

/** 规范化 API 地址：若未以 /api 结尾则自动追加，用户无需手动加 /api */
export const normalizeApiUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  const u = url.replace(/\/+$/, '');
  return u.endsWith('/api') ? u : `${u}/api`;
};

/** 优先级: 环境变量 BOTSKILL_API_URL > 配置文件 > 构建时默认值 */
export const getApiUrl = () =>
  normalizeApiUrl(process.env.BOTSKILL_API_URL || config.get('apiUrl') || getDefaultApiUrl());

export const setApiUrl = (url) => config.set('apiUrl', url);

export const getToken = () => config.get('token');

export const getRefreshToken = () => config.get('refreshToken');

export const getUser = () => config.get('user');

export const setAuth = (data) => {
  if (data.token || data.accessToken) {
    config.set('token', data.token || data.accessToken);
  }
  if (data.refreshToken) {
    config.set('refreshToken', data.refreshToken);
  }
  if (data.user) {
    config.set('user', data.user);
  }
};

export const clearAuth = () => {
  config.delete('token');
  config.delete('refreshToken');
  config.delete('user');
};

export const isLoggedIn = () => !!config.get('token');

/** 从 axios 错误中提取请求 URL，用于错误输出 */
export const getErrorUrl = (err) => {
  const cfg = err?.config;
  if (!cfg) return getApiUrl();
  if (cfg.url && (cfg.url.startsWith('http://') || cfg.url.startsWith('https://'))) return cfg.url;
  if (cfg.baseURL) {
    const p = cfg.url || '';
    return cfg.baseURL.replace(/\/$/, '') + (p.startsWith('/') ? p : '/' + p);
  }
  return getApiUrl();
};

/**
 * 创建 API 客户端
 * @param {string} [overrideUrl] - 可选，覆盖本次请求的 API 地址（来自 --api-url）
 */
export const createApiClient = (overrideUrl) => {
  const baseURL = normalizeApiUrl(overrideUrl || getApiUrl());
  const client = axios.create({
    baseURL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use((cfg) => {
    const token = getToken();
    if (token) {
      cfg.headers.Authorization = `Bearer ${token}`;
    }
    return cfg;
  });

  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      if (err.response?.status !== 401) return Promise.reject(err);
      const req = err.config;
      if (req._retry) return Promise.reject(err);
      if (req.url?.includes('/auth/login') || req.url?.includes('/auth/refresh')) {
        return Promise.reject(err);
      }

      const refreshToken = getRefreshToken();
      if (!refreshToken) return Promise.reject(err);

      try {
        const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const data = res.data?.data || res.data;
        const newToken = data.accessToken || data.token;
        const newRefresh = data.refreshToken;
        if (newToken) {
          config.set('token', newToken);
          if (newRefresh) config.set('refreshToken', newRefresh);
          req._retry = true;
          req.headers.Authorization = `Bearer ${newToken}`;
          return client(req);
        }
      } catch (_) {}
      return Promise.reject(err);
    }
  );

  return client;
};
