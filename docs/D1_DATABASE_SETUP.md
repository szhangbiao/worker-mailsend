# D1 数据库集成使用说明

本文档说明如何初始化和使用 Cloudflare D1 数据库来存储邮件发送记录。

## 数据库初始化

### 1. 创建本地开发数据库

```bash
wrangler d1 create mailsend-db-dev
```

### 2. 执行数据库迁移 (本地)

```bash
wrangler d1 execute mailsend-db-dev --local --file=./schema.sql
```

### 3. 创建生产数据库

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 导航到 **Workers & Pages** > **D1**
3. 点击 **Create database**
4. 数据库名称: `mailsend-db`
5. 复制生成的 **Database ID**
6. 更新 `wrangler.jsonc` 中的 `database_id` 字段

### 4. 执行数据库迁移 (生产)

```bash
wrangler d1 execute mailsend-db --remote --file=./schema.sql
```

## 数据库表结构

### email_logs 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键,自增 |
| message_id | TEXT | Gmail 消息 ID |
| thread_id | TEXT | Gmail 线程 ID |
| to_address | TEXT | 收件人邮箱 |
| subject | TEXT | 邮件主题 |
| from_address | TEXT | 发件人邮箱 (可选) |
| cc_addresses | TEXT | 抄送地址 (JSON 数组) |
| bcc_addresses | TEXT | 密送地址 (JSON 数组) |
| is_html | INTEGER | 是否为 HTML 格式 (0/1) |
| sent_at | TEXT | 发送时间 (ISO 8601) |
| created_at | TEXT | 记录创建时间 (ISO 8601) |

## 本地开发测试

### 启动本地开发服务器

```bash
npm run dev
```

### 发送测试邮件

```bash
curl -X POST http://localhost:8787/mail/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "测试邮件",
    "content": "这是一封测试邮件"
  }'
```

### 查询数据库记录

```bash
# 查看所有记录
wrangler d1 execute mailsend-db-dev --local --command="SELECT * FROM email_logs"

# 查看最近 10 条记录
wrangler d1 execute mailsend-db-dev --local --command="SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10"

# 按收件人查询
wrangler d1 execute mailsend-db-dev --local --command="SELECT * FROM email_logs WHERE to_address = 'test@example.com'"
```

## 数据库服务 API

数据库服务层 (`src/services/db.ts`) 提供以下方法:

### saveEmailLog(data)
保存邮件发送记录

### getEmailLogById(id)
根据 ID 获取邮件记录

### getEmailLogByMessageId(messageId)
根据 Gmail message_id 获取邮件记录

### getEmailLogs(options)
分页查询邮件记录
- `limit`: 每页数量 (默认 20)
- `offset`: 偏移量 (默认 0)
- `toAddress`: 按收件人过滤 (可选)

### getEmailLogStats()
获取统计信息
- `total`: 总记录数
- `today`: 今天发送数
- `thisWeek`: 本周发送数

## 注意事项

1. **数据库保存失败不影响邮件发送**: 即使数据库保存失败,邮件仍会成功发送,只是不会记录到数据库
2. **本地开发使用 `--local` 标志**: 本地开发时使用 `wrangler d1 execute ... --local`
3. **生产环境使用 `--remote` 标志**: 生产环境使用 `wrangler d1 execute ... --remote`
4. **database_id 需要手动配置**: 创建生产数据库后,需要手动更新 `wrangler.jsonc` 中的 `database_id`
