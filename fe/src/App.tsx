import { Router, Route } from "wouter";
import { RequireAuth } from "@auth";
import HomePage from "@pages/home";
import LoginPage from "@pages/login";
import RegisterPage from "@pages/register";
import NewWorkoutPage from "@pages/workouts/new";
import EditWorkoutPage from "@pages/workouts/edit";
import SettingsPage from "@pages/settings";
import StatsPage from "@pages/stats";
import WorkoutsPage from "@pages/workouts";
import SessionHistoryPage from "@pages/sessionhistory";
import SessionPage from "@pages/sessions";
import "./App.css";

function App() {
  return (
    <Router>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/workouts/new">
        <RequireAuth>
          <NewWorkoutPage />
        </RequireAuth>
      </Route>
      <Route path="/workouts/:id/edit">
        <RequireAuth>
          <EditWorkoutPage />
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
      <Route path="/workouts">
        <RequireAuth>
          <WorkoutsPage />
        </RequireAuth>
      </Route>
      <Route path="/stats">
        <RequireAuth>
          <StatsPage />
        </RequireAuth>
      </Route>
      <Route path="/session-history">
        <RequireAuth>
          <SessionHistoryPage />
        </RequireAuth>
      </Route>
      <Route path="/sessions/:sessionId">
        <RequireAuth>
          <SessionPage />
        </RequireAuth>
      </Route>
      <Route path="/">
        <RequireAuth>
          <HomePage />
        </RequireAuth>
      </Route>
    </Router>
  );
}

export default App;
