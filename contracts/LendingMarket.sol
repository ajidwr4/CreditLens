// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title  LendingMarket — Non-collateral P2P lending on Creditcoin
/// @notice Lenders post Bids with full terms (amount, rate, duration).
///         Borrowers post Asks with only the amount they need.
///         A lender accepts a matching Ask → Deal is formed using the Bid's terms.
///         Real tCTC transfers occur: lender funds borrower on accept, borrower repays lender.
/// @dev    Deployed on Creditcoin testnet (Chain ID: 102031)
///         - Overflow protection via input caps on amount, interestRate, duration
///         - Checks-effects-interactions pattern on all payable functions
///         - Custom errors throughout for gas efficiency and clarity

contract LendingMarket {

    // ═══════════════════════════════════════════════════════════
    //  REENTRANCY GUARD
    // ═══════════════════════════════════════════════════════════

    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;

    /// @dev Thrown instead of a string revert for gas efficiency
    error ReentrantCall();

    modifier nonReentrant() {
        if (_status == _ENTERED) revert ReentrantCall();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ═══════════════════════════════════════════════════════════
    //  CUSTOM ERRORS
    // ═══════════════════════════════════════════════════════════

    error InvalidAmount();
    error InvalidInterestRate();
    error InvalidDuration();
    error NotYourOrder();
    error OrderNotOpen();
    error BidNotOpen();
    error AskNotOpen();
    error DealNotActive();
    error NotBorrower();
    error DeadlineNotPassed();
    error CannotLendToYourself();
    error AmountMismatch();
    error CurrencyMismatch();
    error InsufficientRepayment();
    error TransferFailed();
    error WrongFundingAmount();
    error AmountExceedsLimit();
    error RateExceedsLimit();
    error DurationExceedsLimit();

    // ═══════════════════════════════════════════════════════════
    //  CONSTANTS & LIMITS
    // ═══════════════════════════════════════════════════════════

    /// @dev Basis points denominator (10_000 = 100%)
    uint256 private constant BPS = 10_000;

    /// @dev Seconds in a year for simple interest calculation
    uint256 private constant SECONDS_PER_YEAR = 365 days;

    /// @dev Maximum loan amount: 1,000,000 tCTC
    ///      Prevents overflow in interest calculation:
    ///      1_000_000e18 * 10_000 * (5 * 365 days) = ~1.58e45 which fits in uint256 (max ~1.16e77)
    uint256 public constant MAX_AMOUNT = 1_000_000 ether;

    /// @dev Maximum interest rate: 10,000 bps = 100% APR
    uint256 public constant MAX_RATE = 10_000;

    /// @dev Maximum loan duration: 5 years in seconds
    uint256 public constant MAX_DURATION = 5 * 365 days;

    // ═══════════════════════════════════════════════════════════
    //  STRUCTS & ENUMS
    // ═══════════════════════════════════════════════════════════

    enum OrderStatus { Open, Matched, Cancelled }

    /// @notice Posted by a LENDER — specifies full loan terms
    struct Bid {
        uint256     id;
        address     lender;
        uint256     amount;         // in tCTC (wei), max MAX_AMOUNT
        string      currency;       // e.g. "tCTC"
        uint256     interestRate;   // annual rate in bps, max MAX_RATE
        uint256     duration;       // in seconds, max MAX_DURATION
        OrderStatus status;
        uint256     createdAt;
    }

    /// @notice Posted by a BORROWER — amount and currency only, no terms
    /// @dev    interestRate and duration are intentionally absent.
    ///         Terms will be provided by whichever lender accepts this ask.
    struct Ask {
        uint256     id;
        address     borrower;
        uint256     amount;         // in tCTC (wei), max MAX_AMOUNT
        string      currency;       // e.g. "tCTC"
        OrderStatus status;
        uint256     createdAt;
    }

    /// @notice Formed when a lender accepts a borrower's Ask
    /// @dev    Terms (interestRate, duration) are always inherited from the Bid.
    ///         repaymentDue is pre-calculated at match time to avoid re-computation.
    struct Deal {
        uint256 id;
        uint256 bidId;
        uint256 askId;
        address borrower;
        address lender;
        uint256 amount;             // principal in tCTC (wei)
        string  currency;
        uint256 interestRate;       // bps, inherited from Bid
        uint256 duration;           // seconds, inherited from Bid
        uint256 deadline;           // block.timestamp + duration at match time
        uint256 repaymentDue;       // principal + simple interest, fixed at match time
        bool    repaidOnTime;
        bool    isActive;
        uint256 createdAt;
    }

    // ═══════════════════════════════════════════════════════════
    //  STATE
    // ═══════════════════════════════════════════════════════════

    uint256 private _nextBidId  = 1;
    uint256 private _nextAskId  = 1;
    uint256 private _nextDealId = 1;

    mapping(uint256 => Bid)  public bids;
    mapping(uint256 => Ask)  public asks;
    mapping(uint256 => Deal) public deals;

    // ═══════════════════════════════════════════════════════════
    //  EVENTS
    // ═══════════════════════════════════════════════════════════

    /// @dev Emitted when a lender posts a bid with full terms
    event BidPosted(
        uint256 indexed orderId,
        address indexed lender,
        uint256 amount,
        string  currency,
        uint256 interestRate,
        uint256 duration
    );

    /// @dev Emitted when a borrower posts an ask — amount and currency only
    event AskPosted(
        uint256 indexed orderId,
        address indexed borrower,
        uint256 amount,
        string  currency
    );

    event BidCancelled(uint256 indexed orderId, address indexed lender);
    event AskCancelled(uint256 indexed orderId, address indexed borrower);

    /// @dev Emitted when a lender accepts an ask, funds the borrower, and a deal is created
    event DealMatched(
        uint256 indexed dealId,
        uint256 indexed bidId,
        uint256 indexed askId,
        address borrower,
        address lender,
        uint256 amount,
        string  currency,
        uint256 interestRate,
        uint256 duration,
        uint256 deadline,
        uint256 repaymentDue
    );

    /// @dev Emitted when borrower fully repays the loan
    event LoanRepaid(
        uint256 indexed dealId,
        address indexed borrower,
        address indexed lender,
        bool    onTime
    );

    /// @dev Emitted when a loan is marked as defaulted after its deadline
    event LoanDefaulted(
        uint256 indexed dealId,
        address indexed borrower,
        address indexed lender
    );

    // ═══════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════

    constructor() {
        _status = _NOT_ENTERED;
    }

    // ═══════════════════════════════════════════════════════════
    //  LENDER FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /// @notice Post a lending offer with full terms
    /// @param amount       Amount willing to lend in wei (tCTC). Must be > 0 and <= MAX_AMOUNT.
    /// @param currency     Currency label that borrower's ask must also use e.g. "tCTC"
    /// @param interestRate Annual interest in basis points. Must be > 0 and <= MAX_RATE (10000 = 100% APR).
    /// @param duration     Loan duration in seconds. Must be > 0 and <= MAX_DURATION (5 years).
    /// @return bidId       The ID of the newly created bid
    function postBid(
        uint256 amount,
        string  memory currency,
        uint256 interestRate,
        uint256 duration
    ) external returns (uint256 bidId) {
        if (amount == 0)              revert InvalidAmount();
        if (amount > MAX_AMOUNT)      revert AmountExceedsLimit();
        if (interestRate == 0)        revert InvalidInterestRate();
        if (interestRate > MAX_RATE)  revert RateExceedsLimit();
        if (duration == 0)            revert InvalidDuration();
        if (duration > MAX_DURATION)  revert DurationExceedsLimit();

        bidId = _nextBidId++;

        bids[bidId] = Bid({
            id:           bidId,
            lender:       msg.sender,
            amount:       amount,
            currency:     currency,
            interestRate: interestRate,
            duration:     duration,
            status:       OrderStatus.Open,
            createdAt:    block.timestamp
        });

        emit BidPosted(bidId, msg.sender, amount, currency, interestRate, duration);
    }

    /// @notice Accept a borrower's ask and fund the loan with real tCTC
    /// @dev    Lender must send exactly bid.amount as msg.value.
    ///
    ///         Validation order:
    ///         1. Both orders must be Open
    ///         2. Caller must own the Bid
    ///         3. Lender cannot lend to themselves
    ///         4. bid.amount must equal ask.amount           ← AmountMismatch guard
    ///         5. bid.currency must equal ask.currency       ← CurrencyMismatch guard
    ///         6. msg.value must equal bid.amount            ← WrongFundingAmount guard
    ///
    ///         Interest is pre-calculated using simple interest formula.
    ///         tCTC is transferred to borrower immediately after state update.
    ///
    /// @param bidId   The lender's own open Bid to use for terms and funding
    /// @param askId   The borrower's open Ask to accept
    /// @return dealId The ID of the newly created deal
    function acceptAsk(
        uint256 bidId,
        uint256 askId
    ) external payable nonReentrant returns (uint256 dealId) {
        Bid storage bid = bids[bidId];
        Ask storage ask = asks[askId];

        // ── 1. Order state checks ────────────────────────────────
        if (bid.status != OrderStatus.Open) revert BidNotOpen();
        if (ask.status != OrderStatus.Open) revert AskNotOpen();

        // ── 2. Ownership check ───────────────────────────────────
        if (bid.lender != msg.sender)       revert NotYourOrder();

        // ── 3. Self-lending check ────────────────────────────────
        if (bid.lender == ask.borrower)     revert CannotLendToYourself();

        // ── 4. Amount compatibility ──────────────────────────────
        // bid.amount must match ask.amount exactly.
        // Prevents lender from accidentally funding a differently-sized ask.
        if (bid.amount != ask.amount)       revert AmountMismatch();

        // ── 5. Currency compatibility ────────────────────────────
        // String comparison via keccak256 hash — Solidity cannot compare strings directly.
        if (keccak256(bytes(bid.currency)) != keccak256(bytes(ask.currency)))
            revert CurrencyMismatch();

        // ── 6. Funding check ─────────────────────────────────────
        // Lender must attach exactly the loan principal as msg.value.
        if (msg.value != bid.amount)        revert WrongFundingAmount();

        // ── Calculate repayment due ───────────────────────────────
        // Simple interest: principal + (principal × annualRate × duration) / (BPS × YEAR)
        // Safe from overflow because inputs are capped:
        //   MAX_AMOUNT (1e24 wei) × MAX_RATE (10000) × MAX_DURATION (5*365 days ~= 1.57e8)
        //   = ~1.57e36, well within uint256 range (~1.16e77)
        uint256 interest     = (bid.amount * bid.interestRate * bid.duration)
                               / (BPS * SECONDS_PER_YEAR);
        uint256 repaymentDue = bid.amount + interest;

        // ── Update state BEFORE external calls (checks-effects-interactions) ──
        bid.status = OrderStatus.Matched;
        ask.status = OrderStatus.Matched;

        uint256 deadline = block.timestamp + bid.duration;
        dealId           = _nextDealId++;

        deals[dealId] = Deal({
            id:           dealId,
            bidId:        bidId,
            askId:        askId,
            borrower:     ask.borrower,
            lender:       bid.lender,
            amount:       bid.amount,
            currency:     bid.currency,
            interestRate: bid.interestRate,
            duration:     bid.duration,
            deadline:     deadline,
            repaymentDue: repaymentDue,
            repaidOnTime: false,
            isActive:     true,
            createdAt:    block.timestamp
        });

        emit DealMatched(
            dealId,
            bidId,
            askId,
            ask.borrower,
            bid.lender,
            bid.amount,
            bid.currency,
            bid.interestRate,
            bid.duration,
            deadline,
            repaymentDue
        );

        // ── Transfer tCTC to borrower (external call is LAST) ────
        (bool sent, ) = ask.borrower.call{value: msg.value}("");
        if (!sent) revert TransferFailed();
    }

    /// @notice Cancel an open bid
    /// @param bidId  The bid to cancel — must be yours and still Open
    function cancelBid(uint256 bidId) external {
        Bid storage bid = bids[bidId];
        if (bid.lender != msg.sender)       revert NotYourOrder();
        if (bid.status != OrderStatus.Open) revert OrderNotOpen();

        bid.status = OrderStatus.Cancelled;
        emit BidCancelled(bidId, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════
    //  BORROWER FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /// @notice Post a borrow request — only specify how much you need
    /// @dev    Borrower deliberately does NOT set interest rate or duration.
    ///         Those terms come from whichever lender decides to accept this ask.
    ///         This is the core design: lenders evaluate borrowers by credit score,
    ///         not by collateral.
    /// @param amount    Amount needed in wei (tCTC). Must be > 0 and <= MAX_AMOUNT.
    /// @param currency  Currency label e.g. "tCTC"
    /// @return askId    The ID of the newly created ask
    function postAsk(
        uint256 amount,
        string  memory currency
    ) external returns (uint256 askId) {
        if (amount == 0)         revert InvalidAmount();
        if (amount > MAX_AMOUNT) revert AmountExceedsLimit();

        askId = _nextAskId++;

        asks[askId] = Ask({
            id:        askId,
            borrower:  msg.sender,
            amount:    amount,
            currency:  currency,
            status:    OrderStatus.Open,
            createdAt: block.timestamp
        });

        emit AskPosted(askId, msg.sender, amount, currency);
    }

    /// @notice Repay an active loan in full
    /// @dev    Borrower must send at least deal.repaymentDue as msg.value.
    ///         Any excess above repaymentDue is refunded to the borrower.
    ///         repaidOnTime is true if called before or on the deadline.
    ///         tCTC is transferred to lender immediately after state update.
    /// @param dealId  The deal to repay
    function repayLoan(uint256 dealId) external payable nonReentrant {
        Deal storage deal = deals[dealId];

        // ── Checks ───────────────────────────────────────────────
        if (!deal.isActive)                revert DealNotActive();
        if (deal.borrower != msg.sender)   revert NotBorrower();
        if (msg.value < deal.repaymentDue) revert InsufficientRepayment();

        // ── Effects ──────────────────────────────────────────────
        deal.isActive     = false;
        deal.repaidOnTime = block.timestamp <= deal.deadline;

        address lender    = deal.lender;
        uint256 repayment = deal.repaymentDue;
        uint256 excess    = msg.value - repayment;

        emit LoanRepaid(dealId, deal.borrower, lender, deal.repaidOnTime);

        // ── Interactions ─────────────────────────────────────────
        // Transfer principal + interest to lender
        (bool sentToLender, ) = lender.call{value: repayment}("");
        if (!sentToLender) revert TransferFailed();

        // Refund any excess tCTC back to borrower
        if (excess > 0) {
            (bool refunded, ) = msg.sender.call{value: excess}("");
            if (!refunded) revert TransferFailed();
        }
    }

    /// @notice Cancel an open ask
    /// @param askId  The ask to cancel — must be yours and still Open
    function cancelAsk(uint256 askId) external {
        Ask storage ask = asks[askId];
        if (ask.borrower != msg.sender)     revert NotYourOrder();
        if (ask.status != OrderStatus.Open) revert OrderNotOpen();

        ask.status = OrderStatus.Cancelled;
        emit AskCancelled(askId, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════
    //  ANYONE CAN CALL
    // ═══════════════════════════════════════════════════════════

    /// @notice Mark an overdue active loan as defaulted
    /// @dev    Callable by anyone after the deadline passes — intentional design.
    ///         Third parties are incentivised to call this because it triggers
    ///         a credit score penalty for the defaulting borrower via Ponder indexer,
    ///         keeping the market self-policing without admin intervention.
    /// @param dealId  The deal to default
    function markDefault(uint256 dealId) external {
        Deal storage deal = deals[dealId];

        if (!deal.isActive)                   revert DealNotActive();
        if (block.timestamp <= deal.deadline) revert DeadlineNotPassed();

        deal.isActive = false;

        emit LoanDefaulted(dealId, deal.borrower, deal.lender);
    }

    // ═══════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /// @notice Get total repayment due for a deal (principal + interest)
    /// @param dealId  The deal to query
    /// @return        Total tCTC owed in wei
    function getRepaymentDue(uint256 dealId) external view returns (uint256) {
        return deals[dealId].repaymentDue;
    }

    /// @notice Total bids ever created
    function totalBids() external view returns (uint256) {
        return _nextBidId - 1;
    }

    /// @notice Total asks ever created
    function totalAsks() external view returns (uint256) {
        return _nextAskId - 1;
    }

    /// @notice Total deals ever matched
    function totalDeals() external view returns (uint256) {
        return _nextDealId - 1;
    }

    /// @notice Safety fallback — allows contract to receive tCTC
    receive() external payable {}
}
