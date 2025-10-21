import { defineStore } from "pinia";
import type {
  GameState,
  ActionHistory,
  HandAction,
  GTOSuggestion,
  ReplayData,
} from "@/types";
import { PokerGame } from "@/core/PokerGame";
import { getDecision } from "@/core/AI";
import { getSuggestion } from "@/api/gtoService";
import { useSettingStore } from "./settingStore";

interface GameStoreState {
  // 游戏实例
  game: PokerGame | null;

  // 游戏状态标记
  isGameRunning: boolean;
  isWaitingForManualInput: boolean;
  isGamePaused: boolean;
  isProcessingGameControl: boolean;

  // GTO 建议相关
  gtoSuggestionFilter: Set<string>;
  currentSuggestionsCache: Record<string, GTOSuggestion>;

  // 行动历史
  handActionHistory: HandAction[];
  actionRecords: ActionHistory;

  // 回放功能
  isInReplayMode: boolean;
  replayData: ReplayData;
  currentReplayStep: number;
  replayInterval: number | null;

  // 预设功能
  activeSelectionSlot: HTMLElement | null;
  usedCards: Set<string>;
  isPresetUIInitialized: boolean;
  postSnapshotAction: (() => void) | null;
  isProcessingCardSelection: boolean;

  // 快照分页
  snapshotCurrentPage: number;
  snapshotTotalPages: number;

  // 快照模态框
  showSnapshotModal: boolean;
  showViewSnapshotModal: boolean;
  currentViewSnapshotId: number | null;
  pendingSnapshotData: any | null;

  // 控制台日志
  consoleMessages: string[];
}

/**
 * 游戏主 Store
 * 管理整个游戏的状态和逻辑
 */
