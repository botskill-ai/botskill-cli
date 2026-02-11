import { Command } from 'commander';
import { createApiClient } from '../lib/auth.js';
import { printApiError } from '../lib/formatError.js';

function formatSkillDisplay(skill) {
  const author = skill.author?.username || skill.author?.fullName || '?';
  const name = skill.name || '?';
  const displayName = `@${author}/${name}`;
  const version = skill.version || (skill.versions?.[0]?.version) || '—';
  const downloads = skill.downloads ?? 0;
  const category = skill.category || '—';
  const desc = (skill.description || '').trim();
  const description = desc.length > 80 ? desc.slice(0, 77) + '...' : desc || '—';
  return { displayName, version, downloads, category, description };
}

const searchCommand = new Command('search');
searchCommand
  .description('Search skills from BotSkill')
  .argument('<query>', 'Search query (name or description)')
  .option('-c, --category <category>', 'Filter by category (ai, data, web, devops, security, tools)')
  .option('-l, --limit <number>', 'Maximum number of results (default: 20)', '20')
  .option('-p, --page <number>', 'Page number for pagination (default: 1)', '1')
  .option('--api-url <url>', 'API base URL (overrides config for this command)')
  .action(async (query, options, command) => {
    const apiUrl = command.optsWithGlobals().apiUrl;
    const api = createApiClient(apiUrl);
    const limit = parseInt(options.limit, 10) || 20;
    const page = parseInt(options.page, 10) || 1;

    try {
      const params = { q: query, page, limit };
      if (options.category) params.category = options.category;

      const res = await api.get('/skills/search', { params });
      const skills = res.data?.skills ?? res.data ?? [];
      const pagination = res.data?.pagination ?? {};

      if (skills.length === 0) {
        console.log(`No skills found for "${query}".`);
        return;
      }

      console.log(`\nFound ${pagination.totalSkills ?? skills.length} skill(s) for "${query}":`);
      console.log('─'.repeat(60));
      skills.forEach((skill) => {
        const { displayName, version, downloads, category, description } = formatSkillDisplay(skill);
        console.log(`  ${displayName}`);
        console.log(`    ${description}`);
        console.log(`    Version: ${version} | Downloads: ${downloads} | Category: ${category}`);
      });
      if (pagination.totalPages > 1) {
        console.log(`\nPage ${pagination.currentPage}/${pagination.totalPages}`);
      }
      console.log('\nUse "skm get @author/name" or "skm get @author/name@version" to download.');
    } catch (err) {
      printApiError(err, { prefix: 'Search failed' });
    }
  });

export { searchCommand };
