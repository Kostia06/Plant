import CircleDetailClient from "./CircleDetailClient";

export const dynamicParams = false;

export async function generateStaticParams() {
  return [{ id: "sample" }];
}

export default async function CircleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CircleDetailClient id={id} />;
}
