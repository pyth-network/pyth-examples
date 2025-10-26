// "use client";
// import Link from "next/link";

// export function Navbar() {
//   return (
//     <header className="relative px-8 sm:px-20 py-8" data-animate>
//       <div className="relative mx-auto max-w-7xl lg:max-w-8xl flex items-center justify-between gap-8">
//         <div className="flex items-center gap-3">
//           <div className="w-7 h-7 rounded-full border border-white/30" />
//           <h1 className="font-extrabold text-[20px] sm:text-[22px] tracking-wide">
//             ENTROPY ARCADE
//           </h1>
//         </div>
//         <nav className="hidden md:block">
//           <ul className="flex items-center gap-3">
//             <li>
//               <Link className="nav-pill active" href="#home">
//                 Home
//               </Link>
//             </li>
//             <li>
//               <Link className="nav-pill" href="#games">
//                 Games
//               </Link>
//             </li>
//             <li>
//               <Link className="nav-pill" href="#golive">
//                 Go Live
//               </Link>
//             </li>
//             <li>
//               <Link className="nav-pill" href="#profile">
//                 Profile
//               </Link>
//             </li>
//           </ul>
//         </nav>
//       </div>
//     </header>
//   );
// }

// src/components/Navbar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

  const link = (href: string, label: string) => {
    const isActive =
      href === "/" ? pathname === "/" : pathname.startsWith(href); // e.g. /games, /games/...

    return (
      <Link
        href={href}
        className={`nav-pill ${isActive ? "active" : ""}`}
        prefetch
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="relative px-8 sm:px-20 py-8" data-animate>
      <div className="relative mx-auto max-w-7xl lg:max-w-8xl flex items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full border border-white/30" />
          <h1 className="font-extrabold text-[20px] sm:text-[22px] tracking-wide">
            ENTROPY ARCADE
          </h1>
        </div>
        <nav className="hidden md:block">
          <ul className="flex items-center gap-3">
            <li>{link("/", "Home")}</li>
            <li>{link("/games", "Games")}</li>
            <li>{link("/golive", "Go Live")}</li>
            <li>{link("/profile", "Profile")}</li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
