import type { FeedbackRecord, BitableTableConfig } from "./types.js";

/**
 * 飞书多维表格管理器
 * 依赖 feishu 插件注册的 feishu_bitable_app_table_record 工具
 */
export class BitableManager {
  private api: any;

  constructor(api: any) {
    this.api = api;
  }

  /**
   * 创建反馈记录
   */
  async createFeedbackRecord(
    tableConfig: BitableTableConfig,
    record: FeedbackRecord
  ): Promise<{ success: boolean; record_id?: string; error?: string }> {
    const fields: Record<string, any> = {
      反馈内容: record.反馈内容,
      优先级: record.优先级 || "中",
      状态: record.状态 || "待处理",
      提交时间: record.提交时间 || Date.now(),
      提交人: record.提交人 || "用户",
    };
    if (record.关联文件) fields.关联文件 = record.关联文件;
    if (record.处理备注) fields.处理备注 = record.处理备注;

    try {
      const result = await this.api.tools.execute("feishu_bitable_app_table_record", {
        action: "create",
        app_token: tableConfig.app_token,
        table_id: tableConfig.table_id,
        fields,
      });

      if (result?.data?.record?.record_id) {
        return { success: true, record_id: result.data.record.record_id };
      }
      if (result?.error || result?.code) {
        return { success: false, error: JSON.stringify(result) };
      }
      return { success: true, record_id: result?.record_id };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /**
   * 更新记录状态
   */
  async updateFeedbackRecord(
    tableConfig: BitableTableConfig,
    recordId: string,
    updates: Partial<FeedbackRecord>
  ): Promise<{ success: boolean; error?: string }> {
    const fields: Record<string, any> = {};
    if (updates.状态 !== undefined) fields.状态 = updates.状态;
    if (updates.处理备注 !== undefined) fields.处理备注 = updates.处理备注;
    if (updates.Cursor处理结果 !== undefined) fields.Cursor处理结果 = updates.Cursor处理结果;
    if (updates.反馈分类 !== undefined) fields.反馈分类 = updates.反馈分类;

    try {
      await this.api.tools.execute("feishu_bitable_app_table_record", {
        action: "update",
        app_token: tableConfig.app_token,
        table_id: tableConfig.table_id,
        record_id: recordId,
        fields,
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /**
   * 查询最近的反馈记录
   */
  async listRecentFeedback(
    tableConfig: BitableTableConfig,
    limit = 10
  ): Promise<Array<{ record_id: string; fields: Record<string, any> }>> {
    try {
      const result = await this.api.tools.execute("feishu_bitable_app_table_record", {
        action: "list",
        app_token: tableConfig.app_token,
        table_id: tableConfig.table_id,
        page_size: limit,
        sort: [{ field_name: "提交时间", desc: true }],
      });
      return result?.data?.items || result?.items || [];
    } catch {
      return [];
    }
  }

  /**
   * 查询待处理的反馈记录
   */
  async listPendingFeedback(
    tableConfig: BitableTableConfig
  ): Promise<Array<{ record_id: string; fields: Record<string, any> }>> {
    try {
      const result = await this.api.tools.execute("feishu_bitable_app_table_record", {
        action: "list",
        app_token: tableConfig.app_token,
        table_id: tableConfig.table_id,
        filter: {
          conjunction: "and",
          conditions: [
            { field_name: "状态", operator: "is", value: ["待处理"] }
          ]
        },
        page_size: 50,
      });
      return result?.data?.items || result?.items || [];
    } catch {
      return [];
    }
  }
}
