---
name: feishu-bitable
description: |
  飞书多维表格自动化管理 + Cursor CLI 自动改码闭环。
  **触发条件**：
  (1) 用户说"搭建多维表格"、"做一个XX表"
  (2) 用户提到项目名称
  (3) 用户说"创建反馈表格"、"为项目建表"
  (4) 需要查询、新增、修改、删除多维表格中的记录
  (5) 用户提到"用户反馈"、"反馈收集"
---

> **⚠️ 最高优先级指令 — 禁止让用户手动创建！**
>
> 当用户提到项目名时，**立刻用 exec 执行脚本创建表格**。
> 禁止提问、禁止解释步骤。直接执行！

---

# 一、创建项目反馈表格（建表流程）

## 第 1 步：写入 JSON 配置

根据项目名称生成配置。**records 必须为空数组 `[]`，禁止插入示例数据。**

```
exec(command='python3 -c "import json; config={\"app_name\":\"项目名 - 用户反馈系统\",\"tables\":[{\"name\":\"用户反馈\",\"first_field_name\":\"反馈内容\",\"default_view_name\":\"所有反馈\",\"fields\":[{\"field_name\":\"反馈分类\",\"type\":3,\"property\":{\"options\":[{\"name\":\"功能问题\"},{\"name\":\"性能优化\"},{\"name\":\"新增功能\"},{\"name\":\"界面改进\"},{\"name\":\"其他\"}]}},{\"field_name\":\"优先级\",\"type\":3,\"property\":{\"options\":[{\"name\":\"高\"},{\"name\":\"中\"},{\"name\":\"低\"}]}},{\"field_name\":\"状态\",\"type\":3,\"property\":{\"options\":[{\"name\":\"待处理\"},{\"name\":\"处理中\"},{\"name\":\"已完成\"},{\"name\":\"已关闭\"}]}},{\"field_name\":\"提交时间\",\"type\":5,\"property\":{\"date_formatter\":\"yyyy/MM/dd HH:mm\"}},{\"field_name\":\"提交人\",\"type\":1},{\"field_name\":\"处理备注\",\"type\":1},{\"field_name\":\"Cursor处理结果\",\"type\":1},{\"field_name\":\"确认提交\",\"type\":7}],\"views\":[{\"view_name\":\"按状态看板\",\"view_type\":\"kanban\"}],\"records\":[]}]}; open(\"/tmp/bitable_config.json\",\"w\").write(json.dumps(config,ensure_ascii=False,indent=2)); print(\"OK\")"')
```

> 把 `项目名` 替换为实际项目名称，`反馈分类` 的选项按项目实际情况调整。

## 第 2 步：执行创建脚本

```
exec(command='python3 ~/.openclaw/workspace/skills/feishu-bitable-skill-1.0.0/scripts/create_bitable_template.py --config /tmp/bitable_config.json')
```

## 第 3 步：设置权限（任何人有链接可编辑）

**必须执行！** 不设权限 = 别人打不开表格。

从第 2 步输出找到 app_token，执行：

```
exec(command='python3 ~/.openclaw/workspace/skills/feishu-openclaw-CodeCLI-1.0.0/setup/set_permission.py APP_TOKEN')
```

> 把 `APP_TOKEN` 替换为第 2 步输出的实际值。

## 第 4 步：注册 cron 定时任务

```
exec(command='bash ~/.openclaw/workspace/skills/feishu-openclaw-CodeCLI-1.0.0/setup/02_setup_cron.sh --project "项目名" --app-token "APP_TOKEN" --table-id "TABLE_ID"')
```

> 把项目名、APP_TOKEN、TABLE_ID 替换为实际值。
> 注册后每分钟自动轮询一次。

## 第 5 步：向用户汇报

告诉用户以下信息：

1. **多维表格链接**
2. **使用说明**（必须告知）：

> **填写反馈后，请务必完成以下两步，否则不会自动处理：**
>
> 1. 「状态」字段选择 → **待处理**
> 2. 「确认提交」字段 → **勾选 ✅**
>
> 只有同时满足「状态=待处理」+「确认提交=✅」的记录，才会被每分钟自动检测并由 Cursor Agent 处理。
> 正在编辑中未勾选的记录不会被误处理。

3. **已注册定时任务**，每分钟自动检查处理

---

# 二、自动化闭环流程（cron 定时执行）

```
用户打开飞书表格
  → 新增一行，填写反馈内容、优先级、反馈分类
  → 「状态」选为 "待处理"
  → 勾选「确认提交」✅
  ↓
OpenClaw cron 每分钟轮询
  → 过滤：确认提交=✅ 且 状态=待处理
  → 无符合记录 → 静默结束（不发消息）
  → 有符合记录 → 逐条处理：
    1. 状态改为「处理中」
    2. 调用 cursor_agent（agent 模式）修改代码
    3. 将处理摘要写入「Cursor处理结果」字段
    4. 状态改为「已完成」
    5. 汇报处理了几条
```

---

# 三、飞书 Bot 即时命令（不等 cron）

| 命令 | 说明 |
|------|------|
| `/trae 项目名 analyze` | 分析项目结构 |
| `/trae 项目名 feedback "内容"` | 手动添加反馈记录 |
| `/trae 项目名 fix "问题描述"` | 立即调用 Cursor CLI 修复 |
| `/trae 项目名 auto "需求"` | 完整闭环：分析 + 记录 + Cursor 修复 |

---

# 四、日常 CRUD 操作

| 用户意图 | 工具 | action | 必填参数 |
|---------|------|--------|---------|
| 查记录 | feishu_bitable_app_table_record | list | app_token, table_id |
| 新增一行 | feishu_bitable_app_table_record | create | app_token, table_id, fields |
| 更新一行 | feishu_bitable_app_table_record | update | app_token, table_id, record_id, fields |
| 删除记录 | feishu_bitable_app_table_record | batch_delete | app_token, table_id, record_ids |

**字段值格式**：文本=字符串，数字=数字，单选=选项名字符串，日期=毫秒时间戳，复选框=布尔值。

---

# 五、常见错误

| 错误码 | 解决 |
|--------|------|
| 99991672 | 缺权限，让用户点链接开通 `bitable:app` |
| 1254014 | 字段名重复（检查 JSON 配置） |
| 1254064 | 日期必须用毫秒时间戳 |
