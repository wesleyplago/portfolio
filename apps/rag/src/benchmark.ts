/**
 * Snapshot do eval publicado do rag-eval-harness, copiado de
 * results/results-2026-11-16T18-42-33-124Z.json. Não depende da API: é o que o repositório mediu,
 * para ler ao lado das buscas ao vivo. Atualize gerando de novo a partir do JSON.
 */
export const BENCHMARK = {
  "runId": "2026-11-16T18-42-33-124Z",
  "source": "results/results-2026-11-16T18-42-33-124Z.json",
  "repo": "https://github.com/wesleyplago/rag-eval-harness",
  "corpus": {
    "chunks": 386,
    "documents": 10
  },
  "questions": 140,
  "byCategory": {
    "semantic": 80,
    "identifier": 20,
    "temporal": 20,
    "unanswerable": 20
  },
  "k": 10,
  "bootstrapSamples": 1000,
  "configs": [
    {
      "name": "bm25",
      "status": "ok",
      "recall": 0.427,
      "recallCI": [
        0.335,
        0.518
      ],
      "mrr": 0.234,
      "ndcg": 0.279,
      "usdPer1k": 0,
      "p50Ms": 4,
      "p95Ms": 6,
      "slices": {
        "semantic": {
          "recall": 0.512,
          "mrr": 0.275,
          "ndcg": 0.332
        },
        "identifier": {
          "recall": 0.062,
          "mrr": 0.025,
          "ndcg": 0.025
        },
        "temporal": {
          "recall": 0.45,
          "mrr": 0.283,
          "ndcg": 0.323
        }
      },
      "abstention": {
        "precision": 0.514,
        "recall": 0.9,
        "falseRate": 0.142
      }
    },
    {
      "name": "dense",
      "status": "ok",
      "recall": 0.82,
      "recallCI": [
        0.749,
        0.883
      ],
      "mrr": 0.606,
      "ndcg": 0.654,
      "usdPer1k": 0,
      "p50Ms": 29,
      "p95Ms": 56,
      "slices": {
        "semantic": {
          "recall": 0.887,
          "mrr": 0.711,
          "ndcg": 0.755
        },
        "identifier": {
          "recall": 0.47,
          "mrr": 0.17,
          "ndcg": 0.215
        },
        "temporal": {
          "recall": 0.9,
          "mrr": 0.621,
          "ndcg": 0.688
        }
      },
      "abstention": {
        "precision": 0.826,
        "recall": 0.95,
        "falseRate": 0.033
      }
    },
    {
      "name": "hybrid",
      "status": "ok",
      "recall": 0.792,
      "recallCI": [
        0.717,
        0.858
      ],
      "mrr": 0.602,
      "ndcg": 0.648,
      "usdPer1k": 0,
      "p50Ms": 31,
      "p95Ms": 79,
      "slices": {
        "semantic": {
          "recall": 0.738,
          "mrr": 0.493,
          "ndcg": 0.552
        },
        "identifier": {
          "recall": 1,
          "mrr": 1,
          "ndcg": 1
        },
        "temporal": {
          "recall": 0.8,
          "mrr": 0.642,
          "ndcg": 0.681
        }
      },
      "abstention": {
        "precision": 0.452,
        "recall": 0.7,
        "falseRate": 0.142
      }
    },
    {
      "name": "hybrid+rerank",
      "status": "skipped",
      "reason": "rerank endpoint rejected a probe request (HTTP 400)"
    }
  ],
  "router": {
    "without": 0.236,
    "with": 1,
    "diff": 0.764,
    "ci": [
      0.583,
      0.92
    ]
  }
} as const;

export type BenchmarkConfig = (typeof BENCHMARK.configs)[number];
