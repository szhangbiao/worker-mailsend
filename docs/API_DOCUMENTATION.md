# 邮件 API 文档

## 接口列表

### 1. 发送邮件
- **路径**: `POST /mail/send`
- **描述**: 发送邮件并保存记录到数据库

### 2. 查询邮件状态
- **路径**: `GET /mail/status/:id`
- **描述**: 从 Gmail 查询邮件发送状态

### 3. 查询邮件历史
- **路径**: `GET /mail/history`
- **描述**: 分页查询邮件发送历史记录

### 4. 查询邮件详情 ⭐ 新增
- **路径**: `GET /mail/detail/:id`
- **描述**: 根据 ID 查询单条邮件记录详情

### 5. 删除邮件记录 ⭐ 新增
- **路径**: `DELETE /mail/:id`
- **描述**: 根据 ID 删除邮件记录

---

## 详细说明

### 4. 查询邮件详情

**请求**
```
GET /mail/detail/:id
```

**路径参数**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 邮件记录 ID |

**成功响应 (200)**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "message_id": "19ade4560eb93ad2",
    "thread_id": "19ade4560eb93ad2",
    "to_address": "szhangbiao@gmail.com",
    "subject": "测试邮件",
    "from_address": "noreply@szhangbiao.cn",
    "cc_addresses": ["cc@example.com"],
    "bcc_addresses": null,
    "is_html": false,
    "sent_at": "2025-12-02T08:54:40.542Z",
    "created_at": "2025-12-02 08:54:40"
  }
}
```

**错误响应 (404)**
```json
{
  "success": false,
  "error": "Email not found"
}
```

**使用示例**
```bash
# 查询 ID 为 1 的邮件详情
curl http://localhost:8787/mail/detail/1
```

---

### 5. 删除邮件记录

**请求**
```
DELETE /mail/:id
```

**路径参数**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 邮件记录 ID |

**成功响应 (200)**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "deleted": true
  },
  "message": "Email deleted successfully"
}
```

**错误响应 (404)**
```json
{
  "success": false,
  "error": "Email not found or already deleted"
}
```

**使用示例**
```bash
# 删除 ID 为 1 的邮件记录
curl -X DELETE http://localhost:8787/mail/1
```

---

## 注意事项

### 查询详情
- ID 必须是有效的数字
- 只能查询数据库中存在的记录
- 返回完整的邮件记录信息,包括抄送、密送等

### 删除记录
- **仅删除数据库记录**,不会删除 Gmail 中的实际邮件
- 删除操作不可恢复
- 删除不存在的记录会返回 404 错误
- 重复删除同一记录也会返回 404

## 完整 API 列表

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/mail/send` | 发送邮件 |
| GET | `/mail/status/:id` | 查询邮件状态 (Gmail) |
| GET | `/mail/history` | 查询历史记录 (分页) |
| GET | `/mail/detail/:id` | 查询邮件详情 |
| DELETE | `/mail/:id` | 删除邮件记录 |
