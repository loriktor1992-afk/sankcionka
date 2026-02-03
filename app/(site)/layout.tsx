import Header from "@/components/Header";
import AdminPanel from "@/components/AdminPanel";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminPanel />
      <Header />
      {children}
    </>
  );
}
