import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface PlayButtonIconProps {
  width?: number;
  height?: number;
}

const PlayButtonIcon: React.FC<PlayButtonIconProps> = ({
  width = 17,
  height = 19,
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 17 19" fill="none">
      <Path
        d="M12.076 7.178c2.011 1.195 1.96 4.124-.09 5.249l-7.51 4.118C2.462 17.65 0 16.192 0 13.895V5.313C0 2.97 2.552 1.517 4.567 2.715l7.509 4.463z"
        fill="#fff"
      />
    </Svg>
  );
};

export default PlayButtonIcon;
