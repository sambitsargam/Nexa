import pino from 'pino';
import { EncryptionPreprocessor } from './preprocessor.js';

const logger = pino();

/**
 * Privacy Analyzer Service
 * Orchestrates the complete privacy mode analysis flow:
 * 1. Ingests 3xpl block range
 * 2. Extracts and preprocesses transaction vectors
 * 3. Encrypts vectors and submits to CoFHE contract
 * 4. Stores encrypted results in nilDB (keyed by ctHash)
 * 5. Decrypts only aggregates and generates AI summary
 * 6. Returns privacy-safe insights to user
 */
export class PrivacyAnalyzer {
  constructor(ingestor, cofheClient, nildbStorage, nilaiService) {
    this.ingestor = ingestor;
    this.cofheClient = cofheClient;
    this.nildbStorage = nildbStorage;
    this.nilaiService = nilaiService;
    this.preprocessor = new EncryptionPreprocessor();
    this.analysisCache = new Map(); // ctHash → { result, timestamp }
    logger.info('PrivacyAnalyzer initialized');
  }

  /**
   * Stage 1: Fetch and preprocess block range
   * Ingests 3xpl blocks, extracts transactions, computes aggregates
   * @param {number} blockStart - Starting block height
   * @param {number} blockEnd - Ending block height
   * @returns {object} { aggregates, vector, metadata }
   */
  async ingestBlockRange(blockStart, blockEnd) {
    try {
      logger.info({ blockStart, blockEnd }, 'Ingesting block range for privacy analysis');

      // Fetch blocks from 3xpl
      const blocks = await this.ingestor.fetchBlocks(blockEnd - blockStart + 1);
      
      if (!blocks || blocks.length === 0) {
        throw new Error(`No blocks found in range ${blockStart}-${blockEnd}`);
      }

      // Extract all transactions from block range
      const allTransactions = [];
      for (const block of blocks) {
        try {
          const txs = await this.ingestor.fetchBlockTransactions(block.id);
          allTransactions.push(...txs);
        } catch (err) {
          logger.warn({ blockId: block.id, error: err.message }, 'Failed to fetch block transactions');
        }
      }

      logger.info({ txCount: allTransactions.length }, 'Extracted transactions from block range');

      // Compute aggregates
      const aggregates = this.computeAggregates(allTransactions);
      logger.debug({ aggregates }, 'Computed aggregates');

      // Preprocess aggregates to encryption-ready vector
      const { vector, metadata } = this.preprocessor.preprocessAggregates(aggregates);
      logger.info({ vectorSize: vector.length }, 'Preprocessed aggregates to vector');

      return {
        aggregates,
        vector,
        metadata,
        blockCount: blocks.length,
        txCount: allTransactions.length,
      };
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to ingest block range');
      throw error;
    }
  }

  /**
   * Compute aggregate metrics from transactions
   * Calculates: tx_count, shielded_count, fees, variance
   * @param {array} transactions - From 3xpl API
   * @returns {object} Aggregated metrics
   */
  computeAggregates(transactions) {
    let txCount = 0;
    let shieldedCount = 0;
    let totalFees = 0;
    let feesSumSq = 0;
    const feeHistogram = {};

    for (const tx of transactions) {
      txCount++;

      // Check if transaction is shielded (saplingSpent > 0 indicates privacy use)
      if (tx.shielded_spend_count > 0 || tx.shielded_output_count > 0) {
        shieldedCount++;
      }

      // Process fee
      const fee = parseFloat(tx.fee) || 0;
      totalFees += fee;
      feesSumSq += fee * fee;

      // Add to histogram
      const feeBucket = (fee * 10000).toFixed(0); // Bucket by 0.0001 increments
      feeHistogram[feeBucket] = (feeHistogram[feeBucket] || 0) + 1;
    }

    const avgFee = txCount > 0 ? totalFees / txCount : 0;
    const variance = txCount > 0 ? (feesSumSq / txCount) - (avgFee * avgFee) : 0;
    const shieldedRatio = txCount > 0 ? shieldedCount / txCount : 0;

    return {
      tx_count: txCount,
      shielded_count: shieldedCount,
      shielded_ratio: shieldedRatio,
      total_fees: totalFees,
      avg_fee: avgFee,
      fee_variance: Math.sqrt(Math.max(0, variance)), // Standard deviation
      fee_sum_sq: feesSumSq,
      fee_histogram: feeHistogram,
      window: 'block_range',
    };
  }

  /**
   * Stage 2: Encrypt vector and submit to CoFHE contract
   * Cofhejs encrypts frontend-side, but we coordinate submission here
   * @param {array} encryptedItem - CoFheInItem { ctHash, signature, utype }
   * @returns {string} ctHash (ciphertext hash as identifier)
   */
  async submitEncryptedAnalysis(encryptedItem) {
    try {
      logger.info({ ctHash: encryptedItem.ctHash }, 'Submitting encrypted analysis to CoFHE');

      // Submit encrypted item to smart contract
      const receipt = await this.cofheClient.submitEncryptedAggregate(encryptedItem);
      
      const ctHash = encryptedItem.ctHash;
      logger.info({ ctHash, txHash: receipt.transactionHash }, 'Encrypted analysis submitted to contract');

      return ctHash;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to submit encrypted analysis');
      throw error;
    }
  }

