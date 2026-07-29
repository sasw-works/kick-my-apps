import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#14151a] p-4">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/app"
        appearance={{
          variables: {
            colorPrimary: "#ff4a32",
            colorBackground: "#1c1e26",
            colorInputBackground: "#24262f",
            colorText: "#f5f3ee",
            colorTextSecondary: "#8a8f9c",
            borderRadius: "10px",
          },
        }}
      />
    </main>
  );
}
