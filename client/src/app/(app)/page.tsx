import { redirect } from "next/navigation";

export default function AppGroupRootRedirect() {
  redirect("/settings");
}