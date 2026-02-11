import { Command } from 'commander';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';
import { createApiClient } from '../lib/auth.js';
import { printApiError } from '../lib/formatError.js';

/** 从技能名提取目录名（@author/name -> name） */
function toDirName(name) {
  return String(name || 'skill').replace(/^@[^/]+\//, '').trim() || 'skill';
}

/**
 * Parse specifier: name@version or name
 * Returns { name, version } for API
 */
function parseSpecifier(spec) {
  const s = spec.trim();
  const atIdx = s.lastIndexOf('@');
  if (atIdx < 0) return { name: s, version: undefined };
  return {
    name: s.slice(0, atIdx).trim(),
    version: s.slice(atIdx + 1).trim() || undefined,
  };
}

const getCommand = new Command('get');
getCommand
  .description('Download a skill from BotSkill and extract to directory')
  .argument('<specifier>', 'Skill name or name@version (e.g. pdf-parser or pdf-parser@1.0.0)')
  .option('-o, --output <dir>', 'Output directory (default: current directory)')
  .option('--dry-run', 'Show what would be downloaded without actually downloading')
  .option('--api-url <url>', 'API base URL (overrides config for this command)')
  .action(async (specifier, options, command) => {
    const apiUrl = command.optsWithGlobals().apiUrl;
    const spec = (specifier || '').trim();
    const parsed = parseSpecifier(spec);
    const name = spec.startsWith('@') ? spec : parsed.name;
    const version = spec.startsWith('@') ? undefined : parsed.version;
    const outputDir = path.resolve(options.output || process.cwd());

    if (!name) {
      console.error('Error: skill name is required');
      process.exit(1);
    }

    if (options.dryRun) {
      console.log('[DRY RUN] Would download skill:', name);
      console.log('[DRY RUN] Version:', version || 'latest');
      console.log('[DRY RUN] Output:', outputDir);
      return;
    }

    try {
      const api = createApiClient(apiUrl);

      const fullSpec = version ? `${name}@${version}` : name;
      console.log(`Downloading skill: ${fullSpec}`);
      console.log(`Version: ${version || 'latest'}`);
      console.log(`Output: ${outputDir}`);

      const resolveRes = await api.get(`/skills/by-name/${encodeURIComponent(fullSpec)}`);
      const skill = resolveRes.data?.skill ?? resolveRes.data;
      if (!skill?._id) {
        console.error('Download failed: Skill not found');
        process.exit(1);
      }

      const versionParam = version ? `?version=${encodeURIComponent(version)}` : '';
      const url = `/skills/${encodeURIComponent(skill._id)}/download${versionParam}`;
      const res = await api.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(res.data);

      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();
      const rootDir = entries.find((e) => e.isDirectory)?.entryName?.replace(/\/$/, '') || (entries[0]?.entryName?.includes('/') ? entries[0].entryName.split('/')[0] : null);
      const hasParentDir = rootDir != null;

      const skillDirName = toDirName(skill.name);
      const targetPath = path.join(outputDir, skillDirName);

      if (hasParentDir) {
        zip.extractAllTo(outputDir, true);
        const extractedPath = path.join(outputDir, rootDir);
        if (rootDir !== skillDirName) {
          await fs.move(extractedPath, targetPath, { overwrite: true });
        }
      } else {
        await fs.ensureDir(targetPath);
        zip.extractAllTo(targetPath, true);
      }
      console.log(`\nSkill downloaded successfully!`);
      console.log(`Location: ${targetPath}`);
    } catch (err) {
      if (err.response?.data && !Buffer.isBuffer(err.response.data)) {
        const d = err.response.data;
        err._overrideMsg = d.error || d.message;
      }
      printApiError(err, { prefix: 'Download failed' });
    }
  });

export { getCommand };
