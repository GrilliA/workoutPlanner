import { Router, Route } from "wouter";
import HomePage from "@pages/home";
import LoginPage from "@pages/login";
import "./App.css";

function App() {
  return (
    <>
      <Router>
        <Route path="/" component={HomePage} />
        <Route path="/login" component={LoginPage} />
      </Router>
    </>
  );
}

export default App;
