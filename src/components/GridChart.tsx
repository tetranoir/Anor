import React, {useState, cloneElement} from 'react';
import cx from 'classnames/bind';

export interface GridNode {
  id: string;
  element?: React.ReactElement;
  data?: string;
  label?: string;
}
interface GridChartProps {
  id?: string;
  className?: string;
  height?: number;
  width?: number;
  x: GridNode[];
  y: GridNode[];
  operator: (x: GridNode, y: GridNode) => GridNode|undefined;
  vertSpace?: number; // doesn't support % yet
  horiSpace?: number; // doesn't support % yet
  vertGutter?: number;
  horiGutter?: number;
  topX?: boolean;
  bottomX?: boolean;
  leftY?: boolean;
  rightY?: boolean;
  showLabels?: boolean;
  labelClass?: string;
  textVertMargin?: number;
  renderGridNode?: (n: GridNode) => React.ReactElement;
}
interface GridChartHtmlProps extends GridChartProps {
  nodeStyle?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
  chartStyle?: React.CSSProperties;
}
export function GridChartHtml(props: GridChartHtmlProps) {
  const {
    id,
    className,
    x,
    y,
    operator,
    showLabels = false,
    labelClass,
    vertSpace = 40,
    horiSpace = 50,
    vertGutter = 10,
    horiGutter = vertGutter,
    topX = true,
    bottomX = false, // doesnt work right now
    leftY = true,
    rightY = false, // doesnt work right now
    nodeStyle = {},
    labelStyle = {},
    chartStyle = {},
    textVertMargin = -16, // for alignment of line height
    renderGridNode,
  } = props;

  const baseChartStyle = {
    gridAutoColumns: horiSpace,
    gridAutoRows: vertSpace,
    gridColumnGap: horiGutter,
    gridRowGap: vertGutter,
    ...chartStyle,
  } as React.CSSProperties;

  const renderLabel = (node: GridNode) => (
    <span className={cx('node-label', labelClass)} style={labelStyle}>
      {node.label || node.id}
    </span>
  );

  const renderData = (node: GridNode) => (
     <div className="node-data">{node.data ? node.data : ''}</div>
  );

  const xAxisNodes = (rowPos) => x.map((node, i) => {
    const gridColumn = `${i + 2} / ${i + 3}`;
    const gridRow = `${rowPos} / ${rowPos + 1}`;
    return (
      <div
        key={node.id + '_x'}
        className="grid-node x-axis-node"
        style={{gridColumn, gridRow, ...nodeStyle}}
      >
        {node.element || renderData(node)}
        {showLabels && renderLabel(node)}
      </div>
    );
  });

  const yAxisNodes = (colPos) => y.map((node, j) => {
    const gridColumn = `${colPos} / ${colPos + 1}`;
    const gridRow = `${j + 2} / ${j + 3}`;
    return (
      <div
        key={node.id + '_Y'}
        className="grid-node y-axis-node"
        style={{gridColumn, gridRow, ...nodeStyle}}
      >
        {node.element || renderData(node)}
        {showLabels && renderLabel(node)}
      </div>
    );
  });

  const resultsNodes = y.flatMap((yNode, j) => x.map((xNode, i) => {
    const rNode = operator(xNode, yNode);
    return (
      <div
        key={`${rNode.id}_${i}_${j}`}
        className="grid-node result-node"
        style={nodeStyle}
      >
        {rNode.element || renderData(rNode)}
        {showLabels && renderLabel(rNode)}
      </div>
    );
  }));

  return (
    <div id={id} className={cx('grid-chart', className)} style={baseChartStyle}>
      {topX && leftY && <div style={{gridColumn: '1 / 2', gridRow: '1 / 2'}} />}
      {topX && xAxisNodes(1)}
      {leftY && yAxisNodes(1)}
      {bottomX && xAxisNodes(y.length)}
      {rightY && yAxisNodes(x.length)}
      {resultsNodes}
    </div>
  );
}


/* Example */
// const rectStyle = {
//   stroke: '#EEE',
//   strokeWidth: 2,
//   fillOpacity: 0,
//   rx: 5,
//   ry: 5,
// };

// const textStyle = {
//   fill: '#EEE',
// };

// const renderChart = (
//   <GridChartSvg
//     x={gridAxisNodes}
//     y={gridAxisNodes}
//     vertSpace={40}
//     horiSpace={100}
//     vertGutter={16}
//     horiGutter={10}
//     operator={combineItems}
//     showLabels
//     labelClass={"grid-labels"}
//     rectStyle={rectStyle}
//     textStyle={textStyle}
//   />
// );
interface GridChartSvgProps extends GridChartProps {
  rectStyle?: React.SVGAttributes<SVGRectElement>;
  textStyle?: React.SVGAttributes<SVGTextElement>;
}
/**
 * Cant use SVG because SVG sucks
 */
