import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, TrendingUp, TrendingDown, Briefcase, FolderPlus, ChevronDown, Download, Upload, Trash2, LayoutDashboard, Target, Calendar, Settings, Moon, Sun } from 'lucide-react';
import { Asset, Quote, ChartDataPoint, Portfolio } from '../types';
import AssetCard from './AssetCard';
import PortfolioChart from './PortfolioChart';
import AddAssetModal from './AddAssetModal';
import AllocationCharts from './AllocationCharts';
import { Watchlist } from './Watchlist';
import { DividendTracker } from './DividendTracker';
import { ImportExport } from './ImportExport';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'portfolio' | 'watchlist' | 'dividends' | 'settings';

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('portfolio');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | 'all'>('all');
  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [period, setPeriod] = useState('1M');
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      setRefreshing(true);
      
      const portfoliosRes = await fetch('/api/portfolios', { signal: controller.signal });
      const portfoliosData = await portfoliosRes.json();
      setPortfolios(portfoliosData);

      const assetsRes = await fetch(`/api/assets?portfolio_id=${selectedPortfolioId}`, { signal: controller.signal });
      const assetsData = await assetsRes.json();
      setAssets(assetsData);

      if (assetsData.length > 0) {
        const symbols = [...new Set(assetsData.map((a: Asset) => a.symbol))].join(',');
        const quotesRes = await fetch(`/api/quotes?symbols=${symbols}`, { signal: controller.signal });
        const quotesData = await quotesRes.json();
        setQuotes(quotesData);

        const historyRes = await fetch(`/api/history?period=${period}&portfolio_id=${selectedPortfolioId}`, { signal: controller.signal });
        const historyData = await historyRes.json();
        setChartData(historyData);
      } else {
        setQuotes({});
        setChartData([]);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPortfolioId, period]);

  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolioName.trim()) return;

    try {
      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPortfolioName }),
      });
      if (res.ok) {
        const newPortfolio = await res.json();
        setPortfolios([...portfolios, newPortfolio]);
        setNewPortfolioName('');
        setIsAddingPortfolio(false);
        setSelectedPortfolioId(newPortfolio.id);
      }
    } catch (error) {
      console.error('Error adding portfolio:', error);
    }
  };

  const handleAddAsset = async (assetData: any) => {
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assetData),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to add asset');
    }
    
    await fetchData();
    setIsModalOpen(false);
  };

  const handleDeleteAsset = async (id: number) => {
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchData();
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const handleDeletePortfolio = async () => {
    if (selectedPortfolioId === 'all' || selectedPortfolioId === 1) return;
    const portfolio = portfolios.find(p => p.id === selectedPortfolioId);
    if (!portfolio) return;
    if (!confirm(`Are you sure you want to delete "${portfolio.name}"?`)) return;

    try {
      const res = await fetch(`/api/portfolios/${selectedPortfolioId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedPortfolioId('all');
        await fetchData();
      }
    } catch (error) {
      console.error('Error deleting portfolio:', error);
    }
  };

  const latestData = chartData[chartData.length - 1];
  const totalValue = latestData?.totalValue || 0;
  const totalInvested = latestData?.totalInvested || 0;
  const totalGain = totalValue - totalInvested;
  const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const isPositive = totalGain >= 0;

  const annualDividend = assets.reduce((sum, asset) => {
    const quote = quotes[asset.symbol];
    if (!quote?.trailingAnnualDividendRate) return sum;
    return sum + (asset.quantity || 0) * quote.trailingAnnualDividendRate;
  }, 0);

  const portfolioYield = totalValue > 0 ? (annualDividend / totalValue) * 100 : 0;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin text-blue-500">
          <RefreshCw size={32} />
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'portfolio', label: 'Portfolio', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'watchlist', label: 'Watchlist', icon: <Target className="w-4 h-4" /> },
    { id: 'dividends', label: 'Dividends', icon: <Calendar className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
              <Briefcase className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AssetFlow</h1>
              <div className="flex items-center gap-2 mt-1">
                <select 
                  value={selectedPortfolioId}
                  onChange={(e) => setSelectedPortfolioId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="bg-transparent text-slate-500 dark:text-slate-400 text-sm font-medium focus:outline-none cursor-pointer hover:text-blue-500 transition-colors appearance-none"
                >
                  <option value="all">All Portfolios</option>
                  {portfolios.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="text-slate-400" />
                <button onClick={() => setIsAddingPortfolio(true)} className="text-slate-400 hover:text-blue-500 transition-colors">
                  <FolderPlus size={16} />
                </button>
                {selectedPortfolioId !== 'all' && selectedPortfolioId !== 1 && (
                  <button onClick={handleDeletePortfolio} className="text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={toggleTheme}
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-all shadow-sm"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button 
              onClick={() => fetchData()}
              disabled={refreshing}
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Plus size={20} className="mr-2" />
              Add Asset
            </button>
          </div>
        </header>

        {/* Tabs */}
        <nav className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-2xl mb-8 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id 
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'portfolio' && (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="glass-card p-6">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Portfolio Value</p>
                    <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalValue)}</p>
                  </div>
                  <div className="glass-card p-6">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Cost Basis</p>
                    <p className="text-3xl font-bold tracking-tight text-slate-600 dark:text-slate-300">{formatCurrency(totalInvested)}</p>
                  </div>
                  <div className="glass-card p-6">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Return</p>
                    <div className="flex items-end gap-2">
                      <p className={`text-3xl font-bold tracking-tight ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(totalGain)}
                      </p>
                      <div className={`flex items-center pb-1 text-sm font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isPositive ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                        {Math.abs(totalGainPercent).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="glass-card p-6">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Annual Dividends</p>
                    <div className="flex items-end gap-2">
                      <p className="text-3xl font-bold tracking-tight text-blue-500">{formatCurrency(annualDividend)}</p>
                      <div className="flex items-center pb-1 text-sm font-bold text-blue-500/70">
                        {portfolioYield.toFixed(2)}% yield
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart */}
                {assets.length > 0 && (
                  <PortfolioChart 
                    data={chartData} 
                    period={period} 
                    onPeriodChange={setPeriod} 
                    showBenchmark={showBenchmark}
                    onToggleBenchmark={() => setShowBenchmark(!showBenchmark)}
                  />
                )}

                {/* Allocation */}
                {assets.length > 0 && <AllocationCharts assets={assets} quotes={quotes} />}

                {/* Assets */}
                <div>
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                    Your Assets
                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold px-2.5 py-1 rounded-full">
                      {assets.length}
                    </span>
                  </h2>
                  
                  {assets.length === 0 ? (
                    <div className="text-center py-20 glass-card border-dashed">
                      <Briefcase className="text-slate-300 dark:text-slate-700 w-16 h-16 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No assets yet</h3>
                      <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                        Start tracking your wealth by adding your first stock or asset.
                      </p>
                      <button onClick={() => setIsModalOpen(true)} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                        + Add your first asset
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {assets.map(asset => (
                        <AssetCard 
                          key={asset.id} 
                          asset={asset} 
                          quote={quotes[asset.symbol]} 
                          onDelete={handleDeleteAsset}
                          portfolioName={selectedPortfolioId === 'all' ? portfolios.find(p => p.id === asset.portfolio_id)?.name : undefined}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'watchlist' && <Watchlist quotes={quotes} />}
            {activeTab === 'dividends' && <DividendTracker assets={assets} quotes={quotes} />}
            {activeTab === 'settings' && <ImportExport onImportSuccess={fetchData} />}
          </motion.div>
        </AnimatePresence>

        {/* Add Portfolio Modal */}
        {isAddingPortfolio && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">New Portfolio</h2>
              <form onSubmit={handleAddPortfolio}>
                <input 
                  type="text"
                  autoFocus
                  placeholder="Portfolio Name"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all mb-6"
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsAddingPortfolio(false)} className="flex-1 btn-secondary">Cancel</button>
                  <button type="submit" className="flex-1 btn-primary">Create</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        <AddAssetModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onAdd={handleAddAsset} 
          portfolios={portfolios}
          defaultPortfolioId={selectedPortfolioId === 'all' ? (portfolios[0]?.id || 1) : selectedPortfolioId}
        />
      </div>
    </div>
  );
}
