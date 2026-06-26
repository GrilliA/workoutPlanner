import { Router, Route, Switch } from "wouter";
import { AppLayout } from "@layouts/appLayout";
import HomePage from "@pages/home";
import LoginPage from "@pages/login";
import "./App.css";

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route>
          <AppLayout>
            <Switch>
              <Route path="/" component={HomePage} />
            </Switch>
          </AppLayout>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
