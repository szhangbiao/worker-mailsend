-- Email Logs Table
-- 邮件发送日志表
CREATE TABLE IF NOT EXISTS email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    to_address TEXT NOT NULL,
    subject TEXT NOT NULL,
    from_address TEXT,
    cc_addresses TEXT,
    bcc_addresses TEXT,
    is_html INTEGER DEFAULT 0,
    sent_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(message_id)
);

-- Indexes for better query performance
-- 为常用查询创建索引
CREATE INDEX IF NOT EXISTS idx_email_logs_message_id ON email_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_to_address ON email_logs(to_address);
