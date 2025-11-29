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
