import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';

function toSkillName(raw) {
  const s = String(raw || 'my-skill').trim();
  return s.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'my-skill';
}

const initCommand = new Command('init');
initCommand
  .description('Initialize a new skill project')
  .argument('[path]', 'Target directory: "." or path for current/specified dir; omit to create skill-named directory')
  .option('-n, --name <name>', 'Project/skill name')
  .option('-d, --description <description>', 'Skill description')
  .option('-c, --category <category>', 'Category: ai, data, web, devops, security, tools')
  .option('-y, --yes', 'Use defaults without prompting')
  .action(async (pathArg, options) => {
    const cwd = process.cwd();
    const validCategories = ['ai', 'data', 'web', 'devops', 'security', 'tools'];
    let answers = {};

    if (options.yes) {
      answers = {
        name: options.name || 'my-skill',
        description: options.description || 'A new AI skill',
        category: options.category || 'tools',
        version: '1.0.0',
        license: 'MIT',
      };
    } else {
      answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Skill name:',
          default: options.name || 'my-skill',
          validate: (v) => (v && v.length >= 2 ? true : 'Name must be at least 2 characters'),
        },
        {
          type: 'input',
          name: 'description',
          message: 'Description:',
          default: options.description || 'A new AI skill',
          validate: (v) => (v ? true : 'Description is required'),
        },
        {
          type: 'list',
          name: 'category',
          message: 'Category:',
          choices: validCategories,
          default: options.category && validCategories.includes(options.category) ? options.category : 'tools',
        },
        {
          type: 'input',
          name: 'version',
          message: 'Version:',
          default: '1.0.0',
        },
        {
          type: 'input',
          name: 'license',
          message: 'License:',
          default: 'MIT',
        },
      ]);
    }

    const skillName = toSkillName(answers.name);
    let targetDir;

    if (pathArg && pathArg !== '.') {
      targetDir = path.resolve(cwd, pathArg);
      await fs.ensureDir(targetDir);
    } else if (pathArg === '.') {
      targetDir = cwd;
    } else {
      targetDir = path.join(cwd, skillName);
      await fs.ensureDir(targetDir);
    }

    const configPath = path.join(targetDir, 'skill.config.json');
    if (await fs.pathExists(configPath)) {
      console.error(`skill.config.json already exists in ${targetDir}`);
      process.exit(1);
    }

    const config = {
      name: answers.name,
      description: answers.description,
      version: answers.version,
      category: answers.category,
      license: answers.license,
      tags: [],
      repositoryUrl: '',
      documentationUrl: '',
      demoUrl: '',
    };

    await fs.writeJson(configPath, config, { spaces: 2 });

    const skillMd = `---
name: ${skillName}
description: ${answers.description}
license: ${answers.license}
metadata:
  author: ${skillName}
  version: "${answers.version}"
# Platform-specific (optional)
category: ${answers.category}
tags: []
---

# ${answers.name}

${answers.description}

## Usage

Add your usage documentation here. The Markdown body contains skill instructions for agents.

## Installation

\`\`\`bash
# Add installation instructions
\`\`\`
`;

    const skillMdPath = path.join(targetDir, 'SKILL.md');
    await fs.writeFile(skillMdPath, skillMd, 'utf-8');

    console.log('Created skill.config.json and SKILL.md');
    if (targetDir !== cwd) {
      console.log(`Location: ${targetDir}`);
    }
    console.log('\nNext steps:');
    console.log('1. Edit SKILL.md to add documentation (the content below the frontmatter)');
    console.log('2. Run "skm login" to authenticate');
    console.log('3. Run "skm push" or "skm publish" to upload your skill');
  });

export { initCommand };
