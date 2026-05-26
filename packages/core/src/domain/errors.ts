export class InvalidDomainDataError extends Error {
  readonly code = 'INVALID_DOMAIN_DATA' as const;

  constructor(entity: string, cause: unknown) {
    super(`Invalid ${entity} data from persistence: ${String(cause)}`);
    this.name = 'InvalidDomainDataError';
  }
}
