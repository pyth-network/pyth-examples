import LeaderBoard from '@/Components/LeaderBoard/LeaderBoard'
import Navbar from '@/Components/Navbar/Navbar'
import React from 'react'

const page = () => {
  return (
    <div className=" min-h-screen border-4 border-black shadow-[4px_4px_0px_#1a202c] my-10  max-w-[1200px] 2xl:max-w-[1400px] mx-auto bg-white">
       <Navbar />
      <LeaderBoard/>
    </div>
  )
}

export default page
