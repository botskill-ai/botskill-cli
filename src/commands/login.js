import { Command } from 'commander';
import inquirer from 'inquirer';
import axios from 'axios';
import { getApiUrl, setAuth, normalizeApiUrl } from '../lib/auth.js';
import { printApiError } from '../lib/formatError.js';

const loginCommand = new Command('login');
loginCommand
  .description('Login to BotSkill platform')
  .option('-u, --username <username>', 'Username')
  .option('-e, --email <email>', 'Email address')
  .option('-p, --password <password>', 'Password')
  .option('-t, --token <token>', 'Use access token directly (from web)')
  .option('--api-url <url>', 'API base URL (overrides config for this command)')
  .action(async (options, command) => {
    const apiUrl = normalizeApiUrl(command.optsWithGlobals().apiUrl || getApiUrl());

    if (options.token) {
      setAuth({ token: options.token });
      console.log('Token saved. Logged in successfully.');
      return;
    }

    let emailOrUsername = options.email || options.username;
    let password = options.password;

    if (!emailOrUsername || !password) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'emailOrUsername',
          message: 'Email or Username:',
          default: emailOrUsername,
          validate: (v) => (v?.trim() ? true : 'Required'),
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          mask: '*',
          validate: (v) => (v ? true : 'Required'),
        },
      ]);
      emailOrUsername = answers.emailOrUsername?.trim();
      password = answers.password;
    }

    console.log('Logging in to BotSkill...');
    try {
      const res = await axios.post(`${apiUrl}/auth/login`, {
        email: emailOrUsername,
        password,
      });
      const data = res.data?.data || res.data;
      const accessToken = data.accessToken || data.token;
      const refreshToken = data.refreshToken;
      const user = data.user;

      if (!accessToken) {
        console.error('Login failed: No token received');
        process.exit(1);
      }

      setAuth({ token: accessToken, refreshToken, user });
      console.log(`Logged in as ${user?.username || user?.email || 'user'}`);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      if (msg) err._overrideMsg = msg;
      printApiError(err, { prefix: 'Login failed' });
    }
  });

export { loginCommand };
