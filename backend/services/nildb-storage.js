import { Keypair, SecretVaultBuilderClient } from '@nillion/secretvaults';
import { logger } from '../utils/logger.js';

/**
 * NilDB Storage Service
 * Persists encrypted results to nilDB with cryptographic provenance
 * Uses Nillion SecretVaults SDK for production-grade encrypted storage
 * Reference: https://docs.nillion.com/build/private-storage/ts-docs
 */
export class NilDBStorage {
  constructor() {
    this.client = null;
    this.collectionId = null;
    this.storage = {}; // In-memory fallback for dev mode
    this.provenance = {};
  }

  /**
   * Initialize nilDB client (call once at startup)
   */
  async initialize() {
    const devMode = process.env.DEV_MODE === 'true';
    
    if (devMode) {
      logger.info('NilDB: Running in DEV_MODE (in-memory storage)');
      return;
    }

    try {
      const apiKey = process.env.NILDB_API_KEY;
      if (!apiKey) {
        throw new Error('NILDB_API_KEY not configured');
      }

      // Initialize SecretVault builder client
      const builderKeypair = Keypair.from(apiKey);
      this.client = await SecretVaultBuilderClient.from({
        keypair: builderKeypair,
        urls: {
          chain: process.env.NILCHAIN_URL || 'http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz',
          auth: process.env.NILAUTH_URL || 'https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz',
          dbs: (process.env.NILDB_NODES || 'https://nildb-stg-n1.nillion.network,https://nildb-stg-n2.nillion.network,https://nildb-stg-n3.nillion.network').split(','),
        },
        blindfold: { operation: 'store' },
      });

      await this.client.refreshRootToken();

      // Register builder profile (one-time setup)
      try {
        await this.client.readProfile();
        logger.info('NilDB: Builder profile already registered');
      } catch {
        const builderDid = builderKeypair.toDid().toString();
        await this.client.register({
          did: builderDid,
          name: 'Nexa Analytics Builder',
        });
        logger.info({ did: builderDid }, 'NilDB: Registered builder profile');
      }

      // Ensure analytics collection exists or create it
      this.collectionId = process.env.NILLION_COLLECTION_ID || 'nexa-analytics-encrypted';
      try {
        const collections = await this.client.readCollections();
        const exists = collections.some((c) => c._id === this.collectionId);
        if (!exists) throw new Error('Collection not found');
        logger.info({ collectionId: this.collectionId }, 'NilDB: Found analytics collection');
      } catch {
        // Collection doesn't exist, create it
        await this.client.createCollection({
          _id: this.collectionId,
          type: 'standard',
          name: 'Nexa Encrypted Analytics Results',
          schema: {
            type: 'object',
            properties: {
              reference_id: { type: 'string' },
              ciphertext: { type: 'string', '%allot': true },
              metadata: { type: 'object' },
              provenance: { type: 'object' },
              stored_at: { type: 'string' },
            },
            required: ['reference_id', 'ciphertext'],
          },
        });
        logger.info({ collectionId: this.collectionId }, 'NilDB: Created analytics collection');
      }

      logger.info('NilDB: Client initialized successfully');
    } catch (error) {
      logger.error({ error }, 'NilDB: Initialization failed, falling back to in-memory storage');
      this.client = null; // Fallback to in-memory
    }
  }

