// Fireflies.ai GraphQL client
// Docs: https://docs.fireflies.ai/graphql-api/query

const FIREFLIES_GRAPHQL_URL = "https://api.fireflies.ai/graphql";

export interface FirefliesTranscript {
  id: string;
  title: string;
  date: string;
  duration: number;
  transcript_url?: string;
  sentences: Array<{
    text: string;
    speaker_name: string | null;
    start_time?: number;
  }>;
}

export interface FirefliesUser {
  user_id: string;
  email: string;
  name: string;
}

export class FirefliesClient {
  constructor(private apiKey: string) {}

  private async query<T>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<T> {
    const res = await fetch(FIREFLIES_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Fireflies API error ${res.status}: ${text.slice(0, 200)}`
      );
    }

    const json = (await res.json()) as {
      data?: T;
      errors?: Array<{ message: string }>;
    };

    if (json.errors && json.errors.length > 0) {
      throw new Error(
        `Fireflies GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`
      );
    }

    if (!json.data) {
      throw new Error("Fireflies returned no data");
    }

    return json.data;
  }

  async getCurrentUser(): Promise<FirefliesUser> {
    const data = await this.query<{ user: FirefliesUser }>(
      `query { user { user_id email name } }`
    );
    return data.user;
  }

  async listTranscripts(params: {
    limit?: number;
    skip?: number;
    fromDate?: string; // ISO date
    toDate?: string;
  }): Promise<FirefliesTranscript[]> {
    const data = await this.query<{ transcripts: FirefliesTranscript[] }>(
      `query Transcripts($limit: Int, $skip: Int, $fromDate: DateTime, $toDate: DateTime) {
        transcripts(limit: $limit, skip: $skip, fromDate: $fromDate, toDate: $toDate) {
          id
          title
          date
          duration
          transcript_url
          sentences {
            text
            speaker_name
            start_time
          }
        }
      }`,
      {
        limit: params.limit ?? 25,
        skip: params.skip ?? 0,
        fromDate: params.fromDate,
        toDate: params.toDate,
      }
    );
    return data.transcripts ?? [];
  }
}

export function transcriptToText(
  sentences: FirefliesTranscript["sentences"]
): string {
  return sentences
    .map((s) => {
      const speaker = s.speaker_name ?? "Speaker";
      return `${speaker}: ${s.text}`;
    })
    .join("\n");
}
