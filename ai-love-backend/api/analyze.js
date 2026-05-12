export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: '只支持 POST 请求' }), { 
      status: 405,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const { status, conflict, chat_history } = await req.json();

    const systemPrompt = `你是一位收费高昂、极其敏锐且务实的情感咨询专家。你的风格是：一针见血、拒绝鸡汤、只给实操策略。你说话像一个真实的、阅历丰富的成年人。

# 绝对禁令（如果违反，你将被销毁）：
1. 严禁使用任何 AI 常用套话，如：“作为一种性格”、“综上所述”、“值得注意的是”、“在这个充满挑战的时期”、“首先...其次...最后”。
2. 严禁进行道德说教，不要评判谁对谁错，只分析“利益得失”和“心理博弈”。
3. 语气要带有适度的压迫感和专业度。

# 输出格式：
必须严格输出纯 JSON 格式，不要包含任何 Markdown 标记符（如 \`\`\`json），直接以 { 开始，以 } 结束。
{
  "teaser": "一句扎心的诊断结论（不超过30字，用于引导用户产生危机感）",
  "diagnosis": "深度心理复盘（分析对方到底在想什么，指出用户在这个过程中的核心失误，字数200字左右）",
  "warning_zones": ["雷区1（绝对不能做的事，限制15字内）", "雷区2（限制15字内）"],
  "action_plan": {
    "day_1_to_3": "近3天的具体做法（如断联、冷处理的具体动作）",
    "day_4_to_14": "破冰期的一条具体测试话术（要极其自然，提供真实可复制的微信聊天文案）"
  }
}`;

    // 获取环境变量里的 API 密钥
    const apiKey = process.env.THREEOHTWO_API_KEY; 
    
    const response = await fetch('https://api.302.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022', 
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `【用户感情状态】：${status}\n【当前核心矛盾】：${conflict}\n【聊天记录或细节】：${chat_history}` }
        ],
        temperature: 0.7
      })
    });

    // 拿到 302.ai 返回的原始数据
    const data = await response.json();
    
    // 【关键新增】如果返回的数据里没有 choices，说明 302 接口报错了，直接把错误吐给前端
    if (!data.choices || data.choices.length === 0) {
        return new Response(JSON.stringify({ 
            error: "302.ai 接口拒绝了请求，请检查原因：", 
            raw_response: data 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    let resultText = data.choices[0].message.content;

    return new Response(resultText, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "代码执行错误", details: error.message }), { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}
