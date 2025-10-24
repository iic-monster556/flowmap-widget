// flowmap-widget.js
// Minimal amCharts 5 flow map custom widget for SAC
(function() {
  const template = document.createElement("template");
  template.innerHTML = `<div id="chartdiv" style="width:100%;height:100%;"></div>`;

  class FlowMapWidget extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._data = []; // [{from_lat,from_lon,to_lat,to_lon,qty,date}, ...]
      this._root = null;
      this._chart = null;
      this._lineSeries = null;
    }

    set data(value) {
      this._data = Array.isArray(value) ? value : [];
      this._render();
    }
    set play(v) {
      // Optional: play/pause control could be implemented here
    }

    connectedCallback() {
      this._render();
    }

    _dispose() {
      if (this._root) {
        this._root.dispose();
        this._root = null;
      }
    }

    _render() {
      if (!(window.am5 && window.am5map && window.am5geodata_worldLow)) return;

      this._dispose();

      const container = this._shadowRoot.getElementById("chartdiv");
      this._root = am5.Root.new(container);

      const chart = this._root.container.children.push(
        am5map.MapChart.new(this._root, {
          projection: am5map.geoMercator()
        })
      );
      this._chart = chart;

      chart.series.push(
        am5map.MapPolygonSeries.new(this._root, {
          geoJSON: am5geodata_worldLow
        })
      );

      const lineSeries = chart.series.push(am5map.MapLineSeries.new(this._root, {}));
      this._lineSeries = lineSeries;

      const rows = this._data && this._data.length ? this._data : [
        {from_lat:37.5665, from_lon:126.9780, to_lat:31.2304, to_lon:121.4737, qty:400, date:"2025-10-01"},
        {from_lat:31.2304, from_lon:121.4737, to_lat:35.6895, to_lon:139.6917, qty:200, date:"2025-10-03"},
        {from_lat:37.5665, from_lon:126.9780, to_lat:34.0522, to_lon:-118.2437, qty:300, date:"2025-10-04"}
      ];

      rows.forEach(d => {
        const line = lineSeries.pushDataItem({
          geometry: {
            type: "LineString",
            coordinates: [[d.from_lon, d.from_lat], [d.to_lon, d.to_lat]]
          }
        });
        const w = Math.max(1, Math.sqrt(Number(d.qty) || 0) / 2);
        const seg = line.get("line");
        seg.setAll({
          strokeWidth: w,
          strokeOpacity: 0.9,
          strokeDasharray: [10, 12]
        });
        // simple dash animation to hint movement
        const animate = () => {
          seg.animate({ key: "strokeDashoffset", from: 1000, to: 0, duration: 2500 })
             .events.on("stopped", animate);
        };
        animate();
      });
    }

    disconnectedCallback() {
      this._dispose();
    }
  }

  window.customElements.define("com-iic-flowmap", FlowMapWidget);
})();