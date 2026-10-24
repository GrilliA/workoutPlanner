/** Postgres 23505; Drizzle wraps the driver error, so the code can sit on `cause`. */
export const isUniqueViolation = (error: unknown): boolean => {
  const databaseError = error as {
    code?: string;
    cause?: { code?: string };
  };

  return databaseError?.code === "23505" || databaseError?.cause?.code === "23505";
};
