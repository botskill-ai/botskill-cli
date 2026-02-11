import { Command } from 'commander';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { createApiClient } from '../lib/auth.js';
import { printApiError, printSimpleError } from '../lib/formatError.js';
import { compareVersions, getLatestVersion, downloadSkillToDir, findInstalledSkills } from '../lib/updateSkill.js';
import { DEFAULT_SKILLS_DIR } from '../lib/constants.js';

function resolveSkillsDir(dir) {
  const p = dir || DEFAULT_SKILLS_DIR;
  return p.replace(/^~/, os.homedir());
}

const upgradeCommand = new Command('upgrade');
upgradeCommand
  .description('Upgrade all skills in the skills directory to latest version')
  .option('-d, --dir <path>', `Skills directory (default: ${DEFAULT_SKILLS_DIR})`)
  .option('--dry-run', 'Show what would be upgraded without downloading')
  .option('--api-url <url>', 'API base URL (overrides config for this command)')
  .action(async (options, command) => {
    const apiUrl = command.optsWithGlobals().apiUrl;
    const api = createApiClient(apiUrl);
    const skillsDir = path.resolve(resolveSkillsDir(options.dir));

    if (!(await fs.pathExists(skillsDir))) {
      printSimpleError('Skills directory not found', skillsDir);
    }

    const skills = await findInstalledSkills(skillsDir);
    if (skills.length === 0) {
      console.log('No skills found in', skillsDir);
      return;
    }

    if (options.dryRun) {
      console.log(`[DRY RUN] Would check ${skills.length} skill(s) in ${skillsDir}`);
      for (const s of skills) {
        try {
          const latest = await getLatestVersion(api, s.name);
          const needUpgrade = latest && compareVersions(latest, s.version) > 0;
          console.log(`  ${s.name}: ${s.version}${needUpgrade ? ` → ${latest}` : ' (latest)'}`);
        } catch (_) {
          console.log(`  ${s.name}: ${s.version} (check failed)`);
        }
      }
      return;
    }

    let updated = 0;
    for (const skill of skills) {
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
        await downloadSkillToDir(api, skill.name, latest, skillsDir);
        console.log(`${skill.name}: ${skill.version} → ${latest}`);
        updated++;
      } catch (err) {
        if (err.response?.data?.error) err._overrideMsg = err.response.data.error;
        printApiError(err, { prefix: `Upgrade ${skill.name} failed` });
      }
    }
    if (updated > 0) {
      console.log(`\nUpgraded ${updated} skill(s).`);
    }
  });

export { upgradeCommand };
