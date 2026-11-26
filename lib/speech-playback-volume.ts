import type { VoiceApiConfig } from "./settings-types";

/** Playback only. MiniMax speechVolume remains a synthesis parameter. */
export function speechPlaybackVolume(config?: VoiceApiConfig | null): number {
    const value = config?.provider === "ElevenLabs" ? config.playbackVolume : undefined;
    return typeof value === "number" && Number.isFinite(value) && value >= 0.1 && value <= 2 ? value : 1;
}

/** Soft knee above 0.9; quiet samples stay linear, peaks retain 2% headroom.
 * Fold gain into the curve: a WaveShaper's input range itself is limited to [-1, 1]. */
export function playbackVolumeCurve(volume: number): Float32Array<ArrayBuffer> {
    const curve = new Float32Array(8193);
    for (let i = 0; i < curve.length; i++) {
        const sample = (i * 2 / (curve.length - 1) - 1) * volume;
        const amplitude = Math.abs(sample);
        curve[i] = amplitude <= 0.9 || volume <= 1 ? sample
            : Math.sign(sample) * (0.9 + 0.08 * Math.tanh((amplitude - 0.9) / 0.08));
    }
    return curve;
}

/** A playback-local node, never a shared supplier/character multiplier. Unity is a wire. */
export function createPlaybackVolumeNode(context: BaseAudioContext) {
    const input = context.createGain();
    const output = context.createGain();
    let shaper: WaveShaperNode | null = null;
    let value = 1;
    input.connect(output);
    return {
        input, output,
        set(volume: number) {
            if (volume === value) return;
            value = volume;
            input.disconnect(); shaper?.disconnect();
            if (volume > 1) {
                shaper ??= context.createWaveShaper();
                shaper.curve = playbackVolumeCurve(volume);
                shaper.oversample = "2x";
                input.gain.value = 1;
                input.connect(shaper); shaper.connect(output);
            } else {
                input.gain.value = volume;
                input.connect(output);
            }
        },
        dispose() { input.disconnect(); shaper?.disconnect(); output.disconnect(); },
    };
}
