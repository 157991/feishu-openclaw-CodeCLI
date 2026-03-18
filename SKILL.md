---
name: feishu-bitable
description: |
  飞书多维表格自动化管理：提到项目名 → 直接 exec 跑脚本创建表格。
  **当以下情况时使用此 Skill**：
  (1) 用户说"搭建多维表格"、"做一个XX表"、"搭一个XX系统"
  (2) 用户提到项目名称（如"trae导出记录"）
  (3) 用户说"创建反馈表格"、"为项目建表"
  (4) 需要查询、新增、修改、删除多维表格中的记录
  (5) 用户提到"多维表格"、"bitable"、"数据表"、"记录"、"字段"
  (6) 用户提到"用户反馈"、"反馈收集"
---

> **⚠️ 最高优先级指令 — 禁止让用户手动创建！**
>
> 当用户提到任何已知项目名时（如"trae导出记录"），**立刻用 exec 执行 Python 脚本创建表格**。
> 禁止提问、禁止解释步骤、禁止让用户去飞书后台操作。直接执行！
>
> 脚本路径：`~/.openclaw/workspace/skills/feishu-bitable-skill-1.0.0/scripts/create_bitable_template.py`
> 凭据：脚本自动从 `~/.openclaw/openclaw.json` → `channels.feishu.appId/appSecret` 读取。
>
> **权限不足时（报错 code=99991672）**，告诉用户点击链接开通：
> https://open.feishu.cn/app/cli_a7675b97e07d9013/auth?q=bitable:app,base:app:create&op_from=openapi&token_type=tenant
> 用户说"好了"后，重新执行脚本。

---

# 一、已知项目 — 直接创建（提到项目名就执行）

## 项目：trae导出记录

触发词：`trae导出记录`、`trae项目`、`trae反馈表`、`为trae创建表格`

**按顺序执行以下命令，不要跳过任何一步：**

### 第 1 步：写入配置

```
exec(command='python3 -c "import json; config={\"app_name\":\"trae导出记录 - 用户反馈系统\",\"tables\":[{\"name\":\"用户反馈\",\"first_field_name\":\"反馈内容\",\"default_view_name\":\"所有反馈\",\"fields\":[{\"field_name\":\"反馈分类\",\"type\":3,\"property\":{\"options\":[{\"name\":\"导出问题\"},{\"name\":\"数据格式\"},{\"name\":\"性能优化\"},{\"name\":\"新增功能\"},{\"name\":\"界面改进\"},{\"name\":\"文档补充\"}]}},{\"field_name\":\"优先级\",\"type\":3,\"property\":{\"options\":[{\"name\":\"高\"},{\"name\":\"中\"},{\"name\":\"低\"}]}},{\"field_name\":\"状态\",\"type\":3,\"property\":{\"options\":[{\"name\":\"待处理\"},{\"name\":\"处理中\"},{\"name\":\"已完成\"},{\"name\":\"已关闭\"}]}},{\"field_name\":\"提交时间\",\"type\":5,\"property\":{\"date_formatter\":\"yyyy/MM/dd HH:mm\"}},{\"field_name\":\"提交人\",\"type\":1},{\"field_name\":\"关联文件\",\"type\":1},{\"field_name\":\"处理备注\",\"type\":1},{\"field_name\":\"Cursor处理结果\",\"type\":1},{\"field_name\":\"确认提交\",\"type\":7}],\"views\":[{\"view_name\":\"按状态看板\",\"view_type\":\"kanban\"},{\"view_name\":\"按优先级看板\",\"view_type\":\"kanban\"}],\"records\":[{\"反馈内容\":\"导出大量对话记录时速度较慢\",\"反馈分类\":\"性能优化\",\"优先级\":\"高\",\"状态\":\"待处理\",\"提交时间\":1741881600000,\"提交人\":\"研发用户\"},{\"反馈内容\":\"希望支持批量导出多个工作区\",\"反馈分类\":\"新增功能\",\"优先级\":\"中\",\"状态\":\"待处理\",\"提交时间\":1741881600000,\"提交人\":\"研发用户\"}]}]}; open(\"/tmp/bitable_config.json\",\"w\").write(json.dumps(config,ensure_ascii=False,indent=2)); print(\"OK\")"')
```

