/**
 * Service Account Gmail Service
 * Service Account Gmail 邮件发送服务
 * 
 * 使用 Google Service Account 通过 JWT 认证发送邮件
 */

import { generateJWT } from '../utils/jwt';
import type { GmailTokenResponse, GmailSendOptions } from '../types';

/**
 * Service Account Gmail 服务类 需要开通 Google Workspace才能使用
 */
export class ServiceAccountGmailService {
    private clientEmail: string;
    private privateKey: string;
    private subject?: string; // 用于域范围委派的用户邮箱
    private kv: KVNamespace;

    constructor(clientEmail: string, privateKey: string, subject: string | undefined, kv: KVNamespace) {
        this.clientEmail = clientEmail;
        this.privateKey = privateKey;
        this.subject = subject;
        this.kv = kv;
    }

    /**
     * 获取访问令牌
     * 使用 JWT 获取新的 access token
     * 使用 KV 存储缓存机制
     */
    private async getAccessToken(): Promise<string> {
        const now = Date.now();
        const cacheKey = `gmail_sa_token:${this.clientEmail}`;

        // 1. 从 KV 读取缓存的 token
        const cachedData = await this.kv.get<{
            accessToken: string;
            expiresAt: number;
        }>(cacheKey, 'json');

        // 2. 检查缓存是否有效 (提前 30 秒过期以确保安全)
        if (cachedData && cachedData.expiresAt > now + 30000) {
            return cachedData.accessToken;
        }

        try {
            // 3. 生成 JWT
            const jwt = await generateJWT({
                clientEmail: this.clientEmail,
                privateKey: this.privateKey,
                scope: 'https://www.googleapis.com/auth/gmail.send',
                subject: this.subject,
            });

            // 4. 使用 JWT 交换 access token
            const tokenUrl = 'https://oauth2.googleapis.com/token';

            const params = new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwt,
            });

            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to get access token: ${error}`);
            }

            const data = await response.json<GmailTokenResponse>();

            // 5. 将新 token 存储到 KV
            const tokenData = {
                accessToken: data.access_token,
                // expires_in 是秒,转换为毫秒时间戳
                expiresAt: now + (data.expires_in * 1000),
            };

            // 使用 expirationTtl 设置 KV 过期时间（秒）
            await this.kv.put(cacheKey, JSON.stringify(tokenData), {
                expirationTtl: data.expires_in,
            });

            return data.access_token;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Service Account authentication failed: ${message}`);
        }
    }

    /**
     * 将字符串转换为标准 Base64 编码 (用于 MIME 内容)
     */
    private base64Encode(str: string): string {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        let binaryString = '';
        for (let i = 0; i < data.length; i++) {
            binaryString += String.fromCharCode(data[i]);
        }
        return btoa(binaryString);
    }

    /**
     * 使用 RFC 2047 编码邮件头部
     * 格式: =?charset?encoding?encoded-text?=
     */
    private encodeHeader(str: string): string {
        // 如果只包含 ASCII 字符,直接返回
        if (/^[\x00-\x7F]*$/.test(str)) {
            return str;
        }
        return `=?UTF-8?B?${this.base64Encode(str)}?=`;
    }

    /**
     * 创建 RFC 2822 格式的邮件内容
     */
    private createEmailContent(options: GmailSendOptions): string {
        const {
            to,
            subject,
            content,
            from = 'me',
            cc,
            bcc,
            replyTo,
            isHtml = false,
        } = options;

        const lines: string[] = [];

        // 基础头部
        lines.push(`To: ${to}`);
        lines.push(`Subject: ${this.encodeHeader(subject)}`);

        // 可选头部
        if (from && from !== 'me') {
            lines.push(`From: ${from}`);
        }
        if (cc && cc.length > 0) {
            lines.push(`Cc: ${cc.join(', ')}`);
        }
        if (bcc && bcc.length > 0) {
            lines.push(`Bcc: ${bcc.join(', ')}`);
        }
        if (replyTo) {
            lines.push(`Reply-To: ${replyTo}`);
        }

        // MIME 类型
        const contentType = isHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';
        lines.push(`Content-Type: ${contentType}`);
        lines.push('MIME-Version: 1.0');
        lines.push('Content-Transfer-Encoding: base64'); // 使用 base64 传输编码避免正文乱码

        // 空行分隔头部和正文
        lines.push('');

        // 邮件正文 (使用标准 Base64 编码)
        lines.push(this.base64Encode(content));

        return lines.join('\r\n');
    }

    /**
     * 将字符串转换为 Base64URL 编码 (用于 Gmail API payload)
     * 正确处理 UTF-8 编码,支持中文等多字节字符
     */
    private base64UrlEncode(str: string): string {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);

        let binaryString = '';
        for (let i = 0; i < data.length; i++) {
            binaryString += String.fromCharCode(data[i]);
        }

        const base64 = btoa(binaryString);

        return base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    /**
     * 发送邮件
     */
    async sendEmail(options: GmailSendOptions): Promise<{ id: string; threadId: string }> {
        try {
            // 1. 获取访问令牌
            const accessToken = await this.getAccessToken();

            // 2. 创建邮件内容
            const emailContent = this.createEmailContent(options);

            // 3. Base64URL 编码
            const encodedEmail = this.base64UrlEncode(emailContent);

            // 4. 调用 Gmail API 发送邮件
            const sendUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

            const response = await fetch(sendUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    raw: encodedEmail,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to send email: ${error}`);
            }

            const result = await response.json<{ id: string; threadId: string }>();
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Service Account Gmail send error: ${message}`);
        }
    }

    /**
     * 获取邮件详情
     */
    async getMessageDetails(messageId: string): Promise<any> {
        try {
            const accessToken = await this.getAccessToken();
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to get message details: ${error}`);
            }

            return await response.json();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Service Account Gmail get message error: ${message}`);
        }
    }
}

/**
 * 创建 Service Account Gmail 服务实例
 */
export function createServiceAccountGmailService(env: Env): ServiceAccountGmailService {
    const clientEmail = env.SERVICE_ACCOUNT_CLIENT_EMAIL;
    const privateKey = env.SERVICE_ACCOUNT_PRIVATE_KEY;
    const subject = env.SERVICE_ACCOUNT_EMAIL;
    const kv = env.MAIL_SEND_CACHE;

    if (!clientEmail || !privateKey) {
        throw new Error('Service Account credentials not configured');
    }

    if (!kv) {
        throw new Error('GMAIL_TOKEN_CACHE KV namespace not configured');
    }

    return new ServiceAccountGmailService(clientEmail, privateKey, subject, kv);
}
