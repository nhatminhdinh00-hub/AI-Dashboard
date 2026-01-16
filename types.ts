
export interface DataRow {
  article_id: string | number;
  Title: string;
  CateName: string;
  Topic_Level_1: string;
  UserNeed: string;
  Content_Angle: string;
  Public_Time: string;
  PVs: number;
  Total_Play: number;
  Quality_Play: number;
  User: number;
  Consumption_Rate: number;
  Play_Per_User: number;
  Session_Per_User: number;
  TimeWatching_Per_User: number;
  thumbnail?: string;
  aiThumbnail?: string;
  [key: string]: any;
}

export interface MetricStats {
  sum: number;
  avg: number;
  min: number;
  max: number;
  countUniqueArticles: number;
}

export interface DataSummary {
  headers: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  rowCount: number;
  aggregates: {
    [column: string]: MetricStats;
  };
}

export interface ArticleDetailInsight {
  performanceScore: string;
  audiencePersona: string;
  growthOpportunity: string;
  strategicTakeaway: string;
}

export interface AIAnalysisReport {
  summary: string;
  kpis: Array<{ name: string; value: string; context: string }>;
  insights: {
    highVolumeLowPlay: string;
    highConsumptionZeroPlay: string;
    playVsConsumptionTrend: string;
  };
  recommendations: Array<{ priority: 'High' | 'Medium' | 'Low'; action: string; impact: string }>;
  mappings: {
    [article_id: string]: {
      topic: string;
      angle: string;
    }
  };
}
