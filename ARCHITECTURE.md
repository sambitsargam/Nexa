# Nexa Architecture: Privacy Analytics with FHE & Encrypted Storage

## Overview

Nexa is a dual-mode privacy analytics engine for Zcash that provides:
- **Normal Mode**: Plaintext aggregation of blockchain data
- **Privacy Mode**: Fully homomorphic encryption (FHE) with encrypted storage and AI

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  • Uses @cofhe/sdk for client-side encryption                   │
│  • Cofhejs: End-to-end encryption/decryption                    │
│  • Displays plaintext (normal) or encrypted results (privacy)   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express)                           │
│                                                                   │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ ZcashIngestor  │  │  CoFHE       │  │  NilDB Storage      │ │
│  │ (3xpl data)    │→ │  Service     │→ │ (SecretVaults)      │ │
│  └────────────────┘  └──────────────┘  └─────────────────────┘ │
│                                              │                   │
│  ┌────────────────┐  ┌──────────────┐       │                  │
│  │ Preprocessor   │  │  NilAI       │◄──────┘                  │
│  │ (normalize)    │→ │  Service     │                           │
│  └────────────────┘  │  (embeddings)│                           │
│                       └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐   ┌──────────────┐  ┌────────┐
    │ Nillion │   │   Fhenix     │  │ Zcash  │
    │ nilDB   │   │ (Contracts)  │  │ 3xpl   │
    │ nilAI   │   │              │  │        │
    └─────────┘   └──────────────┘  └────────┘
```

## Data Flow

### Normal Mode (Plaintext Aggregation)

```
Zcash 3xpl API → Ingestor → Aggregates → Frontend Display
```

**Steps:**
1. `ZcashIngestor.fetchAggregates()` calls 3xpl sandbox API for hourly metrics
2. Backend returns plaintext aggregates to frontend
3. Frontend displays metrics (no encryption)

### Privacy Mode (FHE with Encrypted Storage)

```
Zcash 3xpl API → Ingestor → Preprocessor → Frontend
                               (normalize)      ↓
                                           Cofhejs Encrypt
                                                ↓
                         Backend receives encrypted blob
                                                ↓
                         NilDB Storage (Secret Vaults)
                                                ↓
                         NilAI Embedding + Summary
                                                ↓
                         Return encrypted results
                                                ↓
                         Frontend Cofhejs Unseal
```

**Steps:**
1. Backend:
   - `ZcashIngestor.fetchAggregates()` fetches plaintext data from 3xpl
   - `EncryptionPreprocessor.preprocessAggregates()` normalizes to fixed-point vector
   - Returns plaintext vector to frontend (for client-side encryption)

2. Frontend (React):
   - Initializes CoFHE SDK via `ExampleProvider` + `useEncryptInput()` hook
   - Encrypts vector using `onEncryptInput(type, value)` for each field
   - Submits encrypted ciphertext to backend `/api/privacy/aggregates`

3. Backend (receives encrypted blob):
   - `CofheService.getClient()` returns initialized SDK client (real or mock)
   - Stores encrypted blob via `NilDBStorage.storeEncryptedResult()`
   - Generates embedding via `NilAIService.createEmbedding()` on plaintext metadata
   - Returns encrypted result + embedding to frontend

4. Frontend (receives encrypted results):
   - Uses Cofhejs with permit to unseal encrypted results
   - Decrypts plaintext aggregates for display
   - Shows both encrypted proof + plaintext summary

## Services

### ZcashIngestor (`backend/services/ingestion.js`)
- **Role**: Fetch blockchain data from Zcash 3xpl API
- **Output**: `{ tx_count, shielded_count, avg_fee, fee_variance, ... }`
- **Mode**: Supports both normal and privacy aggregation requests

### EncryptionPreprocessor (`backend/services/preprocessor.js`)
- **Role**: Normalize aggregates to fixed-point vector for FHE computation
- **Output**: `{ vector: [1250000000, 892000000, ...], metadata: {...} }`
- **Note**: Scales floats to integers (e.g., 1250 tx → 1250000000 in 1e6 precision)

### CofheService (`backend/services/cofhe-service.js`)
- **Role**: Initialize and manage CoFHE SDK client (real or mock)
- **Modes**:
  - **Real**: Connects to `@cofhe/sdk` + viem when `COFHE_PRIVATE_KEY` + `COFHE_RPC_URL` provided
  - **Mock**: Falls back to `CoFHEClient` (dev/demo simulation)
- **Dev Only**: Server-side encryption is not canonical; use client-side Cofhejs in production

### CoFHEClient (`backend/services/cofhe-client.js`)
- **Role**: Mock FHE operations for development/demo mode
- **Functions**:
  - `encryptVector()`: Simulate encryption (JSON→hex)
  - `submitJob()`: Simulate computation submission
  - `decryptResult()`: Simulate decryption (hex→JSON)
- **Status**: This is a **mock only**; real FHE requires smart contracts

### NilDBStorage (`backend/services/nildb-storage.js`)
- **Role**: Persist encrypted results to Nillion nilDB (Secret Vaults)
- **Uses**: `@nillion/secretvaults` SDK (SecretVaultBuilderClient)
- **Operations**:
  - `initialize()`: Register builder profile + create/verify analytics collection
  - `storeEncryptedResult()`: Store ciphertext with metadata and provenance
  - `retrieveEncryptedResult()`: Fetch stored result by reference
  - `listResults()`: List all stored results
  - `deleteResult()`: Remove result from collection

### NilAIService (`backend/services/nilai-service.js`)
- **Role**: Generate privacy-preserving embeddings and AI summaries
- **Uses**: `@nillion/nilai-ts` SDK (NilaiOpenAIClient)
- **Operations**:
  - `initialize()`: Create NilaiOpenAIClient with delegation token
  - `createEmbedding()`: Generate embedding vector for aggregates
  - `generateSummary()`: Create LLM summary (normal or privacy mode)
  - `_buildPrompt()`: Format aggregates as LLM input

## Environment Variables

### CoFHE Configuration
```env
COFHE_PRIVATE_KEY=0x1234...  # Dev only; private key for viem signer
COFHE_RPC_URL=https://sepolia.gateway.tenderly.co  # Sepolia RPC
COFHE_SUPPORTED_CHAIN=sepolia  # Chain identifier
```

### Nillion Configuration
```env
NILDB_API_KEY=b3ed914...  # API key from nilpay
NILCHAIN_URL=http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz
NILAUTH_URL=https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz
NILDB_NODES=https://nildb-stg-n1.nillion.network,...  # Comma-separated
NILLION_COLLECTION_ID=collection_id  # nilDB collection name

