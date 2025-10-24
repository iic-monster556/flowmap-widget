// flowmap-widget.js  (tag: com-iic-flowmap)
// - amCharts5를 CDN에서 자동 로드
// - data는 JSON 문자열 또는 배열 모두 허용
// - 기본 샘플 라인 포함

(function () {
  // ===== helper: 외부 스크립트 로더 =====
  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      if ([...document.scripts].some(s => s.src === src)) return resolve();
      const s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });

  // ===== Shadow DOM =====
  const template = document.createElement("template");
  template.innerHTML = `
    <style>
      :host{display:block}
      #chart{width:100%;height:100%}
      .msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
           font:14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial}
    </style>
    <div id="chart"></div>
    <div id="hint" class="msg" style="display:none;">Loading map…</div>
  `;

  class FlowMapWidget extends HTMLElement {
    constructor() {
      super();
      this._root = this.attachShadow({ mode: "open" });
      this._root.appendChild(template.content.cloneNode(true));
      this._container = this._root.getElementById("chart");
      this._hint = this._root.getElementById("hint");

      this._data = [];
      this._amroot = null;
      this._playing = true;
    }

    // === SAC properties (manifest와 동일 이름) ===
    set data(v) {
      try {
        if (typeof v === "string") this._data = JSON.parse(v || "[]");
        else if (Array.isArray(v)) this._data = v;
        else this._data = [];
      } catch { this._data = []; }
      this._render();
    }
    set play(v) {
      this._playing = !!v;
      if (this._amroot) this._render();
    }

    async connectedCallback() {
      if (!(window.am5 && window.am5map && window.am5geodata_worldLow)) {
        this._hint.style.display = "flex";
        await loadScript("https://cdn.jsdelivr.net/npm/@amcharts/amcharts5@5/index.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@amcharts/amcharts5@5/map.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@amcharts/amcharts5-geodata@5/worldLow.js");
        this._hint.style.display = "none";
      }
      this._render();
    }
    disconnectedCallback() { this._dispose(); }

    _dispose() { if (this._amroot) { this._amroot.dispose(); this._amroot = null; } }

    _rows() {
      if (this._data && this._data.length) return this._data;
      // 기본 샘플
      return [
        { from_lat: 37.5665, from_lon: 126.9780, to_lat: 31.2304, to_lon: 121.4737, qty: 400, date: "2025-10-01" },
        { from_lat: 31.2304, from_lon: 121.4737, to_lat: 35.6895, to_lon: 139.6917, qty: 200, date: "2025-10-03" },
        { from_lat: 37.5665, from_lon: 126.9780, to_lat: 34.0522, to_lon: -118.2437, qty: 300, date: "2025-10-04" }
      ];
    }

    _render() {
      if (!(window.am5 && window.am5map && window.am5geodata_worldLow)) return;

      this._dispose();
      const root = this._amroot = am5.Root.new(this._container);

      const chart = root.container.children.push(
        am5map.MapChart.new(root, { projection: am5map.geoMercator() })
      );
      chart.series.push(am5map.MapPolygonSeries.new(root, { geoJSON: am5geodata_worldLow }));
      const lineSeries = chart.series.push(am5map.MapLineSeries.new(root, {}));

      for (const d of this._rows()) {
        if (!isFinite(d.from_lat) || !isFinite(d.from_lon) || !isFinite(d.to_lat) || !isFinite(d.to_lon)) continue;

        const item = lineSeries.pushDataItem({
          geometry: { type: "LineString", coordinates: [[+d.from_lon, +d.from_lat], [+d.to_lon, +d.to_lat]] }
        });

        const seg = item.get("line");
        seg.setAll({
          strokeWidth: Math.max(1, Math.sqrt(+d.qty || 0) / 2),
          strokeOpacity: 0.95,
          strokeDasharray: [10, 12]
        });

        if (this._playing) {
          const animate = () => {
            seg.animate({ key: "strokeDashoffset", from: 1000, to: 0, duration: 2500 })
               .events.on("stopped", animate);
          };
          animate();
        }
      }
    }
  }

  // manifest의 tag와 동일해야 함
  customElements.define("com-iic-flowmap", FlowMapWidget);
})();
