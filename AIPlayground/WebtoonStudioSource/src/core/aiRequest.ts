import type { OllamaChatInput, ProjectV4 } from './types.js'

export function createAiRequest(project: Pick<ProjectV4,'title'|'episode'>, model:string, prompt:string, selectedImage?:string, attachImage=false): OllamaChatInput {
  const match=attachImage&&selectedImage ? /^data:image\/(?:png|jpeg|webp|gif);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(selectedImage) : null
  return {model,prompt,projectTitle:project.title,episode:project.episode,images:match?[match[1]]:undefined}
}
