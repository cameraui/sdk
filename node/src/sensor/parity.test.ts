import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { SensorType } from './base.js';
import { SENSOR_META } from './registry.js';

const sdkRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (relative: string): string => readFileSync(resolve(sdkRoot, relative), 'utf8');

function block(source: string, pattern: RegExp): string {
  return source.match(pattern)?.[1] ?? '';
}

function values(source: string, pattern: RegExp): Set<string> {
  return new Set([...source.matchAll(pattern)].map((match) => match[1]));
}

describe('cross-SDK sensor parity', () => {
  const nodeTypes = new Set<string>(Object.values(SensorType));
  const nodeAssignmentKeys = new Set<string>([...SENSOR_META.map((meta) => meta.assignmentKey), 'cameraController', 'hub']);

  it('SensorType enum values match across node, python and go', () => {
    const python = values(block(read('python/camera_ui_sdk/sensor/base.py'), /class SensorType\(StrEnum\):([\s\S]*?)(?=\nclass )/), /^\s+\w+ = "([^"]+)"/gm);
    const go = values(read('go/sensor_base.go'), /SensorType\w+\s+SensorType\s*=\s*"([^"]+)"/g);

    expect([...python].sort()).toEqual([...nodeTypes].sort());
    expect([...go].sort()).toEqual([...nodeTypes].sort());
  });

  it('PluginAssignments keys match across node, python and go', () => {
    const python = values(block(read('python/camera_ui_sdk/camera/config.py'), /class PluginAssignments\(TypedDict[^)]*\):([\s\S]*?)(?=\nclass )/), /^\s{4}(\w+):/gm);
    const go = values(block(read('go/camera_config.go'), /type PluginAssignments struct \{([\s\S]*?)\n\}/), /json:"(\w+)/g);

    expect([...python].sort()).toEqual([...nodeAssignmentKeys].sort());
    expect([...go].sort()).toEqual([...nodeAssignmentKeys].sort());
  });

  it('go contract-validation sensor list covers every SensorType', () => {
    const constByName = new Map([...read('go/sensor_base.go').matchAll(/(SensorType\w+)\s+SensorType\s*=\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));
    const listed = new Set(
      [...block(read('go/plugin_helper.go'), /validSensorTypes = \[\]SensorType\{([\s\S]*?)\}/).matchAll(/SensorType\w+/g)].map((m) => constByName.get(m[0])),
    );

    expect([...listed].sort()).toEqual([...nodeTypes].sort());
  });
});
