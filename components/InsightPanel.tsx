
import React from 'react';
import { Sparkles, Activity, Zap, TrendingUp, ChevronRight } from 'lucide-react';
import { AIAnalysisReport } from '../types';

interface InsightPanelProps {
  report: AIAnalysisReport | null;
  loading: boolean;
}

const InsightPanel: React.FC<InsightPanelProps> = ({ report, loading }) => {
  if (loading) return null;
  if (!report) return null;

  return (
    <div className="space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="glass-card p-12 rounded-[40px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[100px] rounded-full -mr-20 -mt-20"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-indigo-400 font-bold text-xs uppercase tracking-[0.4em] mb-6">
            <Sparkles size={18} />
            <span>Insight Điều hành AI</span>
          </div>
          <p className="text-2xl font-bold text-white leading-tight max-w-4xl tracking-tight">
            {report.summary}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: Activity, title: 'Hiệu quả', val: report.insights.highVolumeLowPlay, color: 'blue' },
          { icon: Zap, title: 'Giữ chân', val: report.insights.highConsumptionZeroPlay, color: 'emerald' },
          { icon: TrendingUp, title: 'Xu hướng', val: report.insights.playVsConsumptionTrend, color: 'purple' }
        ].map((item, idx) => (
          <div key={idx} className="glass-card p-8 rounded-[32px] border-l-2" style={{ borderLeftColor: idx === 0 ? '#3B82F6' : idx === 1 ? '#10B981' : '#A855F7' }}>
            <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <item.icon size={16} className={`text-${item.color}-500`} />
              Phân tích {item.title}
            </h4>
            <p className="text-slate-400 text-sm leading-relaxed">{item.val}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0f0f0f] border border-white/5 p-12 rounded-[40px]">
        <h4 className="text-white font-extrabold text-xl mb-10 flex items-center gap-3">
          <ChevronRight className="text-indigo-500" />
          Đề xuất Chiến lược
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {report.recommendations.map((rec, i) => (
            <div key={i} className="group cursor-default">
              <div className="flex items-center gap-2 mb-4">
                 <div className={`w-2 h-2 rounded-full ${rec.priority === 'High' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-indigo-500'}`}></div>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ưu tiên {rec.priority === 'High' ? 'Cao' : rec.priority === 'Medium' ? 'Trung bình' : 'Thấp'}</span>
              </div>
              <h5 className="text-white font-bold text-md mb-3 group-hover:text-indigo-400 transition-colors">{rec.action}</h5>
              <p className="text-slate-500 text-xs leading-relaxed italic">{rec.impact}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InsightPanel;
