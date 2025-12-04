import axios from 'axios';
import pino from 'pino';

const logger = pino();

// Exponential backoff retry logic
async function retryWithBackoff(fn, maxRetries = 5, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.1 * delay;
      logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay + jitter}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
}

/**
 * Zcash Data Ingestion Service
 * Polls 3xpl sandbox API for blocks, transactions, and mempool data
 */
export class ZcashIngestor {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || process.env.THREEPL_API_BASE || 'https://sandbox-api.3xpl.com';
    this.cache = new Map();
    this.cacheExpiry = options.cacheExpiry || 60000; // 1 minute default
    this.lastBlockHeight = options.lastBlockHeight || 0;
    logger.info(`ZcashIngestor initialized with base URL: ${this.baseUrl}`);
  }

  /**
   * Fetch latest blocks from 3xpl
   */
  async fetchBlocks(limit = 10) {
    const cacheKey = `blocks_${limit}`;
    if (this.cache.has(cacheKey)) {
      const { data, expiry } = this.cache.get(cacheKey);
      if (Date.now() < expiry) {
        logger.debug('Returning cached blocks');
        return data;
      }
    }

    try {
      const response = await retryWithBackoff(async () => {
        return await axios.get(`${this.baseUrl}/zcash/blocks`, {
          params: { limit },
          timeout: 10000,
        });
      });

      const blocks = response.data.data || response.data || [];
      this.cache.set(cacheKey, {
        data: blocks,
        expiry: Date.now() + this.cacheExpiry,
      });

      logger.info(`Fetched ${blocks.length} blocks`);
      return blocks;
    } catch (error) {
      logger.error(`Failed to fetch blocks: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch transactions for a specific block
   */
  async fetchBlockTransactions(blockId) {
    const cacheKey = `block_txs_${blockId}`;
    if (this.cache.has(cacheKey)) {
      const { data, expiry } = this.cache.get(cacheKey);
      if (Date.now() < expiry) {
        logger.debug(`Returning cached txs for block ${blockId}`);
        return data;
      }
    }

    try {
      const response = await retryWithBackoff(async () => {
        return await axios.get(`${this.baseUrl}/zcash/block/${blockId}/transactions`, {
          timeout: 10000,
        });
      });

      const txs = response.data.data || response.data || [];
      this.cache.set(cacheKey, {
        data: txs,
        expiry: Date.now() + this.cacheExpiry,
      });

      logger.info(`Fetched ${txs.length} transactions for block ${blockId}`);
      return txs;
    } catch (error) {
      logger.error(`Failed to fetch block transactions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Compute per-window aggregates from blocks/transactions
   * Window: hour or day
   * Returns: { tx_count, shielded_count, total_fees, fee_sum_sq, etc. }
   */
  async computeAggregates(windowType = 'hour') {
    try {
      const blocks = await this.fetchBlocks(50);
      
      let txCount = 0;
      let shieldedCount = 0;
      let totalFees = 0;
      let feesSumSq = 0;
      const feeHistogram = {};

      for (const block of blocks) {
        try {
          const blockTxs = await this.fetchBlockTransactions(block.id);
          
          for (const tx of blockTxs) {
            txCount++;
            
            // Estimate shielded transactions (heuristic: joinsplit or shielded spend)
            if (tx.is_shielded || tx.shielded_spend || tx.joinsplit) {
              shieldedCount++;
            }

            // Parse fee
            const fee = parseFloat(tx.fee) || 0;
            totalFees += fee;
            feesSumSq += fee * fee;

            // Histogram bucket (quantize to nearest 0.0001)
            const bucket = Math.floor(fee * 10000) / 10000;
            feeHistogram[bucket] = (feeHistogram[bucket] || 0) + 1;
          }
        } catch (err) {
          logger.warn(`Error processing block ${block.id}: ${err.message}`);
        }
      }

      const shieldedRatio = txCount > 0 ? shieldedCount / txCount : 0;
      const avgFee = txCount > 0 ? totalFees / txCount : 0;

      const aggregates = {
        window_type: windowType,
        tx_count: txCount,
        shielded_count: shieldedCount,
        shielded_ratio: shieldedRatio,
        total_fees: totalFees,
        avg_fee: avgFee,
        fee_sum_sq: feesSumSq,
        fee_variance: feesSumSq / (txCount || 1) - (avgFee * avgFee),
        fee_histogram: feeHistogram,
        timestamp: new Date().toISOString(),
        source: this.baseUrl,
      };

      logger.info('Aggregates computed', aggregates);
      return aggregates;
    } catch (error) {
      logger.error(`Failed to compute aggregates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear cache for testing
   */
  clearCache() {
    this.cache.clear();
    logger.debug('Cache cleared');
  }
}

// Export singleton
export default new ZcashIngestor();
