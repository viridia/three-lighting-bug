import { style } from '@vanilla-extract/css';

export const layout = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
});

export const portraitElt = style({
  position: 'relative',
  display: 'flex',
  height: 86,
  width: 82,
});

export const haloImg = style({
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
});

export const portraitCanvas = style({
  position: 'absolute',
  left: 0,
  bottom: 0,
  right: 0,
  width: 82,
  height: 80,
  padding: 0,
  margin: 0,
});

export const nameplateBox = style({
  position: 'relative',
  height: 20,
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const name = style({
  position: 'absolute',
  left: '50%',
  fontFamily: "'Macondo Swash Caps'",
  fontSize: 12,
  transform: 'translateX(-50%)',
  whiteSpace: 'nowrap',
});

export const buffs = style({
  position: 'absolute',
  right: '-12px',
  bottom: 8,
});
