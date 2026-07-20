declare module "plotly.js-dist-min" {
  import Plotly from "plotly.js";
  export * from "plotly.js";
  export default Plotly;
}

declare module "react-plotly.js/factory" {
  import { ComponentType } from "react";
  import { PlotParams } from "react-plotly.js";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export default function createPlotlyComponent(plotly: any): ComponentType<PlotParams>;
}
