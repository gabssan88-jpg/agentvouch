// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentVouch — on-chain reputation registry for AI agents, gated by Agent ID
/// @notice Registration and vouching are restricted to holders of an Agent ID
///         (the SPACE ID Agent ID ERC-721 on BNB Chain, `name.ai`).
///         Agent ID is non-transferable and limited to one per user, which makes
///         it a practical sybil-resistance primitive: one real user, one voice.
/// @dev Safety / permissions disclosure (required by the hackathon rules):
///      - This contract has NO owner and NO admin functions.
///      - It cannot mint tokens, pause, freeze, change fees, or withdraw funds.
///      - It never takes custody of user assets and is not payable.
///      - The Agent ID registry address is immutable after deployment.
///      - Agent ID is used ONLY as an access-control / sybil-resistance check
///        (does this address hold one?), never to look up other people's
///        wallets by name.

interface IAgentId {
    function balanceOf(address owner) external view returns (uint256);
}

contract AgentVouch {
    /// @notice The Agent ID registry (SPACE ID Agent ID, ERC-721) on BNB Chain.
    IAgentId public immutable agentId;

    struct Profile {
        string name;        // agent display name (not an Agent ID name lookup)
        string category;    // e.g. "trading", "research", "support", "gaming"
        string description; // short public description of what the agent does
        string uri;         // link to the agent's homepage / docs / endpoint
        bool active;
        uint64 registeredAt;
        uint64 updatedAt;
    }

    mapping(address => Profile) private _profiles;
    mapping(address => bool) public isRegistered;
    address[] private _agents;

    /// @notice vouchedFor[voucher][agent] == true while a vouch is active.
    mapping(address => mapping(address => bool)) public vouchedFor;
    mapping(address => uint256) public vouchCount;

    uint256 public totalVouches;

    event Registered(address indexed agent, string name, string category);
    event ProfileUpdated(address indexed agent);
    event ProfileDeactivated(address indexed agent);
    event ProfileReactivated(address indexed agent);
    event Vouched(address indexed voucher, address indexed agent);
    event Unvouched(address indexed voucher, address indexed agent);

    error NotAgentIdHolder();
    error AlreadyRegistered();
    error NotRegistered();
    error InactiveProfile();
    error CannotVouchForSelf();
    error AlreadyVouched();
    error NotVouched();
    error EmptyName();

    modifier onlyHolder() {
        if (agentId.balanceOf(msg.sender) == 0) revert NotAgentIdHolder();
        _;
    }

    constructor(address agentIdRegistry) {
        require(agentIdRegistry != address(0), "zero registry");
        agentId = IAgentId(agentIdRegistry);
    }

    /// @notice True if `account` currently holds at least one Agent ID.
    function isAgentIdHolder(address account) external view returns (bool) {
        return agentId.balanceOf(account) > 0;
    }

    /// @notice Register the caller's agent profile. One profile per address.
    /// @dev The caller must hold an Agent ID. Registration is free (gas only).
    function register(
        string calldata name,
        string calldata category,
        string calldata description,
        string calldata uri
    ) external onlyHolder {
        if (isRegistered[msg.sender]) revert AlreadyRegistered();
        if (bytes(name).length == 0) revert EmptyName();

        _profiles[msg.sender] = Profile({
            name: name,
            category: category,
            description: description,
            uri: uri,
            active: true,
            registeredAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp)
        });
        isRegistered[msg.sender] = true;
        _agents.push(msg.sender);

        emit Registered(msg.sender, name, category);
    }

    /// @notice Update the caller's own profile fields.
    function updateProfile(
        string calldata name,
        string calldata category,
        string calldata description,
        string calldata uri
    ) external onlyHolder {
        if (!isRegistered[msg.sender]) revert NotRegistered();
        if (bytes(name).length == 0) revert EmptyName();

        Profile storage p = _profiles[msg.sender];
        p.name = name;
        p.category = category;
        p.description = description;
        p.uri = uri;
        p.updatedAt = uint64(block.timestamp);

        emit ProfileUpdated(msg.sender);
    }

    /// @notice Temporarily hide the caller's profile from vouching.
    function deactivate() external {
        if (!isRegistered[msg.sender]) revert NotRegistered();
        _profiles[msg.sender].active = false;
        emit ProfileDeactivated(msg.sender);
    }

    /// @notice Reactivate the caller's profile (still requires an Agent ID).
    function reactivate() external onlyHolder {
        if (!isRegistered[msg.sender]) revert NotRegistered();
        _profiles[msg.sender].active = true;
        emit ProfileReactivated(msg.sender);
    }

    /// @notice Vouch for a registered, active agent. One vouch per pair.
    /// @dev Vouching moves no assets; it is a public reputation signal only.
    function vouch(address agent) external onlyHolder {
        if (agent == msg.sender) revert CannotVouchForSelf();
        if (!isRegistered[agent]) revert NotRegistered();
        if (!_profiles[agent].active) revert InactiveProfile();
        if (vouchedFor[msg.sender][agent]) revert AlreadyVouched();

        vouchedFor[msg.sender][agent] = true;
        vouchCount[agent] += 1;
        totalVouches += 1;

        emit Vouched(msg.sender, agent);
    }

    /// @notice Withdraw a vouch previously given to `agent`.
    function unvouch(address agent) external {
        if (!vouchedFor[msg.sender][agent]) revert NotVouched();

        vouchedFor[msg.sender][agent] = false;
        vouchCount[agent] -= 1;
        totalVouches -= 1;

        emit Unvouched(msg.sender, agent);
    }

    /// @notice Read one profile.
    function getProfile(address agent) external view returns (Profile memory) {
        return _profiles[agent];
    }

    /// @notice Total number of registered agents.
    function totalAgents() external view returns (uint256) {
        return _agents.length;
    }

    /// @notice Paginated list of registered agent addresses.
    function getAgents(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory page)
    {
        uint256 total = _agents.length;
        if (offset >= total) return new address[](0);
        uint256 end = offset + limit;
        if (end > total) end = total;
        page = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = _agents[i];
        }
    }
}
