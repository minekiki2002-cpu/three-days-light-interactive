import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "重新看見世界｜假如給我三天光明互動學習",
  description: "Kiki老師為四年級設計的八節課互動學習：觀察、證據、毛部字、同音詞、病句、人物閱讀、共融思考與有感寫作。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "重新看見世界",
    description: "《假如給我三天光明》八節課互動學習",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "重新看見世界互動學習" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
