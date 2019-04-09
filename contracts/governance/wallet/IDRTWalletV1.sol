/**
 * Rupiah Token Smart Contract
 * Copyright (C) 2019 PT. Rupiah Token Indonesia <https://www.rupiahtoken.com/>. 
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * 
 * This file incorporates work covered by the following copyright and
 * permission notice:
 *
 *     Ethereum Multisignature Wallet <https://github.com/gnosis/MultiSigWallet>     
 *     Copyright (c) 2016 Gnosis Ltd.
 *     Modified for Rupiah Token by FengkieJ 2019.
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU Lesser General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU Lesser General Public License for more details.
 *
 *     You should have received a copy of the GNU Lesser General Public License
 *     along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *--------------------------------------------------------------------------------------------
 *     ZeppelinOS (zos) <https://github.com/zeppelinos/zos>
 *     Copyright (c) 2018 ZeppelinOS Global Limited.
 *
 *     The MIT License (MIT)
 *
 *     Permission is hereby granted, free of charge, to any person obtaining a copy 
 *     of this software and associated documentation files (the "Software"), to deal 
 *     in the Software without restriction, including without limitation the rights 
 *     to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
 *     copies of the Software, and to permit persons to whom the Software is furnished to 
 *     do so, subject to the following conditions:
 *
 *     The above copyright notice and this permission notice shall be included in all 
 *     copies or substantial portions of the Software.
 *
 *     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *     IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *     AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 *     WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN 
 *     CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
pragma solidity 0.4.25;

import "./MultiSigWallet.sol";

contract IDRTWallet is MultiSigWallet {
    uint256 internal _printLimit;
    mapping (uint => bool) internal _requireFinalization;
    address internal _superOwner; 

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    
    event PrintLimitChanged(
        uint256 indexed oldValue,
        uint256 indexed newValue
    );
    
    event RequireFinalization(uint indexed transactionId);

    event Finalized(uint indexed transactionId);

    /**
     * @dev Throws if called by any account other than _superOwner.
     */
    modifier onlySuperOwner() {
        require(msg.sender == _superOwner);
        _;
    }
    
    /**
     * @dev Initialize the smart contract to work with ZeppelinOS, can only be called once.
     * @param admins list of the multisig contract admins.
     * @param required number of required confirmations to execute a transaction.
     * @param printLimit maximum amount of minting limit before _superOwner need to finalize.
     */
    function initialize(address[] admins, uint256 required, uint256 printLimit) public initializer {
        MultiSigWallet.initialize(admins, required);
        _superOwner = msg.sender;
        _printLimit = printLimit;
    }

    /**
     * @dev Get the function signature from call data.
     * @param data the call data in bytes.
     * @return function signature in bytes4.
     */
    function getFunctionSignature(bytes memory data) internal pure returns (bytes4 out) {
        assembly {
            out := mload(add(data, 0x20))
        }
    }

    /**
     * @dev Get the value to mint from call data.
     * @param data the call data in bytes.
     * @return value to mint in uint256.
     */
    function getValueToMint(bytes memory data) internal pure returns (uint256 value) {
        bytes32 x;
        assembly {
            x := mload(add(data, 0x44))
        }
        value = uint256(x);
    }
    
    /**
     * @dev Allows an owner to submit and confirm a transaction.
     * @param destination Transaction target address.
     * @param value Transaction ether value.
     * @param data Transaction data payload.
     * @return the transaction ID.
     */
    function submitTransaction(address destination, uint value, bytes data)
        public
        returns (uint transactionId)
    {
        transactionId = addTransaction(destination, value, data);
        bytes4 functionSignature = getFunctionSignature(data);
	if(
            (functionSignature == 0x99a88ec4) || //ZeppelinOS ProxyAdmin.sol's upgrade function
            (functionSignature == 0x9623609d) || //ZeppelinOS ProxyAdmin.sol's upgradeAndCall function
            (functionSignature == 0xe20056e6) || //MultiSigWallet.sol's replaceOwner function
            (functionSignature == 0x7065cb48) || //MultiSigWallet.sol's addOwner function
            (functionSignature == 0x173825d9) || //MultiSigWallet.sol's removeOwner function
            (functionSignature == 0x715018a6) || //ERC20 Ownable's renounceOwnership function
            (functionSignature == 0xf2fde38b) || //ERC20 Ownable's transferOwnership function
            ((functionSignature == 0x40c10f19) && (getValueToMint(data) > _printLimit)) //Calls mint function and value exceeds _printLimit  
        ) {
            _requireFinalization[transactionId] = true;
            emit RequireFinalization(transactionId);
        }
        confirmTransaction(transactionId);
    }
    
    /**
     * @dev Allows anyone to execute a confirmed transaction.
     * @param transactionId Transaction ID.
     */
    function executeTransaction(uint transactionId)
        public
        ownerExists(msg.sender)
        confirmed(transactionId, msg.sender)
        notExecuted(transactionId)
    {
        if(!_requireFinalization[transactionId]) {
            super.executeTransaction(transactionId);
        } else {
            emit RequireFinalization(transactionId);
        }
    }

    /** 
     * @dev Finalize tx by _superOwner.
     * @param transactionId Transaction ID.
     */
    function finalizeTransaction(uint transactionId)
        public
        onlySuperOwner()
        notExecuted(transactionId)
    {
        require(_requireFinalization[transactionId]);
	    require(isConfirmed(transactionId));

        Transaction storage txn = transactions[transactionId];
        txn.executed = true;
        if (external_call(txn.destination, txn.value, txn.data.length, txn.data)) {
            emit Execution(transactionId);
            emit Finalized(transactionId);
        } else {
            emit ExecutionFailure(transactionId);
            txn.executed = false;
        }
    }
    
    /**
     * @dev Set new printLimit before _superOwner need to finalize.
     * @param newLimit of print limit amount.
     */
    function setPrintLimit(uint256 newLimit)
        public
        onlySuperOwner()
    {
        emit PrintLimitChanged(_printLimit, newLimit);
        _printLimit = newLimit;
    }

    /**
     * @dev Set new _superOwner address.
     * @param newAddress new address for _superOwner
     */
    function transferOwnership(address newAddress)
        public
        onlySuperOwner()
    {
        require(newAddress != address(0));

        _superOwner = newAddress;
        emit OwnershipTransferred(msg.sender, newAddress);
    }	

    /**
     * @dev Get current _superOwner address.
     */
    function superOwner()
        public view
        returns (address)
    {
        return _superOwner;
    }   


    /**
     * @dev Get whether a transaction require finalization or not.
     */
    function requireFinalization(uint transactionId)
        public view
        returns (bool)
    {
        return _requireFinalization[transactionId];
    }  
}
