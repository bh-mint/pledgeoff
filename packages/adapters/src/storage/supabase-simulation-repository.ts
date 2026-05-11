import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Simulation, SimulationScenario } from '@pledgeoff/core';
import { SimulationRepositoryError, type ISimulationRepository } from '@pledgeoff/core';

type SimulationRow = {
  id: string;
  idea_id: string;
  user_id: string;
  tam_low: number;
  tam_high: number;
  scenarios: SimulationScenario[];
  break_even_months: number;
  assumptions: string[];
  created_at: string;
};

function rowToSimulation(row: SimulationRow): Simulation {
  return {
    id: row.id,
    ideaId: row.idea_id,
    userId: row.user_id,
    tamLow: row.tam_low,
    tamHigh: row.tam_high,
    scenarios: row.scenarios,
    breakEvenMonths: row.break_even_months,
    assumptions: row.assumptions,
    createdAt: row.created_at,
  };
}

export class SupabaseSimulationRepository implements ISimulationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(simulation: Simulation): Promise<Result<Simulation, SimulationRepositoryError>> {
    const { data, error } = await this.client
      .from('simulations')
      .insert({
        id: simulation.id,
        idea_id: simulation.ideaId,
        user_id: simulation.userId,
        tam_low: simulation.tamLow,
        tam_high: simulation.tamHigh,
        scenarios: simulation.scenarios,
        break_even_months: simulation.breakEvenMonths,
        assumptions: simulation.assumptions,
        created_at: simulation.createdAt,
      })
      .select()
      .single<SimulationRow>();

    if (error) return err(new SimulationRepositoryError(error.message));
    return ok(rowToSimulation(data));
  }

  async findByIdeaId(ideaId: string): Promise<Result<Simulation | null, SimulationRepositoryError>> {
    const { data, error } = await this.client
      .from('simulations')
      .select()
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<SimulationRow>();

    if (error) return err(new SimulationRepositoryError(error.message));
    return ok(data ? rowToSimulation(data) : null);
  }
}
