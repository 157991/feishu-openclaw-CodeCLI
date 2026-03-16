import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import type { ProjectAnalysis } from "./types.js";

/**
 * 项目分析器 - 读取 Trae 项目的文档和结构
 */
export class ProjectAnalyzer {
  /**
   * 递归列出文件（限深度）
   */
  private static listFiles(
    dir: string,
    maxDepth = 2,
    currentDepth = 0
  ): Array<{ path: string; size: number }> {
    if (currentDepth >= maxDepth) return [];
    const results: Array<{ path: string; size: number }> = [];

    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith(".") || entry === "node_modules" || entry === "__pycache__") continue;
        const fullPath = join(dir, entry);
        try {
          const stat = statSync(fullPath);
          if (stat.isFile()) {
            results.push({ path: fullPath, size: stat.size });
          } else if (stat.isDirectory() && currentDepth < maxDepth - 1) {
            results.push(...this.listFiles(fullPath, maxDepth, currentDepth + 1));
          }
        } catch {
          // skip unreadable
        }
      }
    } catch {
      // skip unreadable directory
    }

    return results.slice(0, 30);
  }

  /**
   * 读取项目文档（README、设计文档等）
   */
  static readDocumentation(projectPath: string): ProjectAnalysis["documentation"] {
    const docCandidates = [
      "README.md", "README_CN.md", "README.txt",
      "docs/README.md", "doc/README.md",
      "DESIGN.md", "ARCHITECTURE.md",
    ];
    const docs: ProjectAnalysis["documentation"] = {};

    for (const docFile of docCandidates) {
      try {
        const docPath = join(projectPath, docFile);
        if (!existsSync(docPath)) continue;

        const stat = statSync(docPath);
        const content = readFileSync(docPath, "utf-8");
        const preview = content.length > 800
          ? content.substring(0, 800) + "\n...(文档已截断)..."
          : content;

        docs[docFile] = {
          path: docPath,
          size: stat.size,
          content_preview: preview,
        };
      } catch {
        // skip
      }
    }

    return docs;
  }

  /**
   * 分析项目结构
   */
  static analyzeStructure(projectPath: string): ProjectAnalysis["structure"] {
    if (!existsSync(projectPath)) {
      return { total_files: 0, files: [] };
    }

    const files = this.listFiles(projectPath);
    return {
      total_files: files.length,
      files: files.map(f => ({
        path: relative(projectPath, f.path),
        size: f.size,
      })),
    };
  }

  /**
   * 提取 package.json 信息
   */
  static extractProjectInfo(projectPath: string): ProjectAnalysis["project_info"] {
    try {
      const pkgPath = join(projectPath, "package.json");
      if (!existsSync(pkgPath)) return {};
      const content = readFileSync(pkgPath, "utf-8");
      const pkg = JSON.parse(content);
      return {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        scripts: pkg.scripts || {},
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }

  /**
   * 完整分析项目
   */
  static analyze(projectPath: string): ProjectAnalysis {
    const name = projectPath.split("/").pop() || "project";
    return {
      name,
      path: projectPath,
      structure: this.analyzeStructure(projectPath),
      documentation: this.readDocumentation(projectPath),
      project_info: this.extractProjectInfo(projectPath),
    };
  }

  /**
   * 格式化分析结果为可读文本
   */
  static formatAnalysis(analysis: ProjectAnalysis, projectKey: string): string {
    let result = `## 📁 项目分析: ${projectKey}\n\n`;
    result += `路径: \`${analysis.path}\`\n\n`;

    if (analysis.structure) {
      result += `### 文件结构（共 ${analysis.structure.total_files} 个文件）\n`;
      for (const file of analysis.structure.files.slice(0, 15)) {
        const kb = (file.size / 1024).toFixed(1);
        result += `- \`${file.path}\` (${kb}KB)\n`;
      }
      result += `\n`;
    }

    if (analysis.documentation && Object.keys(analysis.documentation).length > 0) {
      result += `### 📄 项目文档\n\n`;
      for (const [name, doc] of Object.entries(analysis.documentation)) {
        result += `**${name}** (${(doc.size / 1024).toFixed(1)}KB):\n\n`;
        result += "```\n" + doc.content_preview + "\n```\n\n";
      }
    } else {
      result += `### 📄 项目文档\n暂无 README 等文档文件\n\n`;
    }

    if (analysis.project_info && Object.keys(analysis.project_info).length > 0) {
      result += `### ℹ️ 项目信息\n`;
      const info = analysis.project_info;
      if (info.name) result += `- 名称: ${info.name}\n`;
      if (info.version) result += `- 版本: ${info.version}\n`;
      if (info.description) result += `- 描述: ${info.description}\n`;
      result += `\n`;
    }

    return result;
  }
}
