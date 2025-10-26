import Navbar from '@/Components/Navbar/Navbar'
import IndividualRaffle from '@/Components/Raffle/IndividualRaffle'
import { notFound } from 'next/navigation'
import React from 'react'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

const page = async ({ params }: PageProps) => {
  const { id } = await params
  
  // Validate that the id looks like a contract address
  if (!id || !id.startsWith('0x') || id.length !== 42) {
    notFound()
  }

  return (
    <div className=" min-h-screen border-4 border-black shadow-[4px_4px_0px_#1a202c] my-10  max-w-[1200px] 2xl:max-w-[1400px] mx-auto bg-white">
        <Navbar/>
      <IndividualRaffle raffleAddress={id} />
    </div>
  )
}

export default page
