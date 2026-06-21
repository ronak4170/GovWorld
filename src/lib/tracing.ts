// Phoenix (Arize) tracing — OpenTelemetry + OpenInference semantic conventions.
//
// Every traced LLM call becomes a span in Phoenix with the prompt, output, model,
// provider and latency. Spans are exported via OTLP/HTTP to `/v1/traces`, which the
// Vite dev server proxies to the local Phoenix collector (localhost:6006) — this
// keeps the browser request same-origin and sidesteps CORS.
//
// Enabled only when VITE_PHOENIX_TRACING=true (see `npm run live`). In demo mode it
// is a no-op, so nothing changes for the offline judge demo.

import { trace, SpanStatusCode, type Span } from '@opentelemetry/api'
import {
  WebTracerProvider,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-web'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { SemanticConventions } from '@arizeai/openinference-semantic-conventions'

const PROJECT_NAME = 'govworld-council'

export const TRACING_ENABLED =
  typeof window !== 'undefined' &&
  import.meta.env.VITE_PHOENIX_TRACING === 'true'

let initialized = false

function initTracing() {
  if (initialized || !TRACING_ENABLED) return
  initialized = true

  const exporter = new OTLPTraceExporter({
    // Relative URL → Vite proxy → http://localhost:6006/v1/traces (no CORS).
    url: '/v1/traces',
  })

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      // Phoenix groups traces by this resource attribute.
      'openinference.project.name': PROJECT_NAME,
      [ATTR_SERVICE_NAME]: 'govworld',
    }),
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  })

  provider.register()
  // eslint-disable-next-line no-console
  console.info('[Phoenix] tracing enabled → project', PROJECT_NAME)
}

initTracing()

const tracer = () => trace.getTracer('govworld-llm')

export interface LLMSpanMeta {
  input: string
  model: string
  provider: string
  /** Coarse label for filtering in the eval, e.g. "council_argument". */
  surface: string
  system?: string
  /** Extra OpenInference / custom attributes. */
  extra?: Record<string, string | number | boolean>
}

/**
 * Wrap an async LLM call in an OpenInference LLM span. When tracing is disabled
 * the function is invoked directly with zero overhead.
 */
export async function withLLMSpan<T>(
  name: string,
  meta: LLMSpanMeta,
  fn: () => Promise<T>,
  extractOutput: (result: T) => string,
): Promise<T> {
  if (!TRACING_ENABLED) return fn()

  return tracer().startActiveSpan(name, async (span: Span) => {
    span.setAttribute(SemanticConventions.OPENINFERENCE_SPAN_KIND, 'LLM')
    span.setAttribute(SemanticConventions.INPUT_VALUE, meta.input)
    span.setAttribute(SemanticConventions.LLM_MODEL_NAME, meta.model)
    span.setAttribute(SemanticConventions.LLM_PROVIDER, meta.provider)
    span.setAttribute('govworld.surface', meta.surface)
    if (meta.system) span.setAttribute(SemanticConventions.LLM_SYSTEM, meta.system)
    if (meta.extra) {
      for (const [k, v] of Object.entries(meta.extra)) span.setAttribute(k, v)
    }

    try {
      const result = await fn()
      span.setAttribute(SemanticConventions.OUTPUT_VALUE, extractOutput(result))
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (err) {
      span.recordException(err as Error)
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) })
      throw err
    } finally {
      span.end()
    }
  })
}
