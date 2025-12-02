# 邮件历史查询 API 文档

## 接口信息

- **路径**: `GET /mail/history`
- **描述**: 查询邮件发送历史记录,支持分页和按收件人过滤

## 请求参数

### Query Parameters

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码,从 1 开始 |
| pageSize | number | 否 | 20 | 每页数量,范围 1-100 |
| toAddress | string | 否 | - | 按收件人邮箱过滤 |

## 响应格式

### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "message_id": "19ade4560eb93ad2",
        "thread_id": "19ade4560eb93ad2",
        "to_address": "szhangbiao@gmail.com",
        "subject": "测试邮件",
        "from_address": "noreply@szhangbiao.cn",
        "cc_addresses": null,
        "bcc_addresses": null,
        "is_html": false,
        "sent_at": "2025-12-02T08:54:40.542Z",
        "created_at": "2025-12-02 08:54:40"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "hasMore": false
    }
  }
}
```

### 错误响应 (400)

```json
{
  "success": false,
  "error": "Page must be greater than 0"
}
```

## 使用示例

### 示例 1: 查询第一页 (默认每页 20 条)

```bash
curl http://localhost:8787/mail/history
```

### 示例 2: 查询第 2 页,每页 10 条

```bash
curl "http://localhost:8787/mail/history?page=2&pageSize=10"
```

### 示例 3: 查询发送给特定收件人的邮件

```bash
curl "http://localhost:8787/mail/history?toAddress=szhangbiao@gmail.com"
```

### 示例 4: 组合查询 - 特定收件人的第 2 页

```bash
curl "http://localhost:8787/mail/history?page=2&pageSize=10&toAddress=szhangbiao@gmail.com"
```

## 响应字段说明

### logs 数组字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 记录 ID |
| message_id | string | Gmail 消息 ID |
| thread_id | string | Gmail 线程 ID |
| to_address | string | 收件人邮箱 |
| subject | string | 邮件主题 |
| from_address | string \| null | 发件人邮箱 |
| cc_addresses | string[] \| null | 抄送地址列表 |
| bcc_addresses | string[] \| null | 密送地址列表 |
| is_html | boolean | 是否为 HTML 格式 |
| sent_at | string | 发送时间 (ISO 8601) |
| created_at | string | 记录创建时间 |

### pagination 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| page | number | 当前页码 |
| pageSize | number | 每页数量 |
| hasMore | boolean | 是否有下一页 |

## 优化说明

**为什么使用 `hasMore` 而不是 `total`?**

Cloudflare D1 按读取的行数计费,`SELECT COUNT(*)` 会扫描整个表,在数据量大时会消耗大量配额。使用 `hasMore` 标志只需多查询一条记录即可判断是否有下一页,大大减少了读取行数。

**如何判断是否有下一页?**

- `hasMore: true` - 还有更多数据,可以请求下一页
- `hasMore: false` - 已经是最后一页了

## 参数验证规则

- `page` 必须 >= 1
- `pageSize` 必须在 1-100 之间
- `toAddress` 为可选参数,用于精确匹配收件人邮箱

## 注意事项

1. **分页从 1 开始**: 第一页是 `page=1`,不是 `page=0`
2. **最大每页数量**: 为了性能考虑,`pageSize` 最大为 100
3. **排序规则**: 默认按发送时间降序排列 (最新的在前)
4. **过滤精确匹配**: `toAddress` 参数使用精确匹配,不支持模糊查询
