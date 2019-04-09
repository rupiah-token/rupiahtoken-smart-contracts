const { BN, constants, expectEvent, shouldFail } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;
const TestUtils = require('./TestUtils');
const ERC20RupiahToken = artifacts.require('ERC20RupiahToken');

contract('ERC20RupiahToken', function ([deployer, initialHolder, recipient, anotherAccount]) {
  const _name = 'Rupiah Token';
  const _symbol = 'RPT';
  const _currency = 'IDR';
  const _decimals = new BN(2);
  
  const initialSupply = (new BN(100*10**_decimals));
  
  beforeEach(async function () {
    proxyAdmin = await TestUtils.createProxyAdmin();
    tokenImplementation = await TestUtils.createImplementation(ERC20RupiahToken);
    tokenProxy = await TestUtils.createProxy(tokenImplementation.address, proxyAdmin.address, []);
    
    this.token = await ERC20RupiahToken.at(tokenProxy.address);
    await TestUtils.initializeTokenProxy(this.token);
    
    await this.token.mint(initialHolder, initialSupply/(10**_decimals));
  });

  it('has a name', async function () {
    (await this.token.name()).should.be.equal(_name);
  });

  it('has a symbol', async function () {
    (await this.token.symbol()).should.be.equal(_symbol);
  });

  it('has an amount of decimals', async function () {
    (await this.token.decimals()).should.be.bignumber.equal(_decimals);
  });

  describe('total supply', function () {
    it('returns the total amount of tokens', async function () {
      (await this.token.totalSupply()).should.be.bignumber.equal(initialSupply);
    });
  });

  describe('balanceOf', function () {
    describe('when the requested account has no tokens', function () {
      it('returns zero', async function () {
        (await this.token.balanceOf(anotherAccount)).should.be.bignumber.equal('0');
      });
    });

    describe('when the requested account has some tokens', function () {
      it('returns the total amount of tokens', async function () {
        (await this.token.balanceOf(initialHolder)).should.be.bignumber.equal(initialSupply);
      });
    });
  });

  describe('transfer', function () {
    describe('when the recipient is not the zero address', function () {
      const to = recipient;

      describe('when the sender does not have enough balance', function () {
        const amount = initialSupply.addn(1);

        it('reverts', async function () {
          await shouldFail.reverting(this.token.transfer(to, amount, { from: initialHolder }));
        });
      });

      describe('when the sender has enough balance', function () {
        const amount = initialSupply;

        it('transfers the requested amount', async function () {
          await this.token.transfer(to, amount, { from: initialHolder });

          (await this.token.balanceOf(initialHolder)).should.be.bignumber.equal('0');

          (await this.token.balanceOf(to)).should.be.bignumber.equal(amount);
        });

        it('emits a transfer event', async function () {
          const { logs } = await this.token.transfer(to, amount, { from: initialHolder });

          expectEvent.inLogs(logs, 'Transfer', {
            from: initialHolder,
            to: to,
            value: amount,
          });
        });
      });
    });

    describe('when the recipient is the zero address', function () {
      const to = ZERO_ADDRESS;

      it('reverts', async function () {
        await shouldFail.reverting(this.token.transfer(to, initialSupply, { from: initialHolder }));
      });
    });
  });

  describe('transfer from', function () {
    const spender = recipient;

    describe('when the recipient is not the zero address', function () {
      const to = anotherAccount;

      describe('when the spender has enough approved balance', function () {
        beforeEach(async function () {
          await this.token.approve(spender, initialSupply, { from: initialHolder });
        });

        describe('when the initial holder has enough balance', function () {
          const amount = initialSupply;

          it('transfers the requested amount', async function () {
            await this.token.transferFrom(initialHolder, to, amount, { from: spender });

            (await this.token.balanceOf(initialHolder)).should.be.bignumber.equal('0');

            (await this.token.balanceOf(to)).should.be.bignumber.equal(amount);
          });

          it('decreases the spender allowance', async function () {
            await this.token.transferFrom(initialHolder, to, amount, { from: spender });

            (await this.token.allowance(initialHolder, spender)).should.be.bignumber.equal('0');
          });

          it('emits a transfer event', async function () {
            const { logs } = await this.token.transferFrom(initialHolder, to, amount, { from: spender });

            expectEvent.inLogs(logs, 'Transfer', {
              from: initialHolder,
              to: to,
              value: amount,
            });
          });

          it('emits an approval event', async function () {
            const { logs } = await this.token.transferFrom(initialHolder, to, amount, { from: spender });

            expectEvent.inLogs(logs, 'Approval', {
              owner: initialHolder,
              spender: spender,
              value: await this.token.allowance(initialHolder, spender),
            });
          });
        });

        describe('when the initial holder does not have enough balance', function () {
          const amount = initialSupply.addn(1);

          it('reverts', async function () {
            await shouldFail.reverting(this.token.transferFrom(initialHolder, to, amount, { from: spender }));
          });
        });
      });

      describe('when the spender does not have enough approved balance', function () {
        beforeEach(async function () {
          await this.token.approve(spender, initialSupply.subn(1), { from: initialHolder });
        });

        describe('when the initial holder has enough balance', function () {
          const amount = initialSupply;

          it('reverts', async function () {
            await shouldFail.reverting(this.token.transferFrom(initialHolder, to, amount, { from: spender }));
          });
        });

        describe('when the initial holder does not have enough balance', function () {
          const amount = initialSupply.addn(1);

          it('reverts', async function () {
            await shouldFail.reverting(this.token.transferFrom(initialHolder, to, amount, { from: spender }));
          });
        });
      });
    });

    describe('when the recipient is the zero address', function () {
      const amount = initialSupply;
      const to = ZERO_ADDRESS;

      beforeEach(async function () {
        await this.token.approve(spender, amount, { from: initialHolder });
      });

      it('reverts', async function () {
        await shouldFail.reverting(this.token.transferFrom(initialHolder, to, amount, { from: spender }));
      });
    });
  });

  describe('decrease allowance', function () {
    describe('when the spender is not the zero address', function () {
      const spender = recipient;

      function shouldDecreaseApproval (amount) {
        describe('when there was no approved amount before', function () {
          it('reverts', async function () {
            await shouldFail.reverting(this.token.decreaseAllowance(spender, amount, { from: initialHolder }));
          });
        });

        describe('when the spender had an approved amount', function () {
          const approvedAmount = amount;

          beforeEach(async function () {
            ({ logs: this.logs } = await this.token.approve(spender, approvedAmount, { from: initialHolder }));
          });

          it('emits an approval event', async function () {
            const { logs } = await this.token.decreaseAllowance(spender, approvedAmount, { from: initialHolder });

            expectEvent.inLogs(logs, 'Approval', {
              owner: initialHolder,
              spender: spender,
              value: new BN(0),
            });
          });

          it('decreases the spender allowance subtracting the requested amount', async function () {
            await this.token.decreaseAllowance(spender, approvedAmount.subn(1), { from: initialHolder });

            (await this.token.allowance(initialHolder, spender)).should.be.bignumber.equal('1');
          });

          it('sets the allowance to zero when all allowance is removed', async function () {
            await this.token.decreaseAllowance(spender, approvedAmount, { from: initialHolder });
            (await this.token.allowance(initialHolder, spender)).should.be.bignumber.equal('0');
          });

          it('reverts when more than the full allowance is removed', async function () {
            await shouldFail.reverting(
              this.token.decreaseAllowance(spender, approvedAmount.addn(1), { from: initialHolder })
            );
          });
        });
      }

      describe('when the sender has enough balance', function () {
        const amount = initialSupply;

        shouldDecreaseApproval(amount);
      });

      describe('when the sender does not have enough balance', function () {
        const amount = initialSupply.addn(1);

        shouldDecreaseApproval(amount);
      });
    });

    describe('when the spender is the zero address', function () {
      const amount = initialSupply;
      const spender = ZERO_ADDRESS;

      it('reverts', async function () {
        await shouldFail.reverting(this.token.decreaseAllowance(spender, amount, { from: initialHolder }));
      });
    });
  });

  describe('increase allowance', function () {
    const amount = initialSupply;

    describe('when the spender is not the zero address', function () {
      const spender = recipient;

      describe('when the sender has enough balance', function () {
        it('emits an approval event', async function () {
          const { logs } = await this.token.increaseAllowance(spender, amount, { from: initialHolder });

          expectEvent.inLogs(logs, 'Approval', {
            owner: initialHolder,
            spender: spender,
            value: amount,
          });
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await this.token.increaseAllowance(spender, amount, { from: initialHolder });

            (await this.token.allowance(initialHolder, spender)).should.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, new BN(1), { from: initialHolder });
          });

          it('increases the spender allowance adding the requested amount', async function () {
            await this.token.increaseAllowance(spender, amount, { from: initialHolder });

            (await this.token.allowance(initialHolder, spender)).should.be.bignumber.equal(amount.addn(1));
          });
        });
      });

      describe('when the sender does not have enough balance', function () {
        const amount = initialSupply.addn(1);

        it('emits an approval event', async function () {
          const { logs } = await this.token.increaseAllowance(spender, amount, { from: initialHolder });

          expectEvent.inLogs(logs, 'Approval', {
            owner: initialHolder,
            spender: spender,
            value: amount,
          });
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await this.token.increaseAllowance(spender, amount, { from: initialHolder });

            (await this.token.allowance(initialHolder, spender)).should.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, new BN(1), { from: initialHolder });
          });

          it('increases the spender allowance adding the requested amount', async function () {
            await this.token.increaseAllowance(spender, amount, { from: initialHolder });

            (await this.token.allowance(initialHolder, spender)).should.be.bignumber.equal(amount.addn(1));
          });
        });
      });
    });

    describe('when the spender is the zero address', function () {
      const spender = ZERO_ADDRESS;

      it('reverts', async function () {
        await shouldFail.reverting(this.token.increaseAllowance(spender, amount, { from: initialHolder }));
      });
    });
  });

  describe('mint', function () {
    const amount = new BN(50*10**_decimals);

    it('rejects a null account', async function () {
      await shouldFail.reverting(this.token.mint(ZERO_ADDRESS, amount/(10**_decimals)));
    });

    describe('for a non null account', function () {
      beforeEach('minting', async function () {
        const { logs } = await this.token.mint(recipient, amount/(10**_decimals));
        this.logs = logs;
      });

      it('increments totalSupply', async function () {
        const expectedSupply = initialSupply.add(amount);
        (await this.token.totalSupply()).should.be.bignumber.equal(expectedSupply);
      });

      it('increments recipient balance', async function () {
        (await this.token.balanceOf(recipient)).should.be.bignumber.equal(amount);
      });

      it('emits Transfer event', async function () {
        const event = expectEvent.inLogs(this.logs, 'Transfer', {
          from: ZERO_ADDRESS,
          to: recipient,
        });

        event.args.value.should.be.bignumber.equal(amount);
      });
    });
  });

  describe('burn', function () {
    describe('for a non null account', function () {
      it('rejects burning more than balance', async function () {
        await this.token.transfer(deployer, initialSupply, {from : initialHolder});
        await shouldFail.reverting(this.token.burn(initialSupply.addn(1)));
      });

      const describeBurn = function (description, amount) {
        describe(description, function () {
          beforeEach('send to contract owner, then burn', async function () {
	    await this.token.transfer(deployer, amount, {from : initialHolder});
            const { logs } = await this.token.burn(amount/(10**_decimals));
            this.logs = logs;
          });

          it('decrements totalSupply', async function () {
            const expectedSupply = initialSupply.sub(amount);
            (await this.token.totalSupply()).should.be.bignumber.equal(expectedSupply);
          });

          it('decrements initialHolder balance', async function () {
            const expectedBalance = initialSupply.sub(amount);
            (await this.token.balanceOf(initialHolder)).should.be.bignumber.equal(expectedBalance);
          });

          it('emits Transfer event', async function () {
            const event = expectEvent.inLogs(this.logs, 'Transfer', {
              from: deployer,
              to: ZERO_ADDRESS,
            });

            event.args.value.should.be.bignumber.equal(amount);
          });
        });
      };

      describeBurn('for entire balance', initialSupply);
      describeBurn('for less amount than balance', initialSupply.subn(1*10**_decimals));
    });
  });

  describe('burnFrom', function () {
    const allowance = new BN(70*10**_decimals);

    const spender = anotherAccount;

    beforeEach('approving', async function () {
      await this.token.approve(deployer, allowance, { from: initialHolder });
    });

    it('rejects a null account', async function () {
      await shouldFail.reverting(this.token.burnFrom(ZERO_ADDRESS, new BN(1)));
    });

    describe('for a non null account', function () {
      it('rejects burning more than allowance', async function () {
        await shouldFail.reverting(this.token.burnFrom(initialHolder, allowance.addn(100)/10**_decimals));
      });

      it('rejects burning more than balance', async function () {
        await shouldFail.reverting(this.token.burnFrom(initialHolder, initialSupply.addn(100)/10**_decimals));
      });

      const describeBurnFrom = function (description, amount) {
        describe(description, function () {
          beforeEach('let admin to burn from initialHolder', async function () {
            const { logs } = await this.token.burnFrom(initialHolder, amount/10**_decimals, { from: deployer });
            this.logs = logs;
          });

          it('decrements totalSupply', async function () {
            const expectedSupply = initialSupply.sub(amount);
            (await this.token.totalSupply()).should.be.bignumber.equal(expectedSupply);
          });

          it('decrements initialHolder balance', async function () {
            const expectedBalance = initialSupply.sub(amount);
            (await this.token.balanceOf(initialHolder)).should.be.bignumber.equal(expectedBalance);
          });

          it('decrements spender allowance', async function () {
            const expectedAllowance = allowance.sub(amount);
            (await this.token.allowance(initialHolder, deployer)).should.be.bignumber.equal(expectedAllowance);
          });

          it('emits a Transfer event', async function () {
            const event = expectEvent.inLogs(this.logs, 'Transfer', {
              from: initialHolder,
              to: ZERO_ADDRESS,
            });

            event.args.value.should.be.bignumber.equal(amount);
          });

          it('emits an Approval event', async function () {
            expectEvent.inLogs(this.logs, 'Approval', {
              owner: initialHolder,
              spender: deployer,
              value: await this.token.allowance(initialHolder, deployer),
            });
          });
        });
      };

      describeBurnFrom('for entire allowance', allowance);
      describeBurnFrom('for less amount than allowance', allowance.subn(100));
    });
  });

  describe('approve', function () {
    testApprove(initialHolder, recipient, initialSupply, function (owner, spender, amount) {
      return this.token.approve(spender, amount, { from: owner });
    });
  });

  function testApprove (owner, spender, supply, approve) {
    describe('when the spender is not the zero address', function () {
      describe('when the sender has enough balance', function () {
        const amount = supply;

        it('emits an approval event', async function () {
          const { logs } = await approve.call(this, owner, spender, amount);

          expectEvent.inLogs(logs, 'Approval', {
            owner: owner,
            spender: spender,
            value: amount,
          });
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await approve.call(this, owner, spender, amount);

            (await this.token.allowance(owner, spender)).should.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await approve.call(this, owner, spender, new BN(1));
          });

          it('approves the requested amount and replaces the previous one', async function () {
            await approve.call(this, owner, spender, amount);

            (await this.token.allowance(owner, spender)).should.be.bignumber.equal(amount);
          });
        });
      });

      describe('when the sender does not have enough balance', function () {
        const amount = supply.addn(1);

        it('emits an approval event', async function () {
          const { logs } = await approve.call(this, owner, spender, amount);

          expectEvent.inLogs(logs, 'Approval', {
            owner: owner,
            spender: spender,
            value: amount,
          });
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await approve.call(this, owner, spender, amount);

            (await this.token.allowance(owner, spender)).should.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await approve.call(this, owner, spender, new BN(1));
          });

          it('approves the requested amount and replaces the previous one', async function () {
            await approve.call(this, owner, spender, amount);

            (await this.token.allowance(owner, spender)).should.be.bignumber.equal(amount);
          });
        });
      });
    });

    describe('when the spender is the zero address', function () {
      it('reverts', async function () {
        await shouldFail.reverting(approve.call(this, owner, ZERO_ADDRESS, supply));
      });
    });
  }
});
