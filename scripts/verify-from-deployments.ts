import { network, run } from "hardhat";
import { defaultDeploymentPath, loadDeploymentFile } from "./deployments";

function optionalEnv(name: string): string | undefined {
  const value = (process.env[name] || "").trim();
  return value || undefined;
}

async function verifyContract(name: string, address: string, constructorArguments: unknown[]) {
  console.log(`[verify] ${name} @ ${address}`);
  try {
    await run("verify:verify", {
      address,
      constructorArguments,
    });
    console.log(`[verify] OK ${name}`);
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    if (msg.toLowerCase().includes("already verified")) {
      console.log(`[verify] already verified: ${name}`);
      return;
    }
    throw err;
  }
}

async function main() {
  const filePath = optionalEnv("DEPLOYMENTS_FILE") ?? defaultDeploymentPath(network.name);
  const data = await loadDeploymentFile(filePath);
  if (!data) throw new Error(`Deployment file not found: ${filePath}`);

  console.log(`[verify] network=${network.name} file=${filePath}`);

  const neurons = data.contracts["Neurons"];
  if (neurons) {
    await verifyContract("Neurons", neurons.address, neurons.constructorArgs);
  }

  const proxy = data.contracts["NeuronsProxy"];
  if (proxy) {
    await verifyContract("NeuronsProxy", proxy.address, proxy.constructorArgs);
  }

  if (!neurons && !proxy) {
    throw new Error(`No known contracts found in ${filePath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
