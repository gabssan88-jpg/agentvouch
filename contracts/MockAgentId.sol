// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Test-only mock of the Agent ID registry. NOT deployed to mainnet.
///         Only used to exercise AgentVouch's access control in local tests.
contract MockAgentId {
    mapping(address => uint256) private _balances;

    function mint(address to) external {
        _balances[to] += 1;
    }

    function balanceOf(address owner) external view returns (uint256) {
        return _balances[owner];
    }
}
