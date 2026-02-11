import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { packDirectory } from '../lib/packSkill.js';
import { printSimpleError } from '../lib/formatError.js';

const packCommand = new Command('pack');
packCommand
  .description('Pack current or specified directory into upload format (skill.zip)')
  .argument('[path]', 'Directory to pack (default: current directory)')
  .option('-o, --output <file>', 'Output file path (default: skill.zip in source directory)')
  .option('--dry-run', 'Validate only, do not create zip')
  .action(async (pathArg, options) => {
    const cwd = process.cwd();
    const dirPath = pathArg ? path.resolve(cwd, pathArg) : cwd;

    if (!(await fs.pathExists(dirPath))) {
      printSimpleError('Directory not found', dirPath);
    }

    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      printSimpleError('Not a directory', dirPath);
    }

    const skillMdPath = path.join(dirPath, 'SKILL.md');
    if (!(await fs.pathExists(skillMdPath))) {
      printSimpleError('SKILL.md not found', 'Create SKILL.md in the directory first');
    }

    if (options.dryRun) {
      const { getConfigFromDir } = await import('../lib/packSkill.js');
      const { name, version } = await getConfigFromDir(dirPath).catch(() => ({ name: 'skill', version: '1.0.0' }));
      const toSafe = (s) => String(s || 'skill').toLowerCase().replace(/[^a-z0-9.-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'skill';
      const defaultOutput = path.join(dirPath, `${toSafe(name)}-${String(version || '1.0.0').replace(/[^a-zA-Z0-9.-]/g, '-')}.zip`);
      console.log('[DRY RUN] Would pack:', dirPath);
      console.log('[DRY RUN] Output:', options.output || defaultOutput);
      return;
    }

    try {
      const outputPath = await packDirectory(dirPath, { output: options.output });
      console.log('Packed successfully!');
      console.log(`Output: ${outputPath}`);
      console.log('\nUse "skm push" or "skm push -f <path>" to upload.');
    } catch (err) {
      if (err.message === 'NO_SKILL_MD') {
        printSimpleError('SKILL.md not found', 'Create SKILL.md in the directory first');
      } else if (err.message === 'FILE_NOT_FOUND') {
        printSimpleError('Directory not found', dirPath);
      } else {
        printSimpleError(err.message || 'Pack failed');
      }
    }
  });

export { packCommand };
