import { mountAmbientMusic } from './modules/ambient-music';
import { mountByeolhaBridge } from './modules/byeolha-bridge';
import { mountViewportFit } from './modules/viewport-fit';
import { mountInteractionGuard } from './modules/interaction-guard';

const musicButton = document.querySelector<HTMLButtonElement>('#musicToggle');
const voiceButton = document.querySelector<HTMLButtonElement>('#voiceToggle');

if (musicButton) mountAmbientMusic(musicButton);
if (voiceButton) mountByeolhaBridge(voiceButton);
mountViewportFit();
mountInteractionGuard();
