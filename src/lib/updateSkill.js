import path from 'path';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';
import { createApiClient } from './auth.js';

/**
 * Compare semver versions: returns 1 if a > b, -1 if a < b, 0 if equal
 */
export function compareVersions(a, b) {
  if (!a || !b) return 0;
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

/**
 * Get latest version from API for a skill (by semver)
 */
export async function getLatestVersion(api, name) {
  const res = await api.get(`/skills/by-name/${encodeURIComponent(name)}`);
  const skill = res.data?.skill ?? res.data;
  if (!skill?._id) return null;
  const versions = skill.versions || [];
  if (versions.length === 0) return skill.version || null;
  let latest = versions[0].version;
  for (const v of versions) {
    if (compareVersions(v.version, latest) > 0) latest = v.version;
  }
  return latest;
}

/**
 * Download skill to directory (replaces existing)
 */
export async function downloadSkillToDir(api, name, version, outputDir) {
  const fullSpec = version ? `${name}@${version}` : name;
  const resolveRes = await api.get(`/skills/by-name/${encodeURIComponent(fullSpec)}`);
  const skill = resolveRes.data?.skill ?? resolveRes.data;
  if (!skill?._id) throw new Error('Skill not found');

  const versionParam = version ? `?version=${encodeURIComponent(version)}` : '';
  const url = `/skills/${encodeURIComponent(skill._id)}/download${versionParam}`;
  const res = await api.get(url, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(res.data);

  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const rootDir = entries.find((e) => e.isDirectory)?.entryName?.replace(/\/$/, '') || (entries[0]?.entryName?.includes('/') ? entries[0].entryName.split('/')[0] : null);
  const hasParentDir = rootDir != null;
  const skillDirName = String(skill.name || 'skill').replace(/^@[^/]+\//, '').trim() || 'skill';
  const targetPath = path.join(outputDir, skillDirName);

  await fs.remove(targetPath).catch(() => {});

  if (hasParentDir) {
    zip.extractAllTo(outputDir, true);
    const extractedPath = path.join(outputDir, rootDir);
    if (rootDir !== skillDirName) {
      await fs.move(extractedPath, targetPath, { overwrite: true });
    }
  } else {
    await fs.ensureDir(targetPath);
    zip.extractAllTo(targetPath, true);
  }

  return targetPath;
}

/**
 * Find installed skills in a directory (subdirs with skill.config.json or SKILL.md)
 */
export async function findInstalledSkills(skillsDir) {
  if (!(await fs.pathExists(skillsDir))) return [];
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  const skills = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dirPath = path.join(skillsDir, e.name);
    const configPath = path.join(dirPath, 'skill.config.json');
    const skillMdPath = path.join(dirPath, 'SKILL.md');
    let name, version;
    if (await fs.pathExists(configPath)) {
      try {
        const config = await fs.readJson(configPath);
        name = config.name || e.name;
        version = config.version || '0.0.0';
      } catch (_) {
        continue;
      }
    } else if (await fs.pathExists(skillMdPath)) {
      try {
        const content = await fs.readFile(skillMdPath, 'utf-8');
        const match = content.match(/^name:\s*(.+)$/m);
        const verMatch = content.match(/version:\s*["']?([\d.]+)/m);
        name = match ? match[1].trim() : e.name;
        version = verMatch ? verMatch[1] : '0.0.0';
      } catch (_) {
        continue;
      }
    } else {
      continue;
    }
    skills.push({ name, version, dirPath, dirName: e.name });
  }
  return skills;
}
