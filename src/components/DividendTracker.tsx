import React from 'react';
import { Calendar, DollarSign, TrendingUp, PieChart } from 'lucide-react';
import { motion } from 'motion/react';

interface DividendTrackerProps {
  assets: any[];
  quotes: Record<string, any>;
}

export function DividendTracker({ assets, quotes }: DividendTrackerProps) {
  // Calculate dividend metrics
  const dividendAssets = assets.filter(asset => {
    const quote = quotes[asset.symbol];
    return quote && (quote.dividendYield || quote.trailingAnnualDividendRate);
  });

  const totalAnnualIncome = dividendAssets.reduce((total, asset) => {
    const quote = quotes[asset.symbol];
    const rate = quote.trailingAnnualDividendRate || (quote.dividendYield ? (quote.dividendYield / 100) * quote.regularMarketPrice : 0);
    return total + (rate * (asset.quantity || 0));
  }, 0);

  const portfolioValue = assets.reduce((total, asset) => {
    const quote = quotes[asset.symbol];
    return total + ((quote?.regularMarketPrice || 0) * (asset.quantity || 0));
  }, 0);

  const averageYield = portfolioValue > 0 ? (totalAnnualIncome / portfolioValue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-2 text-slate-500 dark:text-slate-400">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium uppercase tracking-wider">Annual Income</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white">
            ${totalAnnualIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">Estimated annual cash flow</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-2 text-slate-500 dark:text-slate-400">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium uppercase tracking-wider">Portfolio Yield</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white">
            {averageYield.toFixed(2)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Weighted average yield</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-2 text-slate-500 dark:text-slate-400">
            <Calendar className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium uppercase tracking-wider">Monthly Avg</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white">
            ${(totalAnnualIncome / 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">Average monthly payout</div>
        </motion.div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-500" />
            Dividend Payers
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Symbol</th>
                <th className="px-6 py-3 font-semibold text-right">Yield</th>
                <th className="px-6 py-3 font-semibold text-right">Annual Div/Share</th>
                <th className="px-6 py-3 font-semibold text-right">Est. Annual Income</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dividendAssets.map((asset) => {
                const quote = quotes[asset.symbol];
                const yieldVal = quote.dividendYield || (quote.trailingAnnualDividendRate / quote.regularMarketPrice) * 100;
                const divRate = quote.trailingAnnualDividendRate || (quote.dividendYield / 100) * quote.regularMarketPrice;
                const income = divRate * (asset.quantity || 0);

                return (
                  <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{asset.symbol}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{asset.quantity?.toFixed(2)} shares</div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-900 dark:text-white font-medium">
                      {yieldVal ? `${yieldVal.toFixed(2)}%` : '---'}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-900 dark:text-white">
                      ${divRate.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      ${income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
              {dividendAssets.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                    No dividend-paying assets found in your portfolio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
