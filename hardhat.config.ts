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
      evmVersion: (process.env.EVM_VERSION as any) || "shanghai",
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
      gasPrice: 30_000_000_000,
    },
    harmonyTestnet: {
      url: process.env.RPC_HARMONY_TESTNET || "https://api.s0.b.hmny.io",
      chainId: 1666700000,
      accounts: getAccounts(),
      gasPrice: 30_000_000_000,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      goerli: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.ETHERSCAN_API_KEY || "",
      polygonMumbai: process.env.ETHERSCAN_API_KEY || "",
      bsc: process.env.ETHERSCAN_API_KEY || "",
      bscTestnet: process.env.ETHERSCAN_API_KEY || "",
      arbitrumOne: process.env.ETHERSCAN_API_KEY || "",
      arbitrumSepolia: process.env.ETHERSCAN_API_KEY || "",
      // Blockscout (Harmony) geralmente ignora apiKey, mas o plugin exige um valor.
      harmonyMainnet: process.env.HARMONY_BLOCKSCOUT_API_KEY || "blockscout",
      harmonyTestnet: process.env.HARMONY_BLOCKSCOUT_API_KEY || "blockscout",
    },
    customChains: [
      {
        network: "mainnet",
        chainId: 1,
        urls: {
          apiURL: "https://api.etherscan.io/api",
          browserURL: "https://etherscan.io",
        },
      },
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",
          browserURL: "https://sepolia.etherscan.io",
        },
      },
      {
        network: "goerli",
        chainId: 5,
        urls: {
          apiURL: "https://api-goerli.etherscan.io/api",
          browserURL: "https://goerli.etherscan.io",
        },
      },
      {
        network: "polygon",
        chainId: 137,
        urls: {
          apiURL: "https://api.polygonscan.com/api",
          browserURL: "https://polygonscan.com",
        },
      },
      {
        network: "polygonMumbai",
        chainId: 80001,
        urls: {
          apiURL: "https://api-testnet.polygonscan.com/api",
          browserURL: "https://mumbai.polygonscan.com",
        },
      },
      {
        network: "bsc",
        chainId: 56,
        urls: {
          apiURL: "https://api.bscscan.com/api",
          browserURL: "https://bscscan.com",
        },
      },
      {
        network: "bscTestnet",
        chainId: 97,
        urls: {
          apiURL: "https://api-testnet.bscscan.com/api",
          browserURL: "https://testnet.bscscan.com",
        },
      },
      {
        network: "arbitrumOne",
        chainId: 42161,
        urls: {
          apiURL: "https://api.arbiscan.io/api",
          browserURL: "https://arbiscan.io",
        },
      },
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io",
        },
      },
      {
        network: "harmonyMainnet",
        chainId: 1666600000,
        urls: {
          apiURL: "https://explorer.harmony.one/api",
          browserURL: "https://explorer.harmony.one",
        },
      },
      {
        network: "harmonyTestnet",
        chainId: 1666700000,
        urls: {
          apiURL: "https://explorer.testnet.harmony.one/api",
          browserURL: "https://explorer.testnet.harmony.one",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
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