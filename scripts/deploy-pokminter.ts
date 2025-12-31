import { ethers, network } from "hardhat";
import { defaultDeploymentPath, loadDeploymentFile, upsertContract } from "./deployments";

function envString(name: string): string | undefined {
  const value = (process.env[name] || "").trim();
  return value || undefined;
}

function requireEnv(name: string): string {
  const value = envString(name);
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

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

  const fallback = 8_000_000;
  const desired = requested ?? fallback;

  if (blockGasLimitNum) {
    const cap = Math.max(1, Math.floor(blockGasLimitNum * 0.9));
    if (desired > cap) {
      console.warn(`[deploy-pokminter] GAS_LIMIT=${desired} acima do limite do bloco (${blockGasLimitNum}); usando cap=${cap}`);
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

async function resolveTokenAddress(deploymentsPath: string): Promise<string> {
  const tokenFromEnv = envString("TOKEN_ADDRESS");
  if (tokenFromEnv) return tokenFromEnv;

  const existing = await loadDeploymentFile(deploymentsPath);
  const token = existing?.contracts?.["Neurons"];
  if (!token?.address) {
    throw new Error(
      `TOKEN_ADDRESS não informado e Neurons não encontrado em ${deploymentsPath}. Defina TOKEN_ADDRESS ou faça deploy do token primeiro.`,
    );
  }

  return token.address;
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const daoAddress = requireEnv("DAO_ADDRESS");
  const outPath = envString("DEPLOYMENTS_FILE") ?? defaultDeploymentPath(network.name);

  console.log(`[deploy-pokminter] network=${network.name} chainId=${network.config.chainId}`);
  console.log(`[deploy-pokminter] deployer=${deployer.address}`);
  console.log(`[deploy-pokminter] dao=${daoAddress}`);

  const tokenAddress = await resolveTokenAddress(outPath);
  console.log(`[deploy-pokminter] token=${tokenAddress}`);

  const overrides = await deployOverrides();
  const latest = await ethers.provider.getBlock("latest");
  if (latest?.gasLimit) console.log(`[deploy-pokminter] latestBlockGasLimit=${latest.gasLimit.toString()}`);
  console.log(`[deploy-pokminter] gasLimit=${overrides.gasLimit} gasPrice=${overrides.gasPrice.toString()}`);

  let verifierAddress = envString("VERIFIER_ADDRESS");

  if (!verifierAddress) {
    const trustedSigner = requireEnv("TRUSTED_SIGNER_ADDRESS");

    const Verifier = await ethers.getContractFactory("ECDSAVerifier");
    if (!Verifier.bytecode || Verifier.bytecode === "0x") {
      throw new Error("ECDSAVerifier bytecode vazio. Rode `npx hardhat compile`.");
    }

    console.log(`[deploy-pokminter] deploying ECDSAVerifier(owner=dao, trustedSigner=${trustedSigner})...`);
    const verifier = await Verifier.deploy(daoAddress, trustedSigner, overrides);
    const verifierTx = verifier.deploymentTransaction();
    if (!verifierTx) throw new Error("Verifier deployment tx not found");
    const verifierReceipt = await verifierTx.wait();
    if (!verifierReceipt) throw new Error("Verifier deployment receipt not found");

    verifierAddress = await verifier.getAddress();
    console.log(`[deploy-pokminter] ECDSAVerifier=${verifierAddress} tx=${verifierTx.hash} block=${verifierReceipt.blockNumber}`);

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
        name: "ECDSAVerifier",
        address: verifierAddress,
        txHash: verifierTx.hash,
        blockNumber: verifierReceipt.blockNumber,
        constructorArgs: [daoAddress, trustedSigner],
      },
    );
  } else {
    console.log(`[deploy-pokminter] using existing verifier=${verifierAddress}`);
  }

  const PoKMinter = await ethers.getContractFactory("PoKMinter");
  if (!PoKMinter.bytecode || PoKMinter.bytecode === "0x") {
    throw new Error("PoKMinter bytecode vazio. Rode `npx hardhat compile`.");
  }

  console.log(`[deploy-pokminter] deploying PoKMinter(owner=dao, token, verifier, daoTreasury=dao)...`);
  const pok = await PoKMinter.deploy(daoAddress, tokenAddress, verifierAddress, daoAddress, overrides);
  const pokTx = pok.deploymentTransaction();
  if (!pokTx) throw new Error("PoKMinter deployment tx not found");
  const pokReceipt = await pokTx.wait();
  if (!pokReceipt) throw new Error("PoKMinter deployment receipt not found");

  const pokAddress = await pok.getAddress();
  console.log(`[deploy-pokminter] PoKMinter=${pokAddress} tx=${pokTx.hash} block=${pokReceipt.blockNumber}`);

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
      name: "PoKMinter",
      address: pokAddress,
      txHash: pokTx.hash,
      blockNumber: pokReceipt.blockNumber,
      constructorArgs: [daoAddress, tokenAddress, verifierAddress, daoAddress],
    },
  );

  console.log(`[deploy-pokminter] wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
