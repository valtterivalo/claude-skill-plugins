/**
 * @fileoverview Linear API client wrapper using the official SDK.
 * Provides a clean interface for issues, projects, teams, and other entities.
 */

import { LinearClient } from "@linear/sdk";
import type {
  LinearConfig,
  IssueResult,
  ProjectResult,
  TeamResult,
  UserResult,
  CycleResult,
  LabelResult,
  CommentResult,
  PRIORITY_LABELS,
} from "./types.ts";
import { isIssueIdentifier } from "./validation.ts";

const priorityLabels: Record<number, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

export function createLinearClient(config: LinearConfig) {
  const client = new LinearClient({ apiKey: config.apiKey });

  async function issueToResult(issue: Awaited<ReturnType<typeof client.issue>>): Promise<IssueResult> {
    const state = await issue.state;
    const assignee = await issue.assignee;
    const team = await issue.team;
    const labelsConn = await issue.labels();

    return {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description ?? undefined,
      priority: issue.priority,
      priorityLabel: priorityLabels[issue.priority] ?? "Unknown",
      state: (() => {
        if (!state) throw new Error("Issue state not found");
        return { id: state.id, name: state.name, type: state.type };
      })(),
      assignee: assignee ? {
        id: assignee.id,
        name: assignee.name,
        email: assignee.email,
      } : undefined,
      team: (() => {
        if (!team) throw new Error("Issue team not found");
        return { id: team.id, key: team.key, name: team.name };
      })(),
      labels: labelsConn.nodes.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
      })),
      url: issue.url,
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
    };
  }

  return {
    issues: {
      async list(options?: {
        teamId?: string;
        teamKey?: string;
        assigneeId?: string;
        stateId?: string;
        first?: number;
      }): Promise<IssueResult[]> {
        const filter: Record<string, unknown> = {};

        if (options?.teamId) {
          filter.team = { id: { eq: options.teamId } };
        } else if (options?.teamKey) {
          filter.team = { key: { eq: options.teamKey } };
        }

        if (options?.assigneeId) {
          filter.assignee = { id: { eq: options.assigneeId } };
        }

        if (options?.stateId) {
          filter.state = { id: { eq: options.stateId } };
        }

        const issues = await client.issues({
          filter: Object.keys(filter).length > 0 ? filter : undefined,
          first: options?.first ?? 50,
        });

        const results: IssueResult[] = [];
        for (const issue of issues.nodes) {
          results.push(await issueToResult(issue));
        }
        return results;
      },

      async search(query: string, first = 50): Promise<IssueResult[]> {
        const issues = await client.searchIssues(query, { first });
        const results: IssueResult[] = [];
        for (const issue of issues.nodes) {
          results.push(await issueToResult(issue));
        }
        return results;
      },

      async get(idOrIdentifier: string): Promise<IssueResult> {
        let issue;
        if (isIssueIdentifier(idOrIdentifier)) {
          const issues = await client.issues({
            filter: { identifier: { eq: idOrIdentifier } },
            first: 1,
          });
          if (issues.nodes.length === 0) {
            throw new Error(`Issue not found: ${idOrIdentifier}`);
          }
          issue = issues.nodes[0];
        } else {
          issue = await client.issue(idOrIdentifier);
        }

        if (!issue) {
          throw new Error(`Issue not found: ${idOrIdentifier}`);
        }

        return issueToResult(issue);
      },

      async create(options: {
        teamId: string;
        title: string;
        description?: string;
        priority?: number;
        stateId?: string;
        assigneeId?: string;
        labelIds?: string[];
        cycleId?: string;
      }): Promise<{ id: string; identifier: string; url: string }> {
        const result = await client.createIssue({
          teamId: options.teamId,
          title: options.title,
          description: options.description,
          priority: options.priority,
          stateId: options.stateId,
          assigneeId: options.assigneeId,
          labelIds: options.labelIds,
          cycleId: options.cycleId,
        });

        const issue = await result.issue;
        if (!issue) throw new Error("Failed to create issue");

        return {
          id: issue.id,
          identifier: issue.identifier,
          url: issue.url,
        };
      },

      async update(
        issueId: string,
        updates: {
          title?: string;
          description?: string;
          priority?: number;
          stateId?: string;
          assigneeId?: string;
          labelIds?: string[];
          cycleId?: string;
        }
      ): Promise<{ id: string; identifier: string }> {
        const result = await client.updateIssue(issueId, updates);
        const issue = await result.issue;
        if (!issue) throw new Error("Failed to update issue");

        return {
          id: issue.id,
          identifier: issue.identifier,
        };
      },

      async archive(issueId: string): Promise<{ success: boolean }> {
        const result = await client.archiveIssue(issueId);
        return { success: result.success };
      },

      async assign(issueId: string, assigneeId: string): Promise<{ id: string; identifier: string }> {
        return this.update(issueId, { assigneeId });
      },

      async addLabel(issueId: string, labelId: string): Promise<{ success: boolean }> {
        const issue = await client.issue(issueId);
        if (!issue) throw new Error("Issue not found");

        const existingLabels = await issue.labels();
        const labelIds = [...existingLabels.nodes.map((l) => l.id), labelId];

        await client.updateIssue(issueId, { labelIds });
        return { success: true };
      },

      async setCycle(issueId: string, cycleId: string): Promise<{ id: string; identifier: string }> {
        return this.update(issueId, { cycleId });
      },
    },

    projects: {
      async list(first = 50): Promise<ProjectResult[]> {
        const projects = await client.projects({ first });
        return projects.nodes.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description ?? undefined,
          state: p.state,
          progress: p.progress,
          targetDate: p.targetDate ?? undefined,
          url: p.url,
        }));
      },

      async get(projectId: string): Promise<ProjectResult> {
        const project = await client.project(projectId);
        if (!project) throw new Error("Project not found");

        return {
          id: project.id,
          name: project.name,
          description: project.description ?? undefined,
          state: project.state,
          progress: project.progress,
          targetDate: project.targetDate ?? undefined,
          url: project.url,
        };
      },

      async createUpdate(
        projectId: string,
        body: string,
        health: "onTrack" | "atRisk" | "offTrack"
      ): Promise<{ id: string }> {
        const result = await client.createProjectUpdate({
          projectId,
          body,
          health,
        });

        const update = await result.projectUpdate;
        if (!update) throw new Error("Failed to create project update");

        return { id: update.id };
      },
    },

    teams: {
      async list(): Promise<TeamResult[]> {
        const teams = await client.teams();
        const results: TeamResult[] = [];

        for (const team of teams.nodes) {
          const states = await team.states();
          results.push({
            id: team.id,
            key: team.key,
            name: team.name,
            description: team.description ?? undefined,
            states: states.nodes.map((s) => ({
              id: s.id,
              name: s.name,
              type: s.type,
              color: s.color,
              position: s.position,
            })),
          });
        }

        return results;
      },

      async get(teamId: string): Promise<TeamResult> {
        const team = await client.team(teamId);
        if (!team) throw new Error("Team not found");

        const states = await team.states();
        return {
          id: team.id,
          key: team.key,
          name: team.name,
          description: team.description ?? undefined,
          states: states.nodes.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            color: s.color,
            position: s.position,
          })),
        };
      },
    },

    comments: {
      async list(issueId: string): Promise<CommentResult[]> {
        const issue = await client.issue(issueId);
        if (!issue) throw new Error("Issue not found");

        const comments = await issue.comments();
        const results: CommentResult[] = [];

        for (const comment of comments.nodes) {
          const user = await comment.user;
          if (!user) throw new Error("Comment author not found");
          results.push({
            id: comment.id,
            body: comment.body,
            createdAt: comment.createdAt.toISOString(),
            user: { id: user.id, name: user.name },
          });
        }

        return results;
      },

      async create(issueId: string, body: string): Promise<{ id: string }> {
        const result = await client.createComment({
          issueId,
          body,
        });

        const comment = await result.comment;
        if (!comment) throw new Error("Failed to create comment");

        return { id: comment.id };
      },
    },

    users: {
      async me(): Promise<UserResult> {
        const viewer = await client.viewer;
        return {
          id: viewer.id,
          name: viewer.name,
          email: viewer.email,
          displayName: viewer.displayName,
          avatarUrl: viewer.avatarUrl ?? undefined,
          admin: viewer.admin,
        };
      },

      async list(teamId?: string): Promise<UserResult[]> {
        let users;
        if (teamId) {
          const team = await client.team(teamId);
          if (!team) throw new Error("Team not found");
          users = await team.members();
        } else {
          users = await client.users();
        }

        return users.nodes.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl ?? undefined,
          admin: u.admin,
        }));
      },
    },

    cycles: {
      async list(teamId: string): Promise<CycleResult[]> {
        const team = await client.team(teamId);
        if (!team) throw new Error("Team not found");

        const cycles = await team.cycles();
        return cycles.nodes.map((c) => ({
          id: c.id,
          name: c.name ?? undefined,
          number: c.number,
          startsAt: c.startsAt.toISOString(),
          endsAt: c.endsAt.toISOString(),
          progress: c.progress,
          issueCountHistory: c.issueCountHistory,
        }));
      },

      async get(cycleId: string): Promise<CycleResult> {
        const cycle = await client.cycle(cycleId);
        if (!cycle) throw new Error("Cycle not found");

        return {
          id: cycle.id,
          name: cycle.name ?? undefined,
          number: cycle.number,
          startsAt: cycle.startsAt.toISOString(),
          endsAt: cycle.endsAt.toISOString(),
          progress: cycle.progress,
          issueCountHistory: cycle.issueCountHistory,
        };
      },
    },

    labels: {
      async list(teamId?: string): Promise<LabelResult[]> {
        let labels;
        if (teamId) {
          const team = await client.team(teamId);
          if (!team) throw new Error("Team not found");
          labels = await team.labels();
        } else {
          labels = await client.issueLabels();
        }

        return labels.nodes.map((l) => ({
          id: l.id,
          name: l.name,
          color: l.color,
          description: l.description ?? undefined,
        }));
      },
    },
  };
}

export type LinearClientWrapper = ReturnType<typeof createLinearClient>;