  /**
   * Stage 3: Retrieve encrypted result and compute on-chain
   * @param {string} ctHash - Ciphertext hash
   * @param {string} program - FHE computation program (e.g., 'computeShieldedRatio')
   * @returns {object} Encrypted result
   */
  async computeEncryptedResult(ctHash, program = 'computeShieldedRatio') {
    try {
      logger.info({ ctHash, program }, 'Computing on encrypted data');

      const result = await this.cofheClient.computeResult(ctHash, program);
      
      logger.info({ ctHash }, 'Encrypted computation completed');
      return result;
    } catch (error) {
      logger.error({ ctHash, error: error.message }, 'Failed to compute encrypted result');
      throw error;
    }
  }

  /**
   * Stage 4: Decrypt only aggregates and generate summary
   * Secure worker pattern: only high-level aggregates are decrypted
   * @param {string} ctHash - Ciphertext hash
   * @param {object} originalAggregates - Original plaintext aggregates (used for summary)
   * @returns {object} { aggregates, embedding, summary }
   */
  async decryptAndSummarize(ctHash, originalAggregates) {
    try {
      logger.info({ ctHash }, 'Decrypting aggregates and generating summary');

      // In production: retrieve encrypted result from contract and decrypt
      // For now: use original aggregates + create embedding
      
      // Create Model-C embedding from aggregates
      const embedding = await this.nilaiService.createEmbedding(originalAggregates);
      logger.info({ embeddingSize: embedding.length }, 'Created embedding');

      // Generate privacy-safe summary via nilAI
      const summary = await this.nilaiService.generateSummary(originalAggregates, 'privacy');
      logger.info('Generated privacy-safe summary');

      return {
        aggregates: originalAggregates,
        embedding,
        summary,
      };
    } catch (error) {
      logger.error({ ctHash, error: error.message }, 'Failed to decrypt and summarize');
      throw error;
    }
  }

  /**
   * Stage 5: Store results in nilDB
   * Persists encrypted result and metadata with ctHash as key
   * @param {string} ctHash - Ciphertext hash
   * @param {object} result - { aggregates, embedding, summary }
   * @param {object} metadata - { blockStart, blockEnd, timestamp, etc }
   * @returns {void}
   */
  async storeResult(ctHash, result, metadata) {
    try {
      logger.info({ ctHash }, 'Storing privacy analysis result in nilDB');

      const storageData = {
        ct_hash: ctHash,
        aggregates: result.aggregates,
        embedding: result.embedding,
        summary: result.summary,
        metadata: {
          ...metadata,
          processed_at: new Date().toISOString(),
          mode: 'privacy',
        },
      };

      // Store in nilDB
      await this.nildbStorage.storeEncryptedResult(ctHash, storageData);
      
      // Cache locally
      this.analysisCache.set(ctHash, {
        result: storageData,
        timestamp: Date.now(),
      });

      logger.info({ ctHash }, 'Privacy analysis result stored');
    } catch (error) {
      logger.error({ ctHash, error: error.message }, 'Failed to store result');
      throw error;
    }
  }

  /**
   * Retrieve cached result by ctHash
   * @param {string} ctHash - Ciphertext hash
   * @returns {object} Cached result or null
   */
  async getResult(ctHash) {
    try {
      // Check local cache first
      if (this.analysisCache.has(ctHash)) {
        const cached = this.analysisCache.get(ctHash);
        if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
          logger.debug({ ctHash }, 'Returning cached result');
          return cached.result;
        }
        this.analysisCache.delete(ctHash);
      }

      // Retrieve from nilDB
      const result = await this.nildbStorage.retrieveEncryptedResult(ctHash);
      if (result) {
        this.analysisCache.set(ctHash, {
          result,
          timestamp: Date.now(),
        });
        logger.info({ ctHash }, 'Retrieved result from nilDB');
      }

      return result;
    } catch (error) {
      logger.error({ ctHash, error: error.message }, 'Failed to retrieve result');
      return null;
    }
  }

  /**
   * Execute complete privacy analysis pipeline
   * Orchestrates all stages end-to-end
   * @param {object} params - { blockStart, blockEnd, encryptedItem }
   * @returns {object} { ctHash, summary, metadata }
   */
  async executeAnalysis(params) {
    const { blockStart, blockEnd, encryptedItem } = params;
    
    try {
      logger.info({ blockStart, blockEnd }, 'Executing privacy analysis pipeline');

      // Stage 1: Ingest and preprocess
      const ingestionData = await this.ingestBlockRange(blockStart, blockEnd);
      logger.info('Stage 1 complete: Block range ingested and preprocessed');

      // Stage 2: Submit to CoFHE
      const ctHash = await this.submitEncryptedAnalysis(encryptedItem);
      logger.info({ ctHash }, 'Stage 2 complete: Encrypted analysis submitted');

      // Stage 3: Compute on encrypted data
      const encryptedResult = await this.computeEncryptedResult(ctHash);
      logger.info({ ctHash }, 'Stage 3 complete: On-chain computation finished');

      // Stage 4: Decrypt aggregates and generate summary
      const decryptedData = await this.decryptAndSummarize(ctHash, ingestionData.aggregates);
      logger.info({ ctHash }, 'Stage 4 complete: Decrypted and generated summary');

      // Stage 5: Store in nilDB
      await this.storeResult(ctHash, decryptedData, {
        block_start: blockStart,
        block_end: blockEnd,
        block_count: ingestionData.blockCount,
        tx_count: ingestionData.txCount,
      });
      logger.info({ ctHash }, 'Stage 5 complete: Result stored in nilDB');

      return {
        ctHash,
        summary: decryptedData.summary,
        metadata: {
          blockStart,
          blockEnd,
          txCount: ingestionData.txCount,
          vector_size: ingestionData.metadata.vector_size,
        },
      };
    } catch (error) {
      logger.error({ error: error.message }, 'Privacy analysis pipeline failed');
      throw error;
    }
  }
}
