const fs = require('fs');
const deployed_addresses_filename = "deployed_addresses.json";
const DeployedAddresses = require("./" + deployed_addresses_filename);

const ERC20RupiahTokenImplementation = artifacts.require("./token/ERC20RupiahToken");
const ProxyAdmin = artifacts.require("./zos/upgradeability/ProxyAdmin");
const AdminUpgradeabilityProxy = artifacts.require("./zos/upgradeability/AdminUpgradeabilityProxy");

module.exports = function (deployer, network, accounts) {
  console.log("deploying token proxy contract...");
  deployer.then(function () {
    switch (network) {
      case 'development':
        return AdminUpgradeabilityProxy.new(DeployedAddresses.dev.tokenImplementationV1, DeployedAddresses.dev.proxyAdmin, []);
      case 'ropsten':
        return AdminUpgradeabilityProxy.new(DeployedAddresses.ropsten.tokenImplementationV1, DeployedAddresses.ropsten.proxyAdmin, []);
      case 'rinkeby':
        return AdminUpgradeabilityProxy.new(DeployedAddresses.rinkeby.tokenImplementationV1, DeployedAddresses.rinkeby.proxyAdmin, []);
      case 'mainnet':
        return AdminUpgradeabilityProxy.new(DeployedAddresses.mainnet.tokenImplementationV1, DeployedAddresses.mainnet.proxyAdmin, []);
    }
  }).then(function (instance) {
    console.log("Token Proxy at:", instance.address);
    switch (network) {
      case 'development':
        DeployedAddresses.dev.tokenProxy = instance.address;
        break;
      case 'ropsten':
        DeployedAddresses.ropsten.tokenProxy = instance.address;
        break;
      case 'rinkeby':
        DeployedAddresses.rinkeby.tokenProxy = instance.address;
        break;
      case 'mainnet':
        DeployedAddresses.mainnet.tokenProxy = instance.address;
        break;
    }
    fs.writeFileSync("./migrations/" + deployed_addresses_filename, JSON.stringify(DeployedAddresses, null, 2));
  });
};
