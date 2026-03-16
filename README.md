# feishu-openclaw-CodeCLI

![持续更新中](https://img.shields.io/badge/状态-持续更新中-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![OpenClaw](https://img.shields.io/badge/OpenClaw-Plugin-orange)

**飞书多维表格 × Cursor CLI 自动化闭环插件**

> 🚀 本项目持续维护更新，欢迎 Star / Issue / PR。

用户在飞书多维表格中填写反馈 → OpenClaw 定时轮询 → 自动调用 Cursor Agent 修改代码 → 回写处理结果。

## 前置条件

1. 已安装 [OpenClaw](https://docs.openclaw.ai) 并配置好飞书 Bot
2. 已安装 [cursor-agent-skill](https://github.com/toheart/cursor-agent) 并且 Cursor CLI 已登录
3. 已安装 [feishu-bitable-skill](https://github.com/your-org/feishu-bitable-skill)（提供 Python 工具函数）
4. 飞书应用已开通 `bitable:app`、`base:app:create` 权限

## 安装步骤

### 第 1 步：安装插件

```bash
# 克隆仓库
cd ~/.openclaw/workspace/skills
git clone https://github.com/your-github/feishu-openclaw-CodeCLI.git feishu-openclaw-CodeCLI-1.0.0

# 构建
cd feishu-openclaw-CodeCLI-1.0.0
npm install
npm run build
npm pack

# 安装到 OpenClaw
openclaw plugins install feishu-openclaw-CodeCLI-1.0.0.tgz
```

### 第 2 步：配置 openclaw.json

编辑 `~/.openclaw/openclaw.json`，在 `plugins.entries` 中添加：

```json
{
  "plugins": {
    "entries": {
      "feishu-openclaw-CodeCLI": {
        "enabled": true,
        "config": {
          "projects": {
            "你的项目名": "/path/to/your/project"
          },
          "bitableTables": {},
          "defaultTimeoutSec": 600
        }
      }
    }
  }
}
```

同时确保开启工具权限：

```json
{
  "tools": {
    "allow": ["group:plugins", "cursor_agent"]
  }
}
```

### 第 3 步：创建飞书多维表格

运行一次性脚本，自动创建表格并配置好所有字段：

```bash
python3 setup/01_create_bitable.py --project "你的项目名" --name "项目名称 - 用户反馈系统"
```

脚本执行成功后会输出 `app_token` 和 `table_id`，并自动写入 `openclaw.json`。

### 第 4 步：注册定时任务

```bash
# 从 openclaw.json 中获取上一步生成的 app_token 和 table_id
bash setup/02_setup_cron.sh   --project "你的项目名"   --app-token "YOUR_APP_TOKEN"   --table-id "YOUR_TABLE_ID"
```

### 第 5 步：重启网关

```bash
openclaw gateway restart
```

## 使用方式

### 方式一：在多维表格中填写反馈（自动处理）

1. 打开飞书多维表格
2. 新增一行，填写「反馈内容」、「优先级」、「反馈分类」
3. 填写完毕后，勾选「确认提交」复选框 ✅
4. OpenClaw 每小时轮询一次，发现已勾选且状态为「待处理」的记录，自动调用 Cursor Agent 处理
5. 处理完成后，表格状态更新为「已完成」，「Cursor处理结果」字段写入处理内容

### 方式二：在飞书 Bot 中发命令（即时处理）

```
# 分析项目结构
/trae 你的项目名 analyze

# 手动写入一条反馈
/trae 你的项目名 feedback "反馈内容"

# 调用 Cursor 立即修复某个问题
/trae 你的项目名 fix "问题描述"

# 完整闭环：分析 + 记录反馈 + Cursor 修复
/trae 你的项目名 auto "需求描述"
```

## 自动化流程

```
用户填写反馈          勾选确认提交        cron 每小时轮询
(多维表格)      →     (确认写完了)   →   (查询待处理记录)
                                               ↓
                                        调用 Cursor Agent
                                        (agent 模式修代码)
                                               ↓
                                        回写处理结果到表格
                                        (状态→已完成)
```

## 字段说明

| 字段名 | 类型 | 说明 |
|-------|------|------|
| 反馈内容 | 文本 | 必填，描述问题或需求 |
| 反馈分类 | 单选 | 功能问题/性能优化/新增功能等 |
| 优先级 | 单选 | 高/中/低 |
| 状态 | 单选 | 待处理/处理中/已完成/已关闭（自动维护） |
| 确认提交 | 复选框 | **必须勾选**，否则不会被自动处理 |
| Cursor处理结果 | 文本 | 自动填写，记录 Cursor Agent 的处理摘要 |
| 提交人 | 文本 | 可选 |
| 关联文件 | 文本 | 可选，关联的代码文件路径 |
| 处理备注 | 文本 | 自动填写或手动备注 |

## 项目结构

```
feishu-openclaw-CodeCLI/
├── README.md                # 本文件（中文版）
├── README_EN.md             # English version
├── openclaw.plugin.json     # 插件清单
├── package.json
├── tsconfig.json
├── .gitignore
├── src/                     # TypeScript 源码
│   ├── index.ts             # 入口，注册 /trae 命令
│   ├── types.ts             # 类型定义
│   ├── bitable-manager.ts   # 飞书多维表格操作
│   ├── analyzer.ts          # 项目结构分析
│   └── cursor-runner.ts     # Cursor CLI 调用
├── dist/                    # 编译输出（gitignore）
│   └── index.js
└── setup/                   # 一次性配置脚本
    ├── 01_create_bitable.py # 创建飞书多维表格
    ├── 02_setup_cron.sh     # 注册 cron 定时任务
    └── 03_add_field.py      # 给已有表格补充字段
```

## 常见问题

**Q: 权限错误 code=99991672**
飞书应用缺少多维表格权限，访问以下链接开通：
`https://open.feishu.cn/app/YOUR_APP_ID/auth?q=bitable:app,base:app:create`

**Q: cursor_agent 调用失败**
确认 cursor-agent-skill 已安装，Cursor CLI 已登录（`cursor --version` 验证）

**Q: 反馈记录没有被处理**
检查是否同时满足：1) 状态为「待处理」2) 「确认提交」已勾选

**Q: 如何调整轮询频率**
```bash
openclaw cron edit <CRON_ID> --every 30m  # 改为30分钟
```
