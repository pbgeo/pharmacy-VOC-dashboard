// pages/api/data.js
// 노션 토큰은 서버에서만 사용 → 외부 노출 없음

const DB_ID = "3658c405e30180afa728ebc650251207";

function parseProperty(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case "title":
      return prop.title?.map(t => t.plain_text).join("") || "";
    case "rich_text":
      return prop.rich_text?.map(t => t.plain_text).join("") || "";
    case "select":
      return prop.select?.name || null;
    case "multi_select":
      return prop.multi_select?.map(o => o.name) || [];
    case "status":
      return prop.status?.name || null;
    case "date":
      return prop.date?.start || null;
    case "created_by":
      return prop.created_by?.name || null;
    default:
      return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const token = process.env.NOTION_TOKEN;
  if (!token) return res.status(500).json({ error: "NOTION_TOKEN 환경변수가 없어요." });

  try {
    const records = [];
    let cursor = undefined;

    // 전체 페이지 가져오기 (100건 초과 시 자동 페이징)
    while (true) {
      const body = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;

      const r = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const err = await r.json();
        return res.status(r.status).json({ error: err.message || "Notion API 오류" });
      }

      const data = await r.json();

      for (const page of data.results) {
        const p = page.properties;
        records.push({
          id:       page.id,
          문의내용:  parseProperty(p["문의내용"]),
          문의약사:  parseProperty(p["문의약사"]),
          문의일자:  parseProperty(p["문의일자"]),
          문의채널:  parseProperty(p["문의채널"]),
          문의유형:  parseProperty(p["문의유형"]),
          우선순위:  parseProperty(p["우선순위"]),
          진행상황:  parseProperty(p["진행상황"]),
          처리내용:  parseProperty(p["처리내용"]),
          업체명:    parseProperty(p["업체명"]),
          제품명:    parseProperty(p["제품명"]),
          담당자:    parseProperty(p["담당자"]),
        });
      }

      if (!data.has_more) break;
      cursor = data.next_cursor;
    }

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    res.status(200).json({ records, total: records.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
