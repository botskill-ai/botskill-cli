import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { getToken } from '../lib/auth.js';
import { printApiError, printSimpleError } from '../lib/formatError.js';
import { uploadSkillFile, findUploadFile } from '../lib/uploadSkill.js';
import { packDirectory } from '../lib/packSkill.js';

const publishCommand = new Command('publish');
publishCommand
  .description('Publish a skill to BotSkill (alias for push)')
  .option('-f, --file <path>', 'Path to SKILL.md, .zip, or .tar.gz')
  .option('--config-dir <path>', 'Directory containing skill.config.json (default: same as file)')
  .option('--dry-run', 'Validate without uploading')
  .option('--api-url <url>', 'API base URL (overrides config for this command)')
  .action(async (options, command) => {
    const apiUrl = command.optsWithGlobals().apiUrl;
    if (!getToken()) {
      console.error('Not logged in. Run: skm login');
      process.exit(1);
    }

    let filePath = options.file;
    if (!filePath) {
      filePath = await findUploadFile();
      if (!filePath) {
        console.error('No skill file found. Create SKILL.md or a .zip/.tar.gz package, or use --file <path>');
        process.exit(1);
      }
    } else {
      if (!await fs.pathExists(filePath)) {
        console.error('File not found:', filePath);
        process.exit(1);
      }
    }

    const configDir = options.configDir ? path.resolve(options.configDir) : path.dirname(path.resolve(filePath));
    let tempPackPath = null;
    let uploadPath = filePath;

    const isSkillMd = filePath.toLowerCase().endsWith('.md') || path.basename(filePath) === 'SKILL.md';
    if (isSkillMd) {
      const dirPath = path.dirname(path.resolve(filePath));
      if (options.dryRun) {
        console.log('[DRY RUN] Would pack directory to temp (skill-{version}.zip) and upload');
        console.log('[DRY RUN] Source:', path.resolve(filePath));
        return;
      }
      try {
        tempPackPath = await packDirectory(dirPath, { useTempDir: true });
        uploadPath = tempPackPath;
      } catch (err) {
        if (err.message === 'NO_SKILL_MD') {
          printSimpleError('SKILL.md not found', 'Create SKILL.md in the directory first');
        } else {
          printSimpleError(err.message || 'Pack failed');
        }
        process.exit(1);
      }
    } else if (options.dryRun) {
      console.log('[DRY RUN] Would publish:', path.resolve(filePath));
      return;
    }

    console.log(`Publishing skill from ${path.basename(uploadPath)}...`);
    try {
      const skill = await uploadSkillFile(uploadPath, { apiUrl, configDir });
      console.log('Skill published successfully!');
      console.log(`Name: ${skill?.name}`);
      console.log(`Version: ${skill?.version || (skill?.versions?.[0]?.version)}`);
      console.log(`Status: ${skill?.status || 'pending_review'}`);
    } catch (err) {
      if (err.message === 'NOT_LOGGED_IN') {
        printSimpleError('Not logged in', 'Run "skm login" first');
      } else if (err.message === 'FILE_NOT_FOUND') {
        printSimpleError('File not found', uploadPath);
      } else {
        const msg = err.response?.data?.error || err.response?.data?.details?.[0];
        if (msg) err._overrideMsg = msg;
        if (err.response?.status === 401) err._overrideMsg = 'Token expired or invalid. Run "skm login" first.';
        printApiError(err, { prefix: 'Publish failed' });
      }
    } finally {
      if (tempPackPath) {
        try {
          await fs.remove(path.dirname(tempPackPath));
        } catch (_) {}
      }
    }
  });

export { publishCommand };
