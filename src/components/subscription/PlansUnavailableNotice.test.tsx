import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import PlansUnavailableNotice from './PlansUnavailableNotice';

// The notice is the only way out of a paywall whose prices failed to load: the
// cards above it are unpriced and inert, so its button must actually retry.
const render = (props: { onRetry: () => void; retrying: boolean }) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<PlansUnavailableNotice {...props} />);
  });
  return tree;
};

const textOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .join(' ');

describe('PlansUnavailableNotice', () => {
  it('says why the cards are empty and retries on tap', () => {
    const onRetry = jest.fn();
    const tree = render({ onRetry, retrying: false });

    expect(textOf(tree)).toContain('load prices');
    ReactTestRenderer.act(() => {
      tree.root.findByType(TouchableOpacity).props.onPress();
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('cannot be tapped again while a retry is in flight', () => {
    const tree = render({ onRetry: jest.fn(), retrying: true });

    expect(tree.root.findByType(TouchableOpacity).props.disabled).toBe(true);
    expect(textOf(tree)).toContain('Loading');
  });
});
