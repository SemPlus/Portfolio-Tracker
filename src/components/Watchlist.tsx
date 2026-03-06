import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WatchlistItem {
  id: number;
  symbol: string;
  name: string;
  target_price: number | null;
}

interface WatchlistProps {
  quotes: Record<string, any>;
}

export function Watchlist({ quotes }: WatchlistProps) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      const res = await fetch('/api/watchlist');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch watchlist');
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const addToWatchlist = async (symbol: string, name: string) => {
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol, 
          name, 
          target_price: targetPrice ? parseFloat(targetPrice) : null 
        }),
      });
      if (res.ok) {
        fetchWatchlist();
        setSearchQuery('');
        setSearchResults([]);
        setTargetPrice('');
      }
    } catch (err) {
      console.error('Failed to add to watchlist');
    }
  };

  const removeFromWatchlist = async (id: number) => {
    try {
      await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
      fetchWatchlist();
    } catch (err) {
      console.error('Failed to remove from watchlist');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-500" />
          Smart Watchlist
        </h2>
        
        <div className="relative flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search symbols to watch..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden"
              >
                {searchResults.map((result) => (
                  <button
                    key={result.symbol}
                    onClick={() => addToWatchlist(result.symbol, result.shortname)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{result.symbol}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{result.shortname}</div>
                    </div>
                    <Plus className="w-4 h-4 text-blue-500" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const quote = quotes[item.symbol];
          const price = quote?.regularMarketPrice;
          const change = quote?.regularMarketChangePercent;
          const isTargetMet = item.target_price && price && price <= item.target_price;

          return (
            <motion.div
              layout
              key={item.id}
              className="glass-card p-4 flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{item.symbol}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{item.name}</p>
                </div>
                <button
                  onClick={() => removeFromWatchlist(item.id)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {price ? `$${price.toFixed(2)}` : '---'}
                  </div>
                  {change !== undefined && (
                    <div className={`text-sm flex items-center gap-1 ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(change).toFixed(2)}%
                    </div>
                  )}
                </div>

                {item.target_price && (
                  <div className={`text-right px-2 py-1 rounded-lg text-xs font-medium ${isTargetMet ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                    Target: ${item.target_price.toFixed(2)}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        
        {items.length === 0 && !isSearching && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            Your watchlist is empty. Search for symbols to start tracking.
          </div>
        )}
      </div>
    </div>
  );
}
