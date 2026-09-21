import { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthLayout } from "@/components/layout/AuthLayout";

export const metadata: Metadata = {
  title: "Create an Account | TixGo",
  description: "Sign up for TixGo to start booking tickets for top events and concerts in your area.",
};

export default function RegisterPage() {
  return (
    <AuthLayout maxWidth="xl">
      <RegisterForm />
    </AuthLayout>
  );
}