NILAI_API_KEY=Nillion2025  # API key from nilpay
NILAI_API_BASE=https://nilai-a779.nillion.network/v1  # LLM endpoint
```

### Server Configuration
```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
DEV_MODE=true  # Enable mock services
ENABLE_DEMO_DECRYPT=true  # Allow decryption in dev (never in production!)
```

## API Endpoints

### `/api/health` (GET)
Returns service health status
```json
{
  "status": "ok",
  "timestamp": "...",
  "services": {
    "nildb": "initialized",
    "nilai": "initialized",
    "cofhe": "real" | "mock" | "uninitialized"
  }
}
```

### `/api/aggregates` (GET)
Normal mode: Returns plaintext aggregates
```json
{
  "tx_count": 1250,
  "shielded_count": 892,
  "shielded_ratio": 0.714,
  "avg_fee": 0.0001,
  "timestamp": "..."
}
```

### `/api/privacy/aggregates` (POST)
Privacy mode: Receives encrypted blob from frontend
```json
{
  "ciphertext": "0x...",
  "metadata": { "job_id": "job_xyz", "window": "hour" }
}
```

Returns:
```json
{
  "job_id": "job_xyz",
  "stored_reference": "ref_abc123",
  "embedding": [0.2, 0.5, ...],
  "encrypted_summary": "0x..."
}
```

### `/api/summary` (GET)
Returns privacy-safe summary
```json
{
  "normal_mode_summary": "Zcash network shows typical activity...",
  "privacy_mode_summary": "Privacy-preserved analysis complete.",
  "timestamp": "..."
}
```

## Development Workflow

### 1. Start Backend
```bash
npm run backend:dev
# Initializes: Nillion nilDB, nilAI, CoFHE service (real or mock)
# Listens on http://localhost:3000
```

### 2. Start Frontend
```bash
npm run frontend:dev
# Initializes: CoFHE SDK via ExampleProvider
# Listens on http://localhost:5173
```

### 3. Test End-to-End
```bash
npm test
# Runs tests in `tests/e2e.test.js`
# Validates: Preprocessing, mock FHE, nilDB storage, nilAI embeddings
```

### 4. Check Integration
```bash
curl http://localhost:3000/api/health
# Should show: cofhe service, nildb initialized, nilai ready
```

## Production Considerations

### Client-Side Encryption (Recommended)
- Use **Cofhejs** (client-side library) from `@cofhe/sdk`
- Encrypt sensitive data in browser before sending to backend
- Backend remains agnostic to FHE operations
- Smart contracts handle encrypted computation (Fhenix testnet/mainnet)

### Server-Side FHE (Not Recommended)
- Possible but requires deployed Fhenix smart contract
- Backend would orchestrate contract calls + result unsealing
- Higher latency due to blockchain round-trips
- Not implemented here; use official Fhenix examples for reference

### Data Persistence
- **Encrypted results**: Stored in Nillion nilDB (Secret Vaults)
- **Embeddings**: Generated by nilAI, stored in nilDB metadata
- **Audit trail**: Provenance tracked (source, timestamp, block range)

### Security & Privacy
- **Never** decrypt in production (mock only for dev)
- **Always** use Cofhejs permits for smart contract result unsealing
- **Rotate** API keys regularly (NILDB_API_KEY, NILAI_API_KEY)
- **Audit** access logs for encryption/decryption operations

## References

- **CoFHE Docs**: https://cofhe-docs.fhenix.zone/docs/devdocs/overview
- **Cofhejs SDK**: https://github.com/FhenixProtocol/cofhe-sdk (client-side)
- **Nillion nilDB**: https://github.com/NillionCommunity/nildb-examples
- **Nillion nilAI**: https://github.com/NillionCommunity/nilai-examples
- **Zcash 3xpl API**: https://sandbox-api.3xpl.com

## Testing

### Unit Tests
```bash
npm test -- backend/services/*.test.js
```

### Integration Tests (E2E)
```bash
npm run test:watch
# Runs full pipeline: ingest → preprocess → encrypt → store → retrieve → summarize
```

### Manual Integration
1. Start backend: `npm run backend:dev`
2. Start frontend: `npm run frontend:dev`
3. Navigate to `http://localhost:5173`
4. Test normal mode: View plaintext aggregates
5. Test privacy mode: Submit encrypted vector → See stored result

## Next Steps

- [ ] Deploy Fhenix smart contract for real encrypted computation
- [ ] Implement frontend Cofhejs integration (from `@cofhe/sdk`)
- [ ] Wire backend `/api/privacy/aggregates` POST endpoint
- [ ] Add signature verification for provenance
- [ ] Implement result caching with TTL
