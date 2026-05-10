import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ThemeToggle } from "../theme/ThemeToggle";
import { BillsListPage } from "../features/bills/BillsListPage";
import { IncomeForm } from "../features/income/IncomeForm";
import { RankedBillsView } from "../features/calculation/RankedBillsView";
import { LeftoverSummaryCard } from "../features/calculation/LeftoverSummaryCard";

export function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <AppBar position="static" color="primary" enableColorOnDark>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Which To Pay
            </Typography>
            <ThemeToggle />
          </Toolbar>
        </AppBar>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            }}
          >
            <Stack spacing={2}>
              <IncomeForm />
              <BillsListPage />
            </Stack>
            <Stack spacing={2}>
              <LeftoverSummaryCard />
              <RankedBillsView />
            </Stack>
          </Box>
        </Container>
      </Box>
    </LocalizationProvider>
  );
}
