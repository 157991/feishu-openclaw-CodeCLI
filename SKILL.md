---
name: trae-feedback-automation
description: Trae 项目自动化插件 - 分析项目、管理飞书表格、调用 Cursor CLI
homepage: https://github.com/your-repo/trae-feedback-automation
metadata:
  {
    "openclaw":
      {
        "emoji": "🔧",
        "requires": {
          "bins": ["python3", "agent"],
          "nodePackages": []
        },
        "setup": "pip install --upgrade 'volcengine-python-sdk[ark]' && curl https://cursor.com/install -fsSL | bash && agent login"
      },
    "projects":
      {
        "trae导出记录": "/mnt/d/味全/研发本部/trae记录导出"
      }
  }
---

# Trae 反馈自动化

Trae 项目自动化插件 - 集成项目分析、飞书表格管理和 Cursor CLI 调用，实现完整的用户反馈处理流程。

## 🎯 功能

### 1. 项目分析 (`/trae <project> analyze`)
- 分析项目文件结构
- 读取项目文档（README 等）
- 分析 Trae 数据库（如果存在）
- 提取 package.json 信息

### 2. 反馈管理 (`/trae <project> feedback <内容>`)
- 自动获取或创建飞书多维表格
- 添加反馈记录到表格
- 支持自定义字段（优先级、状态等）

### 3. 代码修复 (`/trae <project> fix <问题描述>`)
- 调用 Cursor Agent CLI
- 自动修改项目代码
- 返回详细执行结果

### 4. 完整自动化 (`/trae <project> auto <需求>`)
- 分析项目（步骤1）
- 添加反馈到飞书表格（步骤2）
- 调用 Cursor CLI 处理（步骤3）
- 更新表格状态为"已完成"（步骤4）
- **一站式解决用户需求！**

## 🚀 快速开始

### 1. 安装依赖

```bash
# Python 依赖（标准库，通常已安装）
python3 -c "import sqlite3; print('OK')"

# Cursor CLI（如果还没安装）
curl https://cursor.com/install -fsSL | bash

# 登录 Cursor
agent login
```

### 2. 配置 OpenClaw

编辑 `~/.openclaw/openclaw.json`，添加插件配置：

```json
{
  "plugins": {
    "entries": {
      "trae-feedback-automation": {
        "enabled": true,
        "config": {
          "projects": {
            "trae导出记录": "/mnt/d/味全/研发本部/trae记录导出",
            "其他项目": "/path/to/other/project"
          },
          "feishu": {
            "app_id": "你的飞书 App ID",
            "app_secret": "你的飞书 App Secret"
          },
          "defaultTimeoutSec": 600,
          "noOutputTimeoutSec": 120
        }
      }
    }
  }
}
```

### 3. 配置飞书应用（可选）

如果飞书应用已配置，可以跳过此步骤。

**方式 A：手动创建表格**
1. 在飞书开发者后台创建多维表格应用
2. 创建表格后，复制表格 URL
3. 告诉我表格 URL

**方式 B：使用配置自动创建**
设置 `feishu.app_id` 和 `feishu.app_secret`，插件会自动创建文档说明。

### 4. 重启 Gateway

```bash
openclaw gateway restart
```

### 5. 开始使用

在飞书或支持的聊天平台中：

```
# 分析项目
/trae trae导出记录 analyze

# 添加反馈
/trae trae导出记录 feedback "导出功能慢，需要优化"

# 调用 Cursor 修复
/trae trae导出记录 fix "优化数据库查询性能"

# 完整自动化流程（推荐）
/trae trae导出记录 auto "增加批量导出功能"
```

## 📋 命令说明

### `/trae <project> analyze`

分析项目结构和内容。

**输出包括：**
- 文件结构（主要文件列表）
- 项目文档（README 等）
- 数据库分析（表和记录数）
- 项目信息（名称、版本等）

### `/trae <project> feedback <内容>`

添加用户反馈到飞书多维表格。

**字段包括：**
- 反馈内容（必填）
- 优先级（默认：中）
- 状态（默认：待处理）
- 提交时间（自动）
- 提交人（自动）
- 关联文件
- 处理备注

### `/trae <project> fix <问题描述>`

调用 Cursor Agent CLI 处理问题。

**模式：**
- 使用 `agent` 模式（可修改文件）
- 自动批准所有修改
- 默认超时 10 分钟

### `/trae <project> auto <需求>`

完整的自动化流程。

**步骤：**
1. 分析项目
2. 添加反馈到飞书表格（状态：处理中）
3. 调用 Cursor CLI 处理
4. 更新表格状态为"已完成"

