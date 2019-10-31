var Migrations = artifacts.require("./Migrations.sol");
const fs = require('fs');

module.exports = function(deployer, network, accounts) {
  const Config = {
    deployer: accounts[0],
    admin_1: accounts[1],
    admin_2: accounts[2],
    admin_3: accounts[3],
    owner: accounts[4],
    exchanger: accounts[5],
    user_1: accounts[6],
    user_2: accounts[7],
    attacker: accounts[8],
    token_name: "Rupiah Token",
    token_symbol: "IDRT",
    token_currency: "IDR",
    token_decimals: 2,
    number_of_required_confirmations: 2,
    print_limit: 100000000,

    feeCollector: {
      fromWhitelist: [accounts[0], accounts[6], accounts[7]],
      toWhitelist: [accounts[0], accounts[4], accounts[5]],
      feeCollectors: [accounts[7], accounts[8]],
      feeCollectorRatio: [40, 60],
      feeRatioNumerator: 15,
      feeRatioDenominator: 1000,
    },
  };

  fs.writeFileSync("./test/test_config.json", JSON.stringify(Config, null, 2));
  deployer.deploy(Migrations);
};
