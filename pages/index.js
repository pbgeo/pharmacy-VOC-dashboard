import { useState, useEffect, useCallback } from "react";
import Head from "next/head";

// ── 색상 설정 ──────────────────────────────────────
const STATUS_CFG = {
  "문의인입": { bg: "rgba(240,136,62,0.15)", text: "#f0883e" },
  "확인 중":  { bg: "rgba(88,166,255,0.15)",  text: "#58a6ff" },
  "완료":     { bg: "rgba(57,211,83,0.15)",   text: "#39d353" },
};
const TYPE_CFG = {
  "공구 신청·일정": "#58a6ff",
  "링크·세팅":      "#f0883e",
  "매출 확인":      "#f0c040",
  "정산·수수료":    "#39d353",
  "이벤트":         "#ff7eb3",
  "콘텐츠·가이드":  "#bc8cff",
  "기타":           "#8b949e",
};
const PRI_CFG = {
  "🔴 높음": "#f85149",
  "🟡 보통": "#f0c040",
  "🟢 낮음": "#39d353",
};
const CH_COLOR = {
  "슬랙채널": "#f85149",
  "슬랙DM":   "#58a6ff",
  "카카오톡": "#f0883e",
  "전화":     "#8b949e",
};

// ── 데이터 처리 ────────────────────────────────────
function processData(records) {
  const statusCounts = {}, typeCounts = {}, channelCounts = {}, priCounts = {}, pharmaCounts = {};

  records.forEach(r => {
    const st  = r.진행상황 || "미지정";
    const ty  = r.문의유형 || "미분류";
    const pri = r.우선순위;

    statusCounts[st] = (statusCounts[st] || 0) + 1;
    typeCounts[ty]   = (typeCounts[ty]   || 0) + 1;
    if (pri) priCounts[pri] = (priCounts[pri] || 0) + 1;

    (r.문의채널 || []).forEach(c => { channelCounts[c] = (channelCounts[c] || 0) + 1; });
    (r.문의약사 || []).forEach(p => { pharmaCounts[p]  = (pharmaCounts[p]  || 0) + 1; });
  });

  const total   = records.length;
  const done    = statusCounts["완료"]    || 0;
  const pending = statusCounts["문의인입"] || 0;
  const high    = priCounts["🔴 높음"]    || 0;

  return {
    total, done, pending, high,
    rate: total ? Math.round((done / total) * 100) : 0,
    statusCounts, typeCounts, channelCounts,
    channelData:  Object.entries(channelCounts).sort((a,b) => b[1]-a[1]),
    typeData:     Object.entries(typeCounts).sort((a,b) => b[1]-a[1]),
    pharmacistData: Object.entries(pharmaCounts).sort((a,b) => b[1]-a[1]).slice(0, 8),
    records,
  };
}

