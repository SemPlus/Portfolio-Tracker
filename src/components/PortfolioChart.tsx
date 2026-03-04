import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '../types';
import { format, parseISO } from 'date-fns';

interface Props {
  data: ChartDataPoint[];
  period: string;
  onPeriodChange: (period: string) => void;
}

export default function PortfolioChart({ data, period, onPeriodChange }: Props) {
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
          <div className="space-y-1">
            <p className="text-emerald-400 font-medium">
              Value: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payload[0].value)}
            </p>
            <p className="text-zinc-300 font-medium">
              Invested: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payload[1].value)}
            </p>
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
    <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-zinc-100">Performance History</h2>
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
      
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#71717a" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#71717a" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxis} 
              stroke="#52525b" 
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              tickMargin={10}
              minTickGap={30}
            />
            <YAxis 
              tickFormatter={formatYAxis} 
              stroke="#52525b" 
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              tickMargin={10}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="totalInvested" 
              stroke="#71717a" 
              fillOpacity={1} 
              fill="url(#colorInvested)" 
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="totalValue" 
              stroke="#34d399" 
              fillOpacity={1} 
              fill="url(#colorValue)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
