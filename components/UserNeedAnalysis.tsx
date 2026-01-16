
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, ComposedChart, Line, ReferenceLine, Legend
} from 'recharts';
import { Lightbulb, Target, TrendingUp, Info, BarChart3, Zap, Star, Activity, Award } from 'lucide-react';
import { DataRow } from '../types';

interface UserNeedAnalysisProps { data: DataRow[]; }

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e', '#14b8a6'];
const MIN_ARTICLE_SHARE_THRESHOLD = 0.05; // 5%

const UserNeedAnalysis: React.FC<UserNeedAnalysisProps> = ({ data }) => {
  const totalArticles = data.length;
  const isLight = document.body.classList.contains('light');

  const globalStats = useMemo(() => {
    if (totalArticles === 0) return { pvs: 0, users: 0, plays: 0, consumption: 0, playPerUser: 0, timePerSession: 0 };
    
    let totalPvs = 0;
    let totalUsers = 0;
    let totalPlays = 0;
    let totalConsumption = 0;
    let totalPlayPerUser = 0;
    let totalTimePerSession = 0;

    data.forEach(item => {
      totalPvs += (item.PVs || 0);
      totalUsers += (item.User || 0);
      totalPlays += (item.Total_Play || 0);
      totalConsumption += (item.Consumption_Rate || 0);
      totalPlayPerUser += (item.Play_Per_User || 0);
      const tps = item.Session_Per_User > 0 ? item.TimeWatching_Per_User / item.Session_Per_User : item.TimeWatching_Per_User;
      totalTimePerSession += tps;
    });

    return {
      pvs: totalPvs / totalArticles,
      users: totalUsers / totalArticles,
      plays: totalPlays / totalArticles,
      consumption: totalConsumption / totalArticles,
      playPerUser: totalPlayPerUser / totalArticles,
      timePerSession: totalTimePerSession / totalArticles,
    };
  }, [data, totalArticles]);

  const userNeedData = useMemo(() => {
    const groups: Record<string, { 
      name: string; 
      articles: number; 
      pvs: number; 
      users: number; 
      plays: number; 
      consumption: number; 
      playPerUser: number; 
      timePerSession: number;
    }> = {};
    
    data.forEach(item => {
      const need = item.UserNeed || 'Chưa phân loại';
      if (!groups[need]) {
        groups[need] = { name: need, articles: 0, pvs: 0, users: 0, plays: 0, consumption: 0, playPerUser: 0, timePerSession: 0 };
      }
      const g = groups[need];
      g.articles += 1;
      g.pvs += (item.PVs || 0);
      g.users += (item.User || 0);
      g.plays += (item.Total_Play || 0);
      g.consumption += (item.Consumption_Rate || 0);
      g.playPerUser += (item.Play_Per_User || 0);
      g.timePerSession += (item.Session_Per_User > 0 ? item.TimeWatching_Per_User / item.Session_Per_User : item.TimeWatching_Per_User);
    });

    return Object.values(groups).map(g => {
      const articleShare = g.articles / totalArticles;
      const avgPvsNeed = g.pvs / g.articles;
      const avgUsersNeed = g.users / g.articles;
      const avgPlaysNeed = g.plays / g.articles;
      const avgConsumptionNeed = g.consumption / g.articles;
      const avgPlayPerUserNeed = g.playPerUser / g.articles;
      const avgTimePerSessionNeed = g.timePerSession / g.articles;

      const riPvs = globalStats.pvs > 0 ? avgPvsNeed / globalStats.pvs : 0;
      const riUsers = globalStats.users > 0 ? avgUsersNeed / globalStats.users : 0;
      const riPlays = globalStats.plays > 0 ? avgPlaysNeed / globalStats.plays : 0;
      const riTotal = (riPvs + riUsers + riPlays) / 3;

      const diCons = globalStats.consumption > 0 ? avgConsumptionNeed / globalStats.consumption : 0;
      const diPpu = globalStats.playPerUser > 0 ? avgPlayPerUserNeed / globalStats.playPerUser : 0;
      const diTps = globalStats.timePerSession > 0 ? avgTimePerSessionNeed / globalStats.timePerSession : 0;
      const diTotal = (diCons + diPpu + diTps) / 3;

      const efficiencyScore = (riTotal + diTotal) / 2;

      return {
        name: g.name,
        articles: g.articles,
        articleShare,
        riTotal: Number(riTotal.toFixed(2)),
        diTotal: Number(diTotal.toFixed(2)),
        efficiencyScore: Number(efficiencyScore.toFixed(2)),
        pvs: g.pvs,
        pvsK: g.pvs / 1000,
        avgConsumption: avgConsumptionNeed * 100
      };
    }).sort((a, b) => b.pvs - a.pvs);
  }, [data, totalArticles, globalStats]);

  const significantNeeds = useMemo(() => {
    return userNeedData.filter(n => n.articleShare >= MIN_ARTICLE_SHARE_THRESHOLD);
  }, [userNeedData]);

  const topEfficiency = useMemo(() => [...significantNeeds].sort((a, b) => b.efficiencyScore - a.efficiencyScore)[0] || null, [significantNeeds]);
  const topRi = useMemo(() => [...significantNeeds].sort((a, b) => b.riTotal - a.riTotal)[0] || null, [significantNeeds]);
  const topDi = useMemo(() => [...significantNeeds].sort((a, b) => b.diTotal - a.diTotal)[0] || null, [significantNeeds]);

  return (
    <div className="mt-24 space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 px-2">
        <div className="flex items-center gap-5">
          <div className="w-2 h-8 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
          <div>
            <h3 className="text-3xl font-black text-[var(--text-main)] uppercase tracking-tighter">Bản đồ Hiệu quả Nhu cầu (RI vs DI)</h3>
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">
              Xếp hạng theo sản lượng PVs cho các nhóm quy mô ≥ 5%
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 md:p-10 rounded-[48px] overflow-hidden relative shadow-sm">
        <div className="absolute top-0 left-0 p-12 opacity-[0.03] pointer-events-none">
          <Award size={300} />
        </div>
        
        <div className="flex flex-col xl:flex-row gap-12 relative z-10">
          <div className="xl:w-2/3">
            <h4 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tight mb-8">Chỉ số Sức mạnh & Chiều sâu</h4>
            
            <div className="h-[450px] w-full">
              {significantNeeds.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={significantNeeds} margin={{ left: 20, right: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="riBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.3}/>
                      </linearGradient>
                      <linearGradient id="diBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)"} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 10, fontWeight: 800}}
                      dy={10}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} />
                    <Tooltip 
                      cursor={{fill: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)'}}
                      contentStyle={{ backgroundColor: isLight ? '#fff' : '#0a0a0a', border: `1px solid ${isLight ? '#eee' : 'rgba(255,255,255,0.1)'}`, borderRadius: '16px' }}
                      itemStyle={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: isLight ? '#0F172A' : '#fff' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                    />
                    <ReferenceLine y={1} stroke="#ef4444" strokeDasharray="3 3" />
                    <Bar dataKey="riTotal" name="RI (Sức mạnh)" fill="url(#riBar)" radius={[6, 6, 0, 0]} barSize={24} />
                    <Bar dataKey="diTotal" name="DI (Engagement)" fill="url(#diBar)" radius={[6, 6, 0, 0]} barSize={24} />
                    <Bar dataKey="efficiencyScore" name="Efficiency" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center border border-dashed border-[var(--border-color)] rounded-3xl">
                   <p className="text-xs font-black uppercase text-slate-400">Không đủ dữ liệu phân tích Index</p>
                </div>
              )}
            </div>
          </div>

          <div className="xl:w-1/3 flex flex-col justify-center space-y-6 lg:border-l lg:border-[var(--border-color)] lg:pl-12">
            <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-500 mb-2">Định nghĩa Chỉ số</h5>
            <div className="space-y-4">
              <div className="bg-indigo-500/5 p-5 rounded-2xl border border-indigo-500/10">
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">RI - Relative Index</p>
                <p className="text-[var(--text-muted)] text-[10px] leading-relaxed font-medium">Đo lường volume: Views, Users và Plays.</p>
              </div>
              <div className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/10">
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">DI - Engagement Index</p>
                <p className="text-[var(--text-muted)] text-[10px] leading-relaxed font-medium">Đo lường chất lượng: Consumption, Plays/User.</p>
              </div>
              <div className="bg-amber-500/5 p-5 rounded-2xl border border-amber-500/10">
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-2">Efficiency Score</p>
                <p className="text-[var(--text-muted)] text-[10px] leading-relaxed font-medium">Chỉ số cân bằng giữa quy mô và chiều sâu.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {topRi && (
          <div className="bg-indigo-500/5 p-8 rounded-[32px] border border-indigo-500/10">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 mb-6"><Target size={20} /></div>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Vua Lưu lượng (RI Max)</h4>
            <p className="text-[var(--text-main)] font-bold text-xl leading-tight">"{topRi.name}"</p>
            <div className="mt-4 flex items-center gap-3">
               <span className="text-2xl font-black text-indigo-500">{topRi.riTotal}</span>
               <span className="text-[9px] font-bold text-slate-500 uppercase">RI Points</span>
            </div>
          </div>
        )}
        {topDi && (
          <div className="bg-emerald-500/5 p-8 rounded-[32px] border border-emerald-500/10">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 mb-6"><Activity size={20} /></div>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Vua Chất lượng (DI Max)</h4>
            <p className="text-[var(--text-main)] font-bold text-xl leading-tight">"{topDi.name}"</p>
            <div className="mt-4 flex items-center gap-3">
               <span className="text-2xl font-black text-emerald-500">{topDi.diTotal}</span>
               <span className="text-[9px] font-bold text-slate-500 uppercase">DI Points</span>
            </div>
          </div>
        )}
        {topEfficiency && (
          <div className="bg-amber-500/5 p-8 rounded-[32px] border border-amber-500/10 shadow-lg">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 mb-6"><Award size={20} /></div>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Hiệu quả Tổng thể</h4>
            <p className="text-[var(--text-main)] font-bold text-xl leading-tight">"{topEfficiency.name}"</p>
            <div className="mt-4 flex items-center gap-3">
               <span className="text-2xl font-black text-amber-500">{topEfficiency.efficiencyScore}</span>
               <span className="text-[9px] font-bold text-slate-500 uppercase">Avg Score</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 glass-card p-10 rounded-[40px] flex flex-col items-center shadow-sm">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10 self-start">Tỉ trọng PVs</p>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={userNeedData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="pvs">
                  {userNeedData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: isLight ? '#fff' : '#0a0a0a', border: `1px solid ${isLight ? '#eee' : 'rgba(255,255,255,0.1)'}`, borderRadius: '12px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: isLight ? '#0F172A' : '#fff' }}
                  formatter={(val: any) => Math.round(val).toLocaleString() + ' PVs'}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', paddingLeft: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-7 glass-card p-10 rounded-[40px] shadow-sm">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10">Hiệu suất Lượt xem & Consumption</p>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={userNeedData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <defs>
                   <linearGradient id="userNeedBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.2}/>
                   </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)"} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} tickFormatter={(val) => `${val}K`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#10b981', fontSize: 10, fontWeight: 800 }} tickFormatter={(val) => `${val}%`} />
                <Tooltip contentStyle={{ backgroundColor: isLight ? '#fff' : '#0a0a0a', border: `1px solid ${isLight ? '#eee' : 'rgba(255,255,255,0.1)'}`, borderRadius: '16px' }} itemStyle={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: isLight ? '#0F172A' : '#fff' }} />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                <Bar yAxisId="left" dataKey="pvsK" name="Views (K)" fill="url(#userNeedBar)" radius={[10, 10, 0, 0]} barSize={40} />
                <Line yAxisId="right" type="monotone" dataKey="avgConsumption" name="Consumption %" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNeedAnalysis;
