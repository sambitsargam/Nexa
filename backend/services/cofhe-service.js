import { logger } from '../utils/logger.js';
import { CoFHEClient as MockCoFHEClient } from './cofhe-client.js';

// Attempt to import the CoFHE SDK pieces used by the official example.
// We import from the same paths as the example to keep parity.
let createCofhesdkClient;
let createCofhesdkConfig;
let cofheSepoliaChain;
let createPublicClient;
let createWalletClient;
let httpTransport;
let privateKeyToAccount;
let sepoliaChain;

try {
  // SDK (web) and viem imports
  // These imports may fail if the package is not installed in the environment.
  // The file is defensive: when imports are missing we'll still support the mock.
  // eslint-disable-next-line import/no-unresolved
  ({ createCofhesdkClient, createCofhesdkConfig } = await import('@cofhe/sdk/web'));
  // eslint-disable-next-line import/no-unresolved
  ({ sepolia: cofheSepoliaChain } = await import('@cofhe/sdk/chains'));
  // viem imports
  ({ createPublicClient, createWalletClient, http: httpTransport } = await import('viem'));
  ({ privateKeyToAccount } = await import('viem/accounts'));
  ({ sepolia: sepoliaChain } = await import('viem/chains'));
} catch (err) {
  logger.warn({ err: err.message }, 'Optional CoFHE SDK or viem imports not available; falling back to mock');
}

/**
 * CofheService
 * - Tries to initialize a real CoFHE SDK client when `COFHE_PRIVATE_KEY` and `COFHE_RPC_URL` are provided.
 * - Falls back to the existing mock `CoFHEClient` for DEV/demo flow.
 *
 * Notes:
 * - The official example initializes the SDK in the browser and uses a wallet signer.
 * - Server-side initialization is possible for automation/testing by using a private key
 *   and a JSON-RPC endpoint, but production encryption/unsealing should remain client-side
 *   using Cofhejs and smart contract flows.
 */
export class CofheService {
  constructor() {
    this.logger = logger;
    this.initialized = false;
    this.isReal = false; // true when connected to actual @cofhe/sdk client
    this.client = null; // either real cofhe client or mock
    this.initError = null;

    this.privateKey = process.env.COFHE_PRIVATE_KEY || null;
    this.rpcUrl = process.env.COFHE_RPC_URL || null;
    this.supportedChain = process.env.COFHE_SUPPORTED_CHAIN || 'sepolia';
  }

  async initialize() {
    if (this.initialized) return { success: true, client: this.client };

    // If SDK + viem available and env provided, attempt real initialization
    if (createCofhesdkClient && createCofhesdkConfig && createPublicClient && createWalletClient && privateKeyToAccount && this.privateKey && this.rpcUrl) {
      try {
        const account = privateKeyToAccount(this.privateKey);

        const publicClient = createPublicClient({
          chain: sepoliaChain,
          transport: httpTransport(this.rpcUrl),
        });

        const walletClient = createWalletClient({
          account,
          chain: sepoliaChain,
          transport: httpTransport(this.rpcUrl),
        });

        const inputConfig = { supportedChains: [cofheSepoliaChain] };
        const config = createCofhesdkConfig(inputConfig);
        const cofheClient = createCofhesdkClient(config);

        const connectResult = await cofheClient.connect(publicClient, walletClient);
        this.logger.info({ connectResult }, 'Cofhe client connect result');

        if (!connectResult.success) {
          throw connectResult.error || new Error('Unknown connect failure');
        }

        this.client = cofheClient;
        this.isReal = true;
        this.initialized = true;
        this.logger.info('Initialized real CoFHE SDK client');
        return { success: true, client: this.client };
      } catch (err) {
        this.initError = err instanceof Error ? err.message : String(err);
        this.logger.error({ err: this.initError }, 'Failed to initialize real CoFHE SDK client; will fall back to mock');
        // fall through to mock
      }
    } else {
      this.logger.info('CoFHE SDK or viem not available or COFHE env vars missing; using mock client');
    }

    // Fallback: mock CoFHE client (existing dev implementation)
    try {
      const mock = new MockCoFHEClient();
      this.client = mock;
      this.isReal = false;
      this.initialized = true;
      this.logger.info('Initialized mock CoFHE client (dev/demo mode)');
      return { success: true, client: this.client };
    } catch (err) {
      this.initError = err instanceof Error ? err.message : String(err);
      this.logger.error({ err: this.initError }, 'Failed to initialize mock CoFHE client');
      return { success: false, error: this.initError };
    }
  }

  getClient() {
    if (!this.initialized) {
      throw new Error('CofheService not initialized. Call initialize() first.');
    }
    return this.client;
  }

  isRealClient() {
    return this.isReal;
  }

  /**
   * encryptVector wrapper: delegates to real client when available, otherwise uses mock.
   * Note: The CoFHE SDK's encryption API is usually intended for client-side use (Cofhejs).
   * Server-side encryption support depends on SDK capabilities and permitted flows.
   */
  async encryptVector(vector) {
    if (!this.initialized) await this.initialize();

    if (this.isReal) {
      // The SDK may provide higher-level helpers; however the canonical approach
      // is to encrypt client-side. Here we return a clear instruction for callers.
      const msg = 'Real CoFHE client initialized. Use Cofhejs on client-side to encrypt inputs before sending to contracts.';
      this.logger.info(msg);
      throw new Error(msg);
    }

    // Mock fallback (delegates to existing mock implementation)
    return this.client.encryptVector(vector);
  }

  async decryptResult(jobId, ciphertext) {
    if (!this.initialized) await this.initialize();

    if (this.isReal) {
      const msg = 'Unsealing/decryption of smart contract results must be performed via Cofhejs with the proper permits; backend does not perform unsealing.';
      this.logger.info(msg);
      throw new Error(msg);
    }

    return this.client.decryptResult(jobId, ciphertext);
  }
}

// Export a singleton instance for simple usage across the backend
export const cofheService = new CofheService();
