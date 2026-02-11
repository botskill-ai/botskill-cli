import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';

const DEFAULT_EXCLUDE = [
  'node_modules',
  '.git',
  '.DS_Store',
  'skill.zip',
  'skill.tar.gz',
  'dist.zip',
];

/**
 * Create filter that excludes common unwanted paths
 */
function createExcludeFilter(exclude = DEFAULT_EXCLUDE) {
  const patterns = exclude.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(^|/)(${patterns.join('|')})(/|$)`, 'i');
  return (zipPath) => !re.test(zipPath.replace(/\\/g, '/'));
}

/**
 * Get name and version from skill.config.json in directory
 */
export async function getConfigFromDir(dirPath) {
  const configPath = path.join(dirPath, 'skill.config.json');
  const defaultValue = { name: 'skill', version: '1.0.0' };
  if (!(await fs.pathExists(configPath))) return defaultValue;
  try {
    const config = await fs.readJson(configPath);
    return {
      name: config.name || 'skill',
      version: config.version || '1.0.0',
    };
  } catch {
    return defaultValue;
  }
}

function toSafeId(str) {
  return String(str || 'skill')
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'skill';
}

/**
 * Pack a directory into skill.zip format for upload
 * @param {string} dirPath - Directory to pack (must contain SKILL.md)
 * @param {Object} [opts]
 * @param {string} [opts.output] - Output file path (default: skill.zip in dirPath)
 * @param {string} [opts.version] - Version for filename when using tempDir
 * @param {boolean} [opts.useTempDir] - If true, output to temp dir with skill-{version}.zip
 * @param {string[]} [opts.exclude] - Additional paths to exclude
 * @returns {Promise<string>} Path to created zip file
 */
export async function packDirectory(dirPath, opts = {}) {
  const resolved = path.resolve(dirPath);
  if (!(await fs.pathExists(resolved))) {
    throw new Error('FILE_NOT_FOUND');
  }
  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) {
    throw new Error('NOT_DIRECTORY');
  }

  const skillMdPath = path.join(resolved, 'SKILL.md');
  if (!(await fs.pathExists(skillMdPath))) {
    throw new Error('NO_SKILL_MD');
  }

  const { name, version } = await getConfigFromDir(resolved);
  const safeName = toSafeId(opts.name ?? name);
  const safeVersion = String(opts.version ?? version).replace(/[^a-zA-Z0-9.-]/g, '-');
  const defaultFilename = `${safeName}-${safeVersion}.zip`;

  let outputPath;
  if (opts.output) {
    outputPath = path.resolve(opts.output);
  } else if (opts.useTempDir) {
    const tmpDir = path.join(os.tmpdir(), `skm-pack-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(tmpDir);
    outputPath = path.join(tmpDir, defaultFilename);
  } else {
    outputPath = path.join(resolved, defaultFilename);
  }
  const excludeFilter = createExcludeFilter(opts.exclude);

  const zip = new AdmZip();
  zip.addLocalFolder(resolved, '', (p) => excludeFilter(p.replace(/\\/g, '/')));
  zip.writeZip(outputPath);

  return outputPath;
}
