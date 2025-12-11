/**
 * Mail Routes
 * 邮件相关路由
 */

import { Hono } from 'hono';
import {
    sendMailHandler,
    getEmailHistoryHandler,
    getEmailDetailHandler,
    deleteEmailHandler
} from '../handlers/mail';

// 创建邮件路由组
export const mailRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /mail/send
 * 发送邮件
 */
mailRoutes.post('/send', sendMailHandler);

/**
 * GET /mail/history
 * 查询邮件历史记录
 * 支持分页和按收件人过滤
 * 
 * Query Parameters:
 * - page: 页码 (默认 1)
 * - pageSize: 每页数量 (默认 20, 最大 100)
 * - toAddress: 按收件人过滤 (可选)
 */
mailRoutes.get('/history', getEmailHistoryHandler);

/**
 * GET /mail/detail/:messageId
 * 查询邮件详情
 * 
 * Path Parameters:
 * - messageId: Gmail 消息 ID
 */
mailRoutes.get('/detail', getEmailDetailHandler);

/**
 * DELETE /mail/:messageId
 * 删除邮件记录
 * 
 * Path Parameters:
 * - messageId: Gmail 消息 ID
 */
mailRoutes.delete('/delete', deleteEmailHandler);

