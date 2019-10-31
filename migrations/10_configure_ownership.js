const fs = require('fs');
const deployed_addresses_filename = "deployed_addresses.json";
const assert = require('assert').strict;

const DeployedAddresses = require("./" + deployed_addresses_filename);
const Config = require('./config.json');

const ERC20RupiahToken = artifacts.require("./token/ERC20RupiahToken");
const IDRTWallet = artifacts.require("./governance/wallet/IDRTWallet");
const ProxyAdmin = artifacts.require("./zos/upgradeability/ProxyAdmin");
const RupiahFeeCollector = artifacts.require('./fee/RupiahFeeCollector');

module.exports = async function(deployer, network, accounts) {
    let token, wallet, proxyAdmin;
    switch(network) {
        case 'development':
            token = await ERC20RupiahToken.at(DeployedAddresses.dev.tokenProxy);
            wallet = await IDRTWallet.at(DeployedAddresses.dev.walletProxy);
            proxyAdmin = await ProxyAdmin.at(DeployedAddresses.dev.proxyAdmin);
            rupiahFeeCollector = await RupiahFeeCollector.at(DeployedAddresses.dev.feeCollector);
            break;
        case 'ropsten':
            token = await ERC20RupiahToken.at(DeployedAddresses.ropsten.tokenProxy);
            wallet = await IDRTWallet.at(DeployedAddresses.ropsten.walletProxy);
            proxyAdmin = await ProxyAdmin.at(DeployedAddresses.ropsten.proxyAdmin);
            rupiahFeeCollector = await RupiahFeeCollector.at(DeployedAddresses.ropsten.feeCollector);
            break;
        case 'rinkeby':
            token = await ERC20RupiahToken.at(DeployedAddresses.rinkeby.tokenProxy);
            wallet = await IDRTWallet.at(DeployedAddresses.rinkeby.walletProxy);
            proxyAdmin = await ProxyAdmin.at(DeployedAddresses.rinkeby.proxyAdmin);
            rupiahFeeCollector = await RupiahFeeCollector.at(DeployedAddresses.rinkeby.feeCollector);
            break;
        case 'mainnet':
            token = await ERC20RupiahToken.at(DeployedAddresses.mainnet.tokenProxy);
            wallet = await IDRTWallet.at(DeployedAddresses.mainnet.walletProxy);
            proxyAdmin = await ProxyAdmin.at(DeployedAddresses.mainnet.proxyAdmin);
            rupiahFeeCollector = await RupiahFeeCollector.at(DeployedAddresses.mainnet.feeCollector);
            break;
        };

    console.log("Change ERC20 Ownership to wallet address...");
    await token.transferOwnership(wallet.address);

    console.log("Change Proxy Admin to wallet address...");
    await proxyAdmin.transferOwnership(wallet.address);

    console.log("Change Wallet owner role to designated address...");
    await wallet.transferOwnership(Config.owner);

    console.log("Change FeeCollector owner role to wallet address...");
    await rupiahFeeCollector.transferOwnership(wallet.address);

    const current_token_owner = await token.owner();
    const current_proxy_admin_owner = await proxyAdmin.owner();
    const current_wallet_owner = await wallet.superOwner();
    const current_feeCollector_owner = await rupiahFeeCollector.owner();

    assert.strictEqual(current_token_owner, wallet.address);
    assert.strictEqual(current_proxy_admin_owner, wallet.address);
    assert.strictEqual(current_wallet_owner, Config.owner);
    assert.strictEqual(current_feeCollector_owner, wallet.address); 

    console.log("Current owner of the token", current_token_owner);
    console.log("Current owner of the proxy admin", current_proxy_admin_owner);
    console.log("Current owner of the wallet", current_wallet_owner);
    console.log("Current owner of the feeCollector", current_feeCollector_owner);
};
