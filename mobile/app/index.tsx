import { Redirect } from "expo-router";
import { useAuth } from "../src/auth";
import { LoadingBlock } from "../src/components/ui";

/** Entry: send authenticated users into tabs, others to login. */
export default function Index() {
  const { status } = useAuth();

  if (status === "loading") {
    return <LoadingBlock />;
  }

  if (status === "authenticated") {
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
