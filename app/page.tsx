"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const heroDiscoverImage = "images/hero-discover-world.png";
const inclusionPuzzleImage = "images/inclusive-workplace-puzzle.png";
const inclusionSolvedImage = "images/inclusive-workplace-solved.png";
const maoDetectiveImage = "images/mao-detective-office.png";
const peopleMethodImage = "images/people-method-clues.png";
const sentenceClinicImage = "images/sentence-clinic-hospital.png";

type Role = "student" | "teacher";
type Stage = "map" | "live" | "studio";
type AnnotationMode = "highlight" | "underline" | "erase";
type CloudEntry = { id: string; word: string; group: string; seat: string };
type ObservationRecord = {
  id: string;
  activity: "observation";
  group: string;
  seat: string;
  first: string;
  second: string;
};
type ReadingNoteRecord = {
  id: string;
  activity: "reading-note";
  group: string;
  seat: string;
  note: string;
  reactions: number;
};
type LearningRecord = ObservationRecord | ReadingNoteRecord;

const firebaseReady = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_APP_ID
);

const lessons = [
  { no: 1, short: "重新看見", title: "同一個地方，兩次發現", question: "地方沒有換，為什麼第二次能寫出更多？", icon: "◉", color: "sage" },
  { no: 2, short: "證據放大鏡", title: "讀懂海倫的提醒", question: "她憑什麼說世界很動人？", icon: "⌕", color: "gold" },
  { no: 3, short: "兩種鏡頭", title: "第一人稱與第三人稱", question: "自己說與別人介紹，讓我們看見什麼不同？", icon: "我", color: "sage" },
  { no: 4, short: "人物方法研究", title: "困難、方法、支持與影響", question: "面對困難，除了堅持，還做了什麼？", icon: "策", color: "gold" },
  { no: 5, short: "共融設計所", title: "工作、環境與合理調整", question: "阻礙一定在人的身體上嗎？環境可以怎麼修？", icon: "修", color: "brick" },
  { no: 6, short: "有感寫作", title: "把觀察寫成讀者能感受的文字", question: "我能把第一關的真實發現寫得具體嗎？", icon: "✎", color: "teal" },
  { no: 7, short: "毛字偵探所", title: "部件、造詞、同音詞與語境", question: "字形相近、讀音相同，怎麼查證才可靠？", icon: "毛", color: "brick" },
  { no: 8, short: "句子診療院", title: "發現病句，開出修改處方", question: "我能找出病灶、自己改詞，再說出理由嗎？", icon: "診", color: "teal" },
] as const;

const passageLines = [
  "我常常想，如果能暫時失去視覺和聽覺，也許人們會更珍惜原來擁有的一切。",
  "一位朋友從森林回來，卻說沒有看到什麼特別的東西。",
  "我用手觸摸樹枝與蓓蕾，感受到春天正悄悄來到。",
  "當清涼的流水流過掌心，柔軟的草地貼近指尖，我感覺世界如此溫暖。",
  "為什麼視力完好的人，對眼前五彩繽紛的美景，反而視而不見呢？",
];

const people = [
  {
    name: "海倫・凱勒",
    role: "作家、倡議者",
    difficulty: "幼年失去視覺與聽覺，溝通和取得資訊受到限制。",
    method: "以手語字母、凸字、點字與打字機學習並寫作。",
    support: "蘇利文老師長期教導；書籍、溝通方法與教育機會也很重要。",
    impact: "完成大學學業，持續寫作並倡議身心障礙者的教育與工作權。",
    clue: "方法會改變，支持也能打開參與的可能。",
  },
  {
    name: "黃裕翔",
    role: "鋼琴家、作曲家",
    difficulty: "視覺障礙使陌生空間移動、讀取一般樂譜等事情需要不同方法。",
    method: "透過聆聽、記憶、反覆練習與熟悉環境發展音樂能力。",
    support: "家人、同學、教師、引導方式與可近用環境共同提供支持。",
    impact: "持續演奏與創作，也讓更多人思考同情和真正平等的差別。",
    clue: "當事人的選擇與專業，不該被障礙標籤蓋過。",
  },
  {
    name: "謝坤山",
    role: "口足畫家",
    difficulty: "意外後失去雙手與右小腿，右眼也失去視力。",
    method: "用口持筆練習，設計生活工具，回到學校並持續學畫。",
    support: "家人的支持、師長指導、合適工具與學習機會都發揮作用。",
    impact: "成為專業畫家，以作品與經驗參與社會。",
    clue: "不要只寫『他很努力』，要找出他實際怎麼做。",
  },
  {
    name: "力克・胡哲",
    role: "作家、演講者",
    difficulty: "天生沒有四肢，生活操作與空間使用需要不同方式。",
    method: "練習適合自己的移動與生活方法，透過寫作和演講工作。",
    support: "家庭、教育、科技工具與可使用的環境都是重要條件。",
    impact: "在多國分享反霸凌與面對挫折的經驗。",
    clue: "人物不是『奇蹟』，他也使用方法、資源與他人的支持。",
  },
];

type StrategyCategory = "difficulty" | "method" | "support" | "impact";

const strategyMeta: Record<StrategyCategory, { label: string; prompt: string }> = {
  difficulty: { label: "困難或阻礙", prompt: "人物遇到什麼限制？阻礙也可能來自環境。" },
  method: { label: "具體方法", prompt: "他實際做了什麼？用了什麼工具或替代方法？" },
  support: { label: "人與環境的支持", prompt: "誰提供協助？哪些資源或機會很重要？" },
  impact: { label: "產生的影響", prompt: "這些做法後來帶來什麼改變？" },
};

const personReadings: Array<{
  name: string;
  source: string;
  sentences: Array<{ category: StrategyCategory; text: string }>;
}> = [
  {
    name: "海倫・凱勒",
    source: "依課本、習作〈海倫・凱勒的奇蹟〉與人物資料改寫",
    sentences: [
      { category: "difficulty", text: "海倫幼年生病後失去視覺與聽覺，起初很難和別人溝通，也不容易取得外界資訊。" },
      { category: "method", text: "她先從手掌上的指語認識事物名稱，後來學習點字、觸讀嘴形、說話與使用打字機。" },
      { category: "support", text: "蘇利文老師長期陪伴她，把文字和真實事物連在一起；家人、書籍與受教育的機會也不可缺少。" },
      { category: "impact", text: "海倫完成大學學業，持續寫作與演講，並為身心障礙者的教育和工作權發聲。" },
    ],
  },
  {
    name: "黃裕翔",
    source: "依習作人物故事、公視人物資料與《逆光飛翔》延伸資料改寫",
    sentences: [
      { category: "difficulty", text: "黃裕翔天生看不見，在陌生空間移動或讀取一般印刷樂譜時，需要不同的方式。" },
      { category: "method", text: "他用耳朵聆聽、記住旋律，反覆練琴，也把生活裡的各種聲音變成音樂材料。" },
      { category: "support", text: "家人、教師、同學與音樂夥伴陪他學習；清楚的引導和可以自由移動的環境也提供支持。" },
      { category: "impact", text: "他成為鋼琴家與作曲家，也走進校園教孩子從環境聲音發現音樂。" },
    ],
  },
  {
    name: "謝坤山",
    source: "依台灣口足畫家協會人物資料改寫",
    sentences: [
      { category: "difficulty", text: "謝坤山因高壓電意外失去雙手與右小腿，右眼也失去視力，日常生活與作畫方式必須重新調整。" },
      { category: "method", text: "他練習用口持筆，自學素描多年，也設計適合自己的生活與工作方法。" },
      { category: "support", text: "家人的支持、畫家指導、合適工具與持續學畫的機會，讓他能發展專業。" },
      { category: "impact", text: "他舉辦畫展、加入口足畫家協會，成為以繪畫工作的專業藝術家。" },
    ],
  },
  {
    name: "力克・胡哲",
    source: "依人物官方資料改寫",
    sentences: [
      { category: "difficulty", text: "力克天生沒有四肢，移動、書寫與操作生活物品時，需要和多數人不同的方法。" },
      { category: "method", text: "他練習適合自己的移動和操作方式，並透過寫作、影片與演講表達想法。" },
      { category: "support", text: "家人、教育機會、科技工具與可使用的空間，讓他能學習、工作並與人合作。" },
      { category: "impact", text: "他成為作家與演講者，也參與反霸凌教育，向各地學生分享經驗。" },
    ],
  },
];

const quiz = [
  {
    context: "海倫寫道：『我用手觸摸樹枝與蓓蕾；清涼的流水流過掌心，柔軟的草地貼近指尖。』",
    q: "這段內容為什麼能支持『世界很動人』？",
    options: ["列出的景物很多，所以一定美", "寫出接觸動作與感官細節，讀者能跟著感受", "使用第一人稱，所以內容一定正確", "只要出現『清涼、柔軟』就是作者的主旨"], a: 1,
    optionTips: ["數量多不等於有力證據；要看文字怎麼呈現感受。", "你抓到『動作＋細節』的證據鏈。", "人稱會影響閱讀距離，但不能保證觀點一定成立。", "兩個詞是線索，還要說明它們如何支持作者的想法。"],
    tip: "有力的閱讀回答要連起『文中細節 → 我的解釋 → 作者觀點』。",
  },
  {
    context: "朋友從森林回來說：『沒有看到什麼特別的東西。』海倫卻只靠觸覺就發現樹枝、流水與草地的變化。",
    q: "海倫所說的『視而不見』，較接近哪一種意思？",
    options: ["眼睛暫時看不清楚", "看過了，卻沒有仔細留意與感受", "森林裡本來就沒有景物", "朋友故意不把看到的事情說出來"], a: 1,
    optionTips: ["課文沒有說朋友的視力模糊。", "你從朋友與海倫的對比讀出了深層意思。", "海倫的描寫正好證明森林有許多細節。", "文本沒有提供『故意隱瞞』的證據。"],
    tip: "推論不能只靠猜；要用兩個人物的表現對照。",
  },
  {
    context: "字典資料：『毯、毽、毫』列在毛部；『耗』列在耒部。",
    q: "根據資料，哪一個判斷方法最可靠？",
    options: ["看到字裡有『毛』就都歸毛部", "只看讀音，讀起來像就放一起", "先觀察部件，再用字典查正式部首與字義", "筆畫多的字一定不是毛部"], a: 2,
    optionTips: ["『耗』正是反例：有毛部件，部首卻是耒。", "讀音不能直接告訴我們部首。", "先推測、再查證，才同時用到字形與工具。", "筆畫多少和部首沒有這種固定關係。"],
    tip: "部件可幫助推測，字典用來查證；兩者要一起用。",
  },
  {
    context: "① 我們沿著操場慢慢＿＿。② 花粉＿＿在空氣中。",
    q: "哪一組填法能讓兩句的動作都合理？",
    options: ["散布／散步", "散步／散布", "散步／散步", "散布／散布"], a: 1,
    optionTips: ["人不是被分散到空氣中；第一格語境不合。", "人在走動用『散步』；事物分散各處用『散布』。", "花粉不是在悠閒走路。", "第一句要寫人的走動，不是分布位置。"],
    tip: "同音詞不能只聽聲音，要放回主詞和動作情境。",
  },
  {
    context: "病句：『園遊會時，大家將攤位布置得千篇一律，好熱鬧哇！』",
    q: "哪一份『診斷＋處方』同時說清問題並改得合理？",
    options: ["『園遊會』不合，改成『運動會』", "『千篇一律』和熱鬧情境衝突，改成『五彩繽紛』", "驚嘆號太多，刪掉後原句就合理", "『布置』不能形容攤位，改成『放置』"], a: 1,
    optionTips: ["換活動名稱仍沒有處理詞義矛盾。", "診斷找到語意衝突，替換後也符合情境。", "標點不是這句主要的語意問題。", "『布置攤位』是合理搭配。"],
    tip: "修改病句要經過：找病灶、說理由、換詞、整句重讀。",
  },
  {
    context: "甲：『我觸摸樹枝，感受到春天來了。』乙：『海倫在老師教導下學會指語，後來完成大學學業。』",
    q: "哪一個比較最符合這兩段的閱讀效果？",
    options: ["甲較靠近當下感受；乙較清楚交代人物經歷", "甲知道所有人的想法；乙完全沒有感情", "第一人稱一定真實；第三人稱一定不可靠", "兩段只差代名詞，閱讀效果完全相同"], a: 0,
    optionTips: ["你同時看見人稱和內容選擇造成的效果。", "第一人稱通常只知道說話者的範圍；第三人稱也可以有感情。", "可靠度要看資料與證據，不能只由人稱決定。", "換鏡頭後，讀者靠近的資訊不同。"],
    tip: "不要把第一、第三人稱背成優劣；要說出它們各自讓讀者看見什麼。",
  },
  {
    context: "資料卡：『謝坤山在意外後練習用口持筆，自學素描多年，後來舉辦畫展並加入口足畫家協會。』",
    q: "哪一個推論受到這張資料卡的直接支持？",
    options: ["他不需要任何人的支持，只靠自己就能成功", "他調整作畫方法，持續練習並發展成專業工作", "每位身心障礙者都應該成為藝術家", "他天生就知道怎麼用口畫畫"], a: 1,
    optionTips: ["資料沒有說他完全不需要支持，而且人物學習常包含環境與機會。", "推論中的每一部分都能在資料卡找到對應證據。", "不能把一個人的選擇推成所有人的標準。", "資料寫的是『練習、自學』，不是天生就會。"],
    tip: "人物閱讀不是貼『勇敢』標籤，而是由具體行動推論方法與影響。",
  },
  {
    context: "一位使用輪椅的館員需要到二樓工作，但入口只有階梯。館方希望他能和同事一樣自主進出。",
    q: "哪一個方案最能移除環境阻礙，也保留工作者的選擇？",
    options: ["先裝呼叫鈴，讓同事每天來抬輪椅", "把他調到不必進大樓的工作，省下改建費用", "先詢問需求，再設置合適坡道、升降設備與無障礙動線", "貼上小心階梯的標語，提醒他注意安全"], a: 2,
    optionTips: ["有人幫忙能應急，但每天等待會限制自主，階梯仍在。", "這是把人移開，也限制了工作選擇。", "先詢問再改善公共環境，才把阻礙真正移除。", "標語只能提醒，不能讓輪椅通過階梯。"],
    tip: "公平不是每個人得到相同安排，而是讓每個人都有真正參與的機會。",
  },
  {
    context: "走廊上，一位使用白手杖的人停在路口。你不知道他是否需要協助，也不知道他想往哪裡。",
    q: "哪一個開場最尊重對方的決定？",
    options: ["『我帶你走。』說完就抓住他的手臂", "『你一定看不到路吧？我替你決定。』", "『請問你需要協助嗎？如果需要，希望我怎麼做？』", "先叫旁人讓開，再大聲指揮他前進"], a: 2,
    optionTips: ["直接碰觸可能驚嚇對方，也沒有先取得同意。", "用『一定』替對方下判斷，也奪走選擇。", "先問是否需要，再依當事人的回答行動。", "清理動線可能有用，但仍應先和當事人溝通。"],
    tip: "協助的第一步不是表現熱心，而是詢問、傾聽與取得同意。",
  },
  {
    context: "原句：『校園的那棵樹很美，我很感動。』",
    q: "哪一個改寫最能讓讀者看見作者的真實發現？",
    options: ["校園的那棵樹真的很美、很美、非常美", "那棵樹有樹葉、樹枝、樹幹，旁邊還有草", "我抬頭靠近葉片，陽光從細細的葉脈漏下來，在手背上晃動；原來每天經過的地方一直藏著光", "我覺得大家都應該喜歡校園裡的樹"], a: 2,
    optionTips: ["重複空泛形容詞，讀者仍看不到畫面。", "列出名稱比原句多，但還沒有動作、變化與感受。", "這句有觀察動作、感官畫面，也寫出新的發現。", "把感受要求到所有人身上，沒有補足自己的觀察。"],
    tip: "有感寫作的核心是：真實動作＋可感細節＋由細節產生的想法。",
  },
];

