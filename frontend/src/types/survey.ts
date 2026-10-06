/**
 * 成活率验收（Survey）
 * 按测次登记成活株数与平均株高，成活率由成活株数 / 栽植总株数派生。
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
 * 复测更正记录
 * 验收后发现仪器偏差等情况时补录；一条测次最多保留一次，重复提交以最后一次为准。
 * 初录读数（aliveCount / avgHeightCm / survivalRate）保持不动，页面与统计统一改用生效值。
 */
export interface SurveyRecheck {
  /** 复测日期 YYYY-MM-DD */
  date: string;
  /** 复测成活株数 */
  aliveCount: number;
  /** 复测平均株高（厘米） */
  avgHeightCm: number;
  /** 更正说明（仪器偏差、复测原因等） */
  note: string;
  /** 本次复测更正的写入时间（ISO），重复提交时刷新 */
  recordedAt: string;
}

export interface Survey {
  id: string;
  /** 所属地块 */
  plotId: string;
  /** 测次（1、2、3……） */
  round: number;
  /** 验收日期 YYYY-MM-DD（初录日期，复测不改写） */
  date: string;
  /** 成活株数（初录读数，复测不改写） */
  aliveCount: number;
  /** 平均株高（厘米）（初录读数，复测不改写） */
  avgHeightCm: number;
  /** 成活率（百分比，保留 1 位小数）——默认由初录成活株数 / 栽植总株数派生 */
  survivalRate: number;
  /** 成活率等级——按生效成活率自动判定的缓存，可人工批量调整锁定 */
  grade: RateLevel;
  /** 该等级是否被人工调整过；人工锁定后不随复测重算 */
  gradeManual: boolean;
  /** 复测更正（可选）；存在时成活率、等级、告警与汇总均按复测值生效 */
  recheck?: SurveyRecheck;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

/** 新建 / 编辑验收记录的表单草稿 */
export interface SurveyDraft {
  plotId: string;
  round: number;
  date: string;
  aliveCount: number;
  avgHeightCm: number;
}

/** 复测更正的表单草稿（recordedAt 由 store 补齐） */
export interface RecheckDraft {
  date: string;
  aliveCount: number;
  avgHeightCm: number;
  note: string;
}
