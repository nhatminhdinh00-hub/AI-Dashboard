
import React, { useState, useMemo } from 'react';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Line, 
  ComposedChart, 
  Cell 
} from 'recharts';
import { 
  Search, 
  BarChart3, 
  Clock, 
  Users, 
  ExternalLink, 
  Play, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  Activity, 
  Eye, 
  ShieldCheck, 
  CalendarDays, 
  X, 
  BrainCircuit, 
  Globe, 
  Zap, 
  Target, 
  Rocket, 
  AlertCircle, 
  BarChart, 
  Sparkles,
  PieChart
} from 'lucide-react';
import { DataRow, ArticleDetailInsight } from '../types';
import { generateArticleInsight } from '../services/geminiService';

interface ArticleTableProps {
  data: DataRow[];
}

const ArticleTable: React.FC<ArticleTableProps> = ({ data }) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<keyof DataRow>('PVs');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<DataRow | null>(null);
  const [articleInsight, setArticleInsight] = useState<ArticleDetailInsight | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  const formatTime = (totalSeconds: number) => {
    if (!totalSeconds || isNaN(totalSeconds)) return '0s';
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.round(totalSeconds % 60);
    if (mins > 0) return `${mins}m ${secs.toString().padStart(2, '0')}s`;
    return `${secs}s`;
  };

  const getVnExpressUrl = (id: string | number) => `https://vnexpress.net/a-p-${id}.html`;

  const averages = useMemo(() => {
    if (data.length === 0) return { pvs: 0, consumption: 0, users: 0 };
    return {
      pvs: data.reduce((acc, curr) => acc + curr.PVs, 0) / data.length,
      consumption: data.reduce((acc, curr) => acc + curr.Consumption_Rate, 0) / data.length,
      users: data.reduce((acc, curr) => acc + curr.User, 0) / data.length,
    };
  }, [data]);

  const topicData = useMemo(() => {
    const groups: Record<string, { name: string; pvs: number; consumption: number; count: number }> = {};
    data.forEach(item => {
      const topic = item.Topic_Level_1 || 'Chưa phân loại';
      if (!groups[topic]) groups[topic] = { name: topic, pvs: 0, consumption: 0, count: 0 };
      groups[topic].pvs += item.PVs;
      groups[topic].consumption += item.Consumption_Rate;
      groups[topic].count += 1;
    });
    return Object.values(groups).map(g => ({
      ...g,
      avgConsumption: (g.consumption / g.count) * 100,
      pvsM: g.pvs / 1000000 
    })).sort((a, b) => b.pvs - a.pvs);
  }, [data]);

  const allProcessed = useMemo(() => {
    let filtered = [...data];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(item => 
        String(item.article_id).toLowerCase().includes(s) || 
        item.Title.toLowerCase().includes(s)
      );
    }
    filtered.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
    return filtered;
  }, [data, search, sortField, sortDir]);

  const topTen = allProcessed.slice(0, 10);
  const theRest = allProcessed.slice(10, 50);

  const topTenMetrics = useMemo(() => {
    if (topTen.length === 0) return { pvs: 0, consumption: 0 };
    return {
      pvs: topTen.reduce((acc, curr) => acc + curr.PVs, 0) / topTen.length,
      consumption: topTen.reduce((acc, curr) => acc + curr.Consumption_Rate, 0) / topTen.length,
    };
  }, [topTen]);

  const getContentCategory = (article: DataRow) => {
    if (article.PVs > averages.pvs && article.User > averages.users) {
      return { label: '🚀 VIRAL', color: 'bg-indigo-600', icon: Rocket, type: 'viral' };
    }
    if (article.Consumption_Rate > averages.consumption * 1.15) {
      return { label: '🎯 CHẤT LƯỢNG', color: 'bg-emerald-600', icon: Target, type: 'quality' };
    }
    if (article.PVs > averages.pvs && article.Consumption_Rate < averages.consumption * 0.8) {
      return { label: '⚠️ CLICK VIEW', color: 'bg-rose-600', icon: AlertCircle, type: 'clickview' };
    }
    return { label: '📊 CHIẾN LƯỢC', color: 'bg-slate-700', icon: BarChart3, type: 'strategic' };
  };

  const handleArticleClick = async (article: DataRow) => {
    setSelectedArticle(article);
    setIsInsightLoading(true);
    setArticleInsight(null);
    const insight = await generateArticleInsight(article);
    setArticleInsight(insight);
    setIsInsightLoading(false);
  };

  const toggleSort = (field: keyof DataRow) => {
    if (sortField === field) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const getPlaceholderStyle = (id: string | number) => {
    const colors = ['from-indigo-900 to-indigo-700', 'from-slate-800 to-slate-900', 'from-purple-900 to-indigo-950', 'from-blue-900 to-indigo-900'];
    const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="space-y-16">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 px-2">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-[24px] flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
            <TrendingUp size={32} />
          </div>
          <div>
            <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Top Trending</h3>
            <p className="text-[11px] text-slate-500 uppercase tracking-[0.4em] font-bold mt-2">Kiểm định Nội dung Chiến lược</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
           <div className="glass-card p-6 rounded-[28px] border border-white/5 flex items-center gap-6 bg-gradient-to-r from-white/[0.03] to-transparent">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <BarChart size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trung bình Top 10 PVs</p>
                <div className="flex items-baseline gap-2">
                   <h4 className="text-xl font-black text-white">{Math.round(topTenMetrics.pvs).toLocaleString()}</h4>
                   <span className="text-[10px] font-black text-emerald-400">+{Math.round((topTenMetrics.pvs / averages.pvs - 1) * 100)}%</span>
                </div>
              </div>
           </div>

           <div className="glass-card p-6 rounded-[28px] border border-white/5 flex items-center gap-6 bg-gradient-to-r from-white/[0.03] to-transparent">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Consumption Top 10</p>
                <div className="flex items-baseline gap-2">
                   <h4 className="text-xl font-black text-white">{Math.round(topTenMetrics.consumption * 100)}%</h4>
                   <span className={`text-[10px] font-black ${topTenMetrics.consumption >= averages.consumption ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {topTenMetrics.consumption >= averages.consumption ? '+' : ''}{Math.round((topTenMetrics.consumption / averages.consumption - 1) * 100)}% so với Toàn bộ
                   </span>
                </div>
              </div>
           </div>

           <div className="relative group self-center lg:self-auto">
             <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
             <input 
               type="text" 
               placeholder="Lọc danh mục trending..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="bg-white/5 border border-white/10 rounded-[22px] pl-14 pr-8 py-5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full md:w-80 transition-all placeholder:text-slate-600"
             />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-24 gap-x-12 px-2">
        {topTen.map((row, idx) => {
          const isTopThree = idx < 3;
          const displayNum = idx + 1;
          const isTwoDigits = displayNum >= 10;
          // Priority AI thumbnail if available
          const currentThumb = row.aiThumbnail || row.thumbnail;
          const category = getContentCategory(row);
          return (
            <div key={idx} className="relative group cursor-pointer h-full" onClick={() => handleArticleClick(row)}>
              <div className={`absolute ${isTwoDigits ? '-left-24' : '-left-14'} -bottom-6 select-none pointer-events-none z-0`}>
                 <span className={`${isTwoDigits ? 'text-[200px]' : 'text-[240px]'} font-black leading-none transition-all duration-700 ${isTopThree ? 'text-transparent bg-clip-text bg-gradient-to-t from-indigo-500/40 via-indigo-500/10 to-transparent' : 'text-transparent stroke-white/5'}`} style={{ WebkitTextStroke: isTopThree ? '2px rgba(99,102,241,0.3)' : '4px rgba(255,255,255,0.08)', filter: isTopThree ? 'drop-shadow(0 0 20px rgba(99,102,241,0.2))' : 'none' }}>
                  {displayNum}
                 </span>
              </div>
              <div className="ml-14 relative z-10 h-full flex flex-col">
                <div className={`relative aspect-[3/4.5] rounded-[32px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.6)] transition-all duration-700 group-hover:scale-105 group-hover:-translate-y-6 border bg-[#0c0c0c] ${isTopThree ? 'border-indigo-500/30' : 'border-white/10'}`}>
                  {currentThumb ? (
                    <img src={currentThumb} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getPlaceholderStyle(row.article_id)} flex flex-col items-center justify-center p-8 text-center relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-white/[0.02]"></div>
                      <BarChart3 className="text-white/10 mb-4" size={64} />
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] relative z-10">Dữ liệu VnExpress</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent opacity-100"></div>
                  <div className="absolute top-6 left-6 flex flex-col gap-2 items-start">
                     <span className="text-[10px] font-black bg-white/10 backdrop-blur-xl text-white px-3 py-1 rounded-full uppercase tracking-widest border border-white/10">ID: {row.article_id}</span>
                     <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-widest ${category.color} shadow-lg shadow-black/50`}>
                        <category.icon size={12} /> {category.label}
                     </div>
                  </div>
                  <div className="absolute bottom-0 p-8 w-full">
                    <div className="flex items-center gap-3 mb-4"><span className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.2em] italic">{row.CateName}</span></div>
                    <h4 className="text-xl lg:text-2xl font-black text-white line-clamp-4 leading-tight group-hover:text-indigo-300 transition-colors mb-8 tracking-tighter">{row.Title}</h4>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-6 border-t border-white/10 pt-8 mb-8">
                      <div className="flex flex-col"><span className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Lượt xem</span><div className="flex items-center gap-2 text-white mt-1.5"><Eye size={18} className="text-indigo-400" /><span className="text-sm font-black">{(row.PVs / 1000).toFixed(1)}K</span></div></div>
                      <div className="flex flex-col"><span className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">T.Gian TB</span><div className="flex items-center gap-2 text-white mt-1.5"><Clock size={18} className="text-emerald-400" /><span className="text-sm font-black">{formatTime(row.TimeWatching_Per_User)}</span></div></div>
                      <div className="flex flex-col"><span className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Lượt Play</span><div className="flex items-center gap-2 text-white mt-1.5"><Activity size={18} className="text-amber-400" /><span className="text-sm font-black">{row.Total_Play.toLocaleString()}</span></div></div>
                      <div className="flex flex-col"><span className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Consumption</span><div className="flex items-center gap-2 text-emerald-400 mt-1.5"><ShieldCheck size={18} /><span className="text-sm font-black">{Math.round(row.Consumption_Rate * 100)}%</span></div></div>
                    </div>
                    <div className="flex items-center justify-between mt-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                       <div className="flex items-center gap-2"><CalendarDays size={14} className="text-slate-700" /> {String(row.Public_Time).split(' ')[0]}</div>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/60 backdrop-blur-md">
                     <div className="flex flex-col items-center gap-6 transform translate-y-8 group-hover:translate-y-0 transition-transform duration-700">
                        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-black shadow-[0_0_50px_rgba(255,255,255,0.4)]"><Zap size={40} fill="currentColor" /></div>
                        <span className="text-[12px] font-black text-white uppercase tracking-[0.5em]">Xem Chi tiết Insight</span>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl" onClick={() => setSelectedArticle(null)}></div>
          <div className="glass-card relative z-10 w-full max-w-7xl h-full max-h-[95vh] rounded-[48px] overflow-hidden flex flex-col md:flex-row shadow-[0_0_100px_rgba(99,102,241,0.2)] animate-in zoom-in-95 duration-300">
             <div className="w-full md:w-[35%] h-[300px] md:h-full relative shrink-0">
                {/* Priority AI thumbnail in modal as well */}
                {(selectedArticle.aiThumbnail || selectedArticle.thumbnail) ? (
                  <img src={selectedArticle.aiThumbnail || selectedArticle.thumbnail} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${getPlaceholderStyle(selectedArticle.article_id)} flex items-center justify-center`}><BarChart size={120} className="text-white/10" /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
                <div className="absolute bottom-10 left-10 right-10">
                   <div className="flex items-center gap-3 mb-4">
                      <span className="px-4 py-2 bg-indigo-600 rounded-full text-[10px] font-black text-white uppercase tracking-widest inline-block">{selectedArticle.CateName}</span>
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black text-white uppercase tracking-widest ${getContentCategory(selectedArticle).color}`}>{getContentCategory(selectedArticle).label}</div>
                   </div>
                   <h2 className="text-2xl md:text-4xl font-black text-white leading-tight tracking-tighter">{selectedArticle.Title}</h2>
                   <div className="flex items-center gap-6 mt-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-2"><Users size={14} /> Tiếp cận: {selectedArticle.User.toLocaleString()}</span>
                      <span className="flex items-center gap-2"><Globe size={14} /> {selectedArticle.Topic_Level_1}</span>
                   </div>
                </div>
                <button onClick={() => setSelectedArticle(null)} className="absolute top-8 left-8 p-3 rounded-full bg-black/40 text-white hover:bg-white hover:text-black transition-all"><X size={24} /></button>
             </div>
             <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[#050505]">
                <div className="flex items-center justify-between mb-12">
                   <div>
                      <h4 className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em]">Phân tích Hiệu suất</h4>
                      <p className="text-white text-xl font-bold mt-1 uppercase italic">Kiểm định Dữ liệu Điều hành</p>
                   </div>
                   <a href={getVnExpressUrl(selectedArticle.article_id)} target="_blank" className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black text-white hover:bg-white/10 transition-all uppercase tracking-widest">Xem Bản gốc <ExternalLink size={14} /></a>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                   {[
                     { label: 'Lượt xem', val: selectedArticle.PVs.toLocaleString(), icon: Eye, color: 'text-indigo-400', delta: ((selectedArticle.PVs / averages.pvs - 1) * 100).toFixed(0) },
                     { label: 'Consumption', val: `${Math.round(selectedArticle.Consumption_Rate * 100)}%`, icon: ShieldCheck, color: 'text-emerald-400', delta: ((selectedArticle.Consumption_Rate / averages.consumption - 1) * 100).toFixed(0) },
                     { label: 'Lượt Play', val: selectedArticle.Total_Play.toLocaleString(), icon: Play, color: 'text-rose-400', delta: null },
                     { label: 'Thời gian xem', val: formatTime(selectedArticle.TimeWatching_Per_User), icon: Clock, color: 'text-amber-400', delta: null }
                   ].map((stat, i) => (
                     <div key={i} className="bg-white/5 p-8 rounded-[32px] border border-white/5 relative overflow-hidden group">
                        <stat.icon size={20} className={`${stat.color} mb-4`} />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-2xl font-black text-white mt-1">{stat.val}</p>
                        {stat.delta !== null && <div className={`mt-3 text-[10px] font-black flex items-center gap-1 ${Number(stat.delta) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{Number(stat.delta) >= 0 ? '+' : ''}{stat.delta}% so với Toàn bộ</div>}
                     </div>
                   ))}
                </div>
                <div className="mb-12">
                   <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3"><Target size={16} className="text-indigo-500" /> Điểm chuẩn Hiệu suất</h5>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-8 bg-white/[0.02] p-8 rounded-[40px] border border-white/5">
                        <div className="flex justify-between items-center"><span className="text-sm font-bold text-white">Hiệu quả Consumption</span><span className="text-[10px] font-black text-slate-500 uppercase">Bài viết vs Danh mục</span></div>
                        <div className="space-y-4">
                           <div className="relative pt-1">
                              <div className="flex items-center justify-between mb-2"><div className="text-[10px] font-black text-emerald-400 uppercase">Nội dung đã chọn</div><div className="text-[10px] font-black text-white">{Math.round(selectedArticle.Consumption_Rate * 100)}%</div></div>
                              <div className="overflow-hidden h-2 text-xs flex rounded-full bg-white/5"><div style={{ width: `${selectedArticle.Consumption_Rate * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500"></div></div>
                           </div>
                           <div className="relative pt-1">
                              <div className="flex items-center justify-between mb-2"><div className="text-[10px] font-black text-slate-500 uppercase">Trung bình Toàn bộ</div><div className="text-[10px] font-black text-white">{Math.round(averages.consumption * 100)}%</div></div>
                              <div className="overflow-hidden h-2 text-xs flex rounded-full bg-white/5"><div style={{ width: `${averages.consumption * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-slate-700"></div></div>
                           </div>
                        </div>
                      </div>
                      <div className="bg-white/5 p-8 rounded-[40px] border border-white/5 flex flex-col justify-center">
                         <div className="flex items-center gap-4 mb-6"><div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400"><PieChart size={24} /></div><div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bối cảnh Topic</p><h4 className="text-white font-bold">{selectedArticle.Topic_Level_1}</h4></div></div>
                         <p className="text-slate-400 text-xs leading-relaxed italic">Bài viết này chiếm {((selectedArticle.PVs / (topicData.find(t => t.name === selectedArticle.Topic_Level_1)?.pvs || 1)) * 100).toFixed(1)}% tổng lưu lượng trong phân khúc "{selectedArticle.Topic_Level_1}".</p>
                      </div>
                   </div>
                </div>
                <div className="bg-indigo-600/5 rounded-[40px] border border-indigo-500/10 p-12 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 text-indigo-500/10"><BrainCircuit size={150} /></div>
                   <div className="relative z-10">
                      <div className="flex items-center gap-3 text-indigo-400 font-bold text-[10px] uppercase tracking-[0.4em] mb-10"><Sparkles size={18} /><span>Độc quyền Trí tuệ Gemini</span></div>
                      {isInsightLoading ? (<div className="space-y-6"><div className="h-4 bg-white/5 rounded-full w-full animate-pulse"></div><div className="h-4 bg-white/5 rounded-full w-3/4 animate-pulse"></div></div>) : articleInsight ? (
                        <div className="grid gap-12">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                              <div><h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Chân dung Khán giả</h5><p className="text-white font-bold leading-relaxed text-lg">{articleInsight.audiencePersona}</p></div>
                              <div><h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Thẻ điểm Điều hành</h5><div className="inline-block px-4 py-2 bg-white/10 rounded-xl text-indigo-300 font-black tracking-widest uppercase">{articleInsight.performanceScore}</div></div>
                           </div>
                           <div className="border-t border-white/5 pt-12">
                              <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Cơ hội Tăng trưởng</h5><p className="text-slate-400 text-base leading-relaxed mb-8">{articleInsight.growthOpportunity}</p>
                              <div className="bg-white/5 p-8 rounded-3xl border border-white/5">
                                 <p className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Điểm mấu chốt Chiến lược</p>
                                 <p className="text-white font-black text-xl leading-snug italic">"{articleInsight.strategicTakeaway}"</p>
                              </div>
                           </div>
                        </div>
                      ) : <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Không thể đồng bộ insight.</p>}
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {theRest.length > 0 && (
        <div className="mt-32">
          <div className="flex items-center justify-between mb-10 px-2">
            <div className="flex items-center gap-5"><h4 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-4"><div className="w-2 h-8 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>Kho Lưu trữ Catalog</h4><span className="px-4 py-1.5 bg-white/5 rounded-full text-[11px] font-black text-slate-500 uppercase tracking-widest border border-white/5">{theRest.length} Tài sản Nội dung</span></div>
            <button onClick={() => setIsExpanded(!isExpanded)} className="group flex items-center gap-4 px-8 py-4 rounded-[20px] bg-white/5 border border-white/10 text-[11px] font-black text-white hover:bg-indigo-600 hover:border-indigo-500 transition-all shadow-2xl">
              {isExpanded ? <>Thu gọn Kho lưu trữ <ChevronUp size={18} className="group-hover:-translate-y-1 transition-transform" /></> : <>Phân tích Kho lưu trữ <ChevronDown size={18} className="group-hover:translate-y-1 transition-transform" /></>}
            </button>
          </div>
          <div className={`overflow-hidden transition-all duration-700 ease-in-out ${isExpanded ? 'max-h-[8000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="glass-card rounded-[48px] overflow-hidden border border-white/5 bg-[#080808]/80 backdrop-blur-3xl"><div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="bg-white/[0.04]"><th className="px-10 py-8 text-[11px] font-black text-slate-500 uppercase tracking-widest w-[160px]">Thứ tự</th><th className="px-10 py-8 text-[11px] font-black text-slate-500 uppercase tracking-widest w-[40%]">Nội dung Phân tích</th>{[{ label: 'Lượt xem', key: 'PVs' }, { label: 'Plays', key: 'Total_Play' }, { label: 'Users', key: 'User' }, { label: 'Consumption', key: 'Consumption_Rate' }].map(col => (<th key={col.key} className="px-10 py-8 text-[11px] font-black text-slate-500 uppercase tracking-widest cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => toggleSort(col.key as keyof DataRow)}><div className="flex items-center gap-2">{col.label}{sortField === col.key && (<span className="text-indigo-500">{sortDir === 'desc' ? '↓' : '↑'}</span>)}</div></th>))}</tr></thead><tbody className="divide-y divide-white/5">
                {theRest.map((row, idx) => (<tr key={idx} className="hover:bg-white/[0.03] transition-all group cursor-pointer" onClick={() => handleArticleClick(row)}><td className="px-10 py-8"><div className="flex items-center gap-5"><span className="text-base font-black text-slate-700 w-8">#{idx + 11}</span><span className="px-3 py-1.5 bg-white/5 rounded-xl text-[10px] font-mono font-bold text-indigo-300 border border-white/5">{row.article_id}</span></div></td><td className="px-10 py-8"><div className="flex flex-col"><span className="text-[15px] font-bold text-white truncate max-w-xl group-hover:text-indigo-400 transition-all flex items-center gap-3">{row.Title}<ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 shrink-0" /></span><div className="flex items-center gap-4 mt-2"><span className="text-[10px] text-indigo-500/80 font-black uppercase tracking-widest">{row.CateName}</span><span className="w-1.5 h-1.5 bg-slate-800 rounded-full"></span><div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black text-white uppercase tracking-widest ${getContentCategory(row).color}`}>{getContentCategory(row).label}</div></div></div></td><td className="px-10 py-8 text-sm font-black text-slate-300">{row.PVs.toLocaleString()}</td><td className="px-10 py-8 text-sm font-medium text-slate-400">{row.Total_Play.toLocaleString()}</td><td className="px-10 py-8 text-sm font-medium text-slate-400"><div className="flex items-center gap-2"><Users size={16} className="text-slate-600" />{row.User.toLocaleString()}</div></td><td className="px-10 py-8"><div className="flex items-center gap-4"><span className="text-sm font-black text-emerald-400 w-12">{Math.round(row.Consumption_Rate * 100)}%</span><div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[80px]"><div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500" style={{ width: `${row.Consumption_Rate * 100}%` }}></div></div></div></td></tr>))}
            </tbody></table></div></div>
          </div>
        </div>
      )}

      <div className="mt-32 px-2">
         <div className="flex items-center gap-5 mb-12">
            <h4 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
              <div className="w-2 h-8 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
              Kiểm định Topic Content
            </h4>
            <span className="px-4 py-1.5 bg-white/5 rounded-full text-[11px] font-black text-slate-500 uppercase tracking-widest border border-white/5">Phân tích Portfolio</span>
         </div>
         
         <div className="glass-card p-12 rounded-[48px] border border-white/5 bg-[#080808]/80 backdrop-blur-3xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
               <Globe size={300} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
               <div className="lg:col-span-8 h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={topicData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                       <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8}/>
                             <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                       <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                       />
                       <YAxis 
                          yAxisId="left"
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                          label={{ value: 'TỔNG LƯỢT XEM (TRIỆU PVs)', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 9, fontWeight: 900 }}
                       />
                       <YAxis 
                          yAxisId="right" 
                          orientation="right" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#10b981', fontSize: 10, fontWeight: 800 }}
                          label={{ value: 'TB CONSUMPTION %', angle: 90, position: 'insideRight', fill: '#10b981', fontSize: 9, fontWeight: 900 }}
                       />
                       <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff' }}
                          itemStyle={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}
                          formatter={(value: any, name: string) => {
                            if (name === 'pvsM') return [value.toFixed(2) + ' Triệu', 'Lượt xem'];
                            if (name === 'avgConsumption') return [value.toFixed(1) + '%', 'TB Consumption'];
                            return [value, name];
                          }}
                       />
                       <Bar yAxisId="left" dataKey="pvsM" radius={[12, 12, 0, 0]} fill="url(#barGradient)" barSize={40} />
                       <Line 
                          yAxisId="right" 
                          type="monotone" 
                          dataKey="avgConsumption" 
                          stroke="#10b981" 
                          strokeWidth={4} 
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }} 
                          activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                       />
                    </ComposedChart>
                  </ResponsiveContainer>
               </div>
               
               <div className="lg:col-span-4 flex flex-col justify-center space-y-8">
                  <div className="bg-white/5 p-8 rounded-[32px] border border-white/5">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Insight Chiến lược</p>
                     <p className="text-white font-bold leading-relaxed">
                        Chủ đề <span className="text-indigo-400">"{topicData[0]?.name}"</span> là động lực chính về traffic, nhưng hãy chú ý các Topic có đường màu xanh ngọc cao để tìm ra nhóm nội dung có hiệu quả retention (consumption) vượt trội.
                     </p>
                  </div>
                  <div className="space-y-4">
                     {topicData.slice(0, 3).map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                           <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-slate-600">#{i+1}</span>
                              <span className="text-sm font-bold text-slate-300">{t.name}</span>
                           </div>
                           <span className="text-[10px] font-black text-indigo-400">{t.pvsM.toFixed(2)}M PVs</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>
      
      {allProcessed.length === 0 && (
        <div className="p-40 text-center flex flex-col items-center">
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/5"><BarChart3 className="text-slate-700" size={48} /></div>
          <h3 className="text-white font-black text-2xl uppercase tracking-tighter italic">Không tìm thấy Nội dung</h3>
          <p className="text-slate-600 text-sm font-bold uppercase tracking-widest mt-3">Điều chỉnh tham số tìm kiếm để có insight sâu hơn</p>
        </div>
      )}
    </div>
  );
};

export default ArticleTable;
