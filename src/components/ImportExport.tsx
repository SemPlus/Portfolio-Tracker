import React, { useRef } from 'react';
import { Download, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ImportExportProps {
  onImportSuccess: () => void;
}

export function ImportExport({ onImportSuccess }: ImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = React.useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  const handleExport = async () => {
    try {
      const res = await fetch('/api/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', message: 'Portfolio exported successfully!' });
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to export portfolio.' });
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
          body: JSON.stringify(data),
        });
        
        if (res.ok) {
          setStatus({ type: 'success', message: 'Portfolio imported successfully!' });
          onImportSuccess();
        } else {
          throw new Error('Import failed');
        }
      } catch (err) {
        setStatus({ type: 'error', message: 'Invalid file format or import failed.' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="glass-card p-8 flex flex-col items-center text-center group cursor-pointer"
          onClick={handleExport}
        >
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
            <Download className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Export Portfolio</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Download a backup of your entire portfolio, including all assets and historical data.
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="glass-card p-8 flex flex-col items-center text-center group cursor-pointer relative"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
            accept=".json"
          />
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
            <Upload className="w-8 h-8 text-emerald-600 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Import Portfolio</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Restore your portfolio from a previous backup file. This will replace your current data.
          </p>
        </motion.div>
      </div>

      {status.type && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex items-center gap-3 ${
            status.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' 
              : 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'
          }`}
        >
          {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{status.message}</span>
        </motion.div>
      )}

      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-slate-400" />
          CSV Import Guide
        </h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Currently, we support JSON backups for full restoration. CSV import for broker statements (Robinhood, Schwab, etc.) is coming soon.
        </p>
        <div className="flex gap-2">
          <span className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wider">Coming Soon</span>
        </div>
      </div>
    </div>
  );
}
