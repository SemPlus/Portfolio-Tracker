import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import YahooFinance from "yahoo-finance2";
import { format, subDays, subMonths, subYears, isAfter } from "date-fns";

const yahooFinance = new YahooFinance({ 
  suppressNotices: ['yahooSurvey', 'ripHistorical'],
  validation: { logErrors: false }
});

const app = express();
const PORT = 3000;

app.use(express.json());

// Database setup
const db = new Database("portfolio.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_id INTEGER NOT NULL DEFAULT 1,
    symbol TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity REAL,
    invested_amount REAL,
    currency TEXT NOT NULL DEFAULT 'USD',
    purchase_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
  );
`);

// Ensure at least one portfolio exists
const defaultPortfolio = db.prepare("SELECT * FROM portfolios WHERE id = 1").get();
if (!defaultPortfolio) {
  db.prepare("INSERT INTO portfolios (id, name) VALUES (1, 'Main Portfolio')").run();
}

// Check if portfolio_id column exists in assets (for migration)
const tableInfo = db.prepare("PRAGMA table_info(assets)").all() as any[];
if (!tableInfo.some(col => col.name === 'portfolio_id')) {
  db.exec("ALTER TABLE assets ADD COLUMN portfolio_id INTEGER NOT NULL DEFAULT 1 REFERENCES portfolios(id)");
}

// Data migration: Fill missing quantity or invested_amount for existing assets
(async () => {
  const incompleteAssets = db.prepare("SELECT * FROM assets WHERE quantity IS NULL OR invested_amount IS NULL").all() as any[];
  for (const asset of incompleteAssets) {
    try {
      const pDate = new Date(asset.purchase_date);
      const history = await yahooFinance.historical(asset.symbol, {
        period1: pDate,
        period2: new Date(pDate.getTime() + 86400000 * 7),
        interval: '1d'
      }).catch(() => []);

      let purchasePrice = (history && history.length > 0) ? history[0].close : null;
      
      if (!purchasePrice) {
        const quote = await yahooFinance.quote(asset.symbol).catch(() => null);
        purchasePrice = quote?.regularMarketPrice || null;
      }

      if (purchasePrice) {
        let finalQuantity = asset.quantity;
        let finalInvestedAmount = asset.invested_amount;

        if (!finalQuantity && finalInvestedAmount) {
          finalQuantity = finalInvestedAmount / purchasePrice;
        } else if (!finalInvestedAmount && finalQuantity) {
          finalInvestedAmount = finalQuantity * purchasePrice;
        }

        db.prepare("UPDATE assets SET quantity = ?, invested_amount = ? WHERE id = ?")
          .run(finalQuantity, finalInvestedAmount, asset.id);
        console.log(`Migrated asset ${asset.symbol} (ID: ${asset.id})`);
      }
    } catch (err) {
      console.error(`Failed to migrate asset ${asset.id}:`, err);
    }
  }
})();

// API Routes

// Get all portfolios
app.get("/api/portfolios", (req, res) => {
  try {
    const portfolios = db.prepare("SELECT * FROM portfolios ORDER BY created_at ASC").all();
    res.json(portfolios);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch portfolios" });
  }
});

// Add new portfolio
app.post("/api/portfolios", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  try {
    const result = db.prepare("INSERT INTO portfolios (name) VALUES (?)").run(name);
    const newPortfolio = db.prepare("SELECT * FROM portfolios WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(newPortfolio);
  } catch (error) {
    res.status(500).json({ error: "Failed to create portfolio" });
  }
});

// Get assets (optionally filtered by portfolio)
app.get("/api/assets", (req, res) => {
  const { portfolio_id } = req.query;
  try {
    let assets;
    if (portfolio_id && portfolio_id !== 'all') {
      assets = db.prepare("SELECT * FROM assets WHERE portfolio_id = ? ORDER BY created_at DESC").all(portfolio_id);
    } else {
      assets = db.prepare("SELECT * FROM assets ORDER BY created_at DESC").all();
    }
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch assets" });
  }
});

// Add new asset
app.post("/api/assets", async (req, res) => {
  const { symbol, type, quantity, invested_amount, currency, purchase_date, portfolio_id } = req.body;
  
  if (!symbol || !type || !purchase_date || (!quantity && !invested_amount)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Verify symbol exists and get current quote
    const quote = await yahooFinance.quote(symbol) as any;
    
    let finalQuantity = quantity;
    let finalInvestedAmount = invested_amount;

    // If one of them is missing, try to fetch historical price at purchase date
    if (!finalQuantity || !finalInvestedAmount) {
      const pDate = new Date(purchase_date);
      const history = await yahooFinance.historical(symbol, {
        period1: pDate,
        period2: new Date(pDate.getTime() + 86400000 * 7), // Look ahead 7 days
        interval: '1d'
      }).catch(() => []);

      const purchasePrice = (history && history.length > 0) 
        ? history[0].close 
        : quote.regularMarketPrice;

      if (!finalQuantity && finalInvestedAmount) {
        finalQuantity = finalInvestedAmount / purchasePrice;
      } else if (!finalInvestedAmount && finalQuantity) {
        finalInvestedAmount = finalQuantity * purchasePrice;
      }
    }

    const stmt = db.prepare(`
      INSERT INTO assets (symbol, type, quantity, invested_amount, currency, purchase_date, portfolio_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      symbol, 
      type, 
      finalQuantity || null, 
      finalInvestedAmount || null, 
      currency || 'USD', 
      purchase_date,
      portfolio_id || 1
    );
    const newAsset = db.prepare("SELECT * FROM assets WHERE id = ?").get(result.lastInsertRowid);
    
    res.status(201).json(newAsset);
  } catch (error) {
    console.error("Error adding asset:", error);
    res.status(500).json({ error: "Failed to add asset. Please check the symbol." });
  }
});

