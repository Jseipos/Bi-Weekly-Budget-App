import { NavBar } from "@/components/NavBar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      {/* Main content: offset for desktop sidebar, bottom padding for mobile tabs */}
      <main className="md:ml-56 pb-20 md:pb-0">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
