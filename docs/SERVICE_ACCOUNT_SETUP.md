# 使用 Service Account 发送邮件

本文档介绍如何在 Cloudflare Worker 中使用 Google Service Account 通过 Gmail API 发送邮件。

## 什么是 Service Account?

Service Account 是 Google Cloud 提供的一种服务账号,适用于服务器到服务器的认证场景。与 OAuth2 用户授权不同:

- **OAuth2 用户授权**: 需要用户手动授权,使用 refresh token 获取 access token
- **Service Account**: 使用 JWT (JSON Web Token) 自动认证,无需用户交互

## 优势

1. **无需用户交互**: 完全自动化,不需要手动获取 refresh token
2. **更安全**: 使用私钥签名 JWT,不会过期
3. **适合服务器场景**: 专为后端服务设计
4. **域范围委派**: 可以代表 Google Workspace 中的任何用户发送邮件

## 前置要求

### 1. Google Cloud 项目设置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建或选择一个项目
3. 启用 Gmail API:
   - 导航到 "APIs & Services" > "Library"
   - 搜索 "Gmail API"
   - 点击 "Enable"

### 2. 创建 Service Account

1. 在 Google Cloud Console 中,导航到 "IAM & Admin" > "Service Accounts"
2. 点击 "Create Service Account"
3. 填写信息:
   - **Service account name**: 例如 `worker-mailsend`
   - **Service account ID**: 自动生成
   - **Description**: 例如 `Cloudflare Worker email service`
4. 点击 "Create and Continue"
5. 跳过权限设置 (点击 "Continue")
6. 点击 "Done"

### 3. 创建 Service Account 密钥

1. 在 Service Accounts 列表中,点击刚创建的 service account
2. 切换到 "Keys" 标签
3. 点击 "Add Key" > "Create new key"
4. 选择 "JSON" 格式
5. 点击 "Create" - 会自动下载一个 JSON 文件

**重要**: 妥善保管这个 JSON 文件,它包含私钥信息!

JSON 文件格式示例:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "worker-mailsend@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

### 4. 配置域范围委派 (Domain-Wide Delegation)

**注意**: 这一步只有在使用 Google Workspace 时才需要。如果你只是想从 Service Account 自己的邮箱发送邮件,可以跳过此步骤。

如果你需要代表 Google Workspace 中的其他用户发送邮件:

1. 在 Service Account 详情页面,点击 "Show Domain-Wide Delegation"
2. 勾选 "Enable Google Workspace Domain-wide Delegation"
3. 记下 "Client ID"

4. 访问 [Google Workspace Admin Console](https://admin.google.com/)
5. 导航到 "Security" > "Access and data control" > "API controls"
6. 在 "Domain-wide delegation" 部分,点击 "Manage Domain Wide Delegation"
7. 点击 "Add new"
8. 填写:
   - **Client ID**: 你的 Service Account 的 Client ID
   - **OAuth Scopes**: `https://www.googleapis.com/auth/gmail.send`
9. 点击 "Authorize"

## 配置环境变量

在 Cloudflare Worker 中配置以下环境变量:

### 方式 1: 使用完整的 JSON (推荐用于开发)

在 `.dev.vars` 文件中:

```env
# Service Account 认证方式
SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project-id",...}
SERVICE_ACCOUNT_EMAIL=user@yourdomain.com
```

### 方式 2: 分别配置各个字段 (推荐用于生产)

在 `.dev.vars` 文件中:

```env
# Service Account 认证方式
SERVICE_ACCOUNT_CLIENT_EMAIL=worker-mailsend@your-project.iam.gserviceaccount.com
SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n
SERVICE_ACCOUNT_EMAIL=user@yourdomain.com
```

在 `wrangler.jsonc` 中添加 secrets (生产环境):

```bash
# 设置 secrets
npx wrangler secret put SERVICE_ACCOUNT_CLIENT_EMAIL
npx wrangler secret put SERVICE_ACCOUNT_PRIVATE_KEY
npx wrangler secret put SERVICE_ACCOUNT_EMAIL
```

### 环境变量说明

- `SERVICE_ACCOUNT_CLIENT_EMAIL`: Service Account 的邮箱地址 (从 JSON 文件中的 `client_email` 字段获取)
- `SERVICE_ACCOUNT_PRIVATE_KEY`: Service Account 的私钥 (从 JSON 文件中的 `private_key` 字段获取)
- `SERVICE_ACCOUNT_EMAIL`: 要代表的用户邮箱 (如果使用域范围委派)。如果不设置,则使用 Service Account 自己的身份

## 使用说明

### 代码已自动支持

代码已经更新为同时支持 OAuth2 和 Service Account 两种认证方式:

1. **优先使用 Service Account**: 如果配置了 `SERVICE_ACCOUNT_CLIENT_EMAIL` 和 `SERVICE_ACCOUNT_PRIVATE_KEY`,则使用 Service Account 认证
2. **回退到 OAuth2**: 如果没有配置 Service Account,则使用原有的 OAuth2 认证方式

### 发送邮件示例

```bash
curl -X POST http://localhost:8787/api/mail/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Test Email via Service Account",
    "content": "This email was sent using Google Service Account!",
    "isHtml": false
  }'
```

## 注意事项

### 1. Service Account 邮箱限制

如果不使用域范围委派,Service Account 只能从它自己的邮箱地址发送邮件。但是:
- Service Account 的邮箱地址 (例如 `xxx@xxx.iam.gserviceaccount.com`) 不是真实的邮箱
- 收件人可能会将这类邮件标记为垃圾邮件

**解决方案**:
1. 使用域范围委派,代表真实用户发送邮件
2. 或者使用 OAuth2 方式 (原有方式)

### 2. 私钥安全

- **永远不要**将私钥提交到 Git 仓库
- 在生产环境使用 Cloudflare Workers Secrets 存储私钥
- 定期轮换 Service Account 密钥

### 3. API 配额

Gmail API 有使用配额限制:
- 每天最多发送 2,000 封邮件 (Google Workspace 用户)
- 每秒最多 250 个请求

### 4. JWT 签名

Service Account 认证使用 JWT,需要:
- 使用 RS256 算法签名
- JWT 有效期为 1 小时
- 代码会自动处理 JWT 的生成和缓存

## 故障排查

### 错误: "Invalid JWT Signature"

- 检查私钥格式是否正确
- 确保私钥包含完整的 `-----BEGIN PRIVATE KEY-----` 和 `-----END PRIVATE KEY-----`
- 检查换行符是否正确 (`\n`)

### 错误: "Delegation denied"

- 确保已在 Google Workspace Admin Console 中配置域范围委派
- 检查 OAuth Scopes 是否包含 `https://www.googleapis.com/auth/gmail.send`
- 确保 `SERVICE_ACCOUNT_EMAIL` 是你域中的有效用户

### 错误: "Insufficient Permission"

- 确保 Gmail API 已启用
- 检查 Service Account 是否有正确的权限
- 如果使用域范围委派,确保目标用户有 Gmail 访问权限

## 参考资料

- [Google Service Accounts 文档](https://cloud.google.com/iam/docs/service-accounts)
- [Gmail API 文档](https://developers.google.com/gmail/api)
- [Domain-Wide Delegation 文档](https://developers.google.com/identity/protocols/oauth2/service-account#delegatingauthority)
- [JWT 规范](https://tools.ietf.org/html/rfc7519)