### 第 2 步：执行创建脚本

```
exec(command='python3 ~/.openclaw/workspace/skills/feishu-bitable-skill-1.0.0/scripts/create_bitable_template.py --config /tmp/bitable_config.json')
```

**如果报错 code=99991672**，回复用户：
> 飞书应用缺少多维表格权限，请点击以下链接开通，开通后告诉我：
> https://open.feishu.cn/app/cli_a7675b97e07d9013/auth?q=bitable:app,base:app:create&op_from=openapi&token_type=tenant

用户说"好了"/"开通了"后，重新执行第 2 步。

### 第 2.5 步：设置表格权限（必须执行）

从第 2 步输出中找到 `app_token`，然后执行：

```
exec(command='python3 -c "import json,requests,sys; cfg=json.load(open(\"${HOME}/.openclaw/openclaw.json\")); r=requests.post(\'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal\',json={\'app_id\':cfg[\'channels\'][\'feishu\'][\'appId\'],\'app_secret\':cfg[\'channels\'][\'feishu\'][\'appSecret\']}); t=r.json()[\'tenant_access_token\']; resp=requests.patch(f\'https://open.feishu.cn/open-apis/drive/v1/permissions/{APP_TOKEN}/public\',params={\'type\':\'bitable\'},headers={\'Authorization\':\'Bearer \'+t,\'Content-Type\':\'application/json\'},json={\'external_access_entity\':\'open\',\'security_entity\':\'anyone_can_edit\',\'link_share_entity\':\'tenant_editable\',\'invite_external\":False}); print(resp.json())"')
```

> 将 `{APP_TOKEN}` 替换为第 2 步输出的实际 app_token 值。
> 设置成功后表格对组织内所有人**可编辑**，无需手动分享权限。

### 第 3 步：创建配置文档

从第 2 步输出中找到 `__CONFIG_DOC_READY__` 标记，然后：

```
exec(command='cat /tmp/bitable_config_doc.md')
```

将 cat 输出的**完整内容原样**传给 `feishu_create_doc`：
```
feishu_create_doc(title="从 __CONFIG_DOC_TITLE__ 获取", markdown="cat 的完整输出，一字不改")
```

### 第 4 步：向用户汇报

从第 2 步输出的 `__RESULT_JSON__` 中解析 `app_token`、`link`、`table_id`，告诉用户：

1. **多维表格链接**：`link` 的值
2. **配置文档链接**：第 3 步创建的文档链接
3. **下一步配置**：将 app_token 和 table_id 配到 `~/.openclaw/openclaw.json`：
   ```
   plugins.entries.trae-feedback-automation.config.bitableTables.trae导出记录 = {
     "app_token": "xxx",
     "table_id": "xxx"
   }
   ```
   配好后执行 `openclaw gateway restart`，之后 `/trae trae导出记录 auto "需求"` 就能自动闭环。

---


---

## 项目：智引官网

触发词：`智引官网`、`官网项目`、`官网反馈表`

**按顺序执行，步骤同 trae导出记录，但 JSON 配置改为：**

### 第 1 步：写入配置

```
exec(command='python3 -c "import json; config={\"app_name\":\"智引官网 - 官网反馈系统\",\"tables\":[{\"name\":\"官网反馈\",\"first_field_name\":\"反馈内容\",\"default_view_name\":\"所有反馈\",\"fields\":[{\"field_name\":\"反馈分类\",\"type\":3,\"property\":{\"options\":[{\"name\":\"官网内容\"},{\"name\":\"功能问题\"},{\"name\":\"性能优化\"},{\"name\":\"新增功能\"},{\"name\":\"界面改进\"}]}},{\"field_name\":\"优先级\",\"type\":3,\"property\":{\"options\":[{\"name\":\"高\"},{\"name\":\"中\"},{\"name\":\"低\"}]}},{\"field_name\":\"状态\",\"type\":3,\"property\":{\"options\":[{\"name\":\"待处理\"},{\"name\":\"处理中\"},{\"name\":\"已完成\"},{\"name\":\"已关闭\"}]}},{\"field_name\":\"提交时间\",\"type\":5,\"property\":{\"date_formatter\":\"yyyy/MM/dd HH:mm\"}},{\"field_name\":\"提交人\",\"type\":1},{\"field_name\":\"处理备注\",\"type\":1},{\"field_name\":\"Cursor处理结果\",\"type\":1},{\"field_name\":\"确认提交\",\"type\":7}],\"views\":[{\"view_name\":\"按状态看板\",\"view_type\":\"kanban\"}],\"records\":[]}]}; open(\\\"/tmp/bitable_config.json\\\",\\\"w\\\").write(json.dumps(config,ensure_ascii=False,indent=2)); print(\\\"OK\\\")"')
```

