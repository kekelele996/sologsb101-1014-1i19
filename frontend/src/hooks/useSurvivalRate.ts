/**
 * 成活率派生 hook
 * 按地块与测次算成活率、株高增幅与补植建议；被验收台与补植计划页复用。
 */
import { useEffect, useMemo, useState } from 'react';
import { liveQuery } from 'dexie';
import type { Survey, RateLevel } from '../types/survey';
import type { Planting } from '../types/planting';
import { db, initDatabase } from '../utils/db';
import {
  SURVIVAL_WARN_RATE,
  calcSurvivalRate,
  effectiveAliveCount,
  effectiveGrade,
  effectiveHeight,
  effectiveRate,
  heightGrowth,
  round1,
  suggestReplantCount,
} from '../utils/rate';

/** 单个测次的成活率数据点（全部字段为「生效值」：有复测取复测，无复测取初录） */
export interface SurvivalPoint {
  surveyId: string;
  round: number;
  /** 初录验收日期 */
  date: string;
  /** 生效成活株数（复测值优先） */
  aliveCount: number;
  /** 生效平均株高（复测值优先） */
  avgHeightCm: number;
  /** 生效成活率（%） */
  rate: number;
  /** 是否存在复测更正 */
  retested: boolean;
  /** 复测日期（无复测为 null） */
  retestDate: string | null;
  /** 复测说明 */
  retestNote: string;
  /** 初录成活株数（仅供「原值 → 生效值」对照展示） */
  initialAliveCount: number;
  /** 初录平均株高 */
  initialHeightCm: number;
  /** 初录成活率（%） */
  initialRate: number;
  /** 是否被人工复核过等级 */
  gradeManual: boolean;
  level: RateLevel;
}

/** 单个地块的成活率派生汇总 */
export interface SurvivalSummary {
  plotId: string;
  /** 栽植总株数 */
  totalCount: number;
  /** 按测次排序的数据点 */
  points: SurvivalPoint[];
  /** 最新测次 */
  latest: SurvivalPoint | null;
  /** 上一次测次 */
  previous: SurvivalPoint | null;
  /** 最新成活率（%） */
  latestRate: number;
  /** 与上一测次的成活率差（百分点） */
  trend: number;
  /** 株高增幅（cm） */
  heightDelta: number;
  /** 株高增幅百分比（%） */
  heightPct: number;
  /** 建议补植株数 */
  suggestReplant: number;
  /** 最新等级 */
  level: RateLevel;
  /** 是否低于告警阈值 */
  warn: boolean;
}

/** 纯函数：由验收记录与栽植记录派生地块成活率汇总 */
export function buildSurvivalSummary(
  plotId: string,
  surveys: Survey[],
  plantings: Planting[],
  threshold: number = SURVIVAL_WARN_RATE,
): SurvivalSummary {
  const totalCount = plantings
    .filter((row) => row.plotId === plotId)
    .reduce((acc, row) => acc + row.count, 0);

  const points: SurvivalPoint[] = surveys
    .filter((row) => row.plotId === plotId)
    .sort((a, b) => a.round - b.round)
    .map((row) => {
      // 生效值口径：有复测取复测的成活株数 / 株高并重算成活率；无复测照旧按初录
      const rate = effectiveRate(row, totalCount);
      const alive = effectiveAliveCount(row);
      const height = effectiveHeight(row);
      return {
        surveyId: row.id,
        round: row.round,
        date: row.date,
        aliveCount: alive,
        avgHeightCm: height,
        rate,
        retested: row.retest !== null,
        retestDate: row.retest ? row.retest.date : null,
        retestNote: row.retest ? row.retest.note : '',
        initialAliveCount: row.aliveCount,
        initialHeightCm: row.avgHeightCm,
        initialRate: totalCount > 0 ? calcSurvivalRate(row.aliveCount, totalCount) : row.survivalRate,
        gradeManual: row.gradeManual,
        level: effectiveGrade(row, rate),
      };
    });

  const latest = points.length > 0 ? points[points.length - 1] : null;
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const growth = latest && previous ? heightGrowth(previous.avgHeightCm, latest.avgHeightCm) : { delta: 0, pct: 0 };

  return {
    plotId,
    totalCount,
    points,
    latest,
    previous,
    latestRate: latest ? latest.rate : 0,
    trend: latest && previous ? round1(latest.rate - previous.rate) : 0,
    heightDelta: growth.delta,
    heightPct: growth.pct,
    suggestReplant: latest ? suggestReplantCount(totalCount, latest.aliveCount) : totalCount,
    level: latest ? latest.level : 'poor',
    warn: latest !== null && latest.rate < threshold,
  };
}

export interface UseSurvivalRateResult {
  summary: SurvivalSummary;
  loading: boolean;
  error: string;
}

/** 空汇总，用于地块不存在或尚无数据时兜底，避免页面白屏 */
export function emptySummary(plotId: string): SurvivalSummary {
  return buildSurvivalSummary(plotId, [], []);
}

/**
 * 订阅某地块的验收与栽植记录，实时派生成活率、株高增幅与补植建议。
 */
export function useSurvivalRate(plotId: string | null, threshold: number = SURVIVAL_WARN_RATE): UseSurvivalRateResult {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    const subscription = liveQuery(async () => {
      await initDatabase();
      const [surveyRows, plantingRows] = await Promise.all([db.surveys.toArray(), db.plantings.toArray()]);
      return { surveyRows, plantingRows };
    }).subscribe({
      next: ({ surveyRows, plantingRows }) => {
        if (!active) return;
        setSurveys(surveyRows);
        setPlantings(plantingRows);
        setError('');
        setLoading(false);
      },
      error: (err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : '读取成活率数据失败');
        setLoading(false);
      },
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const summary = useMemo(
    () => (plotId === null ? emptySummary('') : buildSurvivalSummary(plotId, surveys, plantings, threshold)),
    [plotId, surveys, plantings, threshold],
  );

  return { summary, loading, error };
}
