// flowmap-widget.js (tag: com-iic-flowmap) - amCharts5를 내 GitHub Pages에서 로드
(function () {
  const loadScript = (src) => new Promise((resolve, reject) => {
    if ([...document.scripts].some(s => s.src === src)) return resolve();
    const s = document.createElement("script");
    s.src = src; s.async = true; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });

  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <style>
      :host{display:block} #chart{width:100%;height:100%}
      .msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
           font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
    </style>
    <div id="chart"></div><div id="hint" class="msg" style="display:none;">Loading map…</div>`;

  class FlowMap extends HTMLElement {
    constructor(){
      super();
      this._shadow = this.attachShadow({mode:"open"});
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this._el = this._shadow.getElementById("chart");
      this._hint = this._shadow.getElementById("hint");
      this._data = []; this._root = null; this._playing = true;
    }

    set data(v){ try{
      if (typeof v==="string") this._data = JSON.parse(v||"[]");
      else if (Array.isArray(v)) this._data = v; else this._data=[];
    }catch{ this._data=[] } this._render(); }
    set play(v){ this._playing = !!v; if (this._root) this._render(); }

    async connectedCallback(){
      // ★ 내 깃허브 페이지에서 라이브러리 로드
      const base = "https://iic-monster556.github.io/flowmap-widget/lib/";
      if (!(window.am5&&window.am5map&&window.am5geodata_worldLow)){
        this._hint.style.display="flex";
        await loadScript(base + "index.js");
        await loadScript(base + "map.js");
        await loadScript(base + "worldLow.js");
        this._hint.style.display="none";
      }
      this._render();
    }
    disconnectedCallback(){ if (this._root){ this._root.dispose(); this._root=null; } }

    _rows(){ return (this._data&&this._data.length)?this._data:[
      {from_lat:37.5665, from_lon:126.9780, to_lat:31.2304, to_lon:121.4737, qty:400, date:"2025-10-01"},
      {from_lat:31.2304, from_lon:121.4737, to_lat:35.6895, to_lon:139.6917, qty:200, date:"2025-10-03"},
      {from_lat:37.5665, from_lon:126.9780, to_lat:34.0522, to_lon:-118.2437, qty:300, date:"2025-10-04"}
    ]; }

    _render(){
      if (!(window.am5&&window.am5map&&window.am5geodata_worldLow)) return;
      if (this._root){ this._root.dispose(); this._root=null; }
      const root = this._root = am5.Root.new(this._el);
      const chart = root.container.children.push(am5map.MapChart.new(root,{projection:am5map.geoMercator()}));
      chart.series.push(am5map.MapPolygonSeries.new(root,{geoJSON:am5geodata_worldLow}));
      const lines = chart.series.push(am5map.MapLineSeries.new(root,{}));

      for (const d of this._rows()){
        if (![d.from_lat,d.from_lon,d.to_lat,d.to_lon].every(x => Number.isFinite(+x))) continue;
        const item = lines.pushDataItem({ geometry:{
          type:"LineString", coordinates:[[+d.from_lon,+d.from_lat],[+d.to_lon,+d.to_lat]]
        }});
        const seg = item.get("line");
        seg.setAll({ strokeWidth: Math.max(1, Math.sqrt(+d.qty||0)/2), strokeOpacity:0.95, strokeDasharray:[10,12] });
        if (this._playing){
          const anim=()=>{ seg.animate({key:"strokeDashoffset",from:1000,to:0,duration:2500}).events.on("stopped",anim); }; anim();
        }
      }
    }
  }
  customElements.define("com-iic-flowmap", FlowMap);
})();
