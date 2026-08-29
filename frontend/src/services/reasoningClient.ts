import { SERVICE_ENDPOINTS } from "../constants/api";
import type {
  AnalyzeRequest, AnalyzeResponse, EvaluateRequest, EvaluateResponse, GenerateRequest,
  GenerateResponse, RecommendRequest, RecommendResponse,
} from "../models";
import { isAnalyzeResponse, isEvaluateResponse, isGenerateResponse, isRecommendResponse } from "../validation/guards";
import { postJson } from "./http";

export class ReasoningClient {
  constructor(private readonly fetcher: typeof fetch = fetch, private readonly timeoutMs = 30_000) {}

  generate(request: GenerateRequest, signal?: AbortSignal): Promise<GenerateResponse> {
    return postJson(SERVICE_ENDPOINTS.generate, request, { fetcher: this.fetcher, timeoutMs: this.timeoutMs, signal, guard: isGenerateResponse, operation: "Test generation" });
  }
  evaluate(request: EvaluateRequest, signal?: AbortSignal): Promise<EvaluateResponse> {
    return postJson(SERVICE_ENDPOINTS.evaluate, request, { fetcher: this.fetcher, timeoutMs: this.timeoutMs, signal, guard: isEvaluateResponse, operation: "Response evaluation" });
  }
  analyze(request: AnalyzeRequest, signal?: AbortSignal): Promise<AnalyzeResponse> {
    return postJson(SERVICE_ENDPOINTS.analyze, request, { fetcher: this.fetcher, timeoutMs: this.timeoutMs, signal, guard: isAnalyzeResponse, operation: "Failure analysis" });
  }
  recommend(request: RecommendRequest, signal?: AbortSignal): Promise<RecommendResponse> {
    return postJson(SERVICE_ENDPOINTS.recommend, request, { fetcher: this.fetcher, timeoutMs: this.timeoutMs, signal, guard: isRecommendResponse, operation: "Follow-up recommendation" });
  }
}
