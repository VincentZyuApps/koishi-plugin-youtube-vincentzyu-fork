import { Context } from 'koishi';
import { } from 'koishi-plugin-puppeteer';
import { Buffer } from 'buffer';
import type { Config } from '../config';
import { getCustomFontFaceCss } from '../utils/fonts';

// ===== 📦 图片模板：解析层传给 Puppeteer 的数据结构 =====

export interface YoutubeVideoPayload {
    coverThumlnail: ArrayBuffer;
    coverMime: string;
    titleText: string;
    channelText: string;
    publishTimeText: string;
    descriptionText: string;
    tagText: string;
    viewCountText: string;
}

// ===== 🎨 图片模板：生成 YouTube 风格的视频预览卡片 HTML =====

const DEFAULT_RENDER_IMAGE_WIDTH = 555;
const MIN_RENDER_IMAGE_WIDTH = 320;
const MAX_RENDER_IMAGE_WIDTH = 960;

function resolveRenderImageWidth(config: Config) {
    const width = Number(config.renderImageWidth);
    if (!Number.isFinite(width)) return DEFAULT_RENDER_IMAGE_WIDTH;
    const steppedWidth = Math.round(width / 5) * 5;
    return Math.min(MAX_RENDER_IMAGE_WIDTH, Math.max(MIN_RENDER_IMAGE_WIDTH, steppedWidth));
}

