import {test, expect} from "@playwright/test";
import {fileURLToPath} from "node:url";

const videoFile = fileURLToPath(new URL("../fixtures/source.webm", import.meta.url));
const portraitFile = fileURLToPath(new URL("../fixtures/portrait.png", import.meta.url));

test("cross-browser shell, capabilities, help, and privacy work without network uploads", async ({page}) => {
  const errors = [];
  const externalRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = request.url();
    if (/^https?:/.test(url) && !url.startsWith("http://127.0.0.1:4175/")) externalRequests.push(url);
  });
  await page.goto("/");
  await expect(page.locator("#setup-title")).toHaveText("영상과 얼굴 준비");
  await expect(page.locator("#render-button")).toBeDisabled();
  await expect(page.locator("#detect-button")).toBeDisabled();
  await expect(page.locator("#webgpu")).not.toHaveText("검사 중", {timeout: 12000});
  await expect(page.locator("#wasm")).not.toHaveText("검사 중");
  await page.locator("#help-button").click();
  await expect(page.locator("#help-dialog")).toBeVisible();
  await page.locator("#help-dialog [data-close]").click();
  await expect(page.locator("#help-dialog")).toBeHidden();
  const metrics = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth
  }));
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.viewportHeight + 3);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 3);
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("cross-browser local input gates recording and reset according to actual decode support", async ({page}) => {
  const errors = [];
  const externalRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = request.url();
    if (/^https?:/.test(url) && !url.startsWith("http://127.0.0.1:4175/")) externalRequests.push(url);
  });
  await page.goto("/");
  await page.locator("#video-file").setInputFiles(videoFile);
  await page.locator("#face-file").setInputFiles(portraitFile);
  await expect.poll(() => page.locator("#reference-image").evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(0);
  await expect.poll(() => page.locator("#source-video").evaluate((video) =>
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA || Boolean(video.error)), {timeout: 12000})
    .toBeTruthy();
  await page.locator("#consent").check();
  const decoded = await page.locator("#source-video").evaluate((video) =>
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0);
  if (decoded) {
    await expect(page.locator("#check-button")).toBeEnabled();
    await page.locator("#check-button").click();
  } else {
    await expect(page.locator("#check-button")).toBeDisabled();
    await expect(page.locator("#render-button")).toBeDisabled();
    await expect(page.locator("#video-detail")).toContainText("재생하지 못했어");
  }
  // Only the optional model button may fetch a remote SDK; it stays disabled.
  await expect(page.locator("#detect-button")).toBeDisabled();
  await page.locator("#consent").uncheck();
  await expect(page.locator("#render-button")).toBeDisabled();
  await page.locator("#consent").check();
  await page.locator("#reset-button").click();
  await expect(page.locator("#render-button")).toBeDisabled();
  await expect(page.locator("#download-demo")).toBeHidden();
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});
