import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb-client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: process.env.MONGODB_DB_NAME || "gpon-dashboard",
  }),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log("1. Authorize called with credentials:", credentials);
          
          // Check if credentials exist
          if (!credentials) {
            console.log("2. No credentials provided");
            return null;
          }
          
          const email = credentials.email as string;
          const password = credentials.password as string;
          
          if (!email || !password) {
            console.log("3. Missing email or password", { email: !!email, password: !!password });
            return null;
          }

          console.log("4. Looking for user:", email);
          
          const client = await clientPromise;
          const db = client.db(process.env.MONGODB_DB_NAME || "gpon-dashboard");
          const usersCollection = db.collection("users");

          const user = await usersCollection.findOne({ email });
          
          if (!user) {
            console.log("5. User not found:", email);
            return null;
          }

          console.log("6. User found:", user.email);
          console.log("7. User has password:", !!user.password);
          
          // Check if password exists in database
          if (!user.password) {
            console.log("8. No password stored for user");
            return null;
          }

          // Compare passwords
          const isValid = await bcrypt.compare(password, user.password);
          
          console.log("9. Password valid:", isValid);
          
          if (!isValid) {
            console.log("10. Invalid password");
            return null;
          }

          console.log("11. Authentication successful!");
          
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role || "viewer",
          };
        } catch (error) {
          console.error("Authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  debug: true,
});