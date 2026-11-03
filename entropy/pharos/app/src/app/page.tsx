import HeroSection from "@/Components/HeroSection/HeroSection";
import HowItWorks from "@/Components/HeroSection/HowItWorks";
import RaffleSlider from "@/Components/HeroSection/RaffleSlider";
import Navbar from "@/Components/Navbar/Navbar";

export default function Home() {
  return (
    <div className=" min-h-screen border-4 border-black shadow-[4px_4px_0px_#1a202c] my-10  max-w-[1200px] 2xl:max-w-[1400px] mx-auto bg-white">
    <Navbar />
    <HeroSection/>
    <RaffleSlider/>
    <HowItWorks/>
    </div>
  );
}


// #cebfe1
//f97028
// #f3a20f -orange
// #f97028 -red orange