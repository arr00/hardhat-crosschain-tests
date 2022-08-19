import fs from "fs";
import globby from "globby";
import { TASK_TEST_GET_TEST_FILES } from "hardhat/builtin-tasks/task-names";
import { task } from "hardhat/config";
import { resolve } from "path";

task(TASK_TEST_GET_TEST_FILES).setAction(async (_, { config }, runSuper) => {
  console.log("Getting test files");

  fs.rmSync("cache/test", { recursive: true, force: true });

  const insertCodeBlock = (networkRpc: string, chainId: number) => {
    return `
    await hre.network.provider.request({method: "hardhat_reset", params: [{forking: {jsonRpcUrl: \"${networkRpc}\"},chainId: ${chainId}}]}); 
    `;
  };

  let testFiles = [];
  let networksString = "";

  for (const network of Object.keys(networks)) {
    const networkTests = await globby([`test/**-${network}*`], {
      caseSensitiveMatch: false,
    });
    networksString += `${network},`;

    for (const networkTest of networkTests) {
      const blockToAdd = insertCodeBlock(
        networks[network].networkRpc + process.env.INFURA_KEY,
        networks[network].chainId
      );
      let testText = fs.readFileSync(networkTest, "utf8");

      // First check if there is a before block
      const beforeBlockIndex = testText.indexOf("before(");

      if (beforeBlockIndex > -1) {
        // Exists, insert into the block
        const blockStartIndex = testText.indexOf("{", beforeBlockIndex);
        testText =
          testText.slice(0, blockStartIndex + 1) +
          blockToAdd +
          testText.slice(blockStartIndex + 1);
      } else {
        // Need to create a new before block
        const describeBlockIndex = testText.indexOf("describe(");
        if (describeBlockIndex > -1) {
          const blockStartIndex = testText.indexOf("{", describeBlockIndex);
          const beforeBlock =
            "\nbefore(async function () {" + blockToAdd + "});";
          testText =
            testText.slice(0, blockStartIndex + 1) +
            beforeBlock +
            testText.slice(blockStartIndex + 1);
        }
      }

      fs.mkdirSync("cache/test", { recursive: true });
      fs.writeFileSync("cache/" + networkTest, testText);
      testFiles.push(resolve("cache/" + networkTest));
    }
  }

  testFiles = testFiles.concat(
    await globby(["**", `!**-{${networksString.slice(0, -1)}}*`], {
      cwd: "test",
      caseSensitiveMatch: false,
      absolute: true,
    })
  );

  return testFiles;
});

const networks: {
  [network: string]: { chainId: number; networkRpc: string };
} = {
  mainnet: { chainId: 1, networkRpc: "https://rinkeby.infura.io/v3/" },
  ropsten: { chainId: 3, networkRpc: "https://ropsten.infura.io/v3/" },
  rinkeby: { chainId: 4, networkRpc: "https://rinkeby.infura.io/v3/" },
  kovan: { chainId: 42, networkRpc: "https://kovan.infura.io/v3/" },
  goerli: { chainId: 5, networkRpc: "https://goerli.infura.io/v3/" },
  polygon: {
    chainId: 137,
    networkRpc: "https://polygon-mainnet.infura.io/v3/",
  },
  mumbai: {
    chainId: 80001,
    networkRpc: "https://polygon-mumbai.infura.io/v3/",
  },
  optimism: {
    chainId: 10,
    networkRpc: "https://optimism-mainnet.infura.io/v3/",
  },
  optimisticGoerli: {
    chainId: 420,
    networkRpc: "https://optimism-goerli.infura.io/v3/",
  },
  arbitrum: {
    chainId: 42161,
    networkRpc: "https://arbitrum-mainnet.infura.io/v3/",
  },
  arbitrumGoerli: {
    chainId: 421613,
    networkRpc: "https://arbitrum-goerli.infura.io/v3/",
  },
};
