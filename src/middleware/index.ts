/**
 * Middleware Configuration
 * 中间件配置
 */

import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import type { MiddlewareHandler } from 'hono';

/**
 * CORS 中间件配置
 */
export function corsMiddleware(): MiddlewareHandler {
    return cors({
        origin: '*', // 生产环境建议设置具体的域名
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: 86400,
    });
}

/**
 * 日志中间件配置
 */
export function loggerMiddleware(): MiddlewareHandler {
    return logger();
}

/**
 * 美化 JSON 中间件配置
 */
export function prettyJSONMiddleware(): MiddlewareHandler {
    return prettyJSON();
}

/**
 * 获取所有全局中间件
 */
export function getGlobalMiddleware(): MiddlewareHandler[] {
    return [
        loggerMiddleware(),
        prettyJSONMiddleware(),
        corsMiddleware(),
    ];
}
