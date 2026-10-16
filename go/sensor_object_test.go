package sdk

import (
	"testing"

	rpc "github.com/cameraui/rpc/go"
)

type parallelDetector struct {
	*ObjectDetectorSensor
}

func (d *parallelDetector) ModelSpec() ObjectModelSpec { return ObjectModelSpec{} }

func (d *parallelDetector) DetectObjects(VideoFrameData) (*ObjectResult, error) {
	return &ObjectResult{}, nil
}

type serialDetector struct {
	parallelDetector
}

func (d *serialDetector) RPCConcurrency() map[string]int { return nil }

func TestObjectDetectorConcurrency(t *testing.T) {
	var detector any = &parallelDetector{NewObjectDetectorSensor("Objects")}
	limits := detector.(rpc.RPCMethodConcurrency).RPCConcurrency()
	if len(limits) != 1 || limits["detectObjects"] != 3 {
		t.Fatalf("embedded limits = %v", limits)
	}
	if _, ok := rpc.ExtractMethods(detector)["detectObjects"]; !ok {
		t.Fatal("the limit key must be the wire name of DetectObjects")
	}

	var serial any = &serialDetector{parallelDetector{NewObjectDetectorSensor("Objects")}}
	if limits := serial.(rpc.RPCMethodConcurrency).RPCConcurrency(); len(limits) != 0 {
		t.Fatalf("an override must replace the default: %v", limits)
	}
}
