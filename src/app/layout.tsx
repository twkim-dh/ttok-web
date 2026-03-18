import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "똑 - 취향이 통하는 사이",
  description:
    "친구, 연인과 취향이 얼마나 맞는지 확인해보세요! 10가지 질문으로 알아보는 취향 싱크로율 테스트",
  openGraph: {
    title: "똑 - 취향이 통하는 사이",
    description:
      "친구, 연인과 취향이 얼마나 맞는지 확인해보세요! 10가지 질문으로 알아보는 취향 싱크로율 테스트",
    type: "website",
    locale: "ko_KR",
    siteName: "똑",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "똑 - 취향이 통하는 사이",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "똑 - 취향이 통하는 사이",
    description:
      "친구, 연인과 취향이 얼마나 맞는지 확인해보세요!",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${notoSansKr.variable} antialiased bg-gradient-to-b from-rose-50 to-white min-h-screen`}
      >
        <div className="mx-auto w-full max-w-[480px] min-h-screen">
          {children}
        </div>
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.7/kakao.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
