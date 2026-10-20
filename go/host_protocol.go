package sdk

import (
	"bufio"
	"encoding/json"
	"os"
	"os/signal"
	"strconv"
	"time"
)

const (
	hostProtocol    = 2
	hostProtocolEnv = "CAMERAUI_HOST_PROTOCOL"
	instanceIDEnv   = "CAMERAUI_INSTANCE_ID"
	stopBudgetEnv   = "CAMERAUI_STOP_BUDGET_MS"
)

const handshakeLevel = 2 // answers resume and takes a second start, so the child survives a new master run

func hostSpeaksStopLine() bool {
	level, err := strconv.Atoi(os.Getenv(hostProtocolEnv))
	return err == nil && level >= hostProtocol
}

func hostStopBudget(fallback time.Duration) time.Duration {
	budget, err := strconv.Atoi(os.Getenv(stopBudgetEnv))
	if !hostSpeaksStopLine() || err != nil || budget <= 0 {
		return fallback
	}
	return time.Duration(budget) * time.Millisecond
}

func parseStopLine(line string) (time.Duration, bool) {
	var request struct {
		Stop *struct {
			BudgetMs float64 `json:"budgetMs"`
		} `json:"stop"`
	}
	if err := json.Unmarshal([]byte(line), &request); err != nil || request.Stop == nil || request.Stop.BudgetMs <= 0 {
		return 0, false
	}
	return time.Duration(request.Stop.BudgetMs * float64(time.Millisecond)), true
}

func watchHostStop(stop func(budget time.Duration)) {
	if !hostSpeaksStopLine() {
		return
	}
	// a ctrl-c in the host's terminal reaches the whole group, the host stops us itself
	signal.Ignore(os.Interrupt)
	go func() {
		scanner := bufio.NewScanner(os.Stdin)
		for scanner.Scan() {
			if budget, ok := parseStopLine(scanner.Text()); ok {
				stop(budget)
				return
			}
		}
		// stdin closed: the host is gone or wants us gone, both end in the same ordered stop
		stop(0)
	}()
}
