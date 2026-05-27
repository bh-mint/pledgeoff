import { requireUser } from "@/lib/auth-server";
import { container } from "@/lib/container";
import OttoChat from "@/components/OttoChat";
import { OttoPanel } from "@/components/OttoPanel";

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function IdeaLayout({ children, params }: Props) {
  const { id } = await params;
  const user = await requireUser();

  const [ideaResult, decisionResult] = await Promise.all([
    container.ideaRepo.findById(id),
    container.decisionRepo.findByIdeaId(id),
  ]);

  const idea = ideaResult.isOk() ? ideaResult.value : null;
  const decision = decisionResult.isOk() ? decisionResult.value : null;

  const showOtto = idea && idea.userId === user.id && !!decision;

  return (
    <>
      {children}
      {showOtto && (
        <OttoPanel>
          <OttoChat
            userId={user.id}
            ideaId={id}
            ideaText={idea.text}
            verdict={decision.verdict}
            reasoning={decision.reasoning}
            score={decision.score ?? 0}
          />
        </OttoPanel>
      )}
    </>
  );
}
