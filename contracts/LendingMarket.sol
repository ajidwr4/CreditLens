// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title  LendingMarket v3 — Non-collateral P2P lending on Creditcoin
/// @notice Three mechanisms:
///         A) Borrower posts Request → Lenders fund Offers → Borrower accepts/rejects
///         B) Lender posts Public Offer (with min credit score gate) → First qualified borrower takes it (FCFS)
///         C) Active Loans → repay() or markDefault()
///
/// @dev    All tCTC transfers use native coin (msg.value), not ERC20.
///         Escrow is held inside this contract — no separate Vault.
///         Refunds use withdrawal pattern via pendingRefunds mapping.
///         Oracle (CreditScoreOracle) is queried on-chain for Mechanism B gating.

interface ICreditScoreOracle {
    function getScore(address borrower) external view returns (uint256);
}

contract LendingMarket {

    // ═══════════════════════════════════════════════════════════
    //  REENTRANCY GUARD
    // ═══════════════════════════════════════════════════════════

    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;

    error ReentrantCall();

    modifier nonReentrant() {
        if (_status == _ENTERED) revert ReentrantCall();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ═══════════════════════════════════════════════════════════
    //  CONSTANTS & LIMITS
    // ═══════════════════════════════════════════════════════════

    uint256 private constant BPS              = 10_000;
    uint256 private constant SECONDS_PER_YEAR = 365 days;

    /// @dev Max loan principal: 1,000,000 tCTC
    uint256 public constant MAX_AMOUNT   = 1_000_000 ether;
    /// @dev Max APR: 10,000 bps = 100%
    uint256 public constant MAX_RATE     = 10_000;
    /// @dev Max duration: 5 years
    uint256 public constant MAX_DURATION = 5 * 365 days;

    // ═══════════════════════════════════════════════════════════
    //  CUSTOM ERRORS
    // ═══════════════════════════════════════════════════════════

    // Input validation
    error InvalidAmount();
    error InvalidRate();
    error InvalidDuration();
    error InvalidExpiry();
    error AmountExceedsLimit();
    error RateExceedsLimit();
    error DurationExceedsLimit();

    // State checks
    error RequestNotOpen();
    error OfferNotOpen();
    error PublicOfferNotOpen();
    error LoanNotActive();
    error NotExpiredYet();
    error AlreadyExpired();
    error DeadlineNotPassed();

    // Access control
    error NotRequestOwner();
    error NotOfferOwner();
    error NotPublicOfferOwner();
    error NotBorrower();
    error CannotSelfDeal();

    // Business logic
    error AmountMismatch();
    error ScoreTooLow();
    error NothingToWithdraw();
    error WrongFundingAmount();
    error InsufficientRepayment();
    error TransferFailed();

    // ═══════════════════════════════════════════════════════════
    //  ENUMS
    // ═══════════════════════════════════════════════════════════

    enum RequestStatus    { Open, Matched, Cancelled, Expired }
    enum OfferStatus      { Open, Accepted, Rejected, Invalidated, Expired }
    enum PublicOfferStatus{ Open, Taken, Cancelled, Expired }
    enum LoanStatus       { Active, Repaid, Defaulted }

    // ═══════════════════════════════════════════════════════════
    //  STRUCTS
    // ═══════════════════════════════════════════════════════════

    /// @notice Mechanism A — Borrower posts a borrow request
    struct Request {
        uint256        id;
        address        borrower;
        uint256        amount;          // tCTC in wei, exact match required
        uint256        validUntil;      // unix timestamp — request expires after this
        RequestStatus  status;
        uint256        createdAt;
    }

    /// @notice Mechanism A — Lender funds an offer for a specific Request (tCTC locked)
    struct Offer {
        uint256      id;
        uint256      requestId;         // which Request this offer is for
        address      lender;
        uint256      amount;            // must equal request.amount exactly
        uint256      aprBps;            // annual interest rate in basis points
        uint256      durationSecs;      // loan duration in seconds
        uint256      validUntil;        // offer expires after this timestamp
        OfferStatus  status;
        uint256      createdAt;
    }

    /// @notice Mechanism B — Lender posts a public offer with a minimum credit score gate
    struct PublicOffer {
        uint256           id;
        address           lender;
        uint256           amount;           // tCTC in wei, locked on post
        uint256           aprBps;
        uint256           durationSecs;
        uint256           validUntil;
        uint256           minCreditScore;   // borrower must have score >= this
        PublicOfferStatus status;
        uint256           createdAt;
    }

    /// @notice Mechanism C — Active loan created from accepted Offer or taken PublicOffer
    struct Loan {
        uint256     id;
        address     borrower;
        address     lender;
        uint256     principal;      // tCTC in wei
        uint256     repayDue;       // principal + simple interest, fixed at creation
        uint256     dueTime;        // unix timestamp deadline
        LoanStatus  status;
        bool        repaidOnTime;
        uint256     createdAt;
    }

    // ═══════════════════════════════════════════════════════════
    //  STATE
    // ═══════════════════════════════════════════════════════════

    ICreditScoreOracle public immutable oracle;

    uint256 private _nextRequestId     = 1;
    uint256 private _nextOfferId       = 1;
    uint256 private _nextPublicOfferId = 1;
    uint256 private _nextLoanId        = 1;

    mapping(uint256 => Request)     public requests;
    mapping(uint256 => Offer)       public offers;
    mapping(uint256 => PublicOffer) public publicOffers;
    mapping(uint256 => Loan)        public loans;

    /// @dev Withdrawal pattern — pending refunds per lender address
    mapping(address => uint256) public pendingRefunds;

    // ═══════════════════════════════════════════════════════════
    //  EVENTS
    // ═══════════════════════════════════════════════════════════

    // Mechanism A
    event RequestPosted(
        uint256 indexed requestId,
        address indexed borrower,
        uint256 amount,
        uint256 validUntil
    );
    event RequestCancelled(uint256 indexed requestId, address indexed borrower);
    event RequestExpired(uint256 indexed requestId);

    event OfferFunded(
        uint256 indexed offerId,
        uint256 indexed requestId,
        address indexed lender,
        uint256 amount,
        uint256 aprBps,
        uint256 durationSecs,
        uint256 validUntil
    );
    event OfferAccepted(uint256 indexed offerId, uint256 indexed loanId);
    event OfferRejected(uint256 indexed offerId);
    event OfferInvalidated(uint256 indexed offerId);
    event OfferExpired(uint256 indexed offerId);

    // Mechanism B
    event PublicOfferPosted(
        uint256 indexed offerId,
        address indexed lender,
        uint256 amount,
        uint256 aprBps,
        uint256 durationSecs,
        uint256 validUntil,
        uint256 minCreditScore
    );
    event PublicOfferTaken(uint256 indexed offerId, uint256 indexed loanId, address indexed borrower);
    event PublicOfferCancelled(uint256 indexed offerId);
    event PublicOfferExpired(uint256 indexed offerId);

    // Mechanism C
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed lender,
        uint256 principal,
        uint256 repayDue,
        uint256 dueTime
    );
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, bool onTime);
    event LoanDefaulted(uint256 indexed loanId, address indexed borrower, address indexed lender);

    // Refund
    event RefundAccrued(address indexed lender, uint256 amount);
    event RefundWithdrawn(address indexed lender, uint256 amount);

    // ═══════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════

    /// @param _oracle Address of CreditScoreOracle contract (used for Mechanism B gating)
    constructor(address _oracle) {
        oracle  = ICreditScoreOracle(_oracle);
        _status = _NOT_ENTERED;
    }

    // ═══════════════════════════════════════════════════════════
    //  MECHANISM A — REQUEST → OFFER → ACCEPT/REJECT
    // ═══════════════════════════════════════════════════════════

    /// @notice Borrower posts a borrow request
    /// @param amount       Amount needed in wei (tCTC). Must be > 0 and <= MAX_AMOUNT.
    /// @param validUntil   Unix timestamp after which request can be expired. Must be in future.
    /// @return requestId
    function postRequest(
        uint256 amount,
        uint256 validUntil
    ) external returns (uint256 requestId) {
        if (amount == 0)              revert InvalidAmount();
        if (amount > MAX_AMOUNT)      revert AmountExceedsLimit();
        if (validUntil <= block.timestamp) revert InvalidExpiry();

        requestId = _nextRequestId++;
        requests[requestId] = Request({
            id:        requestId,
            borrower:  msg.sender,
            amount:    amount,
            validUntil:validUntil,
            status:    RequestStatus.Open,
            createdAt: block.timestamp
        });

        emit RequestPosted(requestId, msg.sender, amount, validUntil);
    }

    /// @notice Borrower cancels their own open request
    /// @dev    All Open offers for this request are Invalidated and refundable
    /// @param requestId  ID of the request to cancel
    function cancelRequest(uint256 requestId) external nonReentrant {
        Request storage req = requests[requestId];
        if (req.borrower != msg.sender)      revert NotRequestOwner();
        if (req.status != RequestStatus.Open) revert RequestNotOpen();

        req.status = RequestStatus.Cancelled;
        emit RequestCancelled(requestId, msg.sender);

        // Invalidate all open offers for this request — iterate via offerId
        // Note: we track this via events in Ponder; on-chain we rely on caller
        // to call invalidateOffersForRequest() or offers expire naturally
    }

    /// @notice Lender funds an offer for a specific open request (tCTC locked here)
    /// @dev    msg.value must equal amount exactly
    /// @param requestId    Target request
    /// @param aprBps       Annual interest rate in basis points (max MAX_RATE)
    /// @param durationSecs Loan duration in seconds (max MAX_DURATION)
    /// @param validUntil   Offer expiry timestamp (must be <= request.validUntil)
    /// @return offerId
    function fundOffer(
        uint256 requestId,
        uint256 aprBps,
        uint256 durationSecs,
        uint256 validUntil
    ) external payable nonReentrant returns (uint256 offerId) {
        Request storage req = requests[requestId];

        if (req.status != RequestStatus.Open)        revert RequestNotOpen();
        if (block.timestamp >= req.validUntil)        revert AlreadyExpired();
        if (req.borrower == msg.sender)               revert CannotSelfDeal();
        if (aprBps == 0)                              revert InvalidRate();
        if (aprBps > MAX_RATE)                        revert RateExceedsLimit();
        if (durationSecs == 0)                        revert InvalidDuration();
        if (durationSecs > MAX_DURATION)              revert DurationExceedsLimit();
        if (validUntil <= block.timestamp)            revert InvalidExpiry();
        if (validUntil > req.validUntil)              revert InvalidExpiry();
        if (msg.value != req.amount)                  revert WrongFundingAmount();

        offerId = _nextOfferId++;
        offers[offerId] = Offer({
            id:          offerId,
            requestId:   requestId,
            lender:      msg.sender,
            amount:      req.amount,
            aprBps:      aprBps,
            durationSecs:durationSecs,
            validUntil:  validUntil,
            status:      OfferStatus.Open,
            createdAt:   block.timestamp
        });

        emit OfferFunded(offerId, requestId, msg.sender, req.amount, aprBps, durationSecs, validUntil);
    }

    /// @notice Borrower accepts one offer → loan created, tCTC sent to borrower
    /// @dev    All other Open offers for the same request become Invalidated (refundable)
    ///         Only borrower of the request can call this
    /// @param offerId  The offer to accept
    /// @return loanId
    function acceptOffer(uint256 offerId) external nonReentrant returns (uint256 loanId) {
        Offer storage offer = offers[offerId];
        if (offer.status != OfferStatus.Open)                revert OfferNotOpen();
        if (block.timestamp > offer.validUntil)              revert AlreadyExpired();

        Request storage req = requests[offer.requestId];
        if (req.borrower != msg.sender)                      revert NotRequestOwner();
        if (req.status != RequestStatus.Open)                revert RequestNotOpen();
        if (block.timestamp > req.validUntil)                revert AlreadyExpired();

        // ── Calculate repayDue (simple interest, fixed at creation) ──
        uint256 interest = (offer.amount * offer.aprBps * offer.durationSecs)
                           / (BPS * SECONDS_PER_YEAR);
        uint256 repayDue = offer.amount + interest;
        uint256 dueTime  = block.timestamp + offer.durationSecs;

        // ── Effects ─────────────────────────────────────────────────
        offer.status = OfferStatus.Accepted;
        req.status   = RequestStatus.Matched;

        loanId = _nextLoanId++;
        loans[loanId] = Loan({
            id:          loanId,
            borrower:    req.borrower,
            lender:      offer.lender,
            principal:   offer.amount,
            repayDue:    repayDue,
            dueTime:     dueTime,
            status:      LoanStatus.Active,
            repaidOnTime:false,
            createdAt:   block.timestamp
        });

        emit OfferAccepted(offerId, loanId);
        emit LoanCreated(loanId, req.borrower, offer.lender, offer.amount, repayDue, dueTime);

        // ── Interactions ─────────────────────────────────────────────
        // Transfer principal to borrower
        (bool sent,) = req.borrower.call{value: offer.amount}("");
        if (!sent) revert TransferFailed();
    }

    /// @notice Borrower rejects an offer → offer becomes refundable
    /// @param offerId  ID of the offer to reject
    function rejectOffer(uint256 offerId) external {
        Offer storage offer = offers[offerId];
        Request storage req = requests[offer.requestId];

        if (req.borrower != msg.sender)      revert NotRequestOwner();
        if (offer.status != OfferStatus.Open) revert OfferNotOpen();

        offer.status = OfferStatus.Rejected;
        _accrueRefund(offer.lender, offer.amount);

        emit OfferRejected(offerId);
    }

    /// @notice Invalidate a single open offer after its request was cancelled or matched
    /// @dev    Callable by anyone — permissionless cleanup
    /// @param offerId  ID of the offer to invalidate
    function invalidateOffer(uint256 offerId) external {
        Offer storage offer = offers[offerId];
        if (offer.status != OfferStatus.Open) revert OfferNotOpen();

        Request storage req = requests[offer.requestId];
        // Only invalidatable if request is no longer Open
        if (req.status == RequestStatus.Open) revert RequestNotOpen();

        offer.status = OfferStatus.Invalidated;
        _accrueRefund(offer.lender, offer.amount);

        emit OfferInvalidated(offerId);
    }

    /// @notice Expire a request that has passed its validUntil timestamp
    /// @dev    Callable by anyone
    /// @param requestId  ID of the request to expire
    function expireRequest(uint256 requestId) external {
        Request storage req = requests[requestId];
        if (req.status != RequestStatus.Open)         revert RequestNotOpen();
        if (block.timestamp <= req.validUntil)        revert NotExpiredYet();

        req.status = RequestStatus.Expired;
        emit RequestExpired(requestId);
    }

    /// @notice Expire an offer that has passed its validUntil timestamp
    /// @dev    Callable by anyone. Accrues refund to lender.
    /// @param offerId  ID of the offer to expire
    function expireOffer(uint256 offerId) external {
        Offer storage offer = offers[offerId];
        if (offer.status != OfferStatus.Open)         revert OfferNotOpen();
        if (block.timestamp <= offer.validUntil)      revert NotExpiredYet();

        offer.status = OfferStatus.Expired;
        _accrueRefund(offer.lender, offer.amount);

        emit OfferExpired(offerId);
    }

    // ═══════════════════════════════════════════════════════════
    //  MECHANISM B — PUBLIC OFFER (LENDER FIRST, FCFS + MIN SCORE)
    // ═══════════════════════════════════════════════════════════

    /// @notice Lender posts a public offer with locked tCTC and a minimum credit score gate
    /// @dev    msg.value must equal amount. First borrower with score >= minCreditScore wins (FCFS).
    /// @param amount           Loan principal in wei
    /// @param aprBps           Annual interest rate in basis points
    /// @param durationSecs     Loan duration in seconds
    /// @param validUntil       Offer expiry timestamp
    /// @param minCreditScore   Borrower must have oracle score >= this value
    /// @return offerId
    function postPublicOffer(
        uint256 amount,
        uint256 aprBps,
        uint256 durationSecs,
        uint256 validUntil,
        uint256 minCreditScore
    ) external payable returns (uint256 offerId) {
        if (amount == 0)                    revert InvalidAmount();
        if (amount > MAX_AMOUNT)            revert AmountExceedsLimit();
        if (aprBps == 0)                    revert InvalidRate();
        if (aprBps > MAX_RATE)              revert RateExceedsLimit();
        if (durationSecs == 0)              revert InvalidDuration();
        if (durationSecs > MAX_DURATION)    revert DurationExceedsLimit();
        if (validUntil <= block.timestamp)  revert InvalidExpiry();
        if (msg.value != amount)            revert WrongFundingAmount();

        offerId = _nextPublicOfferId++;
        publicOffers[offerId] = PublicOffer({
            id:             offerId,
            lender:         msg.sender,
            amount:         amount,
            aprBps:         aprBps,
            durationSecs:   durationSecs,
            validUntil:     validUntil,
            minCreditScore: minCreditScore,
            status:         PublicOfferStatus.Open,
            createdAt:      block.timestamp
        });

        emit PublicOfferPosted(offerId, msg.sender, amount, aprBps, durationSecs, validUntil, minCreditScore);
    }

    /// @notice Borrower takes a public offer if their credit score meets the minimum
    /// @dev    Score is checked real-time via oracle at moment of call (no grace period).
    ///         FCFS — first qualified borrower wins.
    /// @param offerId  ID of the public offer to take
    /// @return loanId
    function takeOffer(uint256 offerId) external nonReentrant returns (uint256 loanId) {
        PublicOffer storage po = publicOffers[offerId];

        if (po.status != PublicOfferStatus.Open)      revert PublicOfferNotOpen();
        if (block.timestamp > po.validUntil)          revert AlreadyExpired();
        if (po.lender == msg.sender)                  revert CannotSelfDeal();

        // ── Credit score gate (real-time oracle check) ────────────
        uint256 score = oracle.getScore(msg.sender);
        if (score < po.minCreditScore)                revert ScoreTooLow();

        // ── Calculate repayDue ────────────────────────────────────
        uint256 interest = (po.amount * po.aprBps * po.durationSecs)
                           / (BPS * SECONDS_PER_YEAR);
        uint256 repayDue = po.amount + interest;
        uint256 dueTime  = block.timestamp + po.durationSecs;

        // ── Effects ───────────────────────────────────────────────
        po.status = PublicOfferStatus.Taken;

        loanId = _nextLoanId++;
        loans[loanId] = Loan({
            id:          loanId,
            borrower:    msg.sender,
            lender:      po.lender,
            principal:   po.amount,
            repayDue:    repayDue,
            dueTime:     dueTime,
            status:      LoanStatus.Active,
            repaidOnTime:false,
            createdAt:   block.timestamp
        });

        emit PublicOfferTaken(offerId, loanId, msg.sender);
        emit LoanCreated(loanId, msg.sender, po.lender, po.amount, repayDue, dueTime);

        // ── Interactions ──────────────────────────────────────────
        (bool sent,) = msg.sender.call{value: po.amount}("");
        if (!sent) revert TransferFailed();
    }

    /// @notice Lender cancels their own open public offer → refundable
    /// @param offerId  ID of the public offer to cancel
    function cancelPublicOffer(uint256 offerId) external {
        PublicOffer storage po = publicOffers[offerId];
        if (po.lender != msg.sender)                  revert NotPublicOfferOwner();
        if (po.status != PublicOfferStatus.Open)      revert PublicOfferNotOpen();

        po.status = PublicOfferStatus.Cancelled;
        _accrueRefund(po.lender, po.amount);

        emit PublicOfferCancelled(offerId);
    }

    /// @notice Expire a public offer that has passed its validUntil timestamp
    /// @dev    Callable by anyone. Accrues refund to lender.
    /// @param offerId  ID of the public offer to expire
    function expirePublicOffer(uint256 offerId) external {
        PublicOffer storage po = publicOffers[offerId];
        if (po.status != PublicOfferStatus.Open)      revert PublicOfferNotOpen();
        if (block.timestamp <= po.validUntil)         revert NotExpiredYet();

        po.status = PublicOfferStatus.Expired;
        _accrueRefund(po.lender, po.amount);

        emit PublicOfferExpired(offerId);
    }

    // ═══════════════════════════════════════════════════════════
    //  MECHANISM C — ACTIVE LOANS
    // ═══════════════════════════════════════════════════════════

    /// @notice Borrower repays an active loan in full
    /// @dev    msg.value must be >= repayDue. Excess is refunded to borrower.
    ///         repaidOnTime = true if called before or on dueTime.
    /// @param loanId  ID of the loan to repay
    function repay(uint256 loanId) external payable nonReentrant {
        Loan storage loan = loans[loanId];

        if (loan.status != LoanStatus.Active)        revert LoanNotActive();
        if (loan.borrower != msg.sender)             revert NotBorrower();
        if (msg.value < loan.repayDue)               revert InsufficientRepayment();

        // ── Effects ───────────────────────────────────────────────
        loan.status       = LoanStatus.Repaid;
        loan.repaidOnTime = block.timestamp <= loan.dueTime;

        address lender    = loan.lender;
        uint256 repayDue  = loan.repayDue;
        uint256 excess    = msg.value - repayDue;

        emit LoanRepaid(loanId, msg.sender, loan.repaidOnTime);

        // ── Interactions ──────────────────────────────────────────
        (bool sentToLender,) = lender.call{value: repayDue}("");
        if (!sentToLender) revert TransferFailed();

        if (excess > 0) {
            (bool refunded,) = msg.sender.call{value: excess}("");
            if (!refunded) revert TransferFailed();
        }
    }

    /// @notice Mark an active loan as defaulted after its deadline
    /// @dev    Callable by anyone after dueTime passes.
    ///         tCTC is not recovered (unsecured loan) — credit score penalty handled by Ponder.
    /// @param loanId  ID of the loan to mark as defaulted
    function markDefault(uint256 loanId) external {
        Loan storage loan = loans[loanId];

        if (loan.status != LoanStatus.Active)        revert LoanNotActive();
        if (block.timestamp <= loan.dueTime)         revert DeadlineNotPassed();

        loan.status = LoanStatus.Defaulted;

        emit LoanDefaulted(loanId, loan.borrower, loan.lender);
    }

    // ═══════════════════════════════════════════════════════════
    //  REFUND WITHDRAWAL
    // ═══════════════════════════════════════════════════════════

    /// @notice Lender withdraws all pending refunds in one call
    /// @dev    Withdrawal pattern — safe against reentrancy.
    ///         Refunds accumulate from: rejected offers, invalidated offers,
    ///         expired offers, cancelled/expired public offers.
    function withdrawRefund() external nonReentrant {
        uint256 amount = pendingRefunds[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        // ── Effects before interaction ────────────────────────────
        pendingRefunds[msg.sender] = 0;

        emit RefundWithdrawn(msg.sender, amount);

        // ── Interaction ───────────────────────────────────────────
        (bool sent,) = msg.sender.call{value: amount}("");
        if (!sent) revert TransferFailed();
    }

    // ═══════════════════════════════════════════════════════════
    //  INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════

    /// @dev Adds amount to lender's pending refund balance and emits event
    function _accrueRefund(address lender, uint256 amount) internal {
        pendingRefunds[lender] += amount;
        emit RefundAccrued(lender, amount);
    }

    // ═══════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    function totalRequests()     external view returns (uint256) { return _nextRequestId - 1; }
    function totalOffers()       external view returns (uint256) { return _nextOfferId - 1; }
    function totalPublicOffers() external view returns (uint256) { return _nextPublicOfferId - 1; }
    function totalLoans()        external view returns (uint256) { return _nextLoanId - 1; }

    function getRepayDue(uint256 loanId) external view returns (uint256) {
        return loans[loanId].repayDue;
    }

    function getPendingRefund(address lender) external view returns (uint256) {
        return pendingRefunds[lender];
    }

    // ═══════════════════════════════════════════════════════════
    //  FALLBACK
    // ═══════════════════════════════════════════════════════════

    receive() external payable {}
}
