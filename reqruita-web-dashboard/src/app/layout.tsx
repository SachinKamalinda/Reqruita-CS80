"use client";

import type { Metadata } from "next";
import Image from "next/image"; // Import the Image component
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./globals.css";

// Note: Metadata is only for server-side rendering at the root level
// For client components, we'll need to handle this differently
// Keeping the metadata export for static generation

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Job Forms", href: "/job-forms" },
    { label: "User & Roles", href: "/user-roles" },
    { label: "Sessions", href: "/sessions" },
    { label: "Live Monitor", href: "/live-monitor" },
    { label: "Candidates", href: "/candidates" },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" || pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <html lang="en">
      <head>
        <title>Reqruita Dashboard</title>
        <meta name="description" content="Recruitment Management System" />
        <link rel="icon" href="/ReqruitaLogo.png" />
      </head>
      <body className="bg-gray-50 flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-[#5D20B3] text-white hidden md:flex flex-col p-6">
          <div className="text-2xl font-bold mb-10 flex items-center gap-2">
            {/* Logo Image in the sidebar */}
            <Image
              src="/ReqruitaLogo.png"
              alt="Reqruita Logo"
              width={32}
              height={32}
              className="object-contain"
            />
            Reqruita
          </div>

          <nav className="space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`w-full block text-left py-3 px-4 rounded-lg transition ${
                  isActive(item.href)
                    ? "bg-white text-[#5D20B3] font-semibold"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Nav */}
          <header className="h-16 bg-white border-b flex items-center justify-between px-8">
            <div className="w-96">
              <input
                type="text"
                placeholder="Search"
                className="w-full bg-gray-100 border-none rounded-full px-4 py-2 outline-none focus:ring-2 ring-purple-500 text-black"
              />
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-black">
              B
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-8 text-black">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
