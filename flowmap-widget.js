// flowmap-widget.js  (for SAC Custom Widget, tag: com-iic-flowmap)
// - Auto-loads amCharts 5 via CDN
// - Accepts data as JSON string OR array
// - Draws animated flow lines on a world map

(function () {
  // ───── Utility: load external scripts (CDN) ──────────────────────────────
  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      // avoid double-inserting the same src
      if ([...document.scripts].some(s => s.src === src)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  // ───── Shadow DOM template ───────────────────────────────────────────────
  const template = document.createElement("template");
  template.innerHTML = `
    <style>
      :host{display:block;}
      #chart{width:100%;height:100%;}
      .msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
           font:14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;}
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

      this._data = [];       // normalized rows
      this._amroot = null;   // amCharts root
      this._chart = null;
      this._lineSeries = null;
      this._playing = true;  // simple play flag
    }

    // ── SAC property setters (match manifest: data:string, play:boolean) ───
    set data(value) {
      try {
        if (typeof value === "string") this._data = JSON.parse(value || "[]");
        else if (Array.isArray(value)) this._data = value;
        else this._data = [];
      } catch {
        this._data = [];
      }
      this._render();
    }
    set play(v) {
      this._playing = !!v;
      // re-render to restart/stop dash animation
      if (this._amroot) this._render();
    }

    async connectedCallback() {
      // Ensure libs loaded
      if (!(window.am5 && window.am5map && window.am5geodata_worldLow)) {
        this._hint.style.display = "flex";
        await loadScript("https://cdn.jsdelivr.net/npm/@amcharts/amcharts5@5/index.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@amcharts/amcharts5@5/map.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@amcharts/amcharts5-geodata@5/worldLow.js");
        this._hint.style.display = "none";
      }
      this._render();
    }

    disconnectedCallback() {
      this._dispose();
    }

    // ───── internal helpers ────────────────────────────────────────────────
    _dispose() {
      if (this._amroot) {
        this._amroot.dispose();
        this._amroot = null;
        this._chart = null;
        this._lineSeries = null;
      }
    }

    _getRows() {
      // Fallback sample routes if empty
      if (this._data && this._data.length) return this._data;
      return [
        { from_lat: 37.5665, from_lon: 126.9780, to_lat: 31.2304, to_lon: 121.4737, qty: 400, date: "2025-10-01" }, // Seoul -> Shanghai
        { from_lat: 31.2304, from_lon: 121.4737, to_lat: 35.6895, to_lon: 139.6917, qty: 200, date: "2025-10-03" }, // Shanghai -> Tokyo
        { from_lat: 37.5665, from_lon: 126.9780, to_lat: 34.0522, to_lon: -118.2437, qty: 300, date: "2025-10-04" } // Seoul -> LA
      ];
    }

    _render() {
      if (!(window.am5 && window.am5map && window.am5geodata_worldLow)) return;

      this._dispose();
      const root = (this._amroot = am5.Root.new(this._container));

      const chart = (this._chart = root.container.children.push(
        am5map.MapChart.new(root, {
          projection: am5map.geoMercator()
        })
      ));

      // Base world polygons
      chart.series.push(
        am5map.MapPolygonSeries.new(root, {
          geoJSON: am5geodata_worldLow
        })
      );

      // Flow lines series
      const lineSeries = (this._lineSeries = chart.series.push(
        am5map.MapLineSeries.new(root, {})
      ));

      const rows = this._getRows();

      rows.forEach((d) => {
        if (
          !isFinite(d.from_lat) ||
          !isFinite(d.from_lon) ||
          !isFinite(d.to_lat) ||
          !isFinite(d.to_lon)
        )
          return;

        const item = lineSeries.pushDataItem({
          geometry: {
            type: "LineString",
            coordinates: [
              [Number(d.from_lon), Number(d.from_lat)],
              [Number(d.to_lon), Number(d.to_lat)]
            ]
          }
        });

        const seg = item.get("line");
        seg.setAll({
          strokeWidth: Math.max(1, Math.sqrt(Number(d.qty) || 0) / 2),
          strokeOpacity: 0.95,
          strokeDasharray: [10, 12]
        });

        if (this._playing) {
          const animate = () => {
            seg
              .animate({
                key: "strokeDashoffset",
                from: 1000,
                to: 0,
                duration: 2500
              })
              .events.on("stopped", animate);
          };
          animate();
        }
      });
    }
  }

  // tag must match manifest webcomponents.tag
  window.customElements.define("com-iic-flowmap", FlowMapWidget);
})();
