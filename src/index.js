#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initCommand } from './commands/init.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { configCommand } from './commands/config.js';
import { getCommand } from './commands/get.js';
import { packCommand } from './commands/pack.js';
import { pushCommand } from './commands/push.js';
import { publishCommand } from './commands/publish.js';
import { listCommand } from './commands/list.js';
import { searchCommand } from './commands/search.js';
import { infoCommand } from './commands/info.js';
import { versionsCommand } from './commands/versions.js';
import { updateCommand } from './commands/update.js';
import { upgradeCommand } from './commands/upgrade.js';
import { helpCommand } from './commands/help.js';

// 读取 package.json 中的版本号
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version || '0.0.0';

const program = new Command();

program
  .name('skm')
  .description('CLI tool for managing BotSkill - a platform for AI agent skills')
  .version(version)
  .option('--api-url <url>', 'API base URL (overrides config for this command)');

program.addCommand(initCommand);
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(configCommand);
program.addCommand(getCommand);
program.addCommand(packCommand);
program.addCommand(pushCommand);
program.addCommand(publishCommand);
program.addCommand(listCommand);
program.addCommand(searchCommand);
program.addCommand(infoCommand);
program.addCommand(versionsCommand);
program.addCommand(updateCommand);
program.addCommand(upgradeCommand);
program.addCommand(helpCommand);

program.parse();