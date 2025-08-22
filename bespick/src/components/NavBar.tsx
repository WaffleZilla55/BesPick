'use client';

import '@/app/globals.css';
import { useState, useEffect, useRef } from 'react';
import { FaArchive, FaPlus } from 'react-icons/fa';
import Link from 'next/link';
import { ThemeSelect } from './ThemeSelect';

export default function NavBar() {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className='w-full h-16 bg-app shadow flex items-center justify-between'>
      {/* Left: Logo + Company Name */}
      <div className='flex items-center'>
        <img
          src='/logo.png'
          alt='Company Logo'
          className='w-16 h-16 object-cover'
        />
        <span className='text-xl font-bold text-brand hover:text-brand focus:text-brand-secondary  hidden md:inline'>
          BesPick
        </span>
      </div>

      {/* Right: Icons + Profile */}
      <div className='flex items-center space-x-4 relative mr-4'>
        {/* Create Button with Dropdown */}
        <div className='relative' ref={dropdownRef}>
          <button
            onClick={toggleDropdown}
            className='flex items-center justify-center text-brand hover:text-brand focus:text-brand-secondary '
          >
            <FaPlus size={20} />
          </button>
          <div
            className={`absolute right-0 mt-2 whitespace-nowrap bg-app border border-brand rounded shadow-lg z-10 transition-all duration-400 ease-out origin-top ${
              isDropdownOpen
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            <ul className=' text-sm font-bold text-brand'>
              <li className='px-4 py-2 hover:bg-brand hover:text-white cursor-pointer'>
                New Group
              </li>
              <li className='px-4 py-2 hover:bg-brand hover:text-white cursor-pointer'>
                New Event
              </li>
            </ul>
          </div>
        </div>
        <button className='flex items-center justify-center text-brand hover:text-brand focus:text-brand-secondary '>
          <FaArchive size={20} />
        </button>
        {/* Color Theme Selector */}
        <ThemeSelect />
        {/* Profile Image with Link */}
        <Link href='/profile'>
          <img
            src='/profile.jpg'
            alt='User Profile'
            className='w-10 h-10 rounded-full object-cover border-2 border-brand cursor-pointer'
          />
        </Link>
      </div>
    </nav>
  );
}
