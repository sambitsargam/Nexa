import axios from 'axios';
import pino from 'pino';

const logger = pino();

/**
 * nilAI Integration Service
 * Converts aggregates to embeddings and generates natural language summaries
 * NOTE: This is a demo implementation
 *       In production, use Nillion nilAI API: https://docs.nillion.com/api/nilai/overview
 */
export class NilAIService {
  constructor(options = {}) {
    this.apiBase = options.apiBase || process.env.NILAI_API_BASE || 'https://api.nillion.com/nilai';
    this.apiKey = options.apiKey || process.env.NILAI_API_KEY;
    this.model = options.model || process.env.NILAI_MODEL || 'gpt-4';
    this.devMode = options.devMode !== false;

    logger.info(`NilAIService initialized with model: ${this.model}` + 
      (this.devMode ? ' (dev/demo mode)' : ''));
  }

  /**
   * Convert aggregates to normalized embedding vector
   * Returns a compact representation suitable for LLM input
   *
   * @param {object} aggregates - { tx_count, shielded_ratio, avg_fee, fee_variance, ... }
   * @returns {object} Normalized embedding with all metrics scaled to [0, 1] or [-1, 1]
   */
  async createEmbedding(aggregates) {
    if (!aggregates) {
      throw new Error('Aggregates required');
    }

    try {
      // Create normalized embedding
      const embedding = {
        shielded_ratio: Math.min(1, Math.max(0, aggregates.shielded_ratio || 0)),
        fee_volatility: Math.min(1, aggregates.fee_variance || 0), // Normalize variance
        avg_fee_normalized: Math.min(1, (aggregates.avg_fee || 0) * 10000), // Scale small fees
        tx_count_log: Math.log1p(aggregates.tx_count || 0) / Math.log1p(10000), // Log scale
        tx_count_change_pct: 0, // Would compare to previous window
      };

      logger.info('Embedding created', embedding);
      return embedding;
    } catch (error) {
      logger.error(`Embedding creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate natural language summary from aggregates
   * Uses nilAI (private LLM) to create concise, non-technical summaries
   *
   * @param {object} aggregates - Privacy-safe aggregates (no per-tx data)
   * @param {string} mode - 'normal' or 'privacy'
   * @returns {string} 1-2 sentence summary
   */
  async generateSummary(aggregates, mode = 'normal') {
    if (!aggregates) {
      throw new Error('Aggregates required');
    }

    try {
      const embedding = await this.createEmbedding(aggregates);

      // Create LLM prompt
      const prompt = this._createPrompt(embedding, mode);

      if (this.devMode) {
        // Demo: generate mock summary without API call
        return this._generateMockSummary(embedding, mode);
      }

      // Production: call nilAI API
      const response = await axios.post(
        `${this.apiBase}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a privacy-focused blockchain analyst. Provide concise, technical summaries of network metrics. Never mention individual transactions. Keep responses to 1-2 sentences.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 100,
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const summary = response.data.choices?.[0]?.message?.content || '';
      logger.info(`Generated summary via nilAI: ${summary.substring(0, 100)}`);
      return summary;
    } catch (error) {
      logger.error(`Summary generation failed: ${error.message}`);
      // Fallback to mock summary
      const embedding = await this.createEmbedding(aggregates);
      return this._generateMockSummary(embedding, mode);
    }
  }

  /**
   * Create prompt for nilAI
   */
  _createPrompt(embedding, mode) {
    const data = JSON.stringify(embedding, null, 2);

    if (mode === 'privacy') {
      return `Given these privacy-preserved Zcash network metrics (normalized embeddings):
${data}

Provide a 1-2 sentence summary highlighting network trends and any notable anomalies. Be concise and non-technical.`;
    }

    return `Given these Zcash network metrics:
${data}

Provide a 1-2 sentence summary of network activity, shielding usage, and fee trends. Be concise and technical.`;
  }

  /**
   * Generate mock summary for demo
   */
  _generateMockSummary(embedding, mode) {
    const { shielded_ratio, fee_volatility, avg_fee_normalized, tx_count_log } = embedding;

    // Compose summary based on metrics
    let summary = '';

    if (shielded_ratio > 0.7) {
      summary += 'Strong shielding adoption (70%+) indicates privacy focus. ';
    } else if (shielded_ratio > 0.5) {
      summary += 'Moderate shielding usage (~50-70%) observed. ';
    } else {
      summary += 'Lower shielding adoption (<50%) noted. ';
    }

    if (fee_volatility > 0.5) {
      summary += 'High fee volatility suggests network congestion or demand spikes.';
    } else {
      summary += 'Fees remain stable with typical variance.';
    }

    logger.info(`Generated mock summary (demo mode): ${summary}`);
    return summary;
  }

  /**
   * Validate that embedding contains no raw data
   */
  static isPrivacySafe(embedding) {
    // Check that all values are numeric and normalized
    const values = Object.values(embedding);
    return values.every(v => typeof v === 'number' && v >= -1 && v <= 1);
  }
}

export default new NilAIService();
