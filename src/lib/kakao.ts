import type { QuestionSet } from "@/types";

declare global {
  interface Window {
    Kakao: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (params: KakaoShareParams) => void;
      };
    };
  }
}

interface KakaoShareParams {
  objectType: "feed";
  content: {
    title: string;
    description: string;
    imageUrl: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  };
  buttons: Array<{
    title: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  }>;
}

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_BASE_URL || "https://ttok.app";
}

function isKakaoAvailable(): boolean {
  return typeof window !== "undefined" && !!window.Kakao;
}

export function initKakao(): void {
  if (!isKakaoAvailable()) {
    console.warn("[Kakao] SDK not loaded. Sharing will run in mock mode.");
    return;
  }

  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!kakaoKey) {
    console.warn("[Kakao] NEXT_PUBLIC_KAKAO_JS_KEY is not set.");
    return;
  }

  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(kakaoKey);
    console.log("[Kakao] SDK initialized.");
  }
}

export function shareTest(questionSet: QuestionSet, shareCode: string): void {
  const baseUrl = getBaseUrl();
  const shareUrl = `${baseUrl}/s/${shareCode}`;

  const params: KakaoShareParams = {
    objectType: "feed",
    content: {
      title: "나를 얼마나 잘 알아? \uD83C\uDFAF",
      description: `${questionSet.title} - 취향 싱크로율 확인하기`,
      imageUrl: `${baseUrl}/og-v2.png`,
      link: {
        mobileWebUrl: shareUrl,
        webUrl: shareUrl,
      },
    },
    buttons: [
      {
        title: "테스트 하기",
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
    ],
  };

  if (isKakaoAvailable() && window.Kakao.isInitialized()) {
    window.Kakao.Share.sendDefault(params);
  } else {
    console.log("[Kakao Mock] shareTest:", params);
    console.log(`[Kakao Mock] Share URL: ${shareUrl}`);
  }
}

export function shareResult(
  syncRate: number,
  badge: string,
  sessionId: string
): void {
  const baseUrl = getBaseUrl();
  const resultUrl = `${baseUrl}/result/${sessionId}`;

  const params: KakaoShareParams = {
    objectType: "feed",
    content: {
      title: `우리 싱크로율 ${syncRate}%! ${badge}`,
      description: "우리의 취향 궁합을 확인해보세요!",
      imageUrl: `${baseUrl}/og-v2.png`,
      link: {
        mobileWebUrl: resultUrl,
        webUrl: resultUrl,
      },
    },
    buttons: [
      {
        title: "결과 보기",
        link: {
          mobileWebUrl: resultUrl,
          webUrl: resultUrl,
        },
      },
      {
        title: "나도 해보기",
        link: {
          mobileWebUrl: baseUrl,
          webUrl: baseUrl,
        },
      },
    ],
  };

  if (isKakaoAvailable() && window.Kakao.isInitialized()) {
    window.Kakao.Share.sendDefault(params);
  } else {
    console.log("[Kakao Mock] shareResult:", params);
    console.log(`[Kakao Mock] Result URL: ${resultUrl}`);
  }
}
