require("openzeppelin-test-helpers");
const { shouldBehaveLikeOwnable } = require("./Ownable.behavior");

const TestUtils = require("./TestUtils");
const ERC20RupiahToken = artifacts.require("ERC20RupiahToken");
const ERC20RupiahTokenV2 = artifacts.require("ERC20RupiahTokenV2");
const ProxyAdmin = artifacts.require("ProxyAdmin");

contract("ERC20RupiahTokenV2 Ownable", function([owner, ...otherAccounts]) {
    beforeEach(async function() {
        proxyAdmin = await TestUtils.createProxyAdmin(owner);
        tokenImplementation = await TestUtils.createImplementation(
            ERC20RupiahToken
        );
        tokenProxy = await TestUtils.createProxy(
            tokenImplementation.address,
            proxyAdmin.address,
            []
        );
        this.ownable = await ERC20RupiahToken.at(tokenProxy.address);
        await TestUtils.initializeTokenProxy(this.ownable);

        this.proxyAdmin = await ProxyAdmin.at(proxyAdmin.address)
        tokenImplementationV2 = await TestUtils.createImplementation(
            ERC20RupiahTokenV2
        );
        await this.proxyAdmin.upgrade(
            tokenProxy.address,
            tokenImplementationV2.address,
            {from: owner}
        );
        (await this.proxyAdmin.getProxyImplementation(
            tokenProxy.address
        )).should.equal(tokenImplementationV2.address);

        this.ownable = await ERC20RupiahTokenV2.at(tokenProxy.address);
  });

  shouldBehaveLikeOwnable(owner, otherAccounts);
});