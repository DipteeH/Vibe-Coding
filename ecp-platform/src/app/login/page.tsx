import { LoginPanel } from "@/components/auth/login-panel";
import { isGoogleAuthConfigured } from "@/lib/auth";

export default function LoginPage() {
  return <LoginPanel googleEnabled={isGoogleAuthConfigured()} />;
}