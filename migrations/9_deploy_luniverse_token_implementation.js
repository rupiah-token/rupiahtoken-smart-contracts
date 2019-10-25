const fs = require('fs');
const deployed_addresses_filename = "deployed_addresses.json";
const DeployedAddresses = require("./" + deployed_addresses_filename);

const ERC20RupiahTokenImplementation = artifacts.require("./token/ERC20RupiahTokenL");

module.exports = function(deployer, network, accounts) {
  console.log("deploying token implementation contract...");
  deployer.deploy(ERC20RupiahTokenImplementation)
    .then(async function () {
      switch(network) {
        case 'development':
          DeployedAddresses.dev.tokenImplementationL = (await ERC20RupiahTokenImplementation.deployed()).address;
          break;
        case 'ropsten':
          DeployedAddresses.ropsten.tokenImplementationL = (await ERC20RupiahTokenImplementation.deployed()).address;
          break;
        case 'rinkeby':
          DeployedAddresses.rinkeby.tokenImplementationL = (await ERC20RupiahTokenImplementation.deployed()).address;
          break;
        case 'mainnet':
          DeployedAddresses.mainnet.tokenImplementationL = (await ERC20RupiahTokenImplementation.deployed()).address;
          break;
      }
    });
  fs.writeFileSync("./migrations/" + deployed_addresses_filename, JSON.stringify(DeployedAddresses, null, 2));
};
