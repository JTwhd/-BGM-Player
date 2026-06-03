const axios = require('axios');

const MOCK_RECOMMENDATIONS = [
  { name: '胜利时刻', artist: '游戏原声', album: '游戏BGM精选', url: 'https://example.com/victory1.mp3', category: 'victory', platform: 'netease' },
  { name: '荣耀之战', artist: '电音制作人', album: '电竞音乐合集', url: 'https://example.com/victory2.mp3', category: 'victory', platform: 'netease' },
  { name: '最终胜利', artist: '史诗音乐', album: '史诗BGM精选', url: 'https://example.com/victory3.mp3', category: 'victory', platform: 'qq' },
  { name: '失败的荣耀', artist: '悲伤钢琴', album: '悲伤音乐集', url: 'https://example.com/defeat1.mp3', category: 'defeat', platform: 'netease' },
  { name: '再战明天', artist: '励志音乐', album: '励志BGM', url: 'https://example.com/defeat2.mp3', category: 'defeat', platform: 'qq' },
];

const getRecommendation = async (req, res) => {
  try {
    const { category, mood } = req.body;
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      const filtered = MOCK_RECOMMENDATIONS.filter(t => !category || t.category === category);
      return res.json(filtered.slice(0, 5));
    }

    const systemPrompt = `你是一位专业的BGM推荐大师，擅长根据游戏场景推荐合适的背景音乐。

你的任务：
1. 根据用户的场景需求（胜利/失败/中立）和情绪要求推荐合适的音乐
2. 推荐的音乐需要符合游戏氛围
3. 返回格式必须是JSON数组，包含：name(音乐名称), artist(艺术家), album(专辑), category(分类: victory/defeat/neutral), tags(标签数组)

示例输出格式：
[
  {"name": "胜利时刻", "artist": "游戏原声", "album": "游戏BGM精选", "category": "victory", "tags": ["史诗", "激昂", "胜利"]}
]
`;

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `推荐一些${category === 'victory' ? '胜利' : category === 'defeat' ? '失败' : '中立'}场景的BGM音乐，${mood ? `情绪要求：${mood}` : ''}` },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    const result = response.data.choices[0].message.content;
    try {
      const recommendations = JSON.parse(result);
      res.json(recommendations);
    } catch {
      res.json(MOCK_RECOMMENDATIONS.filter(t => !category || t.category === category).slice(0, 5));
    }
  } catch (error) {
    console.error('AI推荐错误:', error.message);
    const { category } = req.body;
    res.json(MOCK_RECOMMENDATIONS.filter(t => !category || t.category === category).slice(0, 5));
  }
};

const searchMusic = async (req, res) => {
  try {
    const { q } = req.query;
    const filtered = MOCK_RECOMMENDATIONS.filter(
      t => t.name.includes(q) || t.artist.includes(q) || t.album.includes(q)
    );
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRecommendation, searchMusic };
