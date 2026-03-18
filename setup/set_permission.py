#!/usr/bin/env python3
"""设置飞书多维表格为「任何人有链接可编辑」"""
import sys, json, requests
from pathlib import Path

if len(sys.argv) < 2:
    sys.exit("用法: python3 set_permission.py <app_token>")

app_token = sys.argv[1]
cfg = json.load(open(Path.home() / ".openclaw/openclaw.json"))
T = requests.post("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    json={"app_id": cfg["channels"]["feishu"]["appId"],
          "app_secret": cfg["channels"]["feishu"]["appSecret"]}).json()["tenant_access_token"]

r = requests.patch(
    f"https://open.feishu.cn/open-apis/drive/v1/permissions/{app_token}/public",
    params={"type": "bitable"},
    headers={"Authorization": f"Bearer {T}", "Content-Type": "application/json"},
    json={"external_access_entity": "open",
          "security_entity": "anyone_can_edit",
          "link_share_entity": "anyone_editable",
          "invite_external": True})
code = r.json().get("code")
if code == 0:
    print(f"✅ 权限已设为「任何人有链接可编辑」: {app_token}")
else:
    print(f"❌ 设置失败: {r.json()}")
    sys.exit(1)
