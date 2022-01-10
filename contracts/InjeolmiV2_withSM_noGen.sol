pragma solidity ^0.5.6;

import "./klaytn-contracts/ownership/Ownable.sol";
import "./klaytn-contracts/math/SafeMath.sol";
import "./interfaces/IInjeolmiV2SMnoGen.sol";
import "hardhat/console.sol";

contract InjeolmiV2SMnoGen is Ownable, IInjeolmiV2SMnoGen {
    using SafeMath for uint256;

    string private constant NAME = "Injeolmi";
    string private constant SYMBOL = "IJM";
    uint8 private constant DECIMALS = 18;

    uint256 public _rTotal = (uint256(-1).div(TOTAL_SUPPLY)).mul(TOTAL_SUPPLY);
    uint256 public constant TOTAL_SUPPLY = 100000000 * 10**uint256(DECIMALS);

    uint256 public totalFees;
    struct UserInfo {
        uint256 _rOwned;
        uint256 _tOwned;
    }

    mapping(address => UserInfo) public _userInfo;
    mapping(address => mapping(address => uint256)) private allowed;
    mapping(address => bool) internal _excludedFrom;
    mapping(address => bool) internal _excludedTo;

    mapping(address => bool) public isNoDistribution;
    address[] public noDistribution;
    mapping(address => uint256) public noDistIndex;

    mapping(address => bool) public isTokenHolder;
    address[] public tokenHolders;
    mapping(address => uint256) public tokenHolderIndex;

    // uint256 private constant minimunRate = 100000000;
    bool public distributionStopped;

    function noDistributionLength() external view returns (uint256) {
        return noDistribution.length;
    }

    function tokenHoldersLength() external view returns (uint256) {
        return tokenHolders.length;
    }

    function _multiplierCheck() internal {
        // uint256 rate = _getRate();
        // if (rate < minimunRate) {
        //     distributionStopped = true;
        //     // emit DistributionStopped();  TODO
        // }
    }

    function _updateHolders(address[] memory users) internal {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 bal = balanceOf(user);
            if (bal == 0 && isTokenHolder[user]) {
                //remove user
                uint256 lastHolderIndex = tokenHolders.length.sub(1);
                uint256 userIndex = tokenHolderIndex[user];

                if (userIndex != lastHolderIndex) {
                    address lastHolder = tokenHolders[lastHolderIndex];

                    tokenHolders[userIndex] = lastHolder;
                    tokenHolderIndex[lastHolder] = userIndex;
                }

                tokenHolders.length--;
                tokenHolderIndex[user] = 0;
                delete isTokenHolder[user];
            } else if (bal != 0 && !isTokenHolder[user]) {
                //add user
                tokenHolderIndex[user] = tokenHolders.length;
                tokenHolders.push(user);
                isTokenHolder[user] = true;
            }
        }
    }

    function addToNoDistribution(address account) public onlyOwner {
        require(!isNoDistribution[account]);

        UserInfo storage _aInfo = _userInfo[account];
        uint256 rOwned = _aInfo._rOwned;
        if (rOwned > 0) {
            _aInfo._tOwned = tokenFromReflection(rOwned);
        }

        isNoDistribution[account] = true;
        noDistIndex[account] = noDistribution.length;
        noDistribution.push(account);
    }

    function removeFromNoDistribution(address account) public onlyOwner {
        require(isNoDistribution[account]);

        (uint256 rSupply, uint256 tSupply) = _getCurrentSupply();
        uint256 lastRate = rSupply.div(tSupply);
        uint256 last_rOwned = _userInfo[account]._rOwned;
        uint256 bal = _userInfo[account]._tOwned;
        uint256 new_rOwned = bal.mul(lastRate);
        _userInfo[account]._rOwned = new_rOwned;
        uint256 diff = last_rOwned.sub(new_rOwned);

        _rTotal = _rTotal.sub(diff);

        uint256 lastIndex = noDistribution.length.sub(1);
        uint256 accountIndex = noDistIndex[account];

        if (accountIndex != lastIndex) {
            address lastHolder = noDistribution[lastIndex];

            noDistribution[accountIndex] = lastHolder;
            noDistIndex[lastHolder] = accountIndex;
        }

        noDistribution.length--;
        noDistIndex[account] = 0;

        delete isNoDistribution[account];
    }

    function setExcludeFrom(address addr, bool status) external onlyOwner {
        _excludedFrom[addr] = status;
    }

    function setExcludeTo(address addr, bool status) external onlyOwner {
        _excludedTo[addr] = status;
    }

    function isExcludedFrom(address addr) public view returns (bool) {
        return _excludedFrom[addr] || (addr == owner());
    }

    function isExcludedTo(address addr) public view returns (bool) {
        return _excludedTo[addr] || (addr == owner());
    }

    function name() external pure returns (string memory) {
        return NAME;
    }

    function symbol() external pure returns (string memory) {
        return SYMBOL;
    }

    function decimals() external pure returns (uint8) {
        return DECIMALS;
    }

    function totalSupply() external pure returns (uint256) {
        return TOTAL_SUPPLY;
    }

    constructor() public {
        _userInfo[msg.sender]._rOwned = _rTotal;

        emit Transfer(address(0), msg.sender, TOTAL_SUPPLY);
    }

    function balanceOf(address user) public view returns (uint256) {
        UserInfo memory _uInfo = _userInfo[user];
        if (isNoDistribution[user]) return _uInfo._tOwned;
        if (_uInfo._rOwned == 0) return 0;
        return tokenFromReflection(_uInfo._rOwned);
    }

    function tmultiBalanceOf(address[] calldata users) external view returns (uint256[] memory) {  //for Test
        uint256 currentRate = _getRate();
        uint256[] memory balances = new uint256[](users.length);

        for(uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 balance;
            UserInfo memory _uInfo = _userInfo[user];
            if (isNoDistribution[user]) balance = _uInfo._tOwned;
            else if (_uInfo._rOwned == 0) balance = 0;
            else balance = _uInfo._rOwned.div(currentRate);
            balances[i] = balance;
        }
        return balances;
    }

    function tmultiROwned(address[] calldata users) external view returns (uint256[] memory) {  //for Test
        uint256[] memory rowneds = new uint256[](users.length);

        for(uint256 i = 0; i < users.length; i++) {
            UserInfo memory _uInfo = _userInfo[users[i]];
            rowneds[i] = _uInfo._rOwned;
        }
        return rowneds;
    }

    function tokenFromReflection(uint256 rAmount) internal view returns (uint256) {
        uint256 currentRate = _getRate();
        return rAmount.div(currentRate);
    }

    function _getRate() public view returns (uint256) {
        (uint256 rSupply, uint256 tSupply) = _getCurrentSupply();
        return rSupply.div(tSupply);
    }

    function _getCurrentSupply() private view returns (uint256, uint256) {
        uint256 rSupply = _rTotal;
        uint256 tSupply = TOTAL_SUPPLY;

        for (uint256 i = 0; i < noDistribution.length; i++) {
            UserInfo memory _uInfo = _userInfo[noDistribution[i]];

            if (_uInfo._rOwned > rSupply || _uInfo._tOwned > tSupply) return (_rTotal, TOTAL_SUPPLY);
            rSupply = rSupply.sub(_uInfo._rOwned);
            tSupply = tSupply.sub(_uInfo._tOwned);
        }

        // if (rSupply < _rTotal.div(TOTAL_SUPPLY)) {
        //     console.log("here!", rSupply, _rTotal.div(TOTAL_SUPPLY), tSupply);
        //     return (_rTotal, TOTAL_SUPPLY);
        // } //TODO 
        return (rSupply, tSupply);
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) private {
        require(from != to);
        require(amount > 0);

        uint256 fromBalance = balanceOf(from);
        if (amount == uint256(-1)) amount = fromBalance;
        if(fromBalance < amount) {
            console.log(fromBalance, amount, "what?");
            amount = fromBalance;
        }
        require(fromBalance >= amount);

        //noFeeDistribution
        if (isExcludedFrom(from) || isExcludedTo(to) || distributionStopped) {
            __transfer(from, to, amount, false);
        } else {
            __transfer(from, to, amount, true);
        }
        _multiplierCheck();

        emit Transfer(from, to, amount);

        address[] memory arr = new address[](3);
        arr[0] = from;
        arr[1] = to;
        arr[2] = owner();
        _updateHolders(arr);
    }

    function __transfer(
        address from,
        address to,
        uint256 tAmount,
        bool _feeOn
    ) internal {
        UserInfo storage _fromInfo = _userInfo[from];
        UserInfo storage _toInfo = _userInfo[to];

        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee, uint256 rOwnerFee, uint256 tTransferAmount, uint256 tFee, uint256 ownerFee) = _getValues(tAmount, _feeOn);
        _fromInfo._rOwned = _fromInfo._rOwned.sub(rAmount);
        _toInfo._rOwned = _toInfo._rOwned.add(rTransferAmount);

        if (isNoDistribution[from]) _fromInfo._tOwned = _fromInfo._tOwned.sub(tAmount);
        if (isNoDistribution[to]) _toInfo._tOwned = _toInfo._tOwned.add(tTransferAmount);
        if (_feeOn) {
            UserInfo storage _ownerInfo = _userInfo[owner()];

            _ownerInfo._rOwned = _ownerInfo._rOwned.add(rOwnerFee);
            if (isNoDistribution[owner()]) _ownerInfo._tOwned = _ownerInfo._tOwned.add(ownerFee);

            _reflectFee(rFee, tFee);
        }

        if(_fromInfo._rOwned < _getRate()) {
            _toInfo._rOwned = _toInfo._rOwned.add(_fromInfo._rOwned);
            delete _fromInfo._rOwned;
        }
    }

    function _reflectFee(uint256 rFee, uint256 tFee) internal {
        _rTotal = _rTotal.sub(rFee);
        totalFees = totalFees.add(tFee);
    }

    function _getValues(uint256 tAmount, bool _feeOn)
        private
        view
        returns (
            uint256 rAmount,
            uint256 rTransferAmount,
            uint256 rFee,
            uint256 rOwnerFee,
            uint256 tTransferAmount,
            uint256 tFee,
            uint256 ownerFee
        )
    {
        uint256 rate = _getRate();
        if (!_feeOn) {
            tTransferAmount = tAmount;
            (rAmount, rTransferAmount, , ) = _getRValues(tAmount, 0, 0, rate);
        } else {
            tFee = tAmount.mul(9).div(100);
            ownerFee = tAmount.div(100);
            tTransferAmount = tAmount.sub(tFee).sub(ownerFee);
            (rAmount, rTransferAmount, rFee, rOwnerFee) = _getRValues(tAmount, tFee, ownerFee, rate);
        }
    }

    function _getRValues(
        uint256 tAmount,
        uint256 tFee,
        uint256 ownerFee,
        uint256 currentRate
    )
        private
        pure
        returns (
            uint256 rAmount,
            uint256 rTransferAmount,
            uint256 rFee,
            uint256 rOwnerFee
        )
    {
        rAmount = tAmount.mul(currentRate);
        if (tFee == 0 && ownerFee == 0) {
            rTransferAmount = rAmount;
        } else {
            rFee = tFee.mul(currentRate);
            rOwnerFee = ownerFee.mul(currentRate);
            rTransferAmount = rAmount.sub(rFee).sub(rOwnerFee);
        }
    }

    function distributeIJM(uint256 amount) public {
        require(!distributionStopped);
        require(amount > 0);

        uint256 fromBalance = balanceOf(msg.sender);
        if (amount == uint256(-1)) amount = fromBalance;
        require(fromBalance >= amount);

        UserInfo storage _fromInfo = _userInfo[msg.sender];

        uint256 dist = amount.mul(_getRate());

        _fromInfo._rOwned = _fromInfo._rOwned.sub(dist);
        if (isNoDistribution[msg.sender]) _fromInfo._tOwned = _fromInfo._tOwned.sub(amount);

        _reflectFee(dist, amount);

        _multiplierCheck();
        // emit DistributeIJM(msg.sender, amount);  //TODO

        address[] memory arr = new address[](1);
        arr[0] = msg.sender;
        _updateHolders(arr);
    }

    function transfer(address to, uint256 amount) public returns (bool success) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool success) {
        allowed[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function allowance(address user, address spender) external view returns (uint256 remaining) {
        return allowed[user][spender];
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool success) {
        uint256 _allowance = allowed[from][msg.sender];
        if (_allowance != uint256(-1)) {
            allowed[from][msg.sender] = _allowance.sub(amount);
        }
        _transfer(from, to, amount);
        return true;
    }
}
