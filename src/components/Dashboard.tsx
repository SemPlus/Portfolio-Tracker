import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, TrendingUp, TrendingDown, Briefcase, FolderPlus, ChevronDown, Download, Upload } from 'lucide-react';
import { Asset, Quote, ChartDataPoint, Portfolio } from '../types';
import AssetCard from './AssetCard';
import PortfolioChart from './PortfolioChart';
import AddAssetModal from './AddAssetModal';

export default function Dashboard() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | 'all'>('all');
  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [period, setPeriod] = useState('1M');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    console.log('fetchData called');
    try {
      setRefreshing(true);
      
      // Fetch portfolios
      const portfoliosRes = await fetch('/api/portfolios');
      const portfoliosData = await portfoliosRes.json();
      setPortfolios(portfoliosData);

      // Fetch assets
      const assetsRes = await fetch(`/api/assets?portfolio_id=${selectedPortfolioId}`);
      const assetsData = await assetsRes.json();
      console.log('Assets data fetched:', assetsData);
      setAssets(assetsData);

      if (assetsData.length > 0) {
        // Fetch quotes
        const symbols = [...new Set(assetsData.map((a: Asset) => a.symbol))].join(',');
        const quotesRes = await fetch(`/api/quotes?symbols=${symbols}`);
        const quotesData = await quotesRes.json();
        setQuotes(quotesData);

        // Fetch history
        const historyRes = await fetch(`/api/history?period=${period}&portfolio_id=${selectedPortfolioId}`);
        const historyData = await historyRes.json();
        setChartData(historyData);
      } else {
        setQuotes({});
        setChartData([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
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

  const handleExport = async () => {
    try {
      const res = await fetch('/api/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export data');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          alert('Data imported successfully');
          window.location.reload();
        } else {
          const err = await res.json();
          alert(`Import failed: ${err.error}`);
        }
      } catch (err) {
        console.error('Import failed:', err);
        alert('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
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
    console.log(`handleDeleteAsset called with ID: ${id}`);
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        console.error('Failed to delete asset:', res.statusText);
        return;
      }
      console.log('Asset deleted successfully, fetching new data');
      await fetchData();
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  // Calculate portfolio summary
  const totalValue = assets.reduce((sum, asset) => {
    const price = quotes[asset.symbol]?.regularMarketPrice || 0;
    const qty = asset.quantity !== null ? asset.quantity : 0;
    return sum + (qty * price);
  }, 0);

  const totalInvested = assets.reduce((sum, asset) => {
    return sum + (asset.invested_amount !== null ? asset.invested_amount : 0);
  }, 0);

  const totalGain = totalValue - totalInvested;
  const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const isPositive = totalGain >= 0;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin text-emerald-500">
          <RefreshCw size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-emerald-500/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="bg-emerald-500/10 p-2 rounded-xl">
                <Briefcase className="text-emerald-500" size={24} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-semibold tracking-tight">Portfolio Tracker</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <select 
                    value={selectedPortfolioId}
                    onChange={(e) => setSelectedPortfolioId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                    className="bg-transparent text-zinc-400 text-sm focus:outline-none cursor-pointer hover:text-zinc-200 transition-colors appearance-none"
                  >
                    <option value="all">All Portfolios</option>
                    {portfolios.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="text-zinc-500 pointer-events-none" />
                  <button 
                    onClick={() => setIsAddingPortfolio(true)}
                    className="text-zinc-500 hover:text-emerald-500 transition-colors ml-1"
                    title="Add Portfolio"
                  >
                    <FolderPlus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 w-full sm:w-auto">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              <button 
                onClick={handleExport}
                className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-zinc-800 rounded-lg transition-all"
                title="Export Data"
              >
                <Download size={18} />
              </button>
              <label className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-zinc-800 rounded-lg transition-all cursor-pointer" title="Import Data">
                <Upload size={18} />
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImport} 
                  className="hidden" 
                />
              </label>
            </div>
            <button 
              onClick={() => fetchData()}
              disabled={refreshing}
              className="p-2.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-all disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-zinc-900 font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              <Plus size={20} className="mr-2" />
              Add Asset
            </button>
          </div>
        </header>

        {/* Add Portfolio Modal */}
        {isAddingPortfolio && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl p-6">
              <h2 className="text-xl font-semibold text-zinc-100 mb-4">New Portfolio</h2>
              <form onSubmit={handleAddPortfolio}>
                <input 
                  type="text"
                  autoFocus
                  placeholder="Portfolio Name"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all mb-4"
                />
                <div className="flex space-x-3">
                  <button 
                    type="button"
                    onClick={() => setIsAddingPortfolio(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 font-semibold hover:bg-zinc-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-zinc-900 font-semibold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
            <p className="text-zinc-500 text-sm font-medium mb-2 uppercase tracking-wider">Total Balance</p>
            <p className="text-4xl font-light tracking-tight">{formatCurrency(totalValue)}</p>
          </div>
          
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
            <p className="text-zinc-500 text-sm font-medium mb-2 uppercase tracking-wider">Cost Basis</p>
            <p className="text-3xl font-light tracking-tight text-zinc-300">{formatCurrency(totalInvested)}</p>
          </div>
          
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
            <p className="text-zinc-500 text-sm font-medium mb-2 uppercase tracking-wider">Total Return</p>
            <div className="flex items-end space-x-3">
              <p className={`text-3xl font-light tracking-tight ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? '+' : ''}{formatCurrency(totalGain)}
              </p>
              <div className={`flex items-center pb-1 text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                {Math.abs(totalGainPercent).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        {assets.length > 0 && (
          <div className="mb-12">
            <PortfolioChart 
              data={chartData} 
              period={period} 
              onPeriodChange={setPeriod} 
            />
          </div>
        )}

        {/* Assets List */}
        <div>
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            Your Assets
            <span className="ml-3 bg-zinc-800 text-zinc-400 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {assets.length}
            </span>
          </h2>
          
          {assets.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl border-dashed">
              <div className="bg-zinc-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="text-zinc-500" size={28} />
              </div>
              <h3 className="text-lg font-medium text-zinc-300 mb-2">No assets yet</h3>
              <p className="text-zinc-500 max-w-sm mx-auto mb-6">
                Add your first stock, ETF, or cryptocurrency to start tracking your portfolio performance.
              </p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                + Add your first asset
              </button>
            </div>
          ) : (
            <div className="space-y-4">
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

      <AddAssetModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={handleAddAsset} 
        portfolios={portfolios}
        defaultPortfolioId={selectedPortfolioId === 'all' ? (portfolios[0]?.id || 1) : selectedPortfolioId}
      />
    </div>
  );
}