### `/trae <project> help`

显示命令帮助。

## ⚙️ 配置说明

### 项目路径映射

```json
{
  "projects": {
    "trae导出记录": "/mnt/d/味全/研发本部/trae记录导出"
  }
}
```

支持：
- 项目名称映射（推荐）
- 绝对路径（Linux: `/mnt/d/...`, Windows: `D:\...`）

### 飞书配置

```json
{
  "feishu": {
    "app_id": "cli_xxxxxxxxx",
    "app_secret": "xxxxxxxx"
  }
}
```

**获取方式：**
1. 登录飞书开发者后台：https://open.feishu.cn/app
2. 创建应用，启"多维表格"权限
3. 复制 App ID 和 App Secret

### 超时配置

```json
{
  "defaultTimeoutSec": 600,
  "noOutputTimeoutSec": 120
}
```

- `defaultTimeoutSec`: Cursor CLI 默认超时（秒）
- `noOutputTimeoutSec`: 无输出超时（秒）

## 🔄 自动化流程示例

### 示例 1：性能优化

用户输入：
```
/trae trae导出记录 auto "导出功能性能太慢，需要优化数据库查询"
```

插件自动执行：
1. ✅ 分析 `trae导出记录` 项目
2. ✅ 添加反馈到飞书表格（状态：处理中）
3. ✅ 调用 Cursor Agent 优化数据库查询
4. ✅ 更新表格状态为"已完成"

返回结果：
```
## 自动化处理: trae导出记录

### 项目分析
[分析结果...]

### 飞书反馈记录
已添加反馈记录，状态设为"处理中"

### Cursor AI 处理
[Cursor Agent 执行结果...]

✅ 飞书表格状态已更新为"已完成"
```

### 示例 2：添加新功能

用户输入：
```
/trae trae导出记录 auto "增加批量导出功能，支持一次导出多个工作区"
```

插件自动执行：
1. ✅ 分析项目
2. ✅ 添加功能需求到飞书表格
3. ✅ 调用 Cursor Agent 实现功能
4. ✅ 标记为已完成

## 🛠️ 故障排除

### Cursor CLI 未找到

```bash
# 检查安装
which agent

# 手动添加到 PATH
export PATH="$HOME/.local/bin:$PATH"

# 验证
agent --version
```

### 项目路径错误

```bash
# 验证路径
ls "/mnt/d/味全/研发本部/trae记录导出"

# 使用绝对路径
/trae "/mnt/d/味全/研发本部/trae记录导出" auto "需求"
```

### 飞书表格创建失败

确保：
1. App ID 和 App Secret 配置正确
2. 飞书应用有多维表格权限
3. 网络连接正常

## 📁 文件结构

```
trae-feedback-automation-1.0.0/
├── SKILL.md              # 技能说明
├── README.md             # 本文件
├── package.json          # 依赖配置
├── tsconfig.json         # TypeScript 配置
└── src/
    ├── index.ts          # 插件主入口，注册 /trae 命令
    ├── types.ts         # 类型定义
    ├── analyzer.ts      # 项目分析器
    ├── bitable-manager.ts  # 飞书表格管理器
    └── cursor-runner.ts  # Cursor CLI 运行器
```

## 📝 注意事项

1. **Cursor CLI 需要订阅** - 使用 Cursor 订阅中的模型额度
2. **项目路径权限** - 确保可读取/写入项目文件
3. **飞书权限** - 需要多维表格创建和写入权限
4. **网络连接** - Cursor CLI 和飞书 API 需要网络访问
5. **自动化流程** - `auto` 命令会自动更新表格状态，确保闭环

## 📚 相关文档

- [Trae 对话记录导出文档](/mnt/d/味全/研发本部/trae记录导出/README.md)
- [Cursor Agent CLI 文档](https://cursor.com/cn/docs/cli/using)
- [OpenClaw 插件开发文档](https://docs.openclaw.ai/plugins)
- [feishu-bitable-skill 文档](../feishu-bitable-skill-1.0.0/README.md)

## 🎯 使用建议

1. **首次使用** - 先运行 `/trae <project> analyze` 了解项目
2. **日常流程** - 使用 `/trae <project> auto <需求>` 实现自动化
3. **灵活操作** - 单独使用 `feedback`、`fix` 等命令
4. **监控状态** - 定期查看飞书表格，跟踪反馈处理进度

## 🔧 开发

```bash
# 安装依赖
npm install

# 开发模式（watch）
npm run dev

# 构建
npm run build

# 打包
npm pack
```

## 📄 许可证

MIT
