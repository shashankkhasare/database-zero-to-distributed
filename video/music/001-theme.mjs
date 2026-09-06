import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function generateMusic({ settings, repositoryFile }) {
  const sampleRate = settings.sample_rate;
  await Promise.all([
    writeCue(repositoryFile(settings.ident.file), sampleRate, 5, false),
    writeCue(repositoryFile(settings.outro.file), sampleRate, 7, true),
  ]);
}

async function writeCue(output, sampleRate, duration, extendedEnding) {
  const samples = new Float32Array(Math.round(sampleRate * duration));
  const notes = extendedEnding
    ? [
        [0.20, 0.72, 293.665, 0.78], [0.54, 0.72, 349.228, 0.70], [0.88, 0.82, 440.000, 0.66],
        [1.58, 1.10, 587.330, 0.55], [2.45, 1.15, 440.000, 0.42],
        [3.55, 2.80, 293.665, 0.46], [3.55, 2.80, 369.994, 0.30], [3.55, 2.80, 440.000, 0.20],
      ]
    : [
        [0.14, 0.72, 293.665, 0.82], [0.48, 0.72, 349.228, 0.74], [0.82, 0.82, 440.000, 0.70],
        [1.62, 1.20, 587.330, 0.58], [2.55, 1.85, 440.000, 0.42],
      ];
  const pads = [
    [146.832, 0.20],
    [220.000, 0.13],
    [293.665, 0.11],
  ];

  for (let index = 0; index < samples.length; index += 1) {
    const time = index / sampleRate;
    let value = 0;
    for (const [frequency, level] of pads) {
      const envelope = Math.sin(Math.PI * Math.min(1, time / 1.4))
        * Math.min(1, (duration - time) / 1.2);
      value += tone(time, frequency) * level * Math.max(0, envelope);
    }
    for (const [start, length, frequency, level] of notes) {
      const local = time - start;
      if (local < 0 || local > length) continue;
      const attack = Math.min(1, local / 0.025);
      const release = Math.min(1, (length - local) / 0.34);
      const pluck = Math.exp(-local * 2.6);
      value += tone(local, frequency) * level * attack * release * (0.45 + pluck);
    }
    samples[index] = Math.tanh(value) * 0.34;
  }

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, wav(samples, sampleRate));
  console.log(`Generated music: ${output}`);
}

function tone(time, frequency) {
  const phase = 2 * Math.PI * frequency * time;
  return Math.sin(phase) + 0.18 * Math.sin(phase * 2) + 0.06 * Math.sin(phase * 3);
}

function wav(samples, sampleRate) {
  const dataBytes = samples.length * 4;
  const output = Buffer.alloc(44 + dataBytes);
  output.write("RIFF", 0);
  output.writeUInt32LE(36 + dataBytes, 4);
  output.write("WAVEfmt ", 8);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(3, 20);
  output.writeUInt16LE(1, 22);
  output.writeUInt32LE(sampleRate, 24);
  output.writeUInt32LE(sampleRate * 4, 28);
  output.writeUInt16LE(4, 32);
  output.writeUInt16LE(32, 34);
  output.write("data", 36);
  output.writeUInt32LE(dataBytes, 40);
  for (let index = 0; index < samples.length; index += 1) {
    output.writeFloatLE(samples[index], 44 + index * 4);
  }
  return output;
}
