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
│           │                         │ - submitctHash()        │      │
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

## Project Structure

```
nexa/
├── backend/
│   ├── index.js                    # Express server & route handlers
│   ├── .env.example                # Environment variable template
│   ├── services/
│   │   ├── ingestion.js            # ZcashIngestor: 3xpl data polling
│   │   ├── preprocessor.js         # EncryptionPreprocessor: vector prep
│   │   ├── cofhe-client.js         # CoFHEClient: FHE encryption
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


## Limitations & Future Work

### Current Limitations
- nilDB storage is in-memory (demo mode); production requires Nillion API
- nilAI is simulated (demo mode); production requires Nillion API
- 3xpl sandbox data may have gaps; implement robust error handling
- No persistent storage; data is ephemeral

### Future Enhancements
- [ ] Historical analytics with time-series support
- [ ] Webhook notifications for ctHash completion
- [ ] More sophisticated homomorphic programs (quantiles, correlations)
- [ ] React-based frontend with charts (Recharts)
- [ ] Batch ctHash processing and aggregation
- [ ] Proof of correctness (ZK proofs)

## Key Docs & References

| Component | Documentation |
|-----------|----------------|
| **Fhenix CoFHE** | https://cofhe-docs.fhenix.zone/docs/devdocs/overview |
| **3xpl JSON API** | https://3xpl.com/data/json-api/docs |
| **3xpl Sandbox** | https://sandbox-api.3xpl.com |
| **Nillion nilDB** | https://docs.nillion.com/api/nildb/nildb-api |
| **Nillion nilDB Storage** | https://docs.nillion.com/build/private-storage/overview |
| **Nillion nilAI** | https://docs.nillion.com/api/nilai/overview |

## License

MIT © 2025 Sambit Sargam Ekalabya

## Contributing

Contributions welcome! Please open an issue or PR for:
- Bug fixes
- Production SDK integrations (CoFHE, nilDB, nilAI)
- Enhanced analytics features
- Documentation improvements

**Built with ❤️ for privacy-preserving blockchain analytics**
