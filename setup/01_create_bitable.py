#!/usr/bin/env python3
"""
01_create_bitable.py
====================
一次性脚本：为项目创建飞书多维表格，并添加所有必要字段。

用法：
    python3 setup/01_create_bitable.py --project "trae导出记录" --name "用户反馈系统"

依赖：
    - feishu-bitable-skill 已安装（提供 feishu_common.py 和 create_bitable_template.py）
    - OpenClaw 中配置了飞书 appId / appSecret

执行成功后，将输出 app_token 和 table_id，
请将它们填写到 openclaw.json 的 plugins.entries.trae-feedback-automation.config.bitableTables 中。
"""
import sys
import json
import argparse
from pathlib import Path

# 找到 feishu-bitable-skill 的 scripts 目录
SKILL_SCRIPTS = Path.home() / ".openclaw" / "workspace" / "skills" / "feishu-bitable-skill-1.0.0" / "scripts"
if not SKILL_SCRIPTS.exists():
    print("❌ 找不到 feishu-bitable-skill 的 scripts 目录")
    print(f"   期望路径: {SKILL_SCRIPTS}")
    print("   请先安装 feishu-bitable-skill")
    sys.exit(1)

sys.path.insert(0, str(SKILL_SCRIPTS))

try:
    from feishu_common import FeishuClient
except ImportError:
    print("❌ 无法导入 feishu_common，请确认 feishu-bitable-skill 已正确安装")
    sys.exit(1)


def create_feedback_bitable(project_name: str, app_name: str) -> dict:
    """创建反馈多维表格，返回 app_token 和 table_id"""
    import subprocess
    import tempfile
    import os

    config = {
        "app_name": app_name,
        "tables": [
            {
                "name": "用户反馈",
                "first_field_name": "反馈内容",
                "default_view_name": "所有反馈",
                "fields": [
                    {
                        "field_name": "反馈分类",
                        "type": 3,
                        "property": {
                            "options": [
                                {"name": "功能问题"},
                                {"name": "性能优化"},
                                {"name": "新增功能"},
                                {"name": "界面改进"},
                                {"name": "文档补充"},
                                {"name": "其他"}
                            ]
                        }
                    },
                    {
                        "field_name": "优先级",
                        "type": 3,
                        "property": {
                            "options": [
                                {"name": "高"},
                                {"name": "中"},
                                {"name": "低"}
                            ]
                        }
                    },
                    {
                        "field_name": "状态",
                        "type": 3,
                        "property": {
                            "options": [
                                {"name": "待处理"},
                                {"name": "处理中"},
                                {"name": "已完成"},
                                {"name": "已关闭"}
                            ]
                        }
                    },
                    {"field_name": "提交时间", "type": 5, "property": {"date_formatter": "yyyy/MM/dd HH:mm"}},
                    {"field_name": "提交人", "type": 1},
                    {"field_name": "关联文件", "type": 1},
                    {"field_name": "处理备注", "type": 1},
                    {"field_name": "Cursor处理结果", "type": 1},
                    {"field_name": "确认提交", "type": 7}
                ],
                "views": [
                    {"view_name": "按状态看板", "view_type": "kanban"}
                ]
            }
        ]
    }

    # 写临时 JSON 配置
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
        tmp_path = f.name

    try:
        create_script = SKILL_SCRIPTS / "create_bitable_template.py"
        result = subprocess.run(
            ["python3", str(create_script), "--config", tmp_path],
            capture_output=True, text=True
        )
        output = result.stdout + result.stderr
        print(output)

        # 解析结果
        for line in output.splitlines():
            if "__RESULT_JSON__" in line:
                json_str = line.split("__RESULT_JSON__")[-1].strip()
                return json.loads(json_str)

        return {}
    finally:
        os.unlink(tmp_path)


def update_openclaw_config(project_name: str, app_token: str, table_id: str):
    """把 app_token 和 table_id 写入 openclaw.json"""
    import json
    config_path = Path.home() / ".openclaw" / "openclaw.json"
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    plugin_cfg = cfg.setdefault("plugins", {}).setdefault("entries", {}).setdefault(
        "trae-feedback-automation", {}
    ).setdefault("config", {}).setdefault("bitableTables", {})

    plugin_cfg[project_name] = {"app_token": app_token, "table_id": table_id}

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)

    print(f"✅ 已更新 openclaw.json: bitableTables.{project_name}")


def main():
    parser = argparse.ArgumentParser(description="为项目创建飞书反馈多维表格")
    parser.add_argument("--project", required=True, help="项目名称（如 trae导出记录）")
    parser.add_argument("--name", help="多维表格应用名称（默认: <project> - 用户反馈系统）")
    args = parser.parse_args()

    app_name = args.name or f"{args.project} - 用户反馈系统"

    print(f"\n📊 创建多维表格: {app_name}")
    print("=" * 50)

    result = create_feedback_bitable(args.project, app_name)

    if result.get("app_token") and result.get("table_id"):
        app_token = result["app_token"]
        table_id = result["table_id"]
        link = result.get("link", "")

        print(f"\n✅ 创建成功！")
        print(f"   多维表格链接: {link}")
        print(f"   app_token:    {app_token}")
        print(f"   table_id:     {table_id}")

        update_openclaw_config(args.project, app_token, table_id)

        print(f"\n下一步: 运行 02_setup_cron.sh 配置定时任务")
    else:
        print("\n❌ 创建失败，请检查输出中的错误信息")
        print("   常见原因: 飞书应用缺少 bitable:app 权限")
        print("   解决: https://open.feishu.cn/app/YOUR_APP_ID/auth?q=bitable:app,base:app:create")
        sys.exit(1)


if __name__ == "__main__":
    main()
