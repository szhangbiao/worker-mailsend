/**
 * Mail Handlers
 * 邮件业务逻辑处理器
 */

import type { Context } from 'hono';
import type { SendMailRequest, SendMailData, MailStatusData } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { createGmailService } from '../services/gmail';

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

        // 创建 Gmail 服务实例
        const gmailService = createGmailService(c.env);

        // 发送邮件
        const result = await gmailService.sendEmail({
            to: body.to,
            subject: body.subject,
            content: body.content,
            from: body.from,
            cc: body.cc,
            bcc: body.bcc,
            replyTo: body.replyTo,
            isHtml: body.isHtml,
        });

        // 构造响应数据
        const mailData: SendMailData = {
            id: result.id,
            threadId: result.threadId,
            to: body.to,
            subject: body.subject,
            sentAt: new Date().toISOString(),
        };

        return c.json(
            successResponse(mailData, 'Email sent successfully via Gmail')
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

        // 创建 Gmail 服务实例
        const gmailService = createGmailService(c.env);

        // 获取邮件详情
        const messageDetails = await gmailService.getMessageDetails(id);

        // 解析状态
        const labelIds = messageDetails.labelIds || [];
        let status: 'pending' | 'sent' | 'delivered' | 'failed' = 'sent';

        if (labelIds.includes('SENT')) {
            status = 'delivered';
        } else if (labelIds.includes('DRAFT')) {
            status = 'pending';
        }

        const statusData: MailStatusData = {
            id,
            status,
            threadId: messageDetails.threadId,
            snippet: messageDetails.snippet,
            checkedAt: new Date().toISOString(),
        };

        return c.json(successResponse(statusData));
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return c.json(errorResponse(message), 500);
    }
}