### 第 2 步：执行创建脚本（同 trae导出记录）

```
exec(command='python3 ~/.openclaw/workspace/skills/feishu-bitable-skill-1.0.0/scripts/create_bitable_template.py --config /tmp/bitable_config.json')
```

第 2.5 步设置权限（同上，替换 app_token），第 3-4 步同 trae导出记录。

---
# 二、新项目 — 先扫描再建表

当用户提到的项目**不在上面的已知项目列表中**时：

## Step 1: 扫描项目文档

```
exec(command='for f in README.md README_CN.md README.txt DESIGN.md ARCHITECTURE.md docs/README.md; do [ -f "{项目路径}/$f" ] && echo "=== $f ===" && cat "{项目路径}/$f"; done')
```

```
exec(command='find "{项目路径}" -maxdepth 2 -type f -not -path "*/node_modules/*" -not -path "*/.git/*" | head -30')
```

## Step 2: 没找到文档 → Cursor CLI 总结

```
cursor_agent(project: "{项目名}", prompt: "分析项目核心功能、技术栈，用户可能提什么反馈", mode: "ask")
```

## Step 3: 设计 JSON + 执行

根据项目理解设计 JSON（参考 trae导出记录 的格式），用 python3 写入 `/tmp/bitable_config.json`，然后：

```
exec(command='python3 ~/.openclaw/workspace/skills/feishu-bitable-skill-1.0.0/scripts/create_bitable_template.py --config /tmp/bitable_config.json')
```

后续同「已知项目」的第 3-4 步。

---

# 三、从零搭建通用表格

> 当用户要搭建的不是项目反馈表，而是其他业务系统（CRM、项目管理、进销存等），走此流程。

## Phase 1: 需求分析（内部思考，禁止提问）

直接读模式库 [references/system-patterns.md](references/system-patterns.md)，匹配最接近的模式。

## Phase 2: 设计 JSON + 执行

**字段类型速查：**

| type | 字段 | property |
|------|------|----------|
| 1 | 文本 | 省略 |
| 2 | 数字 | `formatter:"0.00"` |
| 3 | 单选 | `options:[{name:"选项名"}]` |
| 4 | 多选 | 同单选 |
| 5 | 日期 | `date_formatter:"yyyy/MM/dd"` |
| 7 | 复选框 | 省略 |
| 11 | 人员 | `multiple:bool` |
| 13 | 电话 | 省略 |
| 15 | 超链接 | **property 必须完全省略** |
| 17 | 附件 | 省略 |
| 20 | 公式 | 占位 |
| 99001 | 货币 | `currency_code:"CNY"` |

**视图类型：** `grid`、`kanban`、`gallery`、`gantt`

用 python3 写入 JSON 后执行创建脚本，同上。

## Phase 3: 创建配置文档 + 汇报

同「已知项目」第 3-4 步。

## Phase 4: 按文档修改表格

用户修改文档后：
1. `feishu_fetch_doc` 读取修改
2. `feishu_bitable_app_table_field` → create/update/delete
3. 汇报修改结果

---


# 三-B、自动轮询 + Cursor CLI 闭环（已配置 cron）

> **系统已配置每小时自动轮询**，无需手动触发。
> cron 任务名：`trae反馈自动处理`，每 1 小时执行一次。

## 自动化流程

