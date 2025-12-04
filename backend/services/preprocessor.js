import pino from 'pino';

const logger = pino();

/**
 * Preprocessor for converting aggregates to encryption-ready vectors
 * Handles: fixed-point scaling, histogram bucketing, vector normalization
 */
export class EncryptionPreprocessor {
  constructor(options = {}) {
    this.scalingFactor = options.scalingFactor || 1e6; // Scale floats to fixed-point
    this.histogramBuckets = options.histogramBuckets || 10;
    this.bucketWidth = options.bucketWidth || 0.0001; // Fee bucket width
    logger.info(`EncryptionPreprocessor initialized with scale=${this.scalingFactor}, buckets=${this.histogramBuckets}`);
  }

  /**
   * Scale float value to fixed-point integer
   * @param {number} value - Float value
   * @returns {number} Fixed-point scaled integer
   */
  scaleToFixedPoint(value) {
    return Math.round(value * this.scalingFactor);
  }

  /**
   * Scale integer back to float
   * @param {number} scaled - Fixed-point scaled integer
   * @returns {number} Float value
   */
  scaleFromFixedPoint(scaled) {
    return scaled / this.scalingFactor;
  }

  /**
   * Normalize histogram to bucket array
   * @param {object} histogram - Fee histogram from aggregates
   * @returns {array} Array of bucket counts
   */
  normalizeHistogram(histogram, bucketCount = this.histogramBuckets) {
    const buckets = new Array(bucketCount).fill(0);
    
    if (!histogram || Object.keys(histogram).length === 0) {
      return buckets;
    }

    // Find max fee to determine bucket width
    const maxFee = Math.max(...Object.keys(histogram).map(Number));
    const dynamicBucketWidth = maxFee / bucketCount || this.bucketWidth;

    for (const [fee, count] of Object.entries(histogram)) {
      const feeNum = parseFloat(fee);
      const bucketIndex = Math.min(
        Math.floor(feeNum / dynamicBucketWidth),
        bucketCount - 1
      );
      buckets[bucketIndex] += count;
    }

    return buckets;
  }

  /**
   * Convert aggregates to a homomorphic-encryption ready vector
   * Vector structure: [tx_count, shielded_count, sum_fees, sum_fees_sq, bucket_0, ..., bucket_N]
   * All values are scaled to fixed-point integers
   *
   * @param {object} aggregates - From ZcashIngestor.computeAggregates()
   * @returns {object} { vector, metadata }
   */
  preprocessAggregates(aggregates) {
    if (!aggregates) {
      throw new Error('Aggregates required');
    }

    try {
      // Extract fields
      const txCount = aggregates.tx_count || 0;
      const shieldedCount = aggregates.shielded_count || 0;
      const totalFees = aggregates.total_fees || 0;
      const feesSumSq = aggregates.fee_sum_sq || 0;
      const histogram = aggregates.fee_histogram || {};

      // Scale to fixed-point
      const vector = [
        this.scaleToFixedPoint(txCount),
        this.scaleToFixedPoint(shieldedCount),
        this.scaleToFixedPoint(totalFees),
        this.scaleToFixedPoint(feesSumSq),
      ];

      // Add normalized histogram buckets
      const histogramBuckets = this.normalizeHistogram(histogram);
      for (const bucket of histogramBuckets) {
        vector.push(this.scaleToFixedPoint(bucket));
      }

      const metadata = {
        vector_size: vector.length,
        scaling_factor: this.scalingFactor,
        histogram_buckets: histogramBuckets.length,
        source_aggregates: {
          tx_count: txCount,
          shielded_count: shieldedCount,
          total_fees: totalFees,
          fees_sum_sq: feesSumSq,
        },
        timestamp: aggregates.timestamp || new Date().toISOString(),
      };

      logger.info({
        message: 'Aggregates preprocessed for encryption',
        vector_size: vector.length,
        tx_count: txCount,
      });

      return { vector, metadata };
    } catch (error) {
      logger.error(`Preprocessing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Decrypt and denormalize vector back to aggregates
   * For demonstration/testing purposes
   *
   * @param {array} vector - Encrypted vector (post-decryption)
   * @param {object} metadata - Metadata from preprocessing
   * @returns {object} Denormalized aggregates
   */
  denormalizeVector(vector, metadata) {
    if (!vector || !metadata) {
      throw new Error('Vector and metadata required');
    }

    try {
      const { scaling_factor, histogram_buckets } = metadata;
      const scale = scaling_factor || this.scalingFactor;

      // Extract core metrics (first 4 elements)
      const txCount = this.scaleFromFixedPoint(vector[0]);
      const shieldedCount = this.scaleFromFixedPoint(vector[1]);
      const totalFees = this.scaleFromFixedPoint(vector[2]);
      const feesSumSq = this.scaleFromFixedPoint(vector[3]);

      // Extract histogram buckets
      const histogramBuckets = vector.slice(4, 4 + histogram_buckets);
      const denormalizedHistogram = {};
      for (let i = 0; i < histogramBuckets.length; i++) {
        const bucketFee = (i * this.bucketWidth).toFixed(4);
        denormalizedHistogram[bucketFee] = Math.round(
          this.scaleFromFixedPoint(histogramBuckets[i])
        );
      }

      const aggregates = {
        tx_count: Math.round(txCount),
        shielded_count: Math.round(shieldedCount),
        shielded_ratio: txCount > 0 ? shieldedCount / txCount : 0,
        total_fees: totalFees,
        avg_fee: txCount > 0 ? totalFees / txCount : 0,
        fee_sum_sq: feesSumSq,
        fee_variance: feesSumSq / (txCount || 1) - Math.pow(totalFees / (txCount || 1), 2),
        fee_histogram: denormalizedHistogram,
      };

      logger.info('Vector denormalized', aggregates);
      return aggregates;
    } catch (error) {
      logger.error(`Denormalization failed: ${error.message}`);
      throw error;
    }
  }
}

export default new EncryptionPreprocessor();
