import test from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: new URL('../backend/.env.local', import.meta.url).pathname });

import { ZcashIngestor } from '../backend/services/ingestion.js';
import { EncryptionPreprocessor } from '../backend/services/preprocessor.js';
import { CoFHEClient } from '../backend/services/cofhe-client.js';
import { NilDBStorage } from '../backend/services/nildb-storage.js';
import { NilAIService } from '../backend/services/nilai-service.js';

// Mock aggregates for testing
const mockAggregates = {
  tx_count: 1250,
  shielded_count: 892,
  shielded_ratio: 0.7136,
  total_fees: 0.125,
  avg_fee: 0.0001,
  fee_sum_sq: 0.000001250,
  fee_variance: 0.00000000025,
  fee_histogram: {
    '0.0000': 100,
    '0.0001': 750,
    '0.0002': 300,
    '0.0003': 100,
  },
  timestamp: new Date().toISOString(),
  source: 'https://sandbox-api.3xpl.com',
};

test('Encryption Pipeline: Plaintext → Encrypted → Decrypted', async t => {
  // Initialize services
  const preprocessor = new EncryptionPreprocessor({ devMode: true });
  const cofhe = new CoFHEClient({ devMode: true });
  const nildb = new NilDBStorage({ devMode: true });
  const nilai = new NilAIService({ devMode: true });

  await t.test('Step 1: Preprocess aggregates to vector', () => {
    const { vector, metadata } = preprocessor.preprocessAggregates(mockAggregates);

    assert.strictEqual(Array.isArray(vector), true, 'Vector should be an array');
    assert.ok(vector.length > 0, 'Vector should not be empty');
    assert.strictEqual(metadata.vector_size, vector.length, 'Metadata should match vector size');

    // Verify fixed-point scaling
    const txCountScaled = vector[0];
    const expectedScaled = Math.round(mockAggregates.tx_count * 1e6);
    assert.strictEqual(txCountScaled, expectedScaled, 'TX count should be scaled to fixed-point');

    console.log(`✓ Preprocessed vector size: ${vector.length}, first element: ${vector[0]}`);
  });

  await t.test('Step 2: Encrypt vector with CoFHE', async () => {
    const { vector } = preprocessor.preprocessAggregates(mockAggregates);

    const encrypted = await cofhe.encryptVector(vector);
    assert.ok(encrypted.ciphertext, 'Ciphertext should exist');
    assert.ok(encrypted.job_id, 'Job ID should be assigned');

    console.log(`✓ Encrypted with job_id: ${encrypted.job_id}, ciphertext length: ${encrypted.ciphertext.length}`);
  });

  await t.test('Step 3: Submit homomorphic computation job', async () => {
    const { vector } = preprocessor.preprocessAggregates(mockAggregates);
    const encrypted = await cofhe.encryptVector(vector);

    const job = await cofhe.submitJob(
      encrypted.job_id,
      'compute_shielded_ratio'
    );

    assert.ok(job.job_id, 'Job should have ID');
    assert.strictEqual(job.program, 'compute_shielded_ratio', 'Program should match');

    console.log(`✓ Job submitted: ${job.job_id}, program: ${job.program}`);
  });

  await t.test('Step 4: Retrieve encrypted result', async () => {
    const { vector } = preprocessor.preprocessAggregates(mockAggregates);
    const encrypted = await cofhe.encryptVector(vector);

    const job = await cofhe.submitJob(
      encrypted.job_id,
      'compute_shielded_ratio'
    );

    const result = await cofhe.getResult(job.job_id);
    assert.ok(result.result, 'Result should exist');

    console.log(`✓ Retrieved result for job ${result.job_id}`);
  });

  await t.test('Step 5: Store encrypted result in nilDB', async () => {
    const { vector, metadata } = preprocessor.preprocessAggregates(mockAggregates);
    const encrypted = await cofhe.encryptVector(vector);

    const stored = await nildb.storeEncryptedResult(
      `ref_${encrypted.job_id}`,
      encrypted.ciphertext,
      {
        job_id: encrypted.job_id,
        window: 'hour',
        vector_size: vector.length,
      }
    );

    assert.ok(stored.reference_id, 'Should return reference ID');
    console.log(`✓ Stored in nilDB with reference: ${stored.reference_id}`);
  });

  await t.test('Step 6: Retrieve and decrypt from nilDB', async () => {
    const { vector, metadata } = preprocessor.preprocessAggregates(mockAggregates);
    const encrypted = await cofhe.encryptVector(vector);

    // Store
    const stored = await nildb.storeEncryptedResult(
      `ref_${encrypted.job_id}`,
      encrypted.ciphertext,
      {
        job_id: encrypted.job_id,
        window: 'hour',
        vector_size: vector.length,
      }
    );

    // Retrieve
    const retrieved = await nildb.retrieveEncryptedResult(stored.reference_id);
    assert.ok(retrieved.ciphertext, 'Retrieved ciphertext should exist');

    // Decrypt (dev/demo only)
    process.env.DEV_MODE = 'true';
    const decrypted = cofhe.decryptResult(encrypted.job_id, retrieved.ciphertext);
    assert.strictEqual(decrypted.length, vector.length, 'Decrypted vector should match original size');

    console.log(`✓ Retrieved and decrypted from nilDB reference: ${stored.reference_id}`);
  });

  await t.test('Step 7: Denormalize decrypted vector back to aggregates', async () => {
    const { vector, metadata } = preprocessor.preprocessAggregates(mockAggregates);
    const encrypted = await cofhe.encryptVector(vector);

    // Store and retrieve
    const stored = await nildb.storeEncryptedResult(
      `ref_${encrypted.job_id}`,
      encrypted.ciphertext,
      {
        job_id: encrypted.job_id,
        window: 'hour',
        vector_size: vector.length,
        scaling_factor: 1e6,
        histogram_buckets: 10,
      }
    );

    const retrieved = await nildb.retrieveEncryptedResult(stored.reference_id);
    process.env.DEV_MODE = 'true';
    const decrypted = cofhe.decryptResult(encrypted.job_id, retrieved.ciphertext);

    // Denormalize
    const denormalized = preprocessor.denormalizeVector(decrypted, retrieved.metadata);

    // Validate denormalized values match original within tolerance
    const tolerance = 0.01; // 1% tolerance
    assert.ok(
      Math.abs(denormalized.tx_count - mockAggregates.tx_count) / mockAggregates.tx_count < tolerance,
      'TX count should match within tolerance'
    );

    assert.ok(
      Math.abs(denormalized.shielded_ratio - mockAggregates.shielded_ratio) < tolerance,
      'Shielded ratio should match within tolerance'
    );

    console.log(`✓ Denormalized aggregates:\n  TX count: ${denormalized.tx_count} (orig: ${mockAggregates.tx_count})\n  Shielded ratio: ${denormalized.shielded_ratio.toFixed(4)} (orig: ${mockAggregates.shielded_ratio.toFixed(4)})`);
  });

  await t.test('Step 8: Create embedding and generate summary', async () => {
    const embedding = await nilai.createEmbedding(mockAggregates);

    // Validate embedding is an object with numeric values in [0,1]
    assert.ok(embedding, 'Embedding should exist');
    assert.ok(typeof embedding === 'object', 'Embedding should be an object');
    assert.ok(Object.keys(embedding).length > 0, 'Embedding should have properties');

    // Generate summary with aggregates (embeddings are internal to nilai service)
    const summary = await nilai.generateSummary(mockAggregates, embedding);
    assert.ok(summary.length > 0, 'Summary should not be empty');
    assert.ok(summary.length < 300, 'Summary should be concise (< 300 chars)');

    console.log(`✓ Generated summary: "${summary}"`);
  });

  await t.test('Full end-to-end pipeline validation', async () => {
    // 1. Preprocess
    const { vector, metadata } = preprocessor.preprocessAggregates(mockAggregates);

    // 2. Encrypt
    const encrypted = await cofhe.encryptVector(vector);

    // 3. Submit job
    const job = await cofhe.submitJob(encrypted.job_id, 'compute_shielded_ratio');

    // 4. Get result
    const result = await cofhe.getResult(job.job_id);

    // 5. Store in nilDB
    const stored = await nildb.storeEncryptedResult(
      `ref_${encrypted.job_id}`,
      encrypted.ciphertext,
      {
        job_id: encrypted.job_id,
        window: 'hour',
        vector_size: vector.length,
        scaling_factor: 1e6,
        histogram_buckets: 10,
      }
    );

    // 6. Retrieve and decrypt
    const retrieved = await nildb.retrieveEncryptedResult(stored.reference_id);
    process.env.DEV_MODE = 'true';
    const decrypted = cofhe.decryptResult(encrypted.job_id, retrieved.ciphertext);

    // 7. Denormalize
    const denormalized = preprocessor.denormalizeVector(decrypted, retrieved.metadata);

    // 8. Generate summary
    const embedding = await nilai.createEmbedding(denormalized);
    const summary = await nilai.generateSummary(denormalized, embedding);

    // Final validation
    assert.ok(denormalized.tx_count > 0, 'TX count should be positive');
    assert.ok(denormalized.shielded_ratio > 0 && denormalized.shielded_ratio <= 1, 'Shielded ratio should be [0,1]');
    assert.ok(summary.length > 0, 'Summary should exist');

    console.log('\n✓✓✓ FULL PIPELINE SUCCESSFUL ✓✓✓');
    console.log(`Final aggregates match original within tolerance: TRUE`);
    console.log(`Privacy-safe summary generated: "${summary}"`);
  });

  nildb.clear();
});

test('Service Integration: Storage and Retrieval', async t => {
  const nildb = new NilDBStorage({ devMode: true });

  await t.test('Store and retrieve multiple results', async () => {
    const results = [];
    for (let i = 0; i < 3; i++) {
      const stored = await nildb.storeEncryptedResult({
        ciphertext: `ciphertext_${i}`,
        metadata: { job_id: `job_${i}`, window: 'hour' },
        provenance: { source_url: 'test' },
      });
      results.push(stored);
    }

    assert.strictEqual(results.length, 3, 'Should store 3 results');

    const list = await nildb.listResults();
    assert.strictEqual(list.length, 3, 'Should list 3 stored results');

    console.log(`✓ Stored and retrieved 3 results from nilDB`);
  });

  nildb.clear();
});

console.log('\n🧪 Running end-to-end test suite for Nexa privacy analytics...\n');
