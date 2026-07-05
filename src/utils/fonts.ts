import axios from 'axios';
import path from 'path';
import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import type { Context } from 'koishi';
import type { Config } from '../config';

// ===== 🔤 字体工具：默认配置与下载地址 =====

export const PLUGIN_NAME = 'youtube-vincentzyu-fork';
export const DEFAULT_FONT_FILE_NAME = 'LXGWWenKaiMono-Regular.ttf';
const GITEE_RELEASE_BASE = 'https://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/download/fonts';
const GITHUB_RELEASE_BASE = 'https://github.com/VincentZyuApps/koishi-plugin-awa-quote-image/releases/download/fonts';
export const DEFAULT_FONT_DOWNLOAD_URL = `${GITEE_RELEASE_BASE}/${DEFAULT_FONT_FILE_NAME}`;
const LEGACY_DEFAULT_FONT_DOWNLOAD_URL = `http://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/download/fonts/${DEFAULT_FONT_FILE_NAME}`;

interface FontDownloadSource {
  source: string;
  url: string;
}

const DEFAULT_FONT_DOWNLOAD_SOURCES: FontDownloadSource[] = [
  { source: 'Gitee', url: DEFAULT_FONT_DOWNLOAD_URL },
  { source: 'GitHub', url: `${GITHUB_RELEASE_BASE}/${DEFAULT_FONT_FILE_NAME}` },
];

interface FontIntegrity {
  size: number;
  md5: string;
  sha1: string;
  sha256: string;
  sha512: string;
}

const DEFAULT_FONT_INTEGRITY: FontIntegrity = {
  size: 24755236,
  md5: '90e75a25cca0e8868977b880352c6a53',
  sha1: '7f018ad4a181e4d2df4f972f357e612885d6c24a',
  sha256: 'ee9faa6479c5b2434f9bceca8e2e7b643f699f4f3d067aac9609261e07c6be61',
  sha512: '793dc4357d311dba539c50b0ae38ff247af066f141ffea54ff0cc51e274453671e736989cee4998fd89211035ecfe52ad38aa828ba7f1739bcf107b94a023be5',
};

// ===== 📁 字体工具：路径生成与路径校验 =====

export function getDefaultFontPathByBaseDir(baseDir: string) {
  return path.join(baseDir, 'data', 'fonts', DEFAULT_FONT_FILE_NAME);
}

export const DEFAULT_CONFIG_FONT_PATH = getDefaultFontPathByBaseDir(process.cwd());

export function getDefaultFontPath(ctx: Context) {
  return getDefaultFontPathByBaseDir(ctx.baseDir);
}

function isDefaultConfigFontPath(ctx: Context, fontPath: string) {
  return fontPath === DEFAULT_CONFIG_FONT_PATH || fontPath === getDefaultFontPath(ctx);
}

export function resolveFontPath(ctx: Context, config: Config) {
  const customFontPath = config.customFontPath.trim();
  const defaultFontPath = getDefaultFontPath(ctx);

  if (!customFontPath) {
    ctx.logger.info(`🔤 自定义字体路径为空，使用 ctx.baseDir 默认字体路径: ${defaultFontPath}`);
    return {
      fontPath: defaultFontPath,
      canDownload: true,
    };
  }

  if (!path.isAbsolute(customFontPath)) {
    ctx.logger.warn(`⚠️ 自定义字体路径不是绝对路径，已回退系统字体: ${customFontPath}`);
    return {
      fontPath: '',
      canDownload: false,
    };
  }

  if (isDefaultConfigFontPath(ctx, customFontPath)) {
    return {
      fontPath: defaultFontPath,
      canDownload: true,
    };
  }

  return {
    fontPath: customFontPath,
    canDownload: false,
  };
}

// ===== 🧾 字体工具：MIME 与 CSS format 推断 =====

function getFontMime(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.otf') return 'font/otf';
  if (ext === '.woff') return 'font/woff';
  if (ext === '.woff2') return 'font/woff2';
  return 'font/truetype';
}

function getFontFormat(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.otf') return 'opentype';
  if (ext === '.woff') return 'woff';
  if (ext === '.woff2') return 'woff2';
  return 'truetype';
}

// ===== 📥 字体工具：下载与落盘 =====

async function downloadFont(ctx: Context, url: string, filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });

  const response = ctx.http
    ? await ctx.http.get<ArrayBuffer>(url, { responseType: 'arraybuffer', timeout: 60000 })
    : (await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer', timeout: 60000 })).data;

  await writeFile(filePath, Buffer.from(response));
}

