import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet } from "@/components/wagmi/components/wallet"
import { Grow } from "./components/grow"
import { Mint } from "./components/mint"

export default function Home() {
  return (
    <>
      <Wallet />

      <Tabs defaultValue="mint" className="flex  w-full flex-col items-center">
        <TabsList className="w-full">
          <TabsTrigger className="w-full" value="mint">
            Mint
          </TabsTrigger>
          <TabsTrigger className="w-full" value="grow">
            Grow
          </TabsTrigger>
        </TabsList>
        <Card className="flex h-[300px] w-full items-center justify-center shadow ">
          <TabsContent value="mint" className="w-full p-6">
            <Mint />
          </TabsContent>
          <TabsContent value="grow" className="w-full p-6">
            <Grow />
          </TabsContent>
        </Card>
      </Tabs>
    </>
  )
}
