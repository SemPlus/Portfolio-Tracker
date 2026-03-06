import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Asset, Quote, AllocationData } from '../types';

interface Props {
  assets: Asset[];
  quotes: Record<string, Quote>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function AllocationCharts({ assets, quotes }: Props) {
  const calculateAllocation = (groupBy: 'type' | 'sector'): AllocationData[] => {
    const totals: Record<string, number> = {};
    let grandTotal = 0;

    assets.forEach(asset => {
      const quote = quotes[asset.symbol];
      const value = (asset.quantity || 0) * (quote?.regularMarketPrice || 0);
      const key = groupBy === 'type' ? asset.type : (quote?.sector || 'Unknown');
      
      totals[key] = (totals[key] || 0) + value;
      grandTotal += value;
    });

    if (grandTotal === 0) return [];

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value,
        percentage: (value / grandTotal) * 100
      }))
      .sort((a, b) => b.value - a.value);
  };

  const typeData = calculateAllocation('type');
  const sectorData = calculateAllocation('sector');

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-xl">
          <p className="text-white font-bold mb-1">{data.name}</p>
          <p className="text-blue-400 text-sm font-bold">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.value)}
          </p>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{data.percentage.toFixed(1)}% of portfolio</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Asset Class Allocation</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Sector Diversification</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sectorData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {sectorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
