const fs = require('fs');
const deployed_addresses_filename = "deployed_addresses.json";
const DeployedAddresses = require("./" + deployed_addresses_filename);

const ProxyAdmin = artifacts.require("./zos/upgradeability/ProxyAdmin");

module.exports = function(deployer, network, accounts) {
    console.log("deploying proxy admin contract...");
    deployer.deploy(ProxyAdmin)
        .then(async function() {
            switch(network) {
                case 'development':
                    DeployedAddresses.dev.proxyAdmin = (await ProxyAdmin.deployed()).address;
                    break;
                case 'ropsten':
                    DeployedAddresses.ropsten.proxyAdmin = (await ProxyAdmin.deployed()).address;
                    break;
                case 'rinkeby':
                    DeployedAddresses.rinkeby.proxyAdmin = (await ProxyAdmin.deployed()).address;
                    break;
                case 'mainnet':
                    DeployedAddresses.mainnet.proxyAdmin = (await ProxyAdmin.deployed()).address;
                    break;
            }
        });
    fs.writeFileSync("./migrations/" + deployed_addresses_filename, JSON.stringify(DeployedAddresses, null, 2));
};
