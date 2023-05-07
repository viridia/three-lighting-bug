import { style } from '@vanilla-extract/css';

export const sceneViewCss = style({
  position: 'relative',
});

export const gameHUDCss = style({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  top: 0,
  display: 'flex',
  flexDirection: 'column',
});

export const centerCss = style({
  display: 'flex',
  flexDirection: 'row',
  flex: 1,
});

export const sideCss = style({
  display: 'flex',
  flexDirection: 'column',
  padding: '64px 16px 16px 16px',
  gap: 16,
});

export const middleCss = style({
  flex: 1,
});
