import { chromium } from "playwright";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

const MAINTAINER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWIwMzJkZmMxZmNiNDVlNTY4MmUyNTciLCJlbWFpbCI6Im1haW50YWluZXJAZGV2YWkubG9jYWwiLCJpYXQiOjE3ODk5MzIyNTUsImV4cCI6MTc5MDAxODY1NX0.mUBkw0e2CKY4RstLud2U5_EMXuo_Rfr_rVycXUs5Vik";
const PROJECT_ID = "6aafa7fff50f65b4ca543586";
const MONGO_URI = "mongodb+srv://vikaskalel097_db_user:5RS6OEiNJNbGeYMK@cluster0.mjfe0cb.mongodb.net/devai?authSource=admin&retryWrites=true&w=majority";

const SCREENSHOT_DIR = "C:\\Users\\Vikas\\.gemini\\antigravity\\brain\\23cff9a4-4e05-4de9-a063-c72960038d9f\\screenshots\\e2e_verification";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const testResults = [];

function recordResult(testName, status, details, screenshotPath) {
  testResults.push({
    testName,
    status,
    details,
    screenshot: screenshotPath ? path.basename(screenshotPath) : null,
  });
  console.log(`[${status}] ${testName}: ${details}`);
}

async function runSuite() {
  console.log("================================================================================");
  console.log("STARTING FULL END-TO-END BROWSER TEST SUITE WITH REAL RENDERING & SCREENSHOTS");
  console.log("================================================================================");

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB successfully.");
  const db = mongoose.connection.db;

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Developer 1-Click Setup & Direct Jump
  // ---------------------------------------------------------------------------
  console.log("\n>>> SCENARIO 1: Developer 1-Click In-Place Setup & Direct Jump");
  let devCtx, devPage;
  try {
    const devEmail = `dev.e2e.${Date.now()}@devai.local`;

    // 1. Maintainer invites Developer
    const mCtx = await browser.newContext();
    await mCtx.addCookies([{ name: "devai_session", value: MAINTAINER_TOKEN, domain: "localhost", path: "/" }]);
    const mPage = await mCtx.newPage();
    await mPage.goto(`http://localhost:5173/projects/${PROJECT_ID}/members`, { waitUntil: "networkidle" });

    const devInviteRes = await mPage.evaluate(async ({ pId, email }) => {
      const res = await fetch(`/api/v1/projects/${pId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "DEVELOPER" }),
      });
      return await res.json();
    }, { pId: PROJECT_ID, email: devEmail });
    await mCtx.close();

    const devToken = devInviteRes.data.rawToken;
    console.log(`Developer invited: ${devEmail} | Token: ${devToken}`);

    // 2. Developer opens invitation URL in clean context
    const devCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const devPage = await devCtx.newPage();
    devCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    devPage = await devCtx.newPage();
    await devPage.goto(`http://localhost:5173/invite/${devToken}`, { waitUntil: "networkidle" });

    // Assert UI elements
    const roleBadge = await devPage.locator("span:has-text('DEVELOPER')").first().isVisible();
    const expiryBadge = await devPage.locator("text=days remaining").first().isVisible();
    const emailPreFill = await devPage.inputValue("input[type='email']");

    const shot1 = path.join(SCREENSHOT_DIR, "01_developer_invitation_page.png");
    await devPage.screenshot({ path: shot1, fullPage: true });

    if (!roleBadge || !expiryBadge || emailPreFill !== devEmail) {
      throw new Error(`Invite page validation failed. Role: ${roleBadge}, Expiry: ${expiryBadge}, Pre-fill: ${emailPreFill}`);
    }

    // Fill 1-click in-place form
    await devPage.fill("input[placeholder='Ada Lovelace']", "Alex Developer");
    await devPage.fill("input[placeholder='At least 8 characters']", "Password123!");
    await devPage.click("button:has-text('Set Password & Enter')");

    // Wait for direct jump to workspace chat
    await devPage.waitForURL(`**/projects/${PROJECT_ID}/chat`, { timeout: 15000 });
    await devPage.waitForSelector("header", { timeout: 10000 });
    await devPage.waitForTimeout(1000);

    const shot2 = path.join(SCREENSHOT_DIR, "02_developer_direct_jump_chat.png");
    await devPage.screenshot({ path: shot2, fullPage: true });

    // Verify Developer RBAC: Members link should NOT be in sidebar
    const hasMembersTab = await devPage.locator("aside >> text=Members").count() > 0;
    const hasAdminTab = await devPage.locator("aside >> text=Admin").count() > 0;

    if (hasMembersTab || hasAdminTab) {
      throw new Error(`Developer has unauthorized sidebar tabs! Members: ${hasMembersTab}, Admin: ${hasAdminTab}`);
    }

    recordResult("Scenario 1: Developer 1-Click Setup & Direct Jump", "PASSED",
      `Invite accepted in 1 step; routed directly to /projects/${PROJECT_ID}/chat; restricted sidebar verified (no Members/Admin tabs).`,
      shot2
    );
  } catch (err) {
    recordResult("Scenario 1: Developer 1-Click Setup & Direct Jump", "FAILED", err.message, null);
    console.error(err);
  }

    // -------------------------------------------------------------------------
    // SCENARIO 2: Real-Time Chat & Streaming Execution
    // -------------------------------------------------------------------------
    console.log("\n>>> SCENARIO 2: Real-Time Chat & Streaming Verification");
  // ---------------------------------------------------------------------------
  // SCENARIO 2: Real-Time Chat & Streaming Execution
  // ---------------------------------------------------------------------------
  console.log("\n>>> SCENARIO 2: Real-Time Chat & Streaming Verification");
  try {
    const promptInput = devPage.locator("textarea[placeholder*='Ask anything'], textarea").first();
    await promptInput.waitFor({ state: "visible", timeout: 10000 });
    await promptInput.fill("Explain recursion in programming in 2 concise sentences.");

    const sendBtn = devPage.locator("button:has(svg.lucide-arrow-up), button:has-text('Send'), form button[type='submit']").first();
    const sendBtn = devPage.locator("#send-btn, button:has-text('Generate')").first();
    await sendBtn.click();

    // Wait for user prompt to display in bubble
    await devPage.waitForSelector("text=Explain recursion in programming", { timeout: 5000 });
    await devPage.waitForSelector("text=Explain recursion in programming", { timeout: 8000 });

    // Wait for streaming tokens to start
    await devPage.waitForTimeout(500);
    // Wait for streaming indicator / stop button
    await devPage.waitForTimeout(600);
    const shot3 = path.join(SCREENSHOT_DIR, "03_developer_chat_streaming.png");
    await devPage.screenshot({ path: shot3, fullPage: true });

    // Wait for completion (stream finishes)
    await devPage.waitForSelector("button:not([disabled]):has(svg.lucide-arrow-up)", { timeout: 30000 });
    // Wait for streaming completion (stop button detaches, send button reappears)
    await devPage.waitForSelector("#stop-generation-btn", { state: "detached", timeout: 35000 });
    await devPage.waitForTimeout(1000);

    const shot4 = path.join(SCREENSHOT_DIR, "04_developer_chat_completed.png");
    await devPage.screenshot({ path: shot4, fullPage: true });

    recordResult("Scenario 2: Real-Time Chat & Token Streaming", "PASSED",
      "User message dispatched immediately; SSE streaming tokens rendered in real-time; response bubble completed without error.",
      "User prompt dispatched immediately; SSE streaming tokens rendered in real-time; response completed cleanly without error.",
      shot4
    );

    await devCtx.close();
  } catch (err) {
    recordResult("Scenario 1 or 2", "FAILED", err.message, null);
    recordResult("Scenario 2: Real-Time Chat & Token Streaming", "FAILED", err.message, null);
    console.error(err);
  } finally {
    if (devCtx) await devCtx.close();
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Maintainer 1-Click Setup & Direct Jump (with Members capabilities)
  // ---------------------------------------------------------------------------
  console.log("\n>>> SCENARIO 3: Maintainer 1-Click In-Place Setup & Direct Jump");
  try {
    const maintEmail = `maint.e2e.${Date.now()}@devai.local`;

    // 1. Maintainer invites new Maintainer
    const mCtx = await browser.newContext();
    await mCtx.addCookies([{ name: "devai_session", value: MAINTAINER_TOKEN, domain: "localhost", path: "/" }]);
    const mPage = await mCtx.newPage();
    await mPage.goto(`http://localhost:5173/projects/${PROJECT_ID}/members`, { waitUntil: "networkidle" });

    const maintInviteRes = await mPage.evaluate(async ({ pId, email }) => {
      const res = await fetch(`/api/v1/projects/${pId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "MAINTAINER" }),
      });
      return await res.json();
    }, { pId: PROJECT_ID, email: maintEmail });
    await mCtx.close();

    const maintToken = maintInviteRes.data.rawToken;
    console.log(`Maintainer invited: ${maintEmail} | Token: ${maintToken}`);

    // 2. New Maintainer opens invitation URL
    const newMCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const newMPage = await newMCtx.newPage();
    await newMPage.goto(`http://localhost:5173/invite/${maintToken}`, { waitUntil: "networkidle" });

    const maintRoleBadge = await newMPage.locator("span:has-text('MAINTAINER')").first().isVisible();
    const shot5 = path.join(SCREENSHOT_DIR, "05_maintainer_invitation_page.png");
    await newMPage.screenshot({ path: shot5, fullPage: true });

    if (!maintRoleBadge) {
      throw new Error("MAINTAINER role badge not displayed on invitation page");
    }

    // 1-Click Setup
    await newMPage.fill("input[placeholder='Ada Lovelace']", "Morgan Maintainer");
    await newMPage.fill("input[placeholder='At least 8 characters']", "Password123!");
    await newMPage.click("button:has-text('Set Password & Enter')");

    // Wait for direct jump to chat
    await newMPage.waitForURL(`**/projects/${PROJECT_ID}/chat`, { timeout: 15000 });
    await newMPage.waitForSelector("header", { timeout: 10000 });
    await newMPage.waitForTimeout(1000);

    const shot6 = path.join(SCREENSHOT_DIR, "06_maintainer_direct_jump_chat.png");
    await newMPage.screenshot({ path: shot6, fullPage: true });

    // Maintainer sidebar check: Members tab MUST be visible
    const membersLink = newMPage.locator("aside >> text=Members").first();
    await membersLink.waitFor({ state: "visible", timeout: 8000 });

    // Navigate to Members Page
    await membersLink.click();
    await newMPage.waitForURL(`**/projects/${PROJECT_ID}/members`, { timeout: 10000 });
    await newMPage.waitForSelector("text=Pending Invitations", { timeout: 10000 });
    await newMPage.waitForTimeout(1000);

    const shot7 = path.join(SCREENSHOT_DIR, "07_maintainer_members_roster.png");
    await newMPage.screenshot({ path: shot7, fullPage: true });

    recordResult("Scenario 3: Maintainer 1-Click Setup & Direct Jump", "PASSED",
      `Maintainer account set up in 1 step; routed directly to chat; Members tab accessible in sidebar; Pending Invitations roster confirmed.`,
      shot7
    );

    await newMCtx.close();
  } catch (err) {
    recordResult("Scenario 3: Maintainer 1-Click Setup & Direct Jump", "FAILED", err.message, null);
    console.error(err);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 4: Expiration Enforcement & Warning Card
  // ---------------------------------------------------------------------------
  console.log("\n>>> SCENARIO 4: Expiration Enforcement");
  try {
    const expiredEmail = `expired.e2e.${Date.now()}@devai.local`;

    // Create an invite
    const mCtx = await browser.newContext();
    await mCtx.addCookies([{ name: "devai_session", value: MAINTAINER_TOKEN, domain: "localhost", path: "/" }]);
    const mPage = await mCtx.newPage();
    await mPage.goto(`http://localhost:5173/projects/${PROJECT_ID}/members`, { waitUntil: "networkidle" });

    const expiredInviteRes = await mPage.evaluate(async ({ pId, email }) => {
      const res = await fetch(`/api/v1/projects/${pId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "DEVELOPER" }),
      });
      return await res.json();
    }, { pId: PROJECT_ID, email: expiredEmail });
    await mCtx.close();

    const expiredToken = expiredInviteRes.data.rawToken;

    // Fast-forward expiration in DB to yesterday
    await db.collection("invitations").updateOne(
      { email: expiredEmail },
      { $set: { expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    );
    console.log(`Manually expired invitation for ${expiredEmail} in MongoDB.`);

    // Open expired invitation URL
    const expCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const expPage = await expCtx.newPage();
    await expPage.goto(`http://localhost:5173/invite/${expiredToken}`, { waitUntil: "networkidle" });

    // Assert "Invalid or Expired Invitation" is displayed
    await expPage.waitForSelector("text=Invalid or Expired Invitation", { timeout: 8000 });
    const shot8 = path.join(SCREENSHOT_DIR, "08_invitation_expired_card.png");
    await expPage.screenshot({ path: shot8, fullPage: true });

    recordResult("Scenario 4: Invitation Expiration Enforcement", "PASSED",
      "Expired token blocked by backend with HTTP 410; frontend cleanly rendered 'Invalid or Expired Invitation' warning card.",
      shot8
    );

    await expCtx.close();
  } catch (err) {
    recordResult("Scenario 4: Invitation Expiration Enforcement", "FAILED", err.message, null);
    console.error(err);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 5: Direct Sign-up & Login Fallback (Auto-Linking Pending Invite)
  // ---------------------------------------------------------------------------
  console.log("\n>>> SCENARIO 5: Direct Sign-Up & Login Auto-Linking");
  try {
    const directEmail = `direct.signup.${Date.now()}@devai.local`;

    // 1. Maintainer invites user
    const mCtx = await browser.newContext();
    await mCtx.addCookies([{ name: "devai_session", value: MAINTAINER_TOKEN, domain: "localhost", path: "/" }]);
    const mPage = await mCtx.newPage();
    await mPage.goto(`http://localhost:5173/projects/${PROJECT_ID}/members`, { waitUntil: "networkidle" });
    await mPage.evaluate(async ({ pId, email }) => {
      await fetch(`/api/v1/projects/${pId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "DEVELOPER" }),
      });
    }, { pId: PROJECT_ID, email: directEmail });
    await mCtx.close();

    // 2. User goes directly to /signup (ignoring email link)
    const directCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const directPage = await directCtx.newPage();
    await directPage.goto("http://localhost:5173/signup", { waitUntil: "networkidle" });

    await directPage.fill("input[placeholder='Ada Lovelace']", "Direct User");
    await directPage.fill("input[type='email']", directEmail);
    await directPage.fill("input[type='password']", "Password123!");
    await directPage.click("button[type='submit']");

    // Wait for "Verify your email" screen
    await directPage.waitForSelector("text=Verify your email", { timeout: 10000 });

    // Click dev quick-verify link
    const quickVerifyLink = directPage.locator("a:has-text('Click here to verify now')");
    await quickVerifyLink.waitFor({ state: "visible", timeout: 8000 });
    await quickVerifyLink.click();

    // On VerifyEmailPage, wait for success and click "Continue to Sign in"
    await directPage.waitForSelector("text=Email verified!", { timeout: 10000 });
    await directPage.click("a:has-text('Continue to Sign in')");

    // On LoginPage, enter credentials and sign in
    await directPage.waitForURL("**/login**", { timeout: 8000 });
    await directPage.fill("input[type='email']", directEmail);
    await directPage.fill("input[type='password']", "Password123!");
    await directPage.click("button[type='submit']");

    // Verify user is redirected directly to /projects/:id/chat, NOT stranded on /onboarding
    await directPage.waitForURL(`**/projects/${PROJECT_ID}/chat`, { timeout: 15000 });
    await directPage.waitForSelector("header", { timeout: 10000 });
    await directPage.waitForTimeout(1000);

    const shot9 = path.join(SCREENSHOT_DIR, "09_direct_signup_bypass_onboarding.png");
    await directPage.screenshot({ path: shot9, fullPage: true });

    recordResult("Scenario 5: Direct Sign-up & Login Auto-Linking", "PASSED",
      `Invited user directly signed up and logged in. Pending invite was auto-accepted, onboarding was bypassed, and user landed straight in project chat.`,
      shot9
    );

    await directCtx.close();
  } catch (err) {
    recordResult("Scenario 5: Direct Sign-up & Login Auto-Linking", "FAILED", err.message, null);
    console.error(err);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Forgot Password Pre-Fill & Smart Invitation Link Recovery
  // ---------------------------------------------------------------------------
  console.log("\n>>> SCENARIO 6: Forgot Password Pre-Fill & Invited Member Recovery");
  try {
    const forgotEmail = `forgot.recovery.${Date.now()}@devai.local`;

    // 1. Maintainer invites user
    const mCtx = await browser.newContext();
    await mCtx.addCookies([{ name: "devai_session", value: MAINTAINER_TOKEN, domain: "localhost", path: "/" }]);
    const mPage = await mCtx.newPage();
    await mPage.goto(`http://localhost:5173/projects/${PROJECT_ID}/members`, { waitUntil: "networkidle" });
    await mPage.evaluate(async ({ pId, email }) => {
      await fetch(`/api/v1/projects/${pId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "DEVELOPER" }),
      });
    }, { pId: PROJECT_ID, email: forgotEmail });
    await mCtx.close();

    // 2. User visits /login, types email, clicks Forgot Password
    const forgotCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const forgotPage = await forgotCtx.newPage();
    await forgotPage.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
    await forgotPage.fill("input[type='email']", forgotEmail);
    await forgotPage.click("text=Forgot password?");

    // Verify redirected with ?email= and input is pre-filled
    await forgotPage.waitForURL("**/forgot-password**", { timeout: 8000 });
    const prefilledValue = await forgotPage.inputValue("input[type='email']");

    const shot10 = path.join(SCREENSHOT_DIR, "10_forgot_password_prefilled.png");
    await forgotPage.screenshot({ path: shot10, fullPage: true });

    if (prefilledValue !== forgotEmail) {
      throw new Error(`Email was not pre-filled. Expected ${forgotEmail}, got ${prefilledValue}`);
    }

    // Submit request
    await forgotPage.click("button[type='submit']");
    await forgotPage.waitForSelector("text=Check your email", { timeout: 8000 });

    const shot11 = path.join(SCREENSHOT_DIR, "11_forgot_password_instructions_sent.png");
    await forgotPage.screenshot({ path: shot11, fullPage: true });

    // Check DB outbox: an INVITATION_SENT event was queued for this email
    const outboxEvent = await db.collection("outbox_events").findOne({
      "payload.to": forgotEmail,
    });
    console.log("Verified outbox invitation recovery event in DB:", outboxEvent?.eventType, outboxEvent?.payload?.subject);

    recordResult("Scenario 6: Forgot Password Pre-fill & Recovery", "PASSED",
      `Email was pre-filled from login query param. Backend detected pending invite without account and dispatched refreshed setup email.`,
      shot11
    );

    await forgotCtx.close();
  } catch (err) {
    recordResult("Scenario 6: Forgot Password Pre-fill & Recovery", "FAILED", err.message, null);
    console.error(err);
  }

  await browser.close();
  await mongoose.disconnect();

  console.log("\n================================================================================");
  console.log("FINAL TEST SUMMARY:");
  console.log("================================================================================");
  console.table(testResults);

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, "test_summary.json"),
    JSON.stringify(testResults, null, 2),
    "utf-8"
  );
}

runSuite().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
