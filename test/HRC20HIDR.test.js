const {
  BN,
  constants,
  expectEvent,
  shouldFail
} = require("openzeppelin-test-helpers");
const { ZERO_ADDRESS } = constants;
const TestUtils = require("./TestUtils");
const ERC20RupiahToken = artifacts.require("ERC20RupiahToken");
const HRC20HIDR = artifacts.require("HRC20HIDR");
const IDRTWallet = artifacts.require("IDRTWallet");
const ProxyAdmin = artifacts.require("ProxyAdmin");

contract("HIDR", function([
  deployer,
  account_1,
  account_2,
  ward_1,
  ward_2,
  otherAccount,
  ...anotherAccounts
]) {
  const _name = "Harmony IDR";
  const _symbol = "HIDR";
  const _currency = "IDR";
  const _decimals = new BN(2);

  beforeEach(async function() {
    proxyAdmin = await TestUtils.createProxyAdmin(deployer);

    tokenImplementation = await TestUtils.createImplementation(
      ERC20RupiahToken
    );
    tokenProxy = await TestUtils.createProxy(
      tokenImplementation.address,
      proxyAdmin.address,
      []
    );

    walletImplementation = await TestUtils.createImplementation(IDRTWallet);
    walletProxy = await TestUtils.createProxy(
      walletImplementation.address,
      proxyAdmin.address,
      []
    );

    this.token = await ERC20RupiahToken.at(tokenProxy.address);
    this.wallet = await IDRTWallet.at(walletProxy.address);
    this.proxyAdmin = await ProxyAdmin.at(proxyAdmin.address);

    await TestUtils.initializeTokenProxy(this.token);
    await TestUtils.initializeWalletProxy(this.wallet);

    await this.token.mint(account_1, 100);
  });

  describe("upgrade implementation to HIDR", function() {
    describe("token", function() {
      beforeEach(async function() {
        hidrImplementation = await TestUtils.createImplementation(
          HRC20HIDR
        );
      });

      describe("when the sender is not proxyAdmin owner", function() {
        it("reverts", async function() {
          await shouldFail.reverting(
            this.proxyAdmin.upgrade(
              tokenProxy.address,
              hidrImplementation.address,
              { from: account_1 }
            )
          );
        });
      });

      describe("when the sender is proxyAdmin owner", function() {
        it("upgraded", async function() {
          await this.proxyAdmin.upgrade(
            tokenProxy.address,
            hidrImplementation.address,
            { from: deployer }
          );
          (await this.proxyAdmin.getProxyImplementation(
            tokenProxy.address
          )).should.equal(hidrImplementation.address);
        });
      });

      describe("when upgraded", function() {
        beforeEach(async function() {
          await this.proxyAdmin.upgrade(
            tokenProxy.address,
            hidrImplementation.address,
            { from: deployer }
          );
          this.token = await HRC20HIDR.at(tokenProxy.address);

          await this.token.rely(ward_1, {from: deployer});
          await this.token.rely(ward_2, {from: deployer});
        });

        it("should retain the previous storage", async function() {
          (await this.token.balanceOf(account_1)).should.be.bignumber.equal(
            "10000"
          );
          (await this.token.totalSupply()).should.be.bignumber.equal("10000");
        });

        it("can redominate decimals", async function() {
          (await this.token.redenominateDecimals(3));
          
          (await this.token.decimals()).should.be.bignumber.equal(_decimals.addn(3));
        });

        it("wards can mint token", async function() {
          await this.token.mint(account_2, (new BN(100)).pow(_decimals), {from: ward_1});

          (await this.token.balanceOf(account_2)).should.be.bignumber.equal(
            "10000"
          );
          (await this.token.totalSupply()).should.be.bignumber.equal("20000");
        });

        it("wards can burn token from its account", async function() {
          await this.token.mint(ward_1, (new BN(100)).pow(_decimals), {from: ward_1});

          await this.token.methods['burn(address,uint256)'](ward_1, (new BN(100)).pow(_decimals), {from: ward_1});

          (await this.token.balanceOf(account_2)).should.be.bignumber.equal(
            "0"
          );
          (await this.token.totalSupply()).should.be.bignumber.equal("10000");
        });

        it("non-wards can't mint token", async function() {
          await shouldFail.reverting(
            this.token.mint(account_2, (new BN(100)).pow(_decimals), {from: otherAccount}),
            "HIDR/not-authorized"
          )
        });

        it("non-wards can't burn token", async function() {
          await this.token.mint(account_1, (new BN(100)).pow(_decimals), {from: ward_1});

          await shouldFail.reverting(
            this.token.methods['burn(address,uint256)'](account_1, (new BN(100)).pow(_decimals), {from: account_1}),
            "HIDR/not-authorized"
          )
        });

        it("may burnFrom without approve", async function() {
          await this.token.mint(account_1, (new BN(100)).pow(_decimals), {from: ward_1});
          await this.token.methods['burnFrom(address,uint256)'](account_1, (new BN(100)).pow(_decimals), {from: deployer});

          (await this.token.balanceOf(account_1)).should.be.bignumber.equal(
            (new BN(100)).pow(_decimals)
          );
          (await this.token.totalSupply()).should.be.bignumber.equal((new BN(100)).pow(_decimals));
        });

        it("should not reenable initialize function", async function() {
          await shouldFail.reverting(
            this.token.initialize(_name, _symbol, _currency, _decimals, {
              from: deployer
            })
          );
        });
      });
    });
  });
});
