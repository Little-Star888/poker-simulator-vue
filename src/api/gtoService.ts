import type {
  GameState,
  GTOSuggestion,
  ActionHistory,
  Settings,
} from "@/types";
import {
  calculateHasPosition,
  calculateFlopActionSituation,
} from "@/core/GTOLogic";
import { getApiUrl } from "@/config/api";

/**
 * 调用后端GTO建议API的服务模块
 */

// --- Mappings to match backend enum integer values ---
const ROLE_MAP: Record<string, number> = {
  BTN: 0,
  SB: 1,
  BB: 2,
  UTG: 3,
  "UTG+1": 4,
  "UTG+2": 5,
  MP1: 6,
  MP2: 7,
  HJ: 8,
  CO: 9,
};

// POT_TYPE_MAP is not used - potType is calculated dynamically by calculatePotType()
// const POT_TYPE_MAP: Record<string, number> = {
//   'single_raised': 0,
//   '3bet': 2,
//   '4bet': 3,
//   'unrestricted': 4, // Maps to UNOPENED_POT
// }

const PHASE_MAP: Record<string, number> = {
  PREFLOP: 1,
  FLOP: 2,
  TURN: 3,
  RIVER: 4,
};

const FLOP_ACTION_SITUATION_MAP: Record<string, number> = {
  FIRST_TO_ACT: 0,
  FACING_BET: 1,
  AFTER_CHECK: 2,
};

/**
 * 将前端模拟器的牌张格式，转换为后端API要求的格式
 * e.g. '♠A' -> 'As', '♥10' -> 'Th'
 */
function formatCardForAPI(cardString: string): string {
  if (!cardString || cardString.length < 2) return "";

  const suitSymbol = cardString[0];
  let rank = cardString.slice(1);

  const suitMap: Record<string, string> = {
    "♠": "s",
    "♥": "h",
    "♦": "d",
    "♣": "c",
  };
  const suit = suitMap[suitSymbol];

  // 后端通常使用 'T' 代表 10
  if (rank === "10") {
    rank = "T";
  }

  return rank + suit;
}

/**
 * 根据翻前加注次数，动态计算后端API所需的potType
 */
function calculatePotType(preflopRaiseCount: number): number {
  switch (preflopRaiseCount) {
    case 0:
      return 4; // UNOPENED_POT (前端叫 unrestricted)
    case 1:
      return 0; // single_raised
    case 2:
      return 2; // 3bet
    default:
      return 3; // 4bet and higher
  }
}

/**
 * 获取GTO建议
 */
export async function getSuggestion(
  gameState: GameState,
  currentPlayerId: string,
  actionHistory: ActionHistory,
  settings: Settings,
): Promise<GTOSuggestion> {
  console.log(
    `[DEBUG] getSuggestion called for ${currentPlayerId}. Received preflopRaiseCount: ${gameState.preflopRaiseCount}`,
  );

  const player = gameState.players.find((p) => p.id === currentPlayerId);
  if (!player) throw new Error("Player not found for suggestion");
  if (!player.role) throw new Error("Player role not assigned");

  // 当不处于翻牌圈时，计算结果为null，但API需要一个值，我们提供一个默认值0
  const flopSitString = calculateFlopActionSituation(
    gameState,
    currentPlayerId,
    actionHistory,
  );
  const flopSitInt = flopSitString
    ? FLOP_ACTION_SITUATION_MAP[flopSitString]
    : 0;

  // 动态计算potType，而不是从Settings中写死
  const calculatedPotType = calculatePotType(gameState.preflopRaiseCount);

  const requestDto = {
    myCards: player.holeCards.map(formatCardForAPI),
    boardCards: gameState.communityCards.map(formatCardForAPI),
    myRole: ROLE_MAP[player.role],
    myStack: player.stack,
    potChips: gameState.pot,
    toCall: Math.max(0, gameState.highestBet - player.bet),
    opponents: gameState.players.filter(
      (p) => !p.isFolded && p.id !== currentPlayerId,
    ).length,
    preFlopRaisers: gameState.preflopRaiseCount,
    potType: calculatedPotType,
    hasPosition: calculateHasPosition(gameState, currentPlayerId),
    flopActionSituation: flopSitInt,
    phase: PHASE_MAP[(gameState.currentRound || "preflop").toUpperCase()],
    bigBlind: settings.bb,
  };

  // 构建URL查询参数
  const params = new URLSearchParams();
  for (const key in requestDto) {
    const value = (requestDto as any)[key];
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else {
      params.append(key, value.toString());
    }
  }

  console.log(
    `[DEBUG] For ${currentPlayerId} (preflopRaiseCount: ${gameState.preflopRaiseCount}) -> Sending potType: ${calculatedPotType}`,
  );
  console.log(
    `Requesting suggestion for ${currentPlayerId}: /poker/suggestion?${params.toString()}`,
  );

  const response = await fetch(
    getApiUrl("/poker/suggestion") + `?${params.toString()}`,
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("GTO suggestion API error:", errorText);
    throw new Error(`API请求失败: ${response.status} ${errorText}`);
  }

  const suggestionResponse = await response.json();

  // 同时返回请求和响应，以便保存快照
  return { request: requestDto, response: suggestionResponse };
}
