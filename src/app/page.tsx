import { Header } from "@/components/layout/header";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-7xl space-y-6 p-4 pb-8">
        <DashboardContent />
      </main>
    </div>
  );
}
