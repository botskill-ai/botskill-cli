import { Command } from 'commander';
import { createApiClient, isLoggedIn } from '../lib/auth.js';
import { printApiError } from '../lib/formatError.js';

function formatSkillDisplay(skill) {
  const name = skill.name || '?';
  const version = skill.version || (skill.versions?.[0]?.version) || '—';
  const downloads = skill.downloads ?? 0;
  const category = skill.category || '—';
  const status = skill.status || '—';
  const desc = (skill.description || '').trim();
  const description = desc.length > 80 ? desc.slice(0, 77) + '...' : desc || '—';
  return { name, version, downloads, category, status, description };
}

const listCommand = new Command('list');
listCommand
  .alias('ls')
  .description('List skills from BotSkill')
  .option('-c, --category <category>', 'Filter by category (ai, data, web, devops, security, tools)')
  .option('-s, --search <query>', 'Search skills by name or description')
  .option('-m, --mine', 'Show only your skills (requires login)')
  .option('-l, --limit <number>', 'Maximum number of results (default: 20)', '20')
  .option('-p, --page <number>', 'Page number for pagination (default: 1)', '1')
  .option('--api-url <url>', 'API base URL (overrides config for this command)')
  .action(async (options, command) => {
    const apiUrl = command.optsWithGlobals().apiUrl;
    const api = createApiClient(apiUrl);
    const limit = parseInt(options.limit, 10) || 20;
    const page = parseInt(options.page, 10) || 1;

    try {
      let res;
      if (options.mine) {
        if (!isLoggedIn()) {
          console.error('Error: --mine requires login. Run "skm login" first.');
          process.exit(1);
        }
        const params = { page, limit };
        if (options.category) params.category = options.category;
        if (options.search) params.q = options.search;
        res = await api.get('/skills/my', { params });
      } else {
        const params = { page, limit };
        if (options.category) params.category = options.category;
        if (options.search) params.q = options.search;
        if (params.q || params.category) {
          res = await api.get('/skills/search', { params });
        } else {
          res = await api.get('/skills', { params });
        }
      }

      const skills = res.data?.skills ?? res.data ?? [];
      const pagination = res.data?.pagination ?? {};

      if (skills.length === 0) {
        console.log('No skills found.');
        return;
      }

      console.log(`\nFound ${pagination.totalSkills ?? skills.length} skill(s):`);
      console.log('─'.repeat(60));
      skills.forEach((skill) => {
        const { name, version, downloads, category, status, description } = formatSkillDisplay(skill);
        const statusStr = options.mine ? ` | ${status}` : '';
        console.log(`  ${name}`);
        console.log(`    ${description}`);
        console.log(`    Version: ${version} | Downloads: ${downloads} | Category: ${category}${statusStr}`);
      });
      if (pagination.totalPages > 1) {
        console.log(`\nPage ${pagination.currentPage}/${pagination.totalPages}`);
      }
      console.log('\nUse "skm get name" or "skm get name@version" to download.');
    } catch (err) {
      if (err.response?.status === 401 && options.mine) {
        err._overrideMsg = 'Login required. Run "skm login" first.';
      }
      printApiError(err, { prefix: 'List failed' });
    }
  });

export { listCommand };
