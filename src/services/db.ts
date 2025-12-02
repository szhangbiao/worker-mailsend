/**
 * Database Service
 * 数据库服务层
 * 
 * 封装所有 D1 数据库操作
 */

import type { EmailLog, EmailLogInsert } from '../types';

/**
 * 数据库服务类
 */
export class DatabaseService {
    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    /**
     * 保存邮件发送记录
     */
    async saveEmailLog(data: EmailLogInsert): Promise<EmailLog> {
        try {
            const result = await this.db
                .prepare(
                    `INSERT INTO email_logs (
                        message_id, thread_id, to_address, subject,
                        from_address, cc_addresses, bcc_addresses,
                        is_html, sent_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
                )
                .bind(
                    data.message_id,
                    data.thread_id,
                    data.to_address,
                    data.subject,
                    data.from_address || null,
                    data.cc_addresses ? JSON.stringify(data.cc_addresses) : null,
                    data.bcc_addresses ? JSON.stringify(data.bcc_addresses) : null,
                    data.is_html ? 1 : 0,
                    data.sent_at
                )
                .run();

            // 获取插入的记录
            if (result.success) {
                const inserted = await this.getEmailLogById(result.meta.last_row_id);
                if (inserted) {
                    return inserted;
                }
            }
            throw new Error('Failed to save email log');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Database save error: ${message}`);
        }
    }

    /**
     * 根据 ID 获取邮件记录
     */
    async getEmailLogById(id: number): Promise<EmailLog | null> {
        try {
            const result = await this.db
                .prepare('SELECT * FROM email_logs WHERE id = ?')
                .bind(id)
                .first<EmailLog>();

            if (result) {
                return this.parseEmailLog(result);
            }
            return null;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Database query error: ${message}`);
        }
    }

    /**
     * 根据 message_id 获取邮件记录
     */
    async getEmailLogByMessageId(messageId: string): Promise<EmailLog | null> {
        try {
            const result = await this.db
                .prepare('SELECT * FROM email_logs WHERE message_id = ?')
                .bind(messageId)
                .first<EmailLog>();

            if (result) {
                return this.parseEmailLog(result);
            }
            return null;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Database query error: ${message}`);
        }
    }

    /**
     * 删除邮件记录
     */
    async deleteEmailLog(id: number): Promise<boolean> {
        try {
            const result = await this.db
                .prepare('DELETE FROM email_logs WHERE id = ?')
                .bind(id)
                .run();

            return result.success && (result.meta.changes ?? 0) > 0;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Database delete error: ${message}`);
        }
    }

    /**
     * 根据 message_id 删除邮件记录
     */
    async deleteEmailLogByMessageId(messageId: string): Promise<boolean> {
        try {
            const result = await this.db
                .prepare('DELETE FROM email_logs WHERE message_id = ?')
                .bind(messageId)
                .run();

            return result.success && (result.meta.changes ?? 0) > 0;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Database delete error: ${message}`);
        }
    }

    /**
     * 分页查询邮件记录
     */
    async getEmailLogs(options: {
        limit?: number;
        offset?: number;
        toAddress?: string;
    } = {}): Promise<{ logs: EmailLog[]; hasMore: boolean }> {
        try {
            const { limit = 20, offset = 0, toAddress } = options;

            // 构建查询条件
            let whereClause = '';
            const bindings: any[] = [];

            if (toAddress) {
                whereClause = 'WHERE to_address = ?';
                bindings.push(toAddress);
            }

            // 多查询一条记录来判断是否有下一页
            const query = `
                SELECT * FROM email_logs 
                ${whereClause}
                ORDER BY sent_at DESC 
                LIMIT ? OFFSET ?
            `;
            const result = await this.db
                .prepare(query)
                .bind(...bindings, limit + 1, offset)
                .all<EmailLog>();

            const hasMore = result.results.length > limit;

            const logs = hasMore
                ? result.results.slice(0, limit).map(log => this.parseEmailLog(log))
                : result.results.map(log => this.parseEmailLog(log));

            return { logs, hasMore };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Database query error: ${message}`);
        }
    }

    /**
     * 解析邮件记录
     * 将 JSON 字符串字段转换为数组
     */
    private parseEmailLog(log: any): EmailLog {
        return {
            ...log,
            is_html: Boolean(log.is_html),
            cc_addresses: log.cc_addresses ? JSON.parse(log.cc_addresses) : null,
            bcc_addresses: log.bcc_addresses ? JSON.parse(log.bcc_addresses) : null,
        };
    }
}

/**
 * 创建数据库服务实例
 */
export function createDatabaseService(env: Env): DatabaseService {
    if (!env.mailsend_db) {
        throw new Error('D1 database not configured');
    }
    return new DatabaseService(env.mailsend_db);
}
