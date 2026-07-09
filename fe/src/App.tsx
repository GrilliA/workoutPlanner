import { Router, Route } from "wouter";
import { RequireAuth } from "@auth";
import HomePage from "@pages/home";
import LoginPage from "@pages/login";
import RegisterPage from "@pages/register";
import "./App.css";

function App() {
  return (
    <Router>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/">
        <RequireAuth>
          <HomePage />
        </RequireAuth>
      </Route>
    </Router>
  );
}

export default App;