// Delete asset
app.delete("/api/assets/:id", (req, res) => {
  const { id } = req.params;
  const idNum = parseInt(id, 10);
  console.log(`Attempting to delete asset with ID: ${id} (parsed as ${idNum})`);
  
  if (isNaN(idNum)) {
    return res.status(400).json({ error: "Invalid asset ID" });
  }

  try {
    const stmt = db.prepare("DELETE FROM assets WHERE id = ?");
    const result = stmt.run(idNum);
    console.log(`Delete result:`, result);
    
    if (result.changes === 0) {
      console.warn(`No asset found with ID: ${idNum}`);
      return res.status(404).json({ error: "Asset not found" });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting asset:", error);
    res.status(500).json({ error: "Failed to delete asset" });
  }
});

// Get real-time quotes for multiple symbols
app.get("/api/search", async (req, res) => {
  const q = req.query.q as string;
  if (!q) return res.json([]);

  try {
    const results = await yahooFinance.search(q);
    res.json(results.quotes || []);
  } catch (error: any) {
    if (error.result && error.result.quotes) {
      // Return partial results even if validation fails
      return res.json(error.result.quotes);
    }
    console.error("Error searching symbols:", error);
    res.status(500).json({ error: "Failed to search symbols" });
  }
});

app.get("/api/quotes", async (req, res) => {
  const symbols = req.query.symbols as string;
  if (!symbols) return res.json({});

  try {
    const symbolArray = symbols.split(",");
    const quotes = await yahooFinance.quote(symbolArray) as any;
    
    const result: Record<string, any> = {};
    if (Array.isArray(quotes)) {
       quotes.forEach(q => {
         result[q.symbol] = q;
       });
    } else if (quotes) {
       result[quotes.symbol] = quotes;
    }
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching quotes:", error);
    res.status(500).json({ error: "Failed to fetch quotes" });
  }
});

// Get historical data for portfolio chart
app.get("/api/history", async (req, res) => {
  const { period = '1M', portfolio_id } = req.query;
  
  try {
    let assets;
    if (portfolio_id && portfolio_id !== 'all') {
      assets = db.prepare("SELECT * FROM assets WHERE portfolio_id = ?").all(portfolio_id) as any[];
    } else {
      assets = db.prepare("SELECT * FROM assets").all() as any[];
    }
    
    if (assets.length === 0) return res.json([]);

    const symbols = [...new Set(assets.map(a => a.symbol))] as string[];
    
    const endDate = new Date();
    let startDate = new Date();
    
    const earliestPurchaseDate = assets.reduce((min, a) => {
      const d = new Date(a.purchase_date);
      return d < min ? d : min;
    }, new Date());

    switch(period) {
      case '1D': startDate = subDays(endDate, 1); break;
      case '1W': startDate = subDays(endDate, 7); break;
      case '1M': startDate = subMonths(endDate, 1); break;
      case '3M': startDate = subMonths(endDate, 3); break;
      case '1Y': startDate = subYears(endDate, 1); break;
      case 'ALL': 
        startDate = earliestPurchaseDate;
        break;
      default: startDate = subMonths(endDate, 1);
    }

    // Clamp startDate to earliestPurchaseDate if period is not ALL
    if (period !== 'ALL' && startDate < earliestPurchaseDate) {
      startDate = earliestPurchaseDate;
    }

    // Pre-calculate quantities and invested amounts for assets
    const assetsWithQuantities = await Promise.all(assets.map(async (asset) => {
      let qty = asset.quantity;
      let inv = asset.invested_amount;

      if (!qty || !inv) {
        try {
          const purchaseHistory = await yahooFinance.historical(asset.symbol, {
            period1: new Date(asset.purchase_date),
            period2: new Date(new Date(asset.purchase_date).getTime() + 86400000 * 7),
            interval: '1d'
          }).catch(() => []);

          const purchasePrice = (purchaseHistory && purchaseHistory.length > 0) 
            ? purchaseHistory[0].close 
            : (await yahooFinance.quote(asset.symbol).catch(() => null))?.regularMarketPrice || 0;

          if (!qty && inv) qty = inv / purchasePrice;
          else if (!inv && qty) inv = qty * purchasePrice;
        } catch (e) {
          // Fallback
        }
      }

      return { ...asset, calculatedQuantity: qty || 0, calculatedInvestedAmount: inv || 0 };
    }));

    // Fetch historical data for all symbols
    const historyPromises = symbols.map((symbol: string) => {
      if (period === '1D') {
        return yahooFinance.chart(symbol, {
          period1: startDate,
          period2: endDate,
          interval: '15m'
        }).then(res => {
          if (!res.quotes) return [];
          return res.quotes.map(q => ({
            date: q.date,
            close: q.close || q.adjclose || 0
          }));
        }).catch(e => {
          console.error(`Failed to fetch chart for ${symbol}:`, e);
          return [];
        });
      }
      return (yahooFinance.historical(symbol, {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      }) as Promise<any[]>).catch(e => {
        console.error(`Failed to fetch history for ${symbol}:`, e);
        return [];
      });
    });
    
    const historyResults = await Promise.all(historyPromises);
    
    // Process and aggregate data by date
    const aggregatedData: Record<string, { date: string, totalValue: number, totalInvested: number }> = {};
    
    historyResults.forEach((symbolHistory, index) => {
      const symbol = symbols[index];
      const symbolAssets = assetsWithQuantities.filter(a => a.symbol === symbol);
      
      symbolHistory.forEach(day => {
        const dateStr = period === '1D' ? day.date.toISOString() : format(day.date, 'yyyy-MM-dd');
        
        if (!aggregatedData[dateStr]) {
          aggregatedData[dateStr] = { date: dateStr, totalValue: 0, totalInvested: 0 };
        }
        
        // Calculate value for this symbol on this day
        let dailyValue = 0;
        let dailyInvested = 0;
        
        symbolAssets.forEach(asset => {
          // Only include if asset was purchased before or on this day
          const assetDate = new Date(asset.purchase_date);
          if (day.date >= assetDate) {
             dailyValue += (asset.calculatedQuantity || 0) * day.close;
             dailyInvested += asset.calculatedInvestedAmount || 0;
          }
        });
        
        aggregatedData[dateStr].totalValue += dailyValue;
        aggregatedData[dateStr].totalInvested += dailyInvested;
      });
    });
    
    // Convert to array and sort by date
    const chartData = Object.values(aggregatedData).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    res.json(chartData);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch historical data" });
  }
});

async function startServer() {
  // Get historical data for a single asset
app.get("/api/asset-history/:id", async (req, res) => {
  const { id } = req.params;
  const { period = '1M' } = req.query;

  try {
    const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(id) as any;
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    const purchaseDate = new Date(asset.purchase_date);
    let startDate = subMonths(new Date(), 1);
    if (period === '1D') startDate = subDays(new Date(), 1);
    if (period === '1W') startDate = subDays(new Date(), 7);
    if (period === '3M') startDate = subMonths(new Date(), 3);
    if (period === '1Y') startDate = subYears(new Date(), 1);
    if (period === 'ALL') startDate = purchaseDate;

    // Clamp startDate to purchaseDate
    if (startDate < purchaseDate) {
      startDate = purchaseDate;
    }

    const endDate = new Date();

    let history: any[];
    if (period === '1D') {
      const chart = await yahooFinance.chart(asset.symbol, {
        period1: startDate,
        period2: endDate,
        interval: '15m'
      });
      history = (chart.quotes || []).map(q => ({
        date: q.date,
        close: q.close || q.adjclose || 0
      }));
    } else {
      history = await yahooFinance.historical(asset.symbol, {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      }) as any[];
    }

    // Determine quantity and invested amount if not explicitly provided
    let quantity = asset.quantity;
    let investedAmount = asset.invested_amount;

    if (!quantity || !investedAmount) {
      // Try to find the price at purchase date
      const purchaseHistory = await yahooFinance.historical(asset.symbol, {
        period1: new Date(asset.purchase_date),
        period2: new Date(new Date(asset.purchase_date).getTime() + 86400000 * 7), // Look ahead 7 days to find a trading day
        interval: '1d'
      }).catch(() => []);
      
      const purchasePrice = (purchaseHistory && purchaseHistory.length > 0) 
        ? purchaseHistory[0].close 
        : (await yahooFinance.quote(asset.symbol).catch(() => null))?.regularMarketPrice || 0;

      if (!quantity && investedAmount) quantity = investedAmount / purchasePrice;
      else if (!investedAmount && quantity) investedAmount = quantity * purchasePrice;
    }

    const result = history.map(day => ({
      date: period === '1D' ? day.date.toISOString() : format(day.date, 'yyyy-MM-dd'),
      price: day.close,
      value: (quantity || 0) * day.close
    }));

    res.json(result);
  } catch (error) {
    console.error("Error fetching asset history:", error);
    res.status(500).json({ error: "Failed to fetch asset history" });
  }
});

// Export data
app.get("/api/export", (req, res) => {
  try {
    const portfolios = db.prepare("SELECT * FROM portfolios").all();
    const assets = db.prepare("SELECT * FROM assets").all();
    res.json({ portfolios, assets, version: 1, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: "Failed to export data" });
  }
});

// Import data
app.post("/api/import", (req, res) => {
  const { portfolios, assets } = req.body;
  
  if (!Array.isArray(portfolios) || !Array.isArray(assets)) {
    return res.status(400).json({ error: "Invalid data format" });
  }

  try {
    const transaction = db.transaction(() => {
      // Clear existing data
      db.prepare("DELETE FROM assets").run();
      db.prepare("DELETE FROM portfolios").run();

      // Import portfolios
      const insertPortfolio = db.prepare("INSERT INTO portfolios (id, name, created_at) VALUES (?, ?, ?)");
      for (const p of portfolios as any[]) {
        insertPortfolio.run(p.id, p.name, p.created_at || new Date().toISOString());
      }

      // Import assets
      const insertAsset = db.prepare(`
        INSERT INTO assets (id, portfolio_id, symbol, type, quantity, invested_amount, currency, purchase_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const a of assets as any[]) {
        insertAsset.run(
          a.id, 
          a.portfolio_id, 
          a.symbol, 
          a.type, 
          a.quantity, 
          a.invested_amount, 
          a.currency, 
          a.purchase_date, 
          a.created_at || new Date().toISOString()
        );
      }
    });

    transaction();
    res.json({ success: true });
  } catch (error) {
    console.error("Import error:", error);
    res.status(500).json({ error: "Failed to import data" });
  }
});

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
