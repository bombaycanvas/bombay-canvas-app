import React from 'react';
import Svg, { Path } from 'react-native-svg';

const ButtonIcon = ({ color = '#fff' }) => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M16.667 10H3.334M11.95 14.717c0-2.425 2.136-4.717 4.717-4.717M11.95 5.283c0 2.425 2.136 4.717 4.717 4.717"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="square"
    />
  </Svg>
);

export default ButtonIcon;
