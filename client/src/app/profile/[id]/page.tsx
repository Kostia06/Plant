import ProfileClient from "./ProfileClient";

export const dynamicParams = false;

export async function generateStaticParams() {
  return [{ id: "sample" }];
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProfileClient id={id} />;
}
