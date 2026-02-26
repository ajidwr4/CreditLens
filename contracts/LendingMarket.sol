// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract LendingMarket {

    // ═══════════════════════════════════════
    // CUSTOM ERRORS (more gas efficient than require strings)
    // ═══════════════════════════════════════

    error InvalidAmount();
    error InvalidInterestRate();
    error InvalidDuration();
    error NotYourOrder();
    error OrderNotOpen();
    error BidNotOpen();
    error AskNotOpen();
    error Unauthorized();
    error CannotBorrowFromYourself();
    error AmountMismatch();
    error InterestRateMismatch();
    error DurationMismatch();
    error CurrencyMismatch();
    error NotBorrower();
    error DealNotActive();
    error DeadlineNotPassed();


    // ═══════════════════════════════════════
    // ENUMS
    // ═══════════════════════════════════════

    enum OrderStatus { Open, Matched, Cancelled }
    enum DealStatus  { Active, Repaid, Defaulted }


    // ═══════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════

    struct BidOrder {
        uint256     orderId;
        address     borrower;
        uint256     amount;
        string      currency;
        uint256     interestRate;  // monthly interest rate, e.g. 7 = 7%
        uint256     duration;      // loan duration in seconds (flexible for testing)
        OrderStatus status;
        uint256     createdAt;
    }

    struct AskOrder {
        uint256     orderId;
        address     lender;
        uint256     amount;
        string      currency;
        uint256     interestRate;  // monthly interest rate, e.g. 7 = 7%
        uint256     duration;      // loan duration in seconds (flexible for testing)
        OrderStatus status;
        uint256     createdAt;
    }

    struct Deal {
        uint256    dealId;
        uint256    bidId;
        uint256    askId;
        address    borrower;
        address    lender;
        uint256    amount;
        string     currency;
        uint256    interestRate;
        uint256    duration;
        uint256    startTime;
        uint256    deadline;
        DealStatus status;
    }


    // ═══════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════

    uint256 private _bidCounter;
    uint256 private _askCounter;
    uint256 private _dealCounter;

    mapping(uint256 => BidOrder) public bids;
    mapping(uint256 => AskOrder) public asks;
    mapping(uint256 => Deal)     public deals;

    // index orders and deals by address
    mapping(address => uint256[]) public borrowerBids;
    mapping(address => uint256[]) public lenderAsks;
    mapping(address => uint256[]) public borrowerDeals;
    mapping(address => uint256[]) public lenderDeals;


    // ═══════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════

    event BidPosted(
        uint256 indexed orderId,
        address indexed borrower,
        uint256 amount,
        string  currency,
        uint256 interestRate,
        uint256 duration
    );

    event AskPosted(
        uint256 indexed orderId,
        address indexed lender,
        uint256 amount,
        string  currency,
        uint256 interestRate,
        uint256 duration
    );

    event DealMatched(
        uint256 indexed dealId,
        uint256 indexed bidId,
        uint256 indexed askId,
        address borrower,
        address lender,
        uint256 amount,
        string  currency,
        uint256 deadline
    );

    event LoanRepaid(
        uint256 indexed dealId,
        address indexed borrower,
        address indexed lender,
        bool    onTime
    );

    event LoanDefaulted(
        uint256 indexed dealId,
        address indexed borrower,
        address indexed lender
    );

    event BidCancelled(uint256 indexed orderId, address indexed borrower);
    event AskCancelled(uint256 indexed orderId, address indexed lender);


    // ═══════════════════════════════════════
    // FUNCTIONS — ORDERS
    // ═══════════════════════════════════════

    function postBid(
        uint256 amount,
        string  memory currency,
        uint256 interestRate,
        uint256 duration
    ) external returns (uint256) {
        if (amount == 0)       revert InvalidAmount();
        if (interestRate == 0) revert InvalidInterestRate();
        if (duration == 0)     revert InvalidDuration();

        _bidCounter++;
        uint256 newId = _bidCounter;

        bids[newId] = BidOrder({
            orderId:      newId,
            borrower:     msg.sender,
            amount:       amount,
            currency:     currency,
            interestRate: interestRate,
            duration:     duration,
            status:       OrderStatus.Open,
            createdAt:    block.timestamp
        });

        borrowerBids[msg.sender].push(newId);

        emit BidPosted(newId, msg.sender, amount, currency, interestRate, duration);
        return newId;
    }

    function postAsk(
        uint256 amount,
        string  memory currency,
        uint256 interestRate,
        uint256 duration
    ) external returns (uint256) {
        if (amount == 0)       revert InvalidAmount();
        if (interestRate == 0) revert InvalidInterestRate();
        if (duration == 0)     revert InvalidDuration();

        _askCounter++;
        uint256 newId = _askCounter;

        asks[newId] = AskOrder({
            orderId:      newId,
            lender:       msg.sender,
            amount:       amount,
            currency:     currency,
            interestRate: interestRate,
            duration:     duration,
            status:       OrderStatus.Open,
            createdAt:    block.timestamp
        });

        lenderAsks[msg.sender].push(newId);

        emit AskPosted(newId, msg.sender, amount, currency, interestRate, duration);
        return newId;
    }

    function cancelBid(uint256 bidId) external {
        BidOrder storage bid = bids[bidId];
        if (bid.borrower != msg.sender)    revert NotYourOrder();
        if (bid.status != OrderStatus.Open) revert OrderNotOpen();

        bid.status = OrderStatus.Cancelled;
        emit BidCancelled(bidId, msg.sender);
    }

    function cancelAsk(uint256 askId) external {
        AskOrder storage ask = asks[askId];
        if (ask.lender != msg.sender)      revert NotYourOrder();
        if (ask.status != OrderStatus.Open) revert OrderNotOpen();

        ask.status = OrderStatus.Cancelled;
        emit AskCancelled(askId, msg.sender);
    }


    // ═══════════════════════════════════════
    // FUNCTIONS — DEALS
    // ═══════════════════════════════════════

    function matchDeal(uint256 bidId, uint256 askId)
        external
        returns (uint256)
    {
        BidOrder storage bid = bids[bidId];
        AskOrder storage ask = asks[askId];

        // CHECKS
        if (bid.status != OrderStatus.Open) revert BidNotOpen();
        if (ask.status != OrderStatus.Open) revert AskNotOpen();
        if (msg.sender != bid.borrower && msg.sender != ask.lender) revert Unauthorized();
        if (bid.borrower == ask.lender) revert CannotBorrowFromYourself();
        if (bid.amount != ask.amount)             revert AmountMismatch();
        if (bid.interestRate != ask.interestRate)  revert InterestRateMismatch();
        if (bid.duration != ask.duration)          revert DurationMismatch();
        if (keccak256(bytes(bid.currency)) != keccak256(bytes(ask.currency)))
            revert CurrencyMismatch();

        // EFFECTS
        bid.status = OrderStatus.Matched;
        ask.status = OrderStatus.Matched;

        _dealCounter++;
        uint256 newDealId = _dealCounter;

        // duration is in seconds — flexible for testnet demo
        uint256 deadline = block.timestamp + bid.duration;

        deals[newDealId] = Deal({
            dealId:       newDealId,
            bidId:        bidId,
            askId:        askId,
            borrower:     bid.borrower,
            lender:       ask.lender,
            amount:       bid.amount,
            currency:     bid.currency,
            interestRate: bid.interestRate,
            duration:     bid.duration,
            startTime:    block.timestamp,
            deadline:     deadline,
            status:       DealStatus.Active
        });

        borrowerDeals[bid.borrower].push(newDealId);
        lenderDeals[ask.lender].push(newDealId);

        // INTERACTIONS (events last)
        emit DealMatched(
            newDealId, bidId, askId,
            bid.borrower, ask.lender,
            bid.amount, bid.currency, deadline
        );

        return newDealId;
    }

    function repay(uint256 dealId) external {
        Deal storage deal = deals[dealId];

        // CHECKS
        if (deal.borrower != msg.sender)      revert NotBorrower();
        if (deal.status != DealStatus.Active) revert DealNotActive();

        // EFFECTS
        bool onTime = block.timestamp <= deal.deadline;
        deal.status = DealStatus.Repaid;

        // INTERACTIONS
        emit LoanRepaid(dealId, deal.borrower, deal.lender, onTime);
    }

    function markDefault(uint256 dealId) external {
        Deal storage deal = deals[dealId];

        // CHECKS
        if (deal.status != DealStatus.Active) revert DealNotActive();
        if (block.timestamp <= deal.deadline) revert DeadlineNotPassed();

        // EFFECTS
        deal.status = DealStatus.Defaulted;

        // INTERACTIONS
        emit LoanDefaulted(dealId, deal.borrower, deal.lender);
    }


    // ═══════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════

    function getBid(uint256 bidId)
        external view returns (BidOrder memory) {
        return bids[bidId];
    }

    function getAsk(uint256 askId)
        external view returns (AskOrder memory) {
        return asks[askId];
    }

    function getDeal(uint256 dealId)
        external view returns (Deal memory) {
        return deals[dealId];
    }

    function getBorrowerBids(address borrower)
        external view returns (uint256[] memory) {
        return borrowerBids[borrower];
    }

    function getLenderAsks(address lender)
        external view returns (uint256[] memory) {
        return lenderAsks[lender];
    }

    function getBorrowerDeals(address borrower)
        external view returns (uint256[] memory) {
        return borrowerDeals[borrower];
    }

    function getLenderDeals(address lender)
        external view returns (uint256[] memory) {
        return lenderDeals[lender];
    }

    // get total counts for frontend
    function getTotalBids()  external view returns (uint256) { return _bidCounter; }
    function getTotalAsks()  external view returns (uint256) { return _askCounter; }
    function getTotalDeals() external view returns (uint256) { return _dealCounter; }
}
