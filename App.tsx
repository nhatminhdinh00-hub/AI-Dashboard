
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
  Grid,
  Play,
  Filter,
  Calendar,
  Cpu,
  Sun,
  Moon
} from 'lucide-react';
import { DataRow, AIAnalysisReport } from './types';
import { generateDeepReport } from './services/geminiService';
import Dashboard from './components/Dashboard';
import DataTable from './components/DataTable';
import InsightPanel from './components/InsightPanel';
import ArticleTable from './components/ArticleTable';
import UserNeedAnalysis from './components/UserNeedAnalysis';

const DATA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAdlxOzoqsYYkxVd27Ba94w2fNe-qtKav3-3uQH1Ll33MS13TI9XGXW_bpPZ5vjrMkZPXkNKqhF8UP/pub?output=tsv";

const App: React.FC = () => {
  const [rawData, setRawData] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'table'>('overview');
  const [report, setReport] = useState<AIAnalysisReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [selectedCate, setSelectedCate] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ min: string; max: string }>({ min: '', max: '' });

  useEffect(() => {
    const savedTheme = localStorage.getItem('vne-theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.body.className = savedTheme;
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('vne-theme', nextTheme);
    document.body.className = nextTheme;
  };

  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio && typeof (window as any).aistudio.hasSelectedApiKey === 'function') {
        const exists = await (window as any).aistudio.hasSelectedApiKey();
        setHasKey(exists);
      }
    };
    checkKey();
  }, []);

  const handleConnectKey = async () => {
    if ((window as any).aistudio && typeof (window as any).aistudio.openSelectKey === 'function') {
      await (window as any).aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error("Kết nối dữ liệu thất bại.");
      const text = await res.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split('\t').map(h => h.trim());
      
      let minTime = Infinity;
      let maxTime = -Infinity;

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

        const publicTimeRaw = getVal(['Public Time', 'Public_Time', 'Time', 'Date', 'Ngày xuất bản']) || 'N/A';
        const d = new Date(publicTimeRaw);
        if (!isNaN(d.getTime())) {
          const t = d.getTime();
          if (t < minTime) minTime = t;
          if (t > maxTime) maxTime = t;
        }

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
          Public_Time: publicTimeRaw,
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

      if (minTime !== Infinity) {
        const startStr = new Date(minTime).toISOString().split('T')[0];
        const endStr = new Date(maxTime).toISOString().split('T')[0];
        setDateRange({ min: startStr, max: endStr });
        setStartDate(startStr);
        setEndDate(endStr);
      }

      setRawData(parsed);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const filteredData = useMemo(() => {
    return rawData.filter(item => {
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
  }, [rawData, selectedCate, startDate, endDate]);

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

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[var(--bg-color)]">
      <div className="w-16 h-16 border-t-2 border-indigo-500 rounded-full animate-spin mb-6"></div>
      <p className="text-indigo-400 font-bold uppercase tracking-[0.3em] text-[10px]">Đang khởi động Orion Engine...</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-[var(--bg-color)] text-[var(--text-main)] transition-colors duration-300">
      <aside className="w-20 border-r border-[var(--border-color)] flex flex-col items-center py-8 gap-10 shrink-0 z-50 bg-[var(--sidebar-bg)] shadow-xl">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
          <Target size={22} />
        </div>
        <nav className="flex flex-col gap-6">
          <button onClick={() => setActiveTab('overview')} className={`p-3 rounded-xl transition-all ${activeTab === 'overview' ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-500 hover:text-indigo-400'}`}>
            <LayoutDashboard size={22} />
          </button>
          <button onClick={() => setActiveTab('table')} className={`p-3 rounded-xl transition-all ${activeTab === 'table' ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-500 hover:text-indigo-400'}`}>
            <TableIcon size={22} />
          </button>
        </nav>
        <div className="mt-auto pb-4">
           <button onClick={toggleTheme} className="p-3 rounded-xl bg-[var(--border-color)] text-[var(--text-muted)] hover:text-indigo-500 transition-all">
             {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
           </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-6 md:px-10 py-8 relative custom-scrollbar">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-main)] tracking-tight uppercase">BÁO CÁO VNE GO</h2>
            <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-widest mt-1">Hệ thống điều hành dữ liệu Orion 2.0</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
             <button 
                onClick={handleConnectKey}
                className={`flex items-center gap-3 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${hasKey ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20'}`}
             >
                <Cpu size={16} />
                {hasKey ? 'AI Đã Kích Hoạt' : 'Kích hoạt Trí tuệ AI'}
             </button>
             <button onClick={fetchData} className="p-3 rounded-xl bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--text-main)] hover:bg-indigo-500/10 hover:text-indigo-500 transition-all shadow-sm">
                <RefreshCw size={18} />
             </button>
          </div>
        </header>

        <div className="glass-card mb-12 p-6 rounded-[32px] flex flex-wrap items-center gap-10">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500"><Filter size={18} /></div>
              <div className="flex flex-col">
                 <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Chuyên mục</label>
                 <select value={selectedCate} onChange={(e) => setSelectedCate(e.target.value)} className="bg-transparent text-sm font-bold text-[var(--text-main)] focus:outline-none cursor-pointer">
                   <option value="All" className="bg-[var(--sidebar-bg)] text-[var(--text-main)]">Tất cả</option>
                   {Array.from(new Set(rawData.map(d => d.CateName))).filter(Boolean).sort().map(cate => <option key={cate} value={cate} className="bg-[var(--sidebar-bg)] text-[var(--text-main)]">{cate}</option>)}
                 </select>
              </div>
           </div>
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500"><Calendar size={18} /></div>
              <div className="flex gap-6">
                 <div className="flex flex-col">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Từ ngày</label>
                    <input type="date" min={dateRange.min} max={dateRange.max} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`bg-transparent text-sm font-bold text-[var(--text-main)] focus:outline-none cursor-pointer ${theme === 'dark' ? '[color-scheme:dark]' : '[color-scheme:light]'}`} />
                 </div>
                 <div className="flex flex-col">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Đến ngày</label>
                    <input type="date" min={dateRange.min} max={dateRange.max} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`bg-transparent text-sm font-bold text-[var(--text-main)] focus:outline-none cursor-pointer ${theme === 'dark' ? '[color-scheme:dark]' : '[color-scheme:light]'}`} />
                 </div>
              </div>
           </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="space-y-16 pb-12">
            {/* Overview Section at the Top */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-5 glass-card p-8 rounded-[32px] flex flex-col justify-between">
                <div>
                  <h3 className="text-[var(--text-muted)] text-sm font-semibold">Tổng Lượt xem (PVs)</h3>
                  <p className="text-4xl font-extrabold text-[var(--text-main)] mt-2 leading-none">{Math.round(dataSummary?.aggregates.PVs.sum || 0).toLocaleString()}</p>
                </div>
                <div className="bg-indigo-500/5 rounded-2xl p-6 border border-indigo-500/10 flex items-center justify-between mt-8">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Tổng Lượt Play</p>
                    <p className="text-2xl font-black text-indigo-500 mt-1">{Math.round(dataSummary?.aggregates.Total_Play.sum || 0).toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><Play size={24} fill="currentColor" /></div>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Consumption', val: `${((dataSummary?.aggregates.Consumption_Rate.avg || 0) * 100).toFixed(1)}%`, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { label: 'Play/User', val: (dataSummary?.aggregates.Play_Per_User.avg || 0).toFixed(2), icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: 'Time/User', val: (dataSummary?.aggregates.TimeWatching_Per_User.avg || 0).toFixed(1), icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' }
                ].map((item, idx) => (
                  <div key={idx} className="glass-card p-8 rounded-[32px] flex flex-col justify-between hover:shadow-lg transition-shadow">
                    <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center ${item.color} mb-6`}><item.icon size={20} /></div>
                    <div><p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">{item.label}</p><h4 className="text-2xl font-bold text-[var(--text-main)] mt-2">{item.val}</h4></div>
                  </div>
                ))}
              </div>
            </div>
            
            <Dashboard data={filteredData} />
            <ArticleTable data={filteredData} />
            
            <div className="flex justify-center mt-12">
               <button 
                onClick={async () => {
                  if (!dataSummary) return;
                  if (!hasKey) { handleConnectKey(); return; }
                  setIsAnalyzing(true);
                  try {
                    const res = await generateDeepReport(dataSummary as any, filteredData);
                    setReport(res);
                  } catch (e) {}
                  setIsAnalyzing(false);
                }}
                className={`px-10 py-5 rounded-[24px] font-bold tracking-widest uppercase text-xs transition-all flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/30`}
              >
                {isAnalyzing ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} fill="currentColor" />}
                <span>{isAnalyzing ? 'Đang phân tích...' : hasKey ? 'Tạo Báo cáo Gemini Pro 3' : 'Kích hoạt AI để tạo báo cáo'}</span>
               </button>
            </div>
            {report && <InsightPanel report={report} loading={isAnalyzing} theme={theme} />}
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
