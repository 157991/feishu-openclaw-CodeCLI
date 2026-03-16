#!/usr/bin/env python3
"""
03_add_field.py
===============
一次性脚本：给已有的飞书多维表格添加「确认提交」和「Cursor处理结果」字段。
如果已通过 01_create_bitable.py 创建的表格，这两个字段已包含，无需再跑此脚本。
仅用于需要给已有旧表格补字段的情况。

用法：
    python3 setup/03_add_field.py --app-token YOUR_APP_TOKEN --table-id YOUR_TABLE_ID
"""
import sys
import json
import argparse
from pathlib import Path

SKILL_SCRIPTS = Path.home() / ".openclaw" / "workspace" / "skills" / "feishu-bitable-skill-1.0.0" / "scripts"
sys.path.insert(0, str(SKILL_SCRIPTS))
from feishu_common import FeishuClient


def ensure_field(client, app_token, table_id, field_name, field_type):
    # 查询现有字段
    data = client._request("GET", f"/bitable/v1/apps/{app_token}/tables/{table_id}/fields")
    existing = [f["field_name"] for f in data.get("data", {}).get("items", [])]

    if field_name in existing:
        print(f"  ✅ 「{field_name}」已存在，跳过")
        return

    client._request(
        "POST",
        f"/bitable/v1/apps/{app_token}/tables/{table_id}/fields",
        json={"field_name": field_name, "type": field_type},
    )
    print(f"  ✅ 「{field_name}」字段创建成功")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--app-token", required=True)
    parser.add_argument("--table-id", required=True)
    args = parser.parse_args()

    client = FeishuClient()
    client.authenticate()

    print("添加必要字段...")
    ensure_field(client, args.app_token, args.table_id, "确认提交", 7)      # 复选框
    ensure_field(client, args.app_token, args.table_id, "Cursor处理结果", 1) # 文本
    print("\n完成！")


if __name__ == "__main__":
    main()
