/**
 * Mail Handlers
 * 邮件业务逻辑处理器
 */

import type { Context } from 'hono';
import type { SendMailRequest, SendMailData, MailStatusData } from '../types';
import { successResponse, errorResponse } from '../utils/response';

/**
 * 发送邮件处理器
 */
export async function sendMailHandler(c: Context) {
    try {
        // 获取请求体
        const body = await c.req.json<SendMailRequest>();

        // 简单验证
        if (!body.to || !body.subject || !body.content) {
            return c.json(
                errorResponse('Missing required fields: to, subject, content'),
                400
            );
        }

        // TODO: 这里添加实际的邮件发送逻辑（使用 MailChannels 等）
        // 示例响应数据
        const mailData: SendMailData = {
            id: crypto.randomUUID(),
            to: body.to,
            subject: body.subject,
            sentAt: new Date().toISOString(),
        };

        return c.json(
            successResponse(mailData, 'Email sent successfully')
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return c.json(errorResponse(message), 500);
    }
}

/**
 * 查询邮件状态处理器
 */
export async function getMailStatusHandler(c: Context) {
    try {
        const id = c.req.param('id');

        if (!id) {
            return c.json(errorResponse('Mail ID is required'), 400);
        }

        // TODO: 从数据库或 KV 中查询实际状态
        const statusData: MailStatusData = {
            id,
            status: 'delivered',
            checkedAt: new Date().toISOString(),
        };

        return c.json(successResponse(statusData));
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return c.json(errorResponse(message), 500);
    }
}