function calculateFontHashes(buffer: Buffer) {
  return {
    md5: createHash('md5').update(buffer).digest('hex'),
    sha1: createHash('sha1').update(buffer).digest('hex'),
    sha256: createHash('sha256').update(buffer).digest('hex'),
    sha512: createHash('sha512').update(buffer).digest('hex'),
  };
}

async function verifyFontIntegrity(filePath: string, expected: FontIntegrity) {
  if (!existsSync(filePath)) return false;
  const buffer = await readFile(filePath);
  if (buffer.length !== expected.size) return false;
  const hashes = calculateFontHashes(buffer);
  return hashes.md5 === expected.md5
    && hashes.sha1 === expected.sha1
    && hashes.sha256 === expected.sha256
    && hashes.sha512 === expected.sha512;
}

function getFontDownloadSources(config: Config): FontDownloadSource[] {
  const configuredUrl = config.fontDownloadUrl.trim();
  if (!configuredUrl || configuredUrl === DEFAULT_FONT_DOWNLOAD_URL || configuredUrl === LEGACY_DEFAULT_FONT_DOWNLOAD_URL) {
    return DEFAULT_FONT_DOWNLOAD_SOURCES;
  }

  return [{ source: '自定义 URL', url: configuredUrl }];
}

async function downloadAndVerifyDefaultFont(ctx: Context, config: Config, fontPath: string) {
  let lastError: unknown;

  for (const candidate of getFontDownloadSources(config)) {
    try {
      ctx.logger.info(`📥 开始下载渲染字体 (${candidate.source}): ${candidate.url}`);
      await downloadFont(ctx, candidate.url, fontPath);

      if (await verifyFontIntegrity(fontPath, DEFAULT_FONT_INTEGRITY)) {
        ctx.logger.info(`✅ 渲染字体下载完成，hash 校验通过 (${candidate.source}): ${fontPath}`);
        return true;
      }

      throw new Error(`默认渲染字体 hash 校验失败: ${DEFAULT_FONT_FILE_NAME}`);
    } catch (error) {
      lastError = error;
      ctx.logger.warn(`⚠️ ${candidate.source} 字体下载或校验失败，准备尝试下一个源: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`❌ 默认渲染字体下载失败，所有下载源均不可用或校验失败: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

// ===== 🎨 字体工具：生成 Puppeteer HTML 可用的 @font-face =====

export async function getCustomFontFaceCss(ctx: Context, config: Config) {
  if (!config.enableCustomFont) return '';

  const fontReady = await ensureCustomFont(ctx, config);
  if (!fontReady) return '';

  const { fontPath } = resolveFontPath(ctx, config);
  const fontBase64 = (await readFile(fontPath)).toString('base64');
  const fontMime = getFontMime(fontPath);
  const fontFormat = getFontFormat(fontPath);

  return `@font-face{font-family:'CustomYouTubeFont';src:url(data:${fontMime};charset=utf-8;base64,${fontBase64}) format('${fontFormat}');font-weight:400 900;font-style:normal;font-display:block;}`;
}

// ===== ✅ 字体工具：启动/渲染前确保字体可用 =====

export async function ensureCustomFont(ctx: Context, config: Config) {
  if (!config.enableCustomFont) return false;

  const { fontPath, canDownload } = resolveFontPath(ctx, config);
  if (!fontPath) return false;

  if (canDownload) {
    if (await verifyFontIntegrity(fontPath, DEFAULT_FONT_INTEGRITY)) {
      ctx.logger.info(`✅ 默认渲染字体已存在且 hash 校验通过，跳过下载: ${fontPath}`);
      return true;
    }

    if (existsSync(fontPath)) {
      ctx.logger.warn(`⚠️ 默认渲染字体存在但 hash 校验失败，将重新下载: ${fontPath}`);
    }
  } else if (existsSync(fontPath)) {
    ctx.logger.info(`🔤 自定义渲染字体已存在，不应用内置 hash 校验: ${fontPath}`);
    return true;
  }

  if (!canDownload || !config.autoDownloadFont) {
    ctx.logger.warn(`⚠️ 自定义字体不存在，已回退系统字体: ${fontPath}`);
    return false;
  }

  return downloadAndVerifyDefaultFont(ctx, config, fontPath);
}