const seedCloud: CloudEntry[] = [
  { id: "s1", word: "流水", group: "第1組", seat: "3" },
  { id: "s2", word: "溫暖", group: "第2組", seat: "8" },
  { id: "s3", word: "流水", group: "第3組", seat: "12" },
  { id: "s4", word: "葉脈", group: "第4組", seat: "19" },
  { id: "s5", word: "鳥鳴", group: "第1組", seat: "6" },
  { id: "s6", word: "溫暖", group: "第5組", seat: "27" },
  { id: "s7", word: "樹影", group: "第2組", seat: "10" },
  { id: "s8", word: "草地", group: "第3組", seat: "15" },
  { id: "s9", word: "陽光", group: "第4組", seat: "21" },
  { id: "s10", word: "微風", group: "第5組", seat: "25" },
  { id: "s11", word: "水聲", group: "第6組", seat: "29" },
];

const cloudSlots = [
  { x: 50, y: 49 },
  { x: 37, y: 43 }, { x: 63, y: 43 }, { x: 42, y: 59 }, { x: 58, y: 59 },
  { x: 31, y: 31 }, { x: 50, y: 29 }, { x: 69, y: 31 },
  { x: 27, y: 58 }, { x: 50, y: 70 }, { x: 73, y: 58 },
  { x: 19, y: 43 }, { x: 81, y: 43 }, { x: 35, y: 75 }, { x: 65, y: 75 },
] as const;

const cloudPalette = ["#1f665c", "#a54e3b", "#b87922", "#607d4c", "#72588d", "#35758a"];

function hashWord(value: string) {
  return [...value].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 7);
}

function makeCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function tone(ok = true) {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = ok ? 660 : 240;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.22);
}

function triggerDownload(href: string, filename: string, revoke = false) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (revoke) window.setTimeout(() => URL.revokeObjectURL(href), 1500);
}

function wrapCanvasLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let current = "";
  [...text].forEach((char) => {
    const next = current + char;
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export default function Home() {
  const [role, setRole] = useState<Role>("student");
  const [stage, setStage] = useState<Stage>("map");
  const [compact, setCompact] = useState(false);
  const [lesson, setLesson] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [sessionCode, setSessionCode] = useState("3174");
  const [seat, setSeat] = useState("01");
  const [group, setGroup] = useState("第1組");
  const [cloud, setCloud] = useState<CloudEntry[]>(seedCloud);
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [showRecords, setShowRecords] = useState(false);
  const [word, setWord] = useState("");
  const [cloudPaused, setCloudPaused] = useState(false);
  const [hiddenWords, setHiddenWords] = useState<string[]>([]);
  const [annotationMode, setAnnotationMode] = useState<AnnotationMode>("highlight");
  const [marks, setMarks] = useState<Record<number, AnnotationMode | undefined>>({ 2: "highlight" });
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<number[]>([]);
  const [evidenceExplanation, setEvidenceExplanation] = useState("");
  const [maoSort, setMaoSort] = useState<Record<string, "mao" | "other">>({});
  const [clinic, setClinic] = useState<Record<number, string>>({});
  const [person, setPerson] = useState(0);
  const [hotspots, setHotspots] = useState<number[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizChoice, setQuizChoice] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizDone, setQuizDone] = useState(false);
  const [writing, setWriting] = useState("");
  const [notice, setNotice] = useState("目前為本機預覽；連接 Firebase 後即可跨 iPad 即時同步。");
  const drawingRef = useRef<HTMLCanvasElement>(null);
  const drawingActive = useRef(false);

  useEffect(() => {
    if (firebaseReady) {
      let cancelled = false;
      const unsubscribers: Array<() => void> = [];
      import("../lib/firebase-classroom").then(({ subscribeClassroom, subscribeLearningRecords }) => {
        if (cancelled) return;
        unsubscribers.push(subscribeClassroom(sessionCode, (entries) => {
          setCloud(entries);
          setNotice(`課堂 ${sessionCode} 已連線，所有 iPad 將即時同步。`);
        }, () => setNotice("尚未找到這個課堂，請確認代碼或請教師先建立課堂。")));
        unsubscribers.push(subscribeLearningRecords(sessionCode, (entries) => {
          setRecords(entries);
        }, () => undefined));
      });
      return () => { cancelled = true; unsubscribers.forEach((unsubscribe) => unsubscribe()); };
    }
    const channel = new BroadcastChannel("three-days-light-classroom");
    channel.onmessage = (event) => {
      if (event.data?.type === "cloud" && event.data.code === sessionCode) {
        setCloud((old) => old.some((item) => item.id === event.data.entry.id) ? old : [...old, event.data.entry]);
      }
      if (event.data?.type === "learning-record" && event.data.code === sessionCode) {
        setRecords((old) => old.some((item) => item.id === event.data.entry.id) ? old : [...old, event.data.entry]);
      }
      if (event.data?.type === "reading-reaction" && event.data.code === sessionCode) {
        setRecords((old) => old.map((item) => item.id === event.data.id && item.activity === "reading-note" ? { ...item, reactions: item.reactions + 1 } : item));
      }
    };
    return () => channel.close();
  }, [sessionCode]);

  const cloudWords = useMemo(() => {
    const counts = new Map<string, number>();
    cloud.filter((entry) => !hiddenWords.includes(entry.word)).forEach((entry) => counts.set(entry.word, (counts.get(entry.word) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [cloud, hiddenWords]);

  const cloudLayout = useMemo(() => {
    const maxCount = Math.max(1, ...cloudWords.map(([, count]) => count));
    const epoch = cloud.length;
    return cloudWords.slice(0, cloudSlots.length).map(([text, count], index) => {
      let slotIndex = 0;
      if (index >= 1 && index <= 4) slotIndex = 1 + ((index - 1 + epoch) % 4);
      else if (index >= 5 && index <= 10) slotIndex = 5 + ((index - 5 + epoch) % 6);
      else if (index >= 11) slotIndex = 11 + ((index - 11 + epoch) % 4);
      const slot = cloudSlots[slotIndex];
      const hash = hashWord(text);
      return {
        text,
        count,
        x: slot.x,
        y: slot.y,
        size: Math.round(27 + (count / maxCount) * 49 + (index === 0 ? 8 : 0)),
        rotate: index === 0 ? 0 : ((hash + epoch) % 13) - 6,
        color: cloudPalette[(hash + epoch + index) % cloudPalette.length],
      };
    });
  }, [cloudWords, cloud.length]);

  const observationRecords = useMemo(() => records.filter((item): item is ObservationRecord => item.activity === "observation"), [records]);
  const readingNotes = useMemo(() => records.filter((item): item is ReadingNoteRecord => item.activity === "reading-note"), [records]);

  async function submitCloud() {
    const clean = word.trim().slice(0, 8);
    if (!clean || cloudPaused) return;
    const entry = { id: `${Date.now()}-${seat}`, word: clean, group, seat };
    if (firebaseReady) {
      try {
        const { submitClassroomWord } = await import("../lib/firebase-classroom");
        await submitClassroomWord(sessionCode, { word: clean, group, seat });
      } catch {
        setNotice("送出失敗：請確認課堂代碼，或請教師開啟作答。");
        tone(false);
        return;
      }
    } else {
      setCloud((old) => [...old, entry]);
      new BroadcastChannel("three-days-light-classroom").postMessage({ type: "cloud", code: sessionCode, entry });
    }
    setWord("");
    tone(true);
    setNotice(`已收到 ${group} ${seat} 號的發現。`);
  }

  async function submitObservation(first: string, second: string) {
    const cleanFirst = first.trim().slice(0, 180);
    const cleanSecond = second.trim().slice(0, 240);
    if (!cleanFirst || !cleanSecond) {
      setNotice("請先完成第一眼與第二次觀察，再送出完整紀錄。");
      tone(false);
      return false;
    }
    const entry: LearningRecord = {
      id: `${Date.now()}-${seat}`,
      activity: "observation",
      group,
      seat,
      first: cleanFirst,
      second: cleanSecond,
    };
    if (firebaseReady) {
      try {
        const { submitLearningRecord } = await import("../lib/firebase-classroom");
        await submitLearningRecord(sessionCode, { activity: "observation", group, seat, first: cleanFirst, second: cleanSecond });
      } catch {
        setNotice("完整紀錄送出失敗：請確認課堂代碼與 Firebase 連線。");
        tone(false);
        return false;
      }
    } else {
      setRecords((old) => [...old, entry]);
      const channel = new BroadcastChannel("three-days-light-classroom");
      channel.postMessage({ type: "learning-record", code: sessionCode, entry });
      channel.close();
    }
    setWord(cleanSecond.replace(/[，。！？、；：\s]/g, "").slice(0, 8));
    setStage("live");
    tone(true);
    setNotice(firebaseReady
      ? `已收到 ${group} ${seat} 號的完整觀察紀錄；再確認關鍵詞後送入文字雲。`
      : "紀錄目前只存於這台裝置；請連接 Firebase 才能讓教師從其他 iPad 收到。");
    return true;
  }

  async function submitReadingNote() {
    const cleanNote = note.trim().slice(0, 180);
    if (!cleanNote) {
      setNotice("請先寫下課文細節與自己的想法，再送到全班想法牆。");
      tone(false);
      return;
    }
    const entry: ReadingNoteRecord = { id: `${Date.now()}-${seat}`, activity: "reading-note", group, seat, note: cleanNote, reactions: 0 };
    if (firebaseReady) {
      try {
        const { submitLearningRecord } = await import("../lib/firebase-classroom");
        await submitLearningRecord(sessionCode, { activity: "reading-note", group, seat, note: cleanNote, reactions: 0 });
      } catch {
        setNotice("想法送出失敗：請確認課堂代碼與 Firebase 連線。");
        tone(false);
        return;
      }
    } else {
      setRecords((old) => [...old, entry]);
      const channel = new BroadcastChannel("three-days-light-classroom");
      channel.postMessage({ type: "learning-record", code: sessionCode, entry });
      channel.close();
    }
    setNote("");
    setStage("live");
    tone(true);
    setNotice(firebaseReady ? "想法已送到全班想法牆，可以閱讀並回應同學。" : "想法已加入本機示範牆；跨 iPad 顯示仍需連接 Firebase。");
  }

  async function reactToReadingNote(id: string) {
    if (firebaseReady) {
      try {
        const { reactToLearningRecord } = await import("../lib/firebase-classroom");
        await reactToLearningRecord(sessionCode, id);
      } catch {
        setNotice("回應送出失敗，請稍後再試。");
        return;
      }
    } else {
      setRecords((old) => old.map((item) => item.id === id && item.activity === "reading-note" ? { ...item, reactions: item.reactions + 1 } : item));
      const channel = new BroadcastChannel("three-days-light-classroom");
      channel.postMessage({ type: "reading-reaction", code: sessionCode, id });
      channel.close();
    }
    tone(true);
  }

  function markLesson(no: number) {
    setCompleted((old) => old.includes(no) ? old : [...old, no]);
    tone(true);
    setNotice(no <= 6 ? `主線第 ${no} 關已留下學習足跡。` : `語文工具站 ${no - 6} 已完成。`);
  }

  function downloadCloudPng() {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 900;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f3ead7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#214d45";
    ctx.font = "bold 64px sans-serif";
    ctx.fillText("重新看見世界｜全班文字雲", 80, 105);
    ctx.fillStyle = "#6c5947";
    ctx.font = "32px sans-serif";
    ctx.fillText(`課堂 ${sessionCode}・共 ${cloud.length} 則回應`, 84, 158);
    ctx.strokeStyle = "rgba(40,95,88,.28)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(150, 485);
    ctx.quadraticCurveTo(800, 115, 1450, 485);
    ctx.quadraticCurveTo(800, 825, 150, 485);
    ctx.stroke();
    cloudLayout.forEach(({ text, count, x, y, size, color }) => {
      ctx.fillStyle = color;
      ctx.font = `bold ${Math.min(100, size * 1.35)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 80 + (x / 100) * 1440, 160 + (y / 100) * 610);
      if (count > 1) {
        ctx.font = "bold 22px sans-serif";
        ctx.fillText(`×${count}`, 105 + (x / 100) * 1440, 125 + (y / 100) * 610);
      }
    });
    ctx.fillStyle = "#8a765e";
    ctx.font = "26px sans-serif";
    ctx.fillText("Kiki老師｜下載後即可結束並清除本堂資料", 80, 850);
    triggerDownload(canvas.toDataURL("image/png"), `課堂${sessionCode}-文字雲.png`);
    setNotice("文字雲 PNG 已下載。請確認檔案後再清除課堂。");
  }

  async function downloadClassroomPdf() {
    try {
      const pages: HTMLCanvasElement[] = [];
      const pageWidth = 1240;
      const pageHeight = 1754;
      const createPage = () => {
        const page = document.createElement("canvas");
        page.width = pageWidth;
        page.height = pageHeight;
        const ctx = page.getContext("2d");
        if (!ctx) throw new Error("canvas unavailable");
        ctx.fillStyle = "#f8f1e3";
        ctx.fillRect(0, 0, pageWidth, pageHeight);
        ctx.fillStyle = "#174940";
        ctx.font = "bold 52px sans-serif";
        ctx.fillText("假如給我三天光明｜課堂共學紀錄", 78, 92);
        ctx.fillStyle = "#725f4d";
        ctx.font = "26px sans-serif";
        ctx.fillText(`課堂代碼 ${sessionCode}｜文字回應 ${cloud.length} 則｜觀察紀錄 ${observationRecords.length} 份｜心得 ${readingNotes.length} 張`, 82, 140);
        ctx.strokeStyle = "#c8b99f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(78, 165);
        ctx.lineTo(1162, 165);
        ctx.stroke();
        pages.push(page);
        return { page, ctx, y: 218 };
      };

      let state = createPage();
      const addBlock = (title: string, body: string) => {
        state.ctx.font = "26px sans-serif";
        const lines = wrapCanvasLines(state.ctx, body || "尚無資料", 1020);
        const needed = 58 + lines.length * 39 + 26;
        if (state.y + needed > 1630) state = createPage();
        state.ctx.fillStyle = "#a64e3c";
        state.ctx.font = "bold 30px sans-serif";
        state.ctx.fillText(title, 86, state.y);
        state.y += 44;
        state.ctx.fillStyle = "#332d27";
        state.ctx.font = "26px sans-serif";
        lines.forEach((line) => {
          state.ctx.fillText(line, 102, state.y);
          state.y += 39;
        });
        state.ctx.strokeStyle = "#ded0b8";
        state.ctx.beginPath();
        state.ctx.moveTo(86, state.y + 3);
        state.ctx.lineTo(1150, state.y + 3);
        state.ctx.stroke();
        state.y += 27;
      };

      addBlock("全班文字雲", cloudWords.length ? cloudWords.map(([text, count]) => `${text} × ${count}`).join("、") : "尚未收到文字雲回應");
      observationRecords.forEach((record, index) => addBlock(
        `觀察 ${index + 1}｜${record.group}・${record.seat}號`,
        `第一眼：${record.first}／第二次：${record.second}`,
      ));
      readingNotes.forEach((record, index) => addBlock(
        `閱讀心得 ${index + 1}｜${record.group}・${record.seat}號`,
        `${record.note}${record.reactions ? `（${record.reactions} 位同學也注意到）` : ""}`,
      ));

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [pageWidth, pageHeight], hotfixes: ["px_scaling"] });
      pages.forEach((page, index) => {
        const ctx = page.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#7d6b57";
          ctx.font = "22px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText("Kiki老師｜課堂討論與學習歷程保存", 82, 1698);
          ctx.textAlign = "right";
          ctx.fillText(`第 ${index + 1}／${pages.length} 頁`, 1158, 1698);
          ctx.textAlign = "left";
        }
        if (index) pdf.addPage([pageWidth, pageHeight], "portrait");
        pdf.addImage(page.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageWidth, pageHeight);
      });
      const href = URL.createObjectURL(pdf.output("blob"));
      triggerDownload(href, `課堂${sessionCode}-共學紀錄.pdf`, true);
      setNotice("課堂 PDF 已下載，包含文字雲、兩次觀察與閱讀心得；確認檔案後再清除資料。");
    } catch {
      setNotice("PDF 製作失敗，請重新整理後再試；目前仍可先下載文字雲 PNG。");
      tone(false);
    }
  }

  async function clearSession() {
    if (!window.confirm("確定已下載成果嗎？清除後無法復原。")) return;
    if (firebaseReady) {
      try {
        const { deleteClassroom } = await import("../lib/firebase-classroom");
        await deleteClassroom(sessionCode);
      } catch {
        setNotice("只有建立這個課堂的教師裝置可以清除資料。");
        return;
      }
    }
    setCloud([]);
    setRecords([]);
    setHiddenWords([]);
    setNotice("本堂回應已清除，可以開始新的活動。");
  }

  async function togglePause() {
    const next = !cloudPaused;
    if (firebaseReady) {
      try {
        const { pauseClassroom } = await import("../lib/firebase-classroom");
        await pauseClassroom(sessionCode, next);
      } catch {
        setNotice("只有建立課堂的教師裝置可以暫停或繼續作答。");
        return;
      }
    }
    setCloudPaused(next);
  }

  async function newClassroom() {
    const code = makeCode();
    if (firebaseReady) {
      try {
        const { createClassroom } = await import("../lib/firebase-classroom");
        await createClassroom(code);
      } catch {
        setNotice("建立課堂失敗，請確認 Firebase 匿名登入與資料庫規則已啟用。");
        return;
      }
    }
    setSessionCode(code);
    setCloud([]);
    setRecords([]);
    setNotice(firebaseReady ? `已建立即時課堂 ${code}` : `已建立本機示範課堂 ${code}`);
  }

  function drawAt(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingActive.current) return;
    const canvas = drawingRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#614b3d";
    ctx.lineTo((event.clientX - rect.left) * (canvas.width / rect.width), (event.clientY - rect.top) * (canvas.height / rect.height));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo((event.clientX - rect.left) * (canvas.width / rect.width), (event.clientY - rect.top) * (canvas.height / rect.height));
  }

  function answerQuiz(index: number) {
    if (quizChoice !== null) return;
    setQuizChoice(index);
    setQuizAnswers((old) => ({ ...old, [quizIndex]: index }));
    const ok = index === quiz[quizIndex].a;
    if (ok) setQuizScore((score) => score + 1);
    tone(ok);
  }

  function nextQuiz() {
    if (quizIndex === quiz.length - 1) {
      setQuizDone(true);
    } else {
      setQuizIndex((index) => index + 1);
      setQuizChoice(null);
    }
  }

  function resetQuiz() {
    setQuizIndex(0);
    setQuizScore(0);
    setQuizChoice(null);
    setQuizAnswers({});
    setQuizDone(false);
  }

  async function downloadResultPdf() {
    const canvas = document.createElement("canvas");
    canvas.width = 1240;
    canvas.height = 1754;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f7f0df";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#17483f";
    ctx.font = "bold 54px 'PingFang TC', sans-serif";
    ctx.fillText("《假如給我三天光明》學習檢核", 75, 105);
    ctx.fillStyle = "#755f4d";
    ctx.font = "28px 'PingFang TC', sans-serif";
    ctx.fillText(`${group}・${seat}號｜課堂 ${sessionCode}`, 78, 155);
    ctx.fillStyle = "#a54e3b";
    ctx.font = "bold 100px 'PingFang TC', sans-serif";
    ctx.fillText(`${quizScore} / 10`, 75, 285);
    ctx.fillStyle = "#17483f";
    ctx.font = "bold 30px 'PingFang TC', sans-serif";
    ctx.fillText(quizScore >= 8 ? "觀察家：能用證據說明判斷" : quizScore >= 6 ? "證據學徒：已找到多數判斷線索" : "再想一步：回到解析補上漏掉的線索", 80, 345);
    const wrap = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
      let line = "";
      let row = y;
      for (const char of text) {
        const test = line + char;
        if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line, x, row); line = char; row += lineHeight; }
        else line = test;
      }
      if (line) ctx.fillText(line, x, row);
      return row + lineHeight;
    };
    let y = 430;
    quiz.forEach((item, index) => {
      const chosen = quizAnswers[index];
      const correct = chosen === item.a;
      ctx.fillStyle = correct ? "#2e6c5f" : "#a54e3b";
      ctx.font = "bold 25px 'PingFang TC', sans-serif";
      ctx.fillText(`${correct ? "✓" : "○"} 第 ${index + 1} 題`, 80, y);
      ctx.fillStyle = "#302a25";
      ctx.font = "23px 'PingFang TC', sans-serif";
      y = wrap(item.q, 220, y, 930, 34);
      ctx.fillStyle = "#756759";
      ctx.font = "20px 'PingFang TC', sans-serif";
      y = wrap(chosen === undefined ? "未作答" : `我的判斷：${item.options[chosen]}`, 220, y, 930, 30) + 12;
    });
    ctx.fillStyle = "#b87922";
    ctx.fillRect(0, 1690, 1240, 64);
    ctx.fillStyle = "#fffaf0";
    ctx.font = "bold 23px 'PingFang TC', sans-serif";
    ctx.fillText("Kiki老師｜檔案已由網頁直接產生，可交給教師保存", 75, 1732);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [1240, 1754], hotfixes: ["px_scaling"] });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 1240, 1754);
      const blob = pdf.output("blob");
      triggerDownload(URL.createObjectURL(blob), `課堂${sessionCode}-${group}-${seat}號-學習檢核.pdf`, true);
      setNotice("PDF 已產生並下載；若使用 iPad，請到「檔案」的下載項目查看。");
    } catch {
      setNotice("PDF 產生失敗，請改用 PNG 保存，或重新整理後再試一次。");
    }
  }

  return (
    <main className="site-shell">
      <header className={`topbar ${compact ? "compact" : ""}`}>
        <button className="brand" onClick={() => { setStage("map"); setLesson(0); }} aria-label="回到首頁">
          <span className="brand-mark">光</span>
          <span><small>第五課互動學習</small><strong>重新看見世界</strong></span>
        </button>
        <nav className="main-tabs" aria-label="主要頁面">
          <button className={stage === "map" ? "active" : ""} onClick={() => { setStage("map"); setLesson(0); }}><span>學習地圖</span><small>六關＋兩工具站</small></button>
          <button className={stage === "live" ? "active" : ""} onClick={() => setStage("live")}><span>共學舞台</span><small>即時文字雲</small></button>
          <button className={stage === "studio" ? "active" : ""} onClick={() => setStage("studio")}><span>成果工作室</span><small>寫作與檢核</small></button>
        </nav>
        <div className="header-tools">
          <div className="role-switch" aria-label="切換使用身分">
            <button className={role === "student" ? "active" : ""} onClick={() => setRole("student")}>學生</button>
            <button className={role === "teacher" ? "active" : ""} onClick={() => setRole("teacher")}>教師</button>
          </div>
          <button className="icon-button" onClick={() => setCompact(!compact)} aria-label="收合導覽">{compact ? "展開" : "收合"}</button>
          <span className="signature">Kiki老師</span>
        </div>
      </header>

      <div className="status-ribbon" role="status"><span className="status-dot" />{notice}<span className="identity">{group}・{seat}號</span></div>

      {stage === "map" && lesson === 0 && (
        <>
          <section className="hero">
            <img src={heroDiscoverImage} alt="孩子在晨光中觸摸葉片，遠方有流水、草地與飛鳥" />
            <div className="hero-shade" />
            <div className="hero-copy">
              <p className="eyebrow">《假如給我三天光明》六關主線＋兩座語文工具站</p>
              <h1>同樣生活在這個世界，<br />為什麼有人能感受到更多美好？</h1>
              <p>從重新觀察生活出發，讀懂作者的證據與寫法；再走進人物的方法、環境的支持，最後寫下自己的發現。</p>
              <div className="hero-actions">
                <button className="primary" onClick={() => setLesson(1)}>從第一關開始</button>
                <button className="paper" onClick={() => setStage("live")}>進入課堂 {sessionCode}</button>
              </div>
            </div>
            <div className="hero-question"><b>今天先不急著回答</b><span>沿著六關主線走，看看自己的答案怎麼改變。</span></div>
          </section>

          <section className="journey-section">
            <div className="section-heading"><div><p className="eyebrow dark">整課學習脈絡</p><h2>先走完閱讀思考，再到語文工具站練功</h2></div><div className="progress-pill">已完成 {completed.length}／8 站</div></div>
            <div className="route-heading"><span>主線</span><div><b>從生活觀察走到自己的表達</b><small>六關連續進行，不讓字詞練習切斷課文思考。</small></div></div>
            <div className="lesson-grid main-route">
              {lessons.slice(0, 6).map((item) => (
                <button key={item.no} className={`lesson-card ${item.color} ${completed.includes(item.no) ? "done" : ""}`} onClick={() => setLesson(item.no)}>
                  <span className="lesson-number">{String(item.no).padStart(2, "0")}</span>
                  <span className="lesson-icon">{item.icon}</span>
                  <strong>{item.short}</strong>
                  <span>{item.title}</span>
                  <em>{item.question}</em>
                  {completed.includes(item.no) && <i>完成</i>}
                </button>
              ))}
            </div>
            <div className="route-heading tools"><span>工具</span><div><b>需要時進站查證、修理與練習</b><small>教師可穿插安排，不是主線故事的下一個結論。</small></div></div>
            <div className="lesson-grid tool-route">{lessons.slice(6).map((item) => <button key={item.no} className={`lesson-card ${item.color} ${completed.includes(item.no) ? "done" : ""}`} onClick={() => setLesson(item.no)}><span className="lesson-number">工具 {item.no - 6}</span><span className="lesson-icon">{item.icon}</span><strong>{item.short}</strong><span>{item.title}</span><em>{item.question}</em>{completed.includes(item.no) && <i>完成</i>}</button>)}</div>
          </section>
        </>
      )}

      {stage === "map" && lesson > 0 && (
        <section className="lesson-workspace">
          <aside className="lesson-rail">
            <button className="back-map" onClick={() => setLesson(0)}>← 學習地圖</button>
            {lessons.map((item, index) => <button key={item.no} className={`${lesson === item.no ? "active" : ""} ${index === 6 ? "tool-start" : ""}`} onClick={() => setLesson(item.no)}><span>{index < 6 ? item.no : `T${item.no - 6}`}</span><b>{item.short}</b>{completed.includes(item.no) && <i>✓</i>}</button>)}
          </aside>
          <div className="lesson-main">
            <div className="lesson-titlebar"><div><p className="eyebrow dark">{lesson <= 6 ? `主線第 ${lesson} 關` : `語文工具站 ${lesson - 6}`}</p><h2>{lessons[lesson - 1].title}</h2></div><p>{lessons[lesson - 1].question}</p></div>

            {lesson === 1 && <ObservationLesson onSend={submitObservation} connected={firebaseReady} />}
            {lesson === 2 && (
              <div className="reading-layout">
                <article className="paper-card reading-card">
                  <div className="card-kicker">證據放大鏡</div>
                  <h3>海倫怎麼證明「仔細感受，就能發現美好」？</h3>
                  <div className="evidence-mission"><span>本關要證明的想法</span><b>仔細留意生活，才會發現原本忽略的美好，也更珍惜自己擁有的感官。</b></div>
                  <div className="evidence-steps"><span><b>1</b>讀五句</span><span><b>2</b>點兩句直接描寫海倫「發現美好」的證據</span><span><b>3</b>寫出這些證據讓你知道什麼</span></div>
                  <p className="instruction">提示：找出有「她做了什麼＋感受到什麼」的句子。不是選看起來最感人的句子。</p>
                  <div className="passage-lines">
                    {passageLines.map((line, index) => <button key={line} className={selectedEvidence.includes(index) ? "selected" : ""} onClick={() => setSelectedEvidence((old) => old.includes(index) ? old.filter((n) => n !== index) : [...old, index].slice(-2))}><span>{index + 1}</span>{line}</button>)}
                  </div>
                  {selectedEvidence.length === 2 && <div className={`evidence-feedback ${selectedEvidence.includes(2) && selectedEvidence.includes(3) ? "correct" : "retry"}`}><b>{selectedEvidence.includes(2) && selectedEvidence.includes(3) ? "這兩句是直接證據" : "再用提示檢查一次"}</b><p>{selectedEvidence.includes(2) && selectedEvidence.includes(3) ? "第3句寫她觸摸樹枝與蓓蕾，感受到春天；第4句寫流水、草地帶來的溫暖感受。都有『動作＋具體感受』。" : "第1句是作者先提出想法；第2句用朋友形成對比；第5句是作者的追問。請找直接描寫海倫怎麼接觸事物、又感受到什麼的句子。"}</p></div>}
                  <label className="claim-builder"><b>我的完整回答</b><span>我選第＿＿句和第＿＿句，因為海倫＿＿＿＿，這讓我知道＿＿＿＿。</span><textarea value={evidenceExplanation} onChange={(e) => setEvidenceExplanation(e.target.value)} placeholder="例如：我選第3句和第4句，因為海倫用手觸摸樹枝、流水和草地，仍感受到春天與溫暖，這讓我知道仔細感受就能發現生活的美好。" /></label>
                </article>
                <AnnotationPanel mode={annotationMode} setMode={setAnnotationMode} marks={marks} setMarks={setMarks} note={note} setNote={setNote} showNote={showNote} setShowNote={setShowNote} drawingRef={drawingRef} drawingActiveRef={drawingActive} drawAt={drawAt} onSubmit={submitReadingNote} connected={firebaseReady} />
              </div>
            )}
            {lesson === 3 && <PerspectiveLab />}
            {lesson === 4 && <PeopleLab person={person} setPerson={setPerson} />}
            {lesson === 5 && <InclusionLab hotspots={hotspots} setHotspots={setHotspots} />}
            {lesson === 6 && <WritingLab writing={writing} setWriting={setWriting} observations={observationRecords.filter((record) => record.seat === seat && record.group === group)} onQuiz={() => setStage("studio")} />}
            {lesson === 7 && <MaoDetective sort={maoSort} setSort={setMaoSort} />}
            {lesson === 8 && <SentenceClinic answers={clinic} setAnswers={setClinic} />}

            <div className="lesson-footer-actions">
              <button className="paper" onClick={() => lesson === 7 ? setLesson(0) : setLesson(Math.max(1, lesson - 1))} disabled={lesson === 1}>{lesson === 7 ? "返回學習地圖" : lesson === 8 ? "上一個工具站" : "上一關"}</button>
              <button className="primary" onClick={() => { markLesson(lesson); if (lesson === 6 || lesson === 8) setStage("studio"); else setLesson(lesson + 1); }}>{lesson === 6 ? "完成主線，前往成效檢核" : lesson === 7 ? "完成毛字任務，前往句子診療院" : lesson === 8 ? "完成語文工具站，前往成效檢核" : "留下足跡，前往下一關"}</button>
            </div>
          </div>
        </section>
      )}

      {stage === "live" && (
        <section className="live-stage">
          <div className="live-top">
            <div><p className="eyebrow dark">全班共學舞台</p><h2>原來，我還發現了……</h2><p>每收到一則回應，文字就會重新聚合與換色；高頻詞靠近中央，較少見的詞形成外圍輪廓。</p></div>
            <div className="room-code"><small>課堂代碼</small><b>{sessionCode}</b><span>{cloud.length} 則回應</span></div>
          </div>
          <div className="live-grid">
            <div className="word-cloud-card">
              <div className="cloud-toolbar"><span>{cloudPaused ? "已暫停接收" : "即時接收中"}</span>{role === "teacher" && <button onClick={togglePause}>{cloudPaused ? "繼續接收" : "暫停畫面"}</button>}</div>
              <div className="word-cloud" aria-label="全班文字雲">
                <svg className="cloud-eye" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M65 300 Q500 20 935 300 Q500 580 65 300Z" />
                  <circle cx="500" cy="300" r="112" />
                  <circle cx="500" cy="300" r="34" />
                </svg>
                {cloudLayout.length ? cloudLayout.map(({ text, count, x, y, size, rotate, color }) => <button key={text} className="cloud-word" style={{ left: `${x}%`, top: `${y}%`, fontSize: `${size}px`, color, transform: `translate(-50%,-50%) rotate(${rotate}deg)` }} onClick={() => role === "teacher" && setHiddenWords((old) => [...old, text])} title={role === "teacher" ? "點擊可隱藏" : `${count} 人提到`}><span>{text}</span>{count > 1 && <small>{count}</small>}</button>) : <div className="empty-cloud">等待第一個發現飄進來……</div>}
              </div>
              <div className="cloud-prompt"><b>像一隻重新看見的眼睛</b><span>中央大詞代表多人注意到；外圍小詞也可能帶來全新的觀察角度。</span></div>
            </div>
            <aside className="response-panel">
              {role === "student" ? (
                <>
                  <h3>送出我的發現</h3>
                  <div className={`sync-card ${firebaseReady ? "online" : "offline"}`}><b>{firebaseReady ? "已連上教師課堂" : "本機練習模式"}</b><span>{firebaseReady ? "送出後，教師大螢幕會立即更新。" : "答案只留在這台裝置，教師端不會收到。"}</span></div>
                  <label>課堂代碼<input value={sessionCode} onChange={(e) => setSessionCode(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" /></label>
                  <div className="two-fields"><label>組別<select value={group} onChange={(e) => setGroup(e.target.value)}>{[1,2,3,4,5,6].map((n) => <option key={n}>第{n}組</option>)}</select></label><label>座號<input value={seat} onChange={(e) => setSeat(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" /></label></div>
                  <label>一個具體的發現<input value={word} onChange={(e) => setWord(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitCloud()} placeholder="例如：葉脈、遠處的鳥鳴" maxLength={8} /></label>
                  <button className="primary wide" onClick={submitCloud} disabled={cloudPaused}>送進全班文字雲</button>
                  <p className="privacy-note">只記錄組別與座號，不需要姓名。</p>
                </>
              ) : (
                <>
                  <div className="teacher-badge">教師控制</div><h3>把回答變成討論</h3>
                  <div className={`sync-card ${firebaseReady ? "online" : "offline"}`}><b>{firebaseReady ? "跨裝置收件已連線" : "目前只有本機紀錄"}</b><span>{firebaseReady ? `已收到 ${observationRecords.length} 份觀察紀錄與 ${readingNotes.length} 張心得便利貼。` : "其他 iPad 的答案不會傳到教師端；必須完成 Firebase 設定。"}</span></div>
                  <button className="control-row" onClick={() => setShowRecords(!showRecords)}><span>收</span><b>查看第一關完整紀錄（{observationRecords.length}）</b></button>
                  <button className="control-row" onClick={togglePause}><span>{cloudPaused ? "▶" : "Ⅱ"}</span><b>{cloudPaused ? "繼續接收" : "暫停接收"}</b></button>
                  <button className="control-row" onClick={downloadCloudPng}><span>↓</span><b>下載文字雲 PNG</b></button>
                  <button className="control-row" onClick={downloadClassroomPdf}><span>▤</span><b>下載課堂紀錄 PDF</b></button>
                  <button className="control-row" onClick={newClassroom}><span>＋</span><b>建立新課堂</b></button>
                  <button className="control-row danger" onClick={clearSession}><span>×</span><b>下載後結束並清除</b></button>
                  <p className="teacher-hint">點擊文字雲中的詞，可暫時隱藏不適合投影或需要修正的內容。</p>
                  {showRecords && <div className="record-drawer"><b>第一關完整觀察紀錄</b>{observationRecords.length ? observationRecords.map((record) => <article key={record.id}><span>{record.group}・{record.seat}號</span><p><strong>第一眼：</strong>{record.first}</p><p><strong>第二次：</strong>{record.second}</p></article>) : <p>尚未收到完整紀錄。</p>}</div>}
                </>
              )}
            </aside>
          </div>
          <section className="thought-wall" aria-label="全班想法牆">
            <div className="thought-wall-heading"><div><p className="eyebrow dark">閱讀心得便利貼</p><h3>哪個描寫讓你感受到海倫眼中的美好？</h3></div><span>{readingNotes.length} 張想法</span></div>
            {readingNotes.length ? <div className="thought-grid">{readingNotes.map((item, index) => <article key={item.id} style={{ transform: `rotate(${index % 2 ? 1.1 : -1.1}deg)` }}><small>{item.group}・{item.seat}號</small><p>{item.note}</p><button onClick={() => reactToReadingNote(item.id)}>◉ 我也注意到 <b>{item.reactions || ""}</b></button></article>)}</div> : <div className="empty-thoughts">回到第二關打開心得便利貼，送出第一張全班想法。</div>}
          </section>
        </section>
      )}

      {stage === "studio" && (
        <section className="studio-stage">
          <div className="studio-intro"><p className="eyebrow dark">終點成效檢核</p><h2>我不只記得答案，也說得出判斷線索</h2><p>十題涵蓋觀點與證據、毛部字、同音詞、病句、人稱、人物閱讀、共融思考與寫作。</p></div>
          {!quizDone ? (
            <div className="quiz-card">
              <div className="quiz-progress"><span>第 {quizIndex + 1} 題／10</span><div><i style={{ width: `${(quizIndex + 1) * 10}%` }} /></div><b>{quizScore} 分</b></div>
              <div className="quiz-context"><span>先讀資料</span><p>{quiz[quizIndex].context}</p></div>
              <h3>{quiz[quizIndex].q}</h3>
              <div className="quiz-options">
                {quiz[quizIndex].options.map((option, index) => {
                  const answered = quizChoice !== null;
                  const correct = index === quiz[quizIndex].a;
                  const picked = quizChoice === index;
                  return <button key={option} disabled={answered} className={`${answered && correct ? "correct" : ""} ${answered && picked && !correct ? "wrong" : ""}`} onClick={() => answerQuiz(index)}><span>{String.fromCharCode(65 + index)}</span>{option}</button>;
                })}
              </div>
              {quizChoice !== null && <div className={`explanation ${quizChoice === quiz[quizIndex].a ? "ok" : "retry"}`}><b>{quizChoice === quiz[quizIndex].a ? "這條判斷線索成立" : "這個選項漏看了一個關鍵"}</b><p className="choice-reason">你選的答案：{quiz[quizIndex].optionTips[quizChoice]}</p><p>{quiz[quizIndex].tip}</p><button className="primary" onClick={nextQuiz}>{quizIndex === 9 ? "看總結" : "帶著線索到下一題"}</button></div>}
            </div>
          ) : (
            <div className="result-board"><span className="result-seal">{quizScore >= 8 ? "觀察家" : quizScore >= 6 ? "證據學徒" : "再想一步"}</span><h2>{quizScore}／10</h2><p>{quizScore >= 8 ? "你能把觀察、證據與尊重放進同一套思考方法。" : "分數不是終點。回到解析，找出自己判斷時漏掉的線索。"}</p><div className="result-actions"><button className="primary" onClick={resetQuiz}>再挑戰一次</button><button className="paper" onClick={downloadResultPdf}>下載 PDF 紀錄</button></div></div>
          )}
        </section>
      )}

      <footer><p>從觀察到證據，從人物到環境，最後回到自己的生活。</p><details className="footer-sources"><summary>影片與查證資料</summary><div><a href="https://www.youtube.com/watch?v=FfzV50NIqnc" target="_blank" rel="noreferrer">▶ 公視兒少：黃裕翔的音樂課</a><a href="https://hre.pro.edu.tw/vedu/4103" target="_blank" rel="noreferrer">《逆光飛翔》人權教育評論</a><a href="https://www.youtube.com/watch?v=0QODz_xciKY" target="_blank" rel="noreferrer">▶ 1954年海倫・凱勒紀錄片</a><a href="https://stv.naer.edu.tw/watch/128664" target="_blank" rel="noreferrer">愛學網：海倫・凱勒</a><a href="https://www.afb.org/about-afb/history/helen-keller" target="_blank" rel="noreferrer">海倫・凱勒官方檔案</a><a href="https://www.mfpa.tw/web/artist/artist.jsp?cpid=CP1553572810134" target="_blank" rel="noreferrer">謝坤山／口足畫家協會</a><a href="https://www.un.org/development/desa/disabilities/convention-on-the-rights-of-persons-with-disabilities/article-27-work-and-employment.html" target="_blank" rel="noreferrer">CRPD工作權</a></div></details><b>Kiki老師</b></footer>
    </main>
  );
}

function ObservationLesson({ onSend, connected }: { onSend: (first: string, second: string) => Promise<boolean>; connected: boolean }) {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [sending, setSending] = useState(false);
  return <div className="observation-grid">
    <div className="scene-card"><img src={heroDiscoverImage} alt="可仔細觀察的花園、流水、葉片和飛鳥" /><div className="scene-lens lens-one">葉片</div><div className="scene-lens lens-two">水面</div><div className="scene-lens lens-three">遠方</div></div>
    <div className="paper-card observation-form"><div className="card-kicker">同一個地方，兩次發現</div><h3>第一眼，你注意到什麼？</h3><textarea value={first} onChange={(e) => setFirst(e.target.value)} placeholder="先自由看十秒，寫下一個發現。" />
      <div className="observe-steps"><b>第二次，換四個線索</b><span>看一個平常忽略的小地方</span><span>找遠處與近處的聲音</span><span>想像安全物件的質地或溫度</span><span>找出正在發生的變化</span></div>
      <textarea value={second} onChange={(e) => setSecond(e.target.value)} placeholder="例如：陽光穿過葉片，葉脈像細細的道路。" />
      <div className="reflection-box"><b>比較兩次</b><p>地方沒有換，改變的是＿＿＿＿；所以仔細觀察能讓我＿＿＿＿。</p></div>
      <div className={`submission-status ${connected ? "online" : "offline"}`}><b>{connected ? "教師可即時收件" : "目前只會存在這台裝置"}</b><span>{connected ? "送出後，教師能看到第一眼與第二次觀察的完整內容。" : "連上 Firebase 後，才會跨 iPad 傳到教師收件區；目前可先試用流程。"}</span></div>
      <button className="primary wide" disabled={sending} onClick={async () => { setSending(true); await onSend(first, second); setSending(false); }}>{sending ? "正在送出……" : "送出完整紀錄，再製作關鍵詞"}</button>
    </div>
  </div>;
}

function AnnotationPanel({ mode, setMode, marks, setMarks, note, setNote, showNote, setShowNote, drawingRef, drawingActiveRef, drawAt, onSubmit, connected }: {
  mode: AnnotationMode; setMode: (m: AnnotationMode) => void; marks: Record<number, AnnotationMode | undefined>; setMarks: React.Dispatch<React.SetStateAction<Record<number, AnnotationMode | undefined>>>; note: string; setNote: (s: string) => void; showNote: boolean; setShowNote: (s: boolean) => void; drawingRef: React.RefObject<HTMLCanvasElement | null>; drawingActiveRef: React.MutableRefObject<boolean>; drawAt: (e: React.PointerEvent<HTMLCanvasElement>) => void; onSubmit: () => Promise<void>; connected: boolean;
}) {
  function downloadAnnotationPng() {
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 1180;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f8f0df";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#184b43";
    ctx.font = "bold 52px sans-serif";
    ctx.fillText("證據放大鏡｜我的閱讀標註", 72, 82);
    ctx.fillStyle = "#765f4d";
    ctx.font = "25px sans-serif";
    ctx.fillText("點讀課文、留下標記，再用課文細節說出自己的想法。", 76, 128);

    let y = 205;
    passageLines.slice(2, 5).forEach((line, offset) => {
      ctx.font = "28px sans-serif";
      const lines = wrapCanvasLines(ctx, line, 1170);
      const mark = marks[offset + 2];
      lines.forEach((part) => {
        const width = ctx.measureText(part).width;
        if (mark === "highlight") {
          ctx.fillStyle = "rgba(244, 202, 72, .5)";
          ctx.fillRect(94, y - 29, width + 18, 40);
        }
        ctx.fillStyle = "#332d27";
        ctx.fillText(part, 102, y);
        if (mark === "underline") {
          ctx.strokeStyle = "#a54e3b";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(100, y + 9);
          ctx.lineTo(105 + width, y + 9);
          ctx.stroke();
        }
        y += 46;
      });
      y += 24;
    });

    ctx.fillStyle = "#f4dc8a";
    ctx.fillRect(72, 520, 1256, 286);
    ctx.fillStyle = "#934535";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("讀完第三段，我想說……", 102, 568);
    ctx.fillStyle = "#332d27";
    ctx.font = "28px sans-serif";
    wrapCanvasLines(ctx, note.trim() || "（尚未輸入文字心得）", 1170).slice(0, 5).forEach((line, index) => ctx.fillText(line, 104, 625 + index * 42));

    ctx.fillStyle = "#184b43";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("我的手寫／圖像紀錄", 76, 868);
    ctx.fillStyle = "#fffdf6";
    ctx.fillRect(72, 900, 1256, 220);
    if (drawingRef.current) ctx.drawImage(drawingRef.current, 92, 910, 520, 220);
    ctx.fillStyle = "#7d6b57";
    ctx.font = "22px sans-serif";
    ctx.fillText("Kiki老師｜假如給我三天光明", 76, 1152);
    triggerDownload(canvas.toDataURL("image/png"), "我的閱讀標註.png");
    tone(true);
  }

  return <aside className="annotation-card"><div className="annotation-tools"><b>閱讀工具箱</b><button className={mode === "highlight" ? "active" : ""} onClick={() => setMode("highlight")}>螢光筆</button><button className={mode === "underline" ? "active" : ""} onClick={() => setMode("underline")}>底線</button><button className={mode === "erase" ? "active" : ""} onClick={() => setMode("erase")}>橡皮擦</button></div>
    <div className="mini-reading"><p>再讀一次第三段。點句子，留下你的標記。</p>{passageLines.slice(2,5).map((line, i) => <button key={line} className={marks[i + 2] || ""} onClick={() => setMarks((old) => ({ ...old, [i + 2]: mode === "erase" ? undefined : mode }))}>{line}</button>)}</div>
    <button className="sticky-toggle" onClick={() => setShowNote(!showNote)}>＋ 心得便利貼</button>
    {showNote && <div className="sticky-note">
      <label><strong>讀完第三段，我想說……</strong><span>哪一個描寫最讓你感受到海倫眼中的美好？請寫出課文細節，再說明原因。</span><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="我注意到＿＿＿＿。這個描寫讓我感受到＿＿＿＿，因為＿＿＿＿。" maxLength={180} /></label>
      <div className={`submission-status ${connected ? "online" : "offline"}`}><b>{connected ? "文字可送到全班想法牆" : "目前只會顯示在這台裝置"}</b><span>{connected ? "送出後，同學可以閱讀並按『我也注意到』。" : "完成 Firebase 連線後，才會跨 iPad 同步給全班。"}</span></div>
      <button className="primary wide" disabled={!note.trim()} onClick={onSubmit}>送到全班想法牆</button>
      <b className="draw-label">或直接寫畫</b><canvas ref={drawingRef} width={520} height={220} onPointerDown={(e) => { drawingActiveRef.current = true; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={drawAt} onPointerUp={() => { drawingActiveRef.current = false; drawingRef.current?.getContext("2d")?.beginPath(); }} /><div className="annotation-export"><button onClick={() => drawingRef.current?.getContext("2d")?.clearRect(0,0,520,220)}>清除手寫</button><button onClick={downloadAnnotationPng}>↓ 下載這張閱讀標註 PNG</button></div>
    </div>}
  </aside>;
}

function MaoDetective({ sort, setSort }: { sort: Record<string, "mao" | "other">; setSort: React.Dispatch<React.SetStateAction<Record<string, "mao" | "other">>> }) {
  const clues = [
    { char: "毯", x: 40, y: 78, note: "課本字：鋪在地面上的毯子，多為毛織物。", words: ["地毯", "毛毯", "壁毯"] },
    { char: "毽", x: 88, y: 55, note: "課本字：裝上羽毛製成的遊戲用具。", words: ["毽子", "踢毽子"] },
    { char: "氈", x: 47, y: 49, note: "習作延伸字：可組成氈帽、毛氈。", words: ["氈帽", "毛氈"] },
    { char: "毫", x: 65, y: 40, note: "課本字：可指細毛，也能表示極細微的分量。", words: ["毫毛", "狼毫", "羊毫", "兔毫", "毫髮", "毫米", "毫克"] },
    { char: "耗", x: 16, y: 56, note: "習作辨析字：字裡有毛，但正式部首是耒部。", words: ["耗費", "消耗", "耗時"] },
  ];
  const chars = clues.map((item) => item.char);
  const [found, setFound] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [wordAnswers, setWordAnswers] = useState<Record<string,string>>({});
  const correct = sort["耗"] === "other" && chars.filter((char) => char !== "耗").every((char) => sort[char] === "mao");
  const assign = (char: string, family: "mao" | "other") => { setSort((old) => ({ ...old, [char]: family })); setSelected(null); setChecked(false); };
  return <div className="detective-game">
    <section className="detective-search">
      <img src={maoDetectiveImage} alt="藏有地毯、毽子、氈帽、毫毛與耗字線索的偵探書房" />
      <div className="detective-title"><div className="card-kicker light">毛字偵探所・案件 03</div><h3>找出五張藏在事物旁的字證</h3><p>先觀察場景。找到字後，才帶回案件桌判斷部首；字卡不會先公布字義。</p><b>已找到 {found.length}／5</b></div>
      {clues.map((item) => <button key={item.char} className={`hidden-clue ${found.includes(item.char) ? "found" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => setFound((old) => old.includes(item.char) ? old : [...old, item.char])} aria-label={`尋找字證 ${item.char}`}><span>{found.includes(item.char) ? "✓" : item.char}</span></button>)}
    </section>
    <section className="case-board">
      <div className="case-board-head"><div><span>案件桌</span><h3>這些字的正式部首是什麼？</h3></div><p>拖曳字卡，或在 iPad 上點字卡後再點家族。先判斷，送出後才打開教材線索。</p></div>
      <div className="evidence-tray">{found.map((char) => <button key={char} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", char)} className={selected === char ? "selected" : ""} onClick={() => setSelected(char)}><b>{char}</b><small>{sort[char] ? "可重新歸檔" : "尚未歸檔"}</small></button>)}{!found.length && <span>先到上方場景尋找字證。</span>}</div>
      <div className="family-files">
        <DetectiveDropZone title="毛部家族" chars={chars.filter((char) => sort[char] === "mao")} selected={selected} onAssign={(char) => assign(char, "mao")} />
        <DetectiveDropZone title="其他部首" chars={chars.filter((char) => sort[char] === "other")} selected={selected} onAssign={(char) => assign(char, "other")} />
      </div>
      <button className="primary check-case" disabled={found.length < 5 || Object.keys(sort).length < 5} onClick={() => setChecked(true)}>提交分類，打開案件卷宗</button>
      {checked && <div className={`detective-verdict ${correct ? "solved" : "retry"}`}><b>{correct ? "分類正確，正式查證" : "還有字證放錯家族"}</b><p>{correct ? "毯、毽、氈、毫是毛部；耗雖然含有『毛』，部首卻是耒部。判斷部首不能只看局部字形。" : "回到字形想一想：哪一個字的左半部本身就是另一個部首？需要時可查字典確認。"}</p></div>}
      {checked && correct && <div className="case-files"><div className="case-files-title"><span>形、義、用法三合一</span><h3>每個字都要完成造詞，案件才算結案</h3></div>{clues.map((item) => { const answer = (wordAnswers[item.char] || "").trim(); const ok = item.words.includes(answer); return <article key={item.char}><div className="case-char">{item.char}</div><div><p>{item.note}</p><label>我會造詞<input value={wordAnswers[item.char] || ""} onChange={(e) => setWordAnswers((old) => ({ ...old, [item.char]: e.target.value }))} placeholder={`寫一個含「${item.char}」的詞`} /></label><span className={answer ? (ok ? "word-ok" : "word-retry") : ""}>{answer ? (ok ? "✓ 詞語成立" : "再想一個課本或生活中常用的詞") : ""}</span></div></article>})}<div className="case-summary"><b>教材線索歸納</b><p>毛部字多和人、動植物表皮上細長如絲的組織有關；但一個字的意思仍要放回詞語和句子查證。</p><p><strong>特別線索：</strong>狼毫、羊毫、兔毫依筆毛種類命名，因此「毫」是毛部。</p></div></div>}
    </section>
  </div>;
}

function DetectiveDropZone({ title, chars, selected, onAssign }: { title: string; chars: string[]; selected: string | null; onAssign: (char: string) => void }) {
  return <button className="family-file" onClick={() => selected && onAssign(selected)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onAssign(e.dataTransfer.getData("text/plain")); }}><span>歸檔區</span><b>{title}</b><div>{chars.map((char) => <i key={char}>{char}</i>)}</div><small>{selected ? `點此放入「${selected}」` : "等待字證"}</small></button>;
}

function SentenceClinic({ answers, setAnswers }: { answers: Record<number,string>; setAnswers: React.Dispatch<React.SetStateAction<Record<number,string>>> }) {
  const cases = [
    { parts: ["園遊會時，大家將攤位布置得", "千篇一律", "，好熱鬧哇！"], target: 1, accepted: ["五彩繽紛", "多采多姿", "各具特色"], options: ["五彩繽紛", "安安靜靜", "毫髮未傷"], type: "前後語意矛盾", why: "『千篇一律』表示全都一樣，和園遊會攤位多彩、熱鬧的情境不合。" },
    { parts: ["他習慣在", "冷靜", "的夜晚寫作，這樣可以集中思緒。"], target: 1, accepted: ["寧靜", "安靜"], options: ["寧靜", "立志", "專注"], type: "詞語搭配不當", why: "『冷靜』多形容人的情緒；描寫夜晚的環境，可以用『寧靜』。" },
    { parts: ["一位完全失明的行人", "看到", "孩子唱著歌，便往聲音的方向走去。"], target: 1, accepted: ["聽到", "聽見"], options: ["聽到", "摸到", "想到"], type: "感官線索不合", why: "句中明確說他完全失明，而且後文指出『聲音』是線索，因此應改成『聽到』；不能只看到『視覺障礙者』就一概判定完全看不見。" },
    { parts: ["姐姐洗完澡後，便蓋著棉被", "舒緩的", "躺在床上休息。"], target: 1, accepted: ["舒服地", "舒適地"], options: ["舒服地", "迅速地", "緊張地"], type: "意思與用字不合", why: "『舒緩』通常表示減輕緊張或疼痛；這裡要描寫躺著的感受，可改成『舒服地』。" },
    { parts: ["老師的叮嚀，對我掌握課程內容有很大的", "注意", "。"], target: 1, accepted: ["助益", "幫助"], options: ["助益", "注意", "立志"], type: "同音近義混用", why: "『助益』是幫助、益處；『注意』是把心思放在某件事上，不能說『有很大的注意』。" },
    { parts: ["我們在田野間", "散布", "，看見蒲公英種子隨風飛舞。"], target: 1, accepted: ["散步"], options: ["散步", "分布", "散布"], type: "同音詞誤用", why: "人在田野間悠閒走動是『散步』；事物分散在各處才用『散布』。" },
  ];
  const [caseIndex, setCaseIndex] = useState(0);
  const [selectedPart, setSelectedPart] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [feedback, setFeedback] = useState<"" | "correct" | "retry">("");
  const item = cases[caseIndex];
  const answer = answers[caseIndex] || "";
  const correct = feedback === "correct";
  const check = () => { const ok = selectedPart === item.target && item.accepted.includes(answer.trim()); setFeedback(ok ? "correct" : "retry"); tone(ok); };
  const next = () => { if (caseIndex < cases.length - 1) { setCaseIndex((old) => old + 1); setSelectedPart(null); setShowHelp(false); setFeedback(""); } };
  return <div className={`clinic-hospital ${correct ? "healed" : ""}`}>
    <div className="clinic-hero"><img src={sentenceClinicImage} alt="孩子帶著不通順的句子到診間，修改後恢復精神" /><div className="clinic-hero-copy"><span>句子診療院</span><h3>{correct ? "治療完成，句子恢復精神！" : "今天哪一段話不舒服？"}</h3><p>不先公布病灶。請自己圈出不合理的詞，再開處方。</p></div></div>
    <div className="clinic-process"><span>1 讀整句</span><i>→</i><span>2 圈病灶</span><i>→</i><span>3 輸入處方</span><i>→</i><span>4 重讀檢查</span></div>
    <article className="patient-chart"><div className="patient-progress"><span>病歷 {String(caseIndex + 1).padStart(2,"0")}／{cases.length}</span><b>{correct ? "已康復" : "等待診斷"}</b></div><h3>{item.parts.map((part, index) => <button key={`${part}-${index}`} className={selectedPart === index ? "circled" : ""} onClick={() => { setSelectedPart(index); setFeedback(""); }}>{part}</button>)}</h3><p className="clinic-instruction">第一步：點選你認為使用不合理的詞語或片段。</p>
      {selectedPart !== null && <div className="prescription"><label>第二步：輸入你想替換的詞語<input value={answer} onChange={(e) => { setAnswers((old) => ({ ...old, [caseIndex]: e.target.value })); setFeedback(""); }} placeholder="自己想一個更適合的詞" /></label><div className="prescription-actions"><button className="primary" onClick={check}>替句子治療</button><button className="paper" onClick={() => setShowHelp(!showHelp)}>我需要提示</button></div>{showHelp && <div className="rescue-options"><span>選一張可能的處方，再重讀整句：</span>{item.options.map((option) => <button key={option} onClick={() => setAnswers((old) => ({ ...old, [caseIndex]: option }))}>{option}</button>)}</div>}</div>}
      {feedback && <div className={`diagnosis ${correct ? "correct" : ""}`}><b>{correct ? `康復原因：${item.type}` : "還沒找到真正的病灶"}</b><span>{correct ? item.why : "檢查兩件事：你圈的位置是否不合理？換入的詞放回整句後是否通順？需要時再按提示。"}</span></div>}
      {correct && <div className="healed-sentence"><span>康復後的句子</span><p>{item.parts.map((part, index) => index === item.target ? answer.trim() : part).join("")}</p>{caseIndex < cases.length - 1 ? <button className="primary" onClick={next}>下一位句子病人</button> : <b>六種病例都完成了！</b>}</div>}
    </article>
  </div>;
}

function PerspectiveLab() {
  const [judgments, setJudgments] = useState<Record<string,"first"|"third">>({});
  const [direction, setDirection] = useState<"toFirst" | "toThird">("toFirst");
  const [rewrite, setRewrite] = useState("");
  const [checked, setChecked] = useState(false);
  const compareReady = judgments.textbook === "first" && judgments.workbook === "third";
  const source = direction === "toFirst" ? "海倫在蘇利文老師的教導下，學習用手指溝通，後來完成大學學業並持續寫作。" : "我用手觸摸樹枝與蓓蕾，感受到春天正悄悄來到。";
  const rewriteOk = direction === "toFirst" ? rewrite.includes("我") : (rewrite.includes("海倫") || rewrite.includes("她")) && !rewrite.includes("我");
  return <div className="perspective-workshop">
    <div className="perspective-mission"><span>任務 1｜同一位人物，誰在說？</span><h3>先找人稱線索，再比較兩種文章讓讀者看見什麼。</h3><p>這不是猜哪種寫法比較好，而是判斷作者為什麼選擇這個鏡頭。</p></div>
    <div className="dual-texts">
      <article><small>課文正文</small><h3>海倫自己說</h3><p><mark>我</mark>單憑觸覺，就能發現許多有趣的事物。當流水經過掌心，<mark>我</mark>感到世界如此溫暖。</p><div className="person-choice"><button className={judgments.textbook === "first" ? "chosen" : ""} onClick={() => setJudgments((old) => ({ ...old, textbook: "first" }))}>第一人稱</button><button className={judgments.textbook === "third" ? "chosen" : ""} onClick={() => setJudgments((old) => ({ ...old, textbook: "third" }))}>第三人稱</button></div></article>
      <article><small>習作〈海倫・凱勒的奇蹟〉</small><h3>別人介紹她</h3><p><mark>海倫</mark>在蘇利文老師教導下，學習用手指溝通；後來<mark>她</mark>完成大學學業並持續寫作。</p><div className="person-choice"><button className={judgments.workbook === "first" ? "chosen" : ""} onClick={() => setJudgments((old) => ({ ...old, workbook: "first" }))}>第一人稱</button><button className={judgments.workbook === "third" ? "chosen" : ""} onClick={() => setJudgments((old) => ({ ...old, workbook: "third" }))}>第三人稱</button></div></article>
    </div>
    {Object.keys(judgments).length === 2 && <div className={`perspective-feedback ${compareReady ? "correct" : "retry"}`}>{compareReady ? "找對了：『我』是第一人稱；用姓名或『她』介紹人物，是第三人稱。" : "再看被標出的稱呼：說話者用什麼方式稱呼海倫？"}</div>}
    {compareReady && <div className="comparison-board"><div><b>第一人稱讓我看見</b><span>海倫此刻的感受、想法與渴望，讀者和人物距離較近。</span></div><div><b>第三人稱讓我看見</b><span>海倫經歷哪些重要事件，時間脈絡較清楚。</span></div><p>第三人稱不等於「知道所有事情」；仍要看文章實際提供哪些資料。</p></div>}
    <section className="rewrite-studio"><div className="rewrite-head"><span>任務 2｜換一個鏡頭</span><div><button className={direction === "toFirst" ? "active" : ""} onClick={() => { setDirection("toFirst"); setRewrite(""); setChecked(false); }}>改成海倫自己說</button><button className={direction === "toThird" ? "active" : ""} onClick={() => { setDirection("toThird"); setRewrite(""); setChecked(false); }}>改成別人介紹她</button></div></div><article className="source-strip"><b>改寫前</b><p>{source}</p></article><label><b>改寫二至三句</b><textarea value={rewrite} onChange={(e) => { setRewrite(e.target.value); setChecked(false); }} placeholder={direction === "toFirst" ? "提示：把『海倫／她』改成『我』，事件內容不能改變。" : "提示：把『我』改成『海倫／她』，不要擅自增加原文沒有的想法。"} /></label><button className="primary" onClick={() => setChecked(true)}>檢查人稱與內容</button>{checked && <div className={`rewrite-feedback ${rewriteOk ? "correct" : "retry"}`}><b>{rewriteOk ? "人稱鏡頭已經換好" : "人稱線索還沒有換完整"}</b><p>{rewriteOk ? (direction === "toFirst" ? "改成『我』後更像人物親口回顧經歷；若加入感受，必須有文本依據。" : "改成『海倫／她』後，較像傳記資料，能清楚交代人物事件。") : (direction === "toFirst" ? "請用『我』讓海倫成為說話者。" : "請用『海倫』或『她』介紹人物，並移除第一人稱『我』。")}</p></div>}</section>
  </div>;
}

function PeopleLab({ person, setPerson }: { person: number; setPerson: (n: number) => void }) {
  const [marker, setMarker] = useState<StrategyCategory>("difficulty");
  const [classified, setClassified] = useState<Record<string, StrategyCategory>>({});
  const [checked, setChecked] = useState(false);
  const [reflection, setReflection] = useState("");
  const allSentences = personReadings.flatMap((reading, readingIndex) => reading.sentences.map((sentence, sentenceIndex) => ({ ...sentence, key: `${readingIndex}-${sentenceIndex}` })));
  const correctCount = allSentences.filter((sentence) => classified[sentence.key] === sentence.category).length;
  const complete = Object.keys(classified).length === allSentences.length;
  const compareReady = checked && correctCount === allSentences.length;
  const currentReading = personReadings[person];
  const currentComplete = currentReading.sentences.every((_, sentenceIndex) => classified[`${person}-${sentenceIndex}`]);
  const openPerson = (nextPerson: number) => {
    setPerson(nextPerson);
    setMarker("difficulty");
    setChecked(false);
  };
  return <div className="people-lab evidence-research-lab">
    <section className="research-brief">
      <span>人物方法研究所</span>
      <h3>先看四組「方法物件」，猜猜每個人如何學習與工作</h3>
      <p>選一張人物卡打開短文，再用四支螢光筆找證據。四篇完成後，才會開啟共同比較牆。</p>
    </section>
    <div className="person-discovery-cards">{personReadings.map((reading, readingIndex) => {
      const found = reading.sentences.filter((_, sentenceIndex) => classified[`${readingIndex}-${sentenceIndex}`]).length;
      return <button key={reading.name} className={`${person === readingIndex ? "active" : ""} ${found === 4 ? "done" : ""}`} onClick={() => openPerson(readingIndex)}><span className={`method-visual visual-${readingIndex}`} style={{ backgroundImage: `url(${peopleMethodImage})` }} aria-hidden="true" /><b>{reading.name}</b><small>{found === 4 ? "證據已找齊 ✓" : `${found}／4 個證據`}</small></button>;
    })}</div>
    <section className="person-reading-desk">
      <header><div className="portrait-letter">{currentReading.name.slice(0,1)}</div><div><small>{currentReading.source}</small><h3>{currentReading.name}的資料卡</h3></div></header>
      <div className="marker-rack">{(Object.keys(strategyMeta) as StrategyCategory[]).map((key) => <button key={key} className={`marker-${key} ${marker === key ? "active" : ""}`} onClick={() => setMarker(key)}><span>{key === "difficulty" ? "△" : key === "method" ? "⚙" : key === "support" ? "＋" : "→"}</span><b>{strategyMeta[key].label}</b></button>)}</div>
      <p className="marker-prompt">現在找：<b>{strategyMeta[marker].label}</b>｜{strategyMeta[marker].prompt}</p>
      <div className="reading-sentences">{currentReading.sentences.map((sentence, sentenceIndex) => {
        const key = `${person}-${sentenceIndex}`;
        const assigned = classified[key];
        const isWrong = checked && assigned && assigned !== sentence.category;
        return <button key={key} className={`${assigned ? `marked marker-${assigned}` : ""} ${isWrong ? "wrong" : ""}`} onClick={() => { setClassified((old) => ({ ...old, [key]: marker })); setChecked(false); }}><span>{sentence.text}</span>{assigned && <small>{strategyMeta[assigned].label}</small>}</button>;
      })}</div>
      <div className="person-reading-nav"><span>{currentComplete ? "這篇的四種證據已找齊。" : "每一句只標一種最主要的功能。"}</span>{person < 3 && <button className="paper" disabled={!currentComplete} onClick={() => openPerson(person + 1)}>開下一張人物卡 →</button>}</div>
    </section>
    <div className="research-check"><div><b>{Object.keys(classified).length}／{allSentences.length} 句已分類</b><span>{complete ? "可以檢查證據了。" : "四篇短文都要完成，才能一起比較。"}</span></div><button className="primary" disabled={!complete} onClick={() => { setChecked(true); tone(correctCount === allSentences.length); }}>檢查分類</button></div>
    {checked && <div className={`classification-feedback ${compareReady ? "correct" : "retry"}`}><b>{compareReady ? "四篇證據都找到了！" : `目前有 ${correctCount} 句判斷正確`}</b><p>{compareReady ? "接著把四位人物放在同一張表中比較：他們並不是只靠『堅持』，也使用不同方法，並得到人與環境的支持。" : "紅框句子還需要重讀。先問：它是在說遇到的限制、實際做法、外界支持，還是後來的改變？"}</p></div>}
    {compareReady && <section className="four-person-compare"><div className="compare-title"><span>共同比較牆</span><h3>四位人物都不是只靠「勇敢」：點開卡片，比較方法與支持</h3></div><div className="compare-person-grid">{people.map((item, index) => <details key={item.name}><summary><span className={`method-visual visual-${index}`} style={{ backgroundImage: `url(${peopleMethodImage})` }} /><b>{item.name}</b><small>點開比較</small></summary><div><p><i>△</i><span>{item.difficulty}</span></p><p><i>⚙</i><span>{item.method}</span></p><p><i>＋</i><span>{item.support}</span></p><p><i>→</i><span>{item.impact}</span></p></div></details>)}</div></section>}
    {compareReady && <section className="research-reflection"><span>任務 3｜統整心得</span><h3>比較後，我對「面對困難」有什麼新的理解？</h3><p>請同時寫到：一個具體方法、一種外界支持，以及環境可以怎麼改變。不要只寫「要努力、不要放棄」。</p><textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="我原本以為……；比較四位人物後，我發現……。除了個人的方法，還需要……；如果環境能……，就能……。" /><div className="reflection-checks"><span className={reflection.length >= 50 ? "done" : ""}>至少 50 字</span><span className={/方法|練習|工具|點字|聆聽|口持/.test(reflection) ? "done" : ""}>寫到具體方法</span><span className={/支持|家人|老師|同學|機會|環境|工具/.test(reflection) ? "done" : ""}>寫到支持或環境</span></div></section>}
    <PersonResources name={people[person].name} />
  </div>;
}

function PersonResources({ name }: { name: string }) {
  if (name === "黃裕翔") return <details className="media-dock" open>
    <summary>習作延伸：黃裕翔與《逆光飛翔》</summary>
    <div className="media-grid three">
      <article>
        <div className="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/FfzV50NIqnc?rel=0" title="公視兒少：黃裕翔的音樂課" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
        <b>公視兒少｜黃裕翔的音樂課</b>
        <p>從他如何教孩子聽環境聲音，觀察音樂如何成為表達、工作與交朋友的方法。</p>
        <a className="resource-link" href="https://www.youtube.com/watch?v=FfzV50NIqnc" target="_blank" rel="noreferrer">若畫面空白，直接開啟影片 ↗</a>
      </article>
      <article className="source-card"><span>習作人物故事</span><h4>真實人生如何變成電影？</h4><p>《逆光飛翔》由黃裕翔本色演出。閱讀時比較真實經歷、電影改編與習作敘述，找出「方法」與「支持」，不要只留下勵志標籤。</p><a href="https://hre.pro.edu.tw/vedu/4103" target="_blank" rel="noreferrer">教育部人權教育影音評論 ↗</a></article>
      <article className="source-card"><span>人物近況與教學</span><h4>他也能成為教別人的人</h4><p>公視介紹黃裕翔走進小學擔任音樂老師，適合討論：身心障礙者在工作中需要的是什麼環境與合作？</p><a href="https://www.pts.org.tw/zh_tw/pr/latestnews/-%E9%80%86%E5%85%89%E9%A3%9B%E7%BF%94-%E9%BB%83%E8%A3%95%E7%BF%94%E4%B8%8A%E5%85%AC%E8%A6%96-%E8%80%81%E5%B8%AB-%E6%82%A8%E5%93%AA%E4%BD%8D-%E7%AC%AC%E4%B8%80%E6%AC%A1%E7%95%B6%E8%80%81%E5%B8%AB-95454030" target="_blank" rel="noreferrer">公共電視人物資料 ↗</a></article>
    </div>
    <div className="viewing-questions"><b>觀看時先別急著下結論</b><span>① 裕翔遇到的阻礙來自身體、環境，還是別人的預設？</span><span>② 他用了哪些具體方法？</span><span>③ 哪些支持讓他能選擇自己想做的事？</span></div>
  </details>;

  if (name === "海倫・凱勒") return <details className="media-dock" open>
    <summary>海倫・凱勒：影片與原始資料</summary>
    <div className="media-grid">
      <article>
        <div className="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/0QODz_xciKY?rel=0" title="1954年海倫凱勒紀錄片" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
        <b>1954 年紀錄片中的海倫本人</b><p>先觀察她如何溝通，再和課文第一人稱的感受描寫比較。</p><a className="resource-link" href="https://www.youtube.com/watch?v=0QODz_xciKY" target="_blank" rel="noreferrer">若畫面空白，直接開啟影片 ↗</a>
      </article>
      <article className="source-card"><span>官方檔案</span><h4>海倫不只有童年的學習故事</h4><p>美國盲人基金會整理她成年後的寫作與倡議，能避免人物閱讀只停在「克服障礙」。</p><a href="https://www.afb.org/about-afb/history/helen-keller" target="_blank" rel="noreferrer">美國盲人基金會檔案 ↗</a><a href="https://stv.naer.edu.tw/watch/128664" target="_blank" rel="noreferrer">愛學網中文影片頁 ↗</a></article>
    </div>
  </details>;

  return <details className="media-dock"><summary>人物查證資料</summary><div className="media-grid"><article className="source-card"><span>閱讀提醒</span><h4>用可靠資料補足人物故事</h4><p>找出困難、具體方法、他人與環境的支持，以及產生的影響。</p><a href={name === "謝坤山" ? "https://www.mfpa.tw/web/artist/artist.jsp?cpid=CP1553572810134" : "https://nickvujicic.com/"} target="_blank" rel="noreferrer">開啟人物資料 ↗</a></article></div></details>;
}

function InclusionLab({ hotspots, setHotspots }: { hotspots: number[]; setHotspots: React.Dispatch<React.SetStateAction<number[]>> }) {
  const issues = [
    { x: 14, y: 57, title: "入口只有階梯", clue: "輪椅使用者到門口，卻不能自己進入。你要先修哪裡？", choices: [
      { text: "裝呼叫鈴，請同事出來幫忙抬", ok: false, feedback: "能暫時進門，卻仍需要等別人；阻礙沒有被移除。" },
      { text: "增設合適坡道、扶手與自動門", ok: true, feedback: "入口改好後，使用者可以自己選擇進出，也讓推車、長者與受傷的人受益。" },
      { text: "把他的工作改到門外或其他地點", ok: false, feedback: "這是把人移開，不是讓原本的工作場所變得可參與。" },
    ]},
    { x: 36, y: 44, title: "通道狹窄又有透明門", clue: "紙箱與推車擋住動線，透明玻璃也不容易辨認。怎麼修比較完整？", choices: [
      { text: "請同事每次牽著他穿過走道", ok: false, feedback: "有人帶路可應急，但工作者仍無法自己判斷與通行。" },
      { text: "清空通道，加觸覺引導與玻璃對比標示", ok: true, feedback: "同時改善地面動線與玻璃辨識，讓更多人能安全自主移動。" },
      { text: "請他多走幾次，把障礙位置背起來", ok: false, feedback: "把責任推回個人，環境中的危險依然存在。" },
    ]},
    { x: 61, y: 24, title: "研習只有聲音", clue: "螢幕上的人正在說話，但沒有字幕或其他視覺訊息。怎麼讓資訊可取得？", choices: [
      { text: "會後再把簡報交給他自己看", ok: false, feedback: "會後資料有幫助，但他會錯過當下的討論與提問。" },
      { text: "把喇叭音量調得更大", ok: false, feedback: "音量變大不會把語音變成可看見的資訊。" },
      { text: "提供即時字幕、手語與視覺警示", ok: true, feedback: "把重要訊息轉成多種形式，參與者才能同步理解、回應與避難。" },
    ]},
    { x: 88, y: 48, title: "服務台太高", clue: "工作者能到櫃檯前，卻碰不到桌面與常用物品。怎麼修？", choices: [
      { text: "改用可調高度桌面，保留膝部空間並降低常用物", ok: true, feedback: "工具配合不同使用方式，工作者就能自主完成原本的任務。" },
      { text: "請旁邊同事有空時再幫他拿", ok: false, feedback: "偶爾協助可以，但若每天都要等待，就無法自主工作。" },
      { text: "安排他去後台做不需接觸櫃檯的事", ok: false, feedback: "未詢問就更換職務，可能限制選擇，也沒有改善工作設備。" },
    ]},
  ];
  const [activeIssue, setActiveIssue] = useState<number | null>(null);
  const [choices, setChoices] = useState<Record<number, number>>({});
  const allSolved = hotspots.length === issues.length;
  const current = activeIssue === null ? null : issues[activeIssue];
  const picked = activeIssue === null ? undefined : choices[activeIssue];
  return <div className="inclusion-repair-lab">
    <div className="repair-mission"><span>工作場所修復任務</span><h3>不是「修理一個人」，是找出環境擋住了誰</h3><p>先看圖自由偵查：哪裡可能讓人無法進入、取得資訊或自己完成工作？點你覺得可疑的地方。</p></div>
    <div className={`repair-stage ${allSolved ? "solved" : ""}`}><div className="repair-scene"><img src={allSolved ? inclusionSolvedImage : inclusionPuzzleImage} alt={allSolved ? "加入坡道、清楚動線、字幕手語與可調桌面的友善工作場所" : "入口階梯、雜物、無字幕研習和過高櫃檯造成工作阻礙的圖書館"} />{!allSolved && issues.map((issue, index) => <button key={issue.title} aria-label={`探索圖片中的可疑位置：${issue.title}`} className={`discovery-hotspot ${activeIssue === index ? "active" : ""} ${hotspots.includes(index) ? "fixed" : ""}`} style={{ left: `${issue.x}%`, top: `${issue.y}%` }} onClick={() => setActiveIssue(index)}>{hotspots.includes(index) ? "✓" : activeIssue === index ? "！" : <span className="sr-only">可疑位置</span>}</button>)}</div>
      {!allSolved ? <aside className={`repair-console ${activeIssue === null ? "waiting" : ""}`}>{activeIssue === null || !current ? <div className="repair-waiting"><span aria-hidden="true">⌕</span><h3>先從圖片找線索</h3><p>圖片上不會先標答案。仔細看入口、通道、資訊傳達和工作設備；點到可疑處，才會出現修復問題。</p><b>{hotspots.length}／4 已修復</b></div> : <><div className="repair-count"><span>！</span><b>{current.title}</b><small>{hotspots.length}／4 已修復</small></div><h3>{current.clue}</h3><div className="repair-choices">{current.choices.map((choice, index) => <button key={choice.text} className={picked === index ? (choice.ok ? "correct" : "wrong") : ""} onClick={() => { setChoices((old) => ({ ...old, [activeIssue]: index })); if (choice.ok && !hotspots.includes(activeIssue)) { setHotspots((old) => [...old, activeIssue]); tone(true); } else if (!choice.ok) tone(false); }}><span>{index + 1}</span><b>{choice.text}</b></button>)}</div>{picked !== undefined && <div className={`repair-feedback ${current.choices[picked].ok ? "correct" : "retry"}`}><b>{current.choices[picked].ok ? "阻礙真的被移除了" : "這個方法仍把負擔留給個人"}</b><p>{current.choices[picked].feedback}</p></div>}</>}</aside> : <aside className="repair-reveal"><span>改善後</span><h3>同一群人、同一份工作，環境改變後就能有更多自主選擇</h3><div className="sdg-badges"><b>SDG 8<small>合適的工作</small></b><b>SDG 10<small>減少不平等</small></b></div><p>這也呼應身心障礙者權利公約的工作權：工作環境應開放、共融、無障礙，並提供合理調整。</p><div className="ask-first"><b>若仍想協助，先問：</b><span>「請問你需要協助嗎？你希望我怎麼做？」</span></div><button className="paper" onClick={() => { setHotspots([]); setChoices({}); setActiveIssue(null); }}>重新修復一次</button></aside>}
    </div>
  </div>;
}

function WritingLab({ writing, setWriting, observations, onQuiz }: { writing: string; setWriting: (s: string) => void; observations: ObservationRecord[]; onQuiz: () => void }) {
  const [material, setMaterial] = useState(observations.at(-1)?.second || "");
  const [action, setAction] = useState("");
  const [detail, setDetail] = useState("");
  const [discovery, setDiscovery] = useState("");
  const [coachOpen, setCoachOpen] = useState(false);
  const fallbackMaterials = [
    { icon: "葉", title: "光穿過葉片", detail: "葉脈、光影、顏色正在改變" },
    { icon: "水", title: "水流過手心", detail: "溫度、方向、速度與聲音" },
    { icon: "風", title: "遠近兩種聲音", detail: "先聽見什麼？後來又發現什麼？" },
    { icon: "地", title: "腳下或指尖的觸感", detail: "軟硬、粗細、冷暖與移動" },
  ];
  const coachTips = [
    writing.length < 60 ? "目前像一句想法；再補一個完整的觀察過程。" : "篇幅已足以看見一段完整發現。",
    /摸|觸|聽|看|望|走|蹲|靠近|流過|穿過/.test(writing) ? "已經寫到人物如何接近事物。" : "補上『我怎麼靠近、聽、看或觸摸』，讀者才知道發現怎麼發生。",
    /聲|光|影|顏色|溫度|粗|細|軟|硬|香|亮|暗|涼|暖/.test(writing) ? "已經有可感受到的聲音、畫面或觸感。" : "再加入一個能聽見、看見或摸到的細節。",
    /很美|很棒|很感動|非常漂亮/.test(writing) ? "找到空泛詞了：把『很美／很棒／很感動』換成具體細節。" : "沒有只用空泛形容詞代替描寫。",
    /原本|本來|沒注意|後來|才發現|原來/.test(writing) ? "前後看法的變化很清楚，呼應題目。" : "用『我原本……，直到……，才發現……』讓題目和內容扣在一起。",
  ];
  const buildSentence = () => {
    const line = `當我${action.trim() || "靠近仔細觀察"}，${detail.trim() || "一個原本忽略的細節慢慢出現"}。原來，${discovery.trim() || "它一直都在，只是我以前沒有留意"}。`;
    setWriting((writing ? `${writing}\n` : "") + line);
    setCoachOpen(false);
  };
  return <div className="writing-workshop">
    <section className="material-box"><div className="writing-step"><span>1</span><div><b>打開第一關的素材盒</b><small>寫作不是憑空想；先選一個你真的觀察過的細節。</small></div></div>{observations.length > 0 && <button className={`saved-observation ${material === observations.at(-1)?.second ? "active" : ""}`} onClick={() => setMaterial(observations.at(-1)?.second || "")}><span>我的觀察紀錄</span><p>{observations.at(-1)?.second}</p></button>}<div className="fallback-materials">{fallbackMaterials.map((item) => <button key={item.title} className={material === item.title ? "active" : ""} onClick={() => setMaterial(item.title)}><i>{item.icon}</i><b>{item.title}</b><small>{item.detail}</small></button>)}</div></section>
    <section className="sentence-recipe"><div className="writing-step"><span>2</span><div><b>借用課文第三段的寫法</b><small>不是抄句子，而是學「動作 → 細節 → 發現」的順序。</small></div></div><div className="recipe-strip"><label><span>動作</span><i>手／眼／耳</i><input value={action} onChange={(event) => setAction(event.target.value)} placeholder="我怎麼接近它？" /></label><b>＋</b><label><span>感官細節</span><i>聲／光／觸感</i><input value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="實際感受到什麼？" /></label><b>＋</b><label><span>新的發現</span><i>原來……</i><input value={discovery} onChange={(event) => setDiscovery(event.target.value)} placeholder="我的想法改變了嗎？" /></label></div><div className="selected-material"><span>本段素材</span><b>{material || "請先從素材盒選一項"}</b><button className="primary" disabled={!material} onClick={buildSentence}>把三塊拼成草稿句</button></div></section>
    <section className="draft-desk"><div className="writing-step"><span>3</span><div><b>寫成〈原來，它一直都在〉的一段話</b><small>把草稿句接成 80～150 字，讓沒到現場的人也能感受到。</small></div></div><textarea value={writing} onChange={(event) => { setWriting(event.target.value); setCoachOpen(false); }} placeholder="我原本沒有注意……。當我……，才發現……。" /><div className="draft-actions"><span>{writing.length} 字</span><button className="paper" onClick={() => setCoachOpen(true)}>請寫作教練看一看</button><button className="primary" disabled={writing.length < 60} onClick={onQuiz}>完成作品，進入成效檢核</button></div></section>
    {coachOpen && <aside className="local-writing-coach"><div><span>修改鏡</span><h3>教練只指出下一步，不替你代寫</h3><p>這是依本課寫作要點進行的本機檢查，不是 AI 評分。</p></div><ul>{coachTips.map((tip, index) => <li key={tip} className={index === 0 ? (writing.length >= 60 ? "ok" : "work") : ""}>{tip}</li>)}</ul></aside>}
  </div>;
}
