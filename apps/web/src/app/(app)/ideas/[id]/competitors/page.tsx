import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CompetitorsPage({ params }: Props) {
  const { id } = await params;
  redirect(`/ideas/${id}`);
}
