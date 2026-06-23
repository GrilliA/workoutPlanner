import { type SubmitEvent } from "react";
import { Link } from "wouter";
import { Input } from "@components/input";
import { Button } from "@components/button";
import "./login.css";

const Login = () => {
  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
  };

  return (
    <main className="login">
      <div className="logo">LOGO</div>
      <form className="form" onSubmit={handleSubmit}>
        <Input.Root>
          <Input.Label>Email</Input.Label>
          <Input.Field
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Input.Root>

        <div className="password">
          <Input.Root>
            <Input.Label>Password</Input.Label>
            <Input.Field
              type="password"
              placeholder="Password"
              autoComplete="current-password"
            />
          </Input.Root>
          <Link href="/forgot-password" className="forgot">
            forgot password?
          </Link>
        </div>

        <Button.Root variant="primary" type="submit" className="submit">
          <Button.Label>Login</Button.Label>
        </Button.Root>
      </form>
    </main>
  );
};

export default Login;
