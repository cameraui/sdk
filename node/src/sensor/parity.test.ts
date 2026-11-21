import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { PROTOCOL_LEVEL } from '../plugin/contract.js';
import { SensorCategory, SensorType } from './base.js';
import { BASE_AUDIO_LABELS } from './audio.js';
import { OBJECT_DETECTION_LABELS } from './detection.js';
import { SensorDomain } from './meta.js';
import { ObjectDetectorSensor } from './object.js';
import { SENSOR_META } from './registry.js';

import type { SensorMeta, SensorPropertySpec } from './meta.js';
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

function sources(dir: string, extension: string): string[] {
  return readdirSync(resolve(sdkRoot, dir))
    .filter((file) => file.endsWith(extension))
    .map((file) => read(`${dir}/${file}`));
}

function goSensorTypes(): Map<string, string> {
  return new Map([...read('go/sensor_base.go').matchAll(/(SensorType\w+)\s+SensorType\s*=\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));
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

  it.each(['DeviceInfo', 'SensorDevice'])('%s fields match across node, python and go', (name) => {
    const node = values(block(read('node/src/sensor/device.ts'), new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`)), /^\s{2}(\w+)\??:/gm);
    const python = values(block(read('python/camera_ui_sdk/sensor/device.py'), new RegExp(`class ${name}\\(TypedDict\\):([\\s\\S]*?)(?=\\nclass |$)`)), /^\s{4}(\w+):/gm);
    const go = values(block(read('go/sensor_device.go'), new RegExp(`type ${name} struct \\{([\\s\\S]*?)\\n\\}`)), /json:"(\w+)/g);

    expect([...node].sort()).toEqual(['firmware', 'id', 'manufacturer', 'model', 'name', 'serialNumber']);
    expect([...python].sort()).toEqual([...node].sort());
    expect([...go].sort()).toEqual([...node].sort());
  });

  it('DiscoveredSensor fields match across node, python and go', () => {
    const node = values(block(read('node/src/manager/index.ts'), /export interface DiscoveredSensor \{([\s\S]*?)\n\}/), /^\s{2}(\w+)\??:/gm);
    const python = values(block(read('python/camera_ui_sdk/manager/__init__.py'), /class DiscoveredSensor\(TypedDict\):([\s\S]*?)(?=\nclass )/), /^\s{4}(\w+):/gm);
    const go = values(block(read('go/manager_sensor.go'), /type DiscoveredSensor struct \{([\s\S]*?)\n\}/), /json:"(\w+)/g);

    expect(node.has('device') && node.has('primary')).toBe(true);
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

  it('SensorPropertyType lists every property enum in node and python', () => {
    const nodeEnums = values(sources('node/src/sensor', '.ts').join('\n'), /^export enum (\w+Property) /gm);
    const pythonEnums = values(sources('python/camera_ui_sdk/sensor', '.py').join('\n'), /^class (\w+Property)\(StrEnum\):/gm);
    const nodeUnion = values(block(read('node/src/sensor/base.ts'), /export type SensorPropertyType =([\s\S]*?);/), /\| (\w+)/g);
    const pythonUnion = values(block(read('python/camera_ui_sdk/internal/sensor_rpc.py'), /SensorPropertyType: TypeAlias = \(([\s\S]*?)\n {4}\)/), /(\w+Property)\b/g);

    expect([...nodeUnion].sort()).toEqual([...nodeEnums].sort());
    expect([...pythonEnums].sort()).toEqual([...nodeEnums].sort());
    expect([...pythonUnion].sort()).toEqual([...nodeEnums].sort());
  });

  it('binary and measurement sensors build on the same base in node, python and go', () => {
    const sensorTypeByName = new Map<string, string>(Object.entries(SensorType));
    const goConsts = goSensorTypes();
    const typesOn = (files: string[], base: RegExp, type: RegExp, toValue: (name: string) => string | undefined): string[] =>
      files
        .filter((source) => base.test(source))
        .map((source) => toValue(type.exec(source)?.[1] ?? '') ?? '')
        .sort();

    for (const base of ['BinarySensor', 'MeasurementInfo']) {
      const node = typesOn(sources('node/src/sensor', '.ts'), new RegExp(`extends ${base}<`), /readonly type = SensorType\.(\w+);/, (name) => sensorTypeByName.get(name));
      const python = typesOn(sources('python/camera_ui_sdk/sensor', '.py'), new RegExp(`\\(${base}\\[`), /return SensorType\.(\w+)\n/, (name) =>
        sensorTypeByName.get(name),
      );
      const go = typesOn(sources('go', '.go'), new RegExp(`struct\\{ ${base} \\}`), /\.init(?:Binary|Measurement)\((SensorType\w+),/, (name) => goConsts.get(name));

      expect(node.length).toBeGreaterThan(0);
      expect(python).toEqual(node);
      expect(go).toEqual(node);
    }
  });

  it('measurement start values and ranges match the metadata in python and go', () => {
    const measurements = (SENSOR_META as readonly SensorMeta[]).filter(
      (meta) => meta.semantics?.domain === SensorDomain.Measurement && meta.category === SensorCategory.Info && 'current' in meta.properties,
    );
    const goConsts = new Map([...goSensorTypes()].map(([name, value]) => [value, name]));
    const pythonSources = sources('python/camera_ui_sdk/sensor', '.py');
    const goSources = sources('go', '.go');
    const goNumber = (raw: string): number => (raw === 'math.Inf(1)' ? Infinity : raw === 'math.Inf(-1)' ? -Infinity : Number(raw));

    expect(measurements.length).toBeGreaterThan(0);
    for (const meta of measurements) {
      const spec = meta.properties.current;
      const expected = { initial: meta.virtual?.properties.current, min: spec.min ?? -Infinity, max: spec.max ?? Infinity };
      const typeName = Object.entries(SensorType).find(([, value]) => value === meta.type)?.[0];
      const python = pythonSources.find((source) => source.includes(`return SensorType.${typeName}\n`) && source.includes('(MeasurementInfo['));
      const goRange = new RegExp(`initMeasurement\\(${goConsts.get(meta.type)}, measurementRange\\{initial: ([^,]+), min: ([^,]+), max: ([^}]+)\\}`);
      const go = goSources.map((source) => goRange.exec(source)).find(Boolean);

      expect(python, meta.type).toBeDefined();
      expect(go, meta.type).toBeTruthy();
      expect(
        {
          initial: Number(/^\s+_initial = (\S+)$/m.exec(python!)?.[1]),
          min: Number(/^\s+_min = (\S+)$/m.exec(python!)?.[1] ?? -Infinity),
          max: Number(/^\s+_max = (\S+)$/m.exec(python!)?.[1] ?? Infinity),
        },
        meta.type,
      ).toEqual(expected);
      expect({ initial: goNumber(go![1]), min: goNumber(go![2]), max: goNumber(go![3]) }, meta.type).toEqual(expected);
    }
  });

  it('go coerces every sensor property the metadata declares', () => {
    const goConsts = goSensorTypes();
    const registry = block(read('go/sensor_coerce.go'), /var propertyTypeRegistry = map\[SensorType\]map\[string\]coerceFunc\{([\s\S]*?)\n\}/);
    const coerced = new Map(
      [...registry.matchAll(/\t(SensorType\w+): \{([\s\S]*?)\n\t\}/g)].map((m) => [
        goConsts.get(m[1]),
        new Map([...m[2].matchAll(/"(\w+)":\s+(\w+)/g)].map((p) => [p[1], p[2]])),
      ]),
    );
    const accepted: Record<string, string[]> = {
      boolean: ['coerceBool'],
      number: ['coerceFloat64', 'coerceInt', 'coerceInt64'],
      string: ['coerceString'],
      object: ['coerceSlice', 'coerceStringSlice', 'coerceViaRoundTrip'],
    };

    for (const meta of SENSOR_META) {
      const declared = Object.entries(meta.properties as Record<string, SensorPropertySpec>);
      const go = coerced.get(meta.type) ?? new Map<string, string>();

      expect([...go.keys()].sort(), meta.type).toEqual(declared.map(([property]) => property).sort());
      for (const [property, spec] of declared) {
        const numericEnum = Object.values(spec.values ?? {}).every((value) => typeof value === 'number');
        const kind = spec.type === 'enum' ? (numericEnum ? 'number' : 'string') : spec.type;

        expect(accepted[kind], `${meta.type}.${property}`).toContain(go.get(property));
      }
    }
  });

  it('go contract-validation sensor list covers every SensorType', () => {
    const constByName = new Map([...read('go/sensor_base.go').matchAll(/(SensorType\w+)\s+SensorType\s*=\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));
    const listed = new Set(
      [...block(read('go/plugin_helper.go'), /validSensorTypes = \[\]SensorType\{([\s\S]*?)\}/).matchAll(/SensorType\w+/g)].map((m) => constByName.get(m[0])),
    );

    expect([...listed].sort()).toEqual([...nodeTypes].sort());
  });
});
