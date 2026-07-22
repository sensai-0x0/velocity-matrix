/**
 * Node 03 — Resolution Feed Executor
 * Endpoint: execute-resolution
 * Gates on deploy/override, commits via GitHub connector, notifies Slack.
 */
import { createClientFromRequest } from "npm:@base44/sdk";
import type {
  ExecutionPayload,
  ExecutionResult,
} from "../../shared/contracts.ts";

/** Validate ExecutionPayload shape */
function isValidPayload(body: unknown): body is ExecutionPayload {
  if (!body || typeof body !== "object") return false;
  const p = body as Record<string, unknown>;
  const actions = ["deploy", "override", "discard"];
  const connectors = ["github_auto_commit", "cli_executor"];
  return (
    typeof p.artifact_id === "string" &&
    typeof p.action_taken === "string" &&
    actions.includes(p.action_taken) &&
    typeof p.target_connector === "string" &&
    connectors.includes(p.target_connector)
  );
}

/** Parse owner/repo from a GitHub HTTPS or SSH URL */
function parseRepo(url: string): { owner: string; repo: string } | null {
  const https = url.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?/i);
  if (!https) return null;
  return { owner: https[1]!, repo: https[2]! };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user?.id) {
      const result: ExecutionResult = {
        success: false,
        error_trace: "MATRIX_DENIED: Unauthenticated executor call.",
      };
      return Response.json(result, { status: 200 });
    }

    const body = await req.json();
    if (!isValidPayload(body)) {
      const result: ExecutionResult = {
        success: false,
        error_trace: "Invalid ExecutionPayload",
      };
      return Response.json(result, { status: 200 });
    }

    // Explicit discard — no connector call
    if (body.action_taken === "discard") {
      await base44.entities.GeneratedSolutions.update(body.artifact_id, {
        has_been_committed: false,
      });
      const result: ExecutionResult = { success: true };
      return Response.json(result, { status: 200 });
    }

    // Gate: only deploy / override proceed to connectors
    if (
      body.action_taken !== "deploy" &&
      body.action_taken !== "override"
    ) {
      const result: ExecutionResult = {
        success: false,
        error_trace: "Execution blocked — deploy or override required.",
      };
      return Response.json(result, { status: 200 });
    }

    const artifact = await base44.entities.GeneratedSolutions.get(
      body.artifact_id,
    );
    if (!artifact) {
      const result: ExecutionResult = {
        success: false,
        error_trace: "Artifact not found under current RLS cell.",
      };
      return Response.json(result, { status: 200 });
    }

    const states = await base44.entities.HackathonState.list();
    const state = states[0] as { target_repo_url?: string } | undefined;
    const repoUrl = state?.target_repo_url;
    if (!repoUrl) {
      const result: ExecutionResult = {
        success: false,
        error_trace:
          "HackathonState.target_repo_url missing — cannot route github_auto_commit.",
      };
      return Response.json(result, { status: 200 });
    }

    const parsed = parseRepo(repoUrl);
    if (!parsed) {
      const result: ExecutionResult = {
        success: false,
        error_trace: `Unparseable target_repo_url: ${repoUrl}`,
      };
      return Response.json(result, { status: 200 });
    }

    const code =
      body.action_taken === "override" && body.modified_code
        ? body.modified_code
        : (artifact.code as string);

    const filePath =
      (artifact.file_path as string | undefined) ??
      `velocity-matrix/${artifact.id}.ts`;

    const commitMessage =
      body.commit_message ??
      `[Velocity Matrix] ${artifact.neural_summary as string}`;

    let deploymentUrl: string | undefined;

    if (body.target_connector === "github_auto_commit") {
      const githubPat = Deno.env.get("GITHUB_PAT");
      if (!githubPat) {
        const result: ExecutionResult = {
          success: false,
          error_trace: "GITHUB_PAT secret not configured.",
        };
        return Response.json(result, { status: 200 });
      }

      // Prefer connector token when registered; fall back to env PAT
      let token = githubPat;
      try {
        const connection = await base44.asServiceRole.connectors.getConnection(
          "github",
        );
        if (connection?.accessToken) {
          token = connection.accessToken;
        }
      } catch {
        // Shared connector optional — env PAT is the scaffold default
      }

      const contentPath = filePath.replace(/^\//, "");
      const apiUrl =
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${contentPath}`;

      // Fetch existing SHA if file exists (required for updates)
      let sha: string | undefined;
      const existing = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "velocity-matrix",
        },
      });
      if (existing.ok) {
        const existingJson = (await existing.json()) as { sha?: string };
        sha = existingJson.sha;
      }

      const putBody: Record<string, string> = {
        message: commitMessage,
        content: btoa(unescape(encodeURIComponent(code))),
        branch: "main",
      };
      if (sha) putBody.sha = sha;

      const putRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "velocity-matrix",
        },
        body: JSON.stringify(putBody),
      });

      if (!putRes.ok) {
        const errText = await putRes.text();
        const result: ExecutionResult = {
          success: false,
          error_trace: `GitHub commit failed (${putRes.status}): ${errText}`,
        };
        return Response.json(result, { status: 200 });
      }

      const putJson = (await putRes.json()) as {
        content?: { html_url?: string };
        commit?: { html_url?: string };
      };
      deploymentUrl =
        putJson.commit?.html_url ?? putJson.content?.html_url ?? repoUrl;
    }

    // Optional Slack notify
    const slackToken = Deno.env.get("SLACK_BOT_TOKEN");
    const slackChannel = Deno.env.get("SLACK_CHANNEL_ID");
    if (slackToken && slackChannel) {
      try {
        await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${slackToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel: slackChannel,
            text: `Velocity Matrix deployed: ${commitMessage}${
              deploymentUrl ? `\n${deploymentUrl}` : ""
            }`,
          }),
        });
      } catch (slackErr) {
        console.warn("[execute-resolution] slack notify failed", slackErr);
      }
    }

    await base44.entities.GeneratedSolutions.update(body.artifact_id, {
      code,
      has_been_committed: true,
      deployment_url: deploymentUrl,
    });

    const result: ExecutionResult = {
      success: true,
      deployment_url: deploymentUrl,
    };
    return Response.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[execute-resolution]", message);
    const result: ExecutionResult = {
      success: false,
      error_trace: message,
    };
    return Response.json(result, { status: 200 });
  }
});
