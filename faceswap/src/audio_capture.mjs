/** Local-only audio bridge from the chosen <video> to MediaRecorder.
 * Reuse the MediaElementAudioSourceNode: one HTMLMediaElement may be connected
 * only once, while each recording gets its own disposable destination track.
 */
const graphs = new WeakMap();

export function prepareAudioCapture(element, environment = globalThis) {
  const Context = environment.AudioContext || environment.webkitAudioContext;
  if (typeof Context !== "function") return null;
  let graph = graphs.get(element);
  if (!graph) {
    const context = new Context();
    const source = context.createMediaElementSource(element);
    // Keep normal preview audio audible when the element is routed via Web Audio.
    source.connect(context.destination);
    graph = {context, source};
    graphs.set(element, graph);
  }
  const destination = graph.context.createMediaStreamDestination();
  graph.source.connect(destination);
  const track = destination.stream.getAudioTracks()[0];
  if (!track) {
    graph.source.disconnect(destination);
    return null;
  }
  let disposed = false;
  return {
    track,
    resume: () => graph.context.resume(),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      graph.source.disconnect(destination);
      track.stop();
    }
  };
}

export function closeAudioCapture(element) {
  const graph = graphs.get(element);
  if (!graph) return;
  graphs.delete(element);
  return graph.context.close();
}
