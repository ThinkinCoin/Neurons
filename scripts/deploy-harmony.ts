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

async function resolveGasLimit(requested?: number): Promise<number> {
  // Guard rails: se alguém setar GAS_LIMIT em wei (ex: 210 gwei => 210000000000), isso explode.
  if (requested !== undefined && requested > 100_000_000) {
    throw new Error(
      `GAS_LIMIT muito alto (${requested}). Parece valor em wei. Use um número de unidades de gas (ex: 8000000, 12000000).`,
    );
  }

  const latestBlock = await ethers.provider.getBlock("latest");
  let blockGasLimitNum = latestBlock?.gasLimit ? Number(latestBlock.gasLimit) : undefined;

  // Alguns RPCs retornam block sem gasLimit no wrapper; tente raw RPC.
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

  const fallback = 8_000_000;
  const desired = requested ?? fallback;

  if (blockGasLimitNum) {
    const cap = Math.max(1, Math.floor(blockGasLimitNum * 0.9));
    if (desired > cap) {
      console.warn(
        `[deploy-harmony] GAS_LIMIT=${desired} acima do limite do bloco (${blockGasLimitNum}); usando cap=${cap}`,
      );
      return cap;
    }
    return desired;
  }

  // Sem blockGasLimit confiável, use o valor desejado (conservador por padrão).
  return desired;
}

async function deployOverrides() {
  // Harmony RPCs frequentemente não suportam EIP-1559 fee methods e/ou estimateGas.
  // Usar overrides explícitos evita chamadas a métodos não implementados.
  // Neurons (OZ5 + Votes) pode precisar de mais gas na criação.
  const gasLimit = await resolveGasLimit(optionalNumberEnv("GAS_LIMIT"));
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
  if (!factory.bytecode || factory.bytecode === "0x") {
    throw new Error("Neurons bytecode vazio. Rode `npx hardhat compile` e tente novamente.");
  }

  const overrides = await deployOverrides();
  const latest = await ethers.provider.getBlock("latest");
  if (latest?.gasLimit) {
    console.log(`[deploy-harmony] latestBlockGasLimit=${latest.gasLimit.toString()}`);
  }
  console.log(`[deploy-harmony] gasLimit=${overrides.gasLimit} gasPrice=${overrides.gasPrice.toString()}`);
  console.log(`[deploy-harmony] bytecodeLength=${(factory.bytecode.length - 2) / 2} bytes`);

  const token = await factory.deploy(owner, overrides);
  const deploymentTx = token.deploymentTransaction();
  if (!deploymentTx) throw new Error("Deployment transaction not found");

  const receipt = await deploymentTx.wait();
  if (!receipt) throw new Error("Deployment receipt not found");

  const address = await token.getAddress();

  console.log(`[deploy-harmony] Neurons deployed at ${address}`);
  console.log(`[deploy-harmony] tx=${deploymentTx.hash} block=${receipt.blockNumber}`);

  if (receipt.status === 0 && receipt.gasUsed === BigInt(overrides.gasLimit)) {
    throw new Error(
      `Deploy falhou consumindo 100% do gas (provável out-of-gas). Aumente GAS_LIMIT (ex: 25000000) e tente novamente. tx=${deploymentTx.hash}`,
    );
  }

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
