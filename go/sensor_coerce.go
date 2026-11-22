package sdk

import (
	"math"

	rpc "github.com/cameraui/rpc/go"
)

var propertyTypeRegistry = map[SensorType]map[string]coerceFunc{
	SensorTypeMotion: {
		"detected":      coerceBool,
		"detections":    coerceSlice[Detection],
		"blocked":       coerceBool,
		"lastTriggered": coerceInt64,
	},
	SensorTypeObject: {
		"detected":         coerceBool,
		"detections":       coerceSlice[TrackedDetection],
		"labels":           coerceStringSlice,
		"staticDetections": coerceSlice[TrackedDetection],
	},
	SensorTypeFace: {
		"detected":   coerceBool,
		"detections": coerceSlice[FaceDetection],
		"identities": coerceStringSlice,
	},
	SensorTypeLicensePlate: {
		"detected":   coerceBool,
		"detections": coerceSlice[LicensePlateDetection],
		"plates":     coerceStringSlice,
	},
	SensorTypeClassifier: {
		"detected":   coerceBool,
		"detections": coerceSlice[ClassifierDetection],
		"labels":     coerceStringSlice,
	},
	SensorTypeAudio: {
		"detected":      coerceBool,
		"detections":    coerceSlice[Detection],
		"decibels":      coerceFloat64,
		"lastTriggered": coerceInt64,
	},
	SensorTypeCarbonMonoxide: {
		"detected": coerceBool,
	},
	SensorTypeCold: {
		"detected": coerceBool,
	},
	SensorTypeContact: {
		"detected": coerceBool,
	},
	SensorTypeGas: {
		"detected": coerceBool,
	},
	SensorTypeHeat: {
		"detected": coerceBool,
	},
	SensorTypeLeak: {
		"detected": coerceBool,
	},
	SensorTypeOccupancy: {
		"detected": coerceBool,
	},
	SensorTypePower: {
		"detected": coerceBool,
	},
	SensorTypeProblem: {
		"detected": coerceBool,
	},
	SensorTypeSmoke: {
		"detected": coerceBool,
	},
	SensorTypeTamper: {
		"detected": coerceBool,
	},
	SensorTypeVibration: {
		"detected": coerceBool,
	},
	SensorTypeGlassBreak: {
		"detected": coerceBool,
	},
	SensorTypePresence: {
		"detected": coerceBool,
		"zone":     coerceString,
	},
	SensorTypeCarbonDioxide: {
		"current": coerceFloat64,
	},
	SensorTypeHumidity: {
		"current": coerceFloat64,
	},
	SensorTypeIlluminance: {
		"current": coerceFloat64,
	},
	SensorTypeTemperature: {
		"current": coerceFloat64,
	},
	SensorTypeAirQuality: {
		"level": coerceString,
		"aqi":   coerceFloat64,
		"pm25":  coerceFloat64,
		"pm10":  coerceFloat64,
		"voc":   coerceFloat64,
		"no2":   coerceFloat64,
	},
	SensorTypeBattery: {
		"level":    coerceInt,
		"charging": coerceString,
		"low":      coerceBool,
	},
	SensorTypeLight: {
		"on":               coerceBool,
		"brightness":       coerceInt,
		"colorTemperature": coerceInt,
		"color":            coerceViaRoundTrip[LightColor],
		"colorMode":        coerceString,
	},
	SensorTypeSwitch: {
		"on": coerceBool,
	},
	SensorTypeOutlet: {
		"on":    coerceBool,
		"inUse": coerceBool,
	},
	SensorTypeSiren: {
		"active": coerceBool,
		"volume": coerceInt,
	},
	SensorTypeChime: {
		"active": coerceBool,
		"tone":   coerceString,
		"volume": coerceInt,
		"repeat": coerceInt,
	},
	SensorTypeDisplay: {
		"message":  coerceString,
		"preset":   coerceString,
		"duration": coerceInt,
	},
	SensorTypePTZ: {
		"position":     coerceViaRoundTrip[PTZPosition],
		"moving":       coerceBool,
		"presets":      coerceStringSlice,
		"velocity":     coerceViaRoundTrip[PTZDirection],
		"targetPreset": coerceString,
		"relativeMove": coerceViaRoundTrip[PTZRelativeMove],
		"home":         coerceBool,
	},
	SensorTypeSecuritySystem: {
		"currentState": coerceInt,
		"targetState":  coerceInt,
	},
	SensorTypeDoorbell: {
		"ring": coerceBool,
	},
	SensorTypeButton: {
		"press": coerceString,
		"index": coerceInt,
	},
	SensorTypeAccess: {
		"result": coerceString,
		"method": coerceString,
		"user":   coerceString,
	},
	SensorTypeLock: {
		"currentState": coerceInt,
		"targetState":  coerceInt,
	},
	SensorTypeGarage: {
		"currentState":        coerceInt,
		"targetState":         coerceInt,
		"obstructionDetected": coerceBool,
	},
	SensorTypeCover: {
		"currentState":        coerceInt,
		"targetState":         coerceInt,
		"currentPosition":     coerceInt,
		"targetPosition":      coerceInt,
		"currentTilt":         coerceInt,
		"targetTilt":          coerceInt,
		"stop":                coerceBool,
		"obstructionDetected": coerceBool,
		"kind":                coerceString,
	},
	SensorTypeThermostat: {
		"currentTemperature":    coerceFloat64,
		"targetTemperature":     coerceFloat64,
		"targetTemperatureLow":  coerceFloat64,
		"targetTemperatureHigh": coerceFloat64,
		"mode":                  coerceString,
		"action":                coerceString,
		"currentHumidity":       coerceFloat64,
		"preset":                coerceString,
		"fanMode":               coerceString,
		"targetHumidity":        coerceInt,
	},
	SensorTypeFan: {
		"on":          coerceBool,
		"speed":       coerceInt,
		"direction":   coerceString,
		"oscillating": coerceBool,
		"preset":      coerceString,
	},
	SensorTypeValve: {
		"currentState":    coerceInt,
		"targetState":     coerceInt,
		"currentPosition": coerceInt,
		"targetPosition":  coerceInt,
		"duration":        coerceInt,
		"remaining":       coerceInt,
		"kind":            coerceString,
		"index":           coerceInt,
	},
	SensorTypeScene: {
		"active": coerceBool,
	},
	SensorTypeHumidifier: {
		"on":              coerceBool,
		"targetHumidity":  coerceInt,
		"currentHumidity": coerceFloat64,
		"action":          coerceString,
		"mode":            coerceString,
		"kind":            coerceString,
	},
	SensorTypeAirPurifier: {
		"on":           coerceBool,
		"state":        coerceString,
		"speed":        coerceInt,
		"auto":         coerceBool,
		"preset":       coerceString,
		"childLock":    coerceBool,
		"filterLife":   coerceInt,
		"filterChange": coerceBool,
	},
	SensorTypeWaterHeater: {
		"currentTemperature": coerceFloat64,
		"targetTemperature":  coerceFloat64,
		"mode":               coerceString,
		"away":               coerceBool,
	},
}

