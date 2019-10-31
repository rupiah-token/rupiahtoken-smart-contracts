const fs = require('fs');
const deployed_addresses_filename = "deployed_addresses.json";
const DeployedAddresses = require("./" + deployed_addresses_filename);
const { feeCollector } = require('../test/test_config.json');
const {
  fromWhitelist,
  toWhitelist,
  feeCollectors,
  feeCollectorRatio,
  feeRatioNumerator,
  feeRatioDenominator
} = feeCollector;
const RupiahFeeColector = artifacts.require('./fee/RupiahFeeCollector');

const ERC20RupiahToken = artifacts.require("./token/ERC20RupiahToken");

module.exports = function (deployer, network, accounts) {
  console.log("deploying fee collector contract...");
  const net = network === 'development' ? 'dev' : network;
  deployer.deploy(RupiahFeeColector, fromWhitelist, toWhitelist, feeCollectors, feeCollectorRatio, DeployedAddresses[net].tokenProxy, feeRatioNumerator, feeRatioDenominator)
    .then(async function () {
      const deployed = await RupiahFeeColector.deployed();
      DeployedAddresses[net].feeCollector = deployed.address;
      const token = await ERC20RupiahToken.at(DeployedAddresses[net].tokenProxy);
      await token.setCollectorContract(deployed.address);
      fs.writeFileSync("./migrations/" + deployed_addresses_filename, JSON.stringify(DeployedAddresses, null, 2));
    });
};
