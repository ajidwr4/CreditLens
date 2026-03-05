import { ApolloClient, InMemoryCache, gql } from "@apollo/client";

export const ponderClient = new ApolloClient({
  uri: '/api/graphql',
  cache: new InMemoryCache(),
});

// ─── Dashboard ───────────────────────────────────────────────
export const GET_STATS = gql`
  query GetStats {
    loans(limit: 1000) {
      items {
        id
        principal
        status
      }
    }
    creditScores(limit: 10, orderBy: "totalScore", orderDirection: "desc") {
      items {
        address
        totalScore
        tier
      }
    }
  }
`;

// ─── Credit Score page ───────────────────────────────────────
export const GET_SCORE = gql`
  query GetScore($address: String!) {
    creditScore(address: $address) {
      address
      totalScore
      onChainScore
      realWorldScore
      tier
      totalLoans
      repaidOnTime
      repaidLate
      defaulted
      totalRealWorldRecords
      lastUpdated
    }
    scoreHistorys(where: { address: $address }, limit: 20, orderBy: "recordedAt") {
      items {
        totalScore
        onChainScore
        realWorldScore
        tier
        recordedAt
      }
    }
  }
`;

// ─── Single credit score (for ScoreCell in market) ───────────
export const GET_CREDIT_SCORE = gql`
  query GetCreditScore($address: String!) {
    creditScore(address: $address) {
      address
      totalScore
      tier
    }
  }
`;

// ─── Market page ─────────────────────────────────────────────
export const GET_MARKET = gql`
  query GetMarket {
    requests(limit: 50, orderBy: "createdAt", orderDirection: "desc") {
      items {
        id
        requestId
        borrower
        amount
        validUntil
        status
        createdAt
      }
    }
    offers(limit: 200, orderBy: "createdAt", orderDirection: "desc") {
      items {
        id
        offerId
        requestId
        lender
        amount
        aprBps
        durationSecs
        validUntil
        status
        createdAt
      }
    }
    publicOffers(limit: 50, orderBy: "createdAt", orderDirection: "desc") {
      items {
        id
        offerId
        lender
        amount
        aprBps
        durationSecs
        validUntil
        minCreditScore
        status
        createdAt
      }
    }
    loans(limit: 100, orderBy: "createdAt", orderDirection: "desc") {
      items {
        id
        loanId
        borrower
        lender
        principal
        repayDue
        dueTime
        status
        repaidOnTime
        createdAt
      }
    }
  }
`;

// ─── Leaderboard ─────────────────────────────────────────────
export const GET_LEADERBOARD = gql`
  query GetLeaderboard {
    creditScores(limit: 20, orderBy: "totalScore", orderDirection: "desc") {
      items {
        address
        totalScore
        onChainScore
        realWorldScore
        tier
        totalLoans
        repaidOnTime
        defaulted
        lastUpdated
      }
    }
  }
`;

// ─── Credit Report page ──────────────────────────────────────
export const GET_REAL_WORLD_RECORDS = gql`
  query GetRealWorldRecords($borrower: String!) {
    realWorldRecords(where: { borrower: $borrower, isDeleted: false }, limit: 50) {
      items {
        id
        recordId
        borrower
        issuerWallet
        issuerName
        amount
        currency
        category
        repaidOnTime
        mintedAt
      }
    }
  }
`;
// ─── Real World Records page (all records, public view) ──────
export const GET_ALL_REAL_WORLD_RECORDS = gql`
  query GetAllRealWorldRecords {
    realWorldRecords(
      where: { isDeleted: false }
      limit: 200
      orderBy: "mintedAt"
      orderDirection: "desc"
    ) {
      items {
        id
        recordId
        borrower
        issuerWallet
        issuerName
        amount
        currency
        category
        repaidOnTime
        evidenceNote
        mintedAt
      }
    }
  }
`;