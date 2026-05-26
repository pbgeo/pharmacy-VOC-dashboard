# 💬 약사 문의 현황 대시보드

파마브로스 약사 문의 현황을 노션 DB와 연동해서 실시간으로 보여주는 대시보드입니다.

---

## 🚀 배포 방법 (3단계)

### 1단계 — 노션 Integration 만들기 (5분)

1. https://www.notion.so/my-integrations 접속
2. **"+ New integration"** 클릭
3. 이름: `CS Dashboard` 입력 후 저장
4. **"Internal Integration Token"** 복사해서 메모장에 저장

### 2단계 — 노션 DB에 Integration 연결 (1분)

1. 노션에서 CS DB 페이지 열기
   → https://www.notion.so/pharma-bros/CS-3658c405e30180e4a787fdb40bf90ca7
2. 오른쪽 상단 **"..."** 메뉴 클릭
3. **"Connections"** → 방금 만든 `CS Dashboard` 선택

### 3단계 — Vercel 배포 (2분)

1. https://github.com/new 에서 새 레포 만들기
   - Repository name: `cs-dashboard`
   - Public or Private 상관없음
2. 이 폴더 파일들을 GitHub에 업로드
3. https://vercel.com 접속 → **"Add New Project"**
4. GitHub에서 `cs-dashboard` 레포 선택 → **"Import"**
5. **"Environment Variables"** 섹션에서:
   - Key: `NOTION_TOKEN`
   - Value: 1단계에서 복사한 토큰 붙여넣기
6. **"Deploy"** 클릭

✅ 완료! 배포된 URL로 접속하면 대시보드가 보여요.

---

## 🔄 데이터 업데이트

- 노션 DB에 데이터 추가 후 대시보드에서 **"새로고침"** 버튼 클릭
- 별도 재배포 불필요

---

## 📁 파일 구조

```
cs-dashboard/
├── pages/
│   ├── index.js        # 대시보드 UI
│   └── api/
│       └── data.js     # 노션 API 연동 (서버)
├── package.json
└── README.md
```
