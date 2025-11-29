/**
 * Mail Send API - Cloudflare Worker with Hono
 * 
 * 应用入口文件
 * Entry point for the application
 */

import { Hono } from 'hono';
import { getGlobalMiddleware } from './middleware';
import { createRoutes } from './routes';
import { errorResponse } from './utils/response';

// ==================== 创建应用 ====================

const app = new Hono<{ Bindings: Env }>();

// ==================== 应用全局中间件 ====================

getGlobalMiddleware().forEach((middleware) => {
	app.use('*', middleware);
});

// ==================== 挂载路由 ====================

const routes = createRoutes();
app.route('/', routes);

// ==================== 错误处理 ====================

/**
 * 404 处理
 */
app.notFound((c) => {
	return c.json(
		{
			...errorResponse('Not Found'),
			path: c.req.path,
		},
		404
	);
});

/**
 * 全局错误处理
 */
app.onError((err, c) => {
	console.error('Error:', err);
	return c.json(
		errorResponse(err.message || 'Internal Server Error'),
		500
	);
});

// ==================== 导出应用 ====================

export default app;