const getTemplateStr = async (ctx: Context, payload: YoutubeVideoPayload, config: Config): Promise<string> => {
    // 🖼️ 将缩略图 ArrayBuffer 转为 data URL，HTML 中可直接使用。
    const coverBase64 = Buffer.from(payload.coverThumlnail).toString('base64');
    const coverDataUrl = `data:${payload.coverMime};base64,${coverBase64}`;
    const customFontFaceCss = await getCustomFontFaceCss(ctx, config);
    const renderImageWidth = resolveRenderImageWidth(config);
    const fontFamily = config.enableCustomFont
        ? "'CustomYouTubeFont', 'Roboto', 'Arial', sans-serif"
        : "'Roboto', 'Arial', sans-serif";

    return `
    <html>
    <head>
        <style>
            ${customFontFaceCss}

            body {
                margin: 0;
                padding: 0;
                font-family: ${fontFamily};
                background-color: #000;
                display: flex; /* 🎯 使用 flex 让卡片居中 */
                justify-content: center; /* ↔️ 水平居中 */
                align-items: center; /* ↕️ 垂直居中 */
            }
            
            .background-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1;
            }

            .background-cover {
                width: 100%;
                height: 100%;
                object-fit: cover;
                filter: blur(18px) brightness(0.67);
                transform: scale(1.2);
            }

            .main-container {
                position: relative;
                z-index: 2;
                box-sizing: border-box;
                display: flex;
                justify-content: center;
                width: ${renderImageWidth}px;
                max-width: ${renderImageWidth}px;
                padding: 20px; /* 📏 四周留白保持接近一致 */
            }

            .container {
                box-sizing: border-box;
                width: 100%;
                border-radius: 16px;
                overflow: hidden;
                
                /* 🧊 毛玻璃效果：让背景封面隐约透出来 */
                background-color: rgba(45, 45, 45, 0.45);
                backdrop-filter: blur(13px) saturate(199%);
                -webkit-backdrop-filter: blur(13px) saturate(199%);
                
                border: 1px solid rgba(255, 255, 255, 0.13);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

                display: flex;
                flex-direction: column;
            }

            .cover-container {
                position: relative;
                width: 100%;
                padding-bottom: 56.25%; /* 🎞️ 16:9 视频封面比例 */
            }

            .cover {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .content {
                padding: 12px; /* 📦 内容区内边距 */
                display: flex;
                flex-direction: column;
                gap: 4px; /* ↕️ 标题、元信息、简介之间的间距 */
            }

            .title {
                font-size: 34px; /* 🔠 标题字号 */
                font-weight: 700;
                line-height: 1.2;
                color: #ffffff;
                text-shadow: 0 2px 4px rgba(0,0,0,0.6);
                margin-bottom: 0;
                letter-spacing: -0.5px;
            }

            .metadata {
                display: flex;
                flex-direction: column;
                gap: 3px;
                margin-bottom: 4px;
                padding: 6px 0 8px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .channel {
                font-size: 23px; /* 👤 频道名称字号 */
                font-weight: 600;
                color: #f0f0f0;
                text-shadow: 0 1px 2px rgba(0,0,0,0.4);
            }

            .stats-row {
                display: flex;
                align-items: center;
                gap: 8px; /* 📊 发布时间和播放量之间的间距 */
                flex-wrap: wrap;
            }

            .publish-time {
                font-size: 18px; /* 📅 发布时间字号 */
                color: #cccccc;
                font-weight: 400;
                display: flex;
                align-items: center;
                gap: 3px;
            }

            .publish-time::before {
                content: "📅";
                font-size: 16px; /* 📅 图标字号 */
            }

            .view-count {
                font-size: 20px; /* ▶️ 播放量字号 */
                color: #00bcd4;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 3px;
                background: rgba(0, 188, 212, 0.1);
                padding: 1px 5px; /* 📏 播放量标签内边距 */
                border-radius: 6px; /* 🔘 播放量标签圆角 */
                border: 1px solid rgba(0, 188, 212, 0.3);
            }

            .view-count::before {
                content: "▶️";
                font-size: 16px; /* ▶️ 图标字号 */
            }

            .description {
                font-size: 13.333px; /* 📝 简介字号 */
                line-height: 1.333;
                color: #e0e0e0;
                margin-top: 2px;
                white-space: pre-wrap;
                background: rgba(255, 255, 255, 0.05);
                padding: 7px; /* 📦 简介区域内边距 */
                border-radius: 8px;
                border-left: 3px solid rgba(255, 255, 255, 0.2);
            }

            .tags {
                font-size: 18px; /* 🏷️ 标签字号 */
                color: #64b5f6;
                font-weight: 500;
                margin-top: 2px;
                padding: 3px 7px; /* 🏷️ 标签区域内边距 */
                background: rgba(100, 181, 246, 0.1);
                border-radius: 8px;
                border: 1px solid rgba(100, 181, 246, 0.2);
            }
        </style>
    </head>
    <body>
        <div class="background-container">
            <img class="background-cover" src="${coverDataUrl}" alt="Video Background">
        </div>
        <div class="main-container">
            <div class="container">
                <div class="cover-container">
                    <img class="cover" src="${coverDataUrl}" alt="Video Cover">
                </div>
                <div class="content">
                    <div class="title">${payload.titleText}</div>
                    <div class="metadata">
                        <div class="channel">${payload.channelText}</div>
                        <div class="stats-row">
                            <div class="publish-time">${payload.publishTimeText}</div>
                            <div class="view-count">${payload.viewCountText} views</div>
                        </div>
                    </div>
                    <div class="description">${payload.descriptionText}</div>
                    <div class="tags">${payload.tagText}</div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
};

// ===== 📸 图片模板：把 HTML 交给 Puppeteer 截成 base64 图片 =====

export async function renderYoutubeVideoImage(
    ctx: Context,
    payload: YoutubeVideoPayload,
    config: Config
) {
    if (!ctx.puppeteer) {
        ctx.logger.error("❌ Puppeteer service is not available.");
        return null;
    }

    try {
        const page = await ctx.puppeteer.page();
        const html = await getTemplateStr(ctx, payload, config);
        
        await page.setContent(html, {
            waitUntil: ['domcontentloaded']
        });

        // 📐 根据实际 DOM 尺寸调整 viewport，避免截图裁切或留太多空白。
        const mainContainer = await page.$('.main-container');
        const boundingBox = await mainContainer.boundingBox();
        if (boundingBox) {
            await page.setViewport({ width: Math.ceil(boundingBox.width), height: Math.ceil(boundingBox.height) });
        }

        const screenshot = await page.screenshot({
            type: 'png',
            encoding: 'base64',
            fullPage: false // 🎯 只截当前 viewport，避免截到超出卡片的区域
        });

        await page.close();

        return screenshot;
    } catch (error) {
        ctx.logger.error('❌ Error rendering YouTube video image:', error);
        return null;
    }
}
