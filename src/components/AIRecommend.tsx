import { useState, useEffect, useCallback } from 'react';
import type { AIRecommendation } from '../types';
import { getAIRecommendation } from '../lib/tauri-api';

const matchScores = ['86%', '84%', '82%', '78%', '76%'];

interface AIRecommendProps {
  category?: string;
}

export function AIRecommend({ category = 'victory' }: AIRecommendProps) {
  const [recommendations, setRecommendations] = useState<(AIRecommendation & { match?: string })[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAIRecommendation(category);
      if (!data || data.length === 0) {
        setError('暂无可用推荐，请检查AI配置或稍后再试');
      } else {
        const withMatch = data.map((rec, i) => ({
          ...rec,
          match: matchScores[i] || '80%',
        }));
        setRecommendations(withMatch);
      }
    } catch (err) {
      console.error('[AI推荐] 获取推荐失败:', err);
      setError('获取推荐失败，请检查API配置是否正确');
    }
    setLoading(false);
  }, [category]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const activeRec = recommendations[activeIndex] || { name: '', artist: '', reason: '', tags: [] };

  return (
    <div className="card-container p-5 h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <span style={{ color: 'var(--accent-foreground)', fontSize: '14px', fontWeight: 'bold' }}>R</span>
          </div>
          <div 
            className="text-base font-bold"
            style={{ color: 'var(--foreground)' }}
          >
            智能推荐
          </div>
        </div>
        <button
          onClick={loadRecommendations}
          className="p-2 rounded-lg transition-all hover:scale-110"
          style={{ color: 'var(--muted-foreground)' }}
          title="刷新推荐"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-14">
          <div 
            className="w-8 h-8 border-3 border-t-3 rounded-full animate-spin"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
          ></div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--muted)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p 
            className="text-sm mb-4"
            style={{ color: 'var(--muted-foreground)' }}
          >
            {error}
          </p>
          <div className="space-y-2">
            <p 
              className="text-xs"
              style={{ color: 'var(--muted-foreground)' }}
            >
              请先在设置中配置 AI 服务商、API Key 和模型名称
            </p>
            <button
              onClick={() => window.location.hash = '#settings'}
              className="px-5 py-2.5 text-sm font-semibold rounded-lg transition-all hover:scale-105"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              去设置
            </button>
          </div>
          
          <div 
            id="dj" 
            className="mt-4 flex flex-col items-center justify-center gap-5"
            contentEditable={true}
            style={{ outline: 'none', minHeight: '200px' }}
          >
            <div className="flex items-center justify-center gap-1.5 h-24">
              {Array.from({ length: 16 }, () => Math.random() * 100).map((height, index) => (
                <div
                  key={index}
                  className="w-2 rounded-full"
                  style={{
                    height: `${Math.max(12, height * 0.7)}px`,
                    backgroundColor: height > 70 ? '#34a85a' : height > 40 ? '#22c55e' : '#555555',
                    animation: `pulse ${0.3 + (height / 100) * 0.4}s ease-in-out infinite alternate`,
                    animationDelay: `${index * 0.05}s`,
                  }}
                />
              ))}
            </div>
            
            <div className="flex items-center gap-4 text-2xl">
              <span 
                className="text-green-500"
                style={{ animation: `bounce 0.6s ease-in-out infinite`, animationDelay: '0s' }}
              >
                ♪
              </span>
              <span 
                className="text-green-400"
                style={{ animation: `bounce 0.6s ease-in-out infinite`, animationDelay: '0.15s' }}
              >
                ♫
              </span>
              <span 
                className="text-green-500"
                style={{ animation: `bounce 0.6s ease-in-out infinite`, animationDelay: '0.3s' }}
              >
                ♩
              </span>
              <span 
                className="text-green-400"
                style={{ animation: `bounce 0.6s ease-in-out infinite`, animationDelay: '0.45s' }}
              >
                ♬
              </span>
            </div>
            
            <img 
              src="./dj-character.png" 
              alt="DJ Character" 
              className="w-48 h-auto object-contain"
            />
            
            <style>{`
              @keyframes bounce {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-6px); }
              }
              @keyframes pulse {
                0% { opacity: 0.6; }
                100% { opacity: 1; }
              }
            `}</style>
          </div>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <span style={{ color: 'var(--accent-foreground)', fontSize: '16px', fontWeight: 'bold' }}>R</span>
          </div>
          <p 
            className="text-sm mb-2"
            style={{ color: 'var(--muted-foreground)' }}
          >
            暂无推荐数据
          </p>
          <button
            onClick={loadRecommendations}
            className="text-sm"
            style={{ color: 'var(--primary)' }}
          >
            点击重试
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span 
                  className="text-sm font-semibold"
                  style={{ color: 'var(--foreground)' }}
                >
                  {activeRec.name}
                </span>
                {activeRec.tags?.map(tag => (
                  <span 
                    key={tag} 
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p 
                className="text-sm mb-2"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {activeRec.reason}
              </p>
              <div className="flex items-center gap-3">
                <span 
                  className="text-xs"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  推荐歌手: {activeRec.artist}
                </span>
                <span 
                  className="text-xs font-medium"
                  style={{ color: 'var(--primary)' }}
                >
                  匹配度: {activeRec.match || 'AI推荐'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left`}
                style={
                  activeIndex === index
                    ? { backgroundColor: 'var(--muted)', border: '1px solid var(--primary)' }
                    : { backgroundColor: 'transparent' }
                }
              >
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  <span 
                    className="text-sm font-medium"
                    style={{ color: 'var(--accent-foreground)' }}
                  >
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {rec.name}
                    </span>
                    {rec.tags?.[0] && (
                      <span 
                        className="px-1.5 py-0.5 rounded-full text-xs"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
                      >
                        {rec.tags[0]}
                      </span>
                    )}
                  </div>
                </div>
                <span 
                  className="text-xs"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {rec.match}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
