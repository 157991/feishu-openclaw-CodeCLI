#!/bin/bash
# 02_setup_cron.sh
# ================
# 一次性脚本：注册定时轮询 cron 任务，每5分钟自动检查反馈表格。
#
# 用法：
#   bash setup/02_setup_cron.sh --project "trae导出记录" --app-token "YOUR_APP_TOKEN" --table-id "YOUR_TABLE_ID"
#
# 依赖：openclaw CLI 已安装并配置好

set -e

export PATH=~/.nvm/versions/node/$(ls ~/.nvm/versions/node/ | tail -1)/bin:~/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH

PROJECT=""
APP_TOKEN=""
TABLE_ID=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --project)  PROJECT="$2";    shift 2 ;;
    --app-token) APP_TOKEN="$2"; shift 2 ;;
    --table-id)  TABLE_ID="$2";  shift 2 ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

if [[ -z "$PROJECT" || -z "$APP_TOKEN" || -z "$TABLE_ID" ]]; then
  echo "用法: bash setup/02_setup_cron.sh --project <name> --app-token <token> --table-id <id>"
  exit 1
fi

CRON_NAME="${PROJECT}-反馈自动处理"

MSG="你是 ${PROJECT} 项目的自动化助手。请严格执行以下步骤：

1. 查询飞书多维表格中「确认提交」为 true 且 状态为「待处理」的反馈记录：
   使用 feishu_bitable_app_table_record 工具，参数：
   - action: list
   - app_token: ${APP_TOKEN}
   - table_id: ${TABLE_ID}
   - filter: {\"conjunction\":\"and\",\"conditions\":[{\"field_name\":\"状态\",\"operator\":\"is\",\"value\":[\"待处理\"]},{\"field_name\":\"确认提交\",\"operator\":\"is\",\"value\":[true]}]}

2. 如果没有符合条件的记录，直接结束，不要回复任何内容。

3. 如果有符合条件的记录，对每条记录执行：
   a. 先将该记录状态更新为「处理中」
   b. 读取「反馈内容」字段的值
   c. 调用 cursor_agent 工具，project=${PROJECT}, prompt=反馈内容的值, mode=agent
   d. 将 Cursor 的处理结果写入「Cursor处理结果」字段（截断到2000字以内）
   e. 将状态更新为「已完成」

4. 只在处理了反馈后才汇报：处理了几条，每条的反馈内容和处理结果概要。"

echo "📅 注册 cron 任务: $CRON_NAME"

openclaw cron add \
  --name "$CRON_NAME" \
  --every 5m \
  --timeout-seconds 900 \
  --session isolated \
  --no-deliver \
  --description "每5分钟检查${PROJECT}多维表格中确认提交且待处理的反馈，自动调用Cursor CLI处理" \
  --message "$MSG"

echo ""
echo "✅ cron 任务已注册，每5分钟自动执行"
echo "   查看任务: openclaw cron list"
echo "   立即测试: openclaw cron run <ID>"
