
import React, { useMemo, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot, Bar, ComposedChart
} from 'recharts';
import { Clock, TrendingUp, Layers, Activity, Zap, BarChart, Info, FileText } from 'lucide-react';
import { DataRow } from '../types';

interface DashboardProps {
  data: DataRow[];
}

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [interval, setInterval] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [viewMode, setViewMode] = useState<'Total' | 'Topics'>('Total');
  const isLight = document.body.classList.contains('light');
  
  const allTopics = useMemo(() => {
    return Array.from(new Set(data.map(d => d.Topic_Level_1))).filter(Boolean);
  }, [data]);

  const [activeTopics, setActiveTopics] = useState<string[]>(allTopics);

  const toggleTopic = (topic: string) => {
    setActiveTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const parseDate = (timeStr: string) => {
    if (!timeStr || timeStr === 'N/A') return null;
    let d = new Date(timeStr);
    if (isNaN(d.getTime())) {
      const parts = timeStr.split(/[/\s:]/);
      if (parts.length >= 3) {
        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
    return isNaN(d.getTime()) ? null : d;
  };

  const chartData = useMemo(() => {
    if (!data.length) return [];

    const dates = data.map(d => parseDate(d.Public_Time)).filter(d => d !== null) as Date[];
    if (dates.length === 0) return [];

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    minDate.setHours(0, 0, 0, 0);
    maxDate.setHours(23, 59, 59, 999);

    const timeline: Date[] = [];
    let current = new Date(minDate);
    
    const stepDays = interval === 'Monthly' ? 30 : interval === 'Weekly' ? 7 : 1;

    while (current <= maxDate) {
      timeline.push(new Date(current));
      current.setDate(current.getDate() + stepDays);
    }

    return timeline.map((startDate) => {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + stepDays);

      const label = interval === 'Monthly' 
        ? startDate.toLocaleString('default', { month: 'short', year: '2-digit' })
        : `${startDate.getDate()}/${startDate.getMonth() + 1}`;

      const entry: any = { 
        name: label, 
        timestamp: startDate.getTime(), 
        totalPvs: 0,
        articleCount: 0 
      };
      
      let periodTotal = 0;
      let periodArticleCount = 0;

      allTopics.forEach((topic) => {
        const filtered = data.filter(d => {
          const dDate = parseDate(d.Public_Time);
          return d.Topic_Level_1 === topic && dDate && dDate >= startDate && dDate < endDate;
        });

        const pvsSum = filtered.reduce((acc, curr) => acc + (curr.PVs || 0), 0);
        const pvsK = pvsSum / 1000;
        const count = filtered.length;

        entry[topic] = activeTopics.includes(topic) ? pvsK : 0;
        entry[`${topic}_count`] = count;
        
        periodTotal += pvsK;
        periodArticleCount += count;
      });
      
      entry.totalPvs = periodTotal;
      entry.articleCount = periodArticleCount;
      return entry;
    });
  }, [data, allTopics, activeTopics, interval]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return { median: 0, start: 0, end: 0, max: 0, trend: 0, totalArticles: 0, avgPvsPerArticle: 0 };
    const values = chartData.map(d => d.totalPvs).sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    
    const start = chartData[0].totalPvs;
    const end = chartData[chartData.length - 1].totalPvs;
    const max = Math.max(...values);
    const trend = start !== 0 ? ((end - start) / start) * 100 : 0;

    const totalArticles = chartData.reduce((acc, curr) => acc + curr.articleCount, 0);
    const totalPvsK = chartData.reduce((acc, curr) => acc + curr.totalPvs, 0);
    const avgPvsPerArticle = totalArticles > 0 ? (totalPvsK * 1000) / totalArticles : 0;

    return { median, start, end, max, trend, totalArticles, avgPvsPerArticle };
  }, [chartData]);

  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316', '#EAB308', '#10B981', '#06B6D4'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 px-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
             <div className="w-2 h-8 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
             <h2 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tighter uppercase">Phân tích Timeline</h2>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex bg-[var(--border-color)] p-1 rounded-xl border border-[var(--border-color)]">
              {['Daily', 'Weekly', 'Monthly'].map((t) => (
                <button
                  key={t}
                  onClick={() => setInterval(t as any)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    interval === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex bg-[var(--border-color)] p-1 rounded-xl border border-[var(--border-color)]">
              <button
                onClick={() => setViewMode('Total')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  viewMode === 'Total' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-400'
                }`}
              >
                <Activity size={12} />
                Tổng thể
              </button>
              <button
                onClick={() => setViewMode('Topics')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  viewMode === 'Topics' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-400'
                }`}
              >
                <Layers size={12} />
                Theo Topic
              </button>
            </div>
          </div>
        </div>
        
        {viewMode === 'Topics' && (
          <div className="flex flex-wrap gap-2 max-w-2xl justify-start xl:justify-end animate-in fade-in slide-in-from-right-4 duration-500">
            {allTopics.map((topic, i) => (
              <button
                key={topic}
                onClick={() => toggleTopic(topic)}
                className={`px-3 py-1.5 rounded-full border transition-all text-[9px] font-bold uppercase tracking-wider ${
                  activeTopics.includes(topic)
                    ? 'bg-indigo-500 border-indigo-500/20 text-white'
                    : 'bg-transparent border-[var(--border-color)] text-slate-500'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full mr-2 inline-block" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                {topic}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-6 md:p-10 rounded-[48px] border border-[var(--border-color)] relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
          <div className="lg:col-span-8 h-[500px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="totalGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#475569" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#475569" stopOpacity={0.1}/>
                    </linearGradient>
                    {allTopics.map((topic, i) => (
                      <linearGradient key={topic} id={`glow-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.4}/>
                        <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.01}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid vertical={false} stroke={isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)"} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} 
                    dy={25}
                    minTickGap={30}
                  />
                  <YAxis 
                    yAxisId="left"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6366f1', fontSize: 10, fontWeight: 900 }} 
                    domain={[0, 'auto']}
                    tickFormatter={(val) => `${val}K`}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} 
                    domain={[0, 'auto']}
                    label={{ value: 'SỐ BÀI VIẾT', angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 9, fontWeight: 900 }}
                  />
                  <Tooltip 
                    cursor={{ fill: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ backgroundColor: isLight ? '#fff' : '#0a0a0a', border: `1px solid ${isLight ? '#eee' : 'rgba(255,255,255,0.1)'}`, borderRadius: '16px', padding: '12px' }}
                    itemStyle={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', padding: '2px 0', color: isLight ? '#0F172A' : '#fff' }}
                    formatter={(val: any, name: string) => {
                      if (name === 'totalPvs') return [Math.round(val * 1000).toLocaleString() + ' PVs', 'Tổng Lượt xem'];
                      if (name === 'articleCount') return [val + ' bài', 'Sản lượng bài'];
                      return [Math.round(val * 1000).toLocaleString() + ' PVs', name];
                    }}
                  />
                  
                  <Bar 
                    yAxisId="right" 
                    dataKey="articleCount" 
                    fill="url(#barGlow)" 
                    stroke="#475569"
                    strokeWidth={1}
                    radius={[6, 6, 0, 0]} 
                    barSize={24}
                  />

                  {viewMode === 'Total' && (
                    <ReferenceLine 
                      yAxisId="left"
                      y={stats.median} 
                      stroke="#475569" 
                      strokeDasharray="5 5" 
                      label={{ value: 'Trung vị PVs', position: 'right', fill: '#475569', fontSize: 9, fontWeight: 900 }} 
                    />
                  )}

                  {viewMode === 'Total' && chartData.length > 0 && (
                    <>
                      <ReferenceDot 
                        yAxisId="left"
                        x={chartData[0].name} 
                        y={stats.start} 
                        r={6} 
                        fill="#6366f1" 
                        stroke="#fff" 
                        strokeWidth={2} 
                        label={{ value: 'Khởi đầu', position: 'top', fill: '#6366f1', fontSize: 9, fontWeight: 900 }}
                      />
                      <ReferenceDot 
                        yAxisId="left"
                        x={chartData[chartData.length - 1].name} 
                        y={stats.end} 
                        r={6} 
                        fill="#10b981" 
                        stroke="#fff" 
                        strokeWidth={2} 
                        label={{ value: 'Kết thúc', position: 'top', fill: '#10b981', fontSize: 9, fontWeight: 900 }}
                      />
                    </>
                  )}

                  {viewMode === 'Total' ? (
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="totalPvs"
                      stroke="#6366f1"
                      strokeWidth={4}
                      fill="url(#totalGlow)"
                      animationDuration={1500}
                    />
                  ) : (
                    allTopics.map((topic, i) => (
                      <Area
                        key={topic}
                        yAxisId="left"
                        type="monotone"
                        dataKey={topic}
                        stackId="1"
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        fill={`url(#glow-${i})`}
                        animationDuration={1000}
                      />
                    ))
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <p className="text-sm font-bold tracking-widest uppercase">Không có dữ liệu trong khoảng thời gian này</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 flex flex-col justify-center space-y-6 lg:border-l lg:border-[var(--border-color)] lg:pl-12">
             <div className="flex items-center gap-3 text-indigo-500 mb-2">
                <BarChart size={20} />
                <h5 className="text-[11px] font-black uppercase tracking-[0.3em]">Hiệu suất Khoảng thời gian</h5>
             </div>

             <div className="space-y-6">
                <div className="bg-indigo-500/5 p-6 rounded-[28px] border border-indigo-500/10">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Hiệu suất Sản xuất</p>
                   <div className="flex items-baseline gap-3">
                      <h4 className="text-2xl font-black text-indigo-500">
                         {stats.totalArticles}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Tổng bài viết</span>
                   </div>
                   <p className="text-[var(--text-muted)] text-[11px] mt-3 leading-relaxed">
                      Trung bình mỗi bài viết tạo ra <span className="text-[var(--text-main)] font-bold">{Math.round(stats.avgPvsPerArticle).toLocaleString()} PVs</span>. 
                   </p>
                </div>

                <div className="bg-emerald-500/5 p-6 rounded-[28px] border border-emerald-500/10">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Biến động Tăng trưởng</p>
                   <div className="flex items-baseline gap-3">
                      <h4 className={`text-2xl font-black ${stats.trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                         {stats.trend >= 0 ? '+' : ''}{stats.trend.toFixed(1)}%
                      </h4>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">PVs vs Khởi đầu</span>
                   </div>
                   <p className="text-[var(--text-muted)] text-[11px] mt-3 leading-relaxed">
                      Lưu lượng truy cập đang {stats.trend >= 0 ? 'tăng trưởng' : 'sụt giảm'} so với điểm khởi đầu.
                   </p>
                </div>

                <div className="flex items-start gap-4 p-4 bg-[var(--border-color)] rounded-2xl border border-[var(--border-color)]">
                   <div className="mt-1"><Info size={16} className="text-slate-400" /></div>
                   <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase">
                      Dữ liệu phản hồi theo bộ lọc toàn cục: Chuyên mục và Thời gian.
                   </p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
