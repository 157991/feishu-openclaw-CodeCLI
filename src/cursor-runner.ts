import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import type { CursorAgentConfig } from "./types.js";

/**
 * Cursor CLI 运行器 - 包装 Cursor Agent CLI 调用
 */
export class CursorRunner {
  /**
   * 检测 Cursor CLI 路径
   */
  static detectAgentPath(): string | null {
    try {
      const cmd = process.platform === "win32" ? "where agent" : "which agent";
      const result = execSync(cmd, { encoding: "utf-8", timeout: 5000 }).trim();
      const first = result.split(/\r?\n/)[0]?.trim();
      if (first && existsSync(first)) return first;
    } catch (error) {
      console.warn(`[CursorRunner] 检测 Cursor CLI 失败: ${error}`);
    }

    const home = process.env.HOME || process.env.USERPROFILE || "";
    if (!home) return null;

    if (process.platform === "win32") {
      const candidates = [
        `${home}/AppData/Local/cursor-agent/agent.cmd`,
        `${home}/.cursor/bin/agent.cmd`,
      ];
      for (const p of candidates) {
        if (existsSync(p)) return p;
      }
    } else {
      const candidates = [
        `${home}/.cursor/bin/agent`,
        `${home}/.local/bin/agent`,
      ];
      for (const p of candidates) {
        if (existsSync(p)) return p;
      }
    }

    return null;
  }

  /**
   * 解析项目路径
   */
  static resolveProjectPath(
    projectKeyOrPath: string,
    projects: Record<string, string>
  ): string | null {
    // 绝对路径
    if (projectKeyOrPath.startsWith("/") || /^[A-Za-z]:/.test(projectKeyOrPath)) {
      return existsSync(projectKeyOrPath) ? projectKeyOrPath : null;
    }

    // 项目名称映射
    if (projects[projectKeyOrPath]) {
      const path = projects[projectKeyOrPath];
      return existsSync(path) ? path : null;
    }

    // 大小写不敏感匹配
    const lowerKey = projectKeyOrPath.toLowerCase();
    for (const [name, path] of Object.entries(projects)) {
      if (name.toLowerCase() === lowerKey) {
        return existsSync(path) ? path : null;
      }
    }

    return null;
  }

  /**
   * 运行 Cursor Agent
   */
  static run(config: CursorAgentConfig): {
    success: boolean;
    output: string;
    error?: string;
  } {
    console.log(`[CursorRunner] 调用 Cursor Agent`);
    console.log(`  项目: ${config.projectPath}`);
    console.log(`  模式: ${config.mode}`);
    console.log(`  提示: ${config.prompt.substring(0, 100)}...\n`);

    try {
      // 构建 Cursor CLI 命令
      const cmd = [
        "agent",
        config.mode === "ask" ? "ask" : "agent",
        "--cwd", config.projectPath,
      ];

      if (config.mode !== "ask") {
        cmd.push("--approve-all");
      }

      cmd.push(config.prompt);

      // 执行命令
      const result = execSync(cmd.join(" "), {
        encoding: "utf-8",
        timeout: config.timeoutSec * 1000,
      });

      console.log(`[CursorRunner] Cursor Agent 执行成功\n`);
      console.log(result);

      return {
        success: true,
        output: result,
      };
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // 处理超时
      if (error.killed && error.signal === "SIGTERM") {
        console.log(`[CursorRunner] Cursor Agent 超时 (${config.timeoutSec}秒)`);
        return {
          success: false,
          output: "",
          error: `执行超时 (${config.timeoutSec}秒)`,
        };
      }

      console.error(`[CursorRunner] Cursor Agent 执行失败: ${errorMsg}`);
      return {
        success: false,
        output: "",
        error: errorMsg,
      };
    }
  }
}
