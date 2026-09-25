// src/components/Navbar/Navbar.tsx
"use client"
import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Button from '@/Components/UI/Button';
import logo from "@/app/assets/logo-p.png"
import { TbLogout } from 'react-icons/tb';
import { IoCopy, IoMenu } from 'react-icons/io5';
import { FaWallet } from 'react-icons/fa';
import { FaUser } from 'react-icons/fa';

// Admin wallet addresses from environment variables
const ADMIN_ADDRESSES = process.env.NEXT_PUBLIC_ADMIN_ADDRESSES 
  ? process.env.NEXT_PUBLIC_ADMIN_ADDRESSES.split(',').map(addr => addr.trim())
  : [
    ];


// Base menu items (visible to all users)
const baseMenuItems = [
  { name: 'Raffles', href: '/raffle', color: 'bg-[#f97028]' },
  { name: 'Leaderboard', href: '/leaderboard', color: 'bg-[#f489a3]' },
  { name: 'Rules', href: '/rules', color: 'bg-[#8b5cf6]' },
  { name: 'Profile', href: '/profile', color: 'bg-[#f0bb0d]' },
];

// Admin-only menu item
const adminMenuItem = { name: 'Admin Dashboard', href: '/admin-dashboard', color: 'bg-[#8b5cf6]' };

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  // const [isAdmin, setIsAdmin] = useState(false);
  const [menuItems, setMenuItems] = useState(baseMenuItems);

  const { login, logout, authenticated, user } = usePrivy();

  // Check if user is admin
  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      const userAddress = user.wallet.address.toLowerCase();
      const isUserAdmin = ADMIN_ADDRESSES.some(
        addr => addr.toLowerCase() === userAddress
      );
      // setIsAdmin(isUserAdmin);

      // Update menu items based on admin status
      if (isUserAdmin) {
        setMenuItems([...baseMenuItems, adminMenuItem]);
      } else {
        setMenuItems(baseMenuItems);
      }
    } else {
      // setIsAdmin(false);
      setMenuItems(baseMenuItems);
    }
  }, [authenticated, user]);

  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleWalletClick = () => {
    if (authenticated) {
      setIsWalletMenuOpen(!isWalletMenuOpen);
    } else {
      login();
    }
  };

  const handleCopyAddress = async () => {
    if (user?.wallet?.address) {
      await navigator.clipboard.writeText(user.wallet.address);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDisconnect = () => {
    logout();
    setIsWalletMenuOpen(false);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className="flex font-rubik items-center justify-between p-2 bp-xs:p-4 border-b-4 border-black bg-white relative z-50">
      {/* Logo on the left */}
      <div className="flex items-center">
        <Link href="/" className="flex items-center">
          <Image src={logo} alt="" className='w-40'/>
        </Link>
      </div>

      {/* Menu button in the middle */}
      <div className="hidden md:flex items-center relative">
        <Button
          onClick={handleMenuClick}
          color="pharos-yellow"
          shape="medium-rounded"
          className="cursor-pointer gap-1 px-6 py-2 text-lg flex items-center"
        >
          <IoMenu className='text-2xl'/>
          Menu
        </Button>

        {/* Dropdown Menu - Expands from Center */}
        <div
          className={`absolute top-full mt-4 left-1/2 -translate-x-1/2 transition-all duration-300 ease-out origin-center ${
            isMenuOpen
              ? 'opacity-100 scale-100 visible'
              : 'opacity-0 scale-0 invisible'
          }`}
        >
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-3">
            <div className="flex gap-3">
              {menuItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`${item.color} border-4 border-black px-6 py-3 font-black text-white uppercase tracking-tight
                    shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000]
                    hover:translate-x-[2px] hover:translate-y-[2px]
                    active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                    transition-all duration-100 whitespace-nowrap text-center`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Connect Wallet button on the right */}
      <div className="flex items-center relative">
        <Button
          onClick={handleWalletClick}
          color="pharos-orange"
          shape="full-rounded"
          className="cursor-pointer  md:aspect-auto hidden md:flex justify-center items-center md:px-6 md:py-2 text-lg"
        >
          <span className='hidden md:block'>
          {authenticated && user?.wallet?.address
            ? formatAddress(user.wallet.address)
            : 'Connect Wallet'}
            </span>
        </Button>

        {/* Wallet Dropdown Menu */}
        {authenticated && user?.wallet?.address && (
          <div
            className={`absolute hidden md:block top-full mt-4 right-0 transition-all duration-300 ease-out origin-top ${
              isWalletMenuOpen
                ? 'opacity-100 scale-100 visible'
                : 'opacity-0 scale-0 invisible'
            }`}
          >
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-3 min-w-[240px]">
              <div className="flex flex-col gap-3">
                {/* Copy Address Button */}
                <button
                  onClick={handleCopyAddress}
                  className="bg-[#f3a20f] border-4 border-black px-6 py-3 font-black cursor-pointer text-white uppercase tracking-tight
                    shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000]
                    hover:translate-x-[2px] hover:translate-y-[2px]
                    active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                    transition-all duration-100 text-center text-sm flex items-center justify-center gap-2"
                >
                  <IoCopy className='text-lg'/>
                  {copySuccess ? 'Copied!' : 'Copy Address'}
                </button>

                {/* Disconnect Button */}
                <button
                  onClick={handleDisconnect}
                  className="bg-[#8b5cf6] cursor-pointer border-4 border-black px-6 py-3 font-black text-white uppercase tracking-tight
                    shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000]
                    hover:translate-x-[2px] hover:translate-y-[2px]
                    active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                    transition-all duration-100 text-center text-sm flex items-center justify-center gap-2"
                >
                  <TbLogout className='font-bold text-xl' />
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

<div className='md:hidden flex items-center gap-2'>
  <div className='relative'>
<Button
          onClick={handleWalletClick}
          color="pharos-orange"
          shape="full-rounded"
          className="cursor-pointer aspect-square md:aspect-auto w-4 md:w-auto flex justify-center items-center md:px-6 md:py-2 text-lg"
        >
          {/* <span className='hidden md:block'>
          {authenticated && user?.wallet?.address
            ? formatAddress(user.wallet.address)
            : 'Connect Wallet'}
            </span> */}
            <span className='md:hidden '>{authenticated && user?.wallet?.address ? <FaUser className='text-xl'/> : <FaWallet className='text-xl'/>}</span>
        </Button>
        {authenticated && user?.wallet?.address && (
          <div
            className={`absolute md:hidden top-full mt-4 right-0 transition-all duration-300 ease-out origin-top ${
              isWalletMenuOpen
                ? 'opacity-100 scale-100 visible'
                : 'opacity-0 scale-0 invisible'
            }`}
          >
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-3 min-w-[240px]">
              <div className="flex flex-col gap-3">
                {/* Copy Address Button */}
                <button
                  onClick={handleCopyAddress}
                  className="bg-[#f3a20f] border-4 border-black px-6 py-3 font-black cursor-pointer text-white uppercase tracking-tight
                    shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000]
                    hover:translate-x-[2px] hover:translate-y-[2px]
                    active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                    transition-all duration-100 text-center text-sm flex items-center justify-center gap-2"
                >
                  <IoCopy className='text-lg'/>
                  {copySuccess ? 'Copied!' : 'Copy Address'}
                </button>

                {/* Disconnect Button */}
                <button
                  onClick={handleDisconnect}
                  className="bg-[#8b5cf6] cursor-pointer border-4 border-black px-6 py-3 font-black text-white uppercase tracking-tight
                    shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000]
                    hover:translate-x-[2px] hover:translate-y-[2px]
                    active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                    transition-all duration-100 text-center text-sm flex items-center justify-center gap-2"
                >
                  <TbLogout className='font-bold text-xl' />
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      {/* Mobile Hamburger Menu Button */}
      <div className="md:hidden relative">
        <button
          onClick={handleMenuClick}
          className="text-white text-3xl bg-[#f3a20f] p-1 border-4 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
        >
          <IoMenu/>
        </button>

        {/* Mobile Menu Dropdown */}
        <div
          className={`absolute top-full mt-4 right-0 transition-all duration-300 ease-out origin-top ${
            isMenuOpen
              ? 'opacity-100 scale-100 visible'
              : 'opacity-0 scale-0 invisible'
          }`}
        >
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-3 min-w-[200px]">
            <div className="flex flex-col gap-3">
              {menuItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`${item.color} border-4 border-black px-6 py-3 font-black text-black uppercase tracking-tight
                    shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000]
                    hover:translate-x-[2px] hover:translate-y-[2px]
                    active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                    transition-all duration-100 text-center text-sm`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Overlay to close menus when clicking outside */}
      {(isMenuOpen || isWalletMenuOpen) && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => {
            setIsMenuOpen(false);
            setIsWalletMenuOpen(false);
          }}
        />
      )}
    </nav>
  );
};

export default Navbar;