import { StaticImageData } from 'next/image';
import raffleImage1 from "@/app/assets/shoes-jordan.png";
import raffleImage2 from "@/app/assets/lottery.png";
import raffleImage3 from "@/app/assets/concert.png";

export interface Raffle {
  id: string;
  title: string;
  image: StaticImageData;
  description: string; // HTML format description
  pricePerTicket: string;
  endDate: string; // ISO 8601 format (e.g., "2025-10-20T18:30:00Z")
  totalTickets: number;
  ticketsSold: number;
  participants: number;
  completionPercentage: number; // 0-100
  maxTicketsPerUser: number;
  smartContractAddress: string;
}

export const raffles: Raffle[] = [
  {
    id: '123',
    title: 'The Golden Phoenix',
    image: raffleImage1,
    description: `
      <div>
        <p><strong>Win exclusive Air Jordan sneakers!</strong></p>
        <p>These limited edition sneakers are a must-have for any collector. Featuring premium materials and iconic design.</p>
        <ul>
          <li>Brand new, never worn</li>
          <li>Authentic with verification</li>
          <li>Size: US 10</li>
          <li>Retail value: $500</li>
        </ul>
      </div>
    `,
    pricePerTicket: '10 PYUSD',
    endDate: '2025-10-20T18:30:00Z', // Example: October 20, 2025 at 6:30 PM UTC
    totalTickets: 1000,
    ticketsSold: 650,
    participants: 425,
    completionPercentage: 65,
    maxTicketsPerUser: 20,
    smartContractAddress: '0x1234567890123456789012345678901234567890',
  },
  {
    id: '234',
    title: 'Mystic Dragon Egg',
    image: raffleImage2,
    description: `
      <div>
        <p><strong>Enter for a chance to win the grand lottery prize!</strong></p>
        <p>This raffle offers an incredible opportunity to win a substantial cash prize of <strong>$10,000</strong>.</p>
        <ul>
          <li>Grand prize: $10,000 PYUSD</li>
          <li>Fair and transparent draw</li>
          <li>Instant payout to winner's wallet</li>
          <li>Verifiable on blockchain</li>
        </ul>
      </div>
    `,
    pricePerTicket: '10 PYUSD',
    endDate: '2025-10-18T23:45:00Z', // Example: October 18, 2025 at 11:45 PM UTC
    totalTickets: 2000,
    ticketsSold: 1850,
    participants: 892,
    completionPercentage: 92.5,
    maxTicketsPerUser: 50,
    smartContractAddress: '0x2345678901234567890123456789012345678901',
  },
  {
    id: '345',
    title: 'Ancient Artifact',
    image: raffleImage3,
    description: `
      <div>
        <p><strong>Win VIP concert tickets to the hottest show of the year!</strong></p>
        <p>Experience the concert of a lifetime with premium seating and backstage access.</p>
        <ul>
          <li>2x VIP tickets included</li>
          <li>Front row seating</li>
          <li>Meet & greet with the artist</li>
          <li>Exclusive merchandise package</li>
          <li>Value: $1,200</li>
        </ul>
      </div>
    `,
    pricePerTicket: '5 PYUSD',
    endDate: '2025-10-19T12:15:00Z', // Example: October 19, 2025 at 12:15 PM UTC
    totalTickets: 500,
    ticketsSold: 180,
    participants: 125,
    completionPercentage: 36,
    maxTicketsPerUser: 10,
    smartContractAddress: '0x3456789012345678901234567890123456789012',
  },
];

/**
 * Helper function to calculate time remaining until raffle end date
 * @param endDate - ISO 8601 format date string
 * @returns Object with days, hours, minutes, seconds
 */
export const calculateTimeRemaining = (endDate: string) => {
  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const difference = end - now;

  if (difference <= 0) {
    return { days: '00', hours: '00', minutes: '00', seconds: '00' };
  }

  const days = String(Math.floor(difference / (1000 * 60 * 60 * 24))).padStart(2, '0');
  const hours = String(Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
  const minutes = String(Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
  const seconds = String(Math.floor((difference % (1000 * 60)) / 1000)).padStart(2, '0');

  return { days, hours, minutes, seconds };
};

/**
 * Get a raffle by ID
 * @param id - Raffle ID
 * @returns Raffle object or undefined
 */
export const getRaffleById = (id: string): Raffle | undefined => {
  return raffles.find(raffle => raffle.id === id);
};

/**
 * Get active raffles (not yet ended)
 * @returns Array of active raffles
 */
export const getActiveRaffles = (): Raffle[] => {
  const now = new Date().getTime();
  return raffles.filter(raffle => new Date(raffle.endDate).getTime() > now);
};

/**
 * Get completed raffles (already ended)
 * @returns Array of completed raffles
 */
export const getCompletedRaffles = (): Raffle[] => {
  const now = new Date().getTime();
  return raffles.filter(raffle => new Date(raffle.endDate).getTime() <= now);
};
