import { ethers, network } from "hardhat";
import { defaultDeploymentPath, upsertContract } from "./deployments";

function requireEnv(name: string): string {
  const value = (process.env[name] || "").trim();
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = (process.env[name] || "").trim();
  return value || undefined;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const owner = optionalEnv("OWNER_ADDRESS") ?? deployer.address;
  const bridge = requireEnv("BRIDGE_ADDRESS");

  console.log(`[deploy-proxy] network=${network.name} chainId=${network.config.chainId}`);
  console.log(`[deploy-proxy] deployer=${deployer.address}`);
  console.log(`[deploy-proxy] owner=${owner}`);
  console.log(`[deploy-proxy] bridge=${bridge}`);

  const factory = await ethers.getContractFactory("NeuronsProxy");
  const proxy = await factory.deploy(owner, bridge);
  const deploymentTx = proxy.deploymentTransaction();
  if (!deploymentTx) throw new Error("Deployment transaction not found");

  const receipt = await deploymentTx.wait();
  if (!receipt) throw new Error("Deployment receipt not found");

  const address = await proxy.getAddress();

  console.log(`[deploy-proxy] NeuronsProxy deployed at ${address}`);
  console.log(`[deploy-proxy] tx=${deploymentTx.hash} block=${receipt.blockNumber}`);

  const outPath = optionalEnv("DEPLOYMENTS_FILE") ?? defaultDeploymentPath(network.name);

  await upsertContract(
    outPath,
    {
      schema: "neurons.deployments.v1",
      network: network.name,
      chainId: Number(network.config.chainId ?? 0),
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
    },
    {
      name: "NeuronsProxy",
      address,
      txHash: deploymentTx.hash,
      blockNumber: receipt.blockNumber,
      constructorArgs: [owner, bridge],
    },
  );

  console.log(`[deploy-proxy] wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
