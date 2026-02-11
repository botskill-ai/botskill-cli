#!/usr/bin/env node
/**
 * 发布脚本：自动增加版本号并发布
 * 用法:
 *   npm run release              # patch 版本 (1.0.2 -> 1.0.3)，默认使用 https://botskill.ai
 *   npm run release:minor        # minor 版本 (1.0.2 -> 1.1.0)
 *   npm run release:major        # major 版本 (1.0.2 -> 2.0.0)
 *   npm run release -- --dry-run # 预览版本号变化，不实际发布
 *   BOTSKILL_API_URL=其他URL npm run release  # 使用自定义 API URL
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '../package.json');

// 解析命令行参数
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const versionType = args.find(arg => ['patch', 'minor', 'major'].includes(arg)) || 'patch';

// 读取当前版本
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;
console.log(`当前版本: ${currentVersion}`);

// 计算新版本号
const [major, minor, patch] = currentVersion.split('.').map(Number);
let newVersion;
switch (versionType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
  default:
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

console.log(`新版本: ${newVersion}`);

// 获取 API URL（发布时默认使用生产环境）
const apiUrl = process.env.BOTSKILL_API_URL || 'https://botskill.ai';
console.log(`使用 API URL: ${apiUrl}`);

if (isDryRun) {
  console.log('\n[DRY RUN] 预览模式，不会实际修改版本号或发布');
  process.exit(0);
}

// 更新 package.json 中的版本号
packageJson.version = newVersion;
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`✓ 已更新 package.json 版本号为 ${newVersion}`);

try {
  // 构建
  console.log('\n开始构建...');
  execSync(`npm run build`, { stdio: 'inherit', env: { ...process.env, BOTSKILL_API_URL: apiUrl } });
  
  // 发布
  console.log('\n开始发布到 npm...');
  execSync(`npm publish`, { stdio: 'inherit' });
  
  // 恢复构建文件
  console.log('\n恢复构建文件...');
  execSync(`npm run build:restore`, { stdio: 'inherit' });
  
  console.log(`\n✓ 成功发布 ${newVersion} 版本！`);
} catch (error) {
  console.error('\n✗ 发布失败，正在恢复版本号...');
  // 恢复版本号
  packageJson.version = currentVersion;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  process.exit(1);
}
