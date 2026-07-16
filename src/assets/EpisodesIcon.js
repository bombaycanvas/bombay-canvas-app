import React from 'react';
import Svg, { Path } from 'react-native-svg';

const EpisodesIcon = ({ size = 30, color = '#ffffff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4.5 8.5L9 12L4.5 15.5V8.5Z" fill={color} />
    <Path d="M12 9H20" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <Path d="M12 12H20" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <Path d="M12 15H20" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </Svg>
);

export default EpisodesIcon;
