import type { Metadata } from "next";
import Image from "next/image"; // Import the Image component
import "./globals.css";

export const metadata: Metadata = {
  title: "Reqruita Dashboard",
  description: "Recruitment Management System",
  // This adds the logo to your browser tab
  icons: {
    icon: "/ReqruitaLogo.png",
    apple: "/ReqruitaLogo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
            {[
              "Home",
              "Job Forms",
              "User & Roles",
              "Sessions",
              "Live Monitor",
              "Candidates",
            ].map((item) => (
              <button
                key={item}
                className={`w-full text-left py-3 px-4 rounded-lg transition ${
                  item === "Home"
                    ? "bg-white text-[#5D20B3] font-semibold"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {item}
              </button>
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
