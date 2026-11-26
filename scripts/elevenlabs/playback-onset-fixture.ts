import { createSpeechMediaPlayer, playAudioBlob, playAudioBlobViaMediaElement, unlockAudioPlayback } from "../../lib/tts-service";
import type { VoiceApiConfig } from "../../lib/settings-types";
import "./playback-volume-fixture";

// The first 160ms is a recognizable 1200Hz marker, followed by 400Hz speech stand-in.
// Starts at nonzero amplitude: no leading silence, padding, encoder or paid synthesis.
function signal() {
    const rate = 48000, count = rate * 0.8, bytes = new ArrayBuffer(44 + count * 2), view = new DataView(bytes);
    const text = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
    text(0, "RIFF"); view.setUint32(4, bytes.byteLength - 8, true); text(8, "WAVEfmt ");
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    text(36, "data"); view.setUint32(40, count * 2, true);
    for (let i = 0; i < count; i++) view.setInt16(44 + i * 2, Math.cos(2 * Math.PI * (i < rate * .16 ? 1200 : 400) * i / rate) * 6000, true);
    return new Blob([bytes], { type: "audio/wav" });
}
const blob = signal(), url = URL.createObjectURL(blob);
let player = createSpeechMediaPlayer({ useGlobalVolume: false });
let clip: ReturnType<typeof player.play> | null = null;
let call: ReturnType<typeof playAudioBlob> | null = null;
let config: VoiceApiConfig = { id: "onset", provider: "ElevenLabs", apiKey: "unused", defaultVoice: "unused", enableTTS: true, enableSTT: false };
(window as any).onsetFixture = {
    url, blob,
    fresh() { player.dispose(); call?.abort(); player = createSpeechMediaPlayer({ useGlobalVolume: false }); },
    volume(value: number) { config = { ...config, playbackVolume: value }; player.setVoiceConfig(config); },
    play() { clip = player.playUrl(url); return clip.started; },
    pause() { clip?.pause(); }, resume() { return clip?.resume(); },
    stop() { clip?.stop(); call?.abort(); },
    prime() { player.unlock(); }, unlock: unlockAudioPlayback,
    call(buffer: boolean) { call = (buffer ? playAudioBlob : playAudioBlobViaMediaElement)(blob, config); return call.promise; },
};
