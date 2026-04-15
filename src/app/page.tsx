import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PinGate } from "@/components/PinGate";

export default async function LoginPage() {
  const authed = await isAuthenticated();
  if (authed) {
    redirect("/dashboard");
  }

  return <PinGate />;
}
