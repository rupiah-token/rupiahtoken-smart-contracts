const fs = require('fs');
const deployed_addresses_filename = "deployed_addresses.json";
const assert = require('assert').strict;

const DeployedAddresses = require("./" + deployed_addresses_filename);
const Config = require("../test/test_config.json");

const ERC20RupiahToken = artifacts.require("./token/ERC20RupiahToken");

module.exports = async function(deployer, network, accounts) {
	let token;
	switch(network) {
        case 'development':
  			token = await ERC20RupiahToken.at(DeployedAddresses.dev.tokenProxy);
  			break;
    	case 'ropsten':
  			token = await ERC20RupiahToken.at(DeployedAddresses.ropsten.tokenProxy);
  			break;
        case 'rinkeby':
  			token = await ERC20RupiahToken.at(DeployedAddresses.rinkeby.tokenProxy);
  			break;
        case 'mainnet':
  			token = await ERC20RupiahToken.at(DeployedAddresses.mainnet.tokenProxy);
  			break;
    	};

    console.log("Initializing token contract...");
	await token.initialize(
        Config.token_name,
        Config.token_symbol,
        Config.token_currency,
        Config.token_decimals
    );

    const initialized_name = await token.name();
	const initialized_symbol = await token.symbol();
    const initialized_currency = await token.currency();
    const initialized_decimals = (await token.decimals()).toNumber();

    assert.strictEqual(initialized_name, Config.token_name);
    assert.strictEqual(initialized_symbol, Config.token_symbol);
    assert.strictEqual(initialized_currency, Config.token_currency);
    assert.strictEqual(initialized_decimals, Config.token_decimals);

    console.log("Token name:", initialized_name);
    console.log("Token symbol:", initialized_symbol);
    console.log("Token currency:", initialized_currency);
    console.log("Token decimals:", initialized_decimals);
};
