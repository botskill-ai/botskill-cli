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

const infoCommand = new Command('info');
infoCommand
  .description('Show skill details from BotSkill')
  .argument('<specifier>', 'Skill name or name@version')
  .option('--api-url <url>', 'API base URL (overrides config for this command)')
  .action(async (specifier, options, command) => {
    const { name, version } = parseSpecifier(specifier);

    if (!name) {
      console.error('Error: skill name is required');
      process.exit(1);
    }

    const apiUrl = command.optsWithGlobals().apiUrl;
    try {
      const api = createApiClient(apiUrl);
      const fullSpec = version ? `${name}@${version}` : name;

      const resolveRes = await api.get(`/skills/by-name/${encodeURIComponent(fullSpec)}`);
      const skill = resolveRes.data?.skill ?? resolveRes.data;
      if (!skill?._id) {
        console.error('Skill not found');
        process.exit(1);
      }

      console.log('\n' + '─'.repeat(50));
      console.log(`  ${skill.name}`);
      console.log('─'.repeat(50));
      console.log(`  Description: ${skill.description || '—'}`);
      const author = skill.author?.username || skill.author?.fullName || '—';
      console.log(`  Author:      ${author}`);
      console.log(`  Category:    ${skill.category || '—'}`);
      console.log(`  Downloads:   ${(skill.downloads ?? 0).toLocaleString()}`);
      console.log(`  License:     ${skill.license || 'MIT'}`);
      if (skill.tags?.length) {
        console.log(`  Tags:        ${skill.tags.join(', ')}`);
      }
      if (skill.repositoryUrl) {
        console.log(`  Repository:  ${skill.repositoryUrl}`);
      }
      if (skill.documentationUrl) {
        console.log(`  Docs:        ${skill.documentationUrl}`);
      }

      const versions = skill.versions || [];
      const versionList = versions.length > 0 ? versions : (skill.version ? [{ version: skill.version, description: skill.description }] : []);
      if (versionList.length > 0) {
        console.log('\n  Versions:');
        versionList.forEach((v) => {
          const date = v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '';
          console.log(`    - ${v.version}${date ? ` (${date})` : ''}`);
        });
      }

      console.log('\n  Use "skm get name" or "skm get name@version" to download.');
      console.log('');
    } catch (err) {
      printApiError(err, { prefix: 'Info failed' });
    }
  });

export { infoCommand };
