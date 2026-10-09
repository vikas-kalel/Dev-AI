import { Types } from "mongoose";
import { ProjectMembershipModel } from "../models/ProjectMembership.js";
import { OrganizationMembershipModel } from "../models/OrganizationMembership.js";
import { AppError } from "../middleware/errorHandler.js";

/**
 * Ensures a project never reaches 0 active Maintainers.
 * Rejects demotion or removal if the target user is the last active Maintainer.
 */
export async function assertNotLastMaintainer(
  projectId: string | Types.ObjectId,
  targetUserId: string | Types.ObjectId,
): Promise<void> {
  const pId = new Types.ObjectId(projectId);
  const uId = new Types.ObjectId(targetUserId);

  const activeMaintainers = await ProjectMembershipModel.find({
    projectId: pId,
    role: "MAINTAINER",
    status: "ACTIVE",
  });

  const isTargetMaintainer = activeMaintainers.some((m) =>
    m.userId.equals(uId),
  );

  if (isTargetMaintainer && activeMaintainers.length <= 1) {
    throw new AppError(
      "LAST_MAINTAINER",
      "This project must retain at least one Maintainer. Assign another Maintainer first.",
      400,
    );
  }
}

/**
 * Ensures an organization never reaches 0 active Admins.
 * Rejects demotion or removal if the target user is the last active Admin.
 */
export async function assertNotLastAdmin(
  organizationId: string | Types.ObjectId,
  targetUserId: string | Types.ObjectId,
): Promise<void> {
  const oId = new Types.ObjectId(organizationId);
  const uId = new Types.ObjectId(targetUserId);

  const activeAdmins = await OrganizationMembershipModel.find({
    organizationId: oId,
    role: "ADMIN",
    status: "ACTIVE",
  });

  const isTargetAdmin = activeAdmins.some((m) => m.userId.equals(uId));

  if (isTargetAdmin && activeAdmins.length <= 1) {
    throw new AppError(
      "LAST_ADMIN",
      "This organization must retain at least one Admin. Assign another Admin first.",
      400,
    );
  }
}
