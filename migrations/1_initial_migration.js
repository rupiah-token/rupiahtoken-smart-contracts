var Migrations = artifacts.require("./Migrations.sol");
const fs = require('fs');
const Config = {}

module.exports = function(deployer, network, accounts) {
  Config.deployer = accounts[0];
  Config.admin_1 = accounts[1];
  Config.admin_2 = accounts[2];
  Config.admin_3 = accounts[3];
  Config.owner =  accounts[4];
  Config.exchanger = accounts[5];
  Config.user_1 = accounts[6];
  Config.user_2 = accounts[7];
  Config.attacker = accounts[8];

  fs.writeFileSync("./test/test_config.json", JSON.stringify(Config, null, 2));
  deployer.deploy(Migrations);
};
