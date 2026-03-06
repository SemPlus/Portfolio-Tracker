import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '../types';
import { format, parseISO } from 'date-fns';
import { TrendingUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  data: ChartDataPoint[];
  period: string;
  onPeriodChange: (period: string) => void;
  showBenchmark: boolean;
  onToggleBenchmark: () => void;
}

export default function PortfolioChart({ data, period, onPeriodChange, showBenchmark, onToggleBenchmark }: Props) {
  const { theme } = useTheme();
  const periods = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

  const formatXAxis = (tickItem: string) => {
    try {
      const date = parseISO(tickItem);
      if (period === '1D') return format(date, 'HH:mm');
      if (period === '1W' || period === '1M') return format(date, 'MMM d');
      if (period === '3M' || period === '1Y') return format(date, 'MMM yyyy');
      return format(date, 'yyyy');
    } catch (e) {
      return tickItem;
    }
  };

  const formatYAxis = (tickItem: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(tickItem);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = parseISO(label);
      const dateFormat = period === '1D' ? 'MMM d, HH:mm' : 'MMM d, yyyy';
      return (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">{format(date, dateFormat)}</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-6">
              <span className="text-emerald-400 text-xs uppercase font-bold">Portfolio</span>
              <span className="text-emerald-400 font-bold">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payload.find((p: any) => p.dataKey === 'totalValue')?.value || 0)}
              </span>
            </div>
            {showBenchmark && payload.find((p: any) => p.dataKey === 'benchmarkValue') && (
              <div className="flex items-center justify-between gap-6">
                <span className="text-blue-400 text-xs uppercase font-bold">S&P 500 (SPY)</span>
                <span className="text-blue-400 font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payload.find((p: any) => p.dataKey === 'benchmarkValue')?.value || 0)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-6 pt-2 border-t border-slate-800">
              <span className="text-slate-500 text-xs uppercase font-bold">Invested</span>
              <span className="text-slate-300 font-bold">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payload.find((p: any) => p.dataKey === 'totalInvested')?.value || 0)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center glass-card border-dashed">
        <p className="text-slate-500 font-bold">Not enough data to display chart</p>
      </div>
    );
  }

  const gridStroke = theme === 'dark' ? '#1e293b' : '#e2e8f0';
  const tickColor = theme === 'dark' ? '#94a3b8' : '#64748b';

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Performance History</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Track your growth against the market</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onToggleBenchmark}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              showBenchmark 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <TrendingUp size={14} />
            <span>Compare with SPY</span>
          </button>

          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {periods.map(p => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  period === p 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxis} 
              stroke="transparent" 
              tick={{ fill: tickColor, fontSize: 11, fontWeight: 'bold' }}
              tickMargin={12}
              minTickGap={40}
            />
            <YAxis 
              tickFormatter={formatYAxis} 
              stroke="transparent" 
              tick={{ fill: tickColor, fontSize: 11, fontWeight: 'bold' }}
              tickMargin={12}
              width={50}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: theme === 'dark' ? '#334155' : '#cbd5e1', strokeWidth: 1 }} />
            
            <Area 
              type="monotone" 
              dataKey="totalInvested" 
              stroke={theme === 'dark' ? '#475569' : '#94a3b8'} 
              strokeDasharray="5 5"
              fill="transparent"
              strokeWidth={1.5}
              activeDot={false}
            />

            {showBenchmark && (
              <Area 
                type="monotone" 
                dataKey="benchmarkValue" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorBenchmark)" 
                strokeWidth={2}
                dot={false}
              />
            )}

            <Area 
              type="monotone" 
              dataKey="totalValue" 
              stroke="#10b981" 
              fillOpacity={1} 
              fill="url(#colorValue)" 
              strokeWidth={2.5}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
