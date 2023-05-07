import * as styles from './ActorPortrait.css';
import { VoidComponent } from 'solid-js';
import { ActorCloseUp } from './ActorCloseUp';

export const ActorPortrait: VoidComponent<{ side?: 'left' | 'right' }> = props => {
  return (
    <div class={styles.layout}>
      <div class={styles.portraitElt}>
        <ActorCloseUp class={styles.portraitCanvas} side={props.side} />
      </div>
    </div>
  );
};
