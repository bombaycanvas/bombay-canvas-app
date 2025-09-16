import React from 'react';
import Svg, { Path } from 'react-native-svg';

const CloseIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="m2.485 13.515 11.03-11.03M13.516 13.515 2.486 2.485"
      stroke="#E0E0E0"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default CloseIcon;
