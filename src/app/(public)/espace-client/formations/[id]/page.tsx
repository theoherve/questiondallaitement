import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

const Page = async ({ params }: Props) => {
  const { id } = await params;
  redirect(`/espace-client/accompagnements/${id}`);
};

export default Page;