```
┌─────────────┐     ┌──────────┐     ┌──────────────────┐     ┌───────────────┐     ┌──────────────┐
│ 用户填写反馈 │ ──→ │ 勾选     │ ──→ │ cron 每小时轮询  │ ──→ │ Cursor CLI    │ ──→ │ 更新表格状态  │
│ (多维表格)   │     │「确认提交」│     │ 查「确认提交」且  │     │ agent 模式    │     │ + 处理结果    │
└─────────────┘     └──────────┘     │「待处理」的记录   │     │ 修改项目代码   │     └──────────────┘
                                      └──────────────────┘     └───────────────┘
```

> **防误触机制**：只有用户填完反馈内容并勾选「确认提交」复选框后，cron 才会识别并处理该记录。
> 正在编辑中的草稿（未勾选）不会被处理。

## 已保存的表格配置

| 项目         | app_token                  | table_id           |
|-------------|----------------------------|--------------------|
| trae导出记录 | NVICbOvVxaIbNvscppDc26rHnUd | tblMa2rmZSxrXSD9   |

表格链接：https://feishu.cn/base/NVICbOvVxaIbNvscppDc26rHnUd

## 手动触发轮询

如果不想等 cron，可以手动执行：

```
exec(command='export PATH=~/.nvm/versions/node/v24.13.1/bin:$PATH && openclaw cron run trae反馈自动处理')
```

## 手动管理 cron

```
# 查看所有 cron 任务
exec(command='export PATH=~/.nvm/versions/node/v24.13.1/bin:$PATH && openclaw cron list')

# 暂停自动轮询
exec(command='export PATH=~/.nvm/versions/node/v24.13.1/bin:$PATH && openclaw cron disable trae反馈自动处理')

# 恢复自动轮询
exec(command='export PATH=~/.nvm/versions/node/v24.13.1/bin:$PATH && openclaw cron enable trae反馈自动处理')

# 查看运行历史
exec(command='export PATH=~/.nvm/versions/node/v24.13.1/bin:$PATH && openclaw cron runs trae反馈自动处理')
```

## /trae 命令（手动操作）

除了自动轮询，也可以在飞书 Bot 中手动操作：

| 命令 | 说明 |
|------|------|
| `/trae trae导出记录 analyze` | 分析项目结构 |
| `/trae trae导出记录 feedback "内容"` | 手动添加反馈记录 |
| `/trae trae导出记录 fix "问题描述"` | 调用 Cursor CLI 修复代码 |
| `/trae trae导出记录 auto "需求"` | 完整自动化：分析 + 记录 + Cursor 修复 |

---

# 四、日常 CRUD 操作

| 用户意图 | 工具 | action | 必填参数 |
|---------|------|--------|---------|
| 查记录 | feishu_bitable_app_table_record | list | app_token, table_id |
| 新增一行 | feishu_bitable_app_table_record | create | app_token, table_id, fields |
| 批量导入 | feishu_bitable_app_table_record | batch_create | app_token, table_id, records (≤500) |
| 更新一行 | feishu_bitable_app_table_record | update | app_token, table_id, record_id, fields |
| 删除记录 | feishu_bitable_app_table_record | batch_delete | app_token, table_id, record_ids |
| 查字段 | feishu_bitable_app_table_field | list | app_token, table_id |
| 创建字段 | feishu_bitable_app_table_field | create | app_token, table_id, field_name, type |

**字段值格式**：写记录前先 list 字段确认类型。文本=字符串，数字=数字，单选=选项名字符串，日期=毫秒时间戳，复选框=布尔值。

**筛选**：`filter.conditions[].operator` 支持 `is`、`isNot`、`contains`、`isEmpty`（值必须 `[]`）、`isGreater`、`isLess`。

**批量操作**：单次 ≤500 条，同表串行调用。

---

# 五、常见错误

| 错误码 | 解决 |
|--------|------|
| 99991672 | 缺权限，点链接开通 `bitable:app` |
| 1254064 | 日期必须用毫秒时间戳 |
| 1254068 | 超链接必须用 `{text, link}` 对象 |
| 1254066 | 人员必须传 `[{id: "ou_xxx"}]` |
| 1254015 | 先 list 字段，按类型构造值 |
| 1254104 | 分批，每批 ≤500 |

## 参考文档

- [实战模式库](references/system-patterns.md)
- [公式速查](references/formula-reference.md)
- [字段属性](references/field-properties.md)
- [记录值格式](references/record-values.md)
- [完整示例](references/examples.md)