// ── 컴포넌트 ────────────────────────────────────────
function KPI({ label, value, sub, accent, alert }) {
  return (
    <div style={{ background:"#161b22", border:`1px solid ${alert?"rgba(248,81,73,0.45)":"#30363d"}`,
      borderRadius:10, padding:"15px 18px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:accent }}/>
      <div style={{ fontSize:10, color:"#8b949e", fontWeight:500, letterSpacing:"0.5px",
        textTransform:"uppercase", marginBottom:7 }}>{label}</div>
      <div style={{ fontSize:30, fontWeight:700, fontFamily:"monospace", lineHeight:1, color:accent }}>{value}</div>
      <div style={{ fontSize:11, color:"#8b949e", marginTop:5 }}>{sub}</div>
    </div>
  );
}

function Donut({ counts, colorMap, total, label }) {
  const keys  = Object.keys(counts).filter(k => counts[k] > 0);
  const r = 46, cx = 60, cy = 60, sw = 13;
  const circ  = 2 * Math.PI * r;
  let offset  = 0;
  const slices = keys.map(k => {
    const dash = (counts[k] / (total||1)) * circ;
    const s = { k, dash, offset, color: colorMap[k] || "#8b949e" };
    offset += dash;
    return s;
  });
  return (
    <div style={{ display:"flex", alignItems:"center", gap:16 }}>
      <svg width={120} height={120} viewBox="0 0 120 120" style={{ flexShrink:0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#21262d" strokeWidth={sw}/>
        {slices.map(s => (
          <circle key={s.k} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={sw}
            strokeDasharray={`${s.dash.toFixed(2)} ${(circ-s.dash).toFixed(2)}`}
            strokeDashoffset={(-(s.offset) + circ/4).toFixed(2)}/>
        ))}
        <text x={cx} y={cy-6}  textAnchor="middle" fill="#e6edf3" fontSize={20} fontWeight={700} fontFamily="monospace">{total}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fill="#8b949e" fontSize={10}>{label}</text>
      </svg>
      <div style={{ flex:1, minWidth:0 }}>
        {keys.map(k => (
          <div key={k} style={{ display:"flex", justifyContent:"space-between",
            padding:"5px 0", borderBottom:"1px solid #21262d", fontSize:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, minWidth:0 }}>
              <div style={{ width:7, height:7, borderRadius:"50%",
                background:colorMap[k]||"#8b949e", flexShrink:0 }}/>
              <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{k}</span>
            </div>
            <div style={{ flexShrink:0, marginLeft:8 }}>
              <span style={{ fontFamily:"monospace", fontWeight:600 }}>{counts[k]}</span>
              <span style={{ fontSize:10, color:"#8b949e", marginLeft:3 }}>
                {Math.round(((counts[k]||0)/total)*100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bars({ data, colorMap, defaultColor }) {
  if (!data.length) return <div style={{ color:"#8b949e", fontSize:12 }}>데이터 없음</div>;
  const max = data[0][1];
  return (
    <div>{data.map(([name, val]) => (
      <div key={name} style={{ marginBottom:9 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
          <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"75%" }}>{name}</span>
          <span style={{ fontFamily:"monospace", color:"#8b949e", flexShrink:0 }}>{val}</span>
        </div>
        <div style={{ height:5, background:"#21262d", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:3, background:colorMap[name]||defaultColor,
            width:`${max?(val/max*100):0}%`, transition:"width .5s" }}/>
        </div>
      </div>
    ))}</div>
  );
}

function PendingTable({ records }) {
  const rows = records
    .filter(r => r.진행상황 !== "완료")
    .sort((a, b) => {
      const order = {"🔴 높음":0,"🟡 보통":1,"🟢 낮음":2};
      return (order[a.우선순위]??3) - (order[b.우선순위]??3);
    })
    .slice(0, 12);

  if (!rows.length) return (
    <div style={{ padding:"24px 0", textAlign:"center", color:"#8b949e", fontSize:13 }}>
      🎉 미처리 문의가 없어요!
    </div>
  );

  const TH = ({ c }) => (
    <th style={{ textAlign:"left", padding:"7px 10px", color:"#8b949e", fontWeight:500,
      fontSize:11, borderBottom:"1px solid #30363d", whiteSpace:"nowrap" }}>{c}</th>
  );

  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
        <thead><tr>{["우선순위","문의일자","문의유형","문의내용","문의약사","채널","진행상황"].map(c=><TH key={c} c={c}/>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const st  = r.진행상황 || "-";
            const sCfg = STATUS_CFG[st] || { bg:"#21262d", text:"#8b949e" };
            const ty   = r.문의유형  || "-";
            const tc   = TYPE_CFG[ty] || "#8b949e";
            const pc   = PRI_CFG[r.우선순위] || "#8b949e";
            return (
              <tr key={i} style={{ borderBottom:"1px solid #21262d" }}>
                <td style={{ padding:"8px 10px", whiteSpace:"nowrap" }}>
                  <span style={{ color:pc, fontWeight:600 }}>{r.우선순위||"-"}</span>
                </td>
                <td style={{ padding:"8px 10px", color:"#8b949e", whiteSpace:"nowrap" }}>
                  {r.문의일자?.substring(0,10)||"-"}
                </td>
                <td style={{ padding:"8px 10px", whiteSpace:"nowrap" }}>
                  <span style={{ padding:"2px 7px", borderRadius:4, fontSize:11,
                    background:`${tc}22`, color:tc }}>{ty}</span>
                </td>
                <td style={{ padding:"8px 10px", maxWidth:160, overflow:"hidden",
                  textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={r.문의내용}>
                  {r.문의내용||"-"}
                </td>
                <td style={{ padding:"8px 10px", color:"#8b949e", fontSize:11, whiteSpace:"nowrap" }}>
                  {(r.문의약사||[]).join(", ")||"-"}
                </td>
                <td style={{ padding:"8px 10px", color:"#8b949e", fontSize:11, whiteSpace:"nowrap" }}>
                  {(r.문의채널||[]).join(", ")||"-"}
                </td>
                <td style={{ padding:"8px 10px" }}>
                  <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11,
                    fontWeight:500, background:sCfg.bg, color:sCfg.text }}>{st}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────
export default function Home() {
  const [status,  setStatus]  = useState("idle");
  const [data,    setData]    = useState(null);
  const [errMsg,  setErrMsg]  = useState("");
  const [updated, setUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    setStatus("loading");
    setErrMsg("");
    try {
      const res = await fetch("/api/data");
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "데이터 로딩 실패");
      }
      const json = await res.json();
      setData(processData(json.records));
      setUpdated(new Date());
      setStatus("done");
    } catch (e) {
      setErrMsg(e.message);
      setStatus("error");
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const card  = { background:"#161b22", border:"1px solid #30363d", borderRadius:10, padding:18 };
  const title = { fontSize:11, fontWeight:600, color:"#8b949e", textTransform:"uppercase",
    letterSpacing:"0.5px", marginBottom:14 };
  const g2    = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 };

  return (
    <>
      <Head>
        <title>약사 문의 현황 대시보드</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      </Head>

      <div style={{ fontFamily:"'Noto Sans KR', sans-serif", background:"#0d1117",
        color:"#e6edf3", minHeight:"100vh", padding:"20px" }}>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <div style={{ fontSize:19, fontWeight:700, letterSpacing:"-0.5px" }}>
              💬 약사 문의 현황 대시보드
            </div>
            <div style={{ fontSize:12, color:"#8b949e", marginTop:3, fontFamily:"monospace" }}>
              {updated
                ? `마지막 업데이트: ${updated.toLocaleString("ko-KR")} · ${data?.total||0}건`
                : "노션 연동 중..."}
            </div>
          </div>
          <button onClick={fetchData} disabled={status==="loading"} style={{
            display:"flex", alignItems:"center", gap:7,
            background:"#21262d", border:"1px solid #30363d", color:"#e6edf3",
            padding:"8px 16px", borderRadius:8, fontSize:13,
            fontFamily:"'Noto Sans KR', sans-serif",
            cursor:status==="loading"?"not-allowed":"pointer",
            opacity:status==="loading"?0.5:1,
          }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.5}
              style={{ animation:status==="loading"?"spin 0.8s linear infinite":"none" }}>
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            새로고침
          </button>
        </div>

        {/* Loading */}
        {status==="loading" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", padding:"80px 0", gap:14, color:"#8b949e" }}>
            <div style={{ width:28, height:28, border:"2px solid #30363d",
              borderTopColor:"#58a6ff", borderRadius:"50%",
              animation:"spin 0.8s linear infinite" }}/>
            <div style={{ fontSize:13 }}>노션에서 데이터 불러오는 중...</div>
          </div>
        )}

        {/* Error */}
        {status==="error" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
            padding:"60px 0", gap:12 }}>
            <div style={{ fontSize:28 }}>⚠️</div>
            <div style={{ fontSize:13, color:"#f85149", textAlign:"center", maxWidth:320 }}>{errMsg}</div>
            <button onClick={fetchData} style={{
              background:"#21262d", border:"1px solid #30363d", color:"#e6edf3",
              padding:"8px 20px", borderRadius:8, fontFamily:"inherit", fontSize:13, cursor:"pointer",
            }}>다시 시도</button>
          </div>
        )}

        {/* Dashboard */}
        {status==="done" && data && (
          <>
            {/* KPI */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:14 }}>
              <KPI label="총 문의"          value={data.total}   sub="전체 인입"        accent="#58a6ff"/>
              <KPI label="🔴 높음 우선순위" value={data.high}    sub="즉시 처리 필요"  accent="#f85149" alert={data.high>0}/>
              <KPI label="미처리"           value={data.pending} sub="문의인입 상태"    accent="#f0883e"/>
              <KPI label={`처리율 ${data.rate}%`} value={data.done} sub="완료 건수"   accent="#39d353"/>
            </div>

            {/* 문의유형 + 진행상황 */}
            <div style={{ ...g2, marginBottom:12 }}>
              <div style={card}>
                <div style={title}>문의 유형별 분포</div>
                <Donut counts={data.typeCounts} colorMap={TYPE_CFG}
                  total={data.total} label="전체"/>
              </div>
              <div style={card}>
                <div style={title}>진행 상황</div>
                <Donut counts={data.statusCounts}
                  colorMap={Object.fromEntries(Object.entries(STATUS_CFG).map(([k,v])=>[k,v.text]))}
                  total={data.total} label="전체"/>
              </div>
            </div>

            {/* 채널 + 약사 */}
            <div style={{ ...g2, marginBottom:12 }}>
              <div style={card}>
                <div style={title}>문의 채널</div>
                <Bars data={data.channelData} colorMap={CH_COLOR} defaultColor="#58a6ff"/>
              </div>
              <div style={card}>
                <div style={title}>약사별 문의 TOP 8</div>
                <Bars data={data.pharmacistData} colorMap={{}} defaultColor="#bc8cff"/>
              </div>
            </div>

            {/* 미처리 테이블 */}
            <div style={card}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:14 }}>
                <div style={title}>미처리 문의 목록</div>
                <span style={{ fontSize:11, color:"#8b949e" }}>우선순위 높은 순 · 최대 12건</span>
              </div>
              <PendingTable records={data.records}/>
            </div>
          </>
        )}
      </div>
    </>
  );
}
