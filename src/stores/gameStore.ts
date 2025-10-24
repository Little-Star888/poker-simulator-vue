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
import { getSnapshotById } from "@/api/snapshotService";
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
  currentSuggestionsCache: Array<{
    playerId: string;
    suggestion: GTOSuggestion;
    request?: any;
    timestamp?: number;
    phase?: string; // 添加阶段信息
  }>;

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
  snapshotDataForSave: {
    gtoSuggestions: any[];
    gameState: any;
    handActionHistory: any[];
    replayData: any;
  } | null;
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

    gtoSuggestionFilter: new Set(), // 初始化为空，在游戏启动时动态设置
    currentSuggestionsCache: [],

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
    snapshotDataForSave: null,
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

    /**
     * 判断回放是否在开始位置
     */
    isAtReplayBeginning(): boolean {
      return this.isInReplayMode && this.currentReplayStep <= 0;
    },

    /**
     * 判断回放是否在结束位置
     */
    isAtReplayEnd(): boolean {
      return (
        this.isInReplayMode &&
        this.currentReplayStep >= this.replayData.actions.length
      );
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
      // this.gtoSuggestionFilter.clear(); // 不要清除这个状态，因为它是用户偏好
      this.currentSuggestionsCache = [];
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
     * 初始化GTO建议过滤器
     */
    initGTOFilter() {
      const settingStore = useSettingStore();
      // 初始化GTO建议过滤器 - 添加所有玩家（类似原版JS项目）
      this.gtoSuggestionFilter.clear();
      for (let i = 1; i <= settingStore.playerCount; i++) {
        const playerId = `P${i}`;
        this.gtoSuggestionFilter.add(playerId);
      }
      this.log(
        `🔧 GTO建议过滤器已初始化，包含所有 ${settingStore.playerCount} 位玩家`,
      );
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
      // 根据用户要求，在 BET、RAISE 和 POSTS（盲注）动作后显示金额
      if (
        amount &&
        (action.toUpperCase() === "BET" ||
          action.toUpperCase() === "RAISE" ||
          action.toUpperCase() === "POSTS")
      ) {
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

      // Validation for presets
      if (settingStore.usePresetCommunity) {
        const flop = settingStore.presetCards.flop;
        if (!flop[0] || !flop[1] || !flop[2]) {
          this.log("❌ 校验失败：已勾选“预设公共牌”，但未选择完整的3张翻牌。");
          return; // Stop the game from starting
        }
      }

      if (settingStore.usePresetHands) {
        const players = settingStore.presetCards.players;
        for (let i = 1; i <= settingStore.playerCount; i++) {
          const playerId = `P${i}`;
          const hand = players[playerId];
          if (!hand || !hand[0] || !hand[1]) {
            this.log(
              `❌ 校验失败：已勾选“预设手牌”，但玩家 ${playerId} 的手牌未完整选择。`,
            );
            return; // Stop the game from starting
          }
        }
      }

      try {
        this.log("🎮 开始新游戏...");

        // 重置状态
        this.resetAllStates();
        this.currentSuggestionsCache = [];

        // 初始化GTO建议过滤器 - 添加所有玩家（类似原版JS项目）
        this.gtoSuggestionFilter.clear();
        for (let i = 1; i <= settingStore.playerCount; i++) {
          const playerId = `P${i}`;
          this.gtoSuggestionFilter.add(playerId);
        }
        this.log(
          `🔧 GTO建议过滤器已初始化，包含所有 ${settingStore.playerCount} 位玩家`,
        );

        // 重置游戏引擎
        this.game!.reset(settingStore.getAllSettings);

        // 发底牌
        this.game!.dealHoleCards();

        // 开始翻前轮
        this.game!.startNewRound("preflop");

        // 初始化replayData以确保回放数据正确记录
        this.replayData = {
          settings: settingStore.getAllSettings,
          actions: [],
          gameState: null,
        };

        // 为回放记录包含初始筹码和手牌的"创世"状态
        this.handActionHistory.push({
          type: "initialState",
          players: JSON.parse(JSON.stringify(this.game!.players)), // 深拷贝
          action: "initialState",
          round: "preflop",
          timestamp: Date.now(),
        });

        // 同时添加到replayData.actions
        this.replayData.actions.push({
          type: "initialState",
          players: JSON.parse(JSON.stringify(this.game!.players)),
          action: "initialState",
          round: "preflop",
          timestamp: Date.now(),
        });

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
          // 为回放添加盲注动作记录（使用BET动作，与原版保持一致）
          this.replayData?.actions.push({
            playerId: sbPlayer.id,
            action: "BET",
            amount: settingStore.sb,
            round: "preflop",
            timestamp: Date.now(),
          });
        }

        if (bbPlayer && this.actionRecords[bbPlayer.id]) {
          this.actionRecords[bbPlayer.id].preflop.push(
            `BET ${settingStore.bb}`,
          );
          this.log(
            `[SYSTEM] ${bbPlayer.id} posts Big Blind ${settingStore.bb}`,
          );
          // 为回放添加盲注动作记录（使用BET动作，与原版保持一致）
          this.replayData?.actions.push({
            playerId: bbPlayer.id,
            action: "BET",
            amount: settingStore.bb,
            round: "preflop",
            timestamp: Date.now(),
          });
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
      this.log("⏹️ 游戏已停止，清空牌桌。");
      this.isGameRunning = false;
      this.isWaitingForManualInput = false;
      this.isGamePaused = false;
      this.currentSuggestionsCache = [];
      // Reset the game object to clear the table display
      this.game = new PokerGame();
      this.resetActionRecords();
      this.handActionHistory = [];
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
        await this.endHandWithWinner();
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
          // 添加到建议数组中，保留历史记录（类似原版JS项目）
          this.currentSuggestionsCache.push({
            playerId: currentPlayerId,
            suggestion: suggestion,
            timestamp: Date.now(),
            phase: this.game.currentRound || undefined, // 添加当前阶段信息
          });
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

        // 同时添加到replayData.actions以确保快照包含完整的游戏动作
        if (this.replayData && this.replayData.actions) {
          this.replayData.actions.push({
            playerId: currentPlayerId,
            action: decision.action,
            round: this.game.currentRound!,
            timestamp: Date.now(),
          });
        }

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

        // 同时添加到replayData.actions以确保快照包含完整的游戏动作
        if (this.replayData && this.replayData.actions) {
          this.replayData.actions.push({
            playerId,
            action,
            amount,
            round: this.game.currentRound!,
            timestamp: Date.now(),
          });
        }

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

      // 检查活跃玩家数量，如果只剩1人或更少，直接结束游戏
      const activePlayers = this.game.players.filter((p) => !p.isFolded);
      if (activePlayers.length <= 1) {
        this.log("🏆 游戏结束（只剩一位玩家）");
        setTimeout(() => this.endHandWithWinner(), 500);
        return;
      }

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

      // 记录发公共牌动作到replayData
      if (this.replayData && this.replayData.actions) {
        this.replayData.actions.push({
          type: "dealCommunity",
          action: "dealCommunity",
          cards: [...this.game.communityCards],
          round: nextRound,
          timestamp: Date.now(),
        });
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
     * 只有一个赢家时结束牌局
     */
    async endHandWithWinner() {
      const winner = this.game?.players.find(p => !p.isFolded);
      if (winner) {
        this.log(`🏆 ${winner.id} 是唯一的赢家，赢得底池。`);
      }

      this.log("🏆 本局结束");

      // 逻辑与showdown类似，准备数据并显示结束模态框
      console.log(
        "[DEBUG] 保存快照数据前的currentSuggestionsCache:",
        this.currentSuggestionsCache,
      );
      this.snapshotDataForSave = {
        gtoSuggestions: [...this.currentSuggestionsCache],
        gameState: this.game ? this.game.getGameState() : null,
        handActionHistory: [...this.handActionHistory],
        replayData: this.replayData ? { ...this.replayData } : null,
      };
      console.log("[DEBUG] 保存的快照数据:", this.snapshotDataForSave);

      this.showEndOfHandModal();
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

      // 在显示弹窗前保存当前快照数据，防止被stopGame清空
      console.log(
        "[DEBUG] 保存快照数据前的currentSuggestionsCache:",
        this.currentSuggestionsCache,
      );
      this.snapshotDataForSave = {
        gtoSuggestions: [...this.currentSuggestionsCache],
        gameState: this.game ? this.game.getGameState() : null,
        handActionHistory: [...this.handActionHistory],
        replayData: this.replayData ? { ...this.replayData } : null,
      };
      console.log("[DEBUG] 保存的快照数据:", this.snapshotDataForSave);

      // 显示牌局结束弹窗，提供保存快照选项
      this.showEndOfHandModal();

      // 不要在这里调用stopGame，等用户确认后再清空牌桌，这样用户可以截图
      // this.stopGame();
    },

    /**
     * 显示牌局结束弹窗
     */
    showEndOfHandModal() {
      console.log("[DEBUG] showEndOfHandModal 被调用");
      // 使用延迟确保UI更新完成
      setTimeout(() => {
        console.log("[DEBUG] 触发 showEndOfHandModal 事件");
        // 触发显示牌局结束弹窗的事件
        const event = new CustomEvent("showEndOfHandModal");
        window.dispatchEvent(event);
      }, 500);
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
      this.log("[REPLAY] 进入回放模式");
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
      this.stopGame();
      this.log("[REPLAY] 已退出回放模式");
    },

    /**
     * 开始回放
     * @param snapshotId 快照ID
     */
    async startReplay(snapshotId: number) {
      if (this.isGameRunning) {
        this.log("⚠️ 请先停止当前牌局，再开始回放");
        return;
      }

      this.log(`[REPLAY] 开始加载快照 #${snapshotId} 用于回放...`);

      try {
        // 从API获取真实的快照数据
        const snapshot = await getSnapshotById(snapshotId);

        if (!snapshot.settings || !snapshot.actionHistory) {
          this.log(
            "❌ 回放失败：此快照缺少回放所需的 settings 或 actionHistory 数据",
          );
          return;
        }

        // 解析并设置回放数据（与原版逻辑一致）
        this.replayData.settings =
          typeof snapshot.settings === "string"
            ? JSON.parse(snapshot.settings)
            : snapshot.settings;

        this.replayData.actions =
          typeof snapshot.actionHistory === "string"
            ? JSON.parse(snapshot.actionHistory)
            : snapshot.actionHistory;

        this.replayData.gameState =
          typeof snapshot.gameState === "string"
            ? JSON.parse(snapshot.gameState)
            : snapshot.gameState;

        this.stopGame(); // 确保游戏停止，UI干净
        this.enterReplayMode();
        this.resetReplay();
      } catch (error: any) {
        this.log(`❌ 回放启动失败: ${error.message}`);
        console.error("回放启动失败:", error);
      }
    },

    /**
     * 重置回放
     */
    resetReplay() {
      if (!this.isInReplayMode) return;

      this.currentReplayStep = 0;
      if (this.replayInterval) {
        clearInterval(this.replayInterval);
        this.replayInterval = null;
      }

      if (!this.replayData.settings || !this.replayData.gameState) {
        this.log("❌ [REPLAY] 回放数据不完整");
        return;
      }

      // 1. 使用快照中的设置重置游戏引擎，并强制使用原始的庄家位置
      if (!this.game) {
        this.initGame();
      }
      this.game!.reset(
        this.replayData.settings,
        this.replayData.gameState.dealerIndex,
      );

      // 2. 找到创世事件，并用它来覆盖玩家状态（初始筹码和手牌）
      const initialStateEvent = this.replayData.actions.find(
        (e) => e.type === "initialState",
      );
      if (initialStateEvent && initialStateEvent.players) {
        this.game!.players = JSON.parse(
          JSON.stringify(initialStateEvent.players),
        );
      } else {
        this.log("❌ [REPLAY] 无法开始回放：未找到initialState事件");
        return;
      }

      // 3. 开始翻前回合，这将自动处理盲注并设置正确的第一个行动者
      this.game!.startNewRound("preflop");

      // 4. 重新初始化ActionRecords结构（与原版renderActionSheet逻辑一致）
      const players = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"];
      players.forEach((playerId) => {
        this.actionRecords[playerId] = {
          preflop: [],
          flop: [],
          turn: [],
          river: [],
        };
      });

      // 5. 渲染UI（与原版一致，只创建空表格，不预先添加盲注记录）
      this.updateUIAfterReplayStep();

      this.log("[REPLAY] 回放已重置，准备就绪");
    },

    /**
     * 执行回放的下一步
     */
    nextReplayStep(isManual = false) {
      if (!this.isInReplayMode || !this.game) return;

      console.log(`[REPLAY DEBUG] nextReplayStep called:`, {
        currentStep: this.currentReplayStep,
        totalActions: this.replayData.actions.length,
        isManual,
        isInReplayMode: this.isInReplayMode,
      });

      if (this.currentReplayStep >= this.replayData.actions.length) {
        console.log(
          `[REPLAY DEBUG] 回放结束: currentStep=${this.currentReplayStep}, totalActions=${this.replayData.actions.length}`,
        );
        if (this.replayInterval) {
          clearInterval(this.replayInterval);
          this.replayInterval = null;
        }
        this.log("[REPLAY] 回放结束");
        return;
      }

      const event = this.replayData.actions[this.currentReplayStep];

      // 调试日志：打印回放事件信息
      console.log(`[REPLAY DEBUG] 处理事件:`, {
        step: this.currentReplayStep,
        event: event,
        totalActions: this.replayData.actions.length,
        settings: this.replayData.settings,
        allActions: this.replayData.actions.map((action, idx) => ({
          idx,
          playerId: action.playerId,
          action: action.action,
          amount: action.amount,
          round: action.round,
          type: action.type,
        })),
      });

      if (event.type === "initialState") {
        // 初始状态事件已在resetReplay中处理
        this.currentReplayStep++;
        return;
      }

      // 检查是否为盲注动作，如果是则只更新UI不执行动作（与原版逻辑一致）
      const sbIndex = this.game!.sbIndex;
      const bbIndex = this.game!.bbIndex;
      const sbPlayerId = this.game!.players[sbIndex!].id;
      const bbPlayerId = this.game!.players[bbIndex!].id;

      console.log(`[REPLAY DEBUG] 盲注检查:`, {
        sbIndex,
        bbIndex,
        sbPlayerId,
        bbPlayerId,
        currentEventPlayerId: event.playerId,
        currentEventAction: event.action,
        currentEventRound: event.round,
        expectedSbAmount: this.replayData.settings?.sb,
        expectedBbAmount: this.replayData.settings?.bb,
        actualAmount: event.amount,
      });

      const isSbPost =
        event.round === "preflop" &&
        event.action === "BET" &&
        event.playerId === sbPlayerId &&
        event.amount === this.replayData.settings?.sb;
      const isBbPost =
        event.round === "preflop" &&
        event.action === "BET" &&
        event.playerId === bbPlayerId &&
        event.amount === this.replayData.settings?.bb;

      console.log(`[REPLAY DEBUG] 盲注判断结果:`, { isSbPost, isBbPost });

      if (isSbPost || isBbPost) {
        // 只更新UI显示，不执行游戏引擎动作（因为引擎已处理盲注）
        this.logActionToHistory(event.playerId!, "BET", event.amount);
        this.currentReplayStep++;
        return;
      }

      // 处理不同类型的事件（与原版逻辑一致）
      if (event.type === "dealCommunity" || !event.playerId) {
        // 处理系统事件（没有playerId的事件）
        switch (event.type) {
          case "dealCommunity":
            // 处理发公共牌事件
            if (event.cards && Array.isArray(event.cards)) {
              this.game!.communityCards = event.cards;
            }
            if (event.round) {
              this.game!.startNewRound(event.round); // 开始新一轮，重置行动顺序
            }
            this.log(
              `[REPLAY] 发${event.round}公共牌: ${event.cards?.join(", ")}`,
            );
            break;
          default:
            this.log(`⚠️ [REPLAY] 未知系统事件类型: ${event.type}`);
        }
      } else {
        // 处理玩家动作事件
        const actionOrType = event.type || event.action;
        const actor = event.playerId;

        this.log(
          `[REPLAY] ${actor} ${actionOrType}${event.amount ? " " + event.amount : ""}`,
        );

        try {
          switch (event.action) {
            case "FOLD":
              this.game.executeAction(event.playerId, "FOLD");
              this.logActionToHistory(event.playerId, "FOLD");
              this.game.moveToNextPlayer();
              break;
            case "CHECK":
              this.game.executeAction(event.playerId, "CHECK");
              this.logActionToHistory(event.playerId, "CHECK");
              this.game.moveToNextPlayer();
              break;
            case "CALL":
              this.game.executeAction(event.playerId, "CALL", event.amount);
              this.logActionToHistory(event.playerId, "CALL", event.amount);
              this.game.moveToNextPlayer();
              break;
            case "BET":
            case "RAISE":
              this.game.executeAction(
                event.playerId,
                event.action,
                event.amount,
              );
              this.logActionToHistory(
                event.playerId,
                event.action,
                event.amount,
              );
              this.game.moveToNextPlayer();
              break;
            case "ALLIN":
              this.game.executeAction(event.playerId, "ALLIN", event.amount);
              this.logActionToHistory(event.playerId, "ALLIN", event.amount);
              this.game.moveToNextPlayer();
              break;
            default:
              this.log(`⚠️ [REPLAY] 未知动作类型: ${event.action}`);
          }
        } catch (error: any) {
          this.log(`❌ [REPLAY] 回放动作失败: ${error.message}`);
          if (this.replayInterval) {
            clearInterval(this.replayInterval);
            this.replayInterval = null;
          }
          return;
        }
      }

      this.currentReplayStep++;
      this.updateUIAfterReplayStep();
    },

    /**
     * 执行回放的上一步
     */
    prevReplayStep() {
      if (!this.isInReplayMode || !this.game) return;

      // 暂停播放
      if (this.replayInterval) {
        clearInterval(this.replayInterval);
        this.replayInterval = null;
      }

      if (this.currentReplayStep <= 0) {
        this.log("[REPLAY] 已经是第一步");
        return;
      }

      this.currentReplayStep--;

      // 重新构建到当前步骤的游戏状态
      this.rebuildReplayState();
      this.log(`[REPLAY] 回退到步骤 ${this.currentReplayStep}`);
    },

    /**
     * 重新构建回放状态
     */
    rebuildReplayState() {
      if (!this.replayData.settings || !this.replayData.gameState) return;

      // 重置游戏状态
      this.game!.reset(
        this.replayData.settings,
        this.replayData.gameState.dealerIndex,
      );

      // 重新设置初始玩家状态
      const initialStateEvent = this.replayData.actions.find(
        (e) => e.type === "initialState",
      );
      if (initialStateEvent && initialStateEvent.players) {
        this.game!.players = JSON.parse(
          JSON.stringify(initialStateEvent.players),
        );
      }

      // 重新开始翻前
      this.game!.startNewRound("preflop");

      // 重置行动记录
      this.resetActionRecords();

      // 重新执行到当前步骤之前的所有动作
      const originalStep = this.currentReplayStep;
      this.currentReplayStep = 0;

      while (this.currentReplayStep < originalStep) {
        const wasManual = true;
        this.nextReplayStep(wasManual);
        if (this.currentReplayStep >= this.replayData.actions.length) break;
      }
    },

    /**
     * 播放或暂停回放
     */
    playPauseReplay() {
      if (!this.isInReplayMode) return;

      if (this.replayInterval) {
        // 正在播放 -> 暂停
        clearInterval(this.replayInterval);
        this.replayInterval = null;
        this.log("[REPLAY] 暂停");
      } else {
        // 已暂停 -> 播放
        if (this.currentReplayStep >= this.replayData.actions.length) {
          this.resetReplay();
        }
        this.log("[REPLAY] 播放...");

        // 立即执行一步，然后开始定时
        this.nextReplayStep(false);
        const settingStore = useSettingStore();
        this.replayInterval = setInterval(
          () => this.nextReplayStep(false),
          settingStore.autoDelay,
        );
      }
    },

    /**
     * 更新回放后的UI
     */
    updateUIAfterReplayStep() {
      // 这个方法将由组件调用来更新UI
      // 在Vue中，UI会自动响应状态变化
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
