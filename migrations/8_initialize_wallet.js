const fs = require('fs');
const deployed_addresses_filename = "deployed_addresses.json";
const assert = require('assert').strict;

const DeployedAddresses = require("./" + deployed_addresses_filename);
const Config = require("./config.json");

const IDRTWallet = artifacts.require("./governance/wallet/IDRTWallet");

module.exports = async function(deployer, network, accounts) {
    let wallet;
	switch(network) {
        case 'development': 
            wallet = await IDRTWallet.at(DeployedAddresses.dev.walletProxy);
            break;
        case 'ropsten':
            wallet = await IDRTWallet.at(DeployedAddresses.ropsten.walletProxy);
            break;
        case 'rinkeby':                 
            wallet = await IDRTWallet.at(DeployedAddresses.rinkeby.walletProxy);
            break;
        case 'mainnet':
            wallet = await IDRTWallet.at(DeployedAddresses.mainnet.walletProxy);
            break;
        };

    console.log("Initializing wallet contract...");
	await wallet.initialize(
        [Config.admin_1, Config.admin_2, Config.admin_3],
        Config.number_of_required_confirmations,
        Config.print_limit
    );

    const initialized_admins = ['none', await wallet.owners(0), await wallet.owners(1), await wallet.owners(2)];

    assert.strictEqual(initialized_admins[1], Config.admin_1);
    assert.strictEqual(initialized_admins[2], Config.admin_2);
    assert.strictEqual(initialized_admins[3], Config.admin_3);

    console.log("Admin 1    :", initialized_admins[1]);
    console.log("Admin 2    :", initialized_admins[2]);
    console.log("Admin 3    :", initialized_admins[3]);
};
