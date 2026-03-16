#!/usr/bin/env python3
"""
01_create_bitable.py - 自包含，不依赖任何外部 skill
用法: python3 setup/01_create_bitable.py --project "项目名" --name "表格名"
凭据自动从 ~/.openclaw/openclaw.json 读取
"""
import sys, json, time, argparse, requests
from pathlib import Path

def get_config():
    for p in [Path.home() / ".openclaw/openclaw.json",
              Path.home() / ".openclaw-dev/openclaw.json"]:
        if p.exists():
            cfg = json.load(open(p))
            feishu = cfg.get("channels", {}).get("feishu", {})
            if feishu.get("appId"):
                return feishu["appId"], feishu["appSecret"]
    sys.exit("❌ 找不到 openclaw.json 或飞书配置")

def get_token(app_id, app_secret):
    r = requests.post(
        "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        json={"app_id": app_id, "app_secret": app_secret}
    )
    return r.json()["tenant_access_token"]

def api(token, method, path, **kw):
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    r = getattr(requests, method)(f"https://open.feishu.cn/open-apis{path}", headers=h, **kw)
    d = r.json()
    if d.get("code") not in (0, None):
        raise Exception(f"API错误 code={d['code']}: {d.get('msg')}")
    return d.get("data", {})

def create_bitable(token, name):
    data = api(token, "post", "/bitable/v1/apps", json={"name": name})
    return data["app"]["app_token"]

def rename_table(token, app_token, table_id, name, view_name):
    api(token, "patch",
        f"/bitable/v1/apps/{app_token}/tables/{table_id}",
        json={"name": name})
    # 重命名默认视图
    views = api(token, "get",
                f"/bitable/v1/apps/{app_token}/tables/{table_id}/views")
    for v in views.get("items", []):
        api(token, "patch",
            f"/bitable/v1/apps/{app_token}/tables/{table_id}/views/{v['view_id']}",
            json={"view_name": view_name})
        break

def add_fields(token, app_token, table_id):
    fields = [
        {"field_name": "反馈分类", "type": 3, "property": {"options": [
            {"name": "功能问题"}, {"name": "性能优化"},
            {"name": "新增功能"}, {"name": "界面改进"}, {"name": "其他"}]}},
        {"field_name": "优先级", "type": 3, "property": {"options": [
            {"name": "高"}, {"name": "中"}, {"name": "低"}]}},
        {"field_name": "状态", "type": 3, "property": {"options": [
            {"name": "待处理"}, {"name": "处理中"},
            {"name": "已完成"}, {"name": "已关闭"}]}},
        {"field_name": "提交时间", "type": 5,
         "property": {"date_formatter": "yyyy/MM/dd HH:mm"}},
        {"field_name": "提交人", "type": 1},
        {"field_name": "关联文件", "type": 1},
        {"field_name": "处理备注", "type": 1},
        {"field_name": "Cursor处理结果", "type": 1},
        {"field_name": "确认提交", "type": 7},
    ]
    for f in fields:
        api(token, "post",
            f"/bitable/v1/apps/{app_token}/tables/{table_id}/fields",
            json=f)
        time.sleep(0.3)
    print(f"  ✅ 添加了 {len(fields)} 个字段")

def set_public_edit(token, app_token):
    """设为组织内所有人可编辑（凭链接）"""
    try:
        requests.patch(
            f"https://open.feishu.cn/open-apis/drive/v1/permissions/{app_token}/public",
            params={"type": "bitable"},
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "external_access_entity": "open",
                "security_entity": "anyone_can_edit",
                "link_share_entity": "tenant_editable",
                "invite_external": False
            }
        )
        print("  ✅ 权限已设为「组织内所有人可编辑」")
    except Exception as e:
        print(f"  ⚠ 权限设置失败，请手动在飞书中分享: {e}")

def update_openclaw_config(project, app_token, table_id):
    p = Path.home() / ".openclaw/openclaw.json"
    cfg = json.load(open(p))
    (cfg.setdefault("plugins", {})
        .setdefault("entries", {})
        .setdefault("feishu-openclaw-codecli", {})
        .setdefault("config", {})
        .setdefault("bitableTables", {})[project]) = {
        "app_token": app_token, "table_id": table_id
    }
    json.dump(cfg, open(p, "w"), indent=2, ensure_ascii=False)
    print(f"  ✅ openclaw.json 已更新: bitableTables.{project}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True)
    parser.add_argument("--name")
    args = parser.parse_args()

    app_name = args.name or f"{args.project} - 用户反馈系统"
    app_id, app_secret = get_config()
    token = get_token(app_id, app_secret)

    print(f"\n创建多维表格: {app_name}")

    # 1. 建表
    app_token = create_bitable(token, app_name)
    print(f"  app_token: {app_token}")

    # 2. 获取默认 table_id
    tables = api(token, "get", f"/bitable/v1/apps/{app_token}/tables")
    table_id = tables["items"][0]["table_id"]

    # 3. 重命名数据表和视图
    rename_table(token, app_token, table_id, "用户反馈", "所有反馈")

    # 4. 添加字段
    add_fields(token, app_token, table_id)

    # 5. 自动设为组织内可编辑 —— 关键步骤
    set_public_edit(token, app_token)

    # 6. 更新 openclaw.json
    update_openclaw_config(args.project, app_token, table_id)

    link = f"https://feishu.cn/base/{app_token}"
    print(f"\n✅ 完成！")
    print(f"   表格链接: {link}")
    print(f"   app_token: {app_token}")
    print(f"   table_id:  {table_id}")
    print(f"\n下一步: bash setup/02_setup_cron.sh --project \"{args.project}\" --app-token \"{app_token}\" --table-id \"{table_id}\"")

if __name__ == "__main__":
    main()
