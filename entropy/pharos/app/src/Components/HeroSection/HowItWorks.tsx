"use client"
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import pyth from "@/app/assets/HowItWorks/pyth.png"
import community from "@/app/assets/HowItWorks/community.png"
import reward from "@/app/assets/HowItWorks/reward.png"

const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const steps = [
    {
      id: 1,
      title: "JOIN & CONTRIBUTE",
      description: "Add PYUSD to a community pool to enter raffles for exclusive assets and experiences.",
      image: community,
      color: '#f97028', // pharos orange
      angle: 0
    },
    {
      id: 2,
      title: "PROVABLY FAIR SELECTION",
      description: "Winners are selected using Pyth Network's transparent and verifiable Random Number Generator.",
      image: pyth,
      color: '#f3a20f', // pharos yellow
      angle: 120
    },
    {
      id: 3,
      title: "SHARED SUCCESS",
      description: "One winner receives the asset, and the entire process is open and auditable on-chain.",
      image: reward,
      color: '#8b5cf6', // purple
      angle: 240
    }
  ];

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const rotation = useTransform(scrollYProgress, [0, 1], [0, 240]);
  const counterRotation = useTransform(rotation, (r) => -r);

  useEffect(() => {
    const observers = sectionRefs.current.map((ref, index) => {
      if (!ref) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveStep(index);
            }
          });
        },
        {
          threshold: 0.5,
          rootMargin: '-20% 0px -20% 0px'
        }
      );

      observer.observe(ref);
      return observer;
    });

    return () => {
      observers.forEach((observer) => observer?.disconnect());
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full bg-white min-h-screen">
      {/* Main Title - Sticky */}
      <div className="sticky top-0 z-50 bg-white pt-16 pb-4 px-4 md:px-8 lg:px-12">
        <h2 className="text-5xl xl:text-6xl font-rubik font-black uppercase text-center text-black drop-shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
          How it works
        </h2>
      </div>

      {/* Desktop Layout - Fixed Solar System + Scrolling Content */}
      <div className="hidden lg:block">
        <div className="relative max-w-[1600px] mx-auto px-16">
          <div className="flex gap-4 items-start">
            {/* Fixed Left Side - Solar System (Original Design) */}
            <div className="w-1/2 sticky top-32">
              <div className="flex items-center justify-center h-[600px]">
                <div className="relative w-[500px] h-[500px]">
                  {/* Central Circle with "How It Works" */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-white border-6 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-full flex items-center justify-center z-10">
                    <div className="text-center">
                      <div className="text-lg font-rubik font-black uppercase text-black leading-tight">
                        How It<br />Works
                      </div>
                    </div>
                  </div>

                  {/* Orbit Path */}
                  <motion.div
                    className="absolute inset-0"
                    style={{ rotate: rotation }}
                  >
                    <div className="relative w-full h-full">
                      {/* Orbit Ring */}
                      <div className="absolute inset-12 rounded-full border-4 border-dashed border-black opacity-20"></div>

                      {/* Planet Images */}
                      {steps.map((step, index) => {
                        const radius = 180;
                        const angleInRadians = ((step.angle - 90) * Math.PI) / 180;
                        const x = radius * Math.cos(angleInRadians);
                        const y = radius * Math.sin(angleInRadians);

                        return (
                          <motion.div
                            key={step.id}
                            className="absolute top-1/2 left-1/2"
                            style={{
                              x: x,
                              y: y,
                              translateX: '-50%',
                              translateY: '-50%',
                            }}
                          >
                            {/* Counter-rotation for planet to stay upright */}
                            <motion.div
                              style={{ rotate: counterRotation }}
                              className="relative"
                            >
                              {/* Planet Container */}
                              <div
                                className={`w-28 h-28 rounded-full border-6 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] overflow-hidden transition-all duration-500 ${
                                  activeStep === index ? 'scale-125 shadow-[6px_6px_0px_rgba(0,0,0,1)]' : 'scale-100 opacity-70'
                                }`}
                                style={{ backgroundColor: step.color }}
                              >
                                <div className="absolute inset-2 rounded-full border-4 border-black overflow-hidden bg-white">
                                  <Image
                                    src={step.image}
                                    alt={step.title}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              </div>

                              {/* Step Number Badge */}
                              <div
                                className={`absolute -top-2 -right-2 w-10 h-10 border-4 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-center text-lg font-black text-white rounded-lg transition-all duration-500 ${
                                  activeStep === index ? 'scale-125' : 'scale-100'
                                }`}
                                style={{ backgroundColor: '#f97028' }}
                              >
                                {step.id}
                              </div>
                            </motion.div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Scrolling Right Side - Content with Images */}
            <div className="w-1/2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  ref={(el) => { sectionRefs.current[index] = el; }}
                  className="min-h-screen flex items-center py-20 first:pt-0"
                >
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    viewport={{ once: false, amount: 0.5 }}
                    className="w-full"
                  >
                    {/* Main Content Card with Browser Header */}
                    <motion.div
                      className="relative rounded-xl border-6 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] bg-white"
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      {/* Browser Header */}
                      <div className="h-8 bg-gray-200 rounded-t-xl border-b-2 border-black flex items-center px-2 space-x-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full border border-gray-600"></span>
                        <span className="w-3 h-3 bg-yellow-500 rounded-full border border-gray-600"></span>
                        <span className="w-3 h-3 bg-green-500 rounded-full border border-gray-600"></span>
                        <div className="flex-1 bg-white border border-gray-400 rounded-md h-5 ml-4 flex items-center px-2">
                          <span className="text-[10px] font-rubik font-bold text-gray-600">
                            pharos.xyz/{step.title.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}
                          </span>
                        </div>
                      </div>

                      {/* Content Area with Image on Left, Text on Right */}
                      <div className="flex p-8 gap-6">
                        {/* Left Side - Image */}
                        <motion.div
                          className="w-2/5 shrink-0"
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                          viewport={{ once: false, amount: 0.5 }}
                        >
                          <div className="rounded-xl relative h-64 border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] overflow-hidden bg-white">
                            <Image
                              src={step.image}
                              alt={step.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        </motion.div>

                        {/* Right Side - Title and Description */}
                        <div className="flex-1 flex flex-col justify-center space-y-6">
                          {/* Title */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            viewport={{ once: false, amount: 0.5 }}
                          >
                            <div className="rounded-xl inline-block px-6 py-3 border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)]" style={{ backgroundColor: step.color }}>
                              <h3 className="text-2xl font-rubik font-black uppercase text-white">
                                {step.title}
                              </h3>
                            </div>
                          </motion.div>

                          {/* Description */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                            viewport={{ once: false, amount: 0.5 }}
                          >
                            <p className="text-base text-black font-medium font-rubik leading-relaxed">
                              {step.description}
                            </p>
                          </motion.div>

                          {/* Step Counter and Progress */}
                          <motion.div
                            className="space-y-4"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.6 }}
                            viewport={{ once: false, amount: 0.5 }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="rounded-lg w-10 h-10 border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center justify-center text-lg font-black text-white"
                                style={{ backgroundColor: step.color }}
                              >
                                {step.id}
                              </div>
                              <div className='flex flex-col gap-2'>
                              <div className="text-xs font-rubik font-black text-black">
                                STEP {step.id} OF {steps.length}
                              </div>
                              {/* Progress Line */}
                            <div className="relative w-36 h-2 bg-gray-200 rounded-full border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] overflow-hidden">
                              <div
                                className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out"
                                style={{
                                  width: `${((index + 1) / steps.length) * 100}%`,
                                  backgroundColor: step.color
                                }}
                              />
                            </div>
                              </div> 
                            </div>

                            
                          </motion.div>
                        </div>
                      </div>

                      {/* Floating Step Badge */}
                      <div
                        className="absolute rounded-l -top-4 -right-4 w-14 h-14 border-6 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center justify-center text-3xl font-black text-white transform rotate-12 z-20"
                        style={{ backgroundColor: '#f97028' }}
                      >
                        {step.id}
                      </div>
                    </motion.div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden px-4 pb-16 space-y-20">
        {steps.map((step) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, amount: 0.3 }}
            className="space-y-8"
          >
            {/* Solar System Circle */}
            <div className="flex justify-center">
              <div className="relative">
                {/* Orbit Ring */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-72 h-72 rounded-full border-4 border-dashed border-black opacity-20"></div>
                </div>

                {/* Main Circle Container */}
                <div
                  className="relative w-64 h-64 rounded-full border-6 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] overflow-hidden"
                  style={{ backgroundColor: step.color }}
                >
                  {/* Image Container */}
                  <div className="absolute inset-4 rounded-full border-4 border-black overflow-hidden bg-white">
                    <Image
                      src={step.image}
                      alt={step.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                {/* Step Number Badge */}
                <div
                  className="absolute -top-4 -right-4 w-16 h-16 border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center justify-center text-3xl font-black text-white rounded-lg transform rotate-12"
                  style={{ backgroundColor: '#f97028' }}
                >
                  {step.id}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-6">
              <div className="inline-block px-6 py-3 border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] bg-white">
                <h3 className="text-2xl font-rubik font-black uppercase text-black">
                  {step.title}
                </h3>
              </div>
              <div
                className="p-8 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)]"
                style={{ backgroundColor: step.color }}
              >
                <p className="text-lg text-white font-bold font-rubik leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

    </div>
  );
};

export default HowItWorks;