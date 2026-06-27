import axios from 'axios';
import path from 'path';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import type { Context } from 'koishi';
import type { Config } from './config';

// ===== 🔤 字体工具：默认配置与下载地址 =====

export const PLUGIN_NAME = 'youtube-vincentzyu-fork';
export const DEFAULT_FONT_FILE_NAME = 'LXGWWenKaiMono-Regular.ttf';
export const DEFAULT_FONT_DOWNLOAD_URL = 'http://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/download/fonts/LXGWWenKaiMono-Regular.ttf';

// ===== 📁 字体工具：路径生成与路径校验 =====

export function getDefaultFontPathByBaseDir(baseDir: string) {
  return path.join(baseDir, 'data', 'fonts', DEFAULT_FONT_FILE_NAME);
}

export const DEFAULT_CONFIG_FONT_PATH = getDefaultFontPathByBaseDir(process.cwd());

export function getDefaultFontPath(ctx: Context) {
  return getDefaultFontPathByBaseDir(ctx.baseDir);
}

export function resolveFontPath(ctx: Context, config: Config) {
  const customFontPath = config.customFontPath.trim();
  if (!customFontPath) {
    ctx.logger.warn('⚠️ 自定义字体路径为空，已回退系统字体');
    return {
      fontPath: '',
      canDownload: false,
    };
  }

  if (!path.isAbsolute(customFontPath)) {
    ctx.logger.warn(`⚠️ 自定义字体路径不是绝对路径，已回退系统字体: ${customFontPath}`);
    return {
      fontPath: '',
      canDownload: false,
    };
  }

  return {
    fontPath: customFontPath,
    canDownload: customFontPath === getDefaultFontPath(ctx),
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

  if (existsSync(fontPath)) {
    ctx.logger.info(`🔤 渲染字体已存在，跳过下载: ${fontPath}`);
    return true;
  }

  if (!canDownload || !config.autoDownloadFont) {
    ctx.logger.warn(`⚠️ 自定义字体不存在，已回退系统字体: ${fontPath}`);
    return false;
  }

  const fontUrl = config.fontDownloadUrl || DEFAULT_FONT_DOWNLOAD_URL;
  ctx.logger.info(`📥 开始下载渲染字体: ${fontUrl}`);
  await downloadFont(ctx, fontUrl, fontPath);
  ctx.logger.info(`✅ 渲染字体下载完成: ${fontPath}`);
  return true;
}
