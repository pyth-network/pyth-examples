import user1 from "@/app/assets/Leaderboard/user1.svg"
import user2 from "@/app/assets/Leaderboard/user2.svg"
import user3 from "@/app/assets/Leaderboard/user3.svg"
import { StaticImageData } from "next/image";
export interface LeaderboardUser {
  id: string;
  name?: string;
  address: string;
  profileImage: StaticImageData; // URL or emoji/avatar identifier
  rafflesJoined: number;
  rafflesWon: number;
  totalSpent: string; // In PYUSD
  winRate: number; // Percentage
  rank: number;
}

export const leaderboardUsers: LeaderboardUser[] = [
  {
    id: '1',
    name: 'CryptoKing',
    address: '0x1234...5678',
    profileImage: user1,
    rafflesJoined: 45,
    rafflesWon: 12,
    totalSpent: '450 PYUSD',
    winRate: 26.67,
    rank: 1,
  },
  {
    id: '2',
    name: 'LuckyWhale',
    address: '0x2345...6789',
    profileImage: user2,
    rafflesJoined: 38,
    rafflesWon: 9,
    totalSpent: '380 PYUSD',
    winRate: 23.68,
    rank: 2,
  },
  {
    id: '3',
    address: '0x3456...7890',
    profileImage: user3,
    rafflesJoined: 52,
    rafflesWon: 11,
    totalSpent: '520 PYUSD',
    winRate: 21.15,
    rank: 3,
  },
  {
    id: '4',
    name: 'RaffleChamp',
    address: '0x4567...8901',
    profileImage: user3,
    rafflesJoined: 29,
    rafflesWon: 6,
    totalSpent: '290 PYUSD',
    winRate: 20.69,
    rank: 4,
  },
  {
    id: '5',
    name: 'DiamondHands',
    address: '0x5678...9012',
    profileImage: user2,
    rafflesJoined: 41,
    rafflesWon: 8,
    totalSpent: '410 PYUSD',
    winRate: 19.51,
    rank: 5,
  },
  {
    id: '6',
    address: '0x6789...0123',
    profileImage: user1,
    rafflesJoined: 33,
    rafflesWon: 6,
    totalSpent: '330 PYUSD',
    winRate: 18.18,
    rank: 6,
  },
  {
    id: '7',
    name: 'MoonShot',
    address: '0x7890...1234',
    profileImage: user1,
    rafflesJoined: 27,
    rafflesWon: 4,
    totalSpent: '270 PYUSD',
    winRate: 14.81,
    rank: 7,
  },
  {
    id: '8',
    name: 'RaffleNinja',
    address: '0x8901...2345',
    profileImage: user2,
    rafflesJoined: 36,
    rafflesWon: 5,
    totalSpent: '360 PYUSD',
    winRate: 13.89,
    rank: 8,
  },
  {
    id: '9',
    address: '0x9012...3456',
    profileImage: user3,
    rafflesJoined: 22,
    rafflesWon: 3,
    totalSpent: '220 PYUSD',
    winRate: 13.64,
    rank: 9,
  },
  {
    id: '10',
    name: 'TicketMaster',
    address: '0x0123...4567',
    profileImage: user1,
    rafflesJoined: 31,
    rafflesWon: 4,
    totalSpent: '310 PYUSD',
    winRate: 12.90,
    rank: 10,
  },
  {
    id: '11',
    address: '0x1111...5555',
    profileImage: user2,
    rafflesJoined: 19,
    rafflesWon: 2,
    totalSpent: '190 PYUSD',
    winRate: 10.53,
    rank: 11,
  },
  {
    id: '12',
    name: 'GoldenTicket',
    address: '0x2222...6666',
    profileImage: user2,
    rafflesJoined: 25,
    rafflesWon: 2,
    totalSpent: '250 PYUSD',
    winRate: 8.00,
    rank: 12,
  },
  {
    id: '13',
    address: '0x3333...7777',
    profileImage: user3,
    rafflesJoined: 18,
    rafflesWon: 1,
    totalSpent: '180 PYUSD',
    winRate: 5.56,
    rank: 13,
  },
  {
    id: '14',
    name: 'RafflePro',
    address: '0x4444...8888',
    profileImage: user1,
    rafflesJoined: 15,
    rafflesWon: 1,
    totalSpent: '150 PYUSD',
    winRate: 6.67,
    rank: 14,
  },
  {
    id: '15',
    address: '0x5555...9999',
    profileImage: user2,
    rafflesJoined: 12,
    rafflesWon: 1,
    totalSpent: '120 PYUSD',
    winRate: 8.33,
    rank: 15,
  },
];

/**
 * Get user by address
 * @param address - User's wallet address
 * @returns LeaderboardUser object or undefined
 */
export const getUserByAddress = (address: string): LeaderboardUser | undefined => {
  return leaderboardUsers.find(user => user.address.toLowerCase() === address.toLowerCase());
};

/**
 * Get top N users
 * @param n - Number of top users to retrieve
 * @returns Array of top N users
 */
export const getTopUsers = (n: number): LeaderboardUser[] => {
  return leaderboardUsers.slice(0, n);
};

/**
 * Get user rank by address
 * @param address - User's wallet address
 * @returns Rank number or null if not found
 */
export const getUserRank = (address: string): number | null => {
  const user = getUserByAddress(address);
  return user ? user.rank : null;
};
