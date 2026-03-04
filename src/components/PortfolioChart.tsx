import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '../types';
import { format, parseISO } from 'date-fns';
import { TrendingUp } from 'lucide-react';

interface Props {
  data: ChartDataPoint[];
  period: string;
  onPeriodChange: (period: string) => void;
  showBenchmark: boolean;
  onToggleBenchmark: () => void;
}

export default function PortfolioChart({ data, period, onPeriodChange, showBenchmark, onToggleBenchmark }: Props) {
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
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl">
          <p className="text-zinc-400 text-sm mb-2">{format(date, dateFormat)}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between space-x-4">
              <span className="text-emerald-400 text-xs uppercase font-semibold">Portfolio</span>
              <span className="text-emerald-400 font-medium">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payload.find((p: any) => p.dataKey === 'totalValue')?.value || 0)}
              </span>
            </div>
            {showBenchmark && payload.find((p: any) => p.dataKey === 'benchmarkValue') && (
              <div className="flex items-center justify-between space-x-4">
                <span className="text-blue-400 text-xs uppercase font-semibold">S&P 500 (SPY)</span>
                <span className="text-blue-400 font-medium">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payload.find((p: any) => p.dataKey === 'benchmarkValue')?.value || 0)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between space-x-4 pt-1 border-t border-zinc-800">
              <span className="text-zinc-500 text-xs uppercase font-semibold">Invested</span>
              <span className="text-zinc-300 font-medium">
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
      <div className="h-64 flex items-center justify-center bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
        <p className="text-zinc-500">Not enough data to display chart</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-lg font-medium text-zinc-100">Performance History</h2>
          <p className="text-zinc-500 text-sm mt-1">Track your growth against the market</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onToggleBenchmark}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showBenchmark 
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                : 'bg-zinc-800 text-zinc-500 border border-transparent hover:text-zinc-300'
            }`}
          >
            <TrendingUp size={14} />
            <span>Compare with SPY</span>
          </button>

          <div className="flex space-x-1 bg-zinc-800/50 p-1 rounded-lg">
            {periods.map(p => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  period === p 
                    ? 'bg-zinc-700 text-zinc-100' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
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
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxis} 
              stroke="#52525b" 
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickMargin={12}
              minTickGap={40}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tickFormatter={formatYAxis} 
              stroke="#52525b" 
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickMargin={12}
              width={50}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3f3f46', strokeWidth: 1 }} />
            
            <Area 
              type="monotone" 
              dataKey="totalInvested" 
              stroke="#52525b" 
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
