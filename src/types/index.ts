export type GameMode = "auto" | "manual";
export type PotType = "unrestricted" | "single_raised" | "3bet" | "4bet";
export type PlayerRole =
  | "BTN"
  | "SB"
  | "BB"
  | "UTG"
  | "UTG+1"
  | "UTG+2"
  | "MP1"
  | "MP2"
  | "HJ"
  | "CO";
export type GameRound = "preflop" | "flop" | "turn" | "river";
export type ActionType = "FOLD" | "CHECK" | "CALL" | "BET" | "RAISE" | "ALLIN";

export interface Player {
  id: string;
  role: PlayerRole | null;
  stack: number;
  bet: number;
  holeCards: string[];
  isFolded: boolean;
  hasActed: boolean;
  isAllIn: boolean;
  totalInvested: number;
  isDealer?: boolean;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
}

export interface GameState {
  players: Player[];
  deck?: string[];
  communityCards: string[];
  pot: number;
  currentRound: GameRound | null;
  currentPlayerIndex: number;
  dealerIndex: number;
  sbIndex?: number;
  bbIndex?: number;
  highestBet: number;
  lastRaiseAmount: number;
  preflopRaiseCount: number;
  minRaise?: number;
  lastAggressorIndex?: number;
  currentPlayerId?: string | null;
}

export interface Settings {
  mode: GameMode;
  sb: number;
  bb: number;
  autoDelay: number;
  playerCount: number;
  minStack: number;
  maxStack: number;
  potType: PotType;
  p1Role: PlayerRole | "random";
  suggestOnPreflop: boolean;
  suggestOnFlop: boolean;
  suggestOnTurn: boolean;
  suggestOnRiver: boolean;
  usePresetHands: boolean;
  usePresetCommunity: boolean;
  presetCards: {
    players: Record<string, (string | null)[]>;
    flop: (string | null)[];
    turn: (string | null)[];
    river: (string | null)[];
  };
}

export interface ActionRecord {
  preflop: string[];
  flop: string[];
  turn: string[];
  river: string[];
}

export interface ActionHistory {
  [playerId: string]: ActionRecord;
}

export interface AIDecision {
  action: ActionType;
  amount?: number;
}

export interface GTORequest {
  myCards: string[];
  boardCards: string[];
  myRole: number;
  myStack: number;
  potChips: number;
  toCall: number;
  opponents: number;
  preFlopRaisers: number;
  potType: number;
  hasPosition: boolean;
  flopActionSituation: number;
  phase: number;
  bigBlind: number;
}

export interface GTOActionAdvice {
  action: string;
  frequency: number;
  sizingRange?: {
    min: number;
    max: number;
  };
}

export interface GTOResponse {
  advices: GTOActionAdvice[];
  explanation?: string;
}

export interface GTOSuggestion {
  request: GTORequest;
  response: GTOResponse;
}

export interface SnapshotSummary {
  id: number;
  name: string;
  createdAt: string;
  timestamp?: string; // 兼容后端可能返回的timestamp字段
  thumbnailUrl?: string;
}

export interface SnapshotDetail extends SnapshotSummary {
  gameState: GameState;
  imageData?: string;
  gtoSuggestions?: Record<string, GTOSuggestion>;
  remarks?: Record<string, string>;
}

export interface SnapshotPage {
  content: SnapshotSummary[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export interface ReplayData {
  settings: Settings | null;
  actions: HandAction[];
  gameState: GameState | null;
}

export interface HandAction {
  playerId?: string; // 对于系统事件可能没有玩家ID
  action: string;
  amount?: number;
  round: GameRound;
  timestamp: number;
  type?: "initialState" | "action" | "dealCommunity"; // 新增：区分系统事件和玩家动作
  players?: Player[]; // 新增：用于初始状态事件
  cards?: string[]; // 新增：用于发公共牌事件
}

export type FlopActionSituation = "FIRST_TO_ACT" | "FACING_BET" | "AFTER_CHECK";

export interface PresetSlotData {
  type: "community" | "player";
  stage?: "flop" | "turn" | "river";
  cardIndex?: number;
  playerId?: string;
}
