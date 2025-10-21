/**
 * GTO建议格式化工具
 * 用于统一格式化GTO建议的显示
 */

export interface SuggestionData {
  playerId?: string;
  suggestion?: any;
  data?: any;
}

/**
 * 格式化GTO建议为HTML
 * @param suggestionData 建议数据对象
 * @returns 格式化后的HTML字符串
 */
export function formatSuggestionToHTML(suggestionData: SuggestionData): string {
  console.log("[formatSuggestionToHTML] 输入数据:", suggestionData);

  // 兼容不同的数据结构
  const playerId = suggestionData.playerId || "";
  const suggestion = suggestionData.suggestion || suggestionData.data;

  console.log("[formatSuggestionToHTML] 解析后的 suggestion:", suggestion);

  if (!suggestion) {
    console.warn("[formatSuggestionToHTML] 建议数据为空");
    return `<div style="color: #ff6b6b;">建议数据为空。</div>`;
  }

  if (suggestion.error) {
    console.warn("[formatSuggestionToHTML] 建议包含错误:", suggestion.error);
    return `<div style="color: #ff6b6b;">获取建议失败: ${suggestion.error}</div>`;
  }

  // 真实API返回的结构是 { request, response }
  const response = suggestion.response;

  console.log("[formatSuggestionToHTML] response 对象:", response);
  console.log("[formatSuggestionToHTML] response.advices:", response?.advices);

  if (!response) {
    console.warn(
      "[formatSuggestionToHTML] 建议响应数据为空，完整 suggestion:",
      JSON.stringify(suggestion, null, 2),
    );
    return `<div style="color: #ff6b6b;">建议响应数据为空。</div>`;
  }

  let html = "";

  // 标题
  if (playerId) {
    html += `<h4 style="margin: 0 0 8px 0; color: #66d9ef;">给 ${playerId} 的建议:</h4>`;
  } else {
    html += `<h4 style="margin: 0 0 8px 0; color: #66d9ef;">GTO建议:</h4>`;
  }

  // 建议动作列表
  if (
    response.advices &&
    Array.isArray(response.advices) &&
    response.advices.length > 0
  ) {
    console.log(
      "[formatSuggestionToHTML] 找到 advices 数组，长度:",
      response.advices.length,
    );
    html += `<h5 style="color: #f92672; margin-top: 12px; margin-bottom: 8px; border-bottom: 1px solid #555; padding-bottom: 4px;">建议动作</h5>`;

    response.advices.forEach((advice: any, index: number) => {
      const frequency = (advice.frequency * 100).toFixed(1);
      let actionText = `${index + 1}. <strong style="color: #e6db74;">${advice.action}</strong> - 频率: <span style="color: #a6e22e;">${frequency}%</span>`;

      if (
        advice.sizingRange &&
        (advice.sizingRange.min || advice.sizingRange.max)
      ) {
        actionText += ` <span style="color: #888;">(${advice.sizingRange.min || "?"}-${advice.sizingRange.max || "?"})</span>`;
      }

      html += `<div style="margin-bottom: 6px; padding-left: 10px;">${actionText}</div>`;
    });
  } else {
    console.warn("[formatSuggestionToHTML] advices 不存在或为空");
    console.warn(
      "[formatSuggestionToHTML] response.advices 类型:",
      typeof response.advices,
    );
    console.warn(
      "[formatSuggestionToHTML] response.advices 值:",
      response.advices,
    );
  }

  // 说明
  if (response.explanation) {
    console.log("[formatSuggestionToHTML] 找到 explanation");
    html += `<h5 style="color: #f92672; margin-top: 12px; margin-bottom: 8px; border-bottom: 1px solid #555; padding-bottom: 4px;">说明</h5>`;
    html += `<div style="line-height: 1.6; margin-bottom: 4px;">${response.explanation}</div>`;
  }

  console.log("[formatSuggestionToHTML] 生成的 HTML 长度:", html.length);
  return html;
}

/**
 * 格式化GTO建议为纯文本（用于不支持HTML的场景）
 * @param suggestionData 建议数据对象
 * @returns 格式化后的纯文本
 */
export function formatSuggestionToText(suggestionData: SuggestionData): string {
  const playerId = suggestionData.playerId || "";
  const suggestion = suggestionData.suggestion || suggestionData.data;

  if (!suggestion) {
    return "建议数据为空。";
  }

  if (suggestion.error) {
    return `获取建议失败: ${suggestion.error}`;
  }

  // 真实API返回的结构是 { request, response }
  const response = suggestion.response;

  if (!response) {
    return "建议响应数据为空。";
  }

  let text = "";

  // 标题
  if (playerId) {
    text += `给 ${playerId} 的建议:\n\n`;
  } else {
    text += `GTO建议:\n\n`;
  }

  // 建议动作列表
  if (
    response.advices &&
    Array.isArray(response.advices) &&
    response.advices.length > 0
  ) {
    text += "=== 建议动作 ===\n";

    response.advices.forEach((advice: any, index: number) => {
      const frequency = (advice.frequency * 100).toFixed(1);
      text += `${index + 1}. ${advice.action} - 频率: ${frequency}%`;

      if (
        advice.sizingRange &&
        (advice.sizingRange.min || advice.sizingRange.max)
      ) {
        text += ` (${advice.sizingRange.min || "?"}-${advice.sizingRange.max || "?"})`;
      }

      text += "\n";
    });
  }

  // 说明
  if (response.explanation) {
    text += "\n=== 说明 ===\n";
    text += `${response.explanation}\n`;
  }

  return text;
}
