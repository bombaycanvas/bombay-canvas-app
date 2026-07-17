import React from 'react';
import Svg, { Path } from 'react-native-svg';

const ShareIcon = ({ size = 30, color = '#ffffff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 5L21 12L14 19V14C9 14 5.5 16 3 20C4 15 7 10 14 9V5Z"
      fill={color}
      stroke={color}
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </Svg>
);

export default ShareIcon;
