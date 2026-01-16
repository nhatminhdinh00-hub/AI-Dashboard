
import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { DataRow } from '../types';

interface DataTableProps {
  data: DataRow[];
}

const DataTable: React.FC<DataTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'PVs', direction: 'desc' });
  
  // Hàm format ngày tháng sang định dạng Tiếng Việt: DD tháng MM năm YYYY
  const formatVietnameseDate = (dateVal: string | number) => {
    if (!dateVal || dateVal === 'N/A') return 'N/A';
    
    // Nếu bị parse nhầm thành số (ví dụ 2025), ta phải cẩn thận
    // Tuy nhiên App.tsx đã được sửa để giữ nguyên string cho ngày tháng
    const dateStr = String(dateVal);
    let date = new Date(dateStr);

    // Xử lý fallback cho các định dạng ngày phổ biến trong Sheet
    if (isNaN(date.getTime())) {
      const parts = dateStr.split(/[/\s-]/);
      if (parts.length >= 3) {
        // Hỗ trợ YYYY-MM-DD hoặc DD-MM-YYYY
        if (parts[0].length === 4) { // YYYY-MM-DD
          date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else if (parts[2].length === 4) { // DD-MM-YYYY
          date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
    }

    if (isNaN(date.getTime()) || date.getFullYear() <= 1970) {
      return dateStr; // Trả về chuỗi gốc nếu không parse được hoặc bị lỗi 1970
    }

    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();

    return `${d} tháng ${m} năm ${y}`;
  };

  const sortedData = useMemo(() => {
    let result = [...data];
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.Title.toLowerCase().includes(s) || 
        r.Topic_Level_1.toLowerCase().includes(s) ||
        String(r.Public_Time).toLowerCase().includes(s)
      );
    }

    result.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === 'Public_Time') {
        const timeA = new Date(String(a.Public_Time)).getTime() || 0;
        const timeB = new Date(String(b.Public_Time)).getTime() || 0;
        return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });

    return result;
  }, [data, searchTerm, sortConfig]);

  const requestSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <div className="flex flex-col h-full bg-[#080808]">
      <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">Full Inventory</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Total Records: {data.length}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-[10px] font-bold uppercase border border-indigo-500/20">
            <Filter size={12} />
            <span>Vietnamese Date Format</span>
          </div>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
          <input 
            type="text" 
            placeholder="Tìm kiếm tiêu đề, ngày hoặc topic..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-3 bg-[#0a0a0a] border border-white/5 rounded-2xl text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-6 py-5 w-[350px]">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Article / Content</span>
              </th>
              {[
                { label: 'Public Time', key: 'Public_Time' },
                { label: 'PVs', key: 'PVs' },
                { label: 'Total Play', key: 'Total_Play' },
                { label: 'Quality Play', key: 'Quality_Play' },
                { label: 'Rate %', key: 'Consumption_Rate' },
                { label: 'Play/User', key: 'Play_Per_User' }
              ].map(col => (
                <th 
                  key={col.label} 
                  className="px-6 py-5 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => requestSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">{col.label}</span>
                    <ArrowUpDown size={10} className="text-slate-600" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedData.map((row, i) => (
              <tr key={i} className="hover:bg-white/[0.03] transition-all group">
                <td className="px-6 py-5">
                  <p className="text-white font-semibold text-[13px] truncate" title={row.Title}>{row.Title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-slate-500 uppercase font-bold px-1.5 py-0.5 bg-white/5 rounded">{row.Topic_Level_1}</span>
                    <span className="text-[9px] text-indigo-400/80 uppercase font-bold">{row.CateName}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-[11px] font-medium text-slate-400">
                  <span className="whitespace-nowrap">{formatVietnameseDate(row.Public_Time)}</span>
                </td>
                <td className="px-6 py-5 text-[13px] font-bold text-white">
                  {(row.PVs || 0).toLocaleString()}
                </td>
                <td className="px-6 py-5 text-[13px] font-medium text-slate-400">
                  {(row.Total_Play || 0).toLocaleString()}
                </td>
                <td className="px-6 py-5 text-[13px] font-medium text-emerald-500/80">
                  {(row.Quality_Play || 0).toLocaleString()}
                </td>
                <td className="px-6 py-5">
                   <div className="flex flex-col gap-1">
                      <span className="text-[12px] font-bold text-indigo-400">{((row.Consumption_Rate || 0) * 100).toFixed(1)}%</span>
                      <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${(row.Consumption_Rate || 0) * 100}%` }}></div>
                      </div>
                   </div>
                </td>
                <td className="px-6 py-5 text-[13px] font-medium text-slate-300">
                  {(row.Play_Per_User || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
