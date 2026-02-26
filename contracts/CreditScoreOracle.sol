// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CreditScoreOracle {

    // ═══════════════════════════════════════
    // CUSTOM ERRORS
    // ═══════════════════════════════════════

    error NotOwner();
    error NotUpdater();
    error ZeroAddress();
    error AddressNotFound();


    // ═══════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════

    struct ScoreData {
        address borrower;
        uint256 totalScore;       // final score 0-1000
        uint256 onChainScore;     // score from LendingMarket activity (max 700)
        uint256 realWorldScore;   // score from RealWorldCredit records (max 300)
        string  tier;             // "AAA", "AA", "A", "B", or "C"
        uint256 totalLoans;
        uint256 repaidOnTime;
        uint256 repaidLate;
        uint256 defaulted;
        uint256 totalRealWorldRecords;
        uint256 lastUpdated;      // block timestamp of last update
    }


    // ═══════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════

    address public owner;

    // updater is the Ponder indexer wallet that pushes scores
    address public updater;

    mapping(address => ScoreData) private scores;

    // keep track of all scored addresses for leaderboard
    address[] public scoredAddresses;
    mapping(address => bool) private isScored;


    // ═══════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════

    event ScoreUpdated(
        address indexed borrower,
        uint256 totalScore,
        uint256 onChainScore,
        uint256 realWorldScore,
        string  tier,
        uint256 timestamp
    );

    event UpdaterChanged(
        address indexed oldUpdater,
        address indexed newUpdater
    );

    event OwnershipTransferred(
        address indexed oldOwner,
        address indexed newOwner
    );


    // ═══════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════

    constructor() {
        owner   = msg.sender;
        updater = msg.sender; // initially owner is also updater
    }


    // ═══════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyUpdater() {
        if (msg.sender != updater && msg.sender != owner) revert NotUpdater();
        _;
    }


    // ═══════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════

    // set a separate wallet for Ponder indexer to push scores
    function setUpdater(address newUpdater) external onlyOwner {
        if (newUpdater == address(0)) revert ZeroAddress();
        emit UpdaterChanged(updater, newUpdater);
        updater = newUpdater;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }


    // ═══════════════════════════════════════
    // SCORE UPDATE FUNCTION
    // ═══════════════════════════════════════

    // called by Ponder indexer (pusher.ts) after calculating scores
    function updateScore(
        address borrower,
        uint256 totalScore,
        uint256 onChainScore,
        uint256 realWorldScore,
        string  memory tier,
        uint256 totalLoans,
        uint256 repaidOnTime,
        uint256 repaidLate,
        uint256 defaulted,
        uint256 totalRealWorldRecords
    ) external onlyUpdater {

        // EFFECTS
        if (!isScored[borrower]) {
            scoredAddresses.push(borrower);
            isScored[borrower] = true;
        }

        scores[borrower] = ScoreData({
            borrower:               borrower,
            totalScore:             totalScore,
            onChainScore:           onChainScore,
            realWorldScore:         realWorldScore,
            tier:                   tier,
            totalLoans:             totalLoans,
            repaidOnTime:           repaidOnTime,
            repaidLate:             repaidLate,
            defaulted:              defaulted,
            totalRealWorldRecords:  totalRealWorldRecords,
            lastUpdated:            block.timestamp
        });

        // INTERACTIONS
        emit ScoreUpdated(
            borrower,
            totalScore,
            onChainScore,
            realWorldScore,
            tier,
            block.timestamp
        );
    }


    // ═══════════════════════════════════════
    // PUBLIC READ FUNCTIONS
    // ═══════════════════════════════════════

    // any DApp can read a borrower's score
    function getScore(address borrower)
        external view returns (ScoreData memory) {
        return scores[borrower];
    }

    // get total number of scored borrowers
    function getTotalScored()
        external view returns (uint256) {
        return scoredAddresses.length;
    }

    // get leaderboard — top N borrowers by total score
    function getLeaderboard(uint256 limit)
        external view returns (address[] memory, uint256[] memory)
    {
        uint256 total = scoredAddresses.length;
        if (limit > total) limit = total;

        address[] memory addrs  = new address[](limit);
        uint256[] memory scrs   = new uint256[](limit);

        // copy all addresses and scores
        address[] memory allAddrs  = new address[](total);
        uint256[] memory allScores = new uint256[](total);

        for (uint256 i = 0; i < total; i++) {
            allAddrs[i]  = scoredAddresses[i];
            allScores[i] = scores[scoredAddresses[i]].totalScore;
        }

        // simple bubble sort — acceptable for small datasets on testnet
        for (uint256 i = 0; i < total - 1; i++) {
            for (uint256 j = 0; j < total - i - 1; j++) {
                if (allScores[j] < allScores[j + 1]) {
                    // swap scores
                    uint256 tmpScore  = allScores[j];
                    allScores[j]      = allScores[j + 1];
                    allScores[j + 1]  = tmpScore;
                    // swap addresses
                    address tmpAddr   = allAddrs[j];
                    allAddrs[j]       = allAddrs[j + 1];
                    allAddrs[j + 1]   = tmpAddr;
                }
            }
        }

        for (uint256 i = 0; i < limit; i++) {
            addrs[i] = allAddrs[i];
            scrs[i]  = allScores[i];
        }

        return (addrs, scrs);
    }

    // check if an address has a score
    function hasScore(address borrower)
        external view returns (bool) {
        return isScored[borrower];
    }
}
