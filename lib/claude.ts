import Anthropic from '@anthropic-ai/sdk'

export function getClaudeClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  return new Anthropic({ apiKey })
}
