import { Router, Route, Switch } from "wouter";
import { RequireAuth } from "@auth";
import LandingPage from "@pages/landing";
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

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/dashboard">
          <RequireAuth>
            <CoachDashboardPage />
          </RequireAuth>
        </Route>
        <Route path="/analytics">
          <RequireAuth>
            <CoachAnalyticsPage />
          </RequireAuth>
        </Route>
        <Route path="/clients/new">
          <RequireAuth>
            <NewClientPage />
          </RequireAuth>
        </Route>
        <Route path="/clients/:athleteId/programs/:workoutId/edit">
          <RequireAuth>
            <EditClientProgramPage />
          </RequireAuth>
        </Route>
        <Route path="/clients/:athleteId/programs/:workoutId">
          <RequireAuth>
            <ViewClientProgramPage />
          </RequireAuth>
        </Route>
        <Route path="/clients/:id">
          <RequireAuth>
            <ClientDetailPage />
          </RequireAuth>
        </Route>
        <Route path="/clients">
          <RequireAuth>
            <CoachClientsPage />
          </RequireAuth>
        </Route>
        <Route path="/templates/new">
          <RequireAuth>
            <NewTemplatePage />
          </RequireAuth>
        </Route>
        <Route path="/templates/:id/edit">
          <RequireAuth>
            <EditTemplatePage />
          </RequireAuth>
        </Route>
        <Route path="/templates">
          <RequireAuth>
            <TemplatesPage />
          </RequireAuth>
        </Route>
        <Route path="/assignments/new">
          <RequireAuth>
            <NewAssignmentPage />
          </RequireAuth>
        </Route>
        <Route path="/assignments">
          <RequireAuth>
            <AssignmentsPage />
          </RequireAuth>
        </Route>
        <Route path="/settings">
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        </Route>
        <Route path="/profile">
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        </Route>
        <Route path="/" component={LandingPage} />
      </Switch>
    </Router>
  );
}

export default App;