type coerceFunc func(raw any) any

func coercePropertyValue(sensorType SensorType, property string, raw any) any {
	if raw == nil {
		return nil
	}
	props, ok := propertyTypeRegistry[sensorType]
	if !ok {
		return raw
	}
	fn, ok := props[property]
	if !ok {
		return raw
	}
	return fn(raw)
}

func coerceBool(raw any) any {
	if v, ok := raw.(bool); ok {
		return v
	}
	return raw
}

func coerceInt(raw any) any {
	switch n := raw.(type) {
	case int:
		return n
	case int64:
		if n > math.MaxInt32 || n < math.MinInt32 {
			return raw
		}
		return int(n)
	case float64:
		if math.IsNaN(n) || math.IsInf(n, 0) {
			return raw
		}
		return int(n)
	case uint64:
		if n > math.MaxInt32 {
			return raw
		}
		return int(n)
	default:
		return raw
	}
}

func coerceInt64(raw any) any {
	switch n := raw.(type) {
	case int64:
		return n
	case int:
		return int64(n)
	case float64:
		if math.IsNaN(n) || math.IsInf(n, 0) {
			return raw
		}
		return int64(n)
	case uint64:
		if n > math.MaxInt64 {
			return raw
		}
		return int64(n)
	default:
		return raw
	}
}

func coerceFloat64(raw any) any {
	switch n := raw.(type) {
	case float64:
		return n
	case int64:
		return float64(n)
	case int:
		return float64(n)
	case uint64:
		return float64(n)
	default:
		return raw
	}
}

func coerceString(raw any) any {
	if v, ok := raw.(string); ok {
		return v
	}
	return raw
}

func coerceStringSlice(raw any) any {
	if v, ok := raw.([]string); ok {
		return v
	}
	arr, ok := raw.([]any)
	if !ok {
		return raw
	}
	result := make([]string, 0, len(arr))
	for _, item := range arr {
		if s, ok := item.(string); ok {
			result = append(result, s)
		}
	}
	return result
}

func coerceViaRoundTrip[T any](raw any) any {
	if _, ok := raw.(T); ok {
		return raw
	}
	if _, ok := raw.(map[string]any); !ok {
		return raw
	}
	encoded, err := rpc.Encode(raw)
	if err != nil {
		return raw
	}
	var typed T
	if err := rpc.Decode(encoded, &typed); err != nil {
		return raw
	}
	return typed
}

func coerceSlice[T any](raw any) any {
	if _, ok := raw.([]T); ok {
		return raw
	}
	if _, ok := raw.([]any); !ok {
		return raw
	}
	encoded, err := rpc.Encode(raw)
	if err != nil {
		return raw
	}
	var typed []T
	if err := rpc.Decode(encoded, &typed); err != nil {
		return raw
	}
	return typed
}
