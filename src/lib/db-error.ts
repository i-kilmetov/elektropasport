export class DbError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.name = "DbError";
    this.status = status;
    this.code = code;
  }
}

export function dbErrorResponse(error: unknown): Response | null {
  if (error instanceof DbError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  return null;
}
