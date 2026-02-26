// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract RealWorldCredit {

    // ═══════════════════════════════════════
    // CUSTOM ERRORS
    // ═══════════════════════════════════════

    error InvalidAmount();
    error InvalidIssuerName();
    error InvalidCategory();
    error InvalidCurrency();
    error NotRecordOwner();
    error RecordNotFound();


    // ═══════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════

    struct CreditRecord {
        uint256 recordId;
        address borrower;       // wallet address of the borrower
        address issuerWallet;   // wallet address of whoever minted this record
        string  issuerName;     // human-readable name e.g. "Koperasi Sejahtera"
        uint256 amount;         // loan amount (in smallest unit)
        string  currency;       // e.g. "IDR", "USD", "ETH"
        string  category;       // e.g. "KUR", "KPR", "cooperative", "P2P"
        bool    repaidOnTime;   // true = paid on time, false = late or default
        string  evidenceNote;   // free text description (replaces IPFS for now)
        uint256 mintedAt;       // block timestamp when record was minted
    }


    // ═══════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════

    uint256 private _recordCounter;

    mapping(uint256 => CreditRecord) public records;

    // index records by borrower address
    mapping(address => uint256[]) public borrowerRecords;

    // index records by issuer wallet
    mapping(address => uint256[]) public issuerRecords;


    // ═══════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════

    event RecordMinted(
        uint256 indexed recordId,
        address indexed borrower,
        address indexed issuerWallet,
        string  issuerName,
        uint256 amount,
        string  currency,
        string  category,
        bool    repaidOnTime,
        string  evidenceNote,
        uint256 mintedAt
    );

    event RecordDeleted(
        uint256 indexed recordId,
        address indexed borrower
    );


    // ═══════════════════════════════════════
    // FUNCTIONS
    // ═══════════════════════════════════════

    // anyone can mint a record for any borrower address
    // records are self-reported and unverified — label shown in UI
    function mintRecord(
        address borrower,
        string  memory issuerName,
        uint256 amount,
        string  memory currency,
        string  memory category,
        bool    repaidOnTime,
        string  memory evidenceNote
    ) external returns (uint256) {
        if (amount == 0)                    revert InvalidAmount();
        if (bytes(issuerName).length == 0)  revert InvalidIssuerName();
        if (bytes(category).length == 0)    revert InvalidCategory();
        if (bytes(currency).length == 0)    revert InvalidCurrency();

        _recordCounter++;
        uint256 newId = _recordCounter;

        // EFFECTS
        records[newId] = CreditRecord({
            recordId:     newId,
            borrower:     borrower,
            issuerWallet: msg.sender,
            issuerName:   issuerName,
            amount:       amount,
            currency:     currency,
            category:     category,
            repaidOnTime: repaidOnTime,
            evidenceNote: evidenceNote,
            mintedAt:     block.timestamp
        });

        borrowerRecords[borrower].push(newId);
        issuerRecords[msg.sender].push(newId);

        // INTERACTIONS
        emit RecordMinted(
            newId,
            borrower,
            msg.sender,
            issuerName,
            amount,
            currency,
            category,
            repaidOnTime,
            evidenceNote,
            block.timestamp
        );

        return newId;
    }

    // only the original issuer can delete their own record
    function deleteRecord(uint256 recordId) external {
        CreditRecord storage record = records[recordId];

        if (record.recordId == 0)               revert RecordNotFound();
        if (record.issuerWallet != msg.sender)  revert NotRecordOwner();

        address borrower = record.borrower;

        // EFFECTS — clear the record data
        delete records[recordId];

        // INTERACTIONS
        emit RecordDeleted(recordId, borrower);
    }


    // ═══════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════

    function getRecord(uint256 recordId)
        external view returns (CreditRecord memory) {
        return records[recordId];
    }

    function getBorrowerRecords(address borrower)
        external view returns (uint256[] memory) {
        return borrowerRecords[borrower];
    }

    function getIssuerRecords(address issuer)
        external view returns (uint256[] memory) {
        return issuerRecords[issuer];
    }

    function getTotalRecords()
        external view returns (uint256) {
        return _recordCounter;
    }
}