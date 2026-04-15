import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { isAdminSession } from "@/lib/admin/session";

type P = { locale: string } | Promise<{ locale: string }>;

export default async function AdminSectionLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: P }>) {
  const { locale } = await Promise.resolve(params);
  if (!isAdminSession()) {
    redirect(`/${locale}/login?mode=admin&next=admin`);
  }
  return <>{children}</>;
}
