/**
 * Mail Send API - Cloudflare Worker with Hono
 * 
 * 提供邮件发送相关的 API 服务
 * 使用 Hono 框架处理路由和中间件
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// 创建 Hono 应用实例，传入 Env 类型以获得类型支持
const app = new Hono<{ Bindings: Env }>();

// ==================== 全局中间件 ====================

// 日志中间件 - 记录所有请求
app.use('*', logger());

// 美化 JSON 响应
app.use('*', prettyJSON());

// CORS 中间件 - 允许跨域请求
app.use('*', cors({
	origin: '*', // 生产环境建议设置具体的域名
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization'],
	maxAge: 86400,
}));

// ==================== 路由定义 ====================

// 根路径 - API 信息
app.get('/', (c) => {
	return c.json({
		name: 'Mail Send API',
		version: '1.0.0',
		endpoints: {
			health: '/health',
			api: {
				sendMail: 'POST /api/mail/send',
				mailStatus: 'GET /api/mail/status/:id',
			},
		},
	});
});

// 健康检查端点
app.get('/health', (c) => {
	return c.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
	});
});

// ==================== API 路由组 ====================

// 创建 API 路由组
const api = new Hono<{ Bindings: Env }>();

// 邮件发送端点
api.post('/mail/send', async (c) => {
	try {
		// 获取请求体
		const body = await c.req.json();

		// 简单验证
		if (!body.to || !body.subject || !body.content) {
			return c.json({
				success: false,
				error: 'Missing required fields: to, subject, content',
			}, 400);
		}

		// TODO: 这里添加实际的邮件发送逻辑（使用 MailChannels 等）
		// 示例响应
		return c.json({
			success: true,
			message: 'Email sent successfully',
			data: {
				id: crypto.randomUUID(),
				to: body.to,
				subject: body.subject,
				sentAt: new Date().toISOString(),
			},
		});
	} catch (error) {
		return c.json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		}, 500);
	}
});

// 查询邮件状态端点
api.get('/mail/status/:id', (c) => {
	const id = c.req.param('id');

	// TODO: 从数据库或 KV 中查询实际状态
	return c.json({
		success: true,
		data: {
			id,
			status: 'delivered',
			checkedAt: new Date().toISOString(),
		},
	});
});

// 挂载 API 路由组到 /api 路径
app.route('/api', api);

// ==================== 错误处理 ====================

// 404 处理
app.notFound((c) => {
	return c.json({
		success: false,
		error: 'Not Found',
		path: c.req.path,
	}, 404);
});

// 全局错误处理
app.onError((err, c) => {
	console.error('Error:', err);
	return c.json({
		success: false,
		error: err.message || 'Internal Server Error',
	}, 500);
});

// ==================== 导出应用 ====================

export default app;
