import { Router, Route, Switch, useLocation } from "wouter";
import { RequireAuth } from "@auth";
import { AppShell } from "@components/appShell";
import { ErrorBoundary } from "@components/errorBoundary";
import RootPage from "@pages/root";
import LoginPage from "@pages/login";
import RegisterPage from "@pages/register";
import SettingsPage from "@pages/settings";
import CoachDashboardPage from "@pages/coach/dashboard";
import CoachAnalyticsPage from "@pages/coach/analytics";
import CoachClientsPage from "@pages/coach/clients";
import NewClientPage from "@pages/coach/clients/new";
import ClientDetailPage from "@pages/coach/clients/detail";
import TemplatesPage from "@pages/coach/templates";
import NewTemplatePage from "@pages/coach/templates/new";
import EditTemplatePage from "@pages/coach/templates/edit";
import AssignmentsPage from "@pages/coach/assignments";
import NewAssignmentPage from "@pages/coach/assignments/new";
import EditClientProgramPage from "@pages/coach/programs/edit";
import ViewClientProgramPage from "@pages/coach/programs/view";

// Web is coach-only. Athletes use mobile/. Coach reuses workouts/new/** for builders.

function AppRoutes() {
  const [location] = useLocation();

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/" component={RootPage} />
      <Route>
        <RequireAuth>
          <AppShell>
            <ErrorBoundary key={location}>
              <Switch>
                <Route path="/dashboard" component={CoachDashboardPage} />
                <Route path="/analytics" component={CoachAnalyticsPage} />
                <Route path="/clients/new" component={NewClientPage} />
                <Route
                  path="/clients/:athleteId/programs/:workoutId/edit"
                  component={EditClientProgramPage}
                />
                <Route
                  path="/clients/:athleteId/programs/:workoutId"
                  component={ViewClientProgramPage}
                />
                <Route path="/clients/:id" component={ClientDetailPage} />
                <Route path="/clients" component={CoachClientsPage} />
                <Route path="/templates/new" component={NewTemplatePage} />
                <Route path="/templates/:id/edit" component={EditTemplatePage} />
                <Route path="/templates" component={TemplatesPage} />
                <Route path="/assignments/new" component={NewAssignmentPage} />
                <Route path="/assignments" component={AssignmentsPage} />
                <Route path="/settings" component={SettingsPage} />
                <Route path="/profile" component={SettingsPage} />
              </Switch>
            </ErrorBoundary>
          </AppShell>
        </RequireAuth>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
