import { ethers, network } from "hardhat";
import { defaultDeploymentPath, upsertContract } from "./deployments";

function envAddress(name: string): string | undefined {
  const value = (process.env[name] || "").trim();
  return value || undefined;
}

function optionalNumberEnv(name: string): number | undefined {
  const raw = (process.env[name] || "").trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid number for ${name}: ${raw}`);
  return parsed;
}

function deployOverrides() {
  // Harmony RPCs frequentemente não suportam EIP-1559 fee methods e/ou estimateGas.
  // Usar overrides explícitos evita chamadas a métodos não implementados.
  const gasLimit = optionalNumberEnv("GAS_LIMIT") ?? 6_000_000;
  const gasPriceGwei = optionalNumberEnv("GAS_PRICE_GWEI") ?? 30;
  const gasPrice = ethers.parseUnits(gasPriceGwei.toString(), "gwei");

  return {
    gasLimit,
    gasPrice,
  } as const;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const owner = envAddress("OWNER_ADDRESS") ?? deployer.address;

  console.log(`[deploy-harmony] network=${network.name} chainId=${network.config.chainId}`);
  console.log(`[deploy-harmony] deployer=${deployer.address}`);
  console.log(`[deploy-harmony] owner=${owner}`);

  const factory = await ethers.getContractFactory("Neurons");
  const token = await factory.deploy(owner, deployOverrides());
  const deploymentTx = token.deploymentTransaction();
  if (!deploymentTx) throw new Error("Deployment transaction not found");

  const receipt = await deploymentTx.wait();
  if (!receipt) throw new Error("Deployment receipt not found");

  const address = await token.getAddress();

  console.log(`[deploy-harmony] Neurons deployed at ${address}`);
  console.log(`[deploy-harmony] tx=${deploymentTx.hash} block=${receipt.blockNumber}`);

  const outPath = envAddress("DEPLOYMENTS_FILE") ?? defaultDeploymentPath(network.name);

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
      name: "Neurons",
      address,
      txHash: deploymentTx.hash,
      blockNumber: receipt.blockNumber,
      constructorArgs: [owner],
    },
  );

  console.log(`[deploy-harmony] wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
