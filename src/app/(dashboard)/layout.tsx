import Menu from "@/components/Menu";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";

// These pages render per-signed-in-user, role-filtered data from the
// database via Server Components — they must never be statically
// generated/cached. Without this, Next.js's build-time prerendering pass
// tries to render them anyway, which both risks serving one user's data
// to another and requires a live database connection during the Docker
// build itself (which in turn would mean baking DATABASE_URL into the
// build, something worth avoiding for a system handling learner data).
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen flex">
      {/* LEFT */}
      <div className="w-[14%] md:w-[8%] lg:w-[16%] xl:w-[14%] p-4">
        <Link
          href="/"
          className="flex items-center justify-center lg:justify-start gap-2"
        >
          <Image src="/SSKLogo02.png" alt="SSK School Management logo" width={44} height={44} priority className="object-contain" />
          <span className="hidden lg:block font-bold">SSK Learning</span>
        </Link>
        <Menu />
      </div>
      {/* RIGHT */}
      <div className="w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%] bg-[#F7F8FA] overflow-scroll flex flex-col">
        <Navbar />
        {children}
      </div>
    </div>
  );
}
