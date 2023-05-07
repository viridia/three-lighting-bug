import haloGreen from '../images/hud/halo-green.svg?url';
import * as styles from './ActorPortrait.css';
import { VoidComponent } from 'solid-js';
import { ActorCloseUp } from './ActorCloseUp';

export const ActorPortrait: VoidComponent<{ side?: 'left' | 'right' }> = props => {
  return (
    <div class={styles.layout}>
      <div class={styles.portraitElt}>
        <img class={styles.haloImg} src={haloGreen} />
        <ActorCloseUp class={styles.portraitCanvas} side={props.side} />
      </div>
    </div>
  );
};
