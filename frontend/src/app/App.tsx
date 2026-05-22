import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "../theme/ThemeToggle";
import { BillsListPage } from "../features/bills/BillsListPage";
import { IncomeForm } from "../features/income/IncomeForm";
import { RankedBillsView } from "../features/calculation/RankedBillsView";
import { LeftoverSummaryCard } from "../features/calculation/LeftoverSummaryCard";

export function App() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <header className="bg-primary text-primary-foreground shadow-sm">
          <div className="mx-auto flex max-w-screen-xl items-center gap-4 px-4 py-3">
            <h1 className="flex-1 text-lg font-semibold">
              Which To Pay - A Personal Budget App
            </h1>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-screen-2xl px-4 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <IncomeForm />
              <BillsListPage />
            </div>
            <div className="flex flex-col gap-4">
              <LeftoverSummaryCard />
              <RankedBillsView />
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
