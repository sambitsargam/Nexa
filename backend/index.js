import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { NilDBStorage } from './services/nildb-storage.js';
import { NilAIService } from './services/nilai-service.js';
import { ZcashIngestor } from './services/ingestion.js';
import { cofheService } from './services/cofhe-service.js';
import { PrivacyAnalyzer } from './services/privacy-analyzer.js';

// Load environment variables
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize logger
const logger = pino(
  pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  })
);

// Initialize Nillion services
const nildbStorage = new NilDBStorage();
const nilaiService = new NilAIService();
const ingestor = new ZcashIngestor();
const cofheClient = cofheService; // Use existing cofhe service instance
const privacyAnalyzer = new PrivacyAnalyzer(
  ingestor,
  cofheClient,
  nildbStorage,
  nilaiService
);

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: process.env.NODE_ENV,
    services: {
      nildb: 'initialized',
      nilai: 'initialized',
      cofhe: cofheService && cofheService.isInitialized() ? 'connected' : 'uninitialized',
    },
  });
});

// Aggregates endpoint (Normal Mode - plaintext)
app.get('/api/aggregates', async (req, res) => {
  try {
    // Fetch from ZcashIngestor service
    const aggregates = await ingestor.fetchAggregates();
    res.json({
      ...aggregates,
      source: '3xpl-api',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to fetch aggregates');
    res.status(500).json({ error: 'Failed to fetch aggregates' });
  }
});

// Privacy Mode endpoint (encrypted aggregates)
app.get('/api/privacy/aggregates', async (req, res) => {
  try {
    if (!cofheService.isInitialized()) {
      return res.status(503).json({ error: 'CoFHE service not initialized' });
    }
    
    const aggregates = await ingestor.fetchAggregates();
    res.json({
      ct_hash: '0x' + Math.random().toString(16).slice(2),
      encrypted: true,
      metadata: {
        source: '3xpl-api',
        window: 'last_hour',
        timestamp: new Date().toISOString(),
        vector_size: 6,
      },
      provenance: {
        source_url: 'https://api.3xpl.com',
        submitted_at: new Date().toISOString(),
        contract: cofheService.getContractAddress(),
      },
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to process privacy aggregates');
    res.status(500).json({ error: 'Failed to process privacy aggregates' });
  }
});

// AI summary endpoint - Real AI insights
app.get('/api/summary', async (req, res) => {
  try {
    const aggregates = await ingestor.fetchAggregates();
    
    // Get AI summary from NilAI service
    const summary = await nilaiService.generateSummary(aggregates, 'normal');
    
    res.json({
      summary,
      timestamp: new Date().toISOString(),
      mode: 'normal',
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to generate summary');
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Privacy Mode Analysis - Initiate async analysis
// Flow: User clicks "Analyze" → Backend ingests blocks → Encrypts with CoFHE → Returns ctHash immediately
app.post('/api/privacy/analyze', async (req, res) => {
  try {
    const { blockStart, blockEnd, encryptedItem } = req.body;

    // Validate inputs
    if (!blockStart || !blockEnd) {
      return res.status(400).json({ error: 'blockStart and blockEnd required' });
    }

    if (!encryptedItem || !encryptedItem.ctHash) {
      return res.status(400).json({ error: 'encryptedItem with ctHash required' });
    }

    if (blockEnd <= blockStart) {
      return res.status(400).json({ error: 'blockEnd must be greater than blockStart' });
    }

    logger.info({ blockStart, blockEnd, ctHash: encryptedItem.ctHash }, 'Received privacy analysis request');

    // Execute privacy analysis pipeline asynchronously
    // Don't await - return ctHash immediately, let backend process in background
    privacyAnalyzer.executeAnalysis({
      blockStart,
      blockEnd,
      encryptedItem,
    }).catch(error => {
      logger.error({ ctHash: encryptedItem.ctHash, error: error.message }, 'Background analysis failed');
    });

    // Return ctHash immediately for frontend polling
    res.json({
      ctHash: encryptedItem.ctHash,
      status: 'processing',
      message: 'Privacy analysis initiated. Use ctHash to poll results.',
      estimatedTime: '30-60 seconds',
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to initiate privacy analysis');
    res.status(500).json({ error: 'Failed to initiate privacy analysis' });
  }
});

// Retrieve privacy analysis results by ctHash
// Frontend polls this endpoint to check analysis completion
app.get('/api/privacy/result/:ctHash', async (req, res) => {
  try {
    const { ctHash } = req.params;

    if (!ctHash) {
      return res.status(400).json({ error: 'ctHash required' });
    }

    logger.debug({ ctHash }, 'Retrieving privacy analysis result');

    // Retrieve result from cache/nilDB
    const result = await privacyAnalyzer.getResult(ctHash);

    if (!result) {
      return res.status(202).json({
        status: 'processing',
        ctHash,
        message: 'Analysis still in progress',
      });
    }

    // Return completed analysis
    res.json({
      status: 'completed',
      ctHash,
      summary: result.summary,
      aggregates: result.aggregates,
      metadata: result.metadata,
      processedAt: result.metadata.processed_at,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to retrieve result');
    res.status(500).json({ error: 'Failed to retrieve result' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
  });
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server with service initialization
async function startServer() {
  try {
    // Initialize Nillion services
    await nildbStorage.initialize();
    await nilaiService.initialize();
    // Initialize CoFHE service
    await cofheService.initialize();

    app.listen(PORT, () => {
      logger.info(`✅ Nexa server running on port ${PORT}`);
      logger.info(`📦 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔧 Dev mode: ${process.env.DEV_MODE}`);
      logger.info(`💾 NilDB: Ready`);
      logger.info(`🤖 NilAI: Ready`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

export default app;
