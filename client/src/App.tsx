import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { InstallAppPrompt } from "./components/InstallAppPrompt";
import { WorkspaceSyncManager } from "./components/WorkspaceSyncManager";
import { ThemeProvider } from "./contexts/ThemeContext";
import Capture from "./pages/Capture";
import Guide from "./pages/Guide";
import LocalLogin from "./pages/LocalLogin";
import NotFound from "./pages/NotFound";
import Projects from "./pages/Projects";
import Records from "./pages/Records";
import Review from "./pages/Review";
import Today from "./pages/Today";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/login" component={LocalLogin} />
            <Route>
              <WorkspaceSyncManager />
              <InstallAppPrompt />
              <DashboardLayout>
                <Switch>
                  <Route path="/" component={Today} />
                  <Route path="/projects" component={Projects} />
                  <Route path="/records" component={Records} />
                  <Route path="/review" component={Review} />
                  <Route path="/guide" component={Guide} />
                  <Route path="/capture" component={Capture} />
                  <Route component={NotFound} />
                </Switch>
              </DashboardLayout>
            </Route>
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
