export const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'DM Sans',sans-serif;}
.topbar{background:#fff;border-bottom:1px solid #EFEFED;padding:0 20px;height:50px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:30;}
.brand{display:flex;align-items:center;gap:8px;}
.brand-icon{width:26px;height:26px;background:#1D4ED8;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.brand-name{font-size:14px;font-weight:600;color:#1A1A1A;}
.tbar-r{display:flex;align-items:center;gap:6px;}
.yr-chip{display:inline-flex;align-items:center;gap:4px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:7px;padding:3px 9px;font-size:10px;font-weight:700;color:#1D4ED8;white-space:nowrap;}
.uchip{display:flex;align-items:center;gap:6px;background:#F5F5F3;border-radius:100px;padding:2px 9px 2px 2px;}
.av{width:22px;height:22px;background:#1D4ED8;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700;flex-shrink:0;}
.uname{font-size:11px;color:#444;font-weight:500;}
.notif-btn{position:relative;background:#F5F5F3;border:1px solid #EFEFED;border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#666;}
.notif-dot{position:absolute;top:4px;right:4px;width:7px;height:7px;background:#EF4444;border-radius:50%;border:1.5px solid #fff;}
.logout{font-size:11px;color:#999;background:none;border:none;cursor:pointer;padding:4px 7px;border-radius:6px;display:flex;align-items:center;gap:3px;font-family:'DM Sans',sans-serif;}
.logout:hover{background:#FEE2E2;color:#DC2626;}
.tab-bar{background:#fff;border-bottom:1px solid #EFEFED;padding:0 20px;display:flex;overflow-x:auto;scrollbar-width:none;}
.tab-bar::-webkit-scrollbar{display:none;}
.tab-btn{padding:12px 13px;font-size:12px;font-weight:500;color:#999;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:5px;white-space:nowrap;transition:all .12s;}
.tab-btn.active{color:#1D4ED8;border-bottom-color:#1D4ED8;}
.bnav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:40;background:rgba(255,255,255,.97);backdrop-filter:blur(20px);border-top:1px solid #EFEFED;padding:4px 0 calc(env(safe-area-inset-bottom,0px) + 4px);}
.bnav-inner{display:flex;max-width:600px;margin:0 auto;}
.bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 2px;border:none;background:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:7px;font-weight:700;color:#C0BDB8;text-transform:uppercase;letter-spacing:.03em;position:relative;}
.bnav-btn.active{color:#1D4ED8;}
.bnav-btn.active svg{stroke:#1D4ED8;}
.bnav-btn.active::after{content:'';position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:16px;height:2px;background:#1D4ED8;border-radius:2px 2px 0 0;}
.wrap{max-width:900px;margin:0 auto;padding:20px 16px 100px;}
.h1{font-family:'DM Serif Display',serif;font-size:20px;color:#1A1A1A;margin-bottom:2px;}
.sub{font-size:12px;color:#AAA;}
.card{background:#fff;border:1px solid #EFEFED;border-radius:12px;padding:14px 16px;margin-bottom:10px;}
.nav-btn{display:flex;align-items:center;justify-content:space-between;width:100%;background:#fff;border:1px solid #EFEFED;border-radius:11px;padding:12px 14px;margin-bottom:8px;cursor:pointer;text-align:left;font-family:'DM Sans',sans-serif;transition:background .12s;}
.nav-btn:hover{background:#F5F5F3;}
.bk{display:flex;align-items:center;gap:4px;font-size:12px;color:#AAA;background:none;border:none;cursor:pointer;padding:0;margin-bottom:12px;font-family:'DM Sans',sans-serif;}
.bk:hover{color:#1A1A1A;}
.fp{padding:5px 12px;border-radius:8px;border:1px solid #EFEFED;background:#fff;font-size:11px;color:#666;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:500;transition:all .12s;}
.fp.on{background:#1D4ED8;color:#fff;border-color:#1D4ED8;}
.empty{text-align:center;padding:32px;color:#CCC;font-size:13px;}
.svbtn{background:#1D4ED8;color:#fff;border:none;border-radius:8px;padding:7px 16px;font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;}
.svbtn:disabled{opacity:.6;}
.date-input{height:34px;border:1px solid #EFEFED;border-radius:8px;padding:0 10px;font-size:12px;font-family:'DM Sans',sans-serif;color:#1A1A1A;background:#fff;outline:none;}
.date-input:focus{border-color:#1D4ED8;}
.att-sum{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;}
.asc{border-radius:10px;padding:10px;text-align:center;}
.asn{font-size:20px;font-weight:700;}
.asl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-top:2px;}
.mark-row{display:flex;align-items:center;gap:6px;margin-bottom:12px;flex-wrap:wrap;}
.mark-lbl{font-size:11px;color:#AAA;font-weight:600;}
.mark-btn{padding:4px 10px;border-radius:7px;border:none;font-size:11px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;}
.lcard{background:#fff;border:1.5px solid #EFEFED;border-radius:10px;padding:10px 12px;margin-bottom:8px;}
.ltop{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;flex-wrap:wrap;}
.lname{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:#1A1A1A;}
.sdot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.sbtns{display:flex;gap:4px;flex-wrap:wrap;}
.sbtn{padding:3px 8px;border-radius:6px;border:1.5px solid transparent;font-size:11px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .12s;}
.ni{width:100%;border:1px solid #F0F0EE;border-radius:7px;padding:5px 8px;font-size:12px;font-family:'DM Sans',sans-serif;color:#1A1A1A;background:#FAFAF8;outline:none;}
.ni:focus{border-color:#1D4ED8;background:#fff;}
.sess-btn{display:flex;align-items:center;justify-content:space-between;width:100%;background:#fff;border:1px solid #EFEFED;border-radius:11px;padding:12px 14px;margin-bottom:8px;cursor:pointer;text-align:left;font-family:'DM Sans',sans-serif;}
.sess-btn:hover{background:#F5F5F3;}
.sync-status{font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;}
.sync-saving{background:#FEF9C3;color:#A16207;}
.sync-saved{background:#F0FDF4;color:#15803D;}
.modal-over{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:50;display:flex;align-items:flex-end;padding:0;}
@media(min-width:600px){.modal-over{align-items:center;padding:20px;}}
.modal{background:#fff;border-radius:16px 16px 0 0;width:100%;max-width:560px;margin:0 auto;max-height:90vh;overflow-y:auto;}
@media(min-width:600px){.modal{border-radius:16px;}}
.mhead{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #EFEFED;position:sticky;top:0;background:#fff;z-index:2;}
.mtitle{font-size:14px;font-weight:700;color:#1A1A1A;}
.mbody{padding:16px 18px;}
.mfield{margin-bottom:12px;}
.mfield label{display:block;font-size:10px;font-weight:700;color:#AAA;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;}
.mfinput{width:100%;border:1px solid #EFEFED;border-radius:8px;padding:8px 10px;font-size:13px;font-family:'DM Sans',sans-serif;color:#1A1A1A;background:#fff;outline:none;resize:vertical;}
.mfinput:focus{border-color:#1D4ED8;}
.msave{width:100%;padding:11px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;color:#fff;margin-bottom:6px;}
.msave:disabled{opacity:.6;}
.pct-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;}
.form-input{flex:1;min-width:150px;height:36px;border:1px solid #EFEFED;border-radius:8px;padding:0 10px;font-size:13px;font-family:'DM Sans',sans-serif;color:#1A1A1A;background:#fff;outline:none;}
.form-input:focus{border-color:#1A1A1A;}
.form-input::placeholder{color:#CCC;}
.form-select{height:36px;border:1px solid #EFEFED;border-radius:8px;padding:0 10px;font-size:13px;font-family:'DM Sans',sans-serif;color:#1A1A1A;background:#fff;outline:none;}
.add-btn{height:36px;background:#1A1A1A;color:white;border:none;border-radius:8px;padding:0 16px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;flex-shrink:0;}
.add-btn:disabled{opacity:.5;}
.stat-card{background:#fff;border:1px solid #EFEFED;border-radius:12px;padding:14px 16px;}
.stat-n{font-size:24px;font-weight:600;color:#1A1A1A;}
.stat-l{font-size:10px;color:#AAA;text-transform:uppercase;letter-spacing:.04em;margin-top:3px;}
/* report */
.rtable{background:#fff;border:1px solid #EFEFED;border-radius:12px;overflow:hidden;}
.rth{font-size:9px;font-weight:800;color:#AAA;text-transform:uppercase;letter-spacing:.05em;padding:8px 12px;background:#FAFAF8;border-bottom:1px solid #EFEFED;}
.rrow{display:grid;padding:10px 12px;border-bottom:1px solid #F8F8F6;align-items:center;}
.rrow:last-child{border-bottom:none;}
.rrow:hover{background:#FAFAF8;}
/* hw */
.hw-card{background:#fff;border:1px solid #EFEFED;border-radius:12px;padding:14px 16px;margin-bottom:10px;}
.hw-card.overdue{border-left:3px solid #EF4444;}
.hw-card.upcoming{border-left:3px solid #3B82F6;}
@media(max-width:600px){
  .att-sum{grid-template-columns:1fr 1fr;}
  .bnav{display:block;}
  .tab-bar{display:none;}
  .wrap{padding-bottom:80px;}
}
`
