import { ProjectAnalyzer } from "./analyzer.js";
import { BitableManager } from "./bitable-manager.js";
import type { TraeFeedbackConfig, TraeCommand, FeedbackRecord } from "./types.js";

const PLUGIN_ID = "feishu-openclaw-codecli";

function parseCommandArgs(args: string): TraeCommand | { error: string } {
  if (!args?.trim()) {
    return { error: "用法: /trae <project> [action] [prompt]\n动作: analyze | feedback | fix | auto | setup | help" };
  }

  const tokens = args.trim().split(/\s+/);
  const project = tokens[0]!;
  const action = tokens[1] || "auto";
  const prompt = tokens.slice(2).join(" ");

  const validActions = ["analyze", "feedback", "fix", "auto", "setup", "help"];
  if (!validActions.includes(action)) {
    return { error: `无效动作: ${action}\n支持: ${validActions.join(", ")}` };
  }

  return {
    action: action as TraeCommand["action"],
    project,
    prompt: prompt || "",
  };
}

function resolveProjectPath(
  projectKey: string,
  projects: Record<string, string>
): string | null {
  if (projectKey.startsWith("/")) return projectKey;
  if (projects[projectKey]) return projects[projectKey]!;
  const lowerKey = projectKey.toLowerCase();
  for (const [name, path] of Object.entries(projects)) {
    if (name.toLowerCase() === lowerKey) return path;
  }
  return null;
}

async function runCursorAgent(
  api: any,
  projectPath: string,
  prompt: string,
  mode: "agent" | "ask" | "plan" = "ask"
): Promise<string> {
  try {
    const result = await api.tools.execute("cursor_agent", {
      project: projectPath,
      prompt,
      mode,
    });

    if (result?.content?.[0]?.text) {
      return result.content[0].text;
    }
    if (typeof result === "string") return result;
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `❌ Cursor Agent 调用失败: ${e instanceof Error ? e.message : String(e)}\n\n请确认 cursor-agent 插件已启用，且 Cursor CLI 已登录。`;
  }
}

