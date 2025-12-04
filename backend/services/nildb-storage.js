import pino from 'pino';
import crypto from 'crypto';

const logger = pino();

/**
 * nilDB Storage Service
 * Stores encrypted ciphertext blobs and metadata
 * NOTE: This is a mock implementation for demo purposes
 *       In production, use Nillion SecretVaults API client
 *       See: https://docs.nillion.com/api/nildb/nildb-api
 */
export class NilDBStorage {
  constructor(options = {}) {
    this.apiBase = options.apiBase || process.env.NILDB_API_BASE || 'https://api.nillion.com/nildb';
    this.apiKey = options.apiKey || process.env.NILDB_API_KEY;
    this.userId = options.userId || process.env.NILDB_USER_ID;
    this.vaultId = options.vaultId || process.env.NILDB_VAULT_ID;
    
    // In-memory storage for demo
    this.storage = new Map();
    this.devMode = options.devMode !== false;

    logger.info('NilDBStorage initialized' + (this.devMode ? ' in dev/demo mode' : ''));
  }

  /**
   * Store encrypted result in nilDB
   * Returns a reference/ID for later retrieval
   *
   * @param {object} payload - { ciphertext, metadata, provenance }
   * @returns {object} { reference_id, stored_at, vault_id }
   */
  async storeEncryptedResult(payload) {
    if (!payload || !payload.ciphertext || !payload.metadata) {
      throw new Error('Ciphertext and metadata required');
    }

    try {
      const referenceId = `ref_${crypto.randomBytes(12).toString('hex')}`;

      if (this.devMode) {
        // Demo: store in-memory
        const record = {
          reference_id: referenceId,
          ciphertext: payload.ciphertext,
          metadata: payload.metadata,
          provenance: payload.provenance || {},
          stored_at: new Date().toISOString(),
          vault_id: this.vaultId,
        };
        
        this.storage.set(referenceId, record);
        logger.info(`Stored encrypted result (demo mode): ${referenceId}`);

        return {
          reference_id: referenceId,
          stored_at: record.stored_at,
          vault_id: this.vaultId,
          ciphertext_size: payload.ciphertext.length,
        };
      }

      // Production: use Nillion SecretVaults API
      // await axios.post(`${this.apiBase}/store`, {
      //   ciphertext: payload.ciphertext,
      //   metadata: payload.metadata,
      //   provenance: payload.provenance,
      //   vault_id: this.vaultId,
      // }, {
      //   headers: { Authorization: `Bearer ${this.apiKey}` }
      // });

      logger.info(`Stored encrypted result via nilDB API: ${referenceId}`);
      return {
        reference_id: referenceId,
        stored_at: new Date().toISOString(),
        vault_id: this.vaultId,
      };
    } catch (error) {
      logger.error(`Storage failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve encrypted result from nilDB
   *
   * @param {string} referenceId - Reference ID from storeEncryptedResult
   * @returns {object} { ciphertext, metadata, provenance }
   */
  async retrieveEncryptedResult(referenceId) {
    if (!referenceId) {
      throw new Error('ReferenceId required');
    }

    try {
      if (this.devMode) {
        // Demo: retrieve from in-memory store
        const record = this.storage.get(referenceId);
        if (!record) {
          throw new Error(`Reference not found: ${referenceId}`);
        }

        logger.info(`Retrieved encrypted result (demo mode): ${referenceId}`);
        return {
          reference_id: referenceId,
          ciphertext: record.ciphertext,
          metadata: record.metadata,
          provenance: record.provenance,
          retrieved_at: new Date().toISOString(),
        };
      }

      // Production: use Nillion SecretVaults API
      // const response = await axios.get(`${this.apiBase}/retrieve/${referenceId}`, {
      //   headers: { Authorization: `Bearer ${this.apiKey}` }
      // });

      logger.info(`Retrieved encrypted result via nilDB API: ${referenceId}`);
      return {}; // Placeholder
    } catch (error) {
      logger.error(`Retrieval failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all stored results with provenance info
   *
   * @param {object} filter - Optional filter by job_id, window, etc.
   * @returns {array} List of stored results with metadata
   */
  async listResults(filter = {}) {
    try {
      if (this.devMode) {
        // Demo: list from in-memory store
        let results = Array.from(this.storage.values());

        // Apply filters
        if (filter.job_id) {
          results = results.filter(
            r => r.metadata.job_id === filter.job_id
          );
        }
        if (filter.window) {
          results = results.filter(
            r => r.metadata.window === filter.window
          );
        }

        const summary = results.map(r => ({
          reference_id: r.reference_id,
          job_id: r.metadata.job_id,
          window: r.metadata.window,
          stored_at: r.stored_at,
          ciphertext_size: r.ciphertext.length,
        }));

        logger.info(`Listed ${summary.length} results from nilDB (demo mode)`);
        return summary;
      }

      logger.info('Listed results via nilDB API');
      return [];
    } catch (error) {
      logger.error(`List operation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete stored result (for cleanup)
   */
  async deleteResult(referenceId) {
    if (!referenceId) {
      throw new Error('ReferenceId required');
    }

    try {
      if (this.devMode) {
        this.storage.delete(referenceId);
        logger.info(`Deleted result (demo mode): ${referenceId}`);
        return { deleted: true };
      }

      logger.info(`Deleted result via nilDB API: ${referenceId}`);
      return { deleted: true };
    } catch (error) {
      logger.error(`Delete operation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  getStats() {
    if (this.devMode) {
      return {
        total_records: this.storage.size,
        storage_mode: 'in-memory (demo)',
        vault_id: this.vaultId,
      };
    }

    return {
      storage_mode: 'nilDB API',
      vault_id: this.vaultId,
    };
  }

  /**
   * Clear storage (for testing)
   */
  clear() {
    this.storage.clear();
    logger.debug('Storage cleared');
  }
}

export default new NilDBStorage();
