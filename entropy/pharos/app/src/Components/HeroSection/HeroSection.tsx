"use client"
import Button from '@/Components/UI/Button'; // Adjusted path to be consistent with previous examples
import Image from 'next/image';
import pharosImage from "@/app/assets/pharos-landing.png"; // Renamed to avoid conflict, good practice
import { FaArrowRight } from 'react-icons/fa6';
import Link from 'next/link';

const HeroSection = () => {
  return (
    <div className="flex flex-col lg:flex-row items-center justify-between py-16 px-8 lg:px-16 bg-white min-h-[600px] border-b-4 border-black">
      <div className="relative z-10 lg:w-1/2 flex flex-col items-start text-left mb-10 lg:mb-0 "> 
        <h1 className="text-5xl xl:text-6xl font-black font-rubik uppercase leading-tight tracking-tighter text-black mb-6 drop-shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
          OWN THE DREAM,<br className='hidden lg:block '/> TOGETHER.
        </h1>
        <p className="text-lg md:text-xl text-gray-800 mb-10 font-medium font-rubik">
          Join transparent, on-chain pools to democratize access to rare assets and experiences.
        </p>
        <Link href="/raffle">
        <Button
          // onClick={() => window.location.href='/raffle'}
          color="pharos-orange" 
          shape="medium-rounded" 
          className="text-base xs:text-lg lg:text-xl px-10 py-4 flex items-center gap-2"
        >
          Explore Raffles <FaArrowRight />
        </Button>
        </Link>
      </div>

      <div className="relative lg:w-1/2 flex justify-center lg:justify-end items-center mt-10 lg:mt-0 lg:p-10">
       
        <div className="relative w-full max-w-lg lg:max-w-none h-auto border-4 border-black bg-white
                        shadow-[8px_8px_0px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden"> 
          <Image
            src={pharosImage}
            alt="Pharos Application Screenshot"
            layout="responsive" 
            width={900}
            height={700} 
            objectFit="cover" 
            className="rounded-lg" 
          />
          <div className="absolute top-0 left-0 w-full h-8 bg-gray-200 border-b-2 border-black flex items-center px-2 space-x-2">
            <span className="w-3 h-3 bg-red-500 rounded-full border border-gray-600"></span>
            <span className="w-3 h-3 bg-yellow-500 rounded-full border border-gray-600"></span>
            <span className="w-3 h-3 bg-green-500 rounded-full border border-gray-600"></span>
            <div className="flex-1 bg-white border border-gray-400 rounded-md h-5 ml-4"></div> 
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;