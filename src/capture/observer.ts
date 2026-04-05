import { ClaimDatabase } from "../storage/sqlite";
import { classifyObservation } from "./classifier";
import { isPrivate } from "./privacy";
import { ulid } from "../shared/ulid";

interface CaptureInput {
  session_id: string;
  tool_name: string;
  file_path: string | null;
  content: string;
  repo: string | null;
  branch: string | null;
}

interface ObserverConfig {
  private_patterns: string[];
  skip_tools: string[];
  max_observation_length: number;
}

export class Observer {
  constructor(
    private db: ClaimDatabase,
    private config: ObserverConfig
  ) {}

  capture(input: CaptureInput): string | null {
    if (this.config.skip_tools.includes(input.tool_name)) return null;

    const id = ulid();
    const { type, category } = classifyObservation(
      input.tool_name,
      input.file_path,
      input.content
    );
    const isPrivateObs = isPrivate(
      input.file_path,
      input.content,
      this.config.private_patterns
    );
    const truncated =
      input.content.length > this.config.max_observation_length
        ? input.content.slice(0, this.config.max_observation_length)
        : input.content;

    this.db.insertObservation({
      id,
      session_id: input.session_id,
      timestamp: new Date().toISOString(),
      type,
      category,
      tool_name: input.tool_name,
      file_path: input.file_path,
      content: truncated,
      compressed: null,
      repo: input.repo,
      branch: input.branch,
      is_swept: false,
      is_private: isPrivateObs,
    });

    return id;
  }
}
