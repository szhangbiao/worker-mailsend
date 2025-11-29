/**
 * Routes Index
 * 路由汇总
 */

import { Hono } from 'hono';
import { mailRoutes } from './mail';
import type { HealthCheck } from '../types';

/**
 * 创建主路由
 */
export function createRoutes() {
    const app = new Hono<{ Bindings: Env }>();

    // ==================== 基础路由 ====================

    /**
     * GET /
     * API 信息
     */
    app.get('/', (c) => {
        return c.text('Hello World');
    });

    /**
     * GET /health
     * 健康检查
     */
    app.get('/health', (c) => {
        const health: HealthCheck = {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
        return c.json(health);
    });

    // ==================== API 路由组 ====================

    /**
     * 挂载邮件路由到 /api/mail
     */
    app.route('/api/mail', mailRoutes);

    return app;
}
