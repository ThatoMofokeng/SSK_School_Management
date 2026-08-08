type LogLevel = "error" | "warn" | "info";

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: string;
  error?: unknown;
  data?: Record<string, unknown>;
}

function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (error == null) return undefined;
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

function writeLog(payload: LogPayload) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: payload.level,
    message: payload.message,
    ...(payload.context ? { context: payload.context } : {}),
    ...(payload.data ? { data: payload.data } : {}),
    ...(payload.error ? { error: serializeError(payload.error) } : {}),
  };

  const line = JSON.stringify(entry);

  if (payload.level === "error") {
    console.error(line);
  } else if (payload.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function logError(
  message: string,
  error?: unknown,
  context?: string,
  data?: Record<string, unknown>
) {
  writeLog({ level: "error", message, context, error, data });
}

export function logWarn(
  message: string,
  context?: string,
  data?: Record<string, unknown>
) {
  writeLog({ level: "warn", message, context, data });
}
