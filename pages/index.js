import { useState, useEffect, useCallback } from "react";
import Head from "next/head";

// ── 색상 설정 ──────────────────────────────────────
const STATUS_CFG = {
  "문의인입": { bg: "rgba(240,136,62,0.15)", text: "#c05c00" },
  "확인 중":  { bg: "rgba(88,166,255,0.15)",  text: "#0969da" },
  "완료":     { bg: "rgba(57,211,83,0.15)",   text: "#1a7f37" },
};
const TYPE_CFG = {
  "공구 신청·일정": "#0969da",
  "링크·세팅":      "#c05c00",
  "매출 확인":      "#9a6700",
  "정산·수수료":    "#1a7f37",
  "이벤트":         "#bf3989",
  "콘텐츠·가이드":  "#8250df",
  "기타":           "#57606a",
};
const PRI_CFG = {
  "🔴 높음": "#cf222e",
  "🟡 보통": "#9a6700",
  "🟢 낮음": "#1a7f37",
};
const CH_COLOR = {
  "슬랙채널": "#cf222e",
  "슬랙DM":   "#0969da",
  "카카오톡": "#c05c00",
  "전화":     "#57606a",
};

// ── 모바일 감지 훅 ────────────────────────────────
function useMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

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
    channelData:    Object.entries(channelCounts).sort((a,b) => b[1]-a[1]),
    typeData:       Object.entries(typeCounts).sort((a,b) => b[1]-a[1]),
    pharmacistData: Object.entries(pharmaCounts).sort((a,b) => b[1]-a[1]).slice(0, 8),
    records,
  };
}

