# BotSkill CLI (skm)

The official command-line interface for BotSkill, a platform for managing and sharing AI agent skills.

## Installation

```bash
npm install -g @botskill/cli
```

Or use without installing:

```bash
npx @botskill/cli [command]
```

## Commands

### init
Initialize a new skill project (creates skill.config.json):
```bash
skm init --name my-skill --description "A new AI skill"
skm init -y   # Use defaults without prompting
```

### login
Login to BotSkill platform:
```bash
skm login --token YOUR_TOKEN
```

### config
Manage CLI configuration:
```bash
# List all configurations
skm config --list

# Get specific configuration
skm config --get apiUrl

# Set configuration
skm config --set apiUrl=https://api.botskill.ai
```

### get
Download a skill from BotSkill and extract to directory (default: current directory). Use `name@version` for a specific version, or `name` for latest. API URL from config (optional):
```bash
skm get pdf-processing
skm get pdf-processing@1.0.0
skm get pdf-processing -o ./my-skills
skm get pdf-processing --dry-run
```

### push / publish
Upload/push or publish a skill to BotSkill (requires login, publisher or admin role):
```bash
# From a directory with skill.config.json
skm push

# Or use publish (alias)
skm publish

# With options
skm push --name my-skill --description "My AI skill" --category ai
skm push --dry-run   # Validate without uploading
```

### list
List skills from BotSkill (fetches from API):
```bash
skm list
skm list --category ai --limit 10
skm list --search translator
skm list --mine   # Your skills (requires login)
```

### search
Search skills by name or description:
```bash
skm search pdf
skm search translator --category ai
skm search "data analysis" --limit 10
```

### info
Show skill details (without downloading):
```bash
skm info pdf-processing
skm info pdf-processing@1.0.0
```

## Configuration

安装后会在用户主目录下自动创建 `~/.skm/` 目录及默认配置：
- **macOS / Linux**: `~/.skm/config.json`
- **Windows**: `%USERPROFILE%\.skm\config.json`

使用 `skm config` 管理配置，`skm config --path` 查看配置文件路径。

### 默认配置
- `apiUrl`: API 地址，优先级：环境变量 `BOTSKILL_API_URL` > 配置文件 > 构建时默认值
- `token` / `refreshToken`: 登录后自动保存

### 环境变量
- **BOTSKILL_API_URL**：运行时覆盖 API 地址（不修改配置文件）

### 发布时指定默认 API 和作者
```bash
# 开发/本地默认 localhost
npm run build

# 生产环境
BOTSKILL_API_URL=https://api.botskill.ai npm run build
BOTSKILL_API_URL=https://api.botskill.ai npm publish
```

## Usage Examples

### Creating a new skill
```bash
# Initialize a new skill project
skm init --name my-translator --description "AI translation skill"

# Edit skill.config.json (add tags, URLs, etc.)
# Login to BotSkill
skm login

# Push or publish to BotSkill
skm push
# or
skm publish
```

### Using an existing skill
```bash
# Search for skills
skm list --search translator --category ai

# Download a skill (latest version)
skm get pdf-processing
skm get pdf-processing@1.0.0 -o ./skills
```

## Development

To run the CLI locally during development:

```bash
cd skm-cli
npm install
node src/index.js [command]
```

## Contributing

See our contributing guide for more information on how to contribute to the BotSkill CLI.

## License

MIT