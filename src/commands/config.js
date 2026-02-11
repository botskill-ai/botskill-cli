import { Command } from 'commander';
import { getApiUrl, setApiUrl, getToken, getUser, clearAuth, getConfigPath } from '../lib/auth.js';
import { getDefaultApiUrl } from '../lib/constants.js';

const configCommand = new Command('config');
configCommand
  .description('Manage CLI configuration')
  .option('-g, --get <key>', 'Get configuration value')
  .option('-s, --set <key=value>', 'Set configuration value')
  .option('-l, --list', 'List all configurations')
  .option('-p, --path', 'Show config file path')
  .option('--reset', 'Reset configuration to defaults')
  .action(async (options) => {
    if (options.path) {
      console.log(getConfigPath());
      return;
    }
    if (options.list) {
      const apiUrl = getApiUrl();
      const token = getToken();
      const user = getUser();
      console.log('Current configuration:');
      console.log(`  config: ${getConfigPath()}`);
      console.log(`  apiUrl: ${apiUrl}`);
      console.log(`  token: ${token ? '***' : '(not set)'}`);
      if (user) {
        console.log(`  user: ${user.username || user.email || user.id}`);
      }
    } else if (options.get) {
      const key = options.get;
      if (key === 'apiUrl') {
        console.log(getApiUrl());
      } else if (key === 'token') {
        console.log(getToken() ? '***' : '(not set)');
      } else {
        console.error(`Unknown key: ${key}`);
        process.exit(1);
      }
    } else if (options.set) {
      const [key, value] = options.set.split('=');
      if (!key || value === undefined) {
        console.error('Use --set key=value');
        process.exit(1);
      }
      if (key === 'apiUrl') {
        setApiUrl(value.trim());
        console.log(`apiUrl set to ${value}`);
      } else {
        console.error(`Unknown key: ${key}`);
        process.exit(1);
      }
    } else if (options.reset) {
      clearAuth();
      setApiUrl(getDefaultApiUrl());
      console.log('Configuration reset to defaults.');
    } else {
      console.log('Usage:');
      console.log('  skm config --list          List configuration');
      console.log('  skm config --get apiUrl    Get apiUrl');
      console.log('  skm config --set apiUrl=URL  Set apiUrl');
      console.log('  skm config --reset         Reset to defaults');
    }
  });

export { configCommand };