var Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer, network) {
  process.env.NETWORK = network === 'development' ? 'dev' : network;
  deployer.deploy(Migrations);
};
