pragma solidity ^0.5.6;

import "./klaytn-contracts/ownership/Ownable.sol";
import "./klaytn-contracts/math/SafeMath.sol";
import "./klaytn-contracts/token/KIP7/IKIP7.sol";

contract YearendAirdrop is Ownable {
    using SafeMath for uint256;

    IKIP7 public newIjm;
    uint256 public amount = 100 * 1e18;
    mapping(address => bool) public toReceive;
    uint256 public total = 0;

    function setNewIjm(IKIP7 _newIjm) onlyOwner external {
        newIjm = _newIjm;
    }

    function add(address[] calldata users) onlyOwner external {
        uint256 length = users.length;
        for (uint256 i = 0; i < length; i += 1) {
            require(toReceive[users[i]] != true);
            toReceive[users[i]] = true;
        }
        total = total.add(length);
    }

    function receiveNew() external {
        require(toReceive[msg.sender] == true);
        newIjm.transfer(msg.sender, amount);
        toReceive[msg.sender] = false;
    }

    function withdrawKlay() onlyOwner external {
        owner().transfer(address(this).balance);
    }

    function withdrawIjm() onlyOwner external {
        newIjm.transfer(owner(), newIjm.balanceOf(address(this)));
    }
}
