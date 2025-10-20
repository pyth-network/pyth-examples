"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet } from "@/components/wagmi/components/wallet";
import { BuyTicket } from "./components/buy-ticket";
import { MyTickets } from "./components/my-tickets";
import { LotteryStatus } from "./components/lottery-status";

export default function Home() {
  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Pyth Entropy Lottery</h1>
        <p className="text-muted-foreground mt-2">
          A provably fair lottery powered by verifiable randomness
        </p>
      </div>

      <Wallet />

      <LotteryStatus />

      <Tabs defaultValue="buy" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="buy">Buy Tickets</TabsTrigger>
          <TabsTrigger value="tickets">My Tickets</TabsTrigger>
        </TabsList>
        <TabsContent value="buy">
          <Card>
            <CardHeader>
              <CardTitle>Buy Lottery Ticket</CardTitle>
              <CardDescription>
                Each ticket draws a unique random number from Pyth Entropy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BuyTicket />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle>Your Tickets</CardTitle>
              <CardDescription>
                View all your lottery tickets and their random numbers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MyTickets />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
