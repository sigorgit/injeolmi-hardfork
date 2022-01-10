pragma solidity ^0.5.6;

import "./klaytn-contracts/ownership/Ownable.sol";
import "./klaytn-contracts/math/SafeMath.sol";
import "./klaytn-contracts/lifecycle/Pausable.sol";
import "./interfaces/IInjeolmi.sol";
import "hardhat/console.sol";

contract InjeolmiV2 is Ownable, Pausable, IInjeolmi {
    using SafeMath for uint256;

    string public constant NAME = "Injeolmi";
    string public constant SYMBOL = "IJM";
    uint8 public constant DECIMALS = 18;

    uint256 public constant TOTAL_SUPPLY = 100000000 * 10**uint256(DECIMALS);
    uint256 private constant MULTIPLIER = 10**35;
    uint256 public totalFees;

    struct UserInfo {
        uint256 lastBalance;
        uint256 lastMultiplier;
        uint256 userGen;
    }

    mapping(address => UserInfo) public _userInfo;
    mapping(address => mapping(address => uint256)) private allowed;
    mapping(address => bool) public excludedFrom;
    mapping(address => bool) public excludedTo;

    address[] public noDistribution;
    mapping(address => uint256) public noDistIndex;

    mapping(uint256 => uint256) public accMultiplier; //accMultiplier[gen]. initially MULTIPLIER
    uint256 private maxMultiplier = 10**50;

    uint256 public generation;

    address[] public tokenHolders;
    mapping(address => uint256) public tokenHolderIndex;

    function tokenHoldersLength() external view returns (uint256) {
        return tokenHolders.length;
    }

    function _multiplierCheck() internal {
        if (accMultiplier[generation] > maxMultiplier) {
            generation++;
            accMultiplier[generation] = MULTIPLIER;
            emit IncreaseGeneration(generation);
        }
    }

    function _updateHolders(address[] memory users) internal {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 bal = balanceOf(user);
            if (bal == 0 && tokenHolderIndex[user] != 0 && (tokenHolders.length != 0 || tokenHolders[0] == user)) {
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
            } else if (bal != 0 && tokenHolderIndex[user] == 0 && (tokenHolders.length == 0 || tokenHolders[0] != user)) {
                //add user
                tokenHolderIndex[user] = tokenHolders.length;
                tokenHolders.push(user);
            }
        }
    }

    function isNoDistribution(address account) public view returns (bool) {
        return (noDistIndex[account] != 0 || (noDistribution.length != 0 && noDistribution[0] == account));
    }

    function addToNoDistribution(address account) public onlyOwner {
        require(!isNoDistribution(account));

        updateMultiplier(account, generation);

        noDistIndex[account] = noDistribution.length;
        noDistribution.push(account);
    }

    function removeFromNoDistribution(address account) public onlyOwner {
        require(isNoDistribution(account));

        _userInfo[account].lastMultiplier = accMultiplier[generation];
        _userInfo[account].userGen = generation;

        uint256 lastIndex = noDistribution.length.sub(1);
        uint256 accountIndex = noDistIndex[account];

        if (accountIndex != lastIndex) {
            address lastHolder = noDistribution[lastIndex];

            noDistribution[accountIndex] = lastHolder;
            noDistIndex[lastHolder] = accountIndex;
        }

        noDistribution.length--;
        noDistIndex[account] = 0;
    }

    function setExcludeFrom(address addr, bool status) external onlyOwner {
        excludedFrom[addr] = status;
    }

    function setExcludeTo(address addr, bool status) external onlyOwner {
        excludedTo[addr] = status;
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
        _userInfo[msg.sender].lastBalance = TOTAL_SUPPLY;
        _userInfo[msg.sender].lastMultiplier = MULTIPLIER;
        accMultiplier[0] = MULTIPLIER;
    }

    function updateMultiplier(address user, uint256 targetGen) public whenNotPaused {
        UserInfo storage _uInfo = _userInfo[user];
        if (_uInfo.lastBalance == 0 || isNoDistribution(user)) {
            require(targetGen <= generation && targetGen >= _uInfo.userGen);
            _uInfo.lastMultiplier = accMultiplier[targetGen];
            _uInfo.userGen = targetGen;
        } else if (_uInfo.userGen == targetGen && _uInfo.lastMultiplier == accMultiplier[targetGen]) {
            return;
        } else {
            (uint256 newBalance, uint256 newMultiplier) = _updateUserInfo(_uInfo, targetGen);

            _uInfo.lastBalance = newBalance;
            _uInfo.lastMultiplier = newMultiplier;
            _uInfo.userGen = targetGen;
        }
    }

    function _updateUserInfo(UserInfo memory userInfo, uint256 targetGen) internal view returns (uint256 newBalance, uint256 newMultiplier) {
        uint256 oldBalance = userInfo.lastBalance;
        uint256 oldMultiplier = userInfo.lastMultiplier;
        uint256 oldGen = userInfo.userGen;

        require(targetGen <= generation && targetGen >= oldGen);

        newBalance = oldBalance;
        for (uint256 i = oldGen; i <= targetGen; i++) {
            newBalance = (newBalance.mul(accMultiplier[i]).add(oldMultiplier.div(2))).div(oldMultiplier);   //rounding
            oldMultiplier = MULTIPLIER;
        }
        newMultiplier = accMultiplier[targetGen];
    }

    function balanceOf(address user) public view returns (uint256 newBalance) {
        UserInfo memory _uInfo = _userInfo[user];
        if (_uInfo.lastBalance == 0 || _uInfo.lastMultiplier == 0) return 0;
        if ((_uInfo.lastMultiplier == accMultiplier[generation] && _uInfo.userGen == generation) || isNoDistribution(user)) return _uInfo.lastBalance;
        (newBalance, ) = _updateUserInfo(_uInfo, generation);
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) private {
        require(from != to);
        updateMultiplier(from, generation);
        updateMultiplier(to, generation);

        UserInfo storage _fromInfo = _userInfo[from];
        UserInfo storage _toInfo = _userInfo[to];

        uint256 fromUpdatedBalance = _fromInfo.lastBalance;
        uint256 toUpdatedBalance = _toInfo.lastBalance;

        if (amount == uint256(-1)) amount = fromUpdatedBalance;

        if (excludedFrom[from] || excludedTo[to] || from == owner() || to == owner()) {
            if(fromUpdatedBalance.sub(amount) != 1) {
                _fromInfo.lastBalance = fromUpdatedBalance.sub(amount);
                _toInfo.lastBalance = toUpdatedBalance.add(amount);
            } else {
                _fromInfo.lastBalance = 0;
                _toInfo.lastBalance = toUpdatedBalance.add(amount).add(1);
            }
        } else {
            updateMultiplier(owner(), generation);
            UserInfo storage _ownerInfo = _userInfo[owner()];
            uint256 ownerUpdatedBalance = _ownerInfo.lastBalance;

            uint256 dist = amount.mul(9).div(100);
            uint256 fee = amount.div(100);
            totalFees += dist;

            if(fromUpdatedBalance.sub(amount) != 1) {
                _fromInfo.lastBalance = fromUpdatedBalance.sub(amount);
                _toInfo.lastBalance = toUpdatedBalance.add(amount.sub(dist.add(fee)));
            } else {
                _fromInfo.lastBalance = 0;
                _toInfo.lastBalance = toUpdatedBalance.add(amount.sub(dist.add(fee))).add(1);
            }
            _ownerInfo.lastBalance = ownerUpdatedBalance.add(fee);

            uint256 noDistBalance;
            for (uint256 i = 0; i < noDistribution.length; i++) {
                noDistBalance = noDistBalance.add(balanceOf(noDistribution[i]));
            }

            uint256 _totalDist = TOTAL_SUPPLY.sub(noDistBalance);
            accMultiplier[generation] = accMultiplier[generation].mul(_totalDist).div(_totalDist.sub(dist));

            _multiplierCheck();
        }

        emit Transfer(from, to, amount);

        address[] memory arr = new address[](3);
        arr[0] = from;
        arr[1] = to;
        arr[2] = owner();
        _updateHolders(arr);
    }

    function distributeIJM(uint256 amount) public whenNotPaused {
        require(amount > 0);
        updateMultiplier(msg.sender, generation);

        UserInfo storage _fromInfo = _userInfo[msg.sender];
        uint256 fromUpdatedBalance = _fromInfo.lastBalance;

        if (amount == uint256(-1)) amount = _fromInfo.lastBalance;

        _fromInfo.lastBalance = fromUpdatedBalance.sub(amount);

        uint256 noDistBalance;
        for (uint256 i = 0; i < noDistribution.length; i++) {
            noDistBalance = noDistBalance.add(balanceOf(noDistribution[i]));
        }

        uint256 _totalDist = TOTAL_SUPPLY.sub(noDistBalance);
        accMultiplier[generation] = accMultiplier[generation].mul(_totalDist).div(_totalDist.sub(amount));

        _multiplierCheck();
    }

    function transfer(address to, uint256 amount) public whenNotPaused returns (bool success) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external whenNotPaused returns (bool success) {
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
    ) external whenNotPaused returns (bool success) {
        uint256 _allowance = allowed[from][msg.sender];
        if (_allowance != uint256(-1)) {
            allowed[from][msg.sender] = _allowance.sub(amount);
        }
        _transfer(from, to, amount);
        return true;
    }
}
