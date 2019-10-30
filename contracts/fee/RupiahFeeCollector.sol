pragma solidity 0.4.25;

import "../math/SafeMath.sol";
import "./IFeeCollector.sol";
import "../ownership/Ownable.sol";
import "../token/ERC20RupiahTokenV1.sol";
import "../lifecycle/Pausable.sol";

contract RupiahFeeCollector is IFeeCollector, Pausable {
    using SafeMath for uint256;

    event DistributeFee(address indexed _collector, uint256 _value);
    event Withdraw(address indexed _from, uint256 value);

    // Token Fee Numerator and Denominator, 토큰 수수료 문자와 분모
    uint256 _feeRatioNumeratorFromToken;
    uint256 _feeRatioDenominatorFromToken;

    // the list consists of fee collector, 수수료 가져갈 목록
    address[] _feeCollectors;
    // 각각이 가져가는 수수료 비율
    mapping(address => uint256) _feeRatio;
    mapping(address => uint256) _deposit;
    // sum of ratio which collectors have.  각각 가져갈 수수료율을 계산하기 위해서 나눠줄 분모 (소수점이 안되니깐)
    uint256 _feeDenominatorInCollectors;

    // whitelist
    mapping(address => bool) _fromWhitelist;
    mapping(address => bool) _toWhitelist;

    uint8 SENDER = 0;
    uint8 RECEIVER = 1;

    ERC20RupiahToken rupiahToken;

    modifier onlyCollectors () {
        require(isCollector());
        _;
    }

    function isCollector() public view returns (bool) {
        return _feeRatio[msg.sender] > 0;
    }

    modifier onlyRupiahToken () {
        require(isRupiahToken());
        _;
    }

    function isRupiahToken() public view returns (bool) {
        return msg.sender == address(rupiahToken);
    }

    /**
      address[] _initFromWhitelistEntries `from` whitelist. `from` 화이트리스트 주소 목록
      address[] _initToWhitelistEntries `to` whitelist. `to` 화이트리스트 주소 목록
      address[] _initFeeCollectorEntries account list of fee collectors. keeping in mind that _initFeeCollectorEntries must have same indies with _initFeeRatioInCollectorsEntries. FeeCollector의 주소 목록  !! 아래 비율과 순서가 맞아야 함 !!
      uint256[] _initFeeRatioInCollectorsEntries fee ratio list, each collector have. 각 FeeCollecor 간 fee 비율 ex 10, 20, 30
      address _initIDRTContractAddress Contract Address of RupiahToken. RupiahToken 컨트랙트 주소
      uint256 _initFeeRatioNumerator numerator of total fee ratio. 전체 수수료 비율의 분자   예) 1.5%를 구현하고 싶으면 => 15
      uint256 _initFeeRatioDenominator denominator of total fee ratio. 전체 수수료 비율의 분모 예) 1.5%를 구현하고 싶으면 => 1000
    */
    constructor(address[] _initFromWhitelistEntries, address[] _initToWhitelistEntries,
        address[] _initFeeCollectorEntries, uint256[] _initFeeRatioInCollectorsEntries,
        address _initIDRTContractAddress, uint256 _initFeeRatioNumerator, uint256 _initFeeRatioDenominator) public {
        require(_initFeeRatioDenominator >= _initFeeRatioNumerator, "Denominator must be bigger than numerator");

        _addWhitelistBulk(_initFromWhitelistEntries, SENDER);
        _addWhitelistBulk(_initToWhitelistEntries, RECEIVER);

        _initMapRatioWithCollector(_initFeeCollectorEntries, _initFeeRatioInCollectorsEntries);

        rupiahToken = ERC20RupiahToken(_initIDRTContractAddress);

        _feeRatioNumeratorFromToken = _initFeeRatioNumerator;
        _feeRatioDenominatorFromToken = _initFeeRatioDenominator;

    }

    function _initMapRatioWithCollector(address[]  _initFeeCollectorEntries, uint256[]  _initFeeRatioEntries) private {
        require(_initFeeCollectorEntries.length == _initFeeRatioEntries.length);
        uint256 sum = 0;

        _feeCollectors = _initFeeCollectorEntries;

        for (uint16 i = 0; i < _initFeeRatioEntries.length; i++) {
            uint256 ratio = _initFeeRatioEntries[i];
            address addr = _initFeeCollectorEntries[i];
            _feeRatio[addr] = ratio;
            sum = sum.add(ratio);
        }

        _feeDenominatorInCollectors = sum;
    }
    function calcFee(address _from, address _to, uint256 _value) public onlyRupiahToken whenNotPaused returns (uint256) {
        if (isWhitelist(_from, SENDER) || isWhitelist(_to, RECEIVER) || _from == address(this)) {
            return 0;
        }
        return _calcFee(_value); // return calculated Fee 최종 수수료 리턴
    }

    function _calcFee(uint256 _value) private returns (uint256){
        uint256 fee = _value.mul(_feeRatioNumeratorFromToken).div(_feeRatioDenominatorFromToken);
        uint256 sum = fee;
        for (uint256 i = 0; i < _feeCollectors.length; i++) {
            address collector = _feeCollectors[i];
            uint256 feeRatio = _feeRatio[collector];
            uint256 f = fee.mul(feeRatio).div(_feeDenominatorInCollectors);

            if (i == _feeCollectors.length - 1){
                f = sum;
            }
            else {
                sum = sum.sub(f);
            }

            _deposit[collector] = _deposit[collector].add(f);
            emit DistributeFee(collector, f);
        }

        return fee;
    }

    function withdraw() external whenNotPaused onlyCollectors returns (uint256) {
        return _withdraw(msg.sender);
    }

    function withdrawAll() external whenNotPaused onlyOwner returns (uint256) {
        uint256 sum = 0;
        for (uint16 i = 0; i < _feeCollectors.length; i++) {
            sum = sum.add(_withdraw(_feeCollectors[i]));
        }
        // 수수료 다 전달
        return sum;
    }

    function _withdraw(address _to) private returns (uint256){
        uint256 balance = _deposit[_to];

        rupiahToken.transfer(_to, balance);
        _deposit[_to] = 0;

        emit Withdraw(_to, balance);
        return balance;
    }
    function isWhitelist(address addr, uint8 whitelistType)  public whenNotPaused view returns (bool) {
        require(whitelistType == SENDER|| whitelistType == RECEIVER);

        if (whitelistType == SENDER) {
            return _fromWhitelist[addr];
        }
        else if(whitelistType == RECEIVER) {
            return _toWhitelist[addr];
        }
        return false;
    }

    function addWhitelist(address addr, uint8 whitelistType) external whenNotPaused onlyOwner returns (bool) {
        return _addWhitelist(addr, whitelistType);
    }

    function _addWhitelist(address addr, uint8 whitelistType) private whenNotPaused onlyOwner returns (bool) {
        require(whitelistType == SENDER || whitelistType == RECEIVER);
        require(isWhitelist(addr, whitelistType) == false);

         if (whitelistType == SENDER) {
             _fromWhitelist[addr] = true;
         }
        else if(whitelistType == RECEIVER) {
             _toWhitelist[addr] = true;
         }
        else {
             return false;
         }

        return true;
    }

    function addWhitelistBulk(address[] addrEntries, uint8 whitelistType) external whenNotPaused onlyOwner returns (bool) {
        require(whitelistType == SENDER || whitelistType == RECEIVER);

        return _addWhitelistBulk(addrEntries, whitelistType);
    }

    function _addWhitelistBulk(address[] addrEntries, uint8 whitelistType) private onlyOwner returns (bool) {
        require(whitelistType == SENDER || whitelistType == RECEIVER);

        for (uint16 i = 0; i < addrEntries.length; i++) {
            address addr = addrEntries[i];
            if (addr == address(0)){
                revert();
            }
            _addWhitelist(addr, whitelistType);
        }
        return true;
    }
    function deleteWhitelist(address addr, uint8 whitelistType) external whenNotPaused onlyOwner returns (bool) {
        require(whitelistType == SENDER || whitelistType == RECEIVER);
        return _deleteWhitelist(addr, whitelistType);
    }

    function _deleteWhitelist(address addr, uint8 whitelistType) private returns (bool) {
        require(whitelistType == SENDER || whitelistType == RECEIVER);
        require(isWhitelist(addr, whitelistType) == true);

        if (whitelistType == RECEIVER) {
            _toWhitelist[addr] = false;
        }
        else {
            _fromWhitelist[addr] = false;
        }

        return true;
    }

    function deleteWhitelistBulk(address[] addrEntries, uint8 whitelistType) external whenNotPaused onlyOwner returns (bool) {
        require(whitelistType == SENDER || whitelistType == RECEIVER);

        for (uint16 i = 0; i < addrEntries.length; i++) {
            address addr = addrEntries[i];
            if (addr == address(0)){
                revert();
            }
            _deleteWhitelist(addr, whitelistType);
        }
        return true;
    }

    function addFeeWithCollector(address addr, uint256 fee)  external whenNotPaused onlyOwner returns (bool) {
        return _addFeeWithCollector(addr, fee);
    }
    function _addFeeWithCollector(address addr, uint256 fee) private returns (bool) {
        require(addr != address(0));
        require(fee > 0);
        require(_feeRatio[addr] == 0, "already added account");

        _feeCollectors.push(addr);
        _feeRatio[addr] = fee;
        _feeDenominatorInCollectors = _feeDenominatorInCollectors.add(fee);

        return true;
    }
    function deleteFeeWithCollector(address addr) external whenNotPaused onlyOwner returns (bool){
        return _deleteFeeWithCollector(addr);
    }
    function _deleteFeeWithCollector(address addr) private returns (bool) {
        require(addr != address(0));

        bool found = false;
        uint256 i;
        for (i = 0; i < _feeCollectors.length; i++) {
            if (_feeCollectors[i] == addr) {
                found = true;
                break;
            }
        }

        if (found == true) {
            uint256 fee = _feeRatio[addr];
            _feeDenominatorInCollectors = _feeDenominatorInCollectors.sub(fee);
            delete _feeRatio[addr];
            remove(i);
            return true;
        }
        return false;
    }
    function remove(uint256 index) internal {
        if (index >= _feeCollectors.length) return;

        for (uint i = index; i < _feeCollectors.length - 1; i++){
            _feeCollectors[i] = _feeCollectors[i + 1];
        }
        delete _feeCollectors[_feeCollectors.length-1];
        _feeCollectors.length--;
    }
    function setFeeRatio(uint256 numerator, uint256 denominator) external whenNotPaused onlyOwner returns (bool) {
        require(denominator >= numerator, "Denominator must be bigger than numerator");
        _feeRatioNumeratorFromToken = numerator;
        _feeRatioDenominatorFromToken = denominator;
        return true;
    }

    function getFeeRatio() external whenNotPaused onlyOwner  view returns (uint256[2] memory) {
        return [_feeRatioNumeratorFromToken, _feeRatioDenominatorFromToken];
    }

}
