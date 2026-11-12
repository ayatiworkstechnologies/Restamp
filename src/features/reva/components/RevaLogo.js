import React from "react";
import Svg, { Path, Rect } from "react-native-svg";

/**
 * Reva AI mark: rounded speech bubble with two "eyes".
 * `color` fills the bubble; `eyeColor` fills the eyes (use the surface colour behind it).
 */
export default function RevaLogo({ size = 24, color = "#2563EB", eyeColor = "#FFFFFF", style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <Path
        d="M7 3H17A5 5 0 0 1 22 8V13A5 5 0 0 1 17 18H9.6L5.3 21.3C4.6 21.8 3.8 21.4 3.8 20.6V17.1A5 5 0 0 1 2 13V8A5 5 0 0 1 7 3Z"
        fill={color}
      />
      <Rect x={8.1} y={8.3} width={2.3} height={4.4} rx={1.15} fill={eyeColor} />
      <Rect x={13.6} y={8.3} width={2.3} height={4.4} rx={1.15} fill={eyeColor} />
    </Svg>
  );
}
