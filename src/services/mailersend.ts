/**
 * MailerSend Service
 * MailerSend 邮件发送服务
 * 
 * 使用 MailerSend API 通过 API Token 认证发送邮件
 */

import type { GmailSendOptions } from '../types';

/**
 * MailerSend API 响应接口
 */
interface MailerSendResponse {
    message?: string;
    errors?: Record<string, string[]>;
}

/**
 * MailerSend 邮件发送选项
 */
interface MailerSendEmailPayload {
    from: {
        email: string;
        name?: string;
    };
    to: Array<{
        email: string;
        name?: string;
    }>;
    subject: string;
    text?: string;
    html?: string;
    cc?: Array<{
        email: string;
        name?: string;
    }>;
    bcc?: Array<{
        email: string;
        name?: string;
    }>;
    reply_to?: {
        email: string;
        name?: string;
    };
}

/**
 * MailerSend 服务类
 */
export class MailerSendService {
    private apiToken: string;
    private fromEmail: string;
    private fromName?: string;

    constructor(apiToken: string, fromEmail: string, fromName?: string) {
        this.apiToken = apiToken;
        this.fromEmail = fromEmail;
        this.fromName = fromName;
    }

    /**
     * 解析邮件地址
     * 支持 "Name <email@example.com>" 或 "email@example.com" 格式
     */
    private parseEmailAddress(address: string): { email: string; name?: string } {
        const match = address.match(/^(.+?)\s*<(.+?)>$/);
        if (match) {
            return {
                name: match[1].trim(),
                email: match[2].trim(),
            };
        }
        return { email: address.trim() };
    }

    /**
     * 将邮件地址数组转换为 MailerSend 格式
     */
    private parseEmailAddresses(addresses: string[]): Array<{ email: string; name?: string }> {
        return addresses.map(addr => this.parseEmailAddress(addr));
    }

    /**
     * 创建 MailerSend API 请求 payload
     */
    private createEmailPayload(options: GmailSendOptions): MailerSendEmailPayload {
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

        const payload: MailerSendEmailPayload = {
            from: from
                ? this.parseEmailAddress(from)
                : { email: this.fromEmail, name: this.fromName },
            to: [this.parseEmailAddress(to)],
            subject,
        };

        // 设置邮件内容
        if (isHtml) {
            payload.html = content;
            // 同时提供纯文本版本（最佳实践）
            payload.text = content.replace(/<[^>]*>/g, '');
        } else {
            payload.text = content;
        }

        // 可选字段
        if (cc && cc.length > 0) {
            payload.cc = this.parseEmailAddresses(cc);
        }
        if (bcc && bcc.length > 0) {
            payload.bcc = this.parseEmailAddresses(bcc);
        }
        if (replyTo) {
            payload.reply_to = this.parseEmailAddress(replyTo);
        }

        return payload;
    }

    /**
     * 发送邮件
     */
    async sendEmail(options: GmailSendOptions): Promise<{ id: string; threadId: string }> {
        try {
            // 1. 创建邮件 payload
            const payload = this.createEmailPayload(options);

            // 2. 调用 MailerSend API
            const apiUrl = 'https://api.mailersend.com/v1/email';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Authorization': `Bearer ${this.apiToken}`,
                },
                body: JSON.stringify(payload),
            });

            // 3. 处理响应
            if (!response.ok) {
                let errorMessage = `Failed to send email: ${response.status} ${response.statusText}`;

                try {
                    const errorData = await response.json<MailerSendResponse>();
                    if (errorData.errors) {
                        const errorDetails = Object.entries(errorData.errors)
                            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                            .join('; ');
                        errorMessage = `MailerSend API error: ${errorDetails}`;
                    } else if (errorData.message) {
                        errorMessage = `MailerSend API error: ${errorData.message}`;
                    }
                } catch {
                    // 如果无法解析错误响应，使用默认错误消息
                }

                throw new Error(errorMessage);
            }

            // 4. MailerSend 成功响应通常是 202 Accepted，没有响应体
            // 我们生成一个唯一 ID 来保持与 Gmail 服务的接口一致
            const messageId = `mailersend_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            return {
                id: messageId,
                threadId: messageId, // MailerSend 没有线程概念，使用相同 ID
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`MailerSend send error: ${message}`);
        }
    }

    /**
     * 获取邮件详情
     * 注意: MailerSend 的邮件详情需要通过 Webhooks 或 Activity API 获取
     * 这里提供一个占位实现
     */
    async getMessageDetails(messageId: string): Promise<any> {
        // MailerSend 不支持直接通过 message ID 获取邮件详情
        // 需要使用 Activity API 或配置 Webhooks
        throw new Error('MailerSend does not support getting message details by ID. Use Activity API or Webhooks instead.');
    }
}

/**
 * 创建 MailerSend 服务实例
 */
export function createMailerSendService(env: Env): MailerSendService {
    const apiToken = env.MAILERSEND_API_TOKEN;

    if (!apiToken) {
        throw new Error('MAILERSEND_API_TOKEN not configured');
    }
    return new MailerSendService(apiToken, 'no-replay@healthx.cloud', 'MailerSend');
}
