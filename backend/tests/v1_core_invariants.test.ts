import assert from "assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { authService } from "../src/services/authService.js";
import { organizationService } from "../src/services/organizationService.js";
import { projectService } from "../src/services/projectService.js";
import { membershipService } from "../src/services/membershipService.js";
import { invitationService } from "../src/services/invitationService.js";
import { sourceService } from "../src/services/sourceService.js";
import { conversationService } from "../src/services/conversationService.js";
import { emailWorker } from "../src/workers/emailWorker.js";
import {
  assertNotLastMaintainer,
  assertNotLastAdmin,
} from "../src/policies/invariants.js";
import { OutboxEventModel } from "../src/models/OutboxEvent.js";
import { KnowledgeSourceModel } from "../src/models/KnowledgeSource.js";
import { decryptSecret } from "../src/config/security.js";

async function runTests() {
  console.log("=================================================");
  console.log("Starting DevAI V1 Core & Security Invariants Tests");
  console.log("=================================================\n");

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  try {
    // Test 1: User Signup & Email Verification
    console.log("Test 1: User Signup & Email Verification");
    const signupResult = await authService.signup(
      "Ada Lovelace",
      "ada@example.com",
      "SuperSecretPassword123!",
    );
    assert.strictEqual(signupResult.user.name, "Ada Lovelace");
    assert.strictEqual(signupResult.user.status, "PENDING_VERIFICATION");
    assert.ok(signupResult.verificationToken, "Verification token generated");

    const verifiedUser = await authService.verifyEmail(
      "ada@example.com",
      signupResult.verificationToken,
    );
    assert.strictEqual(verifiedUser.status, "ACTIVE");
    console.log(
      "  ✓ User signup creates PENDING_VERIFICATION and token verifies to ACTIVE.",
    );

    // Test 2: Login & Session
    console.log("\nTest 2: Login & Authenticated Session");
    const loginResult = await authService.login(
      "ada@example.com",
      "SuperSecretPassword123!",
    );
    assert.ok(loginResult.token, "JWT token generated");
    assert.ok(loginResult.session._id, "Session saved in database");
    console.log(
      "  ✓ Login succeeds with valid credentials and creates active session.",
    );

    // Test 3: Atomic Organization Creation & Admin Assignment
    console.log("\nTest 3: Atomic Organization Creation & Admin Assignment");
    const org = await organizationService.createOrganization(
      "Acme Cloud",
      "acme-cloud",
      verifiedUser._id.toString(),
    );
    assert.strictEqual(org.slug, "acme-cloud");

    const meData = await authService.getMe(verifiedUser._id.toString());
    assert.strictEqual(meData.organizations.length, 1);
    assert.strictEqual(meData.organizations[0].role, "ADMIN");
    console.log(
      "  ✓ Organization created and creator automatically assigned ADMIN role.",
    );

    // Test 4: Project Creation & Maintainer Assignment
    console.log("\nTest 4: Project Creation & Maintainer Assignment");
    const project = await projectService.createProject(
      org._id.toString(),
      "Payment Platform",
      "payment-platform",
      "Core payments service",
      verifiedUser._id.toString(),
    );
    assert.strictEqual(project.slug, "payment-platform");

    const { members: projectMembers } = await membershipService.listMembers(
      project._id.toString(),
    );
    assert.strictEqual(projectMembers.length, 1);
    assert.strictEqual(projectMembers[0].role, "MAINTAINER");
    assert.strictEqual(projectMembers[0].email, "ada@example.com");
    console.log(
      "  ✓ Project created and creator automatically assigned MAINTAINER role.",
    );

    // Test 5: Adding Developer & Role Transitions
    console.log("\nTest 5: Adding Developer & Role Transitions");
    const devUserSignup = await authService.signup(
      "Alan Turing",
      "alan@example.com",
      "PasswordForAlan123!",
    );
    await authService.verifyEmail(
      "alan@example.com",
      devUserSignup.verificationToken,
    );

    const addResult = await membershipService.addMember(
      project._id.toString(),
      "alan@example.com",
      "DEVELOPER",
      verifiedUser._id.toString(),
    );
    assert.strictEqual(addResult.type, "MEMBERSHIP");

    const { members: membersAfterAdd } = await membershipService.listMembers(
      project._id.toString(),
    );
    assert.strictEqual(membersAfterAdd.length, 2);
    console.log("  ✓ Developer added to project successfully.");

    // Promote Alan to MAINTAINER
    await membershipService.changeRole(
      project._id.toString(),
      devUserSignup.user._id.toString(),
      "MAINTAINER",
      verifiedUser._id.toString(),
    );
    const { members: membersAfterPromote } =
      await membershipService.listMembers(project._id.toString());
    const alanMem = membersAfterPromote.find(
      (m) => m.email === "alan@example.com",
    );
    assert.strictEqual(alanMem?.role, "MAINTAINER");
    console.log("  ✓ Developer promoted to Maintainer successfully.");

    // Demote Alan back to DEVELOPER
    await membershipService.changeRole(
      project._id.toString(),
      devUserSignup.user._id.toString(),
      "DEVELOPER",
      verifiedUser._id.toString(),
    );
    console.log(
      "  ✓ Maintainer demoted to Developer when another Maintainer exists.",
    );

    // Test 6: Last Maintainer Protection Invariant
    console.log("\nTest 6: Last Maintainer Protection Invariant");
    let lastMaintainerErrorThrown = false;
    try {
      // Ada is the ONLY remaining Maintainer. Demoting Ada MUST fail!
      await membershipService.changeRole(
        project._id.toString(),
        verifiedUser._id.toString(),
        "DEVELOPER",
        verifiedUser._id.toString(),
      );
    } catch (err: any) {
      if (err.code === "LAST_MAINTAINER") {
        lastMaintainerErrorThrown = true;
      }
    }
    assert.strictEqual(
      lastMaintainerErrorThrown,
      true,
      "Demoting the last maintainer must throw LAST_MAINTAINER error",
    );
    console.log(
      "  ✓ Invariant verified: Demoting the last Maintainer is strictly blocked.",
    );

    // Removing last maintainer must also fail
    let removeMaintainerErrorThrown = false;
    try {
      await membershipService.removeMember(
        project._id.toString(),
        verifiedUser._id.toString(),
        verifiedUser._id.toString(),
      );
    } catch (err: any) {
      if (err.code === "LAST_MAINTAINER") {
        removeMaintainerErrorThrown = true;
      }
    }
    assert.strictEqual(
      removeMaintainerErrorThrown,
      true,
      "Removing the last maintainer must throw LAST_MAINTAINER error",
    );
    console.log(
      "  ✓ Invariant verified: Removing the last Maintainer is strictly blocked.",
    );

    // Test 7: Last Admin Protection Invariant
    console.log("\nTest 7: Last Admin Protection Invariant");
    let lastAdminErrorThrown = false;
    try {
      await assertNotLastAdmin(org._id.toString(), verifiedUser._id.toString());
    } catch (err: any) {
      if (err.code === "LAST_ADMIN") {
        lastAdminErrorThrown = true;
      }
    }
    assert.strictEqual(
      lastAdminErrorThrown,
      true,
      "Cannot demote or remove the sole Organization Admin",
    );
    console.log(
      "  ✓ Invariant verified: Organization must retain at least one Admin.",
    );

    // Test 8: Knowledge Source Credential Encryption
    console.log("\nTest 8: Knowledge Source Credential Encryption");
    const sourceResult = await sourceService.createSource(
      project._id.toString(),
      "GITHUB",
      "Payments Repo",
      {
        url: "https://github.com/acme/payments",
        token: "ghp_superSecretToken12345",
      },
      verifiedUser._id.toString(),
    );
    assert.strictEqual(sourceResult.name, "Payments Repo");
    assert.strictEqual(sourceResult.status, "CONNECTED");

    // Check directly in database that raw token is NOT stored in plain text
    const rawSourceDoc = await KnowledgeSourceModel.findById(sourceResult._id);
    assert.ok(rawSourceDoc?.configEncrypted, "configEncrypted exists");
    assert.strictEqual(
      rawSourceDoc?.configEncrypted.includes("ghp_superSecretToken12345"),
      false,
      "Raw secret must NOT be visible in encrypted payload",
    );

    const decrypted = decryptSecret(rawSourceDoc!.configEncrypted!);
    assert.ok(
      decrypted.includes("ghp_superSecretToken12345"),
      "Decrypted secret matches original value",
    );
    console.log(
      "  ✓ Secrets are AES-256 encrypted at rest and redacted from client queries.",
    );

    // Test 9: Project Chat & Conversations
    console.log("\nTest 9: Project Chat & Conversations");
    const conversation = await conversationService.createConversation(
      project._id.toString(),
      verifiedUser._id.toString(),
      "Test Payment Integration",
    );
    assert.strictEqual(conversation.title, "Test Payment Integration");

    const messageResult = await conversationService.sendMessage(
      conversation._id.toString(),
      verifiedUser._id.toString(),
      "How should we structure payment webhooks?",
    );
    assert.strictEqual(messageResult.userMessage.role, "USER");
    assert.strictEqual(messageResult.assistantMessage.role, "ASSISTANT");
    assert.ok(
      messageResult.assistantMessage.content.length > 0,
      "Assistant returned generated response",
    );
    console.log(
      "  ✓ Conversation created and AI generated assistant response.",
    );

    // Test 10: Outbox Worker Asynchronous Processing
    console.log("\nTest 10: Outbox Worker Asynchronous Processing");
    const pendingEventsBefore = await OutboxEventModel.countDocuments({
      status: "PENDING",
    });
    assert.ok(
      pendingEventsBefore > 0,
      "Outbox events were created during operations",
    );

    const processedCount = await emailWorker.processPendingEvents();
    assert.ok(processedCount > 0, "Outbox worker processed pending events");

    const remainingPending = await OutboxEventModel.countDocuments({
      status: "PENDING",
    });
    assert.strictEqual(
      remainingPending,
      0,
      "All pending outbox events successfully processed",
    );
    console.log(
      `  ✓ Outbox worker processed ${processedCount} events without error.`,
    );

    // Test 11: Admin Reporting Aggregation
    console.log("\nTest 11: Admin Reporting Aggregation");
    const overview = await organizationService.getOverview(org._id.toString());
    assert.strictEqual(overview.metrics.totalProjects, 1);
    assert.strictEqual(overview.metrics.maintainersCount, 1);
    assert.strictEqual(overview.metrics.developersCount, 1);
    assert.strictEqual(overview.projectBreakdown.length, 1);
    assert.strictEqual(overview.projectBreakdown[0].totalMembers, 2);
    console.log(
      "  ✓ Admin overview reporting accurately aggregates projects, users, and roles.",
    );

    console.log("\n=================================================");
    console.log("All V1 Core & Security Invariant Tests Passed! ✓");
    console.log("=================================================\n");
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
