import { ApolloClient, InMemoryCache, gql } from "@apollo/client";

export const ponderClient = new ApolloClient({
  uri: '/api/graphql',
  cache: new InMemoryCache(),
});

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
        borrower
        totalScore
        tier
      }
    }
  }
`;

export const GET_SCORE = gql`
  query GetScore($address: String!) {
    creditScore(address: $address) {
      address
      totalScore
      onChainScore
      realWorldScore
      tier
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
`

export const GET_MARKET = gql`
  query GetMarket {
    bidOrders(where: { status: "OPEN" }, limit: 50) {
      items {
        id
        lender
        amount
        interestRate
        duration
        createdAt
      }
    }
    askOrders(where: { status: "OPEN" }, limit: 50) {
      items {
        id
        borrower
        amount
        createdAt
      }
    }
  }
`;

export const GET_LEADERBOARD = gql`
  query GetLeaderboard {
    creditScores(limit: 20, orderBy: "totalScore", orderDirection: "desc") {
      items {
        address
        totalScore
        tier
        lastUpdated
      }
    }
  }
`
