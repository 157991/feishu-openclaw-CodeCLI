# feishu-openclaw-CodeCLI

![Status](https://img.shields.io/badge/status-actively_maintained-brightgreen)


**Feishu Bitable × Cursor CLI Automation Loop Plugin**

Users submit feedback in Feishu Bitable → OpenClaw polls periodically → Cursor Agent modifies code automatically → Results written back to the table.

## Prerequisites

1. [OpenClaw](https://docs.openclaw.ai) installed and Feishu Bot configured
2. [cursor-agent-skill](https://github.com/toheart/cursor-agent) installed with Cursor CLI logged in
3. [feishu-bitable-skill](https://github.com/your-org/feishu-bitable-skill) installed
4. Feishu app has `bitable:app` and `base:app:create` permissions

## Installation

### Step 1: Install the plugin

```bash
cd ~/.openclaw/workspace/skills
git clone https://github.com/your-github/feishu-openclaw-CodeCLI.git feishu-openclaw-CodeCLI-1.0.0
cd feishu-openclaw-CodeCLI-1.0.0
npm install && npm run build && npm pack
openclaw plugins install feishu-openclaw-CodeCLI-1.0.0.tgz
```

### Step 2: Configure openclaw.json

```json
{
  "tools": { "allow": ["group:plugins", "cursor_agent"] },
  "plugins": {
    "entries": {
      "feishu-openclaw-CodeCLI": {
        "enabled": true,
        "config": {
          "projects": { "your-project": "/path/to/project" },
          "bitableTables": {},
          "defaultTimeoutSec": 600
        }
      }
    }
  }
}
```

### Step 3: Create Feishu Bitable

```bash
python3 setup/01_create_bitable.py --project "your-project" --name "Project - User Feedback"
```

### Step 4: Register cron job

```bash
bash setup/02_setup_cron.sh \
  --project "your-project" \
  --app-token "YOUR_APP_TOKEN" \
  --table-id "YOUR_TABLE_ID"
```

### Step 5: Restart gateway

```bash
openclaw gateway restart
```

## Usage

### Via Feishu Bot commands

```
/trae your-project analyze          # Analyze project structure
/trae your-project feedback "text"  # Add feedback record
/trae your-project fix "issue"      # Let Cursor fix it now
/trae your-project auto "request"   # Full loop: analyze + record + fix
```

### Via Feishu Bitable (auto-processed)

1. Add a new row in the Bitable
2. Fill in the feedback content
3. Check the "确认提交" (Confirm Submit) checkbox ✅
4. OpenClaw polls every hour and processes confirmed pending records
