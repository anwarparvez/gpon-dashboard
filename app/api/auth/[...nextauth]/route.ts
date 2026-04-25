import NextAuth from "next-auth";

const handler = NextAuth({
  trustHost: true,   // 🔥 THIS FIXES YOUR ERROR

  providers: [
    // your providers
  ],

  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };