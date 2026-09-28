import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";
import { sql } from "@vercel/postgres";
import { verifyEmailCode } from "./app/lib/emailCode";
import { ensureAuthSchema } from "./app/lib/ensureAuthSchema";
import { isAdminEmail } from "./app/lib/isAdmin";

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
    // Same person, either way in. Without this, someone who first signed in with an emailed code and
    // later clicks "Continue with Google" (same address) gets OAuthAccountNotLinked and can't get in.
    // The flag is only safe because Google verifies addresses -- and the signIn callback below
    // refuses any Google login whose email isn't verified, so it can't be used to take over an
    // account by claiming someone else's address.
    Google({ allowDangerousEmailAccountLinking: true }),
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
    async signIn({ account, profile }) {
      if (account?.provider === "google") return profile?.email_verified === true;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        try {
          await ensureAuthSchema();
          await sql`UPDATE users SET last_login = now() WHERE id = ${user.id}`;
        } catch {
          // non-critical, never block sign-in over this
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.picture;
        session.user.isAdmin = isAdminEmail(token.email);
      }
      return session;
    },
  },
});
