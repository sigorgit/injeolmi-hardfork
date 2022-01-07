pragma solidity ^0.5.6;

import "./klaytn-contracts/ownership/Ownable.sol";
import "./klaytn-contracts/math/SafeMath.sol";
import "./klaytn-contracts/token/KIP7/IKIP7.sol";

contract InitialSale is Ownable {
    using SafeMath for uint256;

    IKIP7 public newIjm;
    uint256 public price = 144374553246136709;
    uint256 public limit = 10424161083975580000000000;

    mapping(address => uint256) public bought;
    uint256 public total = 0;
    uint256 public max = 50000 * 1e18;
    uint256 public step = 0;

    function setNewIjm(IKIP7 _newIjm) onlyOwner external {
        newIjm = _newIjm;
    }

    function setMax(uint256 _max) onlyOwner external {
        max = _max;
    }
    
    function setStep(uint256 _step) onlyOwner external {
        step = _step;
    }

    function buy(uint256 amount) payable external {
        require(step == 0);
        require(amount.mul(price).div(1e18) == msg.value);
        bought[msg.sender] = bought[msg.sender].add(amount);
        require(bought[msg.sender] <= max);
        total = total.add(amount);
        require(total <= limit);
    }

    function receiveNew() external {
        newIjm.transfer(msg.sender, bought[msg.sender]);
        bought[msg.sender] = 0;
    }

    function withdrawKlay() onlyOwner external {
        owner().transfer(address(this).balance);
    }

    function withdrawIjm() onlyOwner external {
        newIjm.transfer(owner(), newIjm.balanceOf(address(this)));
    }
}
