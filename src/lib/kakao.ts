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
    return "https://ttok.dhlm-studio.com";
  }
  return process.env.NEXT_PUBLIC_BASE_URL || "https://ttok.app";
}

function isKakaoAvailable(): boolean {
  return typeof window !== "undefined" && !!window.Kakao;
}

export function initKakao(): void {
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || "ea95354167038ebb0be11c1aae1ffe26";

  function tryInit() {
    if (typeof window === "undefined") return;
    if (!window.Kakao) {
      console.log("[Kakao] SDK not yet loaded, retrying in 500ms...");
      setTimeout(tryInit, 500);
      return;
    }
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(kakaoKey);
      console.log("[Kakao] SDK initialized.");
    } else {
      console.log("[Kakao] Already initialized.");
    }
  }

  tryInit();
}

export async function shareTest(questionSet: QuestionSet, shareCode: string): Promise<void> {
  const shareUrl = `https://ttok.dhlm-studio.com/s/${shareCode}`;
  const shareData = {
    title: "나를 얼마나 잘 알아? 🎯",
    text: `${questionSet.title} - 취향 싱크로율 확인하기`,
    url: shareUrl,
  };

  // Try Web Share API first (works on mobile, opens native share sheet including KakaoTalk)
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (err) {
      // User cancelled or error - fall through to Kakao
      if ((err as Error).name === 'AbortError') return;
    }
  }

  // Fallback to Kakao SDK
  if (isKakaoAvailable() && window.Kakao.isInitialized()) {
    const params: KakaoShareParams = {
      objectType: "feed",
      content: {
        title: shareData.title,
        description: shareData.text,
        imageUrl: "https://ttok.dhlm-studio.com/og-share.png?v=2",
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
    window.Kakao.Share.sendDefault(params);
  } else {
    // Final fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('링크가 복사되었습니다! 카카오톡에 붙여넣기 해주세요.');
    } catch {
      prompt('아래 링크를 복사해주세요:', shareUrl);
    }
  }
}

export async function shareResult(
  syncRate: number,
  badge: string,
  sessionId: string
): Promise<void> {
  const resultUrl = `https://ttok.dhlm-studio.com/result/${sessionId}`;
  const baseUrl = getBaseUrl();
  const shareData = {
    title: `우리 싱크로율 ${syncRate}%! ${badge}`,
    text: "우리의 취향 궁합을 확인해보세요!",
    url: resultUrl,
  };

  // Try Web Share API first (works on mobile, opens native share sheet including KakaoTalk)
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (err) {
      // User cancelled or error - fall through to Kakao
      if ((err as Error).name === 'AbortError') return;
    }
  }

  // Fallback to Kakao SDK
  if (isKakaoAvailable() && window.Kakao.isInitialized()) {
    const params: KakaoShareParams = {
      objectType: "feed",
      content: {
        title: shareData.title,
        description: shareData.text,
        imageUrl: "https://ttok.dhlm-studio.com/og-share.png?v=2",
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
    window.Kakao.Share.sendDefault(params);
  } else {
    // Final fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(resultUrl);
      alert('링크가 복사되었습니다! 카카오톡에 붙여넣기 해주세요.');
    } catch {
      prompt('아래 링크를 복사해주세요:', resultUrl);
    }
  }
}
