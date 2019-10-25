const fs = require('fs');
const deployed_addresses_filename = "deployed_addresses.json";
const DeployedAddresses = require("./" + deployed_addresses_filename);
const AdminUpgradeabilityProxy = artifacts.require("./zos/upgradeability/AdminUpgradeabilityProxy");

module.exports = function (deployer, network, accounts) {
  console.log("deploying token proxy contract...");
  deployer.then(function () {
    switch (network) {
      case 'development':
        return AdminUpgradeabilityProxy.new(DeployedAddresses.dev.tokenImplementationL, DeployedAddresses.dev.proxyAdmin, []);
      case 'ropsten':
        return AdminUpgradeabilityProxy.new(DeployedAddresses.ropsten.tokenImplementationL, DeployedAddresses.ropsten.proxyAdmin, []);
      case 'rinkeby':
        return AdminUpgradeabilityProxy.new(DeployedAddresses.rinkeby.tokenImplementationL, DeployedAddresses.rinkeby.proxyAdmin, []);
      case 'mainnet':
        return AdminUpgradeabilityProxy.new(DeployedAddresses.mainnet.tokenImplementationL, DeployedAddresses.mainnet.proxyAdmin, []);
    }
  }).then(function (instance) {
    console.log("Token Proxy at:", instance.address);
    switch (network) {
      case 'development':
        DeployedAddresses.dev.tokenProxyL = instance.address;
        break;
      case 'ropsten':
        DeployedAddresses.ropsten.tokenProxyL = instance.address;
        break;
      case 'rinkeby':
        DeployedAddresses.rinkeby.tokenProxyL = instance.address;
        break;
      case 'mainnet':
        DeployedAddresses.mainnet.tokenProxyL = instance.address;
        break;
    }
    fs.writeFileSync("./migrations/" + deployed_addresses_filename, JSON.stringify(DeployedAddresses, null, 2));
  });
};