export default {
  id: PLUGIN_ID,
  meta: {
    id: PLUGIN_ID,
    label: "Trae 反馈自动化",
    description: "Trae 项目自动化 - 分析项目文档、管理飞书表格、调用 Cursor CLI 修复代码",
    version: "1.0.0",
  },
  configSchema: {
    type: "object",
    properties: {
      projects: {
        type: "object",
        description: "项目名称到路径的映射",
      },
      bitableTables: {
        type: "object",
        description: "各项目对应的飞书多维表格配置",
      },
      defaultTimeoutSec: {
        type: "number",
        default: 600,
      },
    },
  } as const,

  async register(api: any) {
    const pluginConfig = (api.pluginConfig || {}) as TraeFeedbackConfig;
    const projects = pluginConfig.projects || {};
    const bitableTables = pluginConfig.bitableTables || {};

    const projectNames = Object.keys(projects);
    const projectListStr = projectNames.length > 0
      ? `可用项目: ${projectNames.join(", ")}`
      : "未配置项目（请在 openclaw.json 中配置 plugins.entries.trae-feedback-automation.config.projects）";

    const bitableManager = new BitableManager(api);

    console.log(`[${PLUGIN_ID}] 插件已加载，${projectListStr}`);

    api.registerCommand({
      name: "trae",
      description: `Trae 项目自动化。${projectListStr}`,
      acceptsArgs: true,
      requireAuth: false,

      async handler(ctx: any) {
        const parsed = parseCommandArgs(ctx.args ?? "");
        if ("error" in parsed) {
          return { text: parsed.error };
        }

        const projectPath = resolveProjectPath(parsed.project, projects);

        if (parsed.action === "help") {
          return {
            text: `## /trae 命令说明\n\n` +
              `**用法**: \`/trae <project> [action] [prompt]\`\n\n` +
              `**动作**:\n` +
              `- \`analyze\` — 分析项目文件结构和文档\n` +
              `- \`feedback <内容>\` — 添加反馈记录到飞书多维表格\n` +
              `- \`fix <问题描述>\` — 调用 Cursor CLI 修复代码（agent 模式）\n` +
              `- \`auto <需求>\` — 完整自动化流程（分析 + 反馈记录 + Cursor 修复）\n` +
              `- \`setup\` — 显示多维表格配置说明\n\n` +
              `**示例**:\n` +
              "```\n" +
              `/trae trae导出记录 analyze\n` +
              `/trae trae导出记录 feedback "导出功能太慢"\n` +
              `/trae trae导出记录 fix "优化数据库查询性能"\n` +
              `/trae trae导出记录 auto "增加批量导出功能"\n` +
              "```\n\n" +
              projectListStr,
          };
        }

        if (parsed.action === "setup") {
          return {
            text: `## 多维表格配置说明\n\n` +
              `当前配置的多维表格:\n` +
              (Object.keys(bitableTables).length > 0
                ? Object.entries(bitableTables).map(([k, v]) =>
                    `- **${k}**: app_token=\`${v.app_token}\`, table_id=\`${v.table_id}\``
                  ).join("\n")
                : "❌ 暂未配置任何多维表格") +
              `\n\n**配置步骤**:\n` +
              `1. 在飞书中用 "搭建用户反馈表格" 创建一个多维表格（feishu-bitable-skill 会自动处理）\n` +
              `2. 从多维表格 URL 中复制 app_token（格式: \`S4xxxx...\`）\n` +
              `3. 在多维表格中找到数据表 ID（table_id，格式: \`tblxxx...\`）\n` +
              `4. 在 openclaw.json 中添加:\n` +
              "```json\n" +
              `"trae-feedback-automation": {\n` +
              `  "enabled": true,\n` +
              `  "config": {\n` +
              `    "bitableTables": {\n` +
              `      "${parsed.project}": {\n` +
              `        "app_token": "YOUR_APP_TOKEN",\n` +
              `        "table_id": "YOUR_TABLE_ID"\n` +
              `      }\n` +
              `    }\n` +
              `  }\n` +
              `}\n` +
              "```\n",
          };
        }

        if (!projectPath) {
          return {
            text: `❌ 项目未找到: **${parsed.project}**\n\n${projectListStr}`,
          };
        }

        // === analyze ===
        if (parsed.action === "analyze") {
          const analysis = ProjectAnalyzer.analyze(projectPath);
          return { text: ProjectAnalyzer.formatAnalysis(analysis, parsed.project) };
        }

        // === feedback ===
        if (parsed.action === "feedback") {
          if (!parsed.prompt) {
            return { text: `错误: feedback 需要内容\n用法: \`/trae ${parsed.project} feedback "反馈内容"\`` };
          }

          const tableConfig = bitableTables[parsed.project];
          if (!tableConfig) {
            return {
              text: `❌ 项目 **${parsed.project}** 未配置多维表格\n\n输入 \`/trae ${parsed.project} setup\` 查看配置说明`,
            };
          }

          const record: FeedbackRecord = {
            反馈内容: parsed.prompt,
            优先级: "中",
            状态: "待处理",
            提交人: ctx.sender?.name || ctx.sender?.id || "用户",
          };

          const result = await bitableManager.createFeedbackRecord(tableConfig, record);
          if (result.success) {
            return {
              text: `✅ 反馈已记录到飞书多维表格\n\n内容: ${parsed.prompt}\n记录ID: ${result.record_id || "已创建"}`,
            };
          } else {
            return {
              text: `❌ 添加反馈失败: ${result.error}\n\n请检查多维表格配置是否正确，以及表格字段是否与默认字段一致。`,
            };
          }
        }

        // === fix ===
        if (parsed.action === "fix") {
          if (!parsed.prompt) {
            return { text: `错误: fix 需要问题描述\n用法: \`/trae ${parsed.project} fix "问题描述"\`` };
          }

          const cursorOutput = await runCursorAgent(api, projectPath, parsed.prompt, "agent");
          return { text: `## 🔧 Cursor Agent 修复: ${parsed.project}\n\n${cursorOutput}` };
        }

        // === auto ===
        if (parsed.action === "auto") {
          if (!parsed.prompt) {
            return { text: `错误: auto 需要需求描述\n用法: \`/trae ${parsed.project} auto "需求描述"\`` };
          }

          let responseText = `## 🚀 自动化处理: ${parsed.project}\n\n`;

          // 步骤 1: 分析项目
          responseText += `### 步骤 1/3: 分析项目\n`;
          const analysis = ProjectAnalyzer.analyze(projectPath);
          responseText += ProjectAnalyzer.formatAnalysis(analysis, parsed.project);
          responseText += `\n---\n\n`;

          // 步骤 2: 添加飞书反馈记录
          responseText += `### 步骤 2/3: 添加飞书反馈记录\n`;
          const tableConfig = bitableTables[parsed.project];
          let recordId: string | undefined;

          if (tableConfig) {
            const firstFile = analysis.structure?.files[0]?.path || "";
            const record: FeedbackRecord = {
              反馈内容: parsed.prompt,
              优先级: "中",
              状态: "处理中",
              提交人: ctx.sender?.name || ctx.sender?.id || "用户",
              关联文件: firstFile,
            };
            const bitableResult = await bitableManager.createFeedbackRecord(tableConfig, record);
            if (bitableResult.success) {
              recordId = bitableResult.record_id;
              responseText += `✅ 已记录到飞书表格（状态: 处理中）\n`;
            } else {
              responseText += `⚠️ 飞书记录失败: ${bitableResult.error}\n`;
            }
          } else {
            responseText += `⚠️ 未配置多维表格，跳过反馈记录。输入 \`/trae ${parsed.project} setup\` 查看配置说明\n`;
          }
          responseText += `\n---\n\n`;

          // 步骤 3: 调用 Cursor Agent
          responseText += `### 步骤 3/3: Cursor Agent 处理\n`;
          const cursorOutput = await runCursorAgent(api, projectPath, parsed.prompt, "agent");
          responseText += cursorOutput;

          // 更新飞书记录状态和 Cursor 处理结果
          if (tableConfig && recordId) {
            const cursorSummary = cursorOutput.length > 2000
              ? cursorOutput.substring(0, 2000) + "\n...(结果已截断)"
              : cursorOutput;
            await bitableManager.updateFeedbackRecord(tableConfig, recordId, {
              状态: "已完成",
              处理备注: "Cursor Agent 已处理",
              Cursor处理结果: cursorSummary,
            });
            responseText += `\n\n✅ 飞书表格状态已更新为"已完成"，Cursor处理结果已写入`;
          }

          return { text: responseText };
        }

        return { text: `未知动作。输入 \`/trae help\` 查看帮助。` };
      },
    });

    console.log(`[${PLUGIN_ID}] /trae 命令已注册`);
  },
};
