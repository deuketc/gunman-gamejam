export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Platform {
  x: number; // left edge
  y: number; // surface (top) Y
  w: number; // width
}

export interface Ladder {
  x: number; // left edge
  y: number; // top y (upper platform surface)
  w: number; // width (30 px)
  h: number; // height to lower platform surface
}
