import { Result } from 'neverthrow';
import type { Simulation } from '../domain/simulation';

export class SimulationRepositoryError extends Error {
  readonly code = 'SIMULATION_REPOSITORY_ERROR' as const;
}

export interface ISimulationRepository {
  save(simulation: Simulation): Promise<Result<Simulation, SimulationRepositoryError>>;
  findByIdeaId(ideaId: string): Promise<Result<Simulation | null, SimulationRepositoryError>>;
}
