/**
 * Mail Handlers
 * 邮件业务逻辑处理器
 */

import type { Context } from 'hono';
import type { SendMailRequest, SendMailData, MailStatusData, EmailHistoryData } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { createMailerSendService } from '../services/mailersend';
import { createDatabaseService } from '../services/db';

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

        // 创建 MailerSend 服务实例
        const mailerSendService = createMailerSendService(c.env);

        // 发送邮件
        const result = await mailerSendService.sendEmail({
            to: body.to,
            subject: body.subject,
            content: body.content,
            from: body.from,
            cc: body.cc,
            bcc: body.bcc,
            replyTo: body.replyTo,
            isHtml: body.isHtml,
        });

        // 保存到数据库 (异步,不阻塞响应)
        try {
            const dbService = createDatabaseService(c.env);
            await dbService.saveEmailLog({
                message_id: result.id,
                thread_id: result.threadId,
                to_address: body.to,
                subject: body.subject,
                from_address: body.from,
                cc_addresses: body.cc,
                bcc_addresses: body.bcc,
                is_html: body.isHtml,
                sent_at: new Date().toISOString(),
            });
        } catch (dbError) {
            // 数据库保存失败不影响邮件发送成功的响应
            console.error('Failed to save email log to database:', dbError);
        }

        // 构造响应数据
        const mailData: SendMailData = {
            id: result.id,
            threadId: result.threadId,
            to: body.to,
            subject: body.subject,
            sentAt: new Date().toISOString(),
        };

        return c.json(
            successResponse(mailData, 'Email sent successfully via MailerSend')
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return c.json(errorResponse(message), 500);
    }
}

/**
 * 查询邮件历史记录处理器
 * 支持分页和按收件人过滤
 */
export async function getEmailHistoryHandler(c: Context) {
    try {
        // 获取查询参数
        const page = parseInt(c.req.query('page') || '1');
        const pageSize = parseInt(c.req.query('pageSize') || '20');
        const toAddress = c.req.query('toAddress');

        // 参数验证
        if (page < 1) {
            return c.json(errorResponse('Page must be greater than 0'), 400);
        }
        if (pageSize < 1 || pageSize > 100) {
            return c.json(errorResponse('Page size must be between 1 and 100'), 400);
        }

        // 创建数据库服务实例
        const dbService = createDatabaseService(c.env);

        // 计算偏移量
        const offset = (page - 1) * pageSize;

        // 查询数据
        const result = await dbService.getEmailLogs({
            limit: pageSize,
            offset,
            toAddress,
        });

        // 构造响应数据
        const historyData: EmailHistoryData = {
            logs: result.logs,
            pagination: {
                page,
                pageSize,
                hasMore: result.hasMore,
            },
        };

        return c.json(successResponse(historyData));
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return c.json(errorResponse(message), 500);
    }
}

/**
 * 查询邮件详情处理器
 * 通过 message_id 查询
 */
export async function getEmailDetailHandler(c: Context) {
    try {
        const messageId = c.req.query('messageId');

        if (!messageId) {
            return c.json(errorResponse('Message ID is required'), 400);
        }

        // 创建数据库服务实例
        const dbService = createDatabaseService(c.env);

        // 查询邮件详情
        const emailLog = await dbService.getEmailLogByMessageId(messageId);

        if (!emailLog) {
            return c.json(errorResponse('Email not found'), 404);
        }

        return c.json(successResponse(emailLog));
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return c.json(errorResponse(message), 500);
    }
}

/**
 * 删除邮件记录处理器
 * 通过 message_id 删除
 */
export async function deleteEmailHandler(c: Context) {
    try {
        const messageId = c.req.query('messageId');

        if (!messageId) {
            return c.json(errorResponse('Message ID is required'), 400);
        }

        // 创建数据库服务实例
        const dbService = createDatabaseService(c.env);

        // 删除邮件记录
        const deleted = await dbService.deleteEmailLogByMessageId(messageId);

        if (!deleted) {
            return c.json(errorResponse('Email not found or already deleted'), 404);
        }

        return c.json(successResponse({ message_id: messageId, deleted: true }, 'Email deleted successfully'));
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return c.json(errorResponse(message), 500);
    }
}

