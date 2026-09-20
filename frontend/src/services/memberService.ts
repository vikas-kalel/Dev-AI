import { request } from "./api.js";
import { ProjectMember, ProjectRole } from "../types/member.js";

export const memberService = {
  async listMembers(
    projectId: string,
  ): Promise<{ success: boolean; members: ProjectMember[] }> {
    return request<{ success: boolean; members: ProjectMember[] }>(
      `/projects/${projectId}/members`,
      {
        method: "GET",
      },
    );
  },

  async addMember(
    projectId: string,
    email: string,
    role: ProjectRole,
  ): Promise<{
    success: boolean;
    type: "MEMBERSHIP" | "INVITATION";
    data: any;
  }> {
    return request<{
      success: boolean;
      type: "MEMBERSHIP" | "INVITATION";
      data: any;
    }>(`/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  },

  async changeRole(
    projectId: string,
    userId: string,
    role: ProjectRole,
  ): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      `/projects/${projectId}/members/${userId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      },
    );
  },

  async removeMember(
    projectId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      `/projects/${projectId}/members/${userId}`,
      {
        method: "DELETE",
      },
    );
  },

  async getInvitation(
    token: string,
  ): Promise<{ success: boolean; invitation: any }> {
    return request<{ success: boolean; invitation: any }>(
      `/invitations/${token}`,
      {
        method: "GET",
      },
    );
  },

  async acceptInvitation(
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      `/invitations/${token}/accept`,
      {
        method: "POST",
      },
    );
  },

  async resendInvitation(
    invitationId: string,
  ): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      `/invitations/${invitationId}/resend`,
      {
        method: "POST",
      },
    );
  },

  async revokeInvitation(
    invitationId: string,
  ): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      `/invitations/${invitationId}/revoke`,
      {
        method: "POST",
      },
    );
  },
};
