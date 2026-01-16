
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Table as TableIcon, 
  Zap, 
  RefreshCw, 
  TrendingUp,
  Target,
  Users,
  Search,
  Bell,
  Grid,
  Play,
  Filter,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { DataRow, AIAnalysisReport } from './types';
import { generateDeepReport, generateImageForTitle } from './services/geminiService';
import Dashboard from './components/Dashboard';
import DataTable from './components/DataTable';
import InsightPanel from './components/InsightPanel';
import ArticleTable from './components/ArticleTable';
import UserNeedAnalysis from './components/UserNeedAnalysis';

const DATA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAdlxOzoqsYYkxVd27Ba94w2fNe-qtKav3-3uQH1Ll33MS13TI9XGXW_bpPZ5vjrMkZPXkNKqhF8UP/pub?output=tsv";
const CACHE_KEY = "vne_go_ai_thumbs_v2";

const App: React.FC = () => {
  const [rawData, setRawData] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'table'>('overview');
  const [report, setReport] = useState<AIAnalysisReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [aiThumbCache, setAiThumbCache] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [selectedCate, setSelectedCate] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(aiThumbCache));
    } catch (e) {}
  }, [aiThumbCache]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error("Kết nối dữ liệu thất bại.");
      const text = await res.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split('\t').map(h => h.trim());
      
      const parsed = lines.slice(1).map((line, lineIdx) => {
        const values = line.split('\t');
        const rawObj: any = {};
        let detectedThumb = null;

        headers.forEach((h, i) => {
          let val = values[i]?.trim() || '';
          if (!detectedThumb && val.startsWith('http') && (val.match(/\.(jpeg|jpg|gif|png|webp)/i) || val.includes('vnecdn'))) {
            detectedThumb = val;
          }
          if (val.includes('%')) {
            rawObj[h] = parseFloat(val.replace('%', '')) / 100;
          } else if (/^-?\d+(,\d+)*(\.\d+)?$/.test(val.replace(/,/g, ''))) {
            const num = parseFloat(val.replace(/,/g, ''));
            rawObj[h] = isNaN(num) ? val : num;
          } else {
            rawObj[h] = val;
          }
        });

        const getVal = (possibleNames: string[]) => {
          for (const name of possibleNames) {
            const key = headers.find(h => h.toLowerCase() === name.toLowerCase());
            if (key !== undefined) return rawObj[key];
          }
          return null;
        };

        const realPlays = getVal(['Real Plays', 'Total Play', 'Plays']) || 0;
        const qualityPlays = getVal(['Quality Plays', 'Quality Play']) || 0;
        const users = getVal(['User', 'Users', 'Unique Users']) || 0;
        const rawId = getVal(['article_id', 'STT', 'ID']) || `art-${lineIdx}`;

        return {
          article_id: rawId,
          Title: getVal(['Title', 'Tiêu đề']) || 'Không có tiêu đề',
          CateName: getVal(['CateName', 'Folder', 'Folder Name']) || 'Khác',
          Topic_Level_1: getVal(['Topic_Level_1', 'UserNeed', 'User Need']) || 'Chung',
          UserNeed: getVal(['UserNeed', 'User Need', 'Topic_Level_1']) || 'Chung',
          Content_Angle: getVal(['Content_Angle', 'Angle']) || 'Tiêu chuẩn',
          Public_Time: getVal(['Public Time', 'Public_Time', 'Time', 'Date', 'Ngày xuất bản']) || 'N/A',
          PVs: Number(getVal(['PageViews', 'PVs', 'Views'])) || 0,
          Total_Play: Number(realPlays) || 0,
          Quality_Play: Number(qualityPlays) || 0,
          User: Number(users) || 0,
          Consumption_Rate: Number(getVal(['Consumption Rate', 'Rate', 'Consumption_Rate'])) || (realPlays > 0 ? qualityPlays / realPlays : 0),
          Play_Per_User: Number(getVal(['Play/User', 'Plays/User'])) || (users > 0 ? realPlays / users : 0),
          Session_Per_User: Number(getVal(['Session/User', 'Sessions/User'])) || 0,
          TimeWatching_Per_User: Number(getVal(['Time watching/User', 'TimeWatching/User', 'Duration'])) || 0,
          thumbnail: detectedThumb || getVal(['thumbnail', 'image', 'thumb', 'Avatar', 'Poster']),
        } as DataRow;
      });
      setRawData(parsed);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  useEffect(() => {
    const triggerImageGen = async () => {
      const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : undefined;
      if (rawData.length === 0 || !apiKey) return;
      
      const top10 = [...rawData].sort((a, b) => b.PVs - a.PVs).slice(0, 10);
      for (const article of top10) {
        const id = String(article.article_id);
        if (!aiThumbCache[id]) {
          try {
            const generated = await generateImageForTitle(article.Title);
            if (generated) setAiThumbCache(prev => ({ ...prev, [id]: generated }));
          } catch (err) {}
        }
      }
    };
    triggerImageGen();
  }, [rawData]);

  const availableCates = useMemo(() => {
    const cates = Array.from(new Set(rawData.map(d => d.CateName))).filter(Boolean).sort();
    return ['All', ...cates];
  }, [rawData]);

  const enrichedData = useMemo(() => {
    return rawData.map(item => ({
      ...item,
      aiThumbnail: aiThumbCache[String(item.article_id)]
    }));
  }, [rawData, aiThumbCache]);

  const filteredData = useMemo(() => {
    return enrichedData.filter(item => {
      const matchCate = selectedCate === 'All' || item.CateName === selectedCate;
      let matchTime = true;
      if (startDate || endDate) {
        const itemDate = new Date(item.Public_Time);
        if (!isNaN(itemDate.getTime())) {
          if (startDate && itemDate < new Date(startDate)) matchTime = false;
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (itemDate > end) matchTime = false;
          }
        } else {
          matchTime = false; 
        }
      }
      return matchCate && matchTime;
    });
  }, [enrichedData, selectedCate, startDate, endDate]);

  const dataSummary = useMemo(() => {
    if (!filteredData.length) return null;
    const numeric = ['PVs', 'Total_Play', 'Quality_Play', 'User', 'Consumption_Rate', 'Play_Per_User', 'Session_Per_User', 'TimeWatching_Per_User'];
    const aggregates: any = {};
    numeric.forEach(col => {
      const vals = filteredData.map(r => r[col] as number).filter(v => typeof v === 'number' && !isNaN(v));
      aggregates[col] = {
        sum: vals.reduce((a, b) => a + b, 0),
        avg: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0,
        countUniqueArticles: new Set(filteredData.map(r => r.article_id)).size
      };
    });
    return { aggregates } as any;
  }, [filteredData]);

  const apiKeyExists = typeof process !== 'undefined' && !!process.env.API_KEY;

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050505]">
      <div className="w-16 h-16 border-t-2 border-indigo-500 rounded-full animate-spin mb-6"></div>
      <p className="text-indigo-400 font-bold uppercase tracking-[0.3em] text-[10px]">Đang khởi động Orion Engine...</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#050505] text-slate-300">
      <aside className="w-20 border-r border-white/5 flex flex-col items-center py-8 gap-10 shrink-0 z-50 bg-[#080808]">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
          <Target size={22} />
        </div>
        <nav className="flex flex-col gap-6">
          <button onClick={() => setActiveTab('overview')} className={`p-3 rounded-xl transition-all ${activeTab === 'overview' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>
            <LayoutDashboard size={22} />
          </button>
          <button onClick={() => setActiveTab('table')} className={`p-3 rounded-xl transition-all ${activeTab === 'table' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>
            <TableIcon size={22} />
          </button>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto px-10 py-8 relative">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight uppercase">BÁO CÁO VNE GO</h2>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1">Hệ thống điều hành dữ liệu Orion 2.0</p>
          </div>
          <div className="flex items-center gap-4">
             {!apiKeyExists && (
               <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-[10px] font-black uppercase tracking-widest">
                  <AlertTriangle size={14} /> Thiếu API Key
               </div>
             )}
             <button onClick={fetchData} className="p-3 rounded-xl bg-white/5 border border-white/5 text-white hover:bg-white/10 transition-all">
                <RefreshCw size={18} />
             </button>
          </div>
        </header>

        <div className="glass-card mb-10 p-6 rounded-[32px] flex flex-wrap items-center gap-8 border border-white/5">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400"><Filter size={18} /></div>
              <div className="flex flex-col">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Chuyên mục</label>
                 <select value={selectedCate} onChange={(e) => setSelectedCate(e.target.value)} className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer">
                   {availableCates.map(cate => <option key={cate} value={cate} className="bg-[#080808] text-white">{cate === 'All' ? 'Tất cả' : cate}</option>)}
                 </select>
              </div>
           </div>
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400"><Calendar size={18} /></div>
              <div className="flex gap-6">
                 <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Từ ngày</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer [color-scheme:dark]" />
                 </div>
                 <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Đến ngày</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer [color-scheme:dark]" />
                 </div>
              </div>
           </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="space-y-12 pb-12">
            <Dashboard data={filteredData} />
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-5 glass-card p-8 rounded-[32px] flex flex-col justify-between">
                <div>
                  <h3 className="text-slate-400 text-sm font-semibold">Tổng Lượt xem (PVs)</h3>
                  <p className="text-4xl font-extrabold text-white mt-2 leading-none">{Math.round(dataSummary?.aggregates.PVs.sum || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-6 border border-white/5 flex items-center justify-between mt-6">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Tổng Lượt Play</p>
                    <p className="text-2xl font-black text-white mt-1">{Math.round(dataSummary?.aggregates.Total_Play.sum || 0).toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Play size={24} fill="currentColor" /></div>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Consumption', val: `${((dataSummary?.aggregates.Consumption_Rate.avg || 0) * 100).toFixed(1)}%`, icon: Zap },
                  { label: 'Play/User', val: (dataSummary?.aggregates.Play_Per_User.avg || 0).toFixed(2), icon: Users },
                  { label: 'Time/User', val: (dataSummary?.aggregates.TimeWatching_Per_User.avg || 0).toFixed(1), icon: TrendingUp }
                ].map((item, idx) => (
                  <div key={idx} className="glass-card p-8 rounded-[32px] flex flex-col justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white mb-6"><item.icon size={20} /></div>
                    <div><p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{item.label}</p><h4 className="text-2xl font-bold text-white mt-2">{item.val}</h4></div>
                  </div>
                ))}
              </div>
            </div>
            <ArticleTable data={filteredData} />
            <div className="flex justify-center mt-12">
               <button 
                onClick={async () => {
                  if (!dataSummary) return;
                  setIsAnalyzing(true);
                  try {
                    const res = await generateDeepReport(dataSummary as any, filteredData);
                    setReport(res);
                  } catch (e) {}
                  setIsAnalyzing(false);
                }}
                disabled={!apiKeyExists}
                className={`px-10 py-5 rounded-[24px] font-bold tracking-widest uppercase text-xs transition-all flex items-center gap-3 ${apiKeyExists ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl' : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}
              >
                {isAnalyzing ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} fill="currentColor" />}
                <span>{isAnalyzing ? 'Đang phân tích...' : 'Tạo Báo cáo AI'}</span>
               </button>
            </div>
            {report && <InsightPanel report={report} loading={isAnalyzing} />}
            <UserNeedAnalysis data={filteredData} />
          </div>
        ) : (
          <div className="glass-card rounded-[32px] overflow-hidden">
            <DataTable data={filteredData} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
