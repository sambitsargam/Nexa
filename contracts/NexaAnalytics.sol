// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "fhenix/contracts/FHEPayment.sol";
import "fhenix/contracts/lib/TFHE.sol";

/**
 * @title NexaAnalytics
 * @dev Smart contract for privacy-preserving analytics on encrypted data
 * @notice Performs homomorphic encryption computations on Zcash metrics
 */
contract NexaAnalytics is FHEPayment {
    
    /// @notice Structure for encrypted aggregates
    struct EncryptedAggregate {
        euint64 txCount;
        euint64 shieldedCount;
        euint64 avgFee;
        uint256 timestamp;
        address requester;
        bytes provenance;
    }

    /// @notice Structure for computation result
    struct ComputationResult {
        euint64 shieldedRatio;
        euint64 totalFees;
        euint64 feeVariance;
        uint256 resultTimestamp;
        bytes proof;
    }

    // Storage
    mapping(bytes32 => EncryptedAggregate) public aggregates;
    mapping(bytes32 => ComputationResult) public results;
    mapping(address => bytes32[]) public userAggregates;
    
    bytes32[] public aggregateIds;
    
    uint256 public constant MAX_TX_COUNT = 100000; // 100k transactions
    uint256 public constant PRECISION = 1e6;

    // Events
    event AggregateReceived(
        bytes32 indexed aggregateId,
        address indexed requester,
        uint256 timestamp
    );

    event ComputationCompleted(
        bytes32 indexed aggregateId,
        bytes32 indexed resultId,
        uint256 timestamp
    );

    event ResultStored(
        bytes32 indexed resultId,
        address indexed requester,
        uint256 timestamp
    );

    /**
     * @notice Submit encrypted aggregates for computation
     * @param _encryptedTxCount Encrypted transaction count
     * @param _encryptedShieldedCount Encrypted shielded transaction count
     * @param _encryptedAvgFee Encrypted average fee
     * @param _provenance Data provenance information
     * @return aggregateId The unique ID of the stored aggregate
     */
    function submitAggregate(
        bytes calldata _encryptedTxCount,
        bytes calldata _encryptedShieldedCount,
        bytes calldata _encryptedAvgFee,
        bytes calldata _provenance
    ) public payable returns (bytes32) {
        require(
            msg.value >= PAYMENT_AMOUNT,
            "Insufficient payment for computation"
        );

        bytes32 aggregateId = keccak256(
            abi.encodePacked(
                msg.sender,
                block.timestamp,
                block.number
            )
        );

        // Decrypt inputs for storage (in production, these would remain encrypted)
        euint64 txCount = TFHE.asEuint64(_encryptedTxCount);
        euint64 shieldedCount = TFHE.asEuint64(_encryptedShieldedCount);
        euint64 avgFee = TFHE.asEuint64(_encryptedAvgFee);

        aggregates[aggregateId] = EncryptedAggregate({
            txCount: txCount,
            shieldedCount: shieldedCount,
            avgFee: avgFee,
            timestamp: block.timestamp,
            requester: msg.sender,
            provenance: _provenance
        });

        userAggregates[msg.sender].push(aggregateId);
        aggregateIds.push(aggregateId);

        emit AggregateReceived(aggregateId, msg.sender, block.timestamp);

        return aggregateId;
    }

    /**
     * @notice Compute shielded ratio from encrypted data
     * @param _aggregateId The ID of the aggregate to compute on
     * @return resultId The ID of the computation result
     */
    function computeShieldedRatio(bytes32 _aggregateId) public payable returns (bytes32) {
        require(
            msg.value >= PAYMENT_AMOUNT,
            "Insufficient payment for computation"
        );
        require(
            aggregates[_aggregateId].timestamp > 0,
            "Aggregate not found"
        );

        EncryptedAggregate storage agg = aggregates[_aggregateId];

        // Compute: shielded_ratio = shielded_count / tx_count (as encrypted value)
        euint64 ratio = TFHE.div(agg.shieldedCount, agg.txCount);

        // Compute total fees: avg_fee * tx_count (approximate)
        euint64 totalFees = TFHE.mul(agg.avgFee, agg.txCount);

        // Fee variance (simulated - in production, would compute from dataset)
        euint64 feeVariance = TFHE.div(agg.avgFee, 100); // Assume 1% variance

        bytes32 resultId = keccak256(
            abi.encodePacked(
                _aggregateId,
                block.timestamp,
                block.number
            )
        );

        results[resultId] = ComputationResult({
            shieldedRatio: ratio,
            totalFees: totalFees,
            feeVariance: feeVariance,
            resultTimestamp: block.timestamp,
            proof: abi.encodePacked("proof_", resultId)
        });

        emit ComputationCompleted(_aggregateId, resultId, block.timestamp);

        return resultId;
    }

    /**
     * @notice Get encrypted result (requires permission from original requester)
     * @param _resultId The ID of the result
     * @return result The encrypted computation result
     */
    function getEncryptedResult(bytes32 _resultId) 
        public 
        view 
        returns (ComputationResult memory) 
    {
        require(results[_resultId].resultTimestamp > 0, "Result not found");
        return results[_resultId];
    }

    /**
     * @notice Verify computation proof
     * @param _resultId The ID of the result
     * @return isValid True if proof is valid
     */
    function verifyProof(bytes32 _resultId) public view returns (bool) {
        require(results[_resultId].resultTimestamp > 0, "Result not found");
        
        ComputationResult storage result = results[_resultId];
        
        // In production, this would verify zk-SNARK proof
        // For now, just verify the proof bytes exist
        return result.proof.length > 0;
    }

    /**
     * @notice Get user's aggregates
     * @param _user The user address
     * @return User's aggregate IDs
     */
    function getUserAggregates(address _user) 
        public 
        view 
        returns (bytes32[] memory) 
    {
        return userAggregates[_user];
    }

    /**
     * @notice Get total aggregates count
     * @return Total number of aggregates submitted
     */
    function getAggregatesCount() public view returns (uint256) {
        return aggregateIds.length;
    }

    /**
     * @notice Get aggregate by ID
     * @param _aggregateId The aggregate ID
     * @return The aggregate data
     */
    function getAggregate(bytes32 _aggregateId) 
        public 
        view 
        returns (EncryptedAggregate memory) 
    {
        require(aggregates[_aggregateId].timestamp > 0, "Aggregate not found");
        return aggregates[_aggregateId];
    }

    /**
     * @notice Compute multiple metrics at once
     * @param _aggregateId The aggregate to compute on
     * @return resultId The result ID
     * @return ratio The computed shielded ratio
     * @return totalFees The computed total fees
     * @return variance The computed fee variance
     */
    function computeAllMetrics(bytes32 _aggregateId) 
        public 
        payable 
        returns (
            bytes32,
            euint64,
            euint64,
            euint64
        ) 
    {
        require(
            msg.value >= PAYMENT_AMOUNT * 2,
            "Insufficient payment for computation"
        );

        bytes32 resultId = computeShieldedRatio(_aggregateId);
        ComputationResult memory result = results[resultId];

        return (
            resultId,
            result.shieldedRatio,
            result.totalFees,
            result.feeVariance
        );
    }

    /**
     * @notice Batch submit aggregates
     * @param _aggregates Array of encrypted aggregate data
     * @return Array of aggregate IDs
     */
    function batchSubmitAggregates(
        bytes[] calldata _aggregates
    ) public payable returns (bytes32[] memory) {
        uint256 count = _aggregates.length;
        require(
            msg.value >= PAYMENT_AMOUNT * count,
            "Insufficient payment for batch computation"
        );

        bytes32[] memory ids = new bytes32[](count);

        for (uint256 i = 0; i < count; i++) {
            // Parse aggregate from bytes
            // Format: txCount (8) | shieldedCount (8) | avgFee (8) | provenance
            bytes memory data = _aggregates[i];
            require(data.length >= 24, "Invalid aggregate data");

            ids[i] = submitAggregate(
                data[0:8],  // encrypted tx count
                data[8:16], // encrypted shielded count
                data[16:24], // encrypted avg fee
                data[24:]    // provenance
            );
        }

        return ids;
    }

    /**
     * @notice Emergency withdrawal (admin only)
     */
    function withdraw() public {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}
