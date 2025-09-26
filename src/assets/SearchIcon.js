import React from 'react';
import { Svg, Path } from 'react-native-svg';

const SearchIcon = () => {
  return (
    <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <Path
        d="M9.584 17.5a7.917 7.917 0 1 0 0-15.833 7.917 7.917 0 0 0 0 15.833zM18.334 18.333l-1.667-1.666"
        stroke="#fff"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default SearchIcon;
