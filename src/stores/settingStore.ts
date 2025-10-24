import { defineStore } from "pinia";
import type { Settings } from "@/types";

/**
 * 全局配置管理 Store
 * 职责：存储和提供运行时配置参数
 */
export const useSettingStore = defineStore("setting", {
  state: (): Settings => ({
    // ===== 默认配置值 =====
    mode: "manual", // 游戏模式: 'auto' | 'manual'
    sb: 10, // 小盲注 (Small Blind) - 修改为10
    bb: 20, // 大盲注 (Big Blind) - 修改为20
    autoDelay: 1500, // 自动模式下每步延时（毫秒）
    playerCount: 8, // 玩家数量
    minStack: 1000, // 最小初始筹码 - 修改为1000
    maxStack: 2000, // 最大初始筹码 - 修改为2000
    potType: "single_raised", // 底池类型
    p1Role: "random", // P1开局角色

    // GTO建议阶段开关
    suggestOnPreflop: true,
    suggestOnFlop: true,
    suggestOnTurn: false,
    suggestOnRiver: false,

    // 牌局预设 - 默认取消选中
    usePresetHands: false,
    usePresetCommunity: false,
    presetCards: {
      players: {},
      flop: [null, null, null],
      turn: [null],
      river: [null],
    },
  }),

  getters: {
    /**
     * 获取所有配置的副本
     */
    getAllSettings(state): Settings {
      return { ...state };
    },

    /**
     * 获取单个配置项
     */
    getSetting: (state) => (key: keyof Settings) => {
      return state[key];
    },
  },

  actions: {
    /**
     * 更新一个或多个配置项
     */
    updateSettings(newSettings: Partial<Settings>) {
      Object.assign(this, newSettings);
    },

    /**
     * 更新单个配置项
     */
    updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
      this.$patch({ [key]: value } as Partial<Settings>);

      // 如果玩家数量发生变化，重新初始化GTO过滤器
      if (key === "playerCount") {
        import("./gameStore").then(({ useGameStore }) => {
          const gameStore = useGameStore();
          gameStore.initGTOFilter();
        });
      }
    },

    /**
     * 重置所有配置为默认值
     */
    resetSettings() {
      this.mode = "manual";
      this.sb = 50;
      this.bb = 100;
      this.autoDelay = 1500;
      this.playerCount = 8;
      this.minStack = 10000;
      this.maxStack = 20000;
      this.potType = "single_raised";
      this.p1Role = "random";
      this.suggestOnPreflop = true;
      this.suggestOnFlop = true;
      this.suggestOnTurn = false;
      this.suggestOnRiver = false;
      this.usePresetHands = true; // 默认勾选（与原版保持一致）
      this.usePresetCommunity = true; // 默认勾选（与原版保持一致）
      this.presetCards = {
        players: {},
        flop: [null, null, null],
        turn: [null],
        river: [null],
      };
    },

    /**
     * 重置预设牌数据
     */
    resetPresetCards() {
      this.presetCards = {
        players: {},
        flop: [null, null, null],
        turn: [null],
        river: [null],
      };
    },

    /**
     * 更新玩家预设手牌
     */
    updatePlayerPresetCards(playerId: string, cards: string[]) {
      this.presetCards.players[playerId] = cards;
    },

    /**
     * 更新公共牌预设
     */
    updateCommunityPresetCard(
      stage: "flop" | "turn" | "river",
      index: number,
      card: string | null,
    ) {
      this.presetCards[stage][index] = card;
    },
  },
});
