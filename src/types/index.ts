/**
 * Type Definitions
 * 类型定义文件
 */

/**
 * API 响应基础接口
 */
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

/**
 * Gmail OAuth2 Token 响应接口
 * 用于 OAuth2 和 Service Account 认证
 */
export interface GmailTokenResponse {
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
 * 邮件发送请求接口
 */
export interface SendMailRequest {
    to: string;
    subject: string;
    content: string;
    cc?: string[];
    bcc?: string[];
    from?: string;
    replyTo?: string;
    isHtml?: boolean; // 是否为 HTML 格式
}

/**
 * 邮件发送响应数据
 */
export interface SendMailData {
    id: string;
    threadId: string; // Gmail 线程 ID
    to: string;
    subject: string;
    sentAt: string;
}

/**
 * 邮件状态数据
 */
export interface MailStatusData {
    id: string;
    status: 'pending' | 'sent' | 'delivered' | 'failed';
    threadId?: string; // Gmail 线程 ID
    snippet?: string; // 邮件摘要
    checkedAt: string;
}

/**
 * 健康检查响应
 */
export interface HealthCheck {
    status: 'ok' | 'error';
    timestamp: string;
}

/**
 * 邮件日志记录（数据库）
 */
export interface EmailLog {
    id: number;
    message_id: string;
    thread_id: string;
    to_address: string;
    subject: string;
    from_address: string | null;
    cc_addresses: string[] | null;
    bcc_addresses: string[] | null;
    is_html: boolean;
    sent_at: string;
    created_at: string;
}

/**
 * 邮件日志插入数据
 */
export interface EmailLogInsert {
    message_id: string;
    thread_id: string;
    to_address: string;
    subject: string;
    from_address?: string;
    cc_addresses?: string[];
    bcc_addresses?: string[];
    is_html?: boolean;
    sent_at: string;
}

/**
 * 邮件历史查询请求参数
 */
export interface EmailHistoryQuery {
    page?: number;        // 页码,从 1 开始
    pageSize?: number;    // 每页数量,默认 20
    toAddress?: string;   // 按收件人过滤
}

/**
 * 邮件历史查询响应数据
 */
export interface EmailHistoryData {
    logs: EmailLog[];     // 邮件记录列表
    pagination: {
        page: number;      // 当前页码
        pageSize: number;  // 每页数量
        hasMore: boolean;  // 是否有下一页
    };
}


