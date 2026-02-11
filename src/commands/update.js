import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { createApiClient } from '../lib/auth.js';
import { printApiError, printSimpleError } from '../lib/formatError.js';
import { compareVersions, getLatestVersion, downloadSkillToDir } from '../lib/updateSkill.js';

const updateCommand = new Command('update');
updateCommand
  .description('Update skill(s) to latest version')
  .argument('[name]', 'Skill name to update (omit to update all in current/specified dir)')
  .option('-d, --dir <path>', 'Directory containing skill(s) to update (default: current directory)')
  .option('--dry-run', 'Show what would be updated without downloading')
  .option('--api-url <url>', 'API base URL (overrides config for this command)')
  .action(async (nameArg, options, command) => {
    const apiUrl = command.optsWithGlobals().apiUrl;
    const api = createApiClient(apiUrl);
    const baseDir = path.resolve(options.dir || process.cwd());

    if (!(await fs.pathExists(baseDir))) {
      printSimpleError('Directory not found', baseDir);
    }

    let skillsToUpdate = [];
    if (nameArg) {
      const configPath = path.join(baseDir, nameArg, 'skill.config.json');
      const skillMdPath = path.join(baseDir, nameArg, 'SKILL.md');
      const dirPath = path.join(baseDir, nameArg);
      if (!(await fs.pathExists(dirPath))) {
        printSimpleError('Skill not found', `No directory: ${dirPath}`);
      }
      let name = nameArg;
      let version = '0.0.0';
      if (await fs.pathExists(configPath)) {
        try {
          const config = await fs.readJson(configPath);
          name = config.name || nameArg;
          version = config.version || '0.0.0';
        } catch (_) {}
      } else if (await fs.pathExists(skillMdPath)) {
        try {
          const content = await fs.readFile(skillMdPath, 'utf-8');
          const match = content.match(/^name:\s*(.+)$/m);
          const verMatch = content.match(/version:\s*["']?([\d.]+)/m);
          name = match ? match[1].trim() : nameArg;
          version = verMatch ? verMatch[1] : '0.0.0';
        } catch (_) {}
      }
      skillsToUpdate = [{ name, version, dirPath, dirName: nameArg }];
    } else {
      let skillsToUpdateList = await findInstalledSkills(baseDir);
      if (skillsToUpdateList.length === 0) {
        const configPath = path.join(baseDir, 'skill.config.json');
        const skillMdPath = path.join(baseDir, 'SKILL.md');
        if (await fs.pathExists(configPath) || await fs.pathExists(skillMdPath)) {
          let name = path.basename(baseDir);
          let version = '0.0.0';
          if (await fs.pathExists(configPath)) {
            try {
              const config = await fs.readJson(configPath);
              name = config.name || name;
              version = config.version || '0.0.0';
            } catch (_) {}
          } else if (await fs.pathExists(skillMdPath)) {
            try {
              const content = await fs.readFile(skillMdPath, 'utf-8');
              const match = content.match(/^name:\s*(.+)$/m);
              const verMatch = content.match(/version:\s*["']?([\d.]+)/m);
              name = match ? match[1].trim() : name;
              version = verMatch ? verMatch[1] : '0.0.0';
            } catch (_) {}
          }
          skillsToUpdateList = [{ name, version, dirPath: baseDir, dirName: path.basename(baseDir) }];
        }
      }
      skillsToUpdate = skillsToUpdateList;
      if (skillsToUpdate.length === 0) {
        console.log('No skills found. Run from a skills directory or use -d <path>.');
        return;
      }
    }

    if (options.dryRun) {
      console.log('[DRY RUN] Would check and update:');
      skillsToUpdate.forEach((s) => console.log(`  - ${s.name} (${s.version})`));
      return;
    }

    let updated = 0;
    for (const skill of skillsToUpdate) {
      try {
        const latest = await getLatestVersion(api, skill.name);
        if (!latest) {
          console.log(`Skip ${skill.name}: not found`);
          continue;
        }
        if (compareVersions(latest, skill.version) <= 0) {
          console.log(`${skill.name}: already at ${skill.version}`);
          continue;
        }
        const parentDir = path.dirname(skill.dirPath);
        await downloadSkillToDir(api, skill.name, latest, parentDir);
        console.log(`${skill.name}: ${skill.version} → ${latest}`);
        updated++;
      } catch (err) {
        if (err.response?.data?.error) err._overrideMsg = err.response.data.error;
        printApiError(err, { prefix: `Update ${skill.name} failed` });
      }
    }
    if (updated > 0) {
      console.log(`\nUpdated ${updated} skill(s).`);
    }
  });

export { updateCommand };
