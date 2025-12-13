import React from 'react';
import Svg, { Path } from 'react-native-svg';

const RefundIcon = ({ width, height, color = '#888' }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />

      <Path d="M3 3v5h5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
};

export default RefundIcon;
