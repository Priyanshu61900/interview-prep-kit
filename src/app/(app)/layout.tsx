import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import { UserModel } from "@/lib/models/User";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const userId = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!userId) redirect("/login");

  await connectToDatabase();
  const user = await UserModel.findById(userId).lean();
  if (!user) redirect("/login"); // session valid but account no longer exists

  return (
    <div className="flex min-h-svh flex-col">
      <AppNav email={user.email} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