  /**
   * Store encrypted result in nilDB with provenance metadata
   */
  async storeEncryptedResult(referenceId, ciphertext, metadata = {}) {
    try {
      const provenance = {
        source_url: metadata.source || 'unknown',
        block_range: metadata.block_range || 'unknown',
        job_id: metadata.job_id || 'unknown',
        encrypted_at: new Date().toISOString(),
        stored_at: new Date().toISOString(),
        version: 1,
      };

      const record = {
        _id: referenceId,
        reference_id: referenceId,
        ciphertext,
        metadata,
        provenance,
        stored_at: new Date().toISOString(),
      };

      // Try to store in nilDB (production)
      if (this.client && this.collectionId) {
        try {
          await this.client.createStandardData(this.collectionId, [record]);
          logger.info(
            { referenceId, collectionId: this.collectionId },
            'Encrypted result stored in nilDB'
          );
        } catch (dbError) {
          logger.warn({ referenceId, error: dbError.message }, 'NilDB storage failed, using in-memory fallback');
          this.storage[referenceId] = record;
        }
      } else {
        // In-memory fallback
        this.storage[referenceId] = record;
      }

      this.provenance[referenceId] = provenance;

      return {
        success: true,
        reference_id: referenceId,
        stored_at: record.stored_at,
        storage_mode: this.client ? 'nildb' : 'memory',
      };
    } catch (error) {
      logger.error({ referenceId, error: error.message }, 'Failed to store encrypted result');
      throw error;
    }
  }

  /**
   * Retrieve encrypted result from nilDB
   */
  async retrieveEncryptedResult(referenceId) {
    try {
      let record;

      // Try to retrieve from nilDB (production)
      if (this.client && this.collectionId) {
        try {
          const results = await this.client.findData(this.collectionId, {
            filter: { _id: referenceId },
          });
          if (results.length > 0) {
            record = results[0];
          }
        } catch (dbError) {
          logger.warn({ referenceId, error: dbError.message }, 'NilDB retrieval failed, checking memory');
          record = this.storage[referenceId];
        }
      } else {
        // In-memory fallback
        record = this.storage[referenceId];
      }

      if (!record) {
        throw new Error(`Record not found: ${referenceId}`);
      }

      logger.info({ referenceId }, 'Retrieved encrypted result');

      return {
        reference_id: record.reference_id,
        ciphertext: record.ciphertext,
        metadata: record.metadata,
        provenance: record.provenance,
        retrieved_at: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ referenceId, error: error.message }, 'Failed to retrieve encrypted result');
      throw error;
    }
  }

  /**
   * List all stored results with optional filters
   */
  async listResults(filters = {}) {
    try {
      let results = [];

      if (this.client && this.collectionId) {
        try {
          const queryFilter = filters.job_id
            ? { 'provenance.job_id': filters.job_id }
            : {};
          const records = await this.client.findData(this.collectionId, {
            filter: queryFilter,
          });
          results = records.map((r) => ({
            reference_id: r.reference_id,
            stored_at: r.stored_at,
            metadata: r.metadata,
          }));
        } catch (dbError) {
          logger.warn({ error: dbError.message }, 'NilDB list failed, using memory');
          results = Object.values(this.storage).map((r) => ({
            reference_id: r.reference_id,
            stored_at: r.stored_at,
            metadata: r.metadata,
          }));
        }
      } else {
        results = Object.values(this.storage).map((r) => ({
          reference_id: r.reference_id,
          stored_at: r.stored_at,
          metadata: r.metadata,
        }));
      }

      // Apply job_id filter if needed
      if (filters.job_id) {
        results = results.filter((r) => r.metadata?.job_id === filters.job_id);
      }

      logger.info({ count: results.length }, 'Listed encrypted results');

      return results;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to list results');
      throw error;
    }
  }

  /**
   * Delete a result from nilDB (for cleanup)
   */
  async deleteResult(referenceId) {
    try {
      if (this.client && this.collectionId) {
        try {
          await this.client.deleteData(this.collectionId, {
            filter: { _id: referenceId },
          });
          logger.info({ referenceId }, 'Deleted result from nilDB');
        } catch (dbError) {
          logger.warn({ referenceId, error: dbError.message }, 'NilDB delete failed, checking memory');
          delete this.storage[referenceId];
        }
      } else {
        delete this.storage[referenceId];
      }

      delete this.provenance[referenceId];

      return { success: true, deleted: referenceId };
    } catch (error) {
      logger.error({ referenceId, error: error.message }, 'Failed to delete result');
      throw error;
    }
  }
}
