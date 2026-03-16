export interface BitableTableConfig {
  app_token: string;
  table_id: string;
}

export interface TraeFeedbackConfig {
  projects?: Record<string, string>;
  bitableTables?: Record<string, BitableTableConfig>;
  defaultTimeoutSec?: number;
}

export interface TraeCommand {
  action: "analyze" | "feedback" | "fix" | "auto" | "help" | "setup";
  project: string;
  prompt: string;
}

export interface ProjectAnalysis {
  name: string;
  path: string;
  structure?: {
    total_files: number;
    files: Array<{ path: string; size: number }>;
  };
  documentation?: Record<string, {
    path: string;
    size: number;
    content_preview: string;
  }>;
  database?: Record<string, {
    path?: string;
    size?: number;
    tables?: Record<string, number>;
    error?: string;
  }>;
  project_info?: {
    name?: string;
    version?: string;
    description?: string;
    scripts?: Record<string, string>;
    error?: string;
  };
}

export interface FeedbackRecord {
  反馈内容: string;
  优先级?: "高" | "中" | "低";
  状态?: "待处理" | "处理中" | "已完成" | "已关闭";
  提交时间?: number;
  提交人?: string;
  反馈分类?: string;
  关联文件?: string;
  处理备注?: string;
  Cursor处理结果?: string;
}
