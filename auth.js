import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";
import { verifyEmailCode } from "./app/lib/emailCode";

// Auth.js's Postgres adapter wants a node-postgres Pool; @vercel/postgres already gives us
// the connection string via POSTGRES_URL, so we just point a plain pg Pool at the same DB.
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const adapter = PostgresAdapter(pool);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter,
  // JWT sessions work uniformly for both Google (OAuth) and the email-code sign-in below.
  // The adapter is still used to persist users/accounts (Google links into the same `users`
  // row an email-code sign-in already created, if the email matches).
  session: { strategy: "jwt" },
  providers: [
    Google,
    // "Email me a code": the actual 6-digit code is generated, emailed, and checked by
    // app/lib/emailCode.js (own table, own Resend call) — this provider's only job is to
    // verify the submitted code and hand back/create the matching user record.
    Credentials({
      id: "email-code",
      name: "Email code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const code = credentials?.code?.toString().trim();
        if (!email || !code) return null;

        const ok = await verifyEmailCode(email, code);
        if (!ok) return null;

        let user = await adapter.getUserByEmail(email);
        if (!user) {
          user = await adapter.createUser({ email, emailVerified: new Date() });
        }
        return user;
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.picture;
      }
      return session;
    },
  },
});
