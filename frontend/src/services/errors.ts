export type NetworkErrorCode =
  | "timeout"
  | "cancelled"
  | "network"
  | "http"
  | "invalid_json"
  | "invalid_response"
  | "invalid_template"
  | "response_path";

export class NetworkError extends Error {
  constructor(
    message: string,
    readonly code: NetworkErrorCode,
    readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "NetworkError";
  }
}
