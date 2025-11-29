/**
 * Gmail Service
 * Gmail 邮件发送服务
 * 
 * 使用 Gmail API 通过 OAuth2 认证发送邮件
 */

/**
 * Gmail OAuth2 Token 响应接口
 */
interface GmailTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

/**
 * Gmail 邮件发送选项
 */
export interface GmailSendOptions {
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
 * Gmail 服务类
 */
export class GmailService {
    private clientId: string;
    private clientSecret: string;
    private refreshToken: string;

    constructor(clientId: string, clientSecret: string, refreshToken: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.refreshToken = refreshToken;
    }

    /**
     * 获取访问令牌
     * 使用 refresh token 获取新的 access token
     */
    private async getAccessToken(): Promise<string> {
        const tokenUrl = 'https://oauth2.googleapis.com/token';

        const params = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: this.refreshToken,
            grant_type: 'refresh_token',
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
        return data.access_token;
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
        lines.push(`Subject: ${subject}`);

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

        // 空行分隔头部和正文
        lines.push('');

        // 邮件正文
        lines.push(content);

        return lines.join('\r\n');
    }

    /**
     * 将字符串转换为 Base64URL 编码
     * 正确处理 UTF-8 编码,支持中文等多字节字符
     */
    private base64UrlEncode(str: string): string {
        // 将字符串转换为 Uint8Array (UTF-8 编码)
        const encoder = new TextEncoder();
        const data = encoder.encode(str);

        // 将 Uint8Array 转换为二进制字符串
        let binaryString = '';
        for (let i = 0; i < data.length; i++) {
            binaryString += String.fromCharCode(data[i]);
        }

        // 转换为 base64
        const base64 = btoa(binaryString);

        // 转换为 base64url (替换字符并移除填充)
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
            throw new Error(`Gmail send error: ${message}`);
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
            throw new Error(`Gmail get message error: ${message}`);
        }
    }
}

/**
 * 创建 Gmail 服务实例
 */
export function createGmailService(env: Env): GmailService {
    const clientId = env.GMAIL_CLIENT_ID;
    const clientSecret = env.GMAIL_CLIENT_SECRET;
    const refreshToken = env.GMAIL_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Gmail credentials not configured');
    }

    return new GmailService(clientId, clientSecret, refreshToken);
}
