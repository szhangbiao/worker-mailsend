/**
 * N8N Gmail Service
 * 通过 N8N Webhook 发送 Gmail 邮件
 * 
 * 使用 N8N 的 Gmail 节点发送邮件
 * 注意: N8N Gmail 节点会自动处理邮件编码,无需手动进行 Base64 或 RFC 2047 编码
 */

import type { GmailSendOptions } from '../types';

/**
 * N8N Webhook 请求 payload
 */
interface N8NWebhookPayload {
    to: string;
    subject: string;
    content: string;
    from?: string;
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
    isHtml?: boolean;
}

/**
 * N8N Webhook 响应接口
 * N8N Gmail 节点返回的是 Gmail API 的响应数据
 */
interface N8NWebhookResponse {
    id?: string;
    threadId?: string;
    labelIds?: string[];
    // 错误响应字段
    success?: boolean;
    message?: string;
    error?: string;
}

/**
 * N8N Gmail 服务类
 */
export class N8NGmailService {
    private webhookUrl: string;

    constructor(webhookUrl: string) {
        this.webhookUrl = webhookUrl;
    }

    /**
     * 创建 N8N Webhook 请求 payload
     * N8N Gmail 节点会自动处理邮件编码和格式化
     */
    private createWebhookPayload(options: GmailSendOptions): N8NWebhookPayload {
        const {
            to,
            subject,
            content,
            from,
            cc,
            bcc,
            replyTo,
            isHtml = false,
        } = options;

        const payload: N8NWebhookPayload = {
            to,
            subject,
            content,
            isHtml,
        };

        // 可选字段
        if (from) {
            payload.from = from;
        }
        if (cc && cc.length > 0) {
            payload.cc = cc;
        }
        if (bcc && bcc.length > 0) {
            payload.bcc = bcc;
        }
        if (replyTo) {
            payload.replyTo = replyTo;
        }

        return payload;
    }

    /**
     * 发送邮件
     */
    async sendEmail(options: GmailSendOptions): Promise<{ id: string; threadId: string }> {
        try {
            // 1. 创建 webhook payload
            const payload = this.createWebhookPayload(options);

            // 2. 调用 N8N Webhook
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            // 3. 处理响应
            if (!response.ok) {
                let errorMessage = `Failed to send email via N8N: ${response.status} ${response.statusText}`;

                try {
                    const errorData = await response.json<N8NWebhookResponse>();
                    if (errorData.error) {
                        errorMessage = `N8N Webhook error: ${errorData.error}`;
                    } else if (errorData.message) {
                        errorMessage = `N8N Webhook error: ${errorData.message}`;
                    }
                } catch {
                    // 如果无法解析错误响应，使用默认错误消息
                }

                throw new Error(errorMessage);
            }

            // 4. 解析成功响应
            // 先获取响应文本以便调试
            const responseText = await response.text();

            // 检查响应是否为空
            if (!responseText || responseText.trim() === '') {
                throw new Error('N8N Webhook returned empty response. Please check your N8N workflow configuration.');
            }

            // 尝试解析 JSON
            let result: N8NWebhookResponse;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                // 提供更详细的错误信息，包括实际响应内容（截断以避免过长）
                const preview = responseText.substring(0, 200);
                throw new Error(
                    `N8N Webhook returned invalid JSON. Response preview: "${preview}...". ` +
                    `Please ensure your N8N workflow has a "Respond to Webhook" node that returns JSON.`
                );
            }

            // 验证返回数据
            if (!result.id || !result.threadId) {
                // 提供实际返回的数据以便调试
                throw new Error(
                    `Invalid response from N8N: missing id or threadId. ` +
                    `Received: ${JSON.stringify(result)}`
                );
            }

            return {
                id: result.id,
                threadId: result.threadId,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`N8N Gmail send error: ${message}`);
        }
    }

    /**
     * 获取邮件详情
     * 注意: N8N Webhook 通常不支持获取邮件详情
     * 这里提供一个占位实现
     */
    async getMessageDetails(messageId: string): Promise<any> {
        throw new Error('N8N Webhook does not support getting message details.');
    }
}

/**
 * 创建 N8N Gmail 服务实例
 */
export function createN8NGmailService(env: Env): N8NGmailService {
    const webhookUrl = env.N8N_GMAIL_WEBHOOK_URL;

    if (!webhookUrl) {
        throw new Error('N8N_GMAIL_WEBHOOK_URL not configured');
    }

    return new N8NGmailService(webhookUrl);
}
