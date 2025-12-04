import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Deploying NexaAnalytics Smart Contract...");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying with account: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

  // Deploy contract
  const NexaAnalytics = await ethers.getContractFactory("NexaAnalytics");
  const contract = await NexaAnalytics.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`✅ NexaAnalytics deployed to: ${contractAddress}`);

  // Save deployment info
  const deploymentInfo = {
    contract: "NexaAnalytics",
    address: contractAddress,
    deployer: deployer.address,
    network: process.env.HARDHAT_NETWORK || "localhost",
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
    explorerUrl: `https://testnet-explorer.fhenix.zone/address/${contractAddress}`,
  };

  const deploymentPath = path.join(__dirname, "..", ".env.deployment");
  fs.writeFileSync(
    deploymentPath,
    `NEXA_CONTRACT_ADDRESS=${contractAddress}\nNEXA_DEPLOYER=${deployer.address}\n`
  );

  console.log("\n📋 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to .env.deployment`);

  return contractAddress;
}

main()
  .then((address) => {
    console.log("\n✨ Deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
