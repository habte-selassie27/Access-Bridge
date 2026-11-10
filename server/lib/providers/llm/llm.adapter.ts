export class GroqAdapter {
  constructor(
    private apiKey: string,
    private model: string = "openai/gpt-oss-120b",
    private options: { retries?: number; baseDelayMs?: number } = {}
  ) {}

  async complete(system: string, user: string, maxTokens: number = 1000): Promise<string> {
    const retries = this.options.retries ?? 0;
    const baseDelayMs = this.options.baseDelayMs ?? 15_000;

    for (let attempt = 0; ; attempt++) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });

      if (res.ok) {
        const json: any = await res.json();
        return json.choices?.[0]?.message?.content || "";
      }

      const txt = await res.text().catch(() => "");
      const canRetry = (res.status === 429 || res.status >= 500) && attempt < retries;
      if (!canRetry) {
        throw new Error(`Groq ${res.status}: ${txt.slice(0, 200)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
    }
  }
}
