import React, { useState, useEffect } from 'react';
import { Asset, Quote } from '../types';
import { ChevronDown, ChevronUp, Trash2, TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  asset: Asset;
  quote?: Quote;
  onDelete: (id: number) => void;
  portfolioName?: string;
}

export default function AssetCard({ asset, quote, onDelete, portfolioName }: Props) {
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
  
  // Use the values from the database which are now guaranteed to be filled (or at least better estimated) by the backend
  const quantity = asset.quantity !== null ? asset.quantity : 0;
  const investedAmount = asset.invested_amount !== null ? asset.invested_amount : 0;
  
  const currentValue = quantity * price;
  
  const totalGain = currentValue - investedAmount;
  const totalGainPercent = investedAmount > 0 ? (totalGain / investedAmount) * 100 : 0;

  const isPositive = totalGain >= 0;
  const isDailyPositive = change >= 0;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: asset.currency }).format(val);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-200 hover:border-zinc-700">
      <div 
        className="p-5 cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-medium">
            {asset.symbol.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-zinc-100 font-semibold text-lg">{asset.symbol}</h3>
              {portfolioName && (
                <span className="text-[10px] uppercase tracking-wider bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">
                  {portfolioName}
                </span>
              )}
            </div>
            <p className="text-zinc-500 text-sm">{quote?.shortName || asset.type}</p>
          </div>
        </div>

        <div className="flex items-center space-x-8">
          <div className="text-right hidden sm:block">
            <p className="text-zinc-100 font-medium">{formatCurrency(price)}</p>
            <p className={`text-sm flex items-center justify-end ${isDailyPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isDailyPositive ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
              {Math.abs(changePercent).toFixed(2)}%
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-zinc-100 font-semibold">{formatCurrency(currentValue)}</p>
            <p className={`text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? '+' : ''}{formatCurrency(totalGain)}
            </p>
          </div>

          <button className="text-zinc-500 hover:text-zinc-300 p-1">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-zinc-800 p-5 bg-zinc-900/50">
          {/* Performance Chart */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-zinc-400">
                <Activity size={16} />
                <span className="text-xs font-medium uppercase tracking-wider">Performance</span>
              </div>
              <div className="flex space-x-1 bg-zinc-800/50 p-1 rounded-lg">
                {periods.map(p => (
                  <button
                    key={p}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPeriod(p);
                    }}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                      period === p 
                        ? 'bg-zinc-700 text-zinc-100' 
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/30'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-48 w-full">
              {loadingHistory ? (
                <div className="h-full w-full flex items-center justify-center bg-zinc-800/20 rounded-xl border border-zinc-800/50">
                  <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      hide 
                    />
                    <YAxis 
                      hide 
                      domain={['auto', 'auto']} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                      itemStyle={{ color: '#10b981' }}
                      labelStyle={{ color: '#71717a' }}
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
                <div className="h-full w-full flex items-center justify-center bg-zinc-800/20 rounded-xl border border-zinc-800/50 text-zinc-500 text-sm">
                  No historical data available
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 mb-6">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Quantity</p>
              <p className="text-zinc-200 font-mono">{quantity.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Invested</p>
              <p className="text-zinc-200 font-mono">{formatCurrency(investedAmount)}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Total Return</p>
              <p className={`font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? '+' : ''}{totalGainPercent.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Yield</p>
              <p className="text-zinc-200 font-mono">
                {quote?.dividendYield ? `${(quote.dividendYield * 100).toFixed(2)}%` : '—'}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Sector</p>
              <p className="text-zinc-200 font-mono truncate" title={quote?.sector || 'N/A'}>
                {quote?.sector || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Purchase Date</p>
              <p className="text-zinc-200 font-mono">
                {asset.purchase_date.includes('T') 
                  ? format(parseISO(asset.purchase_date), 'MMM d, yyyy')
                  : format(parseISO(asset.purchase_date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            {isDeleting ? (
              <div className="flex items-center space-x-3 bg-rose-500/5 border border-rose-500/20 p-2 rounded-xl">
                <span className="text-rose-200 text-xs font-medium uppercase tracking-wider">Confirm removal?</span>
                <button 
                  type="button"
                  disabled={isProcessing}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDeleting(false);
                  }}
                  className="text-zinc-400 hover:text-zinc-200 text-sm font-medium px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  disabled={isProcessing}
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsProcessing(true);
                    try {
                      await onDelete(asset.id);
                    } catch (err) {
                      console.error('Deletion failed:', err);
                      setIsProcessing(false);
                    }
                  }}
                  className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-all shadow-lg shadow-rose-500/20 disabled:opacity-70 flex items-center"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={14} className="mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : 'Delete'}
                </button>
              </div>
            ) : (
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDeleting(true);
                }}
                className="flex items-center text-rose-500 hover:text-rose-400 text-sm font-medium px-3 py-2 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
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
