import type { GameState, AIDecision, ActionType, Settings } from "@/types";

/**
 * AI 决策代理模块
 * 职责：根据当前游戏状态，返回玩家应采取的动作
 * 当前为 Mock 实现（带权重的随机），未来可替换为真实 AI API
 */

// 定义不同动作的权重，数值越大，被随机到的概率越高
const ACTION_WEIGHTS: Record<string, number> = {
  CHECK: 5, // 过牌/让牌，最高概率
  CALL: 4, // 跟注
  BET: 3, // 主动下注
  RAISE: 2, // 加注
  FOLD: 1, // 弃牌
  ALLIN: 0, // 全下，概率为0以禁用
};

/**
 * 获取玩家的决策建议
 */
export async function getDecision(
  gameState: GameState,
  playerId: string,
  gtoSuggestionFilter: Set<string>,
  settings: Settings,
): Promise<AIDecision> {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 200));

  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Player ${playerId} not found in game state`);
  }

  const { stack, bet: currentBet } = player;
  const { highestBet, lastRaiseAmount, currentRound, preflopRaiseCount } =
    gameState;
  const toCall = highestBet - currentBet;

  // 强制弃牌逻辑
  if (stack < 100) {
    if (toCall === 0) return { action: "CHECK" };
    return { action: "FOLD" };
  }

  // 1. 确定理论上所有可能的动作（严格禁止All-in）
  const possibleActions: string[] = [];
  if (toCall === 0) {
    possibleActions.push("CHECK");
    // 只有在有足够筹码进行一次最小下注且不会All-in时，才考虑BET
    if (stack > settings.bb) {
      possibleActions.push("BET");
    }
  } else {
    possibleActions.push("FOLD");
    // 只有在跟注后还有剩余筹码时，才CALL
    if (stack > toCall) {
      possibleActions.push("CALL");

      // 只有在能发起一次最小加注且不会All-in时，才RAISE
      const minRaiseTarget = highestBet + lastRaiseAmount;
      if (stack + currentBet > minRaiseTarget) {
        possibleActions.push("RAISE");
      }
    }
  }

  let finalActions = [...possibleActions];
  let forceAction: string | null = null;

  // 2. 应用底池类型规则 (仅限Pre-flop)
  if (currentRound === "preflop" && settings.potType !== "unrestricted") {
    const raiseCount = preflopRaiseCount;

    // 确定性场景创建：强制执行加注以达到所需的底池类型
    if (settings.potType === "3bet" || settings.potType === "4bet") {
      const requiredRaises = settings.potType === "3bet" ? 2 : 3;

      if (raiseCount < requiredRaises && possibleActions.includes("RAISE")) {
        // 计算一个固定的、最小的加注额
        const raiseAmount = highestBet + lastRaiseAmount;

        // 确保这个加注是有效的并且不会导致All-in
        if (stack + currentBet > raiseAmount) {
          return { action: "RAISE", amount: raiseAmount };
        } else if (possibleActions.includes("CALL")) {
          // 如果无法完成最小加注，则跟注
          return { action: "CALL" };
        }
        // 如果连跟注都无法完成，则会自然地在后续逻辑中选择弃牌
      }
    } else if (settings.potType === "single_raised") {
      // 对于single_raised，保持原有的强制加注一次的逻辑
      if (raiseCount < 1 && possibleActions.includes("RAISE")) {
        forceAction = "RAISE";
      }
    }

    // 达到目标后，限制进一步的加注
    let maxRaises = -1;
    if (settings.potType === "single_raised") maxRaises = 1;
    if (settings.potType === "3bet") maxRaises = 2;
    // 4bet pot不设上限

    if (maxRaises !== -1 && raiseCount >= maxRaises) {
      finalActions = finalActions.filter((action) => action !== "RAISE");
    }
  }

  let selectedAction: string;
  if (forceAction) {
    selectedAction = forceAction;
  } else {
    const weightedActions: string[] = [];

    // 为本次决策复制一份权重，以便修改
    const currentActionWeights = { ...ACTION_WEIGHTS };

    // 如果当前玩家被选中显示GTO建议，则永不弃牌（除非是唯一选项）
    if (gtoSuggestionFilter && gtoSuggestionFilter.has(playerId)) {
      currentActionWeights.FOLD = 0; // 将弃牌权重设置为0
    }

    for (const action of finalActions) {
      const weight = currentActionWeights[action] || 1; // 使用可能被修改过的权重
      for (let i = 0; i < weight; i++) {
        weightedActions.push(action);
      }
    }

    if (weightedActions.length === 0) {
      return { action: toCall === 0 ? "CHECK" : "FOLD" } as AIDecision;
    }
    selectedAction =
      weightedActions[Math.floor(Math.random() * weightedActions.length)];
  }

  // 4. 计算金额并返回（严格禁止All-in）
  switch (selectedAction) {
    case "BET": {
      const minBet = Math.min(settings.bb, stack - 1);
      const maxBet = stack - 1; // 保证不All-in
      if (minBet >= maxBet) {
        return { action: "CHECK" }; // 如果无法在不All-in的情况下bet，则check
      }
      const betAmount =
        Math.floor(Math.random() * (maxBet - minBet + 1)) + minBet;
      return { action: "BET", amount: betAmount };
    }
    case "RAISE": {
      const minRaiseTarget = highestBet + lastRaiseAmount;
      const maxRaiseTarget = stack + currentBet - 1; // 保证不All-in
      if (minRaiseTarget >= maxRaiseTarget) {
        return { action: "CALL" }; // 如果无法在不All-in的情况下raise，则call
      }
      const raiseAmount =
        Math.floor(Math.random() * (maxRaiseTarget - minRaiseTarget + 1)) +
        minRaiseTarget;
      return { action: "RAISE", amount: raiseAmount };
    }
    default:
      return { action: selectedAction as ActionType };
  }
}

/**
 * 简单估算手牌强度（0.0 ~ 1.0）
 * 注意：这是非常简化的模拟，仅用于测试
 * 目前未使用，保留供将来使用
 */
// function estimateHandStrength(holeCards: string[], communityCards: string[], round: string): number {
//   if (!holeCards || holeCards.length !== 2) return 0.1

//   const [card1, card2] = holeCards
//   const rank1 = getRankValue(card1.slice(1))
//   const rank2 = getRankValue(card2.slice(1))
//   const suit1 = card1[0]
//   const suit2 = card2[0]

//   let strength = 0.2 // 基础值

//   // 对子
//   if (rank1 === rank2) {
//     strength += 0.3
//     if (rank1 >= 10) strength += 0.2 // 高对
//   }
//   // 同花
//   else if (suit1 === suit2) {
//     strength += 0.15
//   }
//   // 连张
//   if (Math.abs(rank1 - rank2) === 1 || Math.abs(rank1 - rank2) === 12) {
//     strength += 0.1
//   }

//   // 高牌
//   const highCard = Math.max(rank1, rank2)
//   if (highCard >= 12) strength += 0.15 // A/K
//   else if (highCard >= 10) strength += 0.1 // Q/J/10

//   // 根据轮次调整（Flop 后更准确）
//   if (round !== 'preflop' && communityCards.length >= 3) {
//     // 简单：如果有公共牌，略微提升信心
//     strength = Math.min(1.0, strength * 1.2)
//   }

//   return Math.min(1.0, Math.max(0.0, strength))
// }

/**
 * 将牌面字符串转为数值（2=2, ..., A=14）
 * 目前未使用，保留供将来使用
 */
// function getRankValue(rankStr: string): number {
//   const map: Record<string, number> = {
//     '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
//     '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
//   }
//   return map[rankStr] || 2
// }
