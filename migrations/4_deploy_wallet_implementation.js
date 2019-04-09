const fs = require('fs');
const deployed_addresses_filename = "deployed_addresses.json";
const DeployedAddresses = require("./" + deployed_addresses_filename);

const IDRTWalletImplementation = artifacts.require("./governance/wallet/IDRTWallet");

module.exports = function(deployer, network, accounts) {
    console.log("deploying wallet implementation contract...");
    deployer.deploy(IDRTWalletImplementation).
    	then(async function () {
    		switch(network) {
                case 'development':
    				DeployedAddresses.dev.walletImplementationV1 = (await IDRTWalletImplementation.deployed()).address;
    				break;
    			case 'ropsten':
    				DeployedAddresses.ropsten.walletImplementationV1 = (await IDRTWalletImplementation.deployed()).address;
                    break;
                case 'rinkeby':    				
                	DeployedAddresses.rinkeby.walletImplementationV1 = (await IDRTWalletImplementation.deployed()).address;
                    break;
                case 'mainnet':
                    DeployedAddresses.mainnet.walletImplementationV1 = (await IDRTWalletImplementation.deployed()).address;
                    break;
    		}
    	});
    fs.writeFileSync("./migrations/" + deployed_addresses_filename, JSON.stringify(DeployedAddresses, null, 2));
};
