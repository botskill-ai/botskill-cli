import { Command } from 'commander';

const helpCommand = new Command('help');
helpCommand
  .description('Show help for a command')
  .argument('[command]', 'Command to show help for')
  .action((cmdName, opts, command) => {
    const program = command.parent;
    if (cmdName) {
      const sub = program.commands.find(
        (c) => c.name() === cmdName || (c.aliases && c.aliases().includes(cmdName))
      );
      if (sub) {
        sub.outputHelp();
      } else {
        console.error(`Unknown command: ${cmdName}`);
        console.error(`Run "skm help" to see available commands.`);
        process.exit(1);
      }
    } else {
      program.outputHelp();
    }
  });

export { helpCommand };