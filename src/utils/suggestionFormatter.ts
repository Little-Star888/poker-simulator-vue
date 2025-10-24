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
export function formatSuggestionToHTML(
  suggestionData: SuggestionData,
  options: { includeTitle?: boolean } = {},
): string {
  console.log("[formatSuggestionToHTML] 输入数据:", suggestionData);
  const { includeTitle = true } = options; // 默认包含标题，保持向后兼容

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

  // 后端实际返回的结构是 { request, response }
  // response 包含 localResult, thirdPartyResult, myCards, boardCards
  const response = suggestion.response || suggestion;

  console.log("[formatSuggestionToHTML] response 对象:", response);
  console.log(
    "[formatSuggestionToHTML] response.localResult:",
    response?.localResult,
  );

  if (!response) {
    console.warn(
      "[formatSuggestionToHTML] response 为空，完整 suggestion:",
      JSON.stringify(suggestion, null, 2),
    );
    return `<div style="color: #ff6b6b;">建议响应数据为空。</div>`;
  }

  // 确定阶段
  const phaseStr =
    response.localResult?.strategyPhase?.toLowerCase() ||
    response.phase?.toLowerCase() ||
    "unknown";
  const phase = phaseStr.replace("_", "");

  let html = "";

  // 标题（根据选项决定是否包含）
  if (includeTitle) {
    if (playerId) {
      html += `<h4 style="margin: 0 0 8px 0; color: #66d9ef;">给 ${playerId} 的建议 <span style="color: #fd971f;">[${phase.toUpperCase()}]</span>:</h4>`;
    } else {
      html += `<h4 style="margin: 0 0 8px 0; color: #66d9ef;">GTO建议 <span style="color: #fd971f;">[${phase.toUpperCase()}]</span>:</h4>`;
    }
  }

  // 检查是否有 localResult（原版后端格式）
  if (
    (phase === "preflop" ||
      phase === "flop" ||
      phase === "turn" ||
      phase === "river") &&
    response.localResult
  ) {
    console.log("[formatSuggestionToHTML] 找到 localResult，使用原版格式");
    try {
      const local = response.localResult;

      // 牌局信息
      html += `<h5 style="color: #f92672; margin-top: 12px; margin-bottom: 8px; border-bottom: 1px solid #555; padding-bottom: 4px;">牌局信息</h5>`;

      if (response.myCards) {
        html += `<div style="margin-bottom: 4px;"><strong style="color: #a6e22e;">手牌: </strong>${response.myCards.join(", ")}</div>`;
      }

      if (phase !== "preflop") {
        if (response.boardCards) {
          html += `<div style="margin-bottom: 4px;"><strong style="color: #a6e22e;">公共牌: </strong>${response.boardCards.join(", ")}</div>`;
        }
        if (local.boardType) {
          html += `<div style="margin-bottom: 4px;"><strong style="color: #a6e22e;">牌面: </strong>${local.boardType}</div>`;
        }
        if (local.handType) {
          html += `<div style="margin-bottom: 4px;"><strong style="color: #a6e22e;">牌型: </strong>${local.handType}</div>`;
        }
      }

      // 局势分析
      html += `<h5 style="color: #f92672; margin-top: 12px; margin-bottom: 8px; border-bottom: 1px solid #555; padding-bottom: 4px;">局势分析</h5>`;

      if (phase !== "preflop" && local.hasPosition !== undefined) {
        html += `<div style="margin-bottom: 4px;"><strong style="color: #a6e22e;">位置: </strong>${local.hasPosition ? "有利位置" : "不利位置"}</div>`;
      }

      if (local.scenarioDescription) {
        html += `<div style="margin-bottom: 4px;"><strong style="color: #a6e22e;">行动场景: </strong>${local.scenarioDescription}</div>`;
      }

      // 数据参考
      if (phase !== "preflop") {
        html += `<h5 style="color: #f92672; margin-top: 12px; margin-bottom: 8px; border-bottom: 1px solid #555; padding-bottom: 4px;">数据参考</h5>`;

        if (local.equity) {
          const parts: string[] = [];
          if (local.equity.winRate !== null)
            parts.push(`胜率: ${local.equity.winRate}%`);
          if (local.equity.potOdds !== null)
            parts.push(`底池赔率: ${local.equity.potOdds}%`);
          if (local.action !== null) parts.push(`建议: ${local.action}`);
          if (parts.length > 0) {
            html += `<div style="margin-bottom: 4px;"><strong style="color: #a6e22e;">本地计算: </strong>${parts.join("， ")}</div>`;
          }
        }

        if (response.thirdPartyResult?.equity) {
          const treys = response.thirdPartyResult.equity;
          const parts: string[] = [];
          if (treys.winRate !== null) parts.push(`胜率: ${treys.winRate}%`);
          if (treys.potOdds !== null) parts.push(`底池赔率: ${treys.potOdds}%`);
          if (treys.action) parts.push(`建议: ${treys.action}`);
          if (parts.length > 0) {
            html += `<div style="margin-bottom: 4px;"><strong style="color: #a6e22e;">Treys (仅作对比参考): </strong>${parts.join("， ")}</div>`;
          }
        }
      }

      // 最终建议
      html += `<h5 style="color: #f92672; margin-top: 12px; margin-bottom: 8px; border-bottom: 1px solid #555; padding-bottom: 4px;">最终建议</h5>`;
      html += `<div style="margin-bottom: 4px;"><strong style="color: #a6e22e;">行动: </strong><strong style="color: #e6db74; font-size: 1.2em;">${local.action || "无"}</strong></div>`;

      const reasoningText =
        phase === "preflop"
          ? local.reasoning || local.description || ""
          : `(以本地计算为准) ${local.reasoning || ""}`;

      html += `<div style="line-height: 1.6; margin-top: 4px;"><strong style="color: #a6e22e;">理由: </strong>${reasoningText}</div>`;
    } catch (e) {
      console.error(`Error formatting ${phase} suggestion:`, e, suggestion);
      html += `<pre style="margin: 0; white-space: pre-wrap; word-break: break-all;">${JSON.stringify(suggestion, null, 2)}</pre>`;
    }
  } else if (response.advices && Array.isArray(response.advices)) {
    // 兼容新版API格式（如果后端改为返回 advices）
    console.log("[formatSuggestionToHTML] 找到 advices 数组，使用新格式");
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

    if (response.explanation) {
      html += `<h5 style="color: #f92672; margin-top: 12px; margin-bottom: 8px; border-bottom: 1px solid #555; padding-bottom: 4px;">说明</h5>`;
      html += `<div style="line-height: 1.6; margin-bottom: 4px;">${response.explanation}</div>`;
    }
  } else {
    // 如果都不匹配，显示原始JSON
    console.warn("[formatSuggestionToHTML] 无法识别的数据格式，显示原始JSON");
    console.warn("[formatSuggestionToHTML] response 结构:", response);
    html += `<pre style="margin: 0; white-space: pre-wrap; word-break: break-all;">${JSON.stringify(suggestion, null, 2)}</pre>`;
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

  const response = suggestion.response || suggestion;

  if (!response) {
    return "建议响应数据为空。";
  }

  const phaseStr =
    response.localResult?.strategyPhase?.toLowerCase() ||
    response.phase?.toLowerCase() ||
    "unknown";
  const phase = phaseStr.replace("_", "");

  let text = "";

  if (playerId) {
    text += `给 ${playerId} 的建议 [${phase.toUpperCase()}]:\n\n`;
  } else {
    text += `GTO建议 [${phase.toUpperCase()}]:\n\n`;
  }

  if (
    (phase === "preflop" ||
      phase === "flop" ||
      phase === "turn" ||
      phase === "river") &&
    response.localResult
  ) {
    try {
      const local = response.localResult;

      // 牌局信息
      text += "=== 牌局信息 ===\n";
      if (response.myCards) {
        text += `手牌: ${response.myCards.join(", ")}\n`;
      }

      if (phase !== "preflop") {
        if (response.boardCards) {
          text += `公共牌: ${response.boardCards.join(", ")}\n`;
        }
        if (local.boardType) {
          text += `牌面: ${local.boardType}\n`;
        }
        if (local.handType) {
          text += `牌型: ${local.handType}\n`;
        }
      }

      // 局势分析
      text += "\n=== 局势分析 ===\n";
      if (phase !== "preflop" && local.hasPosition !== undefined) {
        text += `位置: ${local.hasPosition ? "有利位置" : "不利位置"}\n`;
      }
      if (local.scenarioDescription) {
        text += `行动场景: ${local.scenarioDescription}\n`;
      }

      // 数据参考
      if (phase !== "preflop") {
        text += "\n=== 数据参考 ===\n";
        if (local.equity) {
          const parts: string[] = [];
          if (local.equity.winRate !== null)
            parts.push(`胜率: ${local.equity.winRate}%`);
          if (local.equity.potOdds !== null)
            parts.push(`底池赔率: ${local.equity.potOdds}%`);
          if (local.action !== null) parts.push(`建议: ${local.action}`);
          if (parts.length > 0) {
            text += `本地计算: ${parts.join(", ")}\n`;
          }
        }

        if (response.thirdPartyResult?.equity) {
          const treys = response.thirdPartyResult.equity;
          const parts: string[] = [];
          if (treys.winRate !== null) parts.push(`胜率: ${treys.winRate}%`);
          if (treys.potOdds !== null) parts.push(`底池赔率: ${treys.potOdds}%`);
          if (treys.action) parts.push(`建议: ${treys.action}`);
          if (parts.length > 0) {
            text += `Treys (仅作对比参考): ${parts.join(", ")}\n`;
          }
        }
      }

      // 最终建议
      text += "\n=== 最终建议 ===\n";
      text += `行动: ${local.action || "无"}\n`;

      const reasoningText =
        phase === "preflop"
          ? local.reasoning || local.description || ""
          : `(以本地计算为准) ${local.reasoning || ""}`;

      text += `理由: ${reasoningText}\n`;
    } catch (e) {
      console.error(`Error formatting ${phase} suggestion:`, e, suggestion);
      text += JSON.stringify(suggestion, null, 2);
    }
  } else if (response.advices && Array.isArray(response.advices)) {
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

    if (response.explanation) {
      text += "\n=== 说明 ===\n";
      text += `${response.explanation}\n`;
    }
  } else {
    text += JSON.stringify(suggestion, null, 2);
  }

  return text;
}
