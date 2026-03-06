import React, { useState, useEffect } from 'react';
import { Asset, Quote } from '../types';
import { ChevronDown, ChevronUp, Trash2, TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../context/ThemeContext';

interface Props {
  asset: Asset;
  quote?: Quote;
  onDelete: (id: number) => void;
  portfolioName?: string;
}

export default function AssetCard({ asset, quote, onDelete, portfolioName }: Props) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [period, setPeriod] = useState('1M');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const periods = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

  useEffect(() => {
    if (expanded) {
      fetchHistory();
    }
  }, [expanded, period]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/asset-history/${asset.id}?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Error fetching asset history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const price = quote?.regularMarketPrice || 0;
  const change = quote?.regularMarketChange || 0;
  const changePercent = quote?.regularMarketChangePercent || 0;
  
  const quantity = asset.quantity !== null ? asset.quantity : 0;
  const investedAmount = asset.invested_amount !== null ? asset.invested_amount : 0;
  
  const currentValue = quantity * price;
  
  const totalGain = currentValue - investedAmount;
  const totalGainPercent = investedAmount > 0 ? (totalGain / investedAmount) * 100 : 0;

  const isPositive = totalGain >= 0;
  const isDailyPositive = change >= 0;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: asset.currency }).format(val);

  const gridStroke = theme === 'dark' ? '#1e293b' : '#e2e8f0';

  return (
    <div className="glass-card overflow-hidden transition-all duration-200">
      <div 
        className="p-5 cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold">
            {asset.symbol.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-slate-900 dark:text-white font-bold text-lg">{asset.symbol}</h3>
              {portfolioName && (
                <span className="text-[10px] uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">
                  {portfolioName}
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{quote?.shortName || asset.type}</p>
          </div>
        </div>

        <div className="flex items-center space-x-8">
          <div className="text-right hidden sm:block">
            <p className="text-slate-900 dark:text-white font-bold">{formatCurrency(price)}</p>
            <p className={`text-sm flex items-center justify-end font-medium ${isDailyPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isDailyPositive ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
              {Math.abs(changePercent).toFixed(2)}%
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-slate-900 dark:text-white font-bold">{formatCurrency(currentValue)}</p>
            <p className={`text-sm font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isPositive ? '+' : ''}{formatCurrency(totalGain)}
            </p>
          </div>

          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-900/30">
          {/* Performance Chart */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                <Activity size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Performance</span>
              </div>
              <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {periods.map(p => (
                  <button
                    key={p}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPeriod(p);
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-colors ${
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
            
            <div className="h-48 w-full">
              {loadingHistory ? (
                <div className="h-full w-full flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/20 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id={`colorValue-${asset.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '12px' }}
                      formatter={(value: number) => [formatCurrency(value), 'Value']}
                      labelFormatter={(label) => {
                        const date = parseISO(label);
                        return period === '1D' ? format(date, 'MMM d, HH:mm') : format(date, 'MMM d, yyyy');
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill={`url(#colorValue-${asset.id})`} 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/20 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-sm">
                  No historical data available
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 mb-6">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Quantity</p>
              <p className="text-slate-900 dark:text-white font-mono font-bold">{quantity.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Invested</p>
              <p className="text-slate-900 dark:text-white font-mono font-bold">{formatCurrency(investedAmount)}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total Return</p>
              <p className={`font-mono font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isPositive ? '+' : ''}{totalGainPercent.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Yield</p>
              <p className="text-slate-900 dark:text-white font-mono font-bold">
                {quote?.dividendYield ? `${(quote.dividendYield * 100).toFixed(2)}%` : '—'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Sector</p>
              <p className="text-slate-900 dark:text-white font-mono font-bold truncate" title={quote?.sector || 'N/A'}>
                {quote?.sector || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Purchased</p>
              <p className="text-slate-900 dark:text-white font-mono font-bold">
                {format(parseISO(asset.purchase_date), 'MMM d, yy')}
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            {isDeleting ? (
              <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 p-2 rounded-2xl">
                <span className="text-rose-700 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider ml-2">Confirm removal?</span>
                <button 
                  type="button"
                  disabled={isProcessing}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleting(false);
                  }}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  disabled={isProcessing}
                  onClick={async (e) => {
                    e.stopPropagation();
                    setIsProcessing(true);
                    try {
                      await onDelete(asset.id);
                    } catch (err) {
                      setIsProcessing(false);
                    }
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl transition-all shadow-lg shadow-rose-500/20 flex items-center"
                >
                  {isProcessing ? <RefreshCw size={14} className="mr-2 animate-spin" /> : 'Delete'}
                </button>
              </div>
            ) : (
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleting(true);
                }}
                className="flex items-center text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-bold px-4 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              >
                <Trash2 size={16} className="mr-2" />
                Remove Asset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
