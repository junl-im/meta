import { mountAmbientMusic } from './modules/ambient-music';
import { mountByeolhaBridge } from './modules/byeolha-bridge';

const musicButton = document.querySelector<HTMLButtonElement>('#musicToggle');
const voiceButton = document.querySelector<HTMLButtonElement>('#voiceToggle');

if (musicButton) mountAmbientMusic(musicButton);
if (voiceButton) mountByeolhaBridge(voiceButton);
