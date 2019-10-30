const {
  BN,
  constants,
  expectEvent,
  shouldFail
} = require("openzeppelin-test-helpers");
const { ZERO_ADDRESS } = constants;
const TestUtils = require("./TestUtils");
const ERC20RupiahToken = artifacts.require("ERC20RupiahToken");
const { feeCollector } = require('./test_config');

contract("ERC20RupiahToken Blacklistable", function([
  owner,
  account_1,
  account_2,
  anotherAccount,
  ...otherAccounts
]) {
  const _name = "Rupiah Token";
  const _symbol = "IDRT";
  const _currency = "IDR";
  const _decimals = new BN(2);
  const ratio = feeCollector.feeRatioNumerator / feeCollector.feeRatioDenominator;

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

    this.token = await ERC20RupiahToken.at(tokenProxy.address);
    await TestUtils.initializeTokenProxy(this.token);
    this.feeCollector = await TestUtils.createFeeCollector(tokenProxy.address, owner);
    await this.token.setCollectorContract(this.feeCollector.address);

    await this.token.mint(account_1, 100);
    await this.token.mint(account_2, 100);
  });

  describe("blacklist", function() {
    describe("when the account is not blacklisted", function() {
      describe("when the sender is token owner", function() {
        it("blacklists the account", async function() {
          (await this.token.isBlacklisted(account_1)).should.equal(false);
          await this.token.blacklist(account_1, { from: owner });
          (await this.token.isBlacklisted(account_1)).should.equal(true);
        });

        it("emits a Blacklist event", async function() {
          (await this.token.isBlacklisted(account_1)).should.equal(false);
          const { logs } = await this.token.blacklist(account_1, {
            from: owner
          });
          expectEvent.inLogs(logs, "Blacklisted");
        });
      });

      describe("when the sender is not token owner", function() {
        it("reverts", async function() {
          await shouldFail.reverting(
            this.token.blacklist(account_1, { from: anotherAccount })
          );
        });
      });
    });
  });

  describe("unblacklist", function() {
    describe("when the account is blacklisted", function() {
      beforeEach(async function() {
        await this.token.blacklist(account_1, { from: owner });
      });

      describe("when the sender is token owner", function() {
        it("blacklists the account", async function() {
          (await this.token.isBlacklisted(account_1)).should.equal(true);
          await this.token.unblacklist(account_1, { from: owner });
          (await this.token.isBlacklisted(account_1)).should.equal(false);
        });

        it("emits a Blacklist event", async function() {
          (await this.token.isBlacklisted(account_1)).should.equal(true);
          const { logs } = await this.token.unblacklist(account_1, {
            from: owner
          });
          expectEvent.inLogs(logs, "Unblacklisted");
        });
      });

      describe("when the sender is not token owner", function() {
        it("reverts", async function() {
          await shouldFail.reverting(
            this.token.unblacklist(account_1, { from: anotherAccount })
          );
        });
      });
    });
  });

  describe("transfer", function() {
    describe("when an account is blacklisted", function() {
      beforeEach(async function() {
        await this.token.blacklist(account_1, { from: owner });
      });

      describe("the account is sender", function() {
        it("reverts", async function() {
          await shouldFail.reverting(
            this.token.transfer(account_2, 100, { from: account_1 })
          );
        });
      });

      describe("the account is receiver", function() {
        it("reverts", async function() {
          await shouldFail.reverting(
            this.token.transfer(account_1, 100, { from: account_2 })
          );
        });
      });
    });

    describe("when both accounts are blacklisted", function() {
      beforeEach(async function() {
        await this.token.blacklist(account_1, { from: owner });
        await this.token.blacklist(account_2, { from: owner });
      });

      it("reverts", async function() {
        await shouldFail.reverting(
          this.token.transfer(account_2, 100, { from: account_1 })
        );
      });

      it("reverts", async function() {
        await shouldFail.reverting(
          this.token.transfer(account_1, 100, { from: account_2 })
        );
      });
    });

    describe("allow transfer when blacklisted then unblacklisted", function() {
      const sending = 5000;
      const fee = parseInt(sending * ratio);

      beforeEach(async function() {
        await this.token.blacklist(account_1, { from: owner });
      });

      describe("the account is sender", function() {
        it("allows transfer", async function() {
          await this.token.unblacklist(account_1, { from: owner });
          const balance = await this.token.balanceOf(account_2);
          await this.token.transfer(account_2, sending, { from: account_1 });

          (await this.token.balanceOf(account_1)).should.be.bignumber.equal(
            (sending - fee).toString()
          );
          (await this.token.balanceOf(account_2)).should.be.bignumber.equal(
            balance.add(new BN(sending))
          );
        });
      });

      describe("the account is receiver", function() {
        it("allows receive", async function() {
          await this.token.unblacklist(account_1, { from: owner });
          const balance = await this.token.balanceOf(account_1);
          await this.token.transfer(account_1, sending, { from: account_2 });

          (await this.token.balanceOf(account_2)).should.be.bignumber.equal(
            (sending - fee).toString()
          );
          (await this.token.balanceOf(account_1)).should.be.bignumber.equal(
            balance.add(new BN(sending))
          );
        });
      });
    });
  });

  describe("approve", function() {
    describe("when an account is blacklisted", function() {
      beforeEach(async function() {
        await this.token.blacklist(account_1, { from: owner });
      });

      describe("the account is spender", function() {
        it("reverts", async function() {
          await shouldFail.reverting(
            this.token.approve(account_1, 100, { from: account_2 })
          );
        });
      });

      describe("the account is holder", function() {
        it("reverts", async function() {
          await shouldFail.reverting(
            this.token.approve(account_2, 100, { from: account_1 })
          );
        });
      });
    });

    describe("when both accounts are blacklisted", function() {
      beforeEach(async function() {
        await this.token.blacklist(account_1, { from: owner });
        await this.token.blacklist(account_2, { from: owner });
      });

      it("reverts", async function() {
        await shouldFail.reverting(
          this.token.approve(account_2, 100, { from: account_1 })
        );
      });

      it("reverts", async function() {
        await shouldFail.reverting(
          this.token.approve(account_1, 100, { from: account_2 })
        );
      });
    });

    describe("allow approve when blacklisted then unblacklisted", function() {
      beforeEach(async function() {
        await this.token.blacklist(account_1, { from: owner });
      });

      describe("the account is spender", function() {
        it("allows tx", async function() {
          await this.token.unblacklist(account_1, { from: owner });
          await this.token.approve(account_1, 10, { from: account_2 });

          (await this.token.allowance(
            account_2,
            account_1
          )).should.be.bignumber.equal("10");
        });
      });

      describe("the account is holder", function() {
        it("allows tx", async function() {
          await this.token.unblacklist(account_1, { from: owner });
          await this.token.approve(account_2, 10, { from: account_1 });

          (await this.token.allowance(
            account_1,
            account_2
          )).should.be.bignumber.equal("10");
        });
      });
    });
  });

  describe("decrease allowance", function() {
    beforeEach(async function() {
      await this.token.approve(account_1, 100, { from: account_2 });
      await this.token.approve(account_2, 100, { from: account_1 });
      await this.token.blacklist(account_1, { from: owner });
    });

    describe("when an account is blacklisted", function() {
      describe("the account is spender", function() {
        it("reverts", async function() {
          await shouldFail.reverting(
            this.token.decreaseAllowance(account_1, 10, { from: account_2 })
          );
        });
      });

      describe("the account is holder", function() {
        it("reverts", async function() {
          await shouldFail.reverting(
            this.token.decreaseAllowance(account_2, 10, { from: account_1 })
          );
        });
      });
    });

    describe("when both accounts are blacklisted", function() {
      beforeEach(async function() {
        await this.token.blacklist(account_1, { from: owner });
        await this.token.blacklist(account_2, { from: owner });
      });

      it("reverts", async function() {
        await shouldFail.reverting(
          this.token.decreaseAllowance(account_2, 10, { from: account_1 })
        );
      });

      it("reverts", async function() {
        await shouldFail.reverting(
          this.token.decreaseAllowance(account_1, 10, { from: account_2 })
        );
      });
    });

    describe("allow when blacklisted then unblacklisted", function() {
      describe("the account is spender", function() {
        it("allows tx", async function() {
          await this.token.unblacklist(account_1, { from: owner });
          await this.token.decreaseAllowance(account_1, 10, {
            from: account_2
          });

          (await this.token.allowance(
            account_2,
            account_1
          )).should.be.bignumber.equal("90");
        });
      });

      describe("the account is holder", function() {
        it("allows tx", async function() {
          await this.token.unblacklist(account_1, { from: owner });
          await this.token.decreaseAllowance(account_2, 10, {
            from: account_1
          });

          (await this.token.allowance(
            account_1,
            account_2
          )).should.be.bignumber.equal("90");
        });
      });
    });
  });

  describe("increase allowance", function() {
    beforeEach(async function() {
      await this.token.approve(account_1, 100, { from: account_2 });
      await this.token.approve(account_2, 100, { from: account_1 });
      await this.token.blacklist(account_1, { from: owner });
    });

    describe("when an account is blacklisted", function() {
      describe("the account is spender", function() {
        it("reverts", async function() {
          await shouldFail.reverting(
            this.token.increaseAllowance(account_1, 10, { from: account_2 })
          );
        });
      });

      describe("the account is holder", function() {
        it("reverts", async function() {
          await shouldFail.reverting(
            this.token.increaseAllowance(account_2, 10, { from: account_1 })
          );
        });
      });
    });

    describe("when both accounts are blacklisted", function() {
      beforeEach(async function() {
        await this.token.blacklist(account_1, { from: owner });
        await this.token.blacklist(account_2, { from: owner });
      });

      it("reverts", async function() {
        await shouldFail.reverting(
          this.token.increaseAllowance(account_2, 10, { from: account_1 })
        );
      });

      it("reverts", async function() {
        await shouldFail.reverting(
          this.token.increaseAllowance(account_1, 10, { from: account_2 })
        );
      });
    });

    describe("allow when blacklisted then unblacklisted", function() {
      describe("the account is spender", function() {
        it("allows tx", async function() {
          await this.token.unblacklist(account_1, { from: owner });
          await this.token.increaseAllowance(account_1, 10, {
            from: account_2
          });

          (await this.token.allowance(
            account_2,
            account_1
          )).should.be.bignumber.equal("110");
        });
      });

      describe("the account is holder", function() {
        it("allows tx", async function() {
          await this.token.unblacklist(account_1, { from: owner });
          await this.token.increaseAllowance(account_2, 10, {
            from: account_1
          });

          (await this.token.allowance(
            account_1,
            account_2
          )).should.be.bignumber.equal("110");
        });
      });
    });
  });

  describe("transfer from", function() {
    beforeEach(async function() {
      await this.token.approve(account_1, 100, { from: account_2 });
      await this.token.approve(account_2, 100, { from: account_1 });
      await this.token.blacklist(account_1, { from: owner });
    });

    describe("when an account is blacklisted", function() {
      describe("the account is spender", function() {
        it("reverts", async function() {
          await shouldFail.reverting(
            this.token.transferFrom(account_2, anotherAccount, 10, {
              from: account_1
            })
          );
        });
      });

      describe("the account is holder", function() {
        it("reverts", async function() {
          await shouldFail.reverting(
            this.token.transferFrom(account_1, anotherAccount, 10, {
              from: account_2
            })
          );
        });
      });
    });

    describe("when both accounts are blacklisted", function() {
      beforeEach(async function() {
        await this.token.blacklist(account_1, { from: owner });
        await this.token.blacklist(account_2, { from: owner });
      });

      it("reverts", async function() {
        await shouldFail.reverting(
          this.token.transferFrom(account_1, anotherAccount, 10, {
            from: account_2
          })
        );
      });

      it("reverts", async function() {
        await shouldFail.reverting(
          this.token.transferFrom(account_2, anotherAccount, 10, {
            from: account_1
          })
        );
      });
    });

    describe("allow when blacklisted then unblacklisted", function() {
      describe("the account is spender", function() {
        it("allows tx", async function() {
          await this.token.unblacklist(account_1, { from: owner });
          await this.token.transferFrom(account_2, anotherAccount, 10, {
            from: account_1
          });

          (await this.token.balanceOf(account_2)).should.be.bignumber.equal(
            "9990"
          );
          (await this.token.balanceOf(
            anotherAccount
          )).should.be.bignumber.equal("10");
        });
      });

      describe("the account is holder", function() {
        it("allows tx", async function() {
          await this.token.unblacklist(account_1, { from: owner });
          await this.token.transferFrom(account_1, anotherAccount, 10, {
            from: account_2
          });

          (await this.token.balanceOf(account_1)).should.be.bignumber.equal(
            "9990"
          );
          (await this.token.balanceOf(
            anotherAccount
          )).should.be.bignumber.equal("10");
        });
      });
    });
  });

  describe("mint", function() {
    beforeEach(async function() {
      await this.token.blacklist(account_1, { from: owner });
    });

    describe("when an account is blacklisted", function() {
      describe("the owner mints to the account", function() {
        it("reverts", async function() {
          await shouldFail.reverting(
            this.token.mint(account_1, 100, { from: owner })
          );
        });
      });
    });

    describe("allow when blacklisted then unblacklisted", function() {
      describe("the owner mints to the account", function() {
        it("allows tx", async function() {
          await this.token.unblacklist(account_1, { from: owner });
          await this.token.mint(account_1, 100, { from: owner });

          (await this.token.balanceOf(account_1)).should.be.bignumber.equal(
            "20000"
          );
        });
      });
    });
  });

  describe("burn from", function() {
    beforeEach(async function() {
      await this.token.approve(owner, 1000, { from: account_1 });
      await this.token.blacklist(account_1, { from: owner });
    });

    describe("when an account is blacklisted", function() {
      describe("the owner burn from the account", function() {
        it("reverts", async function() {
          await shouldFail.reverting(
            this.token.burnFrom(account_1, 10, { from: owner })
          );
        });
      });
    });

    describe("allow when blacklisted then unblacklisted", function() {
      describe("the owner burn from the account", function() {
        it("allows tx", async function() {
          await this.token.unblacklist(account_1, { from: owner });
          await this.token.burnFrom(account_1, 10, { from: owner });

          (await this.token.balanceOf(account_1)).should.be.bignumber.equal(
            "9000"
          );
        });
      });
    });
  });
});
