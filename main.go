package main

import (
	"encoding/json"
	"log"
	"math"
	"net/http"
)

type calcRequest struct {
	A  float64 `json:"a"`
	B  float64 `json:"b"`
	Op string  `json:"op"`
}

type calcResponse struct {
	Result float64 `json:"result,omitempty"`
	Error  string  `json:"error,omitempty"`
}

func calculate(a, b float64, op string) (float64, error) {
	switch op {
	case "+":
		return a + b, nil
	case "-":
		return a - b, nil
	case "×", "*":
		return a * b, nil
	case "÷", "/":
		if b == 0 {
			return 0, errDivideByZero
		}
		return a / b, nil
	default:
		return 0, errUnknownOp
	}
}

type calcError struct{ msg string }

func (e *calcError) Error() string { return e.msg }

var (
	errDivideByZero = &calcError{msg: "0で割ることはできません"}
	errUnknownOp    = &calcError{msg: "不明な演算子です"}
)

func calculateHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(calcResponse{Error: "POSTメソッドのみ許可されています"})
		return
	}

	var req calcRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(calcResponse{Error: "リクエストの形式が正しくありません"})
		return
	}

	result, err := calculate(req.A, req.B, req.Op)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(calcResponse{Error: err.Error()})
		return
	}

	if math.IsInf(result, 0) || math.IsNaN(result) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(calcResponse{Error: "計算結果が不正な値です"})
		return
	}

	json.NewEncoder(w).Encode(calcResponse{Result: result})
}

func main() {
	fs := http.FileServer(http.Dir("static"))
	http.Handle("/", fs)
	http.HandleFunc("/api/calculate", calculateHandler)

	addr := ":8080"
	log.Printf("サーバーを起動しました: http://localhost%s\n", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal(err)
	}
}
