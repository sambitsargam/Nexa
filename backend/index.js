import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { NilDBStorage } from './services/nildb-storage.js';
import { NilAIService } from './services/nilai-service.js';
import { cofheService } from './services/cofhe-service.js';

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
app.get('/api/aggregates', (req, res) => {
  // Placeholder: will be implemented by ingestion service
  res.json({
    window: 'last_hour',
    tx_count: 1250,
    shielded_count: 892,
    shielded_ratio: 0.714,
    avg_fee: 0.0001,
    total_fees: 0.125,
    fee_variance: 0.00000025,
    timestamp: new Date().toISOString(),
    source: '3xpl-sandbox',
  });
});

// Privacy Mode endpoint (encrypted aggregates)
app.get('/api/privacy/aggregates', (req, res) => {
  // Placeholder: will be implemented by privacy service
  res.json({
    job_id: 'job_xyz123',
    ciphertext_blob: '0x...',
    metadata: {
      source: '3xpl-sandbox',
      window: 'last_hour',
      timestamp: new Date().toISOString(),
      vector_size: 20,
    },
    provenance: {
      source_url: 'https://sandbox-api.3xpl.com/blocks',
      block_range: [1000, 1010],
      job_submitted_at: new Date().toISOString(),
    },
  });
});

// AI summary endpoint
app.get('/api/summary', (req, res) => {
  // Placeholder: will be implemented by AI service
  res.json({
    normal_mode_summary: 'Zcash network shows typical activity with 71% shielded transactions and stable fees.',
    privacy_mode_summary: 'Privacy-preserved analysis complete.',
    timestamp: new Date().toISOString(),
  });
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
