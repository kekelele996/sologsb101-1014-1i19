/**
 * 成活率验收（Survey）
 * 按测次登记成活株数与平均株高，成活率由成活株数 / 栽植总株数派生。
 *
 * 读数口径（方案甲：初录保留 + 生效值派生）：
 * - aliveCount / avgHeightCm / survivalRate 为「初录读数」，一经录入只能经编辑表单改正笔误，
 *   复测更正不会就地覆盖它们；
 * - retest 为事后复测更正（每条测次至多一份，重复填写以最后一次为准），存在时
 *   生效成活株数 / 生效株高 / 生效成活率 / 等级 / 告警均以复测值为准，无复测时照旧取初录；
 * - 生效值的唯一派生入口是 utils/rate.ts 的 effective* 系列与
 *   hooks/useSurvivalRate.ts 的 buildSurvivalSummary，页面与统计不得自行选字段。
 */

/** 成活率等级：优 / 良 / 一般 / 差 */
export type RateLevel = 'excellent' | 'good' | 'fair' | 'poor';

export const RATE_LEVEL_LABEL: Record<RateLevel, string> = {
  excellent: '优',
  good: '良',
  fair: '一般',
  poor: '差',
};

export const RATE_LEVEL_OPTIONS: RateLevel[] = ['excellent', 'good', 'fair', 'poor'];

/**
 * 复测更正（仪器偏差事后复测）
 * 一条测次最多一份；再次提交即整体替换（以最后一次为准），并记录更新时间。
 */
export interface SurveyRetest {
  /** 复测日期 YYYY-MM-DD */
  date: string;
  /** 复测成活株数（生效成活株数） */
  aliveCount: number;
  /** 复测平均株高（厘米，生效株高） */
  avgHeightCm: number;
  /** 复测说明（偏差原因、复测班组等） */
  note: string;
  /** 最近一次填写 / 覆盖时间 ISO */
  updatedAt: string;
}

export interface Survey {
  id: string;
  /** 所属地块 */
  plotId: string;
  /** 测次（1、2、3……） */
  round: number;
  /** 验收日期 YYYY-MM-DD */
  date: string;
  /** 初录成活株数（复测不覆盖，永久保留原始读数） */
  aliveCount: number;
  /** 初录平均株高（厘米） */
  avgHeightCm: number;
  /** 初录成活率（百分比，保留 1 位小数）——由初录成活株数 / 栽植总株数派生 */
  survivalRate: number;
  /** 生效成活率等级——默认按生效成活率区间自动判定，可人工批量调整 */
  grade: RateLevel;
  /** 该等级是否被人工调整过 */
  gradeManual: boolean;
  /** 复测更正；null 表示未复测，全部统计照旧按初录算 */
  retest: SurveyRetest | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

/** 新建 / 编辑验收记录的表单草稿（只改正初录笔误，不承载复测） */
export interface SurveyDraft {
  plotId: string;
  round: number;
  date: string;
  aliveCount: number;
  avgHeightCm: number;
}

/** 复测更正表单草稿（复测日期、成活株数、株高、说明） */
export interface SurveyRetestDraft {
  date: string;
  aliveCount: number;
  avgHeightCm: number;
  note: string;
}
