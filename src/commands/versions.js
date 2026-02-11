import { Command } from 'commander';
import { createApiClient } from '../lib/auth.js';
import { printApiError } from '../lib/formatError.js';

function parseSpecifier(spec) {
  const s = spec.trim();
  const atIdx = s.lastIndexOf('@');
  if (atIdx < 0) return { name: s, version: undefined };
  return {
    name: s.slice(0, atIdx).trim(),
    version: s.slice(atIdx + 1).trim() || undefined,
  };
}

const versionsCommand = new Command('versions');
versionsCommand
  .description('List all versions of a skill')
  .argument('<name>', 'Skill name (e.g. learn-skills)')
  .option('--api-url <url>', 'API base URL (overrides config for this command)')
  .action(async (nameArg, options, command) => {
    const apiUrl = command.optsWithGlobals().apiUrl;
    const name = nameArg?.startsWith('@') ? nameArg.trim() : parseSpecifier(nameArg).name;

    if (!name) {
      console.error('Error: skill name is required');
      process.exit(1);
    }

    try {
      const api = createApiClient(apiUrl);
      const resolveRes = await api.get(`/skills/by-name/${encodeURIComponent(name)}`);
      const skill = resolveRes.data?.skill ?? resolveRes.data;
      if (!skill?._id) {
        console.error('Skill not found');
        process.exit(1);
      }

      const versions = skill.versions || [];
      const versionList = versions.length > 0 ? versions : (skill.version ? [{ version: skill.version }] : []);

      if (versionList.length === 0) {
        console.log(`No versions found for ${skill.name}`);
        return;
      }

      console.log(`\n${skill.name} - ${versionList.length} version(s):`);
      console.log('─'.repeat(40));
      versionList.forEach((v) => {
        const date = v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '';
        console.log(`  ${v.version}${date ? `  (${date})` : ''}`);
      });
      console.log('\nUse "skm get ' + skill.name + '@<version>" to download.');
    } catch (err) {
      printApiError(err, { prefix: 'Versions failed' });
    }
  });

export { versionsCommand };