export const useGameStore = defineStore("game", {
  state: (): GameStoreState => ({
    game: null,
    isGameRunning: false,
    isWaitingForManualInput: false,
    isGamePaused: false,
    isProcessingGameControl: false,

    gtoSuggestionFilter: new Set(["P1"]), // 默认选中P1
    currentSuggestionsCache: {},

    handActionHistory: [],
    actionRecords: {
      P1: { preflop: [], flop: [], turn: [], river: [] },
      P2: { preflop: [], flop: [], turn: [], river: [] },
      P3: { preflop: [], flop: [], turn: [], river: [] },
      P4: { preflop: [], flop: [], turn: [], river: [] },
      P5: { preflop: [], flop: [], turn: [], river: [] },
      P6: { preflop: [], flop: [], turn: [], river: [] },
      P7: { preflop: [], flop: [], turn: [], river: [] },
      P8: { preflop: [], flop: [], turn: [], river: [] },
    },

    isInReplayMode: false,
    replayData: { settings: null, actions: [], gameState: null },
    currentReplayStep: 0,
    replayInterval: null,

    activeSelectionSlot: null,
    usedCards: new Set(),
    isPresetUIInitialized: false,
    postSnapshotAction: null,
    isProcessingCardSelection: false,

    snapshotCurrentPage: 0,
    snapshotTotalPages: 0,

    showSnapshotModal: false,
    showViewSnapshotModal: false,
    currentViewSnapshotId: null,
    pendingSnapshotData: null,

    consoleMessages: [],
  }),

  getters: {
    /**
     * 获取当前游戏状态
     */
    currentGameState(): GameState | null {
      return this.game ? this.game.getGameState() : null;
    },

    /**
     * 获取当前行动玩家ID
     */
    currentPlayerId(): string | null {
      return this.game ? this.game.getCurrentPlayerId() : null;
    },

    /**
     * 判断当前轮次是否应该显示GTO建议
     */
    shouldShowGTOSuggestion(): boolean {
      if (!this.game || !this.game.currentRound) return false;
      const settingStore = useSettingStore();
      const round = this.game.currentRound;

      switch (round) {
        case "preflop":
          return settingStore.suggestOnPreflop;
        case "flop":
          return settingStore.suggestOnFlop;
        case "turn":
          return settingStore.suggestOnTurn;
        case "river":
          return settingStore.suggestOnRiver;
        default:
          return false;
      }
    },

    /**
     * 获取活跃玩家数量
     */
    activePlayersCount(): number {
      if (!this.game) return 0;
      return this.game.players.filter((p) => !p.isFolded).length;
    },
  },

  actions: {
    /**
     * 初始化游戏
     */
    initGame() {
      this.game = new PokerGame();
      this.resetAllStates();
    },

    /**
     * 重置所有状态
     */
    resetAllStates() {
      this.isGameRunning = false;
      this.isWaitingForManualInput = false;
      this.isGamePaused = false;
      this.isProcessingGameControl = false;
      this.gtoSuggestionFilter.clear();
      this.currentSuggestionsCache = {};
      this.handActionHistory = [];
      this.resetActionRecords();
      this.isProcessingCardSelection = false;
    },

    /**
     * 重置行动记录
     */
    resetActionRecords() {
      const players = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"];
      players.forEach((playerId) => {
        this.actionRecords[playerId] = {
          preflop: [],
          flop: [],
          turn: [],
          river: [],
        };
      });
    },

    /**
     * 添加控制台日志
     */
    log(message: string) {
      const timestamp = new Date().toLocaleTimeString();
      this.consoleMessages.push(`[${timestamp}] ${message}`);
      console.log(message);
    },

    /**
     * 清空控制台日志
     */
    clearLog() {
      this.consoleMessages = [];
    },

    /**
     * 记录玩家行动
     */
    logActionToHistory(playerId: string, action: string, amount?: number) {
      const round = this.game?.currentRound;
      if (!round) return;

      let actionStr = action;
      if (amount) {
        actionStr += ` ${amount}`;
      }

      if (this.actionRecords[playerId] && this.actionRecords[playerId][round]) {
        this.actionRecords[playerId][round].push(actionStr);
      }

      // 同时添加到有序历史列表
      this.handActionHistory.push({
        playerId,
        action: actionStr,
        amount,
        round,
        timestamp: Date.now(),
      });
    },

    /**
     * 开始新游戏
     */
    async startNewGame() {
      if (!this.game) {
        this.initGame();
      }

      const settingStore = useSettingStore();

      try {
        this.log("🎮 开始新游戏...");

        // 重置状态
        this.resetAllStates();
        this.currentSuggestionsCache = {};

        // 重置游戏引擎
        this.game!.reset(settingStore.getAllSettings);

        // 发底牌
        this.game!.dealHoleCards();

        // 开始翻前轮
        this.game!.startNewRound("preflop");

        // 记录盲注动作到 ActionSheet
        const gameState = this.game!.getGameState();
        const sbPlayer = gameState.players[this.game!.sbIndex!];
        const bbPlayer = gameState.players[this.game!.bbIndex!];

        if (sbPlayer && this.actionRecords[sbPlayer.id]) {
          this.actionRecords[sbPlayer.id].preflop.push(
            `BET ${settingStore.sb}`,
          );
          this.log(
            `[SYSTEM] ${sbPlayer.id} posts Small Blind ${settingStore.sb}`,
          );
        }

        if (bbPlayer && this.actionRecords[bbPlayer.id]) {
          this.actionRecords[bbPlayer.id].preflop.push(
            `BET ${settingStore.bb}`,
          );
          this.log(
            `[SYSTEM] ${bbPlayer.id} posts Big Blind ${settingStore.bb}`,
          );
        }

        this.isGameRunning = true;
        this.log(
          `✅ 新牌局开始！盲注: SB=${settingStore.sb}, BB=${settingStore.bb}`,
        );

        // 开始处理第一个动作
        await this.processNextAction();
      } catch (error: any) {
        this.log(`❌ 游戏启动失败: ${error.message}`);
        this.stopGame();
      }
    },

    /**
     * 停止游戏
     */
    stopGame() {
      this.log("⏹️ 游戏已停止");
      this.isGameRunning = false;
      this.isWaitingForManualInput = false;
      this.isGamePaused = false;
      this.currentSuggestionsCache = {};
    },

    /**
     * 暂停/继续游戏
     */
    async togglePause() {
      if (!this.isGameRunning) return;

      this.isGamePaused = !this.isGamePaused;

      if (this.isGamePaused) {
        this.log("⏸️ 游戏已暂停");
      } else {
        this.log("▶️ 游戏继续");
        if (!this.isWaitingForManualInput) {
          await this.processNextAction();
        }
      }
    },

    /**
     * 处理下一个动作（核心流程）
     */
    async processNextAction() {
      if (!this.isGameRunning || this.isGamePaused || !this.game) return;

      const settingStore = useSettingStore();

      // 检查是否需要推进到下一轮
      if (this.game.isBettingRoundComplete()) {
        await this.advanceToNextStage();
        return;
      }

      // 检查游戏是否结束
      if (this.activePlayersCount <= 1) {
        this.log("🏆 游戏结束（只剩一位玩家）");
        await this.showdown();
        return;
      }

      const currentPlayerId = this.game.getCurrentPlayerId();
      if (!currentPlayerId) {
        this.log("⚠️ 无法确定当前玩家");
        this.stopGame();
        return;
      }

      const player = this.game.players.find((p) => p.id === currentPlayerId);
      if (!player) return;

      this.log(
        `👤 轮到 ${currentPlayerId} (${player.role}) 行动 [Stack: ${player.stack}]`,
      );

      // 获取 GTO 建议（如果需要）
      if (
        this.shouldShowGTOSuggestion &&
        this.gtoSuggestionFilter.has(currentPlayerId)
      ) {
        try {
          const suggestion = await getSuggestion(
            this.game.getGameState(),
            currentPlayerId,
            this.actionRecords,
            settingStore.getAllSettings,
          );
          this.currentSuggestionsCache[currentPlayerId] = suggestion;
          this.log(`💡 已获取 ${currentPlayerId} 的 GTO 建议`);
        } catch (error: any) {
          this.log(`⚠️ 获取 GTO 建议失败: ${error.message}`);
        }
      }

      // 手动模式：等待用户输入
      if (settingStore.mode === "manual") {
        this.isWaitingForManualInput = true;
        this.log(`⏳ 等待玩家 ${currentPlayerId} 操作...`);
        // TODO: 显示玩家操作面板
        return;
      }

      // 自动模式：AI 决策
      try {
        const decision = await getDecision(
          this.game.getGameState(),
          currentPlayerId,
          this.gtoSuggestionFilter,
          settingStore.getAllSettings,
        );

        this.log(
          `🤖 ${currentPlayerId} 决定: ${decision.action}${decision.amount ? ` ${decision.amount}` : ""}`,
        );

        // 执行动作
        this.game.executeAction(
          currentPlayerId,
          decision.action,
          decision.amount,
        );
        this.logActionToHistory(
          currentPlayerId,
          decision.action,
          decision.amount,
        );

        // 移动到下一位玩家
        this.game.moveToNextPlayer();

        // 延迟后继续
        setTimeout(() => {
          this.processNextAction();
        }, settingStore.autoDelay);
      } catch (error: any) {
        this.log(`❌ AI 决策失败: ${error.message}`);
        this.stopGame();
      }
    },

    /**
     * 执行手动玩家动作
     */
    async executeManualAction(
      playerId: string,
      action: string,
      amount?: number,
    ) {
      if (!this.game || !this.isWaitingForManualInput) return;

      try {
        this.log(`👤 ${playerId} 执行: ${action}${amount ? ` ${amount}` : ""}`);

        this.game.executeAction(playerId, action, amount);
        this.logActionToHistory(playerId, action, amount);

        this.game.moveToNextPlayer();
        this.isWaitingForManualInput = false;

        // 继续游戏流程
        const settingStore = useSettingStore();
        setTimeout(() => {
          this.processNextAction();
        }, settingStore.autoDelay);
      } catch (error: any) {
        this.log(`❌ 执行动作失败: ${error.message}`);
      }
    },

    /**
     * 推进到下一阶段
     */
    async advanceToNextStage() {
      if (!this.game) return;

      const currentRound = this.game.currentRound;
      const nextRound = this.getNextRound(currentRound);

      if (!nextRound) {
        // 进入摊牌
        await this.showdown();
        return;
      }

      this.log(`📍 进入 ${nextRound.toUpperCase()} 阶段`);

      // 发公共牌
      if (nextRound === "flop") {
        this.game.dealFlop();
      } else if (nextRound === "turn" || nextRound === "river") {
        this.game.dealTurnOrRiver();
      }

      // 开始新的下注轮
      this.game.startNewRound(nextRound);

      // 继续处理
      await this.processNextAction();
    },

    /**
     * 获取下一轮次
     */
    getNextRound(
      currentRound: string | null,
    ): "preflop" | "flop" | "turn" | "river" | null {
      const rounds: Array<"preflop" | "flop" | "turn" | "river"> = [
        "preflop",
        "flop",
        "turn",
        "river",
      ];
      if (!currentRound) return "preflop";
      const currentIndex = rounds.indexOf(currentRound as any);
      return currentIndex < rounds.length - 1 ? rounds[currentIndex + 1] : null;
    },

    /**
     * 摊牌
     */
    async showdown() {
      this.log("🃏 进入摊牌阶段");

      // 如果还没发完所有公共牌，继续发
      while (this.game && this.game.communityCards.length < 5) {
        if (this.game.communityCards.length === 0) {
          this.game.dealFlop();
        } else {
          this.game.dealTurnOrRiver();
        }
      }

      this.log("🏆 本局结束");
      this.stopGame();
    },

    /**
     * 更新 GTO 筛选玩家
     */
    updateGTOFilter(playerId: string, enabled: boolean) {
      if (enabled) {
        this.gtoSuggestionFilter.add(playerId);
      } else {
        this.gtoSuggestionFilter.delete(playerId);
      }
    },

    /**
     * 进入回放模式
     */
    enterReplayMode() {
      this.isInReplayMode = true;
      this.stopGame();
    },

    /**
     * 退出回放模式
     */
    exitReplayMode() {
      this.isInReplayMode = false;
      this.currentReplayStep = 0;
      if (this.replayInterval) {
        clearInterval(this.replayInterval);
        this.replayInterval = null;
      }
    },

    /**
     * 加载游戏状态
     */
    loadGameState(savedState: GameState) {
      if (!this.game) {
        this.initGame();
      }
      this.game!.loadState(savedState);
      this.log("✅ 游戏状态已加载");
    },
  },
});