// ── KPI 카드 ──────────────────────────────────────
function KPI({ label, value, sub, accent, alert }) {
  return (
    <div style={{ background:"#ffffff", border:`1px solid ${alert?"rgba(207,34,46,0.45)":"#d0d7de"}`,
      borderRadius:10, padding:"15px 18px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:accent }}/>
      <div style={{ fontSize:10, color:"#57606a", fontWeight:500, letterSpacing:"0.5px",
        textTransform:"uppercase", marginBottom:7 }}>{label}</div>
      <div style={{ fontSize:30, fontWeight:700, fontFamily:"monospace", lineHeight:1, color:accent }}>{value}</div>
      <div style={{ fontSize:11, color:"#57606a", marginTop:5 }}>{sub}</div>
    </div>
  );
}

// ── 도넛 차트 ────────────────────────────────────
function Donut({ counts, colorMap, total, label }) {
  const keys  = Object.keys(counts).filter(k => counts[k] > 0);
  const r = 46, cx = 60, cy = 60, sw = 13;
  const circ  = 2 * Math.PI * r;
  let offset  = 0;
  const slices = keys.map(k => {
    const dash = (counts[k] / (total||1)) * circ;
    const s = { k, dash, offset, color: colorMap[k] || "#57606a" };
    offset += dash;
    return s;
  });
  return (
    <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
      <svg width={120} height={120} viewBox="0 0 120 120" style={{ flexShrink:0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eaeef2" strokeWidth={sw}/>
        {slices.map(s => (
          <circle key={s.k} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={sw}
            strokeDasharray={`${s.dash.toFixed(2)} ${(circ-s.dash).toFixed(2)}`}
            strokeDashoffset={(-(s.offset) + circ/4).toFixed(2)}/>
        ))}
        <text x={cx} y={cy-6}  textAnchor="middle" fill="#1f2328" fontSize={20} fontWeight={700} fontFamily="monospace">{total}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fill="#57606a" fontSize={10}>{label}</text>
      </svg>
      <div style={{ flex:1, minWidth:120 }}>
        {keys.map(k => (
          <div key={k} style={{ display:"flex", justifyContent:"space-between",
            padding:"5px 0", borderBottom:"1px solid #eaeef2", fontSize:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, minWidth:0 }}>
              <div style={{ width:7, height:7, borderRadius:"50%",
                background:colorMap[k]||"#57606a", flexShrink:0 }}/>
              <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#1f2328" }}>{k}</span>
            </div>
            <div style={{ flexShrink:0, marginLeft:8 }}>
              <span style={{ fontFamily:"monospace", fontWeight:600, color:"#1f2328" }}>{counts[k]}</span>
              <span style={{ fontSize:10, color:"#57606a", marginLeft:3 }}>
                {Math.round(((counts[k]||0)/total)*100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 바 차트 ──────────────────────────────────────
function Bars({ data, colorMap, defaultColor }) {
  if (!data.length) return <div style={{ color:"#57606a", fontSize:12 }}>데이터 없음</div>;
  const max = data[0][1];
  return (
    <div>{data.map(([name, val]) => (
      <div key={name} style={{ marginBottom:9 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
          <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"75%", color:"#1f2328" }}>{name}</span>
          <span style={{ fontFamily:"monospace", color:"#57606a", flexShrink:0 }}>{val}</span>
        </div>
        <div style={{ height:5, background:"#eaeef2", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:3, background:colorMap[name]||defaultColor,
            width:`${max?(val/max*100):0}%`, transition:"width .5s" }}/>
        </div>
      </div>
    ))}</div>
  );
}

// ── 모바일 카드형 행 ──────────────────────────────
function MobileCard({ r, showStatus }) {
  const [open, setOpen] = useState(false);
  const st   = r.진행상황 || "-";
  const sCfg = STATUS_CFG[st] || { bg:"#eaeef2", text:"#57606a" };
  const ty   = r.문의유형  || "-";
  const tc   = TYPE_CFG[ty] || "#57606a";
  const pc   = PRI_CFG[r.우선순위] || "#57606a";

  return (
    <div style={{ borderBottom:"1px solid #eaeef2", padding:"12px 4px" }}>
      <div onClick={() => setOpen(!open)} style={{ cursor:"pointer" }}>
        {/* 첫 줄: 우선순위 + 날짜 + 상태 */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
          {r.우선순위 && (
            <span style={{ fontWeight:600, fontSize:12, color:pc }}>{r.우선순위}</span>
          )}
          <span style={{ fontSize:11, color:"#57606a", fontFamily:"monospace" }}>
            {r.문의일자?.substring(0,10)||"-"}
          </span>
          <span style={{ flex:1 }}/>
          {showStatus ? (
            <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11,
              fontWeight:500, background:sCfg.bg, color:sCfg.text }}>{st}</span>
          ) : (
            r.우선순위 && <span style={{ color:pc, fontWeight:600, fontSize:12 }}>{r.우선순위}</span>
          )}
        </div>
        {/* 두 번째 줄: 문의유형 + 약사 + 채널 */}
        <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
          <span style={{ padding:"2px 7px", borderRadius:4, fontSize:11,
            background:`${tc}22`, color:tc }}>{ty}</span>
          <span style={{ fontSize:12, color:"#57606a" }}>
            {(r.문의약사||[]).join(", ")||"-"}
          </span>
          <span style={{ fontSize:11, color:"#a0aab4" }}>
            {(r.문의채널||[]).join(", ")||""}
          </span>
          <span style={{ marginLeft:"auto", fontSize:11, color:"#57606a" }}>
            {open ? "▲" : "▼"}
          </span>
        </div>
      </div>
      {/* 펼침: 문의내용 + 처리내용 */}
      {open && (
        <div style={{ marginTop:10, padding:"10px 12px", background:"#f6f8fa",
          borderRadius:8, display:"flex", flexDirection:"column", gap:10 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:600, color:"#57606a",
              textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:4 }}>문의내용</div>
            <div style={{ fontSize:13, color:"#1f2328", lineHeight:1.6, wordBreak:"keep-all" }}>
              {r.문의내용||"-"}
            </div>
          </div>
          <div>
            <div style={{ fontSize:10, fontWeight:600, color:"#57606a",
              textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:4 }}>처리내용</div>
            <div style={{ fontSize:13, color:"#1f2328", lineHeight:1.6, wordBreak:"keep-all" }}>
              {r.처리내용||"-"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 미처리 테이블 ─────────────────────────────────
function PendingTable({ records }) {
  const [openIdx, setOpenIdx] = useState(null);
  const isMobile = useMobile();

  const rows = records
    .filter(r => r.진행상황 !== "완료")
    .sort((a, b) => {
      const order = {"🔴 높음":0,"🟡 보통":1,"🟢 낮음":2};
      return (order[a.우선순위]??3) - (order[b.우선순위]??3);
    })
    .slice(0, 12);

  if (!rows.length) return (
    <div style={{ padding:"24px 0", textAlign:"center", color:"#57606a", fontSize:13 }}>
      🎉 미처리 문의가 없어요!
    </div>
  );

  // 모바일: 카드형
  if (isMobile) {
    return (
      <div>
        {rows.map((r, i) => <MobileCard key={i} r={r} showStatus={true} />)}
      </div>
    );
  }

  // 데스크톱: 테이블형
  const TH = ({ c, w }) => (
    <th style={{ textAlign:"left", padding:"7px 10px", color:"#57606a", fontWeight:500,
      fontSize:11, borderBottom:"1px solid #d0d7de", whiteSpace:"nowrap", width:w }}>{c}</th>
  );

  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, tableLayout:"fixed" }}>
        <thead>
          <tr>
            <TH c="" w="32px"/>
            <TH c="우선순위" w="68px"/>
            <TH c="문의일자" w="88px"/>
            <TH c="문의유형" w="100px"/>
            <TH c="업체명" w="11%"/>
            <TH c="제품명" w="14%"/>
            <TH c="문의약사" w="80px"/>
            <TH c="채널" w="72px"/>
            <TH c="진행상황" w="78px"/>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const st   = r.진행상황 || "-";
            const sCfg = STATUS_CFG[st] || { bg:"#eaeef2", text:"#57606a" };
            const ty   = r.문의유형  || "-";
            const tc   = TYPE_CFG[ty] || "#57606a";
            const pc   = PRI_CFG[r.우선순위] || "#57606a";
            const isOpen = openIdx === i;
            return (
              <>
                <tr key={`row-${i}`}
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  style={{ borderBottom: isOpen ? "none" : "1px solid #eaeef2",
                    cursor:"pointer", background: isOpen ? "#f6f8fa" : "transparent" }}>
                  <td style={{ padding:"8px 10px", textAlign:"center", color:"#57606a" }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                      style={{ transition:"transform 0.15s",
                        transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                        display:"inline-block" }}>
                      <path d="M4 2l4 4-4 4" stroke="#57606a" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </td>
                  <td style={{ padding:"8px 10px", whiteSpace:"nowrap" }}>
                    <span style={{ color:pc, fontWeight:600 }}>{r.우선순위||"-"}</span>
                  </td>
                  <td style={{ padding:"8px 10px", color:"#57606a", whiteSpace:"nowrap" }}>
                    {r.문의일자?.substring(0,10)||"-"}
                  </td>
                  <td style={{ padding:"8px 10px", whiteSpace:"nowrap" }}>
                    <span style={{ padding:"2px 7px", borderRadius:4, fontSize:11,
                      background:`${tc}22`, color:tc }}>{ty}</span>
                  </td>
                  <td style={{ padding:"8px 10px", color:"#57606a", fontSize:11,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {r.업체명||"-"}
                  </td>
                  <td style={{ padding:"8px 10px", color:"#57606a", fontSize:11,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {r.제품명||"-"}
                  </td>
                  <td style={{ padding:"8px 10px", color:"#57606a", fontSize:11, whiteSpace:"nowrap" }}>
                    {(r.문의약사||[]).join(", ")||"-"}
                  </td>
                  <td style={{ padding:"8px 10px", color:"#57606a", fontSize:11, whiteSpace:"nowrap" }}>
                    {(r.문의채널||[]).join(", ")||"-"}
                  </td>
                  <td style={{ padding:"8px 10px" }}>
                    <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11,
                      fontWeight:500, background:sCfg.bg, color:sCfg.text }}>{st}</span>
                  </td>
                </tr>
                {isOpen && (
                  <tr key={`detail-${i}`} style={{ borderBottom:"1px solid #eaeef2" }}>
                    <td colSpan={9} style={{ padding:0 }}>
                      <div style={{ padding:"12px 14px 14px 42px",
                        background:"#f6f8fa", borderTop:"1px solid #eaeef2" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                          <div>
                            <div style={{ fontSize:11, fontWeight:600, color:"#57606a",
                              textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:5 }}>
                              문의내용
                            </div>
                            <div style={{ fontSize:13, color:"#1f2328", lineHeight:1.6, wordBreak:"keep-all" }}>
                              {r.문의내용||"-"}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize:11, fontWeight:600, color:"#57606a",
                              textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:5 }}>
                              처리내용
                            </div>
                            <div style={{ fontSize:13, color:"#1f2328", lineHeight:1.6, wordBreak:"keep-all" }}>
                              {r.처리내용||"-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── 처리 완료 테이블 ──────────────────────────────
function DoneTable({ records }) {
  const [openIdx, setOpenIdx] = useState(null);
  const isMobile = useMobile();

  const rows = records
    .filter(r => r.진행상황 === "완료")
    .sort((a, b) => (b.문의일자||"").localeCompare(a.문의일자||""))
    .slice(0, 20);

  if (!rows.length) return (
    <div style={{ padding:"24px 0", textAlign:"center", color:"#57606a", fontSize:13 }}>
      완료된 문의가 없어요.
    </div>
  );

  // 모바일: 카드형
  if (isMobile) {
    return (
      <div>
        {rows.map((r, i) => <MobileCard key={i} r={r} showStatus={false} />)}
      </div>
    );
  }

  // 데스크톱: 테이블형
  const TH = ({ c, w }) => (
    <th style={{ textAlign:"left", padding:"7px 10px", color:"#57606a", fontWeight:500,
      fontSize:11, borderBottom:"1px solid #d0d7de", whiteSpace:"nowrap", width:w }}>{c}</th>
  );

  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, tableLayout:"fixed" }}>
        <thead>
          <tr>
            <TH c="" w="32px"/>
            <TH c="문의일자" w="88px"/>
            <TH c="문의유형" w="100px"/>
            <TH c="업체명" w="11%"/>
            <TH c="제품명" w="14%"/>
            <TH c="문의약사" w="80px"/>
            <TH c="채널" w="72px"/>
            <TH c="우선순위" w="68px"/>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const ty   = r.문의유형 || "-";
            const tc   = TYPE_CFG[ty] || "#57606a";
            const pc   = PRI_CFG[r.우선순위] || "#57606a";
            const isOpen = openIdx === i;
            return (
              <>
                <tr key={`done-row-${i}`}
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  style={{ borderBottom: isOpen ? "none" : "1px solid #eaeef2",
                    cursor:"pointer", background: isOpen ? "#f6f8fa" : "transparent" }}>
                  <td style={{ padding:"8px 10px", textAlign:"center", color:"#57606a" }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                      style={{ transition:"transform 0.15s",
                        transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                        display:"inline-block" }}>
                      <path d="M4 2l4 4-4 4" stroke="#57606a" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </td>
                  <td style={{ padding:"8px 10px", color:"#57606a", whiteSpace:"nowrap" }}>
                    {r.문의일자?.substring(0,10)||"-"}
                  </td>
                  <td style={{ padding:"8px 10px", whiteSpace:"nowrap" }}>
                    <span style={{ padding:"2px 7px", borderRadius:4, fontSize:11,
                      background:`${tc}22`, color:tc }}>{ty}</span>
                  </td>
                  <td style={{ padding:"8px 10px", color:"#57606a", fontSize:11,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {r.업체명||"-"}
                  </td>
                  <td style={{ padding:"8px 10px", color:"#57606a", fontSize:11,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {r.제품명||"-"}
                  </td>
                  <td style={{ padding:"8px 10px", color:"#57606a", fontSize:11, whiteSpace:"nowrap" }}>
                    {(r.문의약사||[]).join(", ")||"-"}
                  </td>
                  <td style={{ padding:"8px 10px", color:"#57606a", fontSize:11, whiteSpace:"nowrap" }}>
                    {(r.문의채널||[]).join(", ")||"-"}
                  </td>
                  <td style={{ padding:"8px 10px", whiteSpace:"nowrap" }}>
                    <span style={{ color:pc, fontWeight:600 }}>{r.우선순위||"-"}</span>
                  </td>
                </tr>
                {isOpen && (
                  <tr key={`done-detail-${i}`} style={{ borderBottom:"1px solid #eaeef2" }}>
                    <td colSpan={8} style={{ padding:0 }}>
                      <div style={{ padding:"12px 14px 14px 42px",
                        background:"#f6f8fa", borderTop:"1px solid #eaeef2" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                          <div>
                            <div style={{ fontSize:11, fontWeight:600, color:"#57606a",
                              textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:5 }}>
                              문의내용
                            </div>
                            <div style={{ fontSize:13, color:"#1f2328", lineHeight:1.6, wordBreak:"keep-all" }}>
                              {r.문의내용||"-"}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize:11, fontWeight:600, color:"#57606a",
                              textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:5 }}>
                              처리내용
                            </div>
                            <div style={{ fontSize:13, color:"#1f2328", lineHeight:1.6, wordBreak:"keep-all" }}>
                              {r.처리내용||"-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
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

  const card  = { background:"#ffffff", border:"1px solid #d0d7de", borderRadius:10, padding:18 };
  const title = { fontSize:11, fontWeight:600, color:"#57606a", textTransform:"uppercase",
    letterSpacing:"0.5px", marginBottom:14 };

  return (
    <>
      <Head>
        <title>PB 약사님 커뮤니케이션팀 문의현황 대시보드</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      </Head>

      <div style={{ fontFamily:"'Noto Sans KR', sans-serif", background:"#ffffff",
        color:"#1f2328", minHeight:"100vh", padding:"16px" }}>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body, div, span, td, th, button { font-weight: 500; }
          @keyframes spin { to { transform: rotate(360deg); } }

          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 14px;
          }
          .two-col-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            gap: 12px;
          }

          @media (max-width: 639px) {
            .kpi-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 8px;
            }
            .two-col-grid {
              grid-template-columns: 1fr;
              gap: 10px;
            }
            .header-row {
              flex-direction: column;
              align-items: stretch;
              margin-bottom: 16px;
            }
            .header-row button {
              align-self: flex-start;
            }
          }
        `}</style>

        {/* Header */}
        <div className="header-row">
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <div style={{ fontSize:17, fontWeight:700, letterSpacing:"-0.5px", color:"#1f2328", lineHeight:1.4 }}>
                💬 PB 약사님 커뮤니케이션팀 문의현황 대시보드
              </div>
              <span style={{ fontSize:11, fontWeight:500, color:"#57606a",
                background:"#eaeef2", borderRadius:20, padding:"2px 9px",
                whiteSpace:"nowrap", letterSpacing:"0.2px" }}>
                v1.4 · 2026-05-29
              </span>
            </div>
            <div style={{ fontSize:12, color:"#57606a", marginTop:4, fontFamily:"monospace" }}>
              {updated
                ? `마지막 업데이트: ${updated.toLocaleString("ko-KR")} · ${data?.total||0}건`
                : "노션 연동 중..."}
            </div>
          </div>
          <button onClick={fetchData} disabled={status==="loading"} style={{
            display:"flex", alignItems:"center", gap:7,
            background:"#f6f8fa", border:"1px solid #d0d7de", color:"#1f2328",
            padding:"8px 16px", borderRadius:8, fontSize:13,
            fontFamily:"'Noto Sans KR', sans-serif",
            cursor:status==="loading"?"not-allowed":"pointer",
            opacity:status==="loading"?0.5:1,
            whiteSpace:"nowrap",
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
            justifyContent:"center", padding:"80px 0", gap:14, color:"#57606a" }}>
            <div style={{ width:28, height:28, border:"2px solid #d0d7de",
              borderTopColor:"#0969da", borderRadius:"50%",
              animation:"spin 0.8s linear infinite" }}/>
            <div style={{ fontSize:13 }}>노션에서 데이터 불러오는 중...</div>
          </div>
        )}

        {/* Error */}
        {status==="error" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
            padding:"60px 0", gap:12 }}>
            <div style={{ fontSize:28 }}>⚠️</div>
            <div style={{ fontSize:13, color:"#cf222e", textAlign:"center", maxWidth:320 }}>{errMsg}</div>
            <button onClick={fetchData} style={{
              background:"#f6f8fa", border:"1px solid #d0d7de", color:"#1f2328",
              padding:"8px 20px", borderRadius:8, fontFamily:"inherit", fontSize:13, cursor:"pointer",
            }}>다시 시도</button>
          </div>
        )}

        {/* Dashboard */}
        {status==="done" && data && (
          <>
            {/* KPI */}
            <div className="kpi-grid">
              <KPI label="총 문의"          value={data.total}   sub="전체 인입"       accent="#0969da"/>
              <KPI label="🔴 높음 우선순위" value={data.high}    sub="즉시 처리 필요" accent="#cf222e" alert={data.high>0}/>
              <KPI label="미처리"           value={data.pending} sub="문의인입 상태"   accent="#c05c00"/>
              <KPI label={`처리율 ${data.rate}%`} value={data.done} sub="완료 건수"  accent="#1a7f37"/>
            </div>

            {/* 문의유형 + 진행상황 */}
            <div className="two-col-grid">
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
            <div className="two-col-grid">
              <div style={card}>
                <div style={title}>문의 채널</div>
                <Bars data={data.channelData} colorMap={CH_COLOR} defaultColor="#0969da"/>
              </div>
              <div style={card}>
                <div style={title}>약사별 문의 TOP 8</div>
                <Bars data={data.pharmacistData} colorMap={{}} defaultColor="#8250df"/>
              </div>
            </div>

            {/* 미처리 테이블 */}
            <div style={card}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:14 }}>
                <div style={title}>미처리 문의 목록</div>
                <span style={{ fontSize:11, color:"#57606a" }}>우선순위 높은 순 · 최대 12건</span>
              </div>
              <PendingTable records={data.records}/>
            </div>

            {/* 처리 완료 테이블 */}
            <div style={{ ...card, marginTop:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:14 }}>
                <div style={title}>처리 완료 문의 목록</div>
                <span style={{ fontSize:11, color:"#57606a" }}>최근 순 · 최대 20건</span>
              </div>
              <DoneTable records={data.records}/>
        