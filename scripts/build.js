#!/usr/bin/env node
/**
 * 构建脚本：根据环境变量注入默认配置
 * 用法:
 *   npm run build                    # 使用 localhost（开发）
 *   BOTSKILL_API_URL=https://api.botskill.ai npm run build      # 生产 API
 *   npm run build:restore            # 发布后恢复占位符，便于继续开发
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const constantsPath = path.join(__dirname, '../src/lib/constants.js');

const isRestore = process.argv.includes('--restore');

if (isRestore) {
  let content = fs.readFileSync(constantsPath, 'utf8');
  content = content.replace(
    /export const DEFAULT_API_URL = .+;/,
    "export const DEFAULT_API_URL = '__DEFAULT_API_URL__';"
  );
  fs.writeFileSync(constantsPath, content);
  console.log('Build: restored placeholder');
} else {
  const apiUrl = process.env.BOTSKILL_API_URL || 'http://localhost:3001/api';
  let content = fs.readFileSync(constantsPath, 'utf8');
  content = content.replace(
    /export const DEFAULT_API_URL = .+;/,
    `export const DEFAULT_API_URL = ${JSON.stringify(apiUrl)};`
  );
  fs.writeFileSync(constantsPath, content);
  console.log(`Build: DEFAULT_API_URL = ${apiUrl}`);
}
