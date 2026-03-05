import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Clock } from 'lucide-react';

import { Portfolio } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (asset: any) => Promise<void>;
  portfolios: Portfolio[];
  defaultPortfolioId: number | 'all';
}

export default function AddAssetModal({ isOpen, onClose, onAdd, portfolios, defaultPortfolioId }: Props) {
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const localTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState('Stock');
  const [portfolioId, setPortfolioId] = useState<number>(defaultPortfolioId === 'all' ? (portfolios[0]?.id || 1) : defaultPortfolioId);
  const [inputType, setInputType] = useState('quantity');

  useEffect(() => {
    if (isOpen) {
      setPortfolioId(defaultPortfolioId === 'all' ? (portfolios[0]?.id || 1) : defaultPortfolioId);
      setSymbol('');
      setError('');
    }
  }, [isOpen, defaultPortfolioId, portfolios]);
  const [quantity, setQuantity] = useState('');
  const [investedAmount, setInvestedAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [purchaseDate, setPurchaseDate] = useState(localDate);
  const [purchaseTime, setPurchaseTime] = useState(localTime);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchSymbols = async () => {
      const trimmedSymbol = symbol.trim();
      if (!trimmedSymbol || trimmedSymbol.length < 2) {
        setSearchResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmedSymbol)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchSymbols, 300);
    return () => clearTimeout(debounce);
  }, [symbol]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onAdd({
        symbol: symbol.toUpperCase(),
        type,
        portfolio_id: portfolioId,
        quantity: inputType === 'quantity' ? parseFloat(quantity) : null,
        invested_amount: inputType === 'invested' ? parseFloat(investedAmount) : null,
        currency,
        purchase_date: new Date(`${purchaseDate}T${purchaseTime}:00`).toISOString()
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-100">Add Asset</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Symbol / Ticker</label>
            <div className="relative">
              <input
                type="text"
                required
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                placeholder="e.g. AAPL, BTC-USD, SPY"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all uppercase"
              />
              {isSearching && (
                <div className="absolute right-3 top-3 text-zinc-500">
                  <div className="animate-spin h-4 w-4 border-2 border-zinc-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
            
            {showDropdown && symbol.length >= 2 && !isSearching && (
              <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSymbol(result.symbol);
                        if (result.quoteType === 'CRYPTOCURRENCY') setType('Crypto');
                        else if (result.quoteType === 'ETF') setType('ETF');
                        else setType('Stock');
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-zinc-700/50 transition-colors border-b border-zinc-700/50 last:border-0 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium text-zinc-100">{result.symbol}</div>
                        <div className="text-xs text-zinc-400 truncate max-w-[200px]">{result.shortname || result.longname}</div>
                      </div>
                      <div className="text-xs font-medium text-zinc-500 bg-zinc-700/50 px-2 py-1 rounded">
                        {result.quoteType}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-zinc-500 text-sm">
                    No results found for "{symbol}"
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Portfolio</label>
              <select
                value={portfolioId}
                onChange={(e) => setPortfolioId(parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all appearance-none"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Asset Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all appearance-none"
              >
                <option value="Stock">Stock</option>
                <option value="ETF">ETF</option>
                <option value="Crypto">Crypto</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all appearance-none"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Input Method</label>
            <div className="flex bg-zinc-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setInputType('quantity')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  inputType === 'quantity' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Quantity
              </button>
              <button
                type="button"
                onClick={() => setInputType('invested')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  inputType === 'invested' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Invested Amount
              </button>
            </div>
          </div>

          {inputType === 'quantity' ? (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Quantity</label>
              <input
                type="number"
                required
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 10.5"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Invested Amount</label>
              <input
                type="number"
                required
                step="any"
                min="0"
                value={investedAmount}
                onChange={(e) => setInvestedAmount(e.target.value)}
                placeholder="e.g. 1000"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Purchase Date</label>
              <input
                type="date"
                required
                max={localDate}
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Purchase Time</label>
              <input
                type="time"
                required
                value={purchaseTime}
                onChange={(e) => setPurchaseTime(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-900 font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
