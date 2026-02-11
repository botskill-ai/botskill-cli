#!/usr/bin/env node
/**
 * postinstall: 在用户目录下创建默认配置文件
 * 路径: ~/.skm/config.json
 * 默认 API 来自构建时 BOTSKILL_API_URL，未构建时用 localhost
 */
import path from 'path';
import os from 'os';
import fs from 'fs';
import Configstore from 'configstore';
import { getDefaultApiUrl } from '../src/lib/constants.js';

const CONFIG_PATH = path.join(os.homedir(), '.skm', 'config.json');
const defaultUrl = getDefaultApiUrl();

try {
  const config = new Configstore('botskill-cli', { apiUrl: defaultUrl }, {
    configPath: CONFIG_PATH,
  });
  if (!fs.existsSync(config.path)) {
    config.set('apiUrl', defaultUrl);
  }
} catch {
  // 静默失败，首次运行 skm 时 Configstore 会创建
}
