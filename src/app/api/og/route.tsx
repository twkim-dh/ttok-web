import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rate = searchParams.get('rate') || '??';
  const badge = searchParams.get('badge') || '취향이 통하는 사이';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #FFF0F0 0%, #FFFFFF 40%, #F0FFFE 100%)',
          fontFamily: '"Noto Sans KR", sans-serif',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '32px',
          }}
        >
          <span
            style={{
              fontSize: '72px',
              fontWeight: 800,
              color: '#FF6B6B',
            }}
          >
            똑
          </span>
          <span style={{ fontSize: '56px' }}>🎯</span>
        </div>

        {/* Sync Rate */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px',
            marginBottom: '24px',
          }}
        >
          <span
            style={{
              fontSize: '120px',
              fontWeight: 800,
              color: '#FF6B6B',
              lineHeight: 1,
            }}
          >
            {rate}
          </span>
          <span
            style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#FF6B6B',
            }}
          >
            %
          </span>
        </div>

        {/* Badge text */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px 40px',
            borderRadius: '24px',
            backgroundColor: '#FFF5F5',
          }}
        >
          <span
            style={{
              fontSize: '32px',
              fontWeight: 600,
              color: '#666666',
            }}
          >
            {badge}
          </span>
        </div>

        {/* Subtitle */}
        <span
          style={{
            fontSize: '24px',
            fontWeight: 400,
            color: '#BBBBBB',
            marginTop: '32px',
          }}
        >
          ttok.kr
        </span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
