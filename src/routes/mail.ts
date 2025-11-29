/**
 * Mail Routes
 * 邮件相关路由
 */

import { Hono } from 'hono';
import { sendMailHandler, getMailStatusHandler } from '../handlers/mail';

// 创建邮件路由组
export const mailRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /mail/send
 * 发送邮件
 */
mailRoutes.post('/send', sendMailHandler);

/**
 * GET /mail/status/:id
 * 查询邮件状态
 */
mailRoutes.get('/status/:id', getMailStatusHandler);
