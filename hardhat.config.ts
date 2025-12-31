import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "hardhat-contract-sizer";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "dotenv/config";

function getAccounts(): string[] {
  const accounts: string[] = [];

  const privateKey = (process.env.PRIVATE_KEY || "").trim();
  if (privateKey) accounts.push(privateKey);

  const privateKeys = (process.env.PRIVATE_KEYS || "").trim();
  if (privateKeys) {
    for (const key of privateKeys.split(",").map((k) => k.trim()).filter(Boolean)) {
      accounts.push(key);
    }
  }

  return accounts;
}

const config: HardhatUserConfig = {
  paths: {
    sources: "contracts/src",
    tests: "test",
    cache: "cache",
    artifacts: "artifacts",
  },
  solidity: {
    version: "0.8.33",
    settings: {
      evmVersion: "shanghai",
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    mainnet: {
      url:
        process.env.RPC_ETHEREUM_MAINNET ||
        ("https://mainnet.infura.io/v3/" + (process.env.INFURA_API_KEY || "")),
      chainId: 1,
      accounts: getAccounts(),
    },
    sepolia: {
      url: process.env.RPC_SEPOLIA || "https://sepolia.infura.io/v3/" + (process.env.INFURA_API_KEY || ""),
      chainId: 11155111,
      accounts: getAccounts(),
    },
    goerli: {
      url: process.env.RPC_GOERLI || "https://goerli.infura.io/v3/" + (process.env.INFURA_API_KEY || ""),
      chainId: 5,
      accounts: getAccounts(),
    },
    polygon: {
      url: process.env.RPC_POLYGON_MAINNET || "https://polygon-rpc.com",
      chainId: 137,
      accounts: getAccounts(),
    },
    polygonMumbai: {
      url: process.env.RPC_POLYGON_MUMBAI || "https://rpc-mumbai.maticvigil.com",
      chainId: 80001,
      accounts: getAccounts(),
    },
    bsc: {
      url: process.env.RPC_BSC_MAINNET || "https://bsc-dataseed.binance.org",
      chainId: 56,
      accounts: getAccounts(),
    },
    bscTestnet: {
      url: process.env.RPC_BSC_TESTNET || "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: getAccounts(),
    },
    arbitrumOne: {
      url: process.env.RPC_ARBITRUM_MAINNET || "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
      accounts: getAccounts(),
    },
    arbitrumSepolia: {
      url: process.env.RPC_ARBITRUM_SEPOLIA || "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: getAccounts(),
    },
    harmonyMainnet: {
      url: process.env.RPC_HARMONY_MAINNET || "https://api.harmony.one",
      chainId: 1666600000,
      accounts: getAccounts(),
    },
    harmonyTestnet: {
      url: process.env.RPC_HARMONY_TESTNET || "https://api.s0.b.hmny.io",
      chainId: 1666700000,
      accounts: getAccounts(),
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      goerli: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
      bsc: process.env.BSCSCAN_API_KEY || "",
      bscTestnet: process.env.BSCSCAN_API_KEY || "",
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || "",
      harmonyMainnet: process.env.HARMONYSCAN_API_KEY || "",
      harmonyTestnet: process.env.HARMONYSCAN_API_KEY || "",
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;