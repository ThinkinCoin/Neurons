import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type DeployedContractRecord = {
  name: string;
  address: string;
  txHash: string;
  blockNumber: number;
  constructorArgs: unknown[];
};

export type DeploymentFile = {
  schema: "neurons.deployments.v1";
  network: string;
  chainId: number;
  timestamp: string;
  deployer: string;
  contracts: Record<string, DeployedContractRecord>;
};

export function defaultDeploymentPath(networkName: string): string {
  return resolve(process.cwd(), "deployments", `${networkName}.json`);
}

export async function loadDeploymentFile(filePath: string): Promise<DeploymentFile | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as DeploymentFile;
  } catch {
    return null;
  }
}

export async function saveDeploymentFile(filePath: string, data: DeploymentFile): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function upsertContract(
  filePath: string,
  header: Omit<DeploymentFile, "contracts">,
  contract: DeployedContractRecord,
): Promise<DeploymentFile> {
  const existing = await loadDeploymentFile(filePath);

  const next: DeploymentFile = {
    schema: "neurons.deployments.v1",
    network: header.network,
    chainId: header.chainId,
    timestamp: header.timestamp,
    deployer: header.deployer,
    contracts: {
      ...(existing?.contracts ?? {}),
      [contract.name]: contract,
    },
  };

  await saveDeploymentFile(filePath, next);
  return next;
}
