import { style } from '@vanilla-extract/css';

export const appLayoutCss = style({
  display: 'flex',
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  right: 0,
});

export const sceneContainerCss = style({
  display: 'flex',
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 0,
  minWidth: 0,
  position: 'relative',
  overflow: 'hidden',
  alignItems: 'stretch',
  userSelect: 'none',
});

export const sceneViewCss = style({
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 0,
  minWidth: 0,
});
