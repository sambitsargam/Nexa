# Nexa

**Dual-mode ZPIE privacy analytics engine for Zcash** using homomorphic encryption (CoFHE/Fhenix), encrypted storage (nilDB), and private AI (nilAI).

## Overview

Nexa is a minimal prototype that demonstrates privacy-preserving network analytics on Zcash. It operates in two modes:

1. **Normal Mode**: Plaintext analytics with real-time aggregates and AI summaries
2. **Privacy Mode**: Fully encrypted analysis using homomorphic encryption (FHE)

### Key Features

- **3xpl Sandbox Integration**: Polls Zcash block/transaction data from [3xpl sandbox API](https://sandbox-api.3xpl.com)
- **Homomorphic Encryption**: Encrypts analytics vectors with Fhenix CoFHE, performs computations on encrypted data
- **Secure Storage**: Stores encrypted ciphertext blobs and metadata in nilDB with provenance logging
- **Privacy-Safe Embeddings**: Converts decrypted aggregates to normalized embeddings, prevents raw data exposure
- **Private LLM**: Generates natural language summaries using nilAI without exposing transaction-level data
- **Dual-Tab UI**: Interactive frontend with Normal (plaintext) and Privacy (encrypted) modes

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Nexa Backend                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  3xpl Sandbox API                                                 │
│  ┌──────────────────┐                                             │
│  │ Blocks/Txs/      │                                             │
│  │ Mempool Data     │                                             │
│  └────────┬─────────┘                                             │
│           │                                                        │
│           ▼                                                        │
│  ┌──────────────────────┐      ┌──────────────────────┐            │
│  │ ZcashIngestor        │      │ EncryptionPreprocessor           │
│  │ - Fetch blocks/txs   │─────►│ - Fixed-point scaling            │
│  │ - Cache (exp backoff)│      │ - Histogram normalization        │
│  │ - Per-window aggs    │      │ - Vector assembly                │
│  └──────────────────────┘      └──────────────────────┘            │
│           │                             │                         │
│  Normal   │                    Privacy  ▼                         │
│  Mode ────┤                    Mode  ┌──────────────────────┐      │
│           │                         │ CoFHEClient          │      │
│           │                         │ - encrypt(vector)    │      │
│           │                         │ - submitJob()        │      │
│           │                         │ - getResult()        │      │
│           │                         │ - decryptResult()    │      │
│           │                         └──────┬───────────────┘      │
│           │                                │                     │
│           │                    ┌───────────▼──────────────┐       │
│           │                    │ NilDBStorage             │       │
│           │                    │ - storeEncryptedResult() │       │
│           │                    │ - retrieveEncrypted...() │       │
│           │                    │ - Metadata + provenance  │       │
│           │                    └──────────────────────────┘       │
│           │                             │                        │
│           │    ┌────────────────────────┘                        │
│           ▼    ▼                                                  │
│  ┌─────────────────────────────────────────┐                     │
│  │ NilAIService                            │                     │
│  │ - createEmbedding(aggs)                 │                     │
│  │ - generateSummary(embedding)            │                     │
│  └─────────────────────────────────────────┘                     │
│           │                                                       │
└───────────┼───────────────────────────────────────────────────────┘
            │
            ▼
  ┌───────────────────────┐
  │   Frontend UI          │
  │ - Normal Mode chart   │
  │ - Privacy Mode card   │
  └───────────────────────┘
```

---

## Project Structure

```
nexa/
├── backend/
│   ├── index.js                    # Express server & route handlers
│   ├── .env.example                # Environment variable template
│   ├── services/
│   │   ├── ingestion.js            # ZcashIngestor: 3xpl data polling
│   │   ├── preprocessor.js         # EncryptionPreprocessor: vector prep
│   │   ├── cofhe-client.js         # CoFHEClient: FHE encryption/jobs
│   │   ├── nildb-storage.js        # NilDBStorage: encrypted storage
│   │   └── nilai-service.js        # NilAIService: embeddings & summaries
│   └── utils/                      # Helper utilities
├── frontend/
│   ├── index.html                  # Minimal UI (no build needed)
│   ├── package.json                # Frontend dependencies
│   ├── vite.config.js              # Vite config (optional React build)
│   └── src/                        # React components (future)
├── tests/
│   └── e2e.test.js                 # Full end-to-end validation suite
├── package.json                    # Root dependencies & scripts
├── README.md                       # This file
└── LICENSE                         # MIT License
```

---

## Setup & Installation

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn**
- Environment variables for API keys (see `.env.example`)

### 1. Clone & Install

```bash
cd /Users/sambit/Desktop/Nexa
npm install
```

### 2. Configure Environment

```bash
# Create .env file from template
cp backend/.env.example backend/.env

# Edit backend/.env and add your API keys:
# - THREEPL_API_BASE (default: sandbox-api.3xpl.com)
# - COFHE_API_KEY / COFHE_PRIVATE_KEY (for production FHE)
# - NILDB_API_KEY, NILDB_USER_ID, NILDB_VAULT_ID
# - NILAI_API_KEY
```

For **development/demo mode**, defaults are sufficient:

```bash
# backend/.env (dev/demo)
PORT=3000
NODE_ENV=development
DEV_MODE=true
ENABLE_DEMO_DECRYPT=true
THREEPL_API_BASE=https://sandbox-api.3xpl.com
```

### 3. Run Backend Server

```bash
# Terminal 1: Backend (port 3000)
npm run backend:dev
# Output: "Nexa server running on port 3000"
```

### 4. Run Frontend (Optional)

```bash
# Terminal 2: Frontend (port 5173, with Vite proxy to :3000)
npm run frontend:dev
```

Or open `frontend/index.html` directly in browser:
```bash
open frontend/index.html
```

---

## Usage

### Normal Mode (Plaintext Analytics)

**Endpoint**: `GET /api/aggregates`

**Response**:
```json
{
  "window": "last_hour",
  "tx_count": 1250,
  "shielded_count": 892,
  "shielded_ratio": 0.714,
  "avg_fee": 0.0001,
  "total_fees": 0.125,
  "fee_variance": 0.00000025,
  "timestamp": "2025-12-04T...",
  "source": "3xpl-sandbox"
}
```

**Example cURL**:
```bash
curl -X GET http://localhost:3000/api/aggregates
```

### Privacy Mode (Encrypted Analytics)

**Endpoint**: `GET /api/privacy/aggregates`

**Response**:
```json
{
  "job_id": "job_xyz123",
  "ciphertext_blob": "0x48a2...",
  "metadata": {
    "source": "3xpl-sandbox",
    "window": "last_hour",
    "timestamp": "2025-12-04T...",
    "vector_size": 20
  },
  "provenance": {
    "source_url": "https://sandbox-api.3xpl.com/blocks",
    "block_range": [1000, 1010],
    "job_submitted_at": "2025-12-04T..."
  }
}
```

**Steps**:
1. Aggregates are preprocessed into fixed-point vector
2. Vector is encrypted with CoFHE (homomorphic encryption)
3. Encrypted job submitted for computation (e.g., mean, variance)
4. Results stored encrypted in nilDB vault
5. On secure backend: decrypt only high-level aggregates → create embedding → send to nilAI
6. Natural language summary returned to frontend (no raw data exposed)

---

## End-to-End Test

Validates the complete **plaintext → encrypted → decrypted** pipeline:

```bash
npm test
```

**Test Output**:
```
✓ Preprocessed vector size: 20, first element: 1250000000
✓ Encrypted with job_id: job_abc123, ciphertext length: 456
✓ Job submitted: job_abc123, program: compute_shielded_ratio
✓ Retrieved result for job job_abc123
✓ Stored in nilDB with reference: ref_xyz789
✓ Retrieved and decrypted from nilDB reference: ref_xyz789
✓ Denormalized aggregates:
  TX count: 1250 (orig: 1250)
  Shielded ratio: 0.7136 (orig: 0.7136)
✓ Generated summary: "Strong shielding adoption (70%+) indicates privacy focus. Fees remain stable with typical variance."

✓✓✓ FULL PIPELINE SUCCESSFUL ✓✓✓
```

---

## Development & Demo Mode

### Dev Mode Behavior

In `development` environment with `DEV_MODE=true`:

- **CoFHE**: Real encryption via Fhenix smart contract
- **nilDB**: Encrypted storage via Nillion SecretVaults
- **nilAI**: Generates summaries using Nillion API
- **Decryption**: Only via smart contract with zero-knowledge proofs

### Demo Decrypt

To validate correctness in dev/demo mode:

```javascript
// backend/services/cofhe-client.js
const decrypted = cofhe.decryptResult(encryptedCiphertext);
// Returns: { job_id, vector, timestamp }
```

**Important**: Decryption is **only for dev/demo validation**. In production:
- Decryption should only occur on isolated secure backend
- Private keys never exposed to frontend
- Decrypted data only used to generate high-level embeddings, never transmitted raw

---

## Decryption Policy (Production)

This system uses real FHE with smart contracts for **production use**:

1. **Secure by Design**: All computations on encrypted data via smart contracts
2. **Secure Backend**: Decryption only via zero-knowledge proofs on Fhenix
3. **Aggregate-Only**: Only high-level metrics are accessible
4. **Embedding Pipeline**: Decrypted aggregates → normalized embedding → nilAI summary (no plaintext exposure)

**Security**:
- Fhenix SDK for actual FHE operations (integrated)
- Smart contract-based computation ensures privacy

---

## API Endpoints

### Health Check
- `GET /api/health` — Server status

### Normal Mode
- `GET /api/aggregates` — Plaintext tx count, shielded ratio, avg fee
- `GET /api/summary` — AI summary from plaintext aggregates

### Privacy Mode
- `GET /api/privacy/aggregates` — Encrypted analytics job
- `POST /api/privacy/submit` — Submit custom homomorphic job (future)
- `GET /api/privacy/results/:jobId` — Retrieve encrypted result

---

## Configuration & Customization

### Scaling Parameters

**Fixed-Point Scaling** (`backend/services/preprocessor.js`):
```javascript
const preprocessor = new EncryptionPreprocessor({
  scalingFactor: 1e6,      // Scale floats to integers (1e6 for typical fees)
  histogramBuckets: 10,    // Fee histogram bucket count
  bucketWidth: 0.0001,     // Fee bucket width (0.0001 ZEC)
});
```

### CoFHE Integration

For **production** use with actual Fhenix CoFHE:

1. Install official SDK: `npm install @fhenix/sdk`
2. Smart contract integration complete
3. FHE programs implemented on Fhenix smart contracts

Reference: [Fhenix CoFHE Docs](https://cofhe-docs.fhenix.zone/docs/devdocs/overview)

Reference: [Fhenix CoFHE Docs](https://cofhe-docs.fhenix.zone/docs/devdocs/overview)

### nilDB Integration

For **production** use with actual Nillion nilDB:

1. Install SDK: `npm install @nillion/nildb`
2. Update `backend/services/nildb-storage.js` to use API client
3. Configure vault ID and credentials in `.env`

Reference: [Nillion nilDB API](https://docs.nillion.com/api/nildb/nildb-api)

### nilAI Integration

For **production** use with actual Nillion nilAI:

1. Install SDK: `npm install @nillion/nilai`
2. Update `backend/services/nilai-service.js` to call real API
3. Configure API key in `.env`

Reference: [Nillion nilAI Overview](https://docs.nillion.com/api/nilai/overview)

---

## Example Workflow

### Step 1: Fetch Plaintext Data (Normal Mode)

```bash
curl http://localhost:3000/api/aggregates
```

### Step 2: Preprocess for Privacy Mode

```javascript
import { EncryptionPreprocessor } from './backend/services/preprocessor.js';

const preprocessor = new EncryptionPreprocessor();
const { vector, metadata } = preprocessor.preprocessAggregates(aggregates);
// vector: [tx_count_scaled, shielded_count_scaled, sum_fees_scaled, ...]
// metadata: { vector_size, scaling_factor, histogram_buckets, ... }
```

### Step 3: Encrypt with CoFHE

```javascript
import { CoFHEClient } from './backend/services/cofhe-client.js';

const cofhe = new CoFHEClient();
const encrypted = await cofhe.encryptVector(vector);
// encrypted: { ciphertext, job_id, encrypted_at }
```

### Step 4: Submit Homomorphic Job

```javascript
const job = await cofhe.submitJob(
  encrypted.ciphertext,
  'compute_shielded_ratio',
  encrypted.job_id
);
// Computes shielded_count / tx_count on encrypted data
```

### Step 5: Store in nilDB

```javascript
import { NilDBStorage } from './backend/services/nildb-storage.js';

const nildb = new NilDBStorage();
const stored = await nildb.storeEncryptedResult({
  ciphertext: encrypted.ciphertext,
  metadata: { job_id: encrypted.job_id, window: 'hour', ... },
  provenance: { source_url: '...', block_range: [...], ... },
});
// stored.reference_id: persistent encrypted reference
```

### Step 6: Generate Summary (Secure Backend)

```javascript
import { NilAIService } from './backend/services/nilai-service.js';

const nilai = new NilAIService();
const embedding = await nilai.createEmbedding(decryptedAggregates);
// embedding: { shielded_ratio, fee_volatility, tx_count_log, ... } [all ∈ [0,1]]

const summary = await nilai.generateSummary(embedding, 'privacy');
// "Strong shielding adoption (70%+) indicates privacy focus. ..."
```

---

## Testing

### Run End-to-End Tests

```bash
npm test
```

Validates:
- ✓ Preprocessing: aggregates → fixed-point vector
- ✓ Encryption: vector → ciphertext
- ✓ Job submission: submitJob() → getResult()
- ✓ Storage: nilDB store → retrieve
- ✓ Decryption: ciphertext → plaintext (dev/demo)
- ✓ Denormalization: vector → aggregates (within tolerance)
- ✓ Embedding & Summary: aggregates → AI summary

### Unit Test Example

```bash
npm test tests/e2e.test.js
```

---

## Limitations & Future Work

### Current Limitations
- nilDB storage is in-memory (demo mode); production requires Nillion API
- nilAI is simulated (demo mode); production requires Nillion API
- 3xpl sandbox data may have gaps; implement robust error handling
- No persistent storage; data is ephemeral

### Future Enhancements
- [ ] Historical analytics with time-series support
- [ ] Webhook notifications for job completion
- [ ] More sophisticated homomorphic programs (quantiles, correlations)
- [ ] React-based frontend with charts (Recharts)
- [ ] Batch job processing and aggregation
- [ ] Proof of correctness (ZK proofs)

---

## Key Docs & References

| Component | Documentation |
|-----------|----------------|
| **Fhenix CoFHE** | https://cofhe-docs.fhenix.zone/docs/devdocs/overview |
| **3xpl JSON API** | https://3xpl.com/data/json-api/docs |
| **3xpl Sandbox** | https://sandbox-api.3xpl.com |
| **Nillion nilDB** | https://docs.nillion.com/api/nildb/nildb-api |
| **Nillion nilDB Storage** | https://docs.nillion.com/build/private-storage/overview |
| **Nillion nilAI** | https://docs.nillion.com/api/nilai/overview |

---

## License

MIT © 2025 Sambit Sargam Ekalabya

---

## Contributing

Contributions welcome! Please open an issue or PR for:
- Bug fixes
- Production SDK integrations (CoFHE, nilDB, nilAI)
- Enhanced analytics features
- Documentation improvements

---

**Built with ❤️ for privacy-preserving blockchain analytics**
