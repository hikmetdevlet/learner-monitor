// ─── Shared CSS ────────────────────────────────────────────────────────────
// Single source of truth for all styles across Islamic Teacher components.
// Import and inject via <style>{STYLES}</style> in the root page only.

export const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
*, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
.topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 20px; height:50px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:30; }
.brand { display:flex; align-items:center; gap:8px; }
.brand-icon { width:26px; height:26px; background:#15803D; border-radius:6px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.brand-name { font-size:14px; font-weight:600; color:#1A1A1A; }
.tbar-r { display:flex; align-items:center; gap:6px; }
.yr-chip { display:inline-flex; align-items:center; gap:4px; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:7px; padding:3px 9px; font-size:10px; font-weight:700; color:#15803D; white-space:nowrap; }
.uchip { display:flex; align-items:center; gap:6px; background:#F5F5F3; border-radius:100px; padding:2px 9px 2px 2px; }
.av { width:22px; height:22px; background:#15803D; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:9px; font-weight:700; flex-shrink:0; }
.uname { font-size:11px; color:#444; font-weight:500; }
.logout { font-size:11px; color:#999; background:none; border:none; cursor:pointer; padding:4px 7px; border-radius:6px; display:flex; align-items:center; gap:3px; font-family:'DM Sans',sans-serif; }
.logout:hover { background:#FEE2E2; color:#DC2626; }
.tab-bar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 20px; display:flex; overflow-x:auto; scrollbar-width:none; }
.tab-bar::-webkit-scrollbar { display:none; }
.tab-btn { padding:12px 13px; font-size:12px; font-weight:500; color:#999; background:none; border:none; border-bottom:2px solid transparent; cursor:pointer; font-family:'DM Sans',sans-serif; display:flex; align-items:center; gap:5px; white-space:nowrap; transition:all .12s; }
.tab-btn.active { color:#15803D; border-bottom-color:#15803D; }
.bnav { display:none; position:fixed; bottom:0; left:0; right:0; z-index:40; background:rgba(255,255,255,.97); backdrop-filter:blur(20px); border-top:1px solid #EFEFED; padding:4px 0 calc(env(safe-area-inset-bottom,0px) + 4px); }
.bnav-inner { display:flex; max-width:600px; margin:0 auto; }
.bnav-btn { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; padding:5px 2px; border:none; background:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:7px; font-weight:700; color:#C0BDB8; text-transform:uppercase; letter-spacing:.03em; position:relative; }
.bnav-btn.active { color:#15803D; }
.bnav-btn.active svg { stroke:#15803D; }
.bnav-btn.active::after { content:''; position:absolute; bottom:-4px; left:50%; transform:translateX(-50%); width:16px; height:2px; background:#15803D; border-radius:2px 2px 0 0; }
.wrap { max-width:900px; margin:0 auto; padding:20px 16px 28px; }
.h1 { font-family:'DM Serif Display',serif; font-size:20px; color:#1A1A1A; margin-bottom:2px; }
.sub { font-size:11px; color:#AAA; }
.hrow { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
.s3 { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; margin-bottom:16px; }
.s4 { display:grid; grid-template-columns:repeat(4,1fr); gap:9px; margin-bottom:16px; }
.scard { background:#fff; border:1px solid #EFEFED; border-radius:11px; padding:14px; }
.sn { font-size:24px; font-weight:500; color:#1A1A1A; line-height:1; }
.sl { font-size:9px; color:#AAA; margin-top:4px; text-transform:uppercase; letter-spacing:.05em; }
.card { background:#fff; border:1px solid #EFEFED; border-radius:11px; overflow:hidden; margin-bottom:12px; }
.ch { padding:11px 14px; border-bottom:1px solid #F5F5F3; display:flex; align-items:center; justify-content:space-between; gap:8px; }
.ct { font-size:11px; font-weight:700; color:#1A1A1A; text-transform:uppercase; letter-spacing:.04em; }
.lr { display:flex; align-items:center; justify-content:space-between; padding:9px 14px; border-bottom:1px solid #F8F8F6; gap:8px; transition:background .1s; }
.lr:last-child { border-bottom:none; }
.lr:hover { background:#FAFAF8; }
.rn { font-size:13px; font-weight:500; color:#1A1A1A; }
.rs { font-size:11px; color:#AAA; margin-top:1px; }
.pbar { display:flex; align-items:center; gap:5px; }
.btrack { width:55px; height:3px; background:#F0F0EE; border-radius:2px; overflow:hidden; }
.bfill { height:100%; border-radius:2px; }
.pt { font-size:10px; font-weight:700; min-width:26px; text-align:right; }
.bdg { font-size:9px; font-weight:700; padding:2px 6px; border-radius:5px; }
.go { font-size:10px; font-weight:600; background:#F0FDF4; color:#15803D; border:1px solid #BBF7D0; border-radius:5px; padding:3px 8px; cursor:pointer; font-family:'DM Sans',sans-serif; white-space:nowrap; }
.nav-btn { background:#fff; border:1px solid #EFEFED; border-radius:11px; padding:14px 16px; margin-bottom:9px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; width:100%; text-align:left; font-family:'DM Sans',sans-serif; transition:all .12s; }
.nav-btn:hover { border-color:#BBF7D0; background:#F0FDF4; }
.bk { font-size:11px; color:#AAA; background:none; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; display:flex; align-items:center; gap:3px; margin-bottom:8px; }
.bk:hover { color:#555; }
.fp { padding:4px 10px; border-radius:7px; border:1px solid #EFEFED; background:#fff; font-size:11px; font-weight:600; color:#666; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .1s; }
.fp:hover { border-color:#15803D; color:#15803D; }
.fp.on { background:#15803D; color:#fff; border-color:#15803D; }
.fp.term { background:#F0FDF4; color:#15803D; border-color:#BBF7D0; }
.fp.term.on { background:#15803D; border-color:#15803D; color:#fff; }
.sc { font-size:8px; font-weight:800; padding:2px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:.04em; flex-shrink:0; }
.sc-tw { background:#E0F2FE; color:#0284C7; }
.sc-ov { background:#FEE2E2; color:#DC2626; }
.sc-dn { background:#DCFCE7; color:#16A34A; }
.sc-up { background:#F5F5F3; color:#888; }
.svbtn { background:#15803D; color:#fff; border:none; border-radius:7px; padding:8px 18px; font-size:12px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; white-space:nowrap; }
.svbtn:disabled { opacity:.5; }
.date-input { height:34px; border:1px solid #EFEFED; border-radius:8px; padding:0 10px; font-size:12px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
.date-input:focus { border-color:#15803D; }
.lcard { background:#fff; border:1.5px solid #EFEFED; border-radius:9px; padding:10px 12px; margin-bottom:6px; }
.ltop { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; gap:5px; flex-wrap:wrap; }
.lname { font-size:13px; font-weight:500; color:#1A1A1A; display:flex; align-items:center; gap:7px; }
.sdot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.sbtns { display:flex; gap:4px; flex-wrap:wrap; }
.sbtn { padding:4px 9px; border-radius:7px; border:2px solid transparent; cursor:pointer; font-size:10px; font-weight:600; font-family:'DM Sans',sans-serif; transition:all .1s; }
.ni { width:100%; height:30px; border:1px solid #F0F0EE; border-radius:6px; padding:0 8px; font-size:11px; font-family:'DM Sans',sans-serif; color:#555; background:#FAFAF8; outline:none; margin-top:6px; }
.ni:focus { border-color:#15803D; background:#fff; }
.att-sum { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin-bottom:14px; }
.asc { border-radius:9px; padding:9px 8px; text-align:center; }
.asn { font-size:18px; font-weight:500; }
.asl { font-size:9px; margin-top:2px; text-transform:uppercase; letter-spacing:.04em; }
.mark-row { display:flex; gap:5px; margin-bottom:12px; align-items:center; flex-wrap:wrap; }
.mark-lbl { font-size:11px; color:#AAA; }
.mark-btn { font-size:11px; padding:4px 10px; border-radius:7px; border:1px solid transparent; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:500; }
.week-chart { display:flex; align-items:flex-end; gap:6px; padding:16px; height:90px; }
.wbw { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; height:100%; justify-content:flex-end; }
.wbt { width:100%; flex:1; background:#F5F5F3; border-radius:4px; overflow:hidden; display:flex; flex-direction:column; justify-content:flex-end; }
.wbf { width:100%; border-radius:4px; }
.wday { font-size:9px; color:#AAA; font-weight:500; }
.wpct { font-size:9px; color:#555; font-weight:500; }
.tcard { background:#fff; border:1px solid #EFEFED; border-radius:9px; margin-bottom:7px; overflow:hidden; cursor:pointer; transition:all .12s; }
.tcard:hover { box-shadow:0 2px 8px rgba(0,0,0,.06); transform:translateY(-1px); }
.tcard.tw { border-left:3px solid #0284C7; }
.tcard.ov { border-left:3px solid #DC2626; }
.tcard.dn { border-left:3px solid #16A34A; background:#FDFFFE; }
.tcin { padding:11px 13px; display:flex; align-items:center; gap:9px; }
.tcdot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.tci { flex:1; min-width:0; }
.tctit { font-size:13px; font-weight:500; color:#1A1A1A; }
.tcmeta { font-size:10px; color:#AAA; margin-top:3px; display:flex; gap:5px; flex-wrap:wrap; align-items:center; }
.gtabs { display:flex; overflow-x:auto; scrollbar-width:none; border-bottom:1px solid #EFEFED; background:#fff; border-radius:10px 10px 0 0; }
.gtabs::-webkit-scrollbar { display:none; }
.gtab { padding:8px 13px; font-size:11px; font-weight:600; color:#AAA; background:none; border:none; border-bottom:2px solid transparent; cursor:pointer; font-family:'DM Sans',sans-serif; white-space:nowrap; transition:all .12s; }
.gtab.on { color:#1A1A1A; border-bottom-color:#1A1A1A; }
.spills { display:flex; gap:4px; flex-wrap:wrap; padding:8px 12px; background:#FAFAF8; border-bottom:1px solid #EFEFED; }
.sp { padding:3px 9px; border-radius:5px; border:1px solid #EFEFED; background:#fff; font-size:10px; font-weight:600; color:#888; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .1s; }
.sp.on { background:#1A1A1A; color:#fff; border-color:#1A1A1A; }
.mitem { background:#fff; border:1px solid #EFEFED; border-radius:8px; padding:9px 11px; display:flex; align-items:center; gap:7px; margin-bottom:6px; }
.mico { width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.olink { font-size:10px; font-weight:700; background:#F0FDF4; color:#15803D; border:1px solid #BBF7D0; border-radius:5px; padding:3px 7px; text-decoration:none; white-space:nowrap; flex-shrink:0; }
.fbox { background:#F0FDF4; border:1px solid #BBF7D0; border-radius:9px; padding:11px 13px; margin-top:12px; }
.dacts { display:flex; gap:6px; flex-wrap:wrap; margin-top:12px; }
.act { display:flex; align-items:center; gap:4px; border:none; border-radius:7px; padding:8px 14px; font-size:11px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; }
.topic-table-outer { overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:11px; border:1px solid #EFEFED; }
table { width:100%; border-collapse:collapse; }
thead tr { background:#FAFAF8; border-bottom:1px solid #EFEFED; }
th { padding:8px 6px; font-size:10px; font-weight:600; color:#AAA; text-align:center; letter-spacing:.03em; white-space:nowrap; }
th:first-child { text-align:left; min-width:140px; padding:8px 12px; position:sticky; left:0; background:#FAFAF8; z-index:2; border-right:1px solid #EFEFED; }
th:last-child { min-width:60px; }
.th-topic { display:block; writing-mode:vertical-rl; text-orientation:mixed; transform:rotate(180deg); max-height:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; font-weight:600; color:#555; }
td { padding:8px 6px; border-bottom:1px solid #FAFAF8; text-align:center; vertical-align:middle; }
td:first-child { text-align:left; padding:8px 12px; position:sticky; left:0; background:#fff; z-index:1; border-right:1px solid #EFEFED; }
tr:last-child td { border-bottom:none; }
tr:hover td { background:#FAFAF8; }
tr:hover td:first-child { background:#F0FDF4; }
.lncell { font-size:13px; font-weight:500; color:#1A1A1A; }
.lsub { font-size:10px; color:#AAA; margin-top:1px; }
.tick-btn { width:30px; height:30px; border-radius:8px; border:2px solid #EFEFED; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; margin:0 auto; transition:all .1s; }
.tick-btn.done { background:#22C55E; border-color:#22C55E; }
.tick-btn:not(.done):hover { border-color:#BBF7D0; background:#F0FDF4; }
.pct-badge { font-size:11px; font-weight:500; padding:3px 7px; border-radius:7px; display:inline-block; }
.group-nav { display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
.gnav-btn { padding:5px 12px; border:1px solid #EFEFED; border-radius:7px; background:#fff; font-size:11px; font-weight:600; color:#666; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .1s; }
.gnav-btn.on { background:#15803D; color:#fff; border-color:#15803D; }
.sync-status { font-size:10px; padding:3px 9px; border-radius:6px; font-weight:600; }
.sync-saving { background:#FFF7ED; color:#C2410C; }
.sync-saved  { background:#F0FDF4; color:#15803D; }
.learner-card-list { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:8px; margin-bottom:14px; }
.learner-card { background:#fff; border:1.5px solid #EFEFED; border-radius:10px; padding:12px; cursor:pointer; transition:all .12s; text-align:center; }
.learner-card:hover { border-color:#BBF7D0; transform:translateY(-1px); box-shadow:0 2px 8px rgba(0,0,0,.06); }
.learner-card.selected { border-color:#15803D; background:#F0FDF4; }
.lc-name { font-size:12px; font-weight:600; color:#1A1A1A; margin-bottom:4px; }
.lc-pct { font-size:18px; font-weight:500; }
.lc-sub { font-size:9px; color:#AAA; margin-top:2px; text-transform:uppercase; letter-spacing:.04em; }
.topic-check-list { display:flex; flex-direction:column; gap:6px; }
.topic-check-item { display:flex; align-items:center; gap:10px; background:#fff; border:1.5px solid #EFEFED; border-radius:8px; padding:9px 12px; cursor:pointer; transition:all .1s; }
.topic-check-item.done { border-color:#BBF7D0; background:#FDFFFE; }
.topic-check-item:hover { border-color:#15803D; }
.tci-check { width:22px; height:22px; border-radius:6px; border:2px solid #EFEFED; background:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .1s; }
.tci-check.done { background:#22C55E; border-color:#22C55E; }
.report-learner-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; margin-bottom:16px; }
.report-learner-card { background:#fff; border:1px solid #EFEFED; border-radius:11px; padding:13px; cursor:pointer; transition:all .12s; position:relative; }
.report-learner-card:hover { border-color:#BBF7D0; box-shadow:0 2px 8px rgba(0,0,0,.06); }
.report-learner-card.top-effort { border-color:#FDE68A; background:#FFFBEB; }
.report-learner-card.needs-att  { border-color:#FCA5A5; background:#FEF2F2; }
.rlc-name { font-size:13px; font-weight:600; color:#1A1A1A; margin-bottom:8px; }
.rlc-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:5px; }
.rlc-label { font-size:10px; color:#888; }
.rlc-val { font-size:11px; font-weight:700; }
.rlc-change { font-size:9px; padding:1px 5px; border-radius:4px; margin-left:4px; }
.rlc-badge { position:absolute; top:8px; right:8px; font-size:8px; font-weight:800; padding:2px 6px; border-radius:4px; }
.sub-bar { margin-bottom:5px; }
.sub-bar-label { display:flex; justify-content:space-between; font-size:10px; color:#888; margin-bottom:2px; }
.sub-bar-track { height:4px; background:#F0F0EE; border-radius:2px; overflow:hidden; }
.sub-bar-fill { height:100%; border-radius:2px; }
.detail-panel { background:#fff; border:1px solid #EFEFED; border-radius:11px; padding:16px; }
.top5-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-bottom:14px; }
.top5-card { background:#FFFBEB; border:1px solid #FDE68A; border-radius:9px; padding:10px 8px; text-align:center; cursor:pointer; }
.top5-rank { font-size:11px; font-weight:800; color:#A16207; margin-bottom:4px; }
.top5-name { font-size:11px; font-weight:600; color:#1A1A1A; }
.top5-stat { font-size:10px; color:#A16207; margin-top:2px; }
.print-btn { display:flex; align-items:center; gap:5px; background:#1A1A1A; color:#fff; border:none; border-radius:7px; padding:7px 14px; font-size:11px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; }
.bseg { display:flex; background:#F5F5F3; border-radius:9px; padding:3px; gap:2px; margin-bottom:12px; }
.bseg-btn { flex:1; padding:6px; border:none; border-radius:7px; font-size:11px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .1s; background:transparent; color:#888; }
.bseg-btn.on { background:#fff; color:#1A1A1A; box-shadow:0 1px 3px rgba(0,0,0,.08); }
.bcf { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:12px; }
.bab { display:flex; align-items:center; gap:4px; border:none; border-radius:7px; padding:7px 12px; font-size:11px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; }
.brec { background:#fff; border:1px solid #EFEFED; border-radius:9px; padding:11px 13px; margin-bottom:7px; }
.brh { display:flex; align-items:flex-start; justify-content:space-between; gap:6px; margin-bottom:3px; }
.blrn { font-size:13px; font-weight:500; color:#1A1A1A; }
.bctag { font-size:9px; background:#F5F5F3; color:#888; padding:1px 5px; border-radius:3px; font-weight:600; }
.btyp { font-size:9px; font-weight:800; padding:2px 7px; border-radius:5px; }
.bnote { font-size:11px; color:#666; margin-top:3px; line-height:1.5; }
.btime { font-size:9px; color:#CCC; margin-top:2px; }
.delb { background:none; border:none; cursor:pointer; color:#DDD; padding:2px; }
.delb:hover { color:#DC2626; }
.mov { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:100; display:flex; align-items:flex-end; justify-content:center; }
.mo { background:#fff; border-radius:18px 18px 0 0; padding:22px 18px calc(env(safe-area-inset-bottom,0px) + 22px); width:100%; max-width:480px; max-height:90vh; overflow-y:auto; }
@media(min-width:600px) { .mov { align-items:center; padding:20px; } .mo { border-radius:14px; max-width:420px; } }
.mtit { font-size:14px; font-weight:700; color:#1A1A1A; margin-bottom:2px; }
.msub { font-size:11px; color:#AAA; margin-bottom:16px; }
.mlbl { font-size:9px; font-weight:800; color:#555; margin-bottom:5px; text-transform:uppercase; letter-spacing:.05em; }
.msel { width:100%; height:36px; border:1px solid #EFEFED; border-radius:8px; padding:0 9px; font-size:12px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; margin-bottom:12px; }
.tgrid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:12px; }
.tpill { padding:7px 8px; border-radius:8px; border:1.5px solid #EFEFED; cursor:pointer; font-size:11px; font-weight:600; font-family:'DM Sans',sans-serif; text-align:center; background:#fff; color:#555; }
.tpill.sel { border-width:2px; font-weight:800; }
.mta { width:100%; border:1px solid #EFEFED; border-radius:8px; padding:9px 10px; font-size:12px; font-family:'DM Sans',sans-serif; color:#1A1A1A; resize:none; min-height:64px; outline:none; line-height:1.5; }
.mta::placeholder { color:#CCC; }
.upills { display:flex; gap:6px; margin-bottom:14px; }
.upill { flex:1; padding:8px 5px; border-radius:8px; border:1.5px solid #EFEFED; cursor:pointer; text-align:center; font-size:11px; font-weight:700; font-family:'DM Sans',sans-serif; color:#AAA; }
.upill.good.sel  { background:#F0FDF4; border-color:#16A34A; color:#15803D; }
.upill.mixed.sel { background:#FEFCE8; border-color:#A16207; color:#A16207; }
.upill.diff.sel  { background:#FEF2F2; border-color:#DC2626; color:#DC2626; }
.macts { display:flex; gap:7px; justify-content:flex-end; margin-top:14px; }
.mcan { padding:7px 12px; border:1px solid #EFEFED; border-radius:7px; background:#fff; font-size:11px; cursor:pointer; font-family:'DM Sans',sans-serif; color:#666; }
.msave { padding:7px 18px; border:none; border-radius:7px; font-size:11px; font-weight:800; cursor:pointer; font-family:'DM Sans',sans-serif; color:#fff; }
.msave:disabled { opacity:.5; }
.empty { padding:32px; text-align:center; color:#CCC; font-size:12px; }
@media(min-width:769px) { .bnav { display:none!important } .tab-bar { display:flex } }
@media(max-width:768px) {
  .tab-bar { display:none } .bnav { display:block }
  .wrap { padding:12px 12px 76px }
  .s3, .s4 { gap:7px }
  .uname { display:none }
  .atthr { flex-direction:column }
  .att-sum { gap:5px }
  .top5-grid { grid-template-columns:repeat(3,1fr); }
  .report-learner-grid { grid-template-columns:repeat(2,1fr); }
}
@media print {
  .topbar, .tab-bar, .bnav, .print-btn, .bk { display:none!important; }
  .wrap { padding:0; }
  .report-learner-card { break-inside:avoid; }
  body { background:#fff; }
}
`
