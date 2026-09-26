"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSignInModal } from "../components/SignInModalProvider";

export default function SignInRedirect() {
  const router = useRouter();
  const { open } = useSignInModal();

  useEffect(() => {
    open();
    router.replace("/");
  }, [open, router]);

  return null;
}
