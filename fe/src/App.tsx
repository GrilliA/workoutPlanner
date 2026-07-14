import { Router, Route } from "wouter";
import { RequireAuth } from "@auth";
import HomePage from "@pages/home";
import LoginPage from "@pages/login";
import RegisterPage from "@pages/register";
import NewWorkoutPage from "@pages/workouts/new";
import WorkoutsPage from "@pages/workouts";
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
      <Route path="/workouts">
        <RequireAuth>
          <WorkoutsPage />
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
