import { Command } from 'commander';
import { clearAuth, getApiUrl, getRefreshToken, normalizeApiUrl } from '../lib/auth.js';
import axios from 'axios';

const logoutCommand = new Command('logout');
logoutCommand
  .description('Logout from BotSkill')
  .option('--api-url <url>', 'API base URL (overrides config for this command)')
  .action(async (options, command) => {
    const apiUrl = normalizeApiUrl(command.optsWithGlobals().apiUrl || getApiUrl());
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await axios.post(`${apiUrl}/auth/logout`, { refreshToken });
      } catch (_) {}
    }
    clearAuth();
    console.log('Logged out successfully.');
  });

export { logoutCommand };
