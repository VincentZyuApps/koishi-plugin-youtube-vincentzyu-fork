

import { Context } from 'koishi';
import fastify, { FastifyInstance } from 'fastify';
import { renderYoutubeVideoImage, YoutubeVideoPayload } from './templates/image';
import { parseYoutubeVideo } from './parse';
import { Config } from './config';

// ===== 🖥️ REST 服务：对外提供解析和渲染能力 =====

// 📦 REST 请求体和内部 payload 略有不同：
// JSON 不能直接传 ArrayBuffer，所以缩略图在 REST 中用 base64 字符串承载。
interface RestYoutubeVideoPayload {
    coverThumlnail: string; // 🖼️ base64 字符串格式的缩略图
    coverMime: string;
    titleText: string;
    channelText: string;
    publishTimeText: string;
    descriptionText: string;
    tagText: string;
    viewCountText: string;
}

// 🚀 启动 Fastify 服务。这个函数由 index.ts 通过 ctx.inject(['puppeteer']) 调用。
export function startRestService(ctx: Context, config: Config) {
    if (!config.enableRestfulService) {
        ctx.logger.info('🖥️ RESTful service is disabled.');
        return;
    }

    const server: FastifyInstance = fastify({ logger: true });

    // 🎨 /render：直接渲染外部传入的 payload。
    server.post('/render', async (request, reply) => {
        try {
            const payload = request.body as RestYoutubeVideoPayload;

            // 🔁 把 REST 传来的 base64 缩略图还原成 ArrayBuffer，交给渲染函数。
            const thumbnailBuffer = Buffer.from(payload.coverThumlnail, 'base64');

            const renderPayload: YoutubeVideoPayload = {
                ...payload,
                coverThumlnail: thumbnailBuffer.buffer.slice(thumbnailBuffer.byteOffset, thumbnailBuffer.byteOffset + thumbnailBuffer.byteLength),
            };

            const imageBase64 = await renderYoutubeVideoImage(ctx, renderPayload, config);

            if (imageBase64) {
                reply.code(200).send({ imageBase64 });
            } else {
                reply.code(500).send({ error: 'Failed to render image.' });
            }
        } catch (error) {
            ctx.logger.error('❌ Error in /render endpoint:', error);
            reply.code(500).send({ error: 'Internal server error.' });
        }
    });

    // 🔎 /parse：只解析 YouTube URL，返回视频信息 payload。
    server.post('/parse', async (request, reply) => {
        try {
            const { url } = request.body as { url: string };
            
            if (!url) {
                reply.code(400).send({ error: 'URL is required' });
                return;
            }

            const payload = await parseYoutubeVideo(ctx, config, url);
            
            // 📤 ArrayBuffer 不能直接 JSON 序列化，所以这里转回 base64。
            const coverBase64 = Buffer.from(payload.coverThumlnail).toString('base64');
            
            const responsePayload = {
                ...payload,
                coverThumlnail: coverBase64
            };

            reply.code(200).send(responsePayload);
        } catch (error) {
            ctx.logger.error('❌ Error in /parse endpoint:', error);
            reply.code(500).send({ error: error.message || 'Failed to parse YouTube video' });
        }
    });

    // 🖼️ /render-from-url：传 URL，服务端完成解析 + 渲染，一步返回图片。
    server.post('/render-from-url', async (request, reply) => {
        try {
            const { url } = request.body as { url: string };
            
            if (!url) {
                reply.code(400).send({ error: 'URL is required' });
                return;
            }

            // 🔎 先解析视频信息。
            const payload = await parseYoutubeVideo(ctx, config, url);
            
            // 📸 再直接渲染图片。
            const imageBase64 = await renderYoutubeVideoImage(ctx, payload, config);

            if (imageBase64) {
                reply.code(200).send({ imageBase64 });
            } else {
                reply.code(500).send({ error: 'Failed to render image.' });
            }
        } catch (error) {
            ctx.logger.error('❌ Error in /render-from-url endpoint:', error);
            reply.code(500).send({ error: error.message || 'Failed to render YouTube video' });
        }
    });

    server.listen({
        host: config.restServiceBindIp,
        port: config.restServiceBindPort,
    }, (err, address) => {
        if (err) {
            ctx.logger.error('❌ Error starting RESTful service:', err);
            throw err;
        }
        ctx.logger.info(`🚀 RESTful service listening on ${address}`);
    });

    ctx.on('dispose', () => {
        server.close();
    });
}
