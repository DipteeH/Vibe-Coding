export type UserRole = "USER" | "ADMIN";
export type AuthProvider = "EMAIL" | "GOOGLE" | "PHONE";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  role: UserRole;
}

export interface SessionSummary {
  user: AuthenticatedUser | null;
}