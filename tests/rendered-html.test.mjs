import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("builds a self-contained offline classroom site", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.match(html, /重新看見世界/);
  assert.match(html, /<script type="module"[^>]*>/);
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+rel="stylesheet"/i);
  assert.match(html, /images\/hero-discover-world\.png/);
  assert.ok(html.length > 1_000_000 && html.length < 5_000_000, "direct-open build should stay small enough for local browsers");
});

test("keeps the six-part inquiry route continuous and the language work as tools", async () => {
  const source = await readFile(new URL("app/page.tsx", root), "utf8");
  for (const title of [
    "同一個地方，兩次發現",
    "讀懂海倫的提醒",
    "第一人稱與第三人稱",
    "困難、方法、支持與影響",
    "工作、環境與合理調整",
    "把觀察寫成讀者能感受的文字",
  ]) assert.match(source, new RegExp(title));
  assert.match(source, /毛字偵探所/);
  assert.match(source, /句子診療院/);
  assert.match(source, /六關連續進行，不讓字詞練習切斷課文思考/);
  assert.match(source, /完成主線，前往成效檢核/);
});

test("includes guided exploration, records, exports, and ten diagnostic questions", async () => {
  const source = await readFile(new URL("app/page.tsx", root), "utf8");
  const quizSection = source.slice(source.indexOf("const quiz = ["), source.indexOf("const seedCloud"));
  assert.equal((quizSection.match(/context:/g) || []).length, 10);
  assert.equal((quizSection.match(/optionTips:/g) || []).length, 10);
  assert.match(source, /先從圖片找線索/);
  assert.match(source, /aria-label={`探索圖片中的可疑位置/);
  assert.match(source, /下載這張閱讀標註 PNG/);
  assert.match(source, /下載文字雲 PNG/);
  assert.match(source, /下載課堂紀錄 PDF/);
  assert.match(source, /下載 PDF 紀錄/);
  assert.match(source, /送到全班想法牆/);
});

test("ships every illustrated learning scene", async () => {
  await Promise.all([
    "hero-discover-world.png",
    "people-method-clues.png",
    "inclusive-workplace-puzzle.png",
    "inclusive-workplace-solved.png",
    "mao-detective-office.png",
    "sentence-clinic-hospital.png",
  ].map((name) => access(new URL(`public/images/${name}`, root))));
});
