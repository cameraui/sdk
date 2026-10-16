import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { PROTOCOL_LEVEL } from '../plugin/contract.js';
import { SensorType } from './base.js';
import { BASE_AUDIO_LABELS } from './audio.js';
import { OBJECT_DETECTION_LABELS } from './detection.js';
import { ObjectDetectorSensor } from './object.js';
import { SENSOR_META } from './registry.js';

import type { ObjectResult } from './object.js';
import type { ObjectModelSpec } from './spec.js';

const sdkRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (relative: string): string => readFileSync(resolve(sdkRoot, relative), 'utf8');

function block(source: string, pattern: RegExp): string {
  return source.match(pattern)?.[1] ?? '';
}

function values(source: string, pattern: RegExp): Set<string> {
  return new Set([...source.matchAll(pattern)].map((match) => match[1]));
}

describe('cross-SDK parity', () => {
  const nodeTypes = new Set<string>(Object.values(SensorType));
  const nodeAssignmentKeys = new Set<string>([...SENSOR_META.map((meta) => meta.assignmentKey), 'cameraController', 'hub']);

  it('SensorType enum values match across node, python and go', () => {
    const python = values(block(read('python/camera_ui_sdk/sensor/base.py'), /class SensorType\(StrEnum\):([\s\S]*?)(?=\nclass )/), /^\s+\w+ = "([^"]+)"/gm);
    const go = values(read('go/sensor_base.go'), /SensorType\w+\s+SensorType\s*=\s*"([^"]+)"/g);

    expect([...python].sort()).toEqual([...nodeTypes].sort());
    expect([...go].sort()).toEqual([...nodeTypes].sort());
  });

  it('OBJECT_DETECTION_LABELS match across node, python and go', () => {
    const python = values(block(read('python/camera_ui_sdk/sensor/detection.py'), /OBJECT_DETECTION_LABELS = \(([\s\S]*?)\)/), /"([^"]+)"/g);
    const go = values(block(read('go/sensor_detection.go'), /ObjectDetectionLabels = \[\]string\{([\s\S]*?)\}/), /"([^"]+)"/g);

    expect([...python].sort()).toEqual([...OBJECT_DETECTION_LABELS].sort());
    expect([...go].sort()).toEqual([...OBJECT_DETECTION_LABELS].sort());
  });

  it('BASE_AUDIO_LABELS match across node, python and go', () => {
    const pythonSource = read('python/camera_ui_sdk/sensor/audio.py');
    const python = values(block(pythonSource, /BASE_AUDIO_LABELS[^=]*= \(([\s\S]*?)\)/), /"([^"]+)"/g);
    const pythonLiteral = values(block(pythonSource, /BaseAudioLabel = Literal\[([\s\S]*?)\]/), /"([^"]+)"/g);
    const go = values(block(read('go/sensor_audio.go'), /BaseAudioLabels = \[\]string\{([\s\S]*?)\}/), /"([^"]+)"/g);

    expect([...python].sort()).toEqual([...BASE_AUDIO_LABELS].sort());
    expect([...pythonLiteral].sort()).toEqual([...BASE_AUDIO_LABELS].sort());
    expect([...go].sort()).toEqual([...BASE_AUDIO_LABELS].sort());
  });

  it('PluginAssignments keys match across node, python and go', () => {
    const python = values(block(read('python/camera_ui_sdk/camera/config.py'), /class PluginAssignments\(TypedDict[^)]*\):([\s\S]*?)(?=\nclass )/), /^\s{4}(\w+):/gm);
    const go = values(block(read('go/camera_config.go'), /type PluginAssignments struct \{([\s\S]*?)\n\}/), /json:"(\w+)/g);

    expect([...python].sort()).toEqual([...nodeAssignmentKeys].sort());
    expect([...go].sort()).toEqual([...nodeAssignmentKeys].sort());
  });

  it('PROTOCOL_LEVEL matches across node, python and go', () => {
    const python = Number(/^PROTOCOL_LEVEL = (\d+)$/m.exec(read('python/camera_ui_sdk/plugin/contract.py'))?.[1]);
    const go = Number(/^const ProtocolLevel = (\d+)$/m.exec(read('go/plugin_contract.go'))?.[1]);

    expect(python).toBe(PROTOCOL_LEVEL);
    expect(go).toBe(PROTOCOL_LEVEL);
  });

  it('PluginInfo fields match across node, python and go', () => {
    const node = values(block(read('node/src/plugin/contract.ts'), /export interface PluginInfo \{([\s\S]*?)\n\}/), /^\s{2}(\w+)\??:/gm);
    const python = values(block(read('python/camera_ui_sdk/plugin/contract.py'), /class PluginInfo\(TypedDict\):([\s\S]*?)(?=\n\S|$)/), /^\s{4}(\w+):/gm);
    const go = values(block(read('go/plugin_contract.go'), /type PluginInfo struct \{([\s\S]*?)\n\}/), /json:"(\w+)/g);

    expect([...node].sort()).toEqual(['contract', 'id', 'name', 'running']);
    expect([...python].sort()).toEqual([...node].sort());
    expect([...go].sort()).toEqual([...node].sort());
  });

  it('object detector call concurrency matches across node, python and go', () => {
    class Detector extends ObjectDetectorSensor {
      get modelSpec(): ObjectModelSpec {
        return {} as ObjectModelSpec;
      }

      async detectObjects(): Promise<ObjectResult> {
        return { detected: false, detections: [] };
      }
    }
    const limits = (source: string): Record<string, number> => Object.fromEntries([...source.matchAll(/"(\w+)":\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]));
    const python = limits(block(read('python/camera_ui_sdk/sensor/object.py'), /_rpc_concurrency[^=]*= MappingProxyType\((\{[^}]*\})\)/));
    const go = limits(block(read('go/sensor_object.go'), /func \(s \*ObjectDetectorSensor\) RPCConcurrency\(\) map\[string\]int \{([\s\S]*?)\n\}/));

    expect(new Detector()._rpcConcurrency).toEqual({ detectObjects: 3 });
    expect(python).toEqual(new Detector()._rpcConcurrency);
    expect(go).toEqual(new Detector()._rpcConcurrency);
  });

  it('PluginCallOptions match across node, python and go', () => {
    const nodeSource = read('node/src/manager/index.ts');
    const pythonSource = read('python/camera_ui_sdk/manager/__init__.py');
    const goSource = read('go/manager_core.go');
    const node = values(block(nodeSource, /export interface PluginCallOptions \{([\s\S]*?)\n\}/), /^\s{2}(\w+)\??:/gm);
    const python = values(block(pythonSource, /class PluginCallOptions\(TypedDict\):([\s\S]*?)(?=\n\S|$)/), /^\s{4}(\w+):/gm);
    const goBlock = block(goSource, /type PluginCallOptions struct \{([\s\S]*?)\n\}/);
    // go carries the unit in time.Duration
    const go = [...values(goBlock, /^\t([A-Z]\w*)\s/gm)].map((name) => (name === 'Timeout' ? 'timeoutMs' : name[0].toLowerCase() + name.slice(1)));

    expect(goBlock).toMatch(/^\tTimeout time\.Duration$/m);
    expect([...node].sort()).toEqual(['noRetry', 'timeoutMs']);
    expect([...python].sort()).toEqual([...node].sort());
    expect(go.sort()).toEqual([...node].sort());
    expect(nodeSource).toMatch(/connectToPlugin\(pluginName: string, options\?: PluginCallOptions\)/);
    expect(pythonSource).toMatch(/def connectToPlugin\(\s*self, pluginName: str, options: PluginCallOptions \| None = None\s*\)/);
    expect(goSource).toMatch(/func \(pp \*pluginProxy\) WithOptions\(opts PluginCallOptions\) \*pluginProxy/);
  });

  it('go detection-sensor list matches the metadata', () => {
    const source = read('go/sensor_base.go');
    const constByName = new Map([...source.matchAll(/(SensorType\w+)\s+SensorType\s*=\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));
    const listed = new Set(
      [...block(source, /func isDetectionSensorType\(t SensorType\) bool \{([\s\S]*?)\n\}/).matchAll(/SensorType\w+/g)].map((m) => constByName.get(m[0])),
    );
    const detectionTypes = SENSOR_META.filter((meta) => meta.isDetectionType).map((meta) => meta.type as string);

    expect([...listed].sort()).toEqual([...detectionTypes].sort());
  });

  it('go contract-validation sensor list covers every SensorType', () => {
    const constByName = new Map([...read('go/sensor_base.go').matchAll(/(SensorType\w+)\s+SensorType\s*=\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));
    const listed = new Set(
      [...block(read('go/plugin_helper.go'), /validSensorTypes = \[\]SensorType\{([\s\S]*?)\}/).matchAll(/SensorType\w+/g)].map((m) => constByName.get(m[0])),
    );

    expect([...listed].sort()).toEqual([...nodeTypes].sort());
  });
});
