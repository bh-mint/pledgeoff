import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/server";
import { container } from "@/lib/container";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ideaResult = await container._repos.ideaRepo.findById(id);
  if (ideaResult.isErr() || !ideaResult.value) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const idea = ideaResult.value;
  if (idea.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [decisionResult, signalsResult, simulationResult, landingResult, customersResult, buildResult, competitorsResult] =
    await Promise.all([
      container._repos.decisionRepo.findByIdeaId(id),
      container._repos.signalRepo.findByIdeaId(id),
      container._repos.simulationRepo.findByIdeaId(id),
      container._repos.landingPageRepo.findByIdeaId(id),
      container._repos.customerAnalysisRepo.findByIdeaId(id),
      container._repos.buildAnalysisRepo.findByIdeaId(id),
      container._repos.competitorAnalysisRepo.findByIdeaId(id),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    exportVersion: "1.0",
    idea: {
      id: idea.id,
      text: idea.text,
      createdAt: idea.createdAt,
    },
    decision: decisionResult.isOk() ? decisionResult.value : null,
    signals: signalsResult.isOk() ? signalsResult.value : [],
    simulation: simulationResult.isOk() ? simulationResult.value : null,
    landingPage: landingResult.isOk() ? landingResult.value : null,
    customers: customersResult.isOk() ? customersResult.value : null,
    build: buildResult.isOk() ? buildResult.value : null,
    competitors: competitorsResult.isOk() ? competitorsResult.value : null,
  };

  const filename = `pledgeoff-idea-${id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
