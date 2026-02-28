import { ApolloClient, InMemoryCache, gql } from "@apollo/client";

export const ponderClient = new ApolloClient({
  uri: '/api/graphql',
  cache: new InMemoryCache(),
});

// ─── Dashboard ───────────────────────────────────────────────
export const GET_STATS = gql`
  query GetStats {
    deals(limit: 1000) {
      items {
        id
        amount
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
    bidOrders(limit: 50) {
      items {
        id
        orderId
        lender
        amount
        currency
        interestRate
        duration
        status
        createdAt
      }
    }
    askOrders(limit: 50) {
      items {
        id
        orderId
        borrower
        amount
        currency
        status
        createdAt
      }
    }
    deals(limit: 100, orderBy: "startTime", orderDirection: "desc") {
      items {
        id
        dealId
        bidId
        askId
        borrower
        lender
        amount
        currency
        interestRate
        duration
        startTime
        deadline
        repaymentDue
        status
        repaidOnTime
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