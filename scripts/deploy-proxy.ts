import { ethers, network } from "hardhat";
import { defaultDeploymentPath, upsertContract } from "./deployments";

function optionalNumberEnv(name: string): number | undefined {
  const raw = (process.env[name] || "").trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid number for ${name}: ${raw}`);
  return parsed;
}

async function resolveGasLimit(requested?: number): Promise<number> {
  if (requested !== undefined && requested > 100_000_000) {
    throw new Error(
      `GAS_LIMIT muito alto (${requested}). Parece valor em wei. Use unidades de gas (ex: 8000000, 12000000).`,
    );
  }

  const latestBlock = await ethers.provider.getBlock("latest");
  let blockGasLimitNum = latestBlock?.gasLimit ? Number(latestBlock.gasLimit) : undefined;

  if (!blockGasLimitNum) {
    try {
      const rawBlock = await ethers.provider.send("eth_getBlockByNumber", ["latest", false]);
      const rawGasLimitHex = rawBlock?.gasLimit as string | undefined;
      if (rawGasLimitHex && typeof rawGasLimitHex === "string") {
        blockGasLimitNum = Number(BigInt(rawGasLimitHex));
      }
    } catch {
      // ignore
    }
  }

  const fallback = 12_000_000;
  const desired = requested ?? fallback;

  if (blockGasLimitNum) {
    const cap = Math.max(1, Math.floor(blockGasLimitNum * 0.9));
    if (desired > cap) {
      console.warn(`[deploy-proxy] GAS_LIMIT=${desired} acima do limite do bloco (${blockGasLimitNum}); usando cap=${cap}`);
      return cap;
    }
    return desired;
  }

  return desired;
}

async function deployOverrides() {
  const gasLimit = await resolveGasLimit(optionalNumberEnv("GAS_LIMIT"));
  const gasPriceGwei = optionalNumberEnv("GAS_PRICE_GWEI") ?? 30;
  const gasPrice = ethers.parseUnits(gasPriceGwei.toString(), "gwei");

  return {
    gasLimit,
    gasPrice,
  } as const;
}

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
  if (!factory.bytecode || factory.bytecode === "0x") {
    throw new Error("NeuronsProxy bytecode vazio. Rode `npx hardhat compile` e tente novamente.");
  }

  const overrides = await deployOverrides();
  console.log(`[deploy-proxy] gasLimit=${overrides.gasLimit} gasPrice=${overrides.gasPrice.toString()}`);
  console.log(`[deploy-proxy] bytecodeLength=${(factory.bytecode.length - 2) / 2} bytes`);

  const proxy = await factory.deploy(owner, bridge, overrides);
  const deploymentTx = proxy.deploymentTransaction();
  if (!deploymentTx) throw new Error("Deployment transaction not found");

  const receipt = await deploymentTx.wait();
  if (!receipt) throw new Error("Deployment receipt not found");

  const address = await proxy.getAddress();

  console.log(`[deploy-proxy] NeuronsProxy deployed at ${address}`);
  console.log(`[deploy-proxy] tx=${deploymentTx.hash} block=${receipt.blockNumber}`);

  if (receipt.status === 0 && receipt.gasUsed === BigInt(overrides.gasLimit)) {
    throw new Error(
      `Deploy falhou consumindo 100% do gas (provável out-of-gas). Aumente GAS_LIMIT e tente novamente. tx=${deploymentTx.hash}`,
    );
  }

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