export function GridChartSvg(props: GridChartSvgProps) {
  const {
    id,
    className,
    x,
    y,
    operator,
    showLabels = false,
    labelClass,
    vertSpace = 40,
    horiSpace = 50,
    vertGutter = 10,
    horiGutter = vertGutter,
    topX = true,
    bottomX = false,
    leftY = true,
    rightY = false,
    rectStyle = {strokeWidth: 0},
    textStyle = {},
    textVertMargin = -5, // for alignment of line height
    renderGridNode,
  } = props;

  const {
    height = (y.length + 1) * (vertSpace + vertGutter) - (showLabels ? 0 : vertGutter),
    width = (x.length + 1) * (horiSpace + horiGutter) - horiGutter,
  } = props;

  const horiOuter = horiSpace + horiGutter;
  const vertOuter = vertSpace + vertGutter;

  const Node = (props) => {
    return (
    <>
      <rect {...props} />
      {cloneElement(props.children, {
        x: props.x,
        y: props.y,
      })}
    </>
  )};

  const xAxisNodes = (yPos) => x.map((node, i) => (
    <Node
      key={node.id + '_x'}
      x={(i + 1) * horiOuter}
      y={yPos}
      width={horiSpace}
      height={vertSpace}
      {...rectStyle}
    >
      {node.element
        || (renderGridNode && renderGridNode(node))
        || <foreignObject
            transform={`translate(2, 2)`}
            fontSize="10"
            width={horiSpace - 4}
            height={vertSpace - 4}
           >
            <span>{node.data || node.id}</span>
           </foreignObject>
      }
    </Node>
  ));

  const xAxisLabels = (yPos) => x.map((node, i) => (
    <text
      key={node.id + '_x_label'}
      x={(i + 1) * horiOuter}
      y={yPos + textVertMargin}
      className={labelClass}
      {...textStyle}
    >
      {node.label || node.id}
    </text>
  ));

  const yAxisNodes = (xPos) => y.map((node, i) => (
    <rect
      key={node.id + '_y'}
      x={xPos}
      y={(i + 1) * vertOuter}
      width={horiSpace}
      height={vertSpace}
      {...rectStyle}
    />
  ));

  const yAxisLabels = (xPos) => x.map((node, i) => (
    <text
      key={node.id + '_x_label'}
      x={xPos}
      y={(i + 2) * vertOuter + textVertMargin}
      className={labelClass}
      {...textStyle}
    >
      {node.label || node.id}
    </text>
  ));

  const results = y.map(
    (yNode, j) => x.map(
      (xNode, i) => {
        const rNode = operator(xNode, yNode);
        return [
          <rect
            key={`${rNode.id}_${i}_${j}`}
            x={(i + 1) * horiOuter}
            y={(j + 1) * vertOuter}
            width={horiSpace}
            height={vertSpace}
            {...rectStyle}
          />,
          <text
            key={`${rNode.id}_${i}_${j}__label`}
            x={(i + 1) * horiOuter}
            y={(j + 2) * vertOuter + textVertMargin}
            className={labelClass}
            {...textStyle}
          >
            {rNode.label || rNode.id}
          </text>
        ];
      },
    ),
  );

  return (
    <svg
      id={id}
      className={className}
      height={height + (Number(rectStyle.strokeWidth) || 0)}
      width={width + (Number(rectStyle.strokeWidth) || 0)}
    >
      <g style={{transform: 'translate(1px, 1px)'}}>
        {topX &&
          <g className="top_x-axis__nodes">{xAxisNodes(0)}</g>
        }
        {topX && showLabels &&
          <g className="top_x-axis__labels">{xAxisLabels(vertOuter)}</g>
        }
        {bottomX &&
          <g className="bottom_x-axis__nodes">{xAxisNodes(y.length * vertOuter)}</g>
        }
        {bottomX && showLabels &&
          <g className="top_x-axis__labels">{xAxisLabels((y.length + 1) * vertOuter)}</g>
        }
        {leftY &&
          <g className="left_y-axis__nodes">{yAxisNodes(0)}</g>
        }
        {leftY && showLabels &&
          <g className="top_x-axis__labels">{yAxisLabels(0)}</g>
        }
        {rightY &&
          <g className="right_y-axis__nodes">{yAxisNodes(x.length * horiOuter)}</g>
        }
        {rightY && showLabels &&
          <g className="top_x-axis__labels">{yAxisLabels((x.length + 1) * horiOuter)}</g>
        }
        <g className="results__nodes">{results}</g>
      </g>
    </svg>
  );
}
