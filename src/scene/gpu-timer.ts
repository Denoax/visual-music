// Asynchronous GPU elapsed queries; RAF intervals are recorded separately.
export function createGpuTimer(
  context: WebGL2RenderingContext | WebGLRenderingContext,
  enabled: boolean,
) {
  const gl = context as WebGL2RenderingContext;
  const extension =
    enabled && "beginQuery" in context
      ? gl.getExtension("EXT_disjoint_timer_query_webgl2")
      : null;
  const samples: number[] = [];
  let query: WebGLQuery | null = null,
    active = false;
  function begin() {
    if (!extension || gl.isContextLost()) return;
    if (query) {
      const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
      const disjoint = gl.getParameter(extension.GPU_DISJOINT_EXT);
      if (!available && !disjoint) return;
      if (available && !disjoint) {
        samples.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
        if (samples.length > 1800) samples.shift();
      }
      gl.deleteQuery(query);
      query = null;
    }
    query = gl.createQuery();
    if (query) {
      gl.beginQuery(extension.TIME_ELAPSED_EXT, query);
      active = true;
    }
  }
  function end() {
    if (active && extension && !gl.isContextLost())
      gl.endQuery(extension.TIME_ELAPSED_EXT);
    active = false;
  }
  return {
    begin,
    end,
    samples,
    available: !!extension,
    dispose() {
      if (query) gl.deleteQuery(query);
    },
  };
}
